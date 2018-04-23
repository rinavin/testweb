import {Array_Enumerator, Hashtable, NString, StringBuilder} from "@magic/mscorelib";
import {Logger, XMLConstants, XmlParser} from "@magic/utils";
import {DataviewHeaderBase} from "./DataviewHeaderBase";
import {ClientManager} from "../ClientManager";
import {DataviewHeadersSaxHandler} from "./DataviewHeadersSaxHandler";
import {RemoteDataviewHeader} from "./RemoteDataviewHeader";
import {Task} from "../tasks/Task"
import {ConstInterface} from "../ConstInterface";

/// <summary>
///   handles all links in the task
/// </summary>
export class DataviewHeaders {
  private _dataviewHeaders: Hashtable<number, DataviewHeaderBase> = null;
  private _task: Task = null;

  // initialize the links table of a given task
  constructor(task: Task) {
    this._task = task;
    this._dataviewHeaders = new Hashtable<number, DataviewHeaderBase>();
  }

  /// <summary>
  ///   this method will parse the xml data relate to the links table and will allocate and initilaize all related data
  /// </summary>
  fillData(): void {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;
    while (this.initInnerObjects(parser, parser.getNextTag())) {
    }
  }

  /// <summary>
  ///   allocates and initialize inner object according to the found xml data
  /// </summary>
  private initInnerObjects(parser: XmlParser, foundTagName: string): boolean {
    if (foundTagName === null)
      return false;

    if (foundTagName === ConstInterface.MG_TAG_LINKS) {
      let endContext: number = parser.getXMLdata().indexOf( ConstInterface.MG_TAG_LINKS_END, parser.getCurrIndex()) + ConstInterface.MG_TAG_LINKS_END.length + 1;
      let xml: string = parser.getXMLsubstring(endContext);
      xml = XmlParser.escapeUrl(xml);

      // Activate the sax parser
      let dataviewHeadersSaxHandler: DataviewHeadersSaxHandler = new DataviewHeadersSaxHandler(this._task, this._dataviewHeaders, xml);

      // skip to after the links
      parser.setCurrIndex(endContext + XMLConstants.TAG_CLOSE.length);
    }
    else
      Logger.Instance.WriteExceptionToLogWithMsg("There is no such tag in LinksTable.initInnerObjects(): " + foundTagName);
  }

  /// <summary>
  ///   gets a links by it id
  /// </summary>
  getDataviewHeaderById(linkId: number): DataviewHeaderBase {
    return <DataviewHeaderBase>this._dataviewHeaders.get_Item(linkId);
  }

  /// <summary>
  ///   builds the db pos string of all links in the table
  ///   the format is @lnk1_dbPos@lnk2_dbPos@...
  /// </summary>
  buildDbPosString(): string {
    if (this._dataviewHeaders.Count === 0) {
      return null;
    }

    let buf: StringBuilder = new StringBuilder();
    let dataviewHeaders: Array_Enumerator<DataviewHeaderBase> = this._dataviewHeaders.Values;

    while (dataviewHeaders.MoveNext()) {
      let curr: RemoteDataviewHeader = ((dataviewHeaders.Current instanceof RemoteDataviewHeader) ?  <RemoteDataviewHeader>dataviewHeaders.Current : null);

      if (curr !== null) {
        let currDbPosVal: string = curr.getLastFetchedDbPos();
        buf.Append("@");

        // if the last fetch db pos of the link is null it means that we never fetched a record from the link
        if (currDbPosVal !== null) {
          buf.Append(currDbPosVal);
        }
      }
    }
    buf.Append("@");
    return buf.ToString();
  }

  /// <summary>
  ///   returns the number of links in the table (only simple links are knowen to the client
  /// </summary>
  getDataiewHeadersCount(): number {
    return this._dataviewHeaders.Count;
  }
}
