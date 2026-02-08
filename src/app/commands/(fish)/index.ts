import lists from '#src/lists';
import { getList } from '#src/utils';
import {
    ChatInputCommand,
    CommandData,
} from 'commandkit';
import { ApplicationCommandOptionType } from 'discord.js';
import { useListCooldown } from '#src/app/plugins/cooldown/hooks';
import { fish } from '#src/app/tasks/fish';
import { type CooldownCommandData } from '../../plugins/cooldown';

export const command: CommandData = {
    name: 'fish',
    description: 'GD Lists Fishing',
    options: [
        {
            name: 'list',
            type: ApplicationCommandOptionType.String,
            description:
                'The list you want to fish from (your default list can be set with /settings)',
            required: false,
            choices: lists.map((list) => {
                return {
                    name: `${list.name} (${list.fullname})`,
                    value: list.value,
                };
            }),
        },
        {
            name: 'for',
            type: ApplicationCommandOptionType.User,
            description: 'The user you want to fish for',
            required: false,
        },
    ],
};

export const chatInput: ChatInputCommand = async (ctx) => {
    const list = await getList(ctx.interaction);
    const userId =
        ctx.interaction.options.getUser('for')?.id ?? ctx.interaction.user.id;

    if (!(await useListCooldown(ctx.interaction, userId, list))) return;

    await fish(ctx.interaction, list);
};

export const cooldown: CooldownCommandData['cooldown'] = {
    interval: 2_000,
};
