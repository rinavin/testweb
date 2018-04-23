import {ClientTargetedCommandBase} from "./ClientTargetedCommandBase";
import {IResultValue} from "../../rt/IResultValue";
import {MGDataCollection} from "../../tasks/MGDataCollection";
import {Task} from "../../tasks/Task";
import {ClientManager} from "../../ClientManager";
import {Debug} from "@magic/mscorelib";
import {MGData} from "../../tasks/MGData";
import {GUIManager} from "../../GUIManager";
import {MgForm} from "../../gui/MgForm";
import {MgControl} from "../../gui/MgControl";
import {ConstInterface} from "../../ConstInterface";
import {XMLConstants} from "@magic/utils";

export class AbortCommand extends ClientTargetedCommandBase {

  private _transOwner: string = null;

  constructor();
  constructor(taskTag: string);
  constructor(taskTag?: string) {
    super();
    if (arguments.length === 0) {
      this.constructor_0();
      return;
    }
    this.constructor_1(taskTag);
  }

  private constructor_0(): void {
  }

  private constructor_1(taskTag: string): void {
    this.TaskTag = taskTag;
  }

  Execute(res: IResultValue): void {
    let instance: MGDataCollection = MGDataCollection.Instance;
    let currMgdID: number = MGDataCollection.Instance.currMgdID;
    let task: Task = <Task>instance.GetTaskByID(this.TaskTag);

    // Pass transaction ownership
    if (this._transOwner !== null) {
      let newTransOwnerTask: Task = <Task>instance.GetTaskByID(this._transOwner);
      if (newTransOwnerTask !== null)
        newTransOwnerTask.setTransOwnerTask();
    }

    // On special occasions, the server may send abort commands on tasks which were not parsed yet
    if ((task === null && ClientManager.Instance.EventsManager.ignoreUnknownAbort()))
      return;

    Debug.Assert(task !== null);
    let mGData: MGData = task.getMGData();
    task.stop();
    if (!task.IsRoute())
      mGData.abort();

    MGDataCollection.Instance.currMgdID = mGData.GetId();
    GUIManager.Instance.abort(<MgForm>task.getForm());
    MGDataCollection.Instance.currMgdID = ((mGData.GetId() !== currMgdID || mGData.getParentMGdata() === null)
                                            ? currMgdID
                                            : mGData.getParentMGdata().GetId());

    if (!ClientManager.Instance.validReturnToCtrl()) {
      let lastFocusedControl: MgControl = GUIManager.getLastFocusedControl();
      ClientManager.Instance.ReturnToCtrl = lastFocusedControl;
    }
  }

  public HandleAttribute(attribute: string, value: string): void {
    switch (attribute) {
      case ConstInterface.MG_ATTR_TRANS_OWNER:
        this._transOwner = value;
        break;

      default:
        super.HandleAttribute(attribute, value);
        break;
    }

    // Signal the server has aborted the task.
    if (attribute === XMLConstants.MG_ATTR_TASKID) {
      let abortingTask = <Task>MGDataCollection.Instance.GetTaskByID(this.TaskTag);
      if (abortingTask != null)
        abortingTask.resetKnownToServer();
    }
  }
}
