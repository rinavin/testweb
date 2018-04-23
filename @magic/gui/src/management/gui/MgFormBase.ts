import {GuiMgForm} from "../../gui/GuiMgForm";
import {PropParentInterface} from "../../gui/PropParentInterface";
import {
  AutoFit, Constants, CtrlButtonTypeGui, Logger_LogLevels, MgControlType, StorageAttribute,
  StrUtil, TabbingOrderType, WindowType, WinUom, XMLConstants, XmlParser
} from "@magic/utils";
import {
  Array_Enumerator, Debug, Hashtable, IHashCode, Int32, List, NNumber, NString, RefParam, Stack,
  StringBuilder
} from "@magic/mscorelib";
import {MgControlBase} from "./MgControlBase";
import {MgPoint, MgPointF} from "../../util/MgPoint";
import {GuiMgControl} from "../../gui/GuiMgControl";
import {PropTable} from "./PropTable";
import {TaskBase} from "../tasks/TaskBase";
import {ControlTable} from "./ControlTable";
import {RuntimeContextBase} from "../RuntimeContextBase";
import {Manager} from "../../Manager";
import {Events} from "../../Events";
import {Property} from "./Property";
import {MgMenu} from "./MgMenu";
import {CommandType, GuiMenuEntry_MenuType, MenuStyle} from "../../GuiEnums";
import {PropDefaults} from "./PropDefaults";
import {NUM_TYPE} from "../data/NUM_TYPE";
import {FieldDef} from "../data/FieldDef";
import {Commands} from "../../Commands";
import {Field} from "../data/Field";
import {MgRectangle} from "../../util/MgRectangle";
import {ToolbarInfo} from "./ToolbarInfo";
import {MenuEntry} from "./MenuEntry";
import {KeyboardItem} from "../../gui/KeyboardItem";
import {PropInterface} from "./PropInterface";
import {GuiConstants} from "../../GuiConstants";
import {UIBridge} from "../../UIBridge";


const delimiter: string = ", ";

/// <summary>
/// data for <form>...</form>
/// </summary>
export abstract class MgFormBase extends GuiMgForm implements PropParentInterface, IHashCode {
  InInitForm: boolean = false;
  IsHelpWindow: boolean = false;                        // the form is help form\window or not.
  CtrlTab: ControlTable = null;
  // until the form is refreshed in the first time
  FormRefreshed: boolean = false;
  FormRefreshedOnceAfterFetchingDataView: boolean = false;
  RefreshRepeatableAllowed: boolean = false;
  Rows: List<Row> = null;
  ModalFormsCount: number = 0;
  ErrorOccured: boolean = false;
  FormIsn: number = 0;
  Name: string = null;
  Opened: boolean = false;
  IsFrameSet: boolean = false;
  isLegalForm: boolean = false;
  PBImagesNumber: number = 0;
  LastClickedMenuUid: number = 0;
  ignoreFirstRefreshTable: boolean = false;
  /// </summary>
  ParentForm: MgFormBase = null;
  /// </summary>
  FormToBoActivatedOnClosingCurrentForm: MgFormBase = null;
  protected _destTblRow: number = Int32.MinValue;
  protected _firstTableTabOrder: number = 0;            // tab order of first child of table
  protected LastDvRowCreated: number = -1;
  protected _inRefreshDisp: boolean = false;
  protected _inRestore: boolean = false;
  protected _instatiatedMenus: Hashtable<number, MgMenu> = null;        // menus that belong to this form according to menu style(pulldown \ context)
  protected _lastRowSent: number = -1;                  // last row sent ro gui thread
  protected _prevTopIndex: number = -1;
  protected _propTab: PropTable = null;
  protected _rowsInPage: number = 1;
  protected _subFormCtrl: MgControlBase = null;
  protected _tableMgControl: MgControlBase = null;
  protected _tableItemsCount: number = 0;               // number of rows in the table
  protected _tableRefreshed: boolean = false;
  protected _task: TaskBase = null;                     // the task to which the current form belongs
  protected _topIndexUpdated: boolean = false;          // true if a top index was updated

  // Form representing the internal help window.Here the internal form object is kept on the form object itself.
  protected _transferingData: boolean = false;          // rows are requested for a GUI thread
  private _controlsInheritingContext: List<MgControlBase> = null;
  private _toolbarGroupsCount: Hashtable<number, ToolbarInfo> = null;        // <int index, ToolbarInfo>
  // prevents refresh of DisplayList for the corresponding controls and currRecCompute(RC)
  private _allowedSubformRecompute: boolean = true;
  private _concreteWindowType: WindowType = 0;
  private _containerCtrl: MgControlBase = null;
  private _firstRefreshOfProps: boolean = true;
  private _frameFormCtrl: MgControlBase = null;
  private _guiTableChildren: List<GuiMgControl> = null;
  private _horizontalFactor: number = -1;
  private _prevSelIndex: number = -1;
  private _shouldCreateToolbar: boolean = false;        // if to create toolbar
  private _shouldShowPullDownMenu: boolean = false;     // if show menu
  private _tableChildren: List<MgControlBase> = null;   // Can't use List<T>
  private _tableColumns: List<MgControlBase> = null;
  private _userStateId: string = "";
  private _verticalFactor: number = -1;
  // Property 'IsHelpWindow' is used to differentiate between the help form and non help form.
  private _internalHelpWindow: MgFormBase = null;
  private displayLine: number = 0;

  /// </summary>
  constructor() {
    super();
    this._propTab = new PropTable(this);
    this.CtrlTab = new ControlTable();
    this.Rows = new List();
    this._toolbarGroupsCount = new Hashtable<number, ToolbarInfo>();
    this._controlsInheritingContext = new List<MgControlBase>();
    this._instatiatedMenus = new Hashtable<number, MgMenu>();
    this._concreteWindowType = <WindowType>0;
    this.ParentForm = null;
    this.IsHelpWindow = false;
  }

  get DisplayLine(): number {
    return this.displayLine;
  }

  set DisplayLine(value: number) {
    this.displayLine = value;
  }

  get UniqueName(): string {
     return this.getProp(PropInterface.PROP_TYPE_FORM_NAME).getValue();
   }

  get TaskTag(): string {
     return this.getTask().getTaskTag();
   }

  get ShouldShowPullDownMenu(): boolean {
    return this._shouldShowPullDownMenu;
  }

  get TableChildren(): List<MgControlBase> {
    if (this._tableChildren === null)
      this.buildTableChildren();
    return this._tableChildren;
  }

  set TableChildren(value: List<MgControlBase>) {
    this._tableChildren = value;
  }

  get ShouldCreateToolbar(): boolean {
    return this._shouldCreateToolbar;
  }

  get UserStateId(): string {
    return this._userStateId;
  }

  get AllowedSubformRecompute(): boolean {
    return this._allowedSubformRecompute;
  }

  set AllowedSubformRecompute(value: boolean) {
    this._allowedSubformRecompute = value;
  }

  get IsMDIOrSDIFrame(): boolean {
    return MgFormBase.isMDIOrSDI(this.ConcreteWindowType);
  }

  get IsMDIFrame(): boolean {
    return this.ConcreteWindowType === WindowType.MdiFrame;
  }

  get IsSDIFrame(): boolean {
    return this.ConcreteWindowType === WindowType.Sdi;
  }

  get IsChildWindow(): boolean {
    return this.ConcreteWindowType === WindowType.ChildWindow;
  }

  /// <summary>
  /// returns true for mdi child and fit to mdi

  get IsValidWindowTypeForWidowList(): boolean {
    return this.IsMDIChild || this.IsSDIFrame || this.ConcreteWindowType === WindowType.Floating || this.ConcreteWindowType === WindowType.Tool;
  }

  /// <summary>
  /// Returns true for a FitToMdi window.

  get ConcreteWindowType(): WindowType {
    if (this._concreteWindowType === <WindowType>0) {
      let windowType: WindowType = <WindowType>this.GetComputedProperty(PropInterface.PROP_TYPE_WINDOW_TYPE).GetComputedValueInteger();
        if (this.ParentForm === null || windowType !== WindowType.Modal)
          windowType = WindowType.Default;

      this._concreteWindowType = windowType;
    }
    return this._concreteWindowType;
  }

  /// <summary>
  /// Returns true for Floating, Tool or Modal.

  set ConcreteWindowType(value: WindowType) {
    this._concreteWindowType = value;
  }

  /// <summary>the form of the task that called the current task (note: NOT triggering task).
  /// If this form (form of the task that called the current task) is not visible like in case
  /// for non-interactive task with OpenWindow=No, the ParentForm will be the immediate previous
  /// visible form.
  /// This means that ParentForm's task and Task's ParentTask can be different.

  /// </summary>
  get IsMDIChild(): boolean {
    return MgFormBase.isMDIChild(this.ConcreteWindowType);
  }

  /// <summary>
  /// When closing the current form, we need to activate another form. Actually framework does it, but it activates
  /// a different form which is not appropriate for Magic --- refer Defects #71348 and #129179.
  /// Until Defect #129937, ParentForm was activated on closing the current form. But, it is wrong to do so.
  /// Why? --- Refer detailed comment in "Fix Description" of Defect #129937.
  /// So, a separate FormToBoActivatedOnClosingCurrentForm is maintained.

  /// </summary>
  get IsFitToMdi(): boolean {
    return this.ConcreteWindowType === WindowType.FitToMdi;
  }

  /// </summary>
  get IsFloatingToolOrModal(): boolean {
    return this.ConcreteWindowType === WindowType.Floating || this.ConcreteWindowType === WindowType.Tool || this.ConcreteWindowType === WindowType.Modal;
  }

  /// <summary>
  /// CTOR

  get SupportActiveRowHightlightState(): boolean {
    return this.HasTable();
  }

  /// <summary>Returns the internal window form.</summary>

  /// <returns></returns>
  static isMDIChild(windowType: WindowType): boolean {
    return windowType === WindowType.MdiChild || windowType === WindowType.FitToMdi;
  }

  /// <summary> update the count of modal child forms on the frame window</summary>
  /// <param name = "mgFormBase">current modal form</param>

  /// <returns></returns>
  static isMDIOrSDI(windowType: WindowType): boolean {
    return windowType === WindowType.Sdi || windowType === WindowType.MdiFrame;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="expId"></param>
  /// <param name="resType"></param>
  /// <param name="length"></param>
  /// <param name="contentTypeUnicode"></param>
  /// <param name="resCellType"></param>
  /// <param name="alwaysEvaluate"></param>
  /// <param name="wasEvaluated"></param>

  /// <returns></returns>
  static GetConcreteWindowTypeForMDIChild(isFitToMdi: boolean): WindowType {
    if (isFitToMdi)
      return WindowType.FitToMdi;
    else
      return WindowType.Default;
  }

  /// <summary>
  /// This method enables a specific action on all the menu objects of the form and its children's
  /// menus.
  /// </summary>
  /// <param name = "action">action whose state has changed</param>

  /// <returns></returns>
  static ShouldPutActOnFormClose(): boolean {
    return false;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="propId"></param>

  static IsFormTag(tagName: string): boolean {
    return tagName === XMLConstants.MG_TAG_FORM || tagName === XMLConstants.MG_TAG_FORM_PROPERTIES;
  }

  /// <summary>
  /// return a property of the form by its Id
  /// </summary>

  static IsEndFormTag(tagName: string): boolean {
    return tagName === ("/" + XMLConstants.MG_TAG_FORM) || tagName === ("/" + XMLConstants.MG_TAG_FORM_PROPERTIES);
  }

  /// <summary>
  /// get a property of the form that already was computed by its Id
  /// This method does not create a property if it isn't exist.
  /// May we need to create a property and use its default value.
  /// In Phase 2 in RefreshProperties method we'll create and compute properties,
  /// perhaps we need create all properties not only those that are different from default.
  /// </summary>

  /// <returns></returns>
  protected static ShouldBehaveAsModal(): boolean {
    return false;
  }

  /// <summary>
  /// checks if property has expression
  /// </summary>
  /// <param name="propId"></param>

  /// <returns></returns>
  private static ConvertArrayListToString(items: List<string>, isItemNumType: boolean): string {
    let from: string[] = ["\\", "-", ","];
    let to: string[] = ["\\\\", "\\-", "\\,"];
    let stringBuilder: StringBuilder = new StringBuilder();
    let nUM_TYPE: NUM_TYPE;

    for (let index: number = 0; index < items.length; index = index + 1) {
      if (isItemNumType) {
        nUM_TYPE = new NUM_TYPE(<string>items.get_Item(index));
        items.set_Item(index, nUM_TYPE.to_double().toString());
      }

      stringBuilder.Append(StrUtil.searchAndReplace(<string>items.get_Item(index), from, to));

      if (index < items.length - 1)
        stringBuilder.Append(delimiter);
    }

    return stringBuilder.ToString();
  }

  /// <summary>
  /// return true if this is first refresh
  /// </summary>

  private static IsControlChildOfFrameForm(control: MgControlBase): boolean {
    let isControlChildOfFrameForm: boolean = false;

    let parent: MgControlBase = ((control.getParent() instanceof MgControlBase) ? <MgControlBase>control.getParent() : null);
    if (parent != null && parent.isContainerControl())
      isControlChildOfFrameForm = true;

    return isControlChildOfFrameForm;
  }

  /// <summary>
  /// for PropParentInterface

  /// <returns></returns>
  GetInternalHelpWindowForm(): MgFormBase {
    return this._internalHelpWindow;
  }

  /// <summary>
  /// parse the form structure
  /// </summary>

  /// <param name = "increase"></param>
  UpdateModalFormsCount(mgFormBase: MgFormBase, increase: boolean): void {
    Debug.Assert(MgFormBase.isMDIOrSDI(this.ConcreteWindowType));
    if (increase)
      this.ModalFormsCount += 1;
    else
      this.ModalFormsCount -= 1;

    Events.SetModal(mgFormBase, increase);
  }

  /// <summary>
  /// To allocate and fill inner objects of the class
  /// </summary>
  /// <param name="foundTagName"></param>

  /// <returns></returns>
  EvaluateExpression(expId: number, resType: StorageAttribute, length: number, contentTypeUnicode: boolean,
                     resCellType: StorageAttribute, alwaysEvaluate: boolean, wasEvaluated: RefParam<boolean>): string {
    return this._task.EvaluateExpression(expId, resType, length, contentTypeUnicode, resCellType, true, wasEvaluated);
  }

  /// <summary>
  ///   This method performs a loop on all the forms controls and sets the context menu property
  ///   by invoking the get method.
  ///   The get is done in order to create a context menu property for all the controls on the form.
  ///   This way any control which does not have this property set, will still have a property which
  ///   we will be able to refresh in order to set on it the forms context menu.

  /// <param name = "enable">new state of the action</param>
  EnableActionMenu(action: number, enable: boolean): void {
    let mgMenu: MgMenu = null;
    let menuStyle: MenuStyle;
    let menuStylesEnumerator: Array_Enumerator<MenuStyle> = this._instatiatedMenus.Keys;

    while (menuStylesEnumerator.MoveNext()) {
      menuStyle = <MenuStyle>menuStylesEnumerator.Current;
      mgMenu = <MgMenu>this._instatiatedMenus.get_Item(menuStyle);
      mgMenu.enableInternalEvent(this, action, enable, null);
    }
  }

  /// <summary>
  /// initialization.

  /// <returns></returns>
  checkIfExistProp(propId: number): boolean {
    let exist: boolean = false;
    if (this._propTab !== null) {
      let propById: Property = this._propTab.getPropById(propId);
      exist = (propById !== null);
    }
    return exist;
  }

  /// <summary>
  ///   Fill name member of the class
  /// </summary>

  /// <param name = "propId">the Id of the property</param>
  getProp(propId: number): Property {
    let prop: Property = null;

    if (this._propTab !== null) {
      prop = this._propTab.getPropById(propId);

      // if the property doesn't exist then create a new property and give it the default value
      // in addition add this property to the properties table
      if (prop === null) {
        prop = PropDefaults.getDefaultProp(propId, GuiConstants.PARENT_TYPE_FORM, this);
        if (prop !== null)
          this._propTab.addPropWithCheckExistence(prop, false);
      }
    }
    return prop;
  }

  /// <summary>
  ///   for each control build the list of all the controls that are linked to it

  /// <param name = "propId">the Id of the property</param>
  GetComputedProperty(propId: number): Property {
    let prop: Property = null;

    if (this._propTab !== null)
      prop = this._propTab.getPropById(propId);

    return prop;
  }

  /// <summary>
  ///   build list of all controls that are in the same data of the parameter mgConatol relevant only for the
  ///   RadioButton
  /// </summary>

  /// <returns></returns>
  PropertyHasExpression(propId: number): boolean {
    let prop: Property = this._propTab.getPropById(propId);
    return prop !== null && prop.isExpression();
  }


  /// <summary>

  /// <returns></returns>
  getCompIdx(): number {
    return (this.getTask() === null) ? 0 : this.getTask().getCompIdx();
  }

  /// <summary>
  ///   arrange zorder for controls. recursive function.
  /// </summary>

  /// <returns></returns>
  IsFirstRefreshOfProps(): boolean {
    return this._firstRefreshOfProps;
  }

  /// <summary>
  ///   build list of all columns controls

  /// </summary>
  getForm(): MgFormBase {
    return this;
  }

  /// <summary>
  /// Checks if an internal Fit to MDI form needs to be created to hold the Main Program controls
  /// </summary>

  /// <param name = "taskRef">reference to the ownerTask of this form</param>
  fillData(taskRef: TaskBase): void {
    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;

    if (this._task === null && taskRef !== null)
      this._task = taskRef;

    while (this.initInnerObjects(parser.getNextTag())) {
    }

    // inherit from the system menus if no menus is defined for the form
    this.inheritSystemMenus();
  }

  /// <summary>
  ///   Creates the window defined by this form and its child controls

  /// </summary>
  initContextPropForControls(): void {
    for (let i: number = 0; i < this.CtrlTab.getSize(); i = i + 1) {
      let ctrl: MgControlBase = this.CtrlTab.getCtrl(i);
      ctrl.getProp(PropInterface.PROP_TYPE_CONTEXT_MENU);
    }
  }

  /// </summary>
  init(): void {
    for (let i: number = 0; i < this.CtrlTab.getSize(); i = i + 1) {
      let ctrl: MgControlBase = this.CtrlTab.getCtrl(i);
      // initializes the subform controls
      ctrl.Init();
    }

    // build the controls tabbing order
    this.buildTabbingOrder();

    // build lists of linked controls on their parents
    this.buildLinkedControlsLists();

    // build lists of sibling controls
    this.buildSiblingList();

    // build list of columns and non columns
    this.buildTableColumnsList();
    this.createForm();

    this._task.setKeyboardMappingState(Constants.ACT_STT_TBL_SCREEN_MODE, this.isScreenMode());
    this._task.setKeyboardMappingState(Constants.ACT_STT_TBL_LEFT_TO_RIGHT, !this.GetComputedProperty(PropInterface.PROP_TYPE_HEBREW).GetComputedValueBoolean());

    // if we tried to write to the status bar before the task was initialized, then now is the time to display the message!
    if (this._task.getSaveStatusText() !== null)
      Manager.WriteToMessagePane(this._task, this._task.getSaveStatusText(), false);
  }

  /// <summary>
  ///   order the splitter container children. The child that is docked to fill is added first, then
  ///   the splitter control and finally the child that is docked either to the top or to the left

  /// <returns> end Index of the<form ...> subtag</returns>
  fillName(formTag: string): void {
    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;
    let endContext: number = parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex());

    if (endContext !== -1 && endContext < parser.getXMLdata().length) {
      // last position of its tag
      let tag: string = parser.getXMLsubstring(endContext);
      parser.add2CurrIndex(tag.indexOf(formTag) + formTag.length);

      let tokensVector: List<string> = XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);

      let attribute: string;
      let valueStr: string;

      for (let i: number = 0; i < tokensVector.length; i = i + 2) {
        attribute = tokensVector.get_Item(i);
        valueStr = tokensVector.get_Item(i + 1);

        switch (attribute) {
          case XMLConstants.MG_ATTR_NAME:
            this.Name = XmlParser.unescape(valueStr).toString();
            if (Events.ShouldLog(Logger_LogLevels.Gui))
              Events.WriteGuiToLog(NString.Format("Parsing form \"{0}\"", this.Name));
            break;
          case XMLConstants.MG_ATTR_IS_FRAMESET:
            this.IsFrameSet = XmlParser.getBoolean(valueStr);
            break;
          case XMLConstants.MG_ATTR_IS_LIGAL_RC_FORM:
            this.isLegalForm = XmlParser.getBoolean(valueStr);
            break;
          case XMLConstants.MG_ATTR_PB_IMAGES_NUMBER:
            this.PBImagesNumber = XmlParser.getInt(valueStr);
            break;
          case XMLConstants.MG_ATTR_FORM_ISN:
            this.FormIsn = XmlParser.getInt(valueStr);
            break;
          case XMLConstants.MG_ATTR_USERSTATE_ID:
            this._userStateId = XmlParser.unescape(valueStr).toString();
            break;
          default:
            Events.WriteExceptionToLog(NString.Format("Unhandled attribute '{0}'.", attribute));
            break;
        }
      }
      parser.setCurrIndex(endContext + 1); // to delete ">" too
      return;
    }
    Events.WriteExceptionToLog("in Form.FillName() out of bounds");
  }

  /// <summary>
  ///   save information about the menu visible
  ///   save information about the toolbar visible
  /// </summary>

  /// </summary>
  arrangeZorder(): void {
    // create array list from the _ctrlTab
    let ctrlArrayList: List<MgControlBase> = new List<MgControlBase>();

    for (let i: number = 0; i < this.CtrlTab.getSize(); i = i + 1) {
      ctrlArrayList.push(this.CtrlTab.getCtrl(i));
    }
    this.arrangeZorderControls(ctrlArrayList);
  }

  abstract buildFormName(): string;

  /// <summary>
  /// returns true for mdi child and fit to mdi
  /// </summary>
  /// <param name="windowType"></param>

  /// </summary>
  createForm(): void {
    let runtimeContext: RuntimeContextBase = Manager.GetCurrentRuntimeContext();

    if (this.IsMDIFrame)
      runtimeContext.FrameForm = this;

    if (!this.isSubForm()) {
      let object: any = this.FindParent(runtimeContext);

      // parent can be null.
      Commands.addAsync(CommandType.CREATE_FORM, object, this, this.ConcreteWindowType, this.Name, false, this.ShouldCreateInternalFormForMDI(), this._task.IsBlockingBatch);

    }

    let inputControls = this.GetListOfInputControls();
    let formName: string = this.buildFormName();
    if (!this.isSubForm()) {
        Commands.addOpenForm(this, formName, "0", this.getTask().getTaskTag(), inputControls, this.isDialog());
    }
    else {
        Commands.addOpensubform(CommandType.CREATE_SUB_FORM, this.getSubFormCtrl(), this.getTask().getTaskTag(), this.getSubFormCtrl().getName(),
          formName, inputControls, this.getTask().RouterPath, this.getTask().GetRouterParams(),  this.getTask().InDefaultRouterOutlet);
    }
    this.orderSplitterContainerChildren();
    this.InitMenuInfo();

    // default create one row in table control. DON'T set items count during form open.
    // firstTableRefresh() will create the actual rows, and refresh the table.
    if (this.HasTable())
      this.InitTableControl();

    Commands.beginInvoke();
  }

  /// <summary>
  /// returns true for mdi or sdi
  /// </summary>
  /// <param name="windowType"></param>

  /// <returns></returns>
  InitMenuInfo(): void {
    this._shouldShowPullDownMenu = false;
    this._shouldCreateToolbar = false;
    /* in MenuEntry, we need to know of the menu\toolbar need to be display*/
    // the show\hide of the menu\toolbar is compute and not recompute.

    // if the parent of the TaskBase is Modal\floating\tool, then his child will be also the same window type.
    if (this.IsMDIOrSDIFrame) {
      // check if we need to display the menu
      if (this.getProp(PropInterface.PROP_TYPE_DISPLAY_MENU) !== null)
        this._shouldShowPullDownMenu = (this.getProp(PropInterface.PROP_TYPE_DISPLAY_MENU)).getValueBoolean();

      // check if we need to display the toolbar
      if (this.getProp(PropInterface.PROP_TYPE_DISPLAY_TOOLBAR) !== null) {
        this._shouldCreateToolbar = (this.getProp(PropInterface.PROP_TYPE_DISPLAY_TOOLBAR)).getValueBoolean();
      }
    }
  }

  /// <summary>
  ///   check if the MgMenu is used by this form as a pulldown menu
  /// </summary>
  /// <param name = "mgMenu"></param>

  /// <returns></returns
  isUsedAsPulldownMenu(mgMenu: MgMenu): boolean {
    return this.getPulldownMenu() === mgMenu;
  }

  /// <summary>
  /// </summary>
  /// <returns> the attached pulldown menu</returns>
  getPulldownMenu(): MgMenu {
    return <MgMenu>this._instatiatedMenus.get_Item(MenuStyle.MENU_STYLE_PULLDOWN);
  }

  /// <summary>
  ///   return true if form has automatic tabbing order
  /// </summary>
  /// <returns></returns>
  isAutomaticTabbingOrder(): boolean {
    return this.GetComputedProperty(PropInterface.PROP_TYPE_TABBING_ORDER).GetComputedValueInteger() === TabbingOrderType.Automatically;
  }

  /// <summary>
  ///   true if we can refresh repeatable controls
  ///   QCR #434649, we prevent painting table's control untill shell is opened and we know how many rows to paint
  /// </summary>
  /// <returns></returns>
  isRefreshRepeatableAllowed(): boolean {
    return this.RefreshRepeatableAllowed;
  }

  /// <summary>
  ///   returns true if the form is screen mode
  /// </summary>
  isScreenMode(): boolean {
    return !this.isLineMode();
  }

  /// <summary>
  ///   returns true if the form is line mode
  ///   if we have a tree or a table on the form
  /// </summary>
  isLineMode(): boolean {
    return this.getMainControl() !== null;
  }

  /// <summary>
  ///   return true if task has table or tree
  /// </summary>
  /// <returns></returns>
  hasTable(): boolean {
    return this._tableMgControl !== null;
  }

  /// <summary>
  ///   return true if form should be opened as modal window
  /// </summary>
  /// <returns></returns>
  isDialog(): boolean {
    let isDialog: boolean = false;

    // Check for 'isDialog' only for non help form.
    if (!this.IsHelpWindow) {
      let windowType: WindowType = this.ConcreteWindowType;
      if (windowType === WindowType.Modal || windowType === WindowType.ApplicationModal)
        isDialog = true;
      else if (MgFormBase.ShouldBehaveAsModal())
        isDialog = true;
    }

    return isDialog;
  }

  /// <summary>
  /// Should this form behave as Modal although its WindowType != Modal?
  /// </summary>

  /// <returns> boolean</returns>
  isSubForm(): boolean {
    return this._subFormCtrl !== null;
  }

  /// <summary>
  ///   returns true if this form is subform
  /// </summary>

  /// <returns></returns>
  HasTable(): boolean {
    return this._tableMgControl !== null;
  }

  /// <summary>
  ///   return true if task has table
  /// </summary>

  /// <returns> if there is Tab control on the form</returns>
  hasTabControl(): boolean {
    let hasTabCtrl: boolean = false;
    let ctrl: MgControlBase;

    for (let i: number = 0; i < this.CtrlTab.getSize(); i++) {
      ctrl = this.CtrlTab.getCtrl(i);
      if (ctrl.isTabControl())
        hasTabCtrl = true;
    }

    return hasTabCtrl;
  }

  /// <returns></returns>
  getMgMenu(style: MenuStyle): MgMenu {
    return <MgMenu>this._instatiatedMenus.get_Item(style);
  }

  /// <summary>
  ///   return the menu of the form according to style
  /// </summary>

  /// <returns></returns>
  getTopMostForm(): MgFormBase {
    let topMostForm: MgFormBase = this;

    // The form of the sub form control
    while (topMostForm.isSubForm() && topMostForm.ParentForm !== null)
      topMostForm = topMostForm.ParentForm;

    return topMostForm;
  }

  /// <summary>
  ///   return the topmost mgform of the subform
  /// </summary>

  /// <returns></returns>
  getTopMostFrameFormForMenuRefresh(): MgFormBase {
    return this.getTopMostFrameForm();
  }

  /// <summary>
  ///   return the topmost frame form for menu refresh.
  /// </summary>

  /// <returns></returns>
  getTopMostFrameForm(): MgFormBase {
    let topMostForm: MgFormBase = this;

    while (topMostForm !== null && !topMostForm.IsMDIOrSDIFrame)
      topMostForm = ((topMostForm.ParentForm !== null) ? topMostForm.ParentForm : null);

    return topMostForm;
  }

  /// <summary>
  ///   return the topmost mgform of the subform
  /// </summary>

  /// </returns>
  getSubFormCtrl(): MgControlBase {
    return this._subFormCtrl;
  }

  /// <returns> the subFormCtrl

  /// <returns></returns>
  getMapObject(): any {
    // TODO
    // return _subFormCtrl  ?? (Object)this
    return this._subFormCtrl || this;
  }

  /// <summary>
  ///   return object that is used for form mapping in control's map
  /// </summary>

  /// <param name = "ctrlIdx">the index of the requested control</param>
  getCtrl(ctrlIdx: number): MgControlBase {
    return this.CtrlTab.getCtrl(ctrlIdx);
  }

  /// <summary>Returns the requested control</summary>

  /// <returns> a reference to the control with the given name or null if does not exist</returns>
  GetCtrl(ctrlName: string): MgControlBase {
    return this.CtrlTab.getCtrl(ctrlName);
  }

  private defaultRouterOutlet: MgControlBase = null;
  get DefaultRouterOutlet(): MgControlBase {
    if (this.defaultRouterOutlet == null) {
      this.defaultRouterOutlet = this.CtrlTab.GetControl((x: MgControlBase ) => {return x.IsDefaultRouterOutlet()});
    }

    return this.defaultRouterOutlet;
  }

  /// <summary>
  ///   Return the control with a given name
  /// </summary>
  /// <param name = "ctrlName">the of the requested control</param>

  /// <returns></returns>
  GetChoiceControlItemList(mgControl: MgControlBase): string {
    Debug.Assert(mgControl.isChoiceControl());

    let items: List<string> = new List();
    let fld: Field = mgControl.getField();
    let storageAttribute: StorageAttribute = fld.getCellsType();

    if (storageAttribute !== StorageAttribute.DATE && storageAttribute !== StorageAttribute.TIME) {
      if (mgControl.isRadio()) {
        for (let i: number = 0; i < fld.GetRadioCtrls().length; i++) {
          let radioControl: MgControlBase = fld.GetRadioCtrls().get_Item(i);
          items.AddRange(radioControl.GetItemsRange());
      }
      }
      else {
        items.AddRange(mgControl.GetItemsRange());
      }
      return MgFormBase.ConvertArrayListToString(items, storageAttribute === StorageAttribute.NUMERIC);
    }

    return NString.Empty;
  }

  /// <summary>
  /// Get the items list of choice controls.
  /// </summary>
  /// <param name="mgControl"></param>

  /// <returns></returns>
  GetChoiceControlDisplayList(mgControl: MgControlBase): string {
    Debug.Assert(mgControl.isChoiceControl());

    let items: List<string> = new List();
    let fld: Field = mgControl.getField();
    let storageAttribute: StorageAttribute = fld.getCellsType();

    if (storageAttribute !== StorageAttribute.DATE && storageAttribute !== StorageAttribute.TIME) {
      if (mgControl.isRadio()) {
        for (let i: number = 0; i < fld.GetRadioCtrls().length; i++) {
          let radioControl: MgControlBase = fld.GetRadioCtrls().get_Item(i);
          items.AddRange(radioControl.GetDisplayRange());
      }
      }
      else {
        items.AddRange(mgControl.GetItemsRange());
      }
      return MgFormBase.ConvertArrayListToString(items, false);
    }

    return NString.Empty;
  }

  /// <summary>
  /// Get the display list of choice controls.
  /// </summary>
  /// <param name="mgControl"></param>

  /// <returns> the frameFormCtrl</returns>
  getFrameFormCtrl(): MgControlBase {
    return this._frameFormCtrl;
  }

  /// <summary>
  /// Returns the comma concatenated string from array list.
  /// </summary>
  /// <param name="items"></param>
  /// <param name="isItemNumType"></param>

  /// <returns></returns>
  getControlColumn(ctrl: MgControlBase): MgControlBase {
    let column: MgControlBase = null;

    if ((ctrl.IsRepeatable || ctrl.IsTableHeaderChild) && this._tableColumns !== null)
      column = this._tableColumns.get_Item(ctrl.getLayer() - 1);

    return column;
  }

  /// <returns> the container control</returns>
  getContainerCtrl(): MgControlBase {
    return this._containerCtrl;
  }

  /// <summary>
  ///   return control's column
  /// </summary>
  /// <param name = "ctrl"></param>

  /// </summary>
  getColumnControls(): List<MgControlBase> {
    let columnControlsList: List<MgControlBase> = null;

    if (this.CtrlTab !== null) {
      for (let i: number = 0; i < this.CtrlTab.getSize(); i = i + 1) {
        let ctrl: MgControlBase = this.CtrlTab.getCtrl(i);
        if (ctrl.Type === MgControlType.CTRL_TYPE_COLUMN) {
          if (columnControlsList === null)
            columnControlsList = new List<MgControlBase>();
          columnControlsList.push(ctrl);
        }
      }
    }
    return columnControlsList;
  }

  /// </summary>
  getTask(): TaskBase {
    return this._task;
  }

  /// <summary>
  ///   get all column on the form

  /// <returns>Help index</returns>
  getHelpIndex(): number {
    let hlpIndex: number = -1;
    let prop: Property;

    if (this._propTab !== null) {
      prop = this._propTab.getPropById(PropInterface.PROP_TYPE_HELP_SCR);
      if (prop !== null)
          hlpIndex = NNumber.Parse(prop.getValue());
    }
    return hlpIndex;
  }

  /// <summary>
  ///   return the task of the form

  /// <param name = "rect"></param>
  uom2pixRect(rect: MgRectangle): MgRectangle {
    return new MgRectangle(this.uom2pix(<number>rect.x, true), this.uom2pix(<number>rect.y, false),
      this.uom2pix(<number>rect.width, true), this.uom2pix(<number>rect.height, false));
  }

  /// <summary> /// This function returns the index of the help object attached to the form/// </summary>

  /// <returns> the uomVal converted to pixels</returns>
  uom2pix(uomVal: number, isXaxis: boolean): number {
    let result: number = 0;

    // calculate the result of the conversion from uom to pixels
    if (uomVal > 0) {
      let factor: number = this.prepareUOMConversion(isXaxis);
      result = <number>(<number>(<number>uomVal * factor) + 0.5);
    }
    return result;
  }

  /// <summary>
  ///   translate uom Rectangle to pixels
  /// </summary>

  /// <returns></returns>
  uom2pixWithDoubleVal(uomVal: number, isXaxis: boolean): number {
    let result: number = 0.0;

    // calculate the result of the conversion from uom to pixels
    if (uomVal !== 0.0)
      result = uomVal * <number>this.prepareUOMConversion(isXaxis);

    return result;
  }

  /// <summary>
  ///   convert size from uom 2 pixels and from pixels to uom
  /// </summary>
  /// <param name = "isXaxis:">if true then the result relates to the X-axis, otherwise, it relates to the Y-axis</param>

  /// <returns> the uomVal converted to pixels</returns>
  pix2uom(pixVal: number, isXaxis: boolean): number {
    let result: number = 0;

    // calculate the result of the conversion from pixels to uom
    if (pixVal > 0) {
      let factor: number = this.prepareUOMConversion(isXaxis);
      factor = <number>pixVal / factor;
      result = <number>(<number>factor + ((factor > 0) ? 0.5 : -0.5));
    }
    return result;
  }

  /// <summary>
  ///   converts from uom to pixels
  /// </summary>
  /// <param name = "uomVal">the measurement size in uom terms</param>
  /// <param name = "isXaxis">if true then the result relates to the X-axis, otherwise, it relates to the Y-axis</param>

  /// <returns></returns>
  pix2uomWithDoubleVal(pixVal: number, isXaxis: boolean): number {
    let result: number = 0.0;

    // calculate the result of the conversion from pixels to uom
    if (pixVal !== 0.0)
      result = pixVal / <number>this.prepareUOMConversion(isXaxis);

    return result;
  }

  /// <summary>
  ///   converts from pixels to uom
  /// </summary>
  /// <param name = "pixVal">the measurement size in pixels terms</param>
  /// <param name = "isXaxis">if true then the result relates to the X-axis, otherwise, it relates to the Y-axis</param>

  /// <returns> get all ctrls of 'type'</returns>
  getCtrls(type: MgControlType): List<MgControlBase> {
    let curr: MgControlBase = null;
    let ctrls: List<MgControlBase> = new List<MgControlBase>();

    for (let i: number = 0; i < this.CtrlTab.getSize(); i = i + 1) {
      curr = this.CtrlTab.getCtrl(i);
      if (curr.Type === type)
        ctrls.push(curr);
    }
    return ctrls;
  }

  /// <summary>
  ///  converts from double pixels to uom
  /// </summary>
  /// <param name="pixVal"></param>
  /// <param name="isXaxis"></param>

  /// <returns></returns>
  getTableCtrl(): MgControlBase {
    return this._tableMgControl;
  }

  /// <summary>
  ///   after open the form need to move it according to the startup position property on the form
  ///   PROP_TYPE_STARTUP_POSITION

  /// <returns></returns>
  getMainControl(): MgControlBase {
    return this._tableMgControl;
  }

  /// <returns> a reference to the control with the given name or null if does not exist</returns>
  getCtrlByName(ctrlName: string, ctrlType: MgControlType): MgControlBase {
    return this.CtrlTab.getCtrlByName(ctrlName, ctrlType);
  }

  /// <returns></returns>
  getContextMenuNumber(): number {
    let contextMenu: number = (this.GetComputedProperty(PropInterface.PROP_TYPE_CONTEXT_MENU) !== null) ?
      this.GetComputedProperty(PropInterface.PROP_TYPE_CONTEXT_MENU).GetComputedValueInteger() : 0;

    if (contextMenu === 0) {
      if (this.isSubForm()) {
        if (this.ParentForm !== null)
          contextMenu = this.ParentForm.getContextMenuNumber();
      }
    }

    // if value is zero, we need to use the system menu definition
    if (contextMenu === 0)
      contextMenu = this.getSystemContextMenu();

    return contextMenu;
  }

  /// <returns>matching menu index</returns>
  getSystemContextMenu(): number {
    let mainProg: TaskBase = <TaskBase>Manager.MGDataTable.GetMainProgByCtlIdx(this.getTask().ContextID, this.getTask().getCtlIdx());
    return mainProg.getSystemContextMenu();
  }

  /// <summary>
  ///   return Point ,center to the giving relativeRect

  /// <param name = "idx"></param>
  checkAndCreateRow(idx: number): void {
    if (this._tableMgControl !== null && !this.isRowCreated(idx))
      this.createRow(idx);
  }

  /// <summary>
  ///   Calculate Center point.
  ///   All co-ordinates will be converted to screen co-ordinates and then
  ///   they will be converted to client co-ordinates according to their parent.

  /// <param name = "idx"></param>
  validateRow(idx: number): void {
    if (this._tableMgControl !== null) {
      let row: Row = this.Rows.get_Item(idx);
      if (!row.Validated) {
        Commands.addAsync(CommandType.VALIDATE_TABLE_ROW, this._tableMgControl, 0, idx);
        row.Validated = true;
      }
    }
  }

  /// <param name="idx"></param>
  IsValidRow(idx: number): boolean {
    let validRow: boolean = false;

    if (this._tableMgControl !== null && idx >= 0 && idx < this.Rows.length) {
      let row: Row = this.Rows.get_Item(idx);
      validRow = (row !== null && row.Validated);
    }
    return validRow;
  }

  /// <summary>
  ///   get table control
  /// </summary>

  /// </summary>
  refreshRow(rowIdx: number, repeatableOnly: boolean): void {
    if (this.hasTable()) {
      this.checkAndCreateRow(rowIdx);
      this.DisplayLine = rowIdx;
    }
    this.refreshControls(repeatableOnly);
  }

  /// <summary>
  ///   return tree or table control of the form
  /// </summary>

  /// </summary>
  refreshProps(): void {
    if (this._firstRefreshOfProps) {
      this.getProp(PropInterface.PROP_TYPE_TITLE_BAR);
      this.getProp(PropInterface.PROP_TYPE_SYSTEM_MENU);
      this.getProp(PropInterface.PROP_TYPE_MINBOX);
      this.getProp(PropInterface.PROP_TYPE_MAXBOX);
      this.getProp(PropInterface.PROP_TYPE_BORDER_STYLE);

      if (this.isSubForm())
        this.getProp(PropInterface.PROP_TYPE_WALLPAPER);
    }
    this._propTab.RefreshDisplay(false, false);

    if (this._firstRefreshOfProps)
      this._firstRefreshOfProps = false;
  }

  /// <summary>
  ///   Return the control (which is not the frame form) with a given name
  /// </summary>
  /// <param name = "ctrlName">the of the requested control</param>
  /// <param name="ctrlType"></param>

  /// <param name = "repeatableOnly">should be true in order to refresh only the controls that belong to a table</param>
  refreshControls(repeatableOnly: boolean): void {
    let ctrl: MgControlBase;
    // record does not exist
    if (this.DisplayLine === Int32.MinValue && !this.IsMDIFrame)
      return;

    // refresh the table first
    if (this._tableMgControl !== null && !repeatableOnly)
      this._tableMgControl.RefreshDisplay();

    // refresh all COLUMNS (refresh for each control base on the refresh of the column (e.g:column width)
    // so we must refresh the column first
    if (this._tableColumns !== null && !repeatableOnly) {
      for (let i: number = 0; i < this._tableColumns.length; i = i + 1) {
        let mgControlBase: MgControlBase = this._tableColumns.get_Item(i);
        mgControlBase.RefreshDisplay();
      }
    }

    this.checkAndCreateRow(this.DisplayLine);

    // QCR #709563 Must refresh frameset's subfroms before we refresh frameset itself.
    // During refresh of the frameset nested subforms with RefreshWhenHidden might be brought to server
    // but their subform's controls have not been set with correct bounds. This causes illegal placement
    // and incorrect final location of controls on nested subforms
    let frameSets: Stack<MgControlBase> = new Stack<MgControlBase>();
    let tabAndGroupControls: Stack<MgControlBase> = new Stack<MgControlBase>();

    for (let i: number = 0; i < this.CtrlTab.getSize(); i = i + 1) {
      ctrl = this.CtrlTab.getCtrl(i);
      if ((ctrl.isTabControl() || ctrl.isGroup()) && !repeatableOnly) {
        tabAndGroupControls.push(ctrl);
        Commands.addAsync(CommandType.SUSPEND_LAYOUT, ctrl);
      }
      if (ctrl.Type === MgControlType.CTRL_TYPE_FRAME_SET) {
        frameSets.push(ctrl);
        continue;
      }

      if (ctrl.Type !== MgControlType.CTRL_TYPE_TABLE && ctrl.Type !== MgControlType.CTRL_TYPE_COLUMN) {
        if (ctrl.IsRepeatable || !repeatableOnly)
          ctrl.RefreshDisplay();
      }
      else if (ctrl.Type === MgControlType.CTRL_TYPE_TABLE && repeatableOnly)
        ctrl.RefreshDisplay(repeatableOnly);
    }
    while (frameSets.count() > 0)
      frameSets.pop().RefreshDisplay();

    while (tabAndGroupControls.count() > 0)
      Commands.addAsync(CommandType.RESUME_LAYOUT, tabAndGroupControls.pop());

    this.validateRow(this.DisplayLine);

    if (!this.FormRefreshedOnceAfterFetchingDataView && this._tableMgControl !== null && this._task.DataViewWasRetrieved) {
      this.FormRefreshedOnceAfterFetchingDataView = true;
      Commands.addAsync(CommandType.SET_SHOULD_APPLY_PLACEMENT_TO_HIDDEN_COLUMNS, this._tableMgControl);
    }
  }

  /// <summary>
  ///   This method returns the context menu number of the form.
  ///   In case the form does not have a context menu defined, the system context menu is returned
  /// </summary>

  /// <param name = "idx"></param>
  markRowNOTCreated(idx: number): void {
    Commands.addWithNumber(CommandType.UNDO_CREATE_TABLE_ROW, this._tableMgControl,  idx);

    if (this.Rows.length <= idx || idx < 0)
      this.Rows.set_Item(idx, new Row(false, false));
  }

  /// <summary>
  ///   return the application-level context menu index
  /// </summary>

  SelectRow(): void;

  /// <summary>
  ///   if row is not created yet creates row
  /// </summary>

  SelectRow(sendAlways: boolean): void;

  /// <summary>
  ///   marks row created
  /// </summary>

  SelectRow(rowIdx: number, sendAlways: boolean): void;

  /// <summary>
  ///   validate row
  /// </summary>

  SelectRow(sendAlwaysOrRowIdx?: any, sendAlways?: boolean): void {
    if (arguments.length === 0)
      this.SelectRow_0();

    else if (arguments.length === 1)
      this.SelectRow_1(sendAlwaysOrRowIdx);

    else
      this.SelectRow_2(sendAlwaysOrRowIdx, sendAlways);
  }

  /// <summary>(public)
  /// check if specified row is valid row in page
  /// </summary>

  /// <param name="isMarked">mark/unmark</param>
  MarkRow(rowIdx: number, isMarked: boolean): void {
    Commands.addAsync(CommandType.SET_MARKED_ITEM_STATE, this.getTableCtrl(), rowIdx, isMarked);
  }

  /// <summary>
  ///   refresh the form properties

  /// <returns></returns>
  getToolbarGroupCount(groupNumber: number): number {
    let toolbarInfo: ToolbarInfo = this.getToolBarInfoByGroupNumber(groupNumber, false);
    return (toolbarInfo !== null) ? toolbarInfo.getCount() : 0;
  }

  /// <summary>
  ///   refresh the controls of the current row
  /// </summary>

  /// <returns> int is the table size</returns>
  getRowsInPage(): number {
    return this._rowsInPage;
  }

  /// <summary>
  ///   returns true if Row is created on GUI level
  /// </summary>
  /// <param name = "idx"></param>

  /// <param name = "size">the table size</param>
  setRowsInPage(size: number): void {
    this._rowsInPage = size;
  }

  /// <summary>
  ///   marks this row as not created
  /// </summary>

  /// <returns></returns>
  getColumnsCount(): number {
    let columnsCount: number = 0;

    if (this.CtrlTab !== null) {
      for (let i: number = 0; i < this.CtrlTab.getSize(); i = i + 1) {
        let control: MgControlBase = this.CtrlTab.getCtrl(i);
        if (control.Type === MgControlType.CTRL_TYPE_COLUMN)
          columnsCount = columnsCount + 1;
      }
    }

    return columnsCount;
  }

  /// </summary>
  toolbarGroupsCountClear(): void {
    this._toolbarGroupsCount.Clear();
  }

  /// <param name = "count">the new count of tool on the group</param>
  setToolbarGroupCount(groupNumber: number, count: number): void {
    let toolBarInfoByGroupNumber: ToolbarInfo = this.getToolBarInfoByGroupNumber(groupNumber, true);
    toolBarInfoByGroupNumber.setCount(count);
  }

  /// </summary>
  inRefreshDisplay(): boolean {
    return this._inRefreshDisp;
  }

  /// <summary>
  ///   Mark a row as selected row
  /// </summary>
  /// <param name = "rowIdx">row to select</param>

  /// </summary>
  executeLayout(): void {
    Commands.addAsync(CommandType.EXECUTE_LAYOUT, this, true);
  }

  /// <summary>
  /// Mark/unmark row for multi marking
  /// </summary>
  /// <param name="rowIdx">indentifers the row</param>

  /// <param name="removeSeperat"></param>
  removeToolFromGroupCount(groupNumber: number, removeSeperat: boolean): void {
    if (this.getToolbarGroupCount(groupNumber) > 0) {
      let num: number = Math.max(this.getToolbarGroupCount(groupNumber) - 1, 0);
      this.setToolbarGroupCount(groupNumber, num);

      if (removeSeperat && num <= 1) {
        // when the group is empty(has only separator) need to remove the separator from the prev group
        // Only when it is the last group and not in the middle
        let prevGroup: number = this.getPrevGroup(groupNumber);

        // QCR#712355:Menu separator was not displayed properly as groupNumber was passed to
        // needToRemoveSeperatorFromPrevGroup() insteade of prevGroup.

        let removeSeperatorFromPrevGroup: boolean = this.needToRemoveSeperatorFromPrevGroup(prevGroup);
        if (removeSeperatorFromPrevGroup)
          this.removeSepFromGroup(prevGroup);
        else {
          let removeSeperatorFromCurrGroup: boolean = this.needToRemoveSeperatorFromCurrGroup(groupNumber);
          if (removeSeperatorFromCurrGroup)
            this.removeSepFromGroup(groupNumber);
        }
      }
      else {
        // if there is not longer any tool on the toolbar need to delete the toolbar
        // FYI: just hide the toolbar to actually deleted (it remove from the control map)
        if (this.getToolItemCount() === 0) {
          let mgMenu: MgMenu = <MgMenu>this._instatiatedMenus.get_Item(MenuStyle.MENU_STYLE_PULLDOWN);
          if (mgMenu !== null)
            mgMenu.deleteToolBar(this);
        }
      }
    }
    else {
      Debug.Assert(false);
    }
  }

  /// <summary>
  ///   true if this is mdi child with startup position centered to client
  /// </summary>

  /// <param name = "menuEntrySep">the new menuEntrySep of tool on the group</param>
  setToolbarGroupMenuEntrySep(groupNumber: number, menuEntrySep: MenuEntry): void {
    let toolBarInfoByGroupNumber: ToolbarInfo = this.getToolBarInfoByGroupNumber(groupNumber, true);
    toolBarInfoByGroupNumber.setMenuEntrySeperator(menuEntrySep);
  }

  /// <summary>
  ///   This method returns the number of tools for the passed tool group
  /// </summary>
  /// <param name = "groupNumber">number of the tool group (0-based)</param>

  /// <returns></returns>
  itIsLastGroupInToolbar(groupNumber: number): boolean {
    // get the ToolbarInfo of the last group count
    let toolbarInfoLastGroup: ToolbarInfo = this.getLastGroup();

    // get the ToolbarInfo of the groupNumber
    let toolBarInfoByGroupNumber: ToolbarInfo = this.getToolBarInfoByGroupNumber(groupNumber, false);

    return toolbarInfoLastGroup === toolBarInfoByGroupNumber;
  }

  /// <summary>
  ///   return the toolbar info for group number, if not exist create it
  /// </summary>
  /// <param name = "groupNumber"></param>
  /// <param name = "createIfNotExist">TODO</param>

  /// <param name = "groupNumber">number of the tool group (0-based)</param>
  getToolbarGroupMenuEntrySep(groupNumber: number): MenuEntry {
    let toolBarInfoByGroupNumber: ToolbarInfo = this.getToolBarInfoByGroupNumber(groupNumber, false);
    return (toolBarInfoByGroupNumber !== null) ? toolBarInfoByGroupNumber.getMenuEntrySeperator() : null;
  }

  /// <summary>
  /// get the rows in a page in table
  /// </summary>

  /// <returns></returns>
  getGroupCount(): number {
    let groupCount: number = 0;
    let toolbarGroupsEnumerator: Array_Enumerator<number> = this._toolbarGroupsCount.Keys;
    while (toolbarGroupsEnumerator.MoveNext()) {
      let obj: any = toolbarGroupsEnumerator.Current;
      let toolbarInfo: ToolbarInfo = this._toolbarGroupsCount.get_Item(obj);
      let flag: boolean = toolbarInfo !== null && toolbarInfo.getCount() > 0;
      if (flag) {
        groupCount = groupCount + 1;
      }
    }
    return groupCount;
  }

  /// <summary>
  /// set the rows in a page in table
  /// </summary>

  /// </summary>
  fixTableLocation(): void {
    if (this.HasTable()) {
      let parent: MgControlBase = ((this._tableMgControl.getParent() instanceof MgControlBase) ? <MgControlBase>this._tableMgControl.getParent() : null);

      if (parent !== null && parent.isTabControl()) {
        (this._tableMgControl.getProp(PropInterface.PROP_TYPE_TOP)).RefreshDisplay(true);
        (this._tableMgControl.getProp(PropInterface.PROP_TYPE_LEFT)).RefreshDisplay(true);
      }
    }
  }

  /// <summary>
  ///   gets number of columns in the table
  /// </summary>

  /// </summary>
  SetActiveHighlightRowState(state: boolean): void {
    if (this.SupportActiveRowHightlightState)
      Commands.addAsync(CommandType.PROP_SET_ACTIVE_ROW_HIGHLIGHT_STATE, this._tableMgControl, state);
  }

  /// <summary>
  ///   clear

  /// </summary>
  createPlacementLayout(): void {
    if (this.IsMDIFrame && this.GetControlsCountExcludingStatusBar() === 0)
      return;

    // get coordinates that were defined on the form originally,
    // i.e. before expression executed

    let rect: MgRectangle = Property.getOrgRect(this);
    if (this._subFormCtrl === null)
      Commands.addAsync(CommandType.CREATE_PLACEMENT_LAYOUT, this, 0, rect.x, rect.y, rect.width, rect.height, false, false);
    else {
      // For frame set form we have fill layout
      if (!this.IsFrameSet) {
        // FOR NOW, WEBCLIENT DOES NOT SUPPORT THE AUTOFIT PROPERTY
        //let autoFit: AutoFit = <AutoFit> (this._subFormCtrl.getProp(PropInterface.PROP_TYPE_AUTO_FIT)).getValueInt();
        //if (autoFit === AutoFit.None)
        // if we replace subform with AUTO_FIT_NONE we do placement relatively to subform size
        // if regular case it will just prevent placement
        //  rect = this._subFormCtrl.getRect();

        //Commands.addAsync(CommandType.CREATE_PLACEMENT_LAYOUT, this._subFormCtrl, 0, rect.x, rect.y, rect.width, rect.height, false, false);
      }
    }
  }

  /// <summary>
  ///   This method adds a tools count for the passed tool group
  /// </summary>
  /// <param name = "groupNumber">number of the tool group (0-based)</param>

  /// <returns></returns>
  getToolItemCount(): number {
    let num: number = 0;
    let toolbarGroupsEnumerator: Array_Enumerator<number> = this._toolbarGroupsCount.Keys;
    while (toolbarGroupsEnumerator.MoveNext()) {
      let obj: any = toolbarGroupsEnumerator.Current;
      let toolbarInfo: ToolbarInfo = this._toolbarGroupsCount.get_Item(obj);
      num = num + ((toolbarInfo !== null) ? toolbarInfo.getCount() : 0);
    }
    return num;
  }

  /// <summary>
  ///   returns the value of the "in refresh display" flag

  getControlIdx(ctrl: MgControlBase): number {
    return this.CtrlTab.getControlIdx(ctrl, true);
  }

  /// <summary>
  ///   Add an MgMenu object to the list of the form's menus.
  ///   A form can have an MgMenu which is assigned to it directly (since the menu is set as the form's
  ///   pulldown menu, for example). It also has the context menus of its children - a context menu of
  ///   a control is created under the form and saved in the form's list, and then assigned to the control
  ///   (this to allow re-usability of menus which appear more than once).
  /// </summary>
  /// <param name = "mgMenu">menu to be added to the list</param>
  addMgMenuToList(mgMenu: MgMenu, menuStyle: MenuStyle): void {
    this._instatiatedMenus.set_Item(menuStyle, mgMenu);
  }

  /// <summary>
  ///   create separator on a group
  /// </summary>
  createSepOnGroup(mgMenu: MgMenu, groupNumber: number): void {
    let menuEntry: MenuEntry = new MenuEntry(GuiMenuEntry_MenuType.SEPARATOR, mgMenu);
    menuEntry.setVisible(true, true, true, null, null);
    this.setToolbarGroupMenuEntrySep(groupNumber, menuEntry);
    menuEntry.ImageGroup = groupNumber;
    // create the matching tool
    menuEntry.createMenuEntryTool(this, false);
  }

  /// <summary>
  ///   This method creates a new tool group for the passed group index, and places a separator in its end.
  ///   returns true if the tool group was created now, false if it already existed.
  /// </summary>
  /// <param name = "toolGroup"></param>
  createToolGroup(mgMenu: MgMenu, toolGroup: number): boolean {
    let needToCreateAtTheEnd: boolean = false;
    let toolbarInfo: ToolbarInfo = this.getToolBarInfoByGroupNumber(toolGroup, false);

    if (toolbarInfo === null || toolbarInfo.getCount() === 0) {
      // add the new toolGroup to the hashmap
      // toolbarGroupsCount.put(toolGroup, 0);
      this.setToolbarGroupCount(toolGroup, 0);

      // create a separator for the previous group
      let prevGroup: number = this.getPrevGroup(toolGroup);

      if (prevGroup >= 0) {
        // when there is already sep on the prev group, create the setp on the current group
        if (this.getToolbarGroupMenuEntrySep(prevGroup) !== null)
          needToCreateAtTheEnd = true;
        else
          this.createSepOnGroup(mgMenu, prevGroup);
      }
      else if (this.getToolbarGroupMenuEntrySep(toolGroup) === null)
        needToCreateAtTheEnd = true;
    }

    return needToCreateAtTheEnd;
  }

  /// <summary>
  /// </summary>

  /// </summary>
  refreshContextMenuForControls(): void {
    let ctrl: MgControlBase = null;
    let prop: Property = null;

    for (let i: number = 0; i < this.CtrlTab.getSize(); i = i + 1) {
      ctrl = this.CtrlTab.getCtrl(i);
      prop = ctrl.getProp(PropInterface.PROP_TYPE_CONTEXT_MENU);
      if (prop !== null)
        prop.RefreshDisplay(true);
    }
  }

  /// <summary>
  ///   Execute the layout and all its children

  /// </summary>
  getTopIndexFromGUI(): number {
    let topDisplayLine: number = 0;
    if (this.hasTable())
      topDisplayLine = Commands.getTopIndex(this.getMainControl());
    return topDisplayLine;
  }

  /// <summary>
  ///   decrease one from the count on the groupNumber
  /// </summary>
  /// <param name="groupNumber"></param>

  /// <param name = "inheritingControl"></param>
  addControlToInheritingContextControls(inheritingControl: MgControlBase): void {
    if (!this._controlsInheritingContext.Contains(inheritingControl))
      this._controlsInheritingContext.push(inheritingControl);
  }

  /// <param name = "currentGroup">
  /// </param>

  /// <returns> column width in pixels</returns>
  computeColumnWidth(layer: number): number {
    let width: number = 0;
    let currentWidth: number = 0;
    for (let i: number = 0; i < layer; i = i + 1) {
      let columnCtrl: MgControlBase = this._tableColumns.get_Item(i);
      let colWidth: number = (columnCtrl.getProp(PropInterface.PROP_TYPE_WIDTH)).getValueInt();
      width = width + colWidth;
      if (columnCtrl.getLayer() === layer)
        currentWidth = colWidth;
    }
    let tableLeft: number = (this._tableMgControl.getProp(PropInterface.PROP_TYPE_LEFT)).getValueInt();
    return this.uom2pix(<number>(tableLeft + width), true) - this.uom2pix(<number>(tableLeft + width - currentWidth), true);
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="groupNumber"></param>

  /// <returns></returns>
  getHorizontalFactor(): number {
    if (this._horizontalFactor === -1)
      this._horizontalFactor = this.GetComputedProperty(PropInterface.PROP_TYPE_HOR_FAC).GetComputedValueInteger();

    return this._horizontalFactor;
  }

  /// <summary>
  ///   This method adds a menuEntry for seperator
  /// </summary>
  /// <param name = "groupNumber">number of the tool group (0-based)</param>

  /// <returns></returns>
  getPulldownMenuNumber(): number {
    return (this.GetComputedProperty(PropInterface.PROP_TYPE_PULLDOWN_MENU) !== null) ?
      this.GetComputedProperty(PropInterface.PROP_TYPE_PULLDOWN_MENU).GetComputedValueInteger() : 0;
  }

  /// <summary>
  ///   check if the sep need to be remove from the current group
  /// </summary>
  /// <param name = "currentGroup"></param>

  /// <returns></returns>
  setPulldownMenuNumber(idx: number, refresh: boolean): void {
    let num: NUM_TYPE = new NUM_TYPE();

    num.NUM_4_LONG(idx);
    let numString: string = num.toXMLrecord();

    this.setProp(PropInterface.PROP_TYPE_PULLDOWN_MENU, numString);

    if (refresh) {
      (this.getProp(PropInterface.PROP_TYPE_PULLDOWN_MENU)).RefreshDisplayWithCurrLineAndCheckSkipRefresh(true, Int32.MinValue, false);
      if (idx === 0)
        this.toolbarGroupsCountClear();
    }
  }

  /// <summary>
  ///   return TRUE if this group is the last group in the toolbar
  /// </summary>
  /// <param name = "groupNumber"></param>

  /// <returns> table items count</returns>
  getTableItemsCount(): number {
    return this._tableItemsCount;
  }

  /// <summary>
  ///   return the toolbar info for group number, if not exist create it
  /// </summary>

  /// <returns></returns>
  getVerticalFactor(): number {
    if (this._verticalFactor === -1)
      this._verticalFactor = this.GetComputedProperty(PropInterface.PROP_TYPE_VER_FAC).GetComputedValueInteger();

    return this._verticalFactor;
  }

  /// <summary>
  ///   This method get a menuEntry for separator
  /// </summary>

  /// <param name = "propVal"></param>
  refreshContextMenuOnLinkedControls(propVal: number): void {
    let num: NUM_TYPE = new NUM_TYPE();

    if (this._controlsInheritingContext !== null && this._controlsInheritingContext.length > 0) {
      num.NUM_4_LONG(propVal);
      let numString: string = num.toXMLrecord();
      let mgControlBase: MgControlBase = null;
      for (let i: number = 0; i < this._controlsInheritingContext.length; i = i + 1) {
        mgControlBase = this._controlsInheritingContext.get_Item(i);
        mgControlBase.setProp(PropInterface.PROP_TYPE_CONTEXT_MENU, numString);
        (mgControlBase.getProp(PropInterface.PROP_TYPE_CONTEXT_MENU)).RefreshDisplay(true);
      }
    }
  }

  /// <summary>
  ///   return the number of the group
  /// </summary>

  /// <param name = "inheritingControl"></param>
  removeControlFromInheritingContextControls(inheritingControl: MgControlBase): void {
    if (this._controlsInheritingContext !== null && this._controlsInheritingContext.Contains(inheritingControl))
      this._controlsInheritingContext.Remove(inheritingControl);
  }

  /// <summary>
  /// Table control is always first on the form
  /// When table is a child of tab, it is created before tab's layers(TabPages) are created.
  /// Computing Tab's children coordinates depends on the TabPages being created
  /// So, we must fix table's location after Tab is created
  /// QCR #289966

  /// </summary>
  removeRefsToCtrls(): void {
    for (let i: number = 0; i < this.CtrlTab.getSize(); i = i + 1) {
      this.CtrlTab.getCtrl(i).removeRefFromField();
    }
  }

  /// <summary>
  /// this form may have ActiveRowHightlightState

  /// </summary>
  buildTableChildren(): void {
    if (this._tableChildren === null) {
      this._tableChildren = new List<MgControlBase>();

      if (this.CtrlTab !== null) {
        let minTabOrder: number = 2147483647;
        let automaticTabbingOrder: boolean = this.isAutomaticTabbingOrder();

        for (let i: number = 0; i < this.CtrlTab.getSize(); i = i + 1) {
          let ctrl: MgControlBase = this.CtrlTab.getCtrl(i);

          if (ctrl.IsRepeatable || ctrl.IsTableHeaderChild) {
            this._tableChildren.push(ctrl);

            if (automaticTabbingOrder) {
              let prop: Property = ctrl.GetComputedProperty(PropInterface.PROP_TYPE_TAB_ORDER);

              if (prop !== null) {
                let valueInt: number = prop.GetComputedValueInteger();
                if (valueInt < minTabOrder)
                  minTabOrder = valueInt;
              }
            }
          }
        }

        if (minTabOrder !== Int32.MaxValue && automaticTabbingOrder) {
          this._firstTableTabOrder = minTabOrder;
        }
      }
    }
  }

  /// <summary>
  ///   create placement layout on the form

  /// <returns></returns>
  public getGuiTableChildren(): List<GuiMgControl> {
    if (this._guiTableChildren == null) {
      this._guiTableChildren = new List<GuiMgControl>();

      for (let i: number = 0; i < this.TableChildren.length; i = i + 1) {
        let ctrl: MgControlBase = this.TableChildren.get_Item(i);
        this._guiTableChildren.push(ctrl);
      }
    }
    return this._guiTableChildren;
  }

  /// <summary>
  ///   return the prev group index if exist
  /// </summary>
  /// <param name = "currGroup"></param>

  /// <param name = "tableCtrl">the tableCtrl to set</param>
  setTableCtrl(tableCtrl: MgControlBase): void {
    this._tableMgControl = tableCtrl;
  }

  /// <summary>
  ///   return the count of the tool item on the toolbar (not include the separators for the groups)
  /// </summary>

  /// <param name = "value">the subFormCtrl to set</param>
  setFrameFormCtrl(value: MgControlBase): void {
    Debug.Assert(this._frameFormCtrl === null && value !== null);
    this._frameFormCtrl = value;
  }

  /// <summary>
  ///   This method puts the system menus on the form, in case the form does not have the
  ///   menus properties (pulldown \ context) defined.

  /// <param name = "value">control to set</param>
  setContainerCtrl(value: MgControlBase): void {
    Debug.Assert(this._containerCtrl === null && value !== null);
    this._containerCtrl = value;
  }

  /// <summary>
  ///   sets the property
  /// </summary>
  /// <param name = "propId"></param>

  getCtrlCount(): number {
    return this.CtrlTab.getSize();
  }

  /// <returns></returns>
  GetControlsCountExcludingStatusBar(): number {
    return this.CtrlTab.getSize();
  }

  /// <summary>
  ///   Add an MgMenu object to the list of the form's menus.
  ///   A form can have an MgMenu which is assigned to it directly (since the menu is set as the form's
  ///   pulldown menu, for example). It also has the context menus of its children - a context menu of
  ///   a control is created under the form and saved in the form's list, and then assigned to the control
  ///   (this to allow re-usability of menus which appear more than once).
  /// </summary>

  /// </summary>
  refreshPropsOnExpression(): void {
    let i: number;
    let size: number = (this._propTab == null ? 0 : this._propTab.getSize());
    let prop: Property;
    let refresh: boolean = false;
    for (i = 0; i < size && !refresh; i++) {
      prop = this._propTab.getProp(i);
      if (prop.isExpression()) {
        refresh = true;
        this.refreshProps();
      }
    }
  }

  /// <summary>
  ///   create separator on a group

  /// <param name="refreshControl"> indicates whether to refresh the control or not. </param>
  setDCValIdOnControl(ditIdx: number, dcValId: number, refreshControl: boolean): void {
    let ctrl: MgControlBase = this.getCtrl(ditIdx);
    ctrl.setDcValId(dcValId);
    if (refreshControl) {
      ctrl.RefreshDisplay(false);
    }
  }

  /// <summary>
  ///   Loop on all form's controls and refresh the contex menu.

  /// <returns></returns>
  getMenuEntrybyAccessKey(kbItm: KeyboardItem, menuStyle: MenuStyle): MenuEntry {
    let menuEntry: MenuEntry = null;
    let mgMenu = <MgMenu>this._instatiatedMenus.get_Item(menuStyle);
    if (mgMenu != null) {
      let menuEntries: List<MenuEntry> = mgMenu.getMenuEntriesWithAccessKey(kbItm);
      if (menuEntries != null && menuEntries.length > 0)
        for (let i: number = 0; i < menuEntries.length; i++) {
          let currMenuEntry: MenuEntry = menuEntries.get_Item(i);
          if (currMenuEntry.getEnabled()) {
            menuEntry = currMenuEntry;
            break;
          }
        }
    }
    return menuEntry;
  }

  /// <summary>
  ///   compute column width
  ///   needed to work like in online in uom2pix calculations
  /// </summary>
  /// <param name = "layer">columns layer</param>

  /// </summary>
  CloseInternalHelp(): void {
    // Closing the internal help window.
    if (this._internalHelpWindow !== null) {
      Commands.addAsync(CommandType.CLOSE_FORM, this._internalHelpWindow);
      Commands.beginInvoke();
      this._internalHelpWindow = null;
    }
  }

  /// <summary>
  ///   get horizontal factor
  /// </summary>

  /// <summary> Suspend form layout </summary>
  SuspendLayout(): void {
    Commands.addAsync(CommandType.SUSPEND_LAYOUT, this.getTopMostForm());
  }

  /// <summary>
  ///   This method returns the pulldown menu number of the form.
  ///   In case the form does not have a pulldown menu defined, the system pulldown menu is returned
  /// </summary>

  /// <summary> Resume form layout </summary>
  ResumeLayout(): void {
    Commands.addAsync(CommandType.RESUME_LAYOUT, this.getTopMostForm());
  }

  /// <summary>
  ///   This method returns the pulldown menu number of the form.
  ///   In case the form does not have a pulldown menu defined, the system pulldown menu is returned
  /// </summary>

  /// <returns></returns>
  getTabControl(ctrl: MgControlBase): MgControlBase {
    let obj: Object;
    let result: MgControlBase = null;

    obj = ctrl;
    while (obj instanceof MgControlBase) {
      let currCtrl = <MgControlBase>obj;
      if (currCtrl.isTabControl()) {
        result = currCtrl;
        break;
      }
      obj = currCtrl.getParent();
    }

    // if ctrl is not tab and not tab's child - find first tab in the form
    if (result == null) {
      for (let i: number = 0; i < this.CtrlTab.getSize(); i++) {
        obj = this.CtrlTab.getCtrl(i);
        if ((<MgControlBase>obj).isTabControl()) {
          result = <MgControlBase>obj;
          break;
        }
      }
    }
    return result;
  }

  /// <summary>
  /// </summary>

  /// <returns> if there is browser control on the form</returns>
  hasBrowserControl(): boolean {
    let hasBrowserCtrl: boolean = false;
    let ctrl: MgControlBase;
    for (let i: number = 0; i < this.CtrlTab.getSize() && !hasBrowserCtrl; i++) {
      ctrl = this.CtrlTab.getCtrl(i);
      if (ctrl.isBrowserControl())
        hasBrowserCtrl = true;
    }

    return hasBrowserCtrl;
  }

  /// <param name="childForm"></param>
  ApplyChildWindowPlacement(childForm: MgFormBase): void {
    if (childForm.IsChildWindow) {
      let orgRectangle: MgRectangle = Property.getOrgRect(this);
      let currentRectangle: MgRectangle = new MgRectangle();
      let parentObj: Object = this;

      if (this.isSubForm())
        parentObj = this.getSubFormCtrl();

      Commands.getClientBounds(parentObj, currentRectangle, true);

      let sizeDifference: MgPoint = currentRectangle.GetSizeDifferenceFrom(orgRectangle);

      if (sizeDifference.x !== 0 || sizeDifference.y !== 0)
        Commands.addAsync(CommandType.APPLY_CHILD_WINDOW_PLACEMENT, childForm, 0, sizeDifference.x, sizeDifference.y);
    }
  }

  /// </summary>
  SetToolBar(): void {
    Debug.Assert(this.IsMDIFrame);
    if (this.ShouldCreateToolbar && this._toolbarGroupsCount.Count > 0) {
      let pullDownMenu: MgMenu = this.getPulldownMenu();
      if (pullDownMenu != null) {
        Commands.addAsync(CommandType.SET_TOOLBAR, this, pullDownMenu.createAndGetToolbar(this));
        Commands.beginInvoke();
      }
    }
  }

  /// <summary>
  ///   remove references to the controls of this form

  IsInputType(ctrl: MgControlBase): boolean {
    switch (ctrl.Type) {
      case MgControlType.CTRL_TYPE_CHECKBOX:
      case MgControlType.CTRL_TYPE_TEXT:
      case MgControlType.CTRL_TYPE_COMBO:
      case MgControlType.CTRL_TYPE_LIST:
      case MgControlType.CTRL_TYPE_RADIO:
        return true;

      default:
        return false;
    }
  }

  /// <summary>
  ///   build list of table children

  public GetListOfInputControls(): any {
    let filterterList = this.CtrlTab.filter(((c, index, array) => this.IsInputType(c)));
    let names = filterterList.reduce((pre, ctrl, i) => {
      pre[ctrl.UniqueName] = ctrl.IsRepeatable ? "1" : "0";
      return pre
    }, {});
    return names;
  }

  /// <summary>
  ///
  /// </summary>

  /// <returns></returns>
  abstract ConstructMgControl(): MgControlBase;

  // getGuiTableChildren(): List<GuiMgControl> {
  //   let flag: boolean = this._guiTableChildren === null;
  //   if (flag) {
  //     this._guiTableChildren = new List<GuiMgControl>();
  //     let tableChildren: List<MgControlBase> = this.TableChildren;
  //     let enumerator: List_Enumerator<MgControlBase> = tableChildren.GetEnumerator();
  //     try {
  //       while (enumerator.MoveNext()) {
  //         let current: MgControlBase = enumerator.Current;
  //         this._guiTableChildren.Add(current);
  //       }
  //     }
  //     finally {
  //       (<IDisposable>enumerator).Dispose();
  //     }
  //   }
  //   return this._guiTableChildren;
  // }

  /// <summary>
  ///   Sets the table control related to this form
  /// </summary>

  /// <returns></returns>
  abstract ConstructMgControl(type: MgControlType, task: TaskBase, parentControl: number): MgControlBase;

  /// <returns>mg control</returns>
  abstract ConstructMgControl(type: MgControlType, parentMgForm: MgFormBase, parentControlIdx: number): MgControlBase;

  abstract ConstructMgControl(type?: MgControlType, taskOrParentMgForm?: any, parentControlOrParentControlIdx?: number): MgControlBase;

  /// </summary>
  buildTabbingOrder(): void {
  }

  /// <summary>
  /// Gets the size of the controls excluding controls related to StatusBar
  /// </summary>

  /// </summary>
  UpdateHiddenControlsList(): void {
  }

  /// <summary>
  ///   Refresh form display if it has a property which is an expression

  /// </summary>
  firstTableRefresh(): void {
    if (this._tableMgControl !== null) {
      this._rowsInPage = Commands.getRowsInPage(this._tableMgControl);
      this.RefreshRepeatableAllowed = true;
    }
  }

  /// <summary>
  ///   update table item's count according to parameter size
  /// </summary>
  /// <param name = "size">new size</param>
  /// <param name = "removeAll">remove all elements form the table including first and last dummy elements</param>
  SetTableItemsCount(size: number, removeAll: boolean): void {
    this.InitTableControl(size, removeAll);
  }

  /// <summary>
  /// inits the table control
  /// update table item's count according to parameter size
  /// </summary>
  InitTableControl(): void;
  InitTableControl(size: number, removeAll: boolean): void;
  InitTableControl(size?: number, removeAll?: boolean): void {
    if (arguments.length === 0) {
      this.InitTableControl_0();
      return;
    }
    this.InitTableControl_1(size, removeAll);
  }

  /// <summary>
  /// update arrays of table children controls
  /// </summary>
  /// <param name="size"></param>
  UpdateTableChildrenArraysSize(size: number): void {
    let children: List<MgControlBase> = this.TableChildren;
    if (children != null) {
      for (let i: number = 0; i < children.length; i++) {
        let control: MgControlBase = children.get_Item(i);
        control.updateArrays(size);
      }
    }
    if (this._tableMgControl != null)
      this._tableMgControl.updateArrays(size);
  }

  /// <summary>
  /// Close internal Help.

  /// </summary>
  SaveUserState(): void {
  }

  /// <param name="propId"></param>
  RefreshPropertyByExpression(propId: number): void {
    if (this.PropertyHasExpression(propId))
      (this.getProp(propId)).RefreshDisplay(true);
  }

  /// <returns></returns>
  GetParentForm(): any {
    let parentControl: MgControlBase = null;
    let parentForm: MgFormBase = this.ParentForm;

    if (parentForm != null) {
      // for a subform the parent control must be the subform control
      if (parentForm.isSubForm())
        parentControl = parentForm.getSubFormCtrl();
      // for a form frame the parent control must be its container.
      // it is important for a child window task that is opened from a form frame parent task.
      else if (parentForm.getContainerCtrl() != null)
        parentControl = parentForm.getContainerCtrl();
    }

    return (parentControl != null ? parentControl : parentForm);
  }

  /// <summary>
  ///   find tab control for performing CTRL+TAB && CTRL+SHIFT+TAB actions
  ///   the code original is in RT::skip_to_tab_control
  /// </summary>
  /// <param name = "ctrl">current control</param>

  toString(): string {
    return "{GuiMgForm" + ": Id=" + this._userStateId + "}";
  }

  /// <returns></returns>
  IncludeControlInTabbingOrder(control: MgControlBase, includeControlChildOfFrameForm: boolean): boolean {
    if (!control.PropertyExists(PropInterface.PROP_TYPE_TAB_ORDER))
      return false;

    // if the frame does not allow parking
    if (this._frameFormCtrl !== null && this._frameFormCtrl.PropertyExists(PropInterface.PROP_TYPE_ALLOW_PARKING) &&
      this._frameFormCtrl.GetComputedBooleanProperty(PropInterface.PROP_TYPE_ALLOW_PARKING, true) === false)
      return false;

    if (!includeControlChildOfFrameForm) {
      if (MgFormBase.IsControlChildOfFrameForm(control))
        return false;
    }
    return true;
  }

  /// <summary> Returns the startup position </summary>

  /// <returns></returns>
  OnlyFrameFormChild(control: MgControlBase): boolean {
    if (!control.PropertyExists(PropInterface.PROP_TYPE_TAB_ORDER))
      return false;

    // if the frame does not allow parking
    if (this._frameFormCtrl != null && this._frameFormCtrl.PropertyExists(PropInterface.PROP_TYPE_ALLOW_PARKING) &&
      this._frameFormCtrl.GetComputedBooleanProperty(PropInterface.PROP_TYPE_ALLOW_PARKING, true) === false)
      return false;

    return MgFormBase.IsControlChildOfFrameForm(control);

  }

  GetHashCode() {
    return this.FormIsn;
  }

  /// <returns></returns>
  protected initInnerObjects(foundTagName: string): boolean {
    if (foundTagName === null)
      return false;


    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;
    if (MgFormBase.IsFormTag(foundTagName))
      this.fillName(foundTagName);
    else if (foundTagName === XMLConstants.MG_TAG_PROP)
      this._propTab.fillData(this, 'F');
    else if (foundTagName === XMLConstants.MG_TAG_CONTROL) {
      this.CtrlTab.fillData(this);
      this.initContextPropForControls();
      if (!this.HasTable())
        this.RefreshRepeatableAllowed = true;
    }
    else if (MgFormBase.IsEndFormTag(foundTagName)) {
      parser.setCurrIndex2EndOfTag();
      return false;
    }
    else
      return false;

    return true;
  }

  /// <summary>
  /// constructs an object of MgControl
  /// </summary>
  /// <param name="addToMap"></param>

  protected FindParent(runtimeContext: RuntimeContextBase): any {
    let parent: any = this.GetParentForm();

    if (this.IsMDIChild || parent === null)
      parent = runtimeContext.FrameForm;

    return parent;
  }

  /// <summary>
  /// constructs an object of MgControl
  /// </summary>
  /// <param name="type"></param>
  /// <param name="task"></param>
  /// <param name="parentControl"></param>

  /// <returns></returns>
  protected isRowCreated(idx: number): boolean {
    if (this.Rows.length <= idx || idx < 0) {
      return false;
    }

    let row: Row = this.Rows.get_Item(idx);
    if (row === null)
      return false;

    return row.Created;
  }

  /// <summary>
  /// constructs an object of MgControl
  /// </summary>
  /// <param name="type"></param>
  /// <param name="parentMgForm">Parent form</param>
  /// <param name="parentControl">Parent control IDX</param>

  /// <param name = "val"></param>
  protected setProp(propId: number, val: string): void {
    if (this._propTab === null)
      this._propTab = new PropTable(this);

    this._propTab.setProp(propId, val, this, GuiConstants.PARENT_TYPE_FORM);
  }

  /// </summary>
  private buildLinkedControlsLists(): void {
    for (let i: number = 0; i < this.CtrlTab.getSize(); i = i + 1) {
      let ctrl: MgControlBase = this.CtrlTab.getCtrl(i);
      let linkedParent: MgControlBase = ctrl.getLinkedParent(false);
      if (linkedParent !== null)
        linkedParent.linkCtrl(ctrl);
    }
  }

  /// <summary>
  ///   build the controls tabbing order of this form

  /// <returns></returns>
  private buildSiblingList(): void {
    for (let i: number = 0; i < this.CtrlTab.getSize(); i = i + 1) {
      let ctrl: MgControlBase = this.CtrlTab.getCtrl(i);
      if (ctrl.Type === MgControlType.CTRL_TYPE_RADIO) {
        if (ctrl.getField() !== null) {
          let sibling: List<MgControlBase> = new List<MgControlBase>();
          let myIdField: number = ctrl.getField().getId();

          for (let j: number = 0; j < this.CtrlTab.getSize(); j = j + 1) {
            let currCtrl: MgControlBase = this.CtrlTab.getCtrl(j);
            if (currCtrl.Type === MgControlType.CTRL_TYPE_RADIO) {
              let field: FieldDef = currCtrl.getField();
              if (ctrl !== currCtrl && field !== null) {
                if (myIdField === field.getId())
                  sibling.push(currCtrl);
              }
            }
          }

          if (sibling.length > 0) {
            ctrl.setSiblingVec(sibling);
          }
        }
      }
    }
  }

  /// <summary>
  ///

  /// <param name = "controls"></param>
  private arrangeZorderControls(controls: List<MgControlBase>): void {
    let lowerControl: MgControlBase = null;
    for (let i: number = 0; i < controls.length; i = i + 1) {
      let ctrl: MgControlBase = controls.get_Item(i);
      if (lowerControl !== null) {
        // if there is no parent need to move above the lower control
        if (ctrl.getParent() === lowerControl.getParent()) {
          Commands.addAsync(CommandType.MOVE_ABOVE, ctrl);
          lowerControl = ctrl;
        }
      }
      else
        lowerControl = ctrl;

      if (ctrl.getLinkedControls().length > 0)
        this.arrangeZorderControls(ctrl.getLinkedControls());
    }
  }

  /// <summary>
  ///   build list of all columns controls
  /// </summary>
  private buildTableColumnsList(): void {
    if (this._tableMgControl !== null) {
      this._tableColumns = new List<MgControlBase>();
      for (let i: number = 0; i < this.CtrlTab.getSize(); i = i + 1) {
        let control: MgControlBase = this.CtrlTab.getCtrl(i);
        if (control.Type === MgControlType.CTRL_TYPE_COLUMN)
          this._tableColumns.push(control);
      }
    }
  }

  /// <summary>
  ///   refresh table first time we enter the ownerTask
  ///   get rows number form gui level

  /// <returns></returns>
  private ShouldCreateInternalFormForMDI(): boolean {
    return this.IsMDIFrame && this.GetControlsCountExcludingStatusBar() > 0;
  }

  /// <summary>
  ///   order the splitter container children. The child that is docked to fill is added first, then
  ///   the splitter control and finally the child that is docked either to the top or to the left
  /// </summary>
  private orderSplitterContainerChildren(): void {
    let ctrl: MgControlBase = null;
    for (let i: number = 0; i < this.CtrlTab.getSize(); i = i + 1) {
      ctrl = this.CtrlTab.getCtrl(i);
      if (ctrl.isFrameSet()) {
        Commands.addAsync(CommandType.ORDER_MG_SPLITTER_CONTAINER_CHILDREN, ctrl);
      }
    }
  }

  /// <summary>
  ///   update table item's count according to parameter size
  /// </summary>
  /// <param name = "size">new size</param>

  /// <returns></returns>
  private prepareUOMConversion(isXaxis: boolean): number {
    // initialize the factor values on first call
    if (isXaxis) {
      if (this._horizontalFactor === -1)
        this._horizontalFactor = this.GetComputedProperty(PropInterface.PROP_TYPE_HOR_FAC).GetComputedValueInteger();
    }
    else if (this._verticalFactor === -1)
      this._verticalFactor = this.GetComputedProperty(PropInterface.PROP_TYPE_VER_FAC).GetComputedValueInteger();

    let uomMode: WinUom = <WinUom>this.GetComputedProperty(PropInterface.PROP_TYPE_UOM).GetComputedValueInteger();

    // set the object on which the calculation is to be done.
    let obj: any = this;
    if (this.isSubForm())
      obj = this._subFormCtrl;

    Debug.Assert(uomMode === WinUom.Pix);
    return <number>Commands.getResolution(obj).x / 96;
  }

  /// <summary>
  /// update arrays of table children controls
  /// </summary>

  /// <param name = "idx"></param>
  private createRow(idx: number): void {
    Commands.addWithNumber(CommandType.CREATE_TABLE_ROW, this._tableMgControl, idx);

    if (this.Rows.length <= idx)
      this.Rows.SetSize(idx + 1);

    this.Rows.set_Item(idx, new Row(true, true));
  }

  /// <summary>
  /// saves the userstate of the form

  private SelectRow_0(): void {
    this.SelectRow(false);
  }

  /// <summary>
  /// Get the appropriate window type for a Default window type.
  /// </summary>
  /// <param name="windowType"></param>

  /// </summary>
  private SelectRow_1(sendAlways: boolean): void {
    this.SelectRow(this.DisplayLine, sendAlways);
  }

  /// <summary>
  /// For online we need to pit 'ACT_HIT' when the form was closed from system menu
  /// if the task has only subform control on it.
  /// For RC always return false
  /// </summary>

  /// <param name = "sendAlways">send selection command depending on previous value</param>
  private SelectRow_2(rowIdx: number, sendAlways: boolean): void {
    // controlForSelect can be table control or tree control
    let mainControl: MgControlBase = this.getMainControl();

    if (mainControl !== null && this.RefreshRepeatableAllowed) {
      let index: number = rowIdx;
      if (this._task.DataView.isEmptyDataview())
        index = GuiConstants.NO_ROW_SELECTED;

      if (sendAlways || index !== this._prevSelIndex) {
        // for tree control we always send selection, since sometimes we need to undo tree defaul selection
        this._prevSelIndex = index;
        Commands.addOperationWithLine(CommandType.SET_PROPERTY, mainControl, 0, "selectedRow", index);

      }
    }
  }

  /// <summary>
  /// refresh property with expression
  /// </summary>

  /// <returns></returns>
  private getToolBarInfoByGroupNumber(groupNumber: number, createIfNotExist: boolean): ToolbarInfo {
    let toolbarInfo: ToolbarInfo = <ToolbarInfo>this._toolbarGroupsCount.get_Item(groupNumber);

    if (toolbarInfo !== null && !createIfNotExist) {
      if (toolbarInfo.getCount() === 0 && toolbarInfo.getMenuEntrySeperator() === null)
        return null;
    }

    if (toolbarInfo === null && createIfNotExist) {
      toolbarInfo = new ToolbarInfo();
      this._toolbarGroupsCount.set_Item(groupNumber, toolbarInfo);
    }

    return toolbarInfo;
  }

  /// <returns></returns>
  private needToRemoveSeperatorFromPrevGroup(currentGroup: number): boolean {
    let needToRemoveSeperator: boolean = false;
    let prevGroup: number = this.getPrevGroup(currentGroup);
    let currentGroupCount: number = this.getToolbarGroupCount(currentGroup);
    let menuEntrySep: MenuEntry = this.getToolbarGroupMenuEntrySep(currentGroup);

    let itIsLastGroup: boolean = this.itIsLastGroupInToolbar(currentGroup);

    // if it is last group need to remove the sep from the last group
    if (!itIsLastGroup) {
      // remove the sep if we the second group and up, and we don't have any item
      if (prevGroup >= 0) {
        if (currentGroupCount === 0 || (currentGroupCount === 1 && menuEntrySep !== null))
          needToRemoveSeperator = true;
      }
      else {
        // it is the first group
        if (currentGroupCount === 0 && this.getGroupCount() > 1 && menuEntrySep !== null)
          needToRemoveSeperator = true;
      }
    }
    return needToRemoveSeperator;
  }

  /// <returns></returns>
  private removeSepFromGroup(groupNumber: number): void {
    // remove the separator from the prev group
    let menuEntrySep: MenuEntry = this.getToolbarGroupMenuEntrySep(groupNumber);

    if (menuEntrySep !== null) {
      menuEntrySep.deleteMenuEntryTool(this, false, true);
      this.setToolbarGroupMenuEntrySep(groupNumber, null);
    }
  }

  /// <returns></returns>
  private needToRemoveSeperatorFromCurrGroup(currentGroup: number): boolean {
    let needToRemoveSeperator: boolean = false;
    let itIsLastGroup: boolean = this.itIsLastGroupInToolbar(currentGroup);

    if (itIsLastGroup)
      needToRemoveSeperator = true;
    else {
      let currentGroupCount: number = this.getToolbarGroupCount(currentGroup);
      let menuEntrySep: MenuEntry = this.getToolbarGroupMenuEntrySep(currentGroup);
      if (this.getGroupCount() > 1 && currentGroupCount <= 1 && menuEntrySep !== null)
        needToRemoveSeperator = true;
    }

    return needToRemoveSeperator;
  }

  /// <returns></returns>
  private getLastGroup(): ToolbarInfo {
    let toolbarGroupsEnumerator: Array_Enumerator<number> = this._toolbarGroupsCount.Keys;
    let toolbarInfo: ToolbarInfo = null;
    let toolbarInfoLastGorup: ToolbarInfo = null;
    let lastImageGroup: number = -1;

    while (toolbarGroupsEnumerator.MoveNext()) {
      let obj: Object = toolbarGroupsEnumerator.Current;
      toolbarInfo = this._toolbarGroupsCount.get_Item(<number>obj);
      let MenuEntrySep: MenuEntry = toolbarInfo.getMenuEntrySeperator();
      if (MenuEntrySep != null) {
        let currImageGroup: number = MenuEntrySep.ImageGroup;
        if (currImageGroup > lastImageGroup) {
          lastImageGroup = currImageGroup;
          toolbarInfoLastGorup = toolbarInfo;
        }
      }
    }
    return toolbarInfoLastGorup;
  }

  /// <summary>
  /// should the control be included in the recalculation of the tab order
  /// </summary>
  /// <param name="control"></param>

  /// <returns></returns>
  private getPrevGroup(currGroup: number): number {
    // create a separator for the previous group
    let prevGroup: number = currGroup - 1;

    while (prevGroup >= 0) {
      if (this.getToolBarInfoByGroupNumber(prevGroup, false) !== null)
        break;
      else
        prevGroup--;
    }

    return prevGroup;
  }

  /// <summary>
  /// should the control be included in the recalculation of the tab order
  /// </summary>
  /// <param name="control"></param>

  /// </summary>
  private inheritSystemMenus(): void {
    let prop: Property = this.getProp(PropInterface.PROP_TYPE_CONTEXT_MENU);
    let contextMenu: number = 0;
    let num: NUM_TYPE = new NUM_TYPE();

    if (prop === null || !prop.isExpression()) {
      if (prop !== null)
        contextMenu = prop.getValueInt();
      // if value is zero, we need to use the system menu definition
      if (contextMenu === 0) {
        contextMenu = this.getSystemContextMenu();
        if (contextMenu > 0) {
          num.NUM_4_LONG(contextMenu);
          this.setProp(PropInterface.PROP_TYPE_CONTEXT_MENU, num.toXMLrecord());
        }
      }
    }
  }

  /// <summary>
  /// force all MgControls to update the colors used on the controls

  /// </summary>
  private InitTableControl_0(): void {
    this.InitTableControl(1, false);
  }

  /// <param name = "removeAll">remove all elements form the table including first and last dummy elements</param>
  private InitTableControl_1(size: number, removeAll: boolean): void {
    if (this._tableMgControl != null) {
      Commands.addWithNumber(CommandType.SET_TABLE_ITEMS_COUNT, this._tableMgControl, size);
      this._tableItemsCount = size;
      this.Rows.SetSize(size);
      this._prevTopIndex = -2;
      this._prevSelIndex = -2;
      this.UpdateTableChildrenArraysSize(size);
    }
  }
}

/// <summary>
///   class describing row
/// </summary>
/// <author>rinav</author>
export class Row {
  Created: boolean = false;     // is row created on gui level
  Validated: boolean = false;   // is row Validated

  constructor();
  constructor(created: boolean, validated: boolean);
  constructor(created?: boolean, validated?: boolean) {
    if (arguments.length === 0) {
      this.constructor_0();
      return;
    }
    this.constructor_1(created, validated);
  }

  private constructor_0(): void {
    this.Validated = true;
  }

  private constructor_1(created: boolean, validated: boolean): void {
    this.Created = created;
    this.Validated = validated;
  }
}
