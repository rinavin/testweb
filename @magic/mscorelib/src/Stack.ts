export class Stack<TData> {

  private _array: Array<TData>;

  constructor() {
    this._array = new Array<TData>();
  }

  public count(): number {
    return this._array.length;
  }

  public isEmpty(): boolean {
    return this._array.length === 0;
  }

  public push(value: TData): void {
    this._array.push(value);
  }

  public pop(): TData {
    return this._array.pop();
  }

  public peek(): TData {
    if (this._array.length > 0) {
      return this._array[this._array.length - 1];
    } else {
      return null;
    }
  }

  public Clear(): void {
    this._array.splice(0, this._array.length);
  }

  public Clone(): Stack<TData> {
    let clone: Stack<TData> = new Stack<TData>();
    clone._array = this._array.slice();
    return clone;
  }
}
