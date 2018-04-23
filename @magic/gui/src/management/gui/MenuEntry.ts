import {GuiMenuEntry} from "../../gui/GuiMenuEntry";
import {MgMenu} from "./MgMenu";
import {CommandType, GuiMenuEntry_ImageFor, GuiMenuEntry_MenuType, MenuStyle} from "../../GuiEnums";
import {Array_Enumerator, Debug, NString, RefParam} from "@magic/mscorelib";
import {Events} from "../../Events";
import {MenuEntryMenu} from "./MenuEntryMenu";
import {TaskBase} from "../tasks/TaskBase";
import {MgFormBase} from "./MgFormBase";
import {Commands} from "../../Commands";
import {MenuReference} from "../../gui/low/MenuReference";
import {GuiMgForm} from "../../gui/GuiMgForm";

/*
 * The MenuEntry class describes a specific menu entry (Can be pulldown menu or context menu).
 * It contains a list of MenuEntry objects.
 * This class holds the specific data we need in order to add an event to the queue (such as
 * the menu code, program number to execute and so on).
 * We will create a Handler, which will perform the relevant operations for each activated
 * menu type.
 * (The accelerator exists on the MenuItem (Gui Layer), and we do not need to handle it –
 * just to define it on the menu)
 */

/// <summary>
///   While adding a new member in this class, please make sure that you want to copy the value of that member
///   in new object or not inside clone method.
/// </summary>
export class MenuEntry extends GuiMenuEntry {
  private _index: number = 0; // menu index
  protected _name: string = null; // menu name (internal)
  protected _parentMgMenu: MgMenu = null; // reference to the root parent menu

  /// <summary>
  ///
  /// </summary>
  /// <param name="type"></param>
  /// <param name="mgMenu"></param>
  constructor(type: GuiMenuEntry_MenuType, mgMenu: MgMenu);
  constructor(MenuEntry: MenuEntry);
  constructor(typeOrMenuEntry: GuiMenuEntry_MenuType | MenuEntry, mgMenu?: MgMenu) {
    super();
    if (arguments.length === 1) {
      Object.assign(this, MenuEntry);
    }
    else {
      super.setType(<GuiMenuEntry_MenuType>typeOrMenuEntry);
      this.setParentMgMenu(mgMenu);
      this._index = -1;
    }
  }

  /// <summary>
  ///   returns the clone of the object.
  /// </summary>
  /// <returns></returns>
  Clone(): any {
    let menuentry: MenuEntry = new MenuEntry(this);
    // All initiated menus (pulldown, context and tool) references should not be copied in new cloned
    // object because for creation of new menu in menuAdd function, we need these values diffrent than the actual menu.
    // So, call base.init() to re-initialize them.
    super.init();
    super.getDeepCopyOfMenuState();
    return menuentry;
  }

  setIndex(Idx: number): void {
    this._index = Idx;
  }

  getIndex(): number {
    return this._index;
  }

  setName(menuName: string): void {
    this._name = menuName;
  }

  getName(): string {
    return this._name;
  }

  ShouldSetModal(isModal: boolean, mainContextIsModal: boolean): boolean {
    return false;
  }

  /// <summary>
  ///   sets the text of menu entry.
  /// </summary>
  /// <param name = "menuText">text to be set.
  /// </param>
  /// <param name = "refresh">refresh will decide if gui refresh is to be performed or not.
  /// </param>
  setText(menuText: string, refresh: boolean): void {
    this._text = menuText;
    if (refresh) {
      this.TextMLS = Events.Translate(this._text);
      let instantiatedMenus: Array_Enumerator<MenuReference> = super.getInstantiatedMenus(false);
      this.addAllItemRefsToCmdQueue(instantiatedMenus, CommandType.PROP_SET_TEXT, this.TextMLS);
    }
  }

  /// <summary>
  ///   Refresh the entry text.
  ///   The method takes the existing text and put it through another translation (we get here when language data changes).
  ///   If the new translated text is different then the existing one, create set_text command for each instance.
  /// </summary>
  refreshText(): void {
    if (this._text !== null) {
      let newTextMls: string = Events.Translate(this._text);
      // refresh only if the value changes
      if (!(newTextMls === this.TextMLS)) {
        this.TextMLS = newTextMls;
        // get all instances not including toolbar. Tooltip is handled elsewhere.
        let mnuRefs: Array_Enumerator<MenuReference> = super.getInstantiatedMenus(false);
        this.addAllItemRefsToCmdQueue(mnuRefs, CommandType.PROP_SET_TEXT, this.TextMLS);
      }
    }
  }

  setParentMgMenu(mgMenu: MgMenu): void {
    this._parentMgMenu = mgMenu;
  }

  /// <summary>
  ///   Set ParentRootMgMenu to menuEntry. If menuEntry is MenuEntryMenu, then set ParentRootMgMenu to it's sub menus also.
  /// </summary>
  setParentRootMgMenu(mgMenu: MgMenu): void {
    this.setParentMgMenu(mgMenu);
  }

  setData(type: GuiMenuEntry_MenuType, menuName: string, menuText: string, mgMenu: MgMenu): void {
    super.setType(type);
    this.setName(menuName);
    this.setText(menuText, true);
    this.setParentMgMenu(mgMenu);
  }

  /// <summary>
  ///   check/uncheck menu entry.
  /// </summary>
  /// <param name = "value">check/uncheck value.
  /// </param>
  /// <param name = "refresh">It will decide if gui refresh is to be performed or not.
  /// </param>
  setChecked(value: boolean, refresh: boolean): void {
    this._menuState.Checked = value;
    if (refresh) {
      let mnuRefs: Array_Enumerator<MenuReference> = super.getInstantiatedMenus(true);
      this.addAllRefsToCmdQueue(mnuRefs, CommandType.PROP_SET_CHECKED, value);
    }
  }

  /// <summary>
  ///   SetModalDisabled().
  /// </summary>
  /// <param name = "val"> </param>
  setModalDisabled(val: boolean): void {
    super.setModalDisabled(val);
  }

  setVisible(visible: boolean, setPropOnly: boolean, pullDownMenu: boolean, topMostTask: TaskBase): void;
  setVisible(visible: boolean, setPropOnly: boolean, pullDownMenu: boolean, topMostTask: TaskBase, sendForm: MgFormBase): void;
  setVisible(visible: boolean, setPropOnly: boolean, pullDownMenu: boolean, topMostTask: TaskBase, sendForm?: MgFormBase): void {
    if (arguments.length === 4)
      this.setVisible_0(visible, setPropOnly, pullDownMenu, topMostTask);
    else
      this.setVisible_1(visible, setPropOnly, pullDownMenu, topMostTask, sendForm);
  }

  private setVisible_0(visible: boolean, setPropOnly: boolean, pullDownMenu: boolean, topMostTask: TaskBase): void {
    this.setVisible(visible, setPropOnly, pullDownMenu, topMostTask, null);
  }

  private setVisible_1(visible: boolean, setPropOnly: boolean, pullDownMenu: boolean, topMostTask: TaskBase, sendForm: MgFormBase): void {
    this._menuState.Visible = visible;

    if (!pullDownMenu)
      return;

    if (!setPropOnly) {
      if (topMostTask === null || topMostTask.isMainProg()) {
        // eventTask can be null, if we are here from TP/TS of MP. In that case, topMostTask should MP.
        let eventTask: TaskBase = <TaskBase>Events.GetCurrentTask();
        if (eventTask !== null) {
          topMostTask = eventTask;
        }
      }

      let formOrg: MgFormBase;
      let form: MgFormBase;
      if (sendForm === null) {
        formOrg = topMostTask.getTopMostForm();
        form = topMostTask.getTopMostForm().getTopMostFrameForm();
        // fixed bug#:773382, when there is no SDI\MDI need to get the corg form (for the context menu)
        form = ((form !== null) ? form : formOrg);
      }
      else {
        formOrg = form = sendForm;
      }
      this.OnSetVisible(setPropOnly, pullDownMenu, topMostTask, sendForm);
      if (visible) {
        visible = super.CheckIfParentItemVisible(this);
      }
      let mnuRefs: Array_Enumerator<MenuReference> = super.getInstantiatedMenus(formOrg, true, true, true);
      this.addAllRefsToCmdQueue(mnuRefs, CommandType.PROP_SET_VISIBLE, visible);
      if (pullDownMenu) {
        Commands.addAsync(CommandType.UPDATE_MENU_VISIBILITY, form);
      }
    }
  }

  protected OnSetVisible(setPropOnly: boolean, pullDownMenu: boolean, topMostTask: TaskBase, sendForm: MgFormBase): void {
  }

  /// <summary>
  ///   reset the index on the menu entry
  /// </summary>
  /// <param name = "resetIndexes"></param>
  private resetIndexes(): void {
    if (this.ParentMenuEntry !== null && this.ParentMenuEntry.menuType() === GuiMenuEntry_MenuType.MENU) {
      this.resetMenuIndexes();
    }
    else {
      this._parentMgMenu.setIndexes(false);
    }
  }

  protected resetMenuIndexes(): void {
  }

  setEnabled(enabled: boolean, checkValidation: boolean, checkEnableSystemAction: boolean): void;
  setEnabled(enabled: boolean, checkValidation: boolean, checkEnableSystemAction: boolean, checkForName: string, refresh: boolean): void;
  setEnabled(enabled: boolean, checkValidation: boolean, checkEnableSystemAction: boolean, checkForName: string, IsChildOfCheckForName: boolean, refresh: boolean): void;
  setEnabled(enabled: boolean, checkValidation: boolean, checkEnableSystemAction: boolean, checkForName?: string, refreshOrIsChildOfCheckForName?: boolean, refresh?: boolean): void {
    if (arguments.length === 3)
      this.setEnabled_0(enabled, checkValidation, checkEnableSystemAction);
    else if (arguments.length === 5)
      this.setEnabled_1(enabled, checkValidation, checkEnableSystemAction, checkForName, refreshOrIsChildOfCheckForName);
    else
      this.setEnabled_2(enabled, checkValidation, checkEnableSystemAction, checkForName, refreshOrIsChildOfCheckForName, refresh);
  }

  /// <summary>
  /// </summary>
  /// <param name = "enabled">
  /// </param>
  /// <param name = "checkValidation:">to check the validation of the set value
  ///   @return : error number if the method was faild.
  /// </param>
  private setEnabled_0(enabled: boolean, checkValidation: boolean, checkEnableSystemAction: boolean): void {
    this.setEnabled(enabled, checkValidation, checkEnableSystemAction, null, true);
  }

  /// <summary>
  /// </summary>
  /// <param name = "enabled">
  /// </param>
  /// <param name = "checkValidation:">to check the validation of the set value
  ///   @return : error number if the method was faild.
  /// </param>
  /// <param name = "refresh">refresh will decide if gui refresh is to be performed or not.
  /// </param>
  private setEnabled_1(enabled: boolean, checkValidation: boolean, checkEnableSystemAction: boolean, checkForName: string, refresh: boolean): void {
    this.setEnabled(enabled, checkValidation, checkEnableSystemAction, checkForName, false, refresh);
  }

  /// <summary>
  /// </summary>
  /// <param name = "enabled">
  /// </param>
  /// <param name = "checkValidation:">to check the validation of the set value
  ///   @return : error number if the method was faild.
  /// </param>
  /// <param name = "refresh">refresh will decide if gui refresh is to be performed or not.
  /// </param>
  private setEnabled_2(enabled: boolean, checkValidation: boolean, checkEnableSystemAction: boolean, checkForName: string, IsChildOfCheckForName: boolean, refresh: boolean): void {
    if (checkValidation) {
      let isMenuEnabled: RefParam<boolean> = new RefParam(enabled);
      this.OnSetEnabled(isMenuEnabled, checkValidation, checkEnableSystemAction, checkForName, IsChildOfCheckForName, refresh);
      enabled = isMenuEnabled.value;
    }

    let activateEanble: boolean = super.menuType() === GuiMenuEntry_MenuType.MENU || checkForName === null || (this._name !== null && this._name === checkForName);
    if (IsChildOfCheckForName) {
      if (refresh) {
        let instantiatedMenus: Array_Enumerator<MenuReference> = super.getInstantiatedMenus(null, true, true, true);
        if (enabled) {
          if (!this._menuState.Enabled) {
            enabled = false;
          }
        }
        this.addAllRefsToCmdQueue(instantiatedMenus, CommandType.PROP_SET_ENABLE, enabled);
      }
    }
    else {
      if (activateEanble) {
        if (!super.getModalDisabled()) {
          this._menuState.Enabled = enabled;
        }
        if (refresh) {
          let mnuRefs: Array_Enumerator<MenuReference> = super.getInstantiatedMenus(true);
          this.addAllRefsToCmdQueue(mnuRefs, CommandType.PROP_SET_ENABLE, enabled);
        }
      }
    }
  }

  protected OnSetEnabled(enabled: RefParam<boolean>, checkValidation: boolean, checkEnableSystemAction: boolean, checkForName: string, IsChildOfCheckForName: boolean, refresh: boolean): void {

  }

  /// <summary>
  ///   Add menu references to command queue.
  /// </summary>
  /// <param name = "mnuRefs">Collection<MenuReference> containing menu refernces to be added to command queue
  /// </param>
  /// <param name = "cmdType">Command Type can be PROP_SET_CHECKED, PROP_SET_ENABLE, PROP_SET_VISABLE
  /// </param>
  /// <param name = "value">boolean
  /// </param>
  private addAllRefsToCmdQueue(mnuRefs: Array_Enumerator<MenuReference>, cmdType: CommandType, val: any): void {
    if (mnuRefs !== null) {
      let imnuref: Array_Enumerator<MenuReference> = mnuRefs;
      while (imnuref.MoveNext()) {
        let mnuRef: MenuReference = <MenuReference>imnuref.Current;
        Commands.addAsync(cmdType, mnuRef, this, val);
        Commands.beginInvoke();
      }
    }
  }

  createEnableCmd(form: MgFormBase, menuStyle: MenuStyle, enable: boolean): void {
    let menuReference: MenuReference = super.getInstantiatedMenu(form, menuStyle);
    Commands.addAsync(CommandType.PROP_SET_ENABLE, menuReference, this, enable);
  }

  /// <summary>
  ///   PROP_SET_MENU_ENABLE DELETE_MENU
  /// </summary>
  /// <param name = "mnuRefs">
  /// </param>
  /// <param name = "cmdType">
  /// </param>
  /// <param name = "value">
  /// </param>
  private addAllItemRefsToCmdQueue(mnuRefs: Array_Enumerator<MenuReference>, cmdType: CommandType, val: any): void {
    if (mnuRefs !== null) {
      let imnuref: Array_Enumerator<MenuReference> = mnuRefs;
      while (imnuref.MoveNext()) {
        let mnuRef: MenuReference = <MenuReference>imnuref.Current;
        if (mnuRef !== null) {
          Commands.addAsync(cmdType, mnuRef, this, val);
          Commands.beginInvoke();
        }
        else {
          Debug.Assert(false);
        }
      }
    }
  }

  /// <summary>
  ///   This method creates the gui commands in order to create the matching menu object. It creates the whole
  ///   object – with the sub menus.
  /// </summary>
  /// <param name = "menuStyle">
  /// </param>
  /// <param name = "form">
  /// </param>
  createMenuEntryObject(parentMenuObject: any, menuStyle: MenuStyle, form: MgFormBase, callFromMenuShowFunction: boolean): void {
    let hasTool: boolean = false;
    if (menuStyle === MenuStyle.MENU_STYLE_CONTEXT || form.ShouldShowPullDownMenu || form.ShouldCreateToolbar) {
      let createMenuStyle: MenuStyle = menuStyle;
      let createSWTmenu: boolean = false;
      if (menuStyle === MenuStyle.MENU_STYLE_PULLDOWN && !form.ShouldShowPullDownMenu) {
        createMenuStyle = MenuStyle.MENU_STYLE_TOOLBAR;
      }
      else {
        createSWTmenu = (menuStyle === MenuStyle.MENU_STYLE_CONTEXT || (menuStyle === MenuStyle.MENU_STYLE_PULLDOWN && form.ShouldShowPullDownMenu));
      }
      let menuReference: MenuReference = null;
      if (!NString.IsNullOrEmpty(this.TextMLS) || super.menuType() !== GuiMenuEntry_MenuType.WINDOW_MENU_ENTRY) {
        menuReference = super.setMenuIsInstantiated(form, createMenuStyle);
      }

      if (createSWTmenu) {
        this.TextMLS = Events.Translate(this._text);
        if (!NString.IsNullOrEmpty(this.TextMLS) || super.menuType() !== GuiMenuEntry_MenuType.WINDOW_MENU_ENTRY) {
          Commands.addAsync(CommandType.CREATE_MENU_ITEM, parentMenuObject, menuStyle, this, form, this.getIndex());
        }
      }
      if (super.menuType() !== GuiMenuEntry_MenuType.SEPARATOR && menuStyle === MenuStyle.MENU_STYLE_PULLDOWN) {
        if (form.ShouldCreateToolbar) {
          hasTool = this.createMenuEntryTool(form, callFromMenuShowFunction);
        }
      }
      this.OnCreateMenuEntryObject(menuReference, menuStyle, form, callFromMenuShowFunction);
      this.OnCreateMenuEntryObject_2(createSWTmenu, hasTool);
      if (this.AccessKey !== null) {
        this._parentMgMenu.addEntryToMenuEntriesWithAccessKey(this);
      }
    }
  }

  protected OnCreateMenuEntryObject_2(createSWTmenu: boolean, hasTool: boolean): void {

  }

  protected OnCreateMenuEntryObject(parentMenuObject: any, menuStyle: MenuStyle, form: MgFormBase, callFromMenuShowFunction: boolean): void {

  }

  /// <summary>
  ///   Create Menu Objects for Newly added menuentries
  /// </summary>
  /// <param name = "parentMenuObject"></param>
  /// <param name = "form"></param>
  CreateNewlyAddedMenus(parentMenuObject: any, form: MgFormBase): void {
    this.resetIndexes();
    this.createMenuEntryObject(parentMenuObject, MenuStyle.MENU_STYLE_PULLDOWN, form, false);
  }

  /// <summary>
  ///   This method creates the gui commands in order to delete the matching menu object.
  /// </summary>
  /// <param name = "menuStyle"></param>
  deleteMenuEntryObject(form: MgFormBase, menuStyle: MenuStyle): void {
    this.DeleteMenuEntryMenuObject(form, menuStyle);
    this.deleteMenuEntryObjectItem(form, menuStyle);
    if (menuStyle === MenuStyle.MENU_STYLE_PULLDOWN && form.ShouldCreateToolbar) {
      this.deleteMenuEntryTool(form, true, false);
    }
  }

  protected DeleteMenuEntryMenuObject(form: MgFormBase, menuStyle: MenuStyle): void {

  }

  /// <summary>
  ///   This method creates the gui commands in order to delete the matching menu object.
  /// </summary>
  /// <param name = "menuStyle"></param>
  deleteMenuEntryObjectItem(form: MgFormBase, menuStyle: MenuStyle): void {
    // we call this method for menuEntry and MenuStyle(context\pulldown)
    // when create toolbar without pulldown the Reference is null
    let menuReference: MenuReference = super.getInstantiatedMenu(form, menuStyle);
    if (menuReference !== null) {
      Commands.addAsync(CommandType.DELETE_MENU_ITEM, menuReference, menuStyle, this);
    }
  }

  /**
   * get the tool index for method menuShow.
   * we pass all the menu entry in the MgMenu and calculate the index of the tool.
   * @param form : form that we work on it
   * @param toolGroup: the tool group that this icon need to be added.
   * @param forMenuEntry: calculate the tool index for this menu entry
   * @return
   */
  private calcToolbarIndex(form: MgFormBase, toolGroup: number, forMenuEntry: MenuEntry): number {
    let count: number = 0;
    let mgMenu: MgMenu = form.getMgMenu(MenuStyle.MENU_STYLE_PULLDOWN);
    let found: RefParam<boolean> = new RefParam(false);
    let iMenuEntry: Array_Enumerator<MenuEntry> = mgMenu.iterator();
    while (iMenuEntry.MoveNext()) {
      let menuEntry: MenuEntry = iMenuEntry.Current;
      // get the count from this menu recursively
      count = count + menuEntry.getGroupCount(form, toolGroup, forMenuEntry, found);
      if (found.value) {
        break;
      }
    }
    return count;
  }

  /**
   * get the tool index for method menuShow - recursively.
   * we pass all the menu entry in this menu entry calculate the index of the tool.
   * @param form : form that we work on it
   * @param toolGroup: the tool group that this icon need to be added.
   * @param forMenuEntry: calculate the tool index for this menu entry
   * @param found: mgValue.bool , will return true if stop the loop
   * @return
   */
  getGroupCount(form: MgFormBase, toolGroup: number, forMenuEntry: MenuEntry, found: RefParam<boolean>): number {
    let count: number = 0;
    let result: number;
    if (this === forMenuEntry) {
      found[0] = true;
      result = count;
    }
    else {
      let isMenuEntryMenu: boolean = this.IsCurrentMenuEntryMenu();
      if (isMenuEntryMenu) {
        this.OnGetGroupCount(form, toolGroup, forMenuEntry, found);
      }
      else {
        if (this.inSameToolGroup(toolGroup)) {
          if (this.ParentMenuEntry !== forMenuEntry.ParentMenuEntry || this.getIndex() < forMenuEntry.getIndex()) {
            count = count + 1;
          }
          else {
            Debug.Assert(false);
          }
        }
      }
      result = count;
    }
    return result;
  }

  protected IsCurrentMenuEntryMenu(): boolean {
    return false;
  }

  protected OnGetGroupCount(form: MgFormBase, toolGroup: number, forMenuEntry: MenuEntry, found: RefParam<boolean>): number {
    return 0;
  }

  /**
   * check if tool is define for menu entry and it is on the same tool group and it is visible
   * @param toolGroup
   * @return
   */
  private inSameToolGroup(toolGroup: number): boolean {
    return this.ImageGroup === toolGroup && this.toolIsDefined() && super.getVisible();
  }

  /// <summary>
  ///   This method creates the GUI command for the creation of the menu’s tool, as a child of the MgMenu’s
  ///   toolbar object. Toolbar will be placed as the parentObject.
  ///
  ///   Note: This method is internal in order to allow the MgMenu object to create the tool for the group
  ///   separator.
  /// </summary>
  /// <param name = "form">form on which we create the tool on</param>
  /// <returns> true if a tool was defined</returns>
  createMenuEntryTool(form: MgFormBase, calcToolbarIndexParam: boolean): boolean {
    let result: boolean = false;
    if (this.toolIsDefined() || super.menuType() === GuiMenuEntry_MenuType.SEPARATOR) {
      super.setMenuIsInstantiated(form, MenuStyle.MENU_STYLE_TOOLBAR);
      // create the gui command for the tool
      let toolbar: any = this._parentMgMenu.createAndGetToolbar(form);
      // add the tool to the matching group and get the desired index
      let createSepAtTheEnd: boolean = this._parentMgMenu.checkStartSepForGroup(form, this.ImageGroup, super.menuType());
      let toolbarIndexForFuntion: number = 0;
      if (calcToolbarIndexParam) {
        // calc the index of the new tool
        toolbarIndexForFuntion = this.calcToolbarIndex(form, this.ImageGroup, this);
        for (let i: number = 0; i < this.ImageGroup; i = i + 1) {
          toolbarIndexForFuntion = toolbarIndexForFuntion + form.getToolbarGroupCount(i);
        }
      }
      // add the new tool to the group
      let toolbarIndex: number = this._parentMgMenu.addToolToGroup(form, this.ImageGroup, super.menuType());
      // if calcToolbarIndexParam is TRUE then the tool will be add to the calc index
      // otheriwse we will add the tool to the end if the group
      // toolbarIndex is the last index in the visible group, so if toolbarIndexForFuntion > toolbarIndex we
      // should not set toolbarIndex with toolbarIndexForFuntion. We use the index as an index in the cmd to add the item in the gui
      // and if the index is too big we will get exception.
      if (calcToolbarIndexParam && toolbarIndexForFuntion < toolbarIndex) {
        toolbarIndex = toolbarIndexForFuntion;
      }
      Commands.addAsync(CommandType.CREATE_TOOLBAR_ITEM, toolbar, form, this, toolbarIndex);

      if (createSepAtTheEnd) {
        this._parentMgMenu.checkEndtSepForGroup(form, this.ImageGroup, super.menuType());
      }
      result = true;
    }
    return result;
  }

  deleteMenuEntryTool(form: MgFormBase, removeSeperat: boolean, fourceDelete: boolean): void {
    let flag: boolean = this.toolIsDefined() || fourceDelete;
    if (flag) {
      let toolbar: any = this._parentMgMenu.createAndGetToolbar(form);
      Commands.addAsync(CommandType.DELETE_TOOLBAR_ITEM, toolbar, form, this, 0);
      form.removeToolFromGroupCount(this.ImageGroup, removeSeperat);
    }
  }

  private toolIsDefined(): boolean {
    return super.menuType() !== GuiMenuEntry_MenuType.MENU && (this.Imagefor === GuiMenuEntry_ImageFor.MENU_IMAGE_TOOLBAR || this.Imagefor === GuiMenuEntry_ImageFor.MENU_IMAGE_BOTH) && (this.ImageFile !== null || this.ImageNumber > 0);
  }

  getParentMgMenu(): MgMenu {
    return this._parentMgMenu;
  }

  dispose(): void {
    // dispose all pulldown menu objects
    let pulldownKeysEnumerator: Array_Enumerator<GuiMgForm> = this._instantiatedPullDown.Keys;

    if (!(super.menuType() === GuiMenuEntry_MenuType.WINDOW_MENU_ENTRY)) {
      while (pulldownKeysEnumerator.MoveNext()) {
        let form: MgFormBase = <MgFormBase>pulldownKeysEnumerator.Current;
        let menuReference: MenuReference = <MenuReference>this._instantiatedPullDown.get_Item(form);
        Commands.addAsync(CommandType.DISPOSE_OBJECT, menuReference);
      }
      // dispose all context menu objects
      let contextKeysEnumerator: Array_Enumerator<GuiMgForm> = this._instantiatedContext.Keys;
      while (contextKeysEnumerator.MoveNext()) {
        let mgFormBase: MgFormBase = <MgFormBase>contextKeysEnumerator.Current;
        let obj: MenuReference = <MenuReference>this._instantiatedContext.get_Item(mgFormBase);
        Commands.addAsync(CommandType.DISPOSE_OBJECT, obj);
      }
      // dispose all toolbar menu objects
      let toolbarKeysEnumerator: Array_Enumerator<GuiMgForm> = this._instantiatedToolItem.Keys;
      while (toolbarKeysEnumerator.MoveNext()) {
        let mgFormBase: MgFormBase = <MgFormBase>toolbarKeysEnumerator.Current;
        this.deleteMenuEntryTool(mgFormBase, true, false);
      }
    }
  }

  /// <summary>
  ///   Get the menu entry's prompt (relevant for event, program and OSCommand.
  /// </summary>
  /// <returns> - the entry's prompt, null in case of none event,program, os entry.</returns>
  public getPrompt(): string {
    return null;
  }

  /// <summary>
  /// Create a menuentry for WindowList items.
  /// </summary>
  /// <param name="mgFormBase">Form associated with windowmenu entry</param>
  /// <param name="menuType">WindowMenu/Separator</param>
  /// <param name="guiMgForm"></param>
  /// <param name="menuStyle">pulldown/context</param>
  /// <param name="bChecked">menuentry should be checked or not</param>
  /// <returns></returns>
  CreateMenuEntryItem(mgFormBase: MgFormBase, menuType: GuiMenuEntry_MenuType, guiMgForm: MgFormBase, menuStyle: MenuStyle, bChecked: boolean): MenuEntry {
    let menuEntry: MenuEntry = null;

    if (menuType === GuiMenuEntry_MenuType.SEPARATOR) {
      menuEntry = new MenuEntry(menuType, this.getParentMgMenu());
    }

    menuEntry.setVisible(true, true, false, null);
    menuEntry.setMenuIsInstantiated(guiMgForm, menuStyle);
    return menuEntry;
  }

  /// <summary>
  /// An empty virtual method. Implemented in MenuEntryWindowMenu and MenuEntryMenu used for ContextMenu and PullDownMenu respectively.
  /// </summary>
  /// <param name="mgFormBase"></param>
  /// <param name="menuType"></param>
  /// <param name="windowMenuIdx"></param>
  /// <param name="guiMgForm"></param>
  /// <param name="menuStyle"></param>
  /// <param name="setChecked"></param>
  CreateMenuEntry(mgFormBase: MgFormBase, menuType: GuiMenuEntry_MenuType, windowMenuIdx: number, guiMgForm: GuiMgForm, menuStyle: MenuStyle, setChecked: boolean): void {
  }
}
