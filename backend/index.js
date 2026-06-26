const createCacheNodeServer = require('./createCacheNodeServer');

// Cache nodes run on fixed internal ports — they are never exposed externally.
// The Coordination Server (CoordinationServer.js) owns process.env.PORT.
const peers = [
    { nodeId: 'node1', url: 'http://localhost:5001' },
    { nodeId: 'node2', url: 'http://localhost:5002' },
    { nodeId: 'node3', url: 'http://localhost:5003' },
    { nodeId: 'node4', url: 'http://localhost:5004' },
    { nodeId: 'node5', url: 'http://localhost:5005' }
];

async function main() {
    try {
        await Promise.all([
            createCacheNodeServer('node1', 5001, peers),
            createCacheNodeServer('node2', 5002, peers),
            createCacheNodeServer('node3', 5003, peers),
            createCacheNodeServer('node4', 5004, peers),
            createCacheNodeServer('node5', 5005, peers)
        ]);

        console.log('All cache nodes started successfully.');
    } catch (err) {
        console.error('Failed to start cache nodes:', err);
    }
}

main();