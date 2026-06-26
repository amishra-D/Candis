const express = require('express');
const CacheNode = require('./Cache/CacheNodes');
const MerkleTree = require('./DS/MerkelTree');

async function createCacheNodeServer(nodeId, port, allPeers = []) {
    const app = reportAppAndServer(nodeId, port);
    
    function reportAppAndServer(nodeId, port) {
        const app = express();
        app.use(express.json());

        // CORS — matches all *.vercel.app origins and localhost
        const CUSTOM_ORIGIN = process.env.FRONTEND_URL;
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
        return app;
    }

    const cacheNode = new CacheNode(nodeId);

try {
    await cacheNode.initialize();
    console.log(`[RECOVERY] ${nodeId} recovered successfully.`);
} catch (err) {
    console.error(`[RECOVERY] Failed to recover ${nodeId}:`, err);
    throw err;
}
    const membership = new Map();
    allPeers.forEach(peer => {
        membership.set(peer.nodeId, {
            nodeId: peer.nodeId,
            url: peer.url,
            alive: true,
            heartbeat: 0,
            lastUpdated: Date.now()
        });
    });
    membership.set(nodeId, {
        nodeId,
        url: `http://localhost:${port}`,
        alive: true,
        heartbeat: 0,
        lastUpdated: Date.now()
    });

    app.post('/toggle-offline', (req, res) => {
        cacheNode.isOffline = !cacheNode.isOffline;
        console.log(`[SIMULATION] Node ${nodeId} status changed: isOffline = ${cacheNode.isOffline}`);
        res.json({ success: true, nodeId, isOffline: cacheNode.isOffline });
    });

    app.use((req, res, next) => {
        if (cacheNode.isOffline) {
            return res.status(503).json({ error: `Node ${nodeId} is offline` });
        }
        next();
    });

    app.post('/cache', (req, res) => {
        const {key,value,ttl} = req.body;
        cacheNode.set(key,value,ttl);
        res.json({success: true,nodeId});
    });

    app.post('/internal/migrate', (req, res) => {
        const { key, value, ttl } = req.body;
        if (!key || value === undefined) {
            return res.status(400).json({ error: 'Missing key or value' });
        }
        cacheNode.set(key, value, ttl);
        res.json({ success: true, nodeId, message: 'Data migrated successfully' });
    });

    app.get('/merkle-tree', (req, res) => {
        const entries = [];
        for (const [key, entry] of cacheNode.storage.cache.entries()) {
            if (entry.expiryTime > Date.now()) {
                entries.push({ key, value: entry.value });
            }
        }
        const tree = new MerkleTree(entries);
        
        const serializeNode = (node) => {
            if (!node) return null;
            return {
                hash: node.hash,
                key: node.key,
                left: serializeNode(node.left),
                right: serializeNode(node.right)
            };
        };

        res.json({
            nodeId,
            rootHash: tree.getRootHash(),
            root: serializeNode(tree.root),
            leaves: tree.leaves.map(l => ({ key: l.key, hash: l.hash }))
        });
    });

    app.post('/gossip', (req, res) => {
        const { senderId, membershipList } = req.body;
        if (!membershipList) {
            return res.status(400).json({ error: 'Missing membership list' });
        }

        membershipList.forEach(rec => {
            const local = membership.get(rec.nodeId);
            if (!local) {
                membership.set(rec.nodeId, {
                    nodeId: rec.nodeId,
                    url: rec.url,
                    alive: rec.alive,
                    heartbeat: rec.heartbeat,
                    lastUpdated: Date.now()
                });
            } else {
                if (rec.heartbeat > local.heartbeat) {
                    local.heartbeat = rec.heartbeat;
                    local.alive = rec.alive;
                    local.lastUpdated = Date.now();
                }
                if (rec.alive && !local.alive && rec.heartbeat >= local.heartbeat) {
                    local.alive = true;
                    local.heartbeat = rec.heartbeat;
                    local.lastUpdated = Date.now();
                }
            }
        });

        res.json({ success: true, nodeId });
    });

    app.get('/gossip/status', (req, res) => {
        res.json({
            nodeId,
            membership: Array.from(membership.values())
        });
    });

    app.get('/cache/:key', (req, res) => {
        const val = cacheNode.get(req.params.key);
        if (val === null) {
            return res
                .status(404)
                .json({
                    message: 'Not Found',
                    nodeId
                });
        }
        const entry = cacheNode.storage.get(req.params.key);
        res.json({
            nodeId,
            value: val,
            createdAt: entry ? entry.createdAt : null,
            expiryTime: entry ? entry.expiryTime : null,
            ttlRemaining: entry ? (entry.expiryTime === Infinity ? null : Math.max(0, entry.expiryTime - Date.now())) : null,
            hits: entry ? entry.hits : 0,
        });
    });

    app.get('/cache', (req, res) => {
        const entries = [];
        for (const [key, entry] of cacheNode.storage.cache.entries()) {
            entries.push({
                key,
                value: entry.value,
                expiryTime: entry.expiryTime,
                ttlRemaining: entry.expiryTime === Infinity ? null : Math.max(0, entry.expiryTime - Date.now()),
                hits: entry.hits,
                createdAt: entry.createdAt
            });
        }
        const lruOrder = [];
        let curr = cacheNode.evictionmanager.lruList.head;
        while (curr) {
            lruOrder.push(curr.val);
            curr = curr.next;
        }
        res.json({ nodeId, entries, lruOrder });
    });

    app.delete('/cache/:key',(req, res) => {
        cacheNode.delete(req.params.key);
        res.json({
            success: true
        });
    });

    app.get('/health', (req, res) => {
        res.json({
            nodeId,
            status: 'alive',
            size: cacheNode.size(),
            metrics: cacheNode.metricsManager,
            isOffline: !!cacheNode.isOffline
        });
    });

    let selfHeartbeat = 0;
    const gossipInterval = setInterval(async () => {
        if (cacheNode.isOffline) return;

        selfHeartbeat++;
        const selfEntry = membership.get(nodeId);
        if (selfEntry) {
            selfEntry.heartbeat = selfHeartbeat;
            selfEntry.lastUpdated = Date.now();
            selfEntry.alive = true;
        }

        const now = Date.now();
        for (const [peerId, entry] of membership.entries()) {
            if (peerId !== nodeId && entry.alive && (now - entry.lastUpdated > 12000)) {
                entry.alive = false;
                console.warn(`[GOSSIP] Node ${nodeId} detected peer ${peerId} is DEAD (no update for 12s)`);
            }
        }

        const peerList = Array.from(membership.values()).filter(p => p.nodeId !== nodeId);
        if (peerList.length === 0) return;
        const randomPeer = peerList[Math.floor(Math.random() * peerList.length)];

        try {
            const body = Array.from(membership.values());
            const response = await fetch(`${randomPeer.url}/gossip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senderId: nodeId, membershipList: body }),
                signal: AbortSignal.timeout(1000)
            });
            if (response.ok) {
                const peerEntry = membership.get(randomPeer.nodeId);
                if (peerEntry && !peerEntry.alive) {
                    peerEntry.alive = true;
                    peerEntry.lastUpdated = Date.now();
                    console.log(`[GOSSIP] Node ${nodeId} detected peer ${randomPeer.nodeId} revived via successful gossip post`);
                }
            }
        } catch (err) {

        }
    }, 2000);

    const originalShutdown = cacheNode.shutdown;
    cacheNode.shutdown = function() {
        clearInterval(gossipInterval);
        if (originalShutdown) originalShutdown.call(cacheNode);
    };

    app.listen(port, () => {
        console.log(`${nodeId} running on ${port}`);
    });
    return cacheNode;
}

module.exports = createCacheNodeServer;