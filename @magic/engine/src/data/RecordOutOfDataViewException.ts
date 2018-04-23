import {ApplicationException} from "@magic/mscorelib";

export enum RecordOutOfDataViewException_ExceptionType {
  TOP,
  BOTTOM,
  REC_SUFFIX_FAILED,
  NONE
}

export class RecordOutOfDataViewException extends ApplicationException {
  // MEMBERS
  private _type: RecordOutOfDataViewException_ExceptionType = RecordOutOfDataViewException_ExceptionType.NONE;

  /// <summary> CTOR</summary>
  /// <param name="type">the type </param>
  constructor(type: RecordOutOfDataViewException_ExceptionType) {
    super((type === RecordOutOfDataViewException_ExceptionType.REC_SUFFIX_FAILED) ? "Record Suffix Failed" :
      ("Record out of the " + ((type === RecordOutOfDataViewException_ExceptionType.TOP) ? "top" : "bottom") + " bound of the Data View"));
    this._type = type;
    this.name = "RecordOutOfDataViewException";
  }

  /// <summary> get the end of the Data View: T for top end, B for bottom end</summary>
  getEnd(): RecordOutOfDataViewException_ExceptionType {
    return this._type;
  }

  /// <summary> returns true if record is not found in the dataview</summary>
  /// <returns>
  /// </returns>
  noRecord(): boolean {
    return this._type === RecordOutOfDataViewException_ExceptionType.TOP || this._type === RecordOutOfDataViewException_ExceptionType.BOTTOM;
  }
}
