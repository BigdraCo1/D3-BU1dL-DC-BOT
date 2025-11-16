import {
  Events,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from "discord.js";
import type { Event, ExtendedClient } from "../types";
import { logger } from "../utils/logger";
import { checkCooldown } from "../utils/commandHandler";
import { config } from "../config";

const interactionCreate: Event<Events.InteractionCreate> = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    const client = interaction.client as ExtendedClient;

    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
      await handleAutocomplete(interaction, client);
      return;
    }

    // Handle command interactions
    if (interaction.isChatInputCommand()) {
      await handleChatCommand(interaction, client);
      return;
    }

    // Add more interaction types here (buttons, select menus, modals, etc.)
  },
};

async function handleAutocomplete(
  interaction: AutocompleteInteraction,
  client: ExtendedClient,
) {
  const command = client.commands.get(interaction.commandName);

  if (!command || !command.autocomplete) {
    logger.warn(
      `No autocomplete handler found for command: ${interaction.commandName}`,
    );
    return;
  }

  try {
    await command.autocomplete(interaction);
  } catch (error) {
    logger.error(
      `Error executing autocomplete for ${interaction.commandName}:`,
      error,
    );
  }
}

async function handleChatCommand(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
) {
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`Command not found: ${interaction.commandName}`);
    await interaction.reply({
      content: "❌ This command no longer exists!",
      ephemeral: true,
    });
    return;
  }

  // Check if command is owner only
  if (command.ownerOnly && interaction.user.id !== config.ownerId) {
    await interaction.reply({
      content: `❌ This command can only be used by the bot owner! ${interaction.user.id} is not the owner.`,
      ephemeral: true,
      flags: 64,
    });
    return;
  }

  // Check if command is guild only
  if (command.guildOnly && !interaction.guild) {
    await interaction.reply({
      content: "❌ This command can only be used in a server!",
      ephemeral: true,
    });
    return;
  }

  // Check cooldown
  if (command.cooldown) {
    const timeLeft = checkCooldown(
      interaction.user.id,
      command.data.name,
      command.cooldown,
    );

    if (timeLeft !== null) {
      await interaction.reply({
        content: `⏱️ Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.data.name}\` command.`,
        ephemeral: true,
      });
      return;
    }
  }

  // Execute command
  try {
    logger.info(
      `${interaction.user.tag} (${interaction.user.id}) executed /${command.data.name} in ${
        interaction.guild
          ? `${interaction.guild.name} (${interaction.guild.id})`
          : "DM"
      }`,
    );

    await command.execute(interaction);
  } catch (error) {
    logger.error(`Error executing command ${command.data.name}:`, error);

    const errorMessage = {
      content: "❌ There was an error executing this command!",
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}

export default interactionCreate;
