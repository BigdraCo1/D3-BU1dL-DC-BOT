import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ComponentType,
} from "discord.js";
import type { Command, ExtendedClient } from "../types";
import { CommandCategory } from "../types";
import { logger } from "@/utils/logger";

const help: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Display all available commands and bot help information")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Get detailed information about a specific command")
        .setRequired(false)
        .setAutocomplete(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as ExtendedClient;
    const commandName = interaction.options.getString("command");

    if (commandName) {
      await handleSpecificCommand(interaction, client, commandName);
    } else {
      await handleGeneralHelp(interaction, client);
    }
  },

  async autocomplete(interaction) {
    const client = interaction.client as ExtendedClient;
    const focusedValue = interaction.options.getFocused().toLowerCase();

    const choices = Array.from(client.commands.keys())
      .filter((name) => name.toLowerCase().includes(focusedValue))
      .slice(0, 25)
      .map((name) => ({ name, value: name }));

    await interaction.respond(choices);
  },

  cooldown: 5,
  category: CommandCategory.GENERAL,
};

async function handleGeneralHelp(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
) {
  const commands = Array.from(client.commands.values());

  const mainEmbed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📚 Bot Help Menu")
    .setDescription(
      `Hello! I'm a Discord bot built with TypeScript and Bun for maximum performance.\n\n` +
        `**Total Commands:** ${commands.length}\n\n` +
        `Use \`/help <command>\` to get detailed information about a specific command.\n` +
        `Select a category below to view commands in that category.`,
    )
    .addFields(
      {
        name: "⚡ Quick Links",
        value: "Use the dropdown menu below to browse commands by category.",
        inline: false,
      },
      {
        name: "💡 Tip",
        value: "Most commands have a cooldown to prevent spam.",
        inline: false,
      },
    )
    .setThumbnail(client.user?.displayAvatarURL() || "")
    .setTimestamp()
    .setFooter({
      text: `Requested by ${interaction.user.tag}`,
      iconURL: interaction.user.displayAvatarURL(),
    });

  // Get available categories from commands
  const categoriesSet = new Set<string>();
  commands.forEach((cmd) => {
    if (cmd.category) {
      categoriesSet.add(cmd.category);
    }
  });

  const categoryEmojis: Record<string, string> = {
    [CommandCategory.GENERAL]: "🌐",
    [CommandCategory.UTILITY]: "🔧",
    [CommandCategory.FUN]: "🎮",
    [CommandCategory.MODERATION]: "🛡️",
    [CommandCategory.ADMIN]: "⚙️",
    [CommandCategory.INFO]: "ℹ️",
  };

  const categoryDescriptions: Record<string, string> = {
    [CommandCategory.GENERAL]: "General purpose commands",
    [CommandCategory.UTILITY]: "Useful utility commands",
    [CommandCategory.FUN]: "Fun and entertainment commands",
    [CommandCategory.MODERATION]: "Server moderation commands",
    [CommandCategory.ADMIN]: "Admin commands",
    [CommandCategory.INFO]: "Information commands",
  };

  // Create category selector with all available categories
  const selectOptions = [
    {
      label: "All Commands",
      description: "View all available commands",
      value: "all",
      emoji: "📋",
    },
  ];

  // Add options for each available category
  Array.from(categoriesSet)
    .sort()
    .forEach((cat) => {
      selectOptions.push({
        label: cat,
        description: categoryDescriptions[cat] || `${cat} commands`,
        value: cat.toLowerCase(),
        emoji: categoryEmojis[cat] || "📦",
      });
    });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("help_category")
    .setPlaceholder("📂 Select a category")
    .addOptions(selectOptions);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    selectMenu,
  );

  const response = await interaction.reply({
    embeds: [mainEmbed],
    components: [row],
    withResponse: true,
  });

  // Create collector for select menu interactions
  const collector = response.resource?.message?.createMessageComponentCollector(
    {
      componentType: ComponentType.StringSelect,
      time: 300_000, // 5 minutes
    },
  );

  if (!collector) {
    logger.error("Failed to create collector");
    return;
  }

  collector.on(
    "collect",
    async (selectInteraction: StringSelectMenuInteraction) => {
      if (selectInteraction.user.id !== interaction.user.id) {
        await selectInteraction.reply({
          content:
            "❌ This menu is not for you! Use `/help` to get your own help menu.",
          flags: 64,
        });
        return;
      }

      const category = selectInteraction.values[0];
      if (!category) return;

      const categoryEmbed = createCategoryEmbed(
        client,
        category,
        selectInteraction.user,
      );

      await selectInteraction.update({
        embeds: [categoryEmbed],
        components: [row],
      });
    },
  );

  collector.on("end", async () => {
    try {
      const disabledRow =
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          selectMenu.setDisabled(true),
        );

      await interaction.editReply({ components: [disabledRow] });
    } catch (error) {
      // Message was probably deleted
    }
  });
}

function createCategoryEmbed(
  client: ExtendedClient,
  category: string,
  user: any,
): EmbedBuilder {
  const allCommands = Array.from(client.commands.values());

  const categoryEmojis: Record<string, string> = {
    all: "📋",
    general: "🌐",
    utility: "🔧",
    fun: "🎮",
    moderation: "🛡️",
    admin: "⚙️",
    info: "ℹ️",
  };

  const categoryTitles: Record<string, string> = {
    all: "All Commands",
    general: "General Commands",
    utility: "Utility Commands",
    fun: "Fun Commands",
    moderation: "Moderation Commands",
    admin: "Admin Commands",
    info: "Info Commands",
  };

  // Filter commands by category
  let commands: Command[];
  if (category === "all") {
    commands = allCommands;
  } else {
    const categoryValue = Object.values(CommandCategory).find(
      (cat) => cat.toLowerCase() === category.toLowerCase(),
    );
    commands = allCommands.filter((cmd) => cmd.category === categoryValue);
  }

  const emoji = categoryEmojis[category.toLowerCase()] || "📋";
  const title =
    categoryTitles[category.toLowerCase()] || `${category} Commands`;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${emoji} ${title}`)
    .setDescription(
      `Here are the available commands in this category:\n\nTotal: **${commands.length}** command${commands.length === 1 ? "" : "s"}`,
    )
    .setTimestamp()
    .setFooter({
      text: `Requested by ${user.tag}`,
      iconURL: user.displayAvatarURL(),
    });

  if (commands.length === 0) {
    embed.addFields({
      name: "❌ No Commands",
      value: "No commands found in this category.",
      inline: false,
    });
  } else {
    const commandList = commands
      .map((cmd) => {
        const cooldown = cmd.cooldown ? ` • ${cmd.cooldown}s cooldown` : "";
        const ownerOnly = cmd.ownerOnly ? " 🔒" : "";
        const guildOnly = cmd.guildOnly ? " 🏠" : "";
        return `**/${cmd.data.name}**${ownerOnly}${guildOnly}\n${cmd.data.description}${cooldown}`;
      })
      .join("\n\n");

    if (commandList.length > 1024) {
      // Split into multiple fields if too long
      const chunks = commandList.match(/[\s\S]{1,1024}/g) || [];
      chunks.forEach((chunk, index) => {
        embed.addFields({
          name: index === 0 ? "Commands" : "\u200B",
          value: chunk,
          inline: false,
        });
      });
    } else {
      embed.addFields({
        name: "Commands",
        value: commandList || "None",
        inline: false,
      });
    }

    // Add legend
    embed.addFields({
      name: "Legend",
      value: "🔒 Owner Only • 🏠 Server Only",
      inline: false,
    });
  }

  return embed;
}

async function handleSpecificCommand(
  interaction: ChatInputCommandInteraction,
  client: ExtendedClient,
  commandName: string,
) {
  const command = client.commands.get(commandName);

  if (!command) {
    await interaction.reply({
      content: `❌ Command \`${commandName}\` not found! Use \`/help\` to see all available commands.`,
      flags: 64,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`📖 Command: /${command.data.name}`)
    .setDescription(command.data.description || "No description available.")
    .setTimestamp()
    .setFooter({
      text: `Requested by ${interaction.user.tag}`,
      iconURL: interaction.user.displayAvatarURL(),
    });

  // Add usage information
  embed.addFields({
    name: "📝 Usage",
    value: `\`/${command.data.name}\``,
    inline: false,
  });

  // Add cooldown information
  if (command.cooldown) {
    embed.addFields({
      name: "⏱️ Cooldown",
      value: `${command.cooldown} seconds`,
      inline: true,
    });
  }

  // Add permission requirements
  if (command.ownerOnly) {
    embed.addFields({
      name: "🔒 Restrictions",
      value: "Owner Only",
      inline: true,
    });
  } else if (command.guildOnly) {
    embed.addFields({
      name: "🔒 Restrictions",
      value: "Server Only",
      inline: true,
    });
  }

  // Add options if available
  const options = (command.data as any).options;
  if (options && options.length > 0) {
    const optionsText = options
      .map((opt: any) => {
        const required = opt.required ? "(required)" : "(optional)";
        return `**${opt.name}** ${required}\n${opt.description}`;
      })
      .join("\n\n");

    embed.addFields({ name: "⚙️ Options", value: optionsText, inline: false });
  }

  await interaction.reply({ embeds: [embed] });
}

export default help;
