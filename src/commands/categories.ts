import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  Role,
  OverwriteType,
} from "discord.js";
import type { Command } from "../types";
import { CommandCategory } from "../types";
import { logger } from "../utils/logger";

const categories: Command = {
  data: new SlashCommandBuilder()
    .setName("category")
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
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("The role to assign to the category")
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("position")
            .setDescription("The position of the category (optional)")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a category channel")
        .addChannelOption((option) =>
          option
            .setName("category")
            .setDescription("The category to delete")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("rename")
        .setDescription("Rename a category channel")
        .addChannelOption((option) =>
          option
            .setName("category")
            .setDescription("The category to rename")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("The new name for the category")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("List all category channels in the server"),
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
        case "delete":
          await handleDelete(interaction);
          break;
        case "rename":
          await handleRename(interaction);
          break;
        case "list":
          await handleList(interaction);
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
  const role = interaction.options.getRole("role", true);

  if (!(role instanceof Role)) {
    logger.error(`Could not resolve role for user`);
    await interaction.editReply("❌ Could not resolve that role!");
    return;
  }

  if (!interaction.guild) return;

  // Check bot permissions
  const botMember = await interaction.guild.members.fetchMe();
  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({
      content: "❌ I don't have permission to manage channels!",
      flags: 64,
    });
    return;
  }

  const category = await interaction.guild.channels.create({
    name: name,
    type: ChannelType.GuildCategory,
    position: position ?? undefined,
    permissionOverwrites: [
      {
        id: role.id,
        type: OverwriteType.Role,
        allow: PermissionFlagsBits.ViewChannel,
      },
    ],
  });

  logger.info(
    `Category "${name}" created by ${interaction.user.tag} in ${interaction.guild.name}`,
  );

  await interaction.reply({
    content: `✅ Successfully created category **${category.name}**!\nID: \`${category.id}\``,
    flags: 64,
  });
}

async function handleDelete(interaction: ChatInputCommandInteraction) {
  const category = interaction.options.getChannel("category", true);

  if (!interaction.guild) return;

  if (category.type !== ChannelType.GuildCategory) {
    await interaction.reply({
      content: "❌ The selected channel is not a category!",
      flags: 64,
    });
    return;
  }

  // Check bot permissions
  const botMember = await interaction.guild.members.fetchMe();
  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({
      content: "❌ I don't have permission to manage channels!",
      flags: 64,
    });
    return;
  }

  await interaction.deferReply({ flags: 64 });

  const categoryName = category.name;
  const categoryId = category.id;

  // Fetch the full category to delete it
  const fullCategory = await interaction.guild.channels.fetch(category.id);
  if (!fullCategory) {
    await interaction.editReply({
      content: "❌ Could not find the category!",
    });
    return;
  }

  const childChannels = interaction.guild.channels.cache.filter(
    (channel) => channel.parentId === fullCategory.id,
  );

  await Promise.all(childChannels.map((child) => child.delete()));

  await fullCategory.delete();

  logger.info(
    `Category "${categoryName}" deleted by ${interaction.user.tag} in ${interaction.guild.name}`,
  );

  await interaction.editReply({
    content: `✅ Successfully deleted category **${categoryName}**!\nID: \`${categoryId}\``,
  });
}

async function handleRename(interaction: ChatInputCommandInteraction) {
  const category = interaction.options.getChannel("category", true);
  const newName = interaction.options.getString("name", true);

  if (!interaction.guild) return;

  if (category.type !== ChannelType.GuildCategory) {
    await interaction.reply({
      content: "❌ The selected channel is not a category!",
      flags: 64,
    });
    return;
  }

  // Check bot permissions
  const botMember = await interaction.guild.members.fetchMe();
  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({
      content: "❌ I don't have permission to manage channels!",
      flags: 64,
    });
    return;
  }

  await interaction.deferReply({ flags: 64 });

  const oldName = category.name;

  // Fetch the full category to rename it
  const fullCategory = await interaction.guild.channels.fetch(category.id);
  if (!fullCategory) {
    await interaction.editReply({
      content: "❌ Could not find the category!",
    });
    return;
  }

  await fullCategory.setName(newName);

  logger.info(
    `Category "${oldName}" renamed to "${newName}" by ${interaction.user.tag} in ${interaction.guild.name}`,
  );

  await interaction.editReply({
    content: `✅ Successfully renamed category from **${oldName}** to **${newName}**!`,
  });
}

async function handleList(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;

  await interaction.deferReply({ flags: 64 });

  // Fetch all categories
  const categories = interaction.guild.channels.cache.filter(
    (channel) => channel.type === ChannelType.GuildCategory,
  );

  if (categories.size === 0) {
    await interaction.editReply({
      content: "📂 This server has no category channels.",
    });
    return;
  }

  // Sort by position
  const sortedCategories = Array.from(categories.values()).sort(
    (a, b) => a.position - b.position,
  );

  const categoryList = sortedCategories
    .map((cat, index) => {
      // Count channels in this category
      const channelCount = interaction.guild!.channels.cache.filter(
        (ch) => ch.parentId === cat.id,
      ).size;

      return `${index + 1}. **${cat.name}**\n   └ ID: \`${cat.id}\` | Channels: ${channelCount} | Position: ${cat.position}`;
    })
    .join("\n\n");

  // Split into chunks if too long
  const maxLength = 2000;
  if (categoryList.length <= maxLength) {
    await interaction.editReply({
      content: `📂 **Category Channels** (${categories.size} total)\n\n${categoryList}`,
    });
  } else {
    // Send in multiple messages
    const chunks: string[] = [];
    let currentChunk = "";

    for (const line of categoryList.split("\n\n")) {
      if ((currentChunk + line).length > maxLength - 100) {
        chunks.push(currentChunk);
        currentChunk = line;
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + line;
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    await interaction.editReply({
      content: `📂 **Category Channels** (${categories.size} total)\n\n${chunks[0]}`,
    });

    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({
        content: chunks[i],
      });
    }
  }
}

export default categories;
