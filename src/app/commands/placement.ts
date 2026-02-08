import lists, { AvailableListValue } from '#src/lists';
import { AutocompleteCommand, ChatInputCommand, CommandData } from 'commandkit';
import { ApplicationCommandOptionType } from 'discord.js';
import { useDatabase } from '../plugins/sequelize/hooks';
import { getList } from '#src/utils';
import { col, fn, Op, where } from 'sequelize';

export const command: CommandData = {
    name: 'placement',
    description: 'Look up the placement for any level on a list.',
    options: [
        {
            name: 'list',
            type: ApplicationCommandOptionType.String,
            description:
                'The list on which you want to look up the placement for the level.',
            required: true,
            choices: lists.map((list) => {
                return {
                    name: `${list.name} (${list.fullname})`,
                    value: list.value,
                };
            }),
        },
        {
            name: 'level',
            type: ApplicationCommandOptionType.String,
            description:
                "The level you're looking up the placement for (Be sure to select one of the available options.)",
            required: true,
            autocomplete: true,
            max_length: 1024,
        },
    ],
};

export const autocomplete: AutocompleteCommand = async ({ interaction }) => {
    const { cache } = useDatabase();

    const focusedValue = interaction.options.getFocused()?.toLowerCase();
    const list = await getList(interaction);
    if (!list) return interaction.respond([]);

    let levels = await cache[list.value].findAll({
        where: where(fn('lower', col('name')), {
            [Op.like]: `%${focusedValue}%`,
        }),
        limit: 25,
    });

    return await interaction.respond(
        levels.map(({ dataValues: level }) => ({
            name: level.name,
            value: level.filename,
        })),
    );
};

export const chatInput: ChatInputCommand = async ({ interaction }) => {
    const { cache } = useDatabase();

    const list = await getList(interaction);
    const filename = interaction.options.getString('level');
    if (!list || !filename) return;
    const level = (await cache[list.value].findOne({ where: { filename } }))
        ?.dataValues;

    if (!level || level?.position == null)
        return await interaction.reply(
            `:x: **${filename}** is not on this list. Make sure to select the right option`,
        );
    await interaction.reply(
        `**${level.name}** is placed at **#${level.position}** on the **${list.name}**.`,
    );
};
