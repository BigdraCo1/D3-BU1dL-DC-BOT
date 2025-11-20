import "dotenv/config";
import { Client, Collection, Events } from "discord.js";
import type { ExtendedClient } from "./types";
import { config, validateConfig } from "./config";
import { logger } from "./utils/logger";
import { loadCommands, registerCommands } from "./utils/commandHandler";
import { loadEvents } from "./utils/eventHandler";
import { startVerificationServer } from "./utils/verificationServer";
import { redisClient } from "./utils/redis";

/**
 * Main bot initialization function
 */
async function main() {
  try {
    // Validate configuration
    logger.info("🔍 Validating configuration...");
    validateConfig();

    // Create Discord client
    logger.info("🤖 Creating Discord client...");
    const discordClient = new Client({
      intents: config.intents,
      presence: {
        status: "online",
      },
    }) as ExtendedClient;

    // Initialize commands collection
    discordClient.commands = new Collection();

    // Export client for use in other modules
    client = discordClient;

    // Load events
    logger.info("📥 Loading events...");
    await loadEvents(discordClient);

    // Load commands
    logger.info("📥 Loading commands...");
    await loadCommands(discordClient);

    // Login to Discord
    logger.info("🔐 Logging in to Discord...");
    await discordClient.login(config.token);

    // Register commands after successful login
    discordClient.once(Events.ClientReady, async () => {
      try {
        logger.info("📝 Registering slash commands...");
        await registerCommands(discordClient);

        // Start verification server
        logger.info("🚀 Starting verification server...");
        startVerificationServer({
          port: Number(process.env.VS_PORT) || 3001,
          corsOrigin: process.env.FRONTEND_URL || "*",
        });
      } catch (error) {
        logger.error("Failed to register commands:", error);
      }
    });

    // ... rest of the code
  } catch (error) {
    logger.error("Failed to start bot:", error);
    process.exit(1);
  }
}

// Export client for other modules (like wallet.ts)
export let client: ExtendedClient;

// Start the bot
main();
