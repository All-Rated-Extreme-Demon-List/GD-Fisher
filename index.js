// Imports
const simpleGit = require('simple-git');
const Sequelize = require('sequelize');
const dotenv = require('dotenv');
const { Client, GatewayIntentBits, MessageManager, Options } = require('discord.js');
const log4js = require('log4js');
const { clientInit, sequelizeInit } = require('./others/startUtils');
const updateCache = require('./scheduled/updateCache');

// Logger
log4js.configure('./log4js.json');
const logger = log4js.getLogger();
const sqlLogger = log4js.getLogger('sql');
const errorLogger = log4js.getLogger('error');

// Error logging
process.on('uncaughtException', (err) => {
	errorLogger.error('Uncaught Exception:', err);
});
  
process.on('unhandledRejection', (reason, promise) => {
	errorLogger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Env variables
dotenv.config();

// Discord client
const client = new Client(
	{ 	
		intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
		makeCache: Options.cacheWithLimits({
			...Options.DefaultMakeCacheSettings,
			ReactionManager: 0,
			GuildMemberManager: {
				maxSize: 200,
				keepOverLimit: member => member.id === member.client.user.id,
			},
		}),
	});

// Git repo setup
const git = simpleGit();

// Database setup
const sequelize = new Sequelize({
	dialect: 'sqlite',
	logging: (msg) => sqlLogger.debug(msg),
	storage: './data/database.sqlite',
});

const db = require('./others/dbSchema').createDbSchema(sequelize);
const cache = require('./others/dbSchema').createCacheSchema(sequelize);

// Initialize client
async function init() {
	logger.info('Startup - ' + '-'.repeat(40));
	logger.info('Startup - ' + 'GD Fisher starting...');
	logger.info('Startup - ' + '-'.repeat(40));
	await sequelizeInit(db, cache);
	await clientInit(client, db);
	await updateCache.execute();

	logger.info('Startup - ' + 'Logging in with discord...');
	client.login(process.env.DISCORD_TOKEN);
}

module.exports = { db, cache, client, git, sequelize };

init();



