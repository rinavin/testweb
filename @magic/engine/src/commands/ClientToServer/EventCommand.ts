import {RefParam} from "@magic/mscorelib";
import {MGDataCollection} from "../../tasks/MGDataCollection";
import {CommandSerializationHelper} from "./CommandSerializationHelper";
import {Task} from "../../tasks/Task";
import {ConstInterface} from "../../ConstInterface";
import {ClientOriginatedCommandTaskTag} from "../ClientOriginatedCommandTaskTag";

/// <summary>
/// general class for event commands
/// </summary>
export class EventCommand extends ClientOriginatedCommandTaskTag {
  TaskTag: string = null;
  MagicEvent: number = 0;
  ClientRecId: number = 0;

  get CommandTypeAttribute(): string {
    return ConstInterface.MG_ATTR_VAL_EVENT;
  }

  get ShouldSerialize(): boolean {
    if (this.TaskTag !== null && MGDataCollection.Instance.GetTaskByID(this.TaskTag) !== null && !(<Task>MGDataCollection.Instance.GetTaskByID(this.TaskTag)).KnownToServer)
      return false;
    return true;
  }

  constructor(magicEvent: number) {
    super();
    this.MagicEvent = magicEvent;
  }

  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    let helper: CommandSerializationHelper = new CommandSerializationHelper();

    helper.SerializeTaskTag(this.TaskTag);
    helper.SerializeMagicEvent(this.MagicEvent);

    return helper.GetString();
  }
}
