import {GuiMgMenu} from "../../gui/GuiMgMenu";
import {
  Hashtable, Array_Enumerator, List
} from "@magic/mscorelib";
import {MenuEntry} from "./MenuEntry";
import {MenuEntryMenu} from "./MenuEntryMenu";
import {MgFormBase} from "./MgFormBase";
import {Commands} from "../../Commands";
import {MgControlBase} from "./MgControlBase";
import {GuiMenuEntry_MenuType, MenuStyle, CommandType} from "../../GuiEnums";
import {MenuReference} from "../../gui/low/MenuReference";
import {MenuEntryEvent} from "./MenuEntryEvent";
import {KeyboardItem} from "../../gui/KeyboardItem";
import {Property} from "./Property";
import {TaskBase} from "../tasks/TaskBase";
import {Events} from "../../Events";
import {InternalInterface} from "@magic/utils";
import {GuiMgForm} from "../../gui/GuiMgForm";
import {PropInterface} from "./PropInterface";

/// <summary>
///   While adding a new member in this class, please make sure that you want to copy the value of that member
///   in new object or not inside clone method.
/// </summary>
export class MgMenu extends GuiMgMenu  {
  private _instantiatedToolbar: Hashtable<MgFormBase, MenuReference> = null; // for finding the Toolbar of the form
  private _internalEventsOnMenus: Hashtable<number, List<MenuEntryEvent>> = null; // list of internal event menu entries which appear on the menu bar
  private _internalEventsOnToolBar: Hashtable<number, List<MenuEntryEvent>> = null; // list of internal event menu entries which appear on the tool bar
  private _menuEntries: List<MenuEntry> = null;
  private _menuEntriesWithAccessKey: Hashtable<string, List<MenuEntry>> = null;
  private _menuUid: number = 0;
  private _name: string = null;
  private _text: string = null;
  private IsModalDisabled: boolean = false;

  get MenuEntries(): List<MenuEntry> {
    return this._menuEntries;
  }

  CtlIdx: number = 0;

  constructor() {
    super();
    this._menuEntries = new List<MenuEntry>();
    this._instantiatedToolbar = new Hashtable<MgFormBase, MenuReference>();
    this._internalEventsOnMenus = new Hashtable<number, List<MenuEntryEvent>>();
    this._internalEventsOnToolBar = new Hashtable<number, List<MenuEntryEvent>>();
    this._menuEntriesWithAccessKey = new Hashtable<string, List<MenuEntry>>();
    this.CtlIdx = 0;
  }

  /// <summary>
  ///   returns the clone of the object.
  /// </summary>
  /// <returns></returns>
  Clone(): any {
    let mgMenu: MgMenu = new MgMenu();
    Object.assign(mgMenu, this);

    // MemeberwiseClone copies the refrences of arraylist but we need new objects so for deep copy of
    // all elements in menuEntries, we need to copy each of it's element seperately.
    mgMenu._menuEntries = this.getDeepCopyOfMenuEntries(this._menuEntries);
    super.init();
    // Following members(references) should not be copied in new cloned object because for creation of new menu
    // in menuAdd function, we need these values diffrent than the actual menu.
    this._instantiatedToolbar = new Hashtable<MgFormBase, MenuReference>();
    this._internalEventsOnMenus = new Hashtable<number, List<MenuEntryEvent>>();
    this._internalEventsOnToolBar = new Hashtable<number, List<MenuEntryEvent>>();
    this._menuEntriesWithAccessKey = new Hashtable<string, List<MenuEntry>>();
    return mgMenu;
  }

  /// <summary>
  ///   This function does deep copy of all elements in menuEntries ArrayList.
  /// </summary>
  /// <returns> a new object of Arraylist which contains refrences of new menuEntries objects</returns>
  private getDeepCopyOfMenuEntries(menuEntries: List<MenuEntry>): List<MenuEntry> {
    let clonedMenuEntries: List<MenuEntry> = new List<MenuEntry>();

    // orginally foreach loop
    for (let i: number = 0; i < menuEntries.length; i++) {
      clonedMenuEntries.push(<MenuEntry>menuEntries.get_Item(i).Clone());

      if (menuEntries.get_Item(i) instanceof MenuEntryMenu)
      {
        let menu: MenuEntryMenu = <MenuEntryMenu>menuEntries.get_Item(i);
        let clonedMenu: MenuEntryMenu  = <MenuEntryMenu>(clonedMenuEntries.get_Item(i));
        clonedMenu.subMenus = this.getDeepCopyOfMenuEntries(menu.subMenus);
      }
    }

    return clonedMenuEntries;
  }

  setName(newName: string): void {
    this._name = newName;
  }

  getName(): string {
    return this._name;
  }

  addSubMenu(newEntry: MenuEntry): void {
    this._menuEntries.push(newEntry);
  }

  /// <summary>
  ///   Inserts a menu at given position
  /// </summary>
  /// <param name = "newEntry">menu to be added</param>
  /// <param name = "idx">position where menu needs to be inserted</param>
  addMenu(newEntry: MenuEntry, idx: number): void {
    this._menuEntries.Insert(idx, newEntry);
  }

  /// <summary>
  ///   Deletes a menu at given position
  /// </summary>
  /// <param name = "idx">position from where menu to be deleted</param>
  removeAt(idx: number, form: MgFormBase): void {
    this._menuEntries.get_Item(idx).deleteMenuEntryObject(form, MenuStyle.MENU_STYLE_PULLDOWN);
    this._menuEntries.RemoveAt(idx);
    Commands.invoke();
  }

  /// <summary>
  ///   Deletes a menu
  /// </summary>
  removeAll(form: MgFormBase): void {
    for (let idx: number = 0; idx < this._menuEntries.length; idx = idx + 1) {
      this._menuEntries.get_Item(idx).deleteMenuEntryObject(form, MenuStyle.MENU_STYLE_PULLDOWN);
    }
    this._menuEntries.Clear();
    Commands.invoke();
  }

  setUid(uid: number): void {
    this._menuUid = uid;
  }

  /// <summary>
  ///   createMenu This method creates the gui commands in order to create the matching menu object. First we
  ///   create a GUI command which verifies the object will have a menu definition (either he already has one or
  ///   we will create it). Then it calls the CreateSubMenuObject in order to create the actual menu.
  /// </summary>
  /// <param name = "form"></param>
  /// <param name = "menuStyle"></param>
  createMenu(form: MgFormBase, menuStyle: MenuStyle): void {
    let actualForm: MgFormBase = form;
    if (form.isSubForm()) {
      let subFormCtrl: MgControlBase = form.getSubFormCtrl();
      actualForm = subFormCtrl.getForm().getTopMostForm();
    }
    // #991912. We will create menus anyway even though showMenu on the foem is false. so that when they are
    // later accessed with Access key, we can find the menus. The actual SWT menus will be created only
    // if Showmenu (MGFrom.shouldShowPullDownMenu()) is TRUE.
    super.setMenuIsInstantiated(actualForm, menuStyle);
    Commands.addAsync(CommandType.CREATE_MENU, null, actualForm, menuStyle, this, true, actualForm.ShouldShowPullDownMenu);
    actualForm.addMgMenuToList(this, menuStyle);

    // We are initializing window list menu items for context menu
    if (menuStyle === MenuStyle.MENU_STYLE_CONTEXT) {
      for (let i: number = 0; i < this._menuEntries.length; i = i + 1) {
        if (this._menuEntries.get_Item(i).menuType() === GuiMenuEntry_MenuType.WINDOW_MENU_ENTRY) {
          Events.InitWindowListMenuItems(actualForm, this._menuEntries.get_Item(i), menuStyle);
          break; // We should initialize the Window List only once
        }
      }
    }
    for (let i: number = 0; i < this._menuEntries.length; i = i + 1)
      this._menuEntries.get_Item(i).createMenuEntryObject(this, menuStyle, actualForm, false);

    this.refreshMenuAction(form, menuStyle);
    if (menuStyle === MenuStyle.MENU_STYLE_CONTEXT) {
      Commands.invoke();
    }
  }

  /// <summary>
  ///   refresh the menu actions
  /// </summary>
  /// <param name = "form"></param>
  /// <param name = "menuStyle"></param>
  refreshMenuAction(form: MgFormBase, menuStyle: MenuStyle): void {
    Commands.addAsync(CommandType.REFRESH_MENU_ACTIONS, form, null, menuStyle, this, true);
  }

  setText(val: string): void {
    this._text = val;
  }

  /// <summary>
  ///   This method gives an indication wether a menu was instantiated for a specific form and style.
  /// </summary>
  /// <param name = "form"></param>
  /// <param name = "menuStyle"></param>
  /// <returns> true if the menu already exists, false otherwise.</returns>
  menuIsInstantiated(form: MgFormBase, menuStyle: MenuStyle): boolean {
    return super.getInstantiatedMenu(form, menuStyle) !== null;
  }

  /// <summary>
  ///   This method updates a menu as instantiated for a specific form and style. It returns a reference to a
  ///   menu object - to be used in order to retrieve this menu object, if it is needed. The returned object
  ///   should be placed in the controlsMap, with the created menu for future use
  /// </summary>
  /// <param name = "form">the form for which the menus is instatiated</param>
  /// <returns> menu reference object</returns>
  setToolBarIsInstantiated(form: MgFormBase): MenuReference {
    // toolbar will not save a ref to a form. since we do not handle the toolbar dispose,
    // then there will not be a way to remove the ref of the form and we might have a dengling ref.
    // in any case, there is no use for a form on a menuref for the toolbar itself.
    let menuReference: MenuReference = new MenuReference(null);
    this._instantiatedToolbar.set_Item(form, menuReference);
    return menuReference;
  }

  /// <summary>
  ///   This method returns the toolbar object. In case the object is NULL, we allocate it and call the
  ///   createToolbar method in order to instantiate it.
  /// </summary>
  /// <returns>toolbar object</returns>
  createAndGetToolbar(form: MgFormBase): MenuReference {
    this.createToolbar(form);
    return <MenuReference>this._instantiatedToolbar.get_Item(form);
  }

  /// <summary>
  /// Get the toolbar. If the toolbar is not already created then we will return null.
  /// </summary>
  /// <param name="form"></param>
  /// <returns>toolbar object</returns>
  getToolbar(form: MgFormBase): MenuReference {
    return <MenuReference>this._instantiatedToolbar.get_Item(form);
  }

  /// <summary>
  ///   This method creates the toolbar object. It is done only if it was not instantiated already.
  /// </summary>
  private createToolbar(form: MgFormBase): void {
    if (!this._instantiatedToolbar.ContainsKey(form)) {
      if (!form.isSubForm()) {
        // create a new entry in the toolbar hash map
        let newToolbar: MenuReference = this.setToolBarIsInstantiated(form);

        // create the matching gui command
        // form is the parentObject
        // toolbar is the object
        // create toolbar only if form is not a sub-form.
        Commands.addAsync(CommandType.CREATE_TOOLBAR, form, newToolbar);
      }
    }
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="mgForm"></param>
  /// <returns></returns>
  deleteToolBar(mgForm: MgFormBase): void {
    let toolbar: MenuReference = <MenuReference>this._instantiatedToolbar.get_Item(mgForm);

    if (toolbar !== null) {
      // create the matching gui command
      // form is the parentObject
      // toolbar is the object
      Commands.addAsync(CommandType.DELETE_TOOLBAR, mgForm, toolbar);
      this.removeInstantiatedToolbar(mgForm);
    }
  }

  /// <summary> This method removes an instantiated toolibar for the form</summary>
  /// <param name="form">the form for which the menus is instantiated</param>
  removeInstantiatedToolbar(mgForm: MgFormBase): void {
    this._instantiatedToolbar.Remove(mgForm);
  }

  /// <summary>
  ///   This method adds a tool to the passed group and returns the new tool’s index.
  /// </summary>
  /// <param name = "toolGroup">group to which we add the tool</param>
  /// <returns> - new tool index</returns>
  checkStartSepForGroup(form: MgFormBase, toolGroup: number, menuType: GuiMenuEntry_MenuType): boolean {
    let createSepAtTheEnd: boolean = false;
    if (menuType !== GuiMenuEntry_MenuType.SEPARATOR)
      createSepAtTheEnd = form.createToolGroup(this, toolGroup);

    return createSepAtTheEnd;
  }

  checkEndtSepForGroup(form: MgFormBase, toolGroup: number, menuType: GuiMenuEntry_MenuType): void {
    if (menuType !== GuiMenuEntry_MenuType.SEPARATOR)
      form.createSepOnGroup(this, toolGroup);
  }

  /// <summary>
  ///   This method adds a tool to the passed group and returns the new tool’s index.
  /// </summary>
  /// <param name = "toolGroup">group to which we add the tool</param>
  /// <returns>new tool index</returns>
  addToolToGroup(form: MgFormBase, toolGroup: number, menuType: GuiMenuEntry_MenuType): number {
    let newToolIndex: number = 0;
    let count: number = 0;

    for (let i: number = 0; i <= toolGroup; i = i + 1) {
      count = form.getToolbarGroupCount(i);
      newToolIndex = newToolIndex + count;
    }

    // if we added a new tool and we already have a tool items we need to add the new tool before the seperator
    if (menuType !== GuiMenuEntry_MenuType.SEPARATOR && form.getToolbarGroupMenuEntrySep(toolGroup) !== null)
      newToolIndex = newToolIndex - 1;

    // each group ends with a separator, so we will increase the counter only after
    // we got the index
    form.setToolbarGroupCount(toolGroup, count + 1);
    return newToolIndex;
  }

  /// <summary>
  ///   This method adds the passed menu entry to the list of internal event menus which
  ///   appear on the Menu.
  /// </summary>
  /// <param name = "menuEntry">a menu Entry event object to be added to the list</param>
  addEntryToInternalEventsOnMenus(menuEntry: MenuEntryEvent): void {
    if (menuEntry.InternalEvent > 0) {
      let entries: List<MenuEntryEvent> = <List<MenuEntryEvent>>this._internalEventsOnMenus.get_Item(menuEntry.InternalEvent);
      if (entries === null)
        entries = new List<MenuEntryEvent>();
      entries.push(menuEntry);
      this._internalEventsOnMenus.set_Item(menuEntry.InternalEvent, entries);
    }
  }

  /// <summary>
  ///   This method adds the passed menu entry to the list of menu entries with access key
  ///   the key will be : access key & modifier
  /// </summary>
  /// <param name = "menuEntry">a menu Entry object to be added to the list</param>
  addEntryToMenuEntriesWithAccessKey(menuEntry: MenuEntry): void {
    if (menuEntry.AccessKey !== null && menuEntry.menuType() !== GuiMenuEntry_MenuType.INTERNAL_EVENT) {
      // MENU_TYPE_INTERNAL_EVENT will handel from the keybord mapping
      let key: string = menuEntry.AccessKey.getKeyCode() + menuEntry.AccessKey.getModifier();
      let entries: List<MenuEntry> = <List<MenuEntry>>this._menuEntriesWithAccessKey.get_Item(key);
      if (entries === null)
        entries = new List<MenuEntry>();
      entries.push(menuEntry);
      this._menuEntriesWithAccessKey.set_Item(key, entries);
    }
  }

  /// <summary>
  ///   This method returns the list of menu entries which appear on the Menu Bar
  /// </summary>
  getInternalEventsEntriesOnMenu(internalEvent: number): List<MenuEntryEvent> {
    return <List<MenuEntryEvent>>this._internalEventsOnMenus.get_Item(internalEvent);
  }

  /// <summary>
  ///   This method returns the list of menu entries with access key
  /// </summary>
  getMenuEntriesWithAccessKey(kbdItem: KeyboardItem): List<MenuEntry> {
    let key: string = kbdItem.getKeyCode() + kbdItem.getModifier();
    return <List<MenuEntry>>this._menuEntriesWithAccessKey.get_Item(key);
  }

  /// <summary>
  ///   This method adds the passed menu entry to the list of entries which appear on the Tool Bar, if it does
  ///   not exist in the array already
  /// </summary>
  /// <param name = "menuEntry">a menu Entry object to be added to the list</param>
  addEntryToInternalEventsOnToolBar(menuEntry: MenuEntryEvent): void {
    if (menuEntry.InternalEvent > 0) {
      let entries: List<MenuEntryEvent> = <List<MenuEntryEvent>>this._internalEventsOnToolBar.get_Item(menuEntry.InternalEvent);
      if (entries === null)
        entries = new List<MenuEntryEvent>();
      entries.push(menuEntry);
      this._internalEventsOnToolBar.set_Item(menuEntry.InternalEvent, entries);
    }
  }

  /// <summary>
  ///   This method returns the list of menu entries which appear on the Tool Bar
  /// </summary>
  getInternalEventsEntriesOnToolBar(internalEvent: number): List<MenuEntryEvent> {
    return <List<MenuEntryEvent>>this._internalEventsOnToolBar.get_Item(internalEvent);
  }

  iterator(): Array_Enumerator<MenuEntry> {
    return this._menuEntries.GetEnumerator();
  }

  /// <summary>
  ///   If a menu has a context menu instantiation for the given form :
  ///   Add a command for the gui to dispose the context menu. This will also trigger the disposing of all its items.
  /// </summary>
  /// <param name = "form"></param>
  disposeFormContexts(form: MgFormBase): void {
    let menuReference: MenuReference = super.getInstantiatedMenu(form, MenuStyle.MENU_STYLE_CONTEXT);

    if (menuReference !== null) {
      Commands.addAsync(CommandType.DISPOSE_OBJECT, menuReference);
    }
  }

  /// <summary>
  ///   This method destroys all menu objects of the previous menus definitions file, and
  ///   creates a list of all effected forms. When we finished cleaning the usage of the
  ///   previous menus file, we will use these list in order to assign the updated menus
  ///   to the effected objects (forms and controls).
  /// </summary>
  destroy(): List<MgFormBase> {
    let formsToRefresh: List<MgFormBase> = new List<MgFormBase>();
    let form: MgFormBase = null;

    if (this.instantiatedContext.Count > 0 || this.instantiatedPullDown.Count > 0) {
      for (let i: number = 0; i < this._menuEntries.length; i = i + 1) {
        let menuEntry: MenuEntry = this._menuEntries.get_Item(i);
        menuEntry.dispose();
      }

      // dispose all pulldown menu objects
      let enumerator: Array_Enumerator<GuiMgForm> = this.instantiatedPullDown.Keys;

      while (enumerator.MoveNext()) {
        form = <MgFormBase>enumerator.Current;
        form.toolbarGroupsCountClear();
        if (!formsToRefresh.Contains(form))
          formsToRefresh.push(form);
        let menuReference: MenuReference = <MenuReference>this.instantiatedPullDown.get_Item(form);
        Commands.addAsync(CommandType.DISPOSE_OBJECT, menuReference);
      }

      // dispose all context menu objects
      let contextKeysEnumerator: Array_Enumerator<GuiMgForm> = this.instantiatedContext.Keys;

      while (contextKeysEnumerator.MoveNext()) {
        form = <MgFormBase>contextKeysEnumerator.Current;
        form.toolbarGroupsCountClear();
        if (!formsToRefresh.Contains(form))
          formsToRefresh.push(form);
        let menuReference: MenuReference = <MenuReference>this.instantiatedContext.get_Item(form);
        Commands.addAsync(CommandType.DISPOSE_OBJECT, menuReference);
      }

      // dispose all context menu objects
      let ToolbarKeysEnumerator: Array_Enumerator<MgFormBase> = this._instantiatedToolbar.Keys;

      while (ToolbarKeysEnumerator.MoveNext()) {
        form = <MgFormBase>ToolbarKeysEnumerator.Current;
        form.toolbarGroupsCountClear();
        if (!formsToRefresh.Contains(form))
          formsToRefresh.push(form);
        let menuReference: MenuReference = <MenuReference>this._instantiatedToolbar.get_Item(form);
        if (menuReference !== null) {
          Commands.addAsync(CommandType.DISPOSE_OBJECT, menuReference);
        }
      }
      // remove the tollbar
      this.deleteToolBar(form);

      // we do not dispose the Toolbar objects - they are created once when the form is created
      // and are visible\hiddne according to need.

      this._internalEventsOnMenus.Clear();
      this._internalEventsOnToolBar.Clear();
      this._menuEntriesWithAccessKey.Clear();
    }
    return formsToRefresh;
  }

  /// <summary>
  ///   This method rebuilds all menu objects which were used before the menus file has changed.
  ///   This way we refresh the menus to use the definitions of the updated menus file
  /// </summary>
  rebuild(formsToRefresh: List<MgFormBase>): void {
    // refresh the menu properties of all effected forms contents (controls)
    if (formsToRefresh !== null) {
      for (let i: number = 0; i < formsToRefresh.length; i = i + 1) {
        let formToRefresh: MgFormBase = formsToRefresh.get_Item(i);
        let prop: Property = formToRefresh.getProp(PropInterface.PROP_TYPE_CONTEXT_MENU);
        if (prop !== null)
          prop.RefreshDisplay(true);

        // It is possible that the controls on the form had different context menus than the form itself.
        // So under form property we will find only the context menu attached to the form. But we need to refresh the other context menus as well.
        formToRefresh.refreshContextMenuForControls();

        prop = formToRefresh.getProp(PropInterface.PROP_TYPE_PULLDOWN_MENU);
        // In order to skip the computation of pulldown menu , call refreshPulldownMenu() directly instead of refreshDisplay().
        if (prop !== null) {
          prop.refreshPulldownMenu();
        }
      }
    }
  }

  /// <summary>
  ///   Destroy old menu, execute pending destroy events, and rebuild the menu
  /// </summary>
  destroyAndRebuild(): void {
    let formsToRefresh: List<MgFormBase> = this.destroy();
    Commands.invoke();
    this.rebuild(formsToRefresh);
  }

  /// <summary>
  ///   This method enables\ disables all internal event menu items which match the passed
  ///   action number, on the passed form, to the passed enable state.
  /// </summary>
  /// <param name = "form">on which we refresh this action state</param>
  /// <param name = "action">action whose enable state changed</param>
  /// <param name = "enable">new state of the action</param>
  enableInternalEvent(form: MgFormBase, action: number, enable: boolean, mdiChildForm: MgFormBase): void {
    let entries: List<MenuEntryEvent> = this.getInternalEventsEntriesOnMenu(action);
    let frameForm: MgFormBase = (form !== null) ? form.getTopMostFrameFormForMenuRefresh() : form;

    if (entries !== null) {
      for (let i: number = 0; i < entries.length; i = i + 1) {
        let actionMenu: MenuEntryEvent = entries.get_Item(i);

        if (actionMenu.InternalEvent < InternalInterface.MG_ACT_USER_ACTION_1 || actionMenu.InternalEvent > InternalInterface.MG_ACT_USER_ACTION_20) {
          if (frameForm !== null)
            this.EnableMenuEntry(actionMenu, frameForm, MenuStyle.MENU_STYLE_PULLDOWN, enable);
          let contextMenuForm: MgFormBase = (mdiChildForm !== null) ? mdiChildForm : form;
          this.EnableMenuEntry(actionMenu, contextMenuForm, MenuStyle.MENU_STYLE_CONTEXT, enable);
        }
      }
    }

    entries = this.getInternalEventsEntriesOnToolBar(action);
    if (entries !== null) {
      for (let i: number = 0; i < entries.length; i = i + 1) {
        let actionMenu: MenuEntryEvent = entries.get_Item(i);
        if (actionMenu.InternalEvent < InternalInterface.MG_ACT_USER_ACTION_1 || actionMenu.InternalEvent > InternalInterface.MG_ACT_USER_ACTION_20) {
          if (frameForm !== null)
            this.EnableMenuEntry(actionMenu, frameForm, MenuStyle.MENU_STYLE_TOOLBAR, enable);
        }
      }
    }
  }

  /// <summary>
  ///   This method refreshes ALL the action menus of the current menu on a specific form
  /// </summary>
  /// <param name = "form"></param>
  refreshInternalEventMenus(form: MgFormBase): void {
    let task: TaskBase = form.getTask();
    let mdiChildForm: MgFormBase = null;

    // refresh the action according to the pull down menu
    let actionsEnumerator: Array_Enumerator<number> = this._internalEventsOnMenus.Keys;
    if (form.isSubForm()) {
      let subFormCtrl: MgControlBase = form.getSubFormCtrl();
      form = subFormCtrl.getTopMostForm();
    }

    if (form.IsMDIChild) {
      mdiChildForm = form;
      form = form.getTopMostFrameForm();
    }

    while (actionsEnumerator.MoveNext()) {
      let act: number = <number>actionsEnumerator.Current;
      let enable: boolean = task.ActionManager.isEnabled(act);
      // The action enable\disable is save on the task but the menu of the subform is on the top most form
      this.enableInternalEvent(form, act, enable, mdiChildForm);
    }

    // refresh the action according to the tool bar
    actionsEnumerator = this._internalEventsOnToolBar.Keys;
    while (actionsEnumerator.MoveNext()) {
      let act: number = <number>actionsEnumerator.Current;
      let enable: boolean = task.ActionManager.isEnabled(act);
      // The action enable\disable is save on the task but the menu of the subform is on the top most form

      this.enableInternalEvent(form, act, enable, mdiChildForm);
    }
  }

  /// <summary>
  ///   creates enable command for a specific action on the menu
  /// </summary>
  /// <param name = "actionMenu">action menu to be enabled\ disabled</param>
  /// <param name = "form">on which form</param>
  /// <param name = "menuStyle">which style</param>
  /// <param name = "enable">enable\ disable</param>
  EnableMenuEntry(actionMenu: MenuEntry, form: MgFormBase, menuStyle: MenuStyle, enable: boolean): void {
    let menuReference: MenuReference = actionMenu.getInstantiatedMenu(form, menuStyle);
    if (menuReference !== null) {
      // When we are in GuiThread, we should enable menuentry synchronously.
      Commands.EnableMenuEntry(menuReference, enable);
    }
  }

  /// <param name = "drillDown">- tells us if we need to perform the same for all sub menus, or only
  ///   for the entries in the current level
  /// </param>
  setIndexes(drillDown: boolean): void {
    let Idx: number = 0;
    let iMenuEntry: Array_Enumerator<MenuEntry> = this.iterator();
    while (iMenuEntry.MoveNext()) {
      let menuEntry: MenuEntry = iMenuEntry.Current;
      menuEntry.setIndex(Idx = Idx + 1);

      if (drillDown && menuEntry.menuType() === GuiMenuEntry_MenuType.MENU)
        (<MenuEntryMenu>menuEntry).setIndexes(drillDown);
    }
  }

  /// <summary>
  /// returns TRUE , if any entry in menu is found visible.
  /// </summary>
  isAnyMenuEntryVisible(): boolean {
    for (let i: number = 0; i < this._menuEntries.length; i = i + 1) {
      if (this._menuEntries.get_Item(i).getVisible())
        return true;
    }
    return false;
  }

  /// <summary>
  /// set pulldown menu to Modal.
  /// </summary>
  /// <param name = "isModal"></param>
  /// <param name = "mainContextIsModal"></param>
  SetModal(isModal: boolean, mainContextIsModal: boolean): void {
    if (!isModal || !this.IsModalDisabled) {
      if (isModal)
        this.IsModalDisabled = true;
      else
        this.IsModalDisabled = false;
      this.setModal(this._menuEntries, isModal, mainContextIsModal, true);
    }
  }

  /// <summary>
  /// set menu entries Modal, depedning upon the value of isModal & mainContextIsModal.
  /// </summary>
  /// <param name = "menuEntries"></param>
  /// <param name = "isModal"></param>
  /// <param name = "mainContextIsModal"></param>
  private setModal(menuEntries: List<MenuEntry>, isModal: boolean, mainContextIsModal: boolean, toplevel: boolean): void {

    menuEntries.forEach((menuEntry: MenuEntry) => {
      let applyModal: boolean = false;

      if (menuEntry instanceof MenuEntryMenu) {
        let menu: MenuEntryMenu = <MenuEntryMenu>menuEntry;
        this.setModal(menu.subMenus, isModal, mainContextIsModal, false);
      }
      else
        applyModal = menuEntry.ShouldSetModal(isModal, mainContextIsModal);

      if (applyModal) {
        if (isModal) {
          // If menuEntry is enabled , then only set ModalDisabled flag & disable the menu.
          if (menuEntry.getEnabled()) {
            menuEntry.setModalDisabled(true);
            menuEntry.setEnabled(false, true, true, null, toplevel);
          }
        }
        else {
          // If menuEntry is ModalDisabled, then only enable menuEntry & reset ModalDisabled flag.
          if (menuEntry.getModalDisabled()) {
            menuEntry.setEnabled(true, true, true, null, toplevel);
            menuEntry.setModalDisabled(false);
          }
        }
      }
    });
  }
}
