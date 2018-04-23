/// <summary>
///  Manages a compact array of bit values,
//   which are represented as Booleans, where true indicates that the bit is on (1) and false indicates the bit is off (0).
/// </summary>
export class BitArray {

  private array: Array<boolean> = null; // array of boolean values

  /// <summary>
  ///  returns the length of array
  /// </summary>
  /// <returns></returns>
  public get Length() {
    return this.array.length;
  }

  constructor(length: number) {
    this.array = new Array(length).fill(false);
  }

  /// <summary>
  /// get the value of flag at specified index
  /// </summary>
  /// <returns></returns>
  public Get(index: number): boolean {
    return this.array[index];
  }

  /// <summary>
  /// set the value of flag at specified index
  /// </summary>
  /// <returns></returns>
  public Set(index: number, value: boolean) {
    this.array[index] = value;
  }

  /// <summary>
  /// set all the flags with specified value
  /// </summary>
  /// <returns></returns>
  public SetAll(value: boolean): void {
    this.array.forEach(x => {
      x = value
    });
  }
}
