import {MenuEntry} from "./MenuEntry";
import {KeyboardItem} from "../../gui/KeyboardItem";
import {List, RefParam} from "@magic/mscorelib";
import {MgMenu} from "./MgMenu";
import {InternalInterface} from "@magic/utils";
import {GuiMenuEntry_MenuType, MenuStyle} from "../../GuiEnums";
import {MgFormBase} from "./MgFormBase";

export class MenuEntryEvent extends MenuEntry {
  // internal event data
  private _internalEvent: number = 0;

  set InternalEvent(value: number) {
    this._internalEvent = value;
    if (this._internalEvent < InternalInterface.MG_ACT_USER_ACTION_1 ||
      this._internalEvent > InternalInterface.MG_ACT_USER_ACTION_20) {
      super.setEnabled(false, false, false);
    }
  }

  get InternalEvent(): number {
    return this._internalEvent;
  }

  // system event data
  KbdEvent: KeyboardItem = null;        // kbdItm data
  MainProgVars: List<string> = null;    // argument from the main program
  Prompt: string = null;                // prompt

  // user event data
  UserEvtCompIndex: number = 0;         // Index of the component
  UserEvtIdx: number = 0;               // index of the user event in the tasks user events table
  UserEvtTaskId: string = null;         // ID of the task where the user event is defined
  DestinationContext: string = null;    // dest. Context

  /// <summary>
  /// CTOR
  /// </summary>
  /// <param name="mgMenu"></param>
  constructor(mgMenu: MgMenu) {
    super(0, mgMenu);
  }

  getMgMenu(): MgMenu {
    return super.getParentMgMenu();
  }

  protected OnSetEnabled(enabled: RefParam<boolean>, checkValidation: boolean, checkEnableSystemAction: boolean, checkForName: string, IsChildOfCheckForName: boolean, refresh: boolean): void {
    if (checkEnableSystemAction) {
      let notAllowDisable: boolean = super.menuType() === GuiMenuEntry_MenuType.INTERNAL_EVENT &&
        (this.InternalEvent < InternalInterface.MG_ACT_USER_ACTION_1 || this.InternalEvent > InternalInterface.MG_ACT_USER_ACTION_20);
      if (notAllowDisable) {
        return;
      }
      if (super.menuType() === GuiMenuEntry_MenuType.INTERNAL_EVENT) {
        if (this.InternalEvent === 0) {
          enabled.value = false;
        }
      }
      else {
        if (super.menuType() === GuiMenuEntry_MenuType.USER_EVENT) {
          if (this.UserEvtIdx === 0) {
            enabled.value = false;
          }
        }
      }
    }
    super.OnSetEnabled(enabled, checkValidation, checkEnableSystemAction, checkForName, IsChildOfCheckForName, refresh);
  }

  protected OnCreateMenuEntryObject(parentMenuObject: any, menuStyle: MenuStyle, form: MgFormBase, callFromMenuShowFunction: boolean): void {

  }

  protected OnCreateMenuEntryObject_2(createSWTmenu: boolean, hasTool: boolean): void {

    if (createSWTmenu) {
      this._parentMgMenu.addEntryToInternalEventsOnMenus(this);
    }

    if (hasTool) {
      this._parentMgMenu.addEntryToInternalEventsOnToolBar(this);
    }
  }

  public getPrompt(): string {
    return this.Prompt;
  }
}
