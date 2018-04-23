import {RefParam} from "@magic/mscorelib";
import {InternalInterface} from "@magic/utils";
import {CommandSerializationHelper} from "./CommandSerializationHelper";
import {EventCommand} from "./EventCommand";
import {ConstInterface} from "../../ConstInterface";

export class ComputeEventCommand extends EventCommand {

  Subforms: boolean = false;

  /// <summary>
  /// CTOR
  /// </summary>
  constructor() {
    super(InternalInterface.MG_ACT_COMPUTE);
  }

  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    let helper: CommandSerializationHelper = new CommandSerializationHelper();

    helper.SerializeTaskTag(this.TaskTag);
    helper.SerializeMagicEvent(this.MagicEvent);

    if (this.Subforms)
      helper.SerializeAttribute(ConstInterface.MG_ATTR_OBJECT, "99999");

    return helper.GetString();
  }
}
