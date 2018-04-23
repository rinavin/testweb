import {Debug} from "@magic/mscorelib";
import {InternalInterface, MgControlType, StrUtil} from "@magic/utils";
import {GuiMgForm} from "./gui/GuiMgForm";
import {Events} from "./Events";
import {GuiMgControl} from "./gui/GuiMgControl";
import {MgControlBase} from "./management/gui/MgControlBase";
import {Manager} from "./Manager";
import {CommandType, MenuStyle, Modifiers, RaisedBy} from "./GuiEnums";
import {MgFormBase} from "./management/gui/MgFormBase";
import {TaskBase} from "./management/tasks/TaskBase";
import {ApplicationMenus} from "./management/gui/ApplicationMenus";
import {GuiConstants} from "./GuiConstants";
import {Commands} from "./Commands";
import {PropInterface} from "./management/gui/PropInterface";
import {GuiMgMenu} from "./gui/GuiMgMenu";
import {MgMenu} from "./management/gui/MgMenu";
import {GuiMenuEntry} from "./gui/GuiMenuEntry";
import {MenuEntry} from "./management/gui/MenuEntry";

/// <summary>
/// (1) registers and implements handlers for events that can be served locally by MgGui.dll.
/// (2) requests subclasses to register their handlers ('Template Method' design pattern).
/// </summary>
export  abstract class EventsProcessor {
  static WindowResizeEvent: (form: GuiMgForm) => void = null;
  static WindowMoveEvent: (form: GuiMgForm) => void = null;

  constructor() {
    this.RegisterHandlers();
    this.RegisterSubclassHandlers();
  }

  /// <summary>register and implement handlers for events that can be served locally by MgGui.dll.</summary>
  private RegisterHandlers(): void {
    Events.KeyDownEvent = this.processKeyDown.bind(this);
    Events.ComboDroppingDownEvent = this.processComboDroppingDown;
    Events.WindowResizeEvent = this.processWindowResize;
    Events.WindowMoveEvent = this.processWindowMove;
    Events.MouseDownEvent = this.processMouseDown;
    Events.MouseOverEvent = this.processMouseOver;
    Events.MouseOutEvent = this.processMouseOut;
    Events.DblClickEvent = this.processDblClick;
    Events.CloseFormEvent = this.processFormClose;
    Events.RefreshMenuActionsEvent = this.refreshMenuActions;
    Events.MenuSelectionEvent = this.onMenuSelection;
    Events.OnMenuPromptEvent = this.onMenuPrompt;
    Events.GetApplicationMenusEvent = this.getApplicationMenus;
    Events.ColumnClickEvent = this.ProcessColumnClick;
    Events.ColumnFilterEvent = this.ProcessColumnFilter;
    Events.IsContextMenuAllowedEvent = this.isContextMenuAllowed;
    Events.MultimarkHitEvent = this.processMultimarkHitEvent;
    Events.ContextMenuCloseEvent = this.processContextMenuClose;
    Events.BeginDragEvent = this.processBeginDrag;
    Events.BeginDropEvent = this.processBeginDrop;
    Events.GetDropUserFormatsEvent = this.GetDropUserFormats;
  }

  // request subclasses to register handlers that they will implement ('Template Method' design pattern).
  abstract RegisterSubclassHandlers();

  /// <summary> combo is dropping down </summary>
  /// <param name = "guiMgCtrl"></param>
  /// <param name = "line"></param>
  private processComboDroppingDown(guiMgCtrl: GuiMgControl, line: number): void {
    let mgControl: MgControlBase = <MgControlBase>guiMgCtrl;
    Manager.EventsManager.addGuiTriggeredEventWithCtrlAndCodeAndLine(mgControl, InternalInterface.MG_ACT_COMBO_DROP_DOWN, line);
  }

  /// <summary>Pass keycode and modifier to bridge, bridge then converts it to keyboard action and adds in MgCore.dll
  /// events queue</summary>
  /// <param name="form"></param>
  /// <param name="guiMgCtrl"></param>
  /// <param name="modifier"></param>
  /// <param name="keyCode"></param>
  /// <param name="start"></param>
  /// <param name="end"></param>
  /// <param name="caretPos"></param>
  /// <param name="text"></param>
  /// <param name="im"></param>
  /// <param name="isActChar"></param>
  /// <param name="suggestedValue"></param>
  /// <param name="ComboIsDropDown"></param>
  /// <param name="handled">boolean variable event is handled or not.</param>
  /// <returns> true only if we have handled the KeyDown event (otherwise the CLR should handle). If true magic will handle else CLR will handle.</returns>
  processKeyDown(guiMgForm: GuiMgForm, guiMgCtrl: GuiMgControl, modifier: Modifiers, keyCode: number, start: number, end: number, text: string, isActChar: boolean, suggestedValue: string, ComboIsDropDown: boolean, handled: boolean): boolean {
    let eventHandled: boolean = handled;
    let addKeyBoardEvent: boolean = true;

    let mgControlBase: MgControlBase = <MgControlBase>guiMgCtrl;
    let mgFormBase: MgFormBase = <MgFormBase>guiMgForm;

    if (mgControlBase !== null) {

      // In case of help window, the events like up arrow\down arrow key, should be handled by the
      // CLR.So first check if the form is help form and return the value true or false.

      if (mgControlBase.getForm() !== null && mgControlBase.getForm().IsHelpWindow && keyCode !== GuiConstants.KEY_ESC) {
        // events related with the help window will NOT be handled by magic.
        return false;
      }

      // DOWN or UP invoked on a SELECT/RADIO control
      if (mgControlBase.isRadio() || mgControlBase.isListBox() ||
        (mgControlBase.isComboBox() && ComboIsDropDown) ||
        (mgControlBase.isTabControl() && !(suggestedValue === "-1"))) {
        if (this.processKeyForSelectionControl(mgFormBase, mgControlBase, modifier, keyCode, suggestedValue)) {
          addKeyBoardEvent = false;
        }
      }
    }
    if (addKeyBoardEvent) {
      Manager.EventsManager.AddKeyboardEvent(mgFormBase, mgControlBase, modifier, keyCode, start, end, text, isActChar, suggestedValue, InternalInterface.MG_ACT_CTRL_KEYDOWN);
    }
    return eventHandled;
  }

  /// <summary>
  /// put multimark hit event
  /// </summary>
  /// <param name="guiMgCtrl"></param>
  /// <param name="row"></param>
  private processMultimarkHitEvent(guiMgCtrl: GuiMgControl, row: number, modifier: Modifiers): void {
    Manager.EventsManager.addGuiTriggeredEventWithCtrlAndCodeAndLineAndModifier(<MgControlBase>guiMgCtrl, InternalInterface.MG_ACT_MULTI_MARK_HIT, row, modifier);
  }

  /// <summary>
  ///   send MG_ACT_ARROW_KEY to worker thread form key down,up,left,right
  ///   we are handling those keys
  /// </summary>
  /// <param name = "mgControl"> </param>
  /// <param name = "modifier"> </param>
  /// <param name = "keyCode"> </param>
  /// <param name = "suggestedValue"> </param>
  /// <returns> true if need to ignore this action key</returns>
  private processKeyForSelectionControl(mgForm: MgFormBase, mgControl: MgControlBase, modifier: Modifiers, keyCode: number, suggestedValue: string): boolean {
    let isSelectionKey: boolean = false;

    switch (keyCode) {
      case GuiConstants.KEY_DOWN:
      case GuiConstants.KEY_UP:
        isSelectionKey = true;
        break;

      case GuiConstants.KEY_RIGHT:
      case GuiConstants.KEY_LEFT:
        if (!mgControl.isListBox())
          isSelectionKey = true;
        break;

      case GuiConstants.KEY_SPACE:
        if (mgControl.isRadio())
          isSelectionKey = true;
        break;

      case GuiConstants.KEY_PG_DOWN:
      case GuiConstants.KEY_PG_UP:
      case GuiConstants.KEY_HOME:
      case GuiConstants.KEY_END:
        if (mgControl.isComboBox())
          isSelectionKey = true;
        break;
    }

    if (isSelectionKey) {
      // raise event

      Manager.EventsManager.AddKeyboardEvent(mgForm, mgControl, modifier, keyCode, 0, 0, null, false, suggestedValue, InternalInterface.MG_ACT_ARROW_KEY);
    }
    return isSelectionKey;
  }

  /// <summary>
  /// Function handling form close event.
  /// </summary>
  /// <param name="guiMgForm"></param>
  /// <returns>true if event is CLR handled else false.</returns>
  processFormClose(guiMgForm: GuiMgForm): boolean {
    let clrHandledEvent: boolean = false;
    let mgFormBase: MgFormBase = <MgFormBase>guiMgForm;

    if (mgFormBase.IsMDIFrame) {
      Manager.EventsManager.addGuiTriggeredEventWithTaskAndCode(mgFormBase.getTask(), InternalInterface.MG_ACT_EXIT_SYSTEM);
    }
    else {
      if (!mgFormBase.IsHelpWindow) {
        if (MgFormBase.ShouldPutActOnFormClose())
          Manager.EventsManager.addGuiTriggeredEventTaskAndCodeAndRaisedBy(mgFormBase.getTask(), InternalInterface.MG_ACT_HIT, RaisedBy.CLOSE_SYSTEM_MENU);
        Manager.EventsManager.addGuiTriggeredEventWithTaskAndCode(mgFormBase.getTask(), InternalInterface.MG_ACT_CLOSE);
      }
      else {
        if (mgFormBase.Opened)
          clrHandledEvent = true;
      }
    }

    return clrHandledEvent;
  }

  /// <summary>Process Window Resize</summary>
  /// <param name = "guiMgForm">form</param>
  private processWindowResize(guiMgForm: GuiMgForm): void {
    let mgFormBase: MgFormBase = <MgFormBase>guiMgForm;
    Manager.EventsManager.addGuiTriggeredEventWithTaskAndCode(mgFormBase.getTask(), InternalInterface.MG_ACT_WINSIZE);
  }

  /// <summary>Process Window Move</summary>
  /// <param name = "guiMgForm">form</param>
  private processWindowMove(guiMgForm: GuiMgForm): void {
    let mgFormBase: MgFormBase = <MgFormBase>guiMgForm;
    Manager.EventsManager.addGuiTriggeredEventWithTaskAndCode(mgFormBase.getTask(), InternalInterface.MG_ACT_WINMOVE);
  }

  /// <summary></summary>
  /// <param name = "guiMgForm"></param>
  /// <param name = "guiMgCtrl"></param>
  /// <param name = "dotNetArgs"></param>
  /// <param name = "leftClickWasPressed"></param>
  /// <param name = "line"></param>
  private processMouseDown(guiMgForm: GuiMgForm, guiMgCtrl: GuiMgControl, dotNetArgs: any[], leftClickWasPressed: boolean, line: number, onMultiMark: boolean, canProduceClick: boolean): void {
    let mgControl: MgControlBase = <MgControlBase>guiMgCtrl;

    if (mgControl === null) {
      Debug.Assert(guiMgForm !== null);
      // As in online. clicking on a form results in ACT_HIT
      Manager.EventsManager.addGuiTriggeredEventWithTaskAndCodeAndOnMultiMark((<MgFormBase>guiMgForm).getTask(), InternalInterface.MG_ACT_HIT, onMultiMark);
    }
    else {
      if (mgControl.isSubform()) {
        mgControl.OnSubformClick();
      }
      else {
        if (mgControl.RaiseControlHitOnMouseDown(leftClickWasPressed)) {
          Manager.EventsManager.addGuiTriggeredEventWithCtrlAndCodeAndLine(mgControl, InternalInterface.MG_ACT_CTRL_HIT, line);
        }
        if (leftClickWasPressed && canProduceClick) {
          // fixed bug#927942
          // we never get to this method with the control type button & checkbox.
          // for button & checkbox, we sent the trigger MG_ACT_WEB_CLICK in EventsManager.handleMouseUp() that call
          // from simulateSelection()
          // the "if" is only for make sure that if we will get it (in the feture) we will not be sent the same trigger twice
          if (mgControl.Type !== MgControlType.CTRL_TYPE_BUTTON && mgControl.Type !== MgControlType.CTRL_TYPE_CHECKBOX) {
            Manager.EventsManager.addGuiTriggeredEventWithCtrlAndCodeAndLine(mgControl, InternalInterface.MG_ACT_WEB_CLICK, line);
          }
        }
      }
    }
  }

  /// <summary>process "mouseover" event</summary>
  ///<param name = "guiMgCtrl">the control</param>
  private processMouseOver(guiMgCtrl: GuiMgControl): void {
    let mgControl: MgControlBase = <MgControlBase>guiMgCtrl;
    Manager.EventsManager.addGuiTriggeredEventWithCtrlAndCodeAndLine(mgControl, InternalInterface.MG_ACT_WEB_MOUSE_OVER, 0);
  }

  /// <summary>process "mouseout" event</summary>
  ///<param name = "guiMgCtrl">the control</param>
  private processMouseOut(guiMgCtrl: GuiMgControl): void {
    let mgControl: MgControlBase = <MgControlBase>guiMgCtrl;
    Manager.EventsManager.addGuiTriggeredEventWithCtrlAndCodeAndLine(mgControl, InternalInterface.MG_ACT_WEB_MOUSE_OUT, 0);
  }

  /// <summary>process "dblclick" event</summary>
  /// <param name = "guiMgCtrl">the control </param>
  /// <param name = "line"> the line of the multiline control </param>
  private processDblClick(guiMgCtrl: GuiMgControl, line: number): void {
    let mgControl: MgControlBase = <MgControlBase>guiMgCtrl;
    if (!mgControl.GetComputedBooleanProperty(PropInterface.PROP_TYPE_ENABLED, true, line))
      return;

    // raising the internal events : MG_ACT_SELECT and MG_ACT_ZOOM was moved to commonHandler under the
    // MG_ACT_WEB_ON_DBLICK case.
    // This is different then the behavior of online because we fixed QCR #990836 only in rich.
    // In rich, 1st dbclick is raised. Then if there is a handler on it with propogate ='YES', only then the zoom/select
    // will be raised. A Propagate 'NO' will block them.

    Manager.EventsManager.addGuiTriggeredEventWithCtrlAndCodeAndLine(mgControl, InternalInterface.MG_ACT_WEB_ON_DBLICK, line);
  }

  /// <summary> handle Column Click event on Column </summary>
  /// <param name="guiColumnCtrl"></param>
  /// <param name="direction"></param>
  /// <param name="columnHeader"></param>
  private ProcessColumnClick(guiColumnCtrl: GuiMgControl, direction: number, columnHeader: string): void {
    let mgColumnControl: MgControlBase = <MgControlBase>guiColumnCtrl;
    Manager.EventsManager.AddColumnClickEvent(mgColumnControl, direction, columnHeader);
  }

  /// <summary>
  /// Handle column filter click event
  /// </summary>
  /// <param name="columnCtrl"></param>
  /// <param name="columnHeader"></param>
  /// <param name="index"></param>
  /// <param name="x"></param>
  /// <param name="y"></param>
  private ProcessColumnFilter(columnCtrl: GuiMgControl, columnHeader: string, x: number, y: number, width: number, height: number): void {
    let mgColumnControl: MgControlBase = <MgControlBase>columnCtrl;
    // values that sent to the event, sent in display %. We want that it will be always in 100%.
    let mapObject: any = (<MgFormBase>mgColumnControl.GuiMgForm).getMapObject();
    let resolution: number = <number>Commands.getResolution(mapObject).x / 96;
    x = Math.floor(x / resolution);
    y = Math.floor(y / resolution);
    width = Math.floor(width / resolution);
    height = Math.floor(height / resolution);
    Manager.EventsManager.AddColumnFilterEvent(mgColumnControl, columnHeader, x, y, width, height);
  }

  /// <summary> returns if ContextMenu is allowed </summary>
  /// <param name="guiMgControl"></param>
  private isContextMenuAllowed(guiMgControl: GuiMgControl): boolean {
    let mgControl: MgControlBase = <MgControlBase>guiMgControl;
    return mgControl.getForm().getTask().IsInteractive;
  }

  /// <summary> returns if ContextMenu is allowed </summary>
  /// <param name="guiMgForm"></param>
  /// <param name="guiMgMenu"></param>
  private processContextMenuClose(guiMgForm: GuiMgForm, guiMgMenu: GuiMgMenu): void {
    Commands.addAsync(CommandType.DELETE_MENU, guiMgForm, guiMgForm, MenuStyle.MENU_STYLE_CONTEXT, guiMgMenu, true);
  }

  /// <summary> Refresh internal actions used in Menus </summary>
  /// <param name = "guiMgMenu"></param>
  /// <param name = "guiMgForm"></param>
  private refreshMenuActions(guiMgMenu: GuiMgMenu, guiMgForm: GuiMgForm): void {
    let mgMenu: MgMenu = <MgMenu>guiMgMenu;
    let mgForm: MgFormBase = <MgFormBase>guiMgForm;

    if (mgMenu !== null) {
      mgMenu.refreshInternalEventMenus(mgForm);
    }
  }


  private onMenuSelection(menuEntry: GuiMenuEntry, activeForm: GuiMgForm, activatedFromMDIFrame: boolean): void {
    Manager.MenuManager.onMenuSelection(menuEntry, activeForm, activatedFromMDIFrame);
  }

  /// <summary> </summary>
  /// <param name = "guiMgForm"></param>
  /// <param name = "prompt"></param>
  private onMenuPrompt(guiMgForm: GuiMgForm, guiMenuEntry: GuiMenuEntry): void {
    let mgForm: MgFormBase = null;
    let task: TaskBase = null;

    if (guiMgForm instanceof MgFormBase) {
      mgForm = <MgFormBase>guiMgForm;
    }
    if (mgForm !== null) {
      task = mgForm.getTask();
    }
    if (task !== null) {
      if (guiMenuEntry === null) {
        if (!task.isAborting()) {
          Manager.CleanMessagePane(task);
        }
      }
      else {
        if (guiMenuEntry instanceof MenuEntry) {
          let menuEntry: MenuEntry = <MenuEntry>guiMenuEntry;

          let prompt: string = menuEntry.getPrompt();
          if (prompt === null) {
            prompt = "";
          }
          Manager.WriteToMessagePane(task, StrUtil.makePrintable(prompt), false);
        }
      }
    }
  }

  /// <summary>
  /// returns the application menus
  /// </summary>
  /// <param name="ctlIdx"></param>
  /// <returns></returns>
  private getApplicationMenus(contextID: number, ctlIdx: number): ApplicationMenus {
    let mainProg: TaskBase = Events.GetMainProgram(contextID, ctlIdx);
    return Manager.MenuManager.getApplicationMenus(mainProg);
  }

  /// <summary>
  /// Perform action required when object is dragged.
  /// Put ACT_BEGIN_DRAG action.
  /// </summary>
  /// <param name="guiMgCtrl"></param>
  /// <param name="line"></param>
  processBeginDrag(guiMgCtrl: GuiMgControl, line: number): void {
    let mgControl: MgControlBase = <MgControlBase>guiMgCtrl;
    Manager.EventsManager.addGuiTriggeredEventWithCtrlAndCodeAndLine(mgControl, InternalInterface.MG_ACT_BEGIN_DRAG, line);
  }

  /// <summary>
  /// Perform actions required when a dragged object is dropped (mouse released).
  /// Put actions : ACT_CTRL_HIT or ACT_HIT and MG_ACT_BEGIN_DROP.
  /// </summary>
  /// <param name="guiMgForm"></param>
  /// <param name="guiMgCtrl"></param>
  /// <param name="line"></param>
  processBeginDrop(guiMgForm: GuiMgForm, guiMgCtrl: GuiMgControl, line: number): void {
    let mgControl: MgControlBase = <MgControlBase>guiMgCtrl;
    let mgForm: MgFormBase = (guiMgForm === null) ? mgControl.getForm() : (<MgFormBase>guiMgForm);
    let isCtrlHit: boolean = (mgControl != null) ? true : false;  // Drop occurs on a control or a form?

    if (isCtrlHit) {
      Manager.EventsManager.addGuiTriggeredEventWithCtrlAndCodeAndLine(mgControl, InternalInterface.MG_ACT_CTRL_HIT, line);

      if (mgControl.isSubform()) {
        Manager.EventsManager.addGuiTriggeredEventWithTaskAndCode(mgControl.GetSubformMgForm().getTask(), InternalInterface.MG_ACT_BEGIN_DROP);
      }
      else {
        Manager.EventsManager.addGuiTriggeredEventWithCtrlAndCodeAndLine(mgControl, InternalInterface.MG_ACT_BEGIN_DROP, line);
      }
    }
    else {
      // If Drop occurs on FORM.
      Manager.EventsManager.addGuiTriggeredEventWithTaskAndCode(mgForm.getTask(), InternalInterface.MG_ACT_HIT);
      Manager.EventsManager.addGuiTriggeredEventWithTaskAndCode(mgForm.getTask(), InternalInterface.MG_ACT_BEGIN_DROP);
    }
  }

  /// <summary>
  ///  Gets the user defined drop formats from the MgCore.
  /// </summary>
  /// <returns></returns>
  private GetDropUserFormats(): string {
    return Manager.Environment.GetDropUserFormats();
  }

  /// <summary> invokes the WindowResize Event</summary>
  /// <param name="form"></param>
  static OnWindowResize(form: GuiMgForm): void {
    Debug.Assert(EventsProcessor.WindowResizeEvent !== null);
    EventsProcessor.WindowResizeEvent(form);
  }

  /// <summary> invokes the WindowMove Event</summary>
  /// <param name="form"></param>
  static OnWindowMove(form: GuiMgForm): void {
    Debug.Assert(EventsProcessor.WindowMoveEvent !== null);
    EventsProcessor.WindowMoveEvent(form);
  }
}
