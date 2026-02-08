import { RuntimePlugin, type CommandKitPluginRuntime } from 'commandkit';
import { mkdir } from 'node:fs/promises';
import simpleGit, { type SimpleGit, type SimpleGitOptions } from 'simple-git';

export interface GitPluginOptions {
    baseDir?: string;
    config?: SimpleGitOptions;
}

export class GitPlugin extends RuntimePlugin<GitPluginOptions> {
    name = 'git';
    private git!: SimpleGit;

    async activate(ctx: CommandKitPluginRuntime): Promise<void> {
        const baseDir = this.options.baseDir || process.cwd() + '/git';
        await mkdir(baseDir, { recursive: true });
        this.git = simpleGit(baseDir, this.options.config);
        ctx.commandkit.store.set('git', this.git);
        ctx.commandkit.store.set('gitBaseDir', baseDir);
    }

    async deactivate(ctx: CommandKitPluginRuntime): Promise<void> {
        ctx.commandkit.store.delete('git');
        ctx.commandkit.store.delete('gitBaseDir');
    }
}

export function git(options?: GitPluginOptions) {
    return new GitPlugin(options ?? {});
}
