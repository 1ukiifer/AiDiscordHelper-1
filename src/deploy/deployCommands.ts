import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';

config();

// Import command data
import { data as aiCommandData } from '../commands/prompt/prompt';

const commands = [
    aiCommandData.toJSON()
];

// Deploy commands function
async function deployCommands() {
    const token = process.env.DISCORD_BOT_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID;
    const guildId = process.env.DISCORD_GUILD_ID; // Optional: for guild-specific commands

    if (!token) {
        console.error('❌ DISCORD_BOT_TOKEN is not set in environment variables');
        process.exit(1);
    }

    if (!clientId) {
        console.error('❌ DISCORD_CLIENT_ID is not set in environment variables');
        process.exit(1);
    }

    const rest = new REST().setToken(token);

    try {
        console.log(`🚀 Started refreshing ${commands.length} application (/) commands.`);

        let data: any;

        if (guildId) {
            // Deploy to specific guild (faster for testing)
            data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands }
            );
            console.log(`✅ Successfully reloaded ${data.length} guild commands for guild ${guildId}.`);
        } else {
            // Deploy globally (takes up to 1 hour to propagate)
            data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands }
            );
            console.log(`✅ Successfully reloaded ${data.length} global application commands.`);
        }

    } catch (error) {
        console.error('❌ Error deploying commands:', error);
        process.exit(1);
    }
}

// Clear all commands function (useful for cleanup)
async function clearCommands() {
    const token = process.env.DISCORD_BOT_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!token || !clientId) {
        console.error('❌ Missing required environment variables');
        process.exit(1);
    }

    const rest = new REST().setToken(token);

    try {
        console.log('🗑️ Started clearing application (/) commands.');

        if (guildId) {
            await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: [] }
            );
            console.log('✅ Successfully cleared guild commands.');
        } else {
            await rest.put(
                Routes.applicationCommands(clientId),
                { body: [] }
            );
            console.log('✅ Successfully cleared global commands.');
        }

    } catch (error) {
        console.error('❌ Error clearing commands:', error);
        process.exit(1);
    }
}

// Command line interface
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'deploy':
        deployCommands();
        break;
    case 'clear':
        clearCommands();
        break;
    default:
        console.log('Usage:');
        console.log('  npm run deploy-commands deploy  - Deploy slash commands');
        console.log('  npm run deploy-commands clear   - Clear all slash commands');
        process.exit(1);
}

export { deployCommands, clearCommands };
