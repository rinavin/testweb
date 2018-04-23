import {TaskServiceBase} from "./TaskServiceBase";
import {DataviewManagerBase} from "../data/DataviewManagerBase";
import {ReturnResult} from "../util/ReturnResult";
import {WindowType} from "@magic/utils";
import {Task} from "./Task";
import {FieldsTable} from "../data/FieldsTable";
import {Event} from "../event/Event";

export class RemoteTaskService extends TaskServiceBase {
  constructor() {
    super();
  }

  /// <summary>
  /// !!
  /// </summary>
  /// <param name="defaultValue"></param>
  /// <returns></returns>
  GetTaskTag(defaultValue: string): string {
    return defaultValue;
  }

  /// <summary>
  /// </summary>
  /// <param name="task"></param>
  /// <returns></returns>
  GetDataviewManagerForVirtuals(task: Task): DataviewManagerBase {
    return task.DataviewManager.RemoteDataviewManager;
  }

  /// <summary>
  /// Prepare Task before execute
  /// </summary>
  /// <param name="task"></param>
  PrepareTask(task: Task): ReturnResult {
    task.DataViewWasRetrieved = true;
    let result: ReturnResult = super.PrepareTask(task);

    // When running as a modal task, force the window to be modal
    if (task.getMGData().IsModal && task.getForm() !== null) {
      task.getForm().ConcreteWindowType = WindowType.Modal;
    }

    return result;
  }

  /// <summary>
  /// get the event task id
  /// </summary>
  /// <param name="originalTaskId"></param>
  /// <param name="task"></param>
  /// <param name="evt"></param>
  /// <returns></returns>
  GetEventTaskId(task: Task, originalTaskId: string, evt: Event): string {
    return originalTaskId;
  }

  ShouldEvaluatePropertyLocally(propId: number): boolean {
    return false;
  }

  /// <summary>
  /// in connected tasks, task prefix is always executed by the server
  /// </summary>
  /// <param name="task"></param>
  InitTaskPrefixExecutedFlag(task: Task): void {
    task.TaskPrefixExecuted = true;
  }

  /// <summary>
  /// When the subform is closed before call with a destination, we need to clean all parent recomputes.
  /// Recomputes are send from the server together with a new opened subform.
  /// </summary>
  /// <param name="parentTask"></param>
  /// <param name="subformTask"></param>
  RemoveRecomputes(parentTask: Task, subformTask: Task): void {
    (<FieldsTable>parentTask.DataView.GetFieldsTab()).resetRecomp();
  }

  /// <summary>
  /// get the owner transaction
  /// </summary>
  /// <param name="task"></param>
  /// <returns></returns>
  GetOwnerTransactionTask(task: Task): Task {
    let OwnerTransactionTask: Task = task;

    if (task.DataviewManager.RemoteDataviewManager.Transaction !== null)
      OwnerTransactionTask = task.DataviewManager.RemoteDataviewManager.Transaction.OwnerTask;

    return OwnerTransactionTask;
  }
}
