const murmurhash = require('murmurhash');


function getHash(data) {
    return murmurhash.v3(data.toString()).toString(16);
}
class MerkleNode {
    constructor(hash, left = null, right = null, key = null) {
        this.hash = hash
        this.left = left
        this.right = right
        this.key = key
    }
}
class MerkleTree {
    constructor(keyValuePairs) {
        const sortedPairs =
            [...keyValuePairs]
                .sort(
                    (a, b) =>
                        a.key.localeCompare(b.key)
                );
        this.leaves = sortedPairs.map(item => {

    const hash = getHash(
        `${item.key}:${JSON.stringify(item.value)}`
    );

    return new MerkleNode(
        hash,
        null,
        null,
        item.key
    );
});
        this.root = this.buildTree(this.leaves)
    }

    buildTree(nodes) {
        if (nodes.length === 0) return null;
        if (nodes.length === 1) return nodes[0];
        const parents = [];
        for (let i = 0; i < nodes.length; i += 2) {
            const left = nodes[i];
            const right = nodes[i + 1] || left;
            const parentHash = getHash(`${left.hash}|${right.hash}`);
            parents.push(new MerkleNode(parentHash, left, right))
        }
        return this.buildTree(parents);
    }
    getRootHash() {
        return this.root?.hash || null;
    }
    getProof(key) { }
}

module.exports = MerkleTree;