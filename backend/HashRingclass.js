const murmurhash = require('murmurhash')

class HashRing {
    constructor() {
        this.ring = new Map();
        this.sortedHashes = [];
    }

    addNode(node) {
        const hash = murmurhash.v3(
            node.nodeId.toString()
        );

        this.ring.set(hash, node);
        this.sortedHashes.push(hash);

        this.sortedHashes.sort((a, b) => a - b);
    }
    removeNode(node) {
        const hash = murmurhash.v3(
            node.nodeId.toString()
        );
        this.ring.delete(hash);
        const index = this.sortedHashes.indexOf(hash);
        if (index > -1) {
            this.sortedHashes.splice(index, 1);
        }
    }
    getNodeForKey(key) {
        const datahash=murmurhash.v3(data.key);
let nodeFound=false;
let replica=0;
for (let i=0;i<hashRing.sortedHashes.length;i++){
    if(datahash<=hashRing.sortedHashes[i]){
        const node=hashRing.ring.get(hashRing.sortedHashes[i]);
        node.set(data.key,data.value);
        nodeFound=true;
        replica=i+1;
        console.log(`Data stored in node ${node.nodeId}`);
        break;
    }
}
if(!nodeFound){
    const node=hashRing.ring.get(hashRing.sortedHashes[0]);
    node.set(data.key,data.value);
    replica=1;
    console.log(`Data stored in node ${node.nodeId}`);
}
}
}

module.exports=HashRing;