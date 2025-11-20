import Redis from "ioredis";
import { logger } from "./logger";

/**
 * Redis client singleton
 */
class RedisClient {
  private client: Redis | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.connect();
  }

  /**
   * Connect to Redis
   */
  private connect(): void {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.client.on("connect", () => {
        logger.info("🔴 Redis connecting...");
      });

      this.client.on("ready", () => {
        this.isConnected = true;
        logger.info("✅ Redis connected successfully");
      });

      this.client.on("error", (error) => {
        logger.error("❌ Redis connection error:", error);
        this.isConnected = false;
      });

      this.client.on("close", () => {
        this.isConnected = false;
        logger.warn("⚠️ Redis connection closed");
      });

      this.client.on("reconnecting", () => {
        logger.info("🔄 Redis reconnecting...");
      });
    } catch (error) {
      logger.error("Failed to initialize Redis client:", error);
      throw error;
    }
  }

  /**
   * Get Redis client instance
   */
  getClient(): Redis {
    if (!this.client) {
      throw new Error("Redis client not initialized");
    }
    return this.client;
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      logger.info("🔴 Redis disconnected");
    }
  }

  /**
   * Ping Redis to check connection
   */
  async ping(): Promise<boolean> {
    try {
      if (!this.client) return false;
      const result = await this.client.ping();
      return result === "PONG";
    } catch (error) {
      logger.error("Redis ping failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const redisClient = new RedisClient();

// Export Redis type for use in other files
export type { Redis };
