const express = require('express');
const CacheNode = require('./Cache/CacheNodes');

function createCacheNodeServer(nodeId, port) {
    const app = express();
    app.use(express.json());
    const cacheNode = new CacheNode(nodeId);
    app.post('/cache', (req, res) => {
        const {key,value,ttl} = req.body;
        cacheNode.set(key,value,ttl);
        res.json({success: true,nodeId});
    });
app.get('/cache/:key', (req, res) => {
        const value =cacheNode.get(req.params.key);
        if (!value) {
            return res
                .status(404)
                .json({
                    message: 'Not Found'
                });
        }
        res.json({
            nodeId,
            value
        });
    });
    app.delete('/cache/:key',(req, res) => {
            cacheNode.delete(req.params.key);
            res.json({
                success: true
            });
        }
    );

    app.listen(port, () => {
console.log(`${nodeId} running on ${port}`);
    });
    return cacheNode;
}
app.get('/health', (req, res) => {
    res.json({
        nodeId,
        status: 'alive',
        size: cacheNode.size(),
        metrics: cacheNode.metricsManager
    });
});

module.exports =
    createCacheNodeServer;