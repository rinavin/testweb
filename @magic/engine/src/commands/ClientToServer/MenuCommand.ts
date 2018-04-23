import {RefParam} from "@magic/mscorelib";
import {ConstInterface} from "../../ConstInterface";
import {CommandSerializationHelper} from "./CommandSerializationHelper";
import {ClientOriginatedCommandTaskTag} from "../ClientOriginatedCommandTaskTag";

export class MenuCommand extends ClientOriginatedCommandTaskTag {
  TaskTag: string = null;
  MenuUid: number = 0;
  MenuComp: number = 0;
  MenuPath: string = null;

  get CommandTypeAttribute(): string {
    return ConstInterface.MG_ATTR_VAL_MENU;
  }

  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    let helper: CommandSerializationHelper = new CommandSerializationHelper();

    helper.SerializeTaskTag(this.TaskTag);
    helper.SerializeAttribute(ConstInterface.MG_ATTR_MNUUID, this.MenuUid);
    helper.SerializeAttribute(ConstInterface.MG_ATTR_MNUCOMP, this.MenuComp);

    // serialize  menu path
    helper.SerializeAttribute(ConstInterface.MG_ATTR_MNUPATH, this.MenuPath);

    return helper.GetString();
  }

  constructor() {
    super();
  }
}
