import {Debug, NString} from "@magic/mscorelib";
import {MsgInterface, StrUtil} from "@magic/utils";
import {Commands, CommandType, ControlTable, Manager, MgControlBase, MgCursors, Styles} from "@magic/gui";
import {MGData} from "./tasks/MGData";
import {RCTimer} from "./tasks/RCTimer";
import {MgForm} from "./gui/MgForm";
import {Task} from "./tasks/Task";
import {MGDataCollection} from "./tasks/MGDataCollection";
import {ClientManager} from "./ClientManager";
import {MgControl} from "./gui/MgControl";

/// <summary>
/// </summary>
// @dynamic
export class GUIManager {
  private static _lastFocusedControls: ControlTable = new ControlTable(); // last focused controls PER WINDOW

  static LastFocusMgdID: number = 0; // the last MGDATA for which setFocus was performed

  private static _instance: GUIManager = null; // the single instance of the GUIManager

  ///   singleton
  /// </summary>
  static get Instance(): GUIManager {
    if (GUIManager._instance === null)
      GUIManager._instance = new GUIManager();
    return GUIManager._instance;
  }


  /// <summary>
  ///   execute the commands in the queue
  /// </summary>
  execGuiCommandQueue(): void {
    Commands.beginInvoke();
  }

  /// <summary>
  ///   Shows contents of the document located by URL inside a browser control on a separate form
  /// </summary>
  /// <param name = "url">document path</param>
  /// <param name = "openAsApplicationModal">open form modally</param>
  showContentFromURL(url: string, openAsApplicationModal: boolean): void {
    if (NString.IsNullOrEmpty(url))
      return;
  }

  ///   Show contents inside a browser control on a separate form
  /// </summary>
  /// <param name = "contents">contents to show </param>
  showContent(contents: string): void {
  }

  /// <summary>
  ///   start a timer
  /// </summary>
  /// <param name = "mgd"> MgData </param>
  /// <param name = "seconds">interval in full seconds to invoke the function (from current time)</param>
  /// <param name = "isIdleTimer">true if this timer is the idle timer</param>
  startTimer(mgData: MGData, seconds: number, isIdleTimer: boolean): void {
    if (seconds > 0) {
      // RCTimer/MgTimer works on milliseconds so convert seconds to milliseconds
      let objRCTimer: RCTimer = new RCTimer(mgData, seconds * 1000, isIdleTimer);
      Commands.addAsync(CommandType.START_TIMER, objRCTimer);
      // fixed bug 284566, while we have command in he queue, execute them
      Commands.beginInvoke();
    }
  }

  /// <summary>
  ///   stop the timer
  /// </summary>
  /// <param name = "MgData"> MgData</param>
  /// <param name = "seconds">interval in full seconds to invoke the function (from current time)</param>
  /// <param name = "isIdleTimer">true if this timer is the idle timer</param>
  stopTimer(mgData: MGData, seconds: number, isIdleTimer: boolean): void {
    if (seconds > 0)
    // RCTimer/MgTimer works on milliseconds so convert seconds to milliseconds
      RCTimer.StopTimer(mgData, seconds * 1000, isIdleTimer);
  }

  abort(form: MgForm): void;
  abort(): void;
  abort(form?: MgForm): void {
    if (arguments.length === 1)
      this.abort_0(form);
    else
      this.abort_1();
  }

  /// <summary>
  ///  close the task
  /// </summary>
  /// <param name = "form"> </param>
  private abort_0(form: MgForm): void {
    if (form !== null) {
      let mainProgByCtlIdx: Task = MGDataCollection.Instance.GetMainProgByCtlIdx(form.getTask().getCtlIdx());
      Manager.Abort(form, mainProgByCtlIdx);
    }
  }

  /// <summary>
  ///   process ABORT command.Close all shells. Last shell closed, will close the display.
  /// </summary>
  private abort_1(): void {
    Commands.disposeAllForms();
  }

  /// <summary>
  ///   Open message box with title id and message id that will take from MGBCL*ENG.xml (created by mgconst)
  /// </summary>
  /// <param name = "form"></param>
  /// <param name = "titleId">message from from MGBCL*ENG.xml</param>
  /// <param name = "msgId">message from from MGBCL*ENG.xml</param>
  /// <param name = "style">the style of the message box can be flags of Styles.MSGBOX_xxx </param>
  /// <returns> message box style from Styles.MSGBOX_XXX</returns>
  writeToMessageBox(form: MgForm, titleId: string, msgId: string, style: number): number {
    let title: string = ClientManager.Instance.getMessageString(titleId);
    let msg: string = ClientManager.Instance.getMessageString(msgId);
    return Commands.messageBox(form.getTopMostForm(), title, msg, style);
  }

  confirm(form: MgForm, msgId: string): boolean;
  confirm(form: MgForm, msgId: string, style: number): number;
  confirm(form: MgForm, msgId: string, style?: number): any {
    if (arguments.length === 2)
      return this.confirm_0(form, msgId);
    else
      return this.confirm_1(form, msgId, style);
  }

  /// <summary>
  ///   display a Message Box (confirm) with 2 buttons : yes & no and icon question.
  /// </summary>
  /// <param name = "form">the parent form </param>
  /// <param name = "msgId">message number (from MsgInterface.java) that will be display on the content of the Message Box
  ///   return true if the button YES was pressed
  /// </param>
  private confirm_0(form: MgForm, msgId: string): boolean {
    let retResult: number = this.confirm(form, msgId, Styles.MSGBOX_BUTTON_OK_CANCEL );
    return retResult == <number>Styles.MSGBOX_RESULT_OK;
  }

  /// <summary>
  ///   display a Message Box (confirm) with 2 buttons .
  /// </summary>
  /// <param name = "form">the parent form </param>
  /// <param name = "msgId">message number (from MsgInterface.java) that will be display on the content of the Message Box </param>
  /// <param name = "style">the icon and the button that will be display on the confirmation box </param>
  /// <returns> the button that was pressed (Styles.MSGBOX_BUTTON_xxx) </returns>
  private confirm_1(form: MgForm, msgId: string, style: number): number {
    return this.writeToMessageBox(form, MsgInterface.CONFIRM_STR_WINDOW_TITLE, msgId, style);
  }

  /// <summary>
  ///   Set the current cursor
  /// </summary>
  /// <param name = "shape">code of mouse cursor: "wait", "hand"...</param>
  setCurrentCursor(shape: MgCursors): boolean {
    return true;
  }

  /// <summary>
  ///   changes all illegal characters or special characters used for parsing to their legal format
  ///   the parsing is performed at several places first when passing the url to IE by IE
  ///   second in the requester (rqhttp.cpp) when parsing the url for arguments
  ///   thirst in the magic engine (mgrqmrg.cpp - copy_in_args)
  ///   we must distinguish between characters that are reserved for special use by the URL RFC and
  ///   between characters used internally by magic for special use
  /// </summary>
  /// <param name = "source">url to be converted </param>
  /// <returns> the converted url   </returns>
  makeURLPrintable(source: string): string {
    let from: string[] = [
      "\\", "\0", ","
    ];
    let to: string[] = [
      "\\\\", "\\0", "\\,"
    ];
    return StrUtil.searchAndReplace(source, from, to);
  }

  /// <summary>
  ///   The main message loop that reads messages from the queue and dispatches them.
  /// </summary>
  static getLastFocusedControl(mgdID?: number): MgControl {
    if (arguments.length === 0)
      return GUIManager.getLastFocusedControl_0();

    return GUIManager.getLastFocusedControl_1(mgdID);
  }

  /// <summary>
  ///   get the last control that had the focus in the current mgdata
  /// </summary>
  /// <returns> reference to the last focused control</returns>
  private static getLastFocusedControl_0(): MgControl {
    return <MgControl>GUIManager._lastFocusedControls.getCtrl(MGDataCollection.Instance.currMgdID);
  }

  /// <summary>
  ///   get the last control that had the focus in the current mgdata
  /// </summary>
  /// <param name = "mgdID">the mgdata ID for which to return the last focused control</param>
  /// <returns> reference to the last focused control</returns>
  private static getLastFocusedControl_1(mgdID: number): MgControl {
    return <MgControl>GUIManager._lastFocusedControls.getCtrl(mgdID);
  }

  /// <summary>
  /// get the control at 'index'
  /// </summary>
  /// <param name="index"></param>
  static deleteLastFocusedControlAt(index: number): void {
    if (GUIManager._lastFocusedControls !== null) {
      GUIManager._lastFocusedControls.deleteControlAt(index);
    }
  }

  /// <summary>
  /// set the control at 'index'
  /// </summary>
  /// <param name="ctrl"></param>
  /// <param name="currMgdID"></param>
  static setLastFocusedControlAt(ctrl: MgControlBase, currMgdID: number): void {
    GUIManager._lastFocusedControls.setControlAt(ctrl, currMgdID);
  }

  /// <summary>
  /// set the last focused control and the task for current window.
  /// </summary>
  /// <param name="task"></param>
  /// <param name="MgControlBase"></param>
  static setLastFocusedControl(task: Task, mgControl: MgControlBase): void {
    let currMgdID: number = task.getMgdID();

    Debug.Assert(mgControl === null || task === mgControl.getForm().getTask());

    GUIManager.LastFocusMgdID = currMgdID;
    GUIManager.setLastFocusedControlAt(mgControl, currMgdID);
    ClientManager.Instance.setLastFocusedTask(task);
  }
}
