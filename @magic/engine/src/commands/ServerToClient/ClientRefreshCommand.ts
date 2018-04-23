import {ClientTargetedCommandBase} from "./ClientTargetedCommandBase";
import {IResultValue} from "../../rt/IResultValue";
import {MGDataCollection} from "../../tasks/MGDataCollection";
import {Task} from "../../tasks/Task";
import {Debug} from "@magic/mscorelib";
import {DataView} from "../../data/DataView";

export class ClientRefreshCommand extends ClientTargetedCommandBase {
  static ClientIsInRollbackCommand: boolean = false;

  /// <summary>
  ///
  /// </summary>
  /// <param name="res"></param>
  Execute(res: IResultValue): void {
    let mgDataTab: MGDataCollection = MGDataCollection.Instance;

    let task: Task = <Task>mgDataTab.GetTaskByID(this.TaskTag);
    Debug.Assert(task.IsSubForm);

    // Fixed Defect#:77149
    // if we in rollback command and we get clientRefresh command from server ,
    // first we need to rollback the local transaction and then we need to do refresh to the view .
    // the refresh to the view will be handled in rollback command
    if (ClientRefreshCommand.ClientIsInRollbackCommand)
      return;

    if (task.AfterFirstRecordPrefix && !task.InEndTask) {
      // QCR #284789. When the subform execute it's recompute, we do not needed to execute it's view refresh,
      // we need execute only it's subforms refresh. It will be done in recompute.
      if ((<DataView>task.DataView).getCurrRec().InRecompute)
        task.ExecuteClientSubformRefresh = true;
      else {
        // Do not execute RP & RS of the parent, because it was done already.
        task.PerformParentRecordPrefix = false;
        task.getParent().SubformRefresh(task, true);
        task.PerformParentRecordPrefix = true;
      }
    }
  }

  constructor() {
    super();
  }
}
