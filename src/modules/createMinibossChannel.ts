import {
    Client,
    Guild,
    PermissionFlagsBits,
    TextChannel,
    ChannelType,
    EmbedBuilder
} from 'discord.js';

const LOG_CHANNEL_ID = process.env.MINIBOSS_LOG_CHANNEL_ID!;

export async function createMinibossChannel(
  client: Client,
  guildId: string,
  parentCategoryId: string,
  memberIds: string[]
): Promise<TextChannel> {
    const guild: Guild = await client.guilds.fetch(guildId);
    const category = await client.channels.fetch(parentCategoryId);

    if (!category || category.type !== ChannelType.GuildCategory) {
        throw new Error('❌ Provided category ID is not a valid category channel');
    }

    const validMemberIds = memberIds.filter(id => /^\d{17,19}$/.test(id));
    const isSimulation = memberIds.some(id => id.startsWith('simUser') || id.startsWith('mockUser'));

    // ✅ Create the channel without permissionOverwrites to inherit from parent
    const channel = await guild.channels.create({
        name: `${isSimulation ? 'sim-' : ''}miniboss-${Date.now()}`,
        type: ChannelType.GuildText,
        parent: category.id,
        reason: isSimulation ? 'Simulated miniboss group' : 'Miniboss group ready'
    });


    for (const id of validMemberIds) {
        await channel.permissionOverwrites.edit(id, {
            ViewChannel: true,
            SendMessages: true
        });
    }

    const createdAt = new Date();

    // 📥 Log creation
    try {
        const logChannelRaw = await client.channels.fetch(LOG_CHANNEL_ID);
        if (logChannelRaw?.isTextBased()) {
            const logChannel = logChannelRaw as TextChannel;
            const embed = new EmbedBuilder()
              .setTitle('📥 Miniboss Channel Created')
              .addFields(
                { name: 'Channel', value: `<#${channel.id}>`, inline: true },
                { name: 'Created At', value: `<t:${Math.floor(createdAt.getTime() / 1000)}:F>`, inline: true },
                { name: 'Members', value: validMemberIds.map(id => `<@${id}>`).join(', ') || '*None*' }
              )
              .setColor(0x00b0f4)
              .setTimestamp(createdAt);

            await logChannel.send({ embeds: [embed] });
        }
    } catch (err) {
        console.warn('⚠️ Failed to send creation log:', err);
    }

    // 🕒 Auto-delete after 10 minutes and log it
    setTimeout(async () => {
        try {
            await channel.delete('🕒 Auto-deleted after 10 minutes');
            console.log(`🧹 Miniboss channel ${channel.name} deleted.`);

            const logChannelRaw = await client.channels.fetch(LOG_CHANNEL_ID);
            if (logChannelRaw?.isTextBased()) {
                const logChannel = logChannelRaw as TextChannel;
                const embed = new EmbedBuilder()
                  .setTitle('🗑️ Miniboss Channel Deleted')
                  .addFields(
                    { name: 'Channel Name', value: channel.name, inline: true },
                    { name: 'Deleted At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: 'Previous Members', value: validMemberIds.map(id => `<@${id}>`).join(', ') || '*None*' }
                  )
                  .setColor(0xff5555)
                  .setTimestamp();

                await logChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.warn(`⚠️ Failed to delete or log channel ${channel.name}:`, error);
        }
    }, 10 * 60 * 1000);

    return channel;
}