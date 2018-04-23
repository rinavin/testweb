import {RefParam} from "@magic/mscorelib";
import {InternalInterface} from "@magic/utils";
import {EventCommand} from "./EventCommand";
import {CommandSerializationHelper} from "./CommandSerializationHelper";
import {ConstInterface} from "../../ConstInterface";

export enum RollbackEventCommand_RollbackType {
  NONE = ' ',
  CANCEL = 'C',
  ROLLBACK = 'R'
}

export class RollbackEventCommand extends EventCommand {
  Rollback: RollbackEventCommand_RollbackType;

  get CommandTypeAttribute(): string {
    return this.CommandTypeAttribute;
  }

  /// <summary>
  /// CTOR
  /// </summary>
  constructor() {
    super(InternalInterface.MG_ACT_ROLLBACK);
    this.Rollback = RollbackEventCommand_RollbackType.NONE;
  }

  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    let helper: CommandSerializationHelper = new CommandSerializationHelper();

    helper.SerializeTaskTag(this.TaskTag);
    helper.SerializeMagicEvent(this.MagicEvent);
    if (this.Rollback !== RollbackEventCommand_RollbackType.NONE)
      helper.SerializeAttribute(ConstInterface.MG_ATTR_ROLLBACK_TYPE, <string>this.Rollback);

    return helper.GetString();
  }
}
