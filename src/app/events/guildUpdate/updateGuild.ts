import { useDatabase } from '#src/app/plugins/sequelize/hooks';
import { EventHandler, Logger } from 'commandkit';

const handler: EventHandler<'guildUpdate'> = async (oldGuild, newGuild) => {
    const { db } = useDatabase();
    Logger.info(
        'Event - GuildUpdate - ' +
            `Guild updated: ${newGuild.name} (${newGuild.id})`,
    );
    try {
        const guildExists = await db.guilds.findOne({
            where: { guild_id: oldGuild.id },
        });
        if (guildExists) {
            Logger.info(
                'Event - GuildUpdate - ' +
                    `Guild already exists in database, updating`,
            );
            await db.guilds.update(
                {
                    guild_name: newGuild.name,
                    guild_member_count: newGuild.memberCount,
                    enabled: true,
                },
                { where: { guild_id: oldGuild.id } },
            );
        } else {
            Logger.info(
                'Event - GuildUpdate - ' +
                    `Guild does not exist in database, adding`,
            );
            await db.guilds.create({
                guild_id: newGuild.id,
                guild_name: newGuild.name,
                guild_member_count: newGuild.memberCount,
                enabled: true,
            });
        }
    } catch (error) {
        Logger.error('Event - GuildUpdate - ' + `Sequelize error: ${error}`);
    }
    return;
};

export default handler;
