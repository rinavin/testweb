import {IComparable} from "@magic/mscorelib";

/// <summary>
/// Our implementation of Priority _queue silimar to JDK 1.5 java.util.PriorityQueue. *
/// <p>
/// A priority _queue is unbounded, but has an internal <i>capacity</i> governing the Size of an array used to
/// store the elements on the _queue. It is always at least as large as the _queue Size. As elements are added to
/// a priority _queue, its capacity grows automatically. The details of the growth policy are not specified.
/// </summary>
export class MgPriorityQueue {
  private static DEFAULT_INITIAL_CAPACITY: number = 11;
  /// <summary> Priority _queue represented as a balanced binary heap: the two children of _queue[n] are _queue[2*n] and
  /// _queue[2*n + 1]. The priority _queue is ordered by comparator, or by the elements' natural ordering, if
  /// comparator is null: For each node n in the heap and each descendant d of n, n <= d.
  ///
  /// The element with the lowest value is in _queue[1], assuming the _queue is nonempty. (A one-based array is
  /// used in preference to the traditional 0-based array to simplify parent and child calculations.)
  ///
  /// _queue.length must be >= 2, even if Size == 0.
  /// </summary>
  private _queue: any[] = null;

  /// <summary> The number of elements in the priority _queue.</summary>
  Size: number = 0;

  /// <summary> Creates a <tt>PriorityQueue</tt> with the default initial capacity (11) that orders its elements
  /// according to their natural ordering.
  /// </summary>
  constructor() {
    this._queue = new Array<any>(MgPriorityQueue.DEFAULT_INITIAL_CAPACITY + 1);
    for (let _ai: number = 0; _ai < this._queue.length; ++_ai)
      this._queue[_ai] = null;
  }

  /// <summary> Inserts the specified element into this priority _queue.
  ///
  /// </summary>
  /// <returns> <tt>true</tt>
  /// </returns>
  /// <throws>  ClassCastException </throws>
  /// <summary>            if the specified element cannot be compared with elements currently in the priority _queue
  /// according to the priority _queue's ordering.
  /// </summary>
  /// <throws>  NullPointerException </throws>
  /// <summary>            if the specified element is <tt>null</tt>.
  /// </summary>
  offer(o: any): boolean {

    ++this.Size;

    // Grow backing store if necessary
    if (this.Size >= this._queue.length)
      this._queue.length = this.Size;

    this._queue[this.Size] = o;
    this.fixUp(this.Size);

    return true;
  }

  peek(): any {
    if (this.Size === 0)
      return null;

    return this._queue[1];
  }

  /// <summary> Returns <tt>true</tt> if _queue contains no elements.
  /// <p>
  ///
  /// This implementation returns <tt>Size() == 0</tt>.
  ///
  /// </summary>
  /// <returns> <tt>true</tt> if _queue contains no elements.
  /// </returns>
  isEmpty(): boolean {
    return this.Size === 0;
  }

  /// <summary> Removes all elements from the priority _queue. The _queue will be empty after this call returns.</summary>
  clear(): void {
    // Null out element references to prevent memory leak
    for (let i: number = 1; i <= this.Size; i++)
      this._queue[i] = null;

    this.Size = 0;
  }

  poll(): any {
    if (this.Size === 0)
      return null;

    let result: any = this._queue[1];
    this._queue[1] = this._queue[this.Size];

    this._queue[this.Size--] = null; // Drop extra ref to prevent memory leak
    if (this.Size > 1)
      this.fixDown(1);

    return result;
  }

  /// <summary> Establishes the heap invariant (described above) assuming the heap satisfies the invariant except
  /// possibly for the leaf-node indexed by k (which may have a nextExecutionTime less than its parent's).
  ///
  /// This method functions by "promoting" _queue[k] up the hierarchy (by swapping it with its parent)
  /// repeatedly until _queue[k] is greater than or equal to its parent.
  /// </summary>
  private fixUp(k: number): void {
    while (k > 1) {
      let j: number = k >> 1;

      if ((<IComparable>this._queue[j]).CompareTo(<IComparable>this._queue[k]) <= 0)
        break;

      let tmp: any = this._queue[j];
      this._queue[j] = this._queue[k];
      this._queue[k] = tmp;
      k = j;
    }
  }

  /// <summary> Establishes the heap invariant (described above) in the subtree rooted at k, which is assumed to satisfy
  /// the heap invariant except possibly for node k itself (which may be greater than its children).
  ///
  /// This method functions by "demoting" _queue[k] down the hierarchy (by swapping it with its smaller child)
  /// repeatedly until _queue[k] is less than or equal to its children.
  /// </summary>
  private fixDown(k: number): void {
    let j: number;
    while ((j = k << 1) <= this.Size && j > 0) {
      if (j < this.Size && (<IComparable>this._queue[j]).CompareTo(<IComparable>this._queue[j + 1]) > 0)
        j++;

      if ((<IComparable>this._queue[k]).CompareTo(<IComparable>this._queue[j]) <= 0)
        break;

      let tmp: any = this._queue[j];
      this._queue[j] = this._queue[k];
      this._queue[k] = tmp;
      k = j;
    }
  }
}
