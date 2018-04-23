import {TableCache} from "../rt/TableCache";
import {List, NString} from "@magic/mscorelib";
import {FieldDef} from "@magic/gui";
import {Logger, XMLConstants, XmlParser} from "@magic/utils";
import {ClientManager} from "../ClientManager";
import {ConstInterface} from "../ConstInterface";

/// <summary>
///   represents a table key and all it segments
/// </summary>
export class Key {
  Columns: List<FieldDef> = null;  // a vector of Field object representing the fields of the table
  private _table: TableCache = null;
  private _id: number = 0;

  constructor(ownerTable: TableCache) {
    this._table = ownerTable;
    this.Columns = new List<FieldDef>();
  }

  /// <summary>
  ///   parses the data of this key
  /// </summary>
  FillData(): void {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;
    // fills the attributes of the key tag itself
    this.FillAttributes(parser);
    // init the inner objects mainly the segments of the key - represented as columns xml tags
    while (this.InitInnerObjects(parser, parser.getNextTag())) {
    }
  }

  /// <summary>
  ///   parses the attributes of the key actually there are only two id and type (at the moment)
  /// </summary>
  private FillAttributes(parser: XmlParser): void {
    let tokensVector: List<string>;
    let endContext: number = parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex());
    let tag: String;
    let attribute: String;

    if (endContext !== -1 && endContext < parser.getXMLdata().length) {
      // last position of its tag
      tag = parser.getXMLsubstring(endContext);

      parser.add2CurrIndex(tag.indexOf(ConstInterface.MG_ATTR_KEY) + ConstInterface.MG_ATTR_KEY.length);

      tokensVector = XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);

      // parse the key attributes
      for (let j: number = 0; j < tokensVector.length; j += 2) {
        attribute = (tokensVector.get_Item(j));
        let valueStr: string = (tokensVector.get_Item(j + 1));

        if (attribute === XMLConstants.MG_ATTR_ID)
          this._id = XmlParser.getInt(valueStr);
        else if (attribute === XMLConstants.MG_ATTR_TYPE)
          Logger.Instance.WriteDevToLog("in Key.fillAttributes() obsolete attribute (TODO: remove from server)" + attribute);
        else
          Logger.Instance.WriteExceptionToLogWithMsg(NString.Format("Unrecognized attribute: '{0}'", attribute));
      }
      parser.setCurrIndex(++endContext);  // to delete ">" too
      return;
    }
    Logger.Instance.WriteExceptionToLogWithMsg("in Key.fillAttributes() out of string bounds");
  }

  /// <summary>
  ///   used to parse each column xml tag attributes the column represents a segment in the key
  /// </summary>
  private InitElements(tokensVector: List<string>): void {

    for (let j: number = 0; j < tokensVector.length; j = j + 2) {

      let attribute: string = tokensVector.get_Item(j);
      let valueStr: string = tokensVector.get_Item(j + 1);

      switch (attribute) {
        case XMLConstants.MG_ATTR_ID:
          this.Columns.push(this._table.FldsTab.getField(XmlParser.getInt(valueStr)));
          break;
        case XMLConstants.MG_ATTR_SIZE:
          break;
        case ConstInterface.MG_ATTR_DIR:
          break;
        default:
          Logger.Instance.WriteExceptionToLogWithMsg(NString.Format("Unrecognized attribute: '{0}'", attribute));
          break;
      }
    }
  }

  /// <summary>
  ///   allocates and initialize inner object according to the found xml data
  /// </summary>
  private InitInnerObjects(parser: XmlParser, foundTagName: string): boolean {
    if (foundTagName === null)
      return false;

    if (foundTagName === ConstInterface.MG_TAG_COLUMN) {
      let endContext: number = parser.getXMLdata().indexOf(XMLConstants.TAG_TERM, parser.getCurrIndex());

      if (endContext !== -1 && endContext < parser.getXMLdata().length) {

        // last position of its tag
        let tag: string = parser.getXMLsubstring(endContext);
        parser.add2CurrIndex(tag.indexOf( ConstInterface.MG_TAG_COLUMN) + ConstInterface.MG_TAG_COLUMN.length);

        let tokens: List<string> = XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM)/*'"'*/;
        // parse each column
        this.InitElements(tokens);
        parser.setCurrIndex(endContext + XMLConstants.TAG_TERM.length); // to delete "/>" too
      }
      else
        Logger.Instance.WriteExceptionToLogWithMsg("in Key.initInnerObjects() out of string bounds");
    }
    else if (foundTagName === ConstInterface.MG_ATTR_KEY) {
      parser.setCurrIndex2EndOfTag();
      return false;
    }
    else {
      Logger.Instance.WriteExceptionToLogWithMsg("There is no such tag in LinksTable.initInnerObjects(): " + foundTagName);
      return false;
    }
    return true;
  }

  /// <summary>
  ///   returns the key id
  /// </summary>
  GetKeyId(): number {
    return this._id;
  }
}
