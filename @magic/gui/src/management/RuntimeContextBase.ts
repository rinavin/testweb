import {XmlParser} from "@magic/utils";
import {MgFormBase} from "./gui/MgFormBase";
import {MgControlBase} from "./gui/MgControlBase";
import {Manager} from "../Manager";
import {ApplicationException, NString} from "@magic/mscorelib";

export class RuntimeContextBase {
  private _insertMode: boolean = false;
  private _lastCoordinates: number[] = new Array<number>(4);
  ContextID: string = '\0';
  Parser: XmlParser = null; // xml parser
  FrameForm: MgFormBase = null; // form of the MDI/SDI frame
  LastClickedCtrlName: string = null;
  LastClickedMenuUid: number = 0; // program menu uid if executed from menu

  // CurrentClickedCtrl - always points to the current clickedCtrl. Initially null, but once clicked on any
  // control, it always points to this clicked ctrl. And, is reset back to null once we have successfully
  // parked on the parkable control.
  CurrentClickedCtrl: MgControlBase = null;

  CurrentClickedRadio: MgControlBase = null;
  DefaultStatusMsg: string = null;
  LastClickCoordinatesAreInPixels: boolean = false;

  constructor(contextID: string) {
    this.ContextID = contextID;
    this.LastClickedCtrlName = "";
    this._insertMode = true;
    Manager.SetCurrentContextID(contextID);
    this.Parser = new XmlParser();
  }

  SaveLastClickInfo(controlName: string, clientX: number, clientY: number, offsetX: number, offsetY: number, isInPixels: boolean): void {
    this._lastCoordinates[0] = offsetX; // Gives the X location of the last click, relative to the window
    this._lastCoordinates[1] = offsetY; // Gives the Y location of the last click, relative to the window
    this._lastCoordinates[2] = clientX; // Gives the X location of the last click, relative to the control within which the click occurred
    this._lastCoordinates[3] = clientY; // Gives the Y location of the last click, relative to the control within which the click occurred

    this.LastClickCoordinatesAreInPixels = isInPixels;

    this.LastClickedCtrlName = ""; // is empty string
    if (!NString.IsNullOrEmpty(controlName)) {
      this.LastClickedCtrlName = controlName;
    }
  }

  GetClickProp(index: number): number {
    if (index >= 0 && index < 4)
      return this._lastCoordinates[index];

    throw new ApplicationException("in RuntimeContextBase.getClickProp() illegal index: " + index);
  }

  /// <summary> return the InsertMode </summary>
  IsInsertMode(): boolean {
    return this._insertMode;
  }

  /// <summary> toggle the _insertMode (between insert and overwrite). </summary>
  ToggleInsertMode(): void {
    this._insertMode = !this._insertMode;
  }
}
