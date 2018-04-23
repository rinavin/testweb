import {
  Commands,
  CommandType,
  Manager,
  MgControlBase,
  MgFormBase,
  Property,
  PropInterface,
  PropParentInterface,
  ValidationDetails
} from "@magic/gui";
import {
  AllowedDirectionType,
  Constants,
  InternalInterface,
  Logger,
  MgControlType,
  MsgInterface,
  ScrollBarThumbType,
  StorageAttribute,
  SubformType,
  TableBehaviour
} from "@magic/utils";
import {Debug, IComparable, List, NString} from "@magic/mscorelib";
import {ArgumentsList} from "../rt/ArgumentsList";
import {Task, Task_Direction} from "../tasks/Task";
import {ClientManager} from "../ClientManager";
import {MgForm} from "./MgForm";
import {GUIManager} from "../GUIManager";
import {Field} from "../data/Field";
import {DataView} from "../data/DataView";
import {Record} from "../data/Record";
import {ConstInterface} from "../ConstInterface";

/// <summary>
///   data for <control> ...</control> tag
/// </summary>
/// <author>  ehudm
///
/// </author>
export class MgControl extends MgControlBase implements PropParentInterface {
  private _focusedStopExecution: boolean; // used to remember stopExecution flag in the end of
  private _inControlSuffix: boolean; // true, is control is in control suffix
  private _rtEvtTask: Task;
  private _nextCtrl: MgControl; // pointers to the prev/next ctrls in the
  private _prevCtrl: MgControl;

  private _subformTaskId: string; // the task id of the sub form task (if this
  private _subformTask: Task; // reference to task of the sub form task

  IsInteractiveUpdate: boolean; // true if this control was modified by user
  private refreshOnString: string; // Only for offline. Get it from XML and put it on the subform task when the subform task is opened
  SubformLoaded: boolean; // true, if the subform task was loaded already
  HasZoomHandler: boolean; // if TRUE, there is a zoom handler on this ctrl
  ArgList: ArgumentsList; // argument list built from the property

  IgnoreDirectionWhileParking: boolean;
  HasVerifyHandler: boolean;

  private initialize() {
    this._focusedStopExecution = false;
    this._inControlSuffix = false;
    this._rtEvtTask = null;
    this._nextCtrl = null;
    this._prevCtrl = null;
    this._subformTaskId = null;
    this._subformTask = null;
    this.IsInteractiveUpdate = false;
    this.refreshOnString = null;
    this.SubformLoaded = false;
    this.HasZoomHandler = false;
    this.ArgList = null;
    this.IgnoreDirectionWhileParking = false; // ignore direction check while finding a parkable ctrl
    this.HasVerifyHandler = false;
  }

  /// <summary>
  ///   CTOR
  /// </summary>
  constructor();
  constructor(type: MgControlType);
  constructor(type: MgControlType, task: Task, parentControl: number);
  constructor(type: MgControlType, parentMgForm: MgFormBase, parentControlIdx: number);
  constructor(type?: MgControlType, taskOrParentMgForm?: any, parentControlOrParentControlIdx?: number) {
    if (arguments.length === 0)
      super();
    else if (arguments.length === 3 && (type === null || type.constructor === Number) && (taskOrParentMgForm === null || taskOrParentMgForm instanceof Task) && (parentControlOrParentControlIdx === null || parentControlOrParentControlIdx.constructor === Number))
      super(type, (<Task>taskOrParentMgForm).getForm(), parentControlOrParentControlIdx);
    else
      super(type, taskOrParentMgForm, parentControlOrParentControlIdx);
    this.initialize();
  }

  GetVarIndex(): number {
    return (<DataView>super.getForm().getTask().DataView).Dvcount + this.veeIndx;
  }

  /// <summary>
  /// Set arguments from the property
  /// </summary>
  /// <param name="mgForm"></param>
  /// <param name="ditIdx"></param>
  fillData(mgForm: MgFormBase, ditIdx: number): void {
    super.fillData(mgForm, ditIdx);
    this.ArgList = this.GetArgumentList();
  }

  /// <summary>
  ///   set the control attributes
  /// </summary>
  SetAttribute(attribute: string, valueStr: string): boolean {
    let isTagProcessed: boolean = super.SetAttribute(attribute, valueStr);
    if (!isTagProcessed) {
      switch (attribute) {
        case ConstInterface.MG_ATTR_SUBFORM_TASK:
          this._subformTaskId = valueStr;
          break;
        case ConstInterface.MG_ATTR_REFRESHON:
          this.refreshOnString = valueStr.trim();
          break;
        default:
          isTagProcessed = false;
          Logger.Instance.WriteExceptionToLogWithMsg(NString.Format("Unrecognized attribute: '{0}'", attribute));
          break;
      }
    }
    return isTagProcessed;
  }

  /// <summary>
  ///   Get select mode property
  /// </summary>
  GetSelectMode(): string {
    let SelectMode: string = Constants.SELPRG_MODE_BEFORE;
    // save the select mode
    let smTmp: string = super.GetComputedProperty(PropInterface.PROP_TYPE_SELECT_MODE).GetComputedValue();
    if (smTmp !== null)
      SelectMode = smTmp.charAt(0);

    return SelectMode;
  }

  /// <summary>
  ///   return a url of the help for this control
  /// </summary>
  getHelpUrl(): string {
    if (this._propTab === null)
      return null;
    let helpProp: Property = this._propTab.getPropById(PropInterface.PROP_TYPE_HELP_SCR);
    if (helpProp === null)
      return null;
    return helpProp.GetComputedValue();
  }

  /// <summary>
  /// build Argument list from the property
  /// </summary>
  private GetArgumentList(): ArgumentsList {
    let argList: ArgumentsList = null;
    if (this._propTab === null)
      return argList;
    let ArgListProp: Property = this._propTab.getPropById(PropInterface.PROP_TYPE_PARAMETERS);
    if (ArgListProp === null)
      return argList;

    let parms: string = ArgListProp.getValue();
    if (parms !== null) {
      argList = new ArgumentsList();
      argList.fillList(parms, <Task>super.getForm().getTask());
      if (this.refreshOnString !== null)
        argList.RefreshOnString = this.refreshOnString;
    }
    return argList;
  }

  /// <summary>
  ///   set the next control
  /// </summary>
  setNextCtrl(aCtrl: MgControl): void {
    this._nextCtrl = aCtrl;
  }

  /// <summary>
  ///   set the prev control
  /// </summary>
  setPrevCtrl(aCtrl: MgControl): void {
    this._prevCtrl = aCtrl;
  }

  /// <summary>
  ///   return true if this control is descendant of the parentForm
  /// </summary>
  /// <param name = "parentForm"></param>
  /// <returns></returns>
  isDescendent(parentForm: MgForm): boolean {
    let isDescendent: boolean = false;
    let checkCurrentForm: MgForm = <MgForm>super.getForm();

    Debug.Assert(parentForm !== null);

    while (!isDescendent && checkCurrentForm !== null) {
      if (parentForm === checkCurrentForm)
        isDescendent = true;

      else {
        let currTask: Task = <Task>checkCurrentForm.getTask();
        if (currTask.getParent() !== null)
          checkCurrentForm = <MgForm>currTask.getParent().getForm();
        else
          break;
      }
    }
    return isDescendent;
  }

  allowedParkRelatedToDirection(): boolean {
    let allowed: boolean = false;
    let checkForDirection: Task_Direction = Task_Direction.FORE;
    let allowDirection: number = super.GetComputedProperty(PropInterface.PROP_TYPE_ALLOWED_DIRECTION).GetComputedValueInteger();
    let lastparkedCtrl: MgControl = GUIManager.getLastFocusedControl();
    let form: MgForm = <MgForm>super.getForm();

    if (lastparkedCtrl !== null) {
      if (super.getForm().getTask() === lastparkedCtrl.getForm().getTask()) {
        // If currCtrl and lastParkedCtrl on same form, direction is BACK if LParkedCtrl tab order is
        // greater than currCtrl's and LastMoveInRowDirection is not MOVE_DIRECTION_NEXT.
        if (form.ctrlTabOrderIdx(lastparkedCtrl) > form.ctrlTabOrderIdx(this) && super.getForm().getTask().getLastMoveInRowDirection() !== Constants.MOVE_DIRECTION_NEXT)
          checkForDirection = Task_Direction.BACK;

        // #797851 - task has moveToNextRecord and we have tabbed from last ctrl and move to first ctrl of
        // next Rec. For this we have come from moveInView MOVE_DIR_DEGIN and must reset checkForDirection to FORE.
        if (checkForDirection === Task_Direction.BACK && super.getForm().getTask().getLastMoveInRowDirection() === Constants.MOVE_DIRECTION_BEGIN)
          checkForDirection = Task_Direction.FORE;
      }
      else if (this.onDiffForm(lastparkedCtrl)) {
        let lastparkedCtrlTabOrder: number = form.ctrlTabOrderIdx(lastparkedCtrl);

        // destination ctrl's form contains LP ctrl i.e destination ctrl (currCtrl) is always in the parent form
        // and lastparked ctrl is in one of it subforms. In such a case, we are moving from subform to parent form.
        if (lastparkedCtrlTabOrder > -1) {
          if (lastparkedCtrlTabOrder > form.ctrlTabOrderIdx(this))
            checkForDirection = Task_Direction.BACK;
        }
        else
        // LP form contains the destination ctrl.
        // Lastparked ctrl's form contains current ctrl i.e Lastparked ctrl is always on the parent form
        // and current ctrl is in one of it subforms. In such a case, we are moving from parent form to subform.
        if ((<MgForm>lastparkedCtrl.getForm()).ctrlTabOrderIdx(lastparkedCtrl) > (<MgForm>lastparkedCtrl.getForm()).ctrlTabOrderIdx(this))
          checkForDirection = Task_Direction.BACK;

        // #756675 - we may have got FLOW_BACK dir on taborderidx, but we have done tab from last
        // ctrl of subform and move to first ctrl of parent.
        if (checkForDirection === Task_Direction.BACK && lastparkedCtrl.getForm().getTask().getLastMoveInRowDirection() === Constants.MOVE_DIRECTION_NEXT)
          checkForDirection = Task_Direction.FORE;

        // #712538 - If we are moving from parent form to subform. we must check if direction satisfies with all
        // subformCtrl's allowdir property in path.
        let subformPathList: List<MgControlBase> = new List<MgControlBase>();
        ClientManager.Instance.EventsManager.buildSubformPath(subformPathList, lastparkedCtrl, this);

        // add current subformctrl onto pathlist
        // #981222 - Lastparked ctrl is always on the parent form i.e contains destination ctrl
        if (lastparkedCtrlTabOrder === -1) {
          if (super.getForm().isSubForm())
            subformPathList.push(<MgControl>((<MgFormBase>form).getSubFormCtrl()));
          else
          // fixed bug#:994239 if the form is frameform there is no subform.
          if (lastparkedCtrl.getForm().getSubFormCtrl() !== null)
            subformPathList.push(<MgControl>(<MgForm>lastparkedCtrl.getForm()).getSubFormCtrl());
        }

        let allowedSubformCtrl: boolean = true;

        let allowDirectionSubform: number = <number>AllowedDirectionType.Both;

        for (let i: number = 0; i < subformPathList.length; i++) {
          let subformCtrl: MgControl = <MgControl>subformPathList.get_Item(i);
          allowDirectionSubform = subformCtrl.GetComputedProperty(PropInterface.PROP_TYPE_ALLOWED_DIRECTION).GetComputedValueInteger();

          if ((allowDirectionSubform === <number>AllowedDirectionType.Both) ||
            ((checkForDirection === Task_Direction.FORE) &&
            (allowDirectionSubform === <number>AllowedDirectionType.Foreword)) ||
            ((checkForDirection === Task_Direction.BACK) &&
            (allowDirectionSubform === <number>AllowedDirectionType.Backward)))
            allowedSubformCtrl = true;
          else {
            allowedSubformCtrl = false;
            break;
          }
        }

        // return if dirMatch failed.
        if (!allowedSubformCtrl)
          return allowedSubformCtrl;
      }
    }

    // ALLOWED_DIRECTION_TYPE_BOTH = 1;
    // ALLOWED_DIRECTION_TYPE_FOREWORD = 2;
    // ALLOWED_DIRECTION_TYPE_BACKWARD = 3;

    if ((allowDirection === <number>AllowedDirectionType.Both) ||
      ((checkForDirection === Task_Direction.FORE) && (allowDirection === <number>AllowedDirectionType.Foreword)) ||
      ((checkForDirection === Task_Direction.BACK) && (allowDirection === <number>AllowedDirectionType.Backward)))
      allowed = true;

    return allowed;
  }

  /// <summary>
  ///   Refresh control display if it has a property which is an expression
  /// </summary>
  public refreshOnExpression(): void {
    let i: number;
    let size: number = (this._propTab === null ? 0 : this._propTab.getSize());
    let prop: Property;
    let refresh: boolean = false;

    for (i = 0; i < size && !refresh; i++) {
      prop = this._propTab.getProp(i);

      switch (prop.getID()) {
        case PropInterface.PROP_TYPE_DATA:
          if (!prop.isExpression() && this._field !== null && this._field.getTask() !== this.getForm().getTask()) {
            refresh = true;
            break;
          }
        /*  falls through */
        case PropInterface.PROP_TYPE_WIDTH:
        case PropInterface.PROP_TYPE_HEIGHT:
        case PropInterface.PROP_TYPE_LEFT:
        case PropInterface.PROP_TYPE_TOP:
        case PropInterface.PROP_TYPE_COLOR:
        case PropInterface.PROP_TYPE_FOCUS_COLOR:
        case PropInterface.PROP_TYPE_GRADIENT_COLOR:
        case PropInterface.PROP_TYPE_VISITED_COLOR:
        case PropInterface.PROP_TYPE_HOVERING_COLOR:
        case PropInterface.PROP_TYPE_FORMAT:
        case PropInterface.PROP_TYPE_VISIBLE:
        case PropInterface.PROP_TYPE_ENABLED:
        case PropInterface.PROP_TYPE_RANGE:
        case PropInterface.PROP_TYPE_TRANSLATOR:
          if (prop.isExpression())
            refresh = true;
          break;
        default:
          break;
      }
      if (refresh)
        this.RefreshDisplay();
    }
  }

  /// <summary>
  ///   get the next control
  /// </summary>
  /// <returns> the nextCtrl</returns>
  getNextCtrl(): MgControl {
    return this._nextCtrl;
  }

  /// <summary>
  /// </summary>
  getControlToFocus(): MgControl {
    let ctrl: MgControl = this;
    if (super.getField() !== null)
      ctrl = <MgControl>super.getField().ControlToFocus;

    return ctrl;
  }

  /// <summary>
  ///   get the prev control
  /// </summary>
  /// <returns> the prevCtrl</returns>
  getPrevCtrl(): MgControl {
    return this._prevCtrl;
  }

  invoke(): boolean;
  invoke(moveByTab: boolean, checkSubFormTabIntoProperty: boolean): boolean;
  invoke(moveByTab?: boolean, checkSubFormTabIntoProperty?: boolean): boolean {

    if (arguments.length === 0) {
      return this.invoke_0();
    }
    return this.invoke_1(moveByTab, checkSubFormTabIntoProperty);
  }

  /// <summary>
  ///   set this control as the current control and run its control prefix returns true if the control is
  ///   parkable and control prefix was executed (even if the perfix failed)
  /// </summary>
  private invoke_0(): boolean {
    return this.invoke(false, true);
  }

  /// <summary>
  ///   set this control as the current control and run its control prefix returns true if the control is
  ///   parkable and control perfix was executed (even if the perfix failed)
  /// </summary>
  /// <param name = "moveByTab">was then this control was invoked by TAB movement?</param>
  /// <param name="checkSubFormTabIntoProperty"></param>
  private invoke_1(moveByTab: boolean, checkSubFormTabIntoProperty: boolean): boolean {
    let invoked: boolean = false;

    // if the control is not visible, not enabled or not parkable skip this control
    if (this.isParkable_0(true, moveByTab, checkSubFormTabIntoProperty) && (this.IgnoreDirectionWhileParking || this.allowedParkRelatedToDirection())) {
      ClientManager.Instance.EventsManager.handleInternalEventWithMgControlBase(this, InternalInterface.MG_ACT_CTRL_PREFIX);
      invoked = true;
    }
    return invoked;
  }

  /// <summary>(internal)
  /// returns true if the control is parkable. Check enable, parkable and visibility
  /// </summary>
  /// <param name = "moveByTab">check parkability for TAB forward/backward operations</param>
  IsParkable(moveByTab: boolean): boolean {
    return this.isParkable_0(true, moveByTab, true);
  }

  isParkable(checkEnabledAndVisible: boolean, moveByTab: boolean): boolean {
    return this.isParkable_1(checkEnabledAndVisible, moveByTab);
  }

  isParkable_0(checkEnabledAndVisible: boolean, moveByTab: boolean, checkSubFormTabIntoProperty: boolean): boolean {
    let result: boolean = this.isParkable(checkEnabledAndVisible, moveByTab);

    // if this ctrl is on a subform, check if the subform is parkable
    // if this ctrl on frame form, check if the frame form is parkable
    // this check might be recursive if the subforms\frame form are recursive.
    if (result && (this.Form.isSubForm() || this.Form.getFrameFormCtrl() !== null)) {
      let containerControl: MgControlBase = this.Form.isSubForm() ? this.Form.getSubFormCtrl() : this.Form.getFrameFormCtrl();

      let lastParkedCtrl: MgControl = GUIManager.getLastFocusedControl();

      result = this.parkingIsAllowedOnSubform(containerControl);

      // If there is a switch between forms then only tabInto property must be checked of the container subform.
      if ((moveByTab && result && checkSubFormTabIntoProperty) && lastParkedCtrl !== null && super.getForm().getTask() !== lastParkedCtrl.getForm().getTask())
        result = this.tabIntoIsAllowedOnSubform(containerControl);
    }
    return result;
  }

  /// <summary>
  ///   returns the subform task id of the control
  /// </summary>
  getSubformTaskId(): string {
    return this._subformTaskId;
  }

  /// <summary>
  ///   find the subform task according to its id and save it
  /// </summary>
  initSubformTask(): void {
    if (super.isSubform())
      this._subformTask = <Task>Manager.MGDataTable.GetTaskByID(this._subformTaskId);
  }

  /// <summary>
  ///   Recursively check if the parking alowed on the subform.
  ///   Also, if this subform is inside a subform, check his parent subform as well.
  /// </summary>
  /// <param name = "subformCtrl">- The subform ctrl to check. can be frame form and also subform control</param>
  /// <returns></returns>
  private parkingIsAllowedOnSubform(subformCtrl: MgControlBase): boolean {
    let result: boolean = subformCtrl.checkProp(PropInterface.PROP_TYPE_ALLOW_PARKING, true);

    if (result) {
      let parentForm: MgFormBase = subformCtrl.getForm();
      if (parentForm !== null && parentForm.isSubForm())
        result = this.parkingIsAllowedOnSubform(parentForm.getSubFormCtrl());
    }

    return result;
  }

  /// <summary>
  ///   Recursively check if the tab into allowed on the subform. Also, if this subform is inside a subform,
  ///   check his parent subform as well.
  ///   subFormCtrl: can be frame form and also subform control
  /// </summary>
  /// <param name = "subFormCtrl">The subform ctrl to check.</param>
  /// <returns></returns>
  private tabIntoIsAllowedOnSubform(subFormCtrl: MgControlBase): boolean {
    let result: boolean = subFormCtrl.checkProp(PropInterface.PROP_TYPE_TAB_IN, true);

    if (result) {
      let parentForm: MgFormBase = subFormCtrl.getForm();
      if (parentForm !== null && parentForm.isSubForm())
        result = this.tabIntoIsAllowedOnSubform(parentForm.getSubFormCtrl());
    }

    return result;
  }

  /// <summary>
  ///   get the control's parentTable
  /// </summary>
  getParentTable(): MgControl {
    return <MgControl>this._parentTable;
  }

  /// <summary>
  ///   restore and display the old value of the control used when the control is not modifiable
  /// </summary>
  restoreOldValue(): void {
    if (this._field !== null)
      (<Field>this._field).updateDisplay();
    else {
      super.resetPrevVal();
      super.SetAndRefreshDisplayValue(this.Value, this.IsNull, false);
    }
  }

  /// <summary>
  ///   sets the event task
  /// </summary>
  setRtEvtTask(curTask: Task): void {
    this._rtEvtTask = curTask;
  }

  /// <summary>
  ///   returns the event task
  /// </summary>
  getRtEvtTask(): Task {
    return this._rtEvtTask;
  }

  /// <summary>
  ///   sets the subform task id of the control
  /// </summary>
  setSubformTaskId(taskId: string): void {
    this._subformTaskId = taskId;
  }

  /// <summary>
  ///   check if this control is part of data group
  /// </summary>
  /// <returns></returns>
  isPartOfDataGroup(): boolean {
    return this._siblingVec !== null && this._siblingVec.length > 0;
  }

  /// <summary>
  ///   get the next sibling control
  /// </summary>
  /// <returns></returns>
  getNextSiblingControl(): MgControl {
    let nextSiblingCtrl: MgControl = null;
    let myIndex: number = this.Form.getControlIdx(this);

    for (let i: number = 0; i < this._siblingVec.length && nextSiblingCtrl === null; i++) {
      let ctrl: MgControl = <MgControl>this._siblingVec.get_Item(i);
      if (this.Form.getControlIdx(ctrl) > myIndex)
        nextSiblingCtrl = ctrl;
    }
    return nextSiblingCtrl;
  }

  /// <summary>
  ///   get the next sibling control
  /// </summary>
  /// <returns></returns>
  getPrevSiblingControl(): MgControl {
    let prevSiblingCtrl: MgControl = null;
    let myIndex: number = this.Form.getControlIdx(this);
    let i: number;

    for (i = this._siblingVec.length - 1; i >= 0 && prevSiblingCtrl === null; i--) {
      let ctrl: MgControl = <MgControl>this._siblingVec.get_Item(i);
      if (this.Form.getControlIdx(ctrl) < myIndex)
        prevSiblingCtrl = ctrl;
    }

    return prevSiblingCtrl;
  }

  /// <summary>
  /// resetDisplayToPrevVal : set the control to its previous value and display it.
  /// also, put all the text into selection (like we first entered the control).
  /// </summary>
  resetDisplayToPrevVal(): void {
    super.resetPrevVal(); // force update of the display
    super.RefreshDisplay();
    Manager.SetSelection(this, 0, -1, -1);
  }

  /// <summary>
  ///   enable/disable actions and states for Text control
  /// </summary>
  enableTextAction(enable: boolean): void {
    if (super.isTextControl()) {
      let task: Task = <Task>super.getForm().getTask();
      task.setKeyboardMappingState(Constants.ACT_STT_EDT_EDITING, enable);
      task.ActionManager.enableEditingActions(enable);

      if (super.isMultiline()) {
        task.ActionManager.enableMLEActions(enable);

        if (enable) {
          let allowCR: boolean = (super.getProp(PropInterface.PROP_TYPE_MULTILINE_ALLOW_CR)).getValueBoolean();
          task.ActionManager.enable(InternalInterface.MG_ACT_EDT_BEGNXTLINE, allowCR);
        }
      }
      task.ActionManager.enable(InternalInterface.MG_ACT_CLIP_PASTE, enable && super.IsPasteAllowed());
    }
  }

  /// <summary>
  ///   change selected item of tab control
  /// </summary>
  /// <param name = "direction"></param>
  changeSelection(direction: string): void {
    let layers: number[] = super.getCurrentIndexOfChoice();
    let currLayer: number = layers[0];
    let maxLayer: number = super.getMaxDisplayItems();

    if (direction === Constants.MOVE_DIRECTION_NEXT) {
      currLayer++;
      if (currLayer >= maxLayer)
        currLayer = 0;
    }
    else if (direction === Constants.MOVE_DIRECTION_PREV) {
      currLayer--;
      if (currLayer < 0)
        currLayer = maxLayer - 1;
    }
    else
      Debug.Assert(false);
    let val: string = currLayer.toString();
    ClientManager.Instance.EventsManager.simulateSelection(this, val, 0, false);
  }

  /// <summary>
  ///   returns stopExecution flag in the end of handle focus on the control
  /// </summary>
  /// <returns></returns>
  isFocusedStopExecution(): boolean {
    return this._focusedStopExecution;
  }

  /// <summary>
  ///   remember stopExecution flag in the end of handle focus on the control
  /// </summary>
  /// <param name = "focusedStopExecution"></param>
  setFocusedStopExecution(focusedStopExecution: boolean): void {
    this._focusedStopExecution = focusedStopExecution;
  }

  /// <param name = "ctrl-">The ctrl to check. can be frame form and also subform control
  /// </param>
  /// <returns></returns>
  onTheSameSubFormControl(ctrl: MgControl): boolean {
    let retValue: boolean = false;
    if (ctrl !== null) {
      if (super.getForm().isSubForm() && ctrl.getForm().isSubForm()) {
        if (super.getForm().getTask() === ctrl.getForm().getTask())
          retValue = true;
      }
      else if (super.getForm().getFrameFormCtrl() !== null && ctrl.getForm().getFrameFormCtrl() !== null) {
        if (super.getForm().getTask() === ctrl.getForm().getTask())
          retValue = true;
      }
    }
    return retValue;
  }

  /// <summary>
  ///   true if the ctrls are on different forms
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <returns></returns>
  onDiffForm(ctrl: MgControl): boolean {
    let isSubform: boolean = super.getForm().isSubForm() || ctrl.getForm().isSubForm();
    let isFrameForm: boolean = super.getForm().getFrameFormCtrl() !== null || ctrl.getForm().getFrameFormCtrl() !== null;
    let isOnDiffForm: boolean = (isSubform || isFrameForm) && !this.onTheSameSubFormControl(ctrl);

    return isOnDiffForm;
  }

  /// <summary>
  ///   true if control is in control suffix
  /// </summary>
  /// <returns></returns>
  isInControlSuffix(): boolean {
    return this._inControlSuffix;
  }

  /// <summary>
  ///   set true if control is in control suffix
  /// </summary>
  /// <param name = "inControlSuffix"></param>
  setInControlSuffix(inControlSuffix: boolean): void {
    this._inControlSuffix = inControlSuffix;
  }

  /// <summary>
  ///   return true if the control has select program
  /// </summary>
  HasSelectProgram(): boolean {
    let HasSelectProgram: boolean = false;
    let selectProgProp: Property = super.GetComputedProperty(PropInterface.PROP_TYPE_SELECT_PROGRAM);
    if (selectProgProp !== null && selectProgProp.GetComputedValue() !== null)
      HasSelectProgram = true;

    return HasSelectProgram;
  }

  /// <summary>
  ///   return true if the control use the handler ZOOM (for select program or Zoom handler)
  /// </summary>
  /// <returns></returns>
  useZoomHandler(): boolean {
    return this.HasZoomHandler || (super.getField() !== null && ((<Field>super.getField()).getHasZoomHandler() || (this.HasSelectProgram() && this.GetSelectMode() !== Constants.SELPRG_MODE_PROMPT)));
  }

  /// <summary>
  ///   returns the next control depending upon direction
  /// </summary>
  /// <param name = "direction"></param>
  /// <returns></returns>
  getNextCtrlOnDirection(direction: Task_Direction): MgControl {
    let nextCtrlOnDir: MgControl = null;

    if (direction === Task_Direction.FORE)
      nextCtrlOnDir = this._nextCtrl;
    else if (direction === Task_Direction.BACK)
      nextCtrlOnDir = this._prevCtrl;

    return nextCtrlOnDir;
  }

  /// <summary>
  ///   return TRUE if PROP_TYPE_PARK_ON_CLICK exists for the control type
  /// </summary>
  /// <returns></returns>
  propParkOnClickExists(): boolean {
    return this._propTab.propExists(PropInterface.PROP_TYPE_PARK_ON_CLICK);
  }

  /// <summary>
  ///   Compares taborder of two controls based on combined taborder of all forms.
  ///   Outputs :
  ///   less than zero - ctrl1 is less than ctrl2.
  ///   Greater than zero - ctrl1 is greater than ctrl2.
  ///   equal to Zero - if equal or not on same taborder.
  /// </summary>
  /// <param name = "ctrl1"></param>
  /// <param name = "ctrl2"></param>
  /// <returns></returns>
  static CompareTabOrder(ctrl1: MgControl, ctrl2: MgControl): number {
    let result: number = 0;

    if (ctrl1 === ctrl2 || ctrl1.getTopMostForm() !== ctrl2.getTopMostForm())
      return result;

    let ctrl: MgControl = ctrl1;
    result = 1; // assume ctrl1 > ctrl2

    // traverse till the end till we get ctrl2
    while (ctrl !== null) {
      if (ctrl === ctrl2) {
        result = -1;
        break;
      }
      ctrl = ctrl.getNextCtrl();
    }
    return result;
  }

  /// <summary>
  ///   Update boolean property(ex:visible\enable) of control and it's children
  /// </summary>
  /// <param name = "propId">property id </param>
  /// <param name = "commandType">command type that belong to the prop id</param>
  /// <param name = "val"></param>
  /// <param name = "updateThis"></param>
  updatePropertyLogicNesting(propId: number, commandType: CommandType, val: boolean, updateThis: boolean): void {
    if (val && super.haveToCheckParentValue())
      val = super.isParentPropValue(propId);

    // if the subform must be invisible (CTRL_SUBFORM_NONE) we change its visibility to false
    if (val && super.isSubform() && commandType === CommandType.PROP_SET_VISIBLE && this.ShouldSetSubformInvisible())
      val = false;

    if (updateThis) {
      Commands.addOperationWithLine(CommandType.SET_PROPERTY, this, super.getDisplayLine(false),
        commandType === CommandType.PROP_SET_VISIBLE ? "visible" : "enabled", val );

      // if (commandType === CommandType.PROP_SET_VISIBLE)
      //   Commands.addAsync(commandType, this, super.getDisplayLine(false), val, !super.IsFirstRefreshOfProps());
      // else
      //   Commands.addAsync(commandType, this, super.getDisplayLine(false), val);
    }
    super.updateChildrenPropValue(propId, commandType, val);
  }

  /// <summary>
  /// If the subform must be invisible (for example CTRL_SUBFORM_NONE) returns true.
  /// </summary>
  /// <returns></returns>
  private ShouldSetSubformInvisible(): boolean {
    let setInvisible: boolean = false;
    let subformType: SubformType = <SubformType>super.GetComputedProperty(PropInterface.PROP_TYPE_SUBFORM_TYPE).GetComputedValueInteger();
    if (subformType === SubformType.None && this.getSubformTaskId() === null)
      setInvisible = true;
    return setInvisible;
  }

  /// <summary>
  ///   Updates visibility or enable property of subform controls
  /// </summary>
  /// <param name = "propId">Id of visibility or enable property</param>
  /// <param name = "commandType">type of the GUI command</param>
  /// <param name = "val">value for the property</param>
  updateSubformChildrenPropValue(propId: number, commandType: CommandType, val: boolean): void {
    Debug.Assert(super.isSubform());

    if (!(<Task>super.getForm().getTask()).AfterFirstRecordPrefix)
      return;

    let subformType: SubformType = <SubformType>super.GetComputedProperty(PropInterface.PROP_TYPE_SUBFORM_TYPE).GetComputedValueInteger();
    if (this._subformTaskId !== null || subformType === SubformType.None) {
      if (this._subformTask !== null && this._subformTask.isStarted()) {
        this.SubformLoaded = true;
        if (commandType === CommandType.PROP_SET_VISIBLE && val && this.RefreshOnVisible) {
          this.RefreshOnVisible = false;
          (<Task>super.getForm().getTask()).SubformRefresh(this._subformTask, true);
        }

        let subformForm: MgFormBase = this._subformTask.getForm();
        for (let i: number = 0; i < subformForm.getCtrlCount(); i++) {
          let child: MgControlBase = subformForm.getCtrl(i);
          // QCR #981555, We should not affect visibility of the TableColumns since it is managed by the table.Setting visibility
          // of all columns to false prevents table placement
          if (!child.isColumnControl())
            continue;
          let childValue: boolean = child.checkProp(propId, true) && val;
          if (childValue)
            childValue = child.isParentPropValue(propId);

          if (this._subformTask.isStarted())
            Commands.addAsync(commandType, child, child.getDisplayLine(false), childValue);
          child.updateChildrenPropValue(propId, commandType, childValue);
        }
      }
    }
    else if ((commandType === CommandType.PROP_SET_VISIBLE && val) && !this.SubformLoaded) {
      this.SubformLoaded = true;
      ClientManager.Instance.EventsManager.handleInternalEventWithMgControlBase(this, InternalInterface.MG_ACT_SUBFORM_OPEN);
    }
  }

  /// <summary>
  /// Set subform task id for a subform control
  /// </summary>
  Init(): void {
    this.initSubformTask();
  }

  /// <summary>
  /// get the behaviour for the table control
  /// </summary>
  /// <returns></returns>
  GetTableBehaviour(): TableBehaviour {
    return TableBehaviour.UnlimitedItems;
  }

  /// <summary> returns true if the control is parkable </summary>
  /// <param name = "checkEnabledAndVisible">check enabled and visible properties too</param>
  /// <param name = "moveByTab">check parkability for TAB forward/backward operations</param>
  private isParkable_1(checkEnabledAndVisible: boolean, moveByTab: boolean): boolean {
    let result: boolean = !super.isImageControl();
    if (result) {
      // In RC we need to evaluate expressions of following properties
      // because in isParkable method we use already computed property values.
      if (moveByTab) {
        super.checkProp(PropInterface.PROP_TYPE_TAB_IN, true);
      }
      super.checkProp(PropInterface.PROP_TYPE_ENABLED, true);
      super.checkProp(PropInterface.PROP_TYPE_ALLOW_PARKING, true);
      super.checkProp(PropInterface.PROP_TYPE_VISIBLE, true);
      result = super.isParkable(checkEnabledAndVisible, moveByTab);
    }

    return result;
  }

  /// <summary>
  /// </summary>
  /// <param name = "recIdx"></param>
  /// <returns></returns>
  getFieldXML(recIdx: number): string {
    if (recIdx < 0)
      return "";
    else {
      let rec: Record = (<DataView>super.getForm().getTask().DataView).getRecByIdx(recIdx);
      return rec.getFieldDataXML(this._nodeIdField.getId(), false);
    }
  }

  /// <summary>
  ///   get xml from parent field
  /// </summary>
  /// <param name = "recIdx"></param>
  /// <returns></returns>
  getParentFieldXML(recIdx: number): string {
    if (recIdx < 0)
      return "";
    let rec: Record = (<DataView>super.getForm().getTask().DataView).getRecByIdx(recIdx);
    return rec.getFieldDataXML(this._nodeParentIdField.getId(), false);
  }

  /// <summary>
  ///   validate the value of the control and set it's value
  /// </summary>
  /// <param name = "NewValue">the value of the control</param>
  /// <param name = "updateCtrl">if true then the control will be updated upon successful check</param>
  /// <returns>returns if validation is successful</returns>
  validateAndSetValue(NewValue: any, updateCtrl: boolean): boolean {
    super.UpdateModifiedByUser(NewValue);

    // if the value of the control is null or was changed
    // check validation and update the control value
    if (this.ModifiedByUser) {
      let ctrlCurrValue: any = this.Value;
      let vd: ValidationDetails;

      if (super.getPIC() === null)
        return true;
      vd = super.buildPicture(ctrlCurrValue, NewValue);

      vd.evaluate();

      // the validation of the fields value was wrong
      if (vd.ValidationFailed) {
        this.ModifiedByUser = false;
        return false;
      }

      this.IsInteractiveUpdate = true;

      super.getForm().getTask().setDataSynced(false);

      // set the value (handle recompute, etc.)
      if (updateCtrl) {
        // QCR#441020:After validating display value, take the same ctrl's value for mg value conversion.
        // Using display value generated from MgValue, might have problem to convert back to MgVal using picture due to alignment (changed alignment ).
        // This problem occurs for numeric.
        // The fix should be applicable for numeric type only. Because date and time field with complex masking have problem on using ctrl's value.
        // Refer date qcrs: #291666, #307353, #434241 and for time, check default value when format is 'HH-MM-SS PMZ@'
        if (this._field !== null && this._field.getType() === StorageAttribute.NUMERIC && typeof NewValue === 'string' && NewValue.trim().length > 0)
          vd.setValue(NewValue);

        this.setValue(vd);
      }
    }
    // the value of control wasn't changed
    else {
      if (super.checkProp(PropInterface.PROP_TYPE_MUST_INPUT, false) && super.isModifiable()) {
        // the value of control with must input property wasn't changed
        Manager.WriteToMessagePanebyMsgId(super.getForm().getTask(), MsgInterface.RT_STR_FLD_MUST_UPDATED, false);
        return false;
      }
    }
    return true;
  }

  /// <summary>
  ///   set the value received from the user input after validation and update the field connected to this
  ///   control (if exists)
  /// </summary>
  /// <param name = "vd">the validation details object</param>
  private setValue(vd: ValidationDetails): void {
    let isNull: boolean = vd.getIsNull();
    let newValue: any = vd.getDispValue();
    let mgVal: string;

    if (!isNull || !this._field.hasNullDisplayValue())
      mgVal = super.getMgValue(newValue);
    // it's inner value -> translate it to the display
    else
      mgVal = ((this._field.getType() === StorageAttribute.BLOB_VECTOR) ? this._field.getCellDefualtValue() : this._field.getDefaultValue());
    if (mgVal !== null) {
      if (this._field !== null && (!(newValue === this.Value) || this.KeyStrokeOn || this.IsNull !== isNull)) {
        (<Field>this._field).setValueAndStartRecompute(mgVal, isNull, true, true, false);

        // defect 127734 : value of the field might be changed already inside a control change handler
        // to avoid updating old value and overrunning the value fr0m the control change
        // get the value from the field. (need to be done for combo and list box, but it's too risky
        // and unlikely to happen, so the fix will be for check box only)
        if (super.isCheckBox())
          mgVal = (<Field>this._field).getValue(false);
      }
      // if field value is null & has null display value, take evaluated null display value.
      if ((this._field !== null && isNull) && this._field.hasNullDisplayValue())
        mgVal = newValue;

      super.SetAndRefreshDisplayValue(mgVal, isNull, false);
      // QCR #438753. Prevent RP&RS cycle, when it's not needed.
      this.KeyStrokeOn = false;
    }
  }

  /// <summary> refresh the item list of radio button </summary>
  /// <param name="execComputeChoice"></param>
  refreshAndSetItemsListForRadioButton(line: number, execComputeChoice: boolean): void {
    super.refreshAndSetItemsListForRadioButton(line, execComputeChoice);

    // If the parking was on the radio control, we need to reset the focus because
    // the old controls were disposed and the new ones are created.
    let lastFocusedTask: Task = ClientManager.Instance.getLastFocusedTask((<Task>super.getForm().getTask()).getMgdID());
    if (lastFocusedTask !== null && this === lastFocusedTask.getLastParkedCtrl())
      Commands.addAsync(CommandType.SET_FOCUS, this);
  }

  /// <summary>
  ///   returns the subform task of this subform control
  /// </summary>
  getSubformTask(): Task {
    return this._subformTask;
  }

  /// <summary>
  /// returns MgForm of the subform control task
  /// </summary>
  GetSubformMgForm(): MgFormBase {
    let form: MgFormBase = null;
    if (this._subformTask !== null)
      form = this._subformTask.getForm();
    return form;
  }

  /// <summary>
  /// Check whether table being used with absolute scrollbar thumb.
  /// </summary>
  IsTableWithAbsoluteScrollbar(): boolean {
    let tableWithAbsoluteScrollbar: boolean = false;
    Debug.Assert(this.Type === MgControlType.CTRL_TYPE_TABLE, "In MgControl.IsTableWithAbsoluteScrollbar(): Not a table control.");
    if (this._propTab.propExists(PropInterface.PROP_TYPE_SCROLL_BAR_THUMB))
      tableWithAbsoluteScrollbar = (this._propTab.getPropById(PropInterface.PROP_TYPE_SCROLL_BAR_THUMB).GetComputedValueInteger() === <number>ScrollBarThumbType.Absolute);

    return tableWithAbsoluteScrollbar;
  }
}
