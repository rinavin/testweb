export class MgPoint {
  x: number = 0;
  y: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

/// <summary>
/// float mgpoint
/// </summary>
export class MgPointF {
  x: number = 0;
  y: number = 0;

  constructor(x: number, y: number);
  constructor(point: MgPoint);
  constructor(xOrPoint: any, y?: number) {
    if (arguments.length === 2)
      this.constructor_0(xOrPoint, y);
    else
      this.constructor_1(xOrPoint);
  }

  private constructor_0(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  private constructor_1(point: MgPoint): void {
    this.x = point.x;
    this.y = point.y;
  }
}
