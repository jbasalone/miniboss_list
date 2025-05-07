import { Interaction, ButtonInteraction } from 'discord.js';
import { storage } from '../modules/storage.js';
import { queueManager } from '../modules/queueManager.js';
import { updateQueueEmbed } from '../modules/embedManager.js';
import { isValidQueueKey, QueueKey } from '../types.js';
import { createMinibossChannel } from '../modules/createMinibossChannel.js';
import { buildMinibossButtons } from '../modules/buttons.js';

export default async function interactionHandler(interaction: Interaction): Promise<void> {
    if (!interaction.isButton()) return;

    const button = interaction as ButtonInteraction;
    const [prefix, action, queueKeyRaw, _id] = button.customId.split(':');

    // 🔐 Ensure only mblist buttons are processed here
    if (prefix !== 'mblist') return;

    if (!isValidQueueKey(queueKeyRaw)) {
        await interaction.reply({
            content: "❌ Invalid queue key.",
            ephemeral: true
        });
        return;
    }

    const buttonQueueKey: QueueKey = queueKeyRaw;

    // 🚪 Leave Miniboss
    if (action === 'leave') {
        const queue = queueManager.getQueue(buttonQueueKey);
        const updated = queue.filter(u => u.userId !== interaction.user.id);

        if (updated.length === queue.length) {
            await interaction.reply({
                content: "❌ You are not in the miniboss list.",
                ephemeral: true
            });
            return;
        }

        queueManager.setQueue(buttonQueueKey, updated);
        storage.setQueueTimestamp(buttonQueueKey, Date.now());

        const channelId = buttonQueueKey === 'tt25Plus'
          ? process.env.TT25_PLUS_CHANNEL_ID!
          : process.env.TT1_TO_24_CHANNEL_ID!;
        const embedId = storage.getEmbedId(buttonQueueKey);

        await updateQueueEmbed(interaction.client, buttonQueueKey, channelId, embedId);
        await interaction.reply({
            content: "✅ You’ve been removed from the miniboss list.",
            ephemeral: true
        });
        return;
    }

    // ⚔️ Send Miniboss Cmd
    if (action === 'command') {
        const members = queueManager.getQueue(buttonQueueKey);
        if (!members || members.length === 0) {
            await interaction.reply({
                content: "❌ No one is in this miniboss group.",
                ephemeral: true
            });
            return;
        }

        const mentions = members.map(u => `<@${u.userId}>`).join(" ");
        const command = `<@555955826880413696> miniboss ${mentions}`;

        await interaction.reply({
            content: `\`${command}\``,
            ephemeral: true
        });
        return;
    }

    // 🔁 Relist Myself
    if (action === 'relist') {
        const userId = interaction.user.id;
        const level = storage.getLevel(userId);
        const originalKey = storage.getOriginalQueue(userId) ?? buttonQueueKey;

        if (!level) {
            await interaction.reply({
                content: "❌ You don't have a saved level. Please rejoin manually by typing your level.",
                ephemeral: true
            });
            return;
        }

        // Remove from opposite list to prevent duplicates
        const otherKey = originalKey === 'tt25Plus' ? 'tt1to24' : 'tt25Plus';
        queueManager.removeUserFromQueue(otherKey, userId);
        const list = queueManager.addUserToQueue(originalKey, userId, level);
        storage.setQueueTimestamp(originalKey, Date.now());

        const embedId = storage.getEmbedId(originalKey);
        const channelId = originalKey === 'tt25Plus'
          ? process.env.TT25_PLUS_CHANNEL_ID!
          : process.env.TT1_TO_24_CHANNEL_ID!;

        await updateQueueEmbed(interaction.client, originalKey, channelId, embedId);

        // ✅ Respond to user
        await interaction.reply({
            content: `✅ You've been re-added to the \`${originalKey}\` list as LVL ${level}.`,
            ephemeral: true
        });

        // ✅ If queue just filled to 10, create a new channel
        if (list.length === 10) {
            const ids = list.map(u => u.userId);
            const newChannel = await createMinibossChannel(interaction.client, interaction.guildId!, process.env.OUTPUT_CHANNEL_ID!, ids);
            storage.saveHistory(newChannel.id, ids);

            await newChannel.send({
                content: `⚔️ **Miniboss Ready!** ⚔️\n<@${userId}>, use the command below:`,
                components: [buildMinibossButtons(originalKey)],
            });

            await newChannel.send(`🏆 **Winners:** ${ids.map(id => `<@${id}>`).join(', ')}`);

            queueManager.resetQueue(originalKey);
            storage.setQueueTimestamp(originalKey, 0);
            await updateQueueEmbed(interaction.client, originalKey, channelId, embedId);
        }

        return;
    }

    // 🚨 Unknown action fallback
    await interaction.reply({
        content: "❌ Unknown action for miniboss button.",
        ephemeral: true
    });
}