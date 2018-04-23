import {IComparable} from "@magic/mscorelib";

/// <summary>Class for JAVA 1.1 containing static methods to sort an arbitrary array
/// of JAVA objects which implement the IComparable interface.
/// </summary>
export class HeapSort {
  private static left(i: number): number {
    return 2 * i + 1;
  }

  private static right(i: number): number {
    return 2 * i + 2;
  }

  /// <summary>Sort array, rearranging the entries in array to be in
  /// sorted order.
  /// </summary>
  static sort(array: IComparable[]): void {
    let sortsize: number = array.length;
    let temp: IComparable;
    let largest: number, i: number, l: number, r: number;

    if (sortsize <= 1)
      return;

    let top: number = sortsize - 1;
    let t: number = Math.floor(sortsize / 2);

    do {
      t = t - 1;
      largest = t;

      /* heapify */

      do {
        i = largest;
        l = HeapSort.left(largest);
        r = HeapSort.right(largest);

        if (l <= top) {
          if (array[l].CompareTo(array[i]) > 0)
            largest = l;
        }
        if (r <= top) {
          if (array[r].CompareTo(array[largest]) > 0)
            largest = r;
        }
        if (largest !== i) {
          temp = array[largest];
          array[largest] = array[i];
          array[i] = temp;
        }
      }
      while (largest !== i);
    }
    while (t > 0);

    t = sortsize;

    do {
      top = top - 1;
      t = t - 1;

      let here: number = t;

      temp = array[here];
      array[here] = array[0];
      array[0] = temp;

      largest = 0;

      do {
        i = largest;
        l = HeapSort.left(largest);
        r = HeapSort.right(largest);

        if (l <= top) {
          if (array[l].CompareTo(array[i]) > 0) {
            largest = l;
          }
        }
        if (r <= top) {
          if (array[r].CompareTo(array[largest]) > 0) {
            largest = r;
          }
        }
        if (largest !== i) {
          temp = array[largest];
          array[largest] = array[i];
          array[i] = temp;
        }
      }
      while (largest !== i);
    }
    while (t > 1);
  }
}

