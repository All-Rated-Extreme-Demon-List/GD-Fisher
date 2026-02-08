import {
    AttachmentBuilder,
    AutocompleteInteraction,
    ChatInputCommandInteraction,
} from 'discord.js';
import lists, { AvailableListValue } from './lists';
import { useDatabase } from './app/plugins/sequelize/hooks';
import { existsSync } from 'node:fs';
import { Logger } from 'commandkit';

export const getList = async (
    data:
        | ChatInputCommandInteraction
        | AutocompleteInteraction
        | AvailableListValue,
) => {
    const { db } = useDatabase();
    const listValue =
        typeof data === 'string'
            ? data
            : (data.options.getString('list') ??
              (data.user
                  ? await db.user_settings
                        .findOne({ where: { user: data?.user?.id } })
                        .then((data) => data?.getDataValue('default_list'))
                  : null) ??
              (data.guild
                  ? await db.guild_settings
                        .findOne({ where: { guild: data?.guild?.id } })
                        .then((data) => data?.getDataValue('default_list'))
                  : null) ??
              'aredl');

    const list = lists.find((l) => l.value === listValue);
    if (!list) {
        throw new Error('Invalid list value');
    }
    return list;
};

export const getListIconsAttachments = (): Partial<
    Record<AvailableListValue, AttachmentBuilder>
> => {
    const attachments: Partial<Record<AvailableListValue, AttachmentBuilder>> =
        {};

    for (const listItem of lists) {
        const logoPath = `assets/list-icons/${listItem.value}.webp`;
        if (!existsSync(logoPath)) continue;

        try {
            attachments[listItem.value] = new AttachmentBuilder(logoPath, {
                name: 'listlogo.webp',
            });
        } catch (error) {
            Logger.error(
                `Could not attach file for ${listItem.value}: ${String(error)}`,
            );
        }
    }

    return attachments;
};
