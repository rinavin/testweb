import {ClientTargetedCommandBase} from "./ClientTargetedCommandBase";
import {IResultValue} from "../../rt/IResultValue";
import {MGDataCollection} from "../../tasks/MGDataCollection";
import {IClientCommand} from "../IClientCommand";
import {CommandFactory} from "../ClientToServer/CommandFactory";
import {DataViewCommandType} from "../ClientToServer/DataviewCommand";
import {Task} from "../../tasks/Task";

export class ResetSortCommand extends ClientTargetedCommandBase {

  Execute(res: IResultValue): void {
    let mgDataTab: MGDataCollection = MGDataCollection.Instance;

    let task: Task = <Task>mgDataTab.GetTaskByID(this.TaskTag);

    let command: IClientCommand = CommandFactory.CreateDataViewCommand(this.TaskTag, DataViewCommandType.ResetUserSort);
    task.DataviewManager.Execute(command);
  }

  constructor() {
    super();
  }
}
