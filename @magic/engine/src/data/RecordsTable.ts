import {IRecordsTable} from "./IRecordsTable";
import {Record} from "./Record";
import {DataView} from "./DataView";
import {ClientManager} from "../ClientManager";
import {DataModificationTypes, ObjectReferencesCollection} from "@magic/gui";
import {FieldsTable} from "./FieldsTable";
import {ApplicationException, Hashtable, Int32, List, StringBuilder} from "@magic/mscorelib";
import {Logger} from "@magic/utils";

///   an object of this class holds a collection of records
export class RecordsTable implements IRecordsTable {
  static REC_NOT_FOUND: number = -1;
  private _useLinkedList: boolean = false;
  private _hashTab: Hashtable<number, Record> = null;
  private _initialCurrRecId: number = Int32.MinValue;
  private _records: List<Record> = null;
  private _serverCurrRec: Record = null;

  /// <summary>
  ///   returns the number of records inserted in the begining of the table
  /// </summary>
  InsertedRecordsCount: number = 0;

  /// <summary>
  ///   CTOR
  /// </summary>
  /// <param name = "withLinkedList">maintain table as a linked list
  ///   from one item to another
  /// </param>
  constructor(withLinkedList: boolean);
  constructor(recordTable: RecordsTable);
  constructor(withLinkedListOrRecordTable: RecordsTable| boolean) {
    if (withLinkedListOrRecordTable.constructor === Boolean) {
      this._records = new List<Record>();
      this._hashTab = new Hashtable<number, Record>(100, 0.7);
      this._useLinkedList = <boolean>withLinkedListOrRecordTable;
      this.InsertedRecordsCount = Int32.MinValue;
    }
    else
      Object.assign(this, withLinkedListOrRecordTable);
  }

  /// <summary>
  ///   parse input string and fill inner data - returns the refresh type for the task
  /// </summary>
  /// <param name = "dataview">a reference to the dataview
  /// </param>
  fillData(dataview: DataView, insertAt: string): string {
    let c: string = 'N';
    let record: Record = null;
    let flag: boolean = false;
    this.InsertedRecordsCount = 0;
    this._initialCurrRecId = Int32.MinValue;
    let nextTag: string = ClientManager.Instance.RuntimeCtx.Parser.getNextTag();
    while (nextTag !== null && nextTag === "rec") {
      let record2: Record = new Record(dataview);
      let isCurrRec: boolean = record2.fillData();
      if (isCurrRec && !dataview.HasMainTable) {
        let dcRefs2: ObjectReferencesCollection;
        let dcRefs: ObjectReferencesCollection = dcRefs2 = record2.getDcRefs();
        try {
          for (let i: number = 0; i < this.getSize(); i = i + 1) {
            this.getRecByIdx(i).setDcRefs(dcRefs);
          }
        }
        finally {
          if (dcRefs2 !== null) {
            (dcRefs2).Dispose();
          }
        }
      }
      if (isCurrRec) {
        if (dataview.getTask().getMode() !== 'C') {
          record2.setOldRec();
        }
        this._initialCurrRecId = record2.getId();

        // save the current record as sent by the server.
        this._serverCurrRec = record2.replicate();
        if (c === 'N') {
          c = 'C'/*'C'*/;
        }
        else {
          c = 'F'/*'F'*/;
        }
      }
      else {
        record2.setOldRec();
        c = 'T'/*'T'*/;
      }
      let foundRec: Record = this.getRecord(record2.getId());
      if (foundRec !== null) {
        let updated: boolean = foundRec.Updated;
        let modified: boolean = foundRec.Modified;
        // let mode: DataModificationTypes = foundRec.getMode();
        let computed: boolean = foundRec.isComputed();
        let prevRec: Record = foundRec.getPrevRec();
        let nextRec: Record = foundRec.getNextRec();
        foundRec.setSameAs(record2, false);
        foundRec.setPrevRec(prevRec);
        foundRec.setNextRec(nextRec);
        foundRec.setComputed(computed);
        if (modified)
          foundRec.setModified();
        if (updated)
          foundRec.setUpdated();
      }
      else {
        this.InsertRecord(insertAt, record2);

        // If record being added at the top (0th position), decrement the recordsbeforeCurrentView.
        if (dataview.getTask().isTableWithAbsolutesScrollbar() && insertAt === 'B') {

          // Empty dataview initial value of TotalRecordsCount is zero. And when first record being inserted,
          // through Task.insertRecordTable(). Else, the TotalRecordsCount gets incremented through MgForm.Addrec()
          if (dataview.TotalRecordsCount === 0)
            dataview.TotalRecordsCount = dataview.TotalRecordsCount + 1;

          // Having locate operation with RecordsBeforeCurrentView > 0 and if moving in reverse direction, the updated
          // counts are not retrieved again. Hence, decrement RecordsBeforeCurrentView as record gets added in dataview.
          if (dataview.RecordsBeforeCurrentView > 0)
            dataview.RecordsBeforeCurrentView = dataview.RecordsBeforeCurrentView - 1;
        }

        // make sure that a new record created by the server is in 'insert' mode
        // and mark it as a 'computed' record
        if (isCurrRec && dataview.getTask().getMode() === 'C')
          record2.setMode(DataModificationTypes.Insert);
        record2.setComputed(true);
      }
      nextTag = ClientManager.Instance.RuntimeCtx.Parser.getNextTag();
      if (!isCurrRec)
        record = record2;

      flag = true;
    }

    // Currently RecordsTable include lonely record
    // We duplicate it record due to full chunk
    // This mechanism is for No_main_table case only
    let num: number = 0;
    while (!dataview.HasMainTable && record !== null && num < dataview.getChunkSize() - 1) {
      let record4: Record = new Record(dataview);
      record4.setSameAs(record, false, record.getId() + num + 1);
      record4.setOldRec();
      this.addRec(record4);
      num = num + 1;
    }

    // if server sent us a curr rec, then we already have it.
    // if no curr rec was sent, but other data was sent: we no longer know
    //    what curr rec the server has -> discard our curr rec
    // if no data was sent, the server curr rec is what we sent it last time.
    if (this._initialCurrRecId === Int32.MinValue) {
      if (flag)
        this._serverCurrRec = null;
      else {
        if (dataview.getCurrRec() !== null)
          this._serverCurrRec = dataview.getCurrRec().replicate();
        else
          this._serverCurrRec = null;
      }
    }

    return c;
  }

  /// <summary>
  /// insert Record into records Table
  /// </summary>
  /// <param name="insertAt"></param>
  /// <param name="record"></param>
  InsertRecord(insertAt: string, record: Record): void {
    if (insertAt === 'B') {
      let insertedRecordsCount: number = this.InsertedRecordsCount;
      this.InsertedRecordsCount = insertedRecordsCount + 1;
      this.insertRecord(record, 0);
    }
    else
      this.addRec(record);
  }

  /// <summary>
  ///   build XML string for the records
  /// </summary>
  /// <param name = "fieldsTab">the fields table for the records table
  /// </param>
  /// <param name = "message">to build, add parts
  ///   <param name = "skipCurrRec">Skip current record
  ///     <param name = "currRecId">Current record ID
  ///     </param>
  buildXML(fieldsTab: FieldsTable, message: StringBuilder, skipCurrRec: boolean, currRecId: number): void {
    for (let i: number = 0; i < this._records.length; i = i + 1) {
      // In case the previous record is not known to the server (OP_INSERT'ed) and is to be
      // dumped only after this record (it's idx is greater then 'i'), then temporary change
      // my prev record so the server won't get confused.
      let record: Record = this._records.get_Item(i);

      if (!record.SendToServer || (skipCurrRec && record.getId() === currRecId))
        continue;

      let prevRec: Record;
      let record2: Record = prevRec = record.getPrevRec();
      let recIdx: number;
      // QCR #505277: The previous record may be unknown to the server but not in
      // the modified list yet. Therefore, if the previous record was not found
      // in that list then do another iteration of the loop.
      while (prevRec !== null && typeof prevRec !== "undefined" &&
             (prevRec.getMode() === DataModificationTypes.Insert || !prevRec.SendToServer) &&
             record.getMode() === DataModificationTypes.Insert &&
             ((recIdx = this.getRecIdx(prevRec.getId())) > i || recIdx === RecordsTable.REC_NOT_FOUND || !prevRec.SendToServer)) {
        prevRec = prevRec.getPrevRec();
        record.setPrevRec(prevRec);
      }

      record.buildXML(message, false);
      if (prevRec !== record2) {
        record.setPrevRec(record2);
      }
    }
  }

  /// <summary>
  ///   return a record by its id or null if the record was not found
  /// </summary>
  /// <param name = "id">the id of the record
  /// </param>
  /// <returns> Record the requested record
  /// </returns>
  getRecord(id: number): Record {
    return <Record>this._hashTab.get_Item(id);
  }

  /// <summary>
  ///   return a record index by its id - if no record was found (REC_NOT_FOUND) is returned
  /// </summary>
  /// <param name = "id">is the id of the record
  /// </param>
  /// <returns> the requested record index
  /// </returns>
  getRecIdx(id: number): number {
    let result: number = RecordsTable.REC_NOT_FOUND;
    let record: Record = this.getRecord(id);
    if (record !== null) {
      result = this._records.indexOf(record);
    }

    return result;
  }

  /// <summary>
  ///   get a record by its index in the table
  /// </summary>
  /// <param name = "int">is the record index in the table
  /// </param>
  /// <returns> Record is the requested record
  /// </returns>
  getRecByIdx(idx: number): Record {
    if (idx < 0 || idx >= this._records.length) {
      Logger.Instance.WriteDevToLog("in RecordsTable.getRecByIdx() index out of bounds: " + idx);
      return null;
    }

    return this._records.get_Item(idx);
  }

  /// <summary>
  ///   remove all the records from the table
  /// </summary>
  removeAll(): void {
    this._records.Clear();
    this._hashTab.Clear();
  }

  /// <summary>
  ///   get the number of records in the table
  /// </summary>
  getSize(): number {
    return this._records.length;
  }

  /// <summary>
  ///   returns the current record, as was set by the XML (arriving from the server).
  ///   A Integer.MIN_VALUE indicates that it was not set at all.
  /// </summary>
  getInitialCurrRecId(): number {
    return this._initialCurrRecId;
  }

  /// <summary>
  ///   add a record to the end of the table - unless it is already in the table
  /// </summary>
  /// <param name = "rec">the record to add
  /// </param>
  addRecord(rec: Record): void {
    if (this._records.indexOf(rec) < 0) {
      this.addRec(rec);
    }
  }

  /// <summary>
  ///   adds a record to the records table
  /// </summary>
  private addRec(rec: Record): void {
    if (this._useLinkedList && this._records.length > 0) {
      let record: Record = this._records.get_Item(this._records.length - 1);
      record.setNextRec(rec);
      rec.setPrevRec(record);
    }

    this._records.push(rec);
    this._hashTab.set_Item(rec.getHashKey(), rec);
  }

  /// <summary>
  ///   insert a record at the specified index
  /// </summary>
  /// <param name = "rec">the record to insert
  /// </param>
  /// <param name = "idx">the index of the new record
  /// </param>
  insertRecord(rec: Record, idx: number): void {
    if (this._useLinkedList) {
      if (idx > 0) {
        let record: Record = this._records.get_Item(idx - 1);
        rec.setPrevRec(record);
        record.setNextRec(rec);
      }

      if (idx !== this._records.length) {
        let record2: Record = this._records.get_Item(idx);
        rec.setNextRec(record2);
        record2.setPrevRec(rec);
      }
    }

    this._records.Insert(idx, rec);
    this._hashTab.set_Item(rec.getHashKey(), rec);
  }

  /// <summary>
  ///   remove a record from the table by its index in the table
  /// </summary>
  /// <param name = "recIdx">record index
  /// <param name = "rec">a reference to the record to remove
  /// </param>
  removeRecord(recIdx: number): void;
  removeRecord(rec: Record): void;
  removeRecord(recIdxOrRec: any): void {
    if (arguments.length === 1 && (recIdxOrRec === null || recIdxOrRec.constructor === Number)) {
      this.removeRecord_0(recIdxOrRec);
      return;
    }

    this.removeRecord_1(recIdxOrRec);
  }

  private removeRecord_0(recIdx: number): void {
    if (recIdx >= 0 && recIdx < this._records.length) {
      let record: Record = this._records.get_Item(recIdx);
      let useLinkedList: boolean = this._useLinkedList;
      if (useLinkedList) {
        if (recIdx > 0) {
          let record2: Record = this._records.get_Item(recIdx - 1);
          record2.setNextRec(record.getNextRec());
        }
        if (recIdx + 1 < this._records.length) {
          let record2: Record = this._records.get_Item(recIdx + 1);
          record2.setPrevRec(record.getPrevRec());
        }
      }

      this._hashTab.Remove(record.getHashKey());
      this._records.RemoveAt(recIdx);
      return;
    }

    throw new ApplicationException("in RecordsTable.removeRecord(): invalid index: " + recIdx);
  }

  private removeRecord_1(rec: Record): void {
    let num: number = this._records.indexOf(rec);
    if (num >= 0) {
      this.removeRecord(num);
    }
  }

  /// <summary>
  ///   clones this Records Tab
  /// </summary>
  replicate(): RecordsTable {
    let recordsTable: RecordsTable = new RecordsTable(this);
    recordsTable._records = new List<Record>();
    recordsTable._hashTab = new Hashtable<number, Record>(100, 0.7);

    for (let i: number = 0; i < this._records.length; i = i + 1) {
      let record: Record = this._records.get_Item(i).replicate();
      recordsTable._records.push(record);
      recordsTable._hashTab.set_Item(record.getHashKey(), record);
    }

    return recordsTable;
  }

  getServerCurrRec(): Record {
    return this._serverCurrRec;
  }

  zeroServerCurrRec(): void {
    this._serverCurrRec = null;
  }

  /// <summary>
  ///
  /// </summary>
  /// <returns></returns>
  GetSize(): number {
    return this.getSize();
  }

  GetRecByIdx(idx: number): Record {
    return this.getRecByIdx(idx);
  }

  RemoveAll(): void {
    this.removeAll();
  }
}
