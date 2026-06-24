const HashRing = require('./HashRing');

class DistributedCache {
    constructor(replicationFactor = 3) {
        this.hashRing = new HashRing();
        this.nodeUrls = new Map();
        this.replicationFactor = replicationFactor;
    }

    addcacheNode(nodeId, url) {
        this.hashRing.addcacheNode({ nodeId });
        this.nodeUrls.set(nodeId, url);
    }

    getNodeForKey(key) {
        return this.hashRing.getcacheNodeForKey(key);
    }

    async set(key, value, ttl, w = 'one') {
        const replicationNodes = this.hashRing.getReplicationNodes(key, this.replicationFactor);
        if (replicationNodes.length === 0) throw new Error("No active cache nodes found on hash ring");

        let requiredAcks = 1;
        if (w === 'quorum') {
            requiredAcks = Math.floor(this.replicationFactor / 2) + 1;
        } else if (w === 'all') {
            requiredAcks = this.replicationFactor;
        }

        let ackCount = 0;
        const primaryNode = replicationNodes[0];
        const successfulReplicas = [];
        let primaryResult = null;

        const writePromises = replicationNodes.map(async (node) => {
            const url = this.nodeUrls.get(node.nodeId);
            try {
                const response = await fetch(`${url}/cache`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key, value, ttl }),
                    signal: AbortSignal.timeout(1000)
                });
                if (response.ok) {
                    const data = await response.json();
                    return { success: true, nodeId: node.nodeId, data };
                }
                return { success: false, nodeId: node.nodeId };
            } catch (err) {
                return { success: false, nodeId: node.nodeId };
            }
        });

        const results = await Promise.all(writePromises);
        results.forEach(res => {
            if (res.success) {
                ackCount++;
                if (res.nodeId === primaryNode.nodeId) {
                    primaryResult = res.data;
                } else {
                    successfulReplicas.push(res.nodeId);
                }
            }
        });

        if (ackCount < requiredAcks) {
            throw new Error(`Write consistency failed. Required=${requiredAcks}, Received=${ackCount}`);
        }

        return {
            success: true,
            consistency: w,
            requiredAcks,
            receivedAcks: ackCount,
            primary: primaryNode.nodeId,
            replicas: successfulReplicas,
            result: primaryResult
        };
    }

    async get(key, r = 'one') {
        let requiredReads = 1;
        if (r === 'quorum') {
            requiredReads = Math.floor(this.replicationFactor / 2) + 1;
        } else if (r === 'all') {
            requiredReads = this.replicationFactor;
        }

        const replicationNodes = this.hashRing.getReplicationNodes(key, this.replicationFactor);
        if (replicationNodes.length === 0) return { value: null, servedByNodeId: null };

        // Fetch from all replica nodes in parallel
        const readPromises = replicationNodes.map(async (node) => {
            const url = this.nodeUrls.get(node.nodeId);
            try {
                const response = await fetch(`${url}/cache/${key}`, { signal: AbortSignal.timeout(1000) });
                if (response.ok) {
                    const data = await response.json();
                    return { success: true, nodeId: node.nodeId, data };
                }
                return { success: false, nodeId: node.nodeId };
            } catch (err) {
                return { success: false, nodeId: node.nodeId };
            }
        });

        const results = await Promise.all(readPromises);
        const successfulReads = results.filter(res => res.success);

        if (successfulReads.length < requiredReads) {
            throw new Error(`Read consistency failed. Required=${requiredReads}, Received=${successfulReads.length}`);
        }

        // Conflict Resolution: Latest write wins (LWW) based on createdAt timestamp
        successfulReads.sort((a, b) => (b.data.createdAt || 0) - (a.data.createdAt || 0));
        const latestEntry = successfulReads[0];

        // Active Read Repair: Check if any replica has an older version or is missing the key
        const latestTimestamp = latestEntry.data.createdAt || 0;
        const staleOrMissingReplicas = results.filter(res => {
            if (!res.success) return true;
            return (res.data.createdAt || 0) < latestTimestamp;
        });

        if (staleOrMissingReplicas.length > 0) {
            staleOrMissingReplicas.forEach(async (stale) => {
                const targetUrl = this.nodeUrls.get(stale.nodeId);
                try {
                    const ttl = latestEntry.data.expiryTime === Infinity ? null : Math.max(0, latestEntry.data.expiryTime - Date.now());
                    await fetch(`${targetUrl}/internal/migrate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ key, value: latestEntry.data.value, ttl }),
                        signal: AbortSignal.timeout(1000)
                    });
                } catch (err) {
                    console.warn(`[READ REPAIR] Failed to repair key '${key}' on node ${stale.nodeId}:`, err.message);
                }
            });
        }

        return {
            value: latestEntry.data.value,
            servedByNodeId: latestEntry.nodeId,
            primaryNodeId: replicationNodes[0].nodeId,
            isReplicaRead: latestEntry.nodeId !== replicationNodes[0].nodeId,
            consistency: r,
            receivedReads: successfulReads.length
        };
    }

    async delete(key) {
        const replicationNodes = this.hashRing.getReplicationNodes(key, this.replicationFactor);
        if (replicationNodes.length === 0) return { primaryDeleted: false, replicaDeleted: false };

        const primaryNode = replicationNodes[0];
        const primaryUrl = this.nodeUrls.get(primaryNode.nodeId);
        let primaryDeleted = false;

        try {
            const response = await fetch(`${primaryUrl}/cache/${key}`, { method: 'DELETE' });
            if (response.ok) primaryDeleted = true;
        } catch (err) {
            console.error(`Error deleting key from primary node ${primaryNode.nodeId}:`, err);
        }

        const replicaNodes = replicationNodes.slice(1);
        let replicaDeletedCount = 0;
        for (const replicaNode of replicaNodes) {
            const replicaUrl = this.nodeUrls.get(replicaNode.nodeId);
            try {
                const response = await fetch(`${replicaUrl}/cache/${key}`, { method: 'DELETE' });
                if (response.ok) replicaDeletedCount++;
            } catch (err) {
                console.error(`Error deleting key from replica node ${replicaNode.nodeId}:`, err);
            }
        }

        return {
            primaryDeleted,
            replicaDeleted: replicaDeletedCount > 0
        };
    }
}

module.exports = DistributedCache;