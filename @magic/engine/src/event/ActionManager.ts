import {InternalInterface} from "@magic/utils";
import {IActionManager, Manager, MgControlBase} from "@magic/gui";
import {Task} from "../tasks/Task";

export class ActionManager implements IActionManager {
  static actEnabled: number[] = [
    InternalInterface.MG_ACT_CLOSE, InternalInterface.MG_ACT_EXIT,
    InternalInterface.MG_ACT_RTO_MODIFY,
    InternalInterface.MG_ACT_RTO_CREATE,
    InternalInterface.MG_ACT_RTO_QUERY, InternalInterface.MG_ACT_OK,
    InternalInterface.MG_ACT_CANCEL,
    InternalInterface.MG_ACT_TBL_PRVFLD,
    InternalInterface.MG_ACT_TBL_NXTFLD,
    InternalInterface.MG_ACT_TBL_BEGLINE,
    InternalInterface.MG_ACT_TBL_ENDLINE,
    InternalInterface.MG_ACT_TBL_BEGPAGE,
    InternalInterface.MG_ACT_TAB_NEXT,
    InternalInterface.MG_ACT_TAB_PREV,
    InternalInterface.MG_ACT_TBL_ENDPAGE,
    InternalInterface.MG_ACT_USING_HELP,
    InternalInterface.MG_ACT_HELP, InternalInterface.MG_ACT_ABOUT,
    InternalInterface.MG_ACT_CONTEXT_MENU,
    InternalInterface.MG_ACT_CTRL_HIT, InternalInterface.MG_ACT_HIT,
    InternalInterface.MG_ACT_WINSIZE,
    InternalInterface.MG_ACT_WINMOVE,
    InternalInterface.MG_ACT_WEB_ON_DBLICK,
    InternalInterface.MG_ACT_WEB_CLICK,
    InternalInterface.MG_ACT_WEB_MOUSE_OUT,
    InternalInterface.MG_ACT_WEB_MOUSE_OVER,
    InternalInterface.MG_ACT_RT_REFRESH_RECORD,
    InternalInterface.MG_ACT_RT_REFRESH_SCREEN,
    InternalInterface.MG_ACT_RT_REFRESH_VIEW,
    InternalInterface.MG_ACT_RT_QUIT,
    InternalInterface.MG_ACT_BEGIN_DRAG,
    InternalInterface.MG_ACT_BEGIN_DROP,
    InternalInterface.MG_ACT_SERVER_TERMINATION,
    InternalInterface.MG_ACT_SUBFORM_REFRESH,
    InternalInterface.MG_ACT_TBL_REORDER,
    InternalInterface.MG_ACT_EXIT_SYSTEM,
    InternalInterface.MG_ACT_SUBFORM_OPEN,
    InternalInterface.MG_ACT_COL_SORT,
    InternalInterface.MG_ACT_CTRL_MODIFY,
    InternalInterface.MG_ACT_ROLLBACK,
    InternalInterface.MG_ACT_BROWSER_STS_TEXT_CHANGE,
    InternalInterface.MG_ACT_EXT_EVENT,
    InternalInterface.MG_ACT_COL_CLICK,
    InternalInterface.MG_ACT_UPDATE_DN_CONTROL_VALUE,
    InternalInterface.MG_ACT_PRESS,
    InternalInterface.MG_ACT_SWITCH_TO_OFFLINE,
    InternalInterface.MG_ACT_UNAVAILABLE_SERVER,
    InternalInterface.MG_ACT_ENABLE_EVENTS,
    InternalInterface.MG_ACT_OPEN_FORM_DESIGNER,
    InternalInterface.MG_ACT_COL_FILTER,
    InternalInterface.MG_ACT_NEXT_RT_WINDOW,
    InternalInterface.MG_ACT_PREV_RT_WINDOW,
    InternalInterface.MG_ACT_INDEX_CHANGE,
    InternalInterface.MG_ACT_WEBCLIENT_ROUTE
  ];

  // TODO: Do we need this?
  static actMDIFrameEnabled: number[] = [
    InternalInterface.MG_ACT_CLOSE,
    InternalInterface.MG_ACT_EXIT,
    InternalInterface.MG_ACT_HELP,
    InternalInterface.MG_ACT_WINSIZE,
    InternalInterface.MG_ACT_WINMOVE,
    InternalInterface.MG_ACT_EXIT_SYSTEM,
    InternalInterface.MG_ACT_CONTEXT_MENU,
    InternalInterface.MG_ACT_UNAVAILABLE_SERVER,
    InternalInterface.MG_ACT_ENABLE_EVENTS
  ];

  private static actEditing: number[] = [
    InternalInterface.MG_ACT_CHAR,
    InternalInterface.MG_ACT_EDT_MARKPRVCH,
    InternalInterface.MG_ACT_EDT_MARKNXTCH,
    InternalInterface.MG_ACT_EDT_MARKTOBEG,
    InternalInterface.MG_ACT_EDT_MARKTOEND,
    InternalInterface.MG_ACT_EDT_BEGFLD,
    InternalInterface.MG_ACT_EDT_ENDFLD,
    InternalInterface.MG_ACT_EDT_PRVCHAR,
    InternalInterface.MG_ACT_EDT_NXTCHAR,
    InternalInterface.MG_ACT_EDT_PRVWORD,
    InternalInterface.MG_ACT_EDT_NXTWORD,
    InternalInterface.MG_ACT_EDT_DELCURCH,
    InternalInterface.MG_ACT_EDT_DELPRVCH,
    InternalInterface.MG_ACT_EDT_UNDO,
    InternalInterface.MG_ACT_EDT_MARKALL
  ];

  private static actMLE: number[] = [
    InternalInterface.MG_ACT_EDT_PRVLINE,
    InternalInterface.MG_ACT_EDT_NXTLINE,
    InternalInterface.MG_ACT_EDT_PRVPAGE,
    InternalInterface.MG_ACT_EDT_NXTPAGE,
    InternalInterface.MG_ACT_EDT_BEGLINE,
    InternalInterface.MG_ACT_EDT_ENDLINE,
    InternalInterface.MG_ACT_EDT_BEGPAGE,
    InternalInterface.MG_ACT_EDT_ENDPAGE,
    InternalInterface.MG_ACT_EDT_BEGFORM,
    InternalInterface.MG_ACT_EDT_ENDFORM,
    InternalInterface.MG_ACT_EDT_BEGNXTLINE,
    InternalInterface.MG_ACT_EDT_MARKPRVLINE
  ];

  private static actNavigation: number[] = [
    InternalInterface.MG_ACT_TBL_PRVLINE,
    InternalInterface.MG_ACT_TBL_PRVPAGE,
    InternalInterface.MG_ACT_TBL_BEGTBL,
    InternalInterface.MG_ACT_TBL_NXTLINE,
    InternalInterface.MG_ACT_TBL_NXTPAGE,
    InternalInterface.MG_ACT_TBL_ENDTBL
  ];

  private static _actPaste: number[] = [
    InternalInterface.MG_ACT_CLIP_PASTE
  ];

  private _actCount: number[] = null; // to know which action was last enabled
  private _actState: boolean[] = null; // action state array for all 526 actions
  private _parentTask: Task = null;
  private _numerator: number = 0; // generator for actCount

  constructor(parent: Task) {
    this._parentTask = parent;
    this._numerator = 0;

    this._actState = new Array<boolean>(InternalInterface.MG_ACT_TOT_CNT);
    for (let _ai: number = 0; _ai < this._actState.length; ++_ai)
      this._actState[_ai] = false;

    this._actCount = new Array<number>(InternalInterface.MG_ACT_TOT_CNT);
    for (let _ai: number = 0; _ai < this._actCount.length; ++_ai)
      this._actCount[_ai] = 0;
  }

  /// <summary>
  ///   sets action enabled or disabled
  /// </summary>
  /// <param name = "act"></param>
  /// <param name = "enable"></param>
  enable(act: number, enable: boolean): void {
    let valueChanged: boolean = this._actState[act] !== enable;
    this._actState[act] = enable;

    if (enable) {
      this._numerator++;
      this._actCount[act] = this._numerator;
    }

    if (valueChanged) {
      this._parentTask.enableActionMenu(act, enable);
    }
  }

  /// <param name = "act"></param>
  /// <returns> true if the action is enabled or false if it is not</returns>
  isEnabled(act: number): boolean {
    return this._actState[act];
  }

  /// <param name = "act"></param>
  /// <returns> actCount for the specific action</returns>
  getActCount(act: number): number {
    return this._actCount[act];
  }

  /// <summary>
  ///   sets action list enabled or disabled.
  ///   onlyIfChanged was added in order to avoid many updates to menus (like in cut/copy),
  ///   especially when the request comes as an internal act from the gui thread.
  /// </summary>
  /// <param name = "act">array of actions</param>
  /// <param name = "enable"></param>
  /// <param name = "onlyIfChanged">: call enable only if the state has changed.</param>
  enableList(act: number[], enable: boolean, onlyIfChanged: boolean): void {
    for (let i: number = 0; i < act.length; i = i + 1) {
      let num: number = act[i];
      let flag: boolean = !onlyIfChanged || this._actState[num] !== enable;
      if (flag) {
        this.enable(num, enable);
      }
    }
  }

  /// <summary>
  ///   enable or disable actions for ACT_STT_EDT_EDITING state
  /// </summary>
  /// <param name = "enable"></param>
  enableEditingActions(enable: boolean): void {
    this.enableList(ActionManager.actEditing, enable, false);
  }

  /// <summary>
  ///   enable or disable actions for Multi-line edit
  /// </summary>
  /// <param name = "enable"></param>
  enableMLEActions(enable: boolean): void {
    this.enableList(ActionManager.actMLE, enable, false);
  }

  /// <summary>
  ///   enable or disable actions for navigation
  /// </summary>
  /// <param name = "enable"></param>
  enableNavigationActions(enable: boolean): void {
    this.enableList(ActionManager.actNavigation, enable, false);
  }

  /// <summary>
  ///   This is the work thread method to check if to enable/disable the paste action.
  ///   It is equivalent to the GuiUtils.checkPasteEnable (used by the gui thread).
  /// </summary>
  checkPasteEnable(ctrl: MgControlBase): void {
    let enable: boolean = false;
    if (ctrl !== null && ctrl.isTextControl() && ctrl.isModifiable() && Manager.ClipboardRead() !== null)
      enable = true;

    this.enableList(ActionManager._actPaste, enable, true);
  }
}
