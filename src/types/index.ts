import {
  Client,
  Collection,
  CommandInteraction,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from "discord.js";
import type {
  ClientEvents,
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";

// Extended Client with commands collection
export interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
}

// Command structure
export interface Command {
  data:
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandOptionsOnlyBuilder
    | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
  cooldown?: number; // in seconds
  ownerOnly?: boolean;
  guildOnly?: boolean;
  category?: CommandCategory;
}

// Event structure
export interface Event<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute: (...args: ClientEvents[K]) => Promise<void> | void;
}

// Logger levels
export type LogLevel = "debug" | "info" | "warn" | "error";

// Logger interface
export interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

// Command categories
export enum CommandCategory {
  GENERAL = "General",
  MODERATION = "Moderation",
  UTILITY = "Utility",
  FUN = "Fun",
  ADMIN = "Admin",
  INFO = "Info",
}

// Error types
export class BotError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "BotError";
  }
}
