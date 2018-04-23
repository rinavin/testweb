import {
  ApplicationException,
  Array_Enumerator,
  Exception,
  Hashtable,
  Int32,
  List,
  NString,
  RefParam
} from "@magic/mscorelib";
import {InternalInterface, MsgInterface} from "@magic/utils";
import {GuiMenuEntry} from "./gui/GuiMenuEntry";
import {GuiMgForm} from "./gui/GuiMgForm";
import {MgFormBase} from "./management/gui/MgFormBase";
import {TaskBase} from "./management/tasks/TaskBase";
import {MenuEntryProgram} from "./management/gui/MenuEntryProgram";
import {MenuEntryOSCommand} from "./management/gui/MenuEntryOSCommand";
import {Events} from "./Events";
import {MenuEntryEvent} from "./management/gui/MenuEntryEvent";
import {Commands} from "./Commands";
import {CommandType, GuiMenuEntry_MenuType, MenuStyle} from "./GuiEnums";
import {ApplicationMenus} from "./management/gui/ApplicationMenus";
import {MgMenu} from "./management/gui/MgMenu";
import {Manager} from "./Manager";
import {TaskDefinitionId} from "./management/tasks/TaskDefinitionId";
import {MenuEntry} from "./management/gui/MenuEntry";
import {MenuValue} from "./management/gui/MenuValue";
import {PropInterface} from "./management/gui/PropInterface";
import {MenuEntryMenu} from "./management/gui/MenuEntryMenu";

/*
* The MenuManager class will handle the project’s menus.
* It will give services which allow performing functions related operations on the menus.
* All menu functions will be activated through the MenuManager object.
* The services it provides include all but the actual creation of the SWT objects.
*
* Keep a reference to the menu toolbar image file.
*
* We will have one instance of the MenuManager object; it will be a member of the
* ClientManager object.
*
* Menu references:
* Since the content of the menu depends also on rights the user has, we will create the
* menus file content specifically for the user and it will contain only the menus which
* are relevant for him.
* Menus file name syntax: <Application identification> + <Rights hash code> + “Menus.xml”.
* Rights hash code – a hash code, which is a combination of the user’s rights, which are
* used in the menus.
* This is a member of the TaskBase’s MgData object.
*
* Menus file name reference:
* In order to keep the task independent from the user who executes it, we will not place
* the Rights hash code in the task’s xml. We will use a non user specific file name –
* meaning <Application identification> + “Menus.xml”.
* In addition, we will send with the task the Rights Hash code, which we will add to the
* sent menus file name when we need to access the menus xml file.
* In order to obtain a specific menu, we will use the menus file name as it appears in
* the reference (without the rights hash code).
*/
export class MenuManager {
  private _applicationMenusMap: Hashtable<string, ApplicationMenus> = null;

  constructor() {
    this._applicationMenusMap = new Hashtable<string, ApplicationMenus>();
  }

  /// <summary>
  /// Clears applicationMenusMap
  /// </summary>
  removeApplicationMenus(): void {
    this._applicationMenusMap.Clear();
  }

  /// <summary>
  /// Remove specific application menus from applicationMenusMap.
  /// </summary>
  /// <param name="menuFileName"></param>
  removeApplicationMenu(menuFileName: string): void {
    this._applicationMenusMap.Remove(menuFileName);
  }

  /// <summary>
  /// When menuEntry is selected on Menu, this method gets called. It calls appropriate functions depending
  /// upon type of menu selected.
  /// </summary>
  /// <param name="menuEntry">selected menu entry</param>
  /// <param name="activeForm">current active form, when menu is selected.</param>
  /// <param name="activatedFromMDIFrame">Is menu selected from MDI Frame. </param>
  onMenuSelection(menuEntry: GuiMenuEntry, activeForm: GuiMgForm, activatedFromMDIFrame: boolean): void {
    try {
      let topMostForm: MgFormBase = null;
      let task: TaskBase = null;

      if (!(<MgFormBase>activeForm).IsHelpWindow) {
        task = (<MgFormBase>activeForm).getTask();
        // from the menu task get the form of the menu(topmost) and save member of the last menu Id selected.
        topMostForm = task.getTopMostForm();
      }
      else {
        // In case of help window, get the parent form of help form and get task from that.
        topMostForm = (activeForm = (<MgFormBase>activeForm).ParentForm);
        task = topMostForm.getTask();
      }

      topMostForm.LastClickedMenuUid = menuEntry.menuUid();

      if (menuEntry instanceof MenuEntryProgram)
        Events.OnMenuProgramSelection(task.ContextID, <MenuEntryProgram>menuEntry, activeForm, activatedFromMDIFrame);
      else if (menuEntry instanceof MenuEntryOSCommand)
        Events.OnMenuOSCommandSelection(task.ContextID, <MenuEntryOSCommand>menuEntry, activeForm);
      else if (menuEntry instanceof MenuEntryEvent) {
        // in order to get the correct ctlidx we take it from the parent MgMenu of the menuentry and then
        // change it if the event is a user event from another component
        let ctlIdx: number = (<MenuEntryEvent>menuEntry).getParentMgMenu().CtlIdx;
        let menuEntryEvent: MenuEntryEvent = <MenuEntryEvent>menuEntry;
        if (menuEntryEvent.UserEvtCompIndex > 0)
          ctlIdx = menuEntryEvent.UserEvtCompIndex;

        Events.OnMenuEventSelection(task.ContextID, <MenuEntryEvent>menuEntry, activeForm, ctlIdx);
      }
    }
    catch (ex) {
      if (ex instanceof ApplicationException) {
        Events.WriteExceptionToLog(ex);
      }
    }
  }

  /// <summary>
  ///  This method initializes an application’s menus object, from the passed menusFileName
  ///  (loads the menus xml file to matching data structures).
  /// </summary>
  /// <param name="mainProg"></param>
  /// <returns></returns>
  getApplicationMenus(mainProg: TaskBase): ApplicationMenus {
    if (mainProg === null)
      return null;

    // build the menus file URL from the name and the rights hash code
    let menusKey: string = mainProg.getMenusFileURL();
    let appMenus: ApplicationMenus = null;

    if (menusKey !== null) {
      appMenus = <ApplicationMenus>this._applicationMenusMap.get_Item(menusKey);

      if (appMenus === null) {
        try {
          let menusContent: string = mainProg.getMenusContent();

          // build the application menus
          appMenus = new ApplicationMenus(menusContent);

          // set the indexes of the menu entries relative to their immediate parents.
          // also set the CtlIdx of the application that contains the menu on the MgMenu,
          let ctlIdx: number = mainProg.getCtlIdx();
          let iMgMenu: Array_Enumerator<MgMenu> = appMenus.iterator();
          while (iMgMenu.MoveNext()) {
            let mgMenu: MgMenu = <MgMenu>iMgMenu.Current;
            mgMenu.setIndexes(true);
            mgMenu.CtlIdx = ctlIdx;
          }

          this._applicationMenusMap.set_Item(menusKey, appMenus);
        }
        catch (ex) {
          if (ex instanceof Exception) {
            Events.WriteExceptionToLog(ex);
          }
          else
            throw ex;
        }
      }
    }

    return appMenus;
  }

  /// <summary>
  ///  This method returns a specific menu object, which matches the passed menu index. It checks if the wanted
  ///  menu already exists. If it does not, it calls the CreateMenu method for this entry. The matching MgMenu
  ///  object is returned. This method will be called from the Property::RefreshDisplay. It will provide the
  ///  Property mechanism with a matching MenuEntry to the specified menu identification.
  /// </summary>
  /// <param name="mainProg"></param>
  /// <param name="menuIndex"></param>
  /// <param name="menuStyle">type of the menu: MENU_TYPE_PULLDOWN, MENU_TYPE_CONTEXT</param>
  /// <param name="form"></param>
  /// <param name="createIfNotExist">This will decide if menu is to be created or not.</param>
  /// <returns></returns>
 getMenu(mainProg: TaskBase, menuIndex: number, menuStyle: MenuStyle, form: MgFormBase, createIfNotExist: boolean): MgMenu {
    let retMenu: MgMenu = null;

    if (mainProg.menusAttached()) {
      let appMenus: ApplicationMenus = this.getApplicationMenus(mainProg);

      if (appMenus !== null) {
        retMenu = appMenus.getMgMenu(menuIndex);
        if (createIfNotExist && retMenu !== null && !retMenu.menuIsInstantiated(form, menuStyle)) {
          // this menu does not have a matching java object for this shell – we need to create it
          // Context menus are created & destroyed on the fly. For context menu, if no visible menu entry
          // is found at 1st level, then don't create it. Because, if no visible menu entry is found ,
          // no popup is displayed, So menu gets instantiated but it is not destroyed as we don't get CLOSING message.
          if (menuStyle === MenuStyle.MENU_STYLE_CONTEXT) {
            if (retMenu.isAnyMenuEntryVisible())
              retMenu.createMenu(form, menuStyle);
            else
              retMenu = null;
          }
          else
            retMenu.createMenu(form, menuStyle);
        }
      }
    }
    return retMenu;
  }

  /// <summary>
  ///   refresh the actions of all menus belonging to the current task (according to the current task state)
  /// </summary>
  /// <param name = "currentTask"></param>
  refreshMenuActionForTask(currentTask: TaskBase): void {
    let currentForm: MgFormBase = currentTask.getForm();
    if (currentForm !== null) {
      let menusContainerForm: MgFormBase; // the form containing the menus to be refreshed
      if (currentForm.isSubForm()) {
        menusContainerForm = currentForm.getSubFormCtrl().getTopMostForm();
        if (menusContainerForm.IsMDIChild || menusContainerForm.IsFloatingToolOrModal)
          menusContainerForm = menusContainerForm.getTopMostFrameForm();
      }
      else
        menusContainerForm = currentForm.getTopMostFrameForm();

      if (menusContainerForm === null)
        menusContainerForm = currentForm.getTopMostFrameFormForMenuRefresh();

      if (menusContainerForm !== null) {
        let stylesToRefresh: MenuStyle[] = [
          MenuStyle.MENU_STYLE_PULLDOWN, MenuStyle.MENU_STYLE_CONTEXT, MenuStyle.MENU_STYLE_TOOLBAR
        ];

        for (let i: number = 0; i < stylesToRefresh.length; i = i + 1) {
          // refresh the actions
          let style: MenuStyle = stylesToRefresh[i];
          let mgMenu: MgMenu = menusContainerForm.getMgMenu(style);
          if (mgMenu !== null)
            mgMenu.refreshMenuAction(currentTask.getForm(), style);
        }
      }
    }
  }

  /// <summary>
  ///   Refresh the pulldown menu actions.
  /// </summary>
  /// <param name = "frameForm"></param>
  RefreshPulldownMenuActions(frameForm: MgFormBase): void {
    let stylesToRefresh: MenuStyle[] = [
      MenuStyle.MENU_STYLE_PULLDOWN, MenuStyle.MENU_STYLE_TOOLBAR
    ];

    for (let i: number = 0; i < stylesToRefresh.length; i = i + 1) {
      // refresh the actions
      let menuStyle: MenuStyle = stylesToRefresh[i];
      let mgMenu: MgMenu = frameForm.getMgMenu(menuStyle);
      if (mgMenu !== null)
        mgMenu.refreshMenuAction(frameForm, menuStyle);
    }
  }

  destroyAndRebuild(): void;
  destroyAndRebuild(menusFileName: string): void;
  destroyAndRebuild(menusFileName?: string): void {
    if (arguments.length === 0) {
      this.destroyAndRebuild_0();
      return;
    }
    this.destroyAndRebuild_1(menusFileName);
  }

  /// <summary>
  /// destroy and rebuild () all menus.
  /// </summary>
  private destroyAndRebuild_0(): void {
    let menusFileNamesKeys: Array_Enumerator<string> = this._applicationMenusMap.Keys;
    while (menusFileNamesKeys.MoveNext()) {
      this.destroyAndRebuild(menusFileNamesKeys.Current);
    };
  }

  /// <summary>
  /// destroy and rebuild menus for the passed file.
  /// </summary>
  private destroyAndRebuild_1(menusFileName: string): void {
    let applicationMenus: ApplicationMenus = <ApplicationMenus>this._applicationMenusMap.get_Item(menusFileName);
    if (applicationMenus !== null) {
      this._applicationMenusMap.Remove(menusFileName);
      applicationMenus.destroyAndRebuild();
    }
  }

  /// <summary>
  ///   check/uncheck menu entry identified by entryName.
  /// </summary>
  /// <param name = "task"></param>
  /// <param name = "entryName">menuentry name </param>
  /// <param name = "check">check/uncheck value</param>
  MenuCheckByName(task: TaskBase, entryName: string, check: boolean): boolean {
    let pulldownMenu: MgMenu = this.GetPulldownMenu(task);

    // Get matching menus from all ctls
    let menuEntryList: List<MenuValue> = this.GetMatchingMenuValues(task.ContextID, entryName, pulldownMenu);
    if (menuEntryList !== null) {
      menuEntryList.forEach((menuValue: MenuValue) => {
        let innerMenuEntry: MenuEntry = menuValue.InnerMenuEntry;

        let refresh: boolean = menuValue.IsPulldown;

        innerMenuEntry.setChecked(check, refresh);
      });
    }

    if (pulldownMenu !== null && this.IsTopLevelMenu(pulldownMenu, entryName))
      Manager.WriteToMessagePane(task, "Check/UnCheck of top level menu item is not allowed", false);

    return true;
  }

  /// <summary>
  ///   show/hide menu entry identified by entryName.
  /// </summary>
  /// <param name = "task"></param>
  /// <param name = "entryName">menuentry name</param>
  /// <param name = "show">show/hide value</param>
  MenuShowByName(task: TaskBase, entryName: string, show: boolean): boolean {
    let pulldownMenuModified: boolean = false;
    let pulldownMenu: MgMenu = this.GetPulldownMenu(task);

    // Get matching menus from all ctls
    let menuEntryList: List<MenuValue> = this.GetMatchingMenuValues(task.ContextID, entryName, pulldownMenu);
    if (menuEntryList !== null) {
      menuEntryList.forEach((menuValue: MenuValue) => {
        let innerMenuEntry: MenuEntry = menuValue.InnerMenuEntry;
        if (menuValue.IsPulldown)
          pulldownMenuModified = true;
        innerMenuEntry.setVisible(show, false, menuValue.IsPulldown, task, null);
      });
    }

    // If the menu is being shown, then refresh 'enable' state of internal event menus
    if (show && pulldownMenuModified) {
      let ctlIdx: number = 0;
      let mainProg: TaskBase = <TaskBase>Manager.MGDataTable.GetMainProgByCtlIdx(task.ContextID, ctlIdx);
      let menus: ApplicationMenus = this.getApplicationMenus(mainProg);
      let formOrg: MgFormBase = task.getTopMostForm();
      let form: MgFormBase = formOrg.getTopMostFrameForm();
      // fixed bug#:773382, when there is no SDI\MDI need to get the org form (for the context menu)
      form = form != null ? form : formOrg;
      menus.refreshInternalEventMenus(form);
    }

    return true;
  }

  /// <summary>
  ///   enable/disable menu entry identified by entryName.
  /// </summary>
  /// <param name = "task"></param>
  /// <param name = "entryName">menuentry name</param>
  /// <param name = "enable">enable/disable value</param>
  MenuEnableByName(task: TaskBase, entryName: string, enable: boolean): boolean {
    let internalEventMenuEnabled: boolean = false;
    let pulldownMenu: MgMenu = this.GetPulldownMenu(task);

    // Get matching menus from all ctls
    let menuEntryList: List<MenuValue> = this.GetMatchingMenuValues(task.ContextID, entryName, pulldownMenu);

    if (menuEntryList !== null) {
      menuEntryList.forEach((menuValue: MenuValue) => {
        let mnuEnt: any = menuValue.InnerMenuEntry;

        if (mnuEnt.menuType() === GuiMenuEntry_MenuType.INTERNAL_EVENT) {
          let menuEntryEvent: MenuEntryEvent = <MenuEntryEvent>mnuEnt;
          if (menuEntryEvent.InternalEvent < InternalInterface.MG_ACT_USER_ACTION_1 ||
            menuEntryEvent.InternalEvent > InternalInterface.MG_ACT_USER_ACTION_20)
            internalEventMenuEnabled = true;
        }

        let refresh: boolean = menuValue.IsPulldown;

        // set the ModalDisabled flag, depending upon the value of enable.
        if (!enable)
          mnuEnt.setModalDisabled(false);

        mnuEnt.setEnabled(enable, true, true, entryName, refresh);
      });

      if (internalEventMenuEnabled)
        Manager.WriteToMessagePanebyMsgId(task, MsgInterface.MENU_STR_ERROR_ENABLE, false);
    }

    return true;
  }

  /// <summary>
  ///   Sets the menu entry text of a menu entry.
  /// </summary>
  /// <param name = "task"></param>
  /// <param name = "entryName">menuentry name</param>
  /// <param name = "entryText">new menuentry text</param>
  SetMenuName(task: TaskBase, entryName: string, entryText: string): boolean {
    let isNameSet: boolean = false;
    let pulldownMenu: MgMenu = this.GetPulldownMenu(task);

    // Get matching menus from all ctls
    let menuEntryList: List<MenuValue> = this.GetMatchingMenuValues(task.ContextID, entryName, pulldownMenu);

    if (menuEntryList !== null) {
      menuEntryList.forEach((menuValue: MenuValue) => {
        let innerMenuEntry: MenuEntry = menuValue.InnerMenuEntry;

        let refresh: boolean = menuValue.IsPulldown;
        innerMenuEntry.setText (entryText, refresh);
        isNameSet = true;
      });
    }

    return isNameSet;
  }

  /// <summary>
  ///   get Menu's index.
  /// </summary>
  /// <param name = "mainProg">main prog</param>
  /// <param name = "entryName">menuentry name</param>
  /// <param name = "isPublic"></param>
  GetMenuIdx(mainProg: TaskBase, entryName: string, isPublic: boolean): number {
    let index: number = 0;

    let menus: ApplicationMenus = this.getApplicationMenus(mainProg);
    if (menus !== null)
      index = menus.menuIdxByName(entryName, isPublic);

    return index;
  }

  /// <summary>
  ///   Add menu identified by menuIdx, in current pulldown menu at menuPath specified.
  /// </summary>
  /// <param name = "mainProg">main prog</param>
  /// <param name = "menuIdx">menu to be added</param>
  /// <param name = "menuPath">menu path</param>
  MenuAdd(mainProg: TaskBase, task: TaskBase, menuIdx: number, menuPath: string): boolean {
    let success: boolean = false;

    // Read all menus present inside Menu repository
    let menus: ApplicationMenus = this.getApplicationMenus(mainProg);

    let index: number = menuIdx; // index of the menu inside Menu repository
    let addMenu: MgMenu = menus.getMgMenu(index); // menu structure to add
    let pulldownMenu: MgMenu = this.GetPulldownMenu(task);

    let topMostFrameForm: MgFormBase = <MgFormBase>task.getForm() == null ? null : <MgFormBase>task.getForm().getTopMostFrameForm();

    if (addMenu == null)
      success = false;
    // Add Menu to Current Pulldown Menu, only if the menu to add is not Current Pulldown Menu
    else if (pulldownMenu != null && topMostFrameForm.getPulldownMenuNumber() > 0 && index !== topMostFrameForm.getPulldownMenuNumber()) {
      // if new menu is to be added, make a new menu by clone instead of using the same reference
      let clonedMenu = <MgMenu>addMenu.Clone();
      let root: MgMenu = topMostFrameForm.getPulldownMenu();

      // If path, where the menu is to be added, is Null, then add the menu at the end of Current Pulldown Menu.
      if (NString.IsNullOrEmpty(menuPath)) {
        // If menu is not instantiated, it means old menu is deleted, so assign new menu as pulldown menu.
        if (pulldownMenu.getInstantiatedMenu(topMostFrameForm, MenuStyle.MENU_STYLE_PULLDOWN) == null) {
          topMostFrameForm.setPulldownMenuNumber(index, true);
          success = true;
        }
        else if (!NString.IsNullOrEmpty(clonedMenu.getName())) {
          let iAddMenu: Array_Enumerator<MenuEntry> = clonedMenu.iterator();
          let newMenuEntry: MenuEntry;

          // Iterate through all menu entries inside Menu structure to be added, and add it to the current
          // Pulldown Menu Structure
          while (iAddMenu.MoveNext()) {
            newMenuEntry = <MenuEntry>iAddMenu.Current;
            root.addSubMenu(newMenuEntry);
            newMenuEntry.setParentRootMgMenu(root);
            // set orgindex as -1, so that resetIndexes() will recalculate orgIndex
            newMenuEntry.setIndex(-1);

            // Add menu entry object to the Pulldown Menu for newly added menu entries.
            newMenuEntry.CreateNewlyAddedMenus(root, topMostFrameForm);
          }
          success = true;
        }
      }
      // Function will fail if consecutive "\\" are found in the menu path
      else if (menuPath.indexOf("\\\\") >= 0) {
        success = false;
      }
      // Valid Menu Path
      else {
        if (!NString.IsNullOrEmpty(clonedMenu.getName())) {
          let idx: number = 0;
          let menuPos: any = null;
          menuPath = NString.TrimEnd(menuPath);
          let refMenuPos: RefParam<any> = new RefParam<any>(menuPos);
          let refIdx: RefParam<number> = new RefParam<number>(idx);
          success = MenuManager.FindMenuPath(root, menuPath, refMenuPos, refIdx);

          if (success) {
            let iAddMenu: Array_Enumerator<MenuEntry> = clonedMenu.iterator();
            let newMenuEntry: MenuEntry;
            let i: number = 0;

            // if menu to be added to root menu i.e Current Pulldown Menu

            if (refMenuPos.value.GetType() === typeof(MgMenu)) {
              while (iAddMenu.MoveNext()) {
                newMenuEntry = <MenuEntry>iAddMenu.Current;
                root.addMenu(newMenuEntry, refIdx.value + i);
                newMenuEntry.setParentRootMgMenu(root);
                // set orgindex as -1, so that resetIndexes() will recalculate orgIndex
                newMenuEntry.setIndex(-1);

                // Add menu entry object to the Pulldown Menu for newly added menu entries.
                newMenuEntry.CreateNewlyAddedMenus(root, topMostFrameForm);
                i++;
              }
            }
            else // if menu to be added to any menu entry
            {
              while (iAddMenu.MoveNext()) {
                newMenuEntry = <MenuEntry>iAddMenu.Current;
                // set the root parent menu
                newMenuEntry.setParentRootMgMenu((<MenuEntry>refMenuPos.value).getParentMgMenu());
                // set immediate parent of the menu entry
                newMenuEntry.ParentMenuEntry = (<MenuEntry>refMenuPos.value).ParentMenuEntry;
                // set orgindex as -1, so that resetIndexes() will recalculate orgIndex
                newMenuEntry.setIndex(-1);
                (<MenuEntryMenu>refMenuPos.value).addSubMenu(newMenuEntry, refIdx.value + i);

                // Add menu entry object to the Pulldown Menu for newly added menu entries.
                newMenuEntry.CreateNewlyAddedMenus((<MenuEntry>refMenuPos.value).getInstantiatedMenu(topMostFrameForm, MenuStyle.MENU_STYLE_PULLDOWN), topMostFrameForm);
                i++;
              }
            }
          }
        }
      }
    }
    else {
      // If no pulldown menu is attached, menu to be added should be assigned as pulldown menu.
      if (topMostFrameForm != null) {
        if (topMostFrameForm.getPulldownMenuNumber() === 0)
          topMostFrameForm.setPulldownMenuNumber(menuIdx, true);
        else
          (topMostFrameForm.getProp(PropInterface.PROP_TYPE_PULLDOWN_MENU)).RefreshDisplayWithCurrLineAndCheckSkipRefresh(true, Int32.MinValue, false);
        success = true;
      }
    }
    if (success) {
      if (menus != null)
        menus.refreshInternalEventMenus(topMostFrameForm);
    }
    return success;
  }

  /// <summary>
  ///   Finds the menu entry for the menu path
  /// </summary>
  /// <param name = "root">current pulldown menu structure</param>
  /// <param name = "menuPath">path where the menu structure is to be added</param>
  /// <param name = "menuPos">contains menu entry as out value, where the menu is to be added</param>
  /// <param name = "idx">contains position to add inside menuPos, as out value</param>
  /// <returns>true if the menuPos is found</returns>
  private static FindMenuPath(root: any, menuPath: string, menuPos: RefParam<any>, idx: RefParam<number>): boolean {
    let subMenu: boolean = false;
    let found: boolean = false;
    let father: any = null;
    let menuEntry: MenuEntry = null;
    let ret: boolean = false;
    let mnuPos: number = 0;

    // If MenuPath has trailing slash then add the Menu as SubMenu.
    if (menuPath.endsWith("\\"))
      subMenu = true;

    let tokens: string[] = menuPath.split("\\");
    let iMenuEntry: Array_Enumerator<MenuEntry>;

    for (let i: number = 0; i < tokens.length; i = i + 1) {
      let token: string = tokens[i];

      if (NString.IsNullOrEmpty(token))
        break;

      mnuPos = 0;

      if (root.GetType() === typeof(MgMenu))
        iMenuEntry = (<MgMenu>root).iterator();
      else if (root.GetType() === typeof(MenuEntryMenu))
        iMenuEntry = (<MenuEntryMenu>root).iterator();
      else
        break;

      while (iMenuEntry.MoveNext()) {
        menuEntry = iMenuEntry.Current;
        if (menuEntry.getName() !== null) {
          if (menuEntry.getName() === token) {
            father = root;
            root = menuEntry;
            found = true;
            break;
          }
        }
        else
          found = false;

        mnuPos++;
      }

      if (found === false)
        break;
    }

    if (found) {
      if (menuEntry.menuType() === GuiMenuEntry_MenuType.MENU) {
        // If Menu type is Menu and have trailing slash in MenuPath
        if (subMenu) {
          idx.value = 0;
          menuPos.value = root;
        }
        // If Menu type is Menu and don't have trailing slash in MenuPath
        else {
          idx.value = mnuPos + 1;
          menuPos.value = father;
        }
        ret = true;
      }
      else {
        // If Menu type is not Menu and don't have trailing slash in MenuPath
        if (!subMenu) {
          idx.value = mnuPos + 1;
          menuPos.value = father;
          ret = true;
        }
      }
    }
    return ret;
  }

  /// <summary>
  ///   gets menu path.
  /// </summary>
  /// <param name = "mainProg"></param>
  /// <param name = "menuUid"></param>
  GetMenuPath(mainProg: TaskBase, menuUid: number): string {
    let tmpMenuPath: string = "";
    let MenuPath: string = "";

    // Read all menus present inside Menu repository
    let menus: ApplicationMenus = this.getApplicationMenus(mainProg);

    if (menus !== null && menuUid > 0) {
      let menuEntry: MenuEntry = menus.menuByUid(menuUid);
      if (menuEntry !== null) {
        tmpMenuPath = MenuManager.BuildProgramMenuPath(menuEntry);
        MenuPath = tmpMenuPath.substr(0, tmpMenuPath.length - 1);
      }
    }

    return MenuPath;
  }

  /// <summary>
  ///   Build the path of the menu entry from its MgMenu parent.
  /// </summary>
  /// <param name = "menuEntry"></param>
  /// <returns></returns>
  private static BuildProgramMenuPath(menuEntry: any): string {
    let mnuEntry: MenuEntry;
    let menuPath: string = "";

    if (menuEntry !== null) {
      mnuEntry = <MenuEntry>menuEntry;
      let parent: MenuEntry = <MenuEntry>mnuEntry.ParentMenuEntry;
      if (parent !== null)
        menuPath = MenuManager.BuildProgramMenuPath(parent);
      menuPath = menuPath + mnuEntry.TextMLS;
      menuPath = menuPath + ";";
    }

    return menuPath;
  }

  /// <summary>
  ///   Remove menu identified by menuIdx, in current pulldown menu at menuPath specified.
  /// </summary>
  /// <param name = "mainProg"></param>
  /// <param name = "menuIdx"></param>
  /// <param name = "menuPath"></param>
  MenuRemove(mainProg: TaskBase, task: TaskBase, menuIdx: number, menuPath: string): boolean {
    let success: boolean = false;

    // Read all menus present inside Menu repository
    let menus: ApplicationMenus = this.getApplicationMenus(mainProg);

    let delMenu: MgMenu = menus.getMgMenu(menuIdx); // menu structure to delete

    let topMostFrameForm: MgFormBase = (task.getForm() === null) ? null : task.getForm().getTopMostFrameForm();
    let pulldownMenu: MgMenu = this.GetPulldownMenu(task);
    if (delMenu === null || pulldownMenu === null)
      success = false;
    else {
      // If path, from where the menu to be deleted is Null and 1.menu to be deleted is pulldown menu. The delete pulldown menu
      // menu to be deleted is not pulldown menu, search the whole menu.
      if (NString.IsNullOrEmpty(menuPath)) {
        success = true;
        if (delMenu === pulldownMenu) // remove all entries from pulldown menu
        {
          // Set PulldownMenuIdx to 0. this will reset the menu.
          let saveMenuIdx: number = topMostFrameForm.getPulldownMenuNumber();
          topMostFrameForm.setPulldownMenuNumber(0, true);
          topMostFrameForm.setPulldownMenuNumber(saveMenuIdx, false);
        }
        else
          this.SearchAndRemoveMenuEntries(0, delMenu, pulldownMenu, topMostFrameForm);
      }
      // Function will fail if consecutive "\\" are found in the menu path
      else if (menuPath.indexOf("\\\\") >= 0) {
        success = false;
      }
      // Valid Menu Path
      else {
        let idx: number = 0;
        let menuPos: any = null;

        let refMenuPos: RefParam<any> = new RefParam(menuPos);
        let refIdx: RefParam<number> = new RefParam(idx);
        menuPath = NString.TrimEnd(menuPath);

        success = MenuManager.FindMenuPath(pulldownMenu, menuPath, refMenuPos, refIdx);
        idx = refIdx.value;

        if (success) {
          this.SearchAndRemoveMenuEntries(idx, delMenu, menuPos, topMostFrameForm);
        }
      }
    }

    if (success) {
      if (pulldownMenu !== null)
        pulldownMenu.refreshInternalEventMenus(topMostFrameForm);
    }
    return success;
  }

  /// <summary>
  ///   Reset Pulldown menu.
  /// </summary>
  /// <param name = "context task"></param>
  MenuReset(mainProg: TaskBase, task: TaskBase): boolean {
    let formOrg: MgFormBase = task.getTopMostForm();
    let form: MgFormBase = (formOrg !== null) ? formOrg.getTopMostFrameForm() : null;
    form = form !== null ? form : formOrg;

    if (form !== null) {
      let pulldownMenuNumber: number = form.getPulldownMenuNumber();

      if (pulldownMenuNumber > 0) {
        let menusFileURL: string = mainProg.getMenusFileURL();

        // Suspend drawing of frame form till pulldown menu is destroy and rebuilt.
        Commands.addAsync(CommandType.SUSPEND_PAINT, form);

        // destroy and rebuild all application menus.
        this.destroyAndRebuild(menusFileURL);

        Commands.addAsync(CommandType.RESUME_PAINT, form);

        let pulldownMenu: MgMenu = form.getPulldownMenu();

        // recreate the pulldown menu, only if it is not instantiated.This happens only in case, if MenuRemove()
        // is called to remove the pulldown menu.
        if (!pulldownMenu.menuIsInstantiated(form, MenuStyle.MENU_STYLE_PULLDOWN))
          form.setPulldownMenuNumber(pulldownMenuNumber, true);
      }
    }

    return true;
  }

  /// <summary>
  ///   Set pulldown menu Modal depending upon value of isModal.
  /// </summary>
  /// <param name = "contextID"></param>
  /// <param name = "isModal"></param>
  SetModal(contextID: string, isModal: boolean): void {
    let frameForm: MgFormBase = Events.GetRuntimeContext(contextID).FrameForm;

    if (frameForm !== null) {
      let pulldownMenu: MgMenu = frameForm.getPulldownMenu();

      if (pulldownMenu !== null) {
        let mainContextIsModal: boolean = Events.IsBatchRunningInMainContext();
        pulldownMenu.SetModal(isModal, mainContextIsModal);
      }
    }
  }

  /// <summary>
  ///   Get matching menu entries from menus of all ctls opened.
  /// </summary>
  /// <param name = "entryName">name to be matched</param>
  /// <param name = "currentPulldownMenu">current pulldown menu</param>
  private GetMatchingMenuValues(contextID: number, entryName: string, currentPulldownMenu: MgMenu): List<MenuValue> {
      entryName = entryName.trim();

    let menuEntryList: List<MenuValue> = new List<MenuValue>();

    // Go through all ctls to get matching menus
    let ctlIdx: number = 0;
    let mainProg: TaskBase = <TaskBase>Manager.MGDataTable.GetMainProgByCtlIdx(contextID, ctlIdx);

    while (mainProg != null) {
      let menus: ApplicationMenus = this.getApplicationMenus(mainProg);

      if (menus !== null) {
        let tempMenuEntryList: List<MenuValue> = menus.GetMatchingMenuValues(entryName, currentPulldownMenu);

        if (tempMenuEntryList !== null)
          menuEntryList.AddRange(tempMenuEntryList.GetEnumerator());
      }

      ctlIdx++;
      mainProg = <TaskBase>Manager.MGDataTable.GetMainProgByCtlIdx(contextID, ctlIdx);
    }
    return menuEntryList;
  }

  /// <param name = "mgMenu">EntryName EntryName to be checked</param>
  /// <param name = "entryName">EntryName to be checked</param>
  /// <returns> Returns true if specified entry name is found in top level menu</returns>
  private IsTopLevelMenu(mgMenu: MgMenu, entryName: string): boolean {
    let found: boolean = false;

    let iMenuEntry: Array_Enumerator<MenuEntry> = mgMenu.iterator();
    while (!found && iMenuEntry.MoveNext()) {
      let menuEntry: MenuEntry = iMenuEntry.Current;
      let menuName: string = menuEntry.getName();

      if (menuName !== null && menuName === entryName)
        found = true;
    }

    return found;
  }

  /// <summary>
  ///   Get pulldown Menu.
  /// </summary>
  /// <param name = "task"></param>
  private GetPulldownMenu(task: TaskBase): MgMenu {
    let formOrg: MgFormBase = task.getTopMostForm();

    let form: MgFormBase = (formOrg !== null) ? formOrg.getTopMostFrameForm() : null;

    form = form !== null ? form : formOrg;

    return ((form != null) ? form.getPulldownMenu() : null);
  }

  /// <summary>
  ///   Remove menu entry at location idx from mgMenu.
  /// </summary>
  /// <param name = "idx">location of menu entry.</param>
  /// <param name = "mgMenu">menu from which menu entry is to be deleted.</param>
  /// <param name = "form">Frame window</param>
  private RemoveAt(idx: number, mgMenu: any, form: MgFormBase): void {
    if (mgMenu.GetType() === typeof(MgMenu))
      (<MgMenu>mgMenu).removeAt(idx, form);
    else
      (<MenuEntryMenu>mgMenu).removeAt(idx, form);
  }

  /// <summary>
  ///   Search and remove menu entries that are found in delMenu.
  /// </summary>
  /// <param name = "delMenu">Menu  to be deleted.</param>
  /// <param name = "menuPos">menu from which menu entries to be deleted</param>
  /// <param name = "form">Frame window</param>
  private SearchAndRemoveMenuEntries(idx: number, delMenu: MgMenu, menuPos: any, form: MgFormBase): void {
    let iDelMenuEntry: Array_Enumerator<MenuEntry> = delMenu.iterator();
    while (iDelMenuEntry.MoveNext()) {
      let iMenuEntry: Array_Enumerator<MenuEntry>;
      let delMenuEntry: MenuEntry = iDelMenuEntry.Current;
      let delMenuName: string = delMenuEntry.TextMLS;

      if (menuPos.value instanceof MgMenu)
        iMenuEntry = (<MgMenu>menuPos.value).iterator();
      else
        iMenuEntry = (<MenuEntryMenu>menuPos.value).iterator();

      this.SearchAndRemoveMenuEntry(idx, iMenuEntry, delMenuName, menuPos.value, form);
    }
  }

  /// <summary>
  ///   Search and remove menu entries after location idx from pulldown menu.
  /// </summary>
  /// <param name = "idx">location of menu entry.</param>
  /// <param name = "iMenuEntry">menu entry iterator.</param>
  /// <param name = "delMenuName">menuentry name to match menuentry in iMenuEntry enumerator.</param>
  /// <param name = "menuPos">menu from which menu entries to be deleted</param>
  /// <param name = "form">Frame window</param>
  private SearchAndRemoveMenuEntry(idx: number, iMenuEntry: Array_Enumerator<MenuEntry>, delMenuName: string, menuPos: any, form: MgFormBase): boolean {
    let removed: boolean = false;

    for (let i: number = 0; i < idx; i = i + 1)
      iMenuEntry.MoveNext();

    let menuEntryIdx: number = idx;
    while (!removed && iMenuEntry.MoveNext()) {
      let menuEntry: MenuEntry = iMenuEntry.Current;
      let menuName: string = menuEntry.TextMLS;

      if (menuName !== null && menuName === delMenuName) {
        this.RemoveAt(menuEntryIdx, menuPos, form);
        removed = true;
      }
      else
        menuEntryIdx++;
    }

    return removed;
  }

  TaskCalledByMenu(menuId: number, mainProg: TaskBase): TaskDefinitionId {
    // fixed bug#:431559, the menu need to be take from menuCtlIndex main program.
    let applicationMenus: ApplicationMenus = this.getApplicationMenus(mainProg);
    let menuEntry: MenuEntryProgram = ((applicationMenus.menuByUid(menuId) instanceof MenuEntryProgram) ? <MenuEntryProgram>applicationMenus.menuByUid(menuId) : null);

    return (new TaskDefinitionId(menuEntry.CtlIndex, menuEntry.ProgramIsn, 0, true));
  }

  /// <summary>
  ///   The menu texts needs to be refreshed due to a change in the language.
  /// </summary>
  /// <param name = "contextID">The context on which menues will be refreshed.</param>
  RefreshMenusText(contextID: number): void {
    // Go through all ctls in the context. Each ctl has its own application menu.
    let ctlIdx: number = 0;
    let mainProg: TaskBase = <TaskBase>Manager.MGDataTable.GetMainProgByCtlIdx(contextID, ctlIdx);

    while (mainProg !== null) {
      let menus: ApplicationMenus = this.getApplicationMenus(mainProg);

      // call refreshMenuesTextMls for each application menu of components, starting with the main.
      if (menus !== null)
        menus.refreshMenuesTextMls();

      ctlIdx = ctlIdx + 1;

      mainProg = <TaskBase>Manager.MGDataTable.GetMainProgByCtlIdx(contextID, ctlIdx);
    }
  }
}
