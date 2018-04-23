import {GuiMenuEntry_ImageFor, GuiMenuEntry_MenuType, MenuStyle} from "../GuiEnums";
import {Debug, Hashtable, Array_Enumerator, List} from "@magic/mscorelib";
import {KeyboardItem} from "./KeyboardItem";
import {MenuReference} from "./low/MenuReference";
import {GuiMgForm} from "./GuiMgForm";
import {Events} from "../Events";
import {MgFormBase} from "../management/gui/MgFormBase";


export class GuiMenuEntry {
  private _menuUid: number = 0; // menu uid
  private _menuType: GuiMenuEntry_MenuType = 0;

  // type of the menus
  ParentMenuEntry: GuiMenuEntry = null;

  // immediate parent of the menu entry
  AccessKey: KeyboardItem = null; //// access key which activates the menu

  _instantiatedPullDown: Hashtable<MgFormBase, MenuReference> = null;
  _instantiatedContext: Hashtable<MgFormBase, MenuReference> = null;
  _instantiatedToolItem: Hashtable<MgFormBase, MenuReference> = null;
  _menuState: MenuState = null; // menu state
  _text: string = null; // menu text - displayed
  TextMLS: string = null;
  Imagefor: GuiMenuEntry_ImageFor = 0; // image and tool data
  ImageFile: string = null; // image and tool data
  ImageNumber: number = 0; // full path of image file name
  ImageGroup: number = 0; // location of the menu in the toolbar
  ToolTip: string = null;
  ToolTipMLS: string = null;
  Help: number = 0; // used help

  constructor() {
    this._menuState = new MenuState();
    this.init();
  }

  init(): void {
    this.ParentMenuEntry = null;
    this.AccessKey = null;

    this._instantiatedPullDown = new Hashtable<MgFormBase, MenuReference>();
    this._instantiatedContext = new Hashtable<MgFormBase, MenuReference>();
    this._instantiatedToolItem = new Hashtable<MgFormBase, MenuReference>();
  }

  /// <summary>
  ///   get Deep Copy of MenuState.
  /// </summary>
  /// <returns></returns>
  getDeepCopyOfMenuState(): void {
    let menuState: MenuState = new MenuState(this._menuState);
    this._menuState = menuState;
  }

  menuUid(): number {
    return this._menuUid;
  }

  setUid(uid: number): void {
    this._menuUid = uid;
  }

  setType(type: GuiMenuEntry_MenuType): void {
    this._menuType = type;
  }

  menuType(): GuiMenuEntry_MenuType {
    return this._menuType;
  }

  /// <summary> This method updates a menu as instantiated for a specific form and style. It returns a reference to a
  /// menu object - to be used in order to retrieve this menu object, if it is needed. The returned object
  /// should be placed in the controlsMap, with the created menu for future use
  /// </summary>
  /// <param name="form">the form for which the menus is instatiated</param>
  /// <param name="menuStyle">the menu style (pulldown, context)</param>
  /// <returns> menu reference object</returns>
  setMenuIsInstantiated(form: MgFormBase, menuStyle: MenuStyle): MenuReference {
    let menuReference: MenuReference = new MenuReference(form);
    if (menuStyle === MenuStyle.MENU_STYLE_PULLDOWN)
      this._instantiatedPullDown.set_Item(form, menuReference);
    else if (menuStyle === MenuStyle.MENU_STYLE_CONTEXT)
      this._instantiatedContext.set_Item(form, menuReference);
    else if (menuStyle === MenuStyle.MENU_STYLE_TOOLBAR)
      this._instantiatedToolItem.set_Item(form, menuReference);
    else
      Debug.Assert(false);
    return menuReference;
  }

  /// <summary> This method returns a menu object reference for a specific form and menu style (pulldown, context). The
  /// returned reference should be used in order to retrieve the specific instantiated menu object from the
  /// controls map.
  /// </summary>
  /// <param name="form">the form for which the menus is instatiated</param>
  /// <param name="menuStyle">the menu style (pulldown, context)</param>
  /// <returns> a menu object reference. In case the menu was not yet instantiated for the specfic form and
  /// style, null is returned.</returns>
  getInstantiatedMenu(form: MgFormBase, menuStyle: MenuStyle): MenuReference {
    let menuReference: MenuReference = null;
    if (menuStyle === MenuStyle.MENU_STYLE_PULLDOWN)
      menuReference = <MenuReference>this._instantiatedPullDown.get_Item(form);
    else if (menuStyle === MenuStyle.MENU_STYLE_CONTEXT)
      menuReference = <MenuReference>this._instantiatedContext.get_Item(form);
    else if (menuStyle === MenuStyle.MENU_STYLE_TOOLBAR)
      menuReference = <MenuReference>this._instantiatedToolItem.get_Item(form);
    else
      Debug.Assert(false);
    return menuReference;
  }

  getInstantiatedMenus(menuStyle: MenuStyle): Array_Enumerator<MenuReference>;
  getInstantiatedMenus(addToolBar: boolean): Array_Enumerator<MenuReference>;
  getInstantiatedMenus(form: GuiMgForm, addToolBar: boolean, addPullDown: boolean, addContext: boolean): Array_Enumerator<MenuReference>;
  getInstantiatedMenus(menuStyleOrAddToolBarOrForm: any, addToolBar?: boolean, addPullDown?: boolean, addContext?: boolean): Array_Enumerator<MenuReference> {
    if (arguments.length === 1 && (menuStyleOrAddToolBarOrForm === null || menuStyleOrAddToolBarOrForm.constructor === Number)) {
      return this.getInstantiatedMenus_0(menuStyleOrAddToolBarOrForm);
    }
    if (arguments.length === 1 && (menuStyleOrAddToolBarOrForm === null || menuStyleOrAddToolBarOrForm.constructor === Boolean)) {
      return this.getInstantiatedMenus_1(menuStyleOrAddToolBarOrForm);
    }
    return this.getInstantiatedMenus_2(menuStyleOrAddToolBarOrForm, addToolBar, addPullDown, addContext);
  }

  private getInstantiatedMenus_0(menuStyle: MenuStyle): Array_Enumerator<MenuReference> {
    let list: Array_Enumerator<MenuReference> = null;
    if (menuStyle === MenuStyle.MENU_STYLE_PULLDOWN)
      list = this._instantiatedPullDown.Values;
    else if (menuStyle === MenuStyle.MENU_STYLE_CONTEXT)
      list = this._instantiatedContext.Values;
    else if (menuStyle === MenuStyle.MENU_STYLE_TOOLBAR)
      list = this._instantiatedToolItem.Values;

    return list;
  }

  /// <summary></summary>
  /// <param name="addToolBar"></param>
  /// <returns>Returns all getInstantiatedMenus menus</returns>
  private getInstantiatedMenus_1(addToolBar: boolean): Array_Enumerator<MenuReference> {
    return this.getInstantiatedMenus(null, addToolBar, true, true);
  }

  /// <summary> Returns all getInstantiatedMenus menus for one form </summary>
  /// <returns> ArrayList<MenuReference> containing all Instantiated Menus
  /// </returns>
  private getInstantiatedMenus_2(form: MgFormBase, addToolBar: boolean, addPullDown: boolean, addContext: boolean): Array_Enumerator<MenuReference> {
    let arrayList: List<MenuReference> = new List<MenuReference>();
    if (form === null) {
      let listPullDown: Array_Enumerator<MenuReference> = null;
      let listContext: Array_Enumerator<MenuReference> = null;
      let listToolbar: Array_Enumerator<MenuReference> = null;

      if (addPullDown) {
        listPullDown = this.getInstantiatedMenus(MenuStyle.MENU_STYLE_PULLDOWN);
        if (listPullDown !== null)
          arrayList.AddRange(listPullDown);
      }
      if (addContext) {
        listContext = this.getInstantiatedMenus(MenuStyle.MENU_STYLE_CONTEXT);
        if (listContext !== null)
          arrayList.AddRange(listContext);
      }
      if (addToolBar) {
        listToolbar = this.getInstantiatedMenus(MenuStyle.MENU_STYLE_TOOLBAR);
        if (listToolbar !== null)
          arrayList.AddRange(listToolbar);
      }
    }
    else {
      let listPullDown: MenuReference = null;
      let listContext: MenuReference = null;
      let listToolbar: MenuReference = null;

      if (addPullDown) {
        listPullDown = this.getInstantiatedMenu(form, MenuStyle.MENU_STYLE_PULLDOWN);
        if (listPullDown !== null)
          arrayList.push(listPullDown);
      }
      if (addContext) {
        listContext = this.getInstantiatedMenu(form, MenuStyle.MENU_STYLE_CONTEXT);
        if (listContext !== null)
          arrayList.push(listContext);
      }
      if (addToolBar) {
        listToolbar = this.getInstantiatedMenu(form, MenuStyle.MENU_STYLE_TOOLBAR);
        if (listToolbar !== null)
          arrayList.push(listToolbar);
      }
    }
    return arrayList.GetEnumerator();
  }

  /// <summary> Remove the menu reference for the menu entry</summary>
  /// <param name="menuReference"></param>
  /// <param name="style"></param>
  removeMenuIsInstantiated(guiMgForm: MgFormBase, style: MenuStyle): void {
    if (style === MenuStyle.MENU_STYLE_PULLDOWN)
      this._instantiatedPullDown.Remove(guiMgForm);
    else if (style === MenuStyle.MENU_STYLE_CONTEXT)
      this._instantiatedContext.Remove(guiMgForm);
    else if (style === MenuStyle.MENU_STYLE_TOOLBAR)
      this._instantiatedToolItem.Remove(guiMgForm);
  }

  /// <summary> This method updates a toolbar as instantiated for a specific form and style. It returns a reference to a
  /// menu object - to be used in order to retrieve this menu object, if it is needed. The returned object
  /// should be placed in the controlsMap, with the created menu for future use
  /// </summary>
  /// <param name="form">the form for which the menus is instatiated</param>
  /// <param name="menuStyle">the menu style (pulldown, context)</param>
  /// <returns> menu reference object</returns>
  setToolItemInstantiated(form: MgFormBase): MenuReference {
    let menuReference: MenuReference = new MenuReference(form);
    this._instantiatedToolItem.set_Item(form, menuReference);
    return menuReference;
  }

  /// <summary> This method returns a menu object reference for a specific form and menu style (pulldown, context). The
  /// returned reference should be used in order to retrieve the specific instantiated menu object from the
  /// controls map.
  /// </summary>
  /// <param name="form">the form for which the menus is instatiated</param>
  /// <param name="menuStyle">the menu style (pulldown, context)</param>
  /// <returns> a menu object reference. In case the menu was not yet instantiated for the specfic form and
  /// style, null is returned.</returns>
  getInstantiatedToolItem(form: MgFormBase): MenuReference {
    return <MenuReference>this._instantiatedToolItem.get_Item(form);
  }

  getInstantiatedToolItems(): Array_Enumerator<MenuReference> {
    return this._instantiatedToolItem.Values;
  }

  getEnabled(): boolean {
    return this._menuState.Enabled;
  }

  getChecked(): boolean {
    return this._menuState.Checked;
  }

  getVisible(): boolean {
    return this._menuState.Visible;
  }

  getModalDisabled(): boolean {
    return this._menuState.ModalDisabled;
  }

  setModalDisabled(val: boolean): void {
    this._menuState.ModalDisabled = val;
  }

  toolTip(pToolTip: string): void {
    this.ToolTip = pToolTip;
    this.ToolTipMLS = Events.Translate(this.ToolTip);
  }

  /// <summary>Check if all ancestors menus entries are visible. If not, return false</summary>
  /// <param name="menuEntry">menu entry.</param>
  CheckIfParentItemVisible(menuEntry: GuiMenuEntry): boolean {
    let visible: boolean = true;
    if (menuEntry.ParentMenuEntry !== null) {
      if (!menuEntry.ParentMenuEntry.getVisible())
        return false;
      else
        this.CheckIfParentItemVisible(menuEntry.ParentMenuEntry);
    }
    return visible;
  }
}

export class MenuState {
  Checked: boolean = false;
  Visible: boolean = false;
  Enabled: boolean = false;
  ModalDisabled: boolean = false;

  constructor();
  constructor(menuState: MenuState);
  constructor(menuState?: MenuState) {
    if (arguments.length === 0) {
      this.constructor_0();
      return;
    }
    this.constructor_1(menuState);
  }

  private constructor_0(): void {
  }

  private constructor_1(menuState: MenuState): void {
    this.Checked = menuState.Checked;
    this.Visible = menuState.Visible;
    this.Enabled = menuState.Enabled;
    this.ModalDisabled = menuState.ModalDisabled;
  }
}
