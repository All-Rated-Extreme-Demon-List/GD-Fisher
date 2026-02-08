import { AvailableList } from '#src/lists';
import { Logger } from 'commandkit';
import { ChatInputCommandInteraction } from 'discord.js';
import { useDatabase } from '#src/app/plugins/sequelize/hooks';

export const fish = async (
    interaction: ChatInputCommandInteraction,
    list: AvailableList,
) => {
    const { db, cache } = useDatabase();

    await interaction.deferReply();

    const id = interaction.user.id;
    const name = interaction.user.tag;

    let levels;
    try {
        levels = await cache[list.value].findAll({
            order: [['position', 'ASC']],
        });
    } catch (error) {
        Logger.error(`Error fetching levels: ${error}`);
        return await interaction.editReply(
            ':x: An error occurred while fetching the levels',
        );
    }

    if (!levels || levels.length === 0) {
        return await interaction.editReply(':x: No levels available');
    }

    const level_count = Math.min(levels.length, list.cutoff ?? levels.length);
    const fished_pos = Math.floor(Math.random() * level_count);

    const {
        name: fished_level_name,
        filename: fished_level_file,
        points: fished_score,
    } = levels[fished_pos]!?.dataValues;

    const userID = interaction.options.getUser('for')?.id ?? id;
    const userdata = await db[list.value].findOne({ where: { user: userID } });
    let totalAmount;

    if (!userdata) {
        await db[list.value].create({
            user: userID,
            amount: fished_score,
            mean: fished_score,
            fished_list: `["${fished_level_file}"]`,
            fished_list_frequency: '[1]',
            times_fished: 1,
        });
        totalAmount = fished_score;
    } else {
        const { amount, times_fished, fished_list, fished_list_frequency } =
            userdata.dataValues;
        totalAmount = amount + fished_score;
        const newTimesFished = times_fished + 1;
        const meanScore = totalAmount / newTimesFished;

        let fishedListData, fishedListFrequencyData;
        try {
            fishedListData = fished_list ? JSON.parse(fished_list) : [];
            fishedListFrequencyData = fished_list_frequency
                ? JSON.parse(fished_list_frequency)
                : [];
        } catch (error) {
            Logger.error(error);
            return await interaction.editReply(
                ':x: An error occurred while getting the fished list data.',
            );
        }

        const fishedIndex = fishedListData.indexOf(fished_level_file);
        if (fishedIndex === -1) {
            fishedListData.push(fished_level_file);
            fishedListFrequencyData.push(1);
        } else {
            fishedListFrequencyData[fishedIndex] += 1;
        }

        let fishedList, fishedListFrequency;
        try {
            fishedList = JSON.stringify(fishedListData);
            fishedListFrequency = JSON.stringify(fishedListFrequencyData);
        } catch (error) {
            Logger.error(error);
            return await interaction.editReply(
                ':x: An error occurred while saving the fished list data.',
            );
        }

        try {
            await db[list.value].update(
                {
                    amount: totalAmount,
                    mean: meanScore,
                    fished_list: fishedList,
                    fished_list_frequency: fishedListFrequency,
                    times_fished: newTimesFished,
                },
                {
                    where: { user: userID },
                },
            );
        } catch (error) {
            Logger.error(error);
            return await interaction.editReply(
                ':x: An error occurred while updating the user data.',
            );
        }
    }

    return await interaction.editReply(
        `> **${list.name}**\n> **${name}** fished **${fished_level_name}** (TOP ${fished_pos + 1})${userID != id ? ` for <@${userID}>` : ''}\n> +${Math.round(fished_score * 100) / 100} points (Total: ${Math.round(totalAmount * 100) / 100} points)`,
    );
};
