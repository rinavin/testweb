import {YesNoExp} from "../exp/YesNoExp";
import {Task} from "../tasks/Task";
import {List, Dictionary, NString, RefParam} from "@magic/mscorelib";
import {Boundary} from "./Boundary";
import {Field} from "../data/Field";
import {LnkEval_Cond, LnkMode, Logger, StorageAttribute, XMLConstants, XmlParser} from "@magic/utils";
import {FieldsTable} from "../data/FieldsTable";
import {DisplayConvertor, IRecord, PIC} from "@magic/gui";
import {ClientManager} from "../ClientManager";
import {Record} from "../data/Record";
import {ConstInterface} from "../ConstInterface";

/// <summary>
///   Summary description for Link.
/// </summary>
export abstract class DataviewHeaderBase {
  _cond: YesNoExp = null;  // will be generated or from the link condition or from the link condition value tag
  _task: Task = null;
  Loc: List<Boundary> = null;
  _dir: string = '\0';
  _id: number = 0; // the id of the link in the task
  _keyIdx: number = 0; // the key (from the tableCache) that this

  private _retVal: string = null;

  /// <summary>
  /// do not use directly
  /// </summary>
  private returnfield: Field = null;
  _linkEvalCondition: LnkEval_Cond;

  get ReturnField(): Field {
    if (this.returnfield === null && this._retVal !== null)
      this.returnfield = <Field>this.Task.getFieldByValueStr(this._retVal);
    return this.returnfield;
  }

  /// <summary>
  /// link Mode
  /// </summary>
  Mode: LnkMode;
  LinkStartAfterField: number = 0;
  KeyExpression: number = 0;

  /// <summary>
  /// true if this link represents Main source
  /// </summary>
  get IsMainSource(): boolean {
    return this._id === -1;
  }

  /// <summary>
  /// Task
  /// </summary>
  get Task(): Task {
    return this._task;
  }

  /// <summary>
  /// Fields
  /// </summary>
  get Fields(): List<Field> {
    return (<FieldsTable>this._task.DataView.GetFieldsTab()).getLinkFields(this._id);
  }

  get Id(): number {
    return this._id;
  }

  get LinkEvaluateCondition(): LnkEval_Cond {
    return this._linkEvalCondition;
  }

  /// <summary>
  ///   initialize the link for a given task
  /// </summary>
  constructor(task: Task) {
    this._task = task;
    this._keyIdx = -1;
    this._cond = new YesNoExp(true);
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="attributes"></param>
  SetAttributes(attributes: Dictionary<string>): void {
    let keys: string[] = attributes.Keys;
    keys.forEach((text: string) => {
      this.setAttribute(text, attributes.get_Item(text));
    });
  }

  /// <summary>
  ///   parse the link XML tag
  /// </summary>
  /// <param name = "tokensVector">the vector of attributes and their values</param>
  protected setAttribute(attribute: string, valueStr: string): void {
    switch (attribute) {
      case XMLConstants.MG_ATTR_ID:
        this._id = XmlParser.getInt(valueStr);
        break;
      case ConstInterface.MG_ATTR_KEY:
        this._keyIdx = XmlParser.getInt(valueStr);
        break;
      case ConstInterface.MG_ATTR_KEY_EXP:
        this.KeyExpression = XmlParser.getInt(valueStr);
        break;
      case ConstInterface.MG_ATTR_DIR:
        this._dir = valueStr[0];
        break;
      case ConstInterface.MG_ATTR_COND:
      case ConstInterface.MG_ATTR_COND_RES:
        this._cond.setVal(this._task, valueStr);
        break;
      case ConstInterface.MG_ATTR_RET_VAL:
        this._retVal = valueStr;
        break;
      case ConstInterface.MG_ATTR_LINK_EVAL_CONDITION:
        this._linkEvalCondition = <LnkEval_Cond>valueStr[0];
        break;
      case ConstInterface.MG_ATTR_LINK_MODE:
        this.Mode = <LnkMode>valueStr[0];
        break;
      case ConstInterface.MG_ATTR_LINK_START:
        this.LinkStartAfterField = XmlParser.getInt(valueStr);
        break;
      default:
        Logger.Instance.WriteExceptionToLogWithMsg(NString.Format("Unrecognized attribute: '{0}'", attribute));
        break;
    }
  }

  /// <summary>
  /// update link result
  /// </summary>
  /// <param name="curRec">current record</param>
  /// <param name="ret">link success</param>
  SetReturnValue(curRec: IRecord, ret: boolean, recompute: boolean): void {
    let returnField: Field = this.ReturnField;

    if (returnField !== null) {
      let enforceVariableChange: boolean = returnField.getTask() !== this.Task;

      // if we are fetching first chunk we didn't updated the executuion stack yet
      ClientManager.Instance.EventsManager.pushNewExecStacks();
      // same as NonRecomputeVarChangeEvent on server fetch.cpp

      // if the return field is numeric, then convert result value toNum() before passing to setValueAndStartRecompute().
      let result: string = ret ? "1" : "0";
      if (returnField.getType() === StorageAttribute.NUMERIC)
        result = DisplayConvertor.Instance.toNum(result, new PIC(returnField.getPicture(), StorageAttribute.NUMERIC, 0), 0);

      returnField.setValueAndStartRecompute(result, false, recompute, false, false, enforceVariableChange);

      ClientManager.Instance.EventsManager.popNewExecStacks();

      if (!recompute)
        returnField.setModified();

      returnField.invalidate(true, false);

      // If field is from another task, need to update the display as well
      if (returnField.getTask() !== this.Task)
        returnField.updateDisplay();
    }
  }

  EvaluateLinkCondition(): boolean {
    return this._cond.getVal();
  }

  abstract getLinkedRecord(curRec: Record): boolean ;

  /// <summary>
  /// initialize link fields
  /// </summary>
  /// <param name="currRec"></param>
  public InitLinkFields(currRec: IRecord): void {

    // nit the cureent rec fields that belong to the link

    for (let i: number = 0; i < this.Fields.length; i++) {
      let field: Field = this.Fields.get_Item(i);

      let isNull: RefParam<boolean> = new RefParam(field.isNull());
      let result: RefParam<string> = new RefParam(field.getValue(false));
      field.getInitExpVal(result, isNull);
      // this function knows to take either the null value or the defualt value
      (<Record>currRec).SetFieldValue(field.getId(), isNull.value, result.value);
      field.invalidate(true, false);
    }
  }
}
