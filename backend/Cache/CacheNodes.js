const StorageEngine = require('./StorageEngine');
const ExpiryManager = require('./ExpiryManager');
const EvictionManager = require('./EvictionManager');
const CacheEntry = require('./CacheEntry');
const MetricsManager = require('./MetricsManager');

class CacheNode {
   constructor(nodeId, maxSize = 1000) {
      this.storage = new StorageEngine();
      this.expirymanager = new ExpiryManager();
      this.evictionmanager = new EvictionManager();
      this.nodeId = nodeId;
      this.maxSize = maxSize;
      this.metricsManager = new MetricsManager();
      this.expiryInterval=setInterval(() => {
         this.expirymanager
            .removeExpiredKeys(this);
      }, 1000);
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
      if (entry) {
         this.evictionmanager.touch(key);
         entry.hits++;
         this.metricsManager.recordHit();
      }
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
         const victim =
            this.evictionmanager.evict();

         if (victim) {
            this.metricsManager.recordEviction();
            this.delete(victim, false);
         }
      }
      const entry =
         new CacheEntry(value, expiryTime);
      this.storage.set(key, entry);

      if (ttl !== null) {
         this.expirymanager.addExpiry(key, ttl);
      }
      this.evictionmanager.addKey(key);
      this.metricsManager.recordWrite();
   }
   delete(key, isUserDelete = true) {
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
   clearInterval(this.expiryInterval);
}
}

module.exports = CacheNode;