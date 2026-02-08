import { useDatabase } from '#src/app/plugins/sequelize/hooks';
import lists, { type AvailableList, type AvailableListValue } from '#src/lists';
import { getList, getListIconsAttachments } from '#src/utils';
import type { ChatInputCommand, CommandData } from 'commandkit';
import {
    ActionRow,
    Container,
    Logger,
    Section,
    StringSelectMenuKit,
    TextDisplay,
    Thumbnail,
} from 'commandkit';
import {
    ActionRowBuilder,
    ApplicationCommandOptionType,
    ContainerBuilder,
    Interaction,
    InteractionContextType,
    MessageFlags,
    type ChatInputCommandInteraction,
    type StringSelectMenuInteraction,
} from 'discord.js';
import { CooldownCommandData } from '../../plugins/cooldown';
import { usePagination } from '#src/app/hooks/usePagination';

export const command: CommandData = {
    name: 'fish-lb',
    description: 'GD Lists Fishy leaderboard',
    contexts: [InteractionContextType.Guild],
    options: [
        {
            name: 'list',
            type: ApplicationCommandOptionType.String,
            description:
                'The list you want to show the leaderboard of (your default list can be set with /settings)',
            required: false,
            choices: lists.map((listItem) => ({
                name: `${listItem.name} (${listItem.fullname})`,
                value: listItem.value,
            })),
        },
    ],
};

const PAGE_SIZE = 20;

export const cooldown: CooldownCommandData = {
    cooldown: {
        interval: 60_000,
    },
};

async function fetchGuildMemberTags(
    interaction: ChatInputCommandInteraction,
): Promise<Map<string, string>> {
    const tagByUserId = new Map<string, string>();
    const guild = interaction.guild;
    if (!guild) return tagByUserId;

    const members = await guild.members.fetch();
    for (const [, member] of members) {
        tagByUserId.set(member.user.id, member.user.tag);
    }
    return tagByUserId;
}

async function loadLeaderboard(
    interaction: ChatInputCommandInteraction,
    list: AvailableList,
    tagByUserId: Map<string, string>,
) {
    const { db } = useDatabase();

    const leaderboardRows = (
        await db[list.value].findAll({
            order: [['amount', 'DESC']],
            where: {
                user: Array.from(tagByUserId.keys()),
            },
        })
    ).map(({ dataValues }) => dataValues);

    const lines = leaderboardRows.map(
        ({ user, amount }, index) =>
            `**${index + 1}** - \`${tagByUserId.get(user) ?? user}\` (${amount ? Math.round(amount * 100) / 100 : 0} points)`,
    );

    const pages: string[][] = [];
    for (let index = 0; index < lines.length; index += PAGE_SIZE) {
        pages.push(lines.slice(index, index + PAGE_SIZE));
    }

    const invokingUserRankIndex = leaderboardRows.findIndex(
        ({ user }) => user === interaction.user.id,
    );
    const defaultPageIndex =
        invokingUserRankIndex >= 0
            ? Math.floor(invokingUserRankIndex / PAGE_SIZE)
            : 0;
    return {
        data: pages,
        list,
        page: defaultPageIndex,
    };
}

export const chatInput: ChatInputCommand = async ({ interaction }) => {
    if (
        interaction.context !== InteractionContextType.Guild ||
        !interaction.guild
    ) {
        await interaction.reply(
            ':x: This command can only be used in a server.',
        );
        return;
    }

    const initialList = await getList(interaction);
    let currentList = initialList;
    const attachments = getListIconsAttachments();

    const responseId = (
        await interaction.reply({
            content: 'Loading leaderboard...',
            withResponse: true,
        })
    ).interaction.responseMessageId;

    let tagByUserId: Map<string, string>;
    try {
        tagByUserId = await fetchGuildMemberTags(interaction);
    } catch (error) {
        Logger.error(`Error fetching guild members: ${String(error)}`);
        await interaction.editReply(
            ':x: An error occurred while fetching guild members.',
        );
        return;
    }

    const updateData = async (list: AvailableList) => {
        try {
            updateState(await loadLeaderboard(interaction, list, tagByUserId));
            currentList = list;
        } catch (error) {
            Logger.error(
                `Failed to fetch leaderboard for ${list.value}: ${String(error)}`,
            );
            await interaction.editReply(
                ':x: An error occurred while fetching the leaderboard.',
            );
            return;
        }
    };

    const filter = (eventInteraction: Interaction) =>
        eventInteraction.user.id === interaction.user.id &&
        eventInteraction.isMessageComponent() &&
        eventInteraction.message.id === responseId;

    const { buttons, state, updateState } = usePagination({
        filter,
        onButtonClick: async (btnInteraction) => {
            await btnInteraction.update({ components: [await render()] });
        },
    });

    const handleListSelect = async (
        selectInteraction: StringSelectMenuInteraction,
    ) => {
        const selectedValue = selectInteraction.values[0] as
            | AvailableListValue
            | undefined;
        if (!selectedValue) return;
        const selectedList = lists.find((list) => list.value === selectedValue);
        if (!selectedList) return;
        await updateData(selectedList);

        selectList.setPlaceholder(currentList.name);
        await selectInteraction.update({
            components: [await render()],
            files: attachments[currentList.value]
                ? [attachments[currentList.value]!]
                : [],
        });
    };

    const selectList = new StringSelectMenuKit()
        .setCustomId('list')
        .setOptions(
            lists.map((list) => ({
                label: list.name,
                description: list.fullname,
                value: list.value,
            })),
        )
        .setPlaceholder(initialList.name)
        .filter(filter)
        .onSelect(handleListSelect, { autoReset: true, time: 180_000 });

    const render = async (): Promise<ContainerBuilder> => (
        <Container accentColor="Gold">
            <Section>
                <TextDisplay>
                    {`## ${currentList.name} Fish Leaderboard\n### Server: ${interaction.guild!.name}`}
                </TextDisplay>
                <TextDisplay>{state.data[state.page]?.join('\n')}</TextDisplay>
                <TextDisplay>
                    Page {state.page + 1} of {state.data.length}
                </TextDisplay>
                <Thumbnail url="attachment://listlogo.webp" />
            </Section>
            <ActionRow>{...buttons}</ActionRow>
            {new ActionRowBuilder().addComponents(selectList)}
        </Container>
    );

    await updateData(initialList);

    await interaction.editReply({
        content: null,
        components: [await render()],
        files: attachments[initialList.value]
            ? [attachments[initialList.value]!]
            : [],
        flags: [MessageFlags.IsComponentsV2],
    });

    setTimeout(async () => {
        selectList.setDisabled(true);
        buttons.forEach((button) => button.setDisabled(true));
        await interaction.editReply({
            components: [await render()],
        });
    }, 180_000);
};
