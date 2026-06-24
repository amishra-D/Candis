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
createCacheNodeServer('node1', 5001);
createCacheNodeServer('node2', 5002);
createCacheNodeServer('node3', 5003);
createCacheNodeServer('node4', 5004);
createCacheNodeServer('node5', 5005);

