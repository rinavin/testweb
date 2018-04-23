import {DataViewCommandBase} from "../commands/DataViewCommandBase";
import {ClientOriginatedCommand} from "../commands/ClientToServer/ClientOriginatedCommand";
import {MGDataCollection} from "../tasks/MGDataCollection";
import {RemoteCommandsProcessor} from "./RemoteCommandsProcessor";
import {CommandsTable} from "../CommandsTable";
import {ReturnResultBase} from "../util/ReturnResultBase";
import {CommandsProcessorBase_SendingInstruction} from "../CommandsProcessorBase";
import {ReturnResult} from "../util/ReturnResult";
import {Task} from "../tasks/Task";
import {ClientOriginatedCommandTaskTag} from "../commands/ClientOriginatedCommandTaskTag";

/// <summary>
/// remote dataview command
/// </summary>
export class RemoteDataViewCommandBase extends DataViewCommandBase {

  Command: ClientOriginatedCommand = null;
  protected Task: Task = null;

  constructor(command: ClientOriginatedCommand) {
    super();
    this.Command = command;
    if (command instanceof ClientOriginatedCommandTaskTag) {
      this.Task = <Task>MGDataCollection.Instance.GetTaskByID((<ClientOriginatedCommandTaskTag>command).TaskTag);
    }
  }

  /// <summary>
  /// execute the command by pass requests to the server
  /// </summary>
  /// <param name="command"></param>
  Execute(): ReturnResultBase {
    let cmdsToServer: CommandsTable = this.Task.getMGData().CmdsToServer;
    cmdsToServer.Add(this.Command);
    RemoteCommandsProcessor.GetInstance().Execute(CommandsProcessorBase_SendingInstruction.TASKS_AND_COMMANDS);
    return new ReturnResult();
  }
}
