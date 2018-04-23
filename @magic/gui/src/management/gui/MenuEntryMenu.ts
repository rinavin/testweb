import {MenuEntry} from "./MenuEntry";
import {List, NString, RefParam, Array_Enumerator} from "@magic/mscorelib";
import {MgMenu} from "./MgMenu";
import {GuiMenuEntry_MenuType, MenuStyle} from "../../GuiEnums";
import {MgFormBase} from "./MgFormBase";
import {Manager} from "../../Manager";
import {MenuReference} from "../../gui/low/MenuReference";
import {GuiMgForm} from "../../gui/GuiMgForm";
import {TaskBase} from "../tasks/TaskBase";

export class MenuEntryMenu extends MenuEntry {
  subMenus: List<MenuEntry> = null;

  constructor(mgMenu: MgMenu) {
    super(GuiMenuEntry_MenuType.MENU, mgMenu);
    this.subMenus = new List<MenuEntry>();
  }

  addSubMenu(newEntry: MenuEntry): void;
  addSubMenu(newEntry: MenuEntry, index: number): void;
  addSubMenu(newEntry: MenuEntry, index?: number): void {
    if (arguments.length === 1)
      this.addSubMenu_0(newEntry);
    else
      this.addSubMenu_1(newEntry, index);
  }

  private addSubMenu_0(newEntry: MenuEntry): void {
    newEntry.ParentMenuEntry = this;
    this.subMenus.push(newEntry);
  }

  private addSubMenu_1(newEntry: MenuEntry, index: number): void {
    newEntry.ParentMenuEntry = this;
    this.subMenus.Insert(index, newEntry);
  }

  removeAt(index: number, form: MgFormBase): void {
    this.subMenus.get_Item(index).deleteMenuEntryObject(form, MenuStyle.MENU_STYLE_PULLDOWN);
    this.subMenus.RemoveAt(index);
  }

  iterator(): Array_Enumerator<MenuEntry> {
    return this.subMenus.GetEnumerator();
  }

  dispose(): void {
    for (let i: number = 0; i < this.subMenus.length; i = i + 1) {
      let menuEntry: MenuEntry = this.subMenus.get_Item(i);
      menuEntry.dispose();
    }
    super.dispose();
  }

  /// <summary>
  /// This method updates the indexes of the menu's children
  /// </summary>
  /// <param name = "drillDown">-
  /// tells us if we need to perform the same for all sub menus, or only for the entries in the
  /// current level
  /// </param>
  setIndexes(drillDown: boolean): void {
    let num: number = 0;
    let enumerator: Array_Enumerator<MenuEntry> = this.iterator();
    while (enumerator.MoveNext()) {
      let innerMnt: MenuEntry = enumerator.Current;
      innerMnt.setIndex(num = num + 1);
      if (drillDown && innerMnt.menuType() === GuiMenuEntry_MenuType.MENU)
        (<MenuEntryMenu>innerMnt).setIndexes(drillDown);
    }
  }

  /// <summary>
  /// Create a WindowMenuEntry under a MenuEntryMenu and also create a ToolSripMenuItem using Manager.
  /// </summary>
  /// <param name="mgFormBase"></param>
  /// <param name="menuType">WindowMenu / Separator</param>
  /// <param name="windowMenuIdx">Index where new menuentry should be added</param>
  /// <param name="guiMgForm"></param>
  /// <param name="menuStyle">Pulldown / Context</param>
  /// <param name="setChecked"
  CreateMenuEntry(mgFormBase: MgFormBase, menuType: GuiMenuEntry_MenuType, windowMenuIdx: number, guiMgForm: MgFormBase, menuStyle: MenuStyle, setChecked: boolean): void {
    let menuReference: MenuReference = super.getInstantiatedMenu(guiMgForm, menuStyle);
    let menuEntry: MenuEntry = super.CreateMenuEntryItem(mgFormBase, menuType, guiMgForm, menuStyle, setChecked);
    this.addSubMenu(menuEntry, windowMenuIdx + 1);
    this.setIndexes(false);

    // Create a corresponding ToopStripMenuItem for windowMenuEntry.
    Manager.CreateMenuItem(menuReference, menuEntry, guiMgForm, menuStyle, menuEntry.getIndex() - 1);
  }

  setParentRootMgMenu(mgMenu: MgMenu): void {
    super.setParentRootMgMenu(mgMenu);
    for (let i: number = 0; i < this.subMenus.length; i = i + 1) {
      this.subMenus.get_Item(i).setParentRootMgMenu(mgMenu);
      this.subMenus.get_Item(i).ParentMenuEntry = this;
    }
  }

  setModalDisabled(val: boolean): void {
    for (let i: number = 0; i < this.subMenus.length; i = i + 1) {
      this.subMenus.get_Item(i).setModalDisabled(val);
    }
    super.setModalDisabled(val);
  }

  protected OnSetVisible(setPropOnly: boolean, pullDownMenu: boolean, topMostTask: TaskBase, sendForm: MgFormBase): void {
    for (let i: number = 0; i < this.subMenus.length; i = i + 1) {
      let menuEntry: MenuEntry = this.subMenus.get_Item(i);
      // Refresh the submenu-entries, in order to show/hide the toolbar icons of submenus when Parent Menu is shown/hidden,
      // call setVisible() for submenus.
      menuEntry.setVisible(menuEntry.getVisible(), setPropOnly, pullDownMenu, topMostTask, sendForm);
    }
  }

  protected OnSetEnabled(enabled: RefParam<boolean>, checkValidation: boolean, checkEnableSystemAction: boolean, checkForName: string, IsChildOfCheckForName: boolean, refresh: boolean): void {

    let NewIsChildOfCheckForName: boolean = IsChildOfCheckForName || checkForName === null || (this._name !== null && this._name === checkForName);
    for (let i: number = 0; i < (<MenuEntryMenu>this).subMenus.length; i = i + 1) {
      let menuEntry: MenuEntry = (<MenuEntryMenu>this).subMenus.get_Item(i);
      menuEntry.setEnabled(enabled.value, checkValidation, checkEnableSystemAction, checkForName, NewIsChildOfCheckForName, refresh);
    }
    super.OnSetEnabled(enabled, checkValidation, checkEnableSystemAction, checkForName, IsChildOfCheckForName, refresh);
  }

  protected OnCreateMenuEntryObject(parentMenuObject: any, menuStyle: MenuStyle, form: MgFormBase, callFromMenuShowFunction: boolean): void {
    for (let i: number = 0; i < this.subMenus.length; i = i + 1) {
      this.subMenus.get_Item(i).createMenuEntryObject(parentMenuObject, menuStyle, form, callFromMenuShowFunction);
    }
  }

  protected DeleteMenuEntryMenuObject(form: MgFormBase, menuStyle: MenuStyle): void {
    for (let i: number = 0; i < this.subMenus.length; i = i + 1) {
      let menuEntry: MenuEntry = this.subMenus.get_Item(i);
      menuEntry.deleteMenuEntryObject(form, menuStyle);
    }
  }

  protected OnGetGroupCount(form: MgFormBase, toolGroup: number, forMenuEntry: MenuEntry, found: RefParam<boolean>): number {
    let count: number = 0;
    for (let i: number = 0; i < this.subMenus.length; i = i + 1) {
      let menuEntry: MenuEntry = this.subMenus.get_Item(i);
      count = count + (() => {
        return menuEntry.getGroupCount(form, toolGroup, forMenuEntry, found);
      })();
      if (found.value) {
        break;
      }
    }
    return count;
  }

  protected resetMenuIndexes(): void {
    (<MenuEntryMenu>this.ParentMenuEntry).setIndexes(false);
  }

  protected IsCurrentMenuEntryMenu(): boolean {
    return true;
  }
}
