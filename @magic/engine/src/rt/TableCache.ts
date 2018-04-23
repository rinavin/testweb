import {List, NString} from "@magic/mscorelib";
import {Key} from "../data/Key";
import {FieldsTable} from "../data/FieldsTable";
import {Logger, XMLConstants, XmlParser} from "@magic/utils";
import {ClientManager} from "../ClientManager";
import {Record} from "../data/Record";
import {HeapSort} from "../util/HeapSort";
import {Boundary} from "./Boundary";
import {ConstInterface} from "../ConstInterface";

/// <summary>
///   resident table on client
/// </summary>
export class TableCache {
  private _keys: List<Key> = null;
  private _records: List<Record> = null;
  private _currSortDir: string = '\0';
  private _currSortKey: number = 0;

  FldsTab: FieldsTable = null;

  private _isLoaded: boolean = false;
  private _tableIdent: string = null; // a table identifier this id if share between all instances of a resident table used to delete old instnces of a reloaded table;
  private _tableUId: string = null; // the table unique id used to load the table - it is also the id of the data-island containing the table xml

  /// <summary>
  ///   constructs an empty table cache without loading the table
  /// </summary>
  constructor(tableId: string) {
    this._tableUId = tableId;
    this._keys = new List<Key>();
    this._records = new List<Record>();
    this._isLoaded = false;
  }

  /// <summary>
  ///   set the table shared identifier will be called directly before the constructor and before parsing
  /// </summary>
  SetTableIdent(ident: string): void {
    if (this._tableIdent === null)
      this._tableIdent = ident;
    else if (this._tableIdent !== ident) {
      Logger.Instance.WriteExceptionToLogWithMsg("in TableCache.setTableIdent() already set and table identifier  does not match");
    }
  }

  /// <summary>
  ///   parses the xml data of the table cache as part of the load process
  /// </summary>
  FillData(): void {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;
    this.FillAttributes(parser);
    while (this.InitInnerObjects(parser, parser.getNextTag())) {
    }
  }

  /// <summary>
  ///   parses the attributes of the cachedTable tag
  /// </summary>
  private FillAttributes(parser: XmlParser): void {
    let endContext: number = parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex());

    if (endContext !== -1 && endContext < parser.getXMLdata().length) {
      // last position of its tag
      let tag: string = parser.getXMLsubstring(endContext);
      parser.add2CurrIndex(tag.indexOf(ConstInterface.MG_TAG_CACHED_TABLE) + ConstInterface.MG_TAG_CACHED_TABLE.length);

      let tokensVector: List<string> = XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);

      // parse the cachedTable attributes
      for (let j: number = 0; j < tokensVector.length; j += 2) {
        let attribute: string = (tokensVector.get_Item(j));
        let valueStr: string = (tokensVector.get_Item(j + 1));

        switch (attribute) {
          case XMLConstants.MG_ATTR_ID:

            // the id of the table is recived at the constructor and does not need to be parsed
            // however issue a warnning if the parsed value is different than the current value
            if (this._tableUId.indexOf(valueStr) === -1) {
              this._tableUId = valueStr;
              Logger.Instance.WriteExceptionToLogWithMsg("in TableCache.fillAttributes() table unique id does not match");
            }
            break;

          case XMLConstants.MG_ATTR_NAME:
            break;

          case ConstInterface.MG_ATTR_IDENT:
            if (this._tableIdent !== valueStr) {
              this._tableIdent = valueStr;
              Logger.Instance.WriteExceptionToLogWithMsg("in TableCache.fillAttributes() table identifier id does not match");
            }
            break;
          default:
            Logger.Instance.WriteExceptionToLogWithMsg(NString.Format("Unrecognized attribute: '{0}'", attribute));
            break;
        }
      }
      parser.setCurrIndex(++endContext);  // to delete ">" too
      return;
    }
    Logger.Instance.WriteExceptionToLogWithMsg("in TableCache.fillAttributes() out of string bounds");
  }

  /// <summary>
  ///   allocates and initialize inner object according to the found xml data
  /// </summary>
  private InitInnerObjects(parser: XmlParser, foundTagName: String): boolean {
    if (foundTagName == null)
      return false;

    switch (foundTagName) {
      case XMLConstants.MG_TAG_FLDH:
        this.FldsTab = new FieldsTable();
        this.FldsTab.fillData();
        break;

      case ConstInterface.MG_ATTR_KEY: {
        let current = new Key(this);
        current.FillData();
        this._keys.push(current);
        break;
      }

      case ConstInterface.MG_TAG_RECORDS:
        parser.setCurrIndex(parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex()) + 1);
        // end of outer tad and its ">"
        break;
      case ConstInterface.MG_TAG_RECORDS_END:
        parser.setCurrIndex2EndOfTag();
        break;
      case ConstInterface.MG_TAG_CACHED_TABLE_END:
        parser.setCurrIndex2EndOfTag();
        return false;
      case ConstInterface.MG_TAG_REC: {
        let current = new Record(this);
        current.fillData();
        this._records.push(current);
        break;
      }
    }
    return true;
  }

  /// <summary>
  ///   returns the unique id of the current cached table
  /// </summary>
  GetTableUniqueId(): string {
    return this._tableUId;
  }

  /// <summary>
  ///   return the table common identifier
  /// </summary>
  GetTableCommonIdentifier(): string {
    return this._tableIdent;
  }

  /// <summary>
  ///   returns the key by whic we are currently sorting (or currently sorted) the table
  /// </summary>
  GetCurrSortKey(): number {
    return this._currSortKey;
  }

  /// <summary>
  ///   returns the key by id
  /// </summary>
  GetKeyById(keyId: number): Key {
    for (let i: number = 0; i < this._keys.length; i = i + 1) {
      if (this._keys.get_Item(i).GetKeyId() === keyId)
        return this._keys.get_Item(i);
    }
    return null;
  }

  /// <summary>
  ///   loads a table from the dataIsland according to is unique id
  /// </summary>
  private Load(): void {
    if (!this._isLoaded) {
      ClientManager.Instance.getTableCacheManager().LoadTable(this._tableUId);
      this._isLoaded = true;
    }
  }

  /// <summary>
  ///   sort the current table
  /// </summary>
  /// <param name="sortKeyId">the id of the key to sort by </param>
  /// <param name="sortDir"></param>
  SortTable(sortKeyId: number, sortDir: string): void {
    if (!this._isLoaded)
      this.Load();

    // if the table is already sorted the way we want it
    if (sortKeyId !== this._currSortKey || sortDir !== this._currSortDir) {
      this._currSortDir = sortDir;
      this._currSortKey = sortKeyId;

      let recordsArr: Record[] = this._records.ToArray();
      HeapSort.sort(recordsArr);

      if (this._currSortDir === 'D')
        this.ReverseVector(recordsArr);

      for (let i: number = 0; i < this._records.length; i = i + 1) {
        this._records.set_Item(i, recordsArr[i]);
      }
    }
  }

  /// <summary>
  ///   executes the the link operation we assume the table is already sorted by the correct key and direction
  ///   the method returns the requested record according the locates
  /// </summary>
  Fetch(loc: List<Boundary>): Record {

    // if there are not any locate expression then either we return the ffirst record that accepts
    // al the range condition or we return the first record in the table according to the current sort
    let checkLoc: boolean = loc.length > 0;

    if (this._isLoaded) {
      // should be loaded at sort time the time must be already sorted at this stage
      if (!checkLoc) {
        // if there are no locates return the first record
        return ((this._records.length !== 0) ? this._records.get_Item(0) : null);
      }

      // find the first record that agrees with the locates ant return it
      for (let i: number = 0; i < this._records.length; i = i + 1) {
        let currRec: Record = this._records.get_Item(i);

        // check if this record agrees with all the locate conditions
        if (TableCache.validateRec(currRec, loc)) {
          return currRec;
        }
      }
    }
    // if we got here then either the table was not loaded and sorted or we did not find any record
    // that agrees with the locate expressions - in either case return null
    return null;
  }

  /// <summary>
  ///   validate a record data against a series of locate expressions
  /// </summary>
  private static validateRec(currRec: Record, rangeCond: List<Boundary>): boolean {
    let result: boolean = true;

    // go over all the conditions
    for (let i: number = 0; i < rangeCond.length; i = i + 1) {
      let currCnd: Boundary = rangeCond.get_Item(i);
      // if there is at least one filed that does not agree all the record dies not agree
      if (!currCnd.checkRange(currRec.GetFieldValue(currCnd.getCacheTableFldId()), currRec.IsNull(currCnd.getCacheTableFldId()))) {
        result = false;
        break;
      }
    }
    return result;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="array"></param>
  protected ReverseVector(array: Object[]): void {
    let right: number = array.length - 1;
    for (let left: number = 0; left < Math.floor((array.length - 1) / 2); left++ , right--) {
      let tmp: Object = array[left];
      array[left] = array[right];
      array[right] = tmp;
    }
  }
}
