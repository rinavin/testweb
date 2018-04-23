import {List} from "@magic/mscorelib";

/// <summary> implementation of a general queue</summary>
export class Queue<T> {
  private _queueVec: List<T> = null;

  /// <summary> </summary>
  constructor() {
    this._queueVec = new List<T>();
  }

  /// <summary> returns the first object in the queue</summary>
  get(): any {
    let returnValue: T = null;

    if (this._queueVec.length > 0) {
      returnValue = this._queueVec.get_Item(0);
      this._queueVec.RemoveAt(0);
    }

    return returnValue;
  }

  /// <summary> add an object to the end of the queue</summary>
  /// <param name="obj">the object to add
  put(obj: T): void {
    this._queueVec.push(obj);
  }

  /// <summary> remove all the objects from the queue</summary>
  clear(): void {
    this._queueVec.Clear();
  }

  /// <summary> returns true if the queue is empty</summary>
  isEmpty(): boolean {
    return this._queueVec.length === 0;
  }

  /// <summary> returns size of the queue</summary>
  Size(): number {
    return this._queueVec.length;
  }
}
