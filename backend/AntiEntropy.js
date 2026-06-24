class AntiEntropy {
    constructor(cache) {
        this.cache = cache;
        this.interval = null;
    }

    start() {
        console.log("🛡️ Active Anti-Entropy (AAE) sync worker started...");
        this.interval = setInterval(() => this.sync(), 10000); // Run every 10 seconds
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            console.log("Active Anti-Entropy (AAE) sync worker stopped");
        }
    }

    async sync() {
        console.log("🛡️ Running active anti-entropy sync check...");
        const activeNodeIds = [...this.cache.nodeUrls.keys()].filter(id => !this.cache.gossipManager?.deadNodes?.has(id));
        if (activeNodeIds.length <= 1) return;

        // 1. Fetch Merkle trees from all active nodes
        const nodeTrees = new Map(); // nodeId -> { rootHash, leaves: Map(key -> hash) }
        const keySourceNodes = new Map(); // key -> Set of nodeIds that have this key

        for (const nodeId of activeNodeIds) {
            const url = this.cache.nodeUrls.get(nodeId);
            try {
                const response = await fetch(`${url}/merkle-tree`, { signal: AbortSignal.timeout(1000) });
                if (response.ok) {
                    const data = await response.json();
                    const leavesMap = new Map();
                    if (data.leaves) {
                        data.leaves.forEach(l => {
                            leavesMap.set(l.key, l.hash);
                            if (!keySourceNodes.has(l.key)) {
                                keySourceNodes.set(l.key, new Set());
                            }
                            keySourceNodes.get(l.key).add(nodeId);
                        });
                    }
                    nodeTrees.set(nodeId, {
                        rootHash: data.rootHash,
                        leaves: leavesMap
                    });
                }
            } catch (err) {
                // Node offline or query failed, skip
            }
        }

        // 2. Check each key's replication state
        let repairCount = 0;
        for (const [key, sourceNodes] of keySourceNodes.entries()) {
            const targetNodes = this.cache.hashRing.getReplicationNodes(key, this.cache.replicationFactor);
            if (targetNodes.length === 0) continue;

            const targetNodeIds = targetNodes.map(n => n.nodeId);

            // Find a source node that is active and holds the key
            const availableSources = [...sourceNodes].filter(id => activeNodeIds.includes(id));
            if (availableSources.length === 0) continue;
            const sourceNodeId = availableSources[0];

            for (const targetNode of targetNodes) {
                const targetNodeId = targetNode.nodeId;
                const targetTree = nodeTrees.get(targetNodeId);

                const inSync = targetTree && targetTree.leaves.has(key) && 
                               (targetTree.leaves.get(key) === nodeTrees.get(sourceNodeId).leaves.get(key));

                if (!inSync) {
                    const sourceUrl = this.cache.nodeUrls.get(sourceNodeId);
                    const targetUrl = this.cache.nodeUrls.get(targetNodeId);
                    try {
                        console.log(`[AAE REPAIR] Key '${key}' is out of sync on replica ${targetNodeId}. Repairing...`);
                        
                        // Fetch entry from source node
                        const getRes = await fetch(`${sourceUrl}/cache/${key}`);
                        if (getRes.ok) {
                            const entryData = await getRes.json();
                            
                            // Query remaining TTL
                            const cacheRes = await fetch(`${sourceUrl}/cache`);
                            if (cacheRes.ok) {
                                const cacheData = await cacheRes.json();
                                const matchingEntry = cacheData.entries.find(e => e.key === key);
                                if (matchingEntry) {
                                    const ttl = matchingEntry.expiryTime === Infinity ? null : matchingEntry.ttlRemaining;
                                    
                                    // Replicate to target
                                    const postRes = await fetch(`${targetUrl}/internal/migrate`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ key, value: entryData.value, ttl })
                                    });
                                    if (postRes.ok) {
                                        repairCount++;
                                        console.log(`[AAE REPAIR] Successfully repaired key '${key}' on replica ${targetNodeId}`);
                                    }
                                }
                            }
                        }
                    } catch (err) {
                        console.warn(`[AAE REPAIR] Failed to repair key '${key}' on replica ${targetNodeId}:`, err.message);
                    }
                }
            }
        }
        
        if (repairCount > 0) {
            console.log(`🛡️ Active Anti-Entropy sync completed. Repaired ${repairCount} inconsistencies.`);
        } else {
            console.log("🛡️ Active Anti-Entropy sync completed. All replicas in sync.");
        }
    }
}

module.exports = AntiEntropy;
