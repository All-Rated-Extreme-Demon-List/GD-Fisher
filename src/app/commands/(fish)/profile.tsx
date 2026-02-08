import { usePagination } from '#src/app/hooks/usePagination';
import { useDatabase } from '#src/app/plugins/sequelize/hooks';
import type { CacheRow } from '#src/db';
import lists, { type AvailableList, type AvailableListValue } from '#src/lists';
import { getList, getListIconsAttachments } from '#src/utils';
import {
    ActionRow,
    Container,
    Logger,
    Section,
    StringSelectMenuKit,
    TextDisplay,
    Thumbnail,
    type ChatInputCommand,
    type CommandData,
} from 'commandkit';
import {
    ActionRowBuilder,
    ApplicationCommandOptionType,
    ContainerBuilder,
    Interaction,
    InteractionContextType,
    MessageFlags,
    type StringSelectMenuInteraction,
    type User,
} from 'discord.js';
import { Op } from 'sequelize';

type SortingMode = 'rank' | 'times';

type PaginationData = {
    mainData: string;
    pages: Record<SortingMode, string[][]>;
};

const PAGE_SIZE = 10;

export const command: CommandData = {
    name: 'fish-profile',
    description:
        'Displays the list fish profile of yourself or a specific user',
    options: [
        {
            name: 'target',
            type: ApplicationCommandOptionType.User,
            description: 'The user whose profile you want to see',
            required: false,
        },
        {
            name: 'list',
            type: ApplicationCommandOptionType.String,
            description:
                'The list to show your profile from (your default list can be set with /settings)',
            required: false,
            choices: lists.map((listItem) => ({
                name: `${listItem.name} (${listItem.fullname})`,
                value: listItem.value,
            })),
        },
    ],
};

const loadUserData = async (user: User) => {
    const { db, cache } = useDatabase();
    const userDataByList: Partial<
        Record<AvailableListValue, PaginationData | null>
    > = {};

    const levelsCache: Partial<
        Record<AvailableListValue, Map<string, CacheRow>>
    > = {};
    await Promise.all(
        lists.map(async (list) => {
            try {
                levelsCache[list.value] = new Map(
                    (
                        await cache[list.value].findAll({
                            attributes: ['position', 'name', 'filename'],
                        })
                    ).map(({ dataValues: level }) => [level.filename, level]),
                );
            } catch (error) {
                Logger.error(
                    `Could not fetch levels for list ${list.value}: ${String(error)}`,
                );
            }
        }),
    );

    await Promise.all(
        lists.map(async (list) => {
            try {
                const userRow = await db[list.value].findOne({
                    where: { user: user.id },
                });

                if (!userRow) {
                    userDataByList[list.value] = null;
                    return;
                }
                const { amount, mean, times_fished } = userRow.dataValues;

                const rank =
                    (await db[list.value].count({
                        where: { amount: { [Op.gt]: amount } },
                    })) + 1;

                const totalAmount = Math.round(amount * 100) / 100;
                const meanScore = Math.round(mean * 100) / 100;

                const mainData =
                    `## ${user.tag}'s fish profile\n` +
                    `### List: ${list.name}\n` +
                    `- Global Rank: **#${rank}**\n` +
                    `- Total Points: **${totalAmount}**\n` +
                    `- Points on average: **${meanScore}**\n` +
                    `- Times Fished: **${times_fished}**\n` +
                    `### Fished Levels:`;

                const fishedListJson = userRow.getDataValue('fished_list');
                const fishedFreqJson = userRow.getDataValue(
                    'fished_list_frequency',
                );

                const fishedListData: string[] = fishedListJson
                    ? JSON.parse(fishedListJson)
                    : [];
                const fishedListFrequency: number[] = fishedFreqJson
                    ? JSON.parse(fishedFreqJson)
                    : [];

                const levelMap =
                    levelsCache[list.value] ?? new Map<string, CacheRow>();

                const items: {
                    position: number;
                    frequency: number;
                    display: string;
                }[] = [];

                fishedListData.forEach((filename, index) => {
                    const levelData = levelMap.get(filename);
                    if (!levelData) return;
                    const frequency = fishedListFrequency[index] ?? 0;
                    items.push({
                        position: levelData.position,
                        frequency,
                        display: `**#${levelData.position}** - ${levelData.name} ${
                            frequency > 1 ? `**(x${frequency})**` : ''
                        }`,
                    });
                });

                const rankSortedList = [...items]
                    .sort((left, right) => left.position - right.position)
                    .map((item) => item.display);

                const timesSortedList = [...items]
                    .sort((left, right) => right.frequency - left.frequency)
                    .map((item) => item.display);

                const pages: Record<SortingMode, string[][]> = {
                    rank: [],
                    times: [],
                };

                for (
                    let index = 0;
                    index < rankSortedList.length;
                    index += PAGE_SIZE
                ) {
                    pages.rank.push(
                        rankSortedList.slice(index, index + PAGE_SIZE),
                    );
                    pages.times.push(
                        timesSortedList.slice(index, index + PAGE_SIZE),
                    );
                }

                userDataByList[list.value] = { mainData, pages };
            } catch (error) {
                Logger.error(
                    `Could not fetch user data for list ${list.value}: ${String(error)}`,
                );
            }
        }),
    );

    return userDataByList;
};

export const chatInput: ChatInputCommand = async (ctx) => {
    const interaction = ctx.interaction;

    const response = await interaction.reply({
        content: 'Loading profile...',
        withResponse: true,
    });

    let currentList = await getList(interaction);
    let currentHeader = 'Loading...';
    let currentSorting: SortingMode = 'rank';

    const targetUser: User =
        interaction.options.getUser('target') ?? interaction.user;

    const userDataByList = await loadUserData(targetUser);
    const attachments = getListIconsAttachments();

    const filter = (eventInteraction: Interaction) =>
        eventInteraction.user.id === interaction.user.id &&
        eventInteraction.isMessageComponent() &&
        eventInteraction.message.id === response.interaction.responseMessageId;

    const { state, updateState, buttons } = usePagination({
        filter,
        onButtonClick: async (btnInteraction) => {
            btnInteraction.update({ components: [await render()] });
        },
    });

    async function updateData(list: AvailableList, sorting: SortingMode) {
        const userData = userDataByList[list.value];
        currentHeader = userData?.mainData ?? 'No data available';
        currentSorting = sorting;
        currentList = list;

        updateState({
            data: userData?.pages[sorting] ?? [],
            page: 0,
        });
    }

    const render = async (): Promise<ContainerBuilder> => (
        <Container accentColor="DarkBlue">
            <Section>
                <TextDisplay>{currentHeader}</TextDisplay>
                <TextDisplay>
                    {(state.data[state.page]?.length ?? 0 > 0)
                        ? state.data[state.page]?.join('\n')
                        : `> :x: **${targetUser.tag}** does not have any fishing data on **${currentList.name}**.`}
                </TextDisplay>
                <TextDisplay>
                    Page {state.page + 1} of {state.data.length}
                </TextDisplay>
                <Thumbnail url="attachment://listlogo.webp" />
            </Section>
            <ActionRow>{...buttons}</ActionRow>
            {new ActionRowBuilder().addComponents(selectList)}
            {new ActionRowBuilder().addComponents(selectSorting)}
        </Container>
    );

    const handleListSelect = async (
        selectInteraction: StringSelectMenuInteraction,
    ) => {
        const selectedValue = selectInteraction.values[0] as
            | AvailableListValue
            | undefined;
        if (!selectedValue) return;
        const selectedList = lists.find((list) => list.value === selectedValue);
        if (!selectedList) return;
        await updateData(selectedList, currentSorting);

        selectList.setPlaceholder(`List: ${currentList.name}`);
        await selectInteraction.update({
            components: [await render()],
            files: attachments[currentList.value]
                ? [attachments[currentList.value]!]
                : [],
        });
    };

    const handleSortSelect = async (
        selectInteraction: StringSelectMenuInteraction,
    ) => {
        const selectedValue = selectInteraction.values[0] as
            | SortingMode
            | undefined;
        if (!selectedValue) return;

        await updateData(currentList, selectedValue);
        selectSorting.setPlaceholder(
            `Sort by: ${currentSorting === 'rank' ? 'Rank' : 'Times fished'}`,
        );

        await selectInteraction.update({
            components: [await render()],
        });
    };

    const selectList = new StringSelectMenuKit()
        .setCustomId('select-list')
        .setOptions(
            lists.map((item) => ({
                label: `${item.name} (${item.fullname})`,
                value: item.value,
            })),
        )
        .setPlaceholder(`List: ${currentList.name}`)
        .filter(filter)
        .onSelect(handleListSelect, { autoReset: true, time: 180_000 });

    const selectSorting = new StringSelectMenuKit()
        .setCustomId('select-sorting')
        .setOptions(
            { label: 'Rank', value: 'rank' },
            { label: 'Times fished', value: 'times' },
        )
        .setPlaceholder(
            `Sort by: ${currentSorting === 'rank' ? 'Rank' : 'Times fished'}`,
        )
        .filter(filter)
        .onSelect(handleSortSelect, { autoReset: true, time: 180_000 });

    await updateData(currentList, currentSorting);

    await interaction.editReply({
        content: null,
        components: [await render()],
        files: attachments[currentList.value]
            ? [attachments[currentList.value]!]
            : [],
        flags: [MessageFlags.IsComponentsV2],
    });

    setTimeout(async () => {
        selectList.setDisabled(true);
        selectSorting.setDisabled(true);
        buttons.forEach((button) => button.setDisabled(true));
        await interaction.editReply({
            components: [await render()],
        });
    }, 180_000);
};
