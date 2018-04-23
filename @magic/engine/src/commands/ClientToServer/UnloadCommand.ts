import {ConstInterface} from "../../ConstInterface";
import {ClientOriginatedCommand} from "./ClientOriginatedCommand";

export class UnloadCommand extends ClientOriginatedCommand {
  get CommandTypeAttribute(): string {
    return ConstInterface.MG_ATTR_VAL_UNLOAD;
  }

  constructor() {
    super();
  }
}
