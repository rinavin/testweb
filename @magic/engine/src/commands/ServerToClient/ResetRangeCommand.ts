import {ClientTargetedCommandBase} from "./ClientTargetedCommandBase";
import {IResultValue} from "../../rt/IResultValue";
import {MGDataCollection} from "../../tasks/MGDataCollection";
import {Task} from "../../tasks/Task";
import {IClientCommand} from "../IClientCommand";
import {CommandFactory} from "../ClientToServer/CommandFactory";
import {DataViewCommandType} from "../ClientToServer/DataviewCommand";

/// <summary>
/// ResetRangeCommand
/// </summary>
export class ResetRangeCommand extends ClientTargetedCommandBase {

  /// <summary>
  /// Execute ResetRange command.
  /// </summary>
  /// <param name="res"></param>
  Execute(res: IResultValue): void {
    let mgDataTab: MGDataCollection = MGDataCollection.Instance;

    let task: Task = <Task>mgDataTab.GetTaskByID(this.TaskTag);

    let command: IClientCommand = CommandFactory.CreateDataViewCommand(this.TaskTag, DataViewCommandType.ResetUserRange);
    task.DataviewManager.Execute(command);
  }

  constructor() {
    super();
  }
}
