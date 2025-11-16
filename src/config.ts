import { GatewayIntentBits } from 'discord.js';

export const config = {
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  guildId: process.env.GUILD_ID || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Discord.js Client Configuration
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],

  // Bot Configuration
  prefix: '!',
  ownerId: process.env.OWNER_ID || '',

  // Database (if needed later)
  databaseUrl: process.env.DATABASE_URL || '',
};

// Validate required environment variables
export function validateConfig() {
  const required = ['token', 'clientId'];
  const missing = required.filter(key => !config[key as keyof typeof config]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please create a .env file based on .env.example'
    );
  }
}
