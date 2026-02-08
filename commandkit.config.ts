import {
    cooldown,
    type CooldownCommandData,
} from '#src/app/plugins/cooldown/index';
import { git } from './src/app/plugins/git/index.ts';
import { logging } from './src/app/plugins/logging/index.ts';
import { sequelize } from './src/app/plugins/sequelize/index.ts';
import { tasks } from '@commandkit/tasks';
import { defineConfig } from 'commandkit/config';

declare module 'commandkit' {
    interface CustomAppCommandProps {
        cooldown?: CooldownCommandData['cooldown'];
    }
}

export default defineConfig({
    plugins: [
        logging({
            log4jsConfigPath: './log4js.json',
        }),
        sequelize({
            sqlitePath: './data/database.sqlite',
        }),
        git({
            baseDir: './data/git',
        }),
        cooldown(),
        tasks({ sqliteDriverDatabasePath: './data/tasks.sqlite' }),
    ],
});
