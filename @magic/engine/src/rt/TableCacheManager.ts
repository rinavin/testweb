import {Misc} from "@magic/utils";
import {ApplicationException, Exception, Hashtable, Array_Enumerator, List} from "@magic/mscorelib";
import {TableCache} from "./TableCache";
import {CommandsProcessorBase} from "../CommandsProcessorBase";
import {RemoteCommandsProcessor} from "../remote/RemoteCommandsProcessor";
import {ClientManager} from "../ClientManager";

/// <summary>
///   handles the loading and managing of all cache tables in the context
/// </summary>
export class TableCacheManager {
  private _tables: Hashtable<string, TableCache> = null;

  constructor() {
    this._tables = new Hashtable<string, TableCache>();
  }

  /// <summary>
  ///   return the tableCache object  according to its unique id or null if does not exist in the manager
  /// </summary>
  GetTableById(tableUId: string): TableCache {
    return <TableCache>this._tables.get_Item(tableUId);
  }

  /// <summary>
  ///   checks if a given table exists in the manager
  /// </summary>
  TableExists(tableUId: string): boolean {
    let result: boolean = true;

    if (this.GetTableById(tableUId) === null)
      result = false;

    return result;
  }

  /// <summary>
  ///   inserts a table into the manager is not already exists
  ///   returns true is insert succeeded false otherwise
  /// </summary>
  InsertTable(table: TableCache): boolean {
    let result: boolean = false;

    if (!this.TableExists(table.GetTableUniqueId())) {
      this._tables.set_Item(table.GetTableUniqueId(), table);
      result = true;
    }

    return result;
  }

  /// <summary>
  ///   loads a new table start the table parsing process
  ///   delete any old instances of the same table (even if they other unique ids
  /// </summary>
  LoadTable(tableUId: string): void {
    let server: CommandsProcessorBase = RemoteCommandsProcessor.GetInstance();

    // the table must exist in the hashTable at this stage else it is an error
    if (this.TableExists(tableUId)) {
      // get the table
      let current: TableCache = <TableCache>this._tables.get_Item(tableUId);
      try {
        let residentTableContentStr: string = server.GetContent(tableUId);
        try {
          ClientManager.Instance.RuntimeCtx.Parser.loadTableCacheData(residentTableContentStr);
        }
        catch (innerException) {
          if (innerException instanceof Exception) {
            throw new ApplicationException("Unable to parse resident table " + tableUId + ", due to unsupported encoding.", innerException);
          }
          else
            throw innerException;
        }
      }
      catch (throwable) {
        if (throwable instanceof Exception) {
          Misc.WriteStackTrace(throwable);
        }
        else
          throw throwable;
      }

      // start parsing
      current.FillData();

      // delete old tables
      let deletedUids: List<string> = new List<string>();
      let enumerator: Array_Enumerator<TableCache> = this._tables.Values;
      while (enumerator.MoveNext()) {
        let tbl: TableCache = <TableCache>enumerator.Current;
        let currIdent: string = tbl.GetTableCommonIdentifier();
        if (currIdent === current.GetTableCommonIdentifier() && tbl.GetTableUniqueId() !== tableUId)
          deletedUids.push(tbl.GetTableUniqueId());
      }
      // delete
      for (let i: number = 0; i < deletedUids.length; i = i + 1) {
        this._tables.Remove(deletedUids.get_Item(i));
      }
    }
  }
}
