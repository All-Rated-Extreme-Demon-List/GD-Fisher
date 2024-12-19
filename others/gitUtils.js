const fs = require('fs');
const path = require('path');
const lists = require('./lists');
const logger = require('log4js').getLogger();

module.exports = {
	async cloneOrPullRepo(list) {
		const { git } = require('../index');

		logger.info('Git - ' + 'Updating GitHub repositories...');
		
		try {
			const repoUrl = lists.find(l => l.value === list).repo;
			const authedRepoUrl = repoUrl.replace('https://', `https://${process.env.GITHUB_USERNAME}:${process.env.GITHUB_TOKEN}@`);
			const localRepoPath =  path.resolve(__dirname, `../data/repos/${list}`);
			
			if (!fs.existsSync(localRepoPath)) {
				logger.info('Git - ' + 'Cloning the repository for the first time, this may take a while...');
				await git.clone(authedRepoUrl, localRepoPath);
			} else {
				logger.info('Git - ' + 'Pulling the latest changes from the repository...');
				await git.cwd(localRepoPath).pull();
			}
		} catch (error) {
			logger.error('Git - ' + `Error updating the repository:\n${error}`);
			return -1;
		}
		logger.info('Git - ' + 'Successfully updated the repository');
		
	},
	async parseLevels(list) {
		const levels = [];
		const localRepoPath =  path.resolve(__dirname, `../data/repos/${list}`);
		let list_data;
		try {
			list_data = JSON.parse(fs.readFileSync(path.join(localRepoPath, 'data/_list.json'), 'utf8'));
		} catch (parseError) {
			logger.error('Git - ' + `Unable to parse data from _list.json:\n${parseError}`);
			return -1;
		}

		let i = 1;
		for (const filename of list_data) {
			if (filename.startsWith('_')) continue;
			let parsedData;
			try {
				parsedData = JSON.parse(fs.readFileSync(path.join(localRepoPath, `data/${filename}.json`), 'utf8'));
			} catch (parseError) {
				logger.error('Git - ' + `Unable to parse data from ${filename}.json:\n${parseError}`);
				continue;
			}
			
			levels.push({ name: parsedData.name, position: i, filename: filename});
			i++;
		}
		return levels;
	}
}