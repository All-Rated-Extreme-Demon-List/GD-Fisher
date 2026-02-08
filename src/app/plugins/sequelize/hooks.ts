import { type CacheModels, type DbModels } from '#src/db';
import { useCommandKit } from 'commandkit/hooks';
import type { Sequelize } from 'sequelize';

export function useDatabase() {
    const commandkit = useCommandKit();
    const db = commandkit.store.get('db') as DbModels;
    const cache = commandkit.store.get('cache') as CacheModels;
    const sequelize = commandkit.store.get('sequelize') as Sequelize;

    if (!db || !cache || !sequelize)
        throw new Error('Database not initialized');
    return { db, cache, sequelize };
}
