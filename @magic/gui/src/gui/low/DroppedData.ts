import {ClipFormats} from "../../GuiEnums";

export class DroppedData {

  // Store the current selection of the control on which drop occurs.
  SelectionStart: number = 0;
  SelectionEnd: number = 0;
  X: number = 0;
  Y: number = 0;

  constructor() {

  }

  // only gui project is allowed to create an object

  /// <summary>
  ///   Clear the DataContent and the coordinates.
  /// </summary>
  Clean(): void {
    this.X = (this.Y = 0);
    this.SelectionStart = (this.SelectionEnd = 0);
  }

  /// <summary>
  ///   Set the data content of the dropped data.
  /// </summary>
  /// <param name = "Data">dropped data</param>
  /// <param name = "Format">format of the data</param>
  SetData(Data: string, Format: string): void {
  }

  ///<summary>
  ///  Get the Data according to Format.
  ///</summary>
  ///<param name = "clipFormat">Magic specific format</param>
  /// <param name="userFormatStr">if userFormat is specified, then use it as a format string</param>
  ///<returns></returns>
  GetData(clipFormat: ClipFormats, userFormatStr: string): string {
    return null;
  }

  /// <summary>
  ///   Check whether format is available in dropped data or not.
  /// </summary>
  /// <param name = "clipFormat"></param>
  /// <param name="userFormatStr">if userFormat is specified, then use it as a format string</param>
  /// <returns></returns>
  CheckDropFormatPresent(clipFormat: ClipFormats, userFormatStr: string): boolean {
    return false;
  }

  /// <summary>
  ///   check Magic specific format is supported or not.
  /// </summary>
  /// <param name = "format"></param>
  /// <returns></returns>
  static IsFormatSupported(format: ClipFormats): boolean {
    return DroppedData.GetFormatFromClipFormat(format) !== null;
  }

  /// <summary>
  ///   Returns the string format for a ClipFormat.
  /// </summary>
  /// <param name = "format">Magic specific format</param>
  /// <returns></returns>
  static GetFormatFromClipFormat(format: ClipFormats): string {
    return null;
  }

  /// <summary>
  ///  Translate the standard clipboard format into magic clip format.
  ///  It also check whether the UserFormat is supported or not.
  /// </summary>
  /// <param name = "format">Standard format</param>
  /// <returns>ClipFormat corrosponds to Standard format</returns>
  static GetClipFormatFromFormat(format: string): ClipFormats {
    return ClipFormats.FORMAT_UNKNOWN;
  }
}
