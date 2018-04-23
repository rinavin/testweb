import {ClipFormats, MgCursors} from "../../GuiEnums";
import {ContextIDGuard, Manager} from "../../Manager";
import {GuiMgControl} from "../GuiMgControl";
import {MgValue} from "../MgValue";
import {MgPoint, MgPointF} from "../../util/MgPoint";
import {GuiMgForm} from "../GuiMgForm";
import {MgRectangle} from "../../util/MgRectangle";
import {MgFormBase} from "../../management/gui/MgFormBase";
import {DialogHandler} from "./DialogHandler";
import {Events} from "../../Events";
import {Exception, List, RefParam} from "@magic/mscorelib";
import {MenuReference} from "./MenuReference";
import {UIBridge} from "../../UIBridge";
import {ControlBase} from "../ControlBase";
import {GuiCommandQueue} from "./GuiCommandQueue";

export enum InteractiveCommandType {
  GET_FONT_METRICS,
  GET_RESOLUTION,
  GET_BOUNDS,
  GET_VALUE,
  SET_BROWSER_TEXT,
  GET_BROWSER_TEXT,
  BROWSER_EXECUTE,
  GET_TOP_INDEX,
  MESSAGE_BOX,
  DIRECTORY_DIALOG_BOX,
  GET_CLIENT_BOUNDS,
  SET_EDIT_TEXT,
  INSERT_EDIT_TEXT,
  SET_SELECTION,
  GET_SELECTION,
  GET_CARET_POS,
  GET_IS_TOP_OF_TEXTBOX,
  GET_IS_END_OF_TEXTBOX,
  CLIPBOARD_GET_CONTENT,
  CLIPBOARD_SET_CONTENT,
  CLIPBOARD_PASTE,
  POST_KEY_EVENT,
  POST_CHAR_EVENT,
  SET_CURSOR,
  DISPOSE_ALL_FORMS,
  GET_ROWS_IN_PAGE,
  GET_HIDDEN_ROWS_COUNT_IN_TABLE,
  FILE_OPEN_DIALOG_BOX,
  FILE_SAVE_DIALOG_BOX,
  CREATE_DIALOG,
  OPEN_DIALOG,
  CLOSE_DIALOG,
  SET_GET_SUGGESTED_VALUE_FOR_CHOICE_CONTROL_ON_TAGDATA,
  REFLECTION_INVOKE,
  REFLECTION_SET,
  GET_LAST_WINDOW_STATE,
  GET_FRAMES_BOUNDS,
  GET_LINKED_PARENT_IDX,
  GET_FORM_BOUNDS,
  GET_COLUMNS_STATE,
  GET_FORM_HANDLE,
  GET_CTRL_HANDLE,
  IS_FORM_ACTIVE,
  GET_DROPPED_DATA,
  GET_DROPPED_POINT,
  GET_DROPPED_SELECTION,
  DROP_FORMAT_SUPPORTED,
  GET_IS_BEGIN_DRAG,
  SET_MARKED_TEXT_ON_RICH_EDIT,
  ACTIVATE_NEXT_OR_PREVIOUS_MDI_CHILD,
  SEND_IME_MSG,
  CAN_FOCUS,
  INVOKE_OSCOMMAND,
  GET_SELECTED_INDICE,
  SET_SUGGESTED_VALUE,
  MAP_WIDGET_TO_GUI_OBJECT,
  REMOVE_DN_CONTROL_VALUE_CHANGED_HANDLER,
  ADD_DN_CONTROL_VALUE_CHANGED_HANDLER,
  GET_RTF_VALUE_BEFORE_ENTERING_CONTROL,
  ATTACH_DNKEY_TO_OBJECT,
  GET_MDI_CHILD_COUNT,
  GET_DVCONTROL_POSITION_ISN,
  CLEAR_DATA_TABLE,
  SET_DATA_SOURCE_TO_DVCONTROL,
  ACTIVATE_FORM,
  ENABLE_MENU_ENTRY,
  SHOW_CONTEXT_MENU,
  IS_COMBO_DROPPED_DOWN,
  OPEN_FORM_DESIGNER,
  INVOKE_UDPCOMMAND,
  GET_HASINDENT
}

/// <summary> GuiUtils class provides methods for retrieving information from the GUI layer</summary>
export  abstract class GuiInteractiveBase {
   _commandType: InteractiveCommandType = 0;
  TaskTag: string = null;
   controlName: string = null;

   _x: number = 0;
   _y: number = 0;
   _char: string = null;
   _str: string = String.fromCharCode(0);
   _intVal1: number = 0;
  _line: number = 0;
   _obj1: any = null;
   _parameters: any[] = null;
  _boolVal: boolean = false;
  _obj2: any = null;
  _mgValue: MgValue = null;
  _setValue: boolean = false;
  _contextID: string = '\0';

  private static lockObject: any = null;


  /// <summary>
  /// Constructor : sets the contextID for the current command.
  /// </summary>
  constructor() {
    this._contextID = Manager.GetCurrentContextID();
  }

  /// <summary> Returns whether control is focusable or not. </summary>
  /// <param name="guiMgControl"> the control which needs to be checked. </param>
  /// <returns></returns>
  canFocus(guiMgControl: GuiMgControl): boolean {
    this._commandType = InteractiveCommandType.CAN_FOCUS;
    this._obj1 = guiMgControl;

    this._mgValue = new MgValue();

    this.Invoke();

    return this._mgValue.boolVal;
  }

  /// <summary> /// Returns the comma separated string for selected indice of list control./// </summary>
  /// <param name="guiMgControl"></param>
  /// <returns>comma separated string for selected indice of list control</returns>
  GetSelectedIndice(guiMgControl: GuiMgControl): string {
    this._commandType = InteractiveCommandType.GET_SELECTED_INDICE;
    this._obj1 = guiMgControl;

    this._mgValue = new MgValue();

    this.Invoke();

    return this._mgValue.str;
  }

  /// <summary>
  /// Returns whether the indent has been applied to Rich Edit
  /// </summary>
  /// <param name="guiMgControl"></param>
  /// <returns></returns>
  GetHasIndent(guiMgControl: GuiMgControl): boolean {
    this._commandType = InteractiveCommandType.GET_HASINDENT;
    this._obj1 = guiMgControl;
    this.Invoke();
    return this._boolVal;
  }

/// <summary> Gets the resolution of the control. </summary>
  /// <param name="obj"></param>
  /// <returns></returns>
  getResolution(obj: any): MgPoint {
    this._commandType = InteractiveCommandType.GET_RESOLUTION;
    this._obj1 = obj;
    this.Invoke();

    return new MgPoint(this._x, this._y);
  }

  /// <summary> getBounds() get the bounds of the object</summary>
  /// <param name="object">a reference to the relevant object</param>
  /// <param name="rect">a reference to the object that on return will contain the requested values</param>
  getBounds(obj: any, rect: MgRectangle): void {
    // _commandType = CommandType.GET_BOUNDS;
    // _obj2 = obj;
    // Invoke();
    // rect.x = _rect.X;
    // rect.y = _rect.Y;
    // rect.width = _rect.Width;
    // rect.height = _rect.Height;
  }

/// <summary>Functions returns the handle of the form.
  /// </summary>
  /// <param name="mgForm">Object of the magic form whose window handle is required.</param>
  /// <returns>handle of the form. </returns>
  getFormHandle(guiMgForm: GuiMgForm): number {
    this._commandType = InteractiveCommandType.GET_FORM_HANDLE;
    this._obj2 = guiMgForm;
    this.Invoke();

    return this._intVal1;
  }

  /// <summary>Functions returns the handle of the control.
  /// </summary>
  /// <param name="mgControl">Object of the magic control whose window handle is required.</param>
  /// <returns>handle of the control</returns>
  getCtrlHandle(guiMgControl: GuiMgControl, line: number): number {
    this._commandType = InteractiveCommandType.GET_CTRL_HANDLE;
    this._obj2 = guiMgControl;
    this._line = line;
    this.Invoke();

    return this._intVal1;
  }

  /// <summary>set cursor according to cursor shape</summary>
  /// <param name="shape"></param>
  /// <returns></returns>
  setCursor(shape: MgCursors): boolean {
    this._commandType = InteractiveCommandType.SET_CURSOR;
    this._intVal1 = <number>shape;
    this._mgValue = new MgValue();
    this.Invoke();

    return this._mgValue.boolVal;
  }

  /// <summary>
  /// This methode is set TRUE\FALSE that GuiUtiles\GetValue() method will be use
  /// this falg say if to return the : (true) suggested value or (false)the real value
  /// this method is use for MG_ACT_CTRL_MODIFY
  /// </summary>
  /// <param name="ctrl"></param>
  /// <param name="retSuggestedValue"></param>
  setGetSuggestedValueOfChoiceControlOnTagData(ctrl: GuiMgControl, line: number, retSuggestedValue: boolean): void {
    this._commandType = InteractiveCommandType.SET_GET_SUGGESTED_VALUE_FOR_CHOICE_CONTROL_ON_TAGDATA;
    this._obj2 = ctrl;
    this._line = line;
    this._boolVal = retSuggestedValue;
    this.Invoke();
  }

  /// <summary> getClientBounds() get the client bounds of the object</summary>
  /// <param name="object">a reference to the relevant object</param>
  /// <param name="rect">a reference to the object that on return will contain the requested values</param>
  getClientBounds(obj: any, rect: MgRectangle, clientPanelOnly: boolean): void;
  getClientBounds(): void;
  getClientBounds(obj?: any, rect?: MgRectangle, clientPanelOnly?: boolean): void {
    if (arguments.length === 3)
      this.getClientBounds_0(obj, rect, clientPanelOnly);
    else
      this.getClientBounds_1();
  }

  private getClientBounds_0(obj: any, rect: MgRectangle, clientPanelOnly: boolean): void {
  }


  /// <summary> getBounds() get the bounds of the object</summary>
  /// <param name="rect">a reference to the object that on return will contain the requested values</param>
  /// <param name="form"> form</param>
  getDesktopBounds(rect: MgRectangle, form: any): void {
  }

  /// <summary> Get value of the control</summary>
  /// <param name="object">a reference to the relevant object</param>
  /// <param name="rect">a reference to the object that on return will contain the requested values on string</param>
  getValue(obj: any, line: number): string {
    this._commandType = InteractiveCommandType.GET_VALUE;
    this._obj2 = obj;

    this._line = line;
    this._mgValue = new MgValue();
    this.Invoke();
    return this._mgValue.obj;
  }

  /// <summary> </summary>
  setBrowserText(browserControl: GuiMgControl, text: string): boolean {
    this._commandType = InteractiveCommandType.SET_BROWSER_TEXT;
    this._obj2 = browserControl;
    this._mgValue = new MgValue();
    this._mgValue.str = text;
    this.Invoke();
    return this._mgValue.boolVal;
  }

  /// <summary> </summary>
  getBrowserText(browserControl: GuiMgControl): string {
    this._commandType = InteractiveCommandType.GET_BROWSER_TEXT;
    this._obj2 = browserControl;
    this._mgValue = new MgValue();
    this.Invoke();
    return this._mgValue.str;
  }

  getTopIndex(tablecontrol: GuiMgControl): number {
    this._commandType = InteractiveCommandType.GET_TOP_INDEX;
    this._obj2 = tablecontrol;
    this.Invoke();
    return this._intVal1;
  }

  browserExecute(browserControl: GuiMgControl, text: string, syncExec: boolean, language: string): boolean {
    this._commandType = InteractiveCommandType.BROWSER_EXECUTE;
    this._obj2 = browserControl;
    this._mgValue = new MgValue();
    this._mgValue.str = text;
    this._mgValue.obj = language;

    // For async execution, return true if the command is passed to the gui thread.
    // For sync execution, return true if the command was executed by the gui thread.
    if (syncExec) {
      this.Invoke();
      return this._mgValue.boolVal;
    }
    else {
      return true;
    }
  }

  /// <summary>Open message box with parent form</summary>
  /// <param name="obj">the parent form of the message box</param>
  /// <param name="title"></param>
  /// <param name="msg"></param>
  /// <param name="style">the style of the message box can be flags of Styles.MSGBOX_xxx </param>
  /// <returns> message box style from Styles.MSGBOX_XXX</returns>
  messageBox(topMostForm: GuiMgForm, title: string, msg: string, style: number): number {
    this._commandType = InteractiveCommandType.MESSAGE_BOX;
    this._mgValue = new MgValue();
    this._obj2 = topMostForm;
    this._mgValue.title = title;
    this._mgValue.str = ((msg === null) ? "" : msg);
    this._mgValue.style = style;
    Events.RefreshTables();
    this.Invoke();
    return this._mgValue.number;
  }

  ///<summary>
  /// Handles Invoke UDP operation from GUI thread
  ///</summary>
  ///<param name="contextId">Context id</param>
  invokeUDP(contextId: number): number {
    this._commandType = InteractiveCommandType.INVOKE_UDPCOMMAND;
    this._mgValue = new MgValue();
    this._mgValue.obj = contextId;
    this.Invoke();
    return this._mgValue.number;
  }

  /// <param name="caption">description for the dialog window</param>
  /// <param name="path">initial path to browse</param>
  /// <param name="bShowNewFolder">should show the new folder button?</param>
  /// <returns> directory path selected by user</returns>
  directoryDialogBox(caption: string, path: string, bShowNewFolder: boolean): string {
    this._commandType = InteractiveCommandType.DIRECTORY_DIALOG_BOX;

    this._mgValue = new MgValue();
    this._mgValue.caption = caption;
    this._mgValue.path = path;
    this._mgValue.bool1 = bShowNewFolder;

    this.Invoke();
    return this._mgValue.str;
  }

  /// <summary>
  /// File Open Dialog Box
  /// </summary>
  /// <param name="title">Dialog window caption</param>
  /// <param name="initDir">Initial directory</param>
  /// <param name="filterNames">filter string</param>
  /// <param name="checkExists">verify opened file exists</param>
  /// <param name="multiSelect">enable selecting multiple files</param>
  /// <returns>file path selected by user</returns>
  fileOpenDialogBox(title: string, dirName: string, fileName: string, filterNames: string, checkExists: boolean, multiSelect: boolean): string {
    this._commandType = InteractiveCommandType.FILE_OPEN_DIALOG_BOX;

    this._mgValue = new MgValue();
    this._mgValue.title = title;
    this._mgValue.path = dirName;
    this._mgValue.str = fileName;
    this._mgValue.filter = filterNames;
    this._mgValue.boolVal = checkExists;
    this._mgValue.bool1 = multiSelect;

    this.Invoke();
    return this._mgValue.str;
  }

  /// <summary>
  /// File Save Dialog Box
  /// </summary>
  /// <param name="title">caption of the dialog window</param>
  /// <param name="initDir"> initial directory</param>
  /// <param name="filterNames">filter string</param>
  /// <param name="defaultExtension"> default extension for file name</param>
  /// <param name="overwritePrompt"> should prompt when overwriting an existing file?</param>
  /// <param name="retFile"></param>
  /// <returns>file path selected by user</returns>
  fileSaveDialogBox(title: string, dirName: string, fileName: string, filterNames: string, defaultExtension: string, overwritePrompt: boolean): string {
    this._commandType = InteractiveCommandType.FILE_SAVE_DIALOG_BOX;

    this._mgValue = new MgValue();
    this._mgValue.title = title;
    this._mgValue.path = dirName;
    this._mgValue.str = fileName;
    this._mgValue.filter = filterNames;
    this._mgValue.caption = defaultExtension;
    this._mgValue.bool1 = overwritePrompt;

    this.Invoke();
    return this._mgValue.str;
  }

  /// <summary>Put Command to create dialog</summary>
  /// <param name="handle">reference to the dialog handlers</param>
  /// <param name="objType">parameters to be passed to objects constructor</param>
  /// <param name="parameters"></param>
  createDialog(handle: DialogHandler, parameters: any[]): void {
    this._commandType = InteractiveCommandType.CREATE_DIALOG;
    this._parameters = parameters;
    this._obj2 = handle;
    this.Invoke();
  }

  /// <summary>Put Command to close dialog</summary>
  /// <param name="dialog"></param>
  closeDialog(handle: DialogHandler): void {
    this._commandType = InteractiveCommandType.CLOSE_DIALOG;
    this._obj2 = handle;

    this.Invoke();
  }

  /// <summary> set the text to the the control
  ///
  /// </summary>
  /// <param name="control"></param>
  /// <param name="line"></param>
  /// <param name="text"></param>
  setEditText(control: GuiMgControl, line: number, text: string): boolean {
    this._commandType = InteractiveCommandType.SET_EDIT_TEXT;
    this._obj2 = control;
    this._line = line;
    this._mgValue = new MgValue();
    this._mgValue.str = text;

    this.Invoke();

    return this._mgValue.boolVal;
  }

  /// <summary> insert the text to the the control at the given position
  ///
  /// </summary>
  /// <param name="control"></param>
  /// <param name="line"></param>
  /// <param name="text"></param>
  insertEditText(control: GuiMgControl, line: number, startPosition: number, textToInsert: string): boolean {
    this._commandType = InteractiveCommandType.INSERT_EDIT_TEXT;
    this._obj2 = control;
    this._line = line;
    this._mgValue = new MgValue();
    this._mgValue.str = textToInsert;
    this._intVal1 = startPosition;

    this.Invoke();

    return this._mgValue.boolVal;
  }

/// <summary> set the text to the the control</summary>
  /// <param name="control"></param>
  /// <param name="line"></param>
  /// <param name="text"></param>
  setSelection(control: GuiMgControl, line: number, start: number, end: number, caretPos: number): void {
    this._commandType = InteractiveCommandType.SET_SELECTION;
    this._obj2 = control;
    this._line = line;
    this._x = start;
    this._y = end;
    this._mgValue = new MgValue();
    this._mgValue.number = caretPos;

    this.Invoke();
  }

  /// <summary> set the text to the the control</summary>
  /// <param name="control"></param>
  /// <param name="line"></param>
  /// <param name="text"></param>
  setSuggestedValue(control: GuiMgControl, suggestedValue: string): void {
    this._commandType = InteractiveCommandType.SET_SUGGESTED_VALUE;
    this._obj2 = control;
    this._mgValue = new MgValue();
    this._mgValue.str = suggestedValue;

    this.Invoke();
  }

  /// <summary>
  /// get the position of the caret on the control
  /// </summary>
  /// <param name="control"></param>
  /// <param name="line"></param>
  caretPosGet(control: GuiMgControl, line: number): number {
    this._commandType = InteractiveCommandType.GET_CARET_POS;
    this._obj2 = control;
    this._line = line;

    this._mgValue = new MgValue();
    this.Invoke();

    return this._mgValue.number;
  }

  /// <summary>
  /// check if the Carel is Positioned on the first line in TextBox.</summary>
  /// <param name="control"></param>
  /// <param name="line"></param>
  getIsTopOfTextBox(control: GuiMgControl, line: number): boolean {
    this._commandType = InteractiveCommandType.GET_IS_TOP_OF_TEXTBOX;
    this._obj2 = control;
    this._line = line;

    this.Invoke();
    return this._boolVal;
  }

  /// <summary>
  /// check if the Carel is Positioned on the last line in TextBox.</summary>
  /// <param name="control"></param>
  /// <param name="line"></param>
  getIsEndOfTextBox(control: GuiMgControl, line: number): boolean {
    this._commandType = InteractiveCommandType.GET_IS_END_OF_TEXTBOX;
    this._obj2 = control;
    this._line = line;

    this.Invoke();

    return this._boolVal;
  }

  /// <summary>
  /// get the selection on the given control</summary>
  /// <param name="control"></param>
  /// <param name="line"></param>
  /// <param name="point"></param>
  selectionGet(control: GuiMgControl, line: number, point: MgPoint): void {
    this._commandType = InteractiveCommandType.GET_SELECTION;
    this._obj2 = control;
    this._line = line;

    this.Invoke();
    point.x = this._x;
    point.y = this._y;
  }

  /// <summary>
  /// Write a string to the clipboard. The clip get get the data either from a control or from the passed string in _mgValue.
  /// </summary>
  /// <param name="_mgValue">has the string to set to the clipboard</param>
  clipboardWrite(control: GuiMgControl, line: number, clipData: string): void {
    this._commandType = InteractiveCommandType.CLIPBOARD_SET_CONTENT;
    this._str = clipData;
    this._obj2 = control;
    this._line = line;

    try {
      this.Invoke();
    }
    catch (ex) {
      Events.WriteExceptionToLog("clipboardWrite: " + ex.Message);
    }
  }

  /// <summary>
  /// read from the clipboard to a string
  /// </summary>
  /// <returns> the string from the clipboard</returns>
  clipboardRead(): string {
    this._commandType = InteractiveCommandType.CLIPBOARD_GET_CONTENT;
    this._mgValue = new MgValue();

    try {
      this.Invoke();
    }
    catch (ex) {
      Events.WriteExceptionToLog("clipboardRead: " + ex.Message);
    }
    return this._mgValue.str;
  }

  /// <summary>
  /// paste from clipboard to the control.
  /// </summary>
  /// <param name="control"></param>
  /// <param name="line"></param>
  clipboardPaste(control: GuiMgControl, line: number): void {
    this._commandType = InteractiveCommandType.CLIPBOARD_PASTE;
    this._obj2 = control;
    this._line = line;
    this.Invoke();
  }

  /// <summary>
  /// Post a key event (emulate keys pressed by the user).
  /// </summary>
  /// <param name="control"></param>
  /// <param name="line"></param>
  /// <param name="keyCode"></param>
  /// <param name="stateMask"></param>
  postKeyEvent(control: GuiMgControl, line: number, keys: string, PostChar: boolean, forceLogicalControlTextUpdate: boolean): void {
    this._commandType = InteractiveCommandType.POST_KEY_EVENT;

    this._obj2 = control;
    this._line = line;
    this._mgValue = new MgValue();
    this._mgValue.str = keys;
    this._mgValue.bool1 = forceLogicalControlTextUpdate;
    this._boolVal = PostChar;

    this.Invoke();
  }

  /// <summary>
  /// Send WM_CHAR to the specified control via GUI thread.
  /// </summary>
  /// <param name="control"></param>
  /// <param name="line"></param>
  /// <param name="chr"></param>
  postCharEvent(control: GuiMgControl, line: number, chr: string): void {
    this._commandType = InteractiveCommandType.POST_CHAR_EVENT;
    this._obj2 = control;
    this._line = line;
    this._char = chr;

    this.Invoke();
  }

  /// <summary> dispose all the shells. last dispose will close the display.</summary>
  disposeAllForms(): void {
    this._commandType = InteractiveCommandType.DISPOSE_ALL_FORMS;
    this.Invoke();
  }

  /// <summary> return number of rows in the table</summary>
  /// <param name="control"></param>
  /// <returns></returns>
  getRowsInPage(control: GuiMgControl): number {
    this._commandType = InteractiveCommandType.GET_ROWS_IN_PAGE;
    this._obj2 = control;
    this.Invoke();
    return this._intVal1;
  }

  /// <summary> return the number of hidden rows (partially or fully) in table</summary>
  /// <param name="control"></param>
  /// <returns></returns>
  GetHiddenRowsCountInTable(control: GuiMgControl): number {
    this._commandType = InteractiveCommandType.GET_HIDDEN_ROWS_COUNT_IN_TABLE;
    this._obj2 = control;
    this.Invoke();
    return this._intVal1;
  }

  /// <summary>
  /// return the last window state
  /// </summary>
  /// <param name="form"></param>
  /// <returns></returns>
  getLastWindowState(guiMgForm: GuiMgForm): number {
    this._commandType = InteractiveCommandType.GET_LAST_WINDOW_STATE;
    this._obj2 = guiMgForm;

    this.Invoke();
    return this._intVal1;
  }

  /// <summary>
  /// gets height of all frames in frameset
  /// </summary>
  /// <param name="frameset"></param>
  /// <returns></returns>
  getFramesBounds(frameset: GuiMgControl): any {
    this._commandType = InteractiveCommandType.GET_FRAMES_BOUNDS;
    this._obj2 = frameset;

    this.Invoke();
    return this._obj1;
  }

  /// <summary>
  /// gets linked parent idx of frameset
  /// </summary>
  /// <param name="frameset"></param>
  /// <returns></returns>
  getLinkedParentIdx(frameset: GuiMgControl): number {
    this._commandType = InteractiveCommandType.GET_LINKED_PARENT_IDX;
    this._obj2 = frameset;

    this.Invoke();
    return this._intVal1;
  }

  /// <summary>
  /// get the columns state --- layer, width and widthForFillTablePlacement
  /// </summary>
  /// <param name="index"></param>
  /// <returns></returns>
  getColumnsState(tableCtrl: GuiMgControl): List<number[]> {
    this._commandType = InteractiveCommandType.GET_COLUMNS_STATE;
    this._obj2 = tableCtrl;
    this._mgValue = new MgValue();
    this.Invoke();
    return this._mgValue.listOfIntArr;
  }

  /// <summary>
  /// Update the Control.TagData.MapData with the newObjectToSet
  /// </summary>
  /// <param name="newObjectToSet"></param>
  MapWidget(newObjectToSet: any): void;
  MapWidget(): void;
  MapWidget(newObjectToSet?: any): void {
    if (arguments.length === 1)
      this.MapWidget_0(newObjectToSet);
    else
      this.MapWidget_1();
  }

  private MapWidget_0(newObjectToSet: any): void {
    this._commandType = InteractiveCommandType.MAP_WIDGET_TO_GUI_OBJECT;
    this._obj1 = newObjectToSet;
    this.Invoke();
  }

  /// <summary>
  /// Returns count of currently opened MDIChild.
  /// </summary>
  /// <returns></returns>
  GetMDIChildCount(): number {
    this._commandType = InteractiveCommandType.GET_MDI_CHILD_COUNT;
    this._mgValue = new MgValue();
    this.Invoke();
    return this._mgValue.number;
  }

  /// <summary>
  /// Activate the form.
  /// </summary>
  /// <param name="guiMgForm"></param>
  ActivateForm(guiMgForm: GuiMgForm): void {
    this._commandType = InteractiveCommandType.ACTIVATE_FORM;
    this._obj1 = guiMgForm;
    this.Invoke();
  }

  /// <summary>
  /// Activates a next or previous MDI child
  /// </summary>
  /// <param name="nextWindow">indicates whether to activate next window or not</param>
  ActivateNextOrPreviousMDIChild(nextWindow: boolean): void {
    this._commandType = InteractiveCommandType.ACTIVATE_NEXT_OR_PREVIOUS_MDI_CHILD;
    this._boolVal = nextWindow;
    this.Invoke();
  }

  EnableMenuEntry(mnuRef: MenuReference, enable: boolean): void {
    this._commandType = InteractiveCommandType.ENABLE_MENU_ENTRY;
    this._obj1 = mnuRef;
    this._boolVal = enable;
    this.Invoke();
  }

  /// <summary>
  /// ShowContextMenu.
  /// </summary>
  /// <param name="guiMgControl"></param>
  /// <param name="guiMgForm"></param>
  /// <param name="left"></param>
  /// <param name="top"></param>
  onShowContextMenu(guiMgControl: GuiMgControl, guiMgForm: GuiMgForm, left: number, top: number, line: number): void {
    this._commandType = InteractiveCommandType.SHOW_CONTEXT_MENU;
    this._obj1 = guiMgControl;
    this._obj2 = guiMgForm;
    this._line = line;
    this._x = left;
    this._y = top;
    this.Invoke();
  }

  /// <summary>
  /// returns if the passed form is active
  /// </summary>
  /// <param name="form"></param>
  /// <returns></returns>
  isFormActive(guiMgForm: GuiMgForm): boolean;
  isFormActive(): void;
  isFormActive(guiMgForm?: GuiMgForm): boolean {
    if (arguments.length === 1)
      return this.isFormActive_0(guiMgForm);
    else
      this.isFormActive_1();
  }

  private isFormActive_0(guiMgForm: GuiMgForm): boolean {
    return this._boolVal;
  }

  /// <summary> Gets the RTF value of the RTF edit control which was set before entering it. </summary>
  /// <param name="guiMgControl"></param>
  /// <param name="line"></param>
  /// <returns></returns>
  GetRtfValueBeforeEnteringControl(guiMgControl: GuiMgControl, line: number): string {
    this._commandType = InteractiveCommandType.GET_RTF_VALUE_BEFORE_ENTERING_CONTROL;
    this._obj2 = guiMgControl;
    this._line = line;

    this._mgValue = new MgValue();

    this.Invoke();

    return this._mgValue.str;
  }

  /// <summary> Get Position Isn of Row in DataTable attached to DV Control. </summary>
  /// <param name="dataTable"></param>
  /// <param name="line"></param>
  /// <returns></returns>
  GetDVControlPositionIsn(dataTable: any, line: number): number {
    this._commandType = InteractiveCommandType.GET_DVCONTROL_POSITION_ISN;
    this._obj1 = dataTable;
    this._line = line;
    this.Invoke();
    return this._intVal1;
  }

  /// <summary> Get Position Isn of Row in DataTable attached to DV Control. </summary>
  /// <param name="dataTable"></param>
  /// <param name="line"></param>
  /// <returns></returns>
  ClearDatatable(dvControl: GuiMgControl, dataTable: any): void {
    this._commandType = InteractiveCommandType.CLEAR_DATA_TABLE;
    this._obj1 = dvControl;
    this._obj2 = dataTable;
    this.Invoke();
  }

  /// <summary> Set Datasource property of Dataview control. </summary>
  /// <param name="dvControl"></param>
  /// <param name="dataTable"></param>
  /// <param name="propertyName"></param>
  SetDataSourceToDataViewControl(dvControl: GuiMgControl, dataTable: any, propertyName: string): void {
    this._commandType = InteractiveCommandType.SET_DATA_SOURCE_TO_DVCONTROL;
    this._obj1 = dvControl;
    this._obj2 = dataTable;
    this._str = propertyName;
    this.Invoke();
  }

  /// <summary>
  /// Get the data for a specific format from dropped data.
  /// </summary>
  /// <param name="format"></param>
  /// <param name="userFormatStr">User defined format. It will be Null for internal formats.</param>
  /// <returns> string - Data for a specific format </returns>
  GetDroppedData(format: ClipFormats, userFormatStr: string): string {
    this._commandType = InteractiveCommandType.GET_DROPPED_DATA;
    this._intVal1 = <number>format;
    this._str = userFormatStr;
    this._mgValue = new MgValue();
    this.Invoke();
    return this._mgValue.str;
  }

  /// <summary>
  /// get the dropped x & y from dropped data.
  /// </summary>
  /// <param name="point"> will be updated with the dropped position </param>
  /// <returns> void </returns>
  GetDropPoint(point: MgPoint): void {
    this._commandType = InteractiveCommandType.GET_DROPPED_POINT;

    this.Invoke();
    point.x = this._x;
    point.y = this._y;
  }

  /// <summary>
  /// get the SelectionStart and SelectionEnd from the dropped data.
  /// </summary>
  /// <returns> void </returns>
  GetSelectionForDroppedControl(selectionStart: RefParam<number>, selectionLength: RefParam<number>): void {
    this._commandType = InteractiveCommandType.GET_DROPPED_SELECTION;
    this.Invoke();
    selectionStart.value = this._x;
    selectionLength.value = this._y;
  }

  /// <summary>
  /// Check whether the format is present in the dropped data or not.
  /// </summary>
  /// <param name="format"> format </param>
  /// <param name="userFormatStr">User defined format. It will be Null for internal formats.</param>
  /// <returns> bool - true, if format is present in dropped data. </returns>
  CheckDropFormatPresent(format: ClipFormats, userFormatStr: string): boolean {
    this._commandType = InteractiveCommandType.DROP_FORMAT_SUPPORTED;
    this._intVal1 = <number>format;
    this._str = userFormatStr;

    this._mgValue = new MgValue();
    this.Invoke();
    return this._mgValue.boolVal;
  }

  /// <summary>
  /// Get the value of IsBeginDrag flag from DraggedData.
  /// </summary>
  /// <returns></returns>
  IsBeginDrag(): boolean {
    this._commandType = InteractiveCommandType.GET_IS_BEGIN_DRAG;

    this._mgValue = new MgValue();
    this.Invoke();
    return this._mgValue.boolVal;
  }

  ///<summary>
  ///  Check whether the combobox is in a DroppedDown state or not.
  ///</summary>
  ///<param name="comboBox">MgcomboBox control</param>
  ///<param name="line">!!.</param>
  ///<returns>bool</returns>
  IsComboBoxInDroppedDownState(comboBox: GuiMgControl, line: number): boolean {
    this._commandType = InteractiveCommandType.IS_COMBO_DROPPED_DOWN;
    this._obj1 = comboBox;
    this._line = line;

    this.Invoke();
    return this._boolVal;
  }

  /// <summary> Calls Run() synchronously to execute the command.
  /// But before that, it executes the GuiCommandQueue.
  /// </summary>
  private Invoke(): void {
    GuiCommandQueue.getInstance().invoke();
    if (this._obj2 instanceof ControlBase) {
      let controlBase: ControlBase = <ControlBase>this._obj2;
      this.TaskTag = controlBase.TaskTag;
      this.controlName = controlBase.UniqueName;
    }
    else if (this._obj2 instanceof GuiMgForm)
    {
      let guiMgForm: GuiMgForm = <GuiMgForm>this._obj2;
      this.TaskTag = guiMgForm.TaskTag;
    }
    else
      this.TaskTag = '0'; // general command

    UIBridge.getInstance().ExecuteInteractiveCommand(this);
  }

  /// <summary> implements the Runnable run method for calling Display.syncExec()</summary>
  // Run(): void {
  //   // Sets the currentContextID
  //   let contextIDGuard = new ContextIDGuard(this._contextID);
  //   try {
  //     switch (this._commandType) {
  //       case InteractiveCommandType.GET_FONT_METRICS:
  //         this.onGetFontMetrics();
  //         break;
  //       case InteractiveCommandType.GET_RESOLUTION:
  //         this.onGetResolution();
  //         break;
  //       case InteractiveCommandType.GET_BOUNDS:
  //         this.onBounds();
  //         break;
  //       case InteractiveCommandType.GET_VALUE:
  //         this.onValue();
  //         break;
  //       case InteractiveCommandType.SET_BROWSER_TEXT:
  //         this.onSetBrowserText();
  //         break;
  //       case InteractiveCommandType.GET_BROWSER_TEXT:
  //         this.onGetBrowserText();
  //         break;
  //       case InteractiveCommandType.BROWSER_EXECUTE:
  //         this.onBrowserExecute();
  //         break;
  //       case InteractiveCommandType.GET_TOP_INDEX:
  //         this.onGetTopIndex();
  //         break;
  //       case InteractiveCommandType.MESSAGE_BOX:
  //         this.onMessageBox();
  //         break;
  //       case InteractiveCommandType.DIRECTORY_DIALOG_BOX:
  //         this.onDirectoryDialogBox();
  //         break;
  //       case InteractiveCommandType.GET_CLIENT_BOUNDS:
  //         this.getClientBounds();
  //         break;
  //       case InteractiveCommandType.SET_EDIT_TEXT:
  //         this.onSetEditText();
  //         break;
  //       case InteractiveCommandType.INSERT_EDIT_TEXT:
  //         this.onInsertEditText();
  //         break;
  //       case InteractiveCommandType.SET_SELECTION:
  //         this.onSetSelection();
  //         break;
  //       case InteractiveCommandType.GET_SELECTION:
  //         this.onSelectionGet();
  //         break;
  //       case InteractiveCommandType.GET_CARET_POS:
  //         this.onCaretPosGet();
  //         break;
  //       case InteractiveCommandType.GET_IS_TOP_OF_TEXTBOX:
  //         this.onGetIsTopOfTextBox();
  //         break;
  //       case InteractiveCommandType.GET_IS_END_OF_TEXTBOX:
  //         this.onGetIsEndOfTextBox();
  //         break;
  //       case InteractiveCommandType.CLIPBOARD_GET_CONTENT:
  //         this.onClipboardRead();
  //         break;
  //       case InteractiveCommandType.CLIPBOARD_SET_CONTENT:
  //         this.onClipboardWrite();
  //         break;
  //       case InteractiveCommandType.CLIPBOARD_PASTE:
  //         this.onClipboardPaste();
  //         break;
  //       case InteractiveCommandType.POST_KEY_EVENT:
  //         this.onPostKeyEvent();
  //         break;
  //       case InteractiveCommandType.POST_CHAR_EVENT:
  //         this.onPostCharEvent();
  //         break;
  //       case InteractiveCommandType.SET_CURSOR:
  //         this.onSetCursor();
  //         break;
  //       case InteractiveCommandType.DISPOSE_ALL_FORMS:
  //         this.onDisposeAllForms();
  //         break;
  //       case InteractiveCommandType.GET_ROWS_IN_PAGE:
  //         this.onGetRowsInPage();
  //         break;
  //       case InteractiveCommandType.GET_HIDDEN_ROWS_COUNT_IN_TABLE:
  //         this.onGetHiddenRowsCountInTable();
  //         break;
  //       case InteractiveCommandType.FILE_OPEN_DIALOG_BOX:
  //         this.onFileOpenDialogBox();
  //         break;
  //       case InteractiveCommandType.FILE_SAVE_DIALOG_BOX:
  //         this.onFileSaveDialogBox();
  //         break;
  //       case InteractiveCommandType.CREATE_DIALOG:
  //         this.onCreateDialog();
  //         break;
  //       case InteractiveCommandType.OPEN_DIALOG:
  //         this.onOpenDialog();
  //         break;
  //       case InteractiveCommandType.CLOSE_DIALOG:
  //         this.onCloseDialog();
  //         break;
  //       case InteractiveCommandType.SET_GET_SUGGESTED_VALUE_FOR_CHOICE_CONTROL_ON_TAGDATA:
  //         this.OnSetGetSuggestedValueOfChoiceControlOnTagData();
  //         break;
  //       case InteractiveCommandType.GET_LAST_WINDOW_STATE:
  //         this.onGetLastWindowState();
  //         break;
  //       case InteractiveCommandType.GET_FRAMES_BOUNDS:
  //         this.onGetFramesBounds();
  //         break;
  //       case InteractiveCommandType.GET_LINKED_PARENT_IDX:
  //         this.onGetLinkedParentIdx();
  //         break;
  //       case InteractiveCommandType.GET_FORM_BOUNDS:
  //         this.onGetFormBounds();
  //         break;
  //       case InteractiveCommandType.GET_COLUMNS_STATE:
  //         this.onGetColumnsState();
  //         break;
  //       case InteractiveCommandType.GET_FORM_HANDLE:
  //         this.onGetFormHandle();
  //         break;
  //       case InteractiveCommandType.GET_CTRL_HANDLE:
  //         this.onGetCtrlHandle();
  //         break;
  //       case InteractiveCommandType.IS_FORM_ACTIVE:
  //         this.isFormActive();
  //         break;
  //       case InteractiveCommandType.GET_DROPPED_DATA:
  //         this.onGetDroppedData();
  //         break;
  //       case InteractiveCommandType.GET_DROPPED_POINT:
  //         this.onGetDroppedPoint();
  //         break;
  //       case InteractiveCommandType.GET_DROPPED_SELECTION:
  //         this.onGetDroppedSelection();
  //         break;
  //       case InteractiveCommandType.DROP_FORMAT_SUPPORTED:
  //         this.onCheckDropFormatPresent();
  //         break;
  //       case InteractiveCommandType.GET_IS_BEGIN_DRAG:
  //         this.onGetIsBeginDrag();
  //         break;
  //       case InteractiveCommandType.ACTIVATE_NEXT_OR_PREVIOUS_MDI_CHILD:
  //         this.OnActivateNextOrPreviousMDIChild();
  //         break;
  //       case InteractiveCommandType.SEND_IME_MSG:
  //         this.onSendImeMsg();
  //         break;
  //       case InteractiveCommandType.CAN_FOCUS:
  //         this.onCanFocus();
  //         break;
  //       case InteractiveCommandType.GET_SELECTED_INDICE:
  //         this.OnGetSelectedIndice();
  //         break;
  //       case InteractiveCommandType.SET_SUGGESTED_VALUE:
  //         this.onSetSuggestedValue();
  //         break;
  //       case InteractiveCommandType.MAP_WIDGET_TO_GUI_OBJECT:
  //         this.MapWidget();
  //         break;
  //       case InteractiveCommandType.REMOVE_DN_CONTROL_VALUE_CHANGED_HANDLER:
  //         this.OnRemoveDNControlValueChangedHandler();
  //         break;
  //       case InteractiveCommandType.ADD_DN_CONTROL_VALUE_CHANGED_HANDLER:
  //         this.OnAddDNControlValueChangedHandler();
  //         break;
  //       case InteractiveCommandType.GET_RTF_VALUE_BEFORE_ENTERING_CONTROL:
  //         this.OnGetRtfValueBeforeEnteringControl();
  //         break;
  //       case InteractiveCommandType.GET_MDI_CHILD_COUNT:
  //         this.OnGetMDIChildCount();
  //         break;
  //       case InteractiveCommandType.ACTIVATE_FORM:
  //         this.OnActivateForm();
  //         break;
  //       case InteractiveCommandType.ENABLE_MENU_ENTRY:
  //         this.OnEnableMenuEntry();
  //         break;
  //       case InteractiveCommandType.SHOW_CONTEXT_MENU:
  //         this.OnShowContextMenu();
  //         break;
  //       case InteractiveCommandType.IS_COMBO_DROPPED_DOWN:
  //         this.OnIsComboDroppedDowndState();
  //         break;
  //       case InteractiveCommandType.INVOKE_UDPCOMMAND:
  //         this.onInvokeUDP();
  //         break;
  //       case InteractiveCommandType.GET_HASINDENT:
  //         this.OnGetHasIndent();
  //         break;
  //     }
  //   }
  //   catch (ex) {
  //     if (ex instanceof Exception) {
  //       Events.WriteExceptionToLog(ex);
  //       throw ex;
  //     }
  //     else
  //       throw ex; // Reset the current contextID.
  //   }
  //   finally {
  //     contextIDGuard.Dispose();
  //   }
  // }

  /// <summary> Remove the ValueChangedHandler. </summary>
  OnRemoveDNControlValueChangedHandler(): void {
    Events.WriteExceptionToLog("RemoveDNControlValueChangedHandler - Not Implemented Yet");
  }

/// <summary> Add the ValueChangedHandler. </summary>
  OnAddDNControlValueChangedHandler(): void {
    Events.WriteExceptionToLog("AddDNControlValueChangedHandler - Not Implemented Yet");
  }

  /// <summary> Gets the RTF value of the RTF edit control which was set before entering it. </summary>
  OnGetRtfValueBeforeEnteringControl(): void {
    Events.WriteExceptionToLog("OnGetOrgRtfValue - Not Implemented Yet");
  }

/// methods suspected as different between the GuiInteractive classes of the standard/compact frameworks
  abstract onGetBrowserText(): void ;

  abstract onBrowserExecute(): void ;



  ///<summary>
  /// Handles Invoke UDP operation from GUI thread
  ///</summary>
  onInvokeUDP(): void {
  }

  abstract onDirectoryDialogBox(): void ;

  /// <summary> Handle the file open dialog box
  ///
  /// </summary>
  onFileOpenDialogBox(): void {
  }

  /// <summary> Handle the file save dialog box
  ///
  /// </summary>
  onFileSaveDialogBox(): void {
  }

  /// <summary>Create dialog</summary>
  onCreateDialog(): void {
  }

  /// <summary>Opens dialog</summary>
  onOpenDialog(): void {
  }

/// <summary>Closes dialog</summary>
  onCloseDialog(): void {
  }

  /// <summary>This function returns if the form is active or not.
  /// </summary>
  private isFormActive_1(): void {
  }

  /// <summary>Get the string from DroppedData for a specific format</summary>
  private onGetDroppedData(): void {
  }

  /// <summary>Get the point/location of the drop</summary>
  private onGetDroppedPoint(): void {
  }

  /// <summary>Check whether the format is present in DroppedData or not.</summary>
  private onCheckDropFormatPresent(): void {
  }

  /// <summary>Get the selection of a control for Drop</summary>
  private onGetDroppedSelection(): void {
  }

  /// <summary>Get the IsBeginDrag from DraggedData </summary>
  private onGetIsBeginDrag(): void {
  }

  /// <summary> dispose all shells.</summary>
  private onDisposeAllForms(): void {
  }

  /// <summary> calculating the font metrics</summary>
  private onGetFontMetrics(): void {
  }

/// <summary> Gets the resolution of the control. </summary>
  private onGetResolution(): void {
  }

  /// <summary> return the caret position on the given control</summary>
  private onCaretPosGet(): void {
  }

  /// <summary> check if the caret is positioned on the first line of TextBox</summary>
  private onGetIsTopOfTextBox(): boolean {
    return this._boolVal;
  }

  /// <summary> check if the caret is positioned on the last line of TextBox</summary>
  private onGetIsEndOfTextBox(): boolean {
    return this._boolVal;
  }

  /// <summary> return the caret position on the given control</summary>
  private onSelectionGet(): void {
  }

  /// <summary> return the value of the control</summary>
  // private onValue(): void {
  //
  //   UIBridge.getInstance().GetInteractiveValue(this.taskTag, this);
  //
  //   //this._mgValue.str = UIBridge.getInstance().GetControlValue(controlBase.TaskTag, (this._line).toString(), controlBase.UniqueName);
  //
  // }

  /// <summary> set the text in the text control.</summary>
  private onSetEditText(): void {
  }

  /// <summary> insert the text to the text control at a given position.</summary>
  private onInsertEditText(): void {
  }

  /// <summary> set the text(html) on the browser control</summary>
  onSetBrowserText(): void {
  }

  /// <summary> set the selection in the text control.</summary>
  onSetSelection(): void {
  }

  /// <summary> set the suggested value for choice control.</summary>
  onSetSuggestedValue(): void {
  }

  /// <summary> get number of rows in the table
  /// </summary>
  onGetRowsInPage(): void {
  }

  /// <summary> return the number of hidden rows (partially or fully) in table
  /// </summary>
  onGetHiddenRowsCountInTable(): void {
  }

  /// <summary> get table top index
  /// </summary>
  onGetTopIndex(): void {
  }

  /// <summary> get the Client bounds of the object</summary>
  private getClientBounds_1(): void {
  }

  /// <summary> write a string to the clipboard. i did not use textCtrl.copy since onClipboardWrite can be used not only
  /// from a widget but also from a function
  /// </summary>
  onClipboardWrite(): void {
  }

  /// <summary> read from clipboard to a string
  /// </summary>
  onClipboardRead(): void {
  }

  /// </summary>
  onClipboardPaste(): void {
  }

  /// <summary> post a key combination. This emulates keys pressed by the user. Setting the data in the widget to ignore
  /// key down, will cause the OS to handle the event instead of us.
  /// </summary>
  onPostKeyEvent(): void {
  }

  /// <summary> Send WM_CHAR message to ComboBox and ListBox. This emulates keys pressed by the user.
  /// </summary>
  onPostCharEvent(): void {
  }

  /// <summary> get the bounds of the object</summary>
  onBounds(): void {
  }

  /// <summary>
  /// Returns count of currently opened MDIChild.
  /// </summary>
  OnGetMDIChildCount(): void {
  }

  /// <summary>
  ///
  /// </summary>
  OnSetGetSuggestedValueOfChoiceControlOnTagData(): void {
  }

  /// <summary> (Korean IME) send MG_IME_XXX message to MgTextBox </summary>
  private onSendImeMsg(): void {
  }

  /// <summary>set cursor on forms</summary>
  onSetCursor(): void {
  }

  /// <summary>true if the operation should be delegated to the GUI thread</summary>
  /// <returns></returns>
  private invokeRequired(): boolean {
    return false;
  }

  /// <summary>
  /// return windowState
  /// </summary>
  private onGetLastWindowState(): void {
  }

  /// <summary>
  /// gets height of all childs in the frameset
  /// </summary>
  private onGetFramesBounds(): void {
  }

  /// <summary>
  /// get parent link Idx of this frameset
  /// </summary>
  private onGetLinkedParentIdx(): void {
  }

  /// <summary>
  /// get form's Bounds
  /// </summary>
  private onGetFormBounds(): void {
  }

  /// <summary>get layer of the column
  /// </summary>
  private onGetColumnsState(): void {
  }

  /// <summary>This function returns the handle of the window form depending on the MgForm.
  /// </summary>
  private onGetFormHandle(): void {
  }

  /// <summary> Function finds the handle of the window control associated with the magic control.
  /// </summary>
  private onGetCtrlHandle(): void {
  }

  /// <summary> Indicates if a control can be selected. </summary>
  private onCanFocus(): void {
  }

  /// <summary>
  /// Get the selected indice of the listbox control.
  /// </summary>
  private OnGetSelectedIndice(): void {
  }

  /// <summary>
  /// Returns true if control has indent applied
  /// </summary>
  /// <returns></returns>
  private OnGetHasIndent(): void {
  }

  /// <summary>
  /// Map Widget to Gui object (MgForm/MgStatusBar/MgStatusPane) for MDI frame for a parallel context
  /// </summary>
  private MapWidget_1(): void {
  }

  /// <summary>
  ///   Get PositionIsn of DataRow From DataTable attached to DVControl.
  /// </summary>
  OnGetDVControlPositionIsn(): void {
  }

  /// <summary>
  /// Activate the form.
  /// </summary>
  OnActivateForm(): void {
  }

  /// <summary>
  /// Enable/Disable MenuItem.
  /// </summary>
  OnEnableMenuEntry(): void {
  }

/// <summary>
  /// Activates a next or previous MDI child window.
  /// </summary>
  OnActivateNextOrPreviousMDIChild(): void {
  }

  /// <summary>
  /// Show Context Menu.
  /// </summary>
  OnShowContextMenu(): void {
  }

  ///<summary>
  ///  Check whether the combobox is in dropped down state.
  ///</summary>
  ///<returns>!!.</returns>
  OnIsComboDroppedDowndState(): void {
  }
}

export class GuiInteractive extends GuiInteractiveBase {

  OnGetRtfValueBeforeEnteringControl(): void {
  }

  onGetBrowserText(): void {
  }

  onBrowserExecute(): void {
  }

  onDirectoryDialogBox(): void {
  }

  constructor() {
    super();
  }
}
