import { logger } from "./logger";
import { verificationStore } from "./verificationStore";
import {
  VerifyWalletRequestSchema,
  type VerifyWalletRequest,
  type VerifyWalletResponse,
  GetVerificationStatusRequestSchema,
  type GetVerificationStatusResponse,
  isUUIDv7Expired,
  getTimestampFromUUIDv7,
} from "../dto/wallet.dto";
import { ZodError } from "zod";

interface ServerConfig {
  port?: number;
  corsOrigin?: string;
}

export function startVerificationServer(config: ServerConfig = {}) {
  const port = config.port || Number(process.env.VS_PORT) || 3001;
  const corsOrigin = config.corsOrigin || process.env.FRONTEND_URL || "*";

  Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);

      // CORS headers
      const headers = {
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      };

      // Handle CORS preflight
      if (req.method === "OPTIONS") {
        return new Response(null, { headers });
      }

      // Health check endpoint
      if (req.method === "GET" && url.pathname === "/health") {
        const stats = await verificationStore.getStats();
        return new Response(
          JSON.stringify({
            status: "ok",
            timestamp: Date.now(),
            verifications: stats,
          }),
          { headers },
        );
      }

      // Get verification status endpoint
      if (req.method === "GET" && url.pathname === "/status") {
        return handleGetStatus(url, headers);
      }

      // Verify wallet endpoint
      if (req.method === "POST" && url.pathname === "/verify") {
        return handleVerifyWallet(req, headers);
      }

      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers,
      });
    },
  });

  logger.info(`🌐 Verification server running on http://localhost:${port}`);
  logger.info(`📡 CORS enabled for: ${corsOrigin}`);
}

async function handleVerifyWallet(
  req: Request,
  headers: Record<string, string>,
): Promise<Response> {
  try {
    // Parse and validate request body
    const rawBody = await req.json();
    const body: VerifyWalletRequest = VerifyWalletRequestSchema.parse(rawBody);

    logger.debug(`Verification request received: ${body.verificationId}`);

    // Check if UUID v7 has expired (5 minutes)
    if (isUUIDv7Expired(body.verificationId, 300000)) {
      const response: VerifyWalletResponse = {
        success: false,
        error: "Verification session expired (5 minutes timeout)",
      };

      logger.warn(`Expired verification attempt: ${body.verificationId}`);

      return new Response(JSON.stringify(response), {
        status: 410, // Gone
        headers,
      });
    }

    // Get pending verification from store
    const pending = await verificationStore.get(body.verificationId);

    if (!pending) {
      const response: VerifyWalletResponse = {
        success: false,
        error: "Verification session not found or already completed",
      };

      logger.warn(`Verification not found: ${body.verificationId}`);

      return new Response(JSON.stringify(response), {
        status: 404,
        headers,
      });
    }

    // Try to acquire lock using Redis to prevent concurrent processing
    const { redisClient } = await import("./redis");
    const redis = redisClient.getClient();
    const lockKey = `lock:verification:${body.verificationId}`;
    const lockAcquired = await redis.set(lockKey, "1", "EX", 30, "NX"); // 30 second lock

    if (!lockAcquired) {
      // Another request is already processing this verification
      const response: VerifyWalletResponse = {
        success: false,
        error: "Verification is already being processed, please wait",
      };

      logger.warn(
        `Verification already being processed: ${body.verificationId}`,
      );

      return new Response(JSON.stringify(response), {
        status: 409, // Conflict
        headers,
      });
    }

    try {
      // Import completeVerification dynamically to avoid circular dependency
      const { completeVerification } = await import("../commands/wallet");

      // Complete the verification
      const result = await completeVerification(
        body.signature,
        body.verificationId,
      );

      if (result.success) {
        // Remove from store after successful verification
        await verificationStore.delete(body.verificationId);

        const response: VerifyWalletResponse = {
          success: true,
          message: "Wallet verified successfully",
          walletAddress: result.walletAddress,
          walletType: result.walletType,
        };

        logger.info(
          `✅ Wallet verified: ${result.walletAddress} (${result.walletType}) for user ${pending.userId}`,
        );

        return new Response(JSON.stringify(response), { headers });
      } else {
        const response: VerifyWalletResponse = {
          success: false,
          error: result.error || "Signature verification failed",
        };

        logger.warn(
          `❌ Verification failed: ${body.verificationId} - ${result.error}`,
        );

        return new Response(JSON.stringify(response), {
          status: 400,
          headers,
        });
      }
    } finally {
      // Always release the lock
      await redis.del(lockKey);
    }
  } catch (error) {
    if (error instanceof ZodError) {
      const response: VerifyWalletResponse = {
        success: false,
        error: `Validation error: ${error.issues.map((e) => e.message).join(", ")}`,
      };

      logger.warn("Validation error:", error.issues);

      return new Response(JSON.stringify(response), {
        status: 400,
        headers,
      });
    }

    logger.error("Verification error:", error);

    const response: VerifyWalletResponse = {
      success: false,
      error: "Internal server error",
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers,
    });
  }
}

async function handleGetStatus(
  url: URL,
  headers: Record<string, string>,
): Promise<Response> {
  try {
    const verificationId = url.searchParams.get("verificationId");

    if (!verificationId) {
      return new Response(
        JSON.stringify({ error: "Missing verificationId parameter" }),
        { status: 400, headers },
      );
    }

    // Validate verification ID format
    const validated = GetVerificationStatusRequestSchema.parse({
      verificationId,
    });

    // Check if expired
    if (isUUIDv7Expired(validated.verificationId, 300000)) {
      const response: GetVerificationStatusResponse = {
        status: "expired",
      };

      return new Response(JSON.stringify(response), { headers });
    }

    // Get from store
    const pending = await verificationStore.get(validated.verificationId);

    if (!pending) {
      const response: GetVerificationStatusResponse = {
        status: "not_found",
      };

      return new Response(JSON.stringify(response), { headers });
    }

    const now = new Date();
    const expiresIn = pending.expiresAt.getTime() - now.getTime();

    const response: GetVerificationStatusResponse = {
      status: "pending",
      walletType: pending.walletType,
      expiresIn: Math.max(0, expiresIn),
      createdAt: pending.createdAt,
    };

    return new Response(JSON.stringify(response), { headers });
  } catch (error) {
    if (error instanceof ZodError) {
      return new Response(
        JSON.stringify({
          error: `Validation error: ${error.issues.map((e) => e.message).join(", ")}`,
        }),
        { status: 400, headers },
      );
    }

    logger.error("Status check error:", error);

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers,
    });
  }
}
