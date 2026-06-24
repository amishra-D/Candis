const express = require('express');
const app = express();
const createCacheNodeServer = require('./createCacheNodeServer');
const port = process.env.PORT || 4000;
app.get('/', (req, res) => {
    res.send('Server is running');
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
const peers = [
    { nodeId: 'node1', url: 'http://localhost:5001' },
    { nodeId: 'node2', url: 'http://localhost:5002' },
    { nodeId: 'node3', url: 'http://localhost:5003' },
    { nodeId: 'node4', url: 'http://localhost:5004' },
    { nodeId: 'node5', url: 'http://localhost:5005' }
];

createCacheNodeServer('node1', 5001, peers);
createCacheNodeServer('node2', 5002, peers);
createCacheNodeServer('node3', 5003, peers);
createCacheNodeServer('node4', 5004, peers);
createCacheNodeServer('node5', 5005, peers);

