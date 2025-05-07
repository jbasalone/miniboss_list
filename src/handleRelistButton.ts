import { ButtonInteraction, TextChannel } from 'discord.js';
import { queueManager } from './modules/queueManager.js';
import { storage } from './modules/storage.js';
import { updateQueueEmbed } from './modules/embedManager.js';

export async function handleRelistButton(interaction: ButtonInteraction, queueKey: 'tt1to24' | 'tt25Plus') {
    const userId = interaction.user.id;
    const level = storage.getLevel(userId);

    if (!level) {
        await interaction.reply({ content: '❌ You must send your level before using relist.', ephemeral: true });
        return;
    }

    const existing = queueManager.getQueue(queueKey);
    if (existing.some(u => u.userId === userId)) {
        await interaction.reply({ content: '⚠️ You are already in the queue.', ephemeral: true });
        return;
    }

    queueManager.addUserToQueue(queueKey, userId, level);
    const embedId = storage.getEmbedId(queueKey);
    const channelId = queueKey === 'tt25Plus'
        ? process.env.TT25_PLUS_CHANNEL_ID!
        : process.env.TT1_TO_24_CHANNEL_ID!;

    const channel = await interaction.client.channels.fetch(channelId);
    if (channel?.isTextBased()) {
        await updateQueueEmbed(interaction.client, queueKey, channelId, embedId);
    }

    await interaction.reply({
        content: `✅ You have been re-added to the ${queueKey === 'tt25Plus' ? 'TT25+' : 'TT1–24'} queue.`,
        ephemeral: true
    });
}