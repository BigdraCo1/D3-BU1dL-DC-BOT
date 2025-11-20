import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import type { Command } from "../types";
import { CommandCategory } from "../types";
import { logger } from "../utils/logger";

const channels: Command = {
  data: new SlashCommandBuilder()
    .setName("channel")
    .setDescription("Manage category channels")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a new category channel")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("The name of the category")
            .setRequired(true),
        )
        .addChannelOption((option) =>
          option
            .setName("category")
            .setDescription("The category to add channel")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("The type of channel")
            .addChoices(
              { name: "Text", value: String(ChannelType.GuildText) },
              { name: "Voice", value: String(ChannelType.GuildVoice) },
            )
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("position")
            .setDescription("The position of the category (optional)")
            .setRequired(false),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "❌ This command can only be used in a server!",
        flags: 64,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case "create":
          await handleCreate(interaction);
          break;
        default:
          await interaction.reply({
            content: "❌ Unknown subcommand!",
            flags: 64,
          });
      }
    } catch (error) {
      logger.error("Error executing category command:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: `❌ An error occurred: ${errorMessage}`,
        });
      } else {
        await interaction.reply({
          content: `❌ An error occurred: ${errorMessage}`,
          flags: 64,
        });
      }
    }
  },

  cooldown: 3,
  category: CommandCategory.MODERATION,
  guildOnly: true,
  ownerOnly: true,
};

async function handleCreate(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString("name", true);
  const position = interaction.options.getInteger("position");
  const category = interaction.options.getChannel("category", true);
  const typeOp = interaction.options.getString("type", true);
  if (!interaction.guild) return;

  const botMember = await interaction.guild.members.fetchMe();
  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({
      content: "❌ I don't have permission to manage channels!",
      flags: 64,
    });
    return;
  }

  await interaction.deferReply();

  const fullCategory = await interaction.guild.channels.fetch(category.id);
  if (!fullCategory || fullCategory.type !== ChannelType.GuildCategory) {
    await interaction.editReply({
      content: "❌ Could not find the category!",
    });
    return;
  }

  // Get the permission overwrites from the category
  const permissionOverwrites = Array.from(
    fullCategory.permissionOverwrites.cache.values(),
  );

  // **FIX: Force @everyone to be denied ViewChannel**
  const everyoneIndex = permissionOverwrites.findIndex(
    (p) => p.id === interaction.guild!.id,
  );

  if (everyoneIndex >= 0) {
    // Modify existing @everyone permission to deny ViewChannel
    permissionOverwrites[everyoneIndex] = {
      id: interaction.guild.id,
      deny: [PermissionFlagsBits.ViewChannel],
    };
  } else {
    // Add @everyone deny permission
    permissionOverwrites.push({
      id: interaction.guild.id,
      deny: [PermissionFlagsBits.ViewChannel],
    });
  }

  let channelType: ChannelType;
  switch (typeOp) {
    case "voice":
      channelType = ChannelType.GuildVoice;
      break;
    default:
      channelType = ChannelType.GuildText;
  }

  const channel = await interaction.guild.channels.create({
    name: name,
    type: channelType,
    parent: fullCategory.id,
    position: position ?? undefined,
    permissionOverwrites: permissionOverwrites,
  });

  logger.info(
    `Private channel "${name}" created by ${interaction.user.tag} in ${interaction.guild.name}`,
  );

  await interaction.editReply({
    content: `✅ Successfully created **private** channel **${channel.name}**!\nID: \`${channel.id}\``,
  });
}

export default channels;
