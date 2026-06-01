export class RingBuffer<T> {
  private readonly maxSize: number;
  private values: T[] = [];

  constructor(maxSize: number) {
    this.maxSize = Math.max(1, maxSize);
  }

  push(value: T) {
    this.values.unshift(value);
    if (this.values.length > this.maxSize) this.values.length = this.maxSize;
  }

  snapshot(): readonly T[] {
    return this.values;
  }

  clear() {
    this.values = [];
  }
}
