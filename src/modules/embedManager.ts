import {
    EmbedBuilder,
    TextChannel,
    Client,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import { queueManager } from './queueManager.js';
import { UserEntry, QueueKey } from '../types.js';

const EMBED_TITLES: Record<QueueKey, string> = {
    tt1to24: '⏳ Miniboss Queue — TT1–24',
    tt25Plus: '⚡ Miniboss Queue — TT25+'
};

export async function updateQueueEmbed(
    client: Client,
    queueKey: QueueKey,
    channelId: string,
    embedMessageId: string
): Promise<string> {
    const queue: UserEntry[] = queueManager.getQueue(queueKey);
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return embedMessageId;

    const userLines = queue.map((entry, i) => {
        const joined = entry.joinedAt
            ? ` *(<t:${Math.floor(entry.joinedAt / 1000)}:R>)*`
            : '';
        return `**${i + 1}.** <@${entry.userId}> — **LVL ${entry.level}**${joined}`;
    }).join('\n');

    const embed = new EmbedBuilder()
        .setTitle(EMBED_TITLES[queueKey])
        .setColor(queueKey === 'tt25Plus' ? 0xffcc00 : 0x00ccff)
        .setDescription([
            `📑 **Tip:** Use \`mblist\` to view both queues across the server. also: \`mbhelp\``,
            `━━━━━━━━━━━━━━━━━━`,
            queue.length ? userLines : '*No one in queue yet. Type and send your level to join*'
        ].join('\n'))
        .setFooter({
            text: `💠 Spots Remaining: ${10 - queue.length}`
        })
        .setTimestamp(new Date());

    const leaveButton = new ButtonBuilder()
        .setCustomId(`mblist:leave:${queueKey}:${Date.now()}`)
        .setLabel("🚪 Leave Queue")
        .setStyle(ButtonStyle.Danger);

    const components = [new ActionRowBuilder<ButtonBuilder>().addComponents(leaveButton)];
    const textChannel = channel as TextChannel;

    try {
        const embedMsg = await textChannel.messages.fetch(embedMessageId);
        await embedMsg.edit({ embeds: [embed], components });
        return embedMessageId;
    } catch {
        const pinned = await textChannel.messages.fetchPinned();
        const botPins = pinned.filter(m => m.author.id === client.user?.id);

        for (const msg of botPins.values()) {
            try {
                await msg.unpin();
            } catch {
                console.warn(`⚠️ Could not unpin message ${msg.id}`);
            }
        }

        const newMsg = await textChannel.send({ embeds: [embed], components });
        await newMsg.pin().catch(() => console.warn(`⚠️ Could not pin message ${newMsg.id}`));
        console.log(`📌 Created and pinned new ${queueKey} embed: ${newMsg.id}`);
        return newMsg.id;
    }
}