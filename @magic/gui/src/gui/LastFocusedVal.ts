import {GuiMgControl} from "./GuiMgControl";

/// <summary>
/// The class is used to store  control's edited value,
/// so it could be restored after current record is replaced by different chunk
/// </summary>
export class LastFocusedVal {
  guiMgControl: GuiMgControl = null;
  Line: number = 0;
  Val: string = null;

  constructor(guiMgControl: GuiMgControl, line: number, val: string) {
    this.guiMgControl = guiMgControl;
    this.Line = line;
    this.Val = val;
  }
}
