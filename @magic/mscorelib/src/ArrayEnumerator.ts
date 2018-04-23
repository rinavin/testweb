
export interface IEnumerable<T> {
  GetEnumerator(): Array_Enumerator<T>;
}

export class Array_Enumerator<T> {
  private array: T[];
  private index: number = -1;

  constructor(array: T[]) {
    this.array = array;
  }

  MoveNext(): boolean {
    this.index++;
    return this.index < this.array.length;
  }

  get Current(): T {
    return this.array[this.index];
  }

  Dispose(): void {
  }
}
