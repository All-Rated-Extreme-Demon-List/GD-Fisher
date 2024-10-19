const {
    SlashCommandBuilder,
    AttachmentBuilder,
    StringSelectMenuBuilder,
    ActionRowBuilder,
    ComponentType,
    ButtonStyle,
    ButtonBuilder,
    EmbedBuilder,
} = require('discord.js');
const { ButtonPaginationBuilder } = require('@thenorthsolution/djs-pagination');
const logger = require('log4js').getLogger();
const lists = require('../others/lists.js');
const fs = require('node:fs');
const { getList } = require('../others/utils.js');

module.exports = {
	enabled: true,
	cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('fish-lb')
		.setDescription('GD Lists Fishy leaderboard')
		.setContexts(['Guild'])
		.addStringOption(option =>
			option.setName('list')
				.setDescription('The list you want to show the leaderboard of (your default list can be set with /settings)')
				.setRequired(false)
				.addChoices(lists.map(list => { return {name:`${list.name} (${list.fullname})`, value: list.value}})),
		),

	async execute(interaction) {
		const { db } = require('../index.js');
        let response = await interaction.reply({
            content: 'Loading leaderboard...'
        });

        let list = await getList(interaction);
        let pagination;
        const pageSize = 20;
		
		const memberCache = new Map();
		try {
			const guildMembers = await interaction.guild.members.fetch({ cache: false });
			guildMembers.forEach(member => {
				memberCache.set(member.user.id, member.user.tag);
			});
		} catch (error) {
			logger.error('Error fetching guild members:', error);
			return await interaction.editReply(':x: An error occurred while fetching guild members.');
		}

		const attachments = {};
        lists.forEach((list) => {
            const logoPath = `assets/list-icons/${list.value}.webp`;
            if (fs.existsSync(logoPath)) {
                try {
                    attachments[list.value] = new AttachmentBuilder(logoPath, {
                        name: 'listlogo.webp'
                    });
                } catch (error) {
                    logger.error(`Could not attach file: ${error}`);
                }
            }
        });

		async function fetchLeaderboard(list) {
			let leaderboard;
			try {
				leaderboard = await db[list].findAll({
					order: [['amount', 'DESC']],
				});
			} catch (error) {
				logger.error('Error fetching leaderboard:', error);
				return null;
			}
			return leaderboard.filter(user => memberCache.has(user.user));
		}

		async function formatData(leaderboard, list) {
			const data = [];
			for (let i = 0; i < leaderboard.length; i++) {
				const user = leaderboard[i];
				const userTag = memberCache.get(user.user) || user.user;
				data.push(`**${i + 1}** - \`${userTag}\` (${Math.round(user.amount * 100) / 100} points)`);
			}
			const chunks = [];
			for (let i = 0; i < leaderboard.length; i += pageSize) {
				chunks.push(data.slice(i, i + pageSize));
			}
			let defaultPage = 0;
			const userData = await db[list].findOne({ where: { user: interaction.user.id } });
			if (userData) {
				const rank = leaderboard.findIndex(user => user.user === interaction.user.id);
				if (rank !== -1) {
					defaultPage = Math.floor(rank / pageSize);
				}
			}
			return { chunks: chunks, defaultPage: defaultPage };
		}

		const leaderboardData = {};
        await Promise.all(
            lists.map(async (l) => {
                try {
                    const leaderboard = await fetchLeaderboard(l.value);
					const { chunks, defaultPage } = await formatData(leaderboard, l.value);
					leaderboardData[l.value] = {
						chunks: chunks,
						defaultPage: defaultPage,
						mainData: `## ${l.name} Fish Leaderboard\nServer: **${interaction.guild.name}**\n`
					};
                } catch (error) {
                    logger.error(`Could not fetch leaderboard for list ${l.value}: ${error}`);
                }
            })
        );

		async function updatePagination(interaction) {
			const leaderboard = leaderboardData[list];

			if (!leaderboard?.chunks) {
				return await interaction.editReply(':x: An error occurred while fetching the leaderboard');
			}
			if (leaderboard.chunks.length === 0) {
				return await interaction.editReply(':x: No leaderboard data available for members of this guild');
			}

			const attachment = attachments[list];

			const selectLeaderboard = new StringSelectMenuBuilder()
                .setCustomId('select-leaderboard')
                .addOptions(lists.map((l) => ({
                    label: `${l.name} (${l.fullname})`,
                    value: l.value
                })))
                .setPlaceholder(`List: ${lists.find((l) => l.value === list).name}`);

			pagination?._collector?.stop();
            pagination = new ButtonPaginationBuilder();
            pagination
                .addButton(new ButtonBuilder().setEmoji('⏮️').setCustomId('first').setStyle(ButtonStyle.Secondary), 'FirstPage')
                .addButton(new ButtonBuilder().setEmoji('◀️').setCustomId('prev').setStyle(ButtonStyle.Secondary), 'PreviousPage')
                .addButton(new ButtonBuilder().setEmoji('▶️').setCustomId('next').setStyle(ButtonStyle.Secondary), 'NextPage')
                .addButton(new ButtonBuilder().setEmoji('⏭️').setCustomId('last').setStyle(ButtonStyle.Secondary), 'LastPage')
                .setAuthorDependent(true);
			pagination.setCurrentPageIndex(leaderboard.defaultPage - 1);
			pagination.addAdditionalActionRows([new ActionRowBuilder().addComponents(selectLeaderboard)]);
            pagination.on('error', (error) => logger.error(`Pagination error: ${error}`));

			leaderboard.chunks.forEach((chunk, index) => {
                const embedDescription = leaderboard.mainData + '\n' + chunk.join('\n');
                const embed = new EmbedBuilder()
                    .setDescription(embedDescription)
                    .setColor('Gold')
                    .setFooter({
                        text: `Page ${index + 1} of ${leaderboard.chunks.length}`
                    });

                if (attachment) embed.setThumbnail(`attachment://${attachment.name}`);
                pagination.addPages(embed);
            });

			await pagination.send({
                command: interaction,
                sendAs: 'EditMessage'
            });
            await interaction.editReply({
                files: attachment ? [attachment] : [],
                content: ''
            });
		}

		await updatePagination(interaction);
		
		const listCollectorFilter = (i) => i.user.id === interaction.user.id && i.customId === 'select-leaderboard';
        const listCollector = response.createMessageComponentCollector({
            filter: listCollectorFilter,
            componentType: ComponentType.StringSelect,
            time: 60_000,
        });

        listCollector.on('collect', async (selectMenuInteraction) => {
            await selectMenuInteraction.update({ content: ''  });
            const new_list = selectMenuInteraction.values[0];
            if (new_list !== list) {
                list = new_list;
                await updatePagination(selectMenuInteraction);
            }
        });

        listCollector.on('end', async (_, reason) => {
            if (reason === 'time') {
                await interaction.editReply({
                    components: []
                });
                memberCache.clear();
            }
        });
	},
};