import {DataviewManagerBase} from "./DataviewManagerBase";
import {TaskServiceBase} from "../tasks/TaskServiceBase";
import {RemoteDataviewManager} from "../remote/RemoteDataviewManager";
import {IClientCommand} from "../commands/IClientCommand";
import {Task} from "../tasks/Task";
import {ReturnResult} from "../util/ReturnResult";

/// <summary>
/// dataview manager of the task
/// </summary>
export class DataviewManager extends DataviewManagerBase {
  RemoteDataviewManager: RemoteDataviewManager = null;
  HasRemoteData: boolean = true;

  private get TaskService(): TaskServiceBase {
    return this.Task.TaskService;
  }

  get CurrentDataviewManager(): DataviewManagerBase {
    let result: DataviewManagerBase;
    if (this.HasRemoteData)
      result = this.RemoteDataviewManager;
    else
      result = this.VirtualDataviewManager;

    return result;
  }

  private get VirtualDataviewManager(): DataviewManagerBase {
    return this.TaskService.GetDataviewManagerForVirtuals(this.Task);
  }

  /// <summary>
  /// CTOR
  /// </summary>
  /// <param name="task"></param>
  constructor(task: Task) {
    super(task);
    this.RemoteDataviewManager = new RemoteDataviewManager(task);
  }

  Execute(command: IClientCommand): ReturnResult {
    return this.CurrentDataviewManager.Execute(command);
  }
}
