import {StorageAttribute} from "@magic/utils";

/// <summary>
/// Interface for setting Result Value.
/// </summary>
export interface IResultValue {
  /// <summary>
  /// set the result value and it's type.
  /// </summary>
  /// <param name="exp"></param>
  SetResultValue(result: string, type: StorageAttribute): void;
}
