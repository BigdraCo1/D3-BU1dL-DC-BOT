import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import type { Command } from './types';
import { config, validateConfig } from './config';

/**
 * Standalone script to deploy slash commands to Discord
 * Run with: bun run src/deploy-commands.ts
 */

async function deployCommands() {
  try {
    console.log('🔍 Validating configuration...');
    validateConfig();

    console.log('📥 Loading commands...');
    const commands = [];
    const commandsPath = join(import.meta.dir, 'commands');
    const commandFiles = readdirSync(commandsPath).filter(
      file => file.endsWith('.ts') || file.endsWith('.js')
    );

    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      try {
        const commandModule = await import(filePath);
        const command: Command = commandModule.default || commandModule;

        if (!command.data || !command.execute) {
          console.warn(`⚠️  Command at ${file} is missing required "data" or "execute" property`);
          continue;
        }

        commands.push(command.data.toJSON());
        console.log(`✅ Loaded: ${command.data.name}`);
      } catch (error) {
        console.error(`❌ Error loading command ${file}:`, error);
      }
    }

    console.log(`\n📊 Total commands loaded: ${commands.length}\n`);

    // Construct and prepare an instance of the REST module
    const rest = new REST().setToken(config.token);

    console.log('🚀 Started refreshing application (/) commands...\n');

    if (config.guildId && config.nodeEnv === 'development') {
      // Deploy to specific guild (instant updates)
      console.log(`📍 Deploying to guild: ${config.guildId}`);
      const data = await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      ) as any[];

      console.log(`\n✅ Successfully registered ${data.length} guild commands!`);
      console.log('💡 Guild commands update instantly.\n');
    } else {
      // Deploy globally (takes up to 1 hour)
      console.log('🌍 Deploying globally...');
      const data = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      ) as any[];

      console.log(`\n✅ Successfully registered ${data.length} global commands!`);
      console.log('⏰ Global commands may take up to 1 hour to update.\n');
    }

    // List deployed commands
    console.log('📋 Deployed commands:');
    commands.forEach((cmd: any, index: number) => {
      console.log(`   ${index + 1}. /${cmd.name} - ${cmd.description}`);
    });

    console.log('\n✨ Command deployment complete!\n');
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    process.exit(1);
  }
}

// Run deployment
deployCommands();
