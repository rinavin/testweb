import {Hashtable, Array_Enumerator, List, IEnumerable} from "@magic/mscorelib";
import {Task} from "../tasks/Task";
import {Misc} from "@magic/utils";
import {TasksTable} from "../tasks/TasksTable";
import {DataView} from "./DataView";

/// <summary>
///   this class represents the datastructure of the subforms dataview cache
/// </summary>
export class DvCache {
  private _cacheTable: Hashtable<number, DataView> = null; // the table that save all dataview in the cache
  private _deletedList: List<number> = null; // a list of all dvPos values (non hashed) that were deleted from the cache
  private _task: Task = null;
  private _cacheSize: number = 0;

  /// <summary>
  ///
  /// </summary>
  /// <param name="tsk"></param>
  constructor(tsk: Task) {

    this._task = tsk;
    this._cacheTable = new Hashtable<number, DataView>(100, 0.7);
    this._deletedList = new List<number>();
    this._cacheSize = 0;
  }

  /// <summary>
  ///   puts a dataview object in the cache
  /// </summary>
  /// <param name = "repOfOriginal">a replicate of the dataview we wish to insert in cache </param>
  putInCache(repOfOriginal: DataView): boolean {
    let hashKey: number = repOfOriginal.getDvPosValue();
    let insertedSize: number = repOfOriginal.getSize() * repOfOriginal.getCurrRec().getRecSize();

    // if the new d.v already exists in cache remove the old entry and enter the new one
    if (this._cacheTable.get_Item(hashKey) !== null)
      this.removeDvFromCache(hashKey, false);

    // time stamps the storded d.v put it in cache and update cache size
    repOfOriginal.setCacheLRU();
    repOfOriginal.taskModeFromCache = this._task.getMode();
    repOfOriginal.zeroServerCurrRec();
    this._cacheTable.set_Item(hashKey, repOfOriginal);

    // check s that there the new inserted data view does not appear in the del list
    // this could happen due to lru management
    this._deletedList.Remove(hashKey);

    this._cacheSize += insertedSize;
    return true;
  }

  /// <summary>
  ///   removes a dtatview from the cache
  /// </summary>
  /// <param name = "DvPosValue">the dvPos value which uniquely identify the dataview </param>
  removeDvFromCache(DvPosValue: number, updateDel: boolean): boolean {

    // locate the dataview object according to the given key
    let rep: DataView = <DataView>this._cacheTable.get_Item(DvPosValue);

    if (rep !== null) {
      this._cacheSize -= (rep.getSize() * rep.getCurrRec().getRecSize());

      if (updateDel)
        this._deletedList.push(DvPosValue);

      this._cacheTable.Remove(DvPosValue);
      return true;
    }
    return false;
  }

  /// <summary>
  ///   constructs from the deleted list a string representation
  /// </summary>
  getDeletedListToXML(): string {
    let list: string = "";

    for (let i: number = 0;
         i < this._deletedList.length;
         i++) {

      if (i > 0)
        list = list + ",";

      list += this._deletedList.get_Item(i).toString();
    }
    return list;
  }

  /// <summary>
  ///   clears the deleted list
  ///   usally will be invoked after a server access
  /// </summary>
  clearDeletedList(): void {
    this._deletedList.Clear();
  }

  /// <summary>
  ///   gets a requested dataview
  /// </summary>
  /// <param name = "DvPosValue">the dvPos value which uniquely identify the dataview </param>
  /// <returns> the requested cached DataView object </returns>
  getCachedDataView(DvPosValue: number): DataView {
    let cached: DataView = <DataView>this._cacheTable.get_Item(DvPosValue);

    // locate the dataview object according to the given key
    if (cached !== null)
      cached = cached.replicate();
    return cached;
  }

  /// <summary>
  ///   get the hashed dvPosValue of the lru dataview in the cache
  /// </summary>
  private getLastUsedDv(): number {
    let currentTimeStamp: number = Misc.getSystemMilliseconds();
    let lruDiff: number = -1;
    let lruDvPos: number = -1;

    // goes over all elemnts in the hash table
    let keysList: Array_Enumerator<number> = this._cacheTable.Keys;

    while (keysList.MoveNext()) {
      let current: DataView = <DataView>this._cacheTable.get_Item(keysList.Current);
      let diff: number = currentTimeStamp - current.getCacheLRU();

      if (diff > lruDiff) {
        lruDiff = diff;
        lruDvPos = current.getDvPosValue();
      }
    }
    return lruDvPos;
  }

  /// <summary>
  ///   remove all records from cache
  ///   clear the cache of all sub forms too
  /// </summary>
  clearCache(): void {
    // clears current cache
    let dvKeysList: List<number> = new List(this._cacheTable.Keys);

    dvKeysList.forEach((dvKey: number) => {
      this.removeDvFromCache(dvKey, true);
    });

    // clears all sub-forms cache
    if (this._task.hasSubTasks()) {
      let subTasks: TasksTable = this._task.getSubTasks();

      for (let j: number = 0; j < subTasks.getSize(); j = j + 1)
        subTasks.getTask(j).getTaskCache().clearCache();
    }

    // invalidate the current d.v so it will not enter the cache on return from server
    (<DataView>this._task.DataView).setChanged(true);
  }

  isDeleted(dvPosVal: number): boolean {
    return this._deletedList.Contains(dvPosVal);
  }
}
