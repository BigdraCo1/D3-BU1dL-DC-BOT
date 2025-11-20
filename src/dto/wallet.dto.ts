import { z } from "zod";

// Wallet type enum
export const WalletTypeSchema = z.enum(["EVM", "SUI", "SVM"]);
export type WalletType = z.infer<typeof WalletTypeSchema>;

// EVM address validation (0x + 40 hex chars)
const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;

// Solana address validation (base58, 32-44 chars)
const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// SUI address validation (0x + 64 hex chars)
const suiAddressRegex = /^0x[a-fA-F0-9]{64}$/;

// UUID v7 validation (8-4-7-4-12 format with version 7)
const uuidv7Regex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Request DTO for wallet verification
export const VerifyWalletRequestSchema = z
  .object({
    signature: z.string().min(1, "Signature is required"),
    verificationId: z
      .string()
      .regex(uuidv7Regex, "Invalid verification ID format (must be UUID v7)"),
  })
  .strict(); // No extra fields allowed

export type VerifyWalletRequest = z.infer<typeof VerifyWalletRequestSchema>;

// Response DTO for wallet verification
export const VerifyWalletResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
  walletAddress: z.string().optional(),
  walletType: WalletTypeSchema.optional(),
});

export type VerifyWalletResponse = z.infer<typeof VerifyWalletResponseSchema>;

// Validation helper for specific wallet address formats
export function validateWalletAddress(
  address: string,
  type: WalletType,
): boolean {
  switch (type) {
    case "EVM":
      return evmAddressRegex.test(address);
    case "SVM":
      return solanaAddressRegex.test(address);
    case "SUI":
      return suiAddressRegex.test(address);
    default:
      return false;
  }
}

// Pending verification stored in memory/database
export interface PendingVerification {
  verificationId: string;
  userId: string;
  username: string;
  walletType: WalletType;
  createdAt: Date;
  expiresAt: Date;
  messageId: string;
  channelId: string;
}

// Extract timestamp from UUID v7
export function getTimestampFromUUIDv7(uuid: string): Date {
  // UUID v7 format: tttttttt-tttt-7xxx-xxxx-xxxxxxxxxxxx
  // First 48 bits (12 hex chars) are Unix timestamp in milliseconds
  const timestampHex = uuid.replace(/-/g, "").substring(0, 12);
  const timestamp = parseInt(timestampHex, 16);
  return new Date(timestamp);
}

// Check if UUID v7 has expired (default 5 minutes)
export function isUUIDv7Expired(
  uuid: string,
  expirationMs: number = 300000,
): boolean {
  const createdAt = getTimestampFromUUIDv7(uuid);
  const now = new Date();
  return now.getTime() - createdAt.getTime() > expirationMs;
}

// Get verification status DTO
export const GetVerificationStatusRequestSchema = z.object({
  verificationId: z.string().regex(uuidv7Regex, "Invalid verification ID"),
});

export type GetVerificationStatusRequest = z.infer<
  typeof GetVerificationStatusRequestSchema
>;

export const GetVerificationStatusResponseSchema = z.object({
  status: z.enum(["pending", "completed", "failed", "expired", "not_found"]),
  walletType: WalletTypeSchema.optional(),
  expiresIn: z.number().optional(), // Milliseconds remaining
  createdAt: z.date().optional(),
});

export type GetVerificationStatusResponse = z.infer<
  typeof GetVerificationStatusResponseSchema
>;
