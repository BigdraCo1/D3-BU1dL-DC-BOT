import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import type { Command } from "../types";
import { CommandCategory } from "../types";
import { DISCORD_COLORS } from "@/shared/constants";

const avatar: Command = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Display a user's avatar")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user whose avatar to display")
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user") || interaction.user;

    const embed = new EmbedBuilder()
      .setColor(DISCORD_COLORS.Discord)
      .setTitle(`${user.tag}'s Avatar`)
      .setImage(user.displayAvatarURL({ size: 1024 }))
      .setDescription(
        `[PNG](${user.displayAvatarURL({ extension: "png", size: 1024 })}) | ` +
          `[JPG](${user.displayAvatarURL({ extension: "jpg", size: 1024 })}) | ` +
          `[WEBP](${user.displayAvatarURL({ extension: "webp", size: 1024 })})`,
      )
      .setTimestamp()
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      });

    await interaction.reply({ embeds: [embed] });
  },

  cooldown: 3,
  category: CommandCategory.UTILITY,
};

export default avatar;
