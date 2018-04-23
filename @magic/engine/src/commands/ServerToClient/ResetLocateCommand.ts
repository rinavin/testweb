import {ClientTargetedCommandBase} from "./ClientTargetedCommandBase";
import {MGDataCollection} from "../../tasks/MGDataCollection";
import {Task} from "../../tasks/Task";
import {IResultValue} from "../../rt/IResultValue";
import {DataViewCommandType} from "../ClientToServer/DataviewCommand";
import {CommandFactory} from "../ClientToServer/CommandFactory";
import {IClientCommand} from "../IClientCommand";

/// <summary>
/// ResetLocateCommand
/// </summary>
export class ResetLocateCommand extends ClientTargetedCommandBase {

  /// <summary>
  /// Execute ResetLocate command.
  /// </summary>
  /// <param name="res"></param>
  Execute(res: IResultValue): void {
    let mgDataTab: MGDataCollection = MGDataCollection.Instance;

    let task: Task = <Task>mgDataTab.GetTaskByID(this.TaskTag);

    let command: IClientCommand = CommandFactory.CreateDataViewCommand(this.TaskTag, DataViewCommandType.ResetUserLocate);
    task.DataviewManager.Execute(command);
  }

  constructor() {
    super();
  }
}
