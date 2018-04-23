import {IResultValue} from "./IResultValue";
import {StorageAttribute} from "@magic/utils";

/// <summary>
/// This class is introduced to read the result from server for any operation.
/// </summary>
export class ResultValue implements IResultValue {
  Value: string = null; // the result returned by the server
  Type: StorageAttribute = StorageAttribute.NONE; // the type of the result which is returned by the server

  /// <summary>
  ///   set result value by the Result command
  /// </summary>
  /// <param name = "result">the result computed by the server </param>
  /// <param name = "type">the type of the result which was computed by the server </param>
  SetResultValue(result: string, type: StorageAttribute): void {
    this.Value = result;
    this.Type = type;
  }
}
