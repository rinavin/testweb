import {InternalInterface} from "@magic/utils";
import {RefParam} from "@magic/mscorelib";
import {EventCommand} from "./EventCommand";
import {CommandSerializationHelper} from "./CommandSerializationHelper";

export class IndexChangeEventCommand extends EventCommand {
  KeyIndex: number = 0;

  /// <summary>
  /// CTOR
  /// </summary>
  constructor() {
    super(InternalInterface.MG_ACT_INDEX_CHANGE);
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="hasChildElements"></param>
  /// <returns></returns>
  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    let helper: CommandSerializationHelper = new CommandSerializationHelper();

    helper.SerializeTaskTag(this.TaskTag);
    helper.SerializeMagicEvent(this.MagicEvent);
    helper.SerializeKeyIndex(this.KeyIndex);

    return helper.GetString();
  }
}
