import {MgControlBase} from "../gui/MgControlBase";

/// <summary>
/// functionality required by the GUI namespace from the ActionManager class.
/// </summary>
export interface IActionManager {
  /// <summary>
  ///   sets action enabled or disabled
  /// </summary>
  /// <param name = "act"></param>
  /// <param name = "enable"></param>
  enable(act: number, enable: boolean): void;

  /// <param name = "act"></param>
  /// <returns> true if the action is enabled or false if it is not</returns>
  isEnabled(act: number): boolean;

  /// <param name = "act"></param>
  /// <returns> actCount for the specific action</returns>
  getActCount(act: number): number;

  /// <summary>
  ///   sets action list enabled or disabled.
  ///   onlyIfChanged was added in order to avoid many updates to menus (like in cut/copy),
  ///   especially when the request comes as an internal act from the gui thread.
  /// </summary>
  /// <param name = "act">array of actions</param>
  /// <param name = "enable"></param>
  /// <param name = "onlyIfChanged">: call enable only if the state has changed.</param>
  enableList(act: number[], enable: boolean, onlyIfChanged: boolean): void;

  /// <summary>
  ///   enable or disable actions for ACT_STT_EDT_EDITING state
  /// </summary>
  /// <param name = "enable"></param>
  enableEditingActions(enable: boolean): void;

  /// <summary>
  ///   enable or disable actions for Multi-line edit
  /// </summary>
  /// <param name = "enable"></param>
  enableMLEActions(enable: boolean): void;

  /// <summary>
  ///   enable or disable actions for navigation
  /// </summary>
  /// <param name = "enable"></param>
  enableNavigationActions(enable: boolean): void;

  /// <summary>
  ///   This is the work thread method to check if to enable/disable the paste action.
  ///   It is equivalent to the GuiUtils.checkPasteEnable (used by the gui thread).
  /// </summary>
  /// <param name = "ctrl"></param>
  checkPasteEnable(ctrl: MgControlBase): void;
}
