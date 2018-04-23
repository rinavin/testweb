import {XmlParser} from "@magic/utils";
import {RefParam} from "@magic/mscorelib";
import {FieldDef, RecordUtils} from "@magic/gui";

import {ClientTargetedCommandBase} from "./ClientTargetedCommandBase";
import {IResultValue} from "../../rt/IResultValue";
import {AddUserRangeDataviewCommand} from "../ClientToServer/AddUserRangeDataviewCommand";
import {CommandFactory} from "../ClientToServer/CommandFactory";
import {MGDataCollection} from "../../tasks/MGDataCollection";
import {Task, UserRange} from "../../tasks/Task";
import {ConstInterface} from "../../ConstInterface";

/// <summary>
/// AddRangeCommand
/// </summary>
export class AddRangeCommand extends ClientTargetedCommandBase {
  UserRange: UserRange = null;

  get ShouldExecute(): boolean {
    let mgDataTab: MGDataCollection = MGDataCollection.Instance;
    let task: Task = <Task>mgDataTab.GetTaskByID(this.TaskTag);
    return task.isStarted();
  }

  /// <summary>
  /// Execute AddRange command.
  /// </summary>
  /// <param name="res"></param>
  public Execute(res: IResultValue): void {
    let mgDataTab: MGDataCollection = MGDataCollection.Instance;

    let task: Task = <Task>mgDataTab.GetTaskByID(this.TaskTag);
    let fieldDef: FieldDef = task.DataView.getField(<number>this.UserRange.veeIdx - 1);
    let parsedLen: RefParam<number> = new RefParam(0);

    let command: AddUserRangeDataviewCommand = CommandFactory.CreateAddUserRangeDataviewCommand(this.TaskTag, this.UserRange);
    if (!this.UserRange.nullMin)
      command.Range.min = RecordUtils.deSerializeItemVal(this.UserRange.min, fieldDef.getType(), fieldDef.getSize(), true, fieldDef.getType(), parsedLen);
    if (!this.UserRange.nullMax)
      command.Range.max = RecordUtils.deSerializeItemVal(this.UserRange.max, fieldDef.getType(), fieldDef.getSize(), true, fieldDef.getType(), parsedLen);

    task.DataviewManager.Execute(command);
  }

  /// <summary>
  /// Handle Attribute
  /// </summary>
  /// <param name="attribute"></param>
  /// <param name="value"></param>

  public HandleAttribute(attribute: string, value: string): void {
    switch (attribute) {
      case ConstInterface.MG_ATTR_FIELD_INDEX:
        if (this.UserRange == null) {
          this.UserRange = new UserRange();
          this.UserRange.nullMin = this.UserRange.nullMax = this.UserRange.discardMin = this.UserRange.discardMax = true;
        }
        this.UserRange.veeIdx = XmlParser.getInt(value);
        break;

      case ConstInterface.MG_ATTR_MIN_VALUE:
        this.UserRange.min = value;
        this.UserRange.nullMin = false;
        this.UserRange.discardMin = false;
        break;

      case ConstInterface.MG_ATTR_NULL_MIN_VALUE:
        this.UserRange.nullMin = true;
        this.UserRange.discardMin = false;
        break;

      case ConstInterface.MG_ATTR_NULL_MAX_VALUE:
        this.UserRange.nullMax = true;
        this.UserRange.discardMax = false;
        break;

      case ConstInterface.MG_ATTR_MAX_VALUE:
        this.UserRange.max = value;
        this.UserRange.discardMax = false;
        this.UserRange.nullMax = false;
        break;

      default:
        super.HandleAttribute(attribute, value);
        break;
    }
  }

  constructor() {
    super();
  }
}
