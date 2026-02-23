import { useGitClient } from '#src/app/plugins/git/hooks';
import type { ListLevel, AvailableList, ListLevelWithPoints } from '#src/lists';
import { Logger } from 'commandkit';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export async function updateListLevels(
    list: AvailableList,
): Promise<ListLevelWithPoints[]> {
    const { baseDir } = useGitClient();

    if ('cache' in list && !('score' in list)) {
        return await list.cache();
    } else {
        const levels: (ListLevel | ListLevelWithPoints)[] = [];

        if ('cache' in list) {
            levels.push(...(await list.cache()));
        } else {
            const localRepoPath = path.resolve(baseDir, `${list.value}`);
            let list_data;
            try {
                list_data = JSON.parse(
                    readFileSync(
                        path.join(localRepoPath, 'data/_list.json'),
                        'utf8',
                    ),
                );
            } catch (parseError) {
                Logger.error(
                    `Tasks - ${list.value} - Git - ` +
                        `Unable to parse data from _list.json:\n${parseError}`,
                );
                return [];
            }

            let i = 1;
            for (const filename of list_data) {
                if (filename.startsWith('_')) continue;
                let parsedData;
                try {
                    parsedData = JSON.parse(
                        readFileSync(
                            path.join(localRepoPath, `data/${filename}.json`),
                            'utf8',
                        ),
                    );
                } catch (parseError) {
                    Logger.error(
                        `Tasks - ${list.value} - Git - ` +
                            `Unable to parse data from ${filename}.json:\n${parseError}`,
                    );
                    continue;
                }

                levels.push({
                    name: parsedData.name,
                    position: i,
                    filename: filename,
                });
                i++;
            }
        }

        const level_count = levels.length;
        return levels.map((level) => ({
            ...level,
            points: list.score(level.position, level_count),
        }));
    }
}
