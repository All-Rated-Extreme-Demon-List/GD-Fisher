const { ActivityType } = require('discord.js');
const lists = require('../others/lists.js');
const logger = require('log4js').getLogger();

module.exports = {
	name: 'updateActivity',
	cron: '30 * * * *',
	enabled: true,
	async execute() {
		const { db, client } = require('../index.js');

		logger.info('Scheduled - ' + 'Updating activity status...');
		const users = new Set();
		for (const list of lists) {
			const fishers = await db[list.value].findAll();
			fishers.forEach(fisher => {
				users.add(fisher.user);
			});
		}
		const nbUsers = users.size;
		const nbServers = await db.guilds.count({ where: { enabled: true } });

		const activity = `Fishing levels for ${nbUsers} fishers on ${nbServers} servers`;
		client.user.setActivity(activity, {type: ActivityType.Custom});
		logger.info('Scheduled - ' + 'Successfully updated activity status to: ' + activity);
	},
};