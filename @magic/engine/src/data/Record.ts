import {
  DataModificationTypes,
  DcValues,
  EMPTY_DCREF,
  ExpVal,
  FieldDef,
  IRecord,
  ObjectReferenceBase,
  ObjectReferencesCollection,
  RecordUtils
} from "@magic/gui";
import {
  ApplicationException,
  Encoding,
  IComparable,
  Int32, ISO_8859_1_Encoding,
  List,
  NNumber,
  NString,
  RefParam,
  StringBuilder
} from "@magic/mscorelib";
import {
  Base64,
  Constants,
  Logger,
  StorageAttribute,
  StorageAttributeCheck,
  StrUtil,
  UtilStrByteMode,
  XMLConstants,
  XmlParser
} from "@magic/utils";

import {Field} from "./Field";
import {TableCache} from "../rt/TableCache";
import {ExpressionEvaluator, NullValueException} from "../exp/ExpressionEvaluator";
import {Key} from "./Key";
import {FieldsTable} from "./FieldsTable";
import {ClientManager} from "../ClientManager";
import {Task} from "../tasks/Task";
import {MgControl} from "../gui/MgControl";
import {MgForm} from "../gui/MgForm";
import {DataView} from "./DataView";
import {ConstInterface} from "../ConstInterface";
import {DataviewHeaders} from "../rt/DataviewHeaders";


/// <summary>
///   this class represents a record object
///   it parses the <rec...> tag
/// </summary>
export class Record implements IComparable, IRecord {
  // ATTENTION !!! when you add/modify/delete a member variable don't forget to take care
  // about the "setSameAs()" function

  /// <summary>
  ///   CONSTANTS
  /// </summary>

  public static FLAG_NULL: number = (0x01);

  public static FLAG_INVALID: number = (0x02);
  public static FLAG_MODIFIED: number = (0x04);
  public static FLAG_UPDATED: number = (0x08);
  public static FLAG_CRSR_MODIFIED: number = (0x10);
  public static FLAG_VALUE_NOT_PASSED: number = (0x20);
  public static FLAG_MODIFIED_ATLEAST_ONCE: number = (0x40);

  protected _id: number = Int32.MinValue;
  protected dbViewRowIdx: number = 0;
  protected _mode: DataModificationTypes = DataModificationTypes.None;

  private _dcRefs: ObjectReferencesCollection = null;
  _inCompute: boolean = false;
  _inRecompute: boolean = false;
  _newRec: boolean = false;

  public get InCompute(): boolean {
    return this._inCompute;
  }

  public get InRecompute(): boolean {
    return this._inRecompute;
  }

  protected static INCREASE: boolean = true;
  protected static DECREASE: boolean = false;

  protected _tableCache: TableCache; // }
  // } for use if the record is part of table cache (there is no way both dv and tablecache are not null at the same time -

  protected _inDeleteProcess: boolean; // will be set to true before rec suffix from delline.
  protected _addAfter: number;
  protected _causeInvalidation: boolean; // Exit from this record will cause invalidation of all rows in table
  protected _dbPosBase64Val: string; // used only in table cache records holds the tables db_pos value in the cursor
  // }                                               they are Mutually exclusive).
  protected _dataview: DataView = null;
  private _fieldsData: String[];
  protected _flags: Uint8Array;
  protected _flagsHistory: Uint8Array; // History of flags, used when contacting the server
  protected _forceSaveOrg: boolean;
  protected _hashKey: number;

  protected _computed: boolean;
  protected _lateCompute: boolean; // this record must be computed next time we enter the record, but not before

  protected _linksFldsPos: string;
  protected _modified: boolean;

  protected _next: Record;  // Points to the next record, when its part of a list
  protected _prev: Record;  // Points to the prev record, when its part of a list
  protected _sendToServer: boolean = true; // If false, don't send this record to the server, as part of the modified list
  protected _updated: boolean;

  public InForceUpdate: boolean;
  public Synced: boolean;
  public ValueInBase64: boolean;

  constructor(dvOrTableCache: DataView | TableCache);
  constructor(cId: number, dataview: DataView, clobberedOnly: boolean);
  constructor(cId: number, dataview: DataView, clobberedOnly: boolean, isFirstRecord: boolean);
  constructor(Record: Record);
  constructor(dvOrTableCacheOrCIdOrRecord: any, dataview?: DataView, clobberedOnly?: boolean, isFirstRecord?: boolean)
  {
    if(dvOrTableCacheOrCIdOrRecord instanceof  Record)
      Object.assign(this, dvOrTableCacheOrCIdOrRecord);
    else if (arguments.length === 1)
      this.constructor_0(dvOrTableCacheOrCIdOrRecord);
    else if (arguments.length === 3)
      this.constructor_1(dvOrTableCacheOrCIdOrRecord, dataview, clobberedOnly);
    else
      this.constructor_2(dvOrTableCacheOrCIdOrRecord, dataview, clobberedOnly, isFirstRecord);
  }

  /// <summary>
  ///   constructs a new record to be used by the table cache only!!!
  /// </summary>
  private constructor_0(dvOrTableCache: any): void {
    if (dvOrTableCache instanceof DataView)
      this._dataview = <DataView>dvOrTableCache;
    else
      this._tableCache = <TableCache>dvOrTableCache;

    this._fieldsData = new Array<string>(this.getFieldsTab().getSize());
    this._flags = new Uint8Array(this.getFieldsTab().getSize());
    this._flagsHistory = new Uint8Array(this.getFieldsTab().getSize());

    for (let i: number = 0; i < this._flags.length; i = i + 1) {
      let field: FieldDef = this.getFieldsTab().getField(i);
      this._flags[i] = ((field.isNullDefault() || field.getType() === StorageAttribute.BLOB_VECTOR) ? Record.FLAG_NULL : 0);

      if (this._dataview !== null && (<Field>field).IsVirtual) {
        let record: Record = this._dataview.getCurrRec();
        if (record != null && record.IsFldModifiedAtLeastOnce(i)) {
          this.setFlag(i, Record.FLAG_MODIFIED_ATLEAST_ONCE);
        }
      }
      this._flagsHistory[i] = this._flags[i];
    }
    this._dcRefs = new ObjectReferencesCollection();
    this.setNewRec();
  }

  /// <summary>
  ///   CTOR
  /// </summary>
  /// <param name = "cId">the id of the record</param>
  /// <param name = "ft">a reference to the fields table</param>
  /// <param>  clobberedOnly is true if we want to init only the values of the virtuals with no init expression </param>
  private constructor_1(cId: number, dataview: DataView, clobberedOnly: boolean): void {
    this.constructor_0(dataview);
    this.setId(cId);
    this.setInitialFldVals(clobberedOnly, true);
  }

  /// <summary>
  ///   CTOR
  /// </summary>
  /// <param name = "cId">the id of the record</param>
  /// <param name = "ft">a reference to the fields table</param>
  /// <param>  clobberedOnly is true if we want to init only the values of the virtuals with no init expression </param>
  private constructor_2(cId: number, dataview: DataView, clobberedOnly: boolean, isFirstRecord: boolean): void {
    this.constructor_0(dataview);
    this.setId(cId);
    this.setInitialFldVals(clobberedOnly, !isFirstRecord);
  }

  public get Modified(): boolean {
    return this._modified;
  }

  public get Updated(): boolean {
    return this._updated;
  }

  public get SendToServer(): boolean {
    return this._sendToServer;
  }

  public CompareTo(obj: Object): number {
    let res: number = 0;
    let compTo = <Record>obj;

    // get the key by which we are doing the Comparison
    let key: Key = this._tableCache.GetKeyById(this._tableCache.GetCurrSortKey());

    // if there is no key to compare by then the records are uncomparable
    if (key != null) {
      // all we need from the key in the order of comparing the the record fields
      for (let i: number = 0; i < key.Columns.length; i++) {
        let currFld = key.Columns.get_Item(i);
        let currFldId: number = currFld.getId();

        if (this.IsNull(currFldId) && compTo.IsNull(currFldId))
          continue;
        else if (this.IsNull(currFldId) && !compTo.IsNull(currFldId)) {
          // null is the greatest value therefore we are the greater
          res = 1;
          break;
        }
        else if (!this.IsNull(currFldId) && compTo.IsNull(currFldId)) {
          res = -1;
          break;
        }
        // both are not null
        else {
          try {
            let first = new ExpVal(currFld.getType(), false,
              this.GetFieldValue(currFldId));
            let second = new ExpVal(currFld.getType(), false,
              compTo.GetFieldValue(currFldId));

            res = ExpressionEvaluator.val_cmp_any(first, second, false);

            if (res !== 0)
              break;
          }
          catch (err)
            // one of the values we are comparing using vl_cmp_any  is null we should never get here
          {
            if (err instanceof NullValueException)
              Logger.Instance.WriteExceptionToLogWithMsg(" in Record.CompareTo null value was reached");
          }

        }
      }
      return res;
    }
    else {
      res = -1;
      return res;
    }
  }

  /// <summary>
  ///   get the mode
  /// </summary>
  getMode(): DataModificationTypes {
    return this._mode;
  }

/// <summary>
  ///   get the record id
  /// </summary>
  getId(): number {
    return this._id;
  }

  /// <summary>
  ///   returns true if this is a new record just created and no record suffix was yet
  ///   processed on it
  /// </summary>
  isNewRec(): boolean {
    return this._newRec;
  }

  getFieldDataXML(fldIdx: number, getOldVal: boolean): string;
  getFieldDataXML(fldIdx: number): Uint8Array;
  getFieldDataXML(fldIdx: number, getOldVal?: boolean): string | Uint8Array {
    if (arguments.length === 2)
      return this.getFieldDataXML_0(fldIdx, getOldVal);
    else
      return this.getFieldDataXML_1(fldIdx);
  }

  /// <summary>
  ///   build the field value for the XML string of this record
  /// </summary>
  /// <param name = "fldIdx">index of field</param>
  /// <returns></returns>
  private getFieldDataXML_0(fldIdx: number, getOldVal: boolean): string {
    let fldVal: string;

    if (!getOldVal)
      fldVal = this.GetFieldValue(fldIdx);
    else
      fldVal = (<Field>(this.getFieldsTab().getField(fldIdx))).getOriginalValue();
    if (fldVal == null)
      throw new ApplicationException("in Record.buildFieldsData() null field value!\nField id: " + fldIdx);

    let tmpBuf: string = this.getXMLForValue(fldIdx, fldVal);
    return XmlParser.escape(tmpBuf.toString()).toString();
  }

  /// <summary>
  ///   build the field value for the XML string of this record
  /// </summary>
  /// <param name = "fldIdx">index of field</param>
  /// <returns></returns>
  private getFieldDataXML_1(fldIdx: number): Uint8Array {
    let fieldValue: string = this.GetFieldValue(fldIdx);

    if (fieldValue === null) {
      throw new ApplicationException("in Record.buildFieldsData() null field value!\nField id: " + fldIdx);
    }

    let type: StorageAttribute = this.getFieldsTab().getType(fldIdx);
    return RecordUtils.serializeItemVal(fieldValue, type);
  }

  /// <summary>
  /// get field table either of DataView ('dvHeader') or of TableCache
  /// dv and tableCache are mutually exclusive
  /// </summary>
  /// <returns> fieldTable </returns>
  getFieldsTab(): FieldsTable {
    if (this._dataview !== null)
      return <FieldsTable>this._dataview.GetFieldsTab();

    else
      return this._tableCache.FldsTab;
  }

  // TODO : check how to implement destructors
  // ~Record()
  // {
  // 	this.removeRecFromDc();
  // }

  /// <summary>
  ///   set the initial field values for fields that has a null value
  /// </summary>
  /// <param>  clobberedOnly is true if we want to init only the values of the virtuals with no init expression </param>
  protected setInitialFldVals(clobberedOnly: boolean, isNewRec: boolean): void {
    let i: number, size;
    let fld: Field = null;
    size = this.getSizeFld(true);

    for (i = 0; i < size; i++) {
      // put initial values to the fields using the Magic default value
      if (this._fieldsData[i] === null || typeof this._fieldsData[i] === "undefined") {
        fld = <Field>this.getFieldsTab().getField(i);
        this._fieldsData[i] = fld.getNewRecValue(clobberedOnly);

        if (isNewRec && fld.IsVirtual && !fld.isNull())
          this.clearFlag(fld.getId(), Record.FLAG_NULL);

        if (fld.IsVirtual && fld.getModifiedAtLeastOnce())
          this.setFlag(fld.getId(), Record.FLAG_MODIFIED_ATLEAST_ONCE);

        if (this._fieldsData[i] === null || typeof this._fieldsData[i] === "undefined")
          this._fieldsData[i] = fld.getDefaultValue();
      }
    }
  }


  /// <summary>
  ///   sets the id of the record and an appropriate hash key
  /// </summary>
  /// <param name = "cId">the id of the record</param>
  setId(cId: number): void {
    this._id = cId;
    this._hashKey = this._id;
  }

  /// <summary>
  /// sets the dbViewRowId of the record
  /// </summary>
  /// <param name = "cId">the id of the record</param>
  setDBViewRowIdx(rowId: number): void {
    this.dbViewRowIdx = rowId;
  }

  /// <summary>
  /// return dbViewRowId of the record
  /// </summary>
  /// <param name = "cId">the id of the record</param>
  getDBViewRowIdx(): number {
    return this.dbViewRowIdx;
  }

  /// <summary>
  ///   parse input string and fill inner data - returns true when the record is the current record
  /// </summary>
  fillData(): boolean {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;
    let isCurrRec: boolean = false;
    let endContext: number = parser.getXMLdata().indexOf(XMLConstants.TAG_TERM, parser.getCurrIndex());

    if (endContext !== -1 && endContext < parser.getXMLdata().length) {
      // last position of its tag
      let tag: String = parser.getXMLsubstring(endContext);
      parser.add2CurrIndex(tag.indexOf(ConstInterface.MG_TAG_REC) + ConstInterface.MG_TAG_REC.length);

      let tokensVector: List<string> = XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);
      isCurrRec = this.initElements(tokensVector);
      parser.setCurrIndex(endContext + XMLConstants.TAG_TERM.length);
    }
    else
      Logger.Instance.WriteExceptionToLogWithMsg("in Record.FillInnerData() out of bounds");
    return isCurrRec;
  }

  /// <summary>
  ///   parse the record - returns true when the record is the current record
  /// </summary>
  /// <param name = "tokensVector">the attributes and their values</param>
  protected initElements(tokensVector: List<string>): boolean {
    let attribute: String, valueStr;
    let recFieldsData: string = null;
    let recFlags: string = null;
    let j: number = 0;
    let isCurrRec: boolean;

    isCurrRec = this.peekIsCurrRec(tokensVector);

    for (; j < tokensVector.length; j += 2) {
      attribute = (tokensVector.get_Item(j));
      valueStr = (tokensVector.get_Item(j + 1));

      switch (attribute) {
        case ConstInterface.MG_ATTR_MODE:
          this._mode = <DataModificationTypes>valueStr[0];
          break;
        case XMLConstants.MG_ATTR_ID:
          this.setId(XmlParser.getInt(valueStr));
          break;
        case XMLConstants.MG_ATTR_VB_VIEW_ROWIDX:
          this.setDBViewRowIdx(XmlParser.getInt(valueStr));
          break;
        case XMLConstants.MG_ATTR_VALUE:
          if (this.ValueInBase64) {
            recFieldsData = Base64.decode(valueStr);
          }
          else {
            recFieldsData = XmlParser.unescape(valueStr);
          }
          break;
        case ConstInterface.MG_ATTR_CURR_REC: {

        }
          break;
        case ConstInterface.MG_ATTR_ADD_AFTER:
          this._addAfter = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_FLAGS:
          recFlags = valueStr;
          break;
        case ConstInterface.MG_ATTR_MODIFIED:
          this._modified = true;
          break;
        case ConstInterface.MG_ATTR_DC_REFS:
          this.fillDCRef(valueStr);
          break;
        case ConstInterface.MG_ATTR_DBPOS:
          this._dbPosBase64Val = valueStr;
          break;
        default:
          Logger.Instance.WriteExceptionToLogWithMsg("in Record.initElements() unknown attribute: " + attribute);
          break;
      }
    }
    if (this.ValueInBase64) {
      let fldValInBytes: Uint8Array = ISO_8859_1_Encoding.ISO_8859_1.GetBytes(recFieldsData);
      this.fillFieldsData(fldValInBytes, recFlags);
    }
    else {
      this.fillFieldsData(recFieldsData, recFlags, isCurrRec);
    }
    return isCurrRec;
  }

  /// <summary>
  ///   peek the curr_rec value from the tag
  /// </summary>
  /// <param name = "the">tokens of the attributes and values in the tag</param>
  protected peekIsCurrRec(tokensVector: List<string>): boolean {
    let attribute: string;
    let valueStr: string;

    for (let j: number = 0; j < tokensVector.length; j += 2) {
      attribute = (tokensVector.get_Item(j));
      if (attribute === ConstInterface.MG_ATTR_CURR_REC) {
        valueStr = (tokensVector.get_Item(j + 1));
        return XmlParser.getBoolean(valueStr);
      }
    }
    return false;
  }

  fillFieldsData(fldValInBytes: Uint8Array, recFlags: string): void;
  fillFieldsData(fldsVal: string, recFlags: string, isCurrRec: boolean): void;
  fillFieldsData(fldValInBytesOrFldsVal: any, recFlags: string, isCurrRec?: boolean): void {
    if (arguments.length === 2)
      this.fillFieldsData_0(fldValInBytesOrFldsVal, recFlags);
    else
      this.fillFieldsData_1(fldValInBytesOrFldsVal, recFlags, isCurrRec);
  }

  private fillFieldsData_0(fldValInBytes: number[], recFlags: string): void {
  }

  /// <summary>
  ///   Fill FieldsData
  /// </summary>
  /// <param name = "fldsVal">- string for parsing</param>
  /// <param name = "isCurrRec">true if this record is the current record</param>
  private fillFieldsData_1(fldsVal: string, recFlags: String, isCurrRec: boolean): void {
    let val: String = null;
    let tmp: string = null;
    let parsedLen: RefParam<number> = new RefParam<number>(0);
    let i: number, j = 0, from, size;
    let currType: StorageAttribute;
    let useHex: boolean;
    let fld: FieldDef = null;
    let valueNotPassed: boolean;

    from = this.getFromFldIdx(isCurrRec);
    size = this.getSizeFld(isCurrRec);

    for (i = from; j < size; i++, j++) {
      fld = this.getFieldsTab().getField(i);
      currType = fld.getType();

      useHex = (ClientManager.Instance.getEnvironment().GetDebugLevel() > 1 ||
        currType === StorageAttribute.ALPHA ||
        currType === StorageAttribute.UNICODE ||
        StorageAttributeCheck.isTypeLogical(currType));

      // Qcr #940443 : Old fashion flags are still being used by resident table. So check them 1st coz we  might get exception otherwise.
      // The flags for resident are very simple, only 2 options. '.' = false, '/' = true.
      // We keep using it for resident, since in the server side we do not know if we are creating the xml for richclient or for BC at the creation stage.
      // Since we couldn't create different flags for rich, we will use the old flags here.

      if (recFlags[j] === '.')
        this._flags[i] = 0;
      else if (recFlags[j] === '/')
        this._flags[i] = 1;
      else {
        // Each flag will appear in the xml in 2 chars representing hex value ("42" for 0x42).
        tmp = recFlags.substr(j * 2, 2);
        this._flags[i] = parseInt(tmp, 16);
      }

      // save the ind that the value was not passed from the server.
      valueNotPassed = Record.FLAG_VALUE_NOT_PASSED === (this._flags[i] & Record.FLAG_VALUE_NOT_PASSED);
      this._flags[i] = this._flags[i] & ~Record.FLAG_VALUE_NOT_PASSED;

      this._flagsHistory[i] = this._flags[i];

      if (Record.FLAG_UPDATED === (this._flags[i] & Record.FLAG_UPDATED))
        this._updated = true;
      if (valueNotPassed) {
        if (Record.FLAG_NULL === (this._flags[i] & Record.FLAG_NULL)) {
          // null ind is on, just put any value in the field.
          val = fld.getDefaultValue();
        }
        else {
          // copy the existing value from the existing curr rec.
          val = (<Record>this._dataview.getCurrRec()).GetFieldValue(i);
        }
      }
      else {
        val = RecordUtils.deSerializeItemVal(fldsVal, currType, fld.getSize(), useHex, fld.getCellsType(), parsedLen);
        fldsVal = fldsVal.substr(parsedLen.value);
      }
      this._fieldsData[i] = val;
    }

    this.setInitialFldVals(false, false);
  }

  /// <returns> get the actual string according to 'type'</returns>
  static getString(str: string, type: StorageAttribute): string {
    let useHex: boolean = ClientManager.Instance.getEnvironment().GetDebugLevel() > 1 || type === StorageAttribute.ALPHA
      || type === StorageAttribute.UNICODE || StorageAttributeCheck.isTypeLogical(type);

    // first 4 characters are the length of the string (hex number)
    let tmp: string;
    if (type === StorageAttribute.ALPHA || type === StorageAttribute.UNICODE ||
      type === StorageAttribute.BLOB || type === StorageAttribute.BLOB_VECTOR) {
      tmp = str.substr(4);
    }
    else
      tmp = str;

    return RecordUtils.getString(tmp, type, useHex);
  }

  /// <summary>
  ///   init dcRefs vector and increase reference counter to DataView.counterArray
  /// </summary>
  /// <param name = "valueStr">in form "dit_idx,dc_id$dit_idx,dc_id$..."</param>
  fillDCRef(valueStr: string): void {
    if (!NString.IsNullOrEmpty(valueStr)) {
      let couples: string[] = StrUtil.tokenize(valueStr, "$");
      let size: number = couples.length;

      for (let i: number = 0; i < size; i = i + 1) {
        this._dcRefs.Add(DcValuesReference.Parse(couples[i], this._dataview));
      }
    }
  }

  buildFieldsData(message: StringBuilder, isCurrRec: boolean, getOldVal: boolean): void;
  buildFieldsData(message: StringBuilder): void;
  buildFieldsData(message: StringBuilder, isCurrRec?: boolean, getOldVal?: boolean): void {
    if (arguments.length === 3)
      this.buildFieldsData_0(message, isCurrRec, getOldVal);
    else
      this.buildFieldsData_1(message);
  }

  /// <summary>
  ///   build the fields value for the XML string of this record
  /// </summary>
  private buildFieldsData_0(message: StringBuilder, isCurrRec: boolean, getOldVal: boolean): void {
    let tmpStr: StringBuilder = new StringBuilder();

    let from: number = this.getFromFldIdx(isCurrRec);
    let size: number = this.getSizeFld(isCurrRec);

    for (let i: number = from; i < from + size; i = i + 1) {

      // do not write the value if the shrink flag is on.
      if (Record.FLAG_VALUE_NOT_PASSED === (this._flags[i] & Record.FLAG_VALUE_NOT_PASSED))
        continue;

      tmpStr.Append(this.getFieldDataXML(i, getOldVal).toString());
    }


    // if none of the values had changed. pass " " instead of "".
    if (tmpStr.Length === 0) {
      tmpStr.Append(" ");
    }

    message.Append(tmpStr.ToString());

  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="message"></param>
  protected buildFieldsData_1(message: StringBuilder): void {
    let i: number, from, size;

    let fieldValue: List<number> = new List<number>();
    from = this.getFromFldIdx(false);
    size = this.getSizeFld(false);

    for (i = 0; i < from + size; i++) {
      // do not write the value if the shrink flag is on.
      if (Record.FLAG_VALUE_NOT_PASSED === (this._flags[i] & Record.FLAG_VALUE_NOT_PASSED))
        continue;

      let tmp: Uint8Array = this.getFieldDataXML(i);
      tmp.forEach(x => fieldValue.push(x));
    }

    let fieldValuesInBytes: Uint8Array = new Uint8Array(fieldValue.length);
    for (i = 0; i < fieldValue.length; i++)
      fieldValuesInBytes[i] = fieldValue.get_Item(i);


    let encodedfieldValuesInBytes: Uint8Array = Base64.encode(fieldValuesInBytes);
    let tmpStr: string = ClientManager.Instance.getEnvironment().GetEncoding().GetString(encodedfieldValuesInBytes, 0, encodedfieldValuesInBytes.length);
    message.Append(tmpStr);
  }

  /// <summary>
  /// </summary>
  /// <param name="fldIdx"></param>
  /// <param name="fldVal"></param>
  /// <returns></returns>
  getXMLForValue(fldIdx: number, fldVal: string): string {
    let cellAttr: StorageAttribute = StorageAttribute.SKIP; // cell's attribute, if the field's attribute is a vector
    let fldAttr: StorageAttribute = this.getFieldsTab().getType(fldIdx); // field's attribute
    if (fldAttr === StorageAttribute.BLOB_VECTOR)
      cellAttr = this.getFieldsTab().getField(fldIdx).getCellsType();

    let toBase64: boolean = ClientManager.Instance.getEnvironment().GetDebugLevel() <= 1;
    return Record.serializeItemVal(fldVal, fldAttr, cellAttr, toBase64);
  }

  /// <summary>
  ///   returns the index of the starting field according to the type of record
  /// </summary>
  /// <param name = "isCurrRec">should be true for the current rec</param>
  getFromFldIdx(isCurrRec: boolean): number {
    if (isCurrRec)
      return 0;
    else
      return this.getFieldsTab().getRMIdx();
  }

  /// <summary>
  ///   returns the number of fields according to the type of record
  /// </summary>
  /// <param name = "isCurrRec">should be true for the current rec</param>
  getSizeFld(isCurrRec: boolean): number {
    if (isCurrRec)
      return this.getFieldsTab().getSize();
    else
      return this.getFieldsTab().getRMSize();
  }

  buildXML(message: StringBuilder, isCurrRec: boolean): void;
  buildXML(message: StringBuilder, isCurrRec: boolean, forceBuild: boolean): void;
  buildXML(message: StringBuilder, isCurrRec: boolean, forceBuild?: boolean): void {
    if (arguments.length === 2)
      this.buildXML_0(message, isCurrRec);
    else
      this.buildXML_1(message, isCurrRec, forceBuild);
  }

  private buildXML_0(message: StringBuilder, isCurrRec: boolean): void {
    this.buildXML_1(message, isCurrRec, false);
  }

  /// <summary>
  ///   build the XML string of the record
  /// </summary>
  /// <param name = "message">the xml message to append to</param>
  /// <param name = "isCurrRec">indicate this record as the current record</param>
  protected buildXML_1(message: StringBuilder, isCurrRec: boolean, forceBuild: boolean): void {
    let recFlags: StringBuilder;
    let from: number, size, i;
    let aFlag: number;
    let hexFlag: string;

    if (!forceBuild)
      if (this._mode !== DataModificationTypes.Insert && this._mode !== DataModificationTypes.Update &&
        this._mode !== DataModificationTypes.Delete && !isCurrRec)
        return;

    message.Append("\n            <" + ConstInterface.MG_TAG_REC);
    if (this._id > Int32.MinValue)
      message.Append(" " + XMLConstants.MG_ATTR_ID + "=\"" + this._id + "\"");
    message.Append(" " + ConstInterface.MG_ATTR_MODE + "=\"" + <string>this._mode + "\"");

    if (this._mode === DataModificationTypes.Insert && this._prev != null)
      message.Append(" " + ConstInterface.MG_ATTR_ADD_AFTER + "=\"" + this._prev.getId() + "\"");

    // current record's mode is never cleared, the whole record is cleared when we move on.
    if (!forceBuild && !isCurrRec)
      this.clearMode();

    message.Append(" " + XMLConstants.MG_ATTR_VALUE + "=\"");

    if (!forceBuild && isCurrRec)
      this.setShrinkFlags();

    let getOldVal: boolean;
    if (this.Synced)
      getOldVal = false;
    else {
      let task: Task = this._dataview.getTask();
      getOldVal = (!isCurrRec && (task.getLevel() === Constants.TASK_LEVEL_RECORD ||
        task.getLevel() === Constants.TASK_LEVEL_CONTROL) &&
        this._dataview.getCurrRec() != null && (<Record>this._dataview.getCurrRec()).getId() === this._id);
    }

    this.buildFieldsData(message, isCurrRec, getOldVal);
    message.Append("\"");
    recFlags = new StringBuilder();

    from = this.getFromFldIdx(isCurrRec);
    size = this.getSizeFld(isCurrRec);

    // QCR 479686: send FLAG_CRSR_MOD from the history, thus let the server know if a field
    // was updated since the last time we sent it to IT (hence, a DBMS action is needed).
    for (i = from; i < from + size; i++) {
      aFlag = this._flagsHistory[i];
      aFlag = aFlag & Record.FLAG_CRSR_MODIFIED;
      aFlag = aFlag | this._flags[i];

      // Each flag will appear in the xml in 2 chars representing hex value ("42" for 0x42).
      hexFlag = NNumber.ToString(aFlag, "X2");
      recFlags.Append(hexFlag);

      // clear the shrink flag
      if (isCurrRec)
        this._flags[i] = <number>(this._flags[i] & ~Record.FLAG_VALUE_NOT_PASSED);
    }

    message.Append(" " + ConstInterface.MG_ATTR_FLAGS + "=\"" + recFlags.ToString() + "\"");

    if (isCurrRec) {

      message.Append(" " + ConstInterface.MG_ATTR_CURR_REC + "=\"1\"");

      if (this.Modified)
        message.Append(" " + ConstInterface.MG_ATTR_MODIFIED + "=\"1\"");
    }
    if (this._linksFldsPos != null)
      message.Append(" " + ConstInterface.MG_ATTR_DBPOS + "=\"" + XmlParser.escape(this._linksFldsPos) + "\" ");

    message.Append(XMLConstants.TAG_TERM);
  }

/// <summary>
  ///   build the XML string of the record
  /// </summary>
  /// <param name = "message">the xml message to append to</param>
  public buildXMLForDataViewToDataSource(message: StringBuilder): void {
    let recFlags: StringBuilder;
    let from: number, size, i;
    let aFlag: number;
    let hexFlag: string;

    message.Append("\n            <" + ConstInterface.MG_TAG_REC);
    if (this._id > Int32.MinValue)
      message.Append(" " + XMLConstants.MG_ATTR_ID + "=\"" + this._id + "\"");
    message.Append(" " + ConstInterface.MG_ATTR_MODE + "=\"" + this._mode + "\"");

    if (this._mode === DataModificationTypes.Insert && this._prev != null)
      message.Append(" " + ConstInterface.MG_ATTR_ADD_AFTER + "=\"" + this._prev.getId() + "\"");

    message.Append(" " + XMLConstants.MG_ATTR_VALUE + "=\"");

    this.buildFieldsData(message);

    message.Append("\"");
    recFlags = new StringBuilder();

    from = this.getFromFldIdx(false);
    size = this.getSizeFld(false);

    for (i = from; i < from + size; i++) {
      aFlag = this._flagsHistory[i];
      aFlag = aFlag & Record.FLAG_CRSR_MODIFIED;
      aFlag = aFlag | this._flags[i];
      hexFlag = NNumber.ToString(aFlag, 'X2');
      recFlags.Append(hexFlag);
    }
    message.Append(" " + ConstInterface.MG_ATTR_FLAGS + "=\"" + recFlags + "\"");

    if (this._linksFldsPos != null)
      message.Append(" " + ConstInterface.MG_ATTR_DBPOS + "=\"" + XmlParser.escape(this._linksFldsPos) + "\" ");

    message.Append(XMLConstants.TAG_TERM);
  }

/// <summary>
  ///   scan the record and compare fields with parallel server curr rec,
  ///   set shrink flag on if fields are equal.
  /// </summary>

  protected setShrinkFlags(): void {
    let i: number;
    let size: number = this.getSizeFld(true);

    let serverCurrRec: Record = this._dataview.getServerCurrRec();
    // cannot shrink if we do not know what curr rec the server holds.
    if (serverCurrRec == null)
      return;
    for (i = 0; i < size; i++) {
      if (this.fldValsEqual(serverCurrRec, i) || (Record.FLAG_NULL === (this._flags[i] & Record.FLAG_NULL))) {
        this._flags[i] = this._flags[i] | Record.FLAG_VALUE_NOT_PASSED;
      }
    }
  }

/// <summary>
  /// set shrink flag for specific field
  /// </summary>
  /// <param name="fldIdx"></param>
  setShrinkFlag(fldIdx: number): void {
    this._flags[fldIdx] |= Record.FLAG_VALUE_NOT_PASSED;
  }

  /// <summary>
  /// sets field value to its original value from record
  /// </summary>
  /// <param name="idx"></param>
  /// <param name="value"></param>
  SetFieldValue(idx: number, isNull: boolean, value: string): void {
    let field: Field = <Field>this.getFieldsTab().getField(idx);
    field.UpdateNull(isNull, this);

    value = this.CheckMgValue(value, isNull, field);
    this._fieldsData[idx] = value;
    field.takeValFromRec();
    this.clearFlag(field.getId(), Record.FLAG_INVALID);
    field.invalidate(true, false);
  }

  /// <summary>
  ///   set field value
  /// </summary>
  /// <param name = "fldIdx">the field index</param>
  /// <param name = "mgVal">the new value of the field. must be in the internal storage format</param>
  /// <param name = "setRecordUpdated">tells whether to define this record as updated</param>
  setFieldValue(fldIdx: number, mgVal: string, setRecordUpdated: boolean): void {
    let fld: Field = <Field>this.getFieldsTab().getField(fldIdx);

    // don't change value when references are equal or if the task mode is Query
    if (fld.PrevIsNull() === fld.isNull() && mgVal === this.GetFieldValue(fldIdx))
      return;


    mgVal = this.CheckMgValue(mgVal, fld.isNull(), fld);

    if (fldIdx >= 0 && fldIdx < this.getFieldsTab().getSize()) {
      this._fieldsData[fldIdx] = mgVal;

      // QCR #986715: The following setFlag() call was removed to solve the bug.
      // it caused marking a variable as modified even if the change is due to the
      // compute of the record. The FLAG_MODIFIED flag is set correctly in the
      // Field.setValue() method.
      // setFlag(fldIdx, FLAG_MODIFIED);
      if (setRecordUpdated) {
        // set modify only if the field is part of the dataview.
        if (fld.PartOfDataview)
          this._modified = true;

        this._dataview.setChanged(true);
        this.setMode(DataModificationTypes.Update);
      }
    }
    else
      Logger.Instance.WriteExceptionToLogWithMsg("in Record.setFieldValue() illegal field index: " + fldIdx);

  }

  /// <summary>
  /// check mgvalue
  /// </summary>
  /// <param name="mgVal"></param>
  /// <param name="isNull"></param>
  /// <param name="fld"></param>
  /// <returns></returns>
  CheckMgValue(mgVal: string, isNull: boolean, fld: Field): string {
    if (mgVal === null || isNull) {
      mgVal = fld.getNullValue();
      if (mgVal === null)
        mgVal = fld.getMagicDefaultValue();

    }
    let size: number = fld.getSize();

    // truncate values that are longer than the storage size
    if (UtilStrByteMode.isLocaleDefLangDBCS() && fld.getType() !== StorageAttribute.UNICODE) {
      // count the number of bytes, not characters (JPN: DBCS support)
      if (mgVal !== null && UtilStrByteMode.lenB(mgVal) > size)
        mgVal = UtilStrByteMode.leftB(mgVal, size);
    }
    else {
      if (mgVal !== null && mgVal.length > size)
        mgVal = mgVal.substr(0, size);
    }
    return mgVal;
  }

  /// <summary>
  ///   set the "modified" flag
  /// </summary>
  setModified(): void {
    this._modified = true;
  }

  /// <summary>
  ///   reset the "modified" flag
  /// </summary>
  resetModified(): void {
    this._modified = false;
  }

  /// <summary>
  ///   set the "updated" flag
  /// </summary>
  setUpdated(): void {
    this._updated = true;
  }

  /// <summary>
  ///   reset the "modified" flag
  /// </summary>
  resetUpdated(): void {
    this._updated = false;
  }

  /// <summary>
  ///   get a field value
  /// </summary>
  /// <param name = "fldIdx">the field index</param>
  /// <returns> String the field value</returns>
  GetFieldValue(fldIdx: number): string {
    let val: String = null;

    if (fldIdx >= 0 && fldIdx < this._fieldsData.length)
      val = this._fieldsData[fldIdx];
    return val.toString();
  }

  /// <summary>
  ///   returns a copy of this record
  /// </summary>
  replicate(): Record {
    let record: Record = new Record(this);
    record._fieldsData = this._fieldsData.slice();
    record._flags = this._flags.slice();
    record._flagsHistory = this._flagsHistory.slice();
    record._dcRefs = this._dcRefs.Clone();
    return record;
  }

  setSameAs(rec: Record, realOnly: boolean, rId: number): void;
  setSameAs(rec: Record, realOnly: boolean): void;
  setSameAs(rec: Record, realOnly: boolean, rId?: number): void {
    if (arguments.length === 3)
      this.setSameAs_0(rec, realOnly, rId);
    else
      this.setSameAs_1(rec, realOnly);
  }

  /// <summary>
  ///   set the value of the member variables of this record to be the same as those
  ///   of the given record
  /// </summary>
  /// <param name = "rec">the source record</param>
  /// <param name = "rId">the new Id of the record</param>
  private setSameAs_0(rec: Record, realOnly: boolean, rId: number): void {
    this.setSameAs(rec, realOnly);
    this.setId(rId);
  }

  /// <summary>
  ///   set the value of the member variables of this record to be the same as those
  ///   of the given record
  /// </summary>
  /// <param name = "rec">the source record</param>
  private setSameAs_1(rec: Record, realOnly: boolean): void {
    this._id = rec._id;
    this._hashKey = rec._hashKey;

    if (!this._dataview.getTask().transactionFailed(ConstInterface.TRANS_RECORD_PREFIX)/*'P'*/)
      this.setMode(rec._mode);

    this._addAfter = rec._addAfter;

    if (realOnly) {
      for (let i: number = 0; i < this.getFieldsTab().getSize(); i = i + 1) {
        let afield: Field = <Field>rec.getFieldsTab().getField(i);
        if (!afield.IsVirtual) {
          this._fieldsData[i] = rec._fieldsData[i];
          this._flags[i] = rec._flags[i];
          this._flagsHistory[i] = rec._flagsHistory[i];
        }
      }
    }
    else {
      this._fieldsData = rec._fieldsData;
      this._flags = rec._flags;
      this._flagsHistory = rec._flagsHistory;
    }
    this._modified = rec._modified;
    this._dataview = rec._dataview;
    this._computed = rec._computed;
    this._updated = rec._updated;
    this.setDcRefs(rec._dcRefs);

    // QCR #423552: partial fix - we need to go over all the rec.next/prev and make sure this record does not appear
    if (rec._next !== this) {
      this._next = rec._next;
    }
    if (rec._prev !== this) {
      this._prev = rec._prev;
    }
  }

  /// <summary>
  ///   returns true if a field has a null value
  /// </summary>
  /// <param name = "fldIdx">the index of the field to check</param>
  IsNull(fldIdx: number): boolean {
    this.checkFlags(fldIdx);
    return ((this._flags[fldIdx] & Record.FLAG_NULL) === Record.FLAG_NULL);
  }

  /// <summary>
  ///   returns true if a field has a null value
  /// </summary>
  /// <param name = "fldIdx">the index of the field to check</param>
  isLinkInvalid(fldIdx: number): boolean {
    this.checkFlags(fldIdx);
    return ((this._flags[fldIdx] & Record.FLAG_INVALID) === Record.FLAG_INVALID);
  }

  /// <summary>
  ///   returns true if a field has modified
  /// </summary>
  /// <param name = "fldIdx">the index of the field to check</param>
  isFldModified(fldIdx: number): boolean {
    this.checkFlags(fldIdx);
    return ((this._flags[fldIdx] & Record.FLAG_MODIFIED) === Record.FLAG_MODIFIED);
  }

  /// <summary>
  ///   returns true if a field has modified at least once
  /// </summary>
  /// <param name = "fldIdx">the index of the field to check</param>
  IsFldModifiedAtLeastOnce(fldIdx: number): boolean {
    this.checkFlags(fldIdx);
    return ((this._flags[fldIdx] & Record.FLAG_MODIFIED_ATLEAST_ONCE) === Record.FLAG_MODIFIED_ATLEAST_ONCE);
  }

  /// <summary>
  ///   returns true if a field has modified
  /// </summary>
  /// <param name = "fldIdx">the index of the field to check</param>
  isFldUpdated(fldIdx: number): boolean {
    this.checkFlags(fldIdx);
    return ((this._flags[fldIdx] & Record.FLAG_UPDATED) === Record.FLAG_UPDATED);
  }

  /// <summary>
  ///   set a field to have a null value
  /// </summary>
  /// <param name = "fldIdx">the index of the field</param>
  public setFlag(fldIdx: number, aFlag: number): void {
    this.checkFlags(fldIdx);
    this._flags[fldIdx] = this._flags[fldIdx] | aFlag;
    // Note: we only set the history flags. We dont clear them here. We only clear them after XML was dumped.
    if (aFlag === Record.FLAG_CRSR_MODIFIED)
      this._flagsHistory[fldIdx] = this._flagsHistory[fldIdx] | aFlag;
  }

  /// <summary>
  ///   set a field to have a non-null value
  /// </summary>
  /// <param name = "fldIdx">the index of the field</param>
  clearFlag(fldIdx: number, aFlags: number): void {
    this.checkFlags(fldIdx);
    this._flags[fldIdx] = this._flags[fldIdx] & ~aFlags;
  }

  /// <summary>
  ///   clear the flags history. This should only be done after a commit.
  /// </summary>
  clearFlagsHistory(): void {
    for (let i: number = 0; i < this._flags.length; i = i + 1)
      this._flagsHistory[i] = 0;
  }

  /// <summary>
  ///   clear flag for all fields
  /// </summary>
  clearFlags(aFlags: number): void {
    for (let i: number = 0; i < this._flags.length; i = i + 1)
      this.clearFlag(i, aFlags);
  }

  /// <summary>
  ///   clear flag for all real fields
  /// </summary>
  clearFlagsForRealOnly(aFlags: number): void {
    for (let i: number = 0; i < this._flags.length; i = i + 1) {
      let field: Field = <Field>this.getFieldsTab().getField(i);
      if (!field.IsVirtual) {
        this.clearFlag(i, aFlags);
      }
    }
  }

  /// <summary>
  ///   clear a specific field flag from the history
  /// </summary>
  clearHistoryFlag(fldIdx: number): void {
    if (this._flagsHistory !== null && fldIdx < this.getFieldsTab().getSize() && fldIdx >= 0) {
      this._flagsHistory[fldIdx] = 0;
    }
  }

  /// <summary>
  ///   check the existence of the flags and the validity of the field index
  ///   throws an error in case of a failure
  /// </summary>
  /// <param name = "fldIdx">the index of the field</param>
  checkFlags(fldIdx: number): void {
    if (this._flags === null || fldIdx >= this.getFieldsTab().getSize() || fldIdx < 0) {
      throw new ApplicationException("Cannot find flags");
    }
  }

  /// <summary>
  ///   restart the record's settings. This might be needed after a server's rollback
  ///   or restart
  /// </summary>
  /// <param name = "oldMode">the old record mode</param>
  restart(oldMode: DataModificationTypes): void {
    let task: Task = this._dataview.getTask();

    if (oldMode === DataModificationTypes.None) {
      let rec = <Record>this._dataview.getCurrRec();
      let isCurrRec: boolean = (rec != null && rec.getId() === this._id);

      if ((this._dataview.getTask()).getMode() === Constants.TASK_MODE_CREATE)
        if (isCurrRec && !task.getAfterRetry() && task.TryingToCommit && !this._dataview.inRollback())
          oldMode = DataModificationTypes.Update;
        else oldMode = DataModificationTypes.Insert;

      else oldMode = DataModificationTypes.Update;
    }
    this.setMode(oldMode);
    if (oldMode === DataModificationTypes.Insert)
      this.setNewRec();
  }

  /// <summary>
  ///   sets the value of lateCompute flag
  /// </summary>
  /// <param name = "val">the new value of the flag</param>
  setLateCompute(val: boolean): void {
    this._lateCompute = val;
  }

  /// <summary>
  ///   return the value of the "lateCompute" flag
  /// </summary>
  lateCompute(): boolean {
    return this._lateCompute;
  }

  /// <summary>
  /// "in delete process" flag
  /// </summary>
  /// <param name="val"></param>
  setInDeleteProcess(val: boolean): void {
    this._inDeleteProcess = val;
  }

  inDeleteProcess(): boolean {
    return this._inDeleteProcess;
  }

  /// <summary>
  ///   call this function when removing the record, it will decrease the reference count
  ///   of its data controls to their dcValues
  /// </summary>
  removeRecFromDc(): void {
    if (this._dcRefs !== null) {
      this._dcRefs.Dispose();
    }
  }

  /// <summary>
  ///   compare the data of this record with the data of a different record
  /// </summary>
  /// <param name = "rec">the other record</param>
  /// <param name = "currRec">TRUE if we are comparing two 'current records' otherwise should be false.</param>
  /// <param name = "checkOnlyParetOfDataview">FALSE if we want to check all the fields , including those that are not part of data view.</param>
  isSameRecData(rec: Record, currRec: boolean, checkOnlyParetOfDataview: boolean): boolean {
    let size: number = this.getSizeFld(currRec);
    let start: number = this.getFromFldIdx(currRec);
    let i: number;
    let field: Field;

    // compare references
    if (this === rec)
      return true;

    try {
      if (rec.getSizeFld(currRec) !== size)
        return false;

      if (rec.getFromFldIdx(currRec) !== start)
        return false;

      for (i = 0; i < start + size; i++) {
        field = <Field>this.getFieldsTab().getField(i);

        if (checkOnlyParetOfDataview && !field.PartOfDataview)
          continue;

        if (!this.fldValsEqual(rec, i))
          return false;
      }
    }
    catch (err) {
      if (err instanceof ApplicationException)
        return false;
      throw  err;
    }

    return true;
  }

  /// <summary>
  ///   compare two field values between this record and the given record
  /// </summary>
  /// <param name = "rec">the record to compare with</param>
  /// <param name = "fldIdx">the index of the field to compare</param>
  fldValsEqual(rec: Record, fldIdx: number): boolean {
    let type: StorageAttribute = this.getFieldsTab().getField(fldIdx).getType();
    return ExpressionEvaluator.mgValsEqual(this.GetFieldValue(fldIdx), this.IsNull(fldIdx), type, rec.GetFieldValue(fldIdx), rec.IsNull(fldIdx), type);
  }

  /// <summary>
  ///   returns hash key object of this record
  /// </summary>
  getHashKey(): number {
    return this._hashKey;
  }

  /// <summary>
  ///   sets the reference to the records after this one, in a list of recs.
  /// </summary>
  /// <param name = "nextRec">is the next record (or null for the last record)</param>
  setNextRec(nextRec: Record): void {
    this._next = nextRec;
  }

  /// <summary>
  ///   sets the reference to the records before this one, in a list of recs.
  /// </summary>
  /// <param name = "prevRec">is the previous record (or null for the first record)</param>
  setPrevRec(prevRec: Record): void {
    this._prev = prevRec;
  }

  /// <summary>
  ///   return the record whose location is before this one
  /// </summary>
  getPrevRec(): Record {
    return this._prev;
  }

  /// <summary>
  ///   return the record which follows this one
  /// </summary>
  getNextRec(): Record {
    return this._next;
  }

  /// <summary>
  ///   return DcRefs
  /// </summary>
  getDcRefs(): ObjectReferencesCollection {
    return this._dcRefs.Clone();
  }

  /// <summary>
  ///   set DcRefs
  /// </summary>
  setDcRefs(newDcRefs: ObjectReferencesCollection): void {
    this.removeRecFromDc();
    this._dcRefs = newDcRefs.Clone();
    this.SetDcValueId();
  }

  /// <summary>
  ///   returns true if one of the real variables was modified
  /// </summary>
  realModified(): boolean {
    let bRc: boolean = false;
    let tabSize: number = this.getFieldsTab().getSize();
    let j: number;

    for (j = 0; j < tabSize; j++) {
      // for every modified field check if it is a real field
      if ((this._flags[j] & Record.FLAG_MODIFIED) === Record.FLAG_MODIFIED) {
        if (!((<Field>this.getFieldsTab().getField(j)).IsVirtual)) {
          bRc = true; // if a real modified field was found, return with true
          break;
        }
      }
    }
    return bRc;
  }

  /// <summary>
  ///   returns the xml representation of the record - this method is defined so we
  ///   can use the record reference in a string concatenation operations and print calls
  /// </summary>
  ToString(): string {
    let str: StringBuilder = new StringBuilder();
    this.buildXML(str, this._dataview.getCurrRec().getId() === this._id, true);
    return str.ToString();
  }

  /// <summary>
  ///   set the value of the sendToServer flag
  /// </summary>
  setSendToServer(val: boolean): void {
    this._sendToServer = val;
  }

  /// <summary>
  ///   return the size in kb of the records e.i. the sum of all fields in the record
  /// </summary>
  getRecSize(): number {
    let sum: number = 0;

    for (let i: number = 0; i < this.getFieldsTab().getSize(); i = i + 1) {
      let field: Field = <Field>this.getFieldsTab().getField(i);
      sum = sum + field.getSize();
    }
    return sum;
  }

  /// <summary>
  ///   copy the modified crsr flags from a given rec.
  /// </summary>
  /// <param name = "rec">the source record</param>
  copyCrsrModifiedFlags(rec: Record): void {
    let tabSize: number = this.getFieldsTab().getSize();
    let j: number;

    for (j = 0; j < tabSize; j++) {
      this._flags[j] = rec._flags[j];
      this._flags[j] = this._flags[j] & Record.FLAG_CRSR_MODIFIED;
    }
  }

  /// <summary>
  ///   for a table cache record returns the record's db_pos value as a base64 string
  /// </summary>
  getDbPosVal(): string {
    return this._dbPosBase64Val;
  }

  /// <summary>
  ///   build the string that represent the current links fields db_pos values
  /// </summary>
  buildLinksPosStr(): void {
    let tbl: DataviewHeaders = this._dataview.getTask().getDataviewHeaders();
    if (tbl !== null) {
      this._linksFldsPos = tbl.buildDbPosString();
    }
  }

  setForceSaveOrg(val: boolean): void {
    this._forceSaveOrg = val;
  }

  /// <summary>
  ///   returns the relinked flag
  /// </summary>
  getForceSaveOrg(): boolean {
    return this._forceSaveOrg;
  }

  /// <summary>
  ///   true, if exit from this record will cause invalidation of the table due to vitrual recompute
  /// </summary>
  /// <returns></returns>
  isCauseInvalidation(): boolean {
    return this._causeInvalidation;
  }

  /// <summary>
  ///   if causeInvalidation is true,  exit from this record will cause invalidation of the table due to vitrual recompute
  /// </summary>
  /// <param name = "causeInvalidation"></param>
  setCauseInvalidation(causeInvalidation: boolean): void {
    this._causeInvalidation = causeInvalidation;
  }

  /// <summary>
  ///   return the value of the "computed" flag
  /// </summary>
  isComputed(): boolean {
    return this._computed;
  }

  /// <summary>
  ///   set the value of the "computed" flag
  /// </summary>
  /// <param name = "val">the new value of the flag</param>
  setComputed(val: boolean): void {
    this._computed = val;
  }

  /// <summary>
  ///   set the value of the "in compute" flag
  /// </summary>
  /// <param name = "val">the new value of the flag</param>
  setInCompute(val: boolean): void {
    if (!val)
      this.setComputed(true);
    this._inCompute = val;
  }

  /// <summary>
  ///   set the value of the "in recompute" flag
  /// </summary>
  /// <param name = "val">the new value of the flag</param>
  setInRecompute(val: boolean): void {
    this._inRecompute = val;
  }

  /// <summary>
  ///   set the mode
  /// </summary>
  /// <param name = "newMode">the new mode: Created, Modified, Deleted</param>
  setMode(newMode: DataModificationTypes): void {
    switch (newMode) {
      case DataModificationTypes.None:
      case DataModificationTypes.Insert:
      case DataModificationTypes.Update:
      case DataModificationTypes.Delete:
        if (this._mode === DataModificationTypes.None ||
          this._mode === DataModificationTypes.Update && newMode === DataModificationTypes.Delete)
          this._mode = newMode;
        break;
      default:
        Logger.Instance.WriteExceptionToLogWithMsg("in Record.setMode(): illegal mode: " + newMode);
        break;
    }
  }

  /// <summary>
  ///   set the record mode to "none"
  /// </summary>
  clearMode(): void {
    this._mode = DataModificationTypes.None;
  }

  /// <summary>
  ///   switch off the newRec flag
  /// </summary>
  setOldRec(): void {
    this._newRec = false;
  }

  /// <summary>
  ///   switch on the newRec flag
  /// </summary>
  setNewRec(): void {
    this._newRec = true;
  }

  /// <summary>
  ///   serialize an item (field/global param/...) to an XML format (applicable to be passed to the server).
  /// </summary>
  /// <param name = "val">item's value</param>
  /// <param name = "itemAttr">item's attribute</param>
  /// <param name = "cellAttr">cell's attribute - relevant only if 'itemAttr' is vector</param>
  /// <param name = "ToBase64">>decide Base64 encoding is to be done</param>
  /// <returns>serialized XML format</returns>
  static itemValToXML(itemVal: string, itemAttr: StorageAttribute, cellAttr: StorageAttribute, ToBase64: boolean): string {
    let tmpBuf: string = RecordUtils.serializeItemVal(itemVal, itemAttr, cellAttr, ToBase64);
    return XmlParser.escape(tmpBuf).toString();
  }

  /// <summary>
  ///   serialize an item (field/global param/...).
  /// </summary>
  /// <param name = "val">item's value</param>
  /// <param name = "itemAttr">item's attribute</param>
  /// <param name = "cellAttr">cell's attribute - relevant only if 'itemAttr' is vector</param>
  /// <param name = "ToBase64">>decide Base64 encoding is to be done</param>
  /// <returns>serialized itemVal </returns>
  static serializeItemVal(itemVal: string, itemAttr: StorageAttribute, cellAttr: StorageAttribute, ToBase64: boolean): string {
    return RecordUtils.serializeItemVal(itemVal, itemAttr, cellAttr, ToBase64);
  }

  /// <summary>
  /// sets DCVal Id into MgControls
  /// </summary>
  SetDcValueId(): void {
    let form: MgForm = <MgForm>this._dataview.getTask().getForm();
    let mgControl: MgControl = null;

    // if the form doesn't have any selection control, dcRefs would be null
    if (form != null && this._dcRefs != null) {

      this._dcRefs.Refs.forEach((dcRef: DcValuesReference) => {
        mgControl = <MgControl>form.getCtrl(dcRef.ditIdx);
        if (mgControl != null)
          mgControl.setDcValId(dcRef.DcValues.getId());
      });
    }
  }

  /// <summary>
  /// reset the DCVal Id in MgControls
  /// </summary>
  resetDcValueId(): void {
    let form: MgForm = <MgForm>this._dataview.getTask().getForm();
    let mgControl: MgControl = null;

    // if the form doesn't have any selection control, dcRefs would be null
    if (form != null && this._dcRefs != null) {
      this._dcRefs.Refs.forEach(function (dcRef: DcValuesReference) {
        mgControl = <MgControl>form.getCtrl(dcRef.ditIdx);
        if (mgControl != null)
          mgControl.setDcValId(EMPTY_DCREF);
      });
    }
  }

  AddDcValuesReference(controlId: number, dcValuesId: number): void {
    let dcValues: DcValues = this._dataview.getDcValues(dcValuesId);
    let dcRef: DcValuesReference = new DcValuesReference(controlId, dcValues);
    if (this._dcRefs === null) {
      this._dcRefs = new ObjectReferencesCollection();
    }
    this._dcRefs.Add(dcRef);
  }
}

/// <summary>
/// This class represents a link between a data control and its DcValues object.
/// </summary>
export class DcValuesReference extends ObjectReferenceBase {
  ditIdx: number = 0;


  /// <summary>
  /// Gets the referenced DcValues.
  /// </summary>
  get DcValues(): DcValues {
    return <DcValues>this.Referent;
  }

  /// <summary>
  ///   CTOR
  /// </summary>
  /// <param name = "couple">a string that represents the ditIdx & dcId separated by a comma</param>
  constructor(controlId: number, referencedDcValues: DcValues) {
    super(referencedDcValues);
    this.ditIdx = controlId;
  }

  Clone(): ObjectReferenceBase {
    return new DcValuesReference(this.ditIdx, <DcValues>this.Referent);
  }

  /// <summary>
  /// Creates a new DcValuesReference from a string containing two integers, where the
  /// first is the index of the control in the form (dit index) and the second is the
  /// DcValues object identifier.
  /// </summary>
  /// <param name="couple"></param>
  /// <param name="dcValuesOwner"></param>
  /// <returns></returns>
  static Parse(couple: string, dcValuesOwner: DataView): DcValuesReference {
    let commaPos: number = couple.indexOf(",");

    let controlId: number = NNumber.Parse(couple.substr(0, commaPos));
    let dcId: number = NNumber.Parse(couple.substr(commaPos + 1));

    return new DcValuesReference(controlId, dcValuesOwner.getDcValues(dcId));
  }
}
