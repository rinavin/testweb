import {Char, IComparable, Int32, List, NString, StringBuilder} from "@magic/mscorelib";
import {ForceExit, InternalInterface, Priority, XMLConstants, XmlParser} from "@magic/utils";
import {
  LastFocusedVal,
  MenuEntryEvent,
  MenuEntryOSCommand,
  MenuEntryProgram,
  MgControlBase,
  Modifiers,
  Property,
  PropInterface,
} from "@magic/gui";
import {EventSubType} from "../enums";
import {Event} from "./Event";
import {ConstInterface} from "../ConstInterface";
import {ArgumentsList} from "../rt/ArgumentsList";
import {MgControl} from "../gui/MgControl";
import {Field} from "../data/Field";
import {Task} from "../tasks/Task";
import {MGData} from "../tasks/MGData";
import {MGDataCollection} from "../tasks/MGDataCollection";

/// <summary>
///   this class represents the runtime events
/// </summary>
export class RunTimeEvent extends Event implements IComparable {

  // ATTENTION !
  // any change to the member variables must be followed by a change to the CTOR that
  // gets one argument of the type 'Event' and one argument of the type 'RunTimeEvent'.

  private _controlsList: List<MgControlBase> = null; // list of controls
  private _direction: number = 0;
  private _displayLine: number = Int32.MinValue;
  private _menuComp: number = 0;
  private _menuUid: number = 0;

  private _eventSubType: EventSubType = EventSubType.Normal;

  private _actEnableList: number[] = null;
  private _argList: ArgumentsList = null;
  private _ctrl: MgControl = null; // the control on which the event was triggered
  private _dotNetObject: any = null; // object key of a control
  private _eventFld: Field = null; // For variable events - the field on which the control was triggered
  private _fromServer: boolean = false;  // if TRUE, the event was created on the server and sent to the client
  private _guiTriggeredEvent: boolean = false; // if true, the event was triggered by GUI level (includes timer events)
  private _immediate: boolean = false;
  private _isIdleTimer: boolean = false;
  private _isRealRefresh: boolean = true; // used only in MG_ACT_VIEW_REFRESH events to indicate a refresh invoked Specifically by the user
  private _mgdId: number = 0; // mgdata id that sent timer event
  private _routeParams: List<any> = null;

  // Used only if 'task' is a main prg. A reference to the task which
  // caused the main prg to become active in the runtime.
  private _mprgCreator: Task = null;

  private _priority: Priority = Priority.HIGH; // priority of event for events queue

  private _produceClick: boolean = false; // if TRUE, the event should produce click
  private _reversibleExit: boolean = true;

  private _selectionEnd: number = 0;
  private _selectionStart: number = 0;
  private _sendAll: boolean = false;  // this flag is set for sending all records
  private _task: Task = null; // a reference to the task
  private _taskTag: string = null; // the task id on which the event was triggered
  private _val: any = null;

  IsSubTree: boolean = false;
  IsFormFocus: boolean = false;

  ActivatedFromMDIFrame: boolean = false;
  PrgFlow: string = '\0';
  CopyGlobalParams: boolean = false;
  MainProgVars: List<string> = null;


  set Control(value: MgControl) {
    this._ctrl = value;
  }

  get Control(): MgControl {
    return this._ctrl;
  }

  /// <summary>
  /// Should the control set on the event be ignored. if true, when processing the event we should
  /// use the current focused control instead of the one set on the event.
  /// </summary>
  IgnoreSpecifiedControl: boolean = false;

  LastFocusedVal: LastFocusedVal = null; // value of last edited control

  get ControlsList(): List<MgControlBase> {
    return this._controlsList;
  }

  get Direction(): number {
    return this._direction;
  }

  constructor(taskRef: Task);
  constructor(taskRef: Task, ctrlRef: MgControl);
  constructor(ctrlRef: MgControl);
  constructor(ctrlRef: MgControl, guiTriggeredEvent: boolean);
  constructor(ctrlRef: MgControl, guiTriggeredEvent: boolean, ignoreSpecifiedControl: boolean);
  constructor(taskref: Task, guiTriggeredEvent: boolean);
  constructor(fldRef: Field);
  constructor(ctrlRef: MgControl, line: number);
  constructor(ctrlRef: MgControl, line: number, guiTriggeredEvent: boolean);
  constructor(ctrlRef: MgControl, controlsList: List<MgControlBase>, guiTriggeredEvent: boolean);
  constructor(ctrlRef: MgControl, direction: number, line: number);
  constructor(ctrlRef: MgControl, columnHeader: string, x: number, y: number, width: number, height: number);
  constructor(evt: Event, rtEvt: RunTimeEvent);
  constructor(menuEntryEvent: MenuEntryEvent, currentTask: Task, control: MgControl, ctlIdx: number);
  constructor(menuEntryProgram: MenuEntryProgram, currentTask: Task, activatedFromMDIFrame: boolean);
  constructor(osCommand: MenuEntryOSCommand, currentTask: Task);
  constructor(rtEvt: RunTimeEvent);
  constructor(taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand: any, ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask?: any, ignoreSpecifiedControlOrGuiTriggeredEventOrLineOrXOrControlOrActivatedFromMDIFrame?: any, yOrCtlIdx?: number, width?: number, height?: number) {
    super();
    if (arguments.length === 1 && (taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand === null || taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand instanceof Task))
      this.constructor_5(taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand);

    else if (arguments.length === 2 && (taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand === null || taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand instanceof Task) && (ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask === null || ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask instanceof MgControl))
      this.constructor_6(taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand, ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask);

    else if (arguments.length === 1 && (taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand === null || taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand instanceof MgControl))
      this.constructor_7(taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand);

    else if (arguments.length === 2 && (taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand === null || taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand instanceof MgControl) && (ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask === null || ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask.constructor === Boolean))
      this.constructor_8(taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand, ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask);

    else if (arguments.length === 3 && (taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand === null || taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand instanceof MgControl) && (ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask === null || ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask.constructor === Boolean) && (ignoreSpecifiedControlOrGuiTriggeredEventOrLineOrXOrControlOrActivatedFromMDIFrame === null || ignoreSpecifiedControlOrGuiTriggeredEventOrLineOrXOrControlOrActivatedFromMDIFrame.constructor === Boolean))
      this.constructor_9(taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand, ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask, ignoreSpecifiedControlOrGuiTriggeredEventOrLineOrXOrControlOrActivatedFromMDIFrame);

    else if (arguments.length === 2 && (taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand === null || taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand instanceof Task) && (ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask === null || ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask.constructor === Boolean))
      this.constructor_10(taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand, ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask);

    else if (arguments.length === 1 && (taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand === null || taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand instanceof Field))
      this.constructor_11(taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand);

    else if (arguments.length === 2 && (taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand === null || taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand instanceof MgControl) && (ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask === null || ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask.constructor === Number))
      this.constructor_12(taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand, ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask);

    else if (arguments.length === 3 && (taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand === null || taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand instanceof MgControl) && (ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask === null || ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask.constructor === Number) && (ignoreSpecifiedControlOrGuiTriggeredEventOrLineOrXOrControlOrActivatedFromMDIFrame === null || ignoreSpecifiedControlOrGuiTriggeredEventOrLineOrXOrControlOrActivatedFromMDIFrame.constructor === Boolean))
      this.constructor_13(taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand, ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask, ignoreSpecifiedControlOrGuiTriggeredEventOrLineOrXOrControlOrActivatedFromMDIFrame);

    else if (arguments.length === 3 && (taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand === null || taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand instanceof MgControl) && (ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask === null || ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask instanceof List) && (ignoreSpecifiedControlOrGuiTriggeredEventOrLineOrXOrControlOrActivatedFromMDIFrame === null || ignoreSpecifiedControlOrGuiTriggeredEventOrLineOrXOrControlOrActivatedFromMDIFrame.constructor === Boolean))
      this.constructor_14(taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand, ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask, ignoreSpecifiedControlOrGuiTriggeredEventOrLineOrXOrControlOrActivatedFromMDIFrame);

    else if (arguments.length === 3 && (taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand === null || taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand instanceof MgControl) && (ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask === null || ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask.constructor === Number) && (ignoreSpecifiedControlOrGuiTriggeredEventOrLineOrXOrControlOrActivatedFromMDIFrame === null || ignoreSpecifiedControlOrGuiTriggeredEventOrLineOrXOrControlOrActivatedFromMDIFrame.constructor === Number))
      this.constructor_15(taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand, ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask, ignoreSpecifiedControlOrGuiTriggeredEventOrLineOrXOrControlOrActivatedFromMDIFrame);

    else if (arguments.length === 6)
      this.constructor_16(taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand, ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask, ignoreSpecifiedControlOrGuiTriggeredEventOrLineOrXOrControlOrActivatedFromMDIFrame, yOrCtlIdx, width, height);

    else if (arguments.length === 2 && (taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand === null || taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand instanceof Event) && (ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask === null || ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask instanceof RunTimeEvent))
    {
      // Call base class constructor to initialize the event type and the other fields
      super (taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand);
      this.constructor_17(taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand, ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask);
    }

    else if (arguments.length === 4)
      this.constructor_18(taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand, ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask, ignoreSpecifiedControlOrGuiTriggeredEventOrLineOrXOrControlOrActivatedFromMDIFrame, yOrCtlIdx);

    else if (arguments.length === 3 && (taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand === null || taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand instanceof MenuEntryProgram) && (ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask === null || ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask instanceof Task) && (ignoreSpecifiedControlOrGuiTriggeredEventOrLineOrXOrControlOrActivatedFromMDIFrame === null || ignoreSpecifiedControlOrGuiTriggeredEventOrLineOrXOrControlOrActivatedFromMDIFrame.constructor === Boolean))
      this.constructor_19(taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand, ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask, ignoreSpecifiedControlOrGuiTriggeredEventOrLineOrXOrControlOrActivatedFromMDIFrame);

    else if (arguments.length === 1 && taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand instanceof RunTimeEvent)
      Object.assign(this, taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand);
    else
      this.constructor_20(taskRefOrCtrlRefOrTaskrefOrFldRefOrEvtOrMenuEntryEventOrMenuEntryProgramOrOsCommand, ctrlRefOrGuiTriggeredEventOrLineOrControlsListOrDirectionOrColumnHeaderOrRtEvtOrCurrentTask);
  }

  /// <summary>
  ///   CTOR
  /// </summary>
  /// <param name = "taskRef">a reference to the task</param>
  private constructor_5(taskRef: Task): void {
    this.init(taskRef);
  }

  /// <summary>
  ///   CTOR
  /// </summary>
  /// <param name = "taskRef">reference to task</param>
  /// <param name = "ctrlRef">reference to control</param>
  private constructor_6(taskRef: Task, ctrlRef: MgControl): void {
    this.constructor_5((ctrlRef !== null) ? (<Task>ctrlRef.getForm().getTask()) : taskRef);
    this.Control = ctrlRef;
  }

  /// <summary>
  ///   CTOR
  /// </summary>
  /// <param name = "ctrlRef">a reference to the control </param>
  private constructor_7(ctrlRef: MgControl): void {
    this.constructor_6(null, ctrlRef);
    if (ctrlRef !== null && super.getType() === Char.MinValue) // not initialized yet
    {
      // on the first time, if a TRIGGER property exists, parse the event and add it to the control
      let prop: Property = ctrlRef.GetComputedProperty(PropInterface.PROP_TYPE_TRIGGER);
      if (prop !== null) {
        let xmlParser: XmlParser = new XmlParser(prop.GetComputedValue());
        super.fillData(xmlParser, <Task>ctrlRef.getForm().getTask());
      }
    }
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="ctrlRef"></param>
  /// <param name="guiTriggeredEvent"></param>
  private constructor_8(ctrlRef: MgControl, guiTriggeredEvent: boolean): void {
    this.constructor_7(ctrlRef);
    this._guiTriggeredEvent = guiTriggeredEvent;
    if (guiTriggeredEvent) {
      // Events that are triggered by GUI level, must be executed after all
      // other events, thus thay have low priority;
      this._priority = Priority.LOW;
    }
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="ctrlRef"></param>
  /// <param name="guiTriggeredEvent"></param>
  private constructor_9(ctrlRef: MgControl, guiTriggeredEvent: boolean, ignoreSpecifiedControl: boolean): void {
    this.constructor_8(ctrlRef, guiTriggeredEvent);
    this.IgnoreSpecifiedControl = ignoreSpecifiedControl;
  }

  /// <summary>
  ///   CTOR
  /// </summary>
  /// <param name = "taskref">reference to task</param>
  /// <param name = "guiTriggeredEvent"></param>
  private constructor_10(taskref: Task, guiTriggeredEvent: boolean): void {
    this.constructor_5(taskref);
    this._guiTriggeredEvent = guiTriggeredEvent;
    if (guiTriggeredEvent) {
      this._priority = Priority.LOW;
    }
  }

  /// <summary>
  ///   CTOR
  /// </summary>
  /// <param name = "fldRef">a reference to the field</param>
  private constructor_11(fldRef: Field): void {
    this._eventFld = fldRef;
    this.init((fldRef !== null) ? (<Task>fldRef.getTask()) : null);
  }

  /// <summary>
  ///   CTOR
  /// </summary>
  /// <param name = "ctrlRef">a reference to the control on which the event occured </param>
  /// <param name = "line">the line of the table in which the control is located </param>
  private constructor_12(ctrlRef: MgControl, line: number): void {
    this.constructor_7(ctrlRef);
    this._displayLine = line;
  }

  private constructor_13(ctrlRef: MgControl, line: number, guiTriggeredEvent: boolean): void {
    this.constructor_8(ctrlRef, guiTriggeredEvent);
    this._displayLine = line;
  }

  private constructor_14(ctrlRef: MgControl, controlsList: List<MgControlBase>, guiTriggeredEvent: boolean): void {
    this.constructor_8(ctrlRef, guiTriggeredEvent);
    this._controlsList = controlsList;
  }

  private constructor_15(ctrlRef: MgControl, direction: number, line: number): void {
    this.constructor_8(ctrlRef, true);
    this._direction = direction;
  }

  private constructor_16(ctrlRef: MgControl, columnHeader: string, x: number, y: number, width: number, height: number): void {
    this.constructor_8(ctrlRef, true);
  }

  /// <summary>
  ///   CTOR - creates a new run time event by copying the member variables of a given
  ///   event and the member variables of a given run time event
  /// </summary>
  /// <param name = "evt">a reference to the event to be used </param>
  /// <param name = "rtEvt">a reference to the run time event to be used </param>
  private constructor_17(evt: Event, rtEvt: RunTimeEvent): void {
    this._taskTag = rtEvt._taskTag;
    this._task = rtEvt._task;
    this.Control = rtEvt.Control;
    this._eventFld = rtEvt._eventFld;
    this._mgdId = rtEvt._mgdId;
    this._displayLine = rtEvt._displayLine;
    this._reversibleExit = rtEvt._reversibleExit;
    this._argList = rtEvt._argList;
    this._immediate = rtEvt._immediate;
    this._mprgCreator = rtEvt._mprgCreator;
    this._priority = rtEvt._priority;
    this._guiTriggeredEvent = rtEvt._guiTriggeredEvent;
    this._isIdleTimer = rtEvt._isIdleTimer;
    this._val = rtEvt._val;
    this._selectionStart = rtEvt._selectionStart;
    this._selectionEnd = rtEvt._selectionEnd;
    this._controlsList = rtEvt._controlsList;
    this._direction = rtEvt._direction;
    this._dotNetObject = rtEvt._dotNetObject;
    this.LastFocusedVal = rtEvt.LastFocusedVal;
    this._routeParams = rtEvt._routeParams;
  }

  /// <summary>
  ///   This constructor creates a matching event object for the passed menuEntryEvent
  /// </summary>
  /// <param name = "menuEntryEvent">event menu entry for which we create this event</param>
  /// <param name = "currentTask">current task from which the menu entry was activated</param>
  /// <param name = "control"></param>
  private constructor_18(menuEntryEvent: MenuEntryEvent, currentTask: Task, control: MgControl, ctlIdx: number): void {
    this._task = currentTask;
    this._taskTag = currentTask.getTaskTag();
    this.Control = control;
  }

  /// <summary>
  ///   Create an Event for the passed program menu entry
  /// </summary>
  /// <param name = "menuEntryProgram">the selected program menu entry</param>
  /// <param name = "currentTask">the task from which the menu was activated</param>
  /// <param name = "activatedFromMDIFrame"></param>
  private constructor_19(menuEntryProgram: MenuEntryProgram, currentTask: Task, activatedFromMDIFrame: boolean): void {
    this.PrgFlow = menuEntryProgram.Flow;
    this.PublicName = menuEntryProgram.PublicName;
    this.PrgDescription = menuEntryProgram.Description;
    this.CopyGlobalParams = menuEntryProgram.CopyGlobalParameters;
    this.MainProgVars = new List<string>(menuEntryProgram.MainProgVars.GetEnumerator());
    this.ActivatedFromMDIFrame = activatedFromMDIFrame;
    this._task = currentTask;
    this._menuUid = menuEntryProgram.menuUid();
    this._menuComp = menuEntryProgram.getParentMgMenu().CtlIdx;
  }

  /// <summary>
  ///   Create an Event for the passed os menu entry
  /// </summary>
  /// <param name = "osCommand">the selected os command menu entry</param>
  /// <param name = "currentTask">the task from which the menu was activated</param>
  private constructor_20(osCommand: MenuEntryOSCommand, currentTask: Task): void {
    this._task = currentTask;
  }

  /// <summary>
  ///   implementing comparator, the events are compared by priority
  /// </summary>
  CompareTo(obj: any): number {
    let otherTimeEvent: RunTimeEvent = <RunTimeEvent>obj;
    let otherPriority: Priority = otherTimeEvent._priority;
    let result: number = otherPriority - this._priority;
    if (result === 0)
      result = <number>(this._timestamp - otherTimeEvent._timestamp);
    return result;
  }

  /// <summary>
  ///   returns a replica of this runtime event
  /// </summary>
  replicate(): RunTimeEvent {
    let runTimeEvent: RunTimeEvent = new RunTimeEvent(this);
    runTimeEvent.setTimestamp();
    return runTimeEvent;
  }

  /// <summary>
  ///   a helper method that does some common initialization for some of the constructors
  /// </summary>
  private init(taskRef: Task): void {
    this._task = (taskRef || MGDataCollection.Instance.getCurrMGData().getFirstTask());
    this._taskTag = ((this._task === null) ? "" : this._task.getTaskTag());
    this._mprgCreator = null;
  }

  /// <summary>
  ///   converts parameters to argument list
  /// </summary>
  convertParamsToArgs(): void {
    this._argList = new ArgumentsList();
    this._argList.buildListFromParams(this._parameters, this._paramAttrs, this._paramVals, this._paramNulls);
    this._parameters = 0;
    this._paramAttrs = null;
    this._paramVals = null;
    this._paramNulls = null;
  }

  /// <summary>
  ///   get a reference to the task
  /// </summary>
  getTask(): Task {
    super.findUserEvent();
    return this._task;
  }

  /// <summary>
  ///   set the task
  /// </summary>
  /// <param name = "aTask">- reference to a task</param>
  setTask(taskRef: Task): void {
    this._task = taskRef;

    if (this._task !== null)
      this._taskTag = this._task.getTaskTag();
    else
      this._taskTag = null;
  }

  /// <summary>
  ///   set a Timer event
  /// </summary>
  /// <param name = "seconds">the number of seconds for this events</param>
  /// <param name = "numberWnd">the mgdata ID for the event</param>
  setTimer(sec: number, mgdID: number, isIdle: boolean): void {
    this._type = ConstInterface.EVENT_TYPE_TIMER /*'T'*/;
    this._seconds = sec;
    this._mgdId = mgdID;
    this._isIdleTimer = isIdle;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="mgdID"></param>
  /// <param name="closeActCode"></param>
  /// <returns></returns>
  setClose(mgdID: number, closeActCode: number): void {
    super.setInternal(closeActCode);
    this._mgdId = mgdID;
    this._guiTriggeredEvent = true;
  }

  /// <summary>
  ///   get the line in table of control in a table
  /// </summary>
  /// <returns> the line number</returns>
  getDisplayLine(): number {
    return this._displayLine;
  }

  /// <summary>
  ///   get number of window (for timer events)
  /// </summary>
  getMgdID(): number {
    return this._mgdId;
  }

  /// <summary>
  ///   get the break level of Event
  /// </summary>
  getBrkLevel(): string;
  getBrkLevel(flowMonitor: boolean): string;
  getBrkLevel(flowMonitor?: boolean): string {
    if (arguments.length === 0) {
      return this.getBrkLevel_00();
    }
    return this.getBrkLevel_01(flowMonitor);
  }

  private getBrkLevel_00(): string {
    let level: string = super.getBrkLevel();
    if (this._type === ConstInterface.EVENT_TYPE_INTERNAL) {
      switch (this.InternalEvent) {
        case InternalInterface.MG_ACT_CTRL_PREFIX:
        case InternalInterface.MG_ACT_CTRL_SUFFIX:
        case InternalInterface.MG_ACT_CTRL_VERIFICATION:
          level += this.Control.Name;
          break;
        case InternalInterface.MG_ACT_VARIABLE:
          level += this._eventFld.getVarName();
          break;
      }
    }
    return level;
  }

  private getBrkLevel_01(flowMonitor: boolean): string {
    return super.getBrkLevel(flowMonitor);
  }
/// <summary>
  ///   set a new control for the runtime event
  /// </summary>
  /// <param name = "newCtrl">a reference to the new control </param>
  setCtrl(newCtrl: MgControl): void {
    this._ctrl = newCtrl;
  }

  /// <summary>
  ///   set the reversible exit flag to false
  /// </summary>
  setNonReversibleExit(): void {
    this._reversibleExit = false;
  }

  /// <summary>
  ///   returns the value of the reversible exit flag
  /// </summary>
  reversibleExit(): boolean {
    return this._reversibleExit;
  }

  /// <summary>
  ///   build XML Event string for Server
  /// </summary>
  public buildXML(message: StringBuilder): void {
    message.Append("\n   " + XMLConstants.TAG_OPEN + ConstInterface.MG_TAG_EVENT);

    if (this._type !== Char.MinValue)
      message.Append(" " + ConstInterface.MG_ATTR_EVENTTYPE + "=\"" + this._type + "\"");

    if (this._type === ConstInterface.EVENT_TYPE_SYSTEM && this.kbdItm != null) {
      let modifier: Modifiers = this.kbdItm.getModifier();
      if (modifier !== Modifiers.MODIFIER_NONE)
        message.Append(" " + ConstInterface.MG_ATTR_MODIFIER + "=\"" + modifier + "\"");
      message.Append(" " + ConstInterface.MG_ATTR_KEYCODE + "=\"" + this.kbdItm.getKeyCode() + "\"");
    }
    if (this.InternalEvent !== Int32.MinValue)
      message.Append(" " + ConstInterface.MG_ATTR_INTERNALEVENT + "=\"" + this.InternalEvent + "\"");
    if (this._seconds !== Int32.MinValue)
      message.Append(" " + ConstInterface.MG_ATTR_SECONDS + "=\"" + this._seconds + "\"");
    if (this.Exp != null)
      message.Append(" " + XMLConstants.MG_ATTR_EXP + "=\"" + this.Exp.getId() + "\"");
    if (this._forceExit !== ForceExit.None)
      message.Append(" " + XMLConstants.MG_ATTR_EXP + "=\"" + <string>this._forceExit + "\"");
    if (this.UserEvt != null)
      message.Append(" " + ConstInterface.MG_ATTR_USER + "=\"" + this.UserEvtTaskTag + "," + this._userEvtIdx + "\"");

    message.Append(XMLConstants.TAG_TERM);
  }

  /// <summary>
  ///   get the argList
  /// </summary>
  /// <returns> the argList</returns>
  getArgList(): ArgumentsList {
    return this._argList;
  }

  /// <summary>
  ///   set the argList
  /// </summary>
  /// <param name = "aArgList"></param>
  setArgList(aArgList: ArgumentsList): boolean {
    let result: boolean = this._argList === null;
    this._argList = aArgList;
    return result;
  }

  /// <summary>
  ///   set the argList
  /// </summary>
  /// <param name = "aArgList"></param>
  setRouteParamList(routeParams: List<any>): void {
    this._routeParams = routeParams;
  }

  getRouteParamList(): List<any> {
    return this._routeParams;
  }
  /// <summary>
  ///   set a value to the immediate flag
  /// </summary>
  /// <param name = "val">the value to use</param>
  setImmediate(val: boolean): void {
    this._immediate = val;
  }

  /// <summary>
  ///   returns the value of the immediate flag
  /// </summary>
  isImmediate(): boolean {
    return this._immediate;
  }

  /// <summary>
  ///   set the reference to the task which is "responsible" for a main program to become active.
  ///   For example: if task A calls task B and B's ctlIdx is different than A's, then B's main
  ///   program will be inserted into the task hirarchy thus B is "responsible" for the main prg.
  /// </summary>
  /// <param name = "src">the "responsible" task.</param>
  setMainPrgCreator(src: Task): void {
    this._mprgCreator = src;
  }

  /// <summary>
  ///   get the task which is "responsible" for a main program's execution
  /// </summary>
  /// <returns> the "responsible" task.</returns>
  getMainPrgCreator(): Task {
    return this._mprgCreator;
  }

/// <summary>
  ///   sets the isRealRefresh flag to a given value
  /// </summary>
  setIsRealRefresh(val: boolean): void {
    this._isRealRefresh = val;
  }

  /// <summary>
  ///   returns the type of a refresh event true is real refresh e.i. one invoked directlly by the user
  /// </summary>
  getRefreshType(): boolean {
    return this._isRealRefresh;
  }

  /// <summary>
  ///   mark the event as an event which was created by the server
  /// </summary>
  setFromServer(): void {
    this._fromServer = true;
  }

  /// <summary>
  ///   mark the event as an event which was not created by the server
  /// </summary>
  resetFromServer(): void {
    this._fromServer = false;
  }

  /// <returns> an indication wheather the server created this event
  /// </returns>
  isFromServer(): boolean {
    return this._fromServer;
  }

  /// <returns> an indication wheather the event is a part of quit process
  /// </returns>
  isQuit(): boolean {
    return this._eventSubType === EventSubType.CancelIsQuit;
  }

  /// <summary>
  ///   Indicates that we do not want the MG_ACT_CANCEL to perform rollback.
  /// </summary>
  /// <returns></returns>
  RollbackInCancel(): boolean {
    return this._eventSubType !== EventSubType.CancelWithNoRollback;
  }

  /// <summary>
  ///  while exit the task due error (can be on any error in database in non interactive)
  /// <returns></returns>
  ExitDueToError(): boolean {
    return this._eventSubType === EventSubType.ExitDueToError;
  }

  /// <summary>
  ///   Indicates that we do not want the MG_ACT_CANCEL to perform rollback.
  /// </summary>
  /// <returns></returns>
  RtViewRefreshUseCurrentRow(): boolean {
    return this._eventSubType === EventSubType.RtRefreshViewUseCurrentRow;
  }

  /// <summary>
  ///   sets sub event type (use for cancel & rt_view_refresh action)
  /// </summary>
  SetEventSubType(eventSubType: EventSubType): void {
    this._eventSubType = eventSubType;
  }

  /// <summary>
  ///   return the Field whose change triggered this event
  /// </summary>
  /// <returns>reference to the field that triggered the event</returns>
  getFld(): Field {
    return this._eventFld;
  }

  /// <summary>
  ///   Gui Event - event that were added by Gui Layer, like click, timer, ect
  ///   For all this event the priority is low
  /// </summary>
  /// <returns> true for GUI Events </returns>
  isGuiTriggeredEvent(): boolean {
    return this._guiTriggeredEvent;
  }

  /// <summary>
  /// </summary>
  /// <returns> priority </returns>
  getPriority(): Priority {
    return this._priority;
  }

  /// <summary>
  ///   sets priority
  /// </summary>
  /// <param name = "priority"> </param>
  setPriority(priority: Priority): void {
    this._priority = priority;
  }

  isIdleTimer(): boolean {
    return this._isIdleTimer;
  }

  getValue(): any {
    return this._val;
  }

  setValue(val: any): void {
    this._val = val;
  }

  getMenuUid(): number {
    return this._menuUid;
  }

  getMenuComp(): number {
    return this._menuComp;
  }

  getStartSelection(): number {
    return this._selectionStart;
  }

  getEndSelection(): number {
    return this._selectionEnd;
  }

  /// <summary>
  ///   sets setEditParms
  /// </summary>
  /// <param name = "start">start selection</param>
  /// <param name = "end">end selection</param>
  /// <param name = "text">the text being written</param>
  setEditParms(start: number, end: number, text: string): void {
    this._selectionStart = start;
    this._selectionEnd = end;
    this.setValue(text);
  }

  /// <summary>
  ///   returns true for produceClick flag
  /// </summary>
  /// <returns></returns>
  isProduceClick(): boolean {
    return this._produceClick;
  }

  /// <summary>
  ///   set produce click
  /// </summary>
  /// <param name = "produceClick"></param>
  setProduceClick(produceClick: boolean): void {
    this._produceClick = produceClick;
  }

  /// <summary>
  ///   set the action list to enable/disable
  /// </summary>
  /// <param name = "actList"></param>
  setActEnableList(actList: number[]): void {
    this._actEnableList = actList;
  }

  /// <summary>
  ///   get the action list to enable/disable
  /// </summary>
  /// <returns></returns>
  getActEnableList(): number[] {
    return this._actEnableList;
  }

  /// <summary>
  ///   return send all flag
  /// </summary>
  /// <returns></returns>
  isSendAll(): boolean {
    return this._sendAll;
  }

  /// <summary>
  ///   set sendall flag
  /// </summary>
  /// <param name = "sendAll"> </param>
  setSendAll(sendAll: boolean): void {
    this._sendAll = sendAll;
  }

  /// <summary>
  ///   Check if this event is blocked by the currently active window. If the
  ///   current window is modal, and the event defined in one of its ancestors,
  ///   the event should not be executed.
  /// </summary>
  /// <param name = "activeWindowData">The MGData object describing the currently active window.</param>
  /// <returns>
  ///   The method returns true if the currently active window is modal is a
  ///   descendant of the event's task. Otherwise it returns false.
  /// </returns>
  public isBlockedByModalWindow(activeWindowData: MGData): boolean {
    if (activeWindowData.IsModal) {
      // Check that the event's task is an ancestor of the active window's task.
      let eventTask: Task = this.getTask();
      let baseTask: Task = activeWindowData.getTask(0);
      if (eventTask !== baseTask && baseTask.isDescendentOf(eventTask))
        return true;
    }
    return false;
  }

  toString(): string {
    return NString.Format("{{RTEvent {0} ({1}), type {2}{3}}}", [
      this.getBrkLevel(), this.InternalEvent, this._type, (this._task === null) ? "" : (" on " + this._task)
    ]);
  }
}
