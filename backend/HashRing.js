const murmurhash = require('murmurhash');

class HashRing {
    constructor(virtualNodes = 100) {
        this.ring = new Map();
        this.sortedHashes = [];
        this.virtualNodes = virtualNodes;
    }

    addcacheNode(cacheNode) {
        for (let i = 0; i < this.virtualNodes; i++) {
            const hash = murmurhash.v3(`${cacheNode.nodeId}:${i}`);
            this.ring.set(hash, cacheNode);
            this.sortedHashes.push(hash);
        }
        this.sortedHashes.sort((a, b) => a - b);
    }

    removecacheNode(cacheNode) {
        for (let i = 0; i < this.virtualNodes; i++) {
            const hash = murmurhash.v3(`${cacheNode.nodeId}:${i}`);
            this.ring.delete(hash);
            const index = this.sortedHashes.indexOf(hash);
            if (index !== -1) this.sortedHashes.splice(index, 1);
        }
    }

    getcacheNodeForKey(key) {
        if (this.sortedHashes.length === 0) return null;

        const keyHash = murmurhash.v3(key.toString());

        let low = 0, high = this.sortedHashes.length - 1;

        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (this.sortedHashes[mid] < keyHash) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        if (this.sortedHashes[low] < keyHash) {
            return this.ring.get(this.sortedHashes[0]);
        }

        return this.ring.get(this.sortedHashes[low]);
    }
    getNextNode(key) {
        if (this.sortedHashes.length <= 1) return null;

        const keyHash = murmurhash.v3(key.toString());

        let low = 0, high = this.sortedHashes.length - 1;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (this.sortedHashes[mid] < keyHash) low = mid + 1;
            else high = mid;
        }
        const primaryNode = this.ring.get(this.sortedHashes[low]);

        for (let i = 1; i < this.sortedHashes.length; i++) {
            const nextIndex = (low + i) % this.sortedHashes.length;
            const nextNode = this.ring.get(this.sortedHashes[nextIndex]);

            if (nextNode.nodeId !== primaryNode.nodeId) {
                return nextNode;
            }
        }

        return null; 
    }

    getReplicationNodes(key, replicationFactor) {
        if (this.sortedHashes.length === 0) return [];

        const keyHash = murmurhash.v3(key.toString());

        let low = 0, high = this.sortedHashes.length - 1;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (this.sortedHashes[mid] < keyHash) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        let primaryIndex = low;
        if (this.sortedHashes[low] < keyHash) {
            primaryIndex = 0;
        }

        const primaryNode = this.ring.get(this.sortedHashes[primaryIndex]);
        const nodes = [primaryNode];
        const seenNodeIds = new Set([primaryNode.nodeId]);

        for (let i = 1; i < this.sortedHashes.length; i++) {
            if (nodes.length >= replicationFactor) break;

            const nextIndex = (primaryIndex + i) % this.sortedHashes.length;
            const nextNode = this.ring.get(this.sortedHashes[nextIndex]);

            if (!seenNodeIds.has(nextNode.nodeId)) {
                nodes.push(nextNode);
                seenNodeIds.add(nextNode.nodeId);
            }
        }

        return nodes;
    }
}

module.exports = HashRing;