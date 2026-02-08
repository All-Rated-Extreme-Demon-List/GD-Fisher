import { RuntimePlugin, type CommandKitPluginRuntime } from 'commandkit';
import { Sequelize, type SyncOptions } from 'sequelize';
import {
    createCacheSchema,
    createDbSchema,
    type CacheModels,
    type DbModels,
} from '#src/db';
import { useLogger } from '#src/app/plugins/logging/hooks';

export type SequelizePluginOptions = {
    sqlitePath: string;
    sync?: SyncOptions;
};

export class SequelizePlugin extends RuntimePlugin<SequelizePluginOptions> {
    name: string = 'sequelize';
    private sequelize!: Sequelize;
    private db!: DbModels;
    private cache!: CacheModels;

    async activate(ctx: CommandKitPluginRuntime): Promise<void> {
        const { sqlLogger } = useLogger();

        this.sequelize = new Sequelize({
            dialect: 'sqlite',
            storage: this.options.sqlitePath,
            logging: (message) => sqlLogger.debug(message),
        });

        this.db = createDbSchema(this.sequelize);
        this.cache = createCacheSchema(this.sequelize);

        const syncOptions = this.options.sync ?? { alter: true };

        for (const table of Object.keys(this.db) as (keyof DbModels)[])
            await this.db[table].sync(syncOptions);
        for (const table of Object.keys(this.cache) as (keyof CacheModels)[])
            await this.cache[table].sync(syncOptions);

        ctx.commandkit.store.set('sequelize', this.sequelize);
        ctx.commandkit.store.set('db', this.db);
        ctx.commandkit.store.set('cache', this.cache);
    }

    async deactivate(ctx: CommandKitPluginRuntime): Promise<void> {
        ctx.commandkit.store.delete('sequelize');
        ctx.commandkit.store.delete('db');
        ctx.commandkit.store.delete('cache');
        await this.sequelize.close();
    }
}

export function sequelize(options: SequelizePluginOptions) {
    return new SequelizePlugin(options);
}
