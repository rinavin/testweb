import {List, RefParam} from "@magic/mscorelib";
import {WindowType} from "@magic/utils";
import {GuiMgForm} from "./gui/GuiMgForm";
import {GuiInteractive} from "./gui/low/GuiInteractive";
import {MgRectangle} from "./util/MgRectangle";
import {MgPoint, MgPointF} from "./util/MgPoint";
import {GuiMgControl} from "./gui/GuiMgControl";
import {ClipFormats, CommandType, DockingStyle, MenuStyle, MgCursors} from "./GuiEnums";
import {MgFormBase} from "./management/gui/MgFormBase";
import {DialogHandler} from "./gui/low/DialogHandler";
import {MenuReference} from "./gui/low/MenuReference";
import {GuiCommandQueue} from "./gui/low/GuiCommandQueue";
import {GuiMenuEntry} from "./gui/GuiMenuEntry";
import {GuiMgMenu} from "./gui/GuiMgMenu";
import {GuiCommand} from "./gui/low/GuiCommand";

/// <summary>
///   Commands to the GUI thread.
///   There’re two types of commands (grouped in #regions):
///      1.	Commands that are executed immediately.
///      2.	Commands that are queued (overloaded methods ‘addAsync’) and then executed,
///         either synchronously (method ‘invoke’) or asynchronously (method ‘beginInvoke’).
/// </summary>
export class Commands {

  /// <summary>
  ///   Sync call to display message box
  /// </summary>
  /// <param name = "topMostForm"></param>
  /// <param name = "title"></param>
  /// <param name = "msg"></param>
  /// <param name = "style"></param>
  /// <returns></returns>
  static messageBox(topMostForm: GuiMgForm, title: string, msg: string, style: number): number {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.messageBox(topMostForm, title, msg, style);
  }

  ///<summary>
  /// Handles Invoke UDP operation from GUI thread
  ///</summary>
  ///<param name="contextId">Context id</param>
  static invokeUDP(contextId: number): number {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.invokeUDP(contextId);
  }

  /// <summary>
  ///   Sync call to get the bounds of the object
  /// </summary>
  /// <param name = "obj"></param>
  /// <param name = "rect"></param>
  static getBounds(obj: any, rect: MgRectangle): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.getBounds(obj, rect);
  }

  /// <summary> Gets the resolution of the control. </summary>
  /// <param name="obj"></param>
  /// <returns></returns>
  static getResolution(obj: any): MgPoint {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.getResolution(obj);
  }

  /// <summary>
  ///   Sync call to get the handle of the form
  /// </summary>
  /// <param name = "guiMgForm"></param>
  /// <returns></returns>
  static getFormHandle(guiMgForm: GuiMgForm): number {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.getFormHandle(guiMgForm);
  }

  /// <summary>
  ///   Sync call to get the handle of the control
  /// </summary>
  /// <param name = "guiMgControl"></param>
  /// <returns></returns>
  static getCtrlHandle(guiMgControl: GuiMgControl, line: number): number {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.getCtrlHandle(guiMgControl, line);
  }

  /// <summary>
  ///   Sync call to set cursor according to cursor shape
  /// </summary>
  /// <param name = "shape"></param>
  /// <returns></returns>
  static setCursor(shape: MgCursors): boolean {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.setCursor(shape);
  }

  /// <summary>
  ///   Sync call. This methode is set TRUE\FALSE that GuiUtiles\GetValue() method will be use
  ///   this falg say if to return the : (true) suggested value or (false)the real value
  ///   this method is use for MG_ACT_CTRL_MODIFY
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "retSuggestedValue"></param>
  static setGetSuggestedValueOfChoiceControlOnTagData(ctrl: GuiMgControl, line: number, retSuggestedValue: boolean): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.setGetSuggestedValueOfChoiceControlOnTagData(ctrl, line, retSuggestedValue);
  }

  /// <summary>
  ///   Sync call to get the client bounds of the object
  /// </summary>
  /// <param name = "obj"></param>
  /// <param name = "rect"></param>
  static getClientBounds(obj: any, rect: MgRectangle, clientPanelOnly: boolean): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.getClientBounds(obj, rect, clientPanelOnly);
  }

  /// <summary>
  ///   Sync call to get value of the control
  /// </summary>
  /// <param name = "obj"></param>
  /// <param name = "mgValue"></param>
  /// <param name = "line"></param>
  static getValue(obj: any, line: number): string {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.getValue(obj, line);
  }

  /// <summary>
  ///   Sync call to set the text(html) on the browser control
  /// </summary>
  /// <param name = "browserControl"></param>
  /// <param name = "text"></param>
  /// <returns></returns>
  static setBrowserText(browserControl: GuiMgControl, text: string): boolean {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.setBrowserText(browserControl, text);
  }

  /// <summary>
  ///   Sync call to get the text(html) on the browser control
  /// </summary>
  /// <param name = "browserControl"></param>
  /// <param name = "mgValue"></param>
  static getBrowserText(browserControl: GuiMgControl): string {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.getBrowserText(browserControl);
  }

  /// <summary>
  ///   Sync call to get table top index
  /// </summary>
  /// <param name = "tablecontrol"></param>
  /// <returns></returns>
  static getTopIndex(tablecontrol: GuiMgControl): number {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.getTopIndex(tablecontrol);
  }

  /// <summary>
  ///   Sync call to execute browser
  /// </summary>
  /// <param name = "browserControl"></param>
  /// <param name = "text"></param>
  /// <param name = "syncExec"></param>
  /// <param name = "language"></param>
  static browserExecute(browserControl: GuiMgControl, text: string, syncExec: boolean, language: string): boolean {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.browserExecute(browserControl, text, syncExec, language);
  }

  /// <summary>
  ///   Sync call to Directory Dialog Box
  /// </summary>
  /// <param name = "caption">description for the dialog window</param>
  /// <param name = "path">initial path to browse</param>
  /// <param name = "bShowNewFolder">should show the new folder button?</param>
  /// <returns>directory path selected by user</returns>
  static directoryDialogBox(caption: string, path: string, bShowNewFolder: boolean): string {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.directoryDialogBox(caption, path, bShowNewFolder);
  }

  /// <summary>
  ///   Sync call to File Open Dialog Box
  /// </summary>
  /// <param name = "title">Dialog window caption</param>
  /// <param name = "dirName">Initial directory</param>
  /// <param name = "fileName"></param>
  /// <param name = "filterNames">filter string</param>
  /// <param name = "checkExists">verify opened file exists</param>
  /// <param name = "multiSelect">enable selecting multiple files</param>
  /// <returns>file path selected by user</returns>
  static fileOpenDialogBox(title: string, dirName: string, fileName: string, filterNames: string, checkExists: boolean, multiSelect: boolean): string {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.fileOpenDialogBox(title, dirName, fileName, filterNames, checkExists, multiSelect);
  }

  /// <summary>
  ///   Sync call to File Save Dialog Box
  /// </summary>
  /// <param name = "title">caption of the dialog window</param>
  /// <param name = "dirName">initial directory</param>
  /// <param name = "fileName"></param>
  /// <param name = "filterNames">filter string</param>
  /// <param name = "defaultExtension">default extension for file name</param>
  /// <param name = "overwritePrompt">should prompt when overwriting an existing file?</param>
  /// <returns>file path selected by user</returns>
  static fileSaveDialogBox(title: string, dirName: string, fileName: string, filterNames: string, defaultExtension: string, overwritePrompt: boolean): string {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.fileSaveDialogBox(title, dirName, fileName, filterNames, defaultExtension, overwritePrompt);
  }

  /// <summary>
  ///   Sync call to Put Command to create dialog
  /// </summary>
  /// <param name = "handle">reference to the dialog handlers</param>
  /// <param name = "objType">parameters to be passed to objects constructor</param>
  /// <param name = "parameters"></param>
  static createDialog(handle: DialogHandler, parameters: any[]): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.createDialog(handle, parameters);
  }

  /// <summary>
  ///   Sync call to Put Command to open dialog
  /// </summary>
  /// <param name = "handle"></param>
  static openDialog(handle: DialogHandler): void {
  }

  /// <summary>
  ///   Sync call to Put Command to close dialog
  /// </summary>
  /// <param name = "handle"></param>
  static closeDialog(handle: DialogHandler): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.closeDialog(handle);
  }

  /// <summary>
  ///   Sync call to set the text to the the control
  /// </summary>
  /// <param name = "control"></param>
  /// <param name = "line"></param>
  /// <param name = "text"></param>
  /// <returns></returns>
  static setEditText(control: GuiMgControl, line: number, text: string): boolean {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.setEditText(control, line, text);
  }

  /// <summary>
  ///   Insert text to a text control at a given position
  /// </summary>
  /// <param name = "control"></param>
  /// <param name = "line"></param>
  /// <param name = "startPosition">where to add the text</param>
  /// <param name = "textToInsert">the text to add</param>
  /// <returns></returns>
  static insertEditText(control: GuiMgControl, line: number, startPosition: number, textToInsert: string): boolean {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.insertEditText(control, line, startPosition, textToInsert);
  }

  /// <summary>
  ///   Sync call to set the text to the the control
  /// </summary>
  /// <param name = "control"></param>
  /// <param name = "line"></param>
  /// <param name = "start"></param>
  /// <param name = "end"></param>
  /// <param name = "caretPos"></param>
  static setSelection(control: GuiMgControl, line: number, start: number, end: number, caretPos: number): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.setSelection(control, line, start, end, caretPos);
  }

  /// <summary>
  ///   set suggested value of choice control
  /// </summary>
  /// <param name = "control"></param>
  /// <param name = "suggestedValue"></param>
  static setSuggestedValue(control: GuiMgControl, suggestedValue: string): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.setSuggestedValue(control, suggestedValue);
  }

  /// <summary>
  ///   Sync call to get the position of the caret on the control
  /// </summary>
  /// <param name = "control"></param>
  /// <param name = "line"></param>
  /// <param name = "mgValue"></param>
  static caretPosGet(control: GuiMgControl, line: number): number {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.caretPosGet(control, line);
  }

  /// <summary>
  ///   Get if Caret is at the top of TextBox
  /// </summary>
  /// <param name = "control"></param>
  /// <param name = "line"></param>
  static getIsTopOfTextBox(control: GuiMgControl, line: number): boolean {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.getIsTopOfTextBox(control, line);
  }

  /// <summary>
  ///   Get if Caret is at the end of TextBox
  /// </summary>
  /// <param name = "control"></param>
  /// <param name = "line"></param>
  static getIsEndOfTextBox(control: GuiMgControl, line: number): boolean {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.getIsEndOfTextBox(control, line);
  }

  /// <summary>
  ///   Sync call to get the selection on the given control
  /// </summary>
  /// <param name = "control"></param>
  /// <param name = "line"></param>
  /// <param name = "point"></param>
  static selectionGet(control: GuiMgControl, line: number, point: MgPoint): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.selectionGet(control, line, point);
  }

  /// <summary>
  ///   Sync call to write a string to the clipboard. The clip get get the data
  ///   either from a control or from the passed string in mgValue.
  /// </summary>
  /// <param name = "control"></param>
  /// <param name = "line"></param>
  /// <param name = "mgValue"></param>
  static clipboardWrite(control: GuiMgControl, line: number, clipData: string): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.clipboardWrite(control, line, clipData);
  }

  /// <summary>
  ///   Sync call to read from the clipboard to a string
  /// </summary>
  /// <returns></returns>
  static clipboardRead(): string {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.clipboardRead();
  }

  /// <summary>
  ///   Sync call to paste from clipboard to the control.
  /// </summary>
  /// <param name = "control"></param>
  /// <param name = "line"></param>
  static clipboardPaste(control: GuiMgControl, line: number): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.clipboardPaste(control, line);
  }

  /// <summary>
  ///   Sync call to Post a key event (emulate keys pressed by the user).
  /// </summary>
  /// <param name = "control"></param>
  /// <param name = "line"></param>
  /// <param name = "keys"></param>
  /// <param name = "PostChar"></param>
  static postKeyEvent(control: GuiMgControl, line: number, keys: string, PostChar: boolean, forceLogicalControlTextUpdate: boolean): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.postKeyEvent(control, line, keys, PostChar, forceLogicalControlTextUpdate);
  }

  /// <summary>
  ///   Sends WM_CHAR to the specified control via GUI thread.
  /// </summary>
  /// <param name = "control"></param>
  /// <param name = "line"></param>
  /// <param name = "chr"></param>
  static postCharEvent(control: GuiMgControl, line: number, chr: string): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.postCharEvent(control, line, chr);
  }

  /// <summary>
  ///   Sync call to dispose all the shells. last dispose will close the display.
  /// </summary>
  static disposeAllForms(): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.disposeAllForms();
  }

  /// <summary>
  /// Clear all images loaded to MgGui's cache (the volatile cache, i.e. not the files system cache of the RC itself).
  /// </summary>
  static ClearImagesCache(): void {
  }

  /// <summary>
  ///   Sync call to get number of rows in the table
  /// </summary>
  /// <param name = "control"></param>
  /// <returns></returns>
  static getRowsInPage(control: GuiMgControl): number {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.getRowsInPage(control);
  }

  /// <summary>
  ///   Sync call to get the number of hidden rows (partially or fully) in table
  /// </summary>
  /// <param name = "control"></param>
  /// <returns></returns>
  static GetHiddenRowsCountInTable(control: GuiMgControl): number {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.GetHiddenRowsCountInTable(control);
  }

  /// <summary>
  ///   Sync call to get the last window state
  /// </summary>
  /// <param name = "guiMgForm"></param>
  /// <returns></returns>
  static getLastWindowState(guiMgForm: GuiMgForm): number {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.getLastWindowState(guiMgForm);
  }

  /// <summary>
  ///   Sync call to get height of all frames in frameset
  /// </summary>
  /// <param name = "frameset"></param>
  /// <returns></returns>
  static getFramesBounds(frameset: GuiMgControl): any {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.getFramesBounds(frameset);
  }

  /// <summary>
  ///   Sync call to get linked parent idx of frameset
  /// </summary>
  /// <param name = "frameset"></param>
  /// <returns></returns>
  static getLinkedParentIdx(frameset: GuiMgControl): number {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.getLinkedParentIdx(frameset);
  }

  /// <summary>
  ///   Sync call to get the columns state --- layer, width and widthForFillTablePlacement
  /// </summary>
  /// <param name = "tableCtrl"></param>
  /// <returns></returns>
  static getColumnsState(tableCtrl: GuiMgControl): List<number[]> {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.getColumnsState(tableCtrl);
  }

  /// <summary>
  /// get the data for a specific format from dropped data.
  /// </summary>
  /// <param name="format">format - for which we want to retrieve the data. </param>
  /// <param name="userFormatStr">User defined format. It will be Null for internal formats.</param>
  /// <returns> string </returns>
  static GetDroppedData(format: ClipFormats, userFormatStr: string): string {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.GetDroppedData(format, userFormatStr);
  }

  /// <summary>
  /// Get the point X, where drop occurs.
  /// </summary>
  /// <returns> int - X co-ordinate of the dropped point </returns>
  static GetDroppedX(): number {
    let mgPoint: MgPoint = new MgPoint(0, 0);
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.GetDropPoint(mgPoint);
    return mgPoint.x;
  }

  /// <summary>
  /// Get the point Y, where drop occurs.
  /// </summary>
  /// <returns> int - Y co-ordinates of the dropped point </returns>
  static GetDroppedY(): number {
    let mgPoint: MgPoint = new MgPoint(0, 0);
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.GetDropPoint(mgPoint);
    return mgPoint.y;
  }

  /// <summary>
  /// Check whether the specified format is available in Dropped data.
  /// <param name="format"> format - which we want to check.</param>
  /// <param name="userFormatStr">User defined format. It will be Null for internal formats.</param>
  /// </summary>
  /// <returns> true if format is present in DroppedData, otherwise false. </returns>
  static CheckDropFormatPresent(format: ClipFormats, userFormatStr: string): boolean {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.CheckDropFormatPresent(format, userFormatStr);
  }

  /// <summary>
  /// Get the SelectionStart and SelectionEnd from DroppedData.
  /// Relevant only when drop occurs on an Edit control.
  /// </summary>
  /// <param name="selectionStart">Starting index of selection for edit control when drop occurs on Edit</param>
  /// <param name="selectionLength">Length of the selection in edit control.</param>
  static GetSelectionForDroppedControl(selectionStart: RefParam<number>, selectionLength: RefParam<number>): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.GetSelectionForDroppedControl(selectionStart, selectionLength);
  }

  /// <summary>
  /// To get the drag status.
  /// TRUE : Between -->  Initiate Drag operation(i.e. MOUSE_MOVE) to Actual drag (i.e. control.DoDragDrop).
  /// </summary>
  /// <returns>bool</returns>
  static IsBeginDrag(): boolean {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.IsBeginDrag();
  }

  /// <summary> Returns whether control is focusable or not. </summary>
  /// <param name="guiMgControl"> the control which needs to be checked. </param>
  /// <returns></returns>
  static canFocus(guiMgControl: GuiMgControl): boolean {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.canFocus(guiMgControl);
  }

  /// <summary>
  /// Set Cursor for Print Preview
  /// </summary>
  /// <param name="printPreviewDataPtr"></param>
  static printPreviewSetCursor(printPreviewDataPtr: number): void {
  }

  /// <summary>
  /// Creates Print Preview Form
  /// </summary>
  /// <param name="contextId">context id</param>
  /// <param name="ioPtr">pointer to current IORT object</param>
  /// <param name="copies">number of copies</param>
  /// <param name="enablePDlg">indicates whether to enable Print dialog</param>
  /// <param name="callerForm">caller form of Print Preview</param>
  static printPreviewStart(contextID: number, ioPtr: number, copies: number, enablePDlg: boolean, callerForm: MgFormBase): void {
  }

  /// <summary>
  /// Update Print Preview
  /// </summary>
  /// <param name="prnPrevData">print preview data</param>
  static printPreviewUpdate(prnPrevData: number): void {
  }

  /// <summary>
  /// Create Rich Edit
  /// </summary>
  /// <param name="contextId"></param>
  /// <param name="ctrlPtr"></param>
  /// <param name="prmPtr"></param>
  /// <param name="style"></param>
  /// <param name="dwExStyle"></param>
  static CreateRichWindow(contextID: number, ctrlPtr: number, prmPtr: number, style: number, dwExStyle: number): void {
  }

  /// <summary>
  /// Closes Print Preview form
  /// </summary>
  /// <param name="hWnd"> Print Preview data</param>
  /// <param name="hWnd"> Handle of Print Preview form</param>
  static printPreviewClose(printPreviewData: number, hWnd: number): void {
  }

  /// <summary>
  /// Destroy a window
  /// </summary>
  /// <param name="hWndPtr">Handle of window</param>
  static DestroyGuiWindow(hWndPtr: number): void {
  }

  /// <summary>
  ///  Shows Print Preview Form
  /// </summary>
  /// <param name="hWnd"> Handle of Print Preview form</param>
  static printPreviewShow(ioPtr: number): void {
  }

  /// <summary>
  /// Gets the selected indice from the listbox control.
  /// </summary>
  /// <param name="guiMgControl">GUI mgControl object corresponding to listbox.</param>
  /// <returns>comma seperated string of selected indice</returns>
  static getSelectedIndice(guiMgControl: GuiMgControl): string {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.GetSelectedIndice(guiMgControl);
  }

  /// <summary>
  /// Returns whether the indent has been applied to Rich Edit
  /// </summary>
  /// <param name="guiMgControl"></param>
  /// <returns></returns>
  static getHasIndent(guiMgControl: GuiMgControl): boolean {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.GetHasIndent(guiMgControl);
  }

  /// <summary>
  /// Update the Control.TagData.MapData of a GuiControl with the newObjectToSet
  /// </summary>
  /// <param name="newObjectToSet"></param>
  static MapWidget(newObjectToSet: any): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.MapWidget(newObjectToSet);
  }


  /// <summary>
  /// Returns count of currently opened MDIChilds.
  /// </summary>
  /// <returns></returns>
  static GetMDIChildCount(): number {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.GetMDIChildCount();
  }

  /// <summary>
  /// Activates a next or previous MDI child
  /// </summary>
  /// <param name="nextWindow">indicates whether to activate next window or not</param>
  static ActivateNextOrPreviousMDIChild(nextWindow: boolean): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.ActivateNextOrPreviousMDIChild(nextWindow);
  }

  /// <summary> Clear the data table. </summary>
  /// <param name="dvControl"></param>
  /// <param name="dataTable"></param>
  static ClearDatatable(dvControl: GuiMgControl, dataTable: any): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.ClearDatatable(dvControl, dataTable);
  }

  /// <summary> Set datasource property of dataview control. </summary>
  /// <param name="dvControl"></param>
  /// <param name="dataTable"></param>
  /// <param_name="propertyName"></param>
  static SetDataSourceToDataViewControl(dvControl: GuiMgControl, dataTable: any, propertyName: string): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.SetDataSourceToDataViewControl(dvControl, dataTable, propertyName);
  }

  /// <summary>
  ///   Get Row Position of DataTable attached to DV Control.
  /// </summary>
  /// <param name = "dataTable"></param>
  /// <param name = "line"></param>
  static GetDVControlPositionIsn(dataTable: any, line: number): number {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.GetDVControlPositionIsn(dataTable, line);
  }

  /// <summary>
  ///   OPEN_FORM, DISPOSE_OBJECT REMOVE_CONTROLS EXECUTE_LAYOUT CLOSE_SHELL, REMOVE_ALL_TABLE_ITEMS,
  ///   REMOVE_CONTROLS, INVALIDATE_TABLE, SET_SB_LAYOUT_DATA, SET_WINDOW_ACTIVE
  ///   SET_FRAMESET_LAYOUT_DATA, RESUME_LAYOUT, UPDATE_MENU_VISIBILITY
  ///   ORDER_MG_SPLITTER_CONTAINER_CHILDREN, CLEAR_TABLE_COLUMNS_SORT_MARK, START_TIMER
  /// </summary>
  static addAsync(commandType: CommandType, obj: any): void;

  /// <summary>
  ///   OPEN_FORM, OPEN HELP FORM
  /// </summary>
  static addAsync(commandType: CommandType, obj: any, boolVal: boolean, formName: string): void;

  /// <summary>
  ///  SHOW_FORM
  /// </summary>
  static addAsync(commandType: CommandType, obj: any, boolVal: boolean, isHelpWindow: boolean, formName: string): void;

  /// <summary>
  ///   EXECUTE_LAYOUT, REORDER_FRAME, PROP_SET_SHOW_ICON, SET_FORMSTATE_APPLIED, PROP_SET_FILL_WIDTH
  /// </summary>
  static addAsync(commandType: CommandType, obj: any, boolVal: boolean): void;

  /// <summary>
  ///   ADD_DVCONTROL_HANDLER, REMOVE_DVCONTROL_HANDLER
  /// </summary>
  static addAsync(commandType: CommandType, obj: any, obj1: any): void;

  /// <summary>
  ///   PROP_SET_DEFAULT_BUTTON style : not relevant PROP_SET_SORT_COLUMN
  /// </summary>
  ///   must to be the table control object: must to be the Column control
  /// </param>
  static addAsync(commandType: CommandType, parentObject: any, obj: any, layer: number, line: number, style: number): void;

  /// <summary>
  ///   SELECT_TEXT
  /// </summary>
  static addAsync(commandType: CommandType, obj: any, line: number, num1: number, num2: number, num3: number): void;

  /// <summary>
  ///   CREATE_FORM, CREATE_HELP_FORM
  /// </summary>
  /// <param name = "commandType"></param>
  /// <param name = "parentObject"></param>
  /// <param name = "obj"></param>
  /// <param name = "windowType"></param>
  /// <param name = "formName"></param>
  /// <param name = "isHelpWindow"></param>
  static addAsync(commandType: CommandType, parentObject: any, obj: any, windowType: WindowType, formName: string, isHelpWindow: boolean, createInternalFormForMDI: boolean, shouldBlock: boolean): void;


  /// <summary>
  ///   Applies for: REFRESH_TABLE, SELECT_TEXT, PROP_SET_READ_ONLY, PROP_SET_MODIFIABLE, PROP_SET_ENABLE,
  ///   PROP_SET_CHECKED (Table): PROP_SET_LINE_VISIBLE, PROP_SET_RESIZABLE, SET_FOCUS, PROP_SET_MOVEABLE
  ///   PROP_SET_SORTABLE_COLUMN
  ///   PROP_SET_MENU_DISPLAY, PROP_SET_TOOLBAR_DISPLAY PROP_HORIZONTAL_PLACEMENT, PROP_VERTICAL_PLACEMENT
  ///   PROP_SET_MULTILINE, PROP_SET_PASSWORD_EDIT, PROP_SET_MULTILINE_VERTICAL_SCROLL, PROP_SET_BORDER,
  ///   CHANGE_COLUMN_SORT_MARK.
  /// </summary>
  /// <param name = "commandType"></param>
  /// <param name = "obj"></param>
  /// <param name = "number">
  ///   If command type is <code>CHANGE_COLUMN_SORT_MARK</code> then number means direction.
  ///   Otherwise it means line.
  /// </param>
  /// <param name = "boolVal">
  ///   If command type is <code>CHANGE_COLUMN_SORT_MARK</code> this value is ignored.
  /// </param>
  static addAsync(commandType: CommandType, obj: any, number: number, boolVal: boolean): void;

  /// <summary>
  ///   PROP_SET_VISIBLE, SET_ACTIVETE_KEYBOARD_LAYOUT
  /// </summary>
  static addAsync(commandType: CommandType, obj: any, number: number, boolVal: boolean, executeParentLayout: boolean): void;

  /// <summary>
  ///    PROP_SET_PLACEMENT
  ///   subformAsControl isn't relevant, need to be false
  /// </summary>
  /// <param name="x"></param>
  /// <param name="y"></param>
  /// <param name="width"></param>
  /// <param name="height"></param>
  /// <param name="boolVal"></param>
  /// <param name="bool1"></param>
  static addAsync(commandType: CommandType, obj: any, line: number, x: number, y: number, width: number, height: number, boolVal: boolean, bool1: boolean): void;

  /// <summary>
  /// REGISTER_DN_CTRL_VALUE_CHANGED_EVENT
  /// </summary>
  /// <param name="commandType"></param>
  /// <param name="obj"></param>
  /// <param name="eventName"></param>
  static addAsync(commandType: CommandType, obj: any, eventName: string): void;

  /// <summary>
  ///   PROP_SET_SELECTION PROP_SET_TEXT_SIZE_LIMIT, PROP_SET_VISIBLE_LINES, PROP_SET_MIN_WIDTH, PROP_SET_MIN_HEIGHT,
  ///   SET_WINDOW_STATE, VALIDATE_TABLE_ROW, SET_ORG_COLUMN_WIDTH, PROP_SET_COLOR_BY,
  ///   PROP_SET_TRANSLATOR, PROP_SET_HORIZANTAL_ALIGNMENT, PROP_SET_MULTILINE_WORDWRAP_SCROLL
  /// </summary>
  /// <param name="obj"></param>
  /// <param name="commandType"></param>
  /// <param name="number"></param>
  static addAsync(commandType: CommandType, obj: any, line: number, number: number): void;

  /// <summary>
  ///   INSERT_ROWS, REMOVE_ROWS
  /// </summary>
  /// <param name = "commandType"></param>
  /// <param name = "obj"></param>
  /// <param name = "line"></param>
  /// <param name = "objectValue1"></param>
  /// <param name = "objectValue2"></param>
  /// <param name = "boolVal"></param>
  static addAsync(commandType: CommandType, obj: any, line: number, objectValue1: any, objectValue2: any, boolVal: boolean): void;

  /// <summary>
  /// PROP_SET_FOCUS_COLOR, PROP_SET_HOVERING_COLOR, PROP_SET_VISITED_COLOR
  /// </summary>
  /// <param name="commandType"></param>
  /// <param name="obj"></param>
  /// <param name="line"></param>
  /// <param name="objectValue1"></param>
  /// <param name="objectValue2"></param>
  /// <param name="intVal"></param>
  static addAsync(commandType: CommandType, obj: any, line: number, objectValue1: any, objectValue2: any, intVal: number): void;

  /// <summary>
  ///   PROP_SET_VISITED_COLOR, PROP_SET_HOVERING_COLOR, PROP_SET_GRADIENT_COLOR, PROP_SET_FOCUS_COLOR
  /// </summary>
  /// <param name = "commandType"></param>
  /// <param name = "obj"></param>
  /// <param name = "line"></param>
  /// <param name = "objectValue1"></param>
  /// <param name = "objectValue2"></param>
  static addAsync(commandType: CommandType, obj: any, line: number, objectValue1: any, objectValue2: any): void;

  /// <summary>
  ///   PROP_SET_BACKGOUND_COLOR, PROP_SET_FOREGROUND_COLOR, PROP_SET_FONT, PROP_SET_ALTENATING_COLOR
  ///   PROP_SET_STARTUP_POSITION, CREATE_ENTRY_IN_CONTROLS_MAP
  /// </summary>
  ///   PROP_SET_FORM_BORDER_STYLE,SET_ALIGNMENT, SET_FRAMES_WIDTH, SET_FRAMES_HEIGHT, REORDER_COLUMNS
  /// </param>
  static addAsync(commandType: CommandType, obj: any, line: number, objectValue: any): void;

  /// <summary>
  ///   PROP_SET_TOOLTIP, PROP_SET_TEXT style: not relevant PROP_SET_WALLPAPER PROP_SET_IMAGE_FILE_NAME
  ///   PROP_SET_URL, PROP_SET_ICON_FILE_NAME : style isn't relevant
  /// </summary>
  static addAsync(commandType: CommandType, obj: any, line: number, str: string, style: number): void;

  /// <summary>
  /// DRAG_SET_DATA.
  /// </summary>
  static addAsync(commandType: CommandType, obj: any, line: number, str: string, userDropFormat: string, style: number): void;

   /// <summary>
  ///   PROP_SET_ITEMS_LIST
  /// </summary>
  static addAsync(commandType: CommandType, obj: any, line: number, displayList: string[], bool1: boolean): void;

  /// <summary>
  ///   PROP_SET_MENU, REFRESH_MENU_ACTIONS
  /// </summary>
  static addAsync(commandType: CommandType, parentObj: any, containerForm: GuiMgForm, menuStyle: MenuStyle, guiMgMenu: GuiMgMenu, parentTypeForm: boolean): void;

  /// <summary>
  ///   CREATE_MENU
  /// </summary>
  static addAsync(commandType: CommandType, parentObj: any, containerForm: GuiMgForm, menuStyle: MenuStyle, guiMgMenu: GuiMgMenu, parentTypeForm: boolean, shouldShowPulldownMenu: boolean): void;

  /// <summary>
  ///   CREATE_MENU_ITEM
  /// </summary>
  /// <param name = "commandType"> </param>
  /// <param name = "parentObj"> </param>
  /// <param name = "menuStyle"> </param>
  /// <param name = "menuEntry"> </param>
  /// <param name = "guiMgForm"> </param>
  /// <param name = "index"> </param>
  static addAsync(commandType: CommandType, parentObj: any, menuStyle: MenuStyle, menuEntry: GuiMenuEntry, guiMgForm: GuiMgForm, index: number): void;

  /// <summary>
  ///   PROP_SET_CHECKED PROP_SET_ENABLE PROP_SET_VISIBLE PROP_SET_MENU_ENABLE PROP_SET_MENU_VISIBLE Above
  ///   properties for menu entry
  /// </summary>
  /// <param name = "commandType"> </param>
  /// <param name = "mnuRef"></param>
  /// <param name = "menuEntry"> </param>
  /// <param name = "val"> </param>
  static addAsync(commandType: CommandType, mnuRef: MenuReference, menuEntry: GuiMenuEntry, val: any): void;

  /// <summary>
  ///   DELETE_MENU_ITEM
  /// </summary>
  /// <param name = "commandType"> </param>
  /// <param name = "parentObj"> </param>
  /// <param name = "menuStyle"> </param>
  /// <param name = "menuEntry"> </param>
  static addAsync(commandType: CommandType, parentObj: any, menuStyle: MenuStyle, menuEntry: GuiMenuEntry): void;

  /// <summary>
  ///   CREATE_TOOLBAR, REFRESH_TOOLBAR
  /// </summary>
  /// <param name = "commandType"> </param>
  /// <param name = "form"> </param>
  /// <param name = "newToolbar"> </param>
  static addAsync(commandType: CommandType, form: GuiMgForm, newToolbar: any): void;

  /// <summary>
  ///   CREATE_TOOLBAR_ITEM, DELETE_TOOLBAR_ITEM
  /// </summary>
  /// <param name = "commandType"> </param>
  /// <param name = "toolbar">is the ToolBar to which we add a new item (placed in parentObject) </param>
  /// <param name = "menuEntry">is the menuEntry for which we create this toolitem </param>
  /// <param name = "index">is the index of the new object in the toolbar (placed in line) </param>
  static addAsync(commandType: CommandType, toolbar: any, form: GuiMgForm, menuEntry: GuiMenuEntry, index: number): void;

  static addAsync(commandType: CommandType, objOrParentObjectOrMnuRefOrFormOrToolbar?: any, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm?: any, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal?: any, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex?: any, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex?: any, createInternalFormForMDIOrCtrlListOrHeightOrShouldShowPulldownMenu?: any, shouldBlockOrColumnCountOrBoolVal?: any, boolValOrBool1?: boolean, boolVal1?: boolean, number1?: number, number2?: number, obj1?: any, isParentHelpWindow?: boolean, dockingStyle?: DockingStyle): void {
    if (arguments.length === 2)
      Commands.addAsync_1(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar);

    else if (arguments.length === 4 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Boolean) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === String))
      Commands.addAsync_2(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal);

    else if (arguments.length === 5 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Boolean) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Boolean) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === String))
      Commands.addAsync_3(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex);

    else if (arguments.length === 3 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Boolean))
      Commands.addAsync_4(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm);

    else if (arguments.length === 3 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Object))
      Commands.addAsync_5(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm);

    else if (arguments.length === 6 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Object) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Number) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === Number) && (styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex === null || styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex.constructor === Number))
      Commands.addAsync_6(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex);

    else if (arguments.length === 6 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Number) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === Number) && (styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex === null || styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex.constructor === Number))
      Commands.addAsync_7(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex);

    else if (arguments.length === 8)
      Commands.addAsync_8(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex, createInternalFormForMDIOrCtrlListOrHeightOrShouldShowPulldownMenu, shouldBlockOrColumnCountOrBoolVal);

    else if (arguments.length === 4 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Boolean))
      Commands.addAsync_11(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal);

    else if (arguments.length === 5 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Boolean) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === Boolean))
      Commands.addAsync_12(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex);

    else if (arguments.length === 9)
      Commands.addAsync_13(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex, createInternalFormForMDIOrCtrlListOrHeightOrShouldShowPulldownMenu, shouldBlockOrColumnCountOrBoolVal, boolValOrBool1);

    else if (arguments.length === 3 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === String))
      Commands.addAsync_14(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm);

    else if (arguments.length === 4 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Number))
      Commands.addAsync_15(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal);

    else if (arguments.length === 6 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Object) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === Object) && (styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex === null || styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex.constructor === Boolean))
      Commands.addAsync_16(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex);

    else if (arguments.length === 6 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Object) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === Object) && (styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex === null || styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex.constructor === Number))
      Commands.addAsync_17(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex);

    else if (arguments.length === 5 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Object) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === Object))
      Commands.addAsync_18(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex);

    else if (arguments.length === 4 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Object))
      Commands.addAsync_19(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal);

    else if (arguments.length === 5 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === String) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === Number))
      Commands.addAsync_20(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex);

    else if (arguments.length === 6 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === String) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === String) && (styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex === null || styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex.constructor === Number))
      Commands.addAsync_21(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex);

    else if (arguments.length === 5 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal instanceof Array) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === Number))
      Commands.addAsync_22(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex);

    else if (arguments.length === 5 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal instanceof Array) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === Boolean))
      Commands.addAsync_23(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex);

    else if (arguments.length === 6 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm instanceof GuiMgForm) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Number) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex instanceof GuiMgMenu) && (styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex === null || styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex.constructor === Boolean))
      Commands.addAsync_24(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex);

    else if (arguments.length === 7)
      Commands.addAsync_25(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex, createInternalFormForMDIOrCtrlListOrHeightOrShouldShowPulldownMenu);

    else if (arguments.length === 6 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal instanceof GuiMenuEntry) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex instanceof GuiMgForm) && (styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex === null || styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex.constructor === Number))
      Commands.addAsync_26(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBoolValOrIntValOrParentTypeFormOrIndex);

    else if (arguments.length === 4 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar instanceof MenuReference) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm instanceof GuiMenuEntry) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Object))
      Commands.addAsync_27(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal);

    else if (arguments.length === 4 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal instanceof GuiMenuEntry))
      Commands.addAsync_28(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal);

    else if (arguments.length === 3 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar instanceof GuiMgForm) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Object))
      Commands.addAsync_29(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm);
    else
      Commands.addAsync_30(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex);
  }


  private static addAsync_1(commandType: CommandType, obj: any): void {
    GuiCommandQueue.getInstance().add(commandType, obj);
  }

  private static addAsync_2(commandType: CommandType, obj: any, boolVal: boolean, formName: string): void {
    GuiCommandQueue.getInstance().add(commandType, obj, boolVal, formName);
  }

  private static addAsync_3(commandType: CommandType, obj: any, boolVal: boolean, isHelpWindow: boolean, formName: string): void {
    GuiCommandQueue.getInstance().add(commandType, obj, boolVal, isHelpWindow, formName);
  }

  private static addAsync_4(commandType: CommandType, obj: any, boolVal: boolean): void {
    GuiCommandQueue.getInstance().add(commandType, obj, boolVal);
  }

  private static addAsync_5(commandType: CommandType, obj: any, obj1: any): void {
    GuiCommandQueue.getInstance().add(commandType, obj, obj1);
  }

  private static addAsync_6(commandType: CommandType, parentObject: any, obj: any, layer: number, line: number, style: number): void {
    GuiCommandQueue.getInstance().add(commandType, parentObject, obj, layer, line, style);
  }

  private static addAsync_7(commandType: CommandType, obj: any, line: number, num1: number, num2: number, num3: number): void {
    GuiCommandQueue.getInstance().add(commandType, obj, line, num1, num2, num3);
  }

  private static addAsync_8(commandType: CommandType, parentObject: any, obj: any, windowType: WindowType, formName: string, isHelpWindow: boolean, createInternalFormForMDI: boolean, shouldBlock: boolean): void {
    GuiCommandQueue.getInstance().add(commandType, parentObject, obj, windowType, formName, isHelpWindow, createInternalFormForMDI, shouldBlock);
  }

  private static addAsync_11(commandType: CommandType, obj: any, number: number, boolVal: boolean): void {
    GuiCommandQueue.getInstance().add(commandType, obj, number, boolVal);
  }

  private static addAsync_12(commandType: CommandType, obj: any, number: number, boolVal: boolean, executeParentLayout: boolean): void {
    GuiCommandQueue.getInstance().add(commandType, obj, number, boolVal, executeParentLayout);
  }

  private static addAsync_13(commandType: CommandType, obj: any, line: number, x: number, y: number, width: number, height: number, boolVal: boolean, bool1: boolean): void {
    GuiCommandQueue.getInstance().add(commandType, obj, line, x, y, width, height, boolVal, bool1);
  }

  private static addAsync_14(commandType: CommandType, obj: any, eventName: string): void {
    GuiCommandQueue.getInstance().add(commandType, obj, eventName);
  }

  private static addAsync_15(commandType: CommandType, obj: any, line: number, number: number): void {
    GuiCommandQueue.getInstance().add(commandType, obj, line, number);
  }

  private static addAsync_16(commandType: CommandType, obj: any, line: number, objectValue1: any, objectValue2: any, boolVal: boolean): void {
    GuiCommandQueue.getInstance().add(commandType, obj, line, objectValue1, objectValue2, boolVal);
  }

  private static addAsync_17(commandType: CommandType, obj: any, line: number, objectValue1: any, objectValue2: any, intVal: number): void {
    GuiCommandQueue.getInstance().add(commandType, obj, line, objectValue1, objectValue2, intVal);
  }

  private static addAsync_18(commandType: CommandType, obj: any, line: number, objectValue1: any, objectValue2: any): void {
    GuiCommandQueue.getInstance().add(commandType, obj, line, objectValue1, objectValue2);
  }

  private static addAsync_19(commandType: CommandType, obj: any, line: number, objectValue: any): void {
    GuiCommandQueue.getInstance().add(commandType, obj, line, objectValue);
  }

  private static addAsync_20(commandType: CommandType, obj: any, line: number, str: string, style: number): void {
    GuiCommandQueue.getInstance().add(commandType, obj, line, str, style);
  }

  private static addAsync_21(commandType: CommandType, obj: any, line: number, str: string, userDropFormat: string, style: number): void {
    GuiCommandQueue.getInstance().add(commandType, obj, line, str, userDropFormat, style);
  }

  private static addAsync_22(commandType: CommandType, obj: any, line: number, byteArray: number[], style: number): void {
    GuiCommandQueue.getInstance().add(commandType, obj, line, byteArray, style);
  }

  private static addAsync_23(commandType: CommandType, obj: any, line: number, displayList: string[], bool1: boolean): void {
    GuiCommandQueue.getInstance().add(commandType, obj, line, displayList, bool1);
  }

  private static addAsync_24(commandType: CommandType, parentObj: any, containerForm: GuiMgForm, menuStyle: MenuStyle, guiMgMenu: GuiMgMenu, parentTypeForm: boolean): void {
    GuiCommandQueue.getInstance().add(commandType, parentObj, containerForm, menuStyle, guiMgMenu, parentTypeForm);
  }

  private static addAsync_25(commandType: CommandType, parentObj: any, containerForm: GuiMgForm, menuStyle: MenuStyle, guiMgMenu: GuiMgMenu, parentTypeForm: boolean, shouldShowPulldownMenu: boolean): void {
    GuiCommandQueue.getInstance().add(commandType, parentObj, containerForm, menuStyle, guiMgMenu, parentTypeForm, shouldShowPulldownMenu);
  }

  private static addAsync_26(commandType: CommandType, parentObj: any, menuStyle: MenuStyle, menuEntry: GuiMenuEntry, guiMgForm: GuiMgForm, index: number): void {
    GuiCommandQueue.getInstance().add(commandType, parentObj, menuStyle, menuEntry, guiMgForm, index);
  }

  private static addAsync_27(commandType: CommandType, mnuRef: MenuReference, menuEntry: GuiMenuEntry, val: any): void {
    GuiCommandQueue.getInstance().add(commandType, mnuRef, menuEntry, val);
  }

  private static addAsync_28(commandType: CommandType, parentObj: any, menuStyle: MenuStyle, menuEntry: GuiMenuEntry): void {
    GuiCommandQueue.getInstance().add(commandType, parentObj, menuStyle, menuEntry);
  }

  private static addAsync_29(commandType: CommandType, form: GuiMgForm, newToolbar: any): void {
    GuiCommandQueue.getInstance().add(commandType, form, newToolbar);
  }

  private static addAsync_30(commandType: CommandType, toolbar: any, form: GuiMgForm, menuEntry: GuiMenuEntry, index: number): void {
    GuiCommandQueue.getInstance().add(commandType, toolbar, form, menuEntry, index);
  }

  static addBoolWithLine(commandType: CommandType, obj: any, line: number, bool: boolean): void {
    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    guiCommand.Bool1 = bool;
    guiCommand.line = line;
    GuiCommandQueue.getInstance().addCommand(guiCommand);
  }

  static addNoParameters(commandType: CommandType, obj: any): void {
    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    GuiCommandQueue.getInstance().addCommand(guiCommand);
  }
  static addWithNumber(commandType: CommandType, obj: any, num: number): void {
    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    guiCommand.number = num;
    GuiCommandQueue.getInstance().addCommand(guiCommand);
  }

  static addStringWithLine(commandType: CommandType, obj: any, line: number, str: string): void {
    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    guiCommand.str = str;
    guiCommand.line = line;
    GuiCommandQueue.getInstance().addCommand(guiCommand);
  }

  static addValueWithLine(commandType: CommandType, obj: any, line: number, value: any): void {
    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    guiCommand.value = value;
    guiCommand.line = line;
    GuiCommandQueue.getInstance().addCommand(guiCommand);
  }


  static addOperationWithLine(commandType: CommandType, obj: any, line: number, operation: string, value: any): void {
    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    guiCommand.obj1 = value;
    guiCommand.line = line;
    guiCommand.Operation = operation;
    GuiCommandQueue.getInstance().addCommand(guiCommand);
  }


  static addOpensubform(commandType:CommandType, obj:Object, calledTaskTag:string, subformControlName:string, formName:string, inputControls:string, routerPath: string, routerParams:List<any>, inDefaultRouterOutlet: boolean): void
  {
    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    guiCommand.str = calledTaskTag;
    guiCommand.obj1 = subformControlName;
    guiCommand.userDropFormat = formName;
    guiCommand.fileName = inputControls;
    guiCommand.Bool1 = inDefaultRouterOutlet;
    guiCommand.contextID = routerPath;
    guiCommand.params = routerParams;
    GuiCommandQueue.getInstance().addCommand(guiCommand);
  }

  static addOpenForm(obj: Object, formName: string, handlerTaskTag: string, calledTaskTag: string, inputControls: string, isDialog: boolean): void
  {
    let guiCommand: GuiCommand = new GuiCommand(obj, CommandType.OPEN_FORM);
    guiCommand.TaskTag = handlerTaskTag;
    guiCommand.str = formName;
    guiCommand.stringList = new List<string>();
    guiCommand.stringList.push(calledTaskTag);
    guiCommand.stringList.push(inputControls);
    guiCommand.Bool1 = isDialog;
    GuiCommandQueue.getInstance().addCommand(guiCommand);
  }

  static addCloseForm(obj: Object, handlerTaskTag: string, calledTaskTag: string): void
  {
    let guiCommand: GuiCommand = new GuiCommand(obj, CommandType.CLOSE_FORM);
    guiCommand.TaskTag = handlerTaskTag;
    guiCommand.str = calledTaskTag;
    GuiCommandQueue.getInstance().addCommand(guiCommand);
  }

  /// <summary>
  ///   execute all pending commands, asynchronously
  /// </summary>
  static beginInvoke(): void {
    GuiCommandQueue.getInstance().beginInvoke();
  }

  /// <summary>
  ///   execute all pending commands, synchronously
  /// </summary>
  static invoke(): void {
    GuiCommandQueue.getInstance().invoke();
  }

  // <summary> returns if passed form is active </summary>
  // <param name="guiMgForm"></param>
  // <returns></returns>
  static isFormActive(guiMgForm: GuiMgForm): boolean {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.isFormActive(guiMgForm);
  }

  /// <summary>
  /// Activate the guiMgForm.
  /// </summary>
  /// <param name="guiMgForm"></param>
  static ActivateForm(guiMgForm: GuiMgForm): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.ActivateForm(guiMgForm);
  }

  ///<summary>
  ///  Check whether the combobox is in dropped down state or not.
  ///</summary>
  ///<param name="control"></param>
  ///<param name="line"></param>
  ///<returns></returns>
  static IsComboBoxInDroppedDownState(control: GuiMgControl, line: number): boolean {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    return guiInteractive.IsComboBoxInDroppedDownState(control, line);
  }

  /// <summary>
  /// Show Context Menu.
  /// </summary>
  /// <param name="guiMgControl"></param>
  /// <param name="guiMgForm"></param>
  /// <param name="left"></param>
  /// <param name="top"></param>
  static ShowContextMenu(guiMgControl: GuiMgControl, guiMgForm: GuiMgForm, left: number, top: number, line: number): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.onShowContextMenu(guiMgControl, guiMgForm, left, top, line);
  }

  /// <summary>
  /// Enable/Disable MenuItem
  /// </summary>
  /// <param name="mnuRef"></param>
  /// <param name="enable"></param>
  static EnableMenuEntry(mnuRef: MenuReference, enable: boolean): void {
    let guiInteractive: GuiInteractive = new GuiInteractive();
    guiInteractive.EnableMenuEntry(mnuRef, enable);
  }

  /// <summary>
  /// Activates Print Preview form
  /// </summary>
  static ActivatePrintPreview(): void {
  }

  constructor() {
  }
}
