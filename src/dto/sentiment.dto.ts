import { z } from "zod";

// Sentiment enum as Zod schema
export const SentimentSchema = z.enum(["Negative", "Positive", "Neutral"]);
export type Sentiment = z.infer<typeof SentimentSchema>;

export interface SentimentRequest {
  ticker: string;
  range: string;
  limit: number;
  offset: number;
}

// Individual sentiment data point from API
export const SentimentDataSchema = z.object({
  date: z.union([z.string(), z.date()]),
  sentiment: SentimentSchema,
});

export type SentimentData = z.infer<typeof SentimentDataSchema>;

export const SentimentResponseSchema = z.array(SentimentDataSchema);
export type SentimentResponse = z.infer<typeof SentimentResponseSchema>;

// Available symbols
export const AVAILABLE_SYMBOLS = ["BTC", "ETH", "SOL"] as const;
export type AvailableSymbol = (typeof AVAILABLE_SYMBOLS)[number];

// Helper function to check if a string is a valid symbol
export function isValidSymbol(symbol: string): symbol is AvailableSymbol {
  return (AVAILABLE_SYMBOLS as readonly string[]).includes(symbol);
}

// Sentiment color mapping for Discord embeds
export const SENTIMENT_COLORS = {
  positive: 0x00ff00, // Green
  negative: 0xff0000, // Red
  neutral: 0xffff00, // Yellow
} as const;

// Sentiment emoji mapping
export const SENTIMENT_EMOJIS = {
  positive: "📈",
  negative: "📉",
  neutral: "➡️",
} as const;

// Capitalize sentiment for display
export function capitalizeSentiment(sentiment: Sentiment): string {
  return sentiment.charAt(0).toUpperCase() + sentiment.slice(1);
}
