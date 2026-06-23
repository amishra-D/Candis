const MinHeap = require('../DS/Minheap');
const CacheNode = require('./CacheNodes');
class ExpiryManager {
    constructor() {
        this.heap = new MinHeap();
    }
    addExpiry(key, ttl) {
        const expiryTime = Date.now() + ttl;
        this.heap.push({ key, expiryTime });
    }
    removeExpiredKeys(cacheNode) {
    const now = Date.now();

    while (
        this.heap.size() > 0 &&
        this.heap.heap[0].expiryTime <= now
    ) {
        const expiredKey = this.heap.pop().key;

        const entry =
            cacheNode.storage.get(expiredKey);

        if (
            entry &&
            entry.expiryTime <= now
        ) {
            cacheNode.delete(expiredKey);

            console.log(
                `Key ${expiredKey} expired`
            );
        }
    }
}
}
module.exports = ExpiryManager;