import { useDatabase } from '#src/app/plugins/sequelize/hooks';
import { EventHandler, Logger } from 'commandkit';

const handler: EventHandler<'guildCreate'> = async (guild) => {
    const { db } = useDatabase();
    Logger.info(
        'Event - GuildCreeate - ' +
            `Joined new guild: ${guild.name} (${guild.id})`,
    );
    try {
        const guildExists = await db.guilds.findOne({
            where: { guild_id: guild.id },
        });
        if (guildExists) {
            Logger.info(
                'Event - GuildCreeate - ' +
                    `Guild already exists in database, updating`,
            );
            await db.guilds.update(
                {
                    guild_name: guild.name,
                    guild_member_count: guild.memberCount,
                    enabled: true,
                },
                { where: { guild_id: guild.id } },
            );
        } else {
            Logger.info(
                'Event - GuildCreeate - ' +
                    `Guild does not exist in database, adding`,
            );
            await db.guilds.create({
                guild_id: guild.id,
                guild_name: guild.name,
                guild_member_count: guild.memberCount,
                enabled: true,
            });
        }
    } catch (error) {
        Logger.error('Event - GuildCreeate - ' + `Sequelize error: ${error}`);
    }
    return;
};

export default handler;
