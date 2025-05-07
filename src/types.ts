// src/types.ts

// Valid queue identifiers
export type QueueKey = 'tt1to24' | 'tt25Plus';

export function isValidQueueKey(key: string): key is QueueKey {
    return key === 'tt1to24' || key === 'tt25Plus';
}

// User entry in a queue, with optional timestamp for when they joined
export interface UserEntry {
    userId: string;
    level: number;
    joinedAt?: number;
}