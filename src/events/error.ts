import { Events } from 'discord.js';
import type { Event } from '../types';
import { logger } from '../utils/logger';

const error: Event<Events.Error> = {
  name: Events.Error,

  async execute(error: Error) {
    logger.error('Discord client error:', error);

    // Log additional error details
    if (error.stack) {
      logger.error('Stack trace:', error.stack);
    }

    // You can add additional error handling here, such as:
    // - Sending error notifications to a Discord channel
    // - Logging to an external service (Sentry, etc.)
    // - Attempting recovery actions
  },
};

export default error;
