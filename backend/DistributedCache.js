const HashRing = require('./HashRing');

class DistributedCache {
    constructor() {
        this.hashRing = new HashRing();
        this.nodeUrls = new Map();
    }

    addcacheNode(nodeId, url) {
        this.hashRing.addcacheNode({ nodeId });
        this.nodeUrls.set(nodeId, url);
    }

    getNodeForKey(key) {
        return this.hashRing.getcacheNodeForKey(key);
    }

    async set(key, value, ttl) {
        const node = this.hashRing.getcacheNodeForKey(key);
        if (!node) throw new Error("No active cache nodes found on hash ring");
        const url = this.nodeUrls.get(node.nodeId);

        const response = await fetch(`${url}/cache`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value, ttl })
        });
        if (!response.ok) {
            throw new Error(`Failed to set key on node ${node.nodeId}: ${response.statusText}`);
        }
        return await response.json();
    }

    async get(key) {
        const node = this.hashRing.getcacheNodeForKey(key);
        if (!node) return null;
        const url = this.nodeUrls.get(node.nodeId);

        try {
            const response = await fetch(`${url}/cache/${key}`);
            if (response.status === 404) {
                return null;
            }
            const data = await response.json();
            return data.value;
        } catch (err) {
            console.error(`Error getting key from node ${node.nodeId}:`, err);
            return null;
        }
    }

    async delete(key) {
        const node = this.hashRing.getcacheNodeForKey(key);
        if (!node) return;
        const url = this.nodeUrls.get(node.nodeId);

        try {
            const response = await fetch(`${url}/cache/${key}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (err) {
            console.error(`Error deleting key from node ${node.nodeId}:`, err);
        }
    }
}

module.exports = DistributedCache;