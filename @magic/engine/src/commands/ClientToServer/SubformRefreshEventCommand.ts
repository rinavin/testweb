import {RefreshEventCommand} from "./RefreshEventCommand";
import {CommandSerializationHelper} from "./CommandSerializationHelper";
import {RefParam} from "@magic/mscorelib";
import {InternalInterface} from "@magic/utils";
import {ConstInterface} from "../../ConstInterface";

export class SubformRefreshEventCommand extends RefreshEventCommand {
  SubformTaskTag: string = null;
  ExplicitSubformRefresh: boolean = false;

  /// <summary>
  /// CTOR
  /// </summary>
  constructor() {
    super(InternalInterface.MG_ACT_SUBFORM_REFRESH);
  }

  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    let helper: CommandSerializationHelper = new CommandSerializationHelper();

    helper.SerializeTaskTag(this.TaskTag);
    helper.SerializeMagicEvent(this.MagicEvent);
    helper.SerializeRefreshMode(this.RefreshMode);
    helper.SerializeAttribute(ConstInterface.MG_ATTR_SUBFORM_TASK, this.SubformTaskTag);

    return helper.GetString();
  }
}
