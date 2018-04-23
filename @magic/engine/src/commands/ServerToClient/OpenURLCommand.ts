import {Debug, Int32, List, NString} from "@magic/mscorelib";
import {XMLConstants, XmlParser} from "@magic/utils";
import {ClientTargetedCommandBase} from "./ClientTargetedCommandBase";
import {ArgumentsList} from "../../rt/ArgumentsList";
import {MGData} from "../../tasks/MGData";
import {MGDataCollection} from "../../tasks/MGDataCollection";
import {MgControl} from "../../gui/MgControl";
import {ClientManager} from "../../ClientManager";
import {MgForm} from "../../gui/MgForm";
import {OpeningTaskDetails, Task} from "../../tasks/Task";
import {GUIManager} from "../../GUIManager";
import {ConstInterface} from "../../ConstInterface";
import {IResultValue} from "../../rt/IResultValue";


export class OpenURLCommand extends ClientTargetedCommandBase {
  private _callingTaskTag: string = null;  // is the id of the task that called the new window
  private _pathParentTaskTag: string = null; // is the id of path parent task tag
  private _subformCtrlName: string = null; // Subform control name for Destination Subform
  private _ditIdx: number = Int32.MinValue;
  private _isModal: boolean = true; // Y|N
  private _transOwner: string = null;
  private _newId: string = null;
  private _forceModal: boolean = false;
  private _key: string = null;
  private _varList: ArgumentsList = null;
  private _isRoute: boolean = false; // Y|N
  NewTaskXML: string = null;

  get IsBlocking(): boolean {
    return this._isModal && !this.WillReplaceWindow && this._subformCtrlName === null;
  }

  public Execute(res: IResultValue): void {
    let mgd: MGData = null;
    let mgDataTab: MGDataCollection = MGDataCollection.Instance;
    let destinationSubformSucceeded: boolean = false;
    let refreshWhenHidden: boolean = true;
    let mgdID: number = 0;
    let subformCtrl: MgControl = null;
    let oldTimers: List<number> = new List<number>(), newTimers = new List<number>();
    let moveToFirstControl: boolean = true;
    let guiParentTask: Task;
    let guiParentMgData: MGData = null;
    let callingTask: Task = (this._callingTaskTag != null ? <Task>mgDataTab.GetTaskByID(this._callingTaskTag) : null);
    let pathParentTask: Task = (this._pathParentTaskTag != null ? <Task>mgDataTab.GetTaskByID(this._pathParentTaskTag) : null);
    let formToBeActivatedOnClosingCurrentForm: MgForm = null;

    let lastFocusedTask: Task = ClientManager.Instance.getLastFocusedTask();
    if (lastFocusedTask != null && lastFocusedTask.IsOffline)
      formToBeActivatedOnClosingCurrentForm = <MgForm>lastFocusedTask.getForm();

    // When a nonOffline task was called from an Offline task (of course via MP event),
    // the calling task id was not sent to the server because the server is unaware of the
    // offline task. So, when coming back from the server, assign the correct calling task.
    // Task lastFocusedTask = ClientManager.Instance.getLastFocusedTask();
    // if (lastFocusedTask != null && lastFocusedTask.IsOffline)
    //   _callingTaskTag = lastFocusedTask.getTaskTag();

    guiParentTask = callingTask = <Task>mgDataTab.GetTaskByID(this._callingTaskTag);
    if (callingTask != null)
      mgd = callingTask.getMGData();

    // QCR#712370: we should always perform refreshTables for the old MgData before before opening new window
    ClientManager.Instance.EventsManager.refreshTables();

    // ditIdx is send by server only for subform opening for refreshWhenHidden
    if ((!NString.IsNullOrEmpty(this._subformCtrlName)) || (this._ditIdx !== Int32.MinValue) || this._isRoute) {
      if (this._isRoute && NString.IsNullOrEmpty(this._subformCtrlName.trim())) {
        subformCtrl = <MgControl>callingTask.getForm().DefaultRouterOutlet;
      }
      else
        subformCtrl = (this._ditIdx !== Int32.MinValue ? <MgControl>callingTask.getForm().getCtrl(this._ditIdx) : (<MgForm>callingTask.getForm()).getSubFormCtrlByName(this._subformCtrlName));
    }

    if (subformCtrl != null) {
      let subformTask = subformCtrl.getSubformTask();
      guiParentTask = <Task>subformCtrl.getForm().getTask();
      mgdID = guiParentTask.getMgdID();
      guiParentMgData = guiParentTask.getMGData();
      if (guiParentMgData.getTimerHandlers() != null)
        oldTimers = guiParentMgData.getTimerHandlers().getTimersVector();

      if (this._ditIdx !== Int32.MinValue) { // for refresh when hidden
        refreshWhenHidden = false;
        moveToFirstControl = false;
      }
      else { // for destination
        destinationSubformSucceeded = true;
        // Pass transaction ownership
        if (this._transOwner != null) {
          let newTransOwnerTask = <Task>mgDataTab.GetTaskByID(this._transOwner);
          if (newTransOwnerTask != null)
            newTransOwnerTask.setTransOwnerTask();
        }
        if (subformTask != null) {
          subformTask.setDestinationSubform(true);
          subformTask.stop();
        }
        if (!ClientManager.Instance.validReturnToCtrl())
          ClientManager.Instance.ReturnToCtrl = GUIManager.getLastFocusedControl();
      }
      subformCtrl.setSubformTaskId(this._newId);
    }

    let parentMgData: MGData;
    if (callingTask == null)
      parentMgData = MGDataCollection.Instance.getMGData(0);
    else
      parentMgData = callingTask.getMGData();

    if (!destinationSubformSucceeded && refreshWhenHidden) {
      mgdID = mgDataTab.getAvailableIdx();
      Debug.Assert(mgdID > 0);
      mgd = new MGData(mgdID, parentMgData, this._isModal, this._forceModal);
      mgd.copyUnframedCmds();
      MGDataCollection.Instance.addMGData(mgd, mgdID, false);

      MGDataCollection.Instance.currMgdID = mgdID;
    }
    this.Obj = this._key;
    this._key = null;
    try {

      // TODO : check if we need to force GarbageCollection
      // TODO : check this out :  https://stackoverflow.com/questions/27321997/how-to-request-the-garbage-collector-in-node-js-to-run
      // if (GC.GetTotalMemory(false) > 30000000)
      //   GC.Collect();
      ClientManager.Instance.ProcessResponse(this.NewTaskXML, mgdID, new OpeningTaskDetails(callingTask, pathParentTask, formToBeActivatedOnClosingCurrentForm), null);
    }

    finally {
      ClientManager.Instance.EventsManager.setIgnoreUnknownAbort(false);
    }

    if (destinationSubformSucceeded || !refreshWhenHidden) {
      subformCtrl.initSubformTask();

      if (destinationSubformSucceeded) {
        let subformTask = subformCtrl.getSubformTask();
        moveToFirstControl = !callingTask.RetainFocus;
        subformTask.setIsDestinationCall(true);
      }
    }

    if (subformCtrl != null) {
      if (guiParentMgData.getTimerHandlers() != null)
        newTimers = guiParentMgData.getTimerHandlers().getTimersVector();
      guiParentMgData.changeTimers(oldTimers, newTimers);
    }
    let nonInteractiveTask: Task = ClientManager.Instance.StartProgram(destinationSubformSucceeded, moveToFirstControl);

    if (destinationSubformSucceeded || !refreshWhenHidden)
      guiParentTask.resetRcmpTabOrder();

    // in local tasks, ismodal is calculated after the main display, so we need to update the command member
    this._isModal = mgd.IsModal;

    // If we have a non interactive task starting, we need to create an eventLoop for it , just like modal.
    // This is because we cannot allow the tasks above it to catch events.
    if (nonInteractiveTask == null) {
      // a non interactive parent will cause the called task to behave like modal by having its own events loop.
      // In case of main program caller (which is flagged as non interactive) we will have a new events loop for the called program
      // if the main program is without a form. If the main prog has a form , then the callee can be included in the main prog loop.
      if (callingTask != null && ((this._isModal && !destinationSubformSucceeded && refreshWhenHidden) || (!callingTask.IsInteractive && (!callingTask.isMainProg() || callingTask.getForm() == null))))
        ClientManager.Instance.EventsManager.EventsLoop(mgd);
    }
    else
      ClientManager.Instance.EventsManager.NonInteractiveEventsLoop(mgd, nonInteractiveTask);
  }

  public HandleAttribute(attribute: string, value: string): void {
    switch (attribute) {
      case ConstInterface.MG_ATTR_CALLINGTASK:
        this._callingTaskTag = value;
        break;
      case ConstInterface.MG_ATTR_PATH_PARENT_TASK:
        this._pathParentTaskTag = value;
        break;
      case ConstInterface.MG_ATTR_SUBFORM_CTRL:
        this._subformCtrlName = value;
        break;
      case XMLConstants.MG_ATTR_DITIDX:
        this._ditIdx = XmlParser.getInt(value);
        break;
      case ConstInterface.MG_ATTR_MODAL:
        this._isModal = (value[0] === '1');
        break;
      case ConstInterface.MG_ATTR_TRANS_OWNER:
        this._transOwner = value;
        break;
      case ConstInterface.MG_ATTR_NEWID:
        this._newId = NString.TrimEnd(value);
        break;
      case ConstInterface.MG_ATTR_KEY:
        this._key = value;
        break;
      case ConstInterface.MG_ATTR_ARGLIST:
        this._varList = new ArgumentsList();
        this._varList.fillList(value, <Task>MGDataCollection.Instance.GetTaskByID(this.TaskTag));
        break;
      case ConstInterface.MG_ATTR_OBJECT:
        this.Obj = value;
        break;
      case ConstInterface.MG_ATTR_IS_ROUTE:
        this._isRoute = (value[0] === '1');
        break;
      default:
        super.HandleAttribute(attribute, value);
        break;
    }
  }
}
