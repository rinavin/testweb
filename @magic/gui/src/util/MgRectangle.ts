import {MgPoint} from "./MgPoint";

export class MgRectangle {
  x: number = 0;
  y: number = 0;
  width: number = 0;
  height: number = 0;

  get IsEmpty(): boolean {
    return this.x === 0 && this.y === 0 && this.width === 0 && this.height === 0;
  }

  constructor(x: number, y: number, width: number, height: number);
  constructor();
  constructor(x?: number, y?: number, width?: number, height?: number) {

    if (arguments.length === 4)
      this.constructor_0(x, y, width, height);
    else
      this.constructor_1();
  }

  private constructor_0(x: number, y: number, width: number, height: number): void {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  private constructor_1(): void {
  }

  /// <summary> Returns the difference in size from the the specified rectangle. </summary>
  /// <param name="rectangle"></param>
  /// <returns></returns>
  GetSizeDifferenceFrom(rectangle: MgRectangle): MgPoint {
    let sizeDifference: MgPoint = new MgPoint(0, 0);

    sizeDifference.x = this.width - rectangle.width;
    sizeDifference.y = this.height - rectangle.height;

    return sizeDifference;
  }
}
