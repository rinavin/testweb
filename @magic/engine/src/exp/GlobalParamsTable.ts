import {NString} from "@magic/mscorelib";
import {StorageAttribute, XMLConstants, XmlParser} from "@magic/utils";
import {ExpVal} from "@magic/gui";
import {IMirrorXML} from "../util/IMirrorXML";
import {ClientManager} from "../ClientManager";
import {MirrorPrmMap, ParamParseResult} from "../util/PrmMap";
import {Record} from "../data/Record";
import {ConstInterface} from "../ConstInterface";

export class MirrorExpVal extends ExpVal implements IMirrorXML {
  constructor();
  constructor(val: ExpVal);
  constructor(val?: ExpVal) {
    if (arguments.length === 0) {
      super();
      this.constructor_2();
      return;
    }
    super();
    this.constructor_3(val);
  }

  private constructor_2(): void {
  }

  /// <summary>
  ///   CTOR
  /// </summary>
  private constructor_3(val: ExpVal): void {
    super.Copy(val);
  }

  public mirrorToXML(): string {
    let toBase64: boolean = (ClientManager.Instance.getEnvironment().GetDebugLevel() <= 1);

    let cellAttr: StorageAttribute = (this.Attr === StorageAttribute.BLOB_VECTOR ? this.VectorField.getCellsType() : StorageAttribute.SKIP);

    // Story 131961 : Do not serialize dotnet params
    let value: string = "";
    value = Record.itemValToXML(super.ToMgVal(), this.Attr, cellAttr, toBase64);

    return ConstInterface.MG_ATTR_PAR_ATTRS + "=\"" + Attr + "\" " + ConstInterface.MG_ATTR_LEN + "=" +
      value.length + " " + ConstInterface.MG_ATTR_ENV_VALUE + "=\"" + value + "\"";
  }

  /// <summary>
  ///   initialize the object from the XML buffer
  /// </summary>
  /// <param name = "xmlParser"></param>
  public init(name: String, xmlParser: XmlParser): ParamParseResult {
    let valueOffset: number, attrOffset: number, lenOffset: number, valueLen: number, lenOffsetEnd: number,
      count: number;
    let currType: StorageAttribute;
    let isNull: boolean;
    let paramAttr: string, paramValue: string, correctValue: string = null;

    // Look for parameter attributes. Xml parser's current index is set to end of Name.
    // So look for attribute (i.e. "attr") from current index to the end of tag (i.e. "/>")
    count = xmlParser.getXMLdata().indexOf(XMLConstants.TAG_TERM, xmlParser.getCurrIndex()) - xmlParser.getCurrIndex();
    attrOffset = NString.IndexOf(xmlParser.getXMLdata(), ConstInterface.MG_ATTR_PAR_ATTRS, xmlParser.getCurrIndex(), count);
    if (attrOffset !== -1) {
      // add tag length and get the attribute
      attrOffset += ConstInterface.MG_ATTR_PAR_ATTRS.length + 2;
      paramAttr = xmlParser.getXMLdata().substr(attrOffset, 1);

      // length of value
      lenOffset = xmlParser.getXMLdata().indexOf(ConstInterface.MG_ATTR_LEN, attrOffset);
      lenOffset += ConstInterface.MG_ATTR_LEN.length + 1;
      lenOffsetEnd = xmlParser.getXMLdata().indexOf(" ", lenOffset);
      valueLen = XmlParser.getInt(xmlParser.getXMLdata().substr(lenOffset, lenOffsetEnd - lenOffset));

      // param value
      valueOffset = xmlParser.getXMLdata().indexOf(ConstInterface.MG_ATTR_ENV_VALUE, lenOffset);
      valueOffset += ConstInterface.MG_ATTR_ENV_VALUE.length + 2;
      paramValue = xmlParser.getXMLdata().substr(valueOffset, valueLen);

      // get data for this object
      currType = <StorageAttribute>paramAttr[0];
      correctValue = Record.getString(paramValue, currType);
      isNull = false;

      // skip to after this param
      xmlParser.setCurrIndex(valueOffset + valueLen);
    }
    else if (xmlParser.getXMLdata().indexOf(ConstInterface.MG_ATTR_ENV_REMOVED, xmlParser.getCurrIndex()) !== -1) {
      return ParamParseResult.DELETE;
    }
    else {
      currType = StorageAttribute.NONE;
      isNull = true;
    }

    super.Init(currType, isNull, correctValue);

    return ParamParseResult.TOUPPER;
  }
}

/// <summary>
///   manager for global parameters
/// </summary>
export class GlobalParams extends MirrorPrmMap<MirrorExpVal> {

  /// <summary>
  ///  CTOR
  /// </summary>
  constructor() {
    super(MirrorExpVal);
    this.mirroredID = ConstInterface.MG_TAG_GLOBALPARAMSCHANGES;
  }

  /// <summary>
  ///   create a new MirrorExpVal and add it to the map
  /// </summary>
  /// <param name = "s"></param>
  /// <param name = "v"></param>
  public set(s: string, v: ExpVal): void {
    if (v.IsNull || v.isEmptyString())
      super.remove(s.trim().toUpperCase());
    else
      super.setValue(s.trim().toUpperCase(), new MirrorExpVal(v));
  }

  public get(s: string): MirrorExpVal {
    try {
      return super.getvalue(s.trim().toUpperCase());
    }
    catch (err) {
      return null;
    }

  }
}
