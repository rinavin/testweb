import {XmlParser} from "@magic/utils";
import {RefParam} from "@magic/mscorelib";
import {ConstInterface} from "../../ConstInterface";
import {ClientOriginatedCommand} from "./ClientOriginatedCommand";

export class IniputForceWriteCommand extends ClientOriginatedCommand {
  Text: string = null;

  get CommandTypeAttribute(): string {
    return ConstInterface.MG_ATTR_VAL_INIPUT_FORCE_WRITE;
  }

  get ShouldSerializeRecords(): boolean {
    return false;
  }

  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    return " " + ConstInterface.MG_ATTR_VAL_INIPUT_PARAM + "=\"" + XmlParser.escape(this.Text) + "\"";
  }

  constructor() {
    super();
  }
}
