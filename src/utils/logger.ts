import type { LogLevel } from "../types";

class Logger {
  private logLevel: LogLevel;
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(logLevel: LogLevel = "info") {
    this.logLevel = logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.logLevels[this.logLevel];
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  private colorize(text: string, color: string): string {
    const colors: Record<string, string> = {
      reset: "\x1b[0m",
      red: "\x1b[31m",
      yellow: "\x1b[33m",
      blue: "\x1b[34m",
      gray: "\x1b[90m",
    };
    return `${colors[color] || colors.reset}${text}${colors.reset}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog("debug")) {
      const formatted = this.formatMessage("debug", message);
      console.debug(this.colorize(formatted, "gray"), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog("info")) {
      const formatted = this.formatMessage("info", message);
      console.info(this.colorize(formatted, "blue"), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog("warn")) {
      const formatted = this.formatMessage("warn", message);
      console.warn(this.colorize(formatted, "yellow"), ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog("error")) {
      const formatted = this.formatMessage("error", message);
      console.error(this.colorize(formatted, "red"), ...args);
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
}

// Export singleton instance
export const logger = new Logger((process.env.LOG_LEVEL as LogLevel) || "info");
