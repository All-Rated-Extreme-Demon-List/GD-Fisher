import { useDatabase } from '#src/app/plugins/sequelize/hooks';
import lists, { AvailableListValue } from '#src/lists';
import { getList } from '#src/utils';
import { ChatInputCommand, CommandData, Logger } from 'commandkit';
import { ApplicationCommandOptionType } from 'discord.js';

export const command: CommandData = {
    name: 'settings',
    description: 'Set your default list',
    options: [
        {
            name: 'defaultlist',
            type: ApplicationCommandOptionType.String,
            description:
                'The list you want to fish from by default, without having to specify it on each command',
            required: true,
            choices: lists.map((list) => {
                return {
                    name: `${list.name} (${list.fullname})`,
                    value: list.value,
                };
            }),
        },
    ],
};

export const chatInput: ChatInputCommand = async ({ interaction }) => {
    const { db } = useDatabase();

    const id = interaction.user.id;
    const list = await getList(
        interaction.options.getString(
            'defaultlist',
            true,
        ) as AvailableListValue,
    );
    if (!list) return;

    try {
        if (await db.user_settings.findOne({ where: { user: id } })) {
            await db.user_settings.update(
                { default_list: list.value },
                { where: { user: id } },
            );
        } else {
            await db.user_settings.create({
                user: id,
                default_list: list.value,
            });
        }
    } catch (error) {
        Logger.error(`Error setting default list: ${error}`);
        return await interaction.reply(
            ':x: An error occurred while setting your default list',
        );
    }

    return await interaction.reply({
        content: `:white_check_mark: Your default list was set to \`${list.name}\` successfully.`,
        ephemeral: true,
    });
};
