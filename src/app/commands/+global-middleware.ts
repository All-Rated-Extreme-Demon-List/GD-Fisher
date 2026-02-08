import { MiddlewareContext, stopMiddlewares } from 'commandkit';
import { useCheckCooldown } from '../plugins/cooldown/hooks';
import { MessageFlags } from 'discord.js';

export async function beforeExecute(ctx: MiddlewareContext) {
    const cooldownConfig = ctx.command.data.cooldown;

    if (cooldownConfig) {
        const maxRequests = cooldownConfig.maxRequests ?? 1;
        const interval = cooldownConfig.interval ?? 5000;

        const userId = ctx.interaction.user.id;

        const action = cooldownConfig.keyGenerator
            ? cooldownConfig.keyGenerator(ctx.interaction)
            : `${ctx.commandName}:${userId}`;

        const { allowed, resetTime } = await useCheckCooldown(
            userId,
            action,
            maxRequests,
            interval,
        );

        if (!allowed) {
            if (ctx.interaction.isRepliable()) {
                await ctx.interaction.reply({
                    content: `Please wait ${Math.floor(resetTime / 1000)} second(s) before using this command again.`,
                    flags: [MessageFlags.Ephemeral],
                });
            }

            stopMiddlewares();
        }
    }
}
