import {
  Dictionary,
  StringBuilder,
  XmlConvert
} from "@magic/mscorelib";
import {JSON_Utils, XMLConstants, Logger} from "@magic/utils";
import {ConstInterface} from "../ConstInterface";

/// <summary>
/// This class reads/writes the execution properties from/to an XML source
/// </summary>
/// <author>  Kaushal Sanghavi</author>
export class MgProperties extends Dictionary<string> {
  /// <summary>
  /// This function reads the execution properties from an XML source
  /// </summary>
  /// <param name="XMLdata"></param>
  loadFromXML(XMLdata: string) {
    try {
      JSON_Utils.JSONFromXML(XMLdata, this.FillFromJSON.bind(this))
    }
    catch (ex) {
      Logger.Instance.WriteExceptionToLog(ex);
    }
  }

  private FillFromJSON(error, result): void {
    // If there was an error in parsing the XML,
    if (error != null) {
      throw error;
    }

    let key: string = "";
    let val: string = "";

    let properties = result[ConstInterface.MG_TAG_PROPERTIES][ConstInterface.MG_TAG_PROPERTY];

    for (let i = 0; i < properties.length; i++) {
      let property: { key: string, val: string } = properties[i]['$'];

      key = property.key;
      val = property.val;

      this.set_Item(key, val);
    }
  }

  /// <summary>
  /// This function writes the execution properties to an XML source
  /// </summary>
  storeToXML(XMLdata: StringBuilder): void {
    XMLdata.Append(XMLConstants.TAG_OPEN + ConstInterface.MG_TAG_PROPERTIES + XMLConstants.TAG_CLOSE);

    this.Keys.forEach((key: string) => {
      let value: string = this.getProperty(key);

      XMLdata.Append("\n" + XMLConstants.TAG_OPEN + ConstInterface.MG_TAG_PROPERTY);
      XMLdata.Append(" key=\"" + key + "\"");

      value = XmlConvert.EncodeName(value);
      XMLdata.Append(" val=\"" + value + "\"");
      XMLdata.Append(XMLConstants.TAG_TERM);
    });

    XMLdata.Append("\n" + XMLConstants.END_TAG + ConstInterface.MG_TAG_PROPERTIES + XMLConstants.TAG_CLOSE);
  }

  getProperty(key: string): string {
    return this.get_Item(key);
  }

  Clone(): MgProperties {
    let mgProperties: MgProperties = new MgProperties();

    this.Keys.forEach((key: string) => {
      mgProperties.set_Item(key, this.get_Item(key));
    });

    return mgProperties;
  }
}
