import {EventCommand} from "./EventCommand";
import {CommandSerializationHelper} from "./CommandSerializationHelper";
import {RefParam} from "@magic/mscorelib";
import {InternalInterface} from "@magic/utils";
import {ConstInterface} from "../../ConstInterface";

export class LocateQueryEventCommand extends EventCommand {
  FldId: number = 0;
  DitIdx: number = 0;
  IncrmentalSearchString: string = null;
  ResetIncrementalSearch: boolean = false;

  /// <summary>
  /// CTOR
  /// </summary>
  constructor() {
    super(InternalInterface.MG_ACT_RTO_LOCATE);
  }

  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    let helper: CommandSerializationHelper = new CommandSerializationHelper();

    helper.SerializeTaskTag(this.TaskTag);
    helper.SerializeFldId(this.FldId);
    helper.SerializeMagicEvent(this.MagicEvent);
    helper.SerializeDitIdx(this.DitIdx);
    helper.SerializeAttribute(ConstInterface.MG_ATTR_SEARCH_STR, this.IncrmentalSearchString);

    if (this.ResetIncrementalSearch)
      helper.SerializeAttribute(ConstInterface.MG_ATTR_RESET_SEARCH, "1");

    return helper.GetString();
  }
}
