
interface RateLimitContext {
    count: number;
    lastReset: number;
}

const rateLimitMap = new Map<string, RateLimitContext>();

interface RateLimitOptions {
    interval: number; // in milliseconds
    uniqueTokenPerInterval: number; // Max number of unique tokens (IPs) to track per interval
}

export class RateLimiter {
    private check: (limit: number, token: string) => Promise<void>;

    constructor(options: RateLimitOptions) {
        this.check = async (limit: number, token: string) => {
            const now = Date.now();
            const { interval } = options;

            // Clean up old entries periodically (simple garbage collection)
            // Ideally this would be done on a separate interval, but for simplicity we do it lazily or just rely on Map size management if needed.
            // For this implementation, we will reset the specific token if the interval has passed.

            let context = rateLimitMap.get(token);

            if (!context || now - context.lastReset > interval) {
                // Reset or new
                context = {
                    count: 0,
                    lastReset: now
                };
                rateLimitMap.set(token, context);
            }

            context.count += 1;

            if (context.count > limit) {
                throw new Error('Rate limit exceeded');
            }
        };
    }

    public getCheck() {
        return this.check;
    }
}

// Singleton instance for general API rate limiting
// 100 requests per minute per IP
export const apiRateLimiter = new RateLimiter({
    interval: 60 * 1000, // 60 seconds
    uniqueTokenPerInterval: 500,
});

// Singleton instance for strict auth rate limiting
// 5 requests per minute per IP
export const authRateLimiter = new RateLimiter({
    interval: 60 * 1000, // 60 seconds
    uniqueTokenPerInterval: 500,
});
