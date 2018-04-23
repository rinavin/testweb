import {DataviewManagerBase} from "../data/DataviewManagerBase";
import {ReturnResult} from "../util/ReturnResult";
import {Property, PropInterface} from "@magic/gui";
import {Task} from "./Task";
import {MsgInterface} from "@magic/utils";
import {MgForm} from "../gui/MgForm";
import {Event} from "../event/Event";

export abstract class TaskServiceBase {
  /// <summary>
  /// </summary>
  /// <param name="defaultValue"></param>
  /// <returns></returns>
  abstract GetTaskTag(defaultValue: string): string ;

  /// <summary>
  /// creates initial record
  /// </summary>
  /// <param name="task"></param>
  static CreateFirstRecord(task: Task): void {
    // QCR #298593 Frames are different from subforms
    task.AfterFirstRecordPrefix = true;
  }

  /// <summary>
  /// !!
  /// </summary>
  /// <param name="task"></param>
  /// <returns></returns>
  abstract GetDataviewManagerForVirtuals(task: Task): DataviewManagerBase;

  /// <summary>
  /// Prepare Task before execution
  /// </summary>
  /// <param name="task"></param>
  PrepareTask(task: Task): ReturnResult {
    // Subform with a local data is not cached
    return ReturnResult.SuccessfulResult;
  }

  /// <summary>
  /// prepare the property open task window
  /// </summary>
  /// <param name="task"></param>
  static PreparePropOpenTaskWindow(task: Task): void {
    let propOpenTaskWindow: Property = task.getProp(PropInterface.PROP_TYPE_TASK_PROPERTIES_OPEN_TASK_WINDOW);
    let propOpenTaskWindowValue: boolean = false;

    // for main program that isn't internal application , we are not use the form, the open window is false
    // the same we doing for remote program in tsk_open.cpp
    if (!task.isMainProg() || task.getCtlIdx() === 0) {
      propOpenTaskWindowValue = propOpenTaskWindow.getValueBoolean();
    }
    task.SetOpenWin(propOpenTaskWindowValue);
  }

  /// <summary>
  /// !!
  /// </summary>
  /// <param name="task"></param>
  /// <param name="originalTaskId"></param>
  /// <param name="evt"></param>
  /// <returns></returns>
  abstract GetEventTaskId(task: Task, originalTaskId: string, evt: Event): string ;

  /// <summary>
  /// prepare the main display
  /// </summary>
  /// <param name="task"></param>
  static PreparePropMainDisplay(task: Task): ReturnResult {
    task.ComputeMainDisplay();
    let result: ReturnResult = task.FormIsLegal() ? ReturnResult.SuccessfulResult : new ReturnResult(MsgInterface.BRKTAB_STR_ERR_FORM);
    if (result.Success) {
      let form: MgForm = ((task.getForm() instanceof MgForm) ? <MgForm>task.getForm() : null);
      if (form !== null && form.IsFrameSet)
        result = new ReturnResult(MsgInterface.CHK_ERR_OFFLINE_NOT_SUPPORT_FRAME_INTERFACE);
    }

    return result;
  }

  /// <summary>
  /// Returns a boolean indicating whether the property whose id is propId, should
  /// be reevaluated locally, on the client side.
  /// </summary>
  /// <param name="propId">The identifier of the property in question.</param>
  /// <returns>
  /// The implementing method should return <code>true</code> if the property
  /// should be evaluated on the client side. Otherwise it should return <code>false</code>.
  /// </returns>
  abstract ShouldEvaluatePropertyLocally(propId: number): boolean ;

  /// <summary>
  /// initialize the TaskPrefixExecuted flag on the task - on connected tasks it is always executed on the server, while
  /// in offline tasks it is executed as part of the task start process
  /// </summary>
  /// <param name="task"></param>
  abstract InitTaskPrefixExecutedFlag(task: Task): void ;

  /// <summary>
  /// Creates exit command, adds it to commands for execution and execute it if it's needed
  /// </summary>
  /// <param name="task"></param>
  /// <param name="reversibleExit"></param>
  /// <param name="subformDestination"></param>
  static Exit(task: Task, reversibleExit: boolean, subformDestination: boolean): void {
    task.Exit(reversibleExit, subformDestination);
  }

  /// <summary>
  /// When the subform is closed before call with a destination, we need to remove parent recomputes.
  /// </summary>
  /// <param name="parentTask"></param>
  /// <param name="subformTask"></param>
  abstract RemoveRecomputes(parentTask: Task, subformTask: Task): void ;

  GetOwnerTransactionTask(task: Task): Task {
    return null;
  }
}
