import { RuntimePlugin, type CommandKitPluginRuntime } from 'commandkit';
import {
    createRateLimiter,
    resetRateLimit,
    RateLimiter,
} from 'commandkit/ratelimit';
import type { Interaction, Message } from 'discord.js';

export interface CooldownCommandData {
    cooldown?: {
        maxRequests?: number;
        interval?: number;
        keyGenerator?: (source: Interaction | Message) => string;
    };
}

export type Cooldown = {
    check: (
        userId: string,
        action: string,
        maxRequests?: number,
        interval?: number,
    ) => Promise<{
        allowed: boolean;
        remaining: number;
        resetTime: number;
    }>;
    set: (
        userId: string,
        action: string,
        maxRequests?: number,
        interval?: number,
    ) => Promise<void>;
    clear: (userId: string, action: string) => Promise<void>;
};

export class CooldownPlugin extends RuntimePlugin {
    name = 'cooldown';
    private limiters: Map<string, RateLimiter> = new Map();

    private getLimiter(maxRequests: number, interval: number) {
        const key = `${maxRequests}:${interval}`;
        if (!this.limiters.has(key)) {
            this.limiters.set(
                key,
                createRateLimiter({ maxRequests, interval }),
            );
        }
        return this.limiters.get(key)!;
    }

    async activate(ctx: CommandKitPluginRuntime): Promise<void> {
        ctx.commandkit.store.set('cooldown', {
            check: this.checkCooldown.bind(this),
            set: this.setCooldown.bind(this),
            clear: this.clearCooldown.bind(this),
        });
    }

    async checkCooldown(
        userId: string,
        action: string,
        maxRequests = 1,
        interval = 5000,
    ): Promise<{
        allowed: boolean;
        remaining: number;
        resetTime: number;
    }> {
        const key = `${userId}:${action}`;
        const limiter = this.getLimiter(maxRequests, interval);

        const allowed = await limiter.limit(key);
        const remaining = await limiter.getRemaining(key);
        const resetTime = await limiter.getResetTime(key);

        return { allowed, remaining, resetTime };
    }

    async setCooldown(
        userId: string,
        action: string,
        maxRequests = 1,
        interval = 5000,
    ): Promise<void> {
        const key = `${userId}:${action}`;
        const limiter = this.getLimiter(maxRequests, interval);
        await limiter.limit(key);
    }

    async clearCooldown(userId: string, action: string): Promise<void> {
        const key = `${userId}:${action}`;
        await resetRateLimit(key);
    }
}

export function cooldown() {
    return new CooldownPlugin({});
}
