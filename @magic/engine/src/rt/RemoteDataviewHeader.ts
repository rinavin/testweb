import {List} from "@magic/mscorelib";
import {DataviewHeaderBase} from "./DataviewHeaderBase";
import {TableCache} from "./TableCache";
import {Task} from "../tasks/Task";
import {ClientManager} from "../ClientManager";
import {Record} from "../data/Record";
import {Field} from "../data/Field";
import {FieldsTable} from "../data/FieldsTable";
import {Boundary} from "./Boundary";
import {ConstInterface} from "../ConstInterface";

/// <summary>
/// link to Remote table
/// </summary>
export class RemoteDataviewHeader extends DataviewHeaderBase {
  private _table: TableCache = null;
  private _lastFetchRecPos: string = null; // the db pos of the last fetched record from the table cache

  constructor(task: Task) {
    super(task);
  }

  protected setAttribute(attribute: string, valueStr: string): void {
    switch (attribute) {

      case ConstInterface.MG_ATTR_CACHED_TABLE:
        if (ClientManager.Instance.getTableCacheManager().TableExists(valueStr))
          this._table = ClientManager.Instance.getTableCacheManager().GetTableById(valueStr);
        else {
          this._table = new TableCache(valueStr);
          ClientManager.Instance.getTableCacheManager().InsertTable(this._table);
        }
        break;

      case ConstInterface.MG_ATTR_IDENT:
        this._table.SetTableIdent(valueStr);
        break;

      default:
        super.setAttribute(attribute, valueStr);
        break;
    }
  }

  /// <summary>
  ///   will return the linked record according to the link properties and the current record
  ///   this method will change the current record fields values
  /// </summary>
  public getLinkedRecord(curRec: Record): boolean {
    let lnkFlds = (<FieldsTable> this._task.DataView.GetFieldsTab()).getLinkFields(this._id);
    let ret: boolean = false;

    if (this._cond.getVal()) {

      // build locate and range vectors
      if (this.Loc == null) {
        this.Loc = new List<Boundary>();
        for (let i: number = 0; i < lnkFlds.length; i++) {
          let currLoc: Boundary = lnkFlds.get_Item(i).Locate;
          if (currLoc != null) {
            this.Loc.push(currLoc);
            currLoc.compute(false);
          }
        }
      }
      else {
        // compute the range and locate expressions anew
        for (let i: number = 0; i < this.Loc.length; i++)
          this.Loc.get_Item(i).compute(false);
      }
      // sort the table (if the table was not loaded yet it will also load it
      this._table.SortTable(this._keyIdx, this._dir);
      // perform the link
      let res: Record = this._table.Fetch(this.Loc);
      if (res == null)
      // link faild
        this.initRec(curRec, lnkFlds, false);
      else {
        ret = true;
        this.copyLinkFldToRec(curRec, lnkFlds, res, true);
      }
    }
    // calculate init expressions if there are any or default values
    else
      this.initRec(curRec, lnkFlds, false); // every scenario where the linked did not
    // returned any record fro example here when
    // the link condition is false then the link is
    // considered to has failed and should return
    // false as return value

    return ret;
  }

  /// <summary>
  ///   if the link succeeded copies the values return from the linked table record
  ///   to the current data view record
  /// </summary>
  private copyLinkFldToRec(curRec: Record, linkFlds: List<Field>, tableRec: Record, ret: boolean): void {
    // if we got here it means that we have successfully fetch a record from the link
    // set the lastFetchRecPos to be the pos of the fetched record
    this._lastFetchRecPos = tableRec.getDbPosVal();

    for (let i: number = 0; i < linkFlds.length; i++) {
      let curFld: Field = linkFlds.get_Item(i);
      curRec.setFieldValue(curFld.getId(), tableRec.GetFieldValue(curFld.CacheTableFldIdx), false);

      // clear the invalid flag in case it was set
      curRec.clearFlag(curFld.getId(), Record.FLAG_INVALID);
      curFld.invalidate(true, false);
    }
    // set the ret value
    this.SetReturnValue(curRec, ret, true);
  }

  /// <summary>
  ///   in case the link fails set the value to default or to the value of the init expression
  /// </summary>
  private initRec(currRec: Record, linkFlds: List<Field>, ret: boolean): void {
    // if we are here it means that we tried to fetch a record but failed to find one therefor
    // the lastFetchRecPos should be marked accordingly
    this._lastFetchRecPos = "#";

    this.InitLinkFields(currRec);

    // set the ret value
    let retFld = this.ReturnField;
    if (retFld != null) {
      currRec.setFieldValue(retFld.getId(), (ret ? "1" : "0"), false);
      retFld.invalidate(true, false);
    }
  }

  /// <summary>
  ///   returns the last fetch record db pos value
  /// </summary>
  public getLastFetchedDbPos(): string {
    return this._lastFetchRecPos;
  }
}
