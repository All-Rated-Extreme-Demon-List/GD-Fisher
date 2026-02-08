import { useCommandKit } from 'commandkit/hooks';
import { type SimpleGit } from 'simple-git';

export function useGitClient() {
    const commandkit = useCommandKit();
    const git = commandkit.store.get('git') as SimpleGit;
    const baseDir = commandkit.store.get('gitBaseDir') as string;
    if (!git || !baseDir) throw new Error('Git client not initialized');
    return { git, baseDir };
}
