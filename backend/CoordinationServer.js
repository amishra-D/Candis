const express = require('express');
const DistributedCache = require('./DistributedCache');
const GossipManager = require('./GossipManager');
const AntiEntropy = require('./AntiEntropy');
const murmurhash = require('murmurhash');

const app = express();
app.use(express.json());

// CORS origin checker
// - Allows all *.vercel.app origins (production + every preview deployment)
// - Allows FRONTEND_URL env var for custom domains
// - Always allows localhost for local dev
const CUSTOM_ORIGIN = process.env.FRONTEND_URL; // e.g. https://mycustomdomain.com

function isAllowedOrigin(origin) {
    if (!origin) return false;
    if (origin === CUSTOM_ORIGIN) return true;
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return true;
    return false;
}

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (isAllowedOrigin(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

const cache = new DistributedCache();

cache.addcacheNode('node1', 'http://localhost:5001');
cache.addcacheNode('node2', 'http://localhost:5002');
cache.addcacheNode('node3', 'http://localhost:5003');
cache.addcacheNode('node4', 'http://localhost:5004');
cache.addcacheNode('node5', 'http://localhost:5005');

const gossip = new GossipManager(cache);
gossip.start();
cache.gossipManager = gossip;

const entropy = new AntiEntropy(cache);
entropy.start();

app.post('/cluster/rebalance', async (req, res) => {
    try {
        await gossip.rebalancer.rebalance();
        res.json({ success: true, message: 'Manual rebalance triggered' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/cluster/partitions', (req, res) => {
    const partitionCount = 8;
    const mapping = [];
    for (let p = 0; p < partitionCount; p++) {
        const node = cache.getNodeForKey(p.toString());
        mapping.push({
            partitionId: p,
            nodeId: node ? node.nodeId : null,
            url: node ? cache.nodeUrls.get(node.nodeId) : null
        });
    }
    res.json({ partitions: mapping });
});

app.post('/set', async (req, res) => {
    const { key, value, ttl, w } = req.body;
    if (!key || value === undefined) {
        return res.status(400).json({ error: 'Missing key or value' });
    }
    try {
        const targetNode = cache.getNodeForKey(key);
        const result = await cache.set(key, value, ttl ? Number(ttl) : null, w || 'one');
        const keyHash = murmurhash.v3(key.toString());
        res.json({
            success: true,
            nodeId: targetNode ? targetNode.nodeId : null,
            replicaNodeId: result.replicas ? result.replicas.join(', ') : null,
            replicated: result.replicas && result.replicas.length > 0,
            keyHash,
            result: result.result
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/get/:key', async (req, res) => {
    const r = req.query.r || 'one';
    try {
        const targetNode = cache.getNodeForKey(req.params.key);
        const result = await cache.get(req.params.key, r);
        const keyHash = murmurhash.v3(req.params.key.toString());
        if (!result || result.value === null) {
            return res.status(404).json({
                error: 'Key not found',
                nodeId: targetNode ? targetNode.nodeId : null,
                keyHash
            });
        }
        res.json({
            value: result.value,
            nodeId: result.servedByNodeId,
            primaryNodeId: targetNode ? targetNode.nodeId : null,
            isReplicaRead: targetNode && result.servedByNodeId !== targetNode.nodeId,
            keyHash
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/delete/:key', async (req, res) => {
    try {
        const targetNode = cache.getNodeForKey(req.params.key);
        const result = await cache.delete(req.params.key);
        const keyHash = murmurhash.v3(req.params.key.toString());
        res.json({
            success: true,
            nodeId: targetNode ? targetNode.nodeId : null,
            keyHash,
            result
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/node/:key', (req, res) => {
    const node = cache.getNodeForKey(req.params.key);
    if (!node) {
        return res.status(404).json({ error: 'No active nodes on ring' });
    }
    res.json({
        key: req.params.key,
        nodeId: node.nodeId,
        nodeUrl: cache.nodeUrls.get(node.nodeId)
    });
});

app.get('/cluster/status', (req, res) => {
    res.json({
        activeNodes: gossip.getActiveNodes(),
        deadNodes: gossip.getDeadNodes(),
        clusterStatus: gossip.getClusterStatus()
    });
});

app.get('/cluster/ring', (req, res) => {
    const mapping = [];
    for (const [hash, node] of cache.hashRing.ring.entries()) {
        mapping.push({
            hash: Number(hash),
            nodeId: node.nodeId,
            url: cache.nodeUrls.get(node.nodeId)
        });
    }
    res.json({
        sortedHashes: cache.hashRing.sortedHashes,
        ring: mapping,
        virtualNodesPerNode: cache.hashRing.virtualNodes
    });
});

app.post('/cluster/node/toggle', async (req, res) => {
    const { nodeId } = req.body;
    const url = cache.nodeUrls.get(nodeId);
    if (!url) {
        return res.status(404).json({ error: `Node ${nodeId} not found` });
    }
    try {
        const response = await fetch(`${url}/toggle-offline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: `Failed to toggle node: ${err.message}` });
    }
});

app.get('/cluster/node-data/:nodeId', async (req, res) => {
    const { nodeId } = req.params;
    const url = cache.nodeUrls.get(nodeId);
    if (!url) {
        return res.status(404).json({ error: `Node ${nodeId} not found` });
    }
    try {
        const response = await fetch(`${url}/cache`, {
            signal: AbortSignal.timeout(1000)
        });
        if (!response.ok) {
            throw new Error(`Node offline or returned ${response.status}`);
        }
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.json({ nodeId, entries: [], offline: true, error: err.message });
    }
});

app.get('/cluster/node-merkle-tree/:nodeId', async (req, res) => {
    const { nodeId } = req.params;
    const url = cache.nodeUrls.get(nodeId);
    if (!url) {
        return res.status(404).json({ error: `Node ${nodeId} not found` });
    }
    try {
        const response = await fetch(`${url}/merkle-tree`, {
            signal: AbortSignal.timeout(1000)
        });
        if (!response.ok) {
            throw new Error(`Node offline or returned ${response.status}`);
        }
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.json({ nodeId, root: null, leaves: [], offline: true, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Coordination Server running on port ${PORT}`);
});