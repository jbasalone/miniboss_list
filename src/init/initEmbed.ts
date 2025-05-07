import { Client } from 'discord.js';
import { updateQueueEmbed } from '../modules/embedManager.js';
import { storage } from '../modules/storage.js';

export async function ensureQueueEmbeds(client: Client): Promise<void> {
    const mappings = [
        {
            key: 'tt1to24' as const,
            channelId: process.env.TT1_TO_24_CHANNEL_ID!,
        },
        {
            key: 'tt25Plus' as const,
            channelId: process.env.TT25_PLUS_CHANNEL_ID!,
        }
    ];

    for (const { key, channelId } of mappings) {
        const existingId = storage.getEmbedId(key);

        // Try to update or create the embed
        const finalId = await updateQueueEmbed(client, key, channelId, existingId || '');
        if (finalId !== existingId) {
            storage.setEmbedId(key, finalId);
            console.log(`📌 Initialized ${key} embed → ${finalId}`);
        }
    }
}