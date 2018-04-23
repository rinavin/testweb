import { ObjectReference } from "./ObjectReference";
import { JSON_Utils, XMLConstants } from "@magic/utils";
import { Events } from "../Events"

/// <summary>
/// Handler to parse an <objectRef ...> tag. The handler expects
/// two attributes: ctl_idx and isn, and uses them to create an ObjectReference
/// instance.<br/>
/// The created instance is kept in 'ParsedReference' property.
export class ObjectReferenceSAXHandler {
  ParsedReference: ObjectReference = null;

  constructor(xml: string) {

    try {
      if (xml !== null) {
        JSON_Utils.JSONFromXML(xml, this.FillFromJSON.bind(this));
      }
    }
    catch (ex) {
      Events.WriteExceptionToLog(ex);
    }
  }

  private FillFromJSON(error, result) {
    // If there was an error in parsing the XML,
    if (error != null) {
      throw error;
    }

    let objRefElement: {ctl_idx: string, isn: string} = result[XMLConstants.MG_TAG_OBJECT_REFERENCE]['$'];
    let ctlIndex: number = +objRefElement.ctl_idx;
    let objectIsn: number = +objRefElement.isn;

    this.ParsedReference = new ObjectReference(ctlIndex, objectIsn);
  }
}
