import {InternalInterface} from "@magic/utils";
import {RefParam} from "@magic/mscorelib";
import {EventCommand} from "./EventCommand";
import {CommandSerializationHelper} from "./CommandSerializationHelper";
import {ConstInterface} from "../../ConstInterface";

/// <summary>
/// FetchDataControlValuesEventCommand
/// </summary>
export class FetchDataControlValuesEventCommand extends EventCommand {
  ControlName: string = null;

  constructor() {
    super(InternalInterface.MG_ACT_FETCH_DATA_CONTROL_VALUES);
  }

  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    let helper: CommandSerializationHelper = new CommandSerializationHelper();

    helper.SerializeTaskTag(this.TaskTag);
    helper.SerializeMagicEvent(this.MagicEvent);
    helper.SerializeAttribute(ConstInterface.MG_ATTR_CONTROL_NAME, this.ControlName);
    return helper.GetString();
  }
}
