import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Message, Interaction } from 'discord.js';
import { initStorage, storage } from './modules/storage.js';
import { queueManager } from './modules/queueManager.js';
import messageHandler from './handlers/messageHandler.js';
import interactionHandler from './handlers/interactionHandler.js';
import { ensureQueueEmbeds } from './init/initEmbed.js';
import { updateQueueEmbed } from './modules/embedManager.js';

const token = process.env.DISCORD_TOKEN!;
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

client.once('ready', () => {
    console.log(`🟢 Logged in as ${client.user?.tag}`);
});

client.on('messageCreate', async (msg: Message) => {
    try {
        await messageHandler(msg, client);
    } catch (err) {
        console.error('❌ Message handler error:', err);
    }
});

client.on('interactionCreate', async (interaction: Interaction) => {
    try {
        await interactionHandler(interaction);
    } catch (err) {
        console.error('❌ Interaction handler error:', err);
    }
});

(async () => {
    await initStorage();
    await client.login(token);
    await ensureQueueEmbeds(client); // 📌 Create embeds if missing
})();

// ⏳ Queue expiration: reset and DM users after 1 hour
setInterval(async () => {
    const now = Date.now();

    for (const queueKey of ['tt1to24', 'tt25Plus'] as const) {
        const queue = queueManager.getQueue(queueKey);
        const lastJoin = storage.getQueueTimestamp(queueKey);
        const timeoutMs = 60 * 60 * 1000;

        if (queue.length > 0 && now - lastJoin > timeoutMs) {
            for (const u of queue) {
                try {
                    const user = await client.users.fetch(u.userId);
                    await user.send("⚠️ You were removed from the miniboss list due to 1 hour of inactivity.");
                } catch {
                    console.warn(`⚠️ Couldn't DM user ${u.userId}`);
                }
            }

            queueManager.resetQueue(queueKey);
            storage.setQueueTimestamp(queueKey, 0);

            // ✅ Embed refresh after reset
            const channelId = queueKey === 'tt25Plus'
                ? process.env.TT25_PLUS_CHANNEL_ID!
                : process.env.TT1_TO_24_CHANNEL_ID!;
            const embedId = storage.getEmbedId(queueKey);
            await updateQueueEmbed(client, queueKey, channelId, embedId);

            console.log(`⏳ Queue "${queueKey}" expired and reset.`);
        }
    }
}, 5 * 60 * 1000);