import { useDatabase } from '#src/app/plugins/sequelize/hooks';
import type { ListLevelWithPoints, AvailableList } from '#src/lists';
import { Logger } from 'commandkit';

export async function updateListCachedLevels(
    list: AvailableList,
    levels: ListLevelWithPoints[],
) {
    const { cache, sequelize } = useDatabase();

    if (levels.length > 0) {
        try {
            await sequelize.transaction(async (transaction) => {
                await cache[list.value].destroy({ where: {}, transaction });
                await cache[list.value].bulkCreate(levels, { transaction });
            });

            Logger.info(
                `Tasks - ${list.value} - ` +
                    `Successfully updated ${levels.length} cached levels.`,
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
