import { executeCacheLists } from '#src/app/tasks/cacheLists';
import { EventHandler } from 'commandkit';

const handler: EventHandler<'guildCreate'> = async (guild) => {
    executeCacheLists();
};
export default handler;
