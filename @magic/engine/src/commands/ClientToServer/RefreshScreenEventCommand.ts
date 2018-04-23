import {ViewRefreshMode, InternalInterface} from "@magic/utils";
import {RefParam} from "@magic/mscorelib";
import {EventCommand} from "./EventCommand";
import {CommandSerializationHelper} from "./CommandSerializationHelper";
import {ConstInterface} from "../../ConstInterface";


export class RefreshScreenEventCommand extends EventCommand {
  TopRecIdx: number = 0;
  RefreshMode: ViewRefreshMode = 0;

  /// <summary>
  /// CTOR
  /// </summary>
  constructor() {
    super(InternalInterface.MG_ACT_RT_REFRESH_SCREEN);
  }

  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    let helper: CommandSerializationHelper = new CommandSerializationHelper();

    helper.SerializeTaskTag(this.TaskTag);
    helper.SerializeMagicEvent(this.MagicEvent);
    helper.SerializeAttribute(ConstInterface.MG_ATTR_OBJECT, this.TopRecIdx);
    helper.SerializeRefreshMode(this.RefreshMode);

    return helper.GetString();
  }
}
