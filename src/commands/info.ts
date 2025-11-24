import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import type { Command } from "../types";
import { CommandCategory } from "../types";
import { DISCORD_COLORS } from "@/shared/constants";

const info: Command = {
  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("Display information about the bot or server")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("bot")
        .setDescription("Display information about the bot"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("server")
        .setDescription("Display information about the server"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("user")
        .setDescription("Display information about a user")
        .addUserOption((option) =>
          option
            .setName("target")
            .setDescription("The user to get information about")
            .setRequired(false),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "bot":
        await handleBotInfo(interaction);
        break;
      case "server":
        await handleServerInfo(interaction);
        break;
      case "user":
        await handleUserInfo(interaction);
        break;
    }
  },

  cooldown: 5,
  category: CommandCategory.INFO,
};

async function handleBotInfo(interaction: ChatInputCommandInteraction) {
  const client = interaction.client;
  const uptime = client.uptime || 0;
  const days = Math.floor(uptime / 86400000);
  const hours = Math.floor(uptime / 3600000) % 24;
  const minutes = Math.floor(uptime / 60000) % 60;
  const seconds = Math.floor(uptime / 1000) % 60;

  const embed = new EmbedBuilder()
    .setColor(DISCORD_COLORS.Discord)
    .setTitle("🤖 Bot Information")
    .setThumbnail(client.user?.displayAvatarURL() || "")
    .addFields(
      {
        name: "📛 Name",
        value: client.user?.username || "Unknown",
        inline: true,
      },
      { name: "🆔 ID", value: client.user?.id || "Unknown", inline: true },
      {
        name: "📊 Servers",
        value: client.guilds.cache.size.toString(),
        inline: true,
      },
      {
        name: "👥 Users",
        value: client.users.cache.size.toString(),
        inline: true,
      },
      {
        name: "📡 Ping",
        value: `${Math.round(client.ws.ping)}ms`,
        inline: true,
      },
      {
        name: "⏰ Uptime",
        value: `${days}d ${hours}h ${minutes}m ${seconds}s`,
        inline: true,
      },
      { name: "⚡ Runtime", value: "Bun", inline: true },
      { name: "📚 Library", value: "Discord.js v14", inline: true },
      { name: "💻 Node Version", value: process.version, inline: true },
    )
    .setTimestamp()
    .setFooter({
      text: `Requested by ${interaction.user.tag}`,
      iconURL: interaction.user.displayAvatarURL(),
    });

  await interaction.reply({ embeds: [embed] });
}

async function handleServerInfo(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "This command can only be used in a server!",
      ephemeral: true,
    });
    return;
  }

  const guild = interaction.guild;
  const owner = await guild.fetchOwner();
  const createdAt = Math.floor(guild.createdTimestamp / 1000);

  const embed = new EmbedBuilder()
    .setColor(DISCORD_COLORS.Discord)
    .setTitle("🏰 Server Information")
    .setThumbnail(guild.iconURL() || "")
    .addFields(
      { name: "📛 Name", value: guild.name, inline: true },
      { name: "🆔 ID", value: guild.id, inline: true },
      { name: "👑 Owner", value: `${owner.user.tag}`, inline: true },
      { name: "📅 Created", value: `<t:${createdAt}:R>`, inline: true },
      { name: "👥 Members", value: guild.memberCount.toString(), inline: true },
      {
        name: "📝 Channels",
        value: guild.channels.cache.size.toString(),
        inline: true,
      },
      {
        name: "😀 Emojis",
        value: guild.emojis.cache.size.toString(),
        inline: true,
      },
      {
        name: "🎭 Roles",
        value: guild.roles.cache.size.toString(),
        inline: true,
      },
      {
        name: "🚀 Boost Level",
        value: `Level ${guild.premiumTier}`,
        inline: true,
      },
      {
        name: "💎 Boosts",
        value: guild.premiumSubscriptionCount?.toString() || "0",
        inline: true,
      },
    );

  if (guild.description) {
    embed.setDescription(guild.description);
  }

  if (guild.banner) {
    embed.setImage(guild.bannerURL({ size: 1024 }) || "");
  }

  embed.setTimestamp().setFooter({
    text: `Requested by ${interaction.user.tag}`,
    iconURL: interaction.user.displayAvatarURL(),
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleUserInfo(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser("target") || interaction.user;
  const member = interaction.guild?.members.cache.get(targetUser.id);

  const embed = new EmbedBuilder()
    .setColor(DISCORD_COLORS.Discord)
    .setTitle("👤 User Information")
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: "📛 Username", value: targetUser.username, inline: true },
      { name: "🆔 ID", value: targetUser.id, inline: true },
      { name: "🤖 Bot", value: targetUser.bot ? "Yes" : "No", inline: true },
      {
        name: "📅 Account Created",
        value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`,
        inline: true,
      },
    );

  if (member) {
    embed.addFields(
      {
        name: "📥 Joined Server",
        value: `<t:${Math.floor(member.joinedTimestamp || 0 / 1000)}:R>`,
        inline: true,
      },
      {
        name: "🎨 Roles",
        value:
          member.roles.cache.size > 1
            ? `${member.roles.cache.size - 1}`
            : "None",
        inline: true,
      },
    );

    if (member.nickname) {
      embed.addFields({
        name: "🏷️ Nickname",
        value: member.nickname,
        inline: true,
      });
    }

    const roles = member.roles.cache
      .filter((role) => role.id !== interaction.guild?.id)
      .sort((a, b) => b.position - a.position)
      .map((role) => role.toString())
      .slice(0, 10);

    if (roles.length > 0) {
      embed.addFields({
        name: "📜 Top Roles",
        value: roles.join(", "),
        inline: false,
      });
    }
  }

  embed.setTimestamp().setFooter({
    text: `Requested by ${interaction.user.tag}`,
    iconURL: interaction.user.displayAvatarURL(),
  });

  await interaction.reply({ embeds: [embed], flags: 64 });
}

export default info;
