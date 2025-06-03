interface QueueItem<T> {
    id: string;
    task: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (error: any) => void;
    timestamp: number;
    timeout?: NodeJS.Timeout;
}

export class RequestQueue {
    private queue: QueueItem<any>[] = [];
    private processing = false;
    private maxConcurrent = 3; // Maximum concurrent AI requests
    private activeRequests = 0;
    private requestTimeout = 30000; // 30 seconds timeout per request
    private maxQueueSize = 50; // Maximum queue size to prevent memory issues

    constructor(maxConcurrent = 3, requestTimeout = 30000, maxQueueSize = 50) {
        this.maxConcurrent = maxConcurrent;
        this.requestTimeout = requestTimeout;
        this.maxQueueSize = maxQueueSize;
    }

    async addToQueue<T>(task: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            // Check if queue is full
            if (this.queue.length >= this.maxQueueSize) {
                reject(new Error('Request queue is full. Please try again later.'));
                return;
            }

            const id = this.generateId();
            const timestamp = Date.now();

            // Set up timeout for the request
            const timeout = setTimeout(() => {
                this.removeFromQueue(id);
                reject(new Error('Request timed out after 30 seconds'));
            }, this.requestTimeout);

            const queueItem: QueueItem<T> = {
                id,
                task,
                resolve,
                reject,
                timestamp,
                timeout
            };

            this.queue.push(queueItem);
            console.log(`📋 Added request ${id} to queue. Queue size: ${this.queue.length}`);

            // Start processing if not already processing
            this.processQueue();
        });
    }

    private async processQueue(): Promise<void> {
        // If we're already at max concurrent requests, wait
        if (this.activeRequests >= this.maxConcurrent) {
            return;
        }

        // If queue is empty, nothing to process
        if (this.queue.length === 0) {
            return;
        }

        const item = this.queue.shift();
        if (!item) return;

        this.activeRequests++;
        console.log(`⚡ Processing request ${item.id}. Active requests: ${this.activeRequests}`);

        try {
            // Clear the timeout since we're now processing
            if (item.timeout) {
                clearTimeout(item.timeout);
            }

            // Execute the task
            const result = await item.task();
            item.resolve(result);

            console.log(`✅ Completed request ${item.id} in ${Date.now() - item.timestamp}ms`);

        } catch (error) {
            console.error(`❌ Failed request ${item.id}:`, error);
            item.reject(error);

        } finally {
            this.activeRequests--;
            
            // Process next item in queue if available
            setImmediate(() => this.processQueue());
        }
    }

    private removeFromQueue(id: string): void {
        const index = this.queue.findIndex(item => item.id === id);
        if (index !== -1) {
            const item = this.queue.splice(index, 1)[0];
            if (item.timeout) {
                clearTimeout(item.timeout);
            }
            console.log(`🗑️ Removed request ${id} from queue`);
        }
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }

    // Get queue statistics
    getStats() {
        return {
            queueSize: this.queue.length,
            activeRequests: this.activeRequests,
            maxConcurrent: this.maxConcurrent,
            maxQueueSize: this.maxQueueSize,
            oldestRequestAge: this.queue.length > 0 ? Date.now() - this.queue[0].timestamp : 0
        };
    }

    // Clear all pending requests (useful for shutdown)
    clearQueue(): void {
        console.log(`🧹 Clearing ${this.queue.length} pending requests from queue`);
        
        this.queue.forEach(item => {
            if (item.timeout) {
                clearTimeout(item.timeout);
            }
            item.reject(new Error('Queue cleared - bot is shutting down'));
        });
        
        this.queue = [];
    }

    // Set new concurrency limit
    setConcurrencyLimit(limit: number): void {
        this.maxConcurrent = Math.max(1, Math.min(10, limit)); // Limit between 1-10
        console.log(`🔧 Set concurrency limit to ${this.maxConcurrent}`);
        
        // Process queue in case we can handle more requests now
        this.processQueue();
    }
}

// Export a singleton instance for use throughout the application
export const globalQueue = new RequestQueue();
