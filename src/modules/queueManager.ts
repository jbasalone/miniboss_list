import { storage } from './storage.js';
import { UserEntry, QueueKey } from '../types.js';


export const queueManager = {
    addUserToQueue(queueKey: string, userId: string, level: number): UserEntry[] {
        let queue = storage.getQueue(queueKey).filter(u => u.userId !== userId);
        queue.push({ userId, level, joinedAt: Date.now() });
        queue.sort((a, b) => b.level - a.level);
        queue = queue.slice(0, 10);
        storage.setQueue(queueKey, queue);
        storage.setLevel(userId, level); // persist for relist
        return queue;
    },

    getQueue(queueKey: string) {
        return storage.getQueue(queueKey);
    },

    setQueue(queueKey: string, list: UserEntry[]) {
        storage.setQueue(queueKey, list);
    },

    resetQueue(queueKey: string) {
        storage.resetQueue(queueKey);
    },

    removeUserFromQueue(queueKey: string, userId: string): boolean {
        const queue = storage.getQueue(queueKey);
        const filtered = queue.filter(u => u.userId !== userId);
        const removed = filtered.length !== queue.length;
        if (removed) storage.setQueue(queueKey, filtered);
        return removed;
    }
};