import { Logger } from 'commandkit';
import { task } from '@commandkit/tasks';
import lists from '#src/lists';
import { updateListCachedLevels } from './cacheLists/updateListCachedLevels';
import { updateListLevels } from './cacheLists/updateListLevels';
import { updateListRepo } from './cacheLists/updateListRepo';

let isRunning = false;

export const executeCacheLists = async () => {
    Logger.info('Tasks - ' + 'Updating cached levels...');
    isRunning = true;
    for (const list of lists) {
        Logger.info('Tasks - ' + `${list.value} - Updating list...`);
        if ('repo' in list) {
            await updateListRepo(list);
        }

        Logger.info('Tasks - ' + `${list.value} - Parsing levels...`);
        const levels = await updateListLevels(list);

        if (!levels || levels.length === 0) {
            Logger.error(
                'Tasks - ' +
                    `Failed to update cached levels for ${list.value}.`,
            );
            continue;
        }

        await updateListCachedLevels(list, levels);

        Logger.info(
            'Tasks - ' + `${list.value} - Successfully updated cached levels.`,
        );
    }
    isRunning = false;
};

export default task({
    name: 'update-cached-lists',
    schedule: '0 * * * *',
    prepare: async () => !isRunning,
    async execute() {
        executeCacheLists();
    },
});
