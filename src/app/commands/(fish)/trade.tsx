import { useDatabase } from '#src/app/plugins/sequelize/hooks';
import lists, { type AvailableListValue } from '#src/lists';
import { getList } from '#src/utils';
import {
    ActionRow,
    AutocompleteCommand,
    ButtonKit,
    Container,
    TextDisplay,
    type ChatInputCommand,
    type CommandData,
    type OnButtonKitClick,
} from 'commandkit';
import { Logger } from 'commandkit';
import {
    ApplicationCommandOptionType,
    InteractionContextType,
    MessageFlags,
    ButtonStyle,
    Interaction,
} from 'discord.js';
import { col, fn, Op, Transaction, where } from 'sequelize';

export const command: CommandData = {
    name: 'fish-trade',
    description: 'Trade a fished level with someone else',
    contexts: [InteractionContextType.Guild],
    options: [
        {
            name: 'list',
            type: ApplicationCommandOptionType.String,
            description: 'The list on which you want to trade',
            required: true,
            choices: lists.map((listItem) => ({
                name: `${listItem.name} (${listItem.fullname})`,
                value: listItem.value,
            })),
        },
        {
            name: 'user',
            type: ApplicationCommandOptionType.User,
            description: 'The user you want to trade with',
            required: true,
        },
        {
            name: 'leveltogive',
            type: ApplicationCommandOptionType.String,
            description: 'The level you want to give to the other person',
            required: true,
            autocomplete: true,
        },
        {
            name: 'leveltoget',
            type: ApplicationCommandOptionType.String,
            description: 'The level you want to get from the other person',
            required: true,
            autocomplete: true,
        },
    ],
};

type TradeMessageState =
    | { kind: 'pending' }
    | { kind: 'processing' }
    | { kind: 'done' }
    | { kind: 'failed'; message: string };

export const autocomplete: AutocompleteCommand = async ({ interaction }) => {
    const { cache } = useDatabase();

    const focusedValue = interaction.options
        .getFocused(true)
        .value.toLowerCase();
    const listValue = interaction.options.getString(
        'list',
    ) as AvailableListValue | null;

    if (!listValue) {
        await interaction.respond([]);
        return;
    }

    try {
        await interaction.respond(
            (
                await cache[listValue].findAll({
                    where: where(fn('lower', col('name')), {
                        [Op.like]: `%${focusedValue}%`,
                    }),
                    limit: 25,
                })
            ).map(({ dataValues }) => ({
                name: dataValues.name,
                value: dataValues.filename,
            })),
        );
    } catch (error) {
        Logger.error(`[fish-trade] Autocomplete failed: ${String(error)}`);
        await interaction.respond([]);
    }
};

export const chatInput: ChatInputCommand = async ({ interaction }) => {
    let processed = false;

    if (!interaction.inGuild() || !interaction.guildId) {
        await interaction.reply({
            content: ':x: This command can only be used in a server',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const { db, cache, sequelize } = useDatabase();

    const list = await getList(interaction);
    if (!list) {
        await interaction.reply({
            content: ':x: Invalid list specified',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const requestingUser = interaction.user;

    const levelToGive = interaction.options.getString('leveltogive', true);
    const levelToGet = interaction.options.getString('leveltoget', true);

    if (requestingUser.id === targetUser.id) {
        await interaction.reply({
            content: ':x: You cannot trade with yourself',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (levelToGive === levelToGet) {
        await interaction.reply({
            content: ':x: You cannot trade the same level',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    try {
        const guild = interaction.client.guilds.cache.get(interaction.guildId);
        if (!guild) {
            await interaction.reply({
                content: ':x: Guild not found',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        await guild.members.fetch(targetUser.id);
    } catch {
        await interaction.reply({
            content: 'This user is not in this server',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const requestingUserRow = await db[list.value].findOne({
        where: { user: requestingUser.id },
    });

    const targetUserRow = await db[list.value].findOne({
        where: { user: targetUser.id },
    });

    if (!requestingUserRow) {
        await interaction.reply({
            content: ':x: You do not have any fishing data for this list',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!targetUserRow) {
        await interaction.reply({
            content:
                ':x: This user does not have any fishing data for this list',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const requestingFishedList = JSON.parse(
        requestingUserRow.getDataValue('fished_list') ?? '[]',
    ) as string[];

    const targetFishedList = JSON.parse(
        targetUserRow.getDataValue('fished_list') ?? '[]',
    ) as string[];

    if (!requestingFishedList.includes(levelToGive)) {
        await interaction.reply({
            content: ':x: You do not have fished this level yet',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!targetFishedList.includes(levelToGet)) {
        await interaction.reply({
            content: ':x: This user does not have fished this level yet',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const requestingLevelRow = await cache[list.value].findOne({
        where: { filename: levelToGive },
    });
    const targetLevelRow = await cache[list.value].findOne({
        where: { filename: levelToGet },
    });

    if (!requestingLevelRow || !targetLevelRow) {
        await interaction.reply({
            content: ':x: Could not resolve one of the levels',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const requestingLevel = requestingLevelRow.dataValues;
    const targetLevel = targetLevelRow.dataValues;

    const response = await interaction.reply({
        components: [<TextDisplay>Loading...</TextDisplay>],
        flags: MessageFlags.IsComponentsV2,
        withResponse: true,
    });

    const filter = (eventInteraction: Interaction) =>
        eventInteraction.user.id === targetUser.id &&
        eventInteraction.isMessageComponent() &&
        eventInteraction.message.id === response.interaction.responseMessageId;

    const handleTrade: OnButtonKitClick = async (
        buttonInteraction,
        context,
    ) => {
        if (buttonInteraction.user.id !== targetUser.id) {
            await buttonInteraction.reply({
                content: 'This trade is not for you.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (buttonInteraction.customId === 'cancel') {
            await buttonInteraction.update({
                components: [
                    render({ kind: 'failed', message: 'Trade rejected' }),
                ],
            });

            processed = true;
            context.dispose();
            return;
        } else if (buttonInteraction.customId === 'confirm') {
            const transaction = await sequelize.transaction({
                isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
            });

            try {
                const [freshRequesting, freshTarget] = await Promise.all([
                    db[list.value].findOne({
                        where: { user: requestingUser.id },
                        lock: transaction.LOCK.UPDATE,
                        transaction,
                    }),
                    db[list.value].findOne({
                        where: { user: targetUser.id },
                        lock: transaction.LOCK.UPDATE,
                        transaction,
                    }),
                ]);

                if (!freshRequesting || !freshTarget) {
                    await transaction.rollback();
                    await buttonInteraction.update({
                        components: [
                            render({
                                kind: 'failed',
                                message: 'Trade failed, missing user data',
                            }),
                        ],
                    });
                    processed = true;
                    context.dispose();
                    return;
                }

                const freshRequestingList = JSON.parse(
                    freshRequesting.getDataValue('fished_list') ?? '[]',
                ) as string[];
                const freshRequestingFreq = JSON.parse(
                    freshRequesting.getDataValue('fished_list_frequency') ??
                        '[]',
                ) as number[];

                const freshTargetList = JSON.parse(
                    freshTarget.getDataValue('fished_list') ?? '[]',
                ) as string[];
                const freshTargetFreq = JSON.parse(
                    freshTarget.getDataValue('fished_list_frequency') ?? '[]',
                ) as number[];

                const requestingIndex = freshRequestingList.findIndex(
                    (lvl) => lvl === levelToGive,
                );
                const targetIndex = freshTargetList.findIndex(
                    (lvl) => lvl === levelToGet,
                );

                if (requestingIndex === -1 || targetIndex === -1) {
                    await transaction.rollback();
                    await buttonInteraction.update({
                        components: [
                            render({
                                kind: 'failed',
                                message:
                                    'Trade failed, one of the levels is no longer available',
                            }),
                        ],
                    });
                    processed = true;
                    context.dispose();
                    return;
                }

                freshRequestingFreq[requestingIndex] =
                    (freshRequestingFreq[requestingIndex] ?? 1) - 1;
                if (freshRequestingFreq[requestingIndex] <= 0) {
                    freshRequestingList.splice(requestingIndex, 1);
                    freshRequestingFreq.splice(requestingIndex, 1);
                }

                freshTargetFreq[targetIndex] =
                    (freshTargetFreq[targetIndex] ?? 1) - 1;
                if (freshTargetFreq[targetIndex] <= 0) {
                    freshTargetList.splice(targetIndex, 1);
                    freshTargetFreq.splice(targetIndex, 1);
                }

                const requestingNewIndex = freshRequestingList.findIndex(
                    (lvl) => lvl === levelToGet,
                );
                if (requestingNewIndex === -1) {
                    freshRequestingList.push(levelToGet);
                    freshRequestingFreq.push(1);
                } else {
                    freshRequestingFreq[requestingNewIndex] =
                        (freshRequestingFreq[requestingNewIndex] ?? 0) + 1;
                }

                const targetNewIndex = freshTargetList.findIndex(
                    (lvl) => lvl === levelToGive,
                );
                if (targetNewIndex === -1) {
                    freshTargetList.push(levelToGive);
                    freshTargetFreq.push(1);
                } else {
                    freshTargetFreq[targetNewIndex] =
                        (freshTargetFreq[targetNewIndex] ?? 0) + 1;
                }

                await Promise.all([
                    db[list.value].update(
                        {
                            fished_list: JSON.stringify(freshRequestingList),
                            fished_list_frequency:
                                JSON.stringify(freshRequestingFreq),
                        },
                        { where: { user: requestingUser.id }, transaction },
                    ),
                    db[list.value].update(
                        {
                            fished_list: JSON.stringify(freshTargetList),
                            fished_list_frequency:
                                JSON.stringify(freshTargetFreq),
                        },
                        { where: { user: targetUser.id }, transaction },
                    ),
                ]);

                await transaction.commit();

                await buttonInteraction.update({
                    components: [
                        render({
                            kind: 'done',
                        }),
                    ],
                });

                processed = true;
                context.dispose();
            } catch (error) {
                await transaction.rollback();
                Logger.error(
                    `[fish-trade] Rolled back transaction: ${String(error)}`,
                );
                await buttonInteraction.update({
                    components: [
                        render({
                            kind: 'failed',
                            message:
                                'An unexpected error occurred, please try again',
                        }),
                    ],
                });
                processed = true;
                context.dispose();
            }
        }
    };

    const acceptButton = new ButtonKit()
        .setCustomId(`confirm`)
        .setLabel('Accept Trade')
        .setStyle(ButtonStyle.Success)
        .onClick(handleTrade, { time: 120_000, once: true })
        .filter(filter);

    const rejectButton = new ButtonKit()
        .setCustomId(`cancel`)
        .setLabel('Reject Trade')
        .setStyle(ButtonStyle.Danger)
        .onClick(handleTrade, { time: 120_000, once: true })
        .filter(filter);

    const render = (state: TradeMessageState) => (
        <Container accentColor="Red">
            <TextDisplay>{`<@${targetUser.id}>`}</TextDisplay>
            <TextDisplay>{`## Level Trade (${list.name})`}</TextDisplay>
            <TextDisplay>
                {`<@${requestingUser.id}> wants to give you:\n` +
                    `**${requestingLevel.name}** (TOP ${requestingLevel.position})`}
            </TextDisplay>
            <TextDisplay>
                {`In exchange for:\n` +
                    `**${targetLevel.name}** (TOP ${targetLevel.position})\n`}
            </TextDisplay>
            {state.kind !== 'pending' ? (
                <TextDisplay>
                    {state.kind === 'processing'
                        ? 'Processing...'
                        : state.kind === 'done'
                          ? ':white_check_mark: Trade successful'
                          : `:x: ${state.message}`}
                </TextDisplay>
            ) : null}
            {state.kind == 'pending' ? (
                <ActionRow>
                    {acceptButton}
                    {rejectButton}
                </ActionRow>
            ) : null}
        </Container>
    );

    await interaction.editReply({
        components: [render({ kind: 'pending' })],
    });

    setTimeout(async () => {
        if (processed) return;
        try {
            await interaction.editReply({
                components: [
                    render({
                        kind: 'failed',
                        message:
                            'Confirmation not received within 2 minutes, cancelling',
                    }),
                ],
            });
        } catch {
            // ignore
        }
    }, 120_000);
};
