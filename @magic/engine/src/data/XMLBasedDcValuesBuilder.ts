import {DcValuesBuilderBase, DcValues} from "@magic/gui";
import {XmlParser, StorageAttribute, Logger, XMLConstants} from "@magic/utils";
import {List} from "@magic/mscorelib";
import {ClientManager} from "../ClientManager";
import {ConstInterface} from "../ConstInterface";

/// <summary>
///   a class that holds a data controls displayed and linked values each instance is a unique set of values
///   identified by a unique id
/// </summary>
export class XMLBasedDcValuesBuilder extends DcValuesBuilderBase {
  private dcv: DcValues = null;
  private parser: XmlParser = null;

  set SerializedDCVals(value: string) {
    this.parser.setXMLdata(value);
    this.parser.setCurrIndex(0);
  }

  constructor() {
    super();
    this.parser = new XmlParser();
  }

  public Build(): DcValues {
    this.dcv = null;
    let endContext: number = this.parser.getXMLdata().indexOf(XMLConstants.TAG_TERM, this.parser.getCurrIndex());

    if (endContext !== -1 && endContext < this.parser.getXMLdata().length) {
      // last position of its tag
      let tag: String = this.parser.getXMLsubstring(endContext);
      this.parser.add2CurrIndex(tag.indexOf(ConstInterface.MG_TAG_DC_VALS) + ConstInterface.MG_TAG_DC_VALS.length);

      let tokensVector: List<string> = XmlParser.getTokens(this.parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);
      this.dcv = <DcValues>this.CreateDcValues(false);
      this.InitDCValues(this.dcv, tokensVector);
    }
    return this.dcv;
  }

  /// <summary>
  /// Initialize the DcValues according to the values set in the tokens vector.
  /// </summary>
  /// <param name="tokensVector">A set of attribute value pairs built by the XmlParser.</param>
  private InitDCValues(dcv: DcValues, tokensVector: List<string>): void {
    let type: StorageAttribute = StorageAttribute.NONE;
    let displayValues: string[] = null;
    let serializedLinkValues: string = null;

    for (let j: number = 0; j < tokensVector.length; j += 2) {
      let attribute: String = (tokensVector.get_Item(j));
      let valueStr: string = (tokensVector.get_Item(j + 1));

      switch (attribute) {
        case XMLConstants.MG_ATTR_ID:
          this.SetId(dcv, XmlParser.getInt(valueStr));
          break;
        case XMLConstants.MG_ATTR_TYPE:
          type = <StorageAttribute>valueStr[0];
          this.SetType(dcv, type);
          break;
        case ConstInterface.MG_ATTR_DISP:
          valueStr = XmlParser.unescape(valueStr);
          displayValues = this.ParseValues(valueStr, StorageAttribute.UNICODE);
          break;
        case ConstInterface.MG_ATTR_LINKED:
          valueStr = XmlParser.unescape(valueStr);
          serializedLinkValues = valueStr;
          break;
        case ConstInterface.MG_ATTR_NULL_FLAGS:
          this.SetNullFlags(dcv, valueStr);
          break;
        default:
          Logger.Instance.WriteExceptionToLogWithMsg("in DcValues.initElements() unknown attribute: " + attribute);
          break;
      }
    }
    this.SetDisplayValues(dcv, displayValues);
    if (serializedLinkValues == null)
      this.SetLinkValues(dcv, displayValues);
    else
      this.SetLinkValues(dcv, this.ParseValues(serializedLinkValues, type));
  }

  /// <summary>
  /// This overload of the ParseValues method simplifies the use of the original method by
  /// determining the value of the 'useHex' parameter based on the ClientManager's log level and
  /// the type of the serialized values.
  /// </summary>
  /// <param name = "valueStr">The serialized values as received from the XML</param>
  /// <param name = "dataType">The storage type of the servialized values.</param>
  protected ParseValues(valueStr: string, dataType: StorageAttribute): string[] {
    let useHex: boolean = false;
    if (ClientManager.Instance.getEnvironment().GetDebugLevel() > 1 ||
      dataType === StorageAttribute.ALPHA || dataType === StorageAttribute.UNICODE || dataType === StorageAttribute.BOOLEAN) {
      useHex = true;
    }
    return super.ParseValues(valueStr, dataType, useHex);
  }
}
