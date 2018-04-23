import {InternalInterface} from "@magic/utils";
import {RefParam} from "@magic/mscorelib";
import {EventCommand} from "./EventCommand";
import {CommandSerializationHelper} from "./CommandSerializationHelper";
import {ConstInterface} from "../../ConstInterface";

export class NonReversibleExitEventCommand extends EventCommand {
  CloseSubformOnly: boolean = false;

  /// <summary>
  /// CTOR
  /// </summary>
  constructor() {
    super(InternalInterface.MG_ACT_EXIT);
  }

  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    let helper: CommandSerializationHelper = new CommandSerializationHelper();

    helper.SerializeTaskTag(this.TaskTag);
    helper.SerializeMagicEvent(this.MagicEvent);
    helper.SerializeAttribute(ConstInterface.MG_ATTR_REVERSIBLE, "0");
    helper.SerializeCloseSubformOnly(this.CloseSubformOnly);

    return helper.GetString();
  }
}
