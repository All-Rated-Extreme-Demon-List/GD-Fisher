const { SlashCommandBuilder } = require('discord.js');
const lists = require('../others/lists.js');
const { fish } = require('../others/utils.js');
const { checkCooldown } = require('../others/cooldowns.js');

const listSubcommands = lists.map(list => ({
    name: list.value,
    description: `Command shortcut to fish from the ${list.name}`,
}));

module.exports = {
	enabled: true,
	cooldown: 2,
	data: (() => {
		const command = new SlashCommandBuilder()
			.setName('fishl')
			.setDescription('GD Lists Fishing');

		listSubcommands.forEach(sub => {
			command.addSubcommand(subcommand =>
				subcommand
					.setName(sub.name)
					.setDescription(sub.description)
					.addUserOption(option =>
						option.setName('for')
							.setDescription('The user you want to fish for')
							.setRequired(false))
			);
		});
		return command;
	})(),

	async execute(interaction) {
		const subcommand = interaction.options.getSubcommand();
		const expiredTimestamp = checkCooldown(interaction.user.id, subcommand);
		if (expiredTimestamp) {
			return await interaction.reply({content:`:x: You are on cooldown for the\`${lists.find(l => l.value === subcommand).name}\` list. You can fish again in <t:${expiredTimestamp}:R>.`, ephemeral: true });
		}
		await fish(interaction, subcommand);
	},
};