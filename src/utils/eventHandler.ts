import { readdirSync } from 'fs';
import { join } from 'path';
import type { Event, ExtendedClient } from '../types';
import { logger } from './logger';

/**
 * Load all events from the events directory
 */
export async function loadEvents(client: ExtendedClient): Promise<void> {
  const eventsPath = join(import.meta.dir, '../events');

  try {
    const eventFiles = readdirSync(eventsPath).filter(
      file => file.endsWith('.ts') || file.endsWith('.js')
    );

    logger.info(`Loading ${eventFiles.length} event(s)...`);

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file);

      try {
        const eventModule = await import(filePath);
        const event: Event = eventModule.default || eventModule;

        if (!event.name || !event.execute) {
          logger.warn(`Event at ${file} is missing required "name" or "execute" property`);
          continue;
        }

        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args));
          logger.debug(`Loaded event (once): ${event.name}`);
        } else {
          client.on(event.name, (...args) => event.execute(...args));
          logger.debug(`Loaded event: ${event.name}`);
        }
      } catch (error) {
        logger.error(`Error loading event ${file}:`, error);
      }
    }

    logger.info(`Successfully loaded ${eventFiles.length} event(s)`);
  } catch (error) {
    logger.error('Error reading events directory:', error);
    throw error;
  }
}

/**
 * Unload a specific event
 */
export function unloadEvent(client: ExtendedClient, eventName: string): void {
  client.removeAllListeners(eventName);
  logger.info(`Unloaded event: ${eventName}`);
}

/**
 * Reload a specific event
 */
export async function reloadEvent(client: ExtendedClient, eventFile: string): Promise<void> {
  const eventsPath = join(import.meta.dir, '../events');
  const filePath = join(eventsPath, eventFile);

  try {
    // Clear the module cache (Bun specific)
    delete require.cache[filePath];

    const eventModule = await import(filePath);
    const event: Event = eventModule.default || eventModule;

    if (!event.name || !event.execute) {
      throw new Error('Event is missing required "name" or "execute" property');
    }

    // Remove old listeners
    client.removeAllListeners(event.name);

    // Add new listener
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }

    logger.info(`Reloaded event: ${event.name}`);
  } catch (error) {
    logger.error(`Error reloading event ${eventFile}:`, error);
    throw error;
  }
}
