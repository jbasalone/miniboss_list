import { storage } from './modules/storage.js';
import { queueManager} from './modules/queueManager.js';
import { UserEntry, QueueKey } from './types.js';


// Simulate adding users and triggering thread
const simulateJoin = (userId: string, inputLevel: number): string | null => {
    const ttLevel = storage.getLevel(userId);
    const queueKey = ttLevel && ttLevel >= 25 ? 'tt25Plus' : 'tt1to24';
    const result: UserEntry[] = queueManager.addUserToQueue(queueKey, userId, inputLevel);

    const position = result.findIndex((u: UserEntry) => u.userId === userId) + 1;
    console.log(`✅ ${userId} joined ${queueKey} with level ${inputLevel} (Position #${position})`);

    if (result.length === 10) {
        const threadId = `thread-${Date.now()}`;
        const ids = result.map((x: UserEntry) => x.userId);
        storage.saveHistory(threadId, ids);
        queueManager.resetQueue(queueKey);
        console.log(`⚠️ ${queueKey} reached 10! Creating thread...`);
        console.log(`🧵 Thread ${threadId} created with members: ${ids.join(", ")}`);
        return threadId;
    }

    return null;
};

// Set user TT levels and trigger full list
for (let i = 1; i <= 10; i++) {
    const userId = `user${i}`;
    storage.setLevel(userId, 30); // All TT25+
    simulateJoin(userId, 1000 - i * 3);
}

// Simulate button click response
const recentThreadId = Object.keys(storage.getHistory)[0];
if (recentThreadId) {
    const members = storage.getHistory(recentThreadId);
    const command = `@EpicRPG miniboss ${members.map((x: string) => `<@${x}>`).join(" ")}`;
    console.log("\n🔘 Simulated Desktop Button Output:");
    console.log("```");
    console.log(command);
    console.log("```");

    console.log("\n📱 Simulated Mobile Button Output:");
    console.log(command);
} else {
    console.log("❌ No thread was created.");
}