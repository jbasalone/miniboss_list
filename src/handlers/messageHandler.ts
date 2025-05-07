import { Message, Client, TextChannel, EmbedBuilder } from 'discord.js';
import { storage } from '../modules/storage.js';
import { queueManager } from '../modules/queueManager.js';
import { createMinibossChannel } from '../modules/createMinibossChannel.js';
import { buildMinibossButtons } from '../modules/buttons.js';
import { updateQueueEmbed } from '../modules/embedManager.js';
import { buildHelpEmbed } from '../modules/helpEmbed.js';

const outputChannelId = process.env.OUTPUT_CHANNEL_ID!;
const guildId = process.env.GUILD_ID!;
const tt1to24ChannelId = process.env.TT1_TO_24_CHANNEL_ID!;
const tt25PlusChannelId = process.env.TT25_PLUS_CHANNEL_ID!;
const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 3000;
const DEV_ID = '936693149114449921';

export default async function messageHandler(msg: Message, client: Client) {
    if (msg.author.bot) return;

    const isDev = msg.author.id === DEV_ID;
    const lower = msg.content.toLowerCase();
    const channelId = msg.channel.id;
    const isTT25 = channelId === tt25PlusChannelId;
    const isTT1to24 = channelId === tt1to24ChannelId;
    const queueKey = isTT25 ? 'tt25Plus' : 'tt1to24';
    const otherKey = isTT25 ? 'tt1to24' : 'tt25Plus';
    const embedId = storage.getEmbedId(queueKey);

    if (['!simulate10', '!mockqueue', '!clearqueue'].includes(lower) && !isDev) return;

    if (lower === '!mockqueue') {
        const fakeUsers = Array.from({ length: 10 }, (_, i) => ({
            userId: `mockUser${i + 1}`,
            level: Math.floor(Math.random() * 20) + 5
        }));
        queueManager.setQueue(queueKey, fakeUsers);
        storage.setQueueTimestamp(queueKey, Date.now());
        await updateQueueEmbed(client, queueKey, channelId, embedId);
        await msg.reply(`✅ Injected mock users to \`${queueKey}\``).then(m => setTimeout(() => m.delete(), 5000));
        return;
    }

    if (lower === '!clearqueue') {
        queueManager.resetQueue(queueKey);
        storage.setQueueTimestamp(queueKey, 0);
        await updateQueueEmbed(client, queueKey, channelId, embedId);
        await msg.reply(`🧹 Cleared \`${queueKey}\` queue.`).then(m => setTimeout(() => m.delete(), 5000));
        return;
    }

    if (lower === '!simulate10') {
        const fakeUsers = Array.from({ length: 10 }, (_, i) => ({
            userId: `simUser${i + 1}`,
            level: 100 + i
        }));
        queueManager.setQueue(queueKey, fakeUsers);
        storage.setQueueTimestamp(queueKey, Date.now());
        await updateQueueEmbed(client, queueKey, channelId, embedId);
        const ids = fakeUsers.map(u => u.userId);
        const channel = await createMinibossChannel(client, guildId, outputChannelId, ids);
        storage.saveHistory(channel.id, ids);
        await channel.send({
            content: `⚔️ **Simulated Miniboss Ready!** ⚔️`,
            components: [buildMinibossButtons(queueKey)],
        });
        await channel.send(`🏆 **Simulated Winners:** ${ids.map(id => `<@${id}>`).join(', ')}`);
        return;
    }

    if (lower === 'mblist') {
        const q1 = queueManager.getQueue('tt1to24');
        const q2 = queueManager.getQueue('tt25Plus');

        const embed = new EmbedBuilder()
            .setTitle("📋 Miniboss Queues")
            .setDescription(
                `• [Jump to TT1–24 Queue](https://discord.com/channels/${guildId}/${tt1to24ChannelId})\n` +
                `• [Jump to TT25+ Queue](https://discord.com/channels/${guildId}/${tt25PlusChannelId})`
            )
            .addFields(
                {
                    name: "⏳ TT1–24",
                    value: q1.length
                        ? q1.map((u, i) => `**${i + 1}.** <@${u.userId}> – LVL ${u.level}`).join("\n")
                        : "*Empty*"
                },
                {
                    name: "⚡ TT25+",
                    value: q2.length
                        ? q2.map((u, i) => `**${i + 1}.** <@${u.userId}> – LVL ${u.level}`).join("\n")
                        : "*Empty*"
                }
            )
            .setFooter({ text: "Use !mbleave to leave your queue." })
            .setColor(0x00aaff);

        await msg.reply({ embeds: [embed] });
        return;
    }

    if (lower === 'mbhelp') {
        const helpEmbed = buildHelpEmbed();
        await msg.reply({ embeds: [helpEmbed] });
        return;
    }

    if (lower === 'mbrelist') {
        const userId = msg.author.id;
        const level = storage.getLevel(userId);
        const originalQueue = storage.getOriginalQueue(userId);

        if (!level || !originalQueue) {
            await msg.reply('❌ You don’t have a saved queue or level. Join manually by typing your level.')
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
            await msg.delete().catch(() => {});
            return;
        }

        // Remove from other queue if needed
        const otherKey = originalQueue === 'tt25Plus' ? 'tt1to24' : 'tt25Plus';
        const removed = queueManager.removeUserFromQueue(otherKey, userId);
        if (removed) {
            const otherEmbedId = storage.getEmbedId(otherKey);
            const otherChannelId = otherKey === 'tt25Plus' ? tt25PlusChannelId : tt1to24ChannelId;
            await updateQueueEmbed(client, otherKey, otherChannelId, otherEmbedId);
        }

        // Add back to original queue
        const embedId = storage.getEmbedId(originalQueue);
        const channelId = originalQueue === 'tt25Plus' ? tt25PlusChannelId : tt1to24ChannelId;
        const list = queueManager.addUserToQueue(originalQueue, userId, level);
        storage.setQueueTimestamp(originalQueue, Date.now());
        await updateQueueEmbed(client, originalQueue, channelId, embedId);

        const position = list.findIndex(u => u.userId === userId) + 1;
        await msg.reply(`✅ You’ve been re-added to \`${originalQueue}\` as LVL ${level}. You’re now #${position}.`)
            .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        await msg.delete().catch(() => {});
        return;
    }

    if (lower === '!rebuild') {
        const newId = await updateQueueEmbed(client, queueKey, channelId, '');
        storage.setEmbedId(queueKey, newId);
        await msg.reply('🔄 Embed refreshed.').then(m => setTimeout(() => m.delete(), 5000));
        return;
    }

    if (lower === 'mbleave') {
        const userId = msg.author.id;
        const leftQueues: string[] = [];

        // Try to remove from both queues
        if (queueManager.removeUserFromQueue('tt1to24', userId)) {
            await updateQueueEmbed(client, 'tt1to24', tt1to24ChannelId, storage.getEmbedId('tt1to24'));
            leftQueues.push('TT1–24');
        }

        if (queueManager.removeUserFromQueue('tt25Plus', userId)) {
            await updateQueueEmbed(client, 'tt25Plus', tt25PlusChannelId, storage.getEmbedId('tt25Plus'));
            leftQueues.push('TT25+');
        }

        if (leftQueues.length === 0) {
            await msg.reply('❌ You are not in any miniboss queue.').then(m => setTimeout(() => m.delete(), 5000));
        } else {
            await msg.reply(`✅ You’ve been removed from: ${leftQueues.join(', ')}`).then(m => setTimeout(() => m.delete(), 5000));
        }

        await msg.delete().catch(() => {});
        return;
    }

    if (!isTT25 && !isTT1to24) return;


    const level = parseInt(msg.content.trim());
    const now = Date.now();
    const lastJoin = cooldowns.get(msg.author.id) ?? 0;

    if (isNaN(level)) {
        await msg.delete().catch(() => {});
        return;
    }

    if (now - lastJoin < COOLDOWN_MS) {
        await msg.reply('⏳ Please wait before joining again.')
            .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
        await msg.delete().catch(() => {});
        return;
    }

    cooldowns.set(msg.author.id, now);

    const userId = msg.author.id;
    const removedFromOther = queueManager.removeUserFromQueue(otherKey, userId);
    if (removedFromOther) {
        const otherEmbedId = storage.getEmbedId(otherKey);
        const otherChannelId = otherKey === 'tt25Plus' ? tt25PlusChannelId : tt1to24ChannelId;
        await updateQueueEmbed(client, otherKey, otherChannelId, otherEmbedId);
    }
    const list = queueManager.addUserToQueue(queueKey, userId, level);
    storage.setOriginalQueue(userId, queueKey);
    const position = list.findIndex(u => u.userId === userId) + 1;

    await (msg.channel as TextChannel).send(
        `✅ <@${userId}> Level ${level} accepted. You're now #${position}` +
        (removedFromOther ? `\n⚠️ You were removed from the other queue.` : '')
    ).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));

    await msg.delete().catch(() => {});
    await updateQueueEmbed(client, queueKey, msg.channel.id, embedId);
    storage.setQueueTimestamp(queueKey, Date.now());

    if (list.length === 10) {
        const ids = list.map(u => u.userId);
        const channel = await createMinibossChannel(client, guildId, outputChannelId, ids);
        storage.saveHistory(channel.id, ids);
        await channel.send({
            content: `⚔️ **Miniboss Ready!** ⚔️\n<@${userId}>, use the command below:`,
            components: [buildMinibossButtons(queueKey)],
        });
        await channel.send(`🏆 **Winners:** ${ids.map(x => `<@${x}>`).join(", ")}`);
        queueManager.resetQueue(queueKey);
        storage.setQueueTimestamp(queueKey, 0);
        await updateQueueEmbed(client, queueKey, msg.channel.id, embedId);
    }
}