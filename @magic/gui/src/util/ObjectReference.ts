import {ObjectReferenceSAXHandler} from "./ObjectReferenceSAXHandler";

/// <summary>
/// Represents a reference to a magic object, in the form of
/// ctl index and object isn.
/// The reference makes no assumption on the type of the referenced object. The
/// referenced object type is context dependent.
/// </summary>
export class ObjectReference {
  CtlIndex: number = 0;
  ObjectISN: number = 0;

  constructor(ctlIndex: number, objectIsn: number) {
    this.CtlIndex = ctlIndex;
    this.ObjectISN = objectIsn;
  }

  toString(): string {
    return "{Object Ref: " + this.CtlIndex + "," + this.ObjectISN + "}";
  }

  static FromXML(xmlData: string): ObjectReference {
    let objectReferenceSAXHandler: ObjectReferenceSAXHandler = new ObjectReferenceSAXHandler(xmlData);
    return objectReferenceSAXHandler.ParsedReference;
  }
}
