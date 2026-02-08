import { useGitClient } from '#src/app/plugins/git/hooks';
import { type AvailableList } from '#src/lists';
import { Logger } from 'commandkit';
import { existsSync } from 'node:fs';
import path from 'node:path';

export async function updateListRepo(list: AvailableList) {
    const { git, baseDir } = useGitClient();

    if (!('repo' in list)) {
        Logger.warn(
            `Tasks - ${list.value} - Git - ` +
                `This list does not have an associated Git repository to update.`,
        );
        return;
    }

    Logger.info(
        `Tasks - ${list.value} - Git - ` + `Updating GitHub repository...`,
    );

    try {
        const authedRepoUrl = list.repo.replace(
            'https://',
            `https://${process.env.GITHUB_USERNAME}:${process.env.GITHUB_TOKEN}@`,
        );
        const localRepoPath = path.resolve(baseDir, `${list.value}`);

        await git.raw([
            'config',
            '--global',
            '--add',
            'safe.directory',
            localRepoPath,
        ]);

        if (!existsSync(localRepoPath)) {
            Logger.info(
                `Tasks - ${list.value} - Git - ` +
                    'Cloning the repository for the first time, this may take a while...',
            );
            await git.clone(authedRepoUrl, localRepoPath);
        } else {
            Logger.info(
                `Tasks - ${list.value} - Git - ` +
                    'Pulling the latest changes from the repository...',
            );

            const repoGit = git.cwd(localRepoPath);
            await repoGit.raw(['fetch', '--prune', authedRepoUrl, 'HEAD']);
            await repoGit.raw(['reset', '--hard', 'FETCH_HEAD']);
            await repoGit.raw(['clean', '-fd']);
        }
    } catch (error) {
        Logger.error(
            `Tasks - ${list.value} - Git - ` +
                `Error updating the repository:\n${error}`,
        );
        return -1;
    }
    Logger.info(
        `Tasks - ${list.value} - Git - ` +
            `Successfully updated the repository for the ${list.value} list.`,
    );
}
