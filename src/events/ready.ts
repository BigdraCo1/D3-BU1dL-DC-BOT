import { Events, ActivityType, Client } from "discord.js";
import type { Event, ExtendedClient } from "../types";
import { logger } from "../utils/logger";

const ready: Event<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,

  async execute(client: Client<true>) {
    const extendedClient = client as unknown as ExtendedClient;
    if (!extendedClient.user) {
      logger.error("Client user is not available!");
      return;
    }

    logger.info(`✅ Logged in as ${extendedClient.user.tag}`);
    logger.info(`📊 Serving ${extendedClient.guilds.cache.size} guild(s)`);
    logger.info(`👥 Watching ${extendedClient.users.cache.size} user(s)`);
    logger.info(`📡 Ping: ${Math.round(extendedClient.ws.ping)}ms`);

    // Set bot activity/status
    const activities = [
      { name: "/help for commands", type: ActivityType.Listening },
      {
        name: `${extendedClient.guilds.cache.size} servers`,
        type: ActivityType.Watching,
      },
      { name: "Discord.js + Bun", type: ActivityType.Playing },
    ];

    let currentActivity = 0;

    const updateActivity = () => {
      if (!extendedClient.user) return;

      extendedClient.user.setActivity(activities[currentActivity]);
      currentActivity = (currentActivity + 1) % activities.length;
    };

    // Set initial activity
    updateActivity();

    // Rotate activity every 30 seconds
    setInterval(updateActivity, 30_000);

    logger.info("🤖 Bot is ready and operational!");
  },
};

export default ready;
