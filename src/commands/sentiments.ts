import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import type { Command } from "../types";
import { CommandCategory } from "../types";
import {
  AVAILABLE_SYMBOLS,
  SentimentResponseSchema,
  type SentimentRequest,
  type Sentiment,
} from "@/dto/sentiment.dto";
import { fetchSentimentData } from "@/utils/callApi";
import { DISCORD_COLORS } from "@/shared/constants";
import { logger } from "@/utils/logger";

const sentiments: Command = {
  data: new SlashCommandBuilder()
    .setName("sentiment")
    .setDescription("View sentiments")
    .addStringOption((option) =>
      option
        .setName("symbol")
        .setDescription("The symbol of crypto")
        .addChoices(
          ...AVAILABLE_SYMBOLS.map((symbol) => ({
            name: symbol,
            value: symbol,
          })),
        )
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const symbol = interaction.options.getString("symbol", true);
    const req: SentimentRequest = {
      ticker: symbol,
      range: "1year",
      limit: 600,
      offset: 0,
    };
    let res = await fetchSentimentData(
      req.ticker,
      SentimentResponseSchema,
      req.range,
      req.limit,
      req.offset,
    );

    const result = res?.filter((val) => {
      const itemDate = new Date(val.date);
      const todayStartLocal = new Date();
      todayStartLocal.setHours(7, 0, 0, 0);
      const todayEndLocal = new Date(todayStartLocal);
      todayEndLocal.setDate(todayStartLocal.getDate() + 1);
      return itemDate >= todayStartLocal && itemDate < todayEndLocal;
    });

    await interaction.deferReply();

    let neutral: number | undefined = result?.filter(
      (val) => val.sentiment == ("Neutral" as Sentiment),
    ).length;
    let positive: number | undefined = result?.filter(
      (val) => val.sentiment == ("Positive" as Sentiment),
    ).length;

    neutral = !neutral ? 0 : neutral;
    positive = !positive ? 0 : positive;

    const total = !result?.length ? 0 : result.length;
    const negative: number | undefined = total - neutral - positive;

    // Calculate percentages
    const positivePercent =
      total > 0 ? ((positive / total) * 100).toFixed(1) : "0.0";
    const negativePercent =
      total > 0 ? ((negative / total) * 100).toFixed(1) : "0.0";
    const neutralPercent =
      total > 0 ? ((neutral / total) * 100).toFixed(1) : "0.0";

    // Determine overall sentiment
    let overallSentiment: string;
    let overallColor;
    let overallEmoji: string;

    if (positive > negative && positive > neutral) {
      overallSentiment = "Positive";
      overallColor = DISCORD_COLORS.Green;
      overallEmoji = "📈";
    } else if (negative > positive && negative > neutral) {
      overallSentiment = "Negative";
      overallColor = DISCORD_COLORS.Red;
      overallEmoji = "📉";
    } else {
      overallSentiment = "Neutral";
      overallColor = DISCORD_COLORS.Yellow;
      overallEmoji = "➡️";
    }

    // Create visual progress bars
    const createBar = (value: number, max: number, length: number = 10) => {
      const filled = Math.round((value / max) * length);
      const empty = length - filled;
      return "█".repeat(filled) + "░".repeat(empty);
    };

    const today_embed = new EmbedBuilder()
      .setColor(overallColor)
      .setTitle(`${symbol} Today's Sentiment Analysis`)
      .setDescription(
        `**Overall Mood:** ${overallEmoji} **${overallSentiment}**\n` +
          `Total measurements analyzed: **${total}**`,
      )
      .addFields(
        {
          name: "\u200B", // Empty field for spacing
          value: "**📊 Sentiment Breakdown**",
          inline: false,
        },
        {
          name: "📈 Positive",
          value:
            `${createBar(positive, total)}\n` +
            `**${positive}** occurrences • **${positivePercent}%**`,
          inline: false,
        },
        {
          name: "📉 Negative",
          value:
            `${createBar(negative, total)}\n` +
            `**${negative}** occurrences • **${negativePercent}%**`,
          inline: false,
        },
        {
          name: "➡️ Neutral",
          value:
            `${createBar(neutral, total)}\n` +
            `**${neutral}** occurrences • **${neutralPercent}%**`,
          inline: false,
        },
        {
          name: "\u200B", // Empty field for spacing
          value: "**📅 Time Period**",
          inline: false,
        },
        {
          name: "Today",
          value: `<t:${Math.floor(Date.now() / 1000)}:D> (<t:${Math.floor(Date.now() / 1000)}:R>)`,
          inline: true,
        },
        {
          name: "Total Measurements",
          value: `${total} data points`,
          inline: true,
        },
      )
      .setFooter({
        text: `Requested by ${interaction.user.tag} • Data updates in real-time`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [today_embed] });
  },
  cooldown: 3,
  category: CommandCategory.UTILITY,
};

export default sentiments;
