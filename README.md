# Discord Bot - TypeScript + Bun 🤖

A high-performance Discord bot built with TypeScript and Bun runtime for blazing-fast execution. Features a modular command system, event handling, and comprehensive utility commands.

## ✨ Features

- ⚡ **Ultra-fast** - Built with Bun for maximum performance
- 📝 **TypeScript** - Full type safety and IntelliSense support
- 🎯 **Slash Commands** - Modern Discord slash command support with categories
- 🔧 **Modular Architecture** - Easy to extend with new commands and events
- 🎨 **Rich Embeds** - Beautiful embedded messages with Discord's embed system
- ⏱️ **Cooldown System** - Built-in command cooldown management
- 🔄 **Auto-reload** - Hot-reload support during development
- 🛡️ **Error Handling** - Comprehensive error handling and logging
- 🎨 **Colorized Logs** - Pretty console logging with colors
- 🏷️ **Command Categories** - Organized commands by category (Utility, Info, General, etc.)

## 📋 Prerequisites

- [Bun](https://bun.sh) v1.0 or higher
- A Discord Bot Token ([Create one here](https://discord.com/developers/applications))
- Discord Application with proper intents enabled

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd discord-bot

# Install dependencies
bun install
```

### 2. Configuration

Create a `.env` file in the root directory:

```env
# Discord Bot Configuration (REQUIRED)
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here

# Optional Configuration
GUILD_ID=your_test_guild_id_here
NODE_ENV=development
LOG_LEVEL=info
OWNER_ID=your_discord_user_id
```

### 3. Getting Your Bot Credentials

#### Create a Discord Application:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** and give it a name
3. Go to the **"Bot"** section and click **"Add Bot"**
4. Copy the token (this is your `DISCORD_TOKEN`) ⚠️ Never share this!
5. Under **"Privileged Gateway Intents"**, enable:
   - ✅ Presence Intent
   - ✅ Server Members Intent
   - ✅ Message Content Intent

#### Get Your Client ID:

1. Go to **"OAuth2"** > **"General"**
2. Copy the **"Client ID"** (this is your `CLIENT_ID`)

#### Invite Your Bot:

1. Go to **"OAuth2"** > **"URL Generator"**
2. Select scopes: `bot`, `applications.commands`
3. Select permissions based on your needs (or use `Administrator` for full access)
4. Copy the generated URL and open it in your browser to invite the bot to your server

### 4. Run the Bot

```bash
# Development mode (with hot-reload)
bun run dev

# Production mode
bun run start

# Deploy/register commands to Discord
bun run deploy

# Type checking
bun run lint

# Build for production
bun run build
```

## 📁 Project Structure

```
discord-bot/
├── src/
│   ├── commands/              # Slash commands
│   │   ├── ping.ts           # Latency check command
│   │   ├── help.ts           # Help and command listing
│   │   ├── info.ts           # Bot, server, and user information
│   │   ├── avatar.ts         # Display user avatars
│   │   ├── role.ts           # Role information
│   │   ├── channels.ts       # List server channels
│   │   └── categories.ts     # List channel categories
│   ├── events/               # Event handlers
│   │   ├── ready.ts          # Bot ready event
│   │   ├── interactionCreate.ts  # Interaction handling
│   │   └── error.ts          # Error handling
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts          # Main types and interfaces
│   ├── utils/                # Utility functions
│   │   ├── logger.ts         # Logging utility with colors
│   │   ├── commandHandler.ts # Command loading/registration
│   │   └── eventHandler.ts   # Event loading
│   ├── config.ts             # Bot configuration
│   ├── index.ts              # Main entry point
│   └── deploy-commands.ts    # Command deployment script
├── .env.example              # Environment variables template
├── .gitignore               # Git ignore rules
├── package.json             # Package configuration
├── tsconfig.json            # TypeScript configuration
├── bun.lock                 # Bun lockfile
└── README.md               # This file
```

## 🎮 Available Commands

| Command | Description | Category |
|---------|-------------|----------|
| `/ping` | Check bot latency and API response time | Utility |
| `/help [command]` | Display all commands or get info about a specific command | Utility |
| `/info bot` | Display information about the bot | Info |
| `/info server` | Display information about the current server | Info |
| `/info user [user]` | Display information about a user | Info |
| `/avatar [user]` | Display user's avatar in different sizes | General |
| `/role <role>` | Get detailed information about a server role | Info |
| `/channels` | List all channels in the server | Info |
| `/categories` | List all channel categories in the server | Info |

## 🔨 Creating Custom Commands

### Basic Command Structure

Create a new file in `src/commands/`, for example `mycommand.ts`:

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types';
import { CommandCategory } from '../types';

const myCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('mycommand')
    .setDescription('Description of my command')
    .addStringOption(option =>
      option
        .setName('input')
        .setDescription('Some input')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const input = interaction.options.getString('input', true);
    await interaction.reply(`You said: ${input}`);
  },

  cooldown: 5, // 5 seconds cooldown (optional)
  category: CommandCategory.GENERAL, // Command category (optional)
  guildOnly: false, // Can be used in DMs (optional)
  ownerOnly: false, // Not restricted to owner (optional)
};

export default myCommand;
```

The command will be automatically loaded on next restart or hot-reload.

### Command with Subcommands

```typescript
const command: Command = {
  data: new SlashCommandBuilder()
    .setName('manage')
    .setDescription('Manage server settings')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current settings')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('update')
        .setDescription('Update settings')
        .addStringOption(option =>
          option
            .setName('key')
            .setDescription('Setting key')
            .setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'view') {
      await interaction.reply('Showing settings...');
    } else if (subcommand === 'update') {
      const key = interaction.options.getString('key', true);
      await interaction.reply(`Updating ${key}...`);
    }
  },
};
```

## 🎭 Creating Custom Events

Create a new file in `src/events/`, for example `guildMemberAdd.ts`:

```typescript
import { Events, GuildMember } from 'discord.js';
import type { Event } from '../types';
import { logger } from '../utils/logger';

const guildMemberAdd: Event<Events.GuildMemberAdd> = {
  name: Events.GuildMemberAdd,
  once: false, // Set to true for one-time events

  async execute(member: GuildMember) {
    logger.info(`New member joined: ${member.user.tag}`);
    
    // Send welcome message
    const channel = member.guild.systemChannel;
    if (channel) {
      await channel.send(`Welcome to the server, ${member}! 🎉`);
    }
  },
};

export default guildMemberAdd;
```

The event will be automatically loaded on next restart.

## 🔐 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DISCORD_TOKEN` | Your Discord bot token | ✅ Yes | - |
| `CLIENT_ID` | Your Discord application client ID | ✅ Yes | - |
| `GUILD_ID` | Guild ID for testing (faster updates) | ❌ No | - |
| `NODE_ENV` | Environment (development/production) | ❌ No | `development` |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | ❌ No | `info` |
| `OWNER_ID` | Bot owner's Discord user ID | ❌ No | - |

## 📊 Performance Benefits of Bun

Bun provides significant performance improvements over Node.js:

- **3x faster** package installation
- **4x faster** startup time
- **Built-in TypeScript** support (no need for ts-node or compilation)
- **Fast test runner** built-in
- **Hot reload** out of the box with `--watch` flag
- **Lower memory** usage
- **Native web APIs** (fetch, WebSocket, etc.)

## 🎨 Command Categories

Commands are organized into categories for better organization:

- **General** - General purpose commands
- **Info** - Information and lookup commands
- **Utility** - Utility and tool commands
- **Moderation** - Server moderation commands
- **Admin** - Administrator-only commands
- **Fun** - Entertainment and fun commands

## 🐛 Debugging

Enable debug logging for detailed information:

```env
LOG_LEVEL=debug
```

This will show:
- Command execution details
- Event handling information
- API request/response times
- Detailed error stack traces

## 📝 Best Practices

### Command Design
- ✅ Keep commands focused - Each command should do one thing well
- ✅ Use descriptive names and descriptions
- ✅ Add appropriate cooldowns to prevent spam
- ✅ Use command categories for organization

### Responses
- ✅ Use embeds for rich, formatted responses
- ✅ Use ephemeral replies for error messages (`{ ephemeral: true }`)
- ✅ Provide clear feedback to users
- ✅ Handle loading states with `deferReply()` for slow operations

### Error Handling
- ✅ Always wrap risky operations in try-catch blocks
- ✅ Provide user-friendly error messages
- ✅ Log errors with context for debugging
- ✅ Handle permission errors gracefully

### Security
- ✅ Never commit `.env` file or expose tokens
- ✅ Validate and sanitize user input
- ✅ Use `ownerOnly` flag for dangerous commands
- ✅ Check permissions before executing moderation commands

### Code Quality
- ✅ Use TypeScript types for type safety
- ✅ Follow consistent code style
- ✅ Add comments for complex logic
- ✅ Keep functions small and focused

## ⚠️ Common Issues

### Bot doesn't respond to commands
- ✅ Make sure you've deployed commands with `bun run deploy`
- ✅ Check that the bot has `applications.commands` scope
- ✅ Verify the bot token is correct in `.env`
- ✅ Enable required intents in Discord Developer Portal
- ✅ Check bot has permissions in the channel

### Commands not updating
- ✅ Use `GUILD_ID` in `.env` for instant updates during development
- ✅ Global commands can take up to 1 hour to propagate
- ✅ Try redeploying with `bun run deploy`
- ✅ Restart the bot after code changes

### Permission errors
- ✅ Ensure the bot has necessary permissions in your server
- ✅ Check role hierarchy (bot's role should be higher than roles it manages)
- ✅ Verify the bot was invited with correct permissions

### TypeScript errors
- ✅ Run `bun run lint` to check for type errors
- ✅ Make sure all dependencies are installed
- ✅ Check `tsconfig.json` is properly configured

## 🛠️ Development Workflow

```bash
# 1. Make code changes
vim src/commands/mycommand.ts

# 2. The bot auto-reloads (if using bun run dev)
# Or manually restart: Ctrl+C then bun run dev

# 3. Deploy commands to Discord
bun run deploy

# 4. Test in Discord
# Commands should appear when you type /

# 5. Check for type errors
bun run lint

# 6. Commit your changes
git add .
git commit -m "feat: add mycommand"
```

## 📚 Resources

- [Discord.js Documentation](https://discord.js.org/) - Official Discord.js docs
- [Discord.js Guide](https://discordjs.guide/) - Comprehensive tutorial
- [Discord Developer Portal](https://discord.com/developers/docs) - Discord API docs
- [Bun Documentation](https://bun.sh/docs) - Bun runtime docs
- [TypeScript Documentation](https://www.typescriptlang.org/docs/) - TypeScript docs
- [Discord API Types](https://discord-api-types.dev/) - Type definitions

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run type checking (`bun run lint`)
5. Test thoroughly
6. Commit your changes (`git commit -m 'feat: add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Commit Message Format

Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with [Discord.js](https://discord.js.org/) - Powerful Discord API library
- Powered by [Bun](https://bun.sh) - Ultra-fast JavaScript runtime
- Written in [TypeScript](https://www.typescriptlang.org/) - JavaScript with types
- Inspired by the Discord.js community

## 📞 Support

Need help? Here are some resources:

- 📖 Check the [Discord.js Guide](https://discordjs.guide/)
- 💬 Join the [Discord.js Discord server](https://discord.gg/djs)
- 🐛 Open an [issue](https://github.com/yourusername/discord-bot/issues) for bugs
- 💡 Start a [discussion](https://github.com/yourusername/discord-bot/discussions) for questions

## 🗺️ Roadmap

Future features and improvements:

- [ ] Database integration with Prisma
- [ ] User profile and stats tracking
- [ ] Music playback commands
- [ ] Advanced moderation tools
- [ ] Custom prefix support
- [ ] Dashboard web interface
- [ ] Plugin system
- [ ] Multi-language support
- [ ] Reaction roles
- [ ] Auto-moderation features

## ⚡ Performance Tips

- Use `interaction.deferReply()` for operations that take >3 seconds
- Batch database operations when possible
- Cache frequently accessed data
- Use ephemeral replies for temporary messages
- Implement pagination for large lists
- Use collectors with timeouts to prevent memory leaks

---

**Happy coding! 🚀**

Built with ❤️ using TypeScript, Bun, and Discord.js