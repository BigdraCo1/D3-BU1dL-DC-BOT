import { Collection, REST, Routes } from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";
import type { Command, ExtendedClient } from "../types";
import { logger } from "./logger";
import { config } from "../config";

/**
 * Load all commands from the commands directory
 */
export async function loadCommands(client: ExtendedClient): Promise<void> {
  client.commands = new Collection<string, Command>();

  const commandsPath = join(import.meta.dir, "../commands");

  try {
    const commandFiles = readdirSync(commandsPath).filter(
      (file) => file.endsWith(".ts") || file.endsWith(".js"),
    );

    logger.info(`Loading ${commandFiles.length} command(s)...`);

    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);

      try {
        const commandModule = await import(filePath);
        const command: Command = commandModule.default || commandModule;

        if (!command.data || !command.execute) {
          logger.warn(
            `Command at ${file} is missing required "data" or "execute" property`,
          );
          continue;
        }

        client.commands.set(command.data.name, command);
        logger.debug(`Loaded command: ${command.data.name}`);
      } catch (error) {
        logger.error(`Error loading command ${file}:`, error);
      }
    }

    logger.info(`Successfully loaded ${client.commands.size} command(s)`);
  } catch (error) {
    logger.error("Error reading commands directory:", error);
    throw error;
  }
}

/**
 * Register slash commands with Discord API
 */
export async function registerCommands(client: ExtendedClient): Promise<void> {
  const commands = Array.from(client.commands.values()).map((command) =>
    command.data.toJSON(),
  );

  const rest = new REST().setToken(config.token);

  try {
    logger.info(
      `Started refreshing ${commands.length} application (/) commands.`,
    );

    if (config.guildId && config.nodeEnv === "development") {
      // Register commands to a specific guild for testing (instant updates)
      const data = (await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands },
      )) as any[];

      logger.info(`Successfully reloaded ${data.length} guild (/) commands.`);
    } else {
      // Register commands globally (takes up to 1 hour to propagate)
      const data = (await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands },
      )) as any[];

      logger.info(`Successfully reloaded ${data.length} global (/) commands.`);
    }
  } catch (error) {
    logger.error("Error registering commands:", error);
    throw error;
  }
}

/**
 * Handle command cooldowns
 */
const cooldowns = new Collection<string, Collection<string, number>>();

export function checkCooldown(
  userId: string,
  commandName: string,
  cooldownAmount: number,
): number | null {
  if (!cooldowns.has(commandName)) {
    cooldowns.set(commandName, new Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(commandName)!;
  const cooldownDuration = cooldownAmount * 1000;

  if (timestamps.has(userId)) {
    const expirationTime = timestamps.get(userId)! + cooldownDuration;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return timeLeft;
    }
  }

  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), cooldownDuration);

  return null;
}

/**
 * Clear all cooldowns for a user or command
 */
export function clearCooldown(commandName?: string, userId?: string): void {
  if (commandName && userId) {
    const timestamps = cooldowns.get(commandName);
    if (timestamps) {
      timestamps.delete(userId);
    }
  } else if (commandName) {
    cooldowns.delete(commandName);
  } else {
    cooldowns.clear();
  }
}
