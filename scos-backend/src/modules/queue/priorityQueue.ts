type QueueNode = {
  tokenId: string;
  priorityScore: number;
  createdAt: number;
};

export class PriorityQueue {
  private heap: QueueNode[] = [];

  push(node: QueueNode): void {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): QueueNode | undefined {
    if (this.heap.length === 0) {
      return undefined;
    }

    const top = this.heap[0];
    const tail = this.heap.pop();

    if (this.heap.length > 0 && tail) {
      this.heap[0] = tail;
      this.bubbleDown(0);
    }

    return top;
  }

  peek(): QueueNode | undefined {
    return this.heap[0];
  }

  size(): number {
    return this.heap.length;
  }

  private compare(a: QueueNode, b: QueueNode): boolean {
    if (a.priorityScore !== b.priorityScore) {
      return a.priorityScore > b.priorityScore;
    }

    return a.createdAt < b.createdAt;
  }

  private bubbleUp(index: number): void {
    let current = index;

    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (this.compare(this.heap[current], this.heap[parent])) {
        [this.heap[current], this.heap[parent]] = [this.heap[parent], this.heap[current]];
        current = parent;
      } else {
        break;
      }
    }
  }

  private bubbleDown(index: number): void {
    let current = index;

    while (true) {
      const left = current * 2 + 1;
      const right = current * 2 + 2;
      let next = current;

      if (left < this.heap.length && this.compare(this.heap[left], this.heap[next])) {
        next = left;
      }

      if (right < this.heap.length && this.compare(this.heap[right], this.heap[next])) {
        next = right;
      }

      if (next === current) {
        break;
      }

      [this.heap[current], this.heap[next]] = [this.heap[next], this.heap[current]];
      current = next;
    }
  }
}
