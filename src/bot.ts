import { Client, GatewayIntentBits, Events, Interaction, Message } from 'discord.js';
import OpenAI from 'openai';
import { RequestQueue } from './queue/queue';
import { config } from 'dotenv';

config();

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key'
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

const requestQueue = new RequestQueue();

// Rate limiting map to prevent abuse
const userCooldowns = new Map<string, number>();
const COOLDOWN_DURATION = 5000; // 5 seconds

client.once(Events.ClientReady, () => {
    console.log(`✅ Discord bot is ready! Logged in as ${client.user?.tag}`);
});

// Handle slash commands
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user } = interaction;

    // Check rate limiting
    const now = Date.now();
    const cooldownExpiry = userCooldowns.get(user.id) || 0;
    
    if (now < cooldownExpiry) {
        const remainingTime = Math.ceil((cooldownExpiry - now) / 1000);
        await interaction.reply({
            content: `⏰ Please wait ${remainingTime} seconds before using this command again.`,
            ephemeral: true
        });
        return;
    }

    if (commandName === 'ai') {
        try {
            const prompt = interaction.options.getString('prompt', true);
            
            // Set cooldown
            userCooldowns.set(user.id, now + COOLDOWN_DURATION);
            
            await interaction.deferReply();

            // Add to queue
            const response = await requestQueue.addToQueue(async () => {
                return await generateAIResponse(prompt, user.username);
            });

            await interaction.editReply({
                content: response
            });

        } catch (error) {
            console.error('Error handling AI command:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ Failed to generate AI response: ${errorMessage}`
                });
            } else {
                await interaction.reply({
                    content: `❌ Failed to generate AI response: ${errorMessage}`,
                    ephemeral: true
                });
            }
        }
    }
});

// Handle direct messages to the bot
client.on(Events.MessageCreate, async (message: Message) => {
    // Ignore messages from bots
    if (message.author.bot) return;
    
    // Only respond in DMs or when mentioned
    const isMentioned = message.mentions.has(client.user!);
    const isDM = message.channel.type === 1; // DM channel type
    
    if (!isMentioned && !isDM) return;

    const userId = message.author.id;
    const now = Date.now();
    const cooldownExpiry = userCooldowns.get(userId) || 0;
    
    if (now < cooldownExpiry) {
        const remainingTime = Math.ceil((cooldownExpiry - now) / 1000);
        await message.reply(`⏰ Please wait ${remainingTime} seconds before sending another message.`);
        return;
    }

    try {
        // Set cooldown
        userCooldowns.set(userId, now + COOLDOWN_DURATION);
        
        // Show typing indicator
        if ('sendTyping' in message.channel) {
            await message.channel.sendTyping();
        }

        // Extract prompt (remove mention if present)
        let prompt = message.content;
        if (isMentioned) {
            prompt = prompt.replace(/<@!?\d+>/g, '').trim();
        }

        if (!prompt) {
            await message.reply('Please provide a message for me to respond to!');
            return;
        }

        // Add to queue and get response
        const response = await requestQueue.addToQueue(async () => {
            return await generateAIResponse(prompt, message.author.username);
        });

        // Split long messages if needed (Discord has 2000 character limit)
        if (response.length > 2000) {
            const chunks = splitMessage(response, 2000);
            for (const chunk of chunks) {
                await message.reply(chunk);
            }
        } else {
            await message.reply(response);
        }

    } catch (error) {
        console.error('Error handling message:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        await message.reply(`❌ Failed to generate AI response: ${errorMessage}`);
    }
});

async function generateAIResponse(prompt: string, username: string): Promise<string> {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
            messages: [
                {
                    role: "system",
                    content: `You are a helpful AI assistant in a Discord server. You're chatting with ${username}. Be conversational, helpful, and engaging. Keep responses concise but informative. Use Discord-friendly formatting when appropriate (like **bold** or *italic*).`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 1000,
            temperature: 0.7
        });

        const aiResponse = response.choices[0]?.message?.content;
        
        if (!aiResponse) {
            throw new Error('No response generated from AI model');
        }

        return aiResponse;

    } catch (error) {
        console.error('OpenAI API error:', error);
        if (error instanceof Error) {
            if (error.message.includes('rate limit')) {
                throw new Error('AI service is currently rate limited. Please try again later.');
            } else if (error.message.includes('API key')) {
                throw new Error('AI service configuration error. Please contact the administrator.');
            } else {
                throw new Error(`AI service error: ${error.message}`);
            }
        }
        throw new Error('Unknown AI service error occurred');
    }
}

function splitMessage(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let current = '';
    
    const words = text.split(' ');
    
    for (const word of words) {
        if ((current + word).length > maxLength) {
            if (current) {
                chunks.push(current.trim());
                current = word + ' ';
            } else {
                // Single word is too long, split it
                chunks.push(word.substring(0, maxLength));
                current = word.substring(maxLength) + ' ';
            }
        } else {
            current += word + ' ';
        }
    }
    
    if (current.trim()) {
        chunks.push(current.trim());
    }
    
    return chunks;
}

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});

// Login to Discord
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
    console.error('❌ DISCORD_BOT_TOKEN is not set in environment variables');
    process.exit(1);
}

client.login(token).catch((error) => {
    console.error('❌ Failed to login to Discord:', error);
    process.exit(1);
});

export { client, openai };
