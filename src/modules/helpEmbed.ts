import { EmbedBuilder } from 'discord.js';

const GUILD_ID = '1135995107842195550'; // Replace with your real guild/server ID
const TT1_CHANNEL_ID = '1362225323525279744'; // Replace with #tt1-24-queue channel ID
const TT25_CHANNEL_ID = '1362225397323792574'; // Replace with #tt25plus-queue channel ID

export function buildHelpEmbed(): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle("📖 Miniboss Queue Help")
        .setDescription("Everything you need to know to participate in miniboss queues.")
        .setColor(0x00aaff)
        .addFields(
            {
                name: "🚶‍♂️ Join a Queue",
                value:
                    "Type your level in the appropriate queue channel:\n" +
                    `• [TT1–24 Queue](https://discord.com/channels/${GUILD_ID}/${TT1_CHANNEL_ID})\n` +
                    `• [TT25+ Queue](https://discord.com/channels/${GUILD_ID}/${TT25_CHANNEL_ID})`
            },
            {
                name: "❌ Leave the Queue",
                value: "`mbleave`\nRemoves you from any active queues."
            },
            {
                name: "🔁 Rejoin Last Queue",
                value: "`mbrelist`\nRe-adds you to your last used queue with your saved level."
            },
            {
                name: "📋 View All Queues",
                value: "`mblist`\nShows both queues and your current status."
            },
            {
                name: "⚔️ When 10 Players Join",
                value:
                    "• A private miniboss channel is created automatically.\n" +
                    "• Includes buttons to send the command and relist.\n" +
                    "• Channel auto-deletes after **10 minutes**."
            },
            {
                name: "⏳ Rules & Limits",
                value:
                    "• You can only join one list at a time.\n" +
                    "• 3-second cooldown to prevent spam.\n" +
                    "• Invalid messages are auto-deleted."
            }
        )
        .setFooter({ text: "Need help? Type mbhelp anytime." })
        .setTimestamp();
}