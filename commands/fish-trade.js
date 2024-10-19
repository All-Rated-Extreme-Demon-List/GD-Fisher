const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonStyle,
    ButtonBuilder, EmbedBuilder,
} = require('discord.js');
const lists = require('../others/lists.js');

module.exports = {
    enabled: true,
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('fish-trade')
        .setDescription('Trade a fished level with someone else')
        .setContexts(['Guild'])
        .addStringOption(option =>
            option.setName('list')
                .setDescription('The list on which you want to trade')
                .setRequired(true)
                .addChoices(lists.map(list => {
                    return {name: `${list.name} (${list.fullname})`, value: list.value}
                })),
        )
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to trade with')
                .setRequired(true)
        )
        .addStringOption(
            option => option.setName('leveltogive')
                .setDescription('The level you want to give to the other person')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(
            option => option.setName('leveltoget')
                .setDescription('The level you want to get from the other person')
                .setRequired(true)
                .setAutocomplete(true)
        ),
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const {cache} = require('../index.js');
        const list = interaction.options.getString('list');
        if (!list) {
            return await interaction.respond([]);
        } else {
            return await interaction.respond(
                (await
                        cache[list]
                            .findAll({where: {}})
                ).filter(level => level.name.toLowerCase().includes(focused.toLowerCase()))
                    .slice(0, 25)
                    .map(level => ({name: level.name, value: level.filename}))
            );
        }
    },
    async execute(interaction) {
        const {db, cache} = require('../index.js');
        const list = interaction.options.getString('list');
        const user = interaction.user;
        const targetUser = interaction.options.getUser('user');
        const levelToGive = interaction.options.getString('leveltogive');
        const levelToGet = interaction.options.getString('leveltoget');

        if (!(await interaction.client.guilds.cache.get(interaction.guildId).members.fetch(targetUser.id))) {
            return await interaction.reply({content: 'This user is not in this server', ephemeral: true});
        }

        const userData = await db[list].findOne({ where: { user: user.id } });
        const targetData = await db[list].findOne({ where: { user: targetUser.id } });

        if (!userData) {
            return await interaction.reply({content: ':x: You do not have any fishing data for this list', ephemeral: true});
        }

        if (!targetData) {
            return await interaction.reply({content: ':x: This user does not have any fishing data for this list', ephemeral: true});
        }
        const userFishedList = JSON.parse(userData.fished_list);
        const userFishedListFrequency = JSON.parse(userData.fished_list_frequency);

        const targetFishedList = JSON.parse(targetData.fished_list);
        const targetFishedListFrequency = JSON.parse(targetData.fished_list_frequency);

        const userLevelIndex = userFishedList.findIndex(level => level === levelToGive);
        if (userLevelIndex === -1) {
            return await interaction.reply({content: ':x: You do not have fished this level yet', ephemeral: true});
        }
        const targetLevelIndex = targetFishedList.findIndex(level => level === levelToGet);
        if (targetLevelIndex === -1) {
            return await interaction.reply({content: ':x: This user does not have fished this level yet', ephemeral: true});
        }

        const userLevel = await cache[list].findOne({ where: { filename: levelToGive } });
        const targetLevel = await cache[list].findOne({ where: { filename: levelToGet } });

        const confirmTrade = new ButtonBuilder()
            .setCustomId('confirmTrade')
            .setLabel('Accept Trade')
            .setStyle(ButtonStyle.Success);

        const cancelTrade = new ButtonBuilder()
            .setCustomId('cancelTrade')
            .setLabel('Reject Trade')
            .setStyle(ButtonStyle.Danger);

        const tradeText = `## Level Trade (${lists.find(l => l.value === list).name})\n<@${user.id}> wants to give you:\n**${userLevel.name}** (TOP ${userLevel.position})\n\nIn exchange for:\n**${targetLevel.name}** (TOP ${targetLevel.position})\n`;
        const embed = new EmbedBuilder()
            .setDescription(tradeText)
            .setColor("Red");

        const editRow = new ActionRowBuilder().addComponents(confirmTrade, cancelTrade);
        const tradeMessage = await interaction.reply({ content: `<@${targetUser.id}>`, components: [editRow], embeds: [embed]});

        const tradeCollectorFilter = i => i.user.id === targetUser.id;
        try {
            const tradeConfirmation = await tradeMessage.awaitMessageComponent({ filter: tradeCollectorFilter, time: 120_000 });

            if (tradeConfirmation.customId === 'confirmTrade') {
                // Removing levels
                if (userFishedListFrequency[userLevelIndex] === 1) {
                    userFishedList.splice(userLevelIndex, 1);
                    userFishedListFrequency.splice(userLevelIndex, 1);
                } else {
                    userFishedListFrequency[userLevelIndex]--;
                }

                if (targetFishedListFrequency[targetLevelIndex] === 1) {
                    targetFishedList.splice(targetLevelIndex, 1);
                    targetFishedListFrequency.splice(targetLevelIndex, 1);
                } else {
                    targetFishedListFrequency[targetLevelIndex]--;
                }

                // Adding new levels
                const userNewLevelIndex = userFishedList.findIndex(level => level === levelToGet);
                const targetNewLevelIndex = targetFishedList.findIndex(level => level === levelToGive);

                if (userNewLevelIndex === -1 ) {
                    userFishedList.push(levelToGet);
                    userFishedListFrequency.push(1);
                } else {
                    userFishedListFrequency[userNewLevelIndex]++;
                }

                if (targetNewLevelIndex === -1) {
                    targetFishedList.push(levelToGive);
                    targetFishedListFrequency.push(1);
                } else {
                    targetFishedListFrequency[targetNewLevelIndex]++;
                }

                await Promise.all([
                    db[list].update({ fished_list: JSON.stringify(userFishedList), fished_list_frequency: JSON.stringify(userFishedListFrequency) }, { where: { user: user.id } }),
                    db[list].update({ fished_list: JSON.stringify(targetFishedList), fished_list_frequency: JSON.stringify(targetFishedListFrequency) }, { where: { user: targetUser.id } }),
                ]);

                await interaction.editReply({components: [], embeds:[new EmbedBuilder().setDescription(`${tradeText}\n:white_check_mark: Trade successful`).setColor("Red")]});
            } else if (tradeConfirmation.customId === 'cancelTrade') {
                await interaction.editReply({components: [], embeds: [new EmbedBuilder().setDescription(`${tradeText}\n:x: Trade rejected`).setColor("Red")]});
            }
        } catch (_) {
            await interaction.editReply({components: [], embeds: [new EmbedBuilder().setDescription(`${tradeText}\n:x: Confirmation not received within 2 minutes, cancelling`).setColor("Red")]});
        }
    }
}