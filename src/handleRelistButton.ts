import { ButtonInteraction, TextChannel } from 'discord.js';
import { queueManager } from './modules/queueManager.js';
import { storage } from './modules/storage.js';
import { updateQueueEmbed } from './modules/embedManager.js';
import { buildMinibossButtons } from './modules/buttons.js';
import { createMinibossChannel } from './modules/createMinibossChannel.js';

const outputChannelId = process.env.OUTPUT_CHANNEL_ID!;
const guildId = process.env.GUILD_ID!;
const tt1to24ChannelId = process.env.TT1_TO_24_CHANNEL_ID!;
const tt25PlusChannelId = process.env.TT25_PLUS_CHANNEL_ID!;

export async function handleRelistButton(interaction: ButtonInteraction, queueKey: 'tt1to24' | 'tt25Plus') {
    const userId = interaction.user.id;
    const level = storage.getLevel(userId);

    if (!level) {
        await interaction.reply({ content: '❌ You must send your level before using relist.', ephemeral: true });
        return;
    }

    const otherKey = queueKey === 'tt25Plus' ? 'tt1to24' : 'tt25Plus';
    const wasInOther = queueManager.removeUserFromQueue(otherKey, userId);
    if (wasInOther) {
        const otherEmbedId = storage.getEmbedId(otherKey);
        const otherChannelId = otherKey === 'tt25Plus' ? tt25PlusChannelId : tt1to24ChannelId;
        await updateQueueEmbed(interaction.client, otherKey, otherChannelId, otherEmbedId);
    }

    const list = queueManager.addUserToQueue(queueKey, userId, level);
    storage.setOriginalQueue(userId, queueKey);
    storage.setQueueTimestamp(queueKey, Date.now());

    const embedId = storage.getEmbedId(queueKey);
    const channelId = queueKey === 'tt25Plus' ? tt25PlusChannelId : tt1to24ChannelId;
    await updateQueueEmbed(interaction.client, queueKey, channelId, embedId);

    await interaction.reply({
        content: `✅ You’ve been re-added to the ${queueKey === 'tt25Plus' ? 'TT25+' : 'TT1–24'} queue as LVL ${level}.`,
        ephemeral: true
    });

    // 🔥 Check for full queue and create miniboss channel
    if (list.length === 10) {
        const ids = list.map(u => u.userId);
        const channel = await createMinibossChannel(interaction.client, guildId, outputChannelId, ids);
        storage.saveHistory(channel.id, ids);
        await channel.send({
            content: `⚔️ **Miniboss Ready!** ⚔️\n<@${userId}>, use the command below:`,
            components: [buildMinibossButtons(queueKey)],
        });
        await channel.send(`🏆 **Winners:** ${ids.map(id => `<@${id}>`).join(', ')}`);
        queueManager.resetQueue(queueKey);
        storage.setQueueTimestamp(queueKey, 0);
        await updateQueueEmbed(interaction.client, queueKey, channelId, embedId);
    }
}