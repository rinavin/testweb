import {Dictionary, List, StringBuilder} from "@magic/mscorelib";
import {Logger, XMLConstants, XmlParser} from "@magic/utils";
import {ClientManager} from "../ClientManager";
import {ConstInterface} from "../ConstInterface";
import {IMirrorXML} from "./IMirrorXML";

export enum ParamParseResult {
  OK,         // save the value as is
  TOUPPER,    // convert the name to upper case, so it would be case insensitive
  DELETE,     // remove the variable from the dictionary
  FAILED      // parsing error
}

/// <summary> This class manages a dictionary of variables. then name of the variable is the key
/// </summary>
export class PrmMap<TValue extends IMirrorXML>{
  values: Dictionary<TValue> = null;

  /// <summary> get the value
  ///
  /// </summary>
  /// <param name="s"></param>
  /// <returns></returns>
  protected getvalue(s: string): TValue {
    if (this.values.ContainsKey(s))
      return this.values.get_Item(s);
    else
      return null;
  }

  /// <summary> set
  /// </summary>
  setValue(s: string, v: TValue): void {
    this.values.set_Item(s, v);
  }

  /// <summary> remove an entry
  /// </summary>
  remove(s: string): void {
    this.values.Remove(s);
  }

  /// <summary> CTOR
  /// </summary>
  constructor() {
      this.values = new Dictionary<TValue>();
  }
}

/// <summary> This class manages the mirroring. It holds a list of changed values that need to be
/// mirrored, and manages the writing of those values to an XML buffer
/// </summary>
export class MirrorPrmMap<TValue extends IMirrorXML> extends PrmMap<TValue> {

  // List of changed variables
  protected changes: List<string> = null;

  // Type of variables in the table - use as an id in the XML buffer
  protected  mirroredID: string = null;

  private type ;

  /// <summary> CTOR
  /// </summary>
  constructor(type: new () => TValue) {
    super();
    this.type = type;
    this.changes = new List<string>();
  }

  /// <summary>
  /// create new instance of specified type
  /// </summary>
  private new(): TValue {
    return new this.type();
  }


  setValue(s: string, v: TValue, addToChanges?: boolean): void {
    if (arguments.length === 3)
      this.setValue_0(s, v, addToChanges);
    else
      this.setValue_1(s, v);
  }

  /// <summary> set
  /// </summary>
  private setValue_0(s: string, v: TValue, addToChanges: boolean): void {
    if (addToChanges && !this.changes.Contains(s))
      this.changes.push(s);
    super.setValue(s, v);
  }

  /// <summary> set
  /// </summary>
  private setValue_1(s: string, v: TValue): void {
    if (!this.changes.Contains(s))
      this.changes.push(s);
    super.setValue(s, v);
  }

  /// <summary> remove
  /// </summary>
  remove(s: string): void {
    if (!this.changes.Contains(s)) {
      this.changes.push(s);
    }
    super.remove(s);
  }

  /// <summary>
  /// write to an XML buff: write the ID and call each changed variable to write itself
  /// </summary>
  mirrorToXML(): string {
    let xml: StringBuilder = new StringBuilder();

    if (this.changes.length > 0) {

      // write the id
      xml.Append("<" + this.mirroredID + ">");

      // loop on all changed variables


      this.changes.forEach(change => {

        xml.Append("<" + ConstInterface.MG_TAG_PARAM + " " +
          XMLConstants.MG_ATTR_NAME + "=\"" + XmlParser.escape(change) + "\" ");

        if (this.values.ContainsKey(change))
        // call the variable to write it's own data
          xml.Append(this.values.get_Item(change).mirrorToXML());
        else
          xml.Append("removed=\"Y\"");
        xml.Append(">");
      });

      xml.Append("</" + this.mirroredID + ">");
    }
    this.changes.Clear();
    return xml.ToString();
  }

  /// <summary> parse the XML and fill the data
  /// </summary>
  fillData(): void {
    while (this.mirrorFromXML(ClientManager.Instance.RuntimeCtx.Parser.getNextTag(), ClientManager.Instance.RuntimeCtx.Parser)) {
    }
  }

  /// <summary> fill from XML
  /// </summary>
  /// <param name="foundTagName"></param>
  /// <param name="xmlParser"></param>
  /// <returns></returns>
  mirrorFromXML(foundTagName: string, xmlParser: XmlParser): boolean {
    if (foundTagName === null)
      return false;

    if (foundTagName === this.mirroredID) {
      xmlParser.setCurrIndex2EndOfTag();
      this.fillDataEntry(xmlParser);
      return true;
    }
    else if (foundTagName === ("/" + this.mirroredID)) {
      // After updating from the server, clear the changes list so they won't be sent again
      this.changes.Clear();
      xmlParser.setCurrIndex2EndOfTag();
      return false;
    }
    else {
      Logger.Instance.WriteExceptionToLogWithMsg("There is no such tag in MirrorPrmMap.mirrorFromXML(): " + foundTagName);
      return false;
    }
  }


  /// <summary>
  /// parse and fill the params, until the section ends
  /// </summary>
  fillDataEntry(xmlParser: XmlParser): void {
    let nextTag: string = xmlParser.getNextTag();

    while (nextTag === ConstInterface.MG_TAG_PARAM) {
      let nameStart: number = xmlParser.getXMLdata().indexOf(XMLConstants.MG_ATTR_NAME + "=\"", xmlParser.getCurrIndex()) +
        XMLConstants.MG_ATTR_NAME.length + 2;

      xmlParser.setCurrIndex(nameStart);
      let nameEnd: number = xmlParser.getXMLdata().indexOf("\"", nameStart);

      // get the variables data
      let name: string = xmlParser.getXMLsubstring(nameEnd).trim();
      xmlParser.setCurrIndex(nameEnd);

      // create and init the new value
      let newVal: TValue = this.new();

      switch (newVal.init(name, xmlParser)) {
        case ParamParseResult.OK:
          this.values.set_Item(name, newVal);
          break;
        case ParamParseResult.TOUPPER:
          this.values.set_Item(name.toUpperCase(), newVal);
          break;
        case ParamParseResult.DELETE:
          this.values.Remove(name);
          break;
      }

      // move to next tag
      xmlParser.setCurrIndex2EndOfTag();
      nextTag = xmlParser.getNextTag();
    }
  }
}
