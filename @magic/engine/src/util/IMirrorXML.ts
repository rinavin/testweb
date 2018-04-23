import {XmlParser} from "@magic/utils";
import {ParamParseResult} from "./PrmMap";

/// <summary> Interface for mirroring a single item</summary>
export interface IMirrorXML {
  mirrorToXML(): string;

  init(name: string, xmlParser: XmlParser): ParamParseResult;
}
