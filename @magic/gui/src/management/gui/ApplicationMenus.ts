import {Array_Enumerator, List} from "@magic/mscorelib";
import {MgMenu} from "./MgMenu";
import {ApplicationMenusSaxHandler} from "./ApplicationMenusSaxHandler";
import {Events} from "../../Events";
import {MenuEntry} from "./MenuEntry";
import {GuiMenuEntry_MenuType} from "../../GuiEnums";
import {MenuEntryMenu} from "./MenuEntryMenu";
import {MenuValue} from "./MenuValue";
import {MgFormBase} from "./MgFormBase";

/// <summary>
///   This method initializes the Menus vector from the menus source file. This method reads the data from the
///   menus source file, creates a MenuEntry object for each entry in the menus file, and connects a menu
///   entry with its children. In this method we will use the SAX Parser in order to parse the menus file xml.
///   menusFileURL – the name of the menus file
/// </summary>
/// <param name = "menusData">the menus data buffer</param>
export class ApplicationMenus {
  menus: List<MgMenu> = null;

  constructor(menusData: string) {
    this.menus = new List<MgMenu>();
    try {
      if (menusData !== null && menusData.length > 0) {
        let handler: ApplicationMenusSaxHandler = new ApplicationMenusSaxHandler(this.menus);
        handler.parse(menusData);
      }
    }
    catch (ex) {
      Events.WriteExceptionToLog(ex);
    }
  }

  /// <summary>
  ///   This method returns an MgMenu object according to passed menuIndex
  /// </summary>
  /// <param name = "menuIndex"></param>
  /// <returns> matching MgMenu object</returns>
  getMgMenu(menuIndex: number): MgMenu {
    let mgMenu: MgMenu = null;
    if (menuIndex > 0 && this.menus.length >= menuIndex) {
      mgMenu = this.menus.get_Item(menuIndex - 1);
    }
    return mgMenu;
  }

  iterator(): Array_Enumerator<MgMenu> {
    return this.menus.GetEnumerator();
  }

  /// <summary>
  ///   Returns all menu entries matching the name in this applicaiton menu
  /// </summary>
  /// <param name="entryName">Sring Entry name to be searched</param>
  /// <param name="pulldownMenu">Current pulldown menu</param>
  /// <returns>List of MenuEntries matching the entry Name</returns>
  GetMatchingMenuValues(entryName: string, pulldownMenu: MgMenu): List<MenuValue> {
    let matchingMnuValues: List<MenuValue> = new List<MenuValue>();

    this.menus.forEach((mgMenu: MgMenu) => {
      let isPulldown: boolean = (mgMenu === pulldownMenu);

      let iInnerMnt: Array_Enumerator<MenuEntry> = mgMenu.iterator();
      this.BuildMatchingMenuValues(entryName, iInnerMnt, isPulldown, matchingMnuValues);
    });

    return matchingMnuValues;
  }

  /// <summary>
  ///   Returns menu index by its name. Only searchs top level menus (like default pull down etc)
  /// </summary>
  /// <param name="menuName">Name of the menu</param>
  /// <returns> long index of the menu</returns>
  menuIdxByName(menuName: string, isPublic: boolean): number {
    let menuIdx: number = 0;

    // internal names are currently not handled.
    if (isPublic)
      return menuIdx;

    menuIdx = this.menus.findIndex((mgMenu: MgMenu) => {
      let mnuName: string = mgMenu.getName();
      return mnuName !== null && mnuName === menuName;
    });

    return menuIdx + 1;
  }

  /// <summary>
  ///   Gets the menu entry from its Uid.
  /// </summary>
  /// <param name = "menuUid">Uid whose corresponding menu entry is to be found</param>
  /// <returns></returns>
  menuByUid(menuUid: number): MenuEntry {
    let menuEntryByUid: MenuEntry = null;
    let iMgMenu: Array_Enumerator<MgMenu> = this.menus.GetEnumerator();

    while (iMgMenu.MoveNext()) {
      let mgMenu: MgMenu = iMgMenu.Current;
      let iMenuEntry: Array_Enumerator<MenuEntry> = mgMenu.iterator();

      while (iMenuEntry.MoveNext()) {
        let menuEntry: MenuEntry = iMenuEntry.Current;

        if (menuEntry.menuUid() === menuUid) {
          menuEntryByUid = menuEntry;
          return menuEntryByUid;
        }

        if (menuEntry.menuType() === GuiMenuEntry_MenuType.MENU) {
          menuEntryByUid = this.getMenuEntryByUid(menuEntry, menuUid);
          if (menuEntryByUid !== null) {
            if (menuEntryByUid.menuUid() === menuUid) {
              return menuEntryByUid;
            }
          }
        }
      }
    }

    return menuEntryByUid;
  }

  /// <summary>
  /// </summary>
  /// <param name = "menuEntry"></param>
  /// <param name = "menuUid"></param>
  /// <returns></returns>
  private getMenuEntryByUid(menuEntry: MenuEntry, menuUid: number): MenuEntry {
    let menuEntryByUid: MenuEntry = null;

    if (menuEntry.menuType() === GuiMenuEntry_MenuType.MENU) {
      let menuEntryMenu: MenuEntryMenu = <MenuEntryMenu>menuEntry;
      let iMenuEntryMenu: Array_Enumerator<MenuEntry> = menuEntryMenu.iterator();

      while (iMenuEntryMenu.MoveNext()) {
        let menuEntryNext: MenuEntry = iMenuEntryMenu.Current;

        if (menuEntryNext.menuUid() === menuUid) {
          return menuEntryNext;
        }

        if (menuEntryNext.menuType() === GuiMenuEntry_MenuType.MENU) {
          menuEntryByUid = this.getMenuEntryByUid(menuEntryNext, menuUid);
          if (menuEntryByUid !== null) {
            if (menuEntryByUid.menuUid() === menuUid) {
              return menuEntryByUid;
            }
          }
        }
      }
    }

    return menuEntryByUid;
  }

  /// <summary>
  ///   Builds actual array list containing menu entries matching the entry name
  /// </summary>
  /// <param name = "EntryName">Sring Entry name to be searched</param>
  /// <param name = "menuEntry">Root menu entry</param>
  /// <param name = "matchingMnuEntries">Out parameter that will have the matching entries.</param>
  /// <param name="isPulldown"></param>
  /// <returns></returns>
  private BuildMatchingMenuValues(entryName: string, iInnerMnt: Array_Enumerator<MenuEntry>, isPulldown: boolean, matchingMnuEntries: List<MenuValue>): void {
    while (iInnerMnt.MoveNext()) {
      let innerMnt: MenuEntry = iInnerMnt.Current;
      let mntName: string = innerMnt.getName();
      if (mntName !== null && mntName === entryName) {
        this.AddMenuValue(matchingMnuEntries, isPulldown, innerMnt);
      }

      if (innerMnt.menuType() === GuiMenuEntry_MenuType.MENU) {
        let menuEntryMenu: MenuEntryMenu = <MenuEntryMenu>innerMnt;
        let iMenuEntry: Array_Enumerator<MenuEntry> = menuEntryMenu.iterator();
        this.BuildMatchingMenuValues(entryName, iMenuEntry, isPulldown, matchingMnuEntries);
      }
    }
  }

  /// <summary>
  ///  add entry to the matchingMnuEntries according to the sent parameters
  /// </summary>
  /// <param name="matchingMnuEntries"></param>
  /// <param name="isPulldown"></param>
  /// <param name="includeInContext"></param>
  /// <param name="innerMnt">the menuEntry</param>
  /// <returns></returns>
  private AddMenuValue(matchingMnuEntries: List<MenuValue>, isPulldown: boolean, innerMenuEntry: MenuEntry): void {
    let menuValue: MenuValue = new MenuValue();
    menuValue.IsPulldown = isPulldown;
    menuValue.InnerMenuEntry = innerMenuEntry;

    matchingMnuEntries.push(menuValue);
  }

  /// <summary>
  ///
  /// </summary>
  destroyAndRebuild(): void {
    for (let i: number = 0; i < this.menus.length; i = i + 1) {
      let mgMenu: MgMenu = this.menus.get_Item(i);
      mgMenu.destroyAndRebuild();
    }
  }

  /// <summary>
  ///   Context menus are not automatically disposed when a form is disposed (unlike the swt version).
  ///   For every menu , dispose all its instances for the disposing form.
  /// </summary>
  /// <param name = "form"></param>
  disposeFormContexts(form: MgFormBase): void {
    for (let i: number = 0; i < this.menus.length; i++) {
      let mgMenu: MgMenu = this.menus.get_Item(i);
      mgMenu.disposeFormContexts(form);
    }
  }

  /// <summary>
  ///   refresh the internal event menus of form
  /// </summary>
  /// <param name = "form"></param>
  refreshInternalEventMenus(form: MgFormBase): void {
    for (let i: number = 0; i < this.menus.length; i++) {
      let mgMenu: MgMenu = this.menus.get_Item(i);
      mgMenu.refreshInternalEventMenus(form);
    }
  }

  /// <summary>
  ///   Refresh all the menus text in our menu list.
  /// </summary>
  refreshMenuesTextMls(): void {
    let iMgMenu: Array_Enumerator<MgMenu> = this.menus.GetEnumerator();
    while (iMgMenu.MoveNext()) {
      let mgMenu: MgMenu = iMgMenu.Current;
      let iMenuEntry: Array_Enumerator<MenuEntry> = mgMenu.iterator();
      while (iMenuEntry.MoveNext()) {
        let menuEntry: MenuEntry = iMenuEntry.Current;
        this.refreshRecursiveMenuesEntryMls(menuEntry);
      }
    }
  }

  /// <summary>
  ///   Refresh the text of the menu entry.
  ///   If this menu entry is a menu itself, call this method recursively.
  /// </summary>
  refreshRecursiveMenuesEntryMls(menuEntry: MenuEntry): void {
    // 1st refresh the menuentry text
    menuEntry.refreshText();

    if (menuEntry.menuType() === GuiMenuEntry_MenuType.MENU) {
      let menuEntryMenu: MenuEntryMenu = <MenuEntryMenu>menuEntry;
      let iMenuEntryMenu: Array_Enumerator<MenuEntry> = menuEntryMenu.iterator();
      while (iMenuEntryMenu.MoveNext()) {
        let menuEntryNext: MenuEntry = iMenuEntryMenu.Current;
        // recursive call for each menu entry.
        this.refreshRecursiveMenuesEntryMls(menuEntryNext);
      }
    }
  }
}
