import {MgForm} from "./gui/MgForm";
import {MgControl} from "./gui/MgControl";
import {GUIManager} from "./GUIManager";
import {Task} from "./tasks/Task";
import {ClientManager} from "./ClientManager";
import {Manager, MenuEntryEvent, MenuEntryOSCommand, MenuEntryProgram} from "@magic/gui";
import {RunTimeEvent} from "./event/RunTimeEvent";
import {List} from "@magic/mscorelib";
import {ArgumentsList} from "../index";
import {MGDataCollection} from "./tasks/MGDataCollection";

export class MenuManager {

  /// <summary>
  ///   according to shell return the last control that was in focus
  ///   it can be on subform \ sub sub form....
  /// </summary>
  /// <param name = "mgForm"></param>
  /// <returns></returns>
  private static getLastFocusedControl(mgForm: MgForm): MgControl {
    let windowIndex: number = MenuManager.getLastFocusedTask(mgForm).getMGData().GetId();
    return GUIManager.getLastFocusedControl(windowIndex);
  }

  /// <summary>
  ///   according to shell return the last task that was in focus
  ///   it can be on subform \ sub sub form....    *
  /// </summary>
  /// <param name = "mgForm"></param>
  /// <returns></returns>
  private static getLastFocusedTask(mgForm: MgForm): Task {
    let windowIndex: number = (<Task>mgForm.getTask()).getMGData().GetId();
    return ClientManager.Instance.getLastFocusedTask(windowIndex);
  }

  /// <summary>
  ///   This method is activated when a program menu was selected. It performs the needed operations in order to
  ///   translate the selected program menu into the matching operation
  /// </summary>
  /// <param name="contextID">active/target context (irelevant for RC)</param>
  /// <param name="menuEntryProgram">the selected menu \ bar menuEntryProgram object</param>
  /// <param name="activeForm"></param>
  /// <param name="ActivatedFromMDIFrame"></param>
  /// <returns></returns>
  static onProgramMenuSelection(contextID: number, menuEntryProgram: MenuEntryProgram, activeForm: MgForm, ActivatedFromMDIFrame: boolean): void {
    let menuTask: Task = MenuManager.getLastFocusedTask(activeForm);

    ClientManager.Instance.RuntimeCtx.LastClickedMenuUid = menuEntryProgram.menuUid();
    let programMenuEvt: RunTimeEvent = new RunTimeEvent(menuEntryProgram, menuTask, ActivatedFromMDIFrame);
    ClientManager.Instance.EventsManager.addToTail(programMenuEvt);
  }

  /// <summary>
  ///   This method is activated when an Event menu was selected. It performs the needed operations in order to
  ///   translate the selected event menu into the matching operation
  /// </summary>
  /// <param name = "menuEntryEvent">the selected menu \ bar menuEntryEvent object</param>
  /// <param name = "activeForm">last active Form</param>
  /// <param name = "ctlIdx">the index of the ctl which the menu is attached to in toolkit</param>
  static onEventMenuSelection(menuEntryEvent: MenuEntryEvent, activeForm: MgForm, ctlIdx: number): void {
    let lastFocusedControl: MgControl = MenuManager.getLastFocusedControl(activeForm);
    let lastFocusedTask: Task = MenuManager.getLastFocusedTask(activeForm);

    let aRtEvt: RunTimeEvent = new RunTimeEvent(menuEntryEvent, lastFocusedTask, lastFocusedControl, ctlIdx);
    aRtEvt.setPublicName();
    aRtEvt.setMainPrgCreator(null);

    // build the argument list from the mainProgVars
    let mainProgVars: List<string> = menuEntryEvent.MainProgVars;
    if (mainProgVars !== null && mainProgVars.length > 0) {
      let argumentsList: ArgumentsList = new ArgumentsList();
      argumentsList.fillListByMainProgVars(mainProgVars, lastFocusedTask.getCtlIdx());
      aRtEvt.setArgList(argumentsList);
      aRtEvt.setTask(null);
    }
    ClientManager.Instance.EventsManager.addToTail(aRtEvt);
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="contextID">active/target context (irelevant for RC)</param>
  /// <param name="osCommandMenuEntry"></param>
  /// <param name="lastFocusedCtrlTask">
  ///the task of the last focused control. This is required because even if there is no
  ///last focused control, then also we have task and hence expression/function will be executed properly.
  ///Previously task was obtained from the control and when there was no control,task could not be obtained.
  /// </param>
  /// <returns></returns>
  static onOSMenuSelection(contextID: number, osCommandMenuEntry: MenuEntryOSCommand, activeForm: MgForm): void {
    let lastFocusedTask: Task = MenuManager.getLastFocusedTask(activeForm);

    let rtEvt: RunTimeEvent = new RunTimeEvent(osCommandMenuEntry, lastFocusedTask);

    if (osCommandMenuEntry.Wait)
      ClientManager.Instance.EventsManager.handleEvent(rtEvt, false);
    else
      ClientManager.Instance.EventsManager.addToTail(rtEvt);
  }

  /// <summary>
  /// get menu path
  /// </summary>
  /// <param name="task">
  /// <returns>string</returns>
  static GetMenuPath(task: Task): string {
    let mainProg: Task = MGDataCollection.Instance.GetMainProgByCtlIdx(task.getCtlIdx());
    let currTsk: Task = ClientManager.Instance.EventsManager.getCurrTask() || (<Task>task.GetContextTask());

    // fixed bug#919779, the MenuUid is save on the parent.
    // MenuUid is saved on the parent. bacouse we don't have menu on the current form.
    let menuUid: number = currTsk.MenuUid;
    while (menuUid === 0 && currTsk !== null) {
      currTsk = currTsk.getParent();
      if (currTsk !== null) {
        menuUid = currTsk.MenuUid;
      }
    }
    // as we doing for online: if it is not program that was called, then get the last click menu id from the top most form.
    if (menuUid === 0) {
      currTsk = (ClientManager.Instance.EventsManager.getCurrTask() || (<Task>task.GetContextTask()));
      menuUid = currTsk.getTopMostForm().LastClickedMenuUid;
    }
    return Manager.MenuManager.GetMenuPath(mainProg, menuUid);
  }

}
