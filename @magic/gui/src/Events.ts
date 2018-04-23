import {GuiMgControl} from "./gui/GuiMgControl";
import {MgFormBase} from "./management/gui/MgFormBase";
import {ITask} from "./management/tasks/ITask";
import {MgControlBase} from "./management/gui/MgControlBase";
import {RuntimeContextBase} from "./management/RuntimeContextBase";
import {GuiMgForm} from "./gui/GuiMgForm";
import {TaskBase} from "./management/tasks/TaskBase";
import {Debug, Exception, List, NString, StringBuilder} from "@magic/mscorelib";
import {MenuStyle, Modifiers} from "./GuiEnums";
import {MgTimer} from "./management/tasks/MgTimer";
import {LastFocusedVal} from "./gui/LastFocusedVal";
import {GuiMenuEntry} from "./gui/GuiMenuEntry";
import {MenuEntryProgram} from "./management/gui/MenuEntryProgram";
import {MenuEntryEvent} from "./management/gui/MenuEntryEvent";
import {MenuEntryOSCommand} from "./management/gui/MenuEntryOSCommand";
import {GuiMgMenu} from "./gui/GuiMgMenu";
import {ApplicationMenus} from "./management/gui/ApplicationMenus";
import {Logger_LogLevels, OSEnvironment} from "@magic/utils";

/// <summary>events raised by MgGui.dll and handled by MgxpaRIA.exe or MgxpaRuntime.exe.
/// Important note: these events are NOT related the events handling of Magic (RC or RTE) -
///   the events exposed from this class contain functionality that the current assembly (MgGui.dll)
///   requires from either MgxpaRIA.exe or MgxpaRuntime.exe.
/// This class contains only the definitions of all delegates and events.
/// Class 'EventsProcessor' contains handlers for events that can be served locally (by MgGui.dll),
///   and registered external handlers (in MgxpaRIA.exe or MgxpaRuntime.exe) for events that can't be served locally.
/// </summary>
export class Events {
  /// <summary> invokes the VisibilityChanged Event</summary>
  /// <param name="ctrl">control whose visibility is changed</param>
  static NonParkableLastParkedCtrlEvent: (ctrl: GuiMgControl) => void = null;

  /// <summary>
  /// returns TRUE, if Batch task is running in MAIN context.
  /// </summary>
  static IsBatchRunningInMainContextEvent: () => boolean = null;

  /// <summary>MLS translation</summary>
  /// <param name="fromString">source string</param>
  /// <returns>translated string</returns>
  static TranslateEvent: (fromString: string) => string = null;

  /// <summary>
  /// Creates Print Preview Form
  /// </summary>
  /// <param name="contextId">context id</param>
  /// <param name="ioPtr">pointer to current IORT object</param>
  /// <param name="copies">number of copies</param>
  /// <param name="enablePDlg">indicates whether to enable Print dialog</param>
  /// <param name="hWnd">Handle of Print Preview Form</param>
  static PrintPreviewStartEvent: (contextID: number, ioPtr: number, copies: number, enablePDlg: boolean, hWnd: number) => void = null;

  /// <summary>
  /// Set cursor to Print Preview form
  /// </summary>
  /// <param name="prnPrevData">print preview data</param>
  static PrintPreviewSetCursorEvent: (printPreviewData: number) => void = null;

  ///<summary>
  /// Handles Invoke UDP operation from GUI thread
  ///</summary>
  ///<param name="contextId">Context id</param>
  static InvokeUDPEvent: (contextId: number) => number = null;

  /// <summary>
  /// Update Print Preview
  /// </summary>
  /// <param name="prnPrevData">print preview data</param>
  static PrintPreviewUpdateEvent: (prnPrevData: number) => void = null;

  /// <summary>
  /// Create Rich Edit
  /// </summary>
  /// <param name="contextId"></param>
  /// <param name="ctrlPtr"></param>
  /// <param name="prmPtr"></param>
  /// <param name="style"></param>
  /// <param name="dwExStyle"></param>
  static CreateRichWindowEvent: (contextID: number, ctrlPtr: number, prmPtr: number, style: number, dwExStyle: number) => void = null;

  ///<summary>
  ///  Creates a window
  ///</summary>
  ///<param name="exStyle">!!.</param>
  ///<param name="className">!!.</param>
  ///<param name="windowName">!!.</param>
  ///<param name="style">!!.</param>
  ///<param name="x">!!.</param>
  ///<param name="y">!!.</param>
  ///<param name="width">!!.</param>
  ///<param name="height">!!.</param>
  ///<param name="hwndParent">!!.</param>
  ///<param name="hMenu">!!.</param>
  ///<param name="hInstance">!!.</param>
  ///<param name="lParam">!!.</param>
  ///<returns>handle of window</returns>
  static CreateGuiWindowEvent: (exStyle: number, className: string, windowName: string, style: number, x: number, y: number, width: number, height: number, hwndParent: number, hMenu: number, hInstance: number, lParam: number) => number = null;

  /// <summary>
  /// Destroys a window
  /// </summary>
  /// <param name="hWndPtr">handle of window</param>
  static DestroyGuiWindowEvent: (hWndPtr: number) => void = null;

  /// <summary>
  /// OnClose Print Preview
  /// </summary>
  /// <param name="hWndPtr">print preview data</param>
  static PrintPreviewCloseEvent: (hWndPtr: number) => void = null;

  /// <summary>
  /// Show Print Dialog
  /// </summary>
  /// <param name="gpd"></param>
  static ShowPrintDialogEvent: (gpd: number) => number = null;

  /// <summary>
  /// SetModal event
  /// </summary>
  /// <param name="currForm"></param>
  /// <param name="on"></param>
  static SetModalEvent: (mgForm: MgFormBase, on: boolean) => void = null;

  /// <summary>raises CtrlFocusEvent</summary>
  /// <returns></returns>
  static CtrlFocusEvent: (iTask: ITask, ctrl: MgControlBase) => void = null;

  /// <summary>get Current processing task</summary>
  /// <returns></returns>
  static GetCurrentTaskEvent: () => ITask = null;

  /// <summary>
  /// Gets the RuntimeContextBase that belongs to the contextID
  /// </summary>
  /// <param name="contextID"></param>
  /// <returns></returns>
  static GetRuntimeContextEvent: (contextID: string) => RuntimeContextBase = null;

  /// <summary>
  /// Saves the name of the last clicked control.
  /// </summary>
  /// <param name="guiMgControl">guiMgControl</param>
  /// <param name="controlName">Name of the control</param>
  static SaveLastClickedCtrlEvent: (guiMgControl: GuiMgControl, controlName: string) => void = null;

  /// <summary>
  /// Saves the last clicked information. (i.e. Co-ordinates and control name.
  /// </summary>
  /// <param name="guiMgForm">guiMgForm</param>
  /// <param name="controlName">name of the control</param>
  /// <param name="x"></param>
  /// <param name="y"></param>
  /// <param name="offsetX"></param>
  /// <param name="offsetY"></param>
  /// <param name="lastClickCoordinatesAreInPixels">co-ordinates are in pixel or not.</param>
  static SaveLastClickInfoEvent: (guiMgForm: GuiMgForm, controlName: string, x: number, y: number, offsetX: number, offsetY: number, lastClickCoordinatesAreInPixels: boolean) => void = null;

  /// <summary>write an error message to the internal log file</summary>
  /// <param name="msg"></param>
  static WriteErrorToLogEvent: (msg: string) => void = null;

  /// <summary>Write an internal error to the log. Also prints stack trace along with the message</summary>
  /// <param name="msg"></param>
  static WriteExceptionToLogEvent: (msg: string) => void = null;


  /// <summary>write a warning message to the internal log file</summary>
  /// <param name="msg"></param>
  static WriteWarningToLogEvent: (msg: string) => void = null;

  /// <summary>
  ///
  /// </summary>
  /// <param name="logLevel"></param>
  /// <returns></returns>
  static ShouldLogEvent: (logLevel: Logger_LogLevels) => boolean = null;

  /// <summary>write a GUI message to the internal log file</summary>
  /// <param name="msg"></param>
  static WriteGuiToLogEvent: (msg: string) => void = null;

  /// <summary>write a DEV message to the internal log file</summary>
  /// <param name="msg"></param>
  static WriteDevToLogEvent: (msg: string) => void = null;

  /// <summary>
  /// Called when WM_CUT message is received
  /// </summary>
  /// <param name="ctrl"></param>
  static CutEvent: (ctrl: GuiMgControl) => void = null;

  /// <summary>
  /// Called when WM_COPY message is received
  /// </summary>
  /// <param name="ctrl"></param>
  static CopyEvent: (ctrl: GuiMgControl) => void = null;

  /// <summary>
  /// Called when WM_PASTE message is received
  /// </summary>
  /// <param name="ctrl"></param>
  static PasteEvent: (ctrl: GuiMgControl) => void = null;

  /// <summary>
  /// Called when WM_CLEAR message is received
  /// </summary>
  /// <param name="ctrl"></param>
  static ClearEvent: (ctrl: GuiMgControl) => void = null;

  /// <summary>
  /// Called when WM_UNDO message is received
  /// </summary>
  /// <param name="ctrl"></param>
  static UndoEvent: (ctrl: GuiMgControl) => void = null;

  /// <summary>
  /// Should Enter be added as keyboard event ? This is important mostly in determining if a click event
  /// will be raised for a default button or not.
  /// Adding Enter as a keyboard event will not raise click on default button.
  /// </summary>
  /// <returns></returns>
  static ShouldAddEnterAsKeyEvent: () => boolean = null;

  /// <summary>
  /// </summary>
  static ShowSessionStatisticsEvent: () => void = null;

  /// <summary>
  /// Called when WM_COPYDATA message is received
  /// </summary>
  /// <param name="guiMgForm"></param>
  /// <param name="copyData"></param>
  static CopyDataEvent: (guiMgForm: GuiMgForm, copyData: number) => void = null;

  /// <summary> invokes the focus event</summary>
  /// <param name="ctrl"></param>
  /// <param name="line"></param>
  /// <param name="isProduceClick"></param>
  static FocusEvent: (ctrl: GuiMgControl, line: number, isProduceClick: boolean, onMultiMark: boolean) => void = null;

  /// <summary> invokes the MouseDown Event</summary>
  /// <param name="guiMgForm"></param>
  /// <param name="guiMgCtrl"></param>
  /// <param name="dotNetArgs"></param>
  /// <param name="leftClickWasPressed"></param>
  /// <param name="line"></param>
  /// <param name="onMultiMark">indicates that Multi Mark continues</param>
  static MouseDownEvent: (guiMgForm: GuiMgForm, guiMgCtrl: GuiMgControl, dotNetArgs: Object[], leftClickWasPressed: boolean, line: number, onMultiMark: boolean, canProduceClick: boolean) => void = null;

  /// <summary> invokes the MouseOver Event</summary>
  /// <param name="ctrl"></param>
  static MouseOverEvent: (ctrl: GuiMgControl) => void = null;

  /// <summary> invokes Press Event</summary>
  /// <param name="guiMgForm"></param>
  /// <param name="guiMgCtrl"></param>
  /// <param name="line"></param>
  static PressEvent: (guiMgForm: GuiMgForm, guiMgCtrl: GuiMgControl, line: number) => void = null;

  /// <summary> invokes the EditNode Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="line"></param>
  static EditNodeEvent: (ctrl: GuiMgControl, line: number) => void = null;

  /// <summary> invokes the EditNodeExit Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="line"></param>
  static EditNodeExitEvent: (ctrl: GuiMgControl, line: number) => void = null;

  /// <summary> invokes the Collapse Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="line"></param>
  static CollapseEvent: (ctrl: GuiMgControl, line: number) => void = null;

  /// <summary> invokes the Expand Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="line"></param>
  static ExpandEvent: (ctrl: GuiMgControl, line: number) => void = null;

  /// <summary> invokes the TableReorder Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="tabOrderList"></param>
  static TableReorderEvent: (ctrl: GuiMgControl, tabOrderList: List<GuiMgControl>) => void = null;

  /// <summary> invokes the MouseOut Event</summary>
  /// <param name="ctrl"></param>
  static MouseOutEvent: (ctrl: GuiMgControl) => void = null;

  /// <summary> invokes the MouseUp Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="line"></param>
  static MouseUpEvent: (ctrl: GuiMgControl, line: number) => void = null;

  /// <summary> invokes the ComboDroppingDown Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="line"></param>
  static ComboDroppingDownEvent: (ctrl: GuiMgControl, line: number) => void = null;

  /// <summary> invokes the Selection Event</summary>
  /// <param name="val"></param>
  /// <param name="ctrl"></param>
  /// <param name="line"></param>
  /// <param name="produceClick"></param>
  static SelectionEvent: (val: string, ctrl: GuiMgControl, line: number, produceClick: boolean) => void = null;

  /// <summary> invokes the DblClick Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="line"></param>
  static DblClickEvent: (ctrl: GuiMgControl, line: number) => void = null;

  /// <summary> invokes the KeyDown Event</summary>
  /// <param name="form"></param>
  /// <param name="guiMgCtrl"></param>
  /// <param name="modifier"></param>
  /// <param name="keyCode"></param>
  /// <param name="start"></param>
  /// <param name="end"></param>
  /// <param name="text"></param>
  /// <param name="im"></param>
  /// <param name="isActChar"></param>
  /// <param name="suggestedValue"></param>
  /// <param name="comboIsDropDown"></param>
  /// <param name="handled">boolean variable event is handled or not. </param>
  static KeyDownEvent: (form: GuiMgForm, guiMgCtrl: GuiMgControl, modifier: Modifiers, keyCode: number, start: number, end: number, text: string, isActChar: boolean, suggestedValue: string, comboIsDropDown: boolean, handled: boolean) => boolean = null;

  /// <summary>
  /// delegate for the MultiMark hit event
  /// </summary>
  /// <param name="guiMgCtrl"> control </param>
  /// <param name="row"> table row </param>
  static MultimarkHitEvent: (guiMgCtrl: GuiMgControl, row: number, modifier: Modifiers) => void = null;

  /// <summary> invokes the Close Event</summary>
  /// <param name="form"></param>
  /// <returns>true if event is CLR handled(closing of the form will be the responsibility of the CLR and no commands will be put
  /// in to close the form) else false.</returns>
  static CloseFormEvent: (form: GuiMgForm) => boolean = null;

  /// <summary> invokes the Dispose Event</summary>
  /// <param name="form"></param>
  static DisposeEvent: (form: GuiMgForm) => void = null;

  /// <summary> invokes the Timer Event</summary>
  /// <param name="mgTimer"></param>
  static TimerEvent: (mgTimer: MgTimer) => void = null;

  /// <summary> invokes the WindowResize Event</summary>
  /// <param name="form"></param>
  static WindowResizeEvent: (form: GuiMgForm) => void = null;

  /// <summary> invokes the WindowMove Event</summary>
  /// <param name="form"></param>
  static WindowMoveEvent: (form: GuiMgForm) => void = null;

  /// <summary> invokes the Resize Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="newRowsInPage"></param>
  static TableResizeEvent: (ctrl: GuiMgControl, newRowsInPage: number) => void = null;

  /// <summary> invokes the GetRowsData Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="desiredTopIndex"></param>
  /// <param name="sendAll"></param>
  /// <param name="lastFocusedVal"></param>
  static GetRowsDataEvent: (ctrl: GuiMgControl, desiredTopIndex: number, sendAll: boolean, lastFocusedVal: LastFocusedVal) => void = null;

  /// <summary> invokes the EnableCutCopy Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="enable"></param>
  static EnableCutCopyEvent: (ctrl: GuiMgControl, enable: boolean) => void = null;

  /// <summary> invokes the EnablePaste Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="enable"></param>
  static EnablePasteEvent: (ctrl: GuiMgControl, enable: boolean) => void = null;

  /// <summary> invokes the BeginDrag Event</summary>
  /// <param name="control"></param>
  /// <param name="line"></param>
  static BeginDragEvent: (control: GuiMgControl, line: number) => void = null;

  /// <summary> invokes the BeginDrop Event</summary>
  /// <param name="guiMgForm"></param>
  /// <param name="control"></param>
  /// <param name="line"></param>
  static BeginDropEvent: (guiMgForm: GuiMgForm, control: GuiMgControl, line: number) => void = null;

  /// <summary> invokes the ColumnClick Event</summary>
  /// <param name="columnCtrl"></param>
  /// <param name="direction"></param>
  /// <param name="columnHeader"></param>
  static ColumnClickEvent: (columnCtrl: GuiMgControl, direction: number, columnHeader: string) => void = null;

  /// <summary> invokes the ColumnFilter Event</summary>
  /// <param name="columnCtrl"></param>
  /// <param name="direction"></param>
  /// <param name="columnHeader"></param>
  static ColumnFilterEvent:  (columnCtrl: GuiMgControl, columnHeader: string, x: number, y: number, width: number, height: number) => void = null;

  /// <summary>IsContextMenuAllowed</summary>
  /// <returns></returns>
  static IsContextMenuAllowedEvent: (guiMgControl: GuiMgControl) => boolean = null;

  /// <summary>invokes refreshTables delegate</summary>
  static RefreshTablesEvent: () => void = null;

  /// <summary>MenuSelection</summary>
  /// <param name="menuEntry"></param>
  /// <param name="activeForm"></param>
  /// <param name="activatedFromMDIFrame"></param>
  static MenuSelectionEvent: (menuEntry: GuiMenuEntry, activeForm: GuiMgForm, activatedFromMDIFrame: boolean) => void = null;

  /// <summary>HelpInVokedOnMenu</summary>
  /// <param name="menuEntry"></param>
  /// <param name="activeForm"></param>
  static HelpInVokedOnMenuEvent: (menuEntry: GuiMenuEntry, activeForm: GuiMgForm) => void = null;

  /// <summary>OnHelpClose</summary>
  /// <param name="activeForm"></param>
  static HelpCloseEvent: (activeForm: GuiMgForm) => void = null;

  /// <summary>
  ///   This event is invoked on Program type of menu selection. This event is responsible to
  ///   translate the selected program menu into the matching operation i.e. program execution here.
  /// </summary>
  /// <param name="contextID">active/target context</param>
  /// <param name="menuEntryProgram">the selected menu \ bar menuEntryProgram object</param>
  /// <param name="activeForm"></param>
  /// <param name="activatedFromMdiFrame"></param>
  /// <returns></returns>
  static MenuProgramSelectionEvent: (contextID: number, menuEntryProgram: MenuEntryProgram, activeForm: GuiMgForm, activatedFromMdiFrame: boolean) => void = null;

  /// <summary>
  ///   This event is invoked on event type of menu selection. This event is responsible to
  ///   translate the selected event menu into the matching operation i.e. event execution.
  /// </summary>
  /// <param name="contextID">active/target context</param>
  /// <param name="menuEntryEvent">the selected menu \ bar menuEntryEvent object</param>
  /// <param name="activeForm"></param>
  /// <param name="ctlIdx">the index of the ctl which the menu is attached to in toolkit</param>
  static MenuEventSelectionEvent: (contextID: number, menuEntryEvent: MenuEntryEvent, activeForm: GuiMgForm, ctlIdx: number) => void = null;

  /// <summary>
  ///   This event is invoked on OS type of menu selection. This event is responsible to
  ///   translate the selected OS command menu into the matching operation i.e. osCommand execution.
  /// </summary>
  /// <param name="contextID"></param>
  /// <param name="osCommandMenuEntry"></param>
  /// <param name="activeForm"></param>
  /// <returns></returns>
  static MenuOSCommandSelectionEvent: (contextID: number, osCommandMenuEntry: MenuEntryOSCommand, activeForm: GuiMgForm) => void = null;

  /// <summary>RefreshMenuActions </summary>
  /// <param name="guiMgMenu"></param>
  /// <param name="guiMgForm"></param>
  static RefreshMenuActionsEvent: (guiMgMenu: GuiMgMenu, guiMgForm: GuiMgForm) => void = null;

  /// <summary> GetContextMenu</summary>
  /// <param name="obj"></param>
  /// <returns></returns>
  static GetContextMenuEvent: (obj: any) => GuiMgMenu = null;

  /// <summary>onMenuPrompt </summary>
  /// <param name="guiMgForm"></param>
  /// <param name="guiMenuEntry"></param>
  static OnMenuPromptEvent: (guiMgForm: GuiMgForm, guiMenuEntry: GuiMenuEntry) => void = null;

  /// <summary>BeforeContextMenu</summary>
  /// <param name="guiMgCtrl"></param>
  /// <param name="line"></param>
  /// <returns></returns>
  static BeforeContextMenuEvent: (guiMgCtrl: GuiMgControl, line: number, onMultiMark: boolean) => boolean = null;

  /// <summary>BeforeContextMenu</summary>
  /// <param name="guiMgForm"></param>
  /// <param name="guiMgMenu"></param>
  /// <returns></returns>
  static ContextMenuCloseEvent: (guiMgForm: GuiMgForm, guiMgMenu: GuiMgMenu) => void = null;

  /// <summary> closeTasksOnParentActivate </summary>
  /// <returns></returns>
  static CloseTasksOnParentActivateEvent: () => boolean = null;

  /// <summary> displaySessionStatistics </summary>
  static DisplaySessionStatisticsEvent: () => void = null;

  /// <summary> InIncrementalLocate
  ///
  /// </summary>
  /// <returns></returns>
  static InIncrementalLocateEvent: () => boolean = null;

  /// <summary>
  /// returns true for non interactive task for all controls except a button control
  /// </summary>
  /// <param name="ctrl">clicked control</param>
  /// <returns></returns>
  static ShouldBlockMouseEventsEvent: (ctrl: GuiMgControl) => boolean = null;

  /// <summary>peekEndOfWork</summary>
  /// <returns></returns>
  static PeekEndOfWorkEvent: () => boolean = null;

  /// <summary>invokes the GetEventTime delegate</summary>
  /// <returns></returns>
  static GetEventTimeEvent: () => number = null;

  /// <summary>
  /// invokes the ScrollTable Event
  /// </summary>
  /// <param name="guiMgObject"></param>
  /// <param name="line"></param>
  /// <param name="rowsToScroll"></param>
  /// <param name="isPageScroll">next/prev page?</param>
  /// <param name="isTableScroll">Begin/End Table?</param>
  /// <param name="isRaisedByMouseWheel">indicates whether event is raised by mousewheel or not.</param>
  static ScrollTableEvent: (guiMgObject: any, line: number, rowsToScroll: number, isPageScroll: boolean, isTableScroll: boolean, isRaisedByMouseWheel: boolean) => boolean = null;

  /// <summary>
  /// Gets the user defined Drop formats
  /// </summary>
  /// <param name="ctrl"></param>
  /// <returns></returns>
  static GetDropUserFormatsEvent: () => string = null;

  /// <summary>
  /// Get the context id from GuiMgForm
  /// </summary>
  /// <param name="guiMgForm"></param>
  /// <returns></returns>
  static GetContextIDEvent: (guiMgForm: GuiMgForm) => number = null;

  /// <summary> </summary>
  /// <param name="guiMgForm"></param>
  /// <returns></returns>
  static ShowFormEvent: (guiMgForm: GuiMgForm) => void = null;

  /// <summary>
  /// invokes OnFormActivateEvent
  /// </summary>
  static OnFormActivateEvent: (guiMgForm: GuiMgForm) => void = null;

  /// <summary>
  /// invokes OnNCActivate
  /// </summary>
  static OnNCActivateEvent: (guiMgForm: GuiMgForm) => void = null;

  /// <summary>
  /// invokes InitWindowListMenuItemsEvent
  /// </summary>
  /// <param name="guiMgMenu"></param>
  /// <param name="menuStyle"></param>
  static InitWindowListMenuItemsEvent: (guiMgForm: GuiMgForm, menuObj: any, menuStyle: MenuStyle) => void = null;

  /// <summary>
  /// Handle WM_KEYUP - (required only for ACT_NEXT_RT_WINDOW, ACT_PREV_RT_WINDOW for sorting windowlist
  /// when the key associated with the action is released)
  /// </summary>
  /// <param name="guiMgForm"></param>
  /// <param name="keyCode">keycode of a key which is just released</param>
  static HandleKeyUpMessageEvent: (guiMgForm: GuiMgForm, keyCode: number) => void = null;

  /// <summary>
  /// checks whether we should show Logon window in RTOL format or not.
  /// </summary>
  /// <returns></returns>
  static OnIsLogonRTLEvent: () => boolean = null;


  static OnIsSpecialEngLogonEvent: () => boolean = null;


  static OnIsSpecialIgnoreButtonFormatEvent: () => boolean = null;

  /// <summary> invokes the GetApplicationMenus Event </summary>
  /// <param name="contextID">active/target context</param>
  /// <param name="ctlIdx"></param>
  /// <returns></returns>
  static GetApplicationMenusEvent: (contextID: number, ctlIdx: number) => ApplicationMenus = null;

  /// <summary> invokes the getMainProgram Event </summary>
  /// <param name="contextID">active/target context</param>
  /// <param name="ctlIdx"></param>
  /// <returns></returns>
  static GetMainProgramEvent: (contextID: number, ctlIdx: number) => TaskBase = null;

  /// <summary>
  /// Logical name translation
  /// </summary>
  /// <param name="fromString">source string</param>
  /// <returns>translated string</returns>
  static TranslateLogicalNameEvent: (fromString: string) => string = null;

  /// <summary>invokes getMessageString Event</summary>
  /// <param name="msgId"></param>
  /// <returns></returns>
  static GetMessageStringEvent: (msgId: string) => string = null;

  /// <summary> invokes the focus event</summary>
  /// <param name="ctrl"></param>
  /// <param name="line"></param>
  /// <param name="isProduceClick"></param>
  static OnFocus(ctrl: GuiMgControl, line: number, isProduceClick: boolean, onMultiMark: boolean): void {
    Debug.Assert(Events.FocusEvent !== null);
    Events.FocusEvent(ctrl, line, isProduceClick, onMultiMark);
  }

  /// <summary> invokes the MouseDown Event</summary>
  /// <param name="guiMgForm"></param>
  /// <param name="guiMgCtrl"></param>
  /// <param name="dotNetArgs"></param>
  /// <param name="leftClickWasPressed"></param>
  /// <param name="line"></param>
  /// <param name="onMultiMark">indicates that Multi Mark continues</param>
  static OnMouseDown(guiMgForm: GuiMgForm, guiMgCtrl: GuiMgControl, dotNetArgs: any[], leftClickWasPressed: boolean, line: number, onMultiMark: boolean, canProduceClick: boolean): void {
    Debug.Assert(Events.MouseDownEvent !== null);
    Events.MouseDownEvent(guiMgForm, guiMgCtrl, dotNetArgs, leftClickWasPressed, line, onMultiMark, canProduceClick);
  }

  /// <summary> invokes the MouseOver Event</summary>
  /// <param name="ctrl"></param>
  static OnMouseOver(ctrl: GuiMgControl): void {
    Debug.Assert(Events.MouseOverEvent !== null);
    Events.MouseOverEvent(ctrl);
  }

  /// <summary> invokes Press Event</summary>
  /// <param name="guiMgForm"></param>
  /// <param name="guiMgCtrl"></param>
  /// <param name="line"></param>
  static OnPress(guiMgForm: GuiMgForm, guiMgCtrl: GuiMgControl, line: number): void {
    if (Events.PressEvent !== null) {
      Events.PressEvent(guiMgForm, guiMgCtrl, line);
    }
  }

  /// <summary> invokes the EditNode Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="line"></param>
  static OnEditNode(ctrl: GuiMgControl, line: number): void {
    if (Events.EditNodeEvent !== null) {
      Events.EditNodeEvent(ctrl, line);
    }
  }

  /// <summary> invokes the EditNodeExit Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="line"></param>
  static OnEditNodeExit(ctrl: GuiMgControl, line: number): void {
    if (Events.EditNodeExitEvent !== null) {
      Events.EditNodeExitEvent(ctrl, line);
    }
  }

  /// <summary> invokes the Collapse Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="line"></param>
  static OnCollapse(ctrl: GuiMgControl, line: number): void {
    if (Events.CollapseEvent !== null) {
      Events.CollapseEvent(ctrl, line);
    }
  }

  /// <summary> invokes the Expand Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="line"></param>
  static OnExpand(ctrl: GuiMgControl, line: number): void {
    if (Events.ExpandEvent !== null) {
      Events.ExpandEvent(ctrl, line);
    }
  }

  /// <summary> invokes the VisibilityChanged Event</summary>
  /// <param name="ctrl">control whose visibility is changed</param>
  static OnNonParkableLastParkedCtrl(ctrl: GuiMgControl): void {
    if (Events.NonParkableLastParkedCtrlEvent !== null) {
      Events.NonParkableLastParkedCtrlEvent(ctrl);
    }
  }

  /// <summary> invokes the TableReorder Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="tabOrderList"></param>
  static OnTableReorder(ctrl: GuiMgControl, tabOrderList: List<GuiMgControl>): void {
    if (Events.TableReorderEvent !== null) {
      Events.TableReorderEvent(ctrl, tabOrderList);
    }
  }

  /// <summary> invokes the MouseOut Event</summary>
  /// <param name="ctrl"></param>
  static OnMouseOut(ctrl: GuiMgControl): void {
    Debug.Assert(Events.MouseOutEvent !== null);
    Events.MouseOutEvent(ctrl);
  }

  /// <summary> invokes the MouseUp Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="line"></param>
  static OnMouseUp(ctrl: GuiMgControl, line: number): void {
    if (Events.MouseUpEvent !== null) {
      Events.MouseUpEvent(ctrl, line);
    }
  }

  /// <summary> invokes the ComboDroppingDown Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="line"></param>
  static OnComboDroppingDown(ctrl: GuiMgControl, line: number): void {
    Debug.Assert(Events.ComboDroppingDownEvent !== null);
    Events.ComboDroppingDownEvent(ctrl, line);
  }

  /// <summary> invokes the Selection Event</summary>
  /// <param name="val"></param>
  /// <param name="ctrl"></param>
  /// <param name="line"></param>
  /// <param name="produceClick"></param>
  static OnSelection(val: string, ctrl: GuiMgControl, line: number, produceClick: boolean): void {
    Debug.Assert(Events.SelectionEvent !== null);
    Events.SelectionEvent(val, ctrl, line, produceClick);
  }

  /// <summary> invokes the DblClick Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="line"></param>
  static OnDblClick(ctrl: GuiMgControl, line: number): void {
    Debug.Assert(Events.DblClickEvent !== null);
    Events.DblClickEvent(ctrl, line);
  }


  /// <summary> invokes the KeyDown Event</summary>
  /// <param name="form"></param>
  /// <param name="guiMgCtrl"></param>
  /// <param name="modifier"></param>
  /// <param name="keyCode"></param>
  /// <param name="start"></param>
  /// <param name="end"></param>
  /// <param name="text"></param>
  /// <param name="im"></param>
  /// <param name="isActChar"></param>
  /// <param name="suggestedValue"></param>
  /// <param name="comboIsDropDown"></param>
  /// <param name="handled">boolean variable event is handled or not. </param>
  static OnKeyDown(form: GuiMgForm, guiMgCtrl: GuiMgControl, modifier: Modifiers, keyCode: number, start: number, end: number, text: string, isActChar: boolean, suggestedValue: string, comboIsDropDown: boolean, handled: boolean): void;
  static OnKeyDown(form: GuiMgForm, ctrl: GuiMgControl, modifier: Modifiers, keyCode: number, start: number, end: number, text: string, isActChar: boolean, suggestedValue: string, handled: boolean): void;
  static OnKeyDown(form: GuiMgForm, ctrl: GuiMgControl, modifier: Modifiers, keyCode: number, suggestedValue: string, comboIsDropDown: boolean, handled: boolean): void;
  static OnKeyDown(form: GuiMgForm, guiMgCtrlOrCtrl: GuiMgControl, modifier: Modifiers, keyCode: number, startOrSuggestedValue: any, endOrComboIsDropDown: any, textOrHandled: any, isActChar?: boolean, suggestedValue?: string, comboIsDropDownOrHandled?: boolean, handled?: boolean): void {
    if (arguments.length === 11)
      Events.OnKeyDown_0(form, guiMgCtrlOrCtrl, modifier, keyCode, startOrSuggestedValue, endOrComboIsDropDown, textOrHandled, isActChar, suggestedValue, comboIsDropDownOrHandled, handled);

    else if (arguments.length === 10)
      Events.OnKeyDown_1(form, guiMgCtrlOrCtrl, modifier, keyCode, startOrSuggestedValue, endOrComboIsDropDown, textOrHandled, isActChar, suggestedValue, comboIsDropDownOrHandled);
    else
      Events.OnKeyDown_2(form, guiMgCtrlOrCtrl, modifier, keyCode, startOrSuggestedValue, endOrComboIsDropDown, textOrHandled);
  }

  private static OnKeyDown_0(form: GuiMgForm, guiMgCtrl: GuiMgControl, modifier: Modifiers, keyCode: number, start: number, end: number, text: string, isActChar: boolean, suggestedValue: string, comboIsDropDown: boolean, handled: boolean): void {
    Debug.Assert(Events.KeyDownEvent !== null);
    Events.KeyDownEvent(form, guiMgCtrl, modifier, keyCode, start, end, text, isActChar, suggestedValue, comboIsDropDown, handled);
  }

  static OnMultiMarkHit(ctrl: GuiMgControl, row: number, modifier: Modifiers): void {
    Debug.Assert(Events.MultimarkHitEvent !== null);
    Events.MultimarkHitEvent(ctrl, row, modifier);
  }

  private static OnKeyDown_1(form: GuiMgForm, ctrl: GuiMgControl, modifier: Modifiers, keyCode: number, start: number, end: number, text: string, isActChar: boolean, suggestedValue: string, handled: boolean): boolean {
    Debug.Assert(Events.KeyDownEvent !== null);
    return Events.KeyDownEvent(form, ctrl, modifier, keyCode, start, end, text, isActChar, suggestedValue, false, handled);
  }

  private static OnKeyDown_2(form: GuiMgForm, ctrl: GuiMgControl, modifier: Modifiers, keyCode: number, suggestedValue: string, comboIsDropDown: boolean, handled: boolean): boolean {
    Debug.Assert(Events.KeyDownEvent !== null);
    return Events.KeyDownEvent(form, ctrl, modifier, keyCode, 0, 0, null, false, suggestedValue, comboIsDropDown, handled);
  }

  /// <summary> invokes the Close Event</summary>
  /// <param name="form"></param>
  /// <returns>true if event is CLR handled(closing of the form will be the responsibility of the CLR and no commands will be put
  /// in to close the form) else false.</returns>
  static OnFormClose(form: GuiMgForm): boolean {
    Debug.Assert(Events.CloseFormEvent !== null);
    return Events.CloseFormEvent(form);
  }

  /// <summary> invokes the Dispose Event</summary>
  /// <param name="form"></param>
  static OnDispose(form: GuiMgForm): void {
    Debug.Assert(Events.DisposeEvent !== null);
    Events.DisposeEvent(form);
  }

  /// <summary> invokes the Timer Event</summary>
  /// <param name="mgTimer"></param>
  static OnTimer(mgTimer: MgTimer): void {
    Debug.Assert(Events.TimerEvent !== null);
    Events.TimerEvent(mgTimer);
  }

  /// <summary> invokes the WindowResize Event</summary>
  /// <param name="form"></param>
  static OnWindowResize(form: GuiMgForm): void {
    Debug.Assert(Events.WindowResizeEvent !== null);
    Events.WindowResizeEvent(form);
  }

  /// <summary> invokes the WindowMove Event</summary>
  /// <param name="form"></param>
  static OnWindowMove(form: GuiMgForm): void {
    Debug.Assert(Events.WindowMoveEvent !== null);
    Events.WindowMoveEvent(form);
  }

  /// <summary> invokes the Resize Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="newRowsInPage"></param>
  static OnTableResize(ctrl: GuiMgControl, newRowsInPage: number): void {
    if (Events.TableResizeEvent !== null) {
      Events.TableResizeEvent(ctrl, newRowsInPage);
    }
  }

  /// <summary> invokes the GetRowsData Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="desiredTopIndex"></param>
  /// <param name="sendAll"></param>
  /// <param name="lastFocusedVal"></param>
  static OnGetRowsData(ctrl: GuiMgControl, desiredTopIndex: number, sendAll: boolean, lastFocusedVal: LastFocusedVal): void {
      if (Events.GetRowsDataEvent !== null) {
          Events.GetRowsDataEvent(ctrl, desiredTopIndex, sendAll, lastFocusedVal);
      }
  }

  /// <summary> invokes the EnableCutCopy Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="enable"></param>
  static OnEnableCutCopy(ctrl: GuiMgControl, enable: boolean): void {
      Debug.Assert(Events.EnableCutCopyEvent !== null);
      Events.EnableCutCopyEvent(ctrl, enable);
  }

  /// <summary> invokes the EnablePaste Event</summary>
  /// <param name="ctrl"></param>
  /// <param name="enable"></param>
  static OnEnablePaste(ctrl: GuiMgControl, enable: boolean): void {
      if (Events.EnablePasteEvent !== null) {
          Events.EnablePasteEvent(ctrl, enable);
      }
  }

  /// <summary> invokes the BeginDrag Event</summary>
  /// <param name="control"></param>
  /// <param name="line"></param>
  static OnBeginDrag(control: GuiMgControl, line: number): void {
    Debug.Assert(Events.BeginDragEvent !== null);
    Events.BeginDragEvent(control, line);
  }

  /// <summary> invokes the BeginDrop Event</summary>
  /// <param name="guiMgForm"></param>
  /// <param name="control"></param>
  /// <param name="line"></param>
  static OnBeginDrop(guiMgForm: GuiMgForm, control: GuiMgControl, line: number): void {
    Debug.Assert(Events.BeginDropEvent !== null);
    Events.BeginDropEvent(guiMgForm, control, line);
  }

  /// <summary> invokes the ColumnClick Event</summary>
  /// <param name="columnCtrl"></param>
  /// <param name="direction"></param>
  /// <param name="columnHeader"></param>
  static OnColumnClick(columnCtrl: GuiMgControl, direction: number, columnHeader: string): void {
    Debug.Assert(Events.ColumnClickEvent !== null);
    Events.ColumnClickEvent(columnCtrl, direction, columnHeader);
  }

  /// <summary> invokes the ColumnFilter Event</summary>
  /// <param name="columnCtrl"></param>
  /// <param name="direction"></param>
  /// <param name="columnHeader"></param>
  static OnColumnFilter(columnCtrl: GuiMgControl, columnHeader: string, x: number, y: number, width: number, height: number): void {
    Debug.Assert(Events.ColumnFilterEvent !== null);
    Events.ColumnFilterEvent(columnCtrl, columnHeader, x, y, width, height);
  }

  /// <summary>IsContextMenuAllowed</summary>
  /// <returns></returns>
  static IsContextMenuAllowed(guiMgControl: GuiMgControl): boolean {
    return Events.IsContextMenuAllowedEvent !== null && Events.IsContextMenuAllowedEvent(guiMgControl);
  }

  /// <summary>invokes refreshTables delegate</summary>
  static RefreshTables(): void {
    if (Events.RefreshTablesEvent !== null) {
      Events.RefreshTablesEvent();
    }
  }

  /// <summary>MenuSelection</summary>
  /// <param name="menuEntry"></param>
  /// <param name="activeForm"></param>
  /// <param name="activatedFromMDIFrame"></param>
  static OnMenuSelection(menuEntry: GuiMenuEntry, activeForm: GuiMgForm, activatedFromMDIFrame: boolean): void {
    Debug.Assert(Events.MenuSelectionEvent !== null);
    Events.MenuSelectionEvent(menuEntry, activeForm, activatedFromMDIFrame);
  }

  /// <summary>HelpInVokedOnMenu</summary>
  /// <param name="menuEntry"></param>
  /// <param name="activeForm"></param>
  static OnHelpInVokedOnMenu(menuEntry: GuiMenuEntry, activeForm: GuiMgForm): void {
    if (Events.HelpInVokedOnMenuEvent !== null) {
      Events.HelpInVokedOnMenuEvent(menuEntry, activeForm);
    }
  }

  /// <summary>OnHelpClose</summary>
  /// <param name="activeForm"></param>
  static OnCloseHelp(activeForm: GuiMgForm): void {
    if (Events.HelpCloseEvent !== null) {
      Events.HelpCloseEvent(activeForm);
    }
  }

  /// <summary>
  ///   This event is invoked on Program type of menu selection. This event is responsible to
  ///   translate the selected program menu into the matching operation i.e. program execution here.
  /// </summary>
  /// <param name="contextID">active/target context</param>
  /// <param name="menuEntryProgram">the selected menu \ bar menuEntryProgram object</param>
  /// <param name="activeForm"></param>
  /// <param name="activatedFromMdiFrame"></param>
  /// <returns></returns>
  static OnMenuProgramSelection(contextID: number, menuEntryProgram: MenuEntryProgram, activeForm: GuiMgForm, activatedFromMdiFrame: boolean): void {
    Debug.Assert(Events.MenuProgramSelectionEvent !== null);
    Events.MenuProgramSelectionEvent(contextID, menuEntryProgram, activeForm, activatedFromMdiFrame);
  }

  /// <summary>
  ///   This event is invoked on event type of menu selection. This event is responsible to
  ///   translate the selected event menu into the matching operation i.e. event execution.
  /// </summary>
  /// <param name="contextID">active/target context</param>
  /// <param name="menuEntryEvent">the selected menu \ bar menuEntryEvent object</param>
  /// <param name="activeForm"></param>
  /// <param name="ctlIdx">the index of the ctl which the menu is attached to in toolkit</param>
  static OnMenuEventSelection(contextID: number, menuEntryEvent: MenuEntryEvent, activeForm: GuiMgForm, ctlIdx: number): void {
    Debug.Assert(Events.MenuEventSelectionEvent !== null);
    Events.MenuEventSelectionEvent(contextID, menuEntryEvent, activeForm, ctlIdx);
  }

  /// <summary>
  ///   This event is invoked on OS type of menu selection. This event is responsible to
  ///   translate the selected OS command menu into the matching operation i.e. osCommand execution.
  /// </summary>
  /// <param name="contextID"></param>
  /// <param name="osCommandMenuEntry"></param>
  /// <param name="activeForm"></param>
  /// <returns></returns>
  static OnMenuOSCommandSelection(contextID: number, osCommandMenuEntry: MenuEntryOSCommand, activeForm: GuiMgForm): void {
    Debug.Assert(Events.MenuOSCommandSelectionEvent !== null);
    Events.MenuOSCommandSelectionEvent(contextID, osCommandMenuEntry, activeForm);
  }

  /// <summary>RefreshMenuActions </summary>
  /// <param name="guiMgMenu"></param>
  /// <param name="guiMgForm"></param>
  static OnRefreshMenuActions(guiMgMenu: GuiMgMenu, guiMgForm: GuiMgForm): void {
    Debug.Assert(Events.RefreshMenuActionsEvent !== null);
    Events.RefreshMenuActionsEvent(guiMgMenu, guiMgForm);
  }

  /// <summary>
  /// returns TRUE, if Batch task is running in MAIN context.
  /// </summary>
  static IsBatchRunningInMainContext(): boolean {
    let retValue: boolean = false;
    if (Events.IsBatchRunningInMainContextEvent !== null) {
      retValue = Events.IsBatchRunningInMainContextEvent();
    }
    return retValue;
  }

  /// <summary> GetContextMenu</summary>
  /// <param name="obj"></param>
  /// <returns></returns>
  static OnGetContextMenu(obj: any): GuiMgMenu {
    Debug.Assert(Events.GetContextMenuEvent !== null && (obj instanceof GuiMgForm || obj instanceof GuiMgControl));
    return Events.GetContextMenuEvent(obj);
  }

  /// <summary>onMenuPrompt </summary>
  /// <param name="guiMgForm"></param>
  /// <param name="guiMenuEntry"></param>
  static OnMenuPrompt(guiMgForm: GuiMgForm, guiMenuEntry: GuiMenuEntry): void {
    Debug.Assert(Events.OnMenuPromptEvent !== null);
    Events.OnMenuPromptEvent(guiMgForm, guiMenuEntry);
  }

  /// <summary>BeforeContextMenu</summary>
  /// <param name="guiMgCtrl"></param>
  /// <param name="line"></param>
  /// <returns></returns>
  static OnBeforeContextMenu(guiMgCtrl: GuiMgControl, line: number, onMultiMark: boolean): boolean {
    let focusChanged: boolean = false;
    if (Events.BeforeContextMenuEvent !== null) {
      focusChanged = Events.BeforeContextMenuEvent(guiMgCtrl, line, onMultiMark);
    }
    return focusChanged;
  }

  /// <summary>BeforeContextMenu</summary>
  /// <param name="guiMgForm"></param>
  /// <param name="guiMgMenu"></param>
  /// <returns></returns>
  static OnContextMenuClose(guiMgForm: GuiMgForm, guiMgMenu: GuiMgMenu): void {
    if (Events.ContextMenuCloseEvent !== null) {
      Events.ContextMenuCloseEvent(guiMgForm, guiMgMenu);
    }
  }

  /// <summary>MLS translation</summary>
  /// <param name="fromString">source string</param>
  /// <returns>translated string</returns>
  static Translate(fromString: string): string {
    Debug.Assert(Events.TranslateEvent !== null);
    return (fromString !== null && fromString.length > 0) ? Events.TranslateEvent(fromString) : fromString;
  }

  /// <summary>
  /// Creates Print Preview Form
  /// </summary>
  /// <param name="contextId">context id</param>
  /// <param name="ioPtr">pointer to current IORT object</param>
  /// <param name="copies">number of copies</param>
  /// <param name="enablePDlg">indicates whether to enable Print dialog</param>
  /// <param name="hWnd">Handle of Print Preview Form</param>
  static OnPrintPreviewStart(contextID: number, ioPtr: number, copies: number, enablePDlg: boolean, hWnd: number): void {
    if (Events.PrintPreviewStartEvent !== null) {
      Events.PrintPreviewStartEvent(contextID, ioPtr, copies, enablePDlg, hWnd);
    }
  }

  /// <summary>
  /// Set cursor to Print Preview form
  /// </summary>
  /// <param name="prnPrevData">print preview data</param>
  static OnPrintPreviewSetCursor(printPreviewData: number): void {
    if (Events.PrintPreviewSetCursorEvent !== null) {
      Events.PrintPreviewSetCursorEvent(printPreviewData);
    }
  }

  ///<summary>
  /// Handles Invoke UDP operation from GUI thread
  ///</summary>
  ///<param name="contextId">Context id</param>
  static InvokeUDP(contextId: number): number {
    let ret: number = 0;
    if (Events.InvokeUDPEvent !== null) {
      ret = Events.InvokeUDPEvent(contextId);
    }
    return ret;
  }

  /// <summary>
  /// Update Print Preview
  /// </summary>
  /// <param name="prnPrevData">print preview data</param>
  static OnPrintPreviewUpdate(prnPrevData: number): void {
    if (Events.PrintPreviewUpdateEvent !== null) {
      Events.PrintPreviewUpdateEvent(prnPrevData);
    }
  }

  /// <summary>
  /// Create Rich Edit
  /// </summary>
  /// <param name="contextId"></param>
  /// <param name="ctrlPtr"></param>
  /// <param name="prmPtr"></param>
  /// <param name="style"></param>
  /// <param name="dwExStyle"></param>
  static OnCreateRichWindow(contextID: number, ctrlPtr: number, prmPtr: number, style: number, dwExStyle: number): void {
    if (Events.CreateRichWindowEvent !== null) {
      Events.CreateRichWindowEvent(contextID, ctrlPtr, prmPtr, style, dwExStyle);
    }
  }

  ///<summary>
  ///  Creates a window
  ///</summary>
  ///<param name="exStyle">!!.</param>
  ///<param name="className">!!.</param>
  ///<param name="windowName">!!.</param>
  ///<param name="style">!!.</param>
  ///<param name="x">!!.</param>
  ///<param name="y">!!.</param>
  ///<param name="width">!!.</param>
  ///<param name="height">!!.</param>
  ///<param name="hwndParent">!!.</param>
  ///<param name="hMenu">!!.</param>
  ///<param name="hInstance">!!.</param>
  ///<param name="lParam">!!.</param>
  ///<returns>handle of window</returns>
  static OnCreateGuiWindow(exStyle: number, className: string, windowName: string, style: number, x: number, y: number, width: number, height: number, hwndParent: number, hMenu: number, hInstance: number, lParam: number): number {
    let retValue: number = 0;
    if (Events.CreateGuiWindowEvent !== null) {
      retValue = Events.CreateGuiWindowEvent(exStyle, className, windowName, style, x, y, width, height, hwndParent, hMenu, hInstance, lParam);
    }
    return retValue;
  }

  /// <summary>
  /// Destroys a window
  /// </summary>
  /// <param name="hWndPtr">handle of window</param>
  static OnDestroyGuiWindow(hWndPtr: number): void {
    if (Events.DestroyGuiWindowEvent !== null) {
      Events.DestroyGuiWindowEvent(hWndPtr);
    }
  }

  /// <summary>
  /// OnClose Print Preview
  /// </summary>
  /// <param name="hWndPtr">print preview data</param>
  static OnPrintPreviewClose(printPreviewDataPtr: number): void {
    if (Events.PrintPreviewCloseEvent !== null) {
      Events.PrintPreviewCloseEvent(printPreviewDataPtr);
    }
  }

  /// <summary>
  /// Show Print Dialog
  /// </summary>
  /// <param name="gpd"></param>
  static OnShowPrintDialog(gpd: number): number {
    let retValue: number = 0;
    if (Events.ShowPrintDialogEvent !== null) {
      retValue = Events.ShowPrintDialogEvent(gpd);
    }
    return retValue;
  }

  /// <summary> closeTasksOnParentActivate </summary>
  /// <returns></returns>
  static CloseTasksOnParentActivate(): boolean {
    return Events.CloseTasksOnParentActivateEvent !== null && Events.CloseTasksOnParentActivateEvent();
  }

  /// <summary> displaySessionStatistics </summary>
  static DisplaySessionStatistics(): void {
    if (Events.DisplaySessionStatisticsEvent !== null) {
      Events.DisplaySessionStatisticsEvent();
    }
  }

  /// <summary> InIncrementalLocate
  ///
  /// </summary>
  /// <returns></returns>
  static InIncrementalLocate(): boolean {
    return Events.InIncrementalLocateEvent !== null && Events.InIncrementalLocateEvent();
  }

  /// <summary>
  /// returns true for non interactive task for all controls except a button control
  /// </summary>
  /// <param name="ctrl">clicked control</param>
  /// <returns></returns>
  static ShouldBlockMouseEvents(ctrl: GuiMgControl): boolean {
    return Events.ShouldBlockMouseEventsEvent !== null && Events.ShouldBlockMouseEventsEvent(ctrl);
  }

  /// <summary>peekEndOfWork</summary>
  /// <returns></returns>
  static PeekEndOfWork(): boolean {
    return Events.PeekEndOfWorkEvent !== null && Events.PeekEndOfWorkEvent();
  }

  /// <summary>invokes the GetEventTime delegate</summary>
  /// <returns></returns>
  static GetEventTime(): number {
    return (Events.GetEventTimeEvent !== null) ? Events.GetEventTimeEvent() : 0;
  }

  /// <summary>
  /// invokes the ScrollTable Event
  /// </summary>
  /// <param name="guiMgObject"></param>
  /// <param name="line"></param>
  /// <param name="rowsToScroll"></param>
  /// <param name="isPageScroll">next/prev page?</param>
  /// <param name="isTableScroll">Begin/End Table?</param>
  /// <param name="isRaisedByMouseWheel">indicates whether event is raised by mousewheel or not.</param>
  static OnScrollTable(guiMgObject: any, line: number, rowsToScroll: number, isPageScroll: boolean, isTableScroll: boolean, isRaisedByMouseWheel: boolean): boolean {
    let handled: boolean = false;
    if (Events.ScrollTableEvent !== null) {
      handled = Events.ScrollTableEvent(guiMgObject, line, rowsToScroll, isPageScroll, isTableScroll, isRaisedByMouseWheel);
    }
    return handled;
  }

  /// <summary>
  /// Gets the user defined Drop formats
  /// </summary>
  /// <param name="ctrl"></param>
  /// <returns></returns>
  static GetDropUserFormats(): string {
    Debug.Assert(Events.GetDropUserFormatsEvent !== null);
    return Events.GetDropUserFormatsEvent();
  }

  /// <summary>
  /// Get the context id from GuiMgForm
  /// </summary>
  /// <param name="guiMgForm"></param>
  /// <returns></returns>
  static GetContextID(guiMgForm: GuiMgForm): number {
    let contextID: number = -1;
    Debug.Assert(guiMgForm !== null);
    if (Events.GetContextIDEvent !== null) {
      contextID = Events.GetContextIDEvent(guiMgForm);
    }
    return contextID;
  }

  /// <summary>
  /// SetModal event
  /// </summary>
  /// <param name="currForm"></param>
  /// <param name="on"></param>
  static SetModal(mgForm: MgFormBase, on: boolean): void {
    if (Events.SetModalEvent !== null) {
      Events.SetModalEvent(mgForm, on);
    }
  }

  /// <summary> </summary>
  /// <param name="guiMgForm"></param>
  /// <returns></returns>
  static OnShowForm(guiMgForm: GuiMgForm): void {
    if (Events.ShowFormEvent !== null) {
      Events.ShowFormEvent(guiMgForm);
    }
  }

  /// <summary>
  /// invokes OnFormActivateEvent
  /// </summary>
  static OnFormActivate(guiMgForm: GuiMgForm): void {
    if (Events.OnFormActivateEvent !== null) {
      Events.OnFormActivateEvent(guiMgForm);
    }
  }

  /// <summary>
  /// invokes OnNCActivate
  /// </summary>
  static OnNCActivate(guiMgForm: GuiMgForm): void {
    if (Events.OnNCActivateEvent !== null) {
      Events.OnNCActivateEvent(guiMgForm);
    }
  }

  /// <summary>
  /// invokes InitWindowListMenuItemsEvent
  /// </summary>
  /// <param name="guiMgMenu"></param>
  /// <param name="menuStyle"></param>
  static InitWindowListMenuItems(guiMgForm: GuiMgForm, menuObj: any, menuStyle: MenuStyle): void {
    if (Events.InitWindowListMenuItemsEvent !== null) {
      Events.InitWindowListMenuItemsEvent(guiMgForm, menuObj, menuStyle);
    }
  }

  /// <summary>
  /// Handle WM_KEYUP - (required only for ACT_NEXT_RT_WINDOW, ACT_PREV_RT_WINDOW for sorting windowlist
  /// when the key associated with the action is released)
  /// </summary>
  /// <param name="guiMgForm"></param>
  /// <param name="keyCode">keycode of a key which is just released</param>
  static HandleKeyUpMessage(guiMgForm: GuiMgForm, keyCode: number): void {
    if (Events.HandleKeyUpMessageEvent !== null) {
      Events.HandleKeyUpMessageEvent(guiMgForm, keyCode);
    }
  }

  /// <summary>
  /// checks whether we should show Logon window in RTOL format or not.
  /// </summary>
  /// <returns></returns>
  static IsLogonRTL(): boolean {
    let isRTL: boolean = false;
    if (Events.OnIsLogonRTLEvent !== null) {
      isRTL = Events.OnIsLogonRTLEvent();
    }
    return isRTL;
  }

  static IsSpecialEngLogon(): boolean {
    let isEngLogon: boolean = false;
    if (Events.OnIsSpecialEngLogonEvent !== null) {
      isEngLogon = Events.OnIsSpecialEngLogonEvent();
    }
    return isEngLogon;
  }

  static IsSpecialIgnoreButtonFormat(): boolean {
    let isIgnoreButtonFormat: boolean = false;
    if (Events.OnIsSpecialIgnoreButtonFormatEvent !== null) {
      isIgnoreButtonFormat = Events.OnIsSpecialIgnoreButtonFormatEvent();
    }
    return isIgnoreButtonFormat;
  }

  /// <summary> invokes the getMainProgram Event </summary>
  /// <param name="contextID">active/target context</param>
  /// <param name="ctlIdx"></param>
  /// <returns></returns>
  static GetMainProgram(contextID: number, ctlIdx: number): TaskBase {
    Debug.Assert(Events.GetMainProgramEvent !== null);
    return Events.GetMainProgramEvent(contextID, ctlIdx);
  }

  /// <summary>
  /// Logical name translation
  /// </summary>
  /// <param name="fromString">source string</param>
  /// <returns>translated string</returns>
  static TranslateLogicalName(fromString: string): string {
    Debug.Assert(Events.TranslateLogicalNameEvent !== null);
    return Events.TranslateLogicalNameEvent(fromString);
  }

  /// <summary>invokes getMessageString Event</summary>
  /// <param name="msgId"></param>
  /// <returns></returns>
  static GetMessageString(msgId: string): string {
    Debug.Assert(Events.GetMessageStringEvent !== null);
    let fromString: string = Events.GetMessageStringEvent(msgId);
    let text: string = Events.Translate(fromString);
    if (text !== null && text.endsWith(":")) {
      let str: StringBuilder;
      str = new StringBuilder(text);
      str.Insert(text.length, " ");
      text = str.ToString();
    }
    return text;
  }

  /// <summary>raises CtrlFocusEvent</summary>
  /// <returns></returns>
  static OnCtrlFocus(iTask: ITask, ctrl: MgControlBase): void {
    if (Events.CtrlFocusEvent !== null) {
      Events.CtrlFocusEvent(iTask, ctrl);
    }
  }

  /// <summary>get Current processing task</summary>
  /// <returns></returns>
  static GetCurrentTask(): ITask {
    return (Events.GetCurrentTaskEvent !== null) ? Events.GetCurrentTaskEvent() : null;
  }

  /// <summary>
  /// Gets the RuntimeContextBase that belongs to the contextID
  /// </summary>
  /// <param name="contextID"></param>
  /// <returns></returns>
  static GetRuntimeContext(contextID: string): RuntimeContextBase {
    Debug.Assert(Events.GetRuntimeContextEvent !== null);
    return Events.GetRuntimeContextEvent(contextID);
  }

  /// <summary>
  /// Saves the name of the last clicked control.
  /// </summary>
  /// <param name="guiMgControl">guiMgControl</param>
  /// <param name="controlName">Name of the control</param>
  static SaveLastClickedCtrlName(guiMgControl: GuiMgControl, controlName: string): void {
    if (Events.SaveLastClickedCtrlEvent !== null) {
      Events.SaveLastClickedCtrlEvent(guiMgControl, controlName);
    }
  }

  /// <summary>
  /// Saves the last clicked information. (i.e. Co-ordinates and control name.
  /// </summary>
  /// <param name="guiMgForm">guiMgForm</param>
  /// <param name="controlName">name of the control</param>
  /// <param name="x"></param>
  /// <param name="y"></param>
  /// <param name="offsetX"></param>
  /// <param name="offsetY"></param>
  /// <param name="lastClickCoordinatesAreInPixels">co-ordinates are in pixel or not.</param>
  static SaveLastClickInfo(guiMgForm: GuiMgForm, controlName: string, x: number, y: number, offsetX: number, offsetY: number, lastClickCoordinatesAreInPixels: boolean): void {
    if (Events.SaveLastClickInfoEvent !== null) {
      Events.SaveLastClickInfoEvent(guiMgForm, controlName, x, y, offsetX, offsetY, lastClickCoordinatesAreInPixels);
    }
  }

  /// <summary>write an error message to the internal log file</summary>
  /// <param name="msg"></param>
  static WriteErrorToLog(msg: string): void {
    Debug.Assert(Events.WriteErrorToLogEvent !== null);
    Events.WriteErrorToLogEvent(msg);
  }

  static WriteExceptionToLog(msg: string): void;
  static WriteExceptionToLog(ex: Exception): void;
  static WriteExceptionToLog(msgOrEx: any): void {
    if (arguments.length === 1 && (msgOrEx === null || msgOrEx.constructor === String)) {
      Events.WriteExceptionToLog_0(msgOrEx);
      return;
    }
    Events.WriteExceptionToLog_1(msgOrEx);
  }

  private static WriteExceptionToLog_0(msg: string): void {
    Debug.Assert(Events.WriteErrorToLogEvent !== null);
    Events.WriteErrorToLogEvent(msg);
  }

  private static WriteExceptionToLog_1(ex: Exception): void {
    Events.WriteExceptionToLog(NString.Format("{0} : {1}{2}{3}{4}", [
      ex.GetType(), OSEnvironment.EolSeq, ex.StackTrace, OSEnvironment.EolSeq, ex.Message
    ]));
  }

  /// <summary>write a warning message to the internal log file</summary>
  /// <param name="msg"></param>
  static WriteWarningToLog(msg: string): void;
  static WriteWarningToLog(ex: Exception): void;
  static WriteWarningToLog(msgOrEx: any): void {
    if (arguments.length === 1 && (msgOrEx === null || msgOrEx.constructor === String)) {
      Events.WriteWarningToLog_0(msgOrEx);
      return;
    }
    Events.WriteWarningToLog_1(msgOrEx);
  }

  private static WriteWarningToLog_0(msg: string): void {
    Debug.Assert(Events.WriteWarningToLogEvent !== null);
    Events.WriteWarningToLogEvent(msg);
  }

  private static WriteWarningToLog_1(ex: Exception): void {
    Events.WriteWarningToLog(ex.GetType() + " : " + OSEnvironment.EolSeq + ex.StackTrace + OSEnvironment.EolSeq + ex.Message);
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="logLevel"></param>
  /// <returns></returns>
  static ShouldLog(logLevel: Logger_LogLevels): boolean {
    Debug.Assert(Events.ShouldLogEvent !== null);
    return Events.ShouldLogEvent(logLevel);
  }

  /// <summary>write a GUI message to the internal log file</summary>
  /// <param name="msg"></param>
  static WriteGuiToLog(msg: string): void {
    Debug.Assert(Events.WriteGuiToLogEvent !== null);
    Events.WriteGuiToLogEvent("GUI: " + msg);
  }

  /// <summary>write a DEV message to the internal log file</summary>
  /// <param name="msg"></param>
  static WriteDevToLog(msg: string): void {
    Debug.Assert(Events.WriteDevToLogEvent !== null);
    Events.WriteDevToLogEvent(msg);
  }

  /// <summary>
  /// Called when WM_CUT message is received
  /// </summary>
  /// <param name="ctrl"></param>
  static OnCut(ctrl: GuiMgControl): void {
      if (Events.CutEvent !== null) {
          Events.CutEvent(ctrl);
      }
  }

  /// <summary>
  /// Called when WM_COPY message is received
  /// </summary>
  /// <param name="ctrl"></param>
  static OnCopy(ctrl: GuiMgControl): void {
      if (Events.CopyEvent !== null) {
          Events.CopyEvent(ctrl);
      }
  }

  /// <summary>
  /// Called when WM_PASTE message is received
  /// </summary>
  /// <param name="ctrl"></param>
  static OnPaste(ctrl: GuiMgControl): void {
      if (Events.PasteEvent !== null) {
          Events.PasteEvent(ctrl);
      }
  }

  /// <summary>
  /// Called when WM_CLEAR message is received
  /// </summary>
  /// <param name="ctrl"></param>
  static OnClear(ctrl: GuiMgControl): void {
      if (Events.ClearEvent !== null) {
          Events.ClearEvent(ctrl);
      }
  }

  /// <summary>
  /// Called when WM_UNDO message is received
  /// </summary>
  /// <param name="ctrl"></param>
  static OnUndo(ctrl: GuiMgControl): void {
      if (Events.UndoEvent !== null) {
          Events.UndoEvent(ctrl);
      }
  }

  /// <summary>
  /// Should Enter be added as keyboard event ? This is important mostly in determining if a click event
  /// will be raised for a default button or not.
  /// Adding Enter as a keyboard event will not raise click on default button.
  /// </summary>
  /// <returns></returns>
  static AddEnterAsKeyEvent(): boolean {
    return Events.ShouldAddEnterAsKeyEvent !== null && Events.ShouldAddEnterAsKeyEvent();
  }

  /// <summary>
  /// </summary>
  static ShowSessionStatisticsForm(): void {
    if (Events.ShowSessionStatisticsEvent !== null) {
      Events.ShowSessionStatisticsEvent();
    }
  }

  /// <summary>
  /// Called when WM_COPYDATA message is received
  /// </summary>
  /// <param name="guiMgForm"></param>
  /// <param name="copyData"></param>
  static OnCopyData(guiMgForm: GuiMgForm, copyData: number): void {
    if (Events.CopyDataEvent !== null) {
      Events.CopyDataEvent(guiMgForm, copyData);
    }
  }

  constructor() {
  }
}
