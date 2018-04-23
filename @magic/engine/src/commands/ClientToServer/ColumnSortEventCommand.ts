import {EventCommand} from "./EventCommand";
import {CommandSerializationHelper} from "./CommandSerializationHelper";
import {RefParam} from "@magic/mscorelib";
import {InternalInterface} from "@magic/utils";
import {ConstInterface} from "../../ConstInterface";

/// <summary>
/// column sort command
/// </summary>
export class ColumnSortEventCommand extends EventCommand {
  FldId: number = 0;
  DitIdx: number = 0;
  Direction: number = 0;

  /// <summary>
  /// CTOR
  /// </summary>
  constructor() {
    super(InternalInterface.MG_ACT_COL_SORT);
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="hasChildElements"></param>
  /// <returns></returns>
  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    let helper: CommandSerializationHelper = new CommandSerializationHelper();

    helper.SerializeTaskTag(this.TaskTag);
    helper.SerializeFldId(this.FldId);
    helper.SerializeMagicEvent(this.MagicEvent);
    helper.SerializeDitIdx(this.DitIdx);
    helper.SerializeAttribute(ConstInterface.MG_ATTR_DIRECTION, this.Direction);

    return helper.GetString();
  }
}
