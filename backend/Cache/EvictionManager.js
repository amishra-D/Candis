const DoublyLinkedList = require('../DS/DoublyLL');
const Node = require('../DS/DoublyLL').Node;
class EvictionManager {
    constructor() {
        this.lruList = new DoublyLinkedList();
        this.lruMap = new Map();
    }
    touch(key) {
        if (this.lruMap.has(key)) {
            const node = this.lruMap.get(key);
            this.lruList.removeNode(node);
            this.lruList.addFront(node);
        }
    }
    addKey(key) {
        if (this.lruMap.has(key)) {
            this.touch(key);
            return;
        }
        const node = new Node(key);
        this.lruList.addFront(node);
        this.lruMap.set(key, node);
    }
    evict() {
        if (this.lruList.size > 0) {
            const lruNode = this.lruList.removeTail();
            if (lruNode) {
                this.lruMap.delete(lruNode.val);
                return lruNode.val;
            }
        }
    }
}
module.exports = EvictionManager;