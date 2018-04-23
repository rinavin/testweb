import {RefParam} from "@magic/mscorelib";
import {InternalInterface} from "@magic/utils";
import {EventCommand} from "./EventCommand";
import {CommandSerializationHelper} from "./CommandSerializationHelper";
import {ConstInterface} from "../../ConstInterface";

/// <summary>
/// Command which will write error messages into server log file.
/// </summary>
export class WriteMessageToServerLogCommand extends EventCommand {
  ErrorMessage: string = null;

  constructor() {
    super(InternalInterface.MG_ACT_WRITE_ERROR_TO_SERVER_LOG);
  }

  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    let helper: CommandSerializationHelper = new CommandSerializationHelper();

    helper.SerializeTaskTag(this.TaskTag);
    helper.SerializeMagicEvent(this.MagicEvent);
    helper.SerializeAttribute(ConstInterface.MG_ATTR_ERROR_MESSAGE, this.ErrorMessage);

    return helper.GetString();
  }
}
