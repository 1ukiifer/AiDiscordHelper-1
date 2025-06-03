import { Client, Interaction, Message, SlashCommandBuilder } from 'discord.js';

// Extend Discord.js types for our specific use cases
declare module 'discord.js' {
    interface Client {
        commands?: Collection<string, Command>;
    }
}

// Command interface for slash commands
export interface Command {
    data: SlashCommandBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    cooldown?: number; // Cooldown in seconds
}

// AI Response interface
export interface AIResponse {
    content: string;
    model: string;
    tokensUsed?: number;
    responseTime: number;
    error?: string;
}

// Queue item interface for request management
export interface QueuedRequest {
    id: string;
    userId: string;
    guildId?: string;
    prompt: string;
    timestamp: number;
    priority: number;
    type: 'slash' | 'message' | 'dm';
}

// Rate limiting interface
export interface RateLimit {
    userId: string;
    requests: number;
    resetTime: number;
    blocked: boolean;
}

// Bot configuration interface
export interface BotConfig {
    maxTokens: number;
    temperature: number;
    maxQueueSize: number;
    requestTimeout: number;
    rateLimitRequests: number;
    rateLimitWindow: number;
    allowedChannels?: string[];
    blockedUsers?: string[];
}

// OpenAI specific types
export interface OpenAIConfig {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
}

// Error types for better error handling
export enum BotErrorType {
    RATE_LIMITED = 'RATE_LIMITED',
    QUEUE_FULL = 'QUEUE_FULL',
    AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
    INVALID_INPUT = 'INVALID_INPUT',
    PERMISSIONS_ERROR = 'PERMISSIONS_ERROR',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

export class BotError extends Error {
    public type: BotErrorType;
    public userMessage: string;
    
    constructor(type: BotErrorType, message: string, userMessage?: string) {
        super(message);
        this.type = type;
        this.userMessage = userMessage || message;
        this.name = 'BotError';
    }
}

// Statistics tracking
export interface BotStats {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    activeUsers: number;
    queueSize: number;
    uptime: number;
}

// Event data for analytics
export interface EventData {
    type: 'command' | 'message' | 'error';
    userId: string;
    guildId?: string;
    channelId: string;
    timestamp: number;
    data: any;
}
