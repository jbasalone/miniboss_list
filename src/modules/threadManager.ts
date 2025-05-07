import { Client, TextChannel, Guild } from 'discord.js';

export async function createMinibossThread(
    client: Client,
    guildId: string,
    channelId: string,
    members: string[]
): Promise<any> {
    const guild: Guild = await client.guilds.fetch(guildId);
    const baseChannel = await client.channels.fetch(channelId);

    if (!baseChannel?.isTextBased()) {
        throw new Error("❌ Output channel is not a valid text channel");
    }

    const thread = await (baseChannel as TextChannel).threads.create({
        name: `Miniboss Squad ${Date.now()}`,
        autoArchiveDuration: 60,
    });

    for (const id of members) {
        try {
            const member = await guild.members.fetch(id);
            await thread.members.add(member);
        } catch {
            console.warn(`⚠️ Could not add member ${id} to thread`);
        }
    }

    // 🕒 Auto-close thread after 15 minutes (900,000ms)
    setTimeout(async () => {
        if (!thread.archived) {
            await thread.setArchived(true, 'Auto-archived after 15 minutes');
            console.log(`🧹 Thread ${thread.name} archived.`);
        }
    }, 15 * 60 * 1000);

    return thread;
}