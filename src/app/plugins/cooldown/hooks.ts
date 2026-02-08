import { AvailableList } from '#src/lists';
import { useCommandKit } from 'commandkit/hooks';
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { Cooldown } from '.';

export function useCooldown() {
    const commandkit = useCommandKit();
    const cooldown = commandkit.store.get('cooldown') as Cooldown;

    if (!cooldown) {
        throw new Error('Cooldown plugin not initialized');
    }

    return cooldown;
}

export async function useCheckCooldown(
    userId: string,
    key: string,
    maxRequests: number,
    interval: number,
) {
    const { check, set } = useCooldown();

    const { allowed, resetTime, remaining } = await check(
        userId,
        key,
        maxRequests,
        interval,
    );

    const resetAt = Date.now() + resetTime;

    if (allowed) await set(userId, key, maxRequests, interval);
    return { allowed, resetTime, resetAt, remaining };
}

export async function useListCooldown(
    interaction: ChatInputCommandInteraction,
    userId: string,
    list: AvailableList,
    listCooldown = 3_600_000,
) {
    const listKey = `fish-${list.value}`;

    const { allowed, resetAt } = await useCheckCooldown(
        userId,
        listKey,
        1,
        listCooldown,
    );

    if (!allowed) {
        await interaction.reply({
            content: `:x: You are on cooldown for the \`${list.name}\` list. You can fish again <t:${Math.floor(resetAt / 1000)}:R>.`,
            flags: [MessageFlags.Ephemeral],
        });
    }

    return allowed;
}
