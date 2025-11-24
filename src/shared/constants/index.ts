/**
 * Discord embed color palette
 * Map of color names to their hex values
 */
export const DISCORD_COLORS = {
  Default: 0x000000,
  Aqua: 0x1abc9c,
  DarkAqua: 0x11806a,
  Green: 0x57f287,
  DarkGreen: 0x1f8b4c,
  Blue: 0x3498db,
  DarkBlue: 0x206694,
  Purple: 0x9b59b6,
  DarkPurple: 0x71368a,
  LuminousVividPink: 0xe91e63,
  DarkVividPink: 0xad1457,
  Gold: 0xf1c40f,
  Discord: 0x5865f2,
  DarkGold: 0xc27c0e,
  Orange: 0xe67e22,
  DarkOrange: 0xa84300,
  Red: 0xed4245,
  DarkRed: 0x992d22,
  Grey: 0x95a5a6,
  DarkGrey: 0x979c9f,
  DarkerGrey: 0x7f8c8d,
  LightGrey: 0xbcc0c0,
  Navy: 0x34495e,
  DarkNavy: 0x2c3e50,
  Yellow: 0xffff00,
} as const;

// Sentiment color mapping using Discord colors
export const SENTIMENT_COLORS = {
  Positive: DISCORD_COLORS.Green,
  Negative: DISCORD_COLORS.Red,
  Neutral: DISCORD_COLORS.Yellow,
} as const;
