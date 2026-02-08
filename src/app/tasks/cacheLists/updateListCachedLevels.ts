import { useDatabase } from '#src/app/plugins/sequelize/hooks';
import { type AvailableList, type ListLevel } from '#src/lists';
import { Logger } from 'commandkit';

export async function updateListCachedLevels(
    list: AvailableList,
    levels: ListLevel[],
) {
    const { cache, sequelize } = useDatabase();

    const fullLevels = levels.map((level) => ({
        ...level,
        points: list.score(level.position, levels.length),
    }));

    if (fullLevels.length > 0) {
        try {
            await sequelize.transaction(async (transaction) => {
                await cache[list.value].destroy({ where: {}, transaction });
                await cache[list.value].bulkCreate(fullLevels, { transaction });
            });

            Logger.info(
                `Tasks - ${list.value} - ` +
                    `Successfully updated ${fullLevels.length} cached levels.`,
            );
        } catch (error) {
            Logger.error(
                `Tasks - ${list.value} - ` +
                    `Couldn't update cached levels, something went wrong with sequelize: ${error}`,
            );
        }
    } else {
        Logger.error(
            `Tasks - ${list.value} - ` +
                'Canceled updating levels cache: no levels found.',
        );
    }
}
