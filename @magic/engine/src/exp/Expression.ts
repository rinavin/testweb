import {List, NString, NNumber, NumberStyles} from "@magic/mscorelib";
import {StorageAttribute, Logger, Misc, Base64, XmlParser, XMLConstants} from "@magic/utils";
import {ExpVal, VectorType, RecordUtils, NUM_TYPE} from "@magic/gui";
import {IResultValue} from "../rt/IResultValue";
import {IClientCommand} from "../commands/IClientCommand";
import {CommandsTable} from "../CommandsTable";
import {ExpressionEvaluator} from "./ExpressionEvaluator";
import {Task} from "../tasks/Task";
import {RunTimeEvent} from "../event/RunTimeEvent";
import {ClientManager} from "../ClientManager";
import {CommandFactory} from "../commands/ClientToServer/CommandFactory";
import {ConstInterface} from "../ConstInterface";

/// <summary>
///   data for <exp ...> tag
/// </summary>
export class Expression implements IResultValue {
  private _cmdToServer: IClientCommand = null;
  private _cmdsToServer: CommandsTable = null;
  private _computeBy: string = '\0';
  private _expBytes: Int8Array = null;
  private _id: number = -1;
  private _prevResType: StorageAttribute = StorageAttribute.NONE;
  private _resultValue: string = null; // the result returned by the server
  private _task: Task = null;
  private _type: StorageAttribute = StorageAttribute.NONE; // the type of the result which is returned by the server

  /// <summary>
  ///   CTOR
  /// </summary>
  constructor() {
  }

  /// <summary>
  ///   evaluate the expression and return the result
  /// </summary>
  /// <param name = "resType">is the expected type </param>
  /// <param name = "length">of expected Alpha string </param>
  /// <returns> evaluated value or null if value evaluated to null (by ExpressionEvaluator) </returns>
  evaluateWithResultTypeAndLength(resType: StorageAttribute, length: number): string {
    let retVal: string;
    if (this.computedByClient()) {

      let expVal: ExpVal = ExpressionEvaluator.eval(this._expBytes, resType, this._task);

      if (expVal.IsNull)
        retVal = null;

      else if (resType === StorageAttribute.BLOB_VECTOR && expVal.Attr === StorageAttribute.BLOB) {
        if (VectorType.validateBlobContents(expVal.StrVal))
          retVal = expVal.ToMgVal();
        else
          retVal = null;
      }

      else if (expVal.Attr === StorageAttribute.BLOB_VECTOR && resType !== StorageAttribute.BLOB_VECTOR && resType !== StorageAttribute.BLOB)
        retVal = null;
      else
        retVal = expVal.ToMgVal();
    }
    else {
      let rtEvt: RunTimeEvent = ClientManager.Instance.EventsManager.getLastRtEvent();
      let mprgCreator: Task = null;

      if (rtEvt !== null)
        mprgCreator = rtEvt.getMainPrgCreator();

      // create a new command object only when necessary
      if (resType !== this._prevResType)
        this._cmdToServer = CommandFactory.CreateEvaluateCommand(this._task.getTaskTag(), resType, this._id, length, mprgCreator);
      ClientManager.Instance.execRequestWithSubformRecordCycle(this._cmdsToServer, this._cmdToServer, this);

      if (resType !== StorageAttribute.BLOB && resType !== StorageAttribute.BLOB_VECTOR)
        retVal = this._resultValue;
      else if (this._resultValue !== null && this._resultValue === " ")
        retVal = "";
      else
        retVal = RecordUtils.byteStreamToString(this._resultValue);
    }
    this._prevResType = resType;
    return retVal;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="resType"></param>
  /// <param name="length"></param>
  /// <returns></returns>
  DiscardCndRangeResult(): boolean {
    return ExpressionEvaluator.DiscardCndRangeResult(this._expBytes, this._task);
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="resType"></param>
  /// <returns></returns>
  evaluateWithResType(resType: StorageAttribute): ExpVal {
    let isNull: boolean = false;
    let expVal: ExpVal;

    if (this.computedByClient())
      expVal = ExpressionEvaluator.eval(this._expBytes, resType, this._task);

    else {
      let rtEvt: RunTimeEvent = ClientManager.Instance.EventsManager.getLastRtEvent();
      let mprgCreator: Task = null;

      if (rtEvt !== null)
        mprgCreator = rtEvt.getMainPrgCreator();

      // create a new command object only when necessary
      if (resType !== this._prevResType)
        this._cmdToServer = CommandFactory.CreateEvaluateCommand(this._task.getTaskTag(), resType, this._id, 0, mprgCreator);

      ClientManager.Instance.execRequestWithSubformRecordCycle(this._cmdsToServer, this._cmdToServer, this);

      let retVal: string;
      if (resType !== StorageAttribute.BLOB && resType !== StorageAttribute.BLOB_VECTOR)
        retVal = this._resultValue;
      else if (this._resultValue !== null && this._resultValue === " ")
        retVal = "";
      else
        retVal = RecordUtils.byteStreamToString(this._resultValue);

      if (retVal === null)
        isNull = true;

      // If we don't know what result type we got, and want to keep it, as in ExpCalc
      if (resType === StorageAttribute.NONE)
        resType = this._type;

      expVal = new ExpVal(resType, isNull, retVal);
    }
    this._prevResType = resType;
    return expVal;
  }


  /// <summary>
  ///   evaluate the expression and return the ReturnValue
  /// </summary
  evaluateWithResLength(length: number): Expression_ReturnValue {
    let resType: StorageAttribute = StorageAttribute.NONE;
    let val: string;
    if (this.computedByClient()) {
      let expVal: ExpVal = ExpressionEvaluator.eval(this._expBytes, resType, this._task);

      // even if actual dotnet obj is null, we need to return blobPrefix
      if (expVal.IsNull)
        val = null;
      else
        val = expVal.ToMgVal();

      resType = expVal.Attr;
    }
    else {
       val = this.evaluateWithResultTypeAndLength(resType, length);
       resType = this._type;
    }
    return new Expression_ReturnValue(val, resType);
  }

  /// <summary>
  ///   parse the expression
  /// </summary>
  public fillData(taskRef: Task): void {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;
    let tokensVector: List<String>;
    let endContext: number = parser.getXMLdata().indexOf(XMLConstants.TAG_TERM, parser.getCurrIndex());

    if (this._task == null)
      this._task = taskRef;

    if (endContext !== -1 && endContext < parser.getXMLdata().length) {
      // last position of its tag
      let tag: String = parser.getXMLsubstring(endContext);
      parser.add2CurrIndex(tag.indexOf(ConstInterface.MG_TAG_EXP) + ConstInterface.MG_TAG_EXP.length);
      tokensVector = XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);
      this.initElements(tokensVector);
      parser.setCurrIndex(endContext + XMLConstants.TAG_TERM.length);
    }
    else
      Logger.Instance.WriteExceptionToLogWithMsg("in Command.FillData() out of string bounds");
  }

  /// <summary>
  ///   parse the expression XML tag
  /// </summary>
  /// <param name = "tokensVector">the vector of attributes and their values
  /// </param>
  private initElements(tokensVector: List<String>): void {
    let expStr: string;
    let attribute: String, valueStr;

    for (let j: number = 0; j < tokensVector.length; j += 2) {
      attribute = (tokensVector.get_Item(j));
      valueStr = (tokensVector.get_Item(j + 1));

      switch (attribute) {
        case XMLConstants.MG_ATTR_VALUE:
          // if we work in hex
          if (ClientManager.Instance.getEnvironment().GetDebugLevel() > 1) {
            expStr = valueStr;
            this.buildByteArray(expStr);
          }
          else
            this._expBytes = Misc.ToSByteArray(Base64.decodeToByte(valueStr));
          break;

        case XMLConstants.MG_ATTR_ID:
          this._id = XmlParser.getInt(valueStr);
          break;

        case ConstInterface.MG_ATTR_COMPUTE_BY:
          this._computeBy = valueStr[0];
          break;

        default:
          Logger.Instance.WriteExceptionToLogWithMsg("There is no such tag in Expression.initElements class. Insert case to Expression.initElements for " + attribute);
          break;
      }
    }
    if (!this.computedByClient())
      this._cmdsToServer = this._task.getMGData().CmdsToServer;
  }

  /// <summary>
  ///   Build the expression as a byte array
  /// </summary>
  private buildByteArray(expStr: string): void {
    if (expStr === null || expStr.length === 0 || expStr.length % 2 > 0) {
      Logger.Instance.WriteExceptionToLogWithMsg("in Expression.buildByteArray() expStr cannot be changed " + expStr);
      return;
    }

    this._expBytes = new Int8Array(expStr.length / 2);
    for (let i: number = 0; i < expStr.length; i = i + 2) {
      let twoHexDigits: string = expStr.substr(i, 2);
      this._expBytes[i / 2] = NUM_TYPE.toSByte(NNumber.Parse(twoHexDigits, NumberStyles.HexNumber));
    }
  }

  /// <summary>
  ///   get ID of the Expression
  /// </summary>
  getId(): number {
    return this._id;
  }

  /// <summary>
  ///   returns true if the expression may be computed by the Client
  /// </summary>
  private computedByClient(): boolean {
    return this._computeBy !== 'S'/*'S'*/; // i.e, Client or Don't care
  }

  /// <summary>
  ///   returns true if the expression can be computed ONLY by the Client
  /// </summary>
  computedByClientOnly(): boolean {
    return this._computeBy === 'C'/*'C'*/;
  }

  /// <summary>
  ///   returns true if the expression can be computed ONLY by the Server
  /// </summary>
  computedByServerOnly(): boolean {
    return this._computeBy === 'S'/*'S'*/;
  }

  /// <summary>
  ///   returns the task
  /// </summary>
  getTask(): Task {
    return this._task;
  }

  /// <summary>
  ///   set result value by the Result command
  /// </summary>
  /// <param name = "result">the result computed by the server
  /// </param>
  /// <param name = "type_">the type of the result which was computed by the server
  /// </param>
  SetResultValue(result: string, type_: StorageAttribute): void {
    this._resultValue = result;
    this._type = type_;
  }

  toString(): string {
    return NString.Format("{{Expression #{0} of {1}}}", this._id, this._task);
  }
}

/// <summary>
///   represents the returned evaluated expression value and it's type (attribute)
/// </summary>
export class Expression_ReturnValue {
  mgVal: string = null;
  type: StorageAttribute = StorageAttribute.NONE;

  /// <summary>
  ///   CTOR
  /// </summary>
  constructor(mgVal_: string, type_: StorageAttribute) {
    this.mgVal = mgVal_;
    this.type = type_;
  }
}
