import {MenuEntry} from "./MenuEntry";

export class ToolbarInfo {
  private _count: number = 0;
  private _menuEntrySeperator: MenuEntry = null;

  /// <summary>
  /// </summary>
  constructor() {
    this._count = 0;
    this._menuEntrySeperator = null;
  }

  /// <summary> </summary>
  /// <returns> </returns>
  getCount(): number {
    return this._count;
  }


  /// <summary>
  /// </summary>
  /// <param name = "count"></param>
  setCount(count: number): void {
    this._count = count;
  }

  /// <summary>
  /// </summary>
  /// <returns></returns>
  getMenuEntrySeperator(): MenuEntry {
    return this._menuEntrySeperator;
  }

  /// <summary>
  /// </summary>
  /// <param name = "menuEntrySeperator"></param>
  setMenuEntrySeperator(menuEntrySeperator: MenuEntry): void {
    this._menuEntrySeperator = menuEntrySeperator;
  }
}
