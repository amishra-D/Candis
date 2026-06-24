class GossipManager {
    constructor(distributedCache) {
        this.cache = distributedCache;
        this.deadNodes = new Set();
        this.missedBeats = new Map();
        this.interval = null;
    }

    start() {
        console.log(' Gossip protocol started...');
        this.interval = setInterval(
            () => this.pingAllNodes(), 
            2000
        );
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            console.log('Gossip protocol stopped');
        }
    }

    async pingAllNodes() {
        for (const [nodeId, url] of this.cache.nodeUrls) {
            try {
                const response = await fetch(
                    `${url}/health`,
                    { signal: AbortSignal.timeout(1000) } // 1 sec timeout
                );

                if (response.ok) {
                    this.onNodeAlive(nodeId);
                } else {
                    this.recordMissedBeat(nodeId);
                }

            } catch {
                this.recordMissedBeat(nodeId);
            }
        }
    }

    recordMissedBeat(nodeId) {
        const missed = (this.missedBeats.get(nodeId) || 0) + 1;
        this.missedBeats.set(nodeId, missed);

        console.warn(
            `Node ${nodeId} missed beat ${missed}/3`
        );

        if (missed >= 3 && !this.deadNodes.has(nodeId)) {
            this.onNodeDead(nodeId);
        }
    }

    onNodeAlive(nodeId) {
        const wasDeadBefore = this.deadNodes.has(nodeId);

        this.missedBeats.set(nodeId, 0);

        if (wasDeadBefore) {
            this.onNodeRevived(nodeId);
        }
    }

    onNodeDead(nodeId) {
        console.log(`💀 Node ${nodeId} is DEAD — removing from ring`);
        this.deadNodes.add(nodeId);

        this.cache.hashRing.removecacheNode({ nodeId });

        console.log(
            `🔄 Ring updated — active nodes: ${this.getActiveNodes()}`
        );
    }

    onNodeRevived(nodeId) {
        console.log(`Node ${nodeId} is BACK — adding to ring`);
        this.deadNodes.delete(nodeId);
        this.missedBeats.set(nodeId, 0);

        this.cache.hashRing.addcacheNode({ nodeId });

        console.log(
            `🔄 Ring updated — active nodes: ${this.getActiveNodes()}`
        );
    }

    getActiveNodes() {
        return [...this.cache.nodeUrls.keys()]
            .filter(id => !this.deadNodes.has(id));
    }

    getDeadNodes() {
        return [...this.deadNodes];
    }
    getClusterStatus() {
        const status = [];

        for (const [nodeId, url] of this.cache.nodeUrls) {
            status.push({
                nodeId,
                url,
                alive: !this.deadNodes.has(nodeId),
                missedBeats: this.missedBeats.get(nodeId) || 0
            });
        }

        return status;
    }
}

module.exports = GossipManager;