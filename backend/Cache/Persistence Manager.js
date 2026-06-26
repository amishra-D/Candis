const fs = require('fs');
const path = require('path');
const readline = require('readline');
const CacheEntry = require('./CacheEntry');

function getPersistencePath(nodeId, suffix) {
    const dir = process.env.PERSISTENCE_DIR || path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, `${nodeId}${suffix}`);
}

class PersistenceManager {
    constructor(nodeId) {
        this.nodeId = nodeId;

        this.logStream = fs.createWriteStream(
            getPersistencePath(this.nodeId, '.wal'),
            { flags: 'a' }
        );
    }
    logPut(key, value, ttl = null) {
        const entry = {
            op: "PUT",
            key,
            value,
            ttl,
            timestamp: Date.now()
        };

        this.logStream.write(JSON.stringify(entry) + '\n');
    }

    logDelete(key) {
        const entry = {
            op: "DELETE",
            key,
            timestamp: Date.now()
        };

        this.logStream.write(JSON.stringify(entry) + '\n');
    }

    truncateLog() {
        this.logStream.end();

        fs.truncateSync(getPersistencePath(this.nodeId, '.wal'), 0);

        this.logStream = fs.createWriteStream(
            getPersistencePath(this.nodeId, '.wal'),
            { flags: 'a' }
        );

        console.log("WAL truncated");
    }

    takeSnapshot(cache) {
        const snapshot = Object.fromEntries(cache);

        fs.writeFileSync(
            getPersistencePath(this.nodeId, '-snapshot.json'),
            JSON.stringify(snapshot, null, 2)
        );
        console.log("Snapshot saved");
    }
    async recover(cacheNode) {
    const storage = cacheNode.storage;
    const snapshotFile = getPersistencePath(this.nodeId, '-snapshot.json');

    if (fs.existsSync(snapshotFile)) {
        const snapshot = JSON.parse(
            fs.readFileSync(snapshotFile, 'utf8')
        );

        for (const [key, value] of Object.entries(snapshot)) {
            const entry = Object.assign(new CacheEntry(), value);
            if (entry.expiryTime <= Date.now()) {
                continue;
            }
            storage.set(key, entry);

            if (entry.expiryTime !== Infinity) {
                const remainingTtl = entry.expiryTime - Date.now();
                cacheNode.expirymanager.addExpiry(key, remainingTtl);
            }
            cacheNode.evictionmanager.addKey(key);
        }

        console.log(`[RECOVERY] Snapshot loaded.`);
    }
    const walFile = getPersistencePath(this.nodeId, '.wal');

    if (!fs.existsSync(walFile)) {
        return;
    }

    const rl = readline.createInterface({
        input: fs.createReadStream(walFile),
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (!line.trim()) continue;

        const entry = JSON.parse(line);

        switch (entry.op) {

            case "PUT": {

                let expiryTime = Infinity;
                let remaining = null;

                if (entry.ttl !== null) {
                    remaining = entry.ttl - (Date.now() - entry.timestamp);
                    if (remaining <= 0)
                        continue;

                    expiryTime = Date.now() + remaining;
                }

                storage.set(
                    entry.key,
                    new CacheEntry(
                        entry.value,
                        expiryTime
                    )
                );

                if (entry.ttl !== null && remaining !== null) {
                    cacheNode.expirymanager.addExpiry(entry.key, remaining);
                }
                cacheNode.evictionmanager.addKey(entry.key);

                break;
            }

            case "DELETE":
                storage.delete(entry.key);
                const node = cacheNode.evictionmanager.lruMap.get(entry.key);
                if (node) {
                    cacheNode.evictionmanager.lruList.removeNode(node);
                    cacheNode.evictionmanager.lruMap.delete(entry.key);
                }
                break;
        }
    }

    console.log("[RECOVERY] WAL replay complete.");
}
}

module.exports = PersistenceManager;