export class Queue<T> {
  private readonly queue: T[] = [];

  constructor(
    private readonly single: boolean,
    private readonly pair: (item1: T, item2: T) => void,
  ) {}

  enqueue(item: T) {
    if (this.single) {
      throw new Error("Not implemented");
    }

    if (this.queue.push(item) >= 2) {
      this.pair(this.queue.shift()!, this.queue.shift()!);
    }
  }
}
