class MinHeap {
    constructor() {
        this.heap = [];
    }

    size() {
        return this.heap.length;
    }

    peek() {
        return this.heap.length ? this.heap[0] : null;
    }

    push(entry) {
        this.heap.push(entry);

        let idx = this.heap.length - 1;

        while (idx > 0) {
            let parent = Math.floor((idx - 1) / 2);

            if (
                this.heap[parent].expiryTime <=
                this.heap[idx].expiryTime
            ) {
                break;
            }

            [
                this.heap[parent],
                this.heap[idx]
            ] = [
                this.heap[idx],
                this.heap[parent]
            ];

            idx = parent;
        }
    }

    pop() {
        if (this.heap.length === 0) {
            return null;
        }

        if (this.heap.length === 1) {
            return this.heap.pop();
        }

        const min = this.heap[0];

        this.heap[0] = this.heap.pop();

        let idx = 0;

        while (true) {
            let left = 2 * idx + 1;
            let right = 2 * idx + 2;

            let smallest = idx;

            if (
                left < this.heap.length &&
                this.heap[left].expiryTime <
                    this.heap[smallest].expiryTime
            ) {
                smallest = left;
            }

            if (
                right < this.heap.length &&
                this.heap[right].expiryTime <
                    this.heap[smallest].expiryTime
            ) {
                smallest = right;
            }

            if (smallest === idx) {
                break;
            }

            [
                this.heap[idx],
                this.heap[smallest]
            ] = [
                this.heap[smallest],
                this.heap[idx]
            ];

            idx = smallest;
        }

        return min;
    }
}

module.exports = MinHeap;