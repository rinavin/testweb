/// <summary>
/// MgGui.dll's manager - assembly level properties and methods.
/// </summary>
import {NString, StackFrame} from "@magic/mscorelib";
import {HelpCommand, UtilImeJpn, UtilStrByteMode, WindowType} from "@magic/utils";
import {TextMaskEditor} from "./management/gui/TextMaskEditor";
import {IEnvironment} from "./env/IEnvironment";
import {IEventsManager} from "./management/events/IEventsManager";
import {IMGDataTable} from "./management/tasks/IMGDataTable";
import {GuiMgControl} from "./gui/GuiMgControl";
import {MenuManager} from "./MenuManager";
import {TaskBase} from "./management/tasks/TaskBase";
import {MgControlBase} from "./management/gui/MgControlBase";
import {MgRectangle} from "./util/MgRectangle";
import {Commands} from "./Commands";
import {MgFormBase} from "./management/gui/MgFormBase";
import {Property} from "./management/gui/Property";
import {MgPoint} from "./util/MgPoint";
import {ApplicationMenus} from "./management/gui/ApplicationMenus";
import {MgMenu} from "./management/gui/MgMenu";
import {CommandType, MarkMode, MenuStyle} from "./GuiEnums";
import {Events} from "./Events";
import {ITask} from "./management/tasks/ITask";
import {PIC} from "./management/gui/PIC";
import {RuntimeContextBase} from "./management/RuntimeContextBase";
import {GuiMgForm} from "./gui/GuiMgForm";
import {MenuReference} from "./gui/low/MenuReference";
import {GuiCommandQueue} from "./gui/low/GuiCommandQueue";
import {GuiMenuEntry} from "./gui/GuiMenuEntry";
import {ExpressionInterface} from "./management/exp/ExpressionInterface";
import {PropInterface} from "./management/gui/PropInterface";
import {setTimeout} from "timers";


export class Manager {
  private static _delayWait: Object = new Object(); // this object is used for execution and interrupting delay command
  private static _clipboardData: string = ""; // Data to be written to the clipboard.
  static TextMaskEditor: TextMaskEditor = new TextMaskEditor();

  // This will hold the contextID for a current thread.
  // Thread static is a separate for each thread (i.e.: value of a static field is unique for each thread).
  // http://msdn.microsoft.com/en-us/library/system.threadstaticattribute.aspx
  private static _currentContextID: string = '\0';

  static DefaultProtocol: string = null; // default protocol (http/https) and server name to be used for any relative url
  static DefaultServerName: string = null;
  static UtilImeJpn: UtilImeJpn = (UtilStrByteMode.isLocaleDefLangJPN() ? new UtilImeJpn() : null); // JPN: IME support
  static Environment: IEnvironment = null;
  static EventsManager: IEventsManager = null;
  static MGDataTable: IMGDataTable = null; // global for the gui namespace
  static MenuManager: MenuManager = new MenuManager();

  /// <summary>(public)
  /// Set the context ID for a current thread
  /// </summary>
  /// <param name="contextID"></param>
  static SetCurrentContextID(contextID: string): void {
    Manager._currentContextID = contextID;
  }

  /// <summary>
  /// Get the context ID for a current thread
  /// </summary>
  /// <returns>current thread's contextID</returns>
  static GetCurrentContextID(): string {
    return Manager._currentContextID;
  }

  /// <summary>
  ///   get object that is used for execution and interrupting delay command.
  /// </summary>
  /// <returns></returns>
  static GetDelayWait(): any {
    return Manager._delayWait;
  }

  /// <summary>
  ///   check if dot net control can be focused
  /// </summary>
  /// <param name = "guiMgControl"></param>
  /// <returns></returns>
  static CanFocus(guiMgControl: GuiMgControl): boolean {
    return false;
  }



  static Init(startupImageFileName: string): void {
      return;
  }


  /// <summary>(public)
  /// finds position of control (in pixels) on the form</summary>
  /// <param name = "task">which consists the control </param>
  /// <param name = "opCode">operation code(EXP_OP_CTRL_LEFT|TOP|WIDTH|HEIGHT) </param>
  /// <param name = "ctrlName">name of the control, null if the controls name is not known </param>
  /// <returns> get the parameter of the control.If the control isn't defined yet, the 0 returned. </returns>
  static GetControlFocusedData(task: TaskBase, opCode: number, ctrlName: string): number {
    let res: number = 0;
    if (task.getForm() !== null) {

      let lastFocCtrl: MgControlBase;
      if (NString.IsNullOrEmpty(ctrlName)) {
        lastFocCtrl = task.getLastParkedCtrl();
        if (lastFocCtrl === null)
          return 0;

        // get real, HTML name of control, (if repeatable -> with "_Number_of_line" suffix)
        ctrlName = lastFocCtrl.getName();
      }
      lastFocCtrl = task.getForm().GetCtrl(ctrlName);
      if (lastFocCtrl !== null) {
        let controlRect: MgRectangle = new MgRectangle(0, 0, 0, 0);
        Commands.getBounds(lastFocCtrl, controlRect);

        // Return the value wanted
        switch (opCode) {
          case ExpressionInterface.EXP_OP_CTRL_CLIENT_CX:
            res = task.getForm().pix2uom(controlRect.x, true);
            break;

          case ExpressionInterface.EXP_OP_CTRL_CLIENT_CY:
            res = task.getForm().pix2uom(controlRect.y, false);
            break;

          case ExpressionInterface.EXP_OP_CTRL_WIDTH:
            res = task.getForm().pix2uom(controlRect.width, true);
            break;

          case ExpressionInterface.EXP_OP_CTRL_HEIGHT:
            res = task.getForm().pix2uom(controlRect.height, false);
            break;
        }
      }
    }
    return res;
  }

  /// <summary>(public)
  /// gets size properties of window
  /// </summary>
  /// <param name = "form">form</param>
  /// <param name = "prop">dimension needed: 'X', 'Y', 'W', 'H' </param>
  /// <returns> size in pixels </returns>
  static WinPropGet(form: MgFormBase, prop: string): number {
    let res: number = 0;

    let controlRect: MgRectangle = new MgRectangle(0, 0, 0, 0);

    if (form.isSubForm()) {
      let ctrl: any = form.getSubFormCtrl();
      Commands.getBounds(ctrl, controlRect);
    }
    else if (!form.Opened)
      controlRect = Property.getOrgRect(form);
    else
      Commands.getClientBounds(form, controlRect, false);

    // Return the value wanted
    switch (prop) {
      case 'X':
        res = form.pix2uom(controlRect.x, true);
        break;
      case 'Y':
        res = form.pix2uom(controlRect.y, false);
        break;
      case 'W':
        res = form.pix2uom(controlRect.width, true);
        break;
      case 'H':
        res = form.pix2uom(controlRect.height, false);
        break;
    }
    return res;
  }

  /// <summary>(public)
  /// retrieve the currently selected text
  /// </summary>
  /// <param name = "ctrl">the control which is assumed to contain the selected text </param>
  static MarkedTextGet(ctrl: MgControlBase): string {
    let markedText: string = null;
    if (ctrl.isTextControl()) {
      // get the selected boundary
      let selection: MgPoint = Manager.SelectionGet(ctrl);

      // is there any selected text ?
      if (selection.x !== selection.y) {
        // get the text from the ctrl and the marked text.
        let text: string = Manager.GetCtrlVal(ctrl);
        markedText = text.substr(selection.x, selection.y - selection.x);
      }
    }
    return markedText;
  }

  /// <summary>(public)
  /// replace the content of a marked text within an edit control
  /// </summary>
  /// <param name = "ctrl">the control to operate upon </param>
  /// <param name = "str">text to replace </param>
  /// <returns>succeed or failed </returns>
  static MarkedTextSet(ctrl: MgControlBase, str: string): boolean {
    if (!ctrl.isTextControl())
      return false;

    let selection: MgPoint = Manager.SelectionGet(ctrl);
    // return if no text is selected
    if (selection.x === selection.y)
      return false;

    let successful: boolean = true;
    successful = Manager.TextMaskEditor.MarkedTextSet(ctrl, str);

    return successful;
  }

  /// <summary>
  ///  close the task
  /// </summary>
  /// <param name = "form"> </param>
  /// <param name="mainPrgTask"></param>
  static Abort(form: MgFormBase, mainPrgTask: TaskBase): void {
    let menus: ApplicationMenus = Manager.MenuManager.getApplicationMenus(mainPrgTask);

    // Context menu will not automatically dispose when form is dispose. we need to dispose it menually.
    if (menus !== null)
      menus.disposeFormContexts(form);

    // remove the instantiatedToolbar as this is not removed from Dispose handler.
    let mgMenu: MgMenu = form.getPulldownMenu();
    if (mgMenu !== null)
      mgMenu.removeInstantiatedToolbar(form);

    if (form.getSubFormCtrl() === null) {
      // if the closing form is 'opened as a modal' then decrement the modal count on its frame window.
      if (form.isDialog()) {
        let topMostFrameForm: MgFormBase = form.getTopMostFrameForm();
        if (topMostFrameForm !== null)
          topMostFrameForm.UpdateModalFormsCount(form, false);
      }

      Commands.addAsync(CommandType.CLOSE_FORM, form);
      // TODO: Handle non-Modal forms
      if (form.isDialog())
        Commands.addCloseForm(form, "0", form.getTask().getTaskTag());

      // QCR# 307199/302197: When a task closes, its form is closed, where it activates topmost form of
      // ParentForm. If Print Preview is activated, this is not required. Instead Print Preview form
      // should be activated.
      // if (!PrintPreviewFocusManager.GetInstance().ShouldPrintPreviewBeFocused)
      {
        /* QCR #939802. This bug is since 1.9 after the check-in of version 41 of GuiCommandsQueue.cs   */
        /* From that version onwards, we started to set the owner of the Floating window.               */
        /* Now, when we close a form, the .Net Framework activates the form which spawned this form.    */
        /* But in this special case of the QCR, while closing the 3rd form, framework activated the     */
        /* 1st form instead of the 2nd.                                                                 */
        /* So, when pressing Esc, the 1st form got closed (and of course, because of this all forms got */
        /* closed.                                                                                      */
        /* The solution is to explicitly activate the parent form when a form is closed.                */

        // If interactive offline task calls, non interactive non offline task, after closing the parent task
        // focus is not switched back to caller task, but it is set on MDI Frame. To avoid this, activate parent
        // form only if called task's form is opened.
        let formToBeActivated: MgFormBase = form.ParentForm;
        if (form.FormToBoActivatedOnClosingCurrentForm !== null)
          formToBeActivated = form.FormToBoActivatedOnClosingCurrentForm;

        if (formToBeActivated !== null
          && form.getTask() != null && !form.getTask().IsParallel // not for parallel
          && !MgFormBase.isMDIChild(form.ConcreteWindowType) // not for mdi children Defect 128265
          && form.Opened) {
          Commands.addAsync(CommandType.ACTIVATE_FORM, formToBeActivated.getTopMostForm());

          if (form.ConcreteWindowType === WindowType.ChildWindow) {
            let task: TaskBase = formToBeActivated.getTask();
            let mgControl: MgControlBase = task.getLastParkedCtrl();
            if (mgControl !== null)
              Commands.addBoolWithLine(CommandType.SET_FOCUS, mgControl, mgControl.getDisplayLine(false), true);
          }
        }
      }
    }
    else {
      // Defect 115062. For frames remove controls also from frame control.
      if (form.getContainerCtrl() !== null)
        Commands.addAsync(CommandType.REMOVE_SUBFORM_CONTROLS, form.getContainerCtrl());
      Commands.addAsync(CommandType.REMOVE_SUBFORM_CONTROLS, form.getSubFormCtrl());
    }
    Commands.beginInvoke();

    setTimeout(function () {
    }, 10);
  }

  /// <summary>
  /// returns a menu from a ctl
  /// </summary>
  /// <param name="contextID">active/target context</param>
  /// <param name="ctlIdx"></param>
  /// <param name="menuIndex"></param>
  /// <param name="menuStyle"></param>
  /// <param name="form"></param>
  /// <param name="createIfNotExist">This decides if menu is to be created or not.</param>
  /// <returns></returns>
  static GetMenu(contextID: number, ctlIdx: number, menuIndex: number, menuStyle: MenuStyle, form: MgFormBase, createIfNotExist: boolean): MgMenu {
    let mainProg: TaskBase = Events.GetMainProgram(contextID, ctlIdx);
    return Manager.MenuManager.getMenu(mainProg, menuIndex, menuStyle, form, createIfNotExist);
  }

  /// <summary>
  ///   returns the current value of the control
  /// </summary>
  /// <param name = "ctrl">control to get value </param>
  /// <returns> value of the control </returns>
  static GetCtrlVal(ctrl: MgControlBase): string {
    // QCR #745117: Make sure that if the contents of a control were changed
    // then the changes are applied before examining its value.
    return Commands.getValue(ctrl, ctrl.getDisplayLine(true));
  }

  /// <summary>
  ///   Set read only for controls
  /// </summary>
  /// <param name = "ctrl">the control to change its property </param>
  /// <param name = "isReadOnly">boolean </param>
  static SetReadOnlyControl(ctrl: MgControlBase, isReadOnly: boolean): void {
    if (ctrl.isTextControl() || ctrl.IsRepeatable) // Defect 131802: Set ReadOnly for Rich Text control in Table Header and defect 131704: in general for Rich Text.
    {
      // JPN: IME support (enable IME in query mode)
      if (UtilStrByteMode.isLocaleDefLangDBCS() && !ctrl.isMultiline()) {
        if (ctrl.getForm().getTask().checkProp(PropInterface.PROP_TYPE_ALLOW_LOCATE_IN_QUERY, false))
          return;
      }
      Commands.addOperationWithLine(CommandType.SET_PROPERTY, ctrl, ctrl.getDisplayLine(false), "readOnly", isReadOnly);

      Commands.beginInvoke();
    }
  }

  /// <summary>
  ///   SetSelection : Call Gui to set the selection on the text in the control
  /// </summary>
  /// <param name = "ctrl"> </param>
  /// <param name = "start"> </param>
  /// <param name = "end"> </param>
  /// <param name="caretPos"></param>
  static SetSelection(ctrl: MgControlBase, start: number, end: number, caretPos: number): void {
    if (ctrl.isTextControl()) {
      Commands.setSelection(ctrl, ctrl.getDisplayLine(true), start, end, caretPos);
    }
  }

  /// <summary>
  ///   mark  text in the control
  /// </summary>
  /// <param name = "ctrl">the destination control</param>
  /// <param name="start"></param>
  /// <param name="end"></param>
  static SetMark(ctrl: MgControlBase, start: number, end: number): void {
    if (ctrl.isTextControl())
      Commands.addAsync(CommandType.SELECT_TEXT, ctrl, ctrl.getDisplayLine(true), <number>MarkMode.MARK_SELECTION_TEXT, start, end);
  }

  /// <summary>
  /// mark a specific range of characters within a control
  /// </summary>
  /// <param name="ctrl">the control to mark</param>
  /// <param name="startIdx">start position (0 = first char)</param>
  /// <param name="len">length of section to mark</param>
  static MarkText(ctrl: MgControlBase, startIdx: number, len: number): void {
    if (ctrl.isTextControl()) {
      let endPos: number = startIdx + len;
      Manager.SetSelection(ctrl, startIdx, endPos, endPos);
    }
  }

  static SetFocus(ctrl: MgControlBase, line: number): void;
  static SetFocus(itask: ITask, ctrl: MgControlBase, line: number, activateForm: boolean): void;
  static SetFocus(ctrlOrItask: any, lineOrCtrl: any, line?: number, activateForm?: boolean): void {
    if (arguments.length === 2 && (ctrlOrItask === null || ctrlOrItask instanceof MgControlBase) && (lineOrCtrl === null || lineOrCtrl.constructor === Number)) {
      Manager.SetFocus_0(ctrlOrItask, lineOrCtrl);
      return;
    }
    Manager.SetFocus_1(ctrlOrItask, lineOrCtrl, line, activateForm);
  }

  /// <summary>
  ///   set the focus to the specified control
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "line"></param>
  private static SetFocus_0(ctrl: MgControlBase, line: number): void {
    Manager.SetFocus(ctrl.getForm().getTask(), ctrl, line, true);
  }

  /// <summary>
  ///   set the focus to the specified control
  /// </summary>
  /// <param name = "itask"></param>
  /// <param name = "ctrl"></param>
  /// <param name = "line"></param>
  /// <param name="activateForm">activate a form or not</param>
  private static SetFocus_1(itask: ITask, ctrl: MgControlBase, line: number, activateForm: boolean): void {
    let task: TaskBase = <TaskBase>itask;
    if (task.isAborting())
      return;

    Events.OnCtrlFocus(itask, ctrl);

    if (ctrl !== null) {
      if (!ctrl.isParkable(true, false))
        return;
      Commands.addBoolWithLine(CommandType.SET_FOCUS, ctrl, (line >= 0) ? line : ctrl.getDisplayLine(false), activateForm);
    }
    else {
      let formObject: any = task.IsSubForm
        ? task.getForm().getSubFormCtrl()
        : task.getForm();

      Commands.addBoolWithLine(CommandType.SET_FOCUS, formObject, 0, activateForm);
    }
  }

  /// <summary>
  ///   check if a character at the given position is a mask char or not.
  /// </summary>
  /// <param name = "pic"></param>
  /// <param name = "strText"></param>
  /// <param name = "pos"></param>
  /// <returns> true if the character is mask char</returns>
  private static charIsMask(pic: PIC, strText: string, pos: number): boolean {
    if (pic.isAttrAlphaOrDate()) {
      if (pic.picIsMask(UtilStrByteMode.convPos(strText, pic.getMask(), pos, false)))
        return true;
    }
    else if (pic.picIsMask(pos))
      return true;

    return false;
  }

  /// <summary>
  ///   select all the text in the control, but do it immediately using guiInteractive (not the queue).
  /// </summary>
  /// <param name = "ctrl"> </param>
  static SetSelect(ctrl: MgControlBase): void {
    if (ctrl.isTextControl()) {
      // if the control is modifiable, select the whole text in the control,
      // otherwise, unselect all.
      if (ctrl.isModifiable()) {
        let pic: PIC = ctrl.getPIC();
        if ((UtilStrByteMode.isLocaleDefLangJPN() && !pic.isAttrBlob() && pic.getMaskChars() > 0 && !ctrl.isMultiline()) ||
          (pic.isAttrDateOrTime() && ctrl.isAllBlanks(ctrl.Value))) {
          let strText: string = ctrl.Value;
          let startPos: number = 0;
          let endPos: number = strText.length;

          while (startPos < endPos) {
            if (strText.charAt(startPos) === ' ')
              break;
            else {
              if (!Manager.charIsMask(pic, strText, startPos))
                break;
            }
            startPos++;
          }

          while (startPos < endPos) {
            if (strText.charAt(endPos - 1) !== ' ') {
              if (!Manager.charIsMask(pic, strText, endPos - 1))
                break;
            }
            endPos = endPos - 1;
          }

          Manager.SetSelection(ctrl, 0, 0, 0); // Cancel the selection to prevent the caret moving to the end of the field.
          if (endPos !== 0)
            Manager.SetSelection(ctrl, startPos, endPos, 0);
        }
        else
          Manager.SetSelection(ctrl, 0, -1, -1);
      }
      else
        Manager.SetSelection(ctrl, 0, 0, 0);
    }
  }

  /// <summary>
  ///   unSelect the text in the control
  /// </summary>
  /// <param name = "ctrl">the destination control </param>
  static SetUnselect(ctrl: MgControlBase): void {
    if (ctrl.isTextControl())
      Commands.addAsync(CommandType.SELECT_TEXT, ctrl, ctrl.getDisplayLine(true),
        <number>MarkMode.UNMARK_ALL_TEXT, 0, 0);
  }

  /// <summary>
  ///   return the selection on the control
  /// </summary>
  /// <param name = "ctrl"> </param>
  /// <returns> </returns>
  static SelectionGet(ctrl: MgControlBase): MgPoint {
    let point: MgPoint = new MgPoint(0, 0);

    if (ctrl !== null && ctrl.isTextControl())
      Commands.selectionGet(ctrl, ctrl.getDisplayLine(true), point);

    return point;
  }

  /// <summary> Open the form. </summary>
  /// <param name="mgForm">form to be opened.</param>
  static OpenForm(mgForm: MgFormBase): void {
    // non interactive can choose not to open the window.
    if (!mgForm.Opened && (mgForm.getTask().IsInteractive || mgForm.getTask().isOpenWin())) {
      if (!mgForm.isSubForm()) {
        // if the form is to be opened as a modal, then increment the modal count on its frame window.
        if (mgForm.isDialog()) {
          let topMostFrameForm: MgFormBase = mgForm.getTopMostFrameForm();
          if (topMostFrameForm !== null)
            topMostFrameForm.UpdateModalFormsCount(mgForm, true);
        }

        if (mgForm.ParentForm !== null)
          mgForm.ParentForm.ApplyChildWindowPlacement(mgForm);

        Commands.addAsync(CommandType.INITIAL_FORM_LAYOUT, mgForm, mgForm.isDialog(), mgForm.Name);
        Manager.ApplyformUserState(mgForm);
      }
      else {
        // layout for subform already was resumend
        if (!mgForm.getTask().ShouldResumeSubformLayout)
          Manager.ApplyformUserState(mgForm);
      }

      // if (!mgForm.isSubForm()) {
      //   let formName: string = mgForm.UniqueName;
      //   UIBridge.getInstance().OpenForm(formName);
      //   //Commands.addAsync(CommandType.SHOW_FORM, mgForm, mgForm.isDialog(), false, mgForm.Name);
      // }
      // else {
      //   let inputControls = mgForm.GetListOfInputControls();
      // //   Commands.addAsync(CommandType.CREATE_SUB_FORM, this.getSubFormCtrl(), _task.getTaskTag(), this.getSubFormCtrl().getName(),
      // //     getProp(PropInterface.PROP_TYPE_FORM_NAME).getValue(), inputControls);
      // //
      // //   JSBridge.Instance.OpenSubForm(this.getSubFormCtrl().getName(), ParentForm.getTask().getTaskTag(), getProp(PropInterface.PROP_TYPE_FORM_NAME).getValue(), _task.getTaskTag(), inputControls);
      // // }
      // }

      mgForm.Opened = true;

      Commands.beginInvoke();
    }
  }

  static ApplyformUserState(mgForm: MgFormBase): void {
  }

  /// <summary> Performs first refresh for the table control </summary>
  static DoFirstRefreshTable(mgForm: MgFormBase): void {
    if (mgForm !== null && !mgForm.ignoreFirstRefreshTable) {
      mgForm.ignoreFirstRefreshTable = true;
      mgForm.firstTableRefresh();
    }
  }

  /// <summary>
  ///   retrieve the location of the caret, within the currently selected text
  /// </summary>
  /// <param name = "ctrl">the control which is assumed to contain the selected text </param>
  static CaretPosGet(ctrl: MgControlBase): number {
    let caretPos: number = 0;

    if (ctrl.isTextControl())
      caretPos = Commands.caretPosGet(ctrl, ctrl.getDisplayLine(true));

    return caretPos;
  }

  /// <summary>
  /// Clear the status bar depending on the control specific status message or form specific status message
  /// </summary>
  /// <param name="task">task</param>
  static ClearStatusBar(task: TaskBase): void {
    let currentParkedControl: MgControlBase = task.getLastParkedCtrl();

    if (currentParkedControl !== null && !NString.IsNullOrEmpty(currentParkedControl.PromptHelp))
      Manager.WriteToMessagePane(task, currentParkedControl.PromptHelp, false);
    else
      Manager.CleanMessagePane(task);
  }

  /// <summary>
  ///   clean the status bar
  /// </summary>
  /// <param name = "task"></param>
  static CleanMessagePane(task: TaskBase): void {
    Manager.WriteToMessagePane(task, Manager.GetCurrentRuntimeContext().DefaultStatusMsg, false);
  }

  /// <summary>
  ///   write a message to status bar
  /// </summary>
  /// <param name = "task"></param>
  /// <param name = "msgId">id of message to be written</param>
  /// <param name="soundBeep"></param>
  static WriteToMessagePanebyMsgId(task: TaskBase, msgId: string, soundBeep: boolean): void {
    let msg: string = Events.GetMessageString(msgId);
    Manager.WriteToMessagePane(task, msg, soundBeep);
  }

  /// <summary>
  ///   Message string to be displayed on status bar or in Message box
  /// </summary>
  /// <param name = "msg"> input message string </param>
  /// <returns> output message string </returns>
  static GetMessage(msg: string): string {
    if (msg === null)
      msg = "";
    else if (msg.length > 0) {
      let idxOfCarriage: number = msg.indexOf("\r");
      if (idxOfCarriage !== -1)
        msg = msg.substr(0, idxOfCarriage);

      let idxOfNewLine: number = msg.indexOf("\n");
      if (idxOfNewLine !== -1)
        msg = msg.substr(0, idxOfNewLine);
    }

    return msg;
  }

  /// <summary> Sets the message on the message pane of status bar.</summary>
  /// <param name="task">task</param>
  /// <param name="msg">message to be shown</param>
  /// <param name="soundBeep">to beep or not</param>
  static WriteToMessagePane(task: TaskBase, msg: string, soundBeep: boolean): void {
   // Story 149316 : send message to console
    if (msg != null) {
      console.log(msg);
      // task.getForm().UpdateStatusBar(Constants.SB_MSG_PANE_LAYER, msg, soundBeep);
      if (!task.isStarted())
        task.setSaveStatusText(msg);
    }
  }

  /// <param name = "val"></param>
  /// <returns> </returns>
  static ClipboardAdd(val: string): boolean {
    if (val === null)
      return true;

    if (Manager._clipboardData === null)
      Manager._clipboardData = "";

    Manager._clipboardData = Manager._clipboardData + val;
    return true;
  }

  static ClipboardWrite(currTask: TaskBase): boolean;
  static ClipboardWrite(ctrl: MgControlBase, clipData: string): boolean;
  static ClipboardWrite(currTaskOrCtrl: any, clipData?: string): any {
    if (arguments.length === 1 && (currTaskOrCtrl === null || currTaskOrCtrl instanceof TaskBase)) {
      return Manager.ClipboardWrite_0(currTaskOrCtrl);
    }
    return Manager.ClipboardWrite_1(currTaskOrCtrl, clipData);
  }

  /// <summary>
  /// </summary>
  /// <param name = "currTask"> </param>
  /// <returns> </returns>
  private static ClipboardWrite_0(currTask: TaskBase): boolean {
    // set a String to the clip.
    Manager.ClipboardWrite(null, Manager._clipboardData);
    if (currTask.getLastParkedCtrl() !== null)
      currTask.ActionManager.checkPasteEnable(currTask.getLastParkedCtrl());
    return true;
  }

  /// <summary>
  ///   write the clipData string to the clipboard
  ///   if ctrl was passed, use it : copy will be done from selected area on the control to the clip.
  ///   if a String was passed, set it to the clipboard.
  /// </summary>
  /// <param name = "ctrl"> </param>
  /// <param name = "clipData"> </param>
  private static ClipboardWrite_1(ctrl: MgControlBase, clipData: string): void {
    // both null, do nothing.
    if (ctrl === null && NString.IsNullOrEmpty(clipData))
      return;

    // set currRow in any case.
    let currRow: number = (ctrl === null)
      ? 0
      : ctrl.getDisplayLine(true);

    Commands.clipboardWrite(ctrl, currRow, clipData);
    Manager._clipboardData = "";
  }

  /// <summary>
  ///   return the content of the clipboard
  /// </summary>
  /// <returns> </returns>
  static ClipboardRead(): string {
    return Commands.clipboardRead();
  }

  /// <summary>
  ///   Used to put the text on a text control
  /// </summary>
  /// <param name = "ctrl"> </param>
  /// <param name = "text"> </param>
  static SetEditText(ctrl: MgControlBase, text: string): void {
    Commands.setEditText(ctrl, ctrl.getDisplayLine(true), text);
  }

  /// <summary>
  /// Insert text to a text control at a given position
  /// </summary>
  /// <param name="ctrl"></param>
  /// <param name="startPosition"></param>
  /// <param name="textToInsert"></param>
  static InsertEditText(ctrl: MgControlBase, startPosition: number, textToInsert: string): void {
    Commands.insertEditText(ctrl, ctrl.getDisplayLine(true), startPosition, textToInsert);
  }

  /// <summary>
  ///   return TooltipTimeout
  /// </summary>
  /// <returns> returns TooltipTimeout</returns>
  static GetTooltipTimeout(): number {
    return Manager.Environment.GetTooltipTimeout();
  }

  /// <summary>
  /// return SpecialEditLeftAlign
  /// </summary>
  /// <returns></returns>
  static GetSpecialEditLeftAlign(): boolean {
    return Manager.Environment.GetSpecialEditLeftAlign();
  }

  /// <summary>
  ///   Returns default date format depending on date mode and date separator.
  /// </summary>
  /// <returns> String default date format</returns>
  static GetDefaultDateFormat(): string {
    let dateFormat: string = "";
    let dateSeperator: string = Manager.Environment.GetDate();

    // Arrange date format according to the date mode.
    switch (Manager.Environment.GetDateMode(0)) {
      case 'S': // Scandinavian
        dateFormat = "YYYY" + dateSeperator + "MM" + dateSeperator + "DD";
        break;

      case 'B': // Buddhist

      case 'E': // European
        dateFormat = "DD" + dateSeperator + "MM" + dateSeperator + "YYYY";
        break;

      case 'A': // American
        dateFormat = "MM" + dateSeperator + "DD" + dateSeperator + "YYYY";
        break;
    }
    return dateFormat;
  }

  /// <summary>
  ///   Return default time format using time separator.
  /// </summary>
  /// <returns></returns>
  static GetDefaultTimeFormat(): string {
    let timeSeperator: string = Manager.Environment.GetTime();
    let timeFormat: string = "HH" + timeSeperator + "MM" + timeSeperator + "SS";
    return timeFormat;
  }

  /// <summary>
  /// Gets the runtime context belongs to the current thread.
  /// </summary>
  /// <returns>RuntimeContextBase</returns>
  static GetCurrentRuntimeContext(): RuntimeContextBase {
    return Events.GetRuntimeContext(Manager.GetCurrentContextID());
  }

  /// <summary>
  /// Gets the contextID using the GuiMgForm.
  /// </summary>
  /// <param name="mgObject">Magic Object - GuiMgForm/GuiMgControl/Logical control</param>
  /// <returns>contextID</returns>
  static GetContextID(mgObject: any): number {
    let guiMgForm: GuiMgForm = null;

    if (mgObject instanceof GuiMgControl)
      guiMgForm = (<GuiMgControl>mgObject).GuiMgForm;
    else if (mgObject instanceof GuiMgForm)
      guiMgForm = <GuiMgForm>mgObject;

    return Events.GetContextID(guiMgForm);
  }

  /// <summary>
  /// Activates a next or previous MDI child
  /// </summary>
  /// <param name="nextWindow">indicates whether to activate next window or not</param>
  static ActivateNextOrPreviousMDIChild(nextWindow: boolean): void {
    Commands.ActivateNextOrPreviousMDIChild(nextWindow);
  }

  /// <summary>
  ///   Put commands to Gui thread :
  ///         - PERFORM_DRAGDROP : To initiate the Drag by calling DoDragDrop.
  /// </summary>
  /// <param name="ctrl">Control for which drag operation started</param>
  /// <param name="lineNo">line no on which control resides</param>
  /// <returns></returns>
  static BeginDrag(ctrl: MgControlBase, mgForm: MgFormBase, lineNo: number): void {
    Commands.addAsync(CommandType.PERFORM_DRAGDROP, ctrl, lineNo, mgForm);
    Commands.beginInvoke();
  }

  /// <summary>
  ///   Put SETDATA_FOR_DRAG, to set currently selected text as a draggedData
  /// </summary>
  /// <param name="ctrl">Control for which drag operation started</param>
  /// <param name="lineNo">line no on which control resides</param>
  static DragSetData(ctrl: MgControlBase, lineNo: number): void {
    Commands.addAsync(CommandType.SETDATA_FOR_DRAG, ctrl, lineNo, "", 0);
    Commands.beginInvoke();
  }

  /// <summary>
  /// Creates a ToolStripMenuItem for menuEntry.
  /// </summary>
  /// <param name="menuReference"></param>
  /// <param name="windowMenuEntry"></param>
  /// <param name="mgForm"></param>
  /// <param name="menuStyle"></param>
  /// <param name="index"></param>
  static CreateMenuItem(menuReference: MenuReference, menuEntry: GuiMenuEntry, mgForm: GuiMgForm, menuStyle: MenuStyle, index: number): void {
    GuiCommandQueue.getInstance().createMenuItem(menuEntry, menuReference, menuStyle, true, index, mgForm);
  }

  /// <summary>
  ///  Delete a ToolStripMenuItem.
  /// </summary>
  /// <param name="menuReference"></param>
  static DeleteMenuItem(menuReference: MenuReference): void {
  }

  /// <summary>
  /// Shows windows help.
  /// </summary>
  /// <param name="filePath">path of the help file.</param>
  /// <param name="helpCmd">help command.</param>
  /// <param name="helpKey">search key word.</param>
  static ShowWindowHelp(filePath: string, helpCmd: HelpCommand, helpKey: string): void {
  }
}

/// <summary>
/// helper class for setting/resetting the current context ID.
/// We require this class specifically for Modal windows. When we open a modal window then
/// it waits in GuiThread. Mean while GuiThread can receive the events of other context and
/// after processing these events, we should reset the contextID of the Modal windows because
/// it will be used for logging the events when we close the modal window.
/// </summary>
export class ContextIDGuard {
  private _prevContextID: string = '\0';

  // For debugging purpose only.
  // It will hold the file name from which the object of ContextIDGuard is created.
  private _fileName: string = null;

  constructor();
  constructor(contextID: string);
  constructor(contextID?: string) {
    if (arguments.length === 0) {
      this.constructor_0();
      return;
    }
    this.constructor_1(contextID);
  }

  private constructor_0(): void {
    this._prevContextID = Manager.GetCurrentContextID();
    this.SaveFilename();
  }

  private constructor_1(contextID: string): void {
    this.SetCurrent(contextID);
    this.SaveFilename();
  }

  /// <summary>
  /// sets the context ID to 'guard'.
  /// </summary>
  /// <param name="contextID">new context ID to 'guard'.</param>
  SetCurrent(contextID: string): void {
    if (contextID !== this._prevContextID) {
      this._prevContextID = contextID;
      Manager.SetCurrentContextID(contextID);
    }
  }

  /// <summary>
  /// Get the file name from which the ContextIDGuard is being created.
  /// </summary>
  private SaveFilename(): void {
    let stackFrame: StackFrame = new StackFrame(1, true);
    this._fileName = stackFrame.GetFileName();
  }

  public Dispose(): void {
    if (this._prevContextID !== Manager.GetCurrentContextID())
      Manager.SetCurrentContextID(this._prevContextID);
  }
}
