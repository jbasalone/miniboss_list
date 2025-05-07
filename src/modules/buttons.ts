import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import { QueueKey } from '../types.js';

/**
 * Builds action row for miniboss queue with:
 * - Relist button (green)
 * - Send Miniboss Cmd button (blue)
 */
export function buildMinibossButtons(queueKey: QueueKey): ActionRowBuilder<ButtonBuilder> {
    const relistButton = new ButtonBuilder()
        .setCustomId(`mblist:relist:${queueKey}`)
        .setLabel("🔁 Relist Myself")
        .setStyle(ButtonStyle.Success);

    const commandButton = new ButtonBuilder()
        .setCustomId(`mblist:command:${queueKey}`)
        .setLabel("⚔️ Send Miniboss Cmd")
        .setStyle(ButtonStyle.Primary);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(relistButton, commandButton);
}