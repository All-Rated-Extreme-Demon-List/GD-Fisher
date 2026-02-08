import { useDatabase } from '#src/app/plugins/sequelize/hooks';
import lists from '#src/lists';
import { getList } from '#src/utils';
import { ChatInputCommand, CommandData, Logger } from 'commandkit';
import {
    ApplicationCommandOptionType,
    InteractionContextType,
} from 'discord.js';

export const command: CommandData = {
    name: 'fishadmin',
    description: 'GD Lists Fishy admin command',
    contexts: [InteractionContextType.Guild],
    default_member_permissions: '0',
    options: [
        {
            name: 'setguilddefault',
            type: ApplicationCommandOptionType.Subcommand,
            description: 'Sets the default list for users in this server',
            options: [
                {
                    name: 'list',
                    type: ApplicationCommandOptionType.String,
                    description: 'The list to set as default',
                    required: true,
                    choices: lists.map((list) => {
                        return {
                            name: list.name,
                            value: list.value,
                        };
                    }),
                },
            ],
        },
    ],
};

export const chatInput: ChatInputCommand = async ({ interaction }) => {
    const { db } = useDatabase();
    const subcommand = interaction.options.getSubcommand();

    if (!interaction.guild) return;

    if (subcommand === 'setguilddefault') {
        const list = await getList(interaction);
        if (!list) return;

        try {
            if (
                await db.guild_settings.findOne({
                    where: { guild: interaction.guild.id },
                })
            ) {
                await db.guild_settings.update(
                    { default_list: list.value },
                    { where: { guild: interaction.guild.id } },
                );
            } else {
                await db.guild_settings.create({
                    guild: interaction.guild.id,
                    default_list: list.value,
                });
            }
        } catch (error) {
            Logger.error(`Error setting guild default: ${error}`);
            return await interaction.reply(
                ':x: An error occurred while setting the guild default list',
            );
        }
        return await interaction.reply({
            content: `:white_check_mark: The default list for this server was set to \`${list.name}\` successfully.`,
            ephemeral: true,
        });
    }
};
