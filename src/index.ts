import "dotenv/config";
import { Client, Collection, Events } from "discord.js";
import type { ExtendedClient } from "./types";
import { config, validateConfig } from "./config";
import { logger } from "./utils/logger";
import { loadCommands, registerCommands } from "./utils/commandHandler";
import { loadEvents } from "./utils/eventHandler";

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
    const client = new Client({
      intents: config.intents,
      presence: {
        status: "online",
      },
    }) as ExtendedClient;

    // Initialize commands collection
    client.commands = new Collection();

    // Load events
    logger.info("📥 Loading events...");
    await loadEvents(client);

    // Load commands
    logger.info("📥 Loading commands...");
    await loadCommands(client);

    // Login to Discord
    logger.info("🔐 Logging in to Discord...");
    await client.login(config.token);

    // Register commands after successful login
    client.once(Events.ClientReady, async () => {
      try {
        logger.info("📝 Registering slash commands...");
        await registerCommands(client);
      } catch (error) {
        logger.error("Failed to register commands:", error);
      }
    });

    // Handle process termination
    process.on("SIGINT", async () => {
      logger.info("🛑 Received SIGINT, shutting down gracefully...");
      client.destroy();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("🛑 Received SIGTERM, shutting down gracefully...");
      client.destroy();
      process.exit(0);
    });

    // Handle unhandled rejections
    process.on("unhandledRejection", (error: Error) => {
      logger.error("Unhandled promise rejection:", error);
    });

    process.on("uncaughtException", (error: Error) => {
      logger.error("Uncaught exception:", error);
      process.exit(1);
    });
  } catch (error) {
    logger.error("Failed to start bot:", error);
    process.exit(1);
  }
}

// Start the bot
main();
