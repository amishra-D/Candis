const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Candis Distributed Cache Backend (Cache Nodes + Coordinator)...');

// Start the 5 cache nodes
const nodesProcess = spawn('node', [path.join(__dirname, 'index.js')], { 
    stdio: 'inherit', 
    shell: true 
});

// Start the coordination server
const coordProcess = spawn('node', [path.join(__dirname, 'CoordinationServer.js')], { 
    stdio: 'inherit', 
    shell: true 
});

// Handle graceful termination
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down backend servers...');
    nodesProcess.kill('SIGINT');
    coordProcess.kill('SIGINT');
    process.exit(0);
});
