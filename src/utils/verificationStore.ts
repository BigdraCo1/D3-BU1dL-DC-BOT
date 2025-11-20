import { logger } from "./logger";
import { redisClient } from "./redis";
import type { PendingVerification } from "../dto/wallet.dto";
import { isUUIDv7Expired } from "../dto/wallet.dto";

/**
 * Redis-based store for pending wallet verifications
 * Uses Redis for persistence and automatic expiration
 */
class VerificationStore {
  private readonly prefix = "verification:";
  private readonly userPrefix = "user:verification:";
  private readonly defaultTTL = 300; // 5 minutes in seconds

  /**
   * Get Redis key for verification ID
   */
  private getKey(verificationId: string): string {
    return `${this.prefix}${verificationId}`;
  }

  /**
   * Get Redis key for user ID
   */
  private getUserKey(userId: string): string {
    return `${this.userPrefix}${userId}`;
  }

  /**
   * Add a pending verification
   */
  async set(
    verificationId: string,
    verification: PendingVerification,
  ): Promise<void> {
    try {
      const redis = redisClient.getClient();
      const key = this.getKey(verificationId);
      const userKey = this.getUserKey(verification.userId);

      // Calculate TTL based on expiration time
      const now = new Date();
      const ttl = Math.max(
        Math.floor((verification.expiresAt.getTime() - now.getTime()) / 1000),
        this.defaultTTL,
      );

      // Store verification data
      let data: string;
      if (verification.channelId && verification.messageId) {
        data = JSON.stringify({
          verificationId: verification.verificationId,
          userId: verification.userId,
          username: verification.username,
          walletType: verification.walletType,
          createdAt: verification.createdAt.toISOString(),
          expiresAt: verification.expiresAt.toISOString(),
          messageId: verification.messageId,
          channelId: verification.channelId,
        });
      } else {
        data = JSON.stringify({
          verificationId: verification.verificationId,
          userId: verification.userId,
          username: verification.username,
          walletType: verification.walletType,
          createdAt: verification.createdAt.toISOString(),
          expiresAt: verification.expiresAt.toISOString(),
        });
      }

      logger.info(`data: ${data}`);

      // Use pipeline for atomic operations
      const pipeline = redis.pipeline();

      // Store verification by ID
      pipeline.setex(key, ttl, data);

      // Store user->verification mapping
      pipeline.setex(userKey, ttl, verificationId);

      await pipeline.exec();

      logger.debug(
        `Added verification: ${verificationId} for user ${verification.userId}`,
      );
    } catch (error) {
      logger.error("Failed to set verification in Redis:", error);
      throw error;
    }
  }

  /**
   * Get a pending verification
   */
  async get(verificationId: string): Promise<PendingVerification | undefined> {
    try {
      const redis = redisClient.getClient();
      const key = this.getKey(verificationId);

      const data = await redis.get(key);

      if (!data) {
        return undefined;
      }

      const parsed = JSON.parse(data);

      // Convert ISO strings back to Date objects
      let verification: PendingVerification = {
        verificationId: parsed.verificationId,
        userId: parsed.userId,
        username: parsed.username,
        walletType: parsed.walletType,
        createdAt: new Date(parsed.createdAt),
        expiresAt: new Date(parsed.expiresAt),
        messageId: parsed.messageId,
        channelId: parsed.channelId,
      };

      // Check if expired
      if (new Date() > verification.expiresAt) {
        await this.delete(verificationId);
        return undefined;
      }

      return verification;
    } catch (error) {
      logger.error("Failed to get verification from Redis:", error);
      return undefined;
    }
  }

  /**
   * Check if a verification exists and is not expired
   */
  async has(verificationId: string): Promise<boolean> {
    try {
      const redis = redisClient.getClient();
      const key = this.getKey(verificationId);
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error("Failed to check verification existence in Redis:", error);
      return false;
    }
  }

  /**
   * Delete a verification
   */
  async delete(verificationId: string): Promise<boolean> {
    try {
      const redis = redisClient.getClient();

      // Get verification to find userId
      const verification = await this.get(verificationId);

      const key = this.getKey(verificationId);
      const pipeline = redis.pipeline();

      pipeline.del(key);

      // Also delete user mapping if we have the verification
      if (verification) {
        const userKey = this.getUserKey(verification.userId);
        pipeline.del(userKey);
      }

      await pipeline.exec();

      logger.debug(`Deleted verification: ${verificationId}`);
      return true;
    } catch (error) {
      logger.error("Failed to delete verification from Redis:", error);
      return false;
    }
  }

  /**
   * Get verification by user ID
   */
  async getByUserId(userId: string): Promise<PendingVerification | undefined> {
    try {
      const redis = redisClient.getClient();
      const userKey = this.getUserKey(userId);

      // Get verification ID from user mapping
      const verificationId = await redis.get(userKey);

      if (!verificationId) {
        return undefined;
      }

      // Get the actual verification
      return await this.get(verificationId);
    } catch (error) {
      logger.error("Failed to get verification by user ID from Redis:", error);
      return undefined;
    }
  }

  /**
   * Delete all verifications for a user
   */
  async deleteByUserId(userId: string): Promise<number> {
    try {
      const verification = await this.getByUserId(userId);

      if (!verification) {
        return 0;
      }

      await this.delete(verification.verificationId);

      logger.debug(`Deleted verification for user ${userId}`);
      return 1;
    } catch (error) {
      logger.error(
        "Failed to delete verification by user ID from Redis:",
        error,
      );
      return 0;
    }
  }

  /**
   * Clean up expired verifications (Redis handles this automatically with TTL)
   * This method is kept for compatibility but Redis auto-expires keys
   */
  async cleanup(): Promise<number> {
    logger.debug("Redis auto-expires keys, manual cleanup not needed");
    return 0;
  }

  /**
   * Get all pending verifications (for debugging)
   * Note: This is expensive, use sparingly
   */
  async getAll(): Promise<PendingVerification[]> {
    try {
      const redis = redisClient.getClient();
      const pattern = `${this.prefix}*`;

      // Scan for all verification keys
      const keys = await redis.keys(pattern);

      if (keys.length === 0) {
        return [];
      }

      // Get all verification data
      const pipeline = redis.pipeline();
      keys.forEach((key) => pipeline.get(key));

      const results = await pipeline.exec();

      const verifications: PendingVerification[] = [];

      if (results) {
        for (const [error, data] of results) {
          if (!error && data) {
            try {
              const parsed = JSON.parse(data as string);
              verifications.push({
                verificationId: parsed.verificationId,
                userId: parsed.userId,
                username: parsed.username,
                walletType: parsed.walletType,
                createdAt: new Date(parsed.createdAt),
                expiresAt: new Date(parsed.expiresAt),
                messageId: parsed.messageId,
                channelId: parsed.channelId,
              });
            } catch (parseError) {
              logger.error("Failed to parse verification data:", parseError);
            }
          }
        }
      }

      // Filter out expired ones
      const now = new Date();
      return verifications.filter((v) => now <= v.expiresAt);
    } catch (error) {
      logger.error("Failed to get all verifications from Redis:", error);
      return [];
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    expired: number;
  }> {
    try {
      const redis = redisClient.getClient();
      const pattern = `${this.prefix}*`;

      const keys = await redis.keys(pattern);
      const total = keys.length;

      // All keys in Redis are active (expired ones are automatically removed)
      return {
        total,
        active: total,
        expired: 0, // Redis auto-removes expired keys
      };
    } catch (error) {
      logger.error("Failed to get stats from Redis:", error);
      return {
        total: 0,
        active: 0,
        expired: 0,
      };
    }
  }

  /**
   * Clear all verifications (for testing)
   */
  async clear(): Promise<void> {
    try {
      const redis = redisClient.getClient();
      const pattern = `${this.prefix}*`;
      const userPattern = `${this.userPrefix}*`;

      const verificationKeys = await redis.keys(pattern);
      const userKeys = await redis.keys(userPattern);

      const allKeys = [...verificationKeys, ...userKeys];

      if (allKeys.length > 0) {
        await redis.del(...allKeys);
        logger.debug(`Cleared ${allKeys.length} verification(s) from Redis`);
      }
    } catch (error) {
      logger.error("Failed to clear verifications from Redis:", error);
    }
  }

  /**
   * Get size (number of active verifications)
   */
  async size(): Promise<number> {
    try {
      const redis = redisClient.getClient();
      const pattern = `${this.prefix}*`;
      const keys = await redis.keys(pattern);
      return keys.length;
    } catch (error) {
      logger.error("Failed to get size from Redis:", error);
      return 0;
    }
  }

  /**
   * Check Redis connection health
   */
  async healthCheck(): Promise<boolean> {
    try {
      return redisClient.isReady();
    } catch (error) {
      logger.error("Redis health check failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const verificationStore = new VerificationStore();
