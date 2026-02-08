import {
    DataTypes,
    type Sequelize,
    type Model,
    type ModelStatic,
} from 'sequelize';
import lists, { type AvailableListValue } from './lists.ts';

export type DataRow = {
    user: string;
    amount: number;
    mean: number;
    fished_list: string;
    fished_list_frequency: string;
    times_fished: number;
};

export type CacheRow = {
    name: string;
    position: number;
    filename: string;
    points: number;
};

type UserSettingsRow = {
    user: string;
    default_list: AvailableListValue | null;
};

type GuildSettingsRow = {
    guild: string;
    default_list: AvailableListValue | null;
};

type GuildRow = {
    guild_id: string;
    guild_name: string | null;
    guild_member_count: number | null;
    enabled: boolean | null;
};

export type DataModel = Model<DataRow, DataRow>;
export type CacheModel = Model<CacheRow, CacheRow>;
type UserSettingsModel = Model<UserSettingsRow, UserSettingsRow>;
type GuildSettingsModel = Model<GuildSettingsRow, GuildSettingsRow>;
type GuildModel = Model<GuildRow, GuildRow>;

export type DataModels = {
    [K in AvailableListValue]: ModelStatic<DataModel>;
};

export type CacheModels = {
    [K in AvailableListValue]: ModelStatic<CacheModel>;
};

export type StaticModels = {
    user_settings: ModelStatic<UserSettingsModel>;
    guild_settings: ModelStatic<GuildSettingsModel>;
    guilds: ModelStatic<GuildModel>;
};

export type DbModels = StaticModels & DataModels;

export function createDbSchema(sequelize: Sequelize): DbModels {
    const db = {} as DbModels;

    db.user_settings = sequelize.define<UserSettingsModel>(
        'settings_users',
        {
            user: { type: DataTypes.STRING, primaryKey: true },
            default_list: { type: DataTypes.STRING, allowNull: true },
        },
        { freezeTableName: true },
    );

    db.guild_settings = sequelize.define<GuildSettingsModel>(
        'settings_guilds',
        {
            guild: { type: DataTypes.STRING, primaryKey: true },
            default_list: { type: DataTypes.STRING, allowNull: true },
        },
        { freezeTableName: true },
    );

    db.guilds = sequelize.define<GuildModel>(
        'guilds',
        {
            guild_id: { type: DataTypes.STRING, primaryKey: true },
            guild_name: { type: DataTypes.STRING, allowNull: true },
            guild_member_count: { type: DataTypes.INTEGER, allowNull: true },
            enabled: { type: DataTypes.BOOLEAN, allowNull: true },
        },
        { freezeTableName: true },
    );

    for (const list of lists) {
        db[list.value] = sequelize.define<DataModel>(
            `data_${list.value}`,
            {
                user: { type: DataTypes.STRING },
                amount: { type: DataTypes.DOUBLE },
                mean: { type: DataTypes.DOUBLE },
                fished_list: { type: DataTypes.TEXT },
                fished_list_frequency: {
                    type: DataTypes.TEXT,
                },
                times_fished: { type: DataTypes.INTEGER },
            },
            { freezeTableName: true },
        );
    }

    return db;
}

export function createCacheSchema(sequelize: Sequelize): CacheModels {
    const cache = {} as CacheModels;

    for (const list of lists) {
        cache[list.value] = sequelize.define<CacheModel>(
            `cache_${list.value}`,
            {
                name: { type: DataTypes.STRING },
                position: { type: DataTypes.INTEGER },
                filename: { type: DataTypes.STRING },
                points: { type: DataTypes.FLOAT },
            },
            { freezeTableName: true },
        );
    }

    return cache;
}
