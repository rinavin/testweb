import {InternalInterface} from "@magic/utils";
import {EventCommand} from "./EventCommand";
import {RefParam} from "@magic/mscorelib";
import {CommandSerializationHelper} from "./CommandSerializationHelper";

export class SubformOpenEventCommand extends EventCommand {
  DitIdx: number = 0;


  /// <summary>
  /// CTOR
  /// </summary>
  constructor() {
    super(InternalInterface.MG_ACT_SUBFORM_OPEN);
  }

  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    let helper: CommandSerializationHelper = new CommandSerializationHelper();

    helper.SerializeTaskTag(this.TaskTag);
    helper.SerializeMagicEvent(this.MagicEvent);
    helper.SerializeDitIdx(this.DitIdx);

    return helper.GetString();
  }
}
