import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Chat with the AI assistant')
    .addStringOption(option =>
        option
            .setName('prompt')
            .setDescription('Your message to the AI')
            .setRequired(true)
            .setMaxLength(1000)
    )
    .addBooleanOption(option =>
        option
            .setName('private')
            .setDescription('Whether to respond privately (default: false)')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const prompt = interaction.options.getString('prompt', true);
    const isPrivate = interaction.options.getBoolean('private') ?? false;

    // Validate input
    if (!prompt.trim()) {
        await interaction.reply({
            content: '❌ Please provide a valid prompt.',
            ephemeral: true
        });
        return;
    }

    // Check for inappropriate content (basic filter)
    const inappropriatePatterns = [
        /\b(hack|exploit|malware|virus)\b/i,
        /\b(illegal|criminal|terrorism)\b/i,
        /\b(suicide|self.harm|kill)\b/i
    ];

    const hasInappropriateContent = inappropriatePatterns.some(pattern => 
        pattern.test(prompt)
    );

    if (hasInappropriateContent) {
        await interaction.reply({
            content: '❌ Your request contains inappropriate content and cannot be processed.',
            ephemeral: true
        });
        return;
    }

    // The actual AI processing is handled in the main bot.ts file
    // This file primarily defines the command structure and validation
}

export const cooldown = 5; // 5 seconds cooldown per user
