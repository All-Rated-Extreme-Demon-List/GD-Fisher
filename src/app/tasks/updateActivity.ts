import lists from '#src/lists';
import { task } from '@commandkit/tasks';
import { Logger } from 'commandkit';
import { useDatabase } from '#src/app/plugins/sequelize/hooks';
import { ActivityType } from 'discord.js';

export default task({
    name: 'update-activity',
    schedule: '30 * * * *',
    async execute(ctx) {
        const { db } = useDatabase();

        Logger.info('Tasks - ' + 'Updating activity status...');
        const users = new Set();
        for (const list of lists) {
            const fishers = await db[list.value].findAll();
            fishers.forEach((fisher) => {
                users.add(fisher.getDataValue('user'));
            });
        }
        const nbUsers = users.size;
        const nbServers = await db.guilds.count({ where: { enabled: true } });

        const activity = `Fishing levels for ${nbUsers} fishers on ${nbServers} servers`;
        const client = ctx.commandkit.client;
        if (client && client.user) {
            client.user.setActivity(activity, { type: ActivityType.Custom });
            Logger.info(
                'Tasks - ' +
                    'Successfully updated activity status to: ' +
                    activity,
            );
        }
    },
});
