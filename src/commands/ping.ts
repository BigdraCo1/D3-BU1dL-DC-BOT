import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import type { Command } from "../types";
import { CommandCategory } from "../types";

const ping: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong! and shows bot latency"),

  async execute(interaction: ChatInputCommandInteraction) {
    // Defer first to get the initial response time
    await interaction.deferReply({ flags: 64 });

    // Fetch the deferred reply to get timestamp
    const message = await interaction.fetchReply();

    const latency = message.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    await interaction.editReply(
      `🏓 Pong!\n` +
        `📡 Latency: ${latency}ms\n` +
        `💓 API Latency: ${apiLatency}ms`,
    );
  },

  cooldown: 3,
  category: CommandCategory.UTILITY,
};

export default ping;
