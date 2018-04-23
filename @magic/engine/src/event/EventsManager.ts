import {
  Constants,
  ForceExit,
  HelpType,
  InternalInterface,
  Logger,
  MgControlType,
  Misc,
  MsgInterface,
  Priority,
  RaiseAt,
  StorageAttribute,
  SubformType,
  WindowType
} from "@magic/utils";
import {ApplicationException, Int32, List, NNumber, NString, RefParam, Stack} from "@magic/mscorelib";
import {
  Commands,
  CommandType,
  DataModificationTypes,
  EditReturnCode,
  ExpVal,
  GuiConstants,
  GuiMenuEntry_MenuType,
  IEventsManager,
  ITask,
  KeyboardItem,
  LastFocusedVal,
  MagicHelp,
  Manager,
  MenuEntry,
  MenuEntryEvent,
  MenuEntryOSCommand,
  MenuEntryProgram,
  MenuStyle,
  MgControlBase,
  MgFormBase,
  Modifiers,
  NUM_TYPE,
  PIC,
  ProcessLauncher,
  PropInterface,
  RaisedBy,
  Styles,
  TaskBase,
  URLHelp
} from "@magic/gui";
import {EventSubType} from "../enums";
import {RollbackEventCommand_RollbackType} from "../commands/ClientToServer/RollbackEventCommand";
import {MgControl} from "../gui/MgControl";
import {MgPriorityBlockingQueue} from "../util/MgPriorityBlockingQueue";
import {CompMainPrgTable} from "../rt/CompMainPrgTable";
import {Field} from "../data/Field";
import {RunTimeEvent} from "./RunTimeEvent";
import {MgForm} from "../gui/MgForm";
import {ClientManager} from "../ClientManager";
import {EventHandler, RetVals} from "./EventHandler";
import {FlowMonitorQueue} from "../util/FlowMonitorQueue";
import {GUIManager} from "../GUIManager";
import {Task, Task_Direction, Task_Flow, Task_SubformExecModeEnum} from "../tasks/Task";
import {ArgumentsList} from "../rt/ArgumentsList";
import {MGData} from "../tasks/MGData";
import {HandlersTable} from "../rt/HandlersTable";
import {MGDataCollection} from "../tasks/MGDataCollection";
import {RecordOutOfDataViewException} from "../data/RecordOutOfDataViewException";
import {CommandsProcessorBase, CommandsProcessorBase_SendingInstruction} from "../CommandsProcessorBase";
import {CommandsTable} from "../CommandsTable";
import {CommandFactory} from "../commands/ClientToServer/CommandFactory";
import {IClientCommand} from "../commands/IClientCommand";
import {CommandsProcessorManager} from "../CommandsProcessorManager";
import {Operation} from "../rt/Operation";
import {ClientRefreshCommand} from "../commands/ServerToClient/ClientRefreshCommand";
import {RemoteCommandsProcessor} from "../remote/RemoteCommandsProcessor";
import {MenuManager} from "../MenuManager";
import {ExecutionStack} from "../rt/ExecutionStack";
import {ExecutionStackEntry} from "../rt/ExecutionStackEntry";
import {TasksTable} from "../tasks/TasksTable";
import {ReturnResult} from "../util/ReturnResult";
import {EventHandlerPosition} from "./EventHandlerPosition";
import {DataView} from "../data/DataView";
import {Event} from "./Event";
import {Record} from "../data/Record";
import {ConstInterface} from "../ConstInterface";
import {FlowMonitorInterface} from "../FlowMonitorInterface";
import {DataViewCommandType} from "../commands/ClientToServer/DataviewCommand";
import {Observable} from 'rxjs/rx';
import {ServerError} from "../remote/ServerError";
import {isUndefined} from "util";

export enum EventsAllowedType {
  NONE,
  NON_INTERACTIVE,
  ALL
}

enum EventScope {
  NONE = ' ',
  TRANS = 'T'
}

/// <summary>
///   this class manage the events, put them in a queue and handle them
/// </summary>
export class EventsManager implements IEventsManager {
  // LOCAL CONSTANTS
  private static Timer_Timeout_Infinite = -1;
  private static REAL_ONLY: boolean = true;
  private static MAX_OPER: number = 9999;
  private _eventsQueue: MgPriorityBlockingQueue = null; // the queue of events to execute
  private _execStack: Stack<ExecutionStack> = null; // Execution stack of raise event operation or calls to user
  private _rtEvents: Stack<RunTimeEvent> = null; // A stack of in-process run-time events (the last one is at the top).
  private _serverExecStack: Stack<ExecutionStack> = null; // Execution stack of Execution stacks of operations that
  private _allowEvents: EventsAllowedType = EventsAllowedType.ALL;
  private _compMainPrgTab: CompMainPrgTable = null; // the order of handling main programs of components
  private _currCtrl: MgControl = null;
  private _currField: Field = null; // for every event executed this variable will contain the field attached to the control on which the event was fired
  private _currKbdItem: KeyboardItem = null;
  private _endOfWork: boolean = false;
  private _eventScope: EventScope = EventScope.NONE; // instructs how to process events which are propagated to slave tasks during execution.
  private _forceExit: ForceExit = ForceExit.None;
  private _forceExitTask: Task = null;
  private _ignoreUnknownAbort: boolean = false; // TRUE when 'abort' commands on unknown tasks may arrive
  private _initialized: boolean = false; // used to detect re-initialization
  private _isHandlingForceExit: boolean = false; // indicate we are currently handling a forceExit related handler
  private _isNonReversibleExit: boolean = false; // is the command nonreversible

  // was sent from the server. we need a stack of execstacks
  // here because we might call a new program before we handled
  // the previous server exec stack
  private _stopExecution: boolean = false;
  private _processingTopMostEndTask: boolean = false; // indication whether we are currently processing events from the
  private _stopExecutionCtrl: MgControl = null; // holds the ctrl on which we get the first stop execution
  private _subver: number = 0;
  private _ver: number = 0;
  private _isSorting: boolean = false;
  private _nextParkedCtrl: MgControl = null;

  /// <summary>
  ///   private CTOR to prevent instantiation
  /// </summary>
  constructor() {
    this._rtEvents = new Stack();

    this._eventsQueue = new MgPriorityBlockingQueue();

    this._execStack = new Stack();
    this._execStack.push(new ExecutionStack());

    this._serverExecStack = new Stack();
    this._serverExecStack.push(null);

    this._nextParkedCtrl = null;
  }

  /// <summary>
  ///   add an event to the end of the queue
  /// </summary>
  /// <param name = "irtEvt">the event to be added </param>
  addToTail(rtEvt: RunTimeEvent): void {
    this._eventsQueue.put(rtEvt);
  }

  /// <summary>
  ///   add an keyboard event to the end of the queue
  /// </summary>
  /// <param name = "mgForm">form </param>
  /// <param name = "mgControl">control </param>
  /// <param name = "modifier">modifier </param>
  /// <param name = "start">start of selected text </param>
  /// <param name = "end">end of selected text  </param>
  /// <param name = "text">text </param>
  /// <param name = "im">im </param>
  /// <param name = "isActChar">is keyboard char </param>
  /// <param name = "suggestedValue">suggested value for choice </param>
  /// <param name = "code">code to be added in the queue </param>
  AddKeyboardEvent(mgForm: MgFormBase, mgControl: MgControlBase, modifier: Modifiers, keyCode: number, start: number, end: number, text: string, isActChar: boolean, suggestedValue: string, code: number): void {
    let rtEvt: RunTimeEvent = (mgControl !== null) ? new RunTimeEvent(<MgControl>mgControl, true, ClientManager.Instance.IgnoreControl) : new RunTimeEvent(<Task>mgForm.getTask(), true);

    rtEvt.setInternal(code);

    let newKbItem: KeyboardItem = new KeyboardItem(keyCode, modifier);

    if (isActChar && (mgControl !== null && (mgControl.isTextControl())))
      newKbItem.setAction(InternalInterface.MG_ACT_CHAR);

    rtEvt.setKeyboardItem(newKbItem);

    if (code === InternalInterface.MG_ACT_CTRL_KEYDOWN) {
      rtEvt.setEditParms(start, end, text);
    }
    else
      rtEvt.setValue(suggestedValue);

    ClientManager.Instance.EventsManager.addToTail(rtEvt);
    return;
  }

  /// <summary>
  ///   QCR 760381 if after handling the event the current control is unparkable try
  ///   an move to the next parkable control
  /// </summary>
  checkParkability(): void {
    let current: MgControl = GUIManager.getLastFocusedControl();

    /* QCR# 925464. The problem was that on deleting a record, CS of the control gets executed.
     * So, the task's level is set to TASK. Then we go to server an on returning back from the server,
     * we refresh the form. Here, since the last parked control i.e. "from" (numeric) is hidden,
     * we try to park on the next parkable control from Property.RefreshDisplay(). This makes the
     * task's level as CONTROL. Now, we try to execute RP, but since the level is CONTROL,
     * we do not execute it. The solution is that checkParkability() which is called from
     * Property.RefreshDisplay(), should try to park on the control only if the task's level is CONTROL.
     */
    if (current !== null && (current.getForm().getTask()).getLevel() === Constants.TASK_LEVEL_CONTROL)
    // #992957 - we should skip direction check, when checking for parkability
      this.moveToParkableCtrl(current, false);
  }

  /// <summary>
  /// Handle the WriteErrorMessagesToServerlog file event.
  /// </summary>
  /// <param name="taskBase"></param>
  /// <param name="errorMessage"></param>
  WriteErrorMessageesToServerLog(taskBase: TaskBase, errorMessage: string): void {
    let task: Task = ((taskBase instanceof Task) ? <Task>taskBase : null);
    let cmd: IClientCommand = CommandFactory.CreateWriteMessageToServerLogCommand(task.getTaskTag(), errorMessage);
    task.getMGData().CmdsToServer.Add(cmd);
    Task.CommandsProcessor.Execute(CommandsProcessorBase_SendingInstruction.TASKS_AND_COMMANDS);

    ClientManager.Instance.ErrorToBeWrittenInServerLog = NString.Empty;
  }

  /// <summary>
  ///   handle situation with no parkable controls
  /// </summary>
  /// <param name = "itask"></param>
  HandleNonParkableControls(itask: ITask): void {
    let task: Task = <Task>itask;
    // we can not stay in create mode with no parkable controls
    if (task.getMode() === Constants.TASK_MODE_CREATE && task.IsInteractive) {
      task.enableModes();
      let oldMode: string = task.getOriginalTaskMode();
      this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_SUFFIX);
      if (!this.GetStopExecutionFlag()) {
        if (oldMode !== Constants.TASK_MODE_CREATE) {
          task.setMode(oldMode);
          (<DataView>task.DataView).currRecCompute(true);
          this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_PREFIX);
          (<MgForm>task.getForm()).RefreshDisplay(Constants.TASK_REFRESH_CURR_REC);
          task.setLastParkedCtrl(null);
          Manager.SetFocus(task, null, -1, true);
          return;
        }
      }
      // we can not stay in create mode or in stop execution state with no parkable controls
      this.exitWithError(task, MsgInterface.RT_STR_CRSR_CANT_PARK);
    }
    if (this.GetStopExecutionFlag() && task.IsInteractive && !task.HasMDIFrame)
    // there is no control to stay on
      this.exitWithError(task, MsgInterface.RT_STR_CRSR_CANT_PARK);
    task.setLastParkedCtrl(null);
    ClientManager.Instance.ReturnToCtrl = null;
    Manager.SetFocus(task, null, -1, true);
  }

  /// <summary>
  ///   handle a single event
  /// </summary>
  /// <param name = "irtEvt">the event to process </param>
  /// <param name = "returnedFromServer">indicates whether we returned from the server - to be passed to handler.execute() </param>
  handleEvent(rtEvt: RunTimeEvent, returnedFromServer: boolean): void {
    let handler: EventHandler = null;
    let pos: EventHandlerPosition = new EventHandlerPosition();
    let task: Task = rtEvt.getTask();
    let ctrl: MgControl = <MgControl>task.getLastParkedCtrl();
    let forceExitDone: boolean = false;
    let endTaskError: boolean = false;
    let oldRtEvt: RunTimeEvent = null;
    let oldFlowMode: Task_Flow = task.getFlowMode();
    let oldDirection: Task_Direction = task.getDirection();
    let oldForceExit: ForceExit = this.getForceExit();
    let oldForceExitTask: Task = this.getForceExitTask();
    let oldIsHandlingForceExit: boolean = this._isHandlingForceExit;
    let restoreIsForceExit: boolean = false;
    let restoreCurrCtrl: MgControl = null;
    let restoreCurrField: Field = null;

    // the action need to be check according to the task on the event.
    // If the action is internal (under ACT_TOT), do nothing if its disabled or not allowed.
    if ((rtEvt.getType() === ConstInterface.EVENT_TYPE_INTERNAL)) {
      // do nothing if action is 1. not enabled 2. wait == no and events are not allowed
      if (rtEvt.InternalEvent < InternalInterface.MG_ACT_TOT_CNT && (!task.ActionManager.isEnabled(rtEvt.InternalEvent) || (!rtEvt.isImmediate() && this.NoEventsAllowed())))
        return;
    }
    else
    // do the handlers when 1. wait == yes or 2. events are allowed
    if (!rtEvt.isImmediate() && this.NoEventsAllowed())
      return;

    restoreCurrCtrl = this._currCtrl;
    this._currCtrl = ctrl; // save current control for HANDLER_CTRL function

    let propagate: boolean = rtEvt.getType() !== ConstInterface.EVENT_TYPE_INTERNAL || rtEvt.getInternalCode() < 1000;

    try {
      // for CP,CS and CV, flow and direction is evaluated
      if (rtEvt.getInternalCode() === InternalInterface.MG_ACT_CTRL_PREFIX || rtEvt.getInternalCode() === InternalInterface.MG_ACT_CTRL_SUFFIX || rtEvt.getInternalCode() === InternalInterface.MG_ACT_CTRL_VERIFICATION) {
        // If we are entering the task, set FlowMode as Step
        if (task.getLastParkedCtrl() === null && task.getClickedControl() === null)
          task.setFlowMode(Task_Flow.STEP);
        else
          task.setFlowMode(Task_Flow.FAST);
        this.handleDirection(rtEvt);
      }
      this.pushRtEvent(rtEvt);
      // do some common processing and if the result is true then continue
      // with the user defined handlers
      let bRcBefore: boolean = this.commonHandlerBefore(rtEvt);

      restoreCurrField = this._currField;
      this._currField = <Field>task.getCurrField();

      if (bRcBefore) {
        pos.init(rtEvt);
        // get the first handler for the current event
        handler = pos.getNext();

        if (handler !== null && handler.getEvent() !== null && handler.getEvent().UserEvt !== null)
          this.setForceExit(handler.getEvent().UserEvt.ForceExit, task);

        // execute the chain of handlers for the current event. the execution
        // continues till an event handler returns false.
        while (handler !== null) {
          let handlerContextTask: Task = null;
          let rtEvtChanged: boolean;
          try {
            let enabledCndCheckedAndTrue: boolean = false;

            // if there is a handler change the handler's context task to the event's task
            handlerContextTask = <Task>handler.getTask().GetContextTask();
            if (rtEvt.getType() === ConstInterface.EVENT_TYPE_INTERNAL && rtEvt.getInternalCode() >= 1000 && rtEvt.getInternalCode() !== InternalInterface.MG_ACT_VARIABLE)
              handler.getTask().SetContextTask(handler.getTask());
            else
              handler.getTask().SetContextTask(rtEvt.getTask());

            // there is no need to handle ForceExit for non-user events
            if (handler.getEvent().getType() === ConstInterface.EVENT_TYPE_USER && handler.isEnabled()) {
              enabledCndCheckedAndTrue = true;
              this._isHandlingForceExit = false;
              restoreIsForceExit = true;
              // handle forceExit only once
              if (this.handleForceExitBefore(handler.getEvent(), rtEvt)) {
                forceExitDone = true;
              }
            }

            // check if the current run time event is different from the event
            // of the handler
            if (rtEvt !== handler.getEvent()) {
              // the new runtime event is that of the handler combined with the
              // data of the current runtime event.
              // the purpose of this is to propagate the event of the handler
              // in place of the original event
              oldRtEvt = rtEvt;
              rtEvt = new RunTimeEvent(handler.getEvent(), rtEvt);
              rtEvtChanged = true;

              // there is a new runtime event to handle so pop the old one and push
              // the new one instead.
              this.popRtEvent();
              this.pushRtEvent(rtEvt);
            }
            else
              rtEvtChanged = false;

            if (rtEvt.getType() === ConstInterface.EVENT_TYPE_INTERNAL && rtEvt.getInternalCode() === InternalInterface.MG_ACT_REC_SUFFIX)
              rtEvt.getTask().setInRecordSuffix(true);

            this.createEventArguments(rtEvt);
            let handlerRetVals: RetVals = handler.execute(rtEvt, returnedFromServer, enabledCndCheckedAndTrue);
            if (rtEvt.getType() === ConstInterface.EVENT_TYPE_INTERNAL && rtEvt.getInternalCode() === InternalInterface.MG_ACT_REC_SUFFIX)
              rtEvt.getTask().setInRecordSuffix(false);
            propagate = handlerRetVals.Propagate;
            if (!handlerRetVals.Enabled && rtEvtChanged) {
              rtEvt = oldRtEvt;
              oldRtEvt = null;
              rtEvtChanged = false;
              // there is a new runtime event to handle so pop the old one and push
              // the new one instead.
              this.popRtEvent();
              this.pushRtEvent(rtEvt);
            }

            // check if we have fulfilled the end condition
            // After executing a handler, before ending a task (if the end condition is TRUE),
            // we should check if the task is not already closed. This can happen like in case
            // of QCR #796476 --- a non-interactive task has called an interactive task from
            // task suffix. Now if we press Alt+F4, we get EXIT_SYSTEM act. And so we close
            // all tasks starting from Main Program. So, when we come out of the TS handler
            // execution, the task is already closed.
            // For Offline : TP is executed at client side. If we are in Task Prefix, dont check endTask condition here.
            if (rtEvt.getInternalCode() !== InternalInterface.MG_ACT_TASK_PREFIX && task.isStarted() && task.getExecEndTask()) {
              endTaskError = task.endTask(true, false, false);
              if (endTaskError)
                break;
            }

            if (this.GetStopExecutionFlag()) {
              if (this.handleStopExecution(rtEvt))
                break;
            }
          }
          finally {
            // restoring the context
            handler.getTask().SetContextTask(handlerContextTask);
          }

          if (!propagate)
            break;

          if (rtEvtChanged)
            handler = pos.getNext(rtEvt);
          // get the next handler for the current event
          else
            handler = pos.getNext();
          if (handler !== null)
            FlowMonitorQueue.Instance.addTaskEvent(rtEvt.getBrkLevel(true), FlowMonitorInterface.FLWMTR_PROPAGATE);
        }
        if (propagate && !endTaskError)
          this.commonHandler(rtEvt);
      }
      if (!endTaskError) {
        this.commonHandlerAfter(rtEvt, bRcBefore, propagate);
      }
      if (forceExitDone && this._isHandlingForceExit) {
        this._isHandlingForceExit = false;
        this.handleForceExitAfter(rtEvt);
      }
      this.setForceExit(oldForceExit, oldForceExitTask);
      if (restoreIsForceExit)
        this._isHandlingForceExit = oldIsHandlingForceExit;
    }
    finally {
      this._currCtrl = restoreCurrCtrl;
      this._currField = restoreCurrField;
      this.popRtEvent();

      // restore the previous values
      if (rtEvt.getInternalCode() === InternalInterface.MG_ACT_CTRL_PREFIX || rtEvt.getInternalCode() === InternalInterface.MG_ACT_CTRL_SUFFIX || rtEvt.getInternalCode() === InternalInterface.MG_ACT_CTRL_VERIFICATION) {
        task.setFlowMode(Task_Flow.NONE);
        task.setFlowMode(oldFlowMode);
        task.setDirection(Task_Direction.NONE);
        task.setDirection(oldDirection);
      }
    }

    // update the display
    GUIManager.Instance.execGuiCommandQueue();
  }

  /// <summary>
  ///   This method simulates all events that are in selection sequence starting from focus event
  ///   It is used in :
  ///   actions CTRL+TAB && CTRL+SHIFT+TAB that move us to the next/previous item in Tab control
  ///   click or accelerator on push button
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "val"></param>
  /// <param name = "line">ctrl line</param>
  /// <param name = "produceClick">true should produce click event</param>
  simulateSelection(ctrl: MgControlBase, val: any, line: number, produceClick: boolean): void {
    let mgControl: MgControl = <MgControl>ctrl;
    let currTask: Task = <Task>mgControl.getForm().getTask();
    let cancelWasRaised: boolean = currTask.cancelWasRaised();

    if (mgControl.Type === MgControlType.CTRL_TYPE_TAB) {
      if (!mgControl.isModifiable() || !mgControl.IsParkable(false)) {
        mgControl.restoreOldValue();
        let lastFocusedControl: MgControl = GUIManager.getLastFocusedControl();
        if (lastFocusedControl !== null)
          Manager.SetFocus(lastFocusedControl, -1);
        return;
      }
    }

    // when a push button is about to raise a 'Cancel' or a 'Quit' event. we do not want to set the new value to the field.
    // That setting might cause a rec suffix and a variable change.
    if (mgControl.Type === MgControlType.CTRL_TYPE_BUTTON) {
      let aRtEvt: RunTimeEvent = new RunTimeEvent(mgControl);
      let raiseAt: RaiseAt = <RaiseAt> (mgControl.getProp(PropInterface.PROP_TYPE_RAISE_AT)).getValueInt();
      if (aRtEvt.getType() === ConstInterface.EVENT_TYPE_INTERNAL && (aRtEvt.InternalEvent === InternalInterface.MG_ACT_CANCEL || aRtEvt.InternalEvent === InternalInterface.MG_ACT_RT_QUIT)) {
        if (raiseAt === RaiseAt.TaskInFocus)
          currTask = ClientManager.Instance.getLastFocusedTask();
        cancelWasRaised = currTask.cancelWasRaised();
        currTask.setCancelWasRaised(true);
      }

      if (raiseAt === RaiseAt.TaskInFocus)
        mgControl.setRtEvtTask(ClientManager.Instance.getLastFocusedTask());
    }

    // first we handle focus
    this.handleFocus(mgControl, line, produceClick);

    currTask.setCancelWasRaised(cancelWasRaised);

    if (this._stopExecution)
      return;

    // QCR# 974047 : If we have a Push Button with Allow Parking = No and field is attached to it, don't handle the event.
    // This is same as online. In online, if field is not attached to non parkable push Button, we handle the event
    // But if field is attached to it, we don't handle event.
    // So if control is push button, execute handleEvent only when field is not attached or ParkonCLick is No or
    // ParkonCLick and allowparking is both Yes
    let controlIsParkable: boolean = mgControl.IsParkable(false);
    if (mgControl.Type !== MgControlType.CTRL_TYPE_BUTTON || (mgControl.getField() === null || !mgControl.checkPropWithLine(PropInterface.PROP_TYPE_PARK_ON_CLICK, false, line) || controlIsParkable)) {

      // QCR #301652. For non-parkable button control with event raised at the container task will be changed so
      // when the button is clicked then the task will get focus. (as in Online and as if the button was parkable).
      // The focus will be on the first control.
      if (mgControl.Type === MgControlType.CTRL_TYPE_BUTTON && !controlIsParkable) {
        let subformTask: Task = <Task>mgControl.getForm().getTask();
        if (subformTask.IsSubForm) {
          currTask = ClientManager.Instance.getLastFocusedTask();
          // Defect 115474. For the same task do not move to the first control.
          if (subformTask !== currTask && subformTask.pathContains(currTask))
            subformTask.moveToFirstCtrl(false);
        }
      }

      if (mgControl.IsHyperTextButton())
        Commands.addAsync(CommandType.SET_TAG_DATA_LINK_VISITED, mgControl, line, true);

      // then ACT_HIT is sent
      let rtEvt: RunTimeEvent = new RunTimeEvent(mgControl);
      ClientManager.Instance.RuntimeCtx.CurrentClickedCtrl = mgControl;
      rtEvt.setInternal(InternalInterface.MG_ACT_CTRL_HIT);
      this.handleEvent(rtEvt, false);
      if (this._stopExecution)
        return;
    }
    else {
      if (mgControl.IsHyperTextButton() && !controlIsParkable)
        Commands.addAsync(CommandType.SET_TAG_DATA_LINK_VISITED, mgControl, line, false);
    }

    // and selection is handled in the end if previous actions succeeded
    if (mgControl.Type !== MgControlType.CTRL_TYPE_BUTTON)
    // for button\check we do not call this to prevent recursion
      this.handleSelection(mgControl, line, val);

    if (this._stopExecution)
      return;
    // then mouse up
    this.handleMouseUp(mgControl, line, produceClick);
  }

  /// <summary> activate handleInternalEvent with isQuit = false</summary>
  /// <param name="itask">a reference to the task</param>
  /// <param name="eventCode">the code of the event</param>
  handleInternalEventWithTask(itask: ITask, eventCode: number): void {
    this.handleInternalEventWithTaskAndSubformRefresh(itask, eventCode, false);
  }

  /// <summary>
  ///   activate handleInternalEvent with isQuit = false
  /// </summary>
  /// <param name = "itask">a reference to the task </param>
  /// <param name = "eventCode">the code of the event </param>
  /// <param name="subformRefresh">identifier if the event called by subform refresh</param>
  handleInternalEventWithTaskAndSubformRefresh(itask: ITask, eventCode: number, subformRefresh: boolean): void {
    let task: Task = <Task>itask;

    // set SubformExecMode (for SubformExecMode function) only in record prefix.
    // SubformExecMode is changed in record prefix and it is the same until the
    // next record prefix execution, because we do not open a subform task each time
    // in RC as it is in Online. But when the subform is refreshed from the parent
    // its record prefix & suffix are also executed.
    if (eventCode === InternalInterface.MG_ACT_REC_PREFIX && task.IsSubForm && task.SubformExecMode !== Task_SubformExecModeEnum.FIRST_TIME)// FIRST_TIME is set only once in
    // doFirstRecordCycle.
    {
      task.SubformExecMode = (subformRefresh ? Task_SubformExecModeEnum.REFRESH : Task_SubformExecModeEnum.SET_FOCUS);
    }

    // for the subform refresh it is needed to execute MG_ACT_POST_REFRESH_BY_PARENT handler before RECORD_PREFIX handler
    if (subformRefresh)
      this.handleInternalEventWithTask(itask, InternalInterface.MG_ACT_POST_REFRESH_BY_PARENT);

    if (task.DataView.isEmptyDataview()) {
      if (eventCode === InternalInterface.MG_ACT_REC_PREFIX || eventCode === InternalInterface.MG_ACT_REC_SUFFIX) {
        if (eventCode === InternalInterface.MG_ACT_REC_PREFIX)
          task.emptyDataviewOpen(subformRefresh);
        else
          task.emptyDataviewClose();

        if (task.getForm() !== null) {
          if (eventCode === InternalInterface.MG_ACT_REC_PREFIX)
            (<MgForm>task.getForm()).RefreshDisplay(Constants.TASK_REFRESH_CURR_REC);
          task.getForm().SelectRow();
        }
      }
      else
        this.handleInternalEventWithTaskAndEventSubtype(task, eventCode, EventSubType.Normal);
    }
    else
      this.handleInternalEventWithTaskAndEventSubtype(task, eventCode, EventSubType.Normal);
  }

  /// <summary>
  ///   activate handleInternalEvent with isQuit = false
  /// </summary>
  /// <param name = "ctrl">a reference to the control </param>
  /// <param name = "eventCode">the code of the event </param>
  handleInternalEventWithMgControlBase(ctrl: MgControlBase, eventCode: number): void {
    this.handleInternalEventWithMgControl(<MgControl>ctrl, eventCode, EventSubType.Normal);
  }

  /// <summary>
  ///   return the value of the "stop execution" flag
  /// </summary>
  GetStopExecutionFlag(): boolean {
    return this._stopExecution;
  }

  /// <summary>
  ///   return the ctrl on which we had a "stop execution"
  /// </summary>
  getStopExecutionCtrl(): MgControlBase {
    return this._stopExecutionCtrl;
  }

  /// <summary>
  ///   Builds a subformCtrl path after the frmCtrl's form and above the toCtrl's form.
  ///   NOTE: frmCtrl shud be same/higher level in the subform tree than toCtrl
  /// </summary>
  /// <param name = "pathArray"></param>
  /// <param name = "frmCtrl"></param>
  /// <param name = "toCtrl"></param>
  /// <returns></returns>
  buildSubformPath(pathArray: List<MgControlBase>, frmCtrl: MgControlBase, toCtrl: MgControlBase): MgControlBase {

    pathArray.Clear();
    let parentSubformCtrl: MgControl = <MgControl>toCtrl.getForm().getSubFormCtrl();
    // lastParkedSubformCtrl = lastParkedCtrl.getForm().getSubFormCtrl();
    while (parentSubformCtrl !== null && (<MgControl>frmCtrl).onDiffForm(parentSubformCtrl)) {
      // if (lastParkedSubformCtrl != null && lastParkedSubformCtrl.getTask() == parentSubformCtrl.getTask())
      // break;
      pathArray.push(parentSubformCtrl);
      let pForm: MgForm = <MgForm>parentSubformCtrl.getForm();
      parentSubformCtrl = <MgControl>(<MgFormBase>pForm).getSubFormCtrl();
    }

    // The toCtrl can be on diff subform path or in same Subformtree but with
    // frmCtrl lower in the tree (backward direction click)
    if (parentSubformCtrl === null) {
      let foundCommonParent: boolean = false;
      // check if it is on diff subformPath. If yes, find the common parent and
      // update the ArrayList with paths from common parent to toCtrl
      parentSubformCtrl = <MgControl>frmCtrl.getForm().getSubFormCtrl();
      while (parentSubformCtrl !== null && (<MgControl>toCtrl).onDiffForm(parentSubformCtrl)) {
        for (let index: number = 0; index < pathArray.length; index++) {
          if (pathArray.get_Item(index).getForm().getTask() === parentSubformCtrl.getForm().getTask()) {
            foundCommonParent = true;
            while (pathArray.length !== 0 && pathArray.length > index/* + 1*/)
              pathArray.RemoveAt(index/* + 1*/);
            break;
          }
        }

        if (foundCommonParent)
          break;

        let pForm: MgForm = <MgForm>parentSubformCtrl.getForm();
        parentSubformCtrl = <MgControl>(<MgFormBase>pForm).getSubFormCtrl();
      }

      // if no common parent, reset parentSubformCtrl to null
      if (!foundCommonParent)
        parentSubformCtrl = null;
    }

    // clear the arraylist
    if (parentSubformCtrl === null)
      pathArray.Clear();

    return parentSubformCtrl;
  }

  /// <summary>
  ///   execute CVs from srcCtrl's next ctrl to the last control on the form
  /// </summary>
  /// <param name = "itask"></param>
  /// <param name = "srcCtrl"></param>
  /// <returns></returns>
  executeVerifyHandlersTillLastCtrl(itask: ITask, srcCtrl: MgControlBase): boolean {
    let task: Task = <Task>itask;
    let bRc: boolean = true;
    let form: MgForm = <MgForm>task.getForm();
    let orgDirection: Task_Direction = task.getDirection();
    let frmCtrl: MgControl;
    if (srcCtrl === null) {
      // if srcCtrl is null, start execution from the first nonsubformCtrl
      srcCtrl = form.getFirstNonSubformCtrl();
      frmCtrl = <MgControl>srcCtrl;
    }
    else
      frmCtrl = form.getNextCtrlIgnoreSubforms(<MgControl>srcCtrl, Task_Direction.FORE);

    // execute CV from frmCtrl to the last ctrl
    // take care as frmCtrl shouldnt run into any subform
    if (frmCtrl !== null) {
      let toCtrl: MgControl = form.getLastNonSubformCtrl();

      // #731490 - form must contain both frmCtrl and toCtrl in forward direction.
      if (toCtrl !== null && form.ctrlTabOrderIdx(frmCtrl) > -1 && form.ctrlTabOrderIdx(toCtrl) > -1 && form.ctrlTabOrderIdx(frmCtrl) <= form.ctrlTabOrderIdx(toCtrl))
      // execute CV from current control to the last control
        bRc = this.executeVerifyHandlers(task, null, frmCtrl, toCtrl);
    }

    // reset the org direction
    task.setDirection(Task_Direction.NONE);
    task.setDirection(orgDirection);

    return bRc;
  }

  /// <summary>
  ///   print error and exit task
  /// </summary>
  /// <param name = "itask"></param>
  /// <param name = "msgId"></param>
  exitWithError(itask: ITask, msgId: string): void {
    let task: Task = <Task>itask;
    let message: string = ClientManager.Instance.getMessageString(msgId);
    Commands.messageBox(task.getTopMostForm(), "Error", message, Styles.MSGBOX_ICON_ERROR | Styles.MSGBOX_BUTTON_OK);
    this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_EXIT);
  }

  /// <summary>
  ///   initializes the static section of the events manager. Usually does nothing but in the
  ///   event of applet re-load (for example, because of a browser refresh) it initializes the
  ///   static part of this class.
  /// </summary>
  Init(): void {
    if (this._initialized) {
      this._isHandlingForceExit = false;
      this._forceExit = ForceExit.None;
      this._forceExitTask = null;
      this._currField = null;
      this.setEndOfWork(true);
    }
    this._initialized = true;
  }

  /// <summary>
  ///   Add internal event to the queue
  /// </summary>
  /// <param name = "itask">task</param>
  /// <param name = "code">code of internal event</param>
  addInternalEventWithItaskAndCode(itask: ITask, code: number): void {
    this.addGuiTriggeredEventWithTaskAndCodeAndOnMultiMark(itask, code, false);
  }

  /// <summary>
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "code"></param>
  /// <returns></returns>
  addInternalEventWithCtrlAndCode(ctrl: MgControlBase, code: number): void {
    let rtEvt: RunTimeEvent = new RunTimeEvent(<MgControl>ctrl);
    rtEvt.setInternal(code);
    this.addToTail(rtEvt);
  }

  /// <summary>
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "code"></param>
  /// <returns></returns>
  addInternalEventWithCtrlAndDisplayLineAndCode(ctrl: MgControlBase, DisplayLine: number, code: number): void {
    let rtEvt: RunTimeEvent = new RunTimeEvent(<MgControl>ctrl, DisplayLine, false);
    rtEvt.setInternal(code);
    this.addToTail(rtEvt);
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="ctrl"></param>
  /// <param name="code"></param>
  /// <param name="priority"></param>
  addInternalEventWithCtrlAndCodeAndPriority(ctrl: MgControlBase, code: number, priority: Priority): void {
    let rtEvt: RunTimeEvent = new RunTimeEvent(<MgControl>ctrl);
    rtEvt.setInternal(code);
    rtEvt.setPriority(priority);
    this.addToTail(rtEvt);
  }

  /// <summary>
  /// add gui triggered event
  /// </summary>
  /// <param name="itask"></param>
  /// <param name="code"></param>
  /// <param name="onMultiMark"></param>
  addGuiTriggeredEventWithTaskAndCodeAndOnMultiMark(itask: ITask, code: number, onMultiMark: boolean): void {
    let task: Task = <Task>itask;
    let rtEvt: RunTimeEvent = new RunTimeEvent(task);
    rtEvt.setInternal(code);
    this.addToTail(rtEvt);
  }

  /// <summary>
  /// will be used for multimarking in the future
  /// </summary>
  /// <param name="ctrl"></param>
  /// <param name="code"></param>
  /// <param name="line"></param>
  /// <param name="modifiers"></param>
  addGuiTriggeredEventWithCtrlAndCodeAndLineAndModifier(ctrl: MgControlBase, code: number, line: number, modifiers: Modifiers): void {
    let rtEvt: RunTimeEvent = new RunTimeEvent(<MgControl>ctrl, line, false);
    rtEvt.setInternal(code);
    this.addToTail(rtEvt);
  }

  /// <summary> handle Column Click event on Column </summary>
  /// <param name="guiColumnCtrl"></param>
  /// <param name="direction"></param>
  /// <param name="columnHeader"></param>
  AddColumnClickEvent(columnCtrl: MgControlBase, direction: number, columnHeader: string): void {
    let rtEvt: RunTimeEvent = new RunTimeEvent(<MgControl>columnCtrl, direction, 0);
    rtEvt.setInternal(InternalInterface.MG_ACT_COL_CLICK);

    // Prepare an argument list with argument as columnHeaderString.
    let argsList = new Array<ExpVal>();
    argsList[0] = new ExpVal(StorageAttribute.UNICODE, false, columnHeader);
    let args = new ArgumentsList(argsList);
    rtEvt.setArgList(args);

    ClientManager.Instance.EventsManager.addToTail(rtEvt);
  }

  /// <summary>
  /// handle column filter event
  /// </summary>
  /// <param name="columnCtrl"></param>
  /// <param name="columnHeader"></param>
  /// <param name="index"></param>
  /// <param name="x"></param>
  /// <param name="y"></param>
  AddColumnFilterEvent(columnCtrl: MgControlBase, columnHeader: string, x: number, y: number, width: number, height: number): void {
    let mgControl: MgControlBase = columnCtrl.getColumnChildControl();

    // If there is no control attached to the column, there is no need to invoke the filter.
    // If there is control without variable, we also shouldn't invoke the filter.
    if (mgControl !== null && mgControl.getField() !== null) {
      let rtEvt: RunTimeEvent = new RunTimeEvent(<MgControl>columnCtrl, columnHeader, x, y, width, height);
      rtEvt.setInternal(InternalInterface.MG_ACT_COL_FILTER);

      let tmp: NUM_TYPE = new NUM_TYPE();
      let argsList: ExpVal[] = new Array<ExpVal>(6);
      argsList[0] = new ExpVal(StorageAttribute.UNICODE, false, columnHeader);
      tmp.NUM_4_LONG(mgControl.GetVarIndex());
      argsList[1] = new ExpVal(StorageAttribute.NUMERIC, false, tmp.toXMLrecord());
      tmp.NUM_4_LONG(x);
      argsList[2] = new ExpVal(StorageAttribute.NUMERIC, false, tmp.toXMLrecord());
      tmp.NUM_4_LONG(y);
      argsList[3] = new ExpVal(StorageAttribute.NUMERIC, false, tmp.toXMLrecord());
      tmp.NUM_4_LONG(width);
      argsList[4] = new ExpVal(StorageAttribute.NUMERIC, false, tmp.toXMLrecord());
      tmp.NUM_4_LONG(height);
      argsList[5] = new ExpVal(StorageAttribute.NUMERIC, false, tmp.toXMLrecord());

      let args = new ArgumentsList(argsList);
      rtEvt.setArgList(args);

      ClientManager.Instance.EventsManager.addToTail(rtEvt);
    }
  }

  AddRouteEvent(task: ITask, code: number, routerpath: string, routerOutletName: string, routeParams: List<any>) {
    let rtEvt: RunTimeEvent = new RunTimeEvent(<Task>task, true);
    rtEvt.setInternal(code);

    let argsList: ExpVal[] = new Array<ExpVal>(2);
    argsList[0] = new ExpVal(StorageAttribute.ALPHA, false, routerpath);
    if (isUndefined(routerOutletName))
      routerOutletName = "";
    argsList[1] = new ExpVal(StorageAttribute.ALPHA, false, routerOutletName);

    let args = new ArgumentsList(argsList);
    rtEvt.setArgList(args);
    rtEvt.setRouteParamList(routeParams);

    this.addToTail(rtEvt);
  }

  /// <summary>
  ///   Add internal event that was triggered by GUI queue (includes timer events) to the queue
  /// </summary>
  /// <param name = "ctrl">control </param>
  /// <param name = "code">code of internal event </param>
  /// <param name = "line">line in a table control </param>
  addGuiTriggeredEventWithCtrlAndCodeAndLine(ctrl: MgControlBase, code: number, line: number): void {
    let rtEvt: RunTimeEvent = new RunTimeEvent(<MgControl>ctrl, line, true);
    rtEvt.setInternal(code);
    this.addToTail(rtEvt);
  }

  /// <summary>
  ///   Add internal event that was triggered by GUI queue (includes timer events) to the queue
  /// </summary>
  /// <param name = "ctrl">control </param>
  /// <param name = "line">the line for multiline control </param>
  /// <param name = "code">code of internal event </param>
  addGuiTriggeredEventWithCtrlAndLineAndCodeAndIsProductClick(ctrl: MgControlBase, code: number, line: number, isProduceClick: boolean): void {
    let rtEvt: RunTimeEvent = new RunTimeEvent(<MgControl>ctrl, line, true);
    rtEvt.setInternal(code);
    rtEvt.setProduceClick(isProduceClick);
    this.addToTail(rtEvt);
  }

  /// <summary>
  ///   Add internal event that was triggered by GUI queue (includes timer events) to the queue
  /// </summary>
  /// <param name = "ctrl">control </param>
  /// <param name = "code">code of internal event </param>
  /// <param name = "list"></param>
  addGuiTriggeredEventWithCtrlAndCodeAndList(ctrl: MgControlBase, code: number, list: List<MgControlBase>): void {
    let rtEvt: RunTimeEvent = new RunTimeEvent(<MgControl>ctrl, list, true);
    rtEvt.setInternal(code);
    this.addToTail(rtEvt);
  }

  /// <summary> Add internal event that was triggered by GUI queue to the queue </summary>
  /// <param name = "task">reference to the task </param>
  /// <param name = "code">code of internal event </param>
  addGuiTriggeredEventWithTaskAndCode(task: ITask, code: number): void {
    let rtEvt: RunTimeEvent = new RunTimeEvent(<Task>task, true);
    rtEvt.setInternal(code);
    this.addToTail(rtEvt);
  }

  /// <summary> Add internal event that was triggered by GUI queue to the queue </summary>
  /// <param name="task"></param>
  /// <param name="code"></param>
  /// <param name="raisedBy">relevant only for online (for which subform are handled as orphans)</param>
  addGuiTriggeredEventTaskAndCodeAndRaisedBy(task: ITask, code: number, raisedBy: RaisedBy): void {
    this.addGuiTriggeredEventWithTaskAndCode(task, code);
  }

  /// <summary>
  ///   returns the first event from the queue and remove it from there
  /// </summary>
  private getEvent(): RunTimeEvent {
    return <RunTimeEvent>this._eventsQueue.poll();
  }

  getForceExit(): ForceExit {
    return this._forceExit;
  }

  private setForceExit(forceExit: ForceExit, task: Task): void {
    this._forceExit = forceExit;
    this.setForceExitTask(task);
  }

  private getForceExitTask(): Task {
    return this._forceExitTask;
  }

  private setForceExitTask(task: Task): void {
    this._forceExitTask = task;
  }

  /**
   * returns true if the EventsManager is currently handling a user event with
   * Force Exit = 'Pre-Record Update'
   */
  isForceExitPreRecordUpdate(task: Task): boolean {
    return this._isHandlingForceExit && this.getForceExit() === ForceExit.PreRecordUpdate && task === this.getForceExitTask();
  }

  /// <summary>
  ///   moves to a parkable ctrl if 'current' is NonParkable.
  ///   If 'current' is null, moves to first parkableCtrl.
  /// </summary>
  private moveToParkableCtrl(current: MgControl, checkDir: boolean): void {

    let cursorMovedNext: boolean = false;
    // QCR 760381 if after handling the event the current control is unparkable
    // try an move to the next parkable control
    if (current !== null && (!current.IsParkable(ClientManager.Instance.MoveByTab) || (checkDir && !current.allowedParkRelatedToDirection()))) {
      cursorMovedNext = (<MgForm>current.getForm()).moveInRow(current, Constants.MOVE_DIRECTION_NEXT);
      // if could not move to the next control check for errors
      if (!cursorMovedNext) {
        if (this.GetStopExecutionFlag()) {
          // cancel the errors and try to move to the previous control
          this.setStopExecution(false);
          // we change the level in order not to perform control suffix
          let currTask: Task = <Task>current.getForm().getTask();
          currTask.setLevel(Constants.TASK_LEVEL_RECORD);
          let cursorMovedPrev: boolean =  (<MgForm>current.getForm()).moveInRow(current, Constants.MOVE_DIRECTION_PREV);

          if (!cursorMovedPrev) {
            // if there is no previous control go to the next control
            // (remember errors are now disabled)
            // if we can't then there are no controls to park on
            cursorMovedNext = (<MgForm>current.getForm()).moveInRow(current, Constants.MOVE_DIRECTION_NEXT);

            if (!cursorMovedNext)
              this.HandleNonParkableControls(current.getForm().getTask());
          }
        }
        else
          this.HandleNonParkableControls(current.getForm().getTask());
      }
    }
    else if (current === null) {
      // fixed bug #:237159 we can get to this code before we activate control prefix, so the getLastFocusedTask is null.
      // if there is no parkable controls - check if one of the controls became parkable
      let task: Task = ClientManager.Instance.getLastFocusedTask();
      if (task !== null) {
        task.setLevel(Constants.TASK_LEVEL_RECORD);
        task.moveToFirstCtrl(false);

        if (GUIManager.getLastFocusedControl() !== null)
          cursorMovedNext = true;
      }
    }
    return;
  }

  /// <summary>
  ///   Main events loop, runs in worker thread for main window and for every
  ///   modal window Responsible for handling events
  /// </summary>
  /// <param name = "mgData"> </param>
  EventsLoop(mgData: MGData): void {
    let savedAllowEvents: EventsAllowedType = this.getAllowEvents();

    this.setAllowEvents(EventsAllowedType.ALL);

    this.pushNewExecStacks();

      this._eventsQueue.waitForElement();
      this.handleEvents(mgData, 0);

      // if we are aborting the task, we should not checkparkability. Because we have closed the task and we would
      // get the values of previous eventsloop. This would result in a loop as in #793138. The previous eventsloop
      // would take care of parkability if there is no parkable ctrl on that form.
      if (!mgData.IsAborting)
        this.checkParkability();

    // TODO: Need to find a place (after mgData.IsAborting becomes true) fromwhere the following 2 lines i.e. popNewExecStacks() and setAllowEvents() can be called.
    // BTW, for this, we will need to keep savedAllowEvents in global scope.
    // Maybe, we can have a collection of mgdata-to-savedAllowEvents.
    // this.popNewExecStacks();
    // this.setAllowEvents(savedAllowEvents);
  }

  handleGUIEvent(mgData: MGData) {
    try {
      this.handleEvents(mgData, 0);

      // if we are aborting the task, we should not checkparkability.
      if (!mgData.IsAborting)
        this.checkParkability();
    }
    catch(ex){
      // TODO: exception handling here is same as in ClientManager.WorkThreadExecution().
      // See if it can be reused.
      if (ex instanceof ApplicationException) {
        let isNoResultError: boolean = false;
        if (ex instanceof ServerError && (<ServerError>ex).GetCode() === ServerError.INF_NO_RESULT)
          isNoResultError = true;

        if (!isNoResultError)
          ClientManager.Instance.ProcessAbortingError(ex);

        this.setEndOfWork(true);
      }
      else
        throw ex;
    }
  }

  /// <summary>
  ///   Non interactive events loop, runs in worker thread for non interactive tasks
  ///   Responsible for cycling forward on records and handling events.
  /// </summary>
  /// <param name = "mgData"></param>
  NonInteractiveEventsLoop(mgData: MGData, task: Task): void {
    let savedAllowEvents: EventsAllowedType = this.getAllowEvents();

    this.setNonInteractiveAllowEvents(task.isAllowEvents(), task);

    this.pushNewExecStacks();

      if (task.getMode() === Constants.TASK_MODE_DELETE)
        this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_CYCLE_NEXT_DELETE_REC);
      else
        this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_CYCLE_NEXT_REC);

      // poll only 1 event.
      if (!mgData.IsAborting && task.isAllowEvents())
        this.handleEvents(mgData, 1);

    // TODO: Need to find a place (after mgData.IsAborting becomes true) fromwhere the following 2 lines i.e. popNewExecStacks() and setAllowEvents() can be called.
    // BTW, for this, we will need to keep savedAllowEvents in global scope.
    // Maybe, we can have a collection of mgdata-to-savedAllowEvents.
    // this.popNewExecStacks();
    // this.setAllowEvents(savedAllowEvents);
  }

  handleEvents(baseMgData: MGData, eventsToHandleCnt: number): void;
  handleEvents(handlersTab: HandlersTable, rtEvt: RunTimeEvent): void;
  handleEvents(baseMgDataOrHandlersTab: any, eventsToHandleCntOrRtEvt: any): void {
    if (arguments.length === 2 && (baseMgDataOrHandlersTab === null || baseMgDataOrHandlersTab instanceof MGData) && (eventsToHandleCntOrRtEvt === null || eventsToHandleCntOrRtEvt.constructor === Number)) {
      this.handleEvents_0(baseMgDataOrHandlersTab, eventsToHandleCntOrRtEvt);
      return;
    }
    this.handleEvents_1(baseMgDataOrHandlersTab, eventsToHandleCntOrRtEvt);
  }

  /// <summary>
  ///   get and remove events from the queue and handle them one by one till the queue is empty
  /// </summary>
  /// <param name = "baseMgData"> mgdata of the window that openeded that habdle event</param>
  /// <param name = "EventsToHandleCnt"></param>
  private handleEvents_0(baseMgData: MGData, eventsToHandleCnt: number): void {
    let task: Task = null;
    let delta: number = 0;
    let eventsPolledCnt: number = 0;

    this.setStopExecution(false);

    // get and remove events from the queue till its empty
    while (!this._eventsQueue.isEmpty() && !this._stopExecution && (eventsToHandleCnt === 0 || eventsPolledCnt < eventsToHandleCnt)) {
      let rtEvt: RunTimeEvent = this.getEvent();
      if (rtEvt !== null && rtEvt.isGuiTriggeredEvent()) {
        delta = Misc.getSystemMilliseconds();
        this._currKbdItem = null;

        let blockedByModalWindow: boolean = rtEvt.isBlockedByModalWindow(baseMgData);
        if (blockedByModalWindow && rtEvt.getInternalCode() !== InternalInterface.MG_ACT_TIMER) // QCR #726198, events from .NET objects which are not on form
        // should be handled on parent of modal window also
        {
          continue;
        }

        // Idle timer, timer events and enable/disable events should not change the current window.
        // This is because the current window determines the current task and changing the task
        // causes some task-scoped events to run on sub-tasks as well.
        if (!rtEvt.isIdleTimer() && !blockedByModalWindow && rtEvt.getInternalCode() !== InternalInterface.MG_ACT_ENABLE_EVENTS && rtEvt.getInternalCode() !== InternalInterface.MG_ACT_DISABLE_EVENTS && rtEvt.getTask() !== null && !rtEvt.getTask().getMGData().IsAborting) {
          MGDataCollection.Instance.currMgdID = rtEvt.getTask().getMGData().GetId();
        }
      }
      let currMgd: MGData = MGDataCollection.Instance.getCurrMGData();
      if (currMgd !== null) {
        while (currMgd !== null && currMgd.IsAborting) {
          currMgd = currMgd.getParentMGdata();
          if (currMgd !== null)
            MGDataCollection.Instance.currMgdID = MGDataCollection.Instance.getMgDataIdx(currMgd);
        }
      }
      else {
        /* QCRs #777217 & #942968                             */
        /* It might happen that we have removed the MGData    */
        /* from the MGTable in Manager.CloseEvent().  */
        /* It was done for fixing QCR# 296277 relating to mem */
        /* leaks.                                             */
        /* In that case, mgd would be null here.              */
        /* In such a scenario, take the parent mgd from the   */
        /* related task and continue processing the events.   */
        task = rtEvt.getTask();
        while (currMgd === null && task !== null && task.getParent() !== null) {
          task = task.getParent();
          currMgd = task.getMGData();
          if (currMgd.IsAborting)
            currMgd = null;

          if (currMgd !== null)
            MGDataCollection.Instance.currMgdID = MGDataCollection.Instance.getMgDataIdx(currMgd);
        }
      }
      if (currMgd === null)
        break;

      if (rtEvt.getTask() === null) {
        task = ClientManager.Instance.getLastFocusedTask();
        while (task !== null && (task.isAborting() || task.InEndTask))
          task = task.getParent();

        if (task !== null) {
          rtEvt.setCtrl(<MgControl>task.getLastParkedCtrl());
          rtEvt.setTask(task);
        }
      }
      else
        task = rtEvt.getTask();

      if (task !== null) {
        this.handleEvent(rtEvt, false);
        this.refreshTables();
      }

      GUIManager.Instance.execGuiCommandQueue();
      this._currCtrl = null; // delete current processed control

      if (task !== null)
        Task.CommandsProcessor.SendMonitorOnly();
      else {
        let mainProg: Task = MGDataCollection.Instance.GetMainProgByCtlIdx(0);
        Task.CommandsProcessor.SendMonitorOnly();
      }

      if (rtEvt !== null && rtEvt.isGuiTriggeredEvent()) {
        // logging for performance
        if (delta > 0) {
          delta = Misc.getSystemMilliseconds() - delta;
        }
      }

      // advance EventsPolled only if the event is internal. otherwise internals to be executed will be never reached by non interactive tasks.
      if (eventsToHandleCnt > 0 && rtEvt !== null && rtEvt.getType() === ConstInterface.EVENT_TYPE_INTERNAL && rtEvt.InternalEvent < InternalInterface.MG_ACT_TOT_CNT)
        eventsPolledCnt++;
    } // while (!_eventsQueue.isEmpty() ...
  }

  /// <summary>
  ///   send guiCommand to refresh all tables of this mgdata
  /// </summary>
  refreshTables(): void {
    let mgd: MGData = MGDataCollection.Instance.getCurrMGData();
    if (mgd !== null && !mgd.IsAborting) {
      for (let i: number = 0; i < mgd.getTasksCount(); i++) {
        // refresh all tables in the window
        let currTask: Task = mgd.getTask(i);
        let form: MgForm = <MgForm>currTask.getForm();
        if (form !== null && form.Opened) {
          if (!form.isSubForm() && !form.IsMDIFrame)
            Commands.addAsync(CommandType.REFRESH_TMP_EDITOR, form);
          let table: MgControl = <MgControl>form.getTableCtrl();
          if (table !== null) {
            // in the end of gui triggered event, we must refresh all table child properties
            // for the rows that were update
            Commands.addAsync(CommandType.REFRESH_TABLE, table, 0, false);
          }
        }
      }
    }
  }

  /// <summary>
  ///   Handle stop execution while executing any handler
  /// </summary>
  /// <param name = "rtEvt"></param>
  /// <returns></returns>
  private handleStopExecution(rtEvt: RunTimeEvent): boolean {
    let stop: boolean = false;

    if (!this.GetStopExecutionFlag())
      return stop;

    let task: Task = rtEvt.getTask();
    let currCtrl: MgControl = rtEvt.Control;
    let lastParkedCtrl: MgControl = GUIManager.getLastFocusedControl();
    let endTaskDueToVerifyError: boolean = false;
    if (rtEvt.getType() === ConstInterface.EVENT_TYPE_INTERNAL) {
      switch (rtEvt.getInternalCode()) {
        case InternalInterface.MG_ACT_TASK_PREFIX:
          endTaskDueToVerifyError = true;
          break;

        case InternalInterface.MG_ACT_REC_PREFIX:
          // An error in the record prefix sends us right back to the start of the record prefix.
          // It might create an endless loop but it is OK to do so. It is a developer bug.
          endTaskDueToVerifyError = true;
          break;

        case InternalInterface.MG_ACT_REC_SUFFIX:
          // it will be handled in commonhandlerafter
          this.setStopExecutionCtrl(null);
          this.setStopExecutionCtrl(<MgControl>task.getLastParkedCtrl());
          break;

        case InternalInterface.MG_ACT_CTRL_PREFIX:
          // Error might have occurred in CP.
          this.setStopExecution(false);
          task.InCtrlPrefix = false;

          if (lastParkedCtrl === null)
          // only for the first time
          {
            task.setCurrField(null);

            // Show the message Box continusly if user selects 'No', otherwise exit task
            if (!GUIManager.Instance.confirm(<MgForm>task.getForm(), MsgInterface.CONFIRM_STR_CANCEL)) {
              let prevCtrl: MgControl = currCtrl.getPrevCtrl();

              // if there is no prevCtrl, invoke CP on this ctrl again. we want to execute all operations
              // before the stopexecution operation.
              if (prevCtrl === null)
                prevCtrl = currCtrl;

              task.setCurrVerifyCtrl(currCtrl);

              // reset the stop execution ctrl
              this.setStopExecutionCtrl(null);
              this.setStopExecutionCtrl(currCtrl);

              task.setDirection(Task_Direction.NONE);
              task.setDirection(Task_Direction.BACK);

              this.handleInternalEventWithMgControlBase(prevCtrl, InternalInterface.MG_ACT_CTRL_PREFIX);
            }
            endTaskDueToVerifyError = true;
          }
          else {
            // CP got stop execution while executing the operations in this handler and is parkable.
            // we move to the next parkable in opp. direction
            let orgDir: Task_Direction = task.getDirection();
            let isDirFrwrd: boolean = false;

            task.setCurrField(lastParkedCtrl.getField());

            if (currCtrl.getField().getId() > lastParkedCtrl.getField().getId() || currCtrl.onDiffForm(lastParkedCtrl) || (<MgForm>task.getForm()).PrevDisplayLine !== currCtrl.getForm().DisplayLine)
              isDirFrwrd = true;

            task.setDirection(Task_Direction.NONE);
            task.setDirection(isDirFrwrd ? Task_Direction.BACK : Task_Direction.FORE); // reverse dir

            let nextCtrl: MgControl = currCtrl.getNextCtrlOnDirection(task.getDirection());

            if (nextCtrl !== null) {
              // if clicked, we are unable to park on it, so set it back to null.
              ClientManager.Instance.RuntimeCtx.CurrentClickedCtrl = null;
              task.setCurrVerifyCtrl(currCtrl);

              // if we get a error in executing operations in CP handler, we have already executed the CVs
              // from the last stopExecutionCtrl, so we need to reset it to curCtrl.
              this.setStopExecutionCtrl(null);
              this.setStopExecutionCtrl(currCtrl);

              this.handleInternalEventWithMgControlBase(nextCtrl, InternalInterface.MG_ACT_CTRL_PREFIX);
            }
            else
              Manager.SetFocus(lastParkedCtrl, -1);

            // reset the direction
            task.setDirection(Task_Direction.NONE);
            task.setDirection(orgDir);
          }
          this.setStopExecution(true);
          break;

        case InternalInterface.MG_ACT_CTRL_SUFFIX:
          // It must be set to false so that next time for fast mode CS must be executed.
          currCtrl.setInControlSuffix(false);
          break;

        case InternalInterface.MG_ACT_CTRL_VERIFICATION:
          if (currCtrl !== GUIManager.getLastFocusedControl() && task.getCurrVerifyCtrl() !== currCtrl) {
            this.setStopExecution(false);
            this.setStopExecutionCtrl(currCtrl);
            task.setCurrVerifyCtrl(currCtrl);
            // if in fast mode, we are now unable to park on the clicked ctrl and it must be set to null.
            ClientManager.Instance.RuntimeCtx.CurrentClickedCtrl = null;
            // since we want to park here due to error, we must reset this flag.
            task.InCtrlPrefix = false;

            // if we have tabbed and next ctrl has property tab_into as false, and we got an stop execution,
            // then return to last parked ctrl
            if (ClientManager.Instance.MoveByTab && !currCtrl.checkProp(PropInterface.PROP_TYPE_TAB_IN, true) &&
              lastParkedCtrl != null)
              this.handleInternalEventWithMgControlBase(lastParkedCtrl, InternalInterface.MG_ACT_CTRL_PREFIX);
            else
              this.handleInternalEventWithMgControlBase(currCtrl, InternalInterface.MG_ACT_CTRL_PREFIX);
            this.setStopExecution(true);
          }
          break;
      }
      if (endTaskDueToVerifyError) {
        task.endTask(true, false, true);
        stop = true;
      }
    }
    return stop;
  }

  /// <summary>
  ///   take care of "Force Exit" before the handler execute its operations returns true
  ///   if the force exit was handled
  /// </summary>
  /// <param name = "event">the event of the handler
  /// </param>
  /// <param name = "rtEvt">the run-time event
  /// </param>
  private handleForceExitBefore(evt: Event, rtEvt: RunTimeEvent): boolean {
    let forceExit: ForceExit = evt.UserEvt.ForceExit;
    let isNewRec: boolean = false;
    let oldIdx: number = 0;

    // TODO: check the effect of removing forceExit === <ForceExit>0
    if (forceExit === ForceExit.None || rtEvt.isImmediate())
      return false;
    this._isHandlingForceExit = true;
    let task: Task = rtEvt.getTask();
    let oldRec: Record = (<DataView>task.DataView).getCurrRec();
    if (oldRec !== null && oldRec.getMode() === DataModificationTypes.Insert && oldRec.isNewRec()) {
      isNewRec = true;
      oldIdx = oldRec.getId();
    }
    if (forceExit !== ForceExit.Editing && task.getLevel() === Constants.TASK_LEVEL_CONTROL) {
      let ctrl: MgControl = <MgControl>task.getLastParkedCtrl();
      if (ctrl !== null)
        this.handleInternalEventWithMgControlBase(ctrl, InternalInterface.MG_ACT_CTRL_SUFFIX);
    }

    // Should we exit the record?
    if ((forceExit === ForceExit.PreRecordUpdate || forceExit === ForceExit.PostRecordUpdate) && task.getLevel() === Constants.TASK_LEVEL_RECORD) {
      this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_SUFFIX);
      if (task.getMode() === Constants.TASK_MODE_CREATE && !this._stopExecution)
        task.setMode(Constants.TASK_MODE_MODIFY);
      let currRec: Record = (<DataView>task.DataView).getCurrRec();
      // If we failed exiting a newly created record - restore insert mode of the record
      if (currRec !== null && this._stopExecution && isNewRec && oldIdx === currRec.getId() && task.getMode() === Constants.TASK_MODE_CREATE) {
        // restore insert mode of the record
        currRec.clearMode();
        currRec.restart(DataModificationTypes.Insert);
      }
    }
    if (forceExit === ForceExit.PostRecordUpdate && !this._stopExecution) {
      if (task.getLevel() === Constants.TASK_LEVEL_TASK)
        this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_PREFIX);
    }

    // QCR #303762 - additional support for forceExit = editing
    if (forceExit === ForceExit.Editing) {
      let evtCtrl: MgControl = rtEvt.Control;

      // if there is a control that is attached to a field and the control was changed
      // in case of multiline go inside anyway because there are some edit actions that are not going through
      // textMaskEdit that is incharge of setting the ModifiedByUser (such as delprev, delchar)
      if (evtCtrl !== null && evtCtrl.getField() !== null && (evtCtrl.ModifiedByUser || evtCtrl.isMultiline())) {
        let ctrlVal: string = Manager.GetCtrlVal(evtCtrl);
        let evtCtrlval: string = evtCtrl.Value;
        // test the new control value
        evtCtrl.validateAndSetValue(ctrlVal, true);
      }
    }
    return true;
  }

  /// <summary>
  ///   take care of "Force Exit" after handling the event </summary>
  /// <param name = "rtEvt">the run-time event </param>
  private handleForceExitAfter(rtEvt: RunTimeEvent): void {
    let forceExit: ForceExit = rtEvt.UserEvt.ForceExit;

    let task: Task = rtEvt.getTask();

    // QCR#776295: for pre record update, commit the record after handler's execution.
    if (forceExit === ForceExit.PreRecordUpdate) {
      this.commitRecord(task, true);
      if (!task.transactionFailed(ConstInterface.TRANS_RECORD_PREFIX) && !task.isAborting()) {
        // check whether to evaluate the end condition after the record suffix
        if (task.evalEndCond(ConstInterface.END_COND_EVAL_AFTER))
          task.endTask(true, false, false);
      }
    }

    // For post-record type we already did rec-prefix and ctrl prefix in the handleForceExitBefore
    if (forceExit !== ForceExit.PostRecordUpdate) {
      task = rtEvt.getTask();
      if (task.getLevel() === Constants.TASK_LEVEL_TASK)
        this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_PREFIX);
    }
    let ctrl: MgControl = GUIManager.getLastFocusedControl();
    if (ctrl !== null && forceExit !== ForceExit.Editing) {
      this.handleInternalEventWithMgControlBase(ctrl, InternalInterface.MG_ACT_CTRL_PREFIX);
    }

    // QCR 801873 - update the display after handler of force exit editing
    if (forceExit === ForceExit.Editing) {
      let evtCtrl: MgControl = rtEvt.Control;
      // if there is a control that is attached to a field
      if (evtCtrl !== null && evtCtrl.getField() !== null)
        (<Field>evtCtrl.getField()).updateDisplay();
    }
  }

  /// <summary>
  ///   a special routine to handle data and timer events
  ///   it receives a HandlersTable and execute them one by one
  /// </summary>
  /// <param name = "handlersTab">the handlers table</param>
  /// <param name = "rtEvt">a referennce to the timer runtime event - for expression events it must be null</param>
  private handleEvents_1(handlersTab: HandlersTable, rtEvt: RunTimeEvent): void {
    try {
      this.pushRtEvent(rtEvt);
      for (let i: number = 0; i < handlersTab.getSize(); i++) {
        let handler: EventHandler = handlersTab.getHandler(i);
        // the rtEvt is used to pass the ctrl, therefor it must be valid (not null)
        if (rtEvt.getType() === ConstInterface.EVENT_TYPE_EXPRESSION || handler.isSpecificHandlerOf(rtEvt) || handler.isNonSpecificHandlerOf(rtEvt) || handler.isGlobalHandlerOf(rtEvt)) {
          handler.execute(rtEvt, false, false);
        }
      }
    }
    finally {
      this.popRtEvent();
    }
  }

  /// <summary>
  ///   Takes care of keydown Event
  /// </summary>
  /// <param name = "task">task</param>
  /// <param name = "ctrl">control pressed</param>
  /// <param name = "kbdItem">keybord item</param>
  handleKeyDown(task: Task, ctrl: MgControl, evt: RunTimeEvent): void {
    let kbdItem: KeyboardItem = evt.getKbdItmAlways();
    let keyCode: number = kbdItem.getKeyCode();
    let modifier: Modifiers = kbdItem.getModifier();
    this._currKbdItem = kbdItem;

    // If keyboard buffering is responsible for this event, we need to find the right control to receive
    // this event
    if (evt.IgnoreSpecifiedControl) {
      ctrl = this.getCurrCtrl();
      task = (((ctrl.getForm().getTask() instanceof Task) ? <Task>ctrl.getForm().getTask() : null));
      // The control receiving keys from keyboard buffering must be a textbox
      if (ctrl.Type !== MgControlType.CTRL_TYPE_TEXT)
        return;
    }

    Logger.Instance.WriteDevToLog("Start handling KEYDOWN event. Key code: " + keyCode);

    try {
      if (ctrl !== null)
        ctrl.refreshPrompt();

      // DOWN or UP invoked on a SELECT/RADIO control
      if (this._currKbdItem.equals(ClientManager.Instance.KBI_DOWN) || this._currKbdItem.equals(ClientManager.Instance.KBI_UP)) {
        if (ctrl !== null && (ctrl.Type === MgControlType.CTRL_TYPE_LIST || ctrl.Type === MgControlType.CTRL_TYPE_RADIO))
          return;
      }

      let rtEvt: RunTimeEvent = new RunTimeEvent(task, ctrl);
      rtEvt.setSystem(this._currKbdItem);
      rtEvt.setEditParms(evt.getStartSelection(), evt.getEndSelection(), evt.getValue());
      try {
        this.handleEvent(rtEvt, false);
      }
      finally {
        if (this._stopExecution) {
          let returnToCtrl: MgControl = ClientManager.Instance.ReturnToCtrl;
          if (returnToCtrl !== null && ClientManager.Instance.validReturnToCtrl())
            returnToCtrl.getForm().getTask().setLastParkedCtrl(returnToCtrl);
        }
      }
      let mgd: MGData = MGDataCollection.Instance.getCurrMGData();
      // check if the MGData is still alive after handling the events above
      if (mgd !== null && !mgd.IsAborting)
        this.handleExpressionHandlers();
      Logger.Instance.WriteDevToLog("End handling KEYDOWN event. Key code: " + keyCode);
      // if a key was pressed on table child, make sure that is is visible
      if (ctrl !== null && ctrl.IsRepeatable && ctrl === ClientManager.Instance.ReturnToCtrl) {
        (<MgForm>ctrl.getForm()).bringRecordToPage();
      }
    }
    finally {
      ClientManager.Instance.setMoveByTab(false);
    }
  }

  /// <summary>
  ///   for radio button we handle the keys down,up,left,right
  ///   we are handling those keys
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "evt"></param>
  private selectionControlHandleArrowKeyAction(ctrl: MgControl, evt: RunTimeEvent): void {
    let suggestedValue: string = evt.getValue();
    let kbdItem: KeyboardItem = evt.getKbdItmAlways();
    let keyCode: number = kbdItem.getKeyCode();

    // for radio button when we on the last option and we have more then one control attoced to the same variable
    // we need to move to the next control
    if (ctrl.Type === MgControlType.CTRL_TYPE_RADIO) {
      if (ctrl.Value === suggestedValue && (keyCode === GuiConstants.KEY_DOWN || keyCode === GuiConstants.KEY_UP)) {
        // when more then one control with this variable, we move to a diffrent control
        if (ctrl.isPartOfDataGroup()) {
          let nextSibling: MgControl;
          // find the next control according to zorder (which is the order of control in array)
          if (keyCode === GuiConstants.KEY_DOWN)
            nextSibling = ctrl.getNextSiblingControl();
          else
            nextSibling = ctrl.getPrevSiblingControl();
          if (nextSibling !== null) {
            ctrl = nextSibling;
            ctrl.setControlToFocus();
            if (keyCode === GuiConstants.KEY_UP) {
              // we're going up, so go to last value
              let displayVals: string[] = ctrl.getDispVals(0, true);
              suggestedValue = (displayVals.length - 1).toString();
            }
            else {
              // we're going down, so go the first value
              suggestedValue = "0";
            }
          }
        }
      }
    }

    if (ctrl !== null) {
      let lineToBeDisplay: number = ctrl.getForm().DisplayLine;
      this.simulateSelection(ctrl, suggestedValue, lineToBeDisplay, false);
      Manager.SetFocus(ctrl, -1);
    }
  }

  /// <summary>Handle Selection Event</summary>
  /// <param name = "ctrl">control</param>
  /// <param name = "line">line</param>
  /// <param name = "value">value</param>
  private handleSelection(ctrl: MgControl, line: number, val: any): void {
    if (ctrl.Type === MgControlType.CTRL_TYPE_TAB || ctrl.Type === MgControlType.CTRL_TYPE_CHECKBOX || ctrl.Type === MgControlType.CTRL_TYPE_RADIO || ctrl.Type === MgControlType.CTRL_TYPE_COMBO || ctrl.Type === MgControlType.CTRL_TYPE_LIST) {
      let checkFocus: boolean = (ctrl.Type !== MgControlType.CTRL_TYPE_TAB && ctrl.Type !== MgControlType.CTRL_TYPE_CHECKBOX);
      let allowSelection: boolean = (checkFocus ? (ctrl.getForm().getTask().getLastParkedCtrl() === ctrl) : true);

      if (!allowSelection || !ctrl.isModifiable() || !ctrl.IsParkable(false))
        ctrl.restoreOldValue();
      else {
        if (ctrl.isChoiceControl())
          Commands.setGetSuggestedValueOfChoiceControlOnTagData(ctrl, ctrl.IsRepeatable ? line : 0, true);

        if (ctrl.isDifferentValue(val, ctrl.IsNull, true)) {
          // #931545 - var change must be invoked first before control verification.
          ctrl.ModifiedByUser = true;
          this.handleCtrlModify(ctrl, InternalInterface.MG_ACT_SELECTION);
        }

        if (ctrl.isChoiceControl())
          Commands.setGetSuggestedValueOfChoiceControlOnTagData(ctrl, ctrl.IsRepeatable ? line : 0, false);

        // For multiple selection ListBox value to field and ctrl would be set on leaving
        // control, before executing control suffix. So variable change internal event would be
        // handled before executing control suffix.
        if (!ctrl.IsMultipleSelectionListBox())
          ctrl.validateAndSetValue(val, true);
      }
    }
  }

  /// <summary>
  ///   Handle Mouse Up Event
  /// </summary>
  /// <param name = "ctrl">contol
  /// </param>
  /// <param name = "line">line of multiline control
  /// </param>
  /// <param name = "produceClick">if true, produce click event
  /// </param>
  private handleMouseUp(ctrl: MgControl, line: number, produceClick: boolean): void {
    if (ctrl === null)
      return;

    // QCR # 6144 see documentation for the _currClickedRadio member
    if (ctrl.Type === MgControlType.CTRL_TYPE_RADIO)
      ClientManager.Instance.RuntimeCtx.CurrentClickedRadio = ctrl;
    try {
      if (ctrl.Type !== MgControlType.CTRL_TYPE_TABLE) {
        if (!ctrl.checkPropWithLine(PropInterface.PROP_TYPE_ENABLED, true, line)) {
          return;
        }
        let canGotoCtrl: boolean = this.canGoToControl(ctrl, line, true);
        let StopFocus: boolean = ctrl.isFocusedStopExecution();

        let returnToCtrl: MgControl = ClientManager.Instance.ReturnToCtrl;

        if ((!canGotoCtrl || ((this._stopExecution || StopFocus) && returnToCtrl !== ctrl)) && returnToCtrl !== null) {
          MGDataCollection.Instance.currMgdID = (<Task>returnToCtrl.getForm().getTask()).getMgdID();
          if (returnToCtrl.IsRepeatable)
            (<MgForm>returnToCtrl.getForm()).bringRecordToPage();
          Manager.SetFocus(returnToCtrl, -1);
          returnToCtrl.getForm().getTask().setLastParkedCtrl(returnToCtrl);
        }
        if (this._stopExecution || StopFocus)
          return;
      }

      if (produceClick && (ctrl.Type === MgControlType.CTRL_TYPE_BUTTON || ctrl.Type === MgControlType.CTRL_TYPE_CHECKBOX || ctrl.Type === MgControlType.CTRL_TYPE_LIST)) {
        let rtEvt: RunTimeEvent = new RunTimeEvent(ctrl);
        rtEvt.setInternal(InternalInterface.MG_ACT_WEB_CLICK);
        this.addToTail(rtEvt);
      }
    }
    finally {
      ClientManager.Instance.RuntimeCtx.CurrentClickedRadio = null;
    }
  }

  /// <summary>
  ///   Handle Focus Event
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "line">line of multiline control</param>
  /// <param name = "onClick"></param>
  private handleFocus(ctrl: MgControl, line: number, onClick: boolean): void {
    try {
      // when CloseTasksOnParentActivate is true, try and close all child tasks before focusing.
      if (ClientManager.Instance.getEnvironment().CloseTasksOnParentActivate()) {
        // we send the task of the top most form since our focus might be inside a subform, and that is equal to clicking on its form.
        this.CloseAllChildProgs(<Task>ctrl.getTopMostForm().getTask(), null, false);
        if (this._stopExecution)
          return;

        // static cannot get focus, meaning we are here just for the CloseTasksOnParentActivate.
        if (ctrl.isStatic())
          return;
      }

      if (onClick)
        ClientManager.Instance.RuntimeCtx.CurrentClickedCtrl = ctrl;

      let prevCtrl: MgControl = GUIManager.getLastFocusedControl();
      if (ctrl === prevCtrl && !ctrl.isRepeatable())
      // we received focus twice
        return;

      this._nextParkedCtrl = ctrl; // save the NEXT control (used to check the direction)

      if (ctrl === null || ctrl.Type === MgControlType.CTRL_TYPE_TABLE) {
        if (prevCtrl === null)
          this.HandleNonParkableControls(ctrl.getForm().getTask());
        return;
      }
      let prevTask: Task = ClientManager.Instance.getLastFocusedTask();

      let currTask: Task;
      if ((ctrl.Type === MgControlType.CTRL_TYPE_BUTTON) && (<RaiseAt>((ctrl.getProp(PropInterface.PROP_TYPE_RAISE_AT)).getValueInt()) === RaiseAt.TaskInFocus))
        currTask = prevTask;
      else
        currTask = <Task>ctrl.getForm().getTask();

      let canGotoCtrl: boolean = this.canGoToControl(ctrl, line, onClick);

      // Go to the control - insert prefix
      if (canGotoCtrl) {
        let eventLine: number = (ctrl.isRepeatable() || ctrl.isRadio()) ? line : Int32.MinValue;
        let rtEvt: RunTimeEvent = new RunTimeEvent(ctrl, eventLine);
        rtEvt.setInternal(InternalInterface.MG_ACT_CTRL_PREFIX);
        this.handleEvent(rtEvt, false);
      }
      else if (prevCtrl !== null) {
        if (!prevCtrl.isModifiable()) {
          if (prevCtrl.isChoiceControl())
            prevCtrl.restoreOldValue();
        }
        else if (!currTask.cancelWasRaised()) {
          let newVal: string = Manager.GetCtrlVal(prevCtrl);
          if (!prevCtrl.validateAndSetValue(newVal, true))
            this.setStopExecution(true);
        }
        ClientManager.Instance.ReturnToCtrl = prevCtrl;
      }
      else
        this.HandleNonParkableControls(ctrl.getForm().getTask());

      if (!this._stopExecution && ClientManager.Instance.ReturnToCtrl === ctrl)
        ClientManager.Instance.setLastFocusedCtrl(ctrl);
      return;
    }
    finally {
      ctrl.setFocusedStopExecution(this._stopExecution);
      if (this._stopExecution) {
        {
          let returnToCtrl: MgControl = ClientManager.Instance.ReturnToCtrl;

          if (returnToCtrl !== null) {
            MGDataCollection.Instance.currMgdID = (<Task>returnToCtrl.getForm().getTask()).getMgdID();
            Manager.SetFocus(returnToCtrl, -1);
            returnToCtrl.getForm().getTask().setLastParkedCtrl(returnToCtrl);
          }
        }
      }
    }
  }


  /// <summary>
  ///   returns true if we can go to the control and try to park on in
  /// </summary>
  /// <param name = "ctrl">control</param>
  /// <param name = "line">line</param>
  /// <param name = "onClick">real click is performed, this not click simulation</param>
  /// <returns></returns>
  private canGoToControl(ctrl: MgControl, line: number, onClick: boolean): boolean {

    if (onClick && (ctrl.Type === MgControlType.CTRL_TYPE_SUBFORM || ctrl.Type === MgControlType.CTRL_TYPE_BROWSER))
      return false;

    // V9.4SP4d change of behavior - we do not "exit" from the current ctrl
    // (i.e. not performing ctrl suffix or ctrl verifications) if the target ctrl
    // is a button with no data attached or IMG or hypertext.
    let canGotoCtrl: boolean = false;
    let prevTask: Task = ClientManager.Instance.getLastFocusedTask();
    let currTask: Task = <Task>ctrl.getForm().getTask();

    if (!currTask.IsInteractive)
      return false;

    if (ClientManager.Instance.getEnvironment().getSpecialExitCtrl() || ctrl.getField() !== null || ctrl.IsRepeatable || (prevTask !== null && prevTask !== currTask)) {
      if (onClick) {
        switch (ctrl.Type) {
          // if clicking on a button and the park_on_click is NO, then do not try to park on it.
          case MgControlType.CTRL_TYPE_BUTTON:
            if (line === ctrl.getDisplayLine(false) && (!ctrl.checkPropWithLine(PropInterface.PROP_TYPE_PARK_ON_CLICK, true, line) || (ctrl.getField() == null)))
              canGotoCtrl = false;
            else
              canGotoCtrl = true;
            break;

          default:
            canGotoCtrl = true;
            break;
        }
      }
      else
        canGotoCtrl = true;
    }
    else if (ctrl.Type !== MgControlType.CTRL_TYPE_BUTTON && ctrl.Type !== MgControlType.CTRL_TYPE_IMAGE)
      canGotoCtrl = true;

    return canGotoCtrl;
  }

  /// <summary>
  ///   Handle Timer Events
  /// </summary>
  /// <param name = "evt">tuntime timer event</param>
  private handleTimer(evt: RunTimeEvent): void {
    evt.setType(ConstInterface.EVENT_TYPE_TIMER);
    if (evt.isIdleTimer())
      this.handleExpressionHandlers();
    else {
      let mgd: MGData = MGDataCollection.Instance.getMGData(evt.getMgdID());
      this.handleEvents(mgd.getTimerHandlers(), evt);
    }
  }

  /// <summary>
  ///   process expression handlers
  /// </summary>
  handleExpressionHandlers(): void {
    let rtEvt: RunTimeEvent = new RunTimeEvent(ClientManager.Instance.getLastFocusedTask(), GUIManager.getLastFocusedControl());
    rtEvt.setExpression(null);
    rtEvt.setMainPrgCreator(rtEvt.getTask());
    for (let i: number = 0; i < MGDataCollection.Instance.getSize(); i++) {
      let mgd: MGData = MGDataCollection.Instance.getMGData(i);
      if (mgd !== null && !mgd.IsAborting)
        this.handleEvents(mgd.getExpHandlers(), rtEvt);
    }
  }

  /// <summary>
  ///   resize of page
  /// </summary>
  /// <param name = "ctrl">table</param>
  /// <param name = "rowsInPage"></param>
  private handleResize(ctrl: MgControl, rowsInPage: number): void {
    (<MgForm>ctrl.getForm()).setRowsInPage(rowsInPage);
  }

  /// <summary>
  ///   get data for Row
  /// </summary>
  /// <param name = "ctrl">
  /// </param>
  /// <param name = "sendAll">if true, send all records
  /// </param>
  /// <param name = "row">
  /// </param>
  private handleRowDataCurPage(table: MgControl, desiredTopIndex: number, sendAll: boolean, lastFocusedVal: LastFocusedVal): void {
    let form: MgForm = <MgForm>table.getForm();
    form.setRowData(desiredTopIndex, sendAll, lastFocusedVal);
  }

  /// <summary>
  ///   transfers data to GUI thread in free worker thread time
  /// </summary>
  /// <param name = "ctrl"></param>
  private handleTransferDataToGui(ctrl: MgControl): void {
    let form: MgForm = <MgForm>ctrl.getForm();
    form.transferDataToGui();
  }

  /// <summary>
  /// check if it is allowed and open combo drop down list
  /// </summary>
  /// <param name="ctrl">comboboox control</param>
  /// <param name="line">row applicale for table control</param>
  private handleComboDropDown(ctrl: MgControl, line: number): void {
    if (ctrl.isParkable(true, false) && ctrl.getDisplayLine(true) === line && ctrl.isModifiable())
      ctrl.processComboDroppingdown(line);
  }

  /// <summary>
  ///   When internal act asks for enable/disable of an act list.
  ///   call enableList with onlyIfChanged = true to minimize calls to menus refresh.
  /// </summary>
  /// <param name = "enable"></param>
  private handleEnableEvents(evt: RunTimeEvent, enable: boolean): void {
    evt.getTask().ActionManager.enableList(evt.getActEnableList(), enable, true);
  }

  /// <summary>
  ///   Evaluates the direction of flow.
  /// </summary>
  /// <param name = "rtEvt">
  /// </param>
  private handleDirection(rtEvt: RunTimeEvent): void {
    let task: Task = rtEvt.getTask();
    let ctrl: MgControl = rtEvt.Control;
    let lastParkedCtrl: MgControl = GUIManager.getLastFocusedControl();

    // Set direction to forward if task executed first time.
    if (task.getLastParkedCtrl() == null) {
      task.setDirection(Task_Direction.FORE);
      return;
    }

    if (lastParkedCtrl === null)
      return;
    if ((!task.getInRecordSuffix() && !task.getInCreateLine()) || (<DataView>task.DataView).getCurrRec().Modified) {
      // preform ver only if we are not here because of a rec suffix
      if (lastParkedCtrl.getField() === null)
        return;

      if (ctrl !== null) {
        if (lastParkedCtrl === ctrl)
          task.setDirection(Task_Direction.FORE);
        else {
          // find ctrl in prev direction according to taborder. If found set direction to back.
          for (let prevCtrl: MgControl = lastParkedCtrl.getPrevCtrl(); prevCtrl !== null; prevCtrl = prevCtrl.getPrevCtrl()) {
            if (prevCtrl === ctrl) {
              task.setDirection(Task_Direction.BACK);
              break;
            }
          }

          if (task.getDirection() === Task_Direction.NONE) {
            // find ctrl in forward direction according to taborder. If found set direction to forward.
            for (let nextCtrl: MgControl = lastParkedCtrl.getNextCtrl(); nextCtrl !== null; nextCtrl = nextCtrl.getNextCtrl()) {
              if (nextCtrl === ctrl) {
                task.setDirection(Task_Direction.FORE);
                break;
              }
            }
          }
        }
        if (task.getDirection() === Task_Direction.BACK) {
          let setForwardDirection: boolean = false;

          // As in OL, in case the user clicks on another row in same task, set task's direction as Forward.
          if (ctrl.getForm() === lastParkedCtrl.getForm() &&                    // same task
            (<Task>ctrl.getForm().getTask()).getFlowMode() === Task_Flow.FAST &&     // click
            rtEvt.getDisplayLine() >= 0 &&
            ctrl.getForm().DisplayLine !== rtEvt.getDisplayLine())              // another row
            setForwardDirection = true;

          // 1. we may have done tab from the last control on the form, so we get lastmoveinrowdir as BEGIN.
          // 2. we may also have tabbed from last ctrl on subform and moved to parent form. On parent form,
          // we invoked moveInView (i.e moving to next record).
          // In both case, we would get dir_begin on curr task, and must reset the direction to FORE.
          if ((<Task>lastParkedCtrl.getForm().getTask()).getFlowMode() === Task_Flow.STEP && ctrl.getForm().getTask().getLastMoveInRowDirection() === Constants.MOVE_DIRECTION_BEGIN)
            setForwardDirection = true;

          if (setForwardDirection) {
            task.setDirection(Task_Direction.NONE);
            task.setDirection(Task_Direction.FORE);
          }
        }
      }
    }
  }


  /// <summary>
  ///   Handles control Prefix
  /// </summary>
  /// <param name = "evt"></param>
  /// <returns></returns>
  private handleCtrlPrefix(evt: RunTimeEvent): boolean {
    let task: Task = evt.getTask();
    let currClickedCtrl: MgControl = <MgControl>ClientManager.Instance.RuntimeCtx.CurrentClickedCtrl;
    let form: MgForm = <MgForm>task.getForm();
    let displayLine: number = evt.getDisplayLine();
    let ctrl: MgControl = evt.Control;

    if (form.isLineMode()) {
      if (displayLine === Int32.MinValue || ctrl.isRadio())
        displayLine = form.DisplayLine;
    }
    else
      displayLine = Int32.MinValue;

    let lastParkedCtrl: MgControl = GUIManager.getLastFocusedControl();

    task.locateQuery.Init(ctrl);

    // prevent double prefix on the same control
    // For Fast Mode, CS is executed from here, whereas for step mode it is done
    // in moveInRow. so, for step mode double execution of CS must be stopped.
    if (lastParkedCtrl !== null && (<Task>lastParkedCtrl.getForm().getTask()).getMGData().GetId() === (<Task>ctrl.getForm().getTask()).getMGData().GetId() && lastParkedCtrl.getForm().getTask().getLevel() === Constants.TASK_LEVEL_CONTROL) {
      if ((ctrl !== lastParkedCtrl || (ctrl.isRepeatable() && displayLine !== ctrl.getDisplayLine(true))) && !lastParkedCtrl.isInControlSuffix())
      // QCR #970806
      {
        this.handleInternalEventWithMgControlBase(lastParkedCtrl, InternalInterface.MG_ACT_CTRL_SUFFIX);
        if (this._stopExecution) {
          if (ctrl.Type === MgControlType.CTRL_TYPE_LIST || ctrl.Type === MgControlType.CTRL_TYPE_RADIO || ctrl.Type === MgControlType.CTRL_TYPE_CHECKBOX || ctrl.isTabControl()) {
            ctrl.resetPrevVal();
            ctrl.RefreshDisplay();
          }
          return false;
        }
      }
      else
        return false;
    }
    if (task.InCtrlPrefix)
      return false;

    task.InCtrlPrefix = true;

    // make sure it has not come again through moveinrow.
    // eg: if clicked ctrl on subform is non parkable, first time it executes RP CV for subforms and then
    // enters moveinrow for parkable ctrl. we shouldnot execute this block when we come for CP of parkable ctrl.
    // For tab, we come here directly for parkable ctrl, and this block must always execute if on diff forms.
    // isSort : if clicked on table header, we park on colomn ctrl after sort, and we must include subforms
    // in executing CVs
    if (task.getLastMoveInRowDirection() === Constants.MOVE_DIRECTION_NONE || this._isSorting) {

      // If the current ctrl is on a subform, then execute in sequence
      // 1. RS of nested subforms until subform task containg these 2 subforms. we must also execute RS if clicked
      //    in subform and parked back on a ctrl's task. (#722115- currClickedCtrl and ctrl should not be on different window)
      // 2. CV execution of LastParkedCtrl till end
      // 3. RP-CVs for all intermediate subforms
      let prevCtrl: MgControl = lastParkedCtrl;
      if (currClickedCtrl !== null && (<Task>currClickedCtrl.getForm().getTask()).getMgdID() === (<Task>ctrl.getForm().getTask()).getMgdID() && ctrl.onDiffForm(currClickedCtrl))
        prevCtrl = currClickedCtrl;

      if (prevCtrl !== null && ctrl.onDiffForm(prevCtrl)) {
        // RS of nested subforms until subform task contaning these 2 subforms
        let prevTask: Task = <Task>prevCtrl.getForm().getTask();
        prevTask.execSubformRecSuffix(<Task>ctrl.getForm().getTask());
        if (this._stopExecution) {
          if (ctrl.Type === MgControlType.CTRL_TYPE_LIST || ctrl.Type === MgControlType.CTRL_TYPE_RADIO || ctrl.Type === MgControlType.CTRL_TYPE_CHECKBOX || ctrl.isTabControl()) {
            ctrl.resetPrevVal();
            ctrl.RefreshDisplay();
          }
          task.InCtrlPrefix = false;
          return false;
        }

        // If subform and step, set the flow and direction of ctrl's task to prevCtrl's task.
        if (prevTask.getFlowMode() === Task_Flow.STEP) {
          task.setDirection(Task_Direction.NONE);
          task.setFlowMode(Task_Flow.NONE);
          task.setDirection(prevTask.getDirection());
          task.setFlowMode(prevTask.getFlowMode());
        }


        // handle CV execution of prevCtrl till end CVs for Subforms
        // and RP-CVs for all intermediate subforms
        if (!this.executeVerifyHandlerSubforms(task, ctrl)) {
          if (this._stopExecution) {
            if (ctrl.isListBox() || ctrl.isRadio() || ctrl.isTabControl() || ctrl.isCheckBox()) {
              ctrl.resetPrevVal();
              ctrl.RefreshDisplay();
            }
          }
          task.InCtrlPrefix = false;
          return false;
        }

        // reset dir and flow of prevCtrl's task back to FLOW_NONE
        prevTask.setDirection(Task_Direction.NONE);
        prevTask.setFlowMode(Task_Flow.NONE);

        if (ctrl.getForm().getTask().isAborting()) {
          task.InCtrlPrefix = false;
          return false;
        }

        EventsManager.doSyncForSubformParent(task);
      }

      // Execute RP of the current task before executing the CVs before 'ctrl'
      if (task.DataView.isEmptyDataview())
        this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_PREFIX);
      else {
        task.SubformExecMode = Task_SubformExecModeEnum.SET_FOCUS;
        let rtEvt: RunTimeEvent = new RunTimeEvent(ctrl, displayLine);
        rtEvt.setInternal(InternalInterface.MG_ACT_REC_PREFIX);
        this.handleEvent(rtEvt, false);
      }
      if (this.GetStopExecutionFlag()) {
        task.InCtrlPrefix = false;
        return false;
      }
    }
    else if (task.getInCreateLine()) {

      // if task is in create mode and we are switching between forms, set the flow and direction of ctrl's task
      // to lastparkedctrl's task. we may have tabbed from last ctrl on subform, and landed on some other form in
      // create mode. (#988152)
      if (lastParkedCtrl !== null && ctrl.onDiffForm(lastParkedCtrl)) {
        let lastParkedTask: Task = <Task>lastParkedCtrl.getForm().getTask();

        if (lastParkedTask.getFlowMode() === Task_Flow.STEP) {
          task.setDirection(Task_Direction.NONE);
          task.setFlowMode(Task_Flow.NONE);
          task.setDirection(lastParkedTask.getDirection());
          task.setFlowMode(lastParkedTask.getFlowMode());

          // reset dir and flow of lastParkedCtrl's task back to FLOW_NONE
          lastParkedTask.setDirection(Task_Direction.NONE);
          lastParkedTask.setFlowMode(Task_Flow.NONE);
        }
      }
    }

    let orgFlow: Task_Flow = task.getFlowMode();
    let orgDirection: Task_Direction = task.getDirection();

    // QCR# 806015: If we have a single field with allow parking = Yes and Tab Into = No, then on pressing tab if cursor is not moved, we come to
    // park on lastParkedCtrl(which is same as ctrl) since TabInto is not allowed.
    // So to avaoid infinite recursion, we should not again try to park on it.
    if ((!ctrl.IsParkable(false) && ctrl !== lastParkedCtrl) || (!ctrl.IgnoreDirectionWhileParking && !ctrl.allowedParkRelatedToDirection())) {
      task.InCtrlPrefix = false;

      if (lastParkedCtrl === null) {
        // if we have not parked on any ctrl and got a stopexecution, move in prev direction.
        if (this.getStopExecutionCtrl() !== null) {
          task.setCurrVerifyCtrl(this._currCtrl);

          task.setDirection(Task_Direction.NONE);
          task.setDirection(Task_Direction.BACK);
          let cursorMoved: boolean = form.moveInRow(ctrl, Constants.MOVE_DIRECTION_PREV);
        }
        else
          task.moveToFirstCtrl(true);
      }
      else {
        let cursorMoved: boolean;
        if (ctrl.getField() === null) {
          cursorMoved = lastParkedCtrl.invoke();
          if (!cursorMoved)
            cursorMoved = form.moveInRow(null, Constants.MOVE_DIRECTION_NEXT);
        }
        else {
          let isDirFrwrd: boolean = false;
          if (ctrl.onDiffForm(lastParkedCtrl) || form.ctrlTabOrderIdx(ctrl) > form.ctrlTabOrderIdx(lastParkedCtrl) || form.PrevDisplayLine !== ctrl.getForm().DisplayLine)
            isDirFrwrd = true;

          // if we had a stopexecution and ctrl is non parkable, then we are here
          // to find the next parkable ctrl in reverse direction.
          if (this.getStopExecutionCtrl() !== null)
            isDirFrwrd = !isDirFrwrd;

          if (isDirFrwrd) {
            task.setDirection(Task_Direction.NONE);
            task.setDirection(Task_Direction.FORE);
            cursorMoved = form.moveInRow(ctrl, Constants.MOVE_DIRECTION_NEXT);
          }
          else {
            task.setDirection(Task_Direction.NONE);
            task.setDirection(Task_Direction.BACK);
            cursorMoved = form.moveInRow(ctrl, Constants.MOVE_DIRECTION_PREV);
          }
        }

        task.setDirection(Task_Direction.NONE);
        task.setFlowMode(Task_Flow.NONE);
        task.setDirection(orgDirection);
        task.setFlowMode(orgFlow);

        if (!cursorMoved && !task.DataView.isEmptyDataview())
          this.exitWithError(task, MsgInterface.RT_STR_CRSR_CANT_PARK);
      }
      return false;
    }

    // if we have a stop execution ctrl, we need to use it as a srctrl, otherwise use
    // the ctrl on which we executed last CS.
    let srcCtrl: MgControl = (<MgControl>this.getStopExecutionCtrl()) || (<MgControl>ctrl.getForm().getTask().getCurrVerifyCtrl());

    // execute the verify handlers for the current task
    if (srcCtrl !== ctrl || task.isMoveInRow() || (lastParkedCtrl === null && this.getStopExecutionCtrl() !== null) || form.PrevDisplayLine !== ctrl.getForm().DisplayLine) {
      let frmCtrl: MgControl = this.getCtrlExecCvFrom(task, srcCtrl, ctrl);
      let toCtrl: MgControl = this.getCtrlExecCvTo(task, frmCtrl, ctrl);
      this.executeVerifyHandlers(<Task>ctrl.getForm().getTask(), ctrl, frmCtrl, toCtrl);
      if (this._stopExecution) {
        if (ctrl.isListBox() || ctrl.isRadio() || ctrl.isTabControl() || ctrl.isCheckBox()) {
          ctrl.resetPrevVal();
          ctrl.RefreshDisplay();
        }

        task.InCtrlPrefix = false;
        return false;
      }
    }
    task.setLevel(Constants.TASK_LEVEL_CONTROL);
    ctrl.KeyStrokeOn = false;
    ctrl.ModifiedByUser = false;

    task.setCurrField(ctrl.getField());

    if (ctrl.IsRepeatable)
      form.bringRecordToPage();

    // enable-disable actions for Subforms
    if (lastParkedCtrl !== ctrl) {
      if ((lastParkedCtrl === null && ctrl.getForm().isSubForm()) || (lastParkedCtrl !== null && (ctrl.getForm().isSubForm() || lastParkedCtrl.getForm().isSubForm()))) {
        let lastParkedTask: Task = null;
        if (lastParkedCtrl !== null)
          lastParkedTask = <Task>lastParkedCtrl.getForm().getTask();

        if (lastParkedTask !== task) {
          let firstTime: boolean = true;
          let isSonSubform: boolean;
          let parentTask: Task;

          if (lastParkedTask !== null) {
            isSonSubform = lastParkedTask.IsSubForm;

            for (parentTask = lastParkedTask; parentTask !== null && isSonSubform; parentTask = parentTask.getParent()) {
              if (!firstTime) {
                isSonSubform = parentTask.IsSubForm;
                parentTask.ActionManager.enable(InternalInterface.MG_ACT_ZOOM, false);
                parentTask.ActionManager.enable(InternalInterface.MG_ACT_DELLINE, false);
                parentTask.enableCreateActs(false);
              }
              else
                firstTime = false;
            }
          }

          isSonSubform = task.IsSubForm;

          for (parentTask = task.getParent(); (parentTask !== null) && isSonSubform; parentTask = parentTask.getParent()) {
            isSonSubform = parentTask.IsSubForm;
            if (parentTask.getEnableZoomHandler())
              parentTask.ActionManager.enable(InternalInterface.MG_ACT_ZOOM, true);
            parentTask.setCreateDeleteActsEnableState();
          }

          // Whenever we are moving between tasks, re-evaluate AllowModes.
          task.enableModes();
        }
      }
    }

    if (ctrl.isChoiceControl())
      task.ActionManager.enable(InternalInterface.MG_ACT_ARROW_KEY, true);
    if (ctrl.isComboBox() && !task.ActionManager.isEnabled(InternalInterface.MG_ACT_COMBO_DROP_DOWN))
      task.ActionManager.enable(InternalInterface.MG_ACT_COMBO_DROP_DOWN, true);

    // enable actions and states
    if (task.getEnableZoomHandler() || ctrl.useZoomHandler())
      task.ActionManager.enable(InternalInterface.MG_ACT_ZOOM, true);

    ctrl.enableTextAction(true);
    if (ctrl.isTextControl() || ctrl.isChoiceControl())
      ctrl.SetKeyboardLanguage(false);

    ctrl.refreshDefaultButton();

    if (ctrl.Type === MgControlType.CTRL_TYPE_BUTTON)
      task.ActionManager.enable(InternalInterface.MG_ACT_BUTTON, true);
    task.setCreateDeleteActsEnableState();
    if (ctrl.isModifiable() && task.getMode() === Constants.TASK_MODE_CREATE)
      task.ActionManager.enable(InternalInterface.MG_ACT_RT_COPYFLD, true);
    let field: Field = <Field>ctrl.getField();
    if (field !== null && field.NullAllowed && ctrl.isModifiable() && ctrl.Type !== MgControlType.CTRL_TYPE_BUTTON)
      task.ActionManager.enable(InternalInterface.MG_ACT_RT_EDT_NULL, true);
    Manager.MenuManager.refreshMenuActionForTask(ctrl.getForm().getTask());

    return true;
  }


  /// <summary>
  ///   do some default operations for an event and return true to tell the caller
  ///   to continue handling the event
  /// </summary>
  /// <param name = "evt">the event to handle</param>
  /// <returns> tells the caller whether to continue handling the event</returns>
  private commonHandlerBefore(evt: RunTimeEvent): boolean {
    let evtSave: RunTimeEvent = evt;
    let task: Task = evt.getTask();
    let rec: Record = null;
    let prevRec: Record = null;
    let val: string;
    let oldDisplayLine: number = Int32.MinValue;

    if (this._stopExecution)
      return false;

    if (task.isAborting())
      return false;

    if (evt.getType() === ConstInterface.EVENT_TYPE_SYSTEM) {
      let actId: number = this.getMatchingAction(task, evt.getKbdItm(), false);
      if (actId !== 0 && evt.Control !== null)
      // && actId != MG_ACT_SELECT)
      {
        evt = new RunTimeEvent(evt, evt);
        evt.setInternal(actId);
        evt.setArgList(null);
        let mgControl: MgControl = evt.Control;
        evtSave.setCtrl(mgControl);
        if (mgControl === null)
          return false;
      }
    }

    // QCR# 939253 - we have to process commonHandlerBefore even for internal event converted
    // from system Event
    if (evt.getType() === ConstInterface.EVENT_TYPE_INTERNAL) {
      let form: MgForm = <MgForm>task.getForm();
      let displayLine: number = evt.getDisplayLine();
      let dv: DataView = <DataView>task.DataView;
      rec = dv.getCurrRec();

      let ctrl: MgControl = evt.Control;
      let intEvtCode: number = evt.getInternalCode();

      let lastFocusedCtrl: MgControl = GUIManager.getLastFocusedControl();

      // before all events exept of MG_ACT_CHAR, MG_ACT_EDT_DELPRVCH, MG_ACT_TIMER execute incremental locate if it is needed
      if (intEvtCode < 1000 && intEvtCode !== InternalInterface.MG_ACT_CHAR && intEvtCode !== InternalInterface.MG_ACT_EDT_DELPRVCH) {
        task.locateQuery.InitServerReset = true;
        this.locateInQuery(task);
      }

      // for internal events
      switch (intEvtCode) {
        // case InternalInterface.MG_ACT_CTRL_DBLCLICK:
        //   if (selectProg(ctrl, false))
        //      return false;
        case InternalInterface.MG_ACT_WEB_ON_DBLICK:
          break;

        case InternalInterface.MG_ACT_CTRL_FOCUS:
          this.handleFocus(ctrl, displayLine, evt.isProduceClick());
          return false;

        case InternalInterface.MG_ACT_CTRL_KEYDOWN:
          this.handleKeyDown(task, ctrl, evt);
          return false;

        case InternalInterface.MG_ACT_CTRL_MOUSEUP:
          this.handleMouseUp(ctrl, displayLine, evt.isProduceClick());
          return false;

        case InternalInterface.MG_ACT_ARROW_KEY:
          this.selectionControlHandleArrowKeyAction(ctrl, evt);
          break;

        case InternalInterface.MG_ACT_DEFAULT_BUTTON:
          this.onActDefaultButton(form, evt);
          return false;

        case InternalInterface.MG_ACT_SELECTION:
          this.onActSelection(ctrl, form, evt);
          return false;

        case InternalInterface.MG_ACT_TIMER:
          this.handleTimer(evt);
          return false;

        case InternalInterface.MG_ACT_INCREMENTAL_LOCATE:
          this.locateInQuery(evt.getTask());
          break;

        case InternalInterface.MG_ACT_RESIZE:
          this.handleResize(ctrl, displayLine);
          return false;

        case InternalInterface.MG_ACT_ROW_DATA_CURR_PAGE:
          this.handleRowDataCurPage(ctrl, displayLine, evt.isSendAll(), evt.LastFocusedVal);
          return false;

        case InternalInterface.MG_ACT_DV_TO_GUI:
          this.handleTransferDataToGui(ctrl);
          return false;

        case InternalInterface.MG_ACT_ENABLE_EVENTS:
          this.handleEnableEvents(evt, true);
          return false;

        case InternalInterface.MG_ACT_COMBO_DROP_DOWN:
          this.handleComboDropDown(ctrl, displayLine);
          return false;


        case InternalInterface.MG_ACT_DISABLE_EVENTS:
          this.handleEnableEvents(evt, false);
          return false;

        case InternalInterface.MG_ACT_TBL_REORDER:
          if (form.isAutomaticTabbingOrder())
            form.applyTabOrderChangeAfterTableReorder(evt.ControlsList);
          break;

        case InternalInterface.MG_ACT_TASK_PREFIX:
          task.setLevel(Constants.TASK_LEVEL_TASK);
          break;

        case InternalInterface.MG_ACT_TASK_SUFFIX:
          task.setLevel(Constants.TASK_LEVEL_TASK);
          break;

        case InternalInterface.MG_ACT_REC_PREFIX:
          // Defect 115903. Do not execute RP if the subform parent task didn't finished yet
          // it's CommonHandlerBefore for RP.
          if (task.IsSubForm && (task.getParent()).InCommonHandlerBeforeRP)
            return false;

          // Recovery from transaction restart was completed. We may now clear the flag
          task.setAfterRetry(ConstInterface.RECOVERY_NONE);
          task.DataSynced = false;

          if (!task.isStarted())
            return false;


          // if the form contains a table and the control was in the table
          // move to the new row
          if (form.getRowsInPage() > Int32.MinValue && displayLine > Int32.MinValue) {
            // ensure a valid row
            while (!dv.recExists(displayLine) && displayLine > 0) {
              displayLine--;
            }
            if (displayLine >= 0) {
              prevRec = dv.getCurrRec();
              let oldTaskMode: string = task.getMode();
              let oldRecId: number = prevRec.getId();

              try {
                oldDisplayLine = form.DisplayLine;
                // oldDisplayLine = form.getCurrRow()
                form.PrevDisplayLine = oldDisplayLine;
                form.setCurrRowByDisplayLine(displayLine, true, false);
                // refresh the display if the previous record was deleted or canceled
                if (prevRec != null && !dv.recExistsById(prevRec.getId())) {
                  form.RefreshDisplay(Constants.TASK_REFRESH_TABLE);
                  // The following refresh is essential. If it fails because of an
                  // exception then the old curr row is restored (in the catch
                  // statement). It can happen when the user clicks on a line which
                  // becomes blank due to the deletion of the previous record.
                  form.RefreshDisplay(Constants.TASK_REFRESH_CURR_REC);
                }
                rec = dv.getCurrRec();
              }
              catch (e) {
                if (e instanceof RecordOutOfDataViewException) {
                  if (this._stopExecution) {
                    if (oldTaskMode === Constants.TASK_MODE_CREATE && oldDisplayLine > 0 &&
                      !dv.recExistsById(oldRecId)) {
                      let prevLine: number = form.getPrevLine(oldDisplayLine);
                      form.restoreOldDisplayLine(prevLine);
                    }
                    else
                      form.restoreOldDisplayLine(oldDisplayLine);
                    form.RefreshDisplay(Constants.TASK_REFRESH_FORM);
                    this.setStopExecution(false);
                    lastFocusedCtrl = <MgControl>task.getLastParkedCtrl();
                    task.getLastParkedCtrl();
                    if (lastFocusedCtrl != null)
                      lastFocusedCtrl.invoke();
                    this.setStopExecution(true);
                    return false;
                  }
                  else
                    Logger.Instance.WriteExceptionToLogWithMsg(e.StackTrace);
                }
                else throw e;
              }
            }
            else
              throw new ApplicationException("in EventsManager.commonHandlerBefore(): invalid line number: " +
                displayLine);
          }
          if (rec == null)
            throw new ApplicationException(
              "in EventsManager.commonHandlerBefore(): no current record available !");

          // only for non interactive tasks. Increase the task's counter for every record we pass.
          // do it before the evalEndCond since it might include counter(0).
          // increase only if going into the rec prefix.
          if (!task.IsInteractive && task.getLevel() === Constants.TASK_LEVEL_TASK)
            task.increaseCounter();

          // check the "task end condition" before entering the record
          if (task.evalEndCond(ConstInterface.END_COND_EVAL_BEFORE)) {
            task.endTask(true, false, false);
            return false;
          }
          if (form.HasTable())
            form.bringRecordToPage();

          form.RefreshDisplay(Constants.TASK_REFRESH_CURR_REC);

          // to prevent double prefix on the same record
          if (task.getLevel() !== Constants.TASK_LEVEL_TASK)
            return false;

          Logger.Instance.WriteDevToLog("RECORD PREFIX: " + task.queryTaskPath());
          dv.getCurrRec().setForceSaveOrg(false);
          dv.getCurrRec().Synced = false;

          dv.saveOriginal();

          // do Record Prefix for all fathers that their Record Prefix is not done earlier
          if (task.IsSubForm && task.PerformParentRecordPrefix) {
            let parentTask = task.getParent();
            while (parentTask.IsSubForm) {
              if (parentTask.getLevel() === Constants.TASK_LEVEL_TASK) {
                this.handleInternalEventWithTask(parentTask, InternalInterface.MG_ACT_REC_PREFIX);
                parentTask = parentTask.getParent();
                if (this.GetStopExecutionFlag())
                  break;
              }
              else
                break;
            }
          }

          // handle sub-forms
          task.InCommonHandlerBeforeRP = true;
          if (task.CheckRefreshSubTasks())
            dv.computeSubForms();
          task.InCommonHandlerBeforeRP = false;
          task.setLevel(Constants.TASK_LEVEL_RECORD);
          // enable-disable actions for a record
          task.enableRecordActions();
          break;

        case InternalInterface.MG_ACT_REC_SUFFIX:
          // Force record suffix:
          let forceSuffix: boolean = false;
          let isSelectionTable: boolean;

          task.ConfirmUpdateNo = false;

          // No record -> no suffix
          if (rec == null)
            return false;

          forceSuffix = task.checkProp(PropInterface.PROP_TYPE_FORCE_SUFFIX, false);

          // do not execute the "before record suffix" when deleting the record and
          // the task mode is delete (the second round)
          if ((rec.Modified || forceSuffix) && rec.getMode() === DataModificationTypes.Delete &&
            task.getMode() === Constants.TASK_MODE_DELETE)
            return true;

          // to prevent double suffix on the same record
          if (task.getLevel() === Constants.TASK_LEVEL_TASK)
            return false;

          if (task.getLevel() === Constants.TASK_LEVEL_CONTROL) {
            task.setInRecordSuffix(true);
            task.setDirection(Task_Direction.FORE);
            this.handleInternalEventWithMgControlBase(task.getLastParkedCtrl(), InternalInterface.MG_ACT_CTRL_SUFFIX);
            task.setDirection(Task_Direction.NONE);
            task.setInRecordSuffix(false);
            if (this._stopExecution)
              return false;
          }

          task.handleEventOnSlaveTasks(InternalInterface.MG_ACT_REC_SUFFIX);
          if (this._stopExecution)
            return false;
          Logger.Instance.WriteDevToLog("RECORD SUFFIX: " + task.queryTaskPath());

          // before getting out of the record we have to execute the control validation
          // handlers from the current control (+1) up to the last control in the record.
          // CV of the currentCtrl is executed from ControlSuffix
          if ((rec.Modified || forceSuffix) && ctrl != null) {
            let frmCtrl: MgControl = ctrl;

            // if lastFocussedCtrl and ctrl are on diff forms, we need to execute
            // CVs from the subformCtrl (containing the ctrl but on task) till last ctrl.
            if (lastFocusedCtrl != null && frmCtrl.onDiffForm(lastFocusedCtrl)) {
              let firstCtrl: MgControl = (<MgForm>task.getForm()).getFirstNonSubformCtrl();

              // if task does not contain 'lastFocusedCtrl', then this task does not exists in nested subforms
              // (with lastFocusedCtrl) and is due to Run Task in Parent Screen. In such a case, execute CVs
              // from first ctrl, if tab order of this task is higher than 'lastFocusedCtrl'.
              if (firstCtrl != null && (<MgForm>task.getForm()).ctrlTabOrderIdx(lastFocusedCtrl) === -1
                && MgControl.CompareTabOrder(firstCtrl, lastFocusedCtrl) > 0)
                frmCtrl = null; // execute CV from first ctrl on the form
              else
                frmCtrl = lastFocusedCtrl;
            }

            this.executeVerifyHandlersTillLastCtrl(task, frmCtrl);
            if (this._stopExecution)
              return false;
          }

          // indicate next verifyCtrl is the first ctrl in the record
          task.setCurrVerifyCtrl(null);

          task.setLevel(Constants.TASK_LEVEL_TASK);

          isSelectionTable = task.checkProp(PropInterface.PROP_TYPE_SELECTION, false);

          // Query mode -> do suffix only if we force it or somehow the record was updated
          if (task.getMode() === Constants.TASK_MODE_QUERY && !forceSuffix && !rec.Modified &&
            !isSelectionTable)
            return false;

          if (!rec.Modified && !forceSuffix && (!isSelectionTable || !task.InSelect)) {
            if (rec.getMode() === DataModificationTypes.Delete)
              break;
            return false;
          }

          if (task.getMode() !== Constants.TASK_MODE_DELETE && rec.Modified) {
            if (!this.updateConfirmed(task))
              return false;
          }
          break;

        case InternalInterface.MG_ACT_CTRL_PREFIX:
          if (this.handleCtrlPrefix(evt))
            return true;
          else {
            // did not succeed in entering the ctrl
            evt.Control.InControl = false;
            return false;
          }

        case InternalInterface.MG_ACT_CANCEL:
          Manager.CleanMessagePane(task); // QCR #371321
          break;

        case InternalInterface.MG_ACT_CTRL_SUFFIX:

          // if we have a stopexecution ctrl we should not execute CS.
          if (ctrl == null || this.getStopExecutionCtrl() != null)
            return false;

          // to prevent double suffix on the same control
          if (task.getLevel() !== Constants.TASK_LEVEL_CONTROL)
            return false;

          if (!ctrl.isSubform()) {
            val = Manager.GetCtrlVal(ctrl);

            // We are resetting the flag as we are moving from one control to other control.
            task.CurrentEditingControl = null;

            // validate the controls value
            // Fixed bug #:758788, the browser control will not be update from the filed.
            // Patch for QCR #729706:
            // Magic thread puts the following GUI commands:
            //    PROP_SET_IMAGE_FILE_NAME to set the image on the Image control.
            //    PROP_SET_TEXT to set the text of the TextBox control.
            //    SET_FOCUS to focus on the TextBox control.
            // Now, when the execution is by F7, if the file is not retrieved from the server
            // (i.e. if there is 404 error), HttpClient re-tries to get the file for HTTPtimeout.
            // During this time all the GUI events in GuiCommandsQueue remains pending unhandled.
            // In the mean time, Magic thread executes the Exit event and during this, it tries
            // to execute the Ctrl Suffix of the TextBox control.
            // Since SET_FOCUS is still pending in the queue, the logical control (if allowTesting=No)
            // is not mapped with any actual windows control.
            // Now when we try to get the value of this logical control, LogicalControl.getEditorControl()
            // returns null and so, StaticText.getValue() returns LogicalControl.Text instead of Control.Text
            // Because PROP_SET_TEXT is also pending, LogicalControl.Text is null.
            // And so there is an exception when using it.
            // If AllowTesting=Yes, the val will be a blank string. So, there is no crash.
            // But here we have another problem. Suppose, the field had an Init expression.
            // Now, MgControl's value would be the inited value and the val is a blank string.
            // So, we will have variable change.
            // Since the problem is related to a very specific scenario -- when the image control was
            // the first dropped control on the form, image cannot be accessed at the time of task
            // loading and task needs to be closed, we are putting a patch here by checking val for NULL.
            // The ideal solution would be --- instead of sending the image file name from Magic thread
            // to Gui thread and loading the image from the Gui thread, we can load the image from the
            // Magic thread (using sync execution i.e. via GuiInteractive) and send it to the Gui thread.
            if (!task.cancelWasRaised() &&
              (ctrl.Type !== MgControlType.CTRL_TYPE_BROWSER && val !== null && typeof val != "undefined" &&
              !ctrl.validateAndSetValue(val, true))) {
              this.setStopExecution(true);
              return false;
            }
          }

          // when stop execution in on, don't clear the msg from status.
          if (!this._stopExecution)
            Manager.CleanMessagePane(task);

          // reset InControl before executing control verification
          ctrl.InControl = false;
          ctrl.ClipBoardDataExists = false;

          // handle control verification
          // QCR 754616
          let forceRecSuffix: boolean = false;
          forceRecSuffix = task.checkProp(PropInterface.PROP_TYPE_FORCE_SUFFIX, false);
          // if we have a verify handler, it must always be executed if not in EndTask. Otherwise,
          // it should be executed if rec is modified or forceRecSuffix is yes (CVs of next ctrl till
          // last ctrl is executed from RecordSuffix).
          // We should not execute CVs if in a create mode (up-arrow pressed) and rec is not modified (#729814). But,
          // we should execute CVs if we traverse the record using Tab/Click (#937816).
          if (ctrl.HasVerifyHandler &&
            ((!task.InEndTask &&
            (task.getMode() !== Constants.TASK_MODE_CREATE || !(<MgForm>task.getForm()).IsMovingInView)) ||
            rec.Modified || forceRecSuffix)) {
            if (!this.executeVerifyHandler(ctrl)) {
              // if control verification get 'stop execution' (e.g. verify error), the focus will be remain on current control.
              // So set InControl to true
              ctrl.InControl = true;
              return false;
            }
          }

          task.setCurrVerifyCtrl(ctrl);
          ctrl.setInControlSuffix(true);
          break;

        case InternalInterface.MG_ACT_MOVE_TO_FIRST_CTRL:
          form.moveToFirstCtrl(false, evt.IsFormFocus);
          break;
      }
    }
    // end of internal events processing
    else if (task.locateQuery.Buffer.Length !== 0)
      this.locateInQuery(task);

    return true;
  }


  private onActSelection(ctrl: MgControl, form: MgForm, evt: RunTimeEvent): void {
    let displayLine: number = evt.getDisplayLine();
    if (displayLine === Int32.MinValue)
      displayLine = form.DisplayLine;

    let simulate: boolean = ctrl.Type === MgControlType.CTRL_TYPE_CHECKBOX || ctrl.Type === MgControlType.CTRL_TYPE_LIST || ctrl.Type === MgControlType.CTRL_TYPE_RADIO || ctrl.Type === MgControlType.CTRL_TYPE_BUTTON || (ctrl.Type === MgControlType.CTRL_TYPE_TAB && !evt.isProduceClick());
    if (simulate)
      this.simulateSelection(ctrl, evt.getValue(), displayLine, evt.isProduceClick());
    else
      this.handleSelection(ctrl, displayLine, evt.getValue());
  }

  /// <summary>
  ///   Handle the MG_ACT_DEFAULT_BUTTON
  /// </summary>
  /// <param name = "form">
  /// </param>
  /// <param name = "evt">
  /// </param>
  private onActDefaultButton(form: MgForm, evt: RunTimeEvent): void {
    let ctrl: MgControl = form.getDefaultButton(true);
    if (ctrl === null)
      return;
    this.onActSelection(ctrl, form, evt);
  }

  /// <summary>
  ///   move to an other line and focus on control
  /// </summary>
  /// <param name = "form"> </param>
  /// <param name = "displayLine">line to move </param>
  /// <param name = "ctrl">control to focus </param>
  private moveToLine(form: MgForm, displayLine: number, ctrl: MgControl): void {
    let runTimeEvent: RunTimeEvent = new RunTimeEvent(ctrl, displayLine);
    runTimeEvent.setInternal(InternalInterface.MG_ACT_REC_PREFIX);
    this.handleEvent(runTimeEvent, false);
    if (ctrl !== null)
      ctrl.invoke();

    form.SelectRow(true);
  }

  /// <summary>
  ///   calculate arguments for events
  /// </summary>
  /// <param name = "evt"> </param>
  private createEventArguments(evt: RunTimeEvent): void {
    if (evt.getArgList() === null) {
      if (evt.getType() === ConstInterface.EVENT_TYPE_INTERNAL) {
        switch (evt.getInternalCode()) {
          default:
            break;
        }
      }
    }
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="task"></param>
  /// <param name="doSuffix"></param>
  /// <returns></returns>
  DoTaskLevelRecordSuffix(task: Task, refDoSuffix: RefParam<boolean>): boolean {
    let shouldReturn: boolean = false;
    if (task.getLevel() === Constants.TASK_LEVEL_RECORD) {
      refDoSuffix.value = false;
      this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_SUFFIX);
      if (this.GetStopExecutionFlag())
        shouldReturn = true;
    }

    return shouldReturn;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="task"></param>
  /// <param name="form"></param>
  DoTaskLevelRecordPrefix(task: Task, form: MgForm, moveInRow: boolean): void {
    if (!this.GetStopExecutionFlag()) {
      this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_PREFIX);
      if (moveInRow) {
        if (!this.GetStopExecutionFlag() && form !== null)
          form.moveInRow(null, Constants.MOVE_DIRECTION_BEGIN);
      }
    }
  }

  /// <summary>
  ///   do the magic default operations according to the internal event code
  /// </summary>
  /// <param name = "evt">the event to handle </param>
  /// <returns> tells the caller whether to continue handling the event </returns>
  private commonHandler(evt: RunTimeEvent): void {
    let task: Task = evt.getTask();
    let mgData: MGData = task.getMGData();
    let form: MgForm = <MgForm>task.getForm();
    let ctrl: MgControl = evt.Control;
    let lastParkedCtrl: MgControl;
    let doSuffix: boolean = true;
    let oldMode: string;
    let server: CommandsProcessorBase = Task.CommandsProcessor;

    if (this._stopExecution)
      return;

    // if this is a user event that converts to a system or internal even, convert it
    if (evt.getType() === ConstInterface.EVENT_TYPE_USER)
      evt = new RunTimeEvent(evt.getUserEvent(), evt);

    try {
      this.pushRtEvent(evt);

      if (evt.getType() === ConstInterface.EVENT_TYPE_SYSTEM) {
        let actId: number = this.getMatchingAction(task, evt.getKbdItm(), true);
        if (actId !== 0)
        // handled internally
        {
          evt = new RunTimeEvent(evt, evt);
          evt.setInternal(actId);
          evt.setArgList(null);
        }
      }// end of system events processing

      // execute the common handling of internal events only if they are not immediate.
      // an event is immediate when it was raised by a raise event operation that its
      // wait condition is yes or evaluates to true.
      let cmd: IClientCommand;
      if (evt.getType() === ConstInterface.EVENT_TYPE_INTERNAL && !evt.isImmediate() && this.ActAllowed(evt.getInternalCode()) && !this._processingTopMostEndTask) {
        let cmdsToServer: CommandsTable = mgData.CmdsToServer;
        let dv: DataView = <DataView>task.DataView;
        let rec: Record = dv.getCurrRec();

        let intEvtCode: number = evt.getInternalCode();

        // for internal events
        switch (intEvtCode) {

          case InternalInterface.MG_ACT_DEFAULT_BUTTON:
            this.onActDefaultButton(form, evt);
            break;

          case InternalInterface.MG_ACT_BUTTON:
          case InternalInterface.MG_ACT_CTRL_HIT:
            // if button is not parkable, raise its event only if the action was not triggered by gui.
            // direct click on the button will get here as ctrl hit , but is not triggered by gui (goes via selection event 1st)
            // other ctrl_hit actions should consider the parkability
            if (ctrl.Type === MgControlType.CTRL_TYPE_BUTTON &&
              (intEvtCode === InternalInterface.MG_ACT_BUTTON || !evt.isGuiTriggeredEvent() || ctrl.isParkable(true, false))) {
              let aRtEvt = new RunTimeEvent(ctrl);
              if (ctrl.getRtEvtTask() != null)
                aRtEvt.setTask(ctrl.getRtEvtTask());
              if (ConstInterface.EVENT_TYPE_NONE !== aRtEvt.getType()) {
                if (ctrl.useZoomHandler()) {
                  let taskToEnable: Task = aRtEvt.getTask();
                  if (taskToEnable != null)
                    taskToEnable.ActionManager.enable(InternalInterface.MG_ACT_ZOOM, true);
                }
                aRtEvt.setArgList(ctrl.ArgList);
                aRtEvt.setPublicName();
                this.addToTail(aRtEvt);
              }
            }
            else if (ctrl.Type === MgControlType.CTRL_TYPE_TAB) {
              // Fixed bug #724150: as we doing for online for tab control we send ACT_ZOOM (Choiceinp.cpp ::DitGet())
              this.addInternalEventWithCtrlAndCode(ctrl, InternalInterface.MG_ACT_ZOOM);
            }
            else if (ctrl.Type === MgControlType.CTRL_TYPE_RADIO) {
              ctrl.setControlToFocus();
            }

            break;
          case InternalInterface.MG_ACT_CONTEXT_MENU:
            if (evt.getArgList() != null) {
              let left: string = evt.getArgList().getArgValue(0, StorageAttribute.ALPHA, 0);
              let top: string = evt.getArgList().getArgValue(1, StorageAttribute.ALPHA, 0);
              let line: string = evt.getArgList().getArgValue(2, StorageAttribute.ALPHA, 0);
              Commands.ShowContextMenu(ctrl, task.getForm(), NNumber.Parse(left), NNumber.Parse(top), NNumber.Parse(line));
            }
            break;


          case InternalInterface.MG_ACT_HIT:
            // MG_ACT_HIT like in online, is being set when clicking on form or on the subform area.
            // in case CloseTasksOnParentActivate is on, try and close all child tasks.
            // we send the task of the top most form since our focus might be inside a subform, and that is equal to clicking on its form.
            if (ClientManager.Instance.getEnvironment().CloseTasksOnParentActivate())
              this.CloseAllChildProgs(<Task>task.getTopMostForm().getTask(), null, false);
            break;

          case InternalInterface.MG_ACT_TOGGLE_INSERT:
            ClientManager.Instance.RuntimeCtx.ToggleInsertMode();
            break;

          case InternalInterface.MG_ACT_CHAR:
          case InternalInterface.MG_ACT_EDT_NXTCHAR:
          case InternalInterface.MG_ACT_EDT_PRVCHAR:
          case InternalInterface.MG_ACT_EDT_DELCURCH:
          case InternalInterface.MG_ACT_EDT_DELPRVCH:
          case InternalInterface.MG_ACT_CLIP_COPY:
          case InternalInterface.MG_ACT_CUT:
          case InternalInterface.MG_ACT_CLIP_PASTE:
          case InternalInterface.MG_ACT_EDT_PRVLINE:
          case InternalInterface.MG_ACT_EDT_NXTLINE:
          case InternalInterface.MG_ACT_EDT_BEGNXTLINE:
          case InternalInterface.MG_ACT_EDT_BEGFLD:
          case InternalInterface.MG_ACT_EDT_ENDFLD:
          case InternalInterface.MG_ACT_EDT_MARKALL:
          case InternalInterface.MG_ACT_EDT_BEGFORM:
          case InternalInterface.MG_ACT_EDT_ENDFORM:
          case InternalInterface.MG_ACT_EDT_PRVPAGE:
          case InternalInterface.MG_ACT_EDT_NXTPAGE:
          case InternalInterface.MG_ACT_BEGIN_DROP:
          case InternalInterface.MG_ACT_EDT_MARKPRVCH:
          case InternalInterface.MG_ACT_EDT_MARKNXTCH:
          case InternalInterface.MG_ACT_EDT_MARKTOBEG:
          case InternalInterface.MG_ACT_EDT_MARKTOEND:
          case InternalInterface.MG_ACT_EDT_NXTWORD:
          case InternalInterface.MG_ACT_EDT_PRVWORD:
          case InternalInterface.MG_ACT_EDT_BEGLINE:
          case InternalInterface.MG_ACT_EDT_ENDLINE:

            if (form != null && task.getLastParkedCtrl() != null) {
              // Incremental search
              if (intEvtCode === InternalInterface.MG_ACT_CHAR ||
                intEvtCode === InternalInterface.MG_ACT_EDT_DELPRVCH) {
                if ((task.getMode() === Constants.TASK_MODE_QUERY) && !ctrl.isModifiable() &&
                  task.checkProp(PropInterface.PROP_TYPE_ALLOW_LOCATE_IN_QUERY, false) &&
                  (ctrl.DataType === StorageAttribute.ALPHA ||
                  ctrl.DataType === StorageAttribute.UNICODE ||
                  ctrl.DataType === StorageAttribute.NUMERIC)
                ) {
                  this.addLocateCharacter(evt);
                  break;
                }
              }

              // In case of the ACT_BEGIN_DROP : Drop occurs on the current control,
              // hence use current control instead of last parked control.
              let mgControl: MgControlBase = (intEvtCode === InternalInterface.MG_ACT_BEGIN_DROP) ? ctrl : task.getLastParkedCtrl();
              let ret: EditReturnCode = Manager.TextMaskEditor.ProcessAction_1(mgControl, intEvtCode,
                evt.getValue(), evt.getStartSelection(), evt.getEndSelection());
              this.handleCtrlModify(ctrl, intEvtCode);
              if (ret === EditReturnCode.EDIT_AUTOSKIP)
                this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_TBL_NXTFLD);
              else if (ret === EditReturnCode.EDIT_RESTART && ctrl != null)
                ctrl.resetDisplayToPrevVal();
              // EDIT_CONTINUE:
              else {
              }
            }

            break;

          case InternalInterface.MG_ACT_CLOSE:
            let rtEvt = new RunTimeEvent(evt, evt);
            rtEvt.setInternal(InternalInterface.MG_ACT_EXIT);
            this.addToTail(rtEvt);
            break;

          case InternalInterface.MG_ACT_EXIT:
            // if 'exit' accepted on MDI, exit the top most task. same as when exiting the system.
            let taskToEnd: Task = (task.isMainProg() ? MGDataCollection.Instance.StartupMgData.getFirstTask() : task);
            taskToEnd.endTask(evt.reversibleExit(), false, taskToEnd.IsRoute(), evt.ExitDueToError());

            break;

          case InternalInterface.MG_ACT_EXIT_SYSTEM:
            // end the top most task with form.
            MGDataCollection.Instance.StartupMgData.getFirstTask().endTask(evt.reversibleExit(), false,
              false);
            // GetTopMostTaskWithForm(task).endTask(evt.reversibleExit(), false, false);
            break;

          case InternalInterface.MG_ACT_TBL_NXTLINE:
            if (form != null)
              form.moveInView(Constants.MOVE_UNIT_ROW, Constants.MOVE_DIRECTION_NEXT);
            break;

          case InternalInterface.MG_ACT_TBL_PRVLINE:
            if (form != null)
              form.moveInView(Constants.MOVE_UNIT_ROW, Constants.MOVE_DIRECTION_PREV);
            break;

          case InternalInterface.MG_ACT_TBL_NXTPAGE:
            if (form != null)
              form.moveInView(Constants.MOVE_UNIT_PAGE, Constants.MOVE_DIRECTION_NEXT);
            break;

          case InternalInterface.MG_ACT_TBL_PRVPAGE:
            if (form != null)
              form.moveInView(Constants.MOVE_UNIT_PAGE, Constants.MOVE_DIRECTION_PREV);
            break;

          case InternalInterface.MG_ACT_TBL_BEGPAGE:
            if (form != null)
              form.moveInView(Constants.MOVE_UNIT_PAGE, Constants.MOVE_DIRECTION_BEGIN);
            break;

          case InternalInterface.MG_ACT_TBL_ENDPAGE:
            if (form != null)
              form.moveInView(Constants.MOVE_UNIT_PAGE, Constants.MOVE_DIRECTION_END);
            break;

          case InternalInterface.MG_ACT_TBL_BEGTBL:
            // #918588: If ctrl+home/ctrl+end pressed when parked on listbox
            // then Begin table event should not be handled.
            lastParkedCtrl = <MgControl>task.getLastParkedCtrl();
            if (lastParkedCtrl == null || !lastParkedCtrl.isListBox()) {
              if (form != null)
                form.moveInView(Constants.MOVE_UNIT_TABLE, Constants.MOVE_DIRECTION_BEGIN);
            }
            break;

          case InternalInterface.MG_ACT_TBL_ENDTBL:
            // #918588: If ctrl+home/ctrl+end pressed when parked on listbox
            // then Begin table event should not be handled.
            lastParkedCtrl = <MgControl>task.getLastParkedCtrl();
            if (lastParkedCtrl === null || !lastParkedCtrl.isListBox()) {
              if (form != null)
                form.moveInView(Constants.MOVE_UNIT_TABLE, Constants.MOVE_DIRECTION_END);
            }
            break;

          case InternalInterface.MG_ACT_TBL_BEGLINE:
            // Fixed bug #:178230,
            if (form != null) {
              let orgFlow: Task_Flow = task.getFlowMode();
              let orgDir: Task_Direction = task.getDirection();
              if (!this._isSorting) {
                task.setFlowMode(Task_Flow.FAST);
                task.setDirection(Task_Direction.BACK);
              }

              form.moveInRow(null, Constants.MOVE_DIRECTION_BEGIN);
              if (!this._isSorting) {
                task.setFlowMode(orgFlow);
                task.setDirection(orgDir);
              }
            }
            break;

          case InternalInterface.MG_ACT_TBL_ENDLINE:
            if (form != null) {
              let orgFlow: Task_Flow = task.getFlowMode();
              let orgDir: Task_Direction = task.getDirection();
              if (!this._isSorting) {
                task.setFlowMode(Task_Flow.FAST);
                task.setDirection(Task_Direction.FORE);
              }

              form.moveInRow(null, Constants.MOVE_DIRECTION_END);
              if (!this._isSorting) {
                task.setFlowMode(orgFlow);
                task.setDirection(orgDir);
              }
            }
            break;


          case InternalInterface.MG_ACT_TBL_NXTFLD:
            //         case MG_ACT_NEXT_TAB:
            if (form != null) {
              ClientManager.Instance.setMoveByTab(true);
              task.setFlowMode(Task_Flow.STEP);
              task.setDirection(Task_Direction.FORE);
              form.moveInRow(null, Constants.MOVE_DIRECTION_NEXT);
              task.setFlowMode(Task_Flow.NONE);
              task.setDirection(Task_Direction.NONE);
              ClientManager.Instance.setMoveByTab(false);
            }
            break;

          case InternalInterface.MG_ACT_TBL_PRVFLD:
            //         case MG_ACT_PREVIOUS_TAB:
            if (form != null) {
              ClientManager.Instance.setMoveByTab(true);
              task.setFlowMode(Task_Flow.STEP);
              task.setDirection(Task_Direction.BACK);
              form.moveInRow(null, Constants.MOVE_DIRECTION_PREV);
              task.setFlowMode(Task_Flow.NONE);
              task.setDirection(Task_Direction.NONE);
              ClientManager.Instance.setMoveByTab(false);
            }
            break;

          case InternalInterface.MG_ACT_TAB_NEXT:
            if (form != null)
              form.changeTabSelection(ctrl, Constants.MOVE_DIRECTION_NEXT);
            break;

          case InternalInterface.MG_ACT_TAB_PREV:
            if (form != null)
              form.changeTabSelection(ctrl, Constants.MOVE_DIRECTION_PREV);
            break;

          case InternalInterface.MG_ACT_RT_COPYFLD:
            if (form != null) {
              form.ditto();

              // in case we have a table on the form, we need to activate REFRESH_TABLE so that the text
              // on the control will be set to the new value. otherwise when we get to MG_ACT_TBL_NXTFLD
              // handling, the value on the control is still the previous value
              let table = form.getTableCtrl();
              if (table != null)
                Commands.addAsync(CommandType.REFRESH_TABLE, table, 0, false);
            }
            this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_TBL_NXTFLD);
            break;

          case InternalInterface.MG_ACT_WEB_MOUSE_OVER:
            break;

          case InternalInterface.MG_ACT_WEB_ON_DBLICK: {
            // Unlike Online, here SELECT or ZOOM comes after the DBCLICK.
            // If there is a DBCLICK handler with propogate = 'NO' , these actions will not be raised.
            let ctrlType: MgControlType = ctrl.Type;
            let putAction: number = InternalInterface.MG_ACT_NONE;
            if (ctrlType !== MgControlType.CTRL_TYPE_TABLE && ctrlType !== MgControlType.CTRL_TYPE_LABEL &&
              ctrlType !== MgControlType.CTRL_TYPE_IMAGE) {
              if (ctrl.getForm().getTask().ActionManager.isEnabled(InternalInterface.MG_ACT_SELECT))
                putAction = InternalInterface.MG_ACT_SELECT;
              else {
                if (ctrl.getForm().getTask().ActionManager.isEnabled(InternalInterface.MG_ACT_ZOOM))
                  putAction = InternalInterface.MG_ACT_ZOOM;
              }

              if (putAction !== InternalInterface.MG_ACT_NONE)
                this.addInternalEventWithCtrlAndCode(ctrl, putAction);
            }
          }
            break;

          case InternalInterface.MG_ACT_HELP:
            let helpIdx: string = (ctrl != null
              ? this.getHelpUrl(ctrl)
              : form.getHelpUrl());

            if (helpIdx != null) {
              let parentWindowType: WindowType = form.getTopMostForm().ConcreteWindowType;
              let openAsApplicationModal: boolean = false;
              // if the parent of the task is Modal\floating\tool, then his child will be also the same window type.
              if (parentWindowType === WindowType.Modal)
                openAsApplicationModal = true;

              // Get the help object.
              let hlpObject: MagicHelp = task.getHelpItem(NNumber.Parse(helpIdx));

              // Check the help type and call the respective function.
              switch (hlpObject.GetHelpType()) {
                case HelpType.Internal:
                  // Internal help not implemented for RC.
                  break;

                case HelpType.Windows:
                  // Windows help not implemented for RC.
                  break;
                case HelpType.URL:
                  let helpUrl: string = (<URLHelp>hlpObject).urlHelpText;
                  helpUrl = ClientManager.Instance.getEnvParamsTable().translate(helpUrl);
                  GUIManager.Instance.showContentFromURL(helpUrl, openAsApplicationModal);
                  break;
              }
            }
            break;

          case InternalInterface.MG_ACT_DELLINE:
            if (this.HandleActionDelline(evt, task, dv, rec, false))
              return;
            break;

          case InternalInterface.MG_ACT_CRELINE:
            if (task.DataView.isEmptyDataview()) {
              this.gotoCreateMode(task, cmdsToServer);

              break;
            }
            if (task.getInCreateLine())
              break;

            task.setInCreateLine(true);

            try {
              if (task.getLevel() === Constants.TASK_LEVEL_CONTROL) {
                task.setDirection(Task_Direction.FORE);
                this.handleInternalEventWithMgControlBase(task.getLastParkedCtrl(), InternalInterface.MG_ACT_CTRL_SUFFIX);
                task.setDirection(Task_Direction.NONE);
                if (this.GetStopExecutionFlag())
                  return;
              }

              // verify that the current record is not already a new one
              if (task.getMode() === Constants.TASK_MODE_CREATE && rec != null && !rec.Modified) {
                if (task.checkProp(PropInterface.PROP_TYPE_FORCE_SUFFIX, false)) {
                  doSuffix = false;
                  this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_SUFFIX);
                  if (this.GetStopExecutionFlag() || task.isAborting())
                    return;
                }
                else {
                  task.setLevel(Constants.TASK_LEVEL_TASK);
                  this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_PREFIX);

                  if (!this.GetStopExecutionFlag() && form != null) {
                    // set curr VerifyCtrl to null so that CV execution begins frm first ctrl
                    task.setCurrVerifyCtrl(null);
                    form.moveInRow(null, Constants.MOVE_DIRECTION_BEGIN);
                  }
                  return;
                }
              }
              let refDoSuffix: RefParam<boolean> = new RefParam(doSuffix);
              if (this.DoTaskLevelRecordSuffix(task, refDoSuffix))
                return;
              doSuffix = refDoSuffix.value;

              if ((<MgForm>task.getForm()).getFirstParkableCtrlIncludingSubform(false) != null || !task.IsInteractive) {
                if (form != null) {
                  let parentId: number = 0;
                  let prevLine: number = 0;

                  if ((task.getMode() !== Constants.TASK_MODE_CREATE) || !task.ConfirmUpdateNo)
                    form.addRec(doSuffix, parentId, prevLine);
                }

                this.DoTaskLevelRecordPrefix(task, form, true);

              }

              if (task.getLastParkedCtrl() == null && task.IsInteractive)
                this.exitWithError(task, MsgInterface.RT_STR_CRSR_CANT_PARK);
            }
            finally {
              task.setInCreateLine(false);
            }
            break;

          case InternalInterface.MG_ACT_CANCEL:
            this.HandleActCancel(evt, task, form, ctrl, rec, true);
            break;

          case InternalInterface.MG_ACT_RT_QUIT:
            this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_RT_QUIT);
            break;

          case InternalInterface.MG_ACT_RTO_CREATE:
            if (task.getMode() === Constants.TASK_MODE_CREATE ||
              (task.getProp(PropInterface.PROP_TYPE_ALLOW_OPTION)).getValueBoolean())
              this.gotoCreateMode(task, cmdsToServer);
            break;

          case InternalInterface.MG_ACT_RTO_QUERY:
            if (task.getMode() !== Constants.TASK_MODE_QUERY &&
              (task.getProp(PropInterface.PROP_TYPE_ALLOW_OPTION)).getValueBoolean() === false)
              break;
            if (task.HasMDIFrame)
              break;
            task.enableModes();
            oldMode = task.getOriginalTaskMode();
            this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_SUFFIX);
            if (!this.GetStopExecutionFlag()) {
              task.setMode(Constants.TASK_MODE_QUERY);
              if (oldMode !== Constants.TASK_MODE_CREATE) {
                dv.currRecCompute(true);
                this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_PREFIX);
                if (ctrl != null)
                  ctrl.invoke();
                form.RefreshDisplay(Constants.TASK_REFRESH_CURR_REC);
              }
              else {
                // we already executed record suffix - so we need to prevent the view refresh
                // from executing it again
                task.setPreventRecordSuffix(true);
                task.setPreventControlChange(true);
                this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_RT_REFRESH_VIEW);
                if (ctrl != null)
                  ctrl.invoke();
                task.setPreventRecordSuffix(false);
                task.setPreventControlChange(false);
                if (!dv.isEmpty() && (dv.getCurrRec()).getMode() !== DataModificationTypes.Insert)
                  task.setMode(Constants.TASK_MODE_QUERY);
                else
                  task.setMode(Constants.TASK_MODE_CREATE);
                form.RefreshDisplay(Constants.TASK_REFRESH_CURR_REC);
              }
              task.setOriginalTaskMode(Constants.TASK_MODE_QUERY);
              task.setCreateDeleteActsEnableState();
            }
            break;

          case InternalInterface.MG_ACT_RTO_MODIFY:
            if (task.getMode() !== Constants.TASK_MODE_MODIFY &&
              (task.getProp(PropInterface.PROP_TYPE_ALLOW_OPTION)).getValueBoolean() === false)
              break;
            task.enableModes();
            oldMode = task.getOriginalTaskMode();
            this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_SUFFIX);
            if (!this.GetStopExecutionFlag()) {
              task.setMode(Constants.TASK_MODE_MODIFY);

              if (oldMode !== Constants.TASK_MODE_CREATE) {
                dv.currRecCompute(true);
                this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_PREFIX);
                if (ctrl != null)
                  ctrl.invoke();
              }
              else {
                // we already executed record suffix - so we need to prevent the view refresh
                // from executing it again
                task.setPreventRecordSuffix(true);
                task.setPreventControlChange(true);
                this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_RT_REFRESH_VIEW);
                if (ctrl != null)
                  ctrl.invoke();
                task.setPreventRecordSuffix(false);
                task.setPreventControlChange(false);
                if (!dv.isEmpty() && (dv.getCurrRec()).getMode() !== DataModificationTypes.Insert)
                  task.setMode(Constants.TASK_MODE_MODIFY);
                else
                  task.setMode(Constants.TASK_MODE_CREATE);
                form.RefreshDisplay(Constants.TASK_REFRESH_CURR_REC);
              }
              task.setOriginalTaskMode(Constants.TASK_MODE_MODIFY);
              task.setCreateDeleteActsEnableState();
            }
            break;

          case InternalInterface.MG_ACT_SELECT:
            /* preform rec suffix */
            try {
              task.InSelect = true;
              this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_SUFFIX);
            }
            finally {
              task.InSelect = false;
            }
            if (!this._stopExecution) {
              /* close the selection program */
              this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_EXIT);
            }
            break;

          case InternalInterface.MG_ACT_ZOOM:
            this.selectProg(ctrl, false);
            break;

          case InternalInterface.MG_ACT_SUBFORM_REFRESH:
            if ((evt.getArgList() != null) && (evt.getArgList().getSize() === 1)) {
              let subformCtrl: MgControl = null;
              let RefreshedSubformName: string = evt.getArgList().getArgValue(0, StorageAttribute.ALPHA, 0);

              // QCR #283114. Argument of 'Subform refresh event' can be skipped or not exist.
              if (RefreshedSubformName == null)
                break;

              // RS must be executed only if the current subform is refreshed.
              // If its brother is refreshed we do not need to execute RS of the current task.
              for (let parentTask: Task = task; parentTask.getForm() != null && parentTask.getMgdID() === task.getMgdID(); parentTask = parentTask.getParent()) {
                subformCtrl = <MgControl>parentTask.getForm().getCtrlByName(RefreshedSubformName, MgControlType.CTRL_TYPE_SUBFORM);
                if (subformCtrl != null) {
                  let subformTask: Task = subformCtrl.getSubformTask();
                  // If the subform task was not opened yet, but subform refresh is done,
                  // it's needed to open the subform. QCR #415914.
                  if (subformTask == null) {
                    // QCR #287562. Open the subform task only if the subform control is connected to the task.
                    if ((subformCtrl.getProp(PropInterface.PROP_TYPE_SUBFORM_TYPE)).getValueInt() !== SubformType.None)
                      this.OpenSubform(parentTask, subformCtrl);
                  }
                  else
                    parentTask.SubformRefresh(subformTask, true);
                  break;
                }
              }
            }
            // if it is SubformRefresh that returned from the server, so search the task according to its task id (tag)
            else if ((evt.getArgList() != null) && (evt.getArgList().getSize() === 2)) {
              let subformTask: Task = task, parentTask;
              let taskTag: string = evt.getArgList().getArgValue(1, StorageAttribute.NUMERIC, 0);

              while (subformTask.IsSubForm) {
                parentTask = subformTask.getParent();
                if (subformTask.getTaskTag() === taskTag) {
                  parentTask.SubformRefresh(subformTask, true);
                  break;
                }
                subformTask = parentTask;
              }
            }
            break;

          case InternalInterface.MG_ACT_SUBFORM_OPEN:
            this.OpenSubform(task, evt.Control);
            break;

          case InternalInterface.MG_ACT_RTO_SEARCH:
            this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_SUFFIX);
            if (!this.GetStopExecutionFlag()) {
              cmd = CommandFactory.CreateEventCommand(task.getTaskTag(), intEvtCode);
              task.getTaskCache().clearCache();
              task.DataviewManager.Execute(cmd);

              // After view refresh, the server always returns curr rec as first rec.
              if (!form.isScreenMode()) {
                dv.setTopRecIdx(0);
                if (form.HasTable()) {
                  form.restoreOldDisplayLine(form.recordIdx2DisplayLine(dv.getCurrRecIdx()));
                  Commands.addAsync(CommandType.UPDATE_TMP_EDITOR_INDEX, form.getTableCtrl());
                }
              }

              this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_PREFIX);
              if (ctrl != null)
                ctrl.invoke();
            }
            break;

          case InternalInterface.MG_ACT_RT_REFRESH_SCREEN:
          case InternalInterface.MG_ACT_RT_REFRESH_VIEW:
          case InternalInterface.MG_ACT_RT_REFRESH_RECORD:
            this.handleRefreshEvents(evt);
            break;

          case InternalInterface.MG_ACT_ACT_CLOSE_APPL:
            cmd =
              CommandFactory.CreateEventCommand(
                MGDataCollection.Instance.StartupMgData.getFirstTask().getTaskTag(),
                InternalInterface.MG_ACT_BROWSER_ESC);
            cmdsToServer.Add(cmd);
            server.Execute(CommandsProcessorBase_SendingInstruction.TASKS_AND_COMMANDS);
            break;

          case InternalInterface.MG_ACT_SERVER_TERMINATION:
            cmd = CommandFactory.CreateEventCommand(task.getTaskTag(), intEvtCode);
            cmdsToServer.Add(cmd);
            CommandsProcessorManager.GetCommandsProcessor().Execute(CommandsProcessorBase_SendingInstruction.TASKS_AND_COMMANDS);
            break;

          case InternalInterface.MG_ACT_RT_EDT_NULL:
            if (this._currField != null && this._currField.NullAllowed) {
              // the next lines is an immitation of the behaviour of an online program:
              // 1) the record must be updated in this event
              // 2) a "next field" event is raised
              this._currField.setValueAndStartRecompute(this._currField.getMagicDefaultValue(), true, true, true, false);
              this._currField.updateDisplay();

              // We need to refresh the table before invoking MG_ACT_TBL_NXTFLD.
              // Reason: The new (null) value is set on the logical control. MG_ACT_TBL_NXTFLD invokes CS of the current control.
              // CS gets the value from the actual control, which still contains the old value. And, so, it updates the field
              // again with the old value.
              let table = form.getTableCtrl();
              if (table != null)
                Commands.addAsync(CommandType.REFRESH_TABLE, table, 0, false);

              this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_TBL_NXTFLD);
            }
            break;

          case InternalInterface.MG_ACT_ROLLBACK:
            // for offline we need to cancel the edit and then go rollback the transaction, the same we doing for remove while return from the server
            // see dataview.cs case ConstInterface.RECOVERY_ROLLBACK:
            // for offline we will not get to ConstInterface.RECOVERY_ROLLBACK
            EventsManager.HandleRollbackAction(task, cmdsToServer, RollbackEventCommand_RollbackType.ROLLBACK);
            break;

          case InternalInterface.MG_ACT_EDT_UNDO:
            if (task.getLastParkedCtrl() != null) {
              let fld = <Field>task.getLastParkedCtrl().getField();
              if (fld != null) {
                fld.updateDisplay();
                Manager.SetSelect(task.getLastParkedCtrl());
              }
            }
            this.handleCtrlModify(ctrl, intEvtCode);
            break;


          case InternalInterface.MG_ACT_OK:
          case InternalInterface.MG_ACT_INDEX_CHANGE:
          case InternalInterface.MG_ACT_COL_SORT:
            // can sort only on column with an attached field.
            // can change index only if the dataview is remote.
            if ((intEvtCode === InternalInterface.MG_ACT_INDEX_CHANGE && task.DataviewManager.HasRemoteData) ||
              (intEvtCode === InternalInterface.MG_ACT_COL_SORT && ctrl.getField() != null)) {
              // QCR #296325 & QCR #430288.
              // Execute CS of the current control, because it can be a parameter for a subform.
              // If it's value was changed, CS will refresh the subform before the sort.
              let lastFocusedTask: Task = ClientManager.Instance.getLastFocusedTask();
              let focusedCtrl: MgControl = GUIManager.getLastFocusedControl(GUIManager.LastFocusMgdID);
              if (focusedCtrl != null)
                this.handleInternalEventWithMgControlBase(focusedCtrl, InternalInterface.MG_ACT_CTRL_SUFFIX);

              if (!this.GetStopExecutionFlag())
                task.ExecuteNestedRS(lastFocusedTask);

              // QCR #438753. Execute RS of the sorted task.
              if (!this.GetStopExecutionFlag() && task.getLevel() !== Constants.TASK_LEVEL_TASK)
                this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_SUFFIX);

              if (!this.GetStopExecutionFlag()) {
                task.getTaskCache().clearCache();

                if (intEvtCode === InternalInterface.MG_ACT_INDEX_CHANGE) {
                  let taskForm: MgForm = <MgForm>task.getForm();
                  if (taskForm.HasTable())
                    form.clearTableColumnSortMark(true);

                  cmd = CommandFactory.CreateIndexChangeCommand(task.getTaskTag(), (<DataView>task.DataView).GetCurrentRecId(), evt.getArgList());
                }
                else {
                  Commands.addAsync(CommandType.CHANGE_COLUMN_SORT_MARK, form.getControlColumn(evt.Control), evt.Direction, false);

                  cmd = CommandFactory.CreateColumnSortCommand(task.getTaskTag(), evt.Direction, ctrl.getDitIdx(), ctrl.getField().getId(), (<DataView>task.DataView).GetCurrentRecId());
                }

                task.DataviewManager.Execute(cmd);
                dv.setTopRecIdx(0);
                form.restoreOldDisplayLine(0);
                this._isSorting = true;
                // QCR's #165815 & #291974. If the focused task and the sorted task is the same task or
                // the focused task is a child of the sorted task, go to the first control in the first line.
                // If the focused task is the parent task, do not leave the current control.
                if (task === ClientManager.Instance.getLastFocusedTask() || !task.pathContains(ClientManager.Instance.getLastFocusedTask())) {
                  this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_TBL_BEGLINE);
                }
                else {
                  this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_PREFIX);
                  if (!this.GetStopExecutionFlag() && !task.getPreventControlChange())
                  // QCR #428697. Execute RS of all nested subforms.
                    lastFocusedTask.ExecuteNestedRS(task);
                  if (!this.GetStopExecutionFlag() && focusedCtrl != null)
                    focusedCtrl.invoke();
                }
                this._isSorting = false;
              }
            }
            break;

          case InternalInterface.MG_ACT_COL_CLICK:
            // can sort on column only if event is raised due to click action
            // and a field is attached to column.

            // before sorting, if CloseTasksOnParentActivate is on, try and close all child tasks.
            // we send the task of the top most form since our focuse might be inside a subform, and that is equal to clicking on its form.
            if (ClientManager.Instance.getEnvironment().CloseTasksOnParentActivate())
              this.CloseAllChildProgs(<Task>task.getTopMostForm().getTask(), null, false);

            if (!this.GetStopExecutionFlag() && evt.isGuiTriggeredEvent() && ctrl.isColumnSortable()) {
              let columnChildControl: MgControl = <MgControl>ctrl.getColumnChildControl();
              if (columnChildControl != null) {
                // handle Sort on Column
                let aRtEvt = new RunTimeEvent(columnChildControl, evt.Direction, 0);
                aRtEvt.setInternal(InternalInterface.MG_ACT_COL_SORT);
                ClientManager.Instance.EventsManager.addToTail(aRtEvt);
              }
            }
            break;

          case InternalInterface.MG_ACT_PRESS:
            if (ctrl != null)
              Commands.addAsync(CommandType.PROCESS_PRESS_EVENT, ctrl, ctrl.getDisplayLine(true), 0);
            else
              Commands.addAsync(CommandType.PROCESS_PRESS_EVENT, form, 0, 0);
            break;


          case InternalInterface.MG_ACT_PREV_RT_WINDOW:
          case InternalInterface.MG_ACT_NEXT_RT_WINDOW:
            Manager.ActivateNextOrPreviousMDIChild(intEvtCode === InternalInterface.MG_ACT_NEXT_RT_WINDOW ? true : false);
            break;
        }
      }
      // end of internal events processing
      else if (evt.getType() === ConstInterface.EVENT_TYPE_MENU_OS) {
        let errMsg: string = null;
        let exitCode: number = 0;

        let refErrMsg: RefParam<string> = new RefParam(errMsg);
        let refExitCode: RefParam<number> = new RefParam(exitCode);

        ProcessLauncher.InvokeOS(evt.getOsCommandText(), evt.getOsCommandWait(), evt.getOsCommandShow(), refErrMsg, refExitCode);

        errMsg = refErrMsg.value;
        exitCode = refExitCode.value;

        if (errMsg != null) {
          Manager.WriteToMessagePane(<Task>(evt.getTask().GetContextTask()), errMsg, false);
          FlowMonitorQueue.Instance.addFlowInvokeOsInfo(errMsg);
          Logger.Instance.WriteExceptionToLogWithMsg(errMsg);
        }

      }
      else if (evt.getType() === ConstInterface.EVENT_TYPE_MENU_PROGRAM) {
        let startupMgDataClosed: boolean = false;
        let programinternalName: string = evt.PublicName;
        let topMostFramForm: MgForm = <MgForm>ClientManager.Instance.RuntimeCtx.FrameForm;
        let creatorTask: Task = evt.ActivatedFromMDIFrame ? <Task>topMostFramForm.getTask() : evt.getTask();

        let menuPath: string = MenuManager.GetMenuPath(ClientManager.Instance.getLastFocusedTask());
        cmd = CommandFactory.CreateMenuCommand(creatorTask.getTaskTag(), evt.getMenuUid(), evt.getMenuComp(), menuPath);
        // Get the relevant menu entry
        server = CommandsProcessorManager.GetCommandsProcessor();
        if (programinternalName == null || evt.PrgFlow !== ConstInterface.MENU_PROGRAM_FLOW_RC) {
          // if program is activated from Mdi frame menu, check for 'close tasks' prop on task.
          // if the prop is true, it means we need to close all running tasks before activating the new task.
          // if one of the closing tasks is the startup task (run with f7) we will need to avoid closing the mdi when this task is closed,
          // and then, set the new opened task as our new startup task.
          if (evt.ActivatedFromMDIFrame) {
            let StartUpMgd: MGData = MGDataCollection.Instance.StartupMgData;
            if (topMostFramForm.getTask().checkProp(PropInterface.PROP_TYPE_CLOSE_TASKS_BY_MDI_MENU, false)) {
              let topMostFrameMgd: MGData = (<Task>topMostFramForm.getTask()).getMGData();
              if (topMostFrameMgd !== StartUpMgd)
                MGDataCollection.Instance.StartupMgData = topMostFrameMgd;

              // close all child progs. send startup mgd and and indication that the close is from the mdi frame menu
              this.CloseAllChildProgs(creatorTask, StartUpMgd, true);

              // if startUpMgd is aborting, it means that it was successfully closed
              startupMgDataClosed = StartUpMgd.IsAborting;

              // did not closed, set the saved start up mgd back to be the ClientManager.Instance's startup mgd.
              if (!startupMgDataClosed)
                MGDataCollection.Instance.StartupMgData = StartUpMgd;
            }
          }

          // send open prog from menu only if there was no problem.
          if (!this.GetStopExecutionFlag()) {
            let CurrStartUpMgdId: number = MGDataCollection.Instance.StartupMgData.GetId();
            // stat up mgdata was closed. we need to set the current mgdata to the current startup.
            // this can only be true if working with mdi fram menu and the close tasks flag is on.
            if (startupMgDataClosed)
              MGDataCollection.Instance.currMgdID = CurrStartUpMgdId;

            creatorTask.getMGData().CmdsToServer.Add(cmd);

            server.Execute(CommandsProcessorBase_SendingInstruction.TASKS_AND_COMMANDS);

            // when running with F7. If the original StartUp mgData was closed, and a new prog was opened, we need to
            // set the new mgd as the startup mgd.
            // StartUpMgDataClosed can only be true if working with mdi frame menu and the close tasks flag is on.
            if (startupMgDataClosed) {
              if (!this.GetStopExecutionFlag()) {
                if (MGDataCollection.Instance.currMgdID !== CurrStartUpMgdId)
                // curr mgd is different , meaning a new program was opened. This is our new startup mgdata.
                  MGDataCollection.Instance.StartupMgData = MGDataCollection.Instance.getCurrMGData();
              }
              else
              // something went wrong with the opening of the new task (which is supposed to be our new startup task). close all.
                this.handleInternalEventWithTask(creatorTask, InternalInterface.MG_ACT_EXIT);
            }
          }
        }
        else {
          let argList = new ArgumentsList();
          argList.fillListByMainProgVars(evt.MainProgVars, evt.getTask().getCtlIdx());
          Operation.callParallel(evt.getTask(), evt.PublicName, argList,
            evt.CopyGlobalParams, evt.PrgDescription);
        }
      }
    }
    finally {
      this.popRtEvent();
    }
  }

  /// <summary>
  /// Creates and executes subform open
  /// </summary>
  /// <param name="task"></param>
  /// <param name="subformControl"></param>
  private OpenSubform(task: Task, subformControl: MgControl): void {
    task.TaskService.RemoveRecomputes(task, null);
    let cmd: IClientCommand = CommandFactory.CreateSubformOpenCommand(task.getTaskTag(), subformControl.getDitIdx());
    task.getMGData().CmdsToServer.Add(cmd);
    Task.CommandsProcessor.Execute(CommandsProcessorBase_SendingInstruction.TASKS_AND_COMMANDS);
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="task"></param>
  /// <param name="cmdsToServer"></param>
  /// <param name="rollbackType"></param>
  /// <returns></returns>
  private static HandleRollbackAction(task: Task, cmdsToServer: CommandsTable, rollbackType: RollbackEventCommand_RollbackType): void {
    let commandsProcessor: CommandsProcessorBase = Task.CommandsProcessor;
    ClientRefreshCommand.ClientIsInRollbackCommand = true;
    // for remote program : (with\without local data) the rollback event in the server MUST
    //                       be execute on the task that open the transaction
    // for offline program the rollback transaction need to be execute on the task that open the transaction
    task = task.TaskService.GetOwnerTransactionTask(task);

    let cmd: IClientCommand = CommandFactory.CreateRollbackEventCommand(task.getTaskTag(), rollbackType);
    cmdsToServer.Add(cmd);
    commandsProcessor.Execute(CommandsProcessorBase_SendingInstruction.TASKS_AND_COMMANDS);

    ClientRefreshCommand.ClientIsInRollbackCommand = false;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="evt"></param>
  /// <param name="task"></param>
  /// <param name="form"></param>
  /// <param name="ctrl"></param>
  /// <param name="rec"></param>
  /// <param name="lastParkedCtrl"></param>
  /// <param name="oldRecMode"></param>
  /// <param name="oldMode"></param>
  /// <returns></returns>
  private HandleActCancel(evt: RunTimeEvent, task: Task, form: MgForm, ctrl: MgControl, rec: Record, isMG_ACT_CANCEL: boolean): void {
    // Prevent recursive mode
    // fixed bugs #:285498, 297455\427703\
    if (task.InHandleActCancel)
      return;

    task.InHandleActCancel = true;

    let lastParkedCtrl: MgControl = null;
    let oldMode: string = task.getMode();

    // When do we show the 'Confirm Cancel window' ? when all the following conditions apply:
    // 1. Task mode is not query
    // 2. rec is not Updated. Updated is true when there was an Update operation with 'force update'. If it is true, then there is no meaning to show the
    //    window since the update stays anyway (like in online when we go to CancelWasTriggered).
    // 3. There must be a modification, otherwise there is nothing to cancel. So either Modified is true, meaning a field was moidfied , or
    //    LastParkedCtrl().modifiedByUser(), meaning that we are in the middle of changing the field's value (The modified is false untill we exit the field).
    // Create mode also goes here (rec removed and mode changes to modify) , but also will show the confirm cancel only if some change was done to the new record.
    if (oldMode !== Constants.TASK_MODE_QUERY && !rec.Updated) {
      if (isMG_ACT_CANCEL) {
        if (rec.Modified || (task.getLastParkedCtrl() !== null && task.getLastParkedCtrl().ModifiedByUser)) {
          if (task.checkProp(PropInterface.PROP_TYPE_CONFIRM_CANCEL, false)) {
            if (!(GUIManager.Instance.confirm(<MgForm>task.getForm(), MsgInterface.CONFIRM_STR_CANCEL))) {
              task.InHandleActCancel = false;
              return;
            }
          }
        }
      }

      let oldRecMode: DataModificationTypes = rec.getMode();

      if (isMG_ACT_CANCEL) {
        // When canceling, we have to rollback the transaction.
        // Unless the event does not allow to rollback in cancel. That can happen if the cancel was initiated by the server's's rollback.
        if (task.isTransactionOnLevel(ConstInterface.TRANS_RECORD_PREFIX) && evt.RollbackInCancel()) {
          EventsManager.HandleRollbackAction(task, task.getMGData().CmdsToServer, RollbackEventCommand_RollbackType.CANCEL);
        }
      }

      EventsManager.HandleCancelEdit(evt, task, form, rec, oldRecMode);
    }
    // Qcr #747870 cancel should perform the record prefix if not quiting
    else {
      task.setLevel(Constants.TASK_LEVEL_TASK);

      // we rollback a parent task while focused on subform/task. We do not want the ctrl on the subform to do ctrl suffix.
      let lastFocusedControl: MgControl = GUIManager.getLastFocusedControl();
      if (lastFocusedControl !== null) {
        lastFocusedControl.getForm().getTask().setLevel(Constants.TASK_LEVEL_TASK);
      }
      if (!evt.isQuit()) {
        this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_PREFIX);
        task.setCurrVerifyCtrl(null);
        (<MgForm>task.getForm()).moveInRow(null, Constants.MOVE_DIRECTION_BEGIN);
      }
    }

    // QCR# 941277: If Cancel event is called from Quit event, then don't execute Exit event
    // if user has pressed 'No' on Confirm cancel box.
    if (evt.isQuit())
      this.handleInternalEventWithMgControlBase(ctrl, InternalInterface.MG_ACT_EXIT);

    task.InHandleActCancel = false;
  }

  /// <summary>
  /// cancel the edit
  /// </summary>
  /// <param name="evt"></param>
  /// <param name="task"></param>
  /// <param name="form"></param>
  /// <param name="rec"></param>
  /// <param name="oldRecMode"></param>
  private static HandleCancelEdit(evt: RunTimeEvent, task: Task, form: MgForm, rec: Record, oldRecMode: DataModificationTypes): void {
    // if the synced record (i.e. the record from the parent task of the subform) before Rollback was in 'Insert' mode,
    // so it must be in 'Insert' more after return from the server
    if (rec.Synced && oldRecMode === DataModificationTypes.Insert)
      rec.setMode(oldRecMode);

    if (form !== null) {
      // reset the last parked control
      if (task.getLastParkedCtrl() !== null)
        task.getLastParkedCtrl().resetPrevVal();

      form.cancelEdit(true, evt.isQuit());
    }
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="evt"></param>
  /// <param name="task"></param>
  /// <param name="dv"></param>
  /// <param name="rec"></param>
  /// <param name="nonInteractiveDelete"></param>
  /// <returns></returns>
  private HandleActionDelline(evt: RunTimeEvent, task: Task, dv: DataView, rec: Record, nonInteractiveDelete: boolean): boolean {
    let lastParkedCtrl: MgControl;
    let oldRecMode: DataModificationTypes;
    if (task.checkProp(PropInterface.PROP_TYPE_ALLOW_DELETE, true)) {
      lastParkedCtrl = <MgControl>task.getLastParkedCtrl();
      if (lastParkedCtrl !== null)
        this.handleInternalEventWithMgControlBase(lastParkedCtrl, InternalInterface.MG_ACT_CTRL_SUFFIX);
      if (!this.GetStopExecutionFlag()) {
        oldRecMode = rec.getMode();

        // Force the change to delete mode
        rec.clearMode();
        rec.setMode(DataModificationTypes.Delete);

        if (oldRecMode === DataModificationTypes.Insert)
          rec.setSendToServer(false);

        // execute task suffix in Modify mode or when there is 'force record suffix'.
        if (rec.Modified || task.checkProp(PropInterface.PROP_TYPE_FORCE_SUFFIX, false)) {
          task.setMode(Constants.TASK_MODE_MODIFY);
          this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_SUFFIX);
          // make sure that the record suffix completed successfully
          if (this._stopExecution) {
            if (!rec.SendToServer) {
              dv.addCurrToModified();
              rec.setSendToServer(true);
            }

            rec.clearMode();
            rec.setMode(oldRecMode);
            this.setStopExecution(false);
            this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_PREFIX);
            this.setStopExecution(true);
            return true;
          }
        }

        // execute record suffix in Delete mode
        // set the InDeleteProcess flag , so we will not try to send updates on the record after
        // we delete it in the commonHandlerAfter (rec suffix).
        rec.setInDeleteProcess(true);

        task.setMode(Constants.TASK_MODE_DELETE);
        // no confirm message dialog if in non interactive delete.
        let skipConfirmDialog: boolean = nonInteractiveDelete;

        if (!skipConfirmDialog) {
          if (task.mustConfirmInDeleteMode() || task.checkProp(PropInterface.PROP_TYPE_CONFIRM_UPDATE, false)) {
            let confirmed: boolean = GUIManager.Instance.confirm(<MgForm>task.getForm(), MsgInterface.CONFIRM_STR_DELETE);
            if (!confirmed) {
              rec.clearMode();
              rec.setMode(oldRecMode);
              task.setMode(Constants.TASK_MODE_MODIFY);
              if (lastParkedCtrl !== null)
                this.handleInternalEventWithMgControlBase(lastParkedCtrl, InternalInterface.MG_ACT_CTRL_PREFIX);

              return true;
            }
          }
        }

        this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_SUFFIX);
        rec.setInDeleteProcess(false);

        if (this._stopExecution) {
          if (!rec.SendToServer) {
            dv.addCurrToModified();
            rec.setSendToServer(true);
          }

          rec.clearMode();
          rec.setMode(oldRecMode);
          this.setStopExecution(false);
          task.setMode(Constants.TASK_MODE_MODIFY);
          this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_PREFIX);
          this.setStopExecution(true);

          return true;
        }

        // If we're deleting an inserted record, the server is not aware of it
        // make sure that upon delete, it will be removed from the modified rec list
        if (oldRecMode === DataModificationTypes.Insert) {
          rec.clearMode();
          rec.setMode(oldRecMode);
        }

        let newCurrRec: Record = dv.getCurrRec();

        try {
          // QCR #438175: when the user deletes a record, which is the single
          // record in the dv, then when its record suffix is executed and the
          // server sends a new record to the client and set it to be the
          // current record.
          // This fix makes the deleted record to be the current for a
          // moment just to delete it from the clients cache. Then, it makes
          // the new record to be the current again and enters into create mode.
          // I think that a better solution is to decide whether the client is
          // responsible for adding a new record or the server, and make sure
          // that it is done systemwide.
          // Ehud - 10/09/2001
          if (rec !== newCurrRec)
            dv.setCurrRec(rec.getId(), false);

          // no need to del the curr rec and position on the nex rec if the task is aborting.
          // The delCurrRec may cause a crash if it tries to get the next rec from the next chunk.
          if (!task.isAborting())
            this.delCurrRec(task, false);
        }
        finally {
          // QCR #438175 - fix continue
          if (rec !== newCurrRec) {
            dv.setCurrRec(newCurrRec.getId(), false);
            if (dv.getSize() === 1)
              task.setMode(Constants.TASK_MODE_CREATE);
          }
          // In interactive, the mode might change to modify or create. However, for non interactive (delete mode)
          // the mode should be set back to delete and will be used in the next record cycle.
          if (nonInteractiveDelete)
            task.setMode(Constants.TASK_MODE_DELETE);
        }
      }
    }
    return false;
  }

  /// <summary>
  ///   1. Handle record cycle (Control, Record Suffix & Prefix)
  ///   2. Send to the server request with locate query
  /// </summary>
  /// <param name = "evt">the event to handle with all its properties</param>
  private locateInQuery(task: Task): void {
    let form: MgForm = <MgForm>task.getForm();
    let dv: DataView = <DataView>task.DataView;
    let server: CommandsProcessorBase = Task.CommandsProcessor;
    let cmdsToServer: CommandsTable = task.getMGData().CmdsToServer;
    let cmd: IClientCommand = null;
    let ctrl: MgControl = task.locateQuery.Ctrl;

    if (ClientManager.Instance.InIncrementalLocate() || task.locateQuery.Buffer.Length === 0)
      return;

    ClientManager.Instance.SetInIncrementalLocate(true);
    this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_SUFFIX);

    if (task.isAborting())
      return;

    if (!this.GetStopExecutionFlag()) {
      cmd = CommandFactory.CreateLocateQueryCommand(task.getTaskTag(), ctrl.getDitIdx(), task.locateQuery.Buffer.ToString(), task.locateQuery.ServerReset, ctrl.getField().getId());

      task.getTaskCache().clearCache();
      task.DataviewManager.Execute(cmd);

      // After view refresh, the server always returns curr rec as first rec.
      if (!form.isScreenMode()) {
        dv.setTopRecIdx(0);
        form.restoreOldDisplayLine(form.recordIdx2DisplayLine(dv.getCurrRecIdx()));
      }

      if (!form.isScreenMode()) {
        if (form.HasTable()) {
          Commands.addAsync(CommandType.UPDATE_TMP_EDITOR_INDEX, form.getTableCtrl());
        }
      }

      task.locateQuery.ServerReset = false;
      task.locateQuery.InitServerReset = false;
      task.locateQuery.ClearIncLocateString();

      this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_PREFIX);
      if (ctrl.invoke()) {
        let pic: PIC = ctrl.getPIC();
        let newPos: number = task.locateQuery.Offset;

        for (let i: number = 0; i < newPos; i++) {
          if (pic.picIsMask(i))
            newPos++;
        }
        Manager.SetSelection(ctrl, newPos, newPos, newPos);
      }
      else if (!form.moveInRow(ctrl, Constants.MOVE_DIRECTION_NEXT))
        this.HandleNonParkableControls(task);
    }
    ClientManager.Instance.SetInIncrementalLocate(false);
  }

  /// <summary>
  ///   adds the pressed character to the locate string and restart the timer
  /// </summary>
  /// <param name = "evt"></param>
  private addLocateCharacter(evt: RunTimeEvent): void {
    let task: Task = evt.getTask();

    if (evt.getInternalCode() === InternalInterface.MG_ACT_CHAR) {
      // get locate character according to the picture
      let pic: PIC = evt.Control.getPIC();
      let pos: number = task.locateQuery.Offset + task.locateQuery.Buffer.Length;

      if (pos < pic.getMaskSize()) {
        let locateChar: string = evt.getValue().charAt(0);
        locateChar = pic.validateChar(locateChar, pos);
        if (locateChar !== String.fromCharCode(0))
          task.locateQuery.Buffer.Append(locateChar);
      }
    }
    else // backspace
      task.locateQuery.IncLocateStringAddBackspace();

    task.locateQuery.FreeTimer();

    var timer = Observable.timer(ConstInterface.INCREMENTAL_LOCATE_TIMEOUT);
    task.locateQuery.Timer = timer.subscribe(this.incLocateTimerCB);
  }

  /// <summary>
  ///   handle view refresh, screen refresh and record flush events
  /// </summary>
  /// <param name = "evt">the event to handle with all its properties</param>
  private handleRefreshEvents(evt: RunTimeEvent): void {
    let task: Task = evt.getTask();
    let form: MgForm = <MgForm>task.getForm();
    let dv: DataView = <DataView>task.DataView;
    let intEvtCode: number = evt.getInternalCode();
    let cmd: IClientCommand = null;

    // check if we try to view refresh with allow_modify=n in create mode
    if (intEvtCode === InternalInterface.MG_ACT_RT_REFRESH_VIEW && task.getMode() === Constants.TASK_MODE_CREATE && !task.checkProp(PropInterface.PROP_TYPE_ALLOW_MODIFY, true)) {
      this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_EXIT);
    }
    else {
      task.ExecuteNestedRS(ClientManager.Instance.getLastFocusedTask());
      if (!this.GetStopExecutionFlag()) {
        this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_SUFFIX);
      }
      if (!this.GetStopExecutionFlag() && !task.InEndTask && !task.isAborting()) {
        if (intEvtCode !== InternalInterface.MG_ACT_RT_REFRESH_SCREEN) {
          let currentRow: number = 0;
          if (!evt.getRefreshType()) {
            if (evt.RtViewRefreshUseCurrentRow() && task.IsInteractive) {
              currentRow = form.getCurrRecPosInForm();
            }
            cmd = CommandFactory.CreateInternalRefreshCommand(task.getTaskTag(), intEvtCode, dv.CurrentRecId, currentRow);
          }
          else {
            if (task.IsInteractive)
              currentRow = form.getCurrRecPosInForm();
            cmd = CommandFactory.CreateRealRefreshCommand(task.getTaskTag(), intEvtCode, currentRow, evt.getArgList(), dv.CurrentRecId);
          }
        }
        // screen refresh event
        else {
          let id: number;

          if (task.getForm() === null)
            id = 0;
          else if (task.getForm().isScreenMode())
            id = (<DataView>task.DataView).getCurrRec().getId();
          else
            id = (<DataView>task.DataView).getRecByIdx((<DataView>task.DataView).getTopRecIdx()).getId();

          cmd = CommandFactory.CreateScreenRefreshCommand(task.getTaskTag(), id, dv.CurrentRecId);
        }

        // real view refresh causes the cache of the current sub form task to be cleared
        if (intEvtCode !== InternalInterface.MG_ACT_RT_REFRESH_SCREEN)
        // screen refresh does not clear the cache
          task.getTaskCache().clearCache();

        task.DataviewManager.Execute(cmd);

        // QCR #289222. Do not continue with Refresh if the task must be ended.
        if (!this.GetStopExecutionFlag() && !task.InEndTask && !task.isAborting()) {
          // After view refresh, the server always returns curr rec as first rec.
          if (intEvtCode === InternalInterface.MG_ACT_RT_REFRESH_VIEW && !form.isScreenMode()) {
            dv.setTopRecIdx(0);
            if (form.HasTable()) {
              form.clearTableColumnSortMark(true);
              form.restoreOldDisplayLine(form.recordIdx2DisplayLine(dv.getCurrRecIdx()));
            }
          }

          // After record has been flushed it is not considered a new record anymore.
          if (intEvtCode === InternalInterface.MG_ACT_RT_REFRESH_RECORD && task.getMode() !== Constants.TASK_MODE_QUERY && !task.getAfterRetry()) {
            if (task.getMode() === Constants.TASK_MODE_CREATE) {
              task.setMode(Constants.TASK_MODE_MODIFY);
              (<DataView>task.DataView).getCurrRec().setOldRec();
            }
            dv.currRecCompute(true);
          }
          else if (intEvtCode === InternalInterface.MG_ACT_RT_REFRESH_SCREEN && task.getMode() !== Constants.TASK_MODE_QUERY && !task.getAfterRetry()) {
            dv.currRecCompute(true);
          }

          // QCR #430059. If the focused task and the refreshed task is the same task or
          // the focused task is a child of the refreshed task, go to the first control in the first line.
          // If the focused task is the parent task, do not leave the current control.
          this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_PREFIX);
          if (!this.GetStopExecutionFlag() && !task.getPreventControlChange()) {
            if (task === ClientManager.Instance.getLastFocusedTask() || !task.pathContains(ClientManager.Instance.getLastFocusedTask()))
              this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_TBL_BEGLINE);
            else
              this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_SUFFIX);
          }
        }
      }
    }
  }

  /// <summary>
  ///   Go to create mode
  /// </summary>
  /// <param name = "task"></param>
  /// <param name = "cmds"></param>
  private gotoCreateMode(task: Task, cmds: CommandsTable): void {
    let cmd: IClientCommand;
    task.enableModes();
    // QCR #417733. Execute RS's of the nested subforms if the current task is one of the nested subforms.
    task.ExecuteNestedRS(ClientManager.Instance.getLastFocusedTask());
    if (!this.GetStopExecutionFlag())
      this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_SUFFIX);
    if (!this.GetStopExecutionFlag()) {
      cmd = CommandFactory.CreateEventCommand(task.getTaskTag(), InternalInterface.MG_ACT_RTO_CREATE);
      task.DataviewManager.Execute(cmd);
      if (task.getLevel() === Constants.TASK_LEVEL_TASK)
        this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_PREFIX);
      task.moveToFirstCtrl(true);
      task.setCreateDeleteActsEnableState();
      task.setOriginalTaskMode(Constants.TASK_MODE_CREATE);
    }
  }

  /// <summary>
  ///   do some default operations for an event after all the handlers finished
  /// </summary>
  /// <param name = "rcBefore">the RC returned from the commonHandlerBefore</param>
  /// <param name = "propogate">if event was propogated</param>
  /// <param name = "Event">the event to handle</param>
  private commonHandlerAfter(evt: RunTimeEvent, rcBefore: boolean, propagate: boolean): void {
    let task: Task = evt.getTask();
    let dv: DataView;
    let rec: Record = null;
    let ctrl: MgControl;
    let recModified: boolean = false;
    let recModeIsDelete: boolean = false;
    let forceSuffix: boolean;

    if (this._stopExecution && evt.getInternalCode() !== InternalInterface.MG_ACT_REC_SUFFIX && evt.getInternalCode() !== InternalInterface.MG_ACT_CTRL_SUFFIX)
      return;

    if (evt.getType() === ConstInterface.EVENT_TYPE_INTERNAL) {
      dv = <DataView>task.DataView;
      rec = dv.getCurrRec();
      ctrl = evt.Control;

      switch (evt.getInternalCode()) {
        case InternalInterface.MG_ACT_REC_PREFIX:
          if (rcBefore) {
            // handle record prefix for the sub tasks too
            if (task.CheckRefreshSubTasks())
              task.doSubformRecPrefixSuffix();
            task.handleEventOnSlaveTasks(InternalInterface.MG_ACT_REC_PREFIX);
            task.enableModes();
          }
          break;

        case InternalInterface.MG_ACT_REC_SUFFIX:
          task.isFirstRecordCycle(false);
          // Once are ready to end the RS, it means we cannot be the FIRST record cycle
          if (task.getPreventRecordSuffix()) {
            task.setPreventRecordSuffix(false);
            return;
          }

          // QCR #115951. Even if record suffix is not executed, in the next time do not execute RP & RS of the subform.
          task.DoSubformPrefixSuffix = false;

          if (this._stopExecution) {
            // QCR #984031: if the delete operation failed due to "verify error"
            // in the record suffix then the record mode must be cleared
            if (rec.getMode() === DataModificationTypes.Delete)
              rec.clearMode();
            // Qcr 783039 : If we are already in control level it means that control prefix was already done or that
            // control suffix was not done. Either way there is no need to do control prefix again.
            if (task.getLevel() !== Constants.TASK_LEVEL_CONTROL) {
              let last = <MgControl>this.getStopExecutionCtrl();
              if (last === null)
                last = <MgControl>task.getLastParkedCtrl();

              this.setStopExecution(false);
              this.setStopExecutionCtrl(null);

              // QCR 426283 is we have a sub-form that was never been entered
              // make sure control level will not be entered
              if (last != null) {
                // we donot want CS to be called again from CP incase of verify err in CV
                task.setLevel(Constants.TASK_LEVEL_RECORD);

                let inCtrlPrefix: boolean = task.InCtrlPrefix;
                task.InCtrlPrefix = false;
                this.handleInternalEventWithMgControlBase(last, InternalInterface.MG_ACT_CTRL_PREFIX);
                task.InCtrlPrefix = inCtrlPrefix;
              }

              // in the future check the stopExecution flag here too and display a
              // confirm cancel dialog that will close the browser if the value is true
              this.setStopExecution(true);
            }
            return;
          }
          if (rec != null) {
            recModified = rec.Modified;
            if (!this._stopExecution && rec.isCauseInvalidation()) {
              (<MgForm>task.getForm()).invalidateTable();
              rec.setCauseInvalidation(false);
            }
            recModeIsDelete = (rec.getMode() === DataModificationTypes.Delete);

            forceSuffix = task.checkProp(PropInterface.PROP_TYPE_FORCE_SUFFIX, false);
            // if the record is deleted then execute the "rec suffix after" only
            // when the task mode is delete (second round)
            // inDeleteProcess : if there is an 'END TASK COND' we will have a 3rd cycle in record suffix(when upd+del or force suff + del).
            // 1st cycle : updae cycle (task mode will be update), 2nd : task mode is delete , this is when we send the delete to the server.
            // 3rd - suffix that is called from the endTask. In the 3rd cycle the recModeIsDelete will be false although we are still in the delete process (we already sent the delete oper).
            // A combination of force suffix + end task cond + del line , will crash the server on the 3rd cycle since we will ask for update off
            // a record that the server had deleted on the 2nd cycle. That it why we use 'inDeleteProcess', so will will know not
            // to add update oper on an already deleted record. (Qcr #790283).
            // * there is still a problem in 'update' and 'insert' with 'end task cond' + 'force' : an extra update will be send
            //   to the server on the rec suffix of the end task. but apart from server update it causes no real problem.
            if (recModeIsDelete && task.getMode() === Constants.TASK_MODE_DELETE ||
              !recModeIsDelete && !rec.inDeleteProcess() && (recModified || forceSuffix)) {
              rec.setMode(DataModificationTypes.Update);
              dv.addCurrToModified();
              dv.setChanged(true);

              if (recModified && task.getMode() === Constants.TASK_MODE_QUERY) {
                if (rec.realModified() &&
                  !ClientManager.Instance.getEnvironment().allowUpdateInQueryMode(task.getCompIdx())) {
                  // if real fields were modified
                  dv.cancelEdit(EventsManager.REAL_ONLY, false);
                  Manager.WriteToMessagePanebyMsgId(task, MsgInterface.RT_STR_UPDATE_IN_QUERY, false);
                  (<MgForm>task.getForm()).RefreshDisplay(Constants.TASK_REFRESH_CURR_REC);
                }
                // we must continue here and try to commit the transaction because
                // there might be also some sub tasks to this task
              }
            }

            // QCR#776295: for pre record update, commit the record after handler's execution.
            // Fixed bug #:306929, ForceExitPre is relevant only for the task that raised the event
            // see also bug#:292876
            if (!this.isForceExitPreRecordUpdate(task)) {
              if ((!recModeIsDelete || task.getMode() === Constants.TASK_MODE_DELETE))
                this.commitRecord(task, evt.reversibleExit());
            }

            if (!task.transactionFailed(ConstInterface.TRANS_RECORD_PREFIX) && !task.isAborting()) {
              // check whether to evaluate the end condition after the record suffix
              // in case there are 2 cycles (update/force suffix + delete), do the end task only in the 2nd cycle.
              if ((rec.getMode() === DataModificationTypes.Delete &&
                task.getMode() === Constants.TASK_MODE_DELETE) ||
                rec.getMode() !== DataModificationTypes.Delete)
                if (task.evalEndCond(ConstInterface.END_COND_EVAL_AFTER))
                  task.endTask(true, false, false);
            }
          } // rec != null
          break;

        case InternalInterface.MG_ACT_CTRL_PREFIX:
          if (rcBefore) {
            // check parkability once again as property might have changed in the handler
            // 924112 - ignore direction (if flag set) as we are forcing park inspite of failed direction
            // QCR# 806015: If we have a single field with allow parking = Yes and Tab Into = No, then on pressing tab if cursor is not
            // moved, we come to park on lastParkedCtrl (which is same as ctrl) since TabInto is not allowed.
            // So to avaoid infinite recursion, we should not again try to park on it.
            if ((ctrl.IsParkable(ClientManager.Instance.MoveByTab) || ctrl === GUIManager.getLastFocusedControl()) &&
              (ctrl.IgnoreDirectionWhileParking || ctrl.allowedParkRelatedToDirection())) {
              // set InControl true after Control Prefix
              ctrl.InControl = true;

              if (ctrl.ShouldRefreshOnControlEnter())
                (<Field>ctrl.getField()).updateDisplay();

              // if this code is reached then everything is ok in the control prefix
              // user handler. Now, move the focus to the control.
              task.setLastParkedCtrl(ctrl);
              // we have parked on a ctrl set clicked ctrl to null
              ClientManager.Instance.RuntimeCtx.CurrentClickedCtrl = null;

              // to take care of temporary editor
              // Manager.setFocus(ctrl, ctrl.getDisplayLine(false));
              ctrl.SetFocus(ctrl, ctrl.getDisplayLine(false), true, true);
              // we have successfully parked on a ctrl, set setstopexecutionCtrl to null
              this.setStopExecutionCtrl(null);

              Manager.SetSelect(ctrl);
              ClientManager.Instance.ReturnToCtrl = ctrl;
              task.InCtrlPrefix = false;
              task.setFlowMode(Task_Flow.NONE);
              this.selectProg(ctrl, true);
            }
            else {
              task.InCtrlPrefix = false;
              this.moveToParkableCtrl(ctrl, true);
            }
          }

          break;

        case InternalInterface.MG_ACT_CTRL_SUFFIX:
          // disable actions and states. do it only if we are getting out of the control.
          if (!this.GetStopExecutionFlag()) {
            ctrl.enableTextAction(false);
            if (ctrl.isChoiceControl()) {
              ctrl.SetKeyboardLanguage(true);
            }
            if (ctrl.Type === MgControlType.CTRL_TYPE_BUTTON)
              task.ActionManager.enable(InternalInterface.MG_ACT_BUTTON, false);

            if (task.getEnableZoomHandler() || ctrl.useZoomHandler())
              task.ActionManager.enable(InternalInterface.MG_ACT_ZOOM, false);
            task.ActionManager.enable(InternalInterface.MG_ACT_RT_COPYFLD, false);
            task.ActionManager.enable(InternalInterface.MG_ACT_RT_EDT_NULL, false);

            if (ctrl.isChoiceControl())
              task.ActionManager.enable(InternalInterface.MG_ACT_ARROW_KEY, false);

          }

          if (rcBefore) {
            if (this.GetStopExecutionFlag()) {
              // If control suffix get 'stop execution' (e.g. verify error), the focus will be remain on current control.
              // So set InControl to true
              ctrl.InControl = true;
              return;
            }

            // reset the nextParkedCtrl (set in ClientManager.processFocus)
            this._nextParkedCtrl = null;

            // Update fields that are assigned to a text control and with type that has default display
            // value (numeric, date, time, logical etc)
            let fld: Field = <Field>ctrl.getField();
            if (fld != null && (ctrl.Type === MgControlType.CTRL_TYPE_TEXT))
              fld.updateDisplay();

            Manager.SetUnselect(ctrl);
            task.setLevel(Constants.TASK_LEVEL_RECORD);
            ctrl.setInControlSuffix(false);

            if (task.evalEndCond(ConstInterface.END_COND_EVAL_IMMIDIATE))
              task.endTask(true, false, false);
          }
          break;

        case InternalInterface.MG_ACT_TASK_PREFIX:
          task.setLevel(Constants.TASK_LEVEL_TASK);
          break;

        case InternalInterface.MG_ACT_TASK_SUFFIX:
          task.setLevel(Constants.TASK_LEVEL_NONE);
          break;

        // simulates user asking for the next rec.
        case InternalInterface.MG_ACT_CYCLE_NEXT_REC:
          let form = <MgForm>task.getForm();
          if (!task.isMainProg() && form != null) {
            form.moveInView(form.isLineMode()
                ? Constants.MOVE_UNIT_ROW
                : Constants.MOVE_UNIT_PAGE,
              Constants.MOVE_DIRECTION_NEXT);
            // end of data will signal us to end the task (unless in create mode).
            if (task.getExecEndTask())
              task.endTask(true, false, false);
          }
          break;

        // delete record in non interactive task
        case InternalInterface.MG_ACT_CYCLE_NEXT_DELETE_REC:
          // check empty dataview before trying to delete, in case task started with empty dataview.
          if (task.DataView.isEmptyDataview())
            (task).setExecEndTask();
          else
            this.HandleActionDelline(evt, task, dv, rec, true);

          // end of data will signal us to end the task (unless in create mode).
          if (task.getExecEndTask())
            task.endTask(true, false, false);
          break;


        case InternalInterface.MG_ACT_BEGIN_DRAG:
          if (propagate)
            Manager.DragSetData(ctrl, evt.getDisplayLine());

          Manager.BeginDrag(ctrl, task.getTopMostForm(), evt.getDisplayLine());
          break;
      }
    }
  }

  /// <summary>
  ///   creates a non reversible event and handle it
  /// </summary>
  /// <param name = "task">a reference to the task </param>
  /// <param name = "eventCode">the code of the event </param>
  handleNonReversibleEvent(task: Task, eventCode: number): void {
    let rtEvt: RunTimeEvent = new RunTimeEvent(task);
    let exitCommand: boolean = (eventCode === InternalInterface.MG_ACT_EXIT || eventCode === InternalInterface.MG_ACT_CLOSE);

    rtEvt.setInternal(eventCode);

    if (exitCommand)
      this._isNonReversibleExit = true;

    try {
      rtEvt.setNonReversibleExit();
      rtEvt.setCtrl(<MgControl>task.getLastParkedCtrl());
      rtEvt.setArgList(null);
      this.handleEvent(rtEvt, false);
    }
    finally {
      if (exitCommand)
        this._isNonReversibleExit = false;
    }
  }

  /// <summary>
  ///   creates a new internal Event and handle it
  /// </summary>
  /// <param name = "task">a reference to the task</param>
  /// <param name = "eventCode">the code of the event</param>
  /// <param name = "isQuit">indicates whether MG_ACT_CANCEL is called from MG_ACT_RT_QUIT</param>
  handleInternalEventWithTaskAndEventSubtype(task: Task, eventCode: number, eventSubType: EventSubType): void {
    let lastParkedCtrl: MgControl = <MgControl>task.getLastParkedCtrl();
    let rtEvt: RunTimeEvent;

    if (eventCode < InternalInterface.MG_ACT_TOT_CNT && task != null && !(eventSubType === EventSubType.CancelIsQuit) && !task.ActionManager.isEnabled(eventCode))
      return;

    if (lastParkedCtrl !== null)
      this.handleInternalEventWithMgControl(lastParkedCtrl, eventCode, eventSubType);

    else {
      if (eventCode === InternalInterface.MG_ACT_RT_QUIT)
        this.handleInternalEventWithTaskAndEventSubtype(task, InternalInterface.MG_ACT_CANCEL, EventSubType.CancelIsQuit);
      else {
        rtEvt = new RunTimeEvent(task);
        rtEvt.setInternal(eventCode);
        rtEvt.SetEventSubType(eventSubType);
        if (InternalInterface.BuiltinEvent(eventCode))
          this.handleEvent(rtEvt, false);
        else
          this.commonHandler(rtEvt);
      }
    }
  }

  /// <summary>
  ///   creates a new internal Event and handle it
  /// </summary>
  /// <param name = "ctrl">a reference to the control</param>
  /// <param name = "eventCode">the code of the event</param>
  /// <param name = "isQuit">indicates whether MG_ACT_CANCEL is called from MG_ACT_RT_QUIT</param>
  private handleInternalEventWithMgControl(ctrl: MgControl, eventCode: number, eventSubType: EventSubType): void {
    let rtEvt: RunTimeEvent;

    if (eventCode === InternalInterface.MG_ACT_RT_QUIT)
      this.handleInternalEventWithMgControl(ctrl, InternalInterface.MG_ACT_CANCEL, EventSubType.CancelIsQuit);
    else {
      rtEvt = new RunTimeEvent(ctrl);
      rtEvt.setInternal(eventCode);
      rtEvt.SetEventSubType(eventSubType); // (use for act_cancel & act_rt_view_refresh
      // basically MG_ACT_VIEW_REFRESH represent the view refresh event raised by the user
      // however we use internally in the code to refresh the display (mainly in sub forms refreshes)
      // in order the distinguish between the real use and the internal use we set this flag to false
      // we need to distinguish between the two since we make different actions when caching a subform
      if (eventCode === InternalInterface.MG_ACT_RT_REFRESH_VIEW)
        rtEvt.setIsRealRefresh(false);

      if (InternalInterface.BuiltinEvent(eventCode))
        this.handleEvent(rtEvt, false);
      else
        this.commonHandler(rtEvt);
    }
  }

  /// <summary>
  ///   returns the current field
  /// </summary>
  getCurrField(): Field {
    return this._currField;
  }

  /// <summary>
  ///   returns current control
  /// </summary>
  getCurrCtrl(): MgControl {
    return this._currCtrl;
  }

  /// <summary>
  ///   returns the current task
  /// </summary>
  getCurrTask(): Task {
    if (this._currField == null)
      return null;
    return <Task>this._currField.getTask();
  }

  setStopExecution(stop: boolean): void;
  setStopExecution(stop: boolean, clearSrvrEvents: boolean): void;
  setStopExecution(stop: boolean, clearSrvrEvents?: boolean): void {
    if (arguments.length === 1)
      this.setStopExecution_0(stop);
    else
      this.setStopExecution_1(stop, clearSrvrEvents);
  }

  /// <summary>
  ///   set the "stop execution" flag to true
  /// </summary>
  private setStopExecution_0(stop: boolean): void {
    this.setStopExecution(stop, true);
  }

  /// <summary>
  ///   set the "stop execution" flag to true
  /// </summary>
  private setStopExecution_1(stop: boolean, clearSrvrEvents: boolean): void {
    if (stop)
      if (clearSrvrEvents)
        this._eventsQueue.clear();
      else {
        let tmpVec = new List<RunTimeEvent>();
        let rtEvt: RunTimeEvent;
        let i: number;

        // We were requested to leave the "server events" in the queue.
        // Do it, but also remove the "protection" from these events so next
        // time we need to clear the queue they will also be deleted.
        while (!this._eventsQueue.isEmpty()) {
          rtEvt = <RunTimeEvent>this._eventsQueue.poll();
          if (rtEvt.isFromServer()) {
            rtEvt.resetFromServer();
            tmpVec.push(rtEvt);
          }
        }

        for (i = 0; i < tmpVec.length; i++)
          this._eventsQueue.put(tmpVec.get_Item(i));
      }
    this._stopExecution = stop;
  }

  /// <summary>
  ///   set the ctrl on which we had a "stop execution"
  /// </summary>
  setStopExecutionCtrl(ctrl: MgControl): void {
    if (this._stopExecutionCtrl === null || ctrl === null)
      this._stopExecutionCtrl = ctrl;
  }

  /// <summary>
  ///   delete the current record
  /// </summary>
  /// <param name = "task">the task to refer to </param>
  /// <param name = "inForceDel">true if the delete is done because of force delete </param>
  private delCurrRec(task: Task, inForceDel: boolean): void {
    let dv: DataView = <DataView>task.DataView;

    task.setMode(Constants.TASK_MODE_MODIFY);

    // delete the record and run record suffix for the new current record
    (<MgForm>task.getForm()).delCurrRec();

    // no curr-rec ==> we deleted the last record and failed to create a new one (e.g.
    // CREATE mode is not allowed) ==> end the task. An exception to the rule is when
    // we are already in the process of creating a record.
    if (!task.DataView.isEmptyDataview()) {
      if (dv.getCurrRecIdx() >= 0) {
        // QCR #656495: If we got to this point and the current record is still the
        // deleted one then the record prefix will be handled elsewhere.
        if (dv.getCurrRec().getMode() !== DataModificationTypes.Delete && !inForceDel) {
          let ctrl: MgControl = <MgControl>task.getLastParkedCtrl();
          this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_PREFIX);
          if (!this.GetStopExecutionFlag())
            if (ctrl === null)
              task.moveToFirstCtrl(true);
            else
              this.handleInternalEventWithMgControlBase(ctrl, InternalInterface.MG_ACT_CTRL_PREFIX);
        }
      }
      else if (!task.getInCreateLine())
        this.handleNonReversibleEvent(task, InternalInterface.MG_ACT_EXIT);
    }
    else {
      this.HandleNonParkableControls(task);
      this.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_PREFIX);
    }
  }

  /// <summary>
  /// execute a select program and returns true if the program was executed  </summary>
  /// <param name="ctrl">the source control</param>
  /// <param name="prompt">if true then the caller is executing the called program at the end of control prefix</param>
  /// <returns></returns>
  selectProg(ctrl: MgControl, prompt: boolean): boolean {
    let cmd: IClientCommand;
    let selectMode: string = '0';
    let value: string;
    let mgVal: string;
    let progExecuted = false;
    let task = <Task>ctrl.getForm().getTask();

    // check if there is select program to the control
    if (ctrl.HasSelectProgram()) {
      // check if the control is parkable
      if (ctrl.IsParkable(false)) {
        // Get the select mode:
        // SELPRG_MODE_PROMPT - when get into the control open the select program
        // SELPRG_MODE_AFTER  - when select program was called park on the next control
        // SELPRG_MODE_BEFORE - when select program was called stay on the current control
        selectMode = ctrl.GetSelectMode();
        if (prompt) {
          if (selectMode === Constants.SELPRG_MODE_PROMPT) {
            // yeah, it's odd, but this is the way online task works (Ehud)
            this.handleInternalEventWithMgControlBase(ctrl, InternalInterface.MG_ACT_ZOOM);
            progExecuted = true;
            // #299198 select the control again after a selection prog
            // is executed in prompt mode
            Manager.SetSelect(ctrl);
          }
        }
        else {
          value = Manager.GetCtrlVal(ctrl);

          // validate the controls value
          if (!ctrl.validateAndSetValue(value, false))
            this.setStopExecution(true);
          else {
            let encodedVal: string = null;
            mgVal = ctrl.getMgValue(value);
            let rec = (<DataView>task.DataView).getCurrRec();
            encodedVal = rec.getXMLForValue(ctrl.getField().getId(), mgVal);
            cmd = CommandFactory.CreateExecOperCommand(task.getTaskTag(), null, Int32.MinValue, ctrl.getDitIdx(), encodedVal);
            task.getMGData().CmdsToServer.Add(cmd);

            let commandsProcessorServer: CommandsProcessorBase = CommandsProcessorManager.GetCommandsProcessor();
            commandsProcessorServer.Execute(CommandsProcessorBase_SendingInstruction.TASKS_AND_COMMANDS);
            // if (ctrl.getTask().hasSubTasks())
            //   ctrl.setDoNotFocus();
            if (selectMode === Constants.SELPRG_MODE_AFTER)
              this.handleInternalEventWithMgControlBase(ctrl, InternalInterface.MG_ACT_TBL_NXTFLD);
            progExecuted = true;
          }
        }
      }
    }
    return progExecuted;
  }

  /// <summary>
  ///   Executes CV for subforms.
  ///
  ///   For eg:
  ///   /\
  ///   \
  ///   Subform1
  ///   /        \
  ///   subform2       subform3 (with CommonParent to LastParked Ctrl)
  ///   /                 \
  ///   subform4 with Last         subform4
  ///   parked ctrl                   \
  ///   subform5
  ///   /     \
  ///   subform6    subform7 with DestCtrl
  ///
  ///   Execution of CVs for Subforms is done in three steps :
  ///   Step 1 : Build the 'subformCtrl path' after the srcCtrl's form or commmon
  ///   parent's form to the subformCtrl with the destCtrl
  ///   eg: subformCtrl path = subform4, subform5 and subform7
  ///   Step 2 : if LastParked Ctrl is on a form having Subform3, execute CV for the form.
  ///   Step 3 : For each subformctrl in 'subformCtrl path', execute CVs of ctrls
  ///   in subformCtrl's form.
  /// </summary>
  /// <param name = "task"></param>
  /// <param name = "destCtrl"></param>
  /// <returns></returns>
  private executeVerifyHandlerSubforms(task: Task, destCtrl: MgControl): boolean {
    let pTask: Task = null, pSubformCtrlTask = null;
    let pForm: MgForm = null;
    let bRc: boolean = true;
    let srcCtrl: MgControl;
    let frmCtrl: MgControl;
    let pSubformCtrl: MgControl;
    let pSubformCommonParent: MgControl; // parentsubfrm of destCtrl with common parent to srcCtrl
    let subformPathList: List<MgControlBase>;
    let lastParkedCtrl: MgControl = GUIManager.getLastFocusedControl();

    if (lastParkedCtrl == null || !destCtrl.onDiffForm(lastParkedCtrl))
      return bRc;

    // since there is zoom in or out of the subform, task of the destCtrl must have
    // currVerifyCtrl to null so as to begin CV execution from first Ctrl.
    task.setCurrVerifyCtrl(null);

    if (!destCtrl.getForm().isSubForm())
      return bRc;

    pTask = <Task>lastParkedCtrl.getForm().getTask();
    pForm = <MgForm>pTask.getForm();

    pTask.setFlowMode(Task_Flow.NONE);
    pTask.setDirection(Task_Direction.NONE);
    pTask.setFlowMode(task.getFlowMode());
    pTask.setDirection(task.getDirection());

    srcCtrl = <MgControl>pTask.getCurrVerifyCtrl(); // lastParkedCtrl;
    subformPathList = new List<MgControlBase>();

    // STEP 1: For subforms tree, build a subformCtrl path to execute CVs of
    // ctrls in the form after the srcCtrl's form or commmon parent's form
    // to the subformCtrl with the destCtrl.
    pSubformCommonParent = <MgControl>this.buildSubformPath(subformPathList, lastParkedCtrl, destCtrl);

    // STEP 2: Execute CVs of the form containing the srcCtrl (lastparked ctrl)
    // only if srcCtrl is on parentForm or parents of parentForm containig destCtrl.
    // It execute CVs of all ctrl after SrcCtrl til the lastCtrl on the form or
    // the ctrl after which focus switched into subform tree with dest ctrl.
    // Note: a. srcCtrl should not be the last control.
    // b. srcCtrl shud not be lower in subform tree than destCtrl (backward direction click).
    // c. srcCtrl and destCtrl shud not be on diff subform tree
    if (srcCtrl !== pForm.getLastNonSubformCtrl() && pSubformCommonParent != null
      && !lastParkedCtrl.onDiffForm(pSubformCommonParent)) {
      frmCtrl = (<MgForm>pTask.getForm()).getNextCtrlIgnoreSubforms(srcCtrl, Task_Direction.FORE);
      if (frmCtrl != null && pForm.ctrlTabOrderIdx(destCtrl) < pForm.ctrlTabOrderIdx(frmCtrl))
        frmCtrl = null;

      // execute verify handlers for ctrls on the form having lastParked ctrl
      bRc = this.executeVerifyHandlerSubform(pTask, frmCtrl, destCtrl);
    }

    // STEP 3: For each subformctrl of 'SubformCtrl' array, execute CVs of ctrls
    // in subformctrl's form.
    for (let index: number = subformPathList.length - 1; bRc && index >= 0; index--) {
      pSubformCtrl = <MgControl>subformPathList.get_Item(index);
      pSubformCtrlTask = <Task>pSubformCtrl.getForm().getTask();

      // execute RP of 'pSubformCtrl' task and all tasks in between
      this.execSubformRecPrefix(pSubformCtrl, destCtrl);
      if (this.GetStopExecutionFlag()) {
        bRc = false;
        break;
      }

      frmCtrl = (<MgForm>pSubformCtrlTask.getForm()).getFirstNonSubformCtrl();

      // execute verify handlers of ctrls on the form having
      // 'pSubformCtrl' subform ctrl
      bRc = this.executeVerifyHandlerSubform(pSubformCtrlTask, frmCtrl, destCtrl);
    }

    // execute RP of all tasks between Parent task and Current CP's task
    if (bRc) {
      let parentTask: Task = null;
      // If there is no 2+level nesting, use lastparked task. Otherwise, the last executed subformCtrl's task.
      if (pSubformCtrlTask == null)
        parentTask = pTask;
      else
        parentTask = pSubformCtrlTask;

      // execute RP of tasks between 'parentTask' and current Task
      this.executeAllRecordPrefix(parentTask, task, destCtrl, true);
      if (this.GetStopExecutionFlag())
        bRc = false;
    }

    pTask.setFlowMode(Task_Flow.NONE);
    pTask.setDirection(Task_Direction.NONE);

    return bRc;
  }

  /// <summary>
  ///   executes RecPrefix of subformCtrl's task, and (for 2+ level nested subform only) we execute RP
  ///   between the subformCtrl's task and its parent subformCtrl's task.
  /// </summary>
  /// <param name = "subformCtrl"></param>
  /// <param name = "destCtrl"> To execute CVs, this ctrl is used to compare taborder of RP task. If RP task less, CV fired.</param>
  private execSubformRecPrefix(subformCtrl: MgControl, destCtrl: MgControl): void {
    let subformCtrlTask = <Task>subformCtrl.getForm().getTask();
    let parentSubform = <MgControl>subformCtrl.getForm().getSubFormCtrl();

    if (parentSubform != null) {
      // execute RP of tasks in between.
      // For 2+ level nested subform, we execute RP between the subformCtrl's task and its parent subformCtrl's task.
      this.executeAllRecordPrefix(<Task>parentSubform.getForm().getTask(), subformCtrlTask, destCtrl, true);
      if (this.GetStopExecutionFlag())
        return;
    }

    // execute RP of subformCtrl task
    this.handleInternalEventWithTask(subformCtrlTask, InternalInterface.MG_ACT_REC_PREFIX);
  }

  /// <summary>
  ///   executes RP between 'parentTask' and 'childTask', and for each task, execute CVs from First ctrl till last ctrl,
  ///   only if taborder of task is less than destCtrl.
  /// </summary>
  /// <param name = "parentTask"></param>
  /// <param name = "childTask"></param>
  /// <param name = "destCtrl"> To execute CVs, this ctrl is used to compare taborder of RP task. If RP task less, CV fired.</param>
  private executeAllRecordPrefix(parentTask: Task, childTask: Task, destCtrl: MgControl, syncParent: boolean): void {
    let taskPathList = new List<Task>();
    let task = <Task>childTask.getParent();

    if (task === parentTask)
      return;

    // get all task in between
    while (task != null && task !== parentTask) {
      taskPathList.push(task);
      task = <Task>task.getParent();
    }

    if (task != null) {
      let bRc: boolean = true;

      for (let index: number = taskPathList.length - 1; index >= 0 && bRc; index--) {
        let pTask: Task = taskPathList.get_Item(index);

        if (syncParent)
          EventsManager.doSyncForSubformParent(pTask);

        this.handleInternalEventWithTask(pTask, InternalInterface.MG_ACT_REC_PREFIX);
        if (this.GetStopExecutionFlag())
          break;

        // execute CVs from First ctrl till last ctrl, only if taborder is less than destCtrl
        if (destCtrl !== null) {
          let firstCtrl: MgControl = (<MgForm>pTask.getForm()).getFirstNonSubformCtrl();

          if (firstCtrl != null && MgControl.CompareTabOrder(firstCtrl, destCtrl) < 0)
            bRc = this.executeVerifyHandlersTillLastCtrl(pTask, null);
        }
      }
    }
  }

  /// <summary>
  ///   Executes CVs for a single subform
  /// </summary>
  /// <param name = "task"></param>
  /// <param name = "frmCtrl"></param>
  /// <param name = "destCtrl"></param>
  /// <returns></returns>
  private executeVerifyHandlerSubform(task: Task, frmCtrl: MgControl, destCtrl: MgControl): boolean {
    let pForm: MgForm = <MgForm>task.getForm();
    let bRc: boolean = true;
    let curCtrl: MgControl;
    let toCtrl: MgControl;

    // frmCtrl must be on the task
    if (frmCtrl === null || frmCtrl.getForm().getTask() !== task)
      return bRc;

    curCtrl = frmCtrl;
    toCtrl = frmCtrl;
    // Find toCtrl as the lastctrl on the form after which we moved into subform.
    // Subfrom can be at any tab order and clicked and neednot be the last ctrl
    while ((curCtrl = curCtrl.getNextCtrl()) != null && curCtrl !== destCtrl) {
      if (!frmCtrl.onDiffForm(curCtrl))
        toCtrl = curCtrl;
    }
    if (curCtrl == null || toCtrl == null)
      toCtrl = pForm.getLastNonSubformCtrl();

    // frmCtrl and toCtrl shud always be in forwrd direction
    if (frmCtrl != null && toCtrl != null
      && pForm.ctrlTabOrderIdx(frmCtrl) <= pForm.ctrlTabOrderIdx(toCtrl))
      bRc = this.executeVerifyHandlers(task, null, frmCtrl, toCtrl);

    return bRc;
  }

  /// <summary>
  ///   finds the ctrl from which to start CV execution from
  /// </summary>
  /// <param name = "task"></param>
  /// <param name = "srcCtrl"></param>
  /// <returns></returns>
  private getCtrlExecCvFrom(task: Task, srcCtrl: MgControl, destCtrl: MgControl): MgControl {
    let execCvFromCtrl: MgControl = null;
    let Form: MgForm = <MgForm>task.getForm();
    let firstNonSubFormCtrl: MgControl = Form.getFirstNonSubformCtrl();

    if (srcCtrl == null) {
      let lastParkedCtrl: MgControl = GUIManager.getLastFocusedControl();

      // if subform and task contains lastparkedCtrl
      // if clicked on existing rec, we must find the fromCtrl based on direction on task. But if moved to a new
      // record, we must start from firstNonSubFormCtrl.
      if (lastParkedCtrl != null && destCtrl != null && lastParkedCtrl.onDiffForm(destCtrl)
        && Form.ctrlTabOrderIdx(lastParkedCtrl) > -1
        && Form.PrevDisplayLine === task.getForm().DisplayLine)
        execCvFromCtrl = Form.getNextCtrlIgnoreSubforms(lastParkedCtrl, task.getDirection());

      // #756675 - If subfrom, we can get execCvFromCtrl as null if we have tabbed from last ctrl on
      // subform and there is no control on the parent after this control. If no subfrom, we should
      // always set to firstNonSubFormCtrl.
      if (execCvFromCtrl == null)
        execCvFromCtrl = firstNonSubFormCtrl;
    }
    else if (task.getDirection() === Task_Direction.FORE) {
      execCvFromCtrl = srcCtrl.getNextCtrl();
      // if srcCtrl is the last ctrl, start executing CV from firstCtrl
      if (execCvFromCtrl === null)
        execCvFromCtrl = firstNonSubFormCtrl;
    }
    else
    // back
    {
      if (srcCtrl === firstNonSubFormCtrl)
        execCvFromCtrl = null;
      else
        execCvFromCtrl = srcCtrl.getPrevCtrl();
    }

    // if next/prev ctrl clicked or tab/shifttab and next/prev ctrl is parkable, then
    // execCvFromCtrl must be reset to null
    if (execCvFromCtrl !== null) {
      if (task.getFlowMode() === Task_Flow.STEP) {
        if (execCvFromCtrl.IsParkable(true))
          execCvFromCtrl = null;
      }
      else {
        let clickedCtrl = <MgControl>task.getClickedControl();

        if (clickedCtrl != null && clickedCtrl === execCvFromCtrl && execCvFromCtrl.IsParkable(false))
          execCvFromCtrl = null;
      }
    }

    return execCvFromCtrl;
  }

  /// <summary>
  ///   finds the ctrl from which to end CV execution to
  /// </summary>
  /// <param name = "task"></param>
  /// <param name = "fromCtrl"></param>
  /// <param name = "destCtrl"></param>
  /// <returns></returns>
  private getCtrlExecCvTo(task: Task, fromCtrl: MgControl, destCtrl: MgControl): MgControl {
    let form: MgForm = <MgForm>task.getForm();
    let execCvToCtrl: MgControl;
    let firstNonSubFormCtrl: MgControl = form.getFirstParkNonSubformCtrl();
    let lastNonSubFormCtrl: MgControl = form.getLastParkNonSubformCtrl();

    // if fromCtrl is null, we don't want to execute CVs
    if (fromCtrl == null)
      return null;

    if (task.getFlowMode() === Task_Flow.FAST) {
      let clickedCtrl = <MgControl>task.getClickedControl();

      // ensure direction is forward if CV executed from first ctrl
      if (fromCtrl === firstNonSubFormCtrl) {
        task.setDirection(Task_Direction.NONE);
        task.setDirection(Task_Direction.FORE);
      }

      if (task.isMoveInRow() && (task.getLastMoveInRowDirection() !== Constants.MOVE_DIRECTION_BEGIN &&
        task.getLastMoveInRowDirection() !== Constants.MOVE_DIRECTION_END) &&
        clickedCtrl != null) {
        let nextCtrl: MgControl = null;
        let prevCtrl: MgControl = null;

        if (!clickedCtrl.IsParkable(false)) {
          nextCtrl = form.getNextParkableCtrl(clickedCtrl);
          prevCtrl = form.getPrevParkableCtrl(clickedCtrl);

          // For subforms, ensure that NextParkable/PrevParkable is on same form as formCtrl
          if (nextCtrl != null && nextCtrl.onDiffForm(clickedCtrl))
            nextCtrl = null;
        }
        else {
          nextCtrl = clickedCtrl;
          prevCtrl = clickedCtrl;
        }

        if (task.getDirection() === Task_Direction.FORE) {
          if (nextCtrl != null)
            execCvToCtrl = nextCtrl.getPrevCtrl();
          else
            execCvToCtrl = clickedCtrl;
        }
        else {
          if (prevCtrl !== null)
            execCvToCtrl = prevCtrl.getNextCtrl();
          else
            execCvToCtrl = clickedCtrl;
        }
      }
      else {
        if (task.getDirection() === Task_Direction.FORE)
          execCvToCtrl = destCtrl.getPrevCtrl();
        else
          execCvToCtrl = destCtrl.getNextCtrl();

        // perform check -- required for alt+left/right
        // (case1: srcCtrl equals destctrl, case2: srctrl and destCtrl are back-to-back).
        // The fromCtrl-toCtrl direction should be same as that on task.
        if (fromCtrl !== null && execCvToCtrl !== null) {
          let compareResult: number = MgControl.CompareTabOrder(fromCtrl, execCvToCtrl);
          if (task.getDirection() === Task_Direction.FORE) {
            if (compareResult > 0)
              execCvToCtrl = null;
          }
          else if (compareResult < 0)
            execCvToCtrl = null;
        }
      }
    }
    else // step
    {
      if (task.getDirection() === Task_Direction.FORE) {
        let nextParkableCtrl: MgControl = form.getNextParkableCtrl(fromCtrl);
        if (nextParkableCtrl != null)
          execCvToCtrl = nextParkableCtrl.getPrevCtrl();
        else
          execCvToCtrl = lastNonSubFormCtrl;
      }
      else {
        let prevParkableCtrl: MgControl = form.getPrevParkableCtrl(fromCtrl);
        // For subforms, ensure that PrevParkable is on same form as formCtrl
        if (prevParkableCtrl !== null && !prevParkableCtrl.onDiffForm(fromCtrl))
          execCvToCtrl = prevParkableCtrl.getNextCtrl();
        else
          execCvToCtrl = firstNonSubFormCtrl;
      }
    }

    // All frmCtrl, toCtrl and destCtrl should not be equal. Either all these ctrl should
    // be different or any two match is allowed, but the third ctrl must be different.
    if (fromCtrl === execCvToCtrl && destCtrl === fromCtrl)
      execCvToCtrl = null;

    return execCvToCtrl;
  }

  /// <summary>
  ///   Execute the verify handlers from 'frmCtrl' to 'toCtrl' in the form.
  ///   And, if toCtrl's nextCtrl is not the 'destCtrl', executes verify handlers
  ///   from toCtrl's nextCtrl to destCtrl's prev/nextCtrl depending on direction.
  ///
  ///   Note: This function executes CVs for ctrls in the current form, not for any
  ///   ctrls in any subformCtrl.
  ///
  ///   For eg:
  ///   ctrls    a     b     c     d     e     f     g     h
  ///   X     X           X     X           X     X     (X are non parkables)
  ///   -------------------------------------------------------------------------
  ///   Seq.  Parked   Clicked/Tab    Clicked     DestCtrl    frmCtrl  toCtrl
  ///   on       /ShiftTab      Ctrl
  ///   -------------------------------------------------------------------------
  ///   1.    c        Click             d              f           d        e
  ///   2.    c        Click             f              f           d        e
  ///   3.    c        Click             h              f           d        h
  ///   4.    c        Click             a              c           b        a
  ///   5.    c        Tab               -              f           d        e
  ///   6.    f        Tab               -              null        g        h (executed from moveinrow)
  ///   c           a        b (on next/same rec)
  ///   7.    f        STab              -              c           e        d
  ///   8.    c        STab              -              c           b        a
  ///   9.    c        Click       f (next rec.)        null        d        h (executed from moveinrow)
  ///   f           a        e (on next. rec)
  ///   10.   c        Click       f (prev rec.)        f           a        e (on prev. rec)
  /// </summary>
  /// <param name = "task"></param>
  /// <param name = "aDstCtrl"></param>
  /// <param name = "frmCtrl"></param>
  /// <param name = "toCtrl"></param>
  /// <returns></returns>
  private executeVerifyHandlers(task: Task, aDstCtrl: MgControl, frmCtrl: MgControl, toCtrl: MgControl): boolean {
    let bRc: boolean = true;
    let direction: Task_Direction = Task_Direction.FORE;
    let currCtrl: MgControl = null;
    let dstCtrl: MgControl = null;
    let currFld: Field = null;
    // bool executeForSameControl = false;

    let form = <MgForm>task.getForm();
    let originalFlowMode: Task_Flow = 0;

    if (null == frmCtrl || null == toCtrl)
      return bRc;

    originalFlowMode = task.getFlowMode();

    if (frmCtrl === toCtrl) {
      direction = task.getDirection();
      if (direction === Task_Direction.NONE)
        direction = Task_Direction.FORE;
    }
    else if (form.ctrlTabOrderIdx(frmCtrl) > form.ctrlTabOrderIdx(toCtrl))
      direction = Task_Direction.BACK;

    if (task !== frmCtrl.getForm().getTask())
      frmCtrl = form.getNextCtrlIgnoreSubforms(frmCtrl, direction);
    if (task !== toCtrl.getForm().getTask())
      toCtrl = form.getNextCtrlIgnoreSubforms(toCtrl,
        (direction === Task_Direction.FORE
          ? Task_Direction.BACK
          : Task_Direction.FORE));

    // Check to confirm frm-to direction is same as earlier 'direction'
    if (null == frmCtrl || null == toCtrl)
      return bRc;
    else if (frmCtrl !== toCtrl) {
      if (form.ctrlTabOrderIdx(frmCtrl) > form.ctrlTabOrderIdx(toCtrl)) {
        if (direction === Task_Direction.FORE)
          return bRc;
      }
      else if (direction === Task_Direction.BACK)
        return bRc;
    }

    currCtrl = frmCtrl;
    dstCtrl = toCtrl;

    if (currCtrl != null && dstCtrl !== null && form.ctrlTabOrderIdx(currCtrl) > form.ctrlTabOrderIdx(dstCtrl))
      direction = Task_Direction.BACK;

    if (dstCtrl == null)
      dstCtrl = form.getLastTabbedCtrl();

    task.setDirection(Task_Direction.NONE);
    task.setDirection(direction);

    while (bRc && currCtrl != null && currCtrl !== toCtrl) {
      if (currCtrl != null && (currCtrl.Type === MgControlType.CTRL_TYPE_BROWSER || currCtrl.getField() != null) &&
        currCtrl.getForm().getTask() === task)

        if (currCtrl == null)
          break;

      currFld = <Field>currCtrl.getField();

      if (currFld == null || (currCtrl != null && currCtrl.getForm().getTask() !== task)) {
        currCtrl = form.getNextCtrlIgnoreSubforms(currCtrl, direction);
        continue;
      }

      // check for verify handlers
      if (currCtrl != null) {
        if (bRc && currCtrl.HasVerifyHandler)
          bRc = this.executeVerifyHandler(currCtrl);
      }

      currCtrl = form.getNextCtrlIgnoreSubforms(currCtrl, direction);
    }

    // execute the CV for toCtrl
    if (bRc && toCtrl.HasVerifyHandler)
      bRc = this.executeVerifyHandler(toCtrl);

    currCtrl = form.getNextCtrlIgnoreSubforms(currCtrl, direction);

    // execute CVs if currCtrl is not the destCtrl
    // eg. tabbing/click when the all next/prev ctrls are not parkable
    if (bRc && aDstCtrl !== null && toCtrl != null && currCtrl !== aDstCtrl) {
      let originalDirection: Task_Direction = task.getDirection();
      let fCtrl: MgControl = null;
      let tCtrl: MgControl = null;
      let cycleRecMain: boolean = form.isRecordCycle();

      // cycleRecMain is set and all ctrls after it is not parkable. If tabbed,
      // CV from srcCtrl to last ctrl is already executed. Cvs form firstCtrl
      // to destCtrl must be executed.
      if (task.getFlowMode() === Task_Flow.STEP && direction === Task_Direction.FORE && cycleRecMain) {
        fCtrl = this.getCtrlExecCvFrom(task, null, null);
        tCtrl = this.getCtrlExecCvTo(task, fCtrl, aDstCtrl);
      }
      else if (direction === Task_Direction.FORE) {
        // if destCtrl is between frmCtrl and toCtrl, we must execute Cvs from
        // toCtrl's prev to destCtrl's next. reset Direction to FLOW_BACK
        if (toCtrl.getPrevCtrl() !== aDstCtrl) {
          fCtrl = toCtrl.getPrevCtrl();
          tCtrl = aDstCtrl.getNextCtrl();
        }
        direction = Task_Direction.BACK;
      }
      else {
        // if destCtrl is between toCtrl and frmCtrl, we must execute Cvs from
        // toCtrl's next to destCtrl's prev. reset Direction to Direction.FORE
        if (toCtrl.getNextCtrl() !== aDstCtrl) {
          fCtrl = toCtrl.getNextCtrl();
          tCtrl = aDstCtrl.getPrevCtrl();
        }
        direction = Task_Direction.FORE;
      }

      // set the new direction
      task.setDirection(Task_Direction.NONE);
      task.setDirection(direction);

      // pass null as second parametr to avoid recursion
      if (fCtrl !== null && tCtrl !== null)
        bRc = this.executeVerifyHandlers(task, null, fCtrl, tCtrl);

      task.setDirection(Task_Direction.NONE);
      task.setDirection(originalDirection);
    }

    task.setFlowMode(Task_Flow.NONE);
    task.setFlowMode(originalFlowMode);

    return bRc;
  }

  /// <summary>
  ///   execute control verification for 'ctrl'
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <returns></returns>
  private executeVerifyHandler(ctrl: MgControl): boolean {
    let bRc: boolean = true;
    this.handleInternalEventWithMgControlBase(ctrl, InternalInterface.MG_ACT_CTRL_VERIFICATION);
    if (this.GetStopExecutionFlag())
      return false;

    return bRc;
  }

  /// <summary>
  ///   process users confirmation
  /// </summary>
  /// <param name = "task">to check confirm update</param>
  /// <returns> true - process command, false - stop command processing</returns>
  private updateConfirmed(task: Task): boolean {
    let confirm: boolean;
    let answer: string;
    let ans: number;

    if (task == null)
      return false;

    confirm = task.checkProp(PropInterface.PROP_TYPE_CONFIRM_UPDATE, false);
    if (confirm && !task.DataSynced) {
      ans = GUIManager.Instance.confirm(<MgForm>task.getForm(), MsgInterface.CRF_STR_CONF_UPD,
        Styles.MSGBOX_ICON_QUESTION | Styles.MSGBOX_BUTTON_YES_NO_CANCEL);
      if (ans === Styles.MSGBOX_RESULT_YES)
        answer = 'Y';
      // Yes
      else if (ans === Styles.MSGBOX_RESULT_NO)
        answer = 'N';
      // No
      else
        answer = 'C'; // Cancel
    }
    else
      answer = 'Y';

    switch (answer) {
      case 'Y':
        break;

      case 'N':
        (<MgForm>task.getForm()).cancelEdit(false, false);
        (<MgForm>task.getForm()).RefreshDisplay(Constants.TASK_REFRESH_CURR_REC);
        task.ConfirmUpdateNo = true;
        return false; // not continue record suffix

      case 'C':
        this.setStopExecution(true);
        this.setStopExecutionCtrl(GUIManager.getLastFocusedControl());
        Manager.SetFocus(GUIManager.getLastFocusedControl(), -1);
        return false; // stop event processing

      default:
        Logger.Instance.WriteExceptionToLogWithMsg("in ClientManager.Instance.updateConfirmed() illegal confirmation code: " +
          confirm);
        break;
    }
    return true;
  }

  /// <summary>
  ///   Set version number
  /// </summary>
  /// <param name = "ver">version number</param>
  setVer(ver: number): void {
    this._ver = ver;
  }

  /// <summary>
  ///   Set subversion number
  /// </summary>
  /// <param name = "subver">subversion number</param>
  setSubVer(subver: number): void {
    this._subver = subver;
  }

  /// <summary>
  ///   Set the order of handling main programs of components
  /// </summary>
  setCompMainPrgTab(compMainPrgTable: CompMainPrgTable): void {
    this._compMainPrgTab = compMainPrgTable;
  }

  /// <summary>
  ///   set end of work flag
  /// </summary>
  setEndOfWork(endOfWork_: boolean): void {
    this._endOfWork = endOfWork_;
  }

  /// <summary>
  ///   get end of work flag
  /// </summary>
  getEndOfWork(): boolean {
    return this._endOfWork;
  }

  /// <summary>
  ///   get the order of handling main programs of components
  /// </summary>
  getCompMainPrgTab(): CompMainPrgTable {
    return this._compMainPrgTab;
  }

  /// <summary>
  ///   get SubVersion number
  /// </summary>
  getSubVer(): number {
    return this._subver;
  }

  /// <summary>
  ///   get Version number
  /// </summary>
  getVer(): number {
    return this._ver;
  }

  /// <summary>
  ///   get the reversible exit flag
  /// </summary>
  inNonReversibleExit(): boolean {
    return this._isNonReversibleExit;
  }

  /// <summary>
  ///   push a runtime event to the stack
  /// </summary>
  /// <param name = "rtEvt">the runtime event to push on the stack</param>
  pushRtEvent(rtEvt: RunTimeEvent): void {
    this._rtEvents.push(rtEvt);
  }

  /// <summary>
  ///   pop a runtime event from the stack and return it
  /// </summary>
  popRtEvent(): RunTimeEvent {
    if (this._rtEvents.count() === 0)
      return null;
    return <RunTimeEvent>this._rtEvents.pop();
  }

  /// <summary>
  ///   return the runtime event located on the top of the stack
  /// </summary>
  getLastRtEvent(): RunTimeEvent {
    if (this._rtEvents.count() === 0)
      return null;
    return <RunTimeEvent>this._rtEvents.peek();
  }

  /// <summary>
  ///   set the value of a flag which indicates whether we should ignore unknown commands
  ///   arriving from the engine.
  /// </summary>
  setIgnoreUnknownAbort(val: boolean): void {
    this._ignoreUnknownAbort = val;
  }

  /// <summary>
  ///   returns the value of the "ignore unknown abort" flag
  /// </summary>
  ignoreUnknownAbort(): boolean {
    return this._ignoreUnknownAbort;
  }

  /// <summary>
  ///   compute help URL
  /// </summary>
  /// <param name = "current">control</param>
  getHelpUrl(ctrl: MgControl): string {
    let helpIdx: string = null;

    if (ctrl !== null) {
      helpIdx = ctrl.getHelpUrl();
      if (helpIdx === null && ctrl.getForm().getContainerCtrl() !== null) {
        // if the control is descenden of the container control then we need to take the help from the
        // container control.
        let ContainerControl: MgControl = <MgControl>ctrl.getForm().getContainerCtrl();
        if (ctrl.isDescendentOfControl(ContainerControl))
          helpIdx = ContainerControl.getHelpUrl();
      }
      if (helpIdx === null) {
        let form: MgForm = <MgForm>ctrl.getForm();
        if (form !== null)
          helpIdx = form.getHelpUrl();
      }
    }
    return helpIdx;
  }

  /// <summary>
  ///   recover from a failure to overlay a task. When the server orders the client to run a
  ///   new task in a frame which already contains an active task, the client tries to term the
  ///   existing task and replace him. When this action fails, the client has to ask the server
  ///   to terminate the NEW TASK, and ignore the overlay action.
  /// </summary>
  /// <param name = "taskid">- the id of the NEW TASK</param>
  /// <param name = "mgd">   - the MGData of the OLD TASK.</param>
  failTaskOverlay(taskId: string, mgd: MGData): void {
    let cmd: IClientCommand;

    if (taskId !== null) {
      // The server will return us 'abort' commands for the new task. Ignore them, since it wasnt started yet
      this.setIgnoreUnknownAbort(true);
      try {
        cmd = CommandFactory.CreateNonReversibleExitCommand(taskId, false);
        mgd.CmdsToServer.Add(cmd);
        RemoteCommandsProcessor.GetInstance().Execute(CommandsProcessorBase_SendingInstruction.TASKS_AND_COMMANDS);
      }
      finally {
        this.setIgnoreUnknownAbort(false);
      }
    }
  }

  /// <summary>
  ///   abort an overlayed MGData and return true on success
  /// </summary>
  /// <param name = "mgd">the MGData to abort</param>
  /// <param name = "newId">the overlaying task id, or NULL if there is no overlaying task</param>
  abortMgd(mgd: MGData, newId: string): boolean {
    let stopExecutionFlag: boolean = this.GetStopExecutionFlag();

    this.setStopExecution(false);

    mgd.getFirstTask().endTask(true, false, false);

    // The server may open a new task which the client would use to overlay
    // another existing task. This overlay may fail if closing the task failed.
    if (this.GetStopExecutionFlag()) {
      // fail overlaying task only if there is one
      if (newId !== null)
        this.failTaskOverlay(newId, mgd);

      return false;
    }
    else
      this.setStopExecution(stopExecutionFlag);

    return true;
  }

  /// <summary>
  ///   returns TRUE if current event should be propogtated to all tasks in a specific transaction
  /// </summary>
  isEventScopeTrans(): boolean {
    return this._eventScope === EventScope.TRANS;
  }

  /// <summary>
  ///   set event scope to TRANSACTION
  /// </summary>
  setEventScopeTrans(): void {
    this._eventScope = EventScope.TRANS;
  }

  /// <summary>
  ///   set event scope to NON TRANSACTION
  /// </summary>
  clearEventScope(): void {
    this._eventScope = EventScope.NONE;
  }

  /// <summary>
  ///   get time of fist event in sequence
  /// </summary>
  /// <returns> time of fitst event in sequence</returns>
  GetEventTime(): number {
    return this._eventsQueue.GetTime();
  }

  /// <param name = "task"></param>
  /// <param name = "kbItm"></param>
  /// <returns> the last enabled action for the specific key (in kbItem)</returns>
  /// <checkAccessKeyInMenus:>  if to check the keyboard in the menu </checkAccessKeyInMenus:>
  public getMatchingAction(task: Task, kbItm: KeyboardItem, checkAccessKeyInMenus: boolean): number {
    let kbdStates: number;
    let kbItemArray: List<KeyboardItem>;
    let act: number = 0;
    let maxActCount: number = 0;
    let actCount: number;
    let actId: number;
    let menuEntry: MenuEntry = null;
    let currTask: Task = task;

    // when menu is define with no keyboard define, the kbItem is return null;
    if (kbItm == null)
      return act;

    // check the keyboard in the menu and process the on selection in the osCoommand & program & sys & user event.
    // a kbItm with MG_ACT_CHAR in it (i.e a char is to be writen), don't bother to check for access key. (Performance)
    if (checkAccessKeyInMenus && kbItm.getAction() !== InternalInterface.MG_ACT_CHAR) {
      let topMostForm = <MgForm>task.getTopMostForm();
      if (topMostForm !== null && topMostForm.ConcreteWindowType !== WindowType.Modal)
        topMostForm = <MgForm>topMostForm.getTopMostFrameForm();
      if (topMostForm !== null) {
        menuEntry = (<MgFormBase>topMostForm).getMenuEntrybyAccessKey(kbItm, MenuStyle.MENU_STYLE_PULLDOWN);
        currTask = <Task>topMostForm.getTask();
      }

      // fixed bug #:988877, need to check the keyboard on the context menu of the last control
      // if (menuEntry == null) {
      //   let mgControl: MgControl = GUIManager.getLastFocusedControl(task.getMGData().GetId());
      //   if (mgControl != null)
      //     menuEntry = mgControl.getContextMenuEntrybyAccessKeyToControl(kbItm);
      // }


      if (menuEntry != null) {
        if (menuEntry.menuType() === GuiMenuEntry_MenuType.PROGRAM)
          MenuManager.onProgramMenuSelection(task.ContextID, <MenuEntryProgram>menuEntry, <MgForm>currTask.getForm(),
            (topMostForm != null && topMostForm.IsMDIFrame));
        else if (menuEntry.menuType() === GuiMenuEntry_MenuType.OSCOMMAND)
          MenuManager.onOSMenuSelection(task.ContextID, <MenuEntryOSCommand>menuEntry, <MgForm>task.getForm());
        else if (menuEntry.menuType() === GuiMenuEntry_MenuType.SYSTEM_EVENT || menuEntry.menuType() === GuiMenuEntry_MenuType.USER_EVENT)
          MenuManager.onEventMenuSelection(<MenuEntryEvent>menuEntry, <MgForm>task.getForm(), currTask.getCtlIdx());
        // MENU_TYPE_INTERNAL_EVENT
        else {

        } // will be handle down

        if (!(menuEntry instanceof MenuEntryEvent))
          return act;
      }
    }

    // in case the there is act_char on the kbItm, no need to search.
    // we had a problem, some chars has the same keycode of other keyboard keys after translating to magic codes.
    // for example: char ' is keycode 39. right arrow is also trans in kbdConvertor to 39,
    // so ' might be mistaken for right arrow. so here, if we have an action of act_char we know its '.
    // NO kbd combination that prduces a character can be mapped into a magic action. this is why
    if (kbItm.getAction() === InternalInterface.MG_ACT_CHAR)
      act = InternalInterface.MG_ACT_CHAR;
    else {
      kbdStates = task.getKeyboardMappingState();
      kbItemArray = ClientManager.Instance.getKbdMap().getActionArrayByKeyboard(kbItm.getKeyCode(), kbItm.getModifier());
      if (kbItemArray != null) {
        for (let i: number = 0; i < kbItemArray.length; i++) {
          let kbdItem: KeyboardItem = kbItemArray.get_Item(i);

          actId = kbdItem.getAction();
          if (task.ActionManager.isEnabled(actId) && (kbdStates === (kbdItem.getStates() | kbdStates))) {
            actCount = task.ActionManager.getActCount(actId);
            if (actCount > maxActCount) {
              // new definition : SDI windows will not be closed by pressing Escape
              // Unless the program was run from studio (Qcr 998911, 763547)
              if (actId === InternalInterface.MG_ACT_EXIT && kbItm.getKeyCode() === GuiConstants.KEY_ESC) {
                let form = <MgForm>task.getForm();
                if (form != null) {
                  if (form.getTopMostForm().IsMDIOrSDIFrame && !ClientManager.StartedFromStudio)
                    continue;
                }
              }
              maxActCount = actCount;
              act = actId;
            }
          }
        }
      }
    }

    // There was no kbd mapping the that key, but it still belongs to an action.
    // see if the kbItm hold an action (originally made for MG_ACT_CHAR).
    if (act === 0) {
      // if menu was found and it is internal event put action to the queue only if there was no kbd mapping the that key.
      if (checkAccessKeyInMenus && menuEntry != null && menuEntry.menuType() === GuiMenuEntry_MenuType.INTERNAL_EVENT)
        MenuManager.onEventMenuSelection(<MenuEntryEvent>menuEntry, <MgForm>task.getForm(),
          task.getCtlIdx());
      else if (kbItm.getAction() !== 0)
        act = kbItm.getAction();
      // this is only TEMP hardcoded. the action will need to be in the keyboard mapping
      // also a change to the online (if time permits) also to turn the toggle insert into an act.
      else if (kbItm.getKeyCode() === 45 && kbItm.getModifier() === Modifiers.MODIFIER_NONE && kbItm.getStates() === 0)
        act = InternalInterface.MG_ACT_TOGGLE_INSERT;
    }

    act = this.GetNavigationAction(task, kbItm, act);

    return (act);
  }

  /// <summary>
  /// Get correct navigation action (Similar to Mainexe.cpp --> NavigationActsCallback)
  /// CTRL + TAB and SHIFT + CTRL + TAB actions are used for navigating between two windows and as well in different tabs in tab control.
  ///
  /// In online we traverse through each taskRt in TaskInfoPtr, until we get reach task with WindowType = NON CHILD WINDOW. This isn't handle for RIA.
  /// This is because in online when a parent task has a tab control and if CTRL+TAB is pressed, ACT_NEXT_RT_WINDOW is converted to ACT_TAB_NEXT and
  /// the focus shifts between controls of child window. This functionality isn't (ACT_TAB_NEXT should switch focus between controls) implemented for RIA as of now.
  /// </summary>
  /// <param name="task"></param>
  /// <param name="kbItm"></param>
  /// <param name="actionId"></param>
  /// <returns>correct navigation action</returns>
  private GetNavigationAction(task: Task, kbItm: KeyboardItem, actionId: number): number {

    let actId: number = 0;

    // convert only if the actions are raised through keyboard.
    if (kbItm !== null && (actionId === InternalInterface.MG_ACT_NEXT_RT_WINDOW || actionId === InternalInterface.MG_ACT_PREV_RT_WINDOW) && task.getForm().hasTabControl()) {
      if (actionId === InternalInterface.MG_ACT_PREV_RT_WINDOW)
        actId = InternalInterface.MG_ACT_TAB_PREV;
      else if (actionId === InternalInterface.MG_ACT_NEXT_RT_WINDOW)
        actId = InternalInterface.MG_ACT_TAB_NEXT;
    }
    return actId;
  }

  /// <summary>
  ///   getter for the execStack
  /// </summary>
  /// <returns> the current execution stack</returns>
  getExecStack(): ExecutionStack {
    return <ExecutionStack>this._execStack.peek();
  }

  /// <summary>
  ///   pushes one entry of an operation into the execution stack
  /// </summary>
  /// <param name = "taskId">- the id of the current task</param>
  /// <param name = "handlerId">- the id of the handler which holds the raise event command </param>
  /// <param name = "operIdx">- the idx of the command which created an execution stack entry (raise event of function call)</param>
  pushExecStack(taskId: string, handlerId: string, operIdx: number): void {
    (<ExecutionStack>this._execStack.peek()).push(MGDataCollection.Instance.getTaskIdById(taskId), handlerId, operIdx);
  }

  /// <summary>
  ///   pops one entry from the execution stack - after the completion of an operation which can hold
  ///   other operations
  /// </summary>
  /// <returns> the entry that was popped</returns>
  popExecStack(): ExecutionStackEntry {
    return (<ExecutionStack>this._execStack.peek()).pop();
  }

  /// <summary>
  ///   push a new entry to the stack of server exec stacks - this is to defer operations that should not
  ///   get influences by the current server execution stack - when performing the record prefix of a task
  ///   that was just returned from the server, or when calling a modal task
  /// </summary>
  pushNewExecStacks(): void {
    this._serverExecStack.push(null);
    this._execStack.push(new ExecutionStack());
  }

  /// <summary>
  ///   pops the new entry from the stack of server execution stacks when the sequence that needs to avoid
  ///   current server execution stack has ended
  /// </summary>
  popNewExecStacks(): void {
    this._serverExecStack.pop();
    this._execStack.pop();
  }

  /// <summary>
  ///   pushes an execution stack entry into the server exec stack
  /// </summary>
  /// <param name = "taskId">- the id of the task in the entry</param>
  /// <param name = "handlerId">- handler id of the entry</param>
  /// <param name = "operIdx">- idx of the operation which the entry refers to</param>
  pushServerExecStack(taskId: string, handlerId: string, operIdx: number): void {
    if (this._serverExecStack.peek() === null) {
      this._serverExecStack.pop();
      this._serverExecStack.push(new ExecutionStack());
    }

    (<ExecutionStack>this._serverExecStack.peek()).push(taskId, handlerId, operIdx);
  }

  /// <summary>
  ///   clears the server execution stack after we found the correct next operation that we need to continue from
  /// </summary>
  clearServerExecStack(): void {
    if (this._serverExecStack.peek() !== null) {
      (<ExecutionStack>this._serverExecStack.peek()).clear();
    }
  }

  /// <summary>
  ///   reverse the server execution stack - we get it from the server and push it in the same order
  ///   it is written in the message, which actually means we have to reverse it in order to handle it correctly
  /// </summary>
  reverseServerExecStack(): void {
    if (this._serverExecStack.peek() !== null)
      (<ExecutionStack>this._serverExecStack.peek()).reverse();
  }

  /// <summary>
  ///   calculate according to the server's execution stack and the current execution stack on the client +
  ///   the current operation which we are on, which is the next operation that we need to execute
  ///   in the current handler
  /// </summary>
  /// <param name = "oper">- the operation which we are currently on</param>
  /// <param name = "clearWhenFound">indicates whether we should clear the server stack when we reach its end,
  ///   or if we just using this method to check what the next operation is
  /// </param>
  /// <returns>s the next operation that should be executed by the client
  ///   if it returns -1 then the client should continue as usual
  /// </returns>
  getNextOperIdx(oper: Operation, clearWhenFound: boolean): number {
    let tmpServerExecStackEntry: ExecutionStackEntry = null;
    let nextOperIdx: number = -1;

    // if the server exec stack is empry it means we did not return from the server,
    // so we have to continue with executing the following operation in the current handler as usual
    if (this._serverExecStack.count() !== 0 && this._serverExecStack.peek() !== null && !(<ExecutionStack>this._serverExecStack.peek()).empty()) {
      // if the server's exec stack is deeper than the client's -
      // we need to check the entry in the client's stack which corresponds to the server's stack size
      if ((<ExecutionStack>this._serverExecStack.peek()).size() > (<ExecutionStack>this._execStack.peek()).size()) {
        // we copy the server's execution stack and pop from it until the size of the server
        // and the client is the same
        let tmpServerExecStack: ExecutionStack = new ExecutionStack(<ExecutionStack>this._serverExecStack.peek());
        while (tmpServerExecStack.size() > (<ExecutionStack>this._execStack.peek()).size()) {
          tmpServerExecStackEntry = tmpServerExecStack.pop();
        }

        // if all entries before the last one we popped are the same as in the client and
        // the current entry is on the same handler as the server's last entry,
        // and the operation is after the current operation,
        // then this entry in the server indicates which is our next operation
        if (this._execStack.peek().Equals(tmpServerExecStack) && tmpServerExecStackEntry.TaskId === oper.getTaskTag() && tmpServerExecStackEntry.HandlerId === oper.getHandlerId() && tmpServerExecStackEntry.OperIdx >= oper.getServerId()) {
          nextOperIdx = tmpServerExecStackEntry.OperIdx;

          // if the server exec stack is deeper than the client's by only 1,
          // which means we are checking the top most entry on the server's execution stack,
          // the whole stack is the same now, so we can clear the server's stack -
          // we got to the point which we are on the exact operation which the server left execution.
          if (clearWhenFound && (<ExecutionStack>this._serverExecStack.peek()).size() === (<ExecutionStack>this._execStack.peek()).size() + 1) {
            (<ExecutionStack>this._serverExecStack.peek()).clear();
          }
        }
        else
          nextOperIdx = EventsManager.MAX_OPER;
      }
      else {
        nextOperIdx = EventsManager.MAX_OPER;
      }
    }
    return nextOperIdx;
  }

  /// <returns>
  /// </returns>
  getClientManager(): ClientManager {
    return ClientManager.Instance;
  }

  /// <summary>
  ///   set the processingTopMostEndTask
  /// </summary>
  /// <param name = "inProcessingTopMostEndTask"></param>
  setProcessingTopMostEndTask(inProcessingTopMostEndTask: boolean): void {
    this._processingTopMostEndTask = inProcessingTopMostEndTask;
  }


  /// <summary>
  ///   get the processingTopMostEndTask
  /// </summary>
  getProcessingTopMostEndTask(): boolean {
    return this._processingTopMostEndTask;
  }

  /// <summary>
  ///   set the AllowEvents
  /// </summary>
  /// <param name = "AllowEvents"></param>
  setAllowEvents(AllowEvents: EventsAllowedType): void {
    this._allowEvents = AllowEvents;
  }

  /// <summary>
  ///   set the AllowEvents for a non interactive task.
  /// </summary>
  /// <param name = "AllowEvents"></param>
  setNonInteractiveAllowEvents(AllowEvents: boolean, task: Task): void {
    if (AllowEvents)

      this._allowEvents = EventsAllowedType.NON_INTERACTIVE;
    // QCR #802495, The Forms Controller mechanism is disable if we are in Non interactive task with AllowEvents = true and Open Window = true

    else
      this._allowEvents = EventsAllowedType.NONE;
  }

  /// <summary>
  ///   get the AllowEvents
  /// </summary>
  /// <param name = "withinNonInteractiveLoop"></param>
  getAllowEvents(): EventsAllowedType {
    return this._allowEvents;
  }

  /// <summary>
  ///   Return TRUE if no events are allowed
  /// </summary>
  /// <returns></returns>
  NoEventsAllowed(): boolean {
    return this._allowEvents === EventsAllowedType.NONE;
  }

  /// <summary>
  ///   check and execute control modify event
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "act"></param>
  private handleCtrlModify(ctrl: MgControl, act: number): void {
    // if cannot modify, do nothing
    if (ctrl == null || !ctrl.isModifiable())
      return;

    switch (act) {
      case InternalInterface.MG_ACT_EDT_DELCURCH:
      case InternalInterface.MG_ACT_EDT_DELPRVCH:
      case InternalInterface.MG_ACT_RT_COPYFLD:
      case InternalInterface.MG_ACT_CLIP_PASTE:
      case InternalInterface.MG_ACT_RT_EDT_NULL:
      case InternalInterface.MG_ACT_BEGIN_DROP:
      case InternalInterface.MG_ACT_EDT_UNDO:
      case InternalInterface.MG_ACT_CTRL_MODIFY:
      case InternalInterface.MG_ACT_CHAR:
      case InternalInterface.MG_ACT_ARROW_KEY:
      case InternalInterface.MG_ACT_EDT_BEGNXTLINE:
      case InternalInterface.MG_ACT_SELECTION:
        break;

      default:
        return;
    }

    let rtEvt: RunTimeEvent;
    rtEvt = new RunTimeEvent(ctrl);
    rtEvt.setInternal(InternalInterface.MG_ACT_CTRL_MODIFY);
    this.handleEvent(rtEvt, false);
  }

  /// <summary>
  ///   check if action is allowed according to the AllowedEvents flag
  /// </summary>
  /// <param name = "act"></param>
  private ActAllowed(act: number): boolean {
    let allowed: boolean = true;
    switch (this.getAllowEvents()) {
      case EventsAllowedType.ALL:
        allowed = true;
        break;

      case EventsAllowedType.NONE:
        // allow creline even in allow=no. we have no choice. RC mechanism is different then batch. it uses ACT_CREALINE
        // when in create mode. We will need to change it in the future so that when user raises creline event it will not work. just internally.
        allowed = (act === InternalInterface.MG_ACT_CRELINE);
        break;

      // Only the following actions are allowed when running inside a non interactive loop when allow events = YES.
      case EventsAllowedType.NON_INTERACTIVE:

        switch (act) {
          case InternalInterface.MG_ACT_EXIT_SYSTEM:
          case InternalInterface.MG_ACT_EXIT:
          case InternalInterface.MG_ACT_CLOSE:
          case InternalInterface.MG_ACT_CRELINE:
          case InternalInterface.MG_ACT_ROLLBACK:
            allowed = true;
            break;

          default:
            allowed = false;
            break;
        }
        break;
    }

    return allowed;
  }

  /// <summary>
  ///   This function commits the record and then depending on the success or failure of transaction, it performs other actions.
  /// </summary>
  /// <param name = "task"></param>
  /// <param name = "isReversibleExit"></param>
  private commitRecord(task: Task, isReversibleExit: boolean): void {
    let dv: DataView = <DataView>task.DataView;
    let rec: Record = dv.getCurrRec();

    let forceSuffix: boolean = task.checkProp(PropInterface.PROP_TYPE_FORCE_SUFFIX, false);
    let isSelectionTable: boolean = task.checkProp(PropInterface.PROP_TYPE_SELECTION, false);
    let isNewRec: boolean = rec.isNewRec();
    let savePrevCurrRec: boolean = true;
    let recModified: boolean = rec.Modified;

    if (!dv.recInModifiedTab(rec.getId()))
      rec.clearFlagsHistory();
    task.TaskTransactionManager.checkAndCommit(isReversibleExit, ConstInterface.TRANS_RECORD_PREFIX, task.ConfirmUpdateNo);
    if (task.transactionFailed(ConstInterface.TRANS_RECORD_PREFIX)) {
      // on failure of the transaction reenter the record level by
      // executing "record prefix" for the subforms which executed
      // the suffix successfully
      try {
        task.DataSynced = true;
        this.setStopExecution(false);
        task.handleEventOnSlaveTasks(InternalInterface.MG_ACT_REC_PREFIX);
      }
      finally {
        this.setStopExecution(true);
      }
    }
    else if (task.isAborting())
      this.setStopExecution(true);
    else {
      if (recModified)
        rec.setLateCompute(true);

      // QCR 783071 if after checkAndCommit all if O.K. the
      // return the level back to task level in order to let rec_prfix to be executed.
      // even though the task level should be TASK_LEVEL_TASK
      // the checkAndCommit process could have change it
      if (!this._stopExecution)
        task.setLevel(Constants.TASK_LEVEL_TASK);

      rec.resetUpdated();
      rec.resetModified();

      // QCR #983178: cancel the record only after the transaction
      // handling was completed successfully and the record wasn't
      // modified
      if (!recModified && !forceSuffix && (!isSelectionTable || !task.InSelect)) {
        if (isNewRec) {
          // QCR #428965: save the previous current record BEFORE
          // "cancel edit" so the correct record is saved
          dv.setPrevCurrRec();
          savePrevCurrRec = false;
          rec.setNewRec();
          (<MgForm>task.getForm()).cancelEdit(false, false);
        }
        else if (!rec.getForceSaveOrg())
          dv.cancelEdit(EventsManager.REAL_ONLY, true);
        else
          dv.saveOriginal();
      }
      // QCR #995222: if the record was modified then save the
      // original record again in case a task lavel transaction
      // will fail with retry strategy. Before this fix, if such
      // thing happened on a record which wasn't the first then
      // the "begin table" event raised a record suffix event and
      // caused "cancel edit".
      else
        dv.saveOriginal();
    }

    if (savePrevCurrRec)
      dv.setPrevCurrRec();
  }


  /// <summary>
  ///   Close all child tasks
  /// </summary>
  /// <param name = "task">parent task, whose children will be closed</param>
  /// <param name = "StartUpMgd">if this mgd belongs to a closing prog, ExitByMenu is set to the task.ExitingByMenu</param>
  /// <param name = "ExitByMenu">Indication if the close was initiate by a program activated from menu.</param>
  private CloseAllChildProgs(task: Task, StartUpMgd: MGData, ExitByMenu: boolean): void {
    // NEED TO HANDLE A PROBLEMATIC CASE OF DESTINATION IN PARENT TASK !!!!
    if (task.hasSubTasks()) {
      let childTaskTable: TasksTable = task.getSubTasks();
      // loop on all child task and close them all (unless they are subform or already closing)
      // from MDI menu, it has no subtasks as childs, just progs.
      // if call is from parent activate, then only it will have real subtasks.
      let taskIdx: number = 0;
      if (childTaskTable.getSize() > 0) {
        do
        {
          let childTsk: Task = childTaskTable.getTask(taskIdx);
          if (childTsk != null && !childTsk.isAborting()) {
            if (childTsk.IsSubForm) {
              this.CloseAllChildProgs(childTsk, null, ExitByMenu);
              taskIdx++;
            }
            else {
              // if closing the startup task, we need to send the server an indication not to close all the mdi frame.
              if (StartUpMgd != null && StartUpMgd.getFirstTask() === childTsk)
                childTsk.setExitingByMenu(ExitByMenu);

              // handle exit event on the task now (no by event queue).
              this.handleInternalEventWithTask(childTsk, InternalInterface.MG_ACT_EXIT);

              childTsk.setExitingByMenu(false); // set it back, just in case it will be used again.
              // taskIdx is unchanged. if exit is done then task is deleted from the TaskTable and same
              // idx has a different task now. if error, we are getting out of here anyway.
            }
          }
          else {
            taskIdx++;
            continue;
          }
        } while (taskIdx < childTaskTable.getSize() && !this.GetStopExecutionFlag());
      }
    }
  }

  /// <summary>
  ///   callback for incremental locate timer
  /// </summary>
  incLocateTimerCB(taskObj: any): void {
    let task: Task = <Task>taskObj;
    let rtEvt: RunTimeEvent = new RunTimeEvent(task, true);

    rtEvt.setInternal(InternalInterface.MG_ACT_INCREMENTAL_LOCATE);
    rtEvt.setMainPrgCreator(task);
    rtEvt.setCtrl(<MgControl>task.getLastParkedCtrl());
    this.addToTail(rtEvt);
  }

  /// <summary>
  /// </summary>
  /// <param name = "task"></param>
  /// <returns></returns>
  private static doSyncForSubformParent(task: Task): void {

    let parentTask: Task = task.getParent();
    let parentDv = <DataView>parentTask.DataView;
    let parentRec = <Record>parentDv.getCurrRec();

    // do not touch the parent record if the parent dataview is 'empty dataview'.
    if (task.IsSubForm && parentRec != null && parentRec.Modified && !parentDv.isEmptyDataview()) {
      parentRec.setMode(DataModificationTypes.Update);
      parentDv.addCurrToModified(false);
      (<Record>parentDv.getCurrRec()).Synced = true;
      parentDv.setChanged(true);
      let dataViewExecuteLocalUpdatesCommand: IClientCommand = CommandFactory.CreateDataViewCommand(parentTask.getTaskTag(), DataViewCommandType.ExecuteLocalUpdates);
      let result: ReturnResult = parentTask.DataviewManager.Execute(dataViewExecuteLocalUpdatesCommand);
    }
  }
}
