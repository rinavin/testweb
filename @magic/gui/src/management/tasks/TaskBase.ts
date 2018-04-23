import { List, NNumber, NotImplementedException, NString, RefParam } from "@magic/mscorelib";
import {Logger_LogLevels, StorageAttribute, XmlParser, XMLConstants, Constants} from "@magic/utils";
import {ITask} from "./ITask";
import {PropParentInterface} from "../../gui/PropParentInterface";
import {IFlowMonitorQueue} from "../../IFlowMonitorQueue";
import {MgControlBase} from "../gui/MgControlBase";
import {Field} from "../data/Field";
import {MgFormBase} from "../gui/MgFormBase";
import {PropTable} from "../gui/PropTable";
import {Helps, MagicHelp} from "../gui/Helps";
import {DataViewBase} from "../data/DataViewBase";
import {IActionManager} from "../events/IActionManager";
import {Property} from "../gui/Property";
import {PropInterface} from "../gui/PropInterface";
import {Manager} from "../../Manager";
import {FieldDef} from "../data/FieldDef";
import {Commands} from "../../Commands";
import {CommandType} from "../../GuiEnums";
import {Events} from "../../Events";
import {PropDefaults} from "../gui/PropDefaults";
import {GuiConstants} from "../../GuiConstants";

/// <summary>
/// task properties (+ few access methods) required and relevant for the GUI namespace.
/// </summary>
export abstract class TaskBase implements ITask, PropParentInterface {
  protected static MAIN_PRG_PARENT_ID: number = 32768;
  _flowMonitor: IFlowMonitorQueue = null;
  private _lastMoveInRowDirection: string = Constants.MOVE_DIRECTION_NONE; // if TRUE, the task is a MoveinRow operation
  private _saveStatusText: string = null; // if we got a message to display on the status bar and the task was not initialized yet (which means
  private _keyboardMappingState: number = 0xFFFF0000;
  _refreshType: string = 'T';
  _lastParkedCtrl: MgControlBase = null;
  private _brkLevel: string = null; // the runtime level (Record  Suffix, TaskBase Prefix, etc.)
  private _brkLevelIndex: number = -1;
  private _mainLevel: string = null; // the runtime mainlevel
  private _level: string = '\0'; // 'C' = in control, 'R' = in record (out of control), 'T' = in task (out of record)
  _enteredRecLevel: boolean = false; // TRUE only if the task was ever moved to record level.
  private _currVerifyCtrl: MgControlBase = null;
  _currParkedFld: Field = null;
  private _systemContextMenu: number = 0;
  private shouldResumeSubformLayout: boolean = true;

  // This flag represents the current editing control.
  // It is reset to null when we are in between setting the focus and once we set the focus to control then we set this flag to current focused control.
  CurrentEditingControl: MgControlBase = null;

  ApplicationGuid: string = null;
  ProgramIsn: number = 0;
  TaskIsn: number = 0;
  ContextID: number = 0;
  IsSubForm: boolean = false;
  _ctlIdx: number = 0;
  _compIdx: number = 0;
  _isPrg: boolean = false;
  _isMainPrg: boolean = false;
  IsInteractive: boolean = false;
  _taskTag: string = null;
  _openWin: boolean = false;
  private _allowEvents: boolean = false;
  Form: MgFormBase = null;
  _propTab: PropTable = null;
  _helpTab: Helps = null;
  _nullArithmetic: string;
  IconFileName: string = null;

  // OL:contents passed completely inside a response
  // RC:contents loaded from cache.
  //    In case of Disabled Cache, it may passed inside a response ?
  _menusContent: string = null;
  IsParallel: boolean = false;
  DataView: DataViewBase = null;
  ActionManager: IActionManager = null;
  StudioParentTask: TaskBase = null; // parent task of the subtask by toolkit tree.

  private routerPath: string = null;
  private inDefaultRouterOutlet: boolean = false;

  get RouterPath(): string {
    return this.routerPath;
  }

  get InDefaultRouterOutlet(): boolean {
    return this.inDefaultRouterOutlet;
  }

  set ShouldResumeSubformLayout(value: boolean) {
    this.shouldResumeSubformLayout = value;
  }

  get ShouldResumeSubformLayout(): boolean {
    return this.shouldResumeSubformLayout;
  }

  IsSubtask: boolean = false;
  DataViewWasRetrieved: boolean = false; // indicates that the data view was retrieved, i.e. it is possible to evaluate expressions

  /// <summary>
  /// indicates whether the task prefix was performed for this task
  /// </summary>
  TaskPrefixExecuted: boolean = false;

  /// <summary>
  /// returns true if this task should block activation of its acsestors
  /// </summary>
  get IsBlockingBatch(): boolean {
    return !this._isMainPrg && this.isOpenWin() && !this._allowEvents && !this.IsInteractive;
  }

  constructor() {
    this._nullArithmetic = Constants.NULL_ARITH_USE_DEF;
    this._propTab = new PropTable(this);
  }

  /// <summary>
  ///   get task id
  /// </summary>
  getTaskTag(): string {
    return this._taskTag;
  }

  /// <summary>
  ///   return the ctl idx
  /// </summary>
  getCtlIdx(): number {
    return this._ctlIdx;
  }

  /// <summary>
  ///   returns true if this task is a main program of an internal or external component
  /// </summary>
  isMainProg(): boolean {
    return this._isMainPrg;
  }

  /// <summary>
  ///   return the topmost mgform of the subform
  /// </summary>
  /// <returns></returns>
  getTopMostForm(): MgFormBase {
    let form: MgFormBase = null;

    if (this.Form !== null)
      form = this.Form.getTopMostForm();
    // else
    // Assert should not be here because we have different conditions for RC & OL.
    // Other then Main Program, task's form should not be null.
    // Debug.Assert(isMainProg());

    return form;
  }

  /// <summary>
  ///   returns the requested control
  /// </summary>
  getCtrl(ctrlIdx: number): MgControlBase {
    return this.Form.getCtrl(ctrlIdx);
  }

  /// <summary>
  /// reset menus content
  /// </summary>
  /// <returns></returns>
  resetMenusContent(): void {
    this._menusContent = null;
  }

  /// <summary>
  /// sets the current task mode
  /// </summary>
  /// <param name="val">new task mode</param>
  setMode(val: string): void {
    let checkPaste: boolean = false;
    if (this.getMode() !== val) {
      this.setProp(PropInterface.PROP_TYPE_TASK_MODE, val);

      checkPaste = true;

      if (this._flowMonitor !== null)
        this._flowMonitor.addTaskCngMode(this.ContextID, val);
    }
    // check if paste event should be enable/disabled due to task mode change.

    if (checkPaste)
      this.ActionManager.checkPasteEnable(this.getLastParkedCtrl());
  }

  SetActiveHighlightRowState(state: boolean): void {
    if (this.Form !== null)
      this.Form.SetActiveHighlightRowState(state);
  }

  /// <summary>
  ///   get the task mode
  /// </summary>
  getMode(): string {
    let taskMode: string = Constants.TASK_MODE_MODIFY;
    let prop: Property = this.getProp(PropInterface.PROP_TYPE_TASK_MODE);
    if (prop !== null)
      taskMode = (prop.getValue()).charAt(0);

    return taskMode;
  }

  /// <summary>
  ///   setter for the saveStatusText - saves the text to be written to the status bar once the task is initialized
  /// </summary>
  /// <param name = "statusText"></param>
  setSaveStatusText(statusText: string): void {
    this._saveStatusText = statusText;
  }

  /// <summary>
  ///   getter for the saveStatusText
  /// </summary>
  /// <returns> the saveStatusText</returns>
  getSaveStatusText(): string {
    return this._saveStatusText;
  }

  /// <summary>
  ///   reset refresh type
  /// </summary>
  resetRefreshType(): void {
    this._refreshType = Constants.TASK_REFRESH_NONE;
  }

  /// <summary>
  ///   get refresh type
  /// </summary>
  /// <returns></returns>
  getRefreshType(): string {
    return this._refreshType;
  }

  /// <summary>
  ///   set the refresh type for the next RefreshDisplay() call
  /// </summary>
  /// <param name = "refreshType">the new refresh type</param>
  SetRefreshType(refreshType: string): void {
    switch (refreshType) {
      case Constants.TASK_REFRESH_FORM:
      case Constants.TASK_REFRESH_TABLE:
      case Constants.TASK_REFRESH_CURR_REC:
        this._refreshType = refreshType;
        break;

      default:
        break;
    }
  }

  GetRouterParams(): List<any> {
   return this.DataView.GetRouteParams();
  }

  /// <summary>
  ///   get last parked control
  /// </summary>
  getLastParkedCtrl(): MgControlBase {
    return this._lastParkedCtrl;
  }

  /// <summary> get the open window
  /// </summary>
  isOpenWin(): boolean {
    return this._openWin;
  }

  /// <summary>
  ///   if the property exists returns its boolean value otherwise returns the default value
  /// </summary>
  /// <param name = "propId">id of the property</param>
  /// <param name = "defaultRetVal">the value to return in case the property does not exist</param>
  checkProp(propId: number, defaultRetVal: boolean): boolean {
    let prop: Property = this.getProp(propId);
    if (prop !== null)
      return prop.getValueBoolean();
    return defaultRetVal;
  }

  /// <summary>
  ///   returns the clicked control on the task
  /// </summary>
  getClickedControl(): MgControlBase {
    let clickedCtrl: MgControlBase = Manager.GetCurrentRuntimeContext().CurrentClickedCtrl;

    if (clickedCtrl !== null && clickedCtrl.getForm().getTask() !== this)
      clickedCtrl = null;

    return clickedCtrl;
  }

  /// <returns> keyboardMappingState
  /// </returns>
  getKeyboardMappingState(): number {
    return this._keyboardMappingState;
  }

  /// <summary>
  ///   returns true if state enabled
  /// </summary>
  /// <param name = "state"></param>
  /// <returns></returns>
  isStateEnabled(state: number): boolean {
    return (state & this._keyboardMappingState) > 0;
  }

  /// <summary>
  ///   Sets the state on/off
  /// </summary>
  /// <param name = "state"></param>
  /// <param name = "on"></param>
  setKeyboardMappingState(state: number, on: boolean): void {
    this._keyboardMappingState = on
      ? TaskBase.mkInt(TaskBase.hiShrt(this._keyboardMappingState) & ~state, TaskBase.loShrt(this._keyboardMappingState) | state)
      : TaskBase.mkInt(TaskBase.hiShrt(this._keyboardMappingState) | state, TaskBase.loShrt(this._keyboardMappingState) & ~state);
  }

  /// <param name = "n"></param>
  /// <returns> higher half of the integer</returns>
  static hiShrt(n: number): number {
    return (n & 0xffff0000) >> 16;
  }

  /// <param name = "n"></param>
  /// <returns> low half of the integer</returns>
  static loShrt(n: number): number {
    return n & 0x0000ffff;
  }

  /// <param name = "n1"></param>
  /// <param name = "n2"></param>
  /// <returns> unites low halves of 2 integers // </returns>
  static mkInt(n1: number, n2: number): number {
    return n1 << 16 | n2;
  }

  getHelpItem(idx: number): MagicHelp {
    let result: MagicHelp;
    if (this._helpTab !== null)
      return this._helpTab.getHelp(idx);
    result = null;
  }

  /// <summary>
  ///   set a property of the task
  /// </summary>
  /// <param name = "propId">the id of the property</param>
  /// <param name = "val">the value of the property</param>
  setProp(propId: number, val: string): void {
    this._propTab.setProp(propId, val, this, 'T');
  }

  /// <summary>
  /// </summary>
  /// <param name = "moveInRowDirection"></param>
  setLastMoveInRowDirection(moveInRowDirection: string): void {
    this._lastMoveInRowDirection = moveInRowDirection;
  }

  getLastMoveInRowDirection(): string {
    return this._lastMoveInRowDirection;
  }

  isMoveInRow(): boolean {
    return this._lastMoveInRowDirection !== Constants.MOVE_DIRECTION_NONE;
  }

  /// <summary>
  ///   set the runtime level of the task (Record Suffix, TaskBase Prefix, etc.)
  /// </summary>
  setBrkLevel(cBrkLevel: string, NewBrkLevelIndex: number): void {
    this._brkLevel = cBrkLevel;
    this._brkLevelIndex = NewBrkLevelIndex;

    this.setMainLevel(cBrkLevel); // Update the MainLevel according to the new Level
  }

  /// <summary>
  ///   returns the runtime level of the task (Record Suffix, TaskBase Prefix, etc.)
  /// </summary>
  getBrkLevel(): string {
    return this._brkLevel;
  }

  /// <summary>
  ///   return the id of the current executing handler
  /// </summary>
  /// <returns> the int id of the current executing handler</returns>
  getBrkLevelIndex(): number {
    return this._brkLevelIndex;
  }

  /// <summary>
  ///   set the runtime mainlevel of the task
  /// </summary>
  setMainLevel(cBrkLevel: string): void {
    if (cBrkLevel !== null && cBrkLevel.length > 0) {
      let level: string = cBrkLevel.charAt(0);
      /* then MAINLEVEL is updated only if the actual Level is a TASK or RECORD ( or none ) level */
      if (level === Constants.TASK_LEVEL_NONE || level === Constants.TASK_LEVEL_TASK ||
        level === Constants.TASK_LEVEL_RECORD)
        this._mainLevel = cBrkLevel;
    }
  }

  /// <summary>
  ///   get the runtime mainlevel of the task
  /// </summary>
  getMainLevel(): string {
    return this._mainLevel;
  }

  /// <summary>
  ///   set the level of the task
  /// </summary>
  /// <param name = "cLevel">'C' = in control, 'R' = in record (out of control), 'T' = in task (out of record)      /// </param>
  setLevel(cLevel: string): void {
    this._level = cLevel;

    if (this._level === Constants.TASK_LEVEL_RECORD)
      this._enteredRecLevel = true;
  }

  /// <summary>
  ///   return the level of the task: 'C' = in control, 'R' = in record (out of control), 'T' = in task (out of record)
  /// </summary>
  getLevel(): string {
    return this._level;
  }

  /// <summary>
  ///   set the DataSynced property of task
  /// </summary>
  setDataSynced(synced: boolean): void {
  }

  /// <summary>
  ///   returns scheme for null arithmetic
  /// </summary>
  getNullArithmetic(): string {
    return this._nullArithmetic;
  }

  /// <summary>
  ///   returns System Context Menu
  /// </summary>
  getSystemContextMenu(): number {
    return this._systemContextMenu;
  }

  /// <summary>
  /// get the currVerifyCtrl
  /// </summary>
  /// <returns></returns>
  getCurrVerifyCtrl(): MgControlBase {
    return this._currVerifyCtrl;
  }

  /// <summary>
  /// set the currVerifyCtrl
  /// </summary>
  /// <param name="aCtrl"></param>
  setCurrVerifyCtrl(aCtrl: MgControlBase): void {
    if (aCtrl === null || aCtrl.getField() !== null)
      this._currVerifyCtrl = aCtrl;
  }

  /// <summary>
  ///   set the last parked control in this task
  /// </summary>
  /// <param name = "ctrl">last focused control</param>
  setLastParkedCtrl(ctrl: MgControlBase): void {
    this._lastParkedCtrl = ctrl;
    this._currParkedFld = ((this._lastParkedCtrl !== null)
      ? this._lastParkedCtrl.getField()
      : null);
    this.CurrentEditingControl = ctrl;
  }

  /// <summary>
  ///   get current field of the task
  /// </summary>
  getCurrField(): Field {
    return this._currParkedFld;
  }

  /// <summary>
  ///   set current field of the task
  /// </summary>
  setCurrField(currField: Field): void {
    this._currParkedFld = currField;
  }

  /// <summary>
  ///   returns the index of the field of the current parked control or -1 if there is no such field
  /// </summary>
  getCurrFieldIdx(): number {
    if (this._currParkedFld !== null)
      return this._currParkedFld.getId();
    return -1;
  }

  getFieldByValueStr(valueStr: string): FieldDef;
  getFieldByValueStr(valueStr: string, parent: RefParam<number>, vee: RefParam<number>): FieldDef;
  getFieldByValueStr(valueStr: string, parent?: RefParam<number>, vee?: RefParam<number>): FieldDef {
    if (arguments.length === 1)
      return this.getFieldByValueStr_0(valueStr);
    else
      return this.getFieldByValueStr_1(valueStr, parent, vee);
  }

  private getFieldByValueStr_0(valueStr: string): FieldDef {
    let parent: number;
    let vee: number;
    let refParent: RefParam<number> = new RefParam(parent);
    let refVee: RefParam<number> = new RefParam(vee);
    return this.getFieldByValueStr_1(valueStr, refParent, refVee);
  }

  /// <summary>
  /// get the field by 'valueStr'
  /// </summary>
  /// <param name="valueStr"></param>
  /// <returns></returns>
  private getFieldByValueStr_1(valueStr: string, parent: RefParam<number>, vee: RefParam<number>): FieldDef {
    parent.value = vee.value = 0;
    let tempField: FieldDef = null;
    let comma: number = valueStr.indexOf(",");
    if (comma > 0) {
      let parentId: number = NNumber.Parse(valueStr.substr(0, comma));
      let fldIdx: number = NNumber.Parse(valueStr.substr(comma + 1));
      tempField = ((parentId !== 0)
        ? this.getFieldDef(parentId, fldIdx)
        : this.getFieldDef(fldIdx));
      parent.value = parentId;
      vee.value = fldIdx;
    }
    return tempField;
  }

  /// <summary>
  /// get the field from a 1-based main prog argument
  /// </summary>
  /// <param name="valueStr"></param>
  /// <returns></returns>
  getMainProgFieldByValueStr(valueStr: string): FieldDef {
    // string is 1-based - need to subtract 1 to get to 0-based value
    let fldIdx: number = NNumber.Parse(valueStr) - 1;
    return this.getFieldDef(fldIdx);
  }

  getFieldDef(fldId: number): FieldDef;
  getFieldDef(parent: number, fldIdx: number): FieldDef;
  getFieldDef(fldIdOrParent: number, fldIdx?: number): FieldDef {
    if (arguments.length === 1)
      return this.getField_0(fldIdOrParent);
    else
      return this.getField_1(fldIdOrParent, fldIdx);
  }

  /// <summary>
  ///   get a field by its idx
  /// </summary>
  /// <param name = "fldId">id of the field </param>
  private getField_0(fldId: number): FieldDef {
    return this.DataView.getField(fldId);
  }

  /// <summary>
  /// initialize the current task's form.
  /// </summary>
  InitForm(): ITask {
    let nonInteractiveTask: TaskBase = null;

    if (this.Form !== null) {
      this.Form.InInitForm = true;
      this.Form.init();

      if (this.Form.getSubFormCtrl() !== null) {
        Commands.addAsync(CommandType.SUSPEND_LAYOUT, this.Form.getSubFormCtrl().getParent(), true);
        // QCR #449743, show subform after all controls are displayed
        Commands.addAsync(CommandType.PROP_SET_VISIBLE, this.Form.getSubFormCtrl(), 0, false, !this.Form.IsFirstRefreshOfProps());
      }

      this.SetRefreshType(Constants.TASK_REFRESH_FORM);

      this.RefreshDisplay();

      this.Form.arrangeZorder();
      this.Form.fixTableLocation();
      this.Form.createPlacementLayout();

      if (!this.IsInteractive && !this._isMainPrg)
        nonInteractiveTask = this;

      if (!this.IsSubForm) {
        let iconFileNameTrans: string = (this.IconFileName !== null) ? Events.Translate(this.IconFileName) : "@Mgxpa";
        // After #984822, Gui.low expects the local file path
        Commands.addAsync(CommandType.PROP_SET_ICON_FILE_NAME, this.Form, 0, iconFileNameTrans, 0);
      }

      if (this.Form.getSubFormCtrl() === null) {
        // calculation the height of the form should include the menu and toolbar height.
        // this must be executed after menu and toolbar create, and before the layout executed
        let heightProperty: Property = this.Form.GetComputedProperty(PropInterface.PROP_TYPE_HEIGHT);
        if (heightProperty !== null)
          heightProperty.RefreshDisplay(true);
      }
      else {
        // subform
        if (this.CanResumeSubformLayout())
          this.ResumeSubformLayout(false);
      }

      if (this.Form.getContainerCtrl() !== null)
        Commands.addAsync(CommandType.RESUME_LAYOUT, this.Form.getContainerCtrl(), false);

      Commands.beginInvoke();
      this.Form.InInitForm = false;
    }

    return nonInteractiveTask;
  }

  /// <summary>
  /// check if we can resume subform layout during init form  (check if data was retrieved)
  /// </summary>
  /// <returns></returns>
  CanResumeSubformLayout(): boolean {
    return true;
  }

  /// <summary>
  /// resume subform layout
  /// </summary>
  /// <param name="applyFormUserState"> true if should apply form's user state</param>
  ResumeSubformLayout(applyFormUserState: boolean): void {
    if (this.Form !== null) {
      let subFormCtrl: MgControlBase = this.Form.getSubFormCtrl();
      if (subFormCtrl !== null && this.shouldResumeSubformLayout) {
        Commands.addAsync(CommandType.RESUME_LAYOUT, subFormCtrl, false);
        Commands.addAsync(CommandType.PROP_SET_VISIBLE, subFormCtrl, 0,
          subFormCtrl.isVisible(), !this.Form.IsFirstRefreshOfProps());
        Commands.addAsync(CommandType.RESUME_LAYOUT, subFormCtrl.getParent(), true);
        this.shouldResumeSubformLayout = false; // make sure we do this only once
        if (applyFormUserState)
          Manager.ApplyformUserState(this.Form);
      }
    }
  }

  /// <summary>
  ///   returns the name of the control which was last parked
  /// </summary>
  /// <param name = "depth">the generation</param>
  GetLastParkedCtrlName(depth: number): string {
    let ancestor: TaskBase = <TaskBase>this.GetTaskAncestor(depth);
    let flag: boolean = ancestor === null || ancestor._lastParkedCtrl === null;
    let result: string;
    if (ancestor === null || ancestor._lastParkedCtrl === null)
      return "";
    return ancestor._lastParkedCtrl.Name;
  }

  /// <summary>
  ///   get the form of the task
  /// </summary>
  /// <returns> Form is the form of the task</returns>
  getForm(): MgFormBase {
    return this.Form;
  }

  /// <summary>
  /// Set task's form.
  /// </summary>
  /// <returns> Form is the form of the task</returns>
  SetForm(value: MgFormBase): MgFormBase {
    this.Form = value;
    return value;
  }

  checkIfExistProp(propId: number): boolean {
    let exist: boolean = false;

    if (this._propTab !== null) {
      let prop: Property = this._propTab.getPropById(propId);
      exist = (prop !== null);
    }
    return exist;
  }

  /// <summary>
  ///   get a task property
  /// </summary>
  /// <param name = "propId">Id of the requested property
  /// </param>
  getProp(propId: number): Property {
    let prop: Property = null;

    if (this._propTab !== null) {
      prop = this._propTab.getPropById(propId);

      // if the property doesn't exist then create a new property and give it the default value
      // in addition add this property to the properties table
      if (prop === null) {
        prop = PropDefaults.getDefaultProp(propId, GuiConstants.PARENT_TYPE_TASK, this);
        if (prop !== null) {
          prop.StudioValue = prop.getOrgValue();
          this._propTab.addPropWithCheckExistence(prop, false);
        }
      }
    }
    return prop;
  }

  GetComputedProperty(propId: number): Property {
    let prop: Property = null;

    if (this._propTab !== null)
      prop = this._propTab.getPropById(propId);
    return prop;
  }

  /// <summary>
  ///   return the component idx
  /// </summary>
  getCompIdx(): number {
    return this._compIdx;
  }

  /// <summary>
  ///   return true if this is first refresh
  /// </summary>
  /// <returns></returns>
  IsFirstRefreshOfProps(): boolean {
    throw new NotImplementedException();
  }

  /// <summary>
  /// Evaluates the expression corresponding to the passed ID.
  /// </summary>
  /// <param name="expId">Exp ID</param>
  /// <param name="resType">expected return type</param>
  /// <param name="length">Expected len - is not used, it must be here because of computability with Rich Client</param>
  /// <param name="contentTypeUnicode">should the result be unicode</param>
  /// <param name="resCellType"></param>
  /// <param name="alwaysEvaluate">for form properties and some control properties we always evaluate expressions</param>
  /// <param name="wasEvaluated">indicates whether the expression was evaluated</param>
  /// <returns>evaluated value</returns>
  EvaluateExpression(expId: number, resType: StorageAttribute, length: number, contentTypeUnicode: boolean, resCellType: StorageAttribute, alwaysEvaluate: boolean, wasEvaluated: RefParam<boolean>): string {
    let result: string = null;
    wasEvaluated.value = false;

    if (alwaysEvaluate || this.DataViewWasRetrieved) {
      result = this.CalculateExpression(expId, resType, length, contentTypeUnicode, resCellType);
      wasEvaluated.value = true;
    }
    return result;
  }

  /// <summary>
  /// Calculate expresion
  /// </summary>
  /// <param name="expId">The expression to evaluate</param>
  /// <param name="resType">The expected result type.</param>
  /// <param name="length">The expected length of the result.</param>
  /// <param name="contentTypeUnicode">Denotes whether the result is expected to be a unicode string.</param>
  /// <param name="resCellType">Not used.</param>
  /// <returns></returns>
  abstract CalculateExpression(expId: number, resType: StorageAttribute, length: number, contentTypeUnicode: boolean, resCellType: StorageAttribute): string;

  /// <summary>
  /// creates a mgform object
  /// </summary>
  /// <returns></returns>
  abstract ConstructMgForm(alreadySetParentForm: RefParam<boolean>): MgFormBase ;

  /// <summary>
  ///   returns true if the task is started
  /// </summary>
  isStarted(): boolean {
    return true;
  }

  /// <summary>
  ///   tells whether the task is aborting
  /// </summary>
  isAborting(): boolean {
    return false;
  }

  /// <summary>
  ///   get the ancestor of the TaskBase
  /// </summary>
  /// <param name = "generation">of the ancestor task</param>
  abstract GetTaskAncestor(generation: number): ITask;

  /// <summary>
  /// get the context task
  /// </summary>
  /// <returns></returns>
  abstract GetContextTask(): ITask ;

  /// <summary>
  /// Returns task depth
  /// </summary>
  /// <returns></returns>
  abstract GetTaskDepth(): number ;

  /// <summary> refresh the display, paint the controls and their properties again </summary>
  abstract RefreshDisplay(): void ;

  /// <summary> get the value of a field. </summary>
  /// <param name="fieldDef"></param>
  /// <param name="value"></param>
  /// <param name="isNull"></param>
  abstract getFieldValue(fieldDef: FieldDef, value: RefParam<string>, isNull: RefParam<boolean>): void ;

  /// <summary> get the display value of a field. </summary>
  /// <param name="fieldDef"></param>
  /// <param name="value"></param>
  /// <param name="isNull"></param>
  abstract getFieldDisplayValue(fieldDef: FieldDef, value: RefParam<string>, isNull: RefParam<boolean>): void ;

  /// <summary> updates the field's value and starts recompute. </summary>
  /// <param name="fieldDef"></param>
  /// <param name="value"></param>
  /// <param name="isNull"></param>
  abstract UpdateFieldValueAndStartRecompute(fieldDef: FieldDef, value: string, isNull: boolean): void ;

  /// <summary> /// This function returns true if field in null else false.</summary>
  /// <param name="fieldDef"></param>
  /// <returns>true if field is null else false</returns>
  abstract IsFieldNull(fieldDef: FieldDef): boolean ;

  /// <summary>
  /// return menus content (passed completely inside a response, i.e. not thru the cache)
  /// </summary>
  /// <returns></returns>
  setMenusContent(content: string): void {
    this._menusContent = content;
  }

  /// <summary>
  /// return menus content (passed completely inside a response, i.e. not thru the cache)
  /// </summary>
  /// <returns></returns>
  getMenusContent(): string {
    return this._menusContent;
  }

  /// <summary>
  /// compose and return a url for the menus content
  /// </summary>
  /// <returns></returns>
  getMenusFileURL(): string {
    let menusFileURL: string = null;
    if (this._menusContent !== null)
      menusFileURL = NString.Format("nocache_{0}_Menus{1}.xml", NString.GetHashCode(this._menusContent), this.ContextID);
    return menusFileURL;
  }

  /// <summary></summary>
  /// <returns>true iff menus were attached to the program (in the server side)</returns>
  menusAttached(): boolean {
    return this.getMenusContent() !== null;
  }

  /// <summary>get a field from the task.travel by parents (i.e. NOT by triggering tasks).</summary>
  /// <param name = "parent">generation number (0 is current task)</param>
  /// <param name = "fldIdx">the field index within its task</param>
  /// <returns> the id of the field described by parent + idx</returns>
  private getField_1(parent: number, fldIdx: number): FieldDef {

    switch (parent) {
      case 0:
        return this.getFieldDef(fldIdx);

      case TaskBase.MAIN_PRG_PARENT_ID:
        // find the main program using the component id (ctl idx)
        let compMainProg: TaskBase = <TaskBase> Manager.MGDataTable.GetMainProgByCtlIdx(this.ContextID, this._ctlIdx);
        return compMainProg.getFieldDef(fldIdx);

      default:
        parent--;
        if (this.StudioParentTask != null)
          return this.StudioParentTask.getFieldDef(parent, fldIdx);
        return null;
    }
  }

  /// <summary>
  ///   get the task attributes
  /// </summary>
  fillAttributes(): void {
    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;
    let endContext: number = parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex());
    if (endContext !== -1 && endContext < parser.getXMLdata().length) {
      // last position of its tag
      let tag: string = parser.getXMLsubstring(endContext);
      parser.add2CurrIndex(tag.indexOf(XMLConstants.MG_TAG_TASK) + XMLConstants.MG_TAG_TASK.length);

      let tokens: List<string> = XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);

      for (let j: number = 0; j < tokens.length; j = j + 2) {
        let attribute: string = tokens.get_Item(j);
        let valueStr: string = tokens.get_Item(j + 1);
        if (!this.setAttribute(attribute, valueStr) && Events.ShouldLog(Logger_LogLevels.Development))
          Events.WriteDevToLog(NString.Format("In TaskBase.fillAttributes(): Unprocessed(!) attribute: '{0}' = '{1}'", attribute, valueStr));
      }

      parser.setCurrIndex(parser.getXMLdata().indexOf( XMLConstants.TAG_CLOSE, parser.getCurrIndex()) + 1); // to delete ">" too
    }
  }

  /// <summary>
  ///   get the task attributes
  /// </summary>
  setAttribute(attribute: string, valueStr: string): boolean {
    let isTagProcessed: boolean = true;

    switch (attribute) {
      case XMLConstants.MG_ATTR_APPL_GUID:
        this.ApplicationGuid = valueStr;
        break;

      case XMLConstants.MG_ATTR_PROGRAM_ISN:
        this.ProgramIsn = NNumber.Parse(valueStr);
        break;

      case XMLConstants.MG_ATTR_TASK_ISN:
        this.TaskIsn = NNumber.Parse(valueStr);
        break;

      case XMLConstants.MG_ATTR_TOOLKIT_PARENT_TASK:
        if (NNumber.Parse(valueStr) !== 0)
          this.StudioParentTask = <TaskBase>Manager.MGDataTable.GetTaskByID(valueStr);

        this.IsSubtask = true;
        break;

      case XMLConstants.MG_ATTR_TASKID:
        this.setTaskId(valueStr);
        if (Events.ShouldLog(Logger_LogLevels.Development))
          Events.WriteDevToLog("TASK: " + this._taskTag);
        break;

      case XMLConstants.MG_ATTR_CTL_IDX:
        this.setCtlAndCompIdx(valueStr);
        break;

      case XMLConstants.MG_ATTR_MAINPRG:
        this.setMainPrg(valueStr);
        break;

      case XMLConstants.MG_ATTR_NULL_ARITHMETIC:
        this.setNullArithmetic(valueStr);
        break;

      case XMLConstants.MG_ATTR_INTERACTIVE:
        this.setIsInteracive(valueStr);
        break;

      case XMLConstants.MG_ATTR_OPEN_WIN:
        this.setOpenWin(valueStr);
        break;

      case XMLConstants.MG_ATTR_ALLOW_EVENTS:
        this.SetAllowEvents(valueStr);
        break;

      case XMLConstants.MG_ATTR_ISPRG:
        this.setIsPrg(valueStr);
        break;

      case XMLConstants.MG_ATTR_ICON_FILE_NAME:
        this.IconFileName = valueStr;
        break;

      case XMLConstants.MG_ATTR_SYS_CONTEXT_MENU:
        this._systemContextMenu = NNumber.Parse(valueStr);
        break;

      case XMLConstants.MG_ATTR_PARALLEL:
        this.IsParallel = XmlParser.getBoolean(valueStr);
        break;

      case XMLConstants.MG_ATTR_ROUTER_PATH:
        this.routerPath = valueStr;
        break;

      case XMLConstants.MG_ATTR_IN_DEFAULT_ROUTER_OUTLET:
        this.inDefaultRouterOutlet = XmlParser.getBoolean(valueStr);
        break;

      default:
        isTagProcessed = false;
        break;
    }

    return isTagProcessed;
  }

  /// <summary>
  ///   To allocate and fill inner objects of the class
  /// </summary>
  /// <param name = "foundTagName">possible tag name , name of object, which need be allocated</param>
  /// <param name="parentForm">the form of the task that called the current task (note: NOT triggering task)</param>
  initInnerObjects(foundTagName: string, parentForm: MgFormBase): boolean {

    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;
    switch (foundTagName) {
      case XMLConstants.MG_TAG_HELPTABLE:
        if (this._helpTab == null)
          this._helpTab = new Helps();

        if (Events.ShouldLog(Logger_LogLevels.Development))
          Events.WriteDevToLog(NString.Format("{0} ...", foundTagName));

        this._helpTab.fillData();
        break;

      case XMLConstants.MG_TAG_DVHEADER:
        if (Events.ShouldLog(Logger_LogLevels.Development))
          Events.WriteDevToLog(NString.Format("{0} ...", foundTagName));

        this.DataView.fillHeaderData();
        break;

      case XMLConstants.MG_TAG_PROP:
        this._propTab.fillData(this, 'T');
        break;

      case XMLConstants.MG_TAG_FORM:
        this.Form = this.FormInitData(parentForm);
        break;

      case XMLConstants.MG_ATTR_MENU_CONTENT:
        // set current index after tag name end
        parser.setCurrIndex(parser.getXMLdata().indexOf(XMLConstants.MG_ATTR_MENU_CONTENT, parser.getCurrIndex()) +
          XMLConstants.MG_ATTR_MENU_CONTENT.length + 1);
        let endContext: number = parser.getXMLdata().indexOf("</" + XMLConstants.MG_ATTR_MENU_CONTENT, parser.getCurrIndex());
        this._menusContent = parser.getXMLsubstring(endContext);

        Manager.MenuManager.getApplicationMenus(this);
        parser.setCurrIndex(endContext);
        parser.setCurrIndex2EndOfTag();
        break;

      case XMLConstants.MG_TAG_ASSEMBLIES:
        let start: number = parser.getCurrIndex();
        endContext = parser.getXMLdata().indexOf('/' + XMLConstants.MG_TAG_ASSEMBLIES,
          parser.getCurrIndex());
        parser.setCurrIndex(endContext);
        parser.setCurrIndex2EndOfTag();
        break;
      default:
        return false;
    }

    return true;
  }

  /// <summary>
  /// init data for form and return the form
  /// </summary>
  /// <param name="foundTagName"></param>
  /// <param name="parentForm"></param>
  /// <returns></returns>
  FormInitData(parentForm: MgFormBase): MgFormBase {
    let alreadySetParentForm: boolean = false;
    let refAlreadySetParentForm: RefParam<boolean> = new RefParam(alreadySetParentForm);

    if (this.Form === null)
      this.Form = this.ConstructMgForm(refAlreadySetParentForm);

    if (!alreadySetParentForm)
      this.Form.ParentForm = parentForm;

    if (Events.ShouldLog(Logger_LogLevels.Development))
      Events.WriteDevToLog("form");

    this.Form.fillData(this);
    return this.Form;
  }

  /// <summary>
  ///   set task id
  /// </summary>
  setTaskId(valueStr: string): void {
    this._taskTag = valueStr;
  }

  /// <summary>
  ///   set ctlIdx & compIdx
  /// </summary>
  private setCtlAndCompIdx(valueStr: string): void {
    let i: number = valueStr.indexOf(",");
    if (i > -1) {
      this._ctlIdx = NNumber.Parse(valueStr.substr(0, i));
      this._compIdx = NNumber.Parse(valueStr.substr(i + 1));
    }
  }

  /// <summary>
  /// Get ancestor task containing form
  /// </summary>
  /// <returns>TaskBase</returns>
  GetAncestorTaskContainingForm(): TaskBase {
    let parentTask: TaskBase = <TaskBase>this.GetTaskAncestor(1);
    while (parentTask !== null && parentTask.getForm() === null) {
      parentTask = <TaskBase>parentTask.GetTaskAncestor(1);
    }

    return parentTask;
  }

  /// <summary>
  /// set isMainPrg
  /// </summary>
  /// <param name="valueStr"></param>
  private setMainPrg(valueStr: string): void {
    this._isMainPrg = XmlParser.getBoolean(valueStr);
  }

  /// <summary>
  /// set nullArithmetic
  /// </summary>
  /// <param name="valueStr"></param>
  private setNullArithmetic(valueStr: string): void {
    this._nullArithmetic = valueStr.charAt(0);
  }

  /// <summary>
  /// set isInteractive
  /// </summary>
  /// <param name="valueStr"></param>
  private setIsInteracive(valueStr: string): void {
    this.IsInteractive = XmlParser.getBoolean(valueStr);
  }

  /// <summary>
  /// set openWin
  /// </summary>
  /// <param name="valueStr"></param>
  private setOpenWin(valueStr: string): void {
    this._openWin = XmlParser.getBoolean(valueStr);
  }

  /// <summary>
  /// set openWin
  /// </summary>
  /// <param name="valueStr"></param>
  SetOpenWin(valuebool: boolean): void {
    this._openWin = valuebool;
  }

  /// <summary>
  /// set AllowEvents
  /// </summary>
  /// <param name="valueStr"></param>
  SetAllowEvents(valueStr: string): void {
    this._allowEvents = XmlParser.getBoolean(valueStr);
  }

  /// <summary>
  /// set isPrg
  /// </summary>
  /// <param name="valueStr"></param>
  private setIsPrg(valueStr: string): void {
    this._isPrg = XmlParser.getBoolean(valueStr);
  }

  ShouldEvaluatePropertyLocally(propId: number): boolean {
    return false;
  }
}
