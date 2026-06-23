const StorageEngine = require('./StorageEngine');
const ExpiryManager = require('./ExpiryManager');
const EvictionManager = require('./EvictionManager');
const CacheEntry = require('./CacheEntry');

class CacheNode {
   constructor(nodeId) {
      this.storage = new StorageEngine();
      this.expirymanager = new ExpiryManager();
      this.evictionmanager = new EvictionManager();
      this.nodeId = nodeId
      setInterval(()=>{
      this.expirymanager
          .removeExpiredKeys(this);
   },1000);
   }

   get(key) {
const entry = this.storage.get(key);
   if(!entry) return null;

   if(entry.expiryTime <= Date.now()){
      this.delete(key);
      return null;
   }
      if (entry) {
         this.evictionmanager.touch(key);
         entry.hits++;
      }
      return entry.value;
   }
   set(key, value, ttl) {
      const expiryTime = Date.now() + ttl;

      const entry = new CacheEntry(
         value,
         expiryTime
      );

      this.storage.set(key, entry);

      this.expirymanager.addExpiry(key, ttl);

      this.evictionmanager.addKey(key);
   }
   delete(key) {
      this.storage.delete(key);

      const node = this.evictionmanager.lruMap.get(key);

      if (node) {
         this.evictionmanager.lruList.removeNode(node);
         this.evictionmanager.lruMap.delete(key);
      }
   }
   size() {
      return this.storage.size();
   }
}

module.exports = CacheNode;