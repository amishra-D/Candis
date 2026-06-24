const express = require('express');
const DistributedCache = require('./DistributedCache');
const GossipManager = require('./GossipManager');

const app = express();
app.use(express.json());

const cache = new DistributedCache();

cache.addcacheNode('node1', 'http://localhost:5001');
cache.addcacheNode('node2', 'http://localhost:5002');
cache.addcacheNode('node3', 'http://localhost:5003');
cache.addcacheNode('node4', 'http://localhost:5004');
cache.addcacheNode('node5', 'http://localhost:5005');

const gossip = new GossipManager(cache);
gossip.start();

app.post('/set', async (req, res) => {
    const { key, value, ttl } = req.body;
    if (!key || value === undefined) {
        return res.status(400).json({ error: 'Missing key or value' });
    }
    try {
        const targetNode = cache.getNodeForKey(key);
        const result = await cache.set(key, value, ttl);
        res.json({
            success: true,
            nodeId: targetNode.nodeId,
            result
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/get/:key', async (req, res) => {
    try {
        const targetNode = cache.getNodeForKey(req.params.key);
        const value = await cache.get(req.params.key);
        if (value === null) {
            return res.status(404).json({
                error: 'Key not found',
                nodeId: targetNode ? targetNode.nodeId : null
            });
        }
        res.json({
            value,
            nodeId: targetNode.nodeId
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/delete/:key', async (req, res) => {
    try {
        const targetNode = cache.getNodeForKey(req.params.key);
        const result = await cache.delete(req.params.key);
        res.json({
            success: true,
            nodeId: targetNode ? targetNode.nodeId : null,
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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Coordination Server running on port ${PORT}`);
});