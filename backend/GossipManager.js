const Rebalancer = require('./Rebalancer');

class GossipManager {
    constructor(distributedCache) {
        this.cache = distributedCache;
        this.deadNodes = new Set();
        this.missedBeats = new Map();
        this.nodeMetrics = new Map();
        this.nodeSizes = new Map();
        this.interval = null;
        this.rebalancer = new Rebalancer(this.cache);
    }

    start() {
        console.log(' Gossip protocol monitor started...');
        this.interval = setInterval(
            () => this.pingAllNodes(), 
            2000
        );
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            console.log('Gossip protocol monitor stopped');
        }
    }

    async pingAllNodes() {
        let updated = false;
        
        const activeNodes = [...this.cache.nodeUrls.keys()].filter(id => !this.deadNodes.has(id));
        
        const shuffled = activeNodes.sort(() => Math.random() - 0.5);
        
        for (const nodeId of shuffled) {
            const url = this.cache.nodeUrls.get(nodeId);
            try {
                const response = await fetch(`${url}/gossip/status`, { signal: AbortSignal.timeout(1000) });
                if (response.ok) {
                    const data = await response.json();
                    this.processGossipMembership(data.membership);
                    updated = true;
                    break;
                }
            } catch (err) {
                console.log(err);
            }
        }
        if (!updated) {
            for (const [nodeId, url] of this.cache.nodeUrls) {
                try {
                    const response = await fetch(
                        `${url}/health`,
                        { signal: AbortSignal.timeout(1000) }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        this.nodeMetrics.set(nodeId, data.metrics);
                        this.nodeSizes.set(nodeId, data.size);
                        this.onNodeAlive(nodeId);
                    } else {
                        this.recordMissedBeat(nodeId);
                    }
                } catch {
                    this.recordMissedBeat(nodeId);
                }
            }
        } else {
            for (const [nodeId, url] of this.cache.nodeUrls) {
                if (!this.deadNodes.has(nodeId)) {
                    try {
                        const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(1000) });
                        if (response.ok) {
                            const data = await response.json();
                            this.nodeMetrics.set(nodeId, data.metrics);
                            this.nodeSizes.set(nodeId, data.size);
                        }
                    } catch (err) {
                         console.log("Error fetching metrics ", err)
                    }
                }
            }
        }
    }

    processGossipMembership(membershipList) {
        for (const item of membershipList) {
            const nodeId = item.nodeId;
            const wasDead = this.deadNodes.has(nodeId);
            const isAlive = item.alive;
            
            if (isAlive && wasDead) {
                this.onNodeAlive(nodeId);
            } else if (!isAlive && !wasDead) {
                this.onNodeDead(nodeId);
            }
        }
    }

    async triggerRebalance() {
        try {
            console.log("Triggering auto-rebalance due to membership change...");
            await this.rebalancer.rebalance();
        } catch (err) {
            console.error("Auto-rebalance failed:", err.message);
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
        console.log(`Node ${nodeId} is DEAD — removing from ring`);
        this.deadNodes.add(nodeId);

        this.cache.hashRing.removecacheNode({ nodeId });

        console.log(
            `Ring updated — active nodes: ${this.getActiveNodes()}`
        );
        this.triggerRebalance();
    }

    onNodeRevived(nodeId) {
        console.log(`Node ${nodeId} is BACK — adding to ring`);
        this.deadNodes.delete(nodeId);
        this.missedBeats.set(nodeId, 0);

        this.cache.hashRing.addcacheNode({ nodeId });

        console.log(
            `Ring updated — active nodes: ${this.getActiveNodes()}`
        );
        this.triggerRebalance();
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
                missedBeats: this.missedBeats.get(nodeId) || 0,
                metrics: this.nodeMetrics.get(nodeId) || null,
                size: this.nodeSizes.get(nodeId) || 0
            });
        }

        return status;
    }
}

module.exports = GossipManager;