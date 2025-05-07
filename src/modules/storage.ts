import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { UserEntry, QueueKey } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));



type DBData = {
    levels: Record<string, number>;
    queues: Record<string, UserEntry[]>;
    history: Record<string, string[]>;
    embedIds: Record<'tt1to24' | 'tt25Plus', string>;
    timestamps: Record<'tt1to24' | 'tt25Plus', number>;
    originalQueues: Record<string, QueueKey>;
};

let db: Low<DBData>;

export async function initStorage() {
    const adapter = new JSONFile<DBData>(join(__dirname, '../../db/users.json'));
    db = new Low<DBData>(adapter);
    await db.read();

    if (!db.data) {
        db.data = {
            levels: {},
            queues: {},
            history: {},
            embedIds: { tt1to24: '', tt25Plus: '' },
            timestamps: { tt1to24: 0, tt25Plus: 0 },
            originalQueues: {}
        };
    }

    db.data.originalQueues ||= {};

    db.data.levels ||= {};
    db.data.queues ||= {};
    db.data.history ||= {};
    db.data.embedIds ||= { tt1to24: '', tt25Plus: '' };
    db.data.timestamps ||= { tt1to24: 0, tt25Plus: 0 };

    await db.write();
}

export const storage = {
    getLevel(id: string): number | null {
        return db.data!.levels[id] ?? null;
    },

    setLevel(id: string, level: number): void {
        db.data!.levels[id] = level;
        db.write();
    },

    getQueue(key: string): UserEntry[] {
        return db.data!.queues[key] || [];
    },

    setQueue(key: string, list: UserEntry[]): void {
        db.data!.queues[key] = list;
        db.write();
    },

    resetQueue(key: string): void {
        db.data!.queues[key] = [];
        db.write();
    },

    saveHistory(id: string, members: string[]): void {
        db.data!.history[id] = members;
        db.write();
    },

    getHistory(id: string): string[] {
        return db.data!.history[id] || [];
    },

    getEmbedId(queueKey: 'tt1to24' | 'tt25Plus'): string {
        return db.data!.embedIds[queueKey];
    },

    setEmbedId(queueKey: 'tt1to24' | 'tt25Plus', messageId: string): void {
        db.data!.embedIds[queueKey] = messageId;
        db.write();
    },

    getQueueTimestamp(queueKey: 'tt1to24' | 'tt25Plus'): number {
        return db.data!.timestamps[queueKey] || 0;
    },

    setQueueTimestamp(queueKey: 'tt1to24' | 'tt25Plus', timestamp: number): void {
        db.data!.timestamps[queueKey] = timestamp;
        db.write();
    },
    setOriginalQueue(userId: string, queueKey: QueueKey): void {
        db.data!.originalQueues[userId] = queueKey;
        db.write();
    },

    getOriginalQueue(userId: string): QueueKey | undefined {
        return db.data!.originalQueues[userId];
    },
};