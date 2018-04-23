import {ViewRefreshMode} from "@magic/utils";
import {RefParam} from "@magic/mscorelib";
import {EventCommand} from "./EventCommand";
import {CommandSerializationHelper} from "./CommandSerializationHelper";
import {ConstInterface} from "../../ConstInterface";

export class RefreshEventCommand extends EventCommand {
  RefreshMode: ViewRefreshMode = 0;
  KeepUserSort: boolean = false;
  CurrentRecordRow: number = 0;
  IsInternalRefresh: boolean = false;

  constructor(magicEvent: number) {
    super(magicEvent);
  }

  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    let helper: CommandSerializationHelper = new CommandSerializationHelper();

    helper.SerializeTaskTag(this.TaskTag);
    helper.SerializeMagicEvent(this.MagicEvent);
    if (!this.IsInternalRefresh)
      helper.SerializeRefreshMode(this.RefreshMode);
    if (this.KeepUserSort)
      helper.SerializeAttribute(ConstInterface.MG_ATTR_KEEP_USER_SORT, "1");

    return helper.GetString();
  }
}
