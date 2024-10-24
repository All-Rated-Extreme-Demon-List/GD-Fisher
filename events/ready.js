const { Events } = require('discord.js');
const { scheduledTasksInit, updateGuilds } = require('../others/startUtils.js');
const updateActivity = require('../scheduled/updateActivity.js');
const logger = require('log4js').getLogger();

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		logger.log(`Startup - Logged in as ${client.user.tag}`);
		await scheduledTasksInit();
		await updateGuilds(client);
		await updateActivity.execute();
		logger.log(`Startup - Initialization complete`);
		return 1;
	},
};
