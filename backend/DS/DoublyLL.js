class Node {
    constructor(val) {
        this.val = val;
        this.prev = null;
        this.next = null;
    }
}

class DoublyLinkedList {
    constructor() {
        this.head = null;
        this.tail = null;
        this.size = 0;
    }

    addFront(node) {
        if (!this.head) {
            this.head = this.tail = node;
        } else {
            node.next = this.head;
            this.head.prev = node;
            this.head = node;
        }

        this.size++;
    }

    removeNode(node) {
    if (!node) return;

    if (node === this.head && node === this.tail) {
        this.head = this.tail = null;
    } else if (node === this.head) {
        this.head = node.next;
        this.head.prev = null;
    } else if (node === this.tail) {
        this.tail = node.prev;
        this.tail.next = null;
    } else {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    node.prev = null;
    node.next = null;

    this.size--;
}
    removeTail() {
        if (!this.tail) return null;

        const node = this.tail;

        if (this.head === this.tail) {
            this.head = this.tail = null;
        } else {
            this.tail = this.tail.prev;
            this.tail.next = null;
        }

        this.size--;
        return node;
    }

    print() {
        let curr = this.head;
        const res = [];

        while (curr) {
            res.push(curr.val);
            curr = curr.next;
        }

        console.log(res.join(" <-> "));
    }
}
module.exports = {DoublyLinkedList,Node};