import {ApplicationException, Debug, List, NNumber, NString, RefParam} from "@magic/mscorelib";
import {
  Constants,
  InternalInterface,
  Logger,
  MsgInterface,
  PICInterface,
  StorageAttribute,
  StrUtil,
  UtilStrByteMode,
  XMLConstants,
  XmlParser
} from "@magic/utils";
import {
  BlobType,
  DisplayConvertor,
  ExpVal,
  Field as FieldBase,
  FieldDef,
  MgControlBase,
  NUM_TYPE,
  PIC,
  VectorType
} from "@magic/gui";

import {YesNoExp} from "../exp/YesNoExp";
import {Expression} from "../exp/Expression";
import {ExpressionEvaluator} from "../exp/ExpressionEvaluator";
import {MgForm} from "../gui/MgForm";
import {MgControl} from "../gui/MgControl";
import {Recompute, Recompute_RcmpBy} from "../rt/Recompute";
import {Boundary} from "../rt/Boundary";
import {ArgumentsList} from "../rt/ArgumentsList";
import {ConstInterface} from "../ConstInterface";
import {ClientManager} from "../ClientManager";
import {GUIManager} from "../GUIManager";
import {Task} from "../tasks/Task";
import {RunTimeEvent} from "../event/RunTimeEvent";
import {Record} from "./Record";
import {DataView} from "./DataView";
import {isNullOrUndefined} from "util";

/// <summary>
///   data for <fldh ...>
/// </summary>
export class Field extends FieldBase {
  static CLEAR_FLAGS: boolean = true;
  static LEAVE_FLAGS: boolean = false;

  private static NUM0: NUM_TYPE = null;
  private static NUM1: NUM_TYPE = null;

  private _linkExp: YesNoExp = null;
  private _recompute: Recompute = null;
  CacheTableFldIdx: number = 0;
  private _causeTableInvalidation: boolean = false; // change in this field will cause invalidation of all rows in table
  private _form: MgForm = null;
  private _hasChangeEvent: boolean = false; // if TRUE, there is a handler to run when this field is updated
  private _hasZoomHandler: boolean = false; // if TRUE, there is a zoom handler for this field
  private _inEvalProcess: boolean = false;
  private _initExp: Expression = null;
  private _invalidValue: boolean = true;
  private _isLinkFld: boolean = false; // if TRUE, it means that the field belongs to a link
  private _isVirtual: boolean = false;
  private _dataviewHeaderId: number = -1;  // members related to table cache
  private _linkCreate: boolean = false; // If true then it's a real field which belongs to link create.
  Locate: Boundary = null;
  Range: Boundary = null;
  private _isParam: boolean = false;
  private _isExposedRouteParam: boolean = false;
  private _prevIsNull: boolean = false;
  private _prevValue: string = null;
  private _tableName: string = null;
  private _indexInTable: number = -1;

  private _virAsReal: boolean = false; // If true then a virtual field is computed as real (needed for link ret value)
  protected _val: string = null;
  private modifiedAtLeastOnce: boolean = false;
  private _isNull: boolean = false;
  private _clearVectorType: boolean = true; // do we need to update the vector object
  private _vectorType: VectorType = null; // the vector representation

  IsEventHandlerField: boolean = false;

  /// <summary>
  ///   CTOR
  /// </summary>
  /// <param name = "dataview">a reference to the dataview</param>
  /// <param name = "id">counter of the field in FieldTable</param>
  constructor(dataview: DataView, id: number) {
    super(id);
    if (Field.NUM0 === null) {
      Field.NUM0 = new NUM_TYPE();
      Field.NUM1 = new NUM_TYPE();
      Field.NUM0.NUM_4_LONG(0);
      Field.NUM1.NUM_4_LONG(1);
    }

    this._dataview = dataview;
    this._linkExp = new YesNoExp(false);
    FieldDef._default_date = DisplayConvertor.Instance.disp2mg(PICInterface.DEFAULT_DATE, null,
      new PIC("6", StorageAttribute.NUMERIC, super.getTask().getCompIdx()),
      super.getTask().getCompIdx(),
      BlobType.CONTENT_TYPE_UNKNOWN);
  }


  get VirAsReal(): boolean {
    return this._virAsReal;
  }

  get IsVirtual(): boolean {
    return this._isVirtual;
  }

  get IsExposedRouteParam(): boolean {
    return this._isExposedRouteParam;
  }

  /// <summary>
  /// index in table
  /// </summary>
  get IndexInTable(): number {
    return this._indexInTable;
  }

  /// <summary>
  ///   set the field attribute
  /// </summary>
  protected setAttribute(attribute: string, valueStr: string): boolean {
    let isTagProcessed: boolean = super.setAttribute(attribute, valueStr);
    if (!isTagProcessed) {
      let data: string[] = StrUtil.tokenize(valueStr, ",");
      isTagProcessed = true;
      switch (attribute) {
        case ConstInterface.MG_ATTR_VIRTUAL:
          this._isVirtual = (XmlParser.getInt(valueStr) !== 0);
          break;
        case ConstInterface.MG_ATTR_PARAM:
          this._isParam = (XmlParser.getInt(valueStr) !== 0);
          if (!this._isVirtual && this._isParam)
          // possible error - we rely on the order of XML attributes
            throw new ApplicationException(
              "in Field.initElements(): non virtual field is defined as a parameter");
          break;
        case ConstInterface.MG_ATTR_EXPOSED_ROUTE_PARAMS:
          this._isExposedRouteParam = (XmlParser.getInt(valueStr) !== 0);
          if (!this._isParam && this._isExposedRouteParam)
          // possible error - we rely on the order of XML attributes
            throw new ApplicationException(
              "in Field.initElements(): non parameter field is defined as a exposed route parameter");
          break;

        case ConstInterface.MG_ATTR_VIR_AS_REAL:
          this._virAsReal = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_LNK_CREATE:
          this._linkCreate = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_LNKEXP:
          this._linkExp.setVal(<Task>(this.getTask()), valueStr);
          break;
        case ConstInterface.MG_ATTR_TABLE_NAME:
          this._tableName = XmlParser.unescape(valueStr);
          break;
        case ConstInterface.MG_ATTR_INDEX_IN_TABLE:
          this._indexInTable = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_INIT:
          let expNum: number = XmlParser.getInt(valueStr);
          this._initExp = (<Task>this.getTask()).getExpById(expNum);
          break;
        case XMLConstants.MG_ATTR_NAME: {

        }
          break;
        case ConstInterface.MG_ATTR_CHACHED_FLD_ID:
          // MG_ATTR_CHACHED_FLD is in the format of cachedTableId,fld
          this.CacheTableFldIdx = NNumber.Parse(data[1]);
          break;
        case ConstInterface.MG_ATTR_LOCATE:
          // locate is in the format of max,min expression num (-1 if non exists)
          this.Locate = new Boundary(<Task>this.getTask(), NNumber.Parse(data[1]), NNumber.Parse(data[0]), this.getType(), this.getSize(), this.CacheTableFldIdx);
          break;
        case ConstInterface.MG_ATTR_RANGE:
          // range is in the format of max,min expression num (-1 if non exists)
          this.Range = new Boundary(<Task>this.getTask(), NNumber.Parse(data[1]), NNumber.Parse(data[0]), this.getType(), this.getSize(), this.CacheTableFldIdx);
          break;
        case ConstInterface.MG_ATTR_LINK:
          this._dataviewHeaderId = NNumber.Parse(valueStr);
          break;
        case ConstInterface.MG_ATTR_IS_LINK_FIELD:
          this._isLinkFld = XmlParser.getBoolean(valueStr);
          break;
        default:
          isTagProcessed = false;
          Logger.Instance.WriteExceptionToLogWithMsg(NString.Format("Unrecognized attribute: '{0}'", attribute));
          break;
      }
    }
    return isTagProcessed;
  }

  /// <summary>
  ///   set a reference to the Recompute Object of this field
  /// </summary>
  /// <param name = "recompRef">reference to Recompute Object</param>
  setRecompute(recompRef: Recompute): void {
    this._recompute = recompRef;
  }

  /// <summary>
  /// Removes the specific subform task from the recompute
  /// </summary>
  /// <param name="subformTask"></param>
  RemoveSubformFromRecompute(subformTask: Task): void {
    if (this._recompute !== null) {
      this._recompute.RemoveSubform(subformTask);
    }
  }

  /// <summary>
  /// Insert the specific subform task into the field recompute
  /// </summary>
  /// <param name="subformTask"></param>
  AddSubformRecompute(subformTask: Task): void {
    if (this._recompute === null) {
      this._recompute = new Recompute();
      this._recompute.Task = <Task>super.getTask();
      this._recompute.OwnerFld = this;
      this._recompute.RcmpMode = Recompute_RcmpBy.CLIENT;
    }
    this._recompute.AddSubform(subformTask);
  }


  /// <summary>
  ///   set a reference to a control attached to this field
  /// </summary>
  /// <param name = "ctrl">the control which is attached to this field</param>
  SetControl(ctrl: MgControlBase): void {
    super.SetControl(ctrl);

    if (this._isVirtual && ctrl.IsRepeatable && this._initExp === null) {
      this._causeTableInvalidation = true;
    }
  }

  /// <summary>
  ///   compute the field init expression or get its value from the dataview, set
  ///   the value of the field (and update the display)
  /// </summary>
  /// <param name = "recompute">tells the compute to start the recompute chain and recompute
  ///   the expression of this field (if it is real)
  /// </param>
  public compute(recompute: boolean): void {
    let result: RefParam<string> = new RefParam(this.getValue(false));
    let isNullFld: RefParam<boolean> = new RefParam(this._isNull);
    let rec = (<DataView>this._dataview).getCurrRec();
    let task = <Task>super.getTask();

    let zeroReal: boolean = this._linkCreate && rec.InCompute && !recompute && task.getMode() === Constants.TASK_MODE_CREATE;
    // QCR #999024 - zero lnk create values during compute

    if (this._form == null)
      this._form = <MgForm>task.getForm();

    // no need to zero reals if we are recovering a record.
    if ((this._form != null && this._form.InRestore) || ClientManager.Instance.EventsManager.GetStopExecutionFlag())
      zeroReal = false;

    let rtEvt: RunTimeEvent = ClientManager.Instance.EventsManager.getLastRtEvent();
    let computeOnCancelEvent: boolean = false;
    if (rtEvt != null)
      computeOnCancelEvent = rtEvt.getInternalCode() === InternalInterface.MG_ACT_CANCEL;

    // virtual as real is especially for fields which are used as a "return value"
    // of a link. Their value is returned by the link result and not by the init expression.
    // when the form is restoring the curr row we shouldn't compute the init expression
    // but to use the value from the record (by getValue)
    // QCR#926758: When Task's mode is Create, init for real field should be evaluated only when it comes for cancel event(last runtime event is cancel event).
    // While creating a new record, init will be evaluated because of condition rec.isNewRec(). (It is the refix of QCR#994072)
    if (!this._virAsReal && (this._form == null || !this._form.InRestore) &&
      ((this._isVirtual || (task.getMode() === Constants.TASK_MODE_CREATE && computeOnCancelEvent)) || recompute ||
        zeroReal || rec.isNewRec() && !rec.isComputed())) {
      if (!task.DataView.isEmptyDataview() || (task.DataView.isEmptyDataview() && !this.PartOfDataview)) {
        // QCR #775508: for dataviews, which are computed by the server, prevent
        // computing the init expression while in compute of the record because the
        // server have already done it
        if ((this._isVirtual || task.getMode() === Constants.TASK_MODE_CREATE) || (<DataView>this._dataview).computeByClient() ||
          !rec.InCompute || zeroReal || rec.lateCompute()) {
          if (this._initExp != null) {


            this.EvaluateInitExpression(result, isNullFld);
          }
          else if (zeroReal)
            result.value = this.getDefaultValue();
        }
      }
    }
    if (this._invalidValue) {
      this._prevValue = result.value;
      this._prevIsNull = isNullFld.value;
    }
    this.setValue(result.value, isNullFld.value, recompute, false, recompute && !this._isVirtual, false, false);
  }


  /// <summary>
  /// evaluate init expression
  /// </summary>
  /// <param name="result"></param>
  /// <param name="isNullFld"></param>
  EvaluateInitExpression(result: RefParam<string>, isNullFld: RefParam<boolean>): void {
    Debug.Assert(this._initExp !== null);
    try {
      this._inEvalProcess = true;
      result.value = this._initExp.evaluateWithResultTypeAndLength(this._type, this._size);
    }
    finally {
      this._inEvalProcess = false;
    }

    isNullFld.value = (result.value === null);
    if (isNullFld.value && this.NullAllowed) {
      result.value = this.getValue(false);
    }
  }

  ///// <summary>
  /////
  ///// </summary>
  ///// <param name="recompute"></param>
  ///// <returns></returns>
  // bool ShouldRecompute(bool recompute)
  // {
  //   if (recompute)
  //   {
  //      bool computedByFetch = !IsVirtual || VirAsReal;
  //      if (computedByFetch)
  //      {
  //         Task task = (Task)getTask();
  //         DataviewHeaderBase header = task.getDataviewHeaders().getDataviewHeaderById(_dataviewHeaderId);
  //         //local datavase already computed the record as server does
  //         if (header is LocalDataviewHeader)
  //         {
  //             var rec = ((DataView)_dataview).getCurrRec();
  //             return !rec.InCompute;
  //         }
  //      }
  //   }
  //   return recompute;
  // }

  /// <summary>
  ///   get the value of the field from the current record
  /// </summary>
  /// <param name = "checkNullArithmetic">if true then the null arithmetic environment
  ///   setting is used to return null when "nullify" computation is needed
  /// </param>
  getValue(checkNullArithmetic: boolean): string {
    // if we need to return the original value of the field
    if ((<Task>super.getTask()).getEvalOldValues())
      return this.getOriginalValue();
    if (this._invalidValue)
      this.takeValFromRec();
    if (this._isNull)
      this._val = this.getValueForNull(checkNullArithmetic);
    return this._val;
  }

  /// <summary>
  /// </summary>
  /// <param name = "newValue"></param>
  /// <param name = "isNull"></param>
  /// <returns></returns>
  private isChanged(newValue: string, isNull: boolean): boolean {
    return this._prevValue !== null && (!(this._prevValue === newValue) || this._prevIsNull !== isNull);
  }

  /// <summary>
  ///   set the value of the field by taking it from the current record
  /// </summary>
  takeValFromRec(): void {
    let rec: Record = (<DataView>this._dataview).getCurrRec();
    if (rec !== null) {
      this._val = rec.GetFieldValue(this._id);
      this._isNull = rec.IsNull(this._id);
    }
    if (this._invalidValue) {
      if (rec !== null && this._causeTableInvalidation && this.isChanged(this._val, this._isNull) && this._form !== null) {
        rec.setCauseInvalidation(true);
      }
      this._prevValue = this._val;
      this._prevIsNull = this._isNull;
      this._invalidValue = false;
    }
    // ZERO THE VECTOR OBJECT
    this._vectorType = null;
  }

  /// <summary>
  ///   get the original value of the field without updating the field value
  /// </summary>
  getOriginalValue(): string {
    let originalRec: Record = (<DataView>this._dataview).getOriginalRec();

    if (originalRec.IsNull(this._id))
      return this.getMagicDefaultValue();

    return originalRec.GetFieldValue(this._id);
  }

  /// <summary>
  ///   is original value of the field was null
  /// </summary>
  isOriginalValueNull(): boolean {
    let originalRec: Record = (<DataView>this._dataview).getOriginalRec();
    return originalRec.IsNull(this._id);
  }

  /// <summary>
  ///   get value by rec idx
  /// </summary>
  /// <param name = "idx">record idx</param>
  /// <returns></returns>
  getValueByRecIdx(idx: number): string {
    let rec: Record = (<DataView>this._dataview).getRecByIdx(idx);
    let fieldValue: string = rec.GetFieldValue(this._id);
    return rec.IsNull(this._id) ? this.getValueForNull(false) : fieldValue;
  }

  /// <summary>
  ///   get modifiedAtLeastOnce flag
  /// </summary>
  /// <returns></returns>
  getModifiedAtLeastOnce(): boolean {
    return this.modifiedAtLeastOnce;
  }

  /// <summary>
  ///   return null if value of field for the record is null
  /// </summary>
  /// <param name = "idx">record idx</param>
  /// <returns></returns>
  isNullByRecIdx(idx: number): boolean {
    let rec: Record = (<DataView>this._dataview).getRecByIdx(idx);
    return rec.IsNull(this._id);
  }

  /// <summary>
  ///   returns true if field's value for record idx recidx equals to mgValue
  /// </summary>
  /// <param name="mgValue">value to compare  </param>
  /// <param name="isNullFld"></param>
  /// <param name="type">type of value</param>
  /// <param name="recIdx">recIdx of the record</param>
  /// <returns></returns>
  isEqual(mgValue: string, isNullFld: boolean, type: StorageAttribute, recIdx: number): boolean {
    let rec = <Record>((<DataView>this._dataview).getRecByIdx(recIdx));
    let valsEqual: boolean = false;
    if (rec != null) {
      let fieldValue: string = rec.GetFieldValue(this._id);
      let fielsIsNull: boolean = rec.IsNull(this._id);
      valsEqual = ExpressionEvaluator.mgValsEqual(fieldValue, fielsIsNull, this._type, mgValue, isNullFld, type);
    }
    return valsEqual;
  }

  /// <summary>
  ///   returns the value of this field which should be inserted into a new rec, when it
  ///   is created. This will usually be the field's default value, unless there is a
  ///   virtual field without an init expression. In this case, the current value will be
  ///   returned.
  /// </summary>
  /// <param name="clobberedOnly">clobberedOnly is true if we want to only take the values of the virtuals with no init expression</param>
  getNewRecValue(clobberedOnly: boolean): string {
    if (this._isVirtual && this._initExp == null)
      return this._val;
    return !clobberedOnly ? this.getDefaultValue() : null;
  }

  setValueAndStartRecompute(val: string, isNullFld: boolean, recompute: boolean, setRecordUpdated: boolean, isArgUpdate: boolean, enforceVariableChange?: boolean): void {
    if (isNullOrUndefined(enforceVariableChange))
      enforceVariableChange = false;
    this.setValueAndStartRecompute_1(val, isNullFld, recompute, setRecordUpdated, isArgUpdate, false);
  }

  /// <summary>
  ///   call the set value function from the "outer" world. This will trigger the recompute
  ///   chain. When recompute is done - refresh controls which are expression dependent.
  /// </summary>
  /// <param name="val">the new value of the field</param>
  /// <param name="isNullFld">if true then the value is null</param>
  /// <param name="recompute">states whether to execute recompute when setting the value</param>
  /// <param name="recomputeOnlyWhenUpdateValue">: do the recompute only when the value was update</param>
  /// <param name="setRecordUpdated">tells whether to define the record as updated</param>
  /// <param name="isArgUpdate">true if called for handler argument-parameter copy</param>
  /// <param name="enforceVariableChange">execute vaiable change even when recompute is false</param>
  private setValueAndStartRecompute_1(val: string, isNullFld: boolean, recompute: boolean, setRecordUpdated: boolean, isArgUpdate: boolean, enforceVariableChange: boolean): void {
    let task = <Task>this.getTask();
    if (task != null)
      task.VewFirst++;

    let valueWasUpdated: boolean = this.setValue(val, isNullFld, recompute, setRecordUpdated, !this._isVirtual, isArgUpdate, enforceVariableChange);

    // A field that is an event handler field cannot appear as a property in gui. no need to refresh all
    // form+controls properties expressions for it.
    if (task !== null && task.VewFirst === 1 && this._form !== null && !this.IsEventHandlerField) {
      if (recompute && valueWasUpdated)
        this._form.refreshOnExpressions();

      this._form.RecomputeTabbingOrder(true);
    }
    if (task != null)
      task.VewFirst--;
  }

  /// <summary>
  ///   set the value of the field in the current record and update the display
  ///   the field must be in a magic internal format
  /// </summary>
  /// <param name="newVal">the new value of the field</param>
  /// <param name="isNullFld">if true then the value is null</param>
  /// <param name="recompute">states whether to execute recompute when setting the value</param>
  /// <param name="setRecordModified">states whether to define the record as modified</param>
  /// <param name="setCrsrModified">states whether to define the cursor of the field as modified</param>
  /// <param name="isArgUpdate">true if called for handler argument-parameter copy</param>
  /// <returns>the return value was updated </returns>
  private setValue(newVal: string, isNullFld: boolean, recompute: boolean, setRecordModified: boolean, setCrsrModified: boolean, isArgUpdate: boolean, enforceValiableChange: boolean): boolean {
    let rec: Record;
    let recFldVal: string;
    let valsEqual: boolean = false;
    let remainder: number;
    let zeroReal: boolean;
    let args: ArgumentsList = null;
    let mainCtrl = this.getCtrl();
    let pendingEvents: number;
    let evts: List<Field | RunTimeEvent>;
    let forceUpdate: boolean = false;
    let checkForVariableChange: boolean = recompute || enforceValiableChange;

    let task = <Task>this.getTask();
    if (this._form === null)
      this._form = <MgForm>task.getForm();

    if (isNullFld && !this.NullAllowed && this._type !== StorageAttribute.BLOB_VECTOR) {
      newVal = this.getDefaultValue();
      isNullFld = false;
    }

    // QCR#805364: For any field, we store the value in field as it is (without checking the picture).
    // But for Numeric field, if picture does not contain decimals then we should round off the value and then save this value in field
    // otherwise it will give wrong calculation. So always round off the value depending on picture's decimal.
    // check if newVal is "long" since there is no reason to round an already whole number
    if (this._type === StorageAttribute.NUMERIC && newVal != null && !NUM_TYPE.numHexStrIsLong(newVal)) {
      let numVal = new NUM_TYPE(newVal);
      let pic = new PIC(this._picture, this._type, super.getTask().getCompIdx());
      let decs: number = pic.getDec();
      numVal.round(decs);
      newVal = numVal.toXMLrecord();
    }

    rec = (<DataView>this._dataview).getCurrRec();
    if (rec == null)
      throw new ApplicationException(ClientManager.Instance.getMessageString(MsgInterface.RT_STR_NO_RECS_IN_RNG));

    // don't allow updating REAL fields, unless 'allow update in query mode' is set to TRUE
    if (!this.IsVirtual &&
      (task.getMode() === Constants.TASK_MODE_QUERY &&
        !ClientManager.Instance.getEnvironment().allowUpdateInQueryMode(task.getCompIdx())
        || rec.InForceUpdate && rec.InCompute))
      return !valsEqual;

    if (checkForVariableChange && this.getHasChangeEvent()) {
      let argsList = new Array(2);
      argsList[0] = new ExpVal(StorageAttribute.NUMERIC, false,
        (mainCtrl !== null && mainCtrl.IsInteractiveUpdate
          ? Field.NUM0.toXMLrecord()
          : Field.NUM1.toXMLrecord()));
      argsList[1] = new ExpVal(this.getType(), this.isNull(), this.getValue(false));
      args = new ArgumentsList(argsList);
    }
    if (mainCtrl != null)
      mainCtrl.IsInteractiveUpdate = false;

    // update the field in the current record
    if (this._type !== StorageAttribute.UNICODE && UtilStrByteMode.isLocaleDefLangDBCS()) {
      // count the number of bytes, not characters (JPN: DBCS support)
      if (newVal != null)
        remainder = this._size - UtilStrByteMode.lenB(newVal);
      else
        remainder = 0;

      if (newVal != null && this._type !== StorageAttribute.BLOB && this._type !== StorageAttribute.BLOB_VECTOR &&
        remainder < 0)
        this._val = UtilStrByteMode.leftB(newVal, this._size);
      else if (this._type === StorageAttribute.ALPHA && remainder > 0)
        this._val = newVal + NString.FromChars(this._spaces, 0 , remainder);
      else if (this._type === StorageAttribute.BLOB)
        this._val = BlobType.copyBlob(this._val, newVal);
      else this._val = newVal;
    }
    else {
      if (newVal != null)
        remainder = this._size - newVal.length;
      else
        remainder = 0;

      if (newVal != null && this._type !== StorageAttribute.BLOB && this._type !== StorageAttribute.BLOB_VECTOR && remainder < 0)
        this._val = newVal.substr(0, this._size);
      else if ((this._type === StorageAttribute.ALPHA || this._type === StorageAttribute.UNICODE) && remainder > 0)
        this._val = newVal +  NString.FromChars(this._spaces, 0 , remainder);
      else if (this._type === StorageAttribute.BLOB) {
        // Ensure _val is not null, so that the blob copy will be
        // done correctly, according to the field's blob type.
        if (this._val === null)
          this._val = this.getMagicDefaultValue();
        this._val = BlobType.copyBlob(this._val, newVal);
      }
      else this._val = newVal;
    }
    // If dotnet var is updated with new blobprefix, valsEqual is false, we should not check in record.
    {
      recFldVal = rec.GetFieldValue(this._id);

      // In order to compare, If virtual's old value is taken from record, then old isNull value also should be taken from record.
      // This should be done only if not in re-compute / not argument / no initExp.)
      // Mainly , this is needed, when cursor is parked on one record and virtual is modified from null to nonnull or viceversa and
      // now if cursor moves from one record to next record, We need to  get the old null value from record.

      let oldNullVal: boolean = this._isNull;
      if (!recompute && !isArgUpdate && this._initExp == null)
        oldNullVal = rec.IsNull(this._id);

      try {
        valsEqual = ExpressionEvaluator.mgValsEqual(this._val, isNullFld, this._type, recFldVal, oldNullVal, this._type);
      }
      catch (exception) {
        this._val = this.getMagicDefaultValue();
        valsEqual = false;
      }

    }
    // zero the vector
    if (this._clearVectorType)
      this._vectorType = null;
    if (this._invalidValue) {
      this._invalidValue = false;
      rec.clearFlag(this._id, Record.FLAG_UPDATED);
      rec.clearFlag(this._id, Record.FLAG_MODIFIED);
    }
    // during compute, we should zero fields which belong to link create.
    zeroReal = this._linkCreate && rec.InCompute && !recompute && (this._form == null || !this._form.InRestore) &&
      !ClientManager.Instance.EventsManager.GetStopExecutionFlag();

    // Virtuals without init expression are copied from one record to another, even at
    // compute time (no recompute). Nevertheless, in case their value changes, we must
    // perform recompute.
    if ((this._isVirtual || zeroReal) && !rec.isNewRec() && !valsEqual)
      forceUpdate = true;

    // if the recompute is false it means that the user is setting a value
    // that its source is the record, thus, we don't have to update the record.
    // if the recompute is true, go ahead and update the record.
    if (checkForVariableChange || forceUpdate || rec.isNewRec()) {
      this.UpdateNull(isNullFld, rec);

      if (setCrsrModified)
        rec.setFlag(this._id, Record.FLAG_CRSR_MODIFIED);
      rec.setFieldValue(this._id, this._val, setRecordModified);
      evts = ClientManager.Instance.getPendingVarChangeEvents();
      pendingEvents = evts.length;
      if (checkForVariableChange && this.getHasChangeEvent() && !evts.Contains(this) && !valsEqual) {
        // if there is a variable change handler - save value and prepare params
        let rtEvt = new RunTimeEvent(this);
        rtEvt.setInternal(InternalInterface.MG_ACT_VARIABLE);
        rtEvt.setArgList(args);
        evts.push(this);
        evts.push(rtEvt);
      }

      // check for recompute and execute it
      // QCR #299609, if we are in local dataview manager, we can only compute.
      // Recompute is not allowed, since it will be executed multiple times
      if (this._recompute != null && (recompute || forceUpdate) && !(<DataView>this._dataview).InLocalDataviewCommand) {
        try {
          // if field caused table invalidation and it's value was changed
          if (forceUpdate)
            rec.InForceUpdate = true;
          this._recompute.execute(rec);
        }

        finally {
          if (forceUpdate)
            rec.InForceUpdate = false;
        }
      }
      if (this._causeTableInvalidation && this.isChanged(this._val, isNullFld))
        rec.setCauseInvalidation(true);

      // Don't update controls while fetching records from local database. If the task has a table control, then actual controls on the
      // rows are created after no. of rows is known (and this is after the data is avaialable). So, while fetching records, controls in
      // table are not yet created and hence there is an assert while trying to update the controls. After skipping this update, the controls
      // are updated from other places (refreshTable, commonHandlerBefore, handleRowDataCurPage etc like it happens for server data)
      if ((recompute || forceUpdate) && !(<DataView>this._dataview).InLocalDataviewCommand && mainCtrl != null) {
        if (mainCtrl.isChoiceControl())
          this.updateDisplay();
      }

      // Right after we exit the topmost update - execute all variable change events.
      // note that during this execution, new ones may be created.
      if (pendingEvents === 0 && checkForVariableChange && this.getHasChangeEvent()) {
        while (evts.length > 0) {
          let evt = <RunTimeEvent>evts.get_Item(1);
          evts.RemoveAt(0);
          evts.RemoveAt(0);
          if (ClientManager.Instance.getLastFocusedTask() == null)
            evt.setTask(<Task>this.getTask());
          else {
            let taskRef: Task = ClientManager.Instance.getLastFocusedTask();
            // If we are in variable change event and TaskSuffix is executed, it means we are here from
            // update arguments while closing the task. In such case, we should set the event task as PathParentTask
            // and not the task itself.
            if (taskRef.TaskSuffixExecuted) {
              taskRef = (taskRef.PathParentTask != null) ? <Task>taskRef.PathParentTask : taskRef;
            }
            evt.setTask(taskRef);
          }
          evt.setCtrl(GUIManager.getLastFocusedControl());
          ClientManager.Instance.EventsManager.handleEvent(evt, false);
        }
      }
    }
    // #776031 - the field should be marked modified only if val are not equal. Otherwise, even for null field paramter passing
    // or same value update, it is marked as modified and RS is executed.
    if (recompute && !valsEqual)
      this.setModified();
    return !valsEqual;
  }

  UpdateNull(isNullFld: boolean, rec: Record): void {
    if (isNullFld)
      rec.setFlag(this._id, Record.FLAG_NULL);
    else
      rec.clearFlag(this._id, Record.FLAG_NULL);
    this._isNull = isNullFld;
  }

  /// <summary>
  ///   set a vec cell
  ///   can not be executed without the logic from eval_op_vecGet
  /// </summary>
  /// <param name = "idx">the cell index in the vector strats from 1</param>
  /// <param name = "newVal">the new value</param>
  /// <param name = "valIsNull">is the bew value null</param>
  setCellVecValue(idx: number, newVal: string, valIsNull: boolean): boolean {
    let res: boolean = false;
    if (this._type === StorageAttribute.BLOB_VECTOR) {
      // initialized the vector object if needed
      if (this._vectorType == null) {
        this._vectorType = this.isNull()
          ? new VectorType(this._vecCellsType, this._vecCellsContentType, this.DefaultValue, this.isNullDefault(),
          this.NullAllowed, this._vecCellsSize)
          : new VectorType(this._val);
      }
      // if vecCellsType is BLOB, convert data into blob
      if (this._vecCellsType === StorageAttribute.BLOB) {
        let tmpNewVal: string = this.getCellDefualtValue();
        newVal = BlobType.copyBlob(tmpNewVal, newVal);
      }

      res = this._vectorType.setVecCell(idx, newVal, valIsNull);
      // start recompute
      if (res) {
        this._clearVectorType = false;
        // QCR 984563 do not set the record as changed
        this.setValueAndStartRecompute(this._vectorType.toString(), false, true, false, false);
        this._clearVectorType = true;
      }
    }
    return res;
  }

  /// <summary>
  ///   returns the cell value of a given cell in the vector
  /// </summary>
  /// <returns> the cell's value as string</returns>
  getVecCellValue(idx: number): string {
    if (this._type === StorageAttribute.BLOB_VECTOR) {
      // if we are here than the filed must have none null value of a vector
      if (this._vectorType == null)
        this._vectorType = new VectorType(this._val);

      return this._vectorType.getVecCell(idx);
    }
    return null;
  }

  /// <summary>
  ///   set the recomputed variable to true
  /// </summary>
  setRecomputed(): void {
  }

  /// <summary>
  ///   invalidate the value of the field. An invalid value forces us to re-calculate the field's
  ///   value by copying it from the dataview.
  ///   used when switching to another record
  /// </summary>
  /// <param name = "forceInvalidate">- Dont check the field's type and make it invalid (usually Virtuals
  ///   without init expression are never invalidated, since they retain their value when moving
  ///   between records).
  /// </param>
  /// <param name="clearFlags"></param>
  invalidate(forceInvalidate: boolean, clearFlags: boolean): void {
    let rec: Record = (<DataView>this._dataview).getCurrRec();

    if (!this._isVirtual || this._virAsReal || this._initExp !== null || forceInvalidate) {
      this._invalidValue = true;
    }
    if (clearFlags && rec !== null) {
      rec.clearFlag(this._id, Record.FLAG_UPDATED);
      rec.clearFlag(this._id, Record.FLAG_MODIFIED);
    }
  }

  /// <summary>
  ///   get Name of table
  /// </summary>
  public getTableName(): String {
    if (this._tableName == null)
      return "";
    return this._tableName;
  }

  /// <summary>
  ///   for get VARNAME function use
  ///   A string containing the table name where the variable originates,
  ///   concatenated with '.' and the variable description of the variable in that table.
  ///   If the variable is a virtual one, then the table name would indicate 'Virtual'.
  /// </summary>
  public getName(): string {
    if (this._isParam)
      return "Parameter." + this.getVarName();
    else if (this._isVirtual)
      return "Virtual." + this.getVarName();
    else return this.getTableName() + "." + this.getVarName();
  }

  /// <summary>
  ///   test for a nullity
  /// </summary>
  public isNull(): boolean {
    if ((<Task>super.getTask()).getEvalOldValues())
      return this.isOriginalValueNull();
    else if (this._invalidValue)
      this.takeValFromRec();
    return this._isNull;
  }

  /// <summary>
  /// </summary>
  PrevIsNull(): boolean {
    return this._prevIsNull;
  }

/// <summary>
  ///   test for an invalid link
  /// </summary>
  isLinkInvalid(): boolean {
    let currRec: Record = (<DataView>this._dataview).getCurrRec();
    return currRec.isLinkInvalid(this._id);
  }

  /// <summary>
  ///   test for an modified flag
  /// </summary>
  isModified(): boolean {
    let currRec: Record = (<DataView>this._dataview).getCurrRec();
    return currRec.isFldModified(this._id);
  }

  /// <summary>
  ///   test for an modified flag
  /// </summary>
  IsModifiedAtLeastOnce(): boolean {
    let rec: Record = (<DataView>this._dataview).getCurrRec();
    // QCR #298014. After deleting of the last record with AllowEmptyDV=No, the current record is null.
    // So take values from the previous current record that was the last deleted record.
    if (rec === null) {
      rec = (<DataView>this._dataview).getPrevCurrRec();
    }
    return rec !== null && rec.IsFldModifiedAtLeastOnce(this._id);
  }

  /// <summary>
  ///   test for an updated flag
  /// </summary>
  isUpdated(): boolean {
    let currRec: Record = (<DataView>this._dataview).getCurrRec();
    return currRec.isFldUpdated(this._id);
  }

  /// <summary>
  ///   set the modified flag
  ///   please note that clearing the flag is done explicitly
  /// </summary>
  setModified(): void {
    let rec: Record = (<DataView>this._dataview).getCurrRec();
    rec.setFlag(this._id, Record.FLAG_MODIFIED);

    // This flag will be set as FLAG_MODIFIED and never cleared. Qcr #926815
    rec.setFlag(this._id, Record.FLAG_MODIFIED_ATLEAST_ONCE);
    if (this.IsVirtual)
      this.modifiedAtLeastOnce = true;
    // the setting of the record modified flag is done explicitly
  }

  /// <summary>
  ///   set the updated flag
  ///   please note that clearing the flag is done explicitly
  /// </summary>
  setUpdated(): void {
    let currRec: Record = (<DataView>this._dataview).getCurrRec();
    currRec.setFlag(this._id, Record.FLAG_UPDATED);
    currRec.setUpdated();
  }

  /// <summary>
  ///   returns true if this field is a parameter
  /// </summary>
  isParam(): boolean {
    return this._isParam;
  }

  /// <summary>
  ///   returns if the field in evaluation process
  /// </summary>
  isInEvalProcess(): boolean {
    return this._inEvalProcess;
  }

  /// <summary>
  ///   returns true if the field has an init expression
  /// </summary>
  hasInitExp(): boolean {
    return this._initExp !== null;
  }

  /// <summary>
  ///   returns true if the server recomputes this field
  /// </summary>
  isServerRcmp(): boolean {
    return this._recompute !== null && this._recompute.isServerRcmp();
  }

  /// <summary>
  ///   returns the picture of the field as a string
  /// </summary>
  getPicture(): string {
    return this._picture;
  }

  /// <summary>
  ///   returns the the id of the link this field belong to
  ///   if does not belong to any link return -1
  /// </summary>
  getDataviewHeaderId(): number {
    return this._dataviewHeaderId;
  }


  /// <summary>
  ///   returns whether the field belongs to a link or not
  /// </summary>
  get IsLinkField(): boolean {
    return this._isLinkFld;
  }

  /// <summary>
  ///   evaluates and returns the init expression value of this field (null if there is non)
  /// </summary>
  public getInitExpVal(res: RefParam<string>, isNull: RefParam<boolean>): void {

    if (this._initExp != null)
      this.EvaluateInitExpression(res, isNull);
    else
      res.value = this.getDefaultValue();
  }

/// <summary>
  ///   sets the hasChangeEvent flag to TRUE
  /// </summary>
  setHasChangeEvent(): void {
    this._hasChangeEvent = true;
  }

  /// <summary>
  ///   retrieves the hasChangeEvent flag
  /// </summary>
  private getHasChangeEvent(): boolean {
    return this._hasChangeEvent;
  }

  /// <summary>
  ///   set hasZoomHandler to true
  /// </summary>
  setHasZoomHandler(): void {
    this._hasZoomHandler = true;
  }

  /// <returns> the hasZoomHandler
  /// </returns>
  getHasZoomHandler(): boolean {
    return this._hasZoomHandler;
  }

/// <summary>
  ///   returns true if in this field will cause invalidation of all rows in table
  /// </summary>
  /// <returns></returns>
  isCauseTableInvalidation(): boolean {
    return this._causeTableInvalidation;
  }

  /// <summary>
  ///   set cause Table Invalidation member
  /// </summary>
  /// <param name = "causeTableInvalidation"></param>
  causeTableInvalidation(causeTableInvalidation: boolean): void {
    this._causeTableInvalidation = causeTableInvalidation;
  }

  /// <summary>
  ///   when value is null, get value that represent null
  /// </summary>
  /// <param name = "checkNullArithmetic"></param>
  /// <returns></returns>
  getValueForNull(checkNullArithmetic: boolean): string {
    let val: string;
    if (this.NullAllowed) {

      if (checkNullArithmetic && super.getTask().getNullArithmetic() === Constants.NULL_ARITH_NULLIFY) {
        val = null;
      }
      else {
        if (this._nullValue === null) {
          this._nullValue = super.getMagicDefaultValue();
        }
        val = this._nullValue;
      }
    }
    else {
      val = super.getMagicDefaultValue();
    }
    return val;
  }

  /// <summary>
  ///   returns the control which is attached to the field and resides on the same task
  ///   of of the field
  /// </summary>
  public getCtrl(): MgControl {
    let ctrl: MgControl;

    if (this._controls != null) {
      for (let i: number = 0; i < this._controls.getSize(); i++) {
        ctrl = <MgControl>this._controls.getCtrl(i);
        if (ctrl.getForm().getTask() === this.getTask())
          return ctrl;
      }
    }
    return null;
  }

  /// <summary>
  ///   update the display
  /// </summary>
  updateDisplay(): void {
    super.updateDisplay(this.getDispValue(), this.isNull(), false);
  }

  /// <summary>
  ///   return the value to display
  /// </summary>
  public getDispValue(): string {
    if (this.isNull()) {
      if (this._nullDisplay != null)
        return this.getNullDisplay();
      else return super.getMagicDefaultValue();
    }
    else return this.getValue(false);
  }

  /// <summary>
  /// true, if range condition should be applied to the ield during compute
  /// </summary>
  get ShouldCheckRangeInCompute(): boolean {
    return this.IsLinkField || (this.IsVirtual && (<DataView>this._dataview).HasMainTable);
  }

  IsForArgument(taskHasParameters: boolean): boolean {
    // If we need a parameter and the field is not one
    if (taskHasParameters) {
      if (!this.isParam()) {
        return false;
      }
    }
    else {
      if (!this.IsVirtual) {
        return false;
      }
    }
    return true;
  }
}
