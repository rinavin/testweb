import {XmlParser, StorageAttribute} from "@magic/utils";
import {DisplayConvertor} from "@magic/gui";
import {Expression} from "./Expression";
import {Task} from "../tasks/Task";

/// <summary>
///   YesNoExp class represent a Yes/No/Expression combination
/// </summary>
export class YesNoExp {
  private _exp: Expression = null;
  private _val: boolean = false;

  constructor(defaultVal: boolean) {
    this._val = defaultVal;
    this._exp = null;
  }

  /// <summary>
  ///   set the value of the Yes/No/Expression
  /// </summary>
  /// <param name = "task">the task to look for expression</param>
  /// <param name = "strVal">the string that contains the Yes/No/Expression</param>
  setVal(task: Task, strVal: string): void {

    switch (strVal[0]) {
      case 'Y':
        this._val = true;
        break;

      case 'N':
        this._val = false;
        break;

      default:
        let expId: number = XmlParser.getInt(strVal);
        if (task != null)
          this._exp = task.getExpById(expId);
        break;
    }
  }

  /// <summary>
  ///   returns the value of the Yes/No/Expression
  /// </summary>
  getVal(): boolean {
    if (this._exp !== null)
      return DisplayConvertor.toBoolean(this._exp.evaluateWithResultTypeAndLength(StorageAttribute.BOOLEAN, 0));

    return this._val;
  }

  /// <summary>
  ///   returns true if an expression exists and it is a server side one
  /// </summary>
  isServerExp(): boolean {
    if (this._exp != null)
      return this._exp.computedByServerOnly();
    return false;
  }

  /// <summary>
  ///   returns true if an expression exists and it is a client side one
  /// </summary>
  isClientExp(): boolean {

    if (this._exp != null)
      return this._exp.computedByClientOnly();
    return false;
  }
}
