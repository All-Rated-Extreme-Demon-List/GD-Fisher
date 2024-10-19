const { SlashCommandBuilder } = require('discord.js');
const lists = require('../others/lists.js');
const { getList, fish } = require('../others/utils.js');
const { checkCooldown } = require('../others/cooldowns.js');

module.exports = {
	enabled: true,
	cooldown: 2,
	data: new SlashCommandBuilder()
		.setName('fish')
		.setDescription('GD Lists Fishing')
		.addStringOption(option =>
			option.setName('list')
				.setDescription('The list you want to fish from (your default list can be set with /settings)')
				.setRequired(false)
				.addChoices(lists.map(list => { return {name:`${list.name} (${list.fullname})`, value: list.value}})),)
		.addUserOption(option =>
			option.setName('for')
				.setDescription('The user you want to fish for')
				.setRequired(false)),
	async execute(interaction) {
		const list = await getList(interaction);
		const expiredTimestamp = checkCooldown(interaction.user.id, list);
		if (expiredTimestamp) {
			return await interaction.reply({content:`:x: You are on cooldown for the\`${lists.find(l => l.value === list).name}\` list. You can fish again in <t:${expiredTimestamp}:R>.`, ephemeral: true });
		}
		await fish(interaction, list);
	},
};
