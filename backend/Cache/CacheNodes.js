const StorageEngine = require('./StorageEngine');
const ExpiryManager = require('./ExpiryManager');
const EvictionManager = require('./EvictionManager');
const CacheEntry = require('./CacheEntry');
const MetricsManager = require('./MetricsManager');
const PersistenceManager = require('./Persistence Manager');

class CacheNode {
    constructor(nodeId, maxSize = 1000) {
        this.storage = new StorageEngine();
        this.expirymanager = new ExpiryManager();
        this.evictionmanager = new EvictionManager();

        this.nodeId = nodeId;
        this.maxSize = maxSize;

        this.metricsManager = new MetricsManager();
        this.persistencemanager = new PersistenceManager(nodeId);

        this.expiryInterval = null;
        this.snapshotInterval = null;
    }

    async initialize() {
        await this.persistencemanager.recover(this);

        this.expiryInterval = setInterval(() => {
            this.expirymanager.removeExpiredKeys(this);
        }, 1000);

        this.snapshotInterval = setInterval(() => {
            this.persistencemanager.takeSnapshot(this.storage.cache);
            this.persistencemanager.truncateLog();
        }, 30000);
    }

    get(key) {
        const entry = this.storage.get(key);

        if (!entry) {
            this.metricsManager.recordMiss();
            return null;
        }

        if (entry.expiryTime <= Date.now()) {
            this.metricsManager.recordExpiration();
            this.delete(key);
            return null;
        }

        this.evictionmanager.touch(key);
        entry.hits++;
        this.metricsManager.recordHit();

        return entry.value;
    }

    set(key, value, ttl = null) {
        const expiryTime =
            ttl === null
                ? Infinity
                : Date.now() + ttl;

        if (
            !this.storage.get(key) &&
            this.size() >= this.maxSize
        ) {
            const victim = this.evictionmanager.evict();

            if (victim) {
                this.metricsManager.recordEviction();
                this.delete(victim, false);
            }
        }

        const entry = new CacheEntry(value, expiryTime);

        this.persistencemanager.logPut(key, value, ttl);

        this.storage.set(key, entry);

        if (ttl !== null) {
            this.expirymanager.addExpiry(key, ttl);
        }

        this.evictionmanager.addKey(key);
        this.metricsManager.recordWrite();
    }

    delete(key, isUserDelete = true) {
        this.persistencemanager.logDelete(key);

        this.storage.delete(key);

        if (isUserDelete) {
            this.metricsManager.recordDelete();
        }

        const node = this.evictionmanager.lruMap.get(key);

        if (node) {
            this.evictionmanager.lruList.removeNode(node);
            this.evictionmanager.lruMap.delete(key);
        }
    }

    size() {
        return this.storage.size();
    }

    shutdown() {
        if (this.expiryInterval) {
            clearInterval(this.expiryInterval);
        }

        if (this.snapshotInterval) {
            clearInterval(this.snapshotInterval);
        }

        this.persistencemanager.takeSnapshot(this.storage.cache);

        this.persistencemanager.logStream.end();

        console.log(`[${this.nodeId}] Shutdown complete.`);
    }
}

module.exports = CacheNode;