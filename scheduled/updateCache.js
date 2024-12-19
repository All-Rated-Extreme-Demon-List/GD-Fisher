const { cloneOrPullRepo, parseLevels } = require('../others/gitUtils.js');
const logger = require('log4js').getLogger();

const lists = require('../others/lists.js');

module.exports = {
	name: 'updateCache',
	cron: '30 * * * *',
	enabled: true,
	async execute() {
		const { cache } = require('../index.js');

		logger.info('Scheduled - ' + 'Updating cached levels...');
		for (const list of lists) {
			logger.info('Scheduled - ' + `Updating ${list.value} list...`);
			if (list.repo) {
				await cloneOrPullRepo(list.value);
			}
			logger.info('Scheduled - ' + 'Parsing levels...');
			let levels = [];
			if (list.cache) {
				levels = await list.cache();
			} else {
				levels = await parseLevels(list.value);
			}

			if (!levels || levels === -1) {
				logger.error('Scheduled - ' + `Failed to update cached levels for ${list.value}.`);
				continue;
			}
			
			if (list.score) {
				levels = levels.map((level) => {
					level.points = list.score(level.position, levels.length);
					return level;
				});
			}

			
			if (levels.length > 0) {
				await cache[list.value].destroy({ where: {}});
				try {
					await cache[list.value].bulkCreate(levels);
					logger.info('Scheduled - ' + `Successfully updated ${levels.length} cached levels.`);
				} catch (error) {
					logger.error('Scheduled - ' + `Couldn't udate cached levels, something went wrong with sequelize: ${error}`);
				}
			} else {
				logger.error('Scheduled - ' + 'Canceled updating levels cachee: no levels found.');
			}
		logger.info('Scheduled - ' + 'Successfully updated cached levels.');
		}
	},
};