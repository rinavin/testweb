import {Array_Enumerator} from "./ArrayEnumerator";
import {isUndefined} from "util";

export class List<T>  extends Array<T> {

  constructor(arrayEnumerator?: Array_Enumerator<T>) {
    super();
    Object.setPrototypeOf(this, List.prototype);

    if (arguments.length === 1 && arrayEnumerator.constructor === Array_Enumerator) {
      this.AddRange(arrayEnumerator);
    }
  }

  AddRange(arrayEnumerator: Array_Enumerator<T>)
  AddRange(array: Array<T>)
  AddRange(arrayEnumeratorOrArray: any) {
    if (arrayEnumeratorOrArray.constructor === Array) {
      arrayEnumeratorOrArray.forEach((item: T) => {
        this.push(item);
      });
    }
    else {
      let e = arrayEnumeratorOrArray;
      while (e.MoveNext()) {
        this.push(e.Current);
      }
    }
  }

  get_Item(index: number): T {
    return this[index];
  }

  set_Item(index: number, value: T): void {
    if (index >= 0 && index < this.length)
      this[index] = value;
    else
      throw new Error("index out of bounds");
  }

  GetEnumerator(): Array_Enumerator<T> {
    return new Array_Enumerator<T>(this);
  }

  Remove(object: T): void {
    let index: number = this.indexOf(object);

    if (index > -1)
      this.RemoveAt(index);
  }

  RemoveAt(index: number): void {
    this.RemoveRange(index, 1);
  }

  RemoveRange(index: number, count: number): void {
    this.splice(index, count);
  }

  Insert(index: number, item: T): void {
    if (index >= 0 && index < this.length)
      this.splice(index, 0, item);
    else if (index === this.length) // inserting at end means append
      this.push(item);
    else
      throw new Error("index out of bounds");
  }

  Clear(): void {
    this.splice(0, this.length);
  }

  ToArray(): T[] {
    return this.slice(0);
  }

  Contains(object: T): boolean {
    return this.indexOf(object) > -1;
  }

  find(predicate: (value: T, index: number, obj: T[]) => boolean, thisArg?: any): T {
    let foundItem = super.find(predicate);
    if (isUndefined(foundItem))
      foundItem = null;

    return foundItem;
  }

  /// <summary>
  /// add null cells up to 'size' cells.
  /// </summary>
  /// <param name="size"></param>
  SetSize(size: number): void {
    while (this.length < size) {
      this.push(null);
    }

    if (this.length > size) {
      this.RemoveRange(size, this.length - size);
    }
  }
}
