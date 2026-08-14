interface RateLimitContext {
    count: number;
    lastReset: number;
}

const rateLimitMap = new Map<string, RateLimitContext>();
let lastGlobalCleanup = Date.now();

interface RateLimitOptions {
    interval: number; // in milliseconds
    uniqueTokenPerInterval: number; // Max number of unique tokens (IPs) to track per interval
}

export class RateLimiter {
    private check: (limit: number, token: string) => Promise<void>;

    constructor(options: RateLimitOptions) {
        this.check = async (limit: number, token: string) => {
            const now = Date.now();
            const { interval, uniqueTokenPerInterval } = options;

            // Prune expired entries periodically every interval or if map gets too large
            if (now - lastGlobalCleanup > interval || rateLimitMap.size > uniqueTokenPerInterval) {
                lastGlobalCleanup = now;
                for (const [key, ctx] of rateLimitMap.entries()) {
                    if (now - ctx.lastReset > interval) {
                        rateLimitMap.delete(key);
                    }
                }
            }

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
