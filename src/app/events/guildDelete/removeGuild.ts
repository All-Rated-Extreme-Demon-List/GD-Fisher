import { useDatabase } from '#src/app/plugins/sequelize/hooks';
import { EventHandler, Logger } from 'commandkit';

const handler: EventHandler<'guildDelete'> = async (guild) => {
    const { db } = useDatabase();

    Logger.info(
        'Event - GuildDelete - ' + `Left guild: ${guild.name} (${guild.id})`,
    );
    try {
        const guildExists = await db.guilds.findOne({
            where: { guild_id: guild.id },
        });
        if (guildExists) {
            Logger.info(
                'Event - GuildDelete - ' +
                    `Guild already exists in database, updating`,
            );
            await db.guilds.update(
                {
                    guild_name: guild.name,
                    guild_member_count: guild.memberCount,
                    enabled: false,
                },
                { where: { guild_id: guild.id } },
            );
        } else {
            Logger.info(
                'Event - GuildDelete - ' +
                    `Guild does not exist in database, adding`,
            );
            await db.guilds.create({
                guild_id: guild.id,
                guild_name: guild.name,
                guild_member_count: guild.memberCount,
                enabled: false,
            });
        }
    } catch (error) {
        Logger.error('Event - GuildDelete - ' + `Sequelize error: ${error}`);
    }
    return;
};

export default handler;
