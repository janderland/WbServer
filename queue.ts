export class Queue<T> {
    private readonly queue: T[] = [];

    constructor(
        private readonly single: boolean,
        private readonly push: (item1: T, item2?: T) => void,
    ) {
    }

    enqueue(item: T) {
        if (this.single) {
            this.push(item);
            return;
        }

        if (this.queue.push(item) >= 2) {
            this.push(this.queue.shift()!, this.queue.shift()!);
        }
    }
}
