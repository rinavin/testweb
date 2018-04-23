/// <summary>
///   data for <dvheader ...>...</dvheader>
/// </summary>
import {List} from "@magic/mscorelib";
import {XMLConstants, StorageAttribute, Logger, XmlParser} from "@magic/utils";
import {FieldDef, DataViewBase, FieldsTable as FieldsTableBase} from "@magic/gui";
import {Field} from "./Field";
import {DataView} from "./DataView";
import {ClientManager} from "../ClientManager";

export class FieldsTable extends FieldsTableBase {
  private _rmIdx: number = 0;
  private _rmSize: number = -1;
  private _serverRcmpDone: boolean = false;

  /// <summary>
  ///   a different version of fill data in order to be used in table cache
  /// </summary>
  fillData(dataview?: DataViewBase): void {
    if (arguments.length === 1)
      super.fillData(dataview);
    else {
      let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;
      while (this.initFields(parser.getNextTag())) {
      }
    }
  }

  /// <summary></summary>
  /// <param name="foundTagName"></param>
  /// <returns></returns>
  private initFields(foundTagName: string): boolean {
    if (foundTagName == null)
      return false;

    if (foundTagName === XMLConstants.MG_TAG_FLDH) {
      let item: FieldDef = this.initField();
      this._fields.push(item);
    }
    else {
      // ClientManager.Instance.WriteErrorToLog("in FieldsTable.initFields() only field tag are allowed to be parsed at this instance");
      return false;
    }
  }

  initField(dataview: DataViewBase): FieldDef;
  initField(): FieldDef;
  initField(dataview?: DataViewBase): FieldDef {
    if (arguments.length === 1)
      return this.initField_0(dataview);
    else
      return this.initField_1();
  }

  /// <summary>
  /// create a field and fill it by data
  /// </summary>
  /// <param name = "dataview"> Dataview </param>
  /// <returns> the created filled field </returns>
  private initField_0(dataview: DataViewBase): FieldDef {
    let field: Field = new Field(<DataView>dataview, this._fields.length);
    field.fillData();
    return field;
  }

/// <summary>
  /// create a field and fill it by data
  /// </summary>
  /// <returns> the created filled field </returns>
  private initField_1(): FieldDef {
    let fieldDef: FieldDef = new FieldDef(this._fields.length);
    fieldDef.fillData();
    return fieldDef;
  }

  /// <summary>
  ///   return the number of fields in the Record Main
  /// </summary>
  getRMSize(): number {
    if (this._rmSize === -1)
      return this._fields.length;
    return this._rmSize;
  }

  /// <summary>
  ///   the index of the first field in the record main
  /// </summary>
  getRMIdx(): number {
    return this._rmIdx;
  }

  /// <summary>
  ///   set Record Main size
  /// </summary>
  /// <param name = "rms">the new record main size</param>
  /// <param name = "idx">the index of the first field in the record main</param>
  setRMPos(rms: number, idx: number): void {
    if (rms < 0 && this._rmSize !== -1) {
      Logger.Instance.WriteExceptionToLogWithMsg("in FieldsTable.setRMSize(): illegal record main size: " + rms);
    }
    else if (this._rmSize >= 0) {
      Logger.Instance.WriteExceptionToLogWithMsg("in FieldsTable.setRMSize(): record main size already set !");
    }
    else {
      this._rmSize = rms;
      this._rmIdx = idx;
    }
  }

  /// <summary>
  ///   get the size of a field by its id
  /// </summary>
  /// <param name = "id">the id of the requested field</param>
  /// <returns> the size of the field</returns>
  getSizeOfField(id: number): number {
    let fld: FieldDef = super.getField(id);
    if (fld !== null) {
      return fld.getSize();
    }
    Logger.Instance.WriteExceptionToLogWithMsg("FieldTable.GetSizeOfField() field id: " + id);
    return 0;
  }

  /// <summary>
  ///   get the type of field by its index
  /// </summary>
  /// <param name = "id">the id of the field</param>
  /// <returns> type of the requested field</returns>
  getType(id: number): StorageAttribute {
    return super.getField(id).getType();
  }

  /// <summary>
  ///   invalidate some or all fields in the table
  /// </summary>
  /// <param name = "forceInvalidate">if true then force the invalidation of all the fields</param>
  /// <param name="clearFlags"></param>
  invalidate(forceInvalidate: boolean, clearFlags: boolean): void {
    this._fields.forEach(field => (<Field>field).invalidate(forceInvalidate, clearFlags));
  }

  /// <summary>
  ///   take the value of the fields from the current record
  /// </summary>
  takeValsFromRec(): void {
    this._fields.forEach(field => (<Field>field).takeValFromRec());
  }

  /// <summary>
  ///   return TRUE if we went to the server during a field's compute
  /// </summary>
  serverRcmpDone(): boolean {
    return this._serverRcmpDone;
  }

  /// <summary>
  ///   set the value of the "we went to the server for rcmp" indication
  /// </summary>
  /// <param name = "val">new value</param>
  setServerRcmp(val: boolean): void {
    this._serverRcmpDone = val;
  }

  /// <summary>
  ///   return a vector of all fields in the table that belongs to a given link
  /// </summary>
  /// <param name = "lnkId">the id of the link</param>
  getLinkFields(lnkId: number): List<Field> {
    let list: List<Field> = new List<Field>();

    this._fields.forEach(field => {
      if ((<Field>field).getDataviewHeaderId() === lnkId) {
        list.push(<Field>field);
      }
    });
    return list;
  }

  /// <summary>
  ///
  /// </summary>
  /// <returns></returns>
  resetRecomp(): void {
    this._fields.forEach(field => (<Field>field).setRecompute(null));
  }

  constructor() {
    super();
  }
}
