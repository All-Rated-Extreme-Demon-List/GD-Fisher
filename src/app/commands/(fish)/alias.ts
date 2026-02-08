import lists, { AvailableListValue } from '#src/lists';
import { getList } from '#src/utils';
import { ChatInputCommand, CommandData } from 'commandkit';
import { ApplicationCommandOptionType } from 'discord.js';
import { useListCooldown } from '#src/app/plugins/cooldown/hooks';
import { fish } from '#src/app/tasks/fish';
import { type CooldownCommandData } from '../../plugins/cooldown';

export const command: CommandData = {
    name: 'fishl',
    description: 'GD Lists Fishing',
    options: lists.map((list) => ({
        name: list.value,
        description: `Command shortcut to fish from the ${list.name}`,
        type: ApplicationCommandOptionType.Subcommand,
        options: [
            {
                name: 'for',
                type: ApplicationCommandOptionType.User,
                description: 'The user you want to fish for',
                required: false,
            },
        ],
    })),
};

export const chatInput: ChatInputCommand = async (ctx) => {
    const list = await getList(
        ctx.interaction.options.getSubcommand(true) as AvailableListValue,
    );
    const userId =
        ctx.interaction.options.getUser('for')?.id ?? ctx.interaction.user.id;

    if (!(await useListCooldown(ctx.interaction, userId, list))) return;

    await fish(ctx.interaction, list);
};

export const cooldown: CooldownCommandData['cooldown'] = {
    interval: 2_000,
};
