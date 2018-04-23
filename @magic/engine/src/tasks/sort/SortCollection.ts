import {List, NString} from "@magic/mscorelib";
import {Sort} from "./Sort";
import {XmlParser, XMLConstants, Logger} from "@magic/utils";
import {ClientManager} from "../../ClientManager";
import {Task} from "../Task";
import {ConstInterface} from "../../ConstInterface";

// This will hold runtime sorts added on task.
export class SortCollection {
  private _sortTab: List<Sort> = null;

  /// <summary>
  ///   CTOR
  /// </summary>
  constructor() {
    this._sortTab = new List<Sort>();
  }

  /// <summary>
  ///   parse input string and fill inner data : Vector RTSortTab
  /// </summary>
  fillData(tsk: Task): void {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;
    while (this.initInnerObjects(parser, parser.getNextTag(), tsk)) {
    }
  }

  /// <summary>
  ///   allocate and fill inner objects of the class
  /// </summary>
  /// <param name = "foundTagName">possible  tag name, name of object, which need be allocated </param>
  initInnerObjects(parser: XmlParser, foundTagName: string, tsk: Task): boolean {
    if (foundTagName === null)
      return false;

    switch (foundTagName) {
      case ConstInterface.MG_TAG_SORTS:
        parser.setCurrIndex(parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex()) + 1);
        // end of outer tag and its ">"
        break;
      case ConstInterface.MG_TAG_SORT: {
        let sort: Sort = new Sort();
        this._sortTab.push(sort);
        let endContext: number = parser.getXMLdata().indexOf(XMLConstants.TAG_TERM, parser.getCurrIndex());

        if (endContext !== -1 && endContext < parser.getXMLdata().length) {
          // last position of its tag
          let tag: String = parser.getXMLsubstring(endContext);
          parser.add2CurrIndex(tag.indexOf(ConstInterface.MG_TAG_SORT) + ConstInterface.MG_TAG_SORT.length);

          let tokensVector: List<string> = new List<string>(XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM).GetEnumerator());
          // parse each column
          this.InitElements(tokensVector, sort);
          parser.setCurrIndex(endContext + XMLConstants.TAG_TERM.length); // to delete "/>" too
        }
      }
        break;

      case ConstInterface.MG_TAG_SORTS_END:
        parser.setCurrIndex2EndOfTag();
        return false;
    }
    return true;
  }

  /// <summary>
  ///   used to parse each column xml tag attributes the column represents a segment in the key
  /// </summary>
  private InitElements(tokensVector: List<string>, sort: Sort): void {
    for (let j: number = 0; j < tokensVector.length; j += 2) {

      let attribute: string = (tokensVector.get_Item(j));
      let valueStr: string = (tokensVector.get_Item(j + 1));

      switch (attribute) {
        case XMLConstants.MG_ATTR_ID: // sort segment i.e. fldIdx
          sort.fldIdx = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_DIR: // direction of sort segment
          sort.dir = valueStr === "A";
          break;
        default:
          Logger.Instance.WriteExceptionToLogWithMsg(NString.Format("Unrecognized attribute: '{0}'", attribute));
          break;
      }
    }
  }

  /// <summary>
  ///   get user event by its index in the vector
  /// </summary>
  /// <param name = "idx">the index of the requested event </param>
  getSort(idx: number): Sort {
    if (idx < 0 || this._sortTab === null || idx >= this._sortTab.length)
      return null;
    return this._sortTab.get_Item(idx);
  }

  /// <summary>
  ///   get size of the sort table
  /// </summary>
  getSize(): number {
    if (this._sortTab === null)
      return 0;
    return this._sortTab.length;
  }

  /// <summary>
  ///   add Sort to  Sort collection.
  /// </summary>
  /// <param name = "sort">Sort to be added </param>
  add(sort: Sort): void {
    this._sortTab.push(sort);
  }
}
