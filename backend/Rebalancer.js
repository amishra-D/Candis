const migrate = require('./Migratedata');

class Rebalancer {
   constructor(cache) {
      this.cache = cache;
   }

   async rebalance() {
      console.log("Running cluster rebalance...");
      
      const allEntries = [];
      
      for (const [nodeId, url] of this.cache.nodeUrls) {
         try {
            const response = await fetch(`${url}/cache`, { signal: AbortSignal.timeout(1000) });
            if (!response.ok) continue;
            const data = await response.json();
            for (const entry of data.entries) {
               allEntries.push({ entry, nodeId });
            }
         } catch (err) {
         }
      }

      for (const { entry, nodeId } of allEntries) {
         const targetNodes = this.cache.hashRing.getReplicationNodes(entry.key, this.cache.replicationFactor);
         if (targetNodes.length === 0) continue;

         const targetNodeIds = targetNodes.map(n => n.nodeId);

         for (const targetNode of targetNodes) {
            if (targetNode.nodeId !== nodeId) {
               const targetUrl = this.cache.nodeUrls.get(targetNode.nodeId);
               try {
                  const ttl = entry.expiryTime === Infinity ? null : entry.ttlRemaining;
                  await fetch(`${targetUrl}/internal/migrate`, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ key: entry.key, value: entry.value, ttl }),
                     signal: AbortSignal.timeout(1000)
                  });
               } catch (err) {
                  console.warn(`[REBALANCE] Failed to sync key '${entry.key}' to replica ${targetNode.nodeId}: ${err.message}`);
               }
            }
         }

         if (!targetNodeIds.includes(nodeId)) {
            const sourceUrl = this.cache.nodeUrls.get(nodeId);
            try {
               console.log(`[REBALANCE] Deleting misplaced key '${entry.key}' from node ${nodeId}`);
               await fetch(`${sourceUrl}/cache/${entry.key}`, { method: 'DELETE' });
            } catch (err) {
               console.warn(`[REBALANCE] Failed to delete key '${entry.key}' from node ${nodeId}: ${err.message}`);
            }
         }
      }
      console.log("Rebalance operation completed.");
   }
}
module.exports = Rebalancer;
