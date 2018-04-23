import {ApplicationException, Exception, List, NString, RefParam} from "@magic/mscorelib";
import {
  BrkScope,
  Constants,
  InternalInterface,
  Logger,
  Logger_LogLevels,
  StorageAttribute,
  StorageAttributeCheck,
  XMLConstants,
  XmlParser
} from "@magic/utils";
import {ExpVal, Manager} from "@magic/gui";
import {Event} from "./Event";
import {Field} from "../data/Field";
import {OperationTable} from "../rt/OperationTable";
import {Argument} from "../rt/Argument";
import {ArgumentsList} from "../rt/ArgumentsList";
import {ClientManager} from "../ClientManager";
import {MgControl} from "../gui/MgControl";
import {Operation} from "../rt/Operation";
import {MGDataCollection} from "../tasks/MGDataCollection";
import {FlowMonitorQueue} from "../util/FlowMonitorQueue";
import {MGData} from "../tasks/MGData";
import {ServerError} from "../remote/ServerError";
import {RunTimeEvent} from "./RunTimeEvent";
import {MgForm} from "../gui/MgForm";
import {YesNoExp} from "../exp/YesNoExp";
import {Task, Task_Direction, Task_Flow} from "../tasks/Task";
import {DataView} from "../data/DataView";
import {ConstInterface} from "../ConstInterface";
import {FlowMonitorInterface} from "../FlowMonitorInterface";

export class EventHandler {
  private _enabledExp: YesNoExp = new YesNoExp(true); // default is true always
  private _operationTab: OperationTable = null;
  private _propagateExp: YesNoExp = new YesNoExp(true);
  private _isHandlerOnForm: boolean = false;
  private _ctrl: MgControl = null;
  private _ctrlName: string = null;
  private _dvLen: number = 0; // The “dvposEcontains the number of fields selected in the handler
  private _dvPos: number = 0; // and the index of the first field of it in the Dataview.
  private _evt: Event = null;
  private _handledByClient: boolean = false;
  private _handlerFld: Field = null;
  private _hasParameters: boolean = false;
  private _id: number = 0;
  private _level: string = '\0'; // Control | Handler | Record | Task | Variable
  private _scope: BrkScope = null; // Task|Subtask|Global
  private _task: Task = null;
  private _taskMgdID: number = -1;

  /// <summary>
  ///   CTOR
  /// </summary>
  constructor() {
    this._operationTab = new OperationTable();
  }

  /// <summary>
  ///   parse the event handler and its sub-structures
  /// </summary>
  fillData(taskRef: Task): void {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;
    if (this._task === null) {
      this._task = taskRef;
      this._taskMgdID = this._task.getMgdID();
    }

    while (this.initInnerObjects(parser, parser.getNextTag())) {
    }
    let dataView: DataView = <DataView>this._task.DataView;
    this._hasParameters = dataView.ParametersExist(this._dvPos, this._dvLen);
  }

  /// <summary>
  ///   initializing of inner objects
  /// </summary>
  private initInnerObjects(parser: XmlParser, foundTagName: string): boolean {

    if (foundTagName === null)
      return false;

    if (foundTagName === ConstInterface.MG_TAG_HANDLER)
      this.initInnerElements(parser, this._task);

    else if (foundTagName === ConstInterface.MG_TAG_OPER)
      this._operationTab.fillData(this._task, this);

    else if (foundTagName === ConstInterface.MG_TAG_EVENT && this._evt === null) {
      this._evt = new Event();
      this._evt.fillData(parser, this._task);
      if (this._evt.getType() === ConstInterface.EVENT_TYPE_TIMER ||
        (this._evt.getType() === ConstInterface.EVENT_TYPE_USER && this._evt.getUserEventType() === ConstInterface.EVENT_TYPE_TIMER))
        this._task.getMGData().addTimerHandler(this);

      // for enable MG_ACT_ZOOM action
      // 1. handler on zoom action.
      // 2. handler on a user defined handler with a trigger of zoom action.
      if (((this._evt.getType() === ConstInterface.EVENT_TYPE_INTERNAL && this._evt.getInternalCode() === InternalInterface.MG_ACT_ZOOM) || (this._evt.getType() === ConstInterface.EVENT_TYPE_USER && this._evt.getUserEvent() !== null && this._evt.getUserEventType() === ConstInterface.EVENT_TYPE_INTERNAL && this._evt.getUserEvent().getInternalCode() === InternalInterface.MG_ACT_ZOOM)) && !this._task.getEnableZoomHandler()) {

        if (this._handlerFld !== null)
          this._handlerFld.setHasZoomHandler();

        else if (this._ctrl !== null)
          this._ctrl.HasZoomHandler = true;

        else
          this._task.setEnableZoomHandler();
      }
    }
    else if (foundTagName === '/' + ConstInterface.MG_TAG_HANDLER) {
      parser.setCurrIndex2EndOfTag();
      return false;

    }
    else {
      Logger.Instance.WriteExceptionToLogWithMsg("there is no such tag in EventHandler.initInnerObjects() " + foundTagName);
      return false;
    }
    return true;
  }

  /// <summary>
  ///   Initializing of inner attributes of <handler> tag
  /// </summary>
  /// <param name = "taskRef"></param>
  private initInnerElements(parser: XmlParser, taskRef: Task): void {
    let endContext: number = parser.getXMLdata().indexOf( XMLConstants.TAG_CLOSE, parser.getCurrIndex());
    if (endContext !== -1 && endContext < parser.getXMLdata().length) {
      // last position of its tag
      let tag: string = parser.getXMLsubstring(endContext);
      parser.add2CurrIndex(tag.indexOf( ConstInterface.MG_TAG_HANDLER) + ConstInterface.MG_TAG_HANDLER.length);

      let tokensVector: List<string> = XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);
      this.initElements(tokensVector, taskRef);
      parser.setCurrIndex(++endContext); // to delete ">" too
      return;
    }
    Logger.Instance.WriteExceptionToLogWithMsg("in Handler.FillData() out of string bounds");
  }

  /// <summary>
  ///   Make initialization of private elements by found tokens
  /// </summary>
  /// <param name = "tokensVector">found tokens, which consist attribute/value of every found	element </param>
  /// <param name = "taskRef"> </param>
  private initElements(tokensVector: List<string>, taskRef: Task): void {
    for (let j: number = 0; j < tokensVector.length; j += 2) {
      let attribute: string = (tokensVector.get_Item(j));
      let valueStr: string = (tokensVector.get_Item(j + 1));

      switch (attribute) {
        case ConstInterface.MG_ATTR_HANDLEDBY:
          this._handledByClient = (valueStr.toUpperCase() === "C".toUpperCase());
          break;

        case XMLConstants.MG_ATTR_ID:
          this._id = XmlParser.getInt(valueStr);
          break;

        case ConstInterface.MG_ATTR_LEVEL:
          this._level = valueStr[0];
          break;

        case ConstInterface.MG_ATTR_OBJECT:
          let valueStringCtrlName: string = XmlParser.unescape(valueStr);
          this._ctrlName = XmlParser.unescape(valueStringCtrlName).toUpperCase(); // relevant for user handlers only
          this.calculateCtrlFromControlName(taskRef);
          break;

        case ConstInterface.MG_ATTR_VARIABLE:
          this._handlerFld = <Field>this._task.DataView.getField(XmlParser.getInt(valueStr));
          this._handlerFld.setHasChangeEvent();
          break;

        case ConstInterface.MG_ATTR_SCOPE:
          this._scope = <BrkScope>valueStr[0];
          break;

        case ConstInterface.MG_ATTR_PROPAGATE:
          this._propagateExp.setVal(taskRef, valueStr);
          break;

        case ConstInterface.MG_ATTR_ENABLED:
          this._enabledExp.setVal(taskRef, valueStr);
          break;

        case ConstInterface.MG_ATTR_DVPOS:
          let i: number = valueStr.indexOf(",");
          if (i > -1) {
            this._dvLen = XmlParser.getInt(valueStr.substr(0, i));
            this._dvPos = XmlParser.getInt(valueStr.substr(i + 1));
            for (let fldIdx: number = this._dvPos; fldIdx < this._dvPos + this._dvLen; fldIdx++) {
              let field: Field = (<Field>this._task.DataView.getField(fldIdx));
              field.IsEventHandlerField = true;
            }
          }
          break;

        case ConstInterface.MG_ATTR_HANDLER_ONFORM:
          this._isHandlerOnForm = XmlParser.getBoolean(valueStr);
          break;

        default:
          Logger.Instance.WriteExceptionToLogWithMsg("There is no such tag in EventHandler class. Insert case to EventHandler.initElements for " + attribute);
          break;
      }
    }
  }

/// <summary>
  /// calculate the ctrl property from ctrl name property
  /// </summary>
  /// <param name="taskRef"></param>
  /// <param name="valueStringCtrlName"></param>

  calculateCtrlFromControlName(taskRef: Task): void {
    if (!NString.IsNullOrEmpty(this._ctrlName)) {
      this._ctrl = ((taskRef.getForm() !== null) ? (<MgForm>taskRef.getForm()).getCtrlByCtrlName(this._ctrlName) : null);
    }
  }

  /// <summary>
  ///   check if this event handler is a specific handler of an event
  /// </summary>
  /// <param name = "rtEvt">the event to check</param>
  /// <returns> boolean true if the events match</returns>
  isSpecificHandlerOf(rtEvt: RunTimeEvent): boolean {

    if (this._ctrl === null && this._ctrlName === null && this._handlerFld === null && !this._isHandlerOnForm)
      return false;

    // check the validity of the scope
    if (this._scope === BrkScope.Task && this._task !== rtEvt.getTask())
      return false;

    // if the handlers event and the checked event are equal and
    // the handler handles the control attached to the checked event, return true
    // compare control name with the name of the control in the event
    if (this._evt.equals(rtEvt)) {
      // Variable change handlers do not have control names. Only fields need to be compared
      if (this._handlerFld !== null) {
        return (this._handlerFld === rtEvt.getFld());
      }
      if (rtEvt.Control !== null && !this._isHandlerOnForm) {
        let eventCtrlName: string = rtEvt.Control.getControlNameForHandlerSearch();
        if (eventCtrlName !== null && this._ctrlName.toLowerCase() === eventCtrlName.toLowerCase())
          return true;
      }
      else if (rtEvt.Control === null && this._isHandlerOnForm)
        return true;
    }

    return false;
  }

  /// <summary>
  ///   check if this event handler is a non-specific or global handler of an event
  /// </summary>
  /// <param name = "rtEvt">the event to check
  /// </param>
  /// <returns> boolean true if the events match
  /// </returns>
  isNonSpecificHandlerOf(rtEvt: RunTimeEvent): boolean {

    // if the handler handles a control return false
    if (this._ctrl !== null || this._ctrlName !== null || this._handlerFld !== null || this._isHandlerOnForm)
      return false;
    // check the validity of the scope
    if (this._scope === BrkScope.Task &&  this._task !== rtEvt.getTask() && rtEvt.getType() !== ConstInterface.EVENT_TYPE_TIMER)
  return false;

    if (this._scope === BrkScope.Global && this._task !== rtEvt.getTask())
      return false;

    // if the handlers event and the checked event are equal return true
    if (this._evt.getType() === ConstInterface.EVENT_TYPE_USER && this._evt.getUserEventType() === ConstInterface.EVENT_TYPE_NOTINITED) {
      try {
        this._evt.findUserEvent();
      }
      catch (applicationException) {
        if (applicationException instanceof ApplicationException) {
        }
        else
          throw applicationException;
      }
    }
    return this._evt.equals(rtEvt);
  }

  /// <summary>
  ///   check if this event handler is a global handler of an event
  /// </summary>
  /// <param name = "rtEvt">the event to check
  /// </param>
  /// <returns> boolean true if the events match
  /// </returns>
  isGlobalHandlerOf(rtEvt: RunTimeEvent): boolean {
    // check the validity of the scope
    if (this._scope !== BrkScope.Global)
      return false;

    // if the handler handles a control return false
    if (this._ctrl != null || this._ctrlName != null || this._handlerFld != null || this._isHandlerOnForm)
      return false;

    // if the handlers event and the checked event are equal, return true
    return this._evt.equals(rtEvt);
  }

  /// <summary>
  ///   check if this event handler is a specific global handler of an event
  /// </summary>
  /// <param name = "rtEvt">the event to check
  /// </param>
  /// <returns> boolean true if the events match
  /// </returns>
  isGlobalSpecificHandlerOf(rtEvt: RunTimeEvent): boolean {
    // check the validity of the scope
    if (this._scope !== BrkScope.Global)
      return false;

    if (this._ctrl == null && this._ctrlName == null && this._handlerFld == null)
      return false;

    // if the handlers event and the checked event are equal, return true
    return (this._ctrlName != null && this._evt.equals(rtEvt) &&
           NString.Equals(this._ctrlName,  rtEvt.Control.Name, true));
  }

  /// <summary>
  ///   execute the event handler
  /// </summary>
  /// <param name = "rtEvt">the event on which the handler is executed
  /// </param>
  /// <param name = "returnedFromServer">indicates whether we returned from the server and
  ///   therefore might not need to check the enabled condition
  /// </param>
  /// <param name = "enabledCndCheckedAndTrue">indicates that the enabled condition was already checked and there's no
  ///   need to re-check it (because it might be false now, but we still need to
  ///   execute the handler)
  /// </param>
  /// <returns> boolean this is the return code of the handler, if true then the events
  ///   manager must continue searching for the next event handler for the event
  /// </returns>
  execute(rtEvt: RunTimeEvent, returnedFromServer: boolean, enabledCndCheckedAndTrue: boolean): RetVals {
    let ctrl: MgControl = null;
    let retVal: boolean;
    let depth: number = 0;
    let taskEnd: boolean = false;
    let brkLevel: string = this._task.getBrkLevel();
    let brkLevelIndex: number = this._task.getBrkLevelIndex();
    let initialLoopStackSize: number = 0;

    // set level for LEVEL function
    if (taskEnd !== null && this._evt.getType() !== ConstInterface.EVENT_TYPE_EXPRESSION && (this._evt.getType() !== ConstInterface.EVENT_TYPE_USER || (this._evt.getUserEvent().getType() !== ConstInterface.EVENT_TYPE_EXPRESSION && this._evt.getUserEvent().getType() !== ConstInterface.EVENT_TYPE_TIMER))) {
      // Unlike a handler, the user function should not change the level of the task.
      if (this._evt.getType() !== ConstInterface.EVENT_TYPE_USER_FUNC)
        this._task.setBrkLevel(rtEvt.getBrkLevel(), this._id);

    }
    else
      this._task.setBrkLevel(this._evt.getBrkLevel(), this._id);

    let args: ArgumentsList = rtEvt.getArgList();

    try {
      let flowMonitor: FlowMonitorQueue = FlowMonitorQueue.Instance;

      // check if the handler is enabled. if not, return true to continue searching
      // for the next event handler
      let nextOperIdx: number = -1;
      if (returnedFromServer) {
        // if we returned from the server - we need to check if the next operation is on the current
        // handler (using a call to getNextOperIdx() with false in the clearWhenFound parameter)
        // and if it is - do not check the enabled condition, because it might have changed
        // since it was evaluated on the server. we need to go into this handler even if it is not
        // currently enabled
        nextOperIdx = ClientManager.Instance.EventsManager.getNextOperIdx(this._operationTab.getOperation(0), false);
      }
      if (nextOperIdx === -1 && !enabledCndCheckedAndTrue && !this.isEnabled())
        return new RetVals(true, false);

      // check the scope for Expression and Timer handlers
      if (this._scope === BrkScope.Task && (rtEvt.getType() === ConstInterface.EVENT_TYPE_TIMER || rtEvt.getType() === ConstInterface.EVENT_TYPE_EXPRESSION)) {
        let currTask: Task = ClientManager.Instance.getLastFocusedTask();
        if (this._task !== currTask)
          return new RetVals(true, true);
      }

      if (!this._handledByClient) {
        // return false to stop searching for the more handlers because
        // the server had taken care of all of them
        return new RetVals(false, true);
      }

      if (rtEvt.getType() !== ConstInterface.EVENT_TYPE_USER && !this._evt.dataEventIsTrue())
        return new RetVals(false, true);

      if (rtEvt.getType() === ConstInterface.EVENT_TYPE_INTERNAL && rtEvt.getInternalCode() === InternalInterface.MG_ACT_TASK_SUFFIX)
        taskEnd = true;

      if (rtEvt.getType() === ConstInterface.EVENT_TYPE_INTERNAL) {
        switch (rtEvt.getInternalCode()) {
          case InternalInterface.MG_ACT_REC_PREFIX:
            flowMonitor.addTaskFlowRec(InternalInterface.MG_ACT_REC_PREFIX, FlowMonitorInterface.FLWMTR_START);
            break;
          case InternalInterface.MG_ACT_REC_SUFFIX:
            flowMonitor.addTaskFlowRec(InternalInterface.MG_ACT_REC_SUFFIX, FlowMonitorInterface.FLWMTR_START);
            break;

          case InternalInterface.MG_ACT_CTRL_SUFFIX:
            flowMonitor.addTaskFlowCtrl(InternalInterface.MG_ACT_CTRL_SUFFIX, rtEvt.Control.Name,
                                        FlowMonitorInterface.FLWMTR_START);
            break;

          case InternalInterface.MG_ACT_CTRL_PREFIX:
            flowMonitor.addTaskFlowCtrl(InternalInterface.MG_ACT_CTRL_PREFIX, rtEvt.Control.Name,
                                        FlowMonitorInterface.FLWMTR_START);
            break;

          case InternalInterface.MG_ACT_VARIABLE:
            flowMonitor.addTaskFlowFld(InternalInterface.MG_ACT_VARIABLE, rtEvt.getFld().getName(),
                                       FlowMonitorInterface.FLWMTR_START);
            break;

          case InternalInterface.MG_ACT_CTRL_VERIFICATION:
            flowMonitor.addTaskFlowCtrl(InternalInterface.MG_ACT_CTRL_VERIFICATION,
                                        rtEvt.Control.Name, FlowMonitorInterface.FLWMTR_START);
            break;

          case InternalInterface.MG_ACT_TASK_PREFIX:
            flowMonitor.addTaskFlowRec(InternalInterface.MG_ACT_TASK_PREFIX, FlowMonitorInterface.FLWMTR_START);
            break;

          case InternalInterface.MG_ACT_TASK_SUFFIX:
            flowMonitor.addTaskFlowRec(InternalInterface.MG_ACT_TASK_SUFFIX, FlowMonitorInterface.FLWMTR_START);
            break;

          default:
            flowMonitor.addTaskFlowHandler(this._evt.getBrkLevel(true), FlowMonitorInterface.FLWMTR_START);
            break;
        }
      }
      else
        flowMonitor.addTaskFlowHandler(this._evt.getBrkLevel(true), FlowMonitorInterface.FLWMTR_START);

      try {
        let oldFlowDirection: Task_Direction = this._task.getDirection();

        if (taskEnd !== null)
          ctrl = rtEvt.Control;

        let mgdID: number = MGDataCollection.Instance.currMgdID;
        let isChangedCurrWnd: boolean = false;
        let isChangedCurrWndRef: RefParam<boolean> = new RefParam(isChangedCurrWnd);


        // for timer events check if the task of the event is in the
        // current window and if not then change the current window
        // temporarily till the handler finishes
        if (this._evt.getType() === ConstInterface.EVENT_TYPE_TIMER && mgdID !== rtEvt.getMgdID()) {
          // set number of window for timer event
          MGDataCollection.Instance.currMgdID = rtEvt.getMgdID();
          isChangedCurrWndRef.value = true;
        }

        // put initial values to the local variables
        this.resetLocalVariables(args);

        initialLoopStackSize = this._task.getLoopStackSize();
        let retVals: RetVals = null;
        if (this._operationTab.getSize() > 0)
          retVals = this.executeOperations(0, this._operationTab.getSize() - 1, taskEnd, mgdID, depth, isChangedCurrWndRef, false, false, -1);

        isChangedCurrWnd = isChangedCurrWndRef.value;

        // re-initialise revert mode after completing execution of a handler's operations
        this._task.setRevertFrom(-1);
        this._task.setRevertDirection(Task_Direction.FORE);

        // restore direction if changed due to verify revert
        this._task.setDirection(Task_Direction.NONE);
        this._task.setDirection(oldFlowDirection);

        if (retVals !== null)
          return retVals;

        // check the endtask condition once again at the end of the handler
        if (!taskEnd)
          this._task.evalEndCond(ConstInterface.END_COND_EVAL_IMMIDIATE);

        // change current window back if it was changed for Timer
        if (isChangedCurrWnd) {
          let oldMgd: MGData = MGDataCollection.Instance.getMGData(mgdID);
          if (oldMgd !== null && !oldMgd.IsAborting)
            MGDataCollection.Instance.currMgdID = mgdID;
        }
      }
      // end while operation block
      catch (ex) {
        if (ex instanceof ServerError) {
          if (Logger.Instance.LogLevel !== Logger_LogLevels.Basic)
            Logger.Instance.WriteExceptionToLog(ex);
        }
        else if (ex instanceof Exception) {
          Logger.Instance.WriteExceptionToLog(ex);
          return new RetVals(false, true);
        }
        else
          throw ex;
      }

      finally {
        // get the propagate value
        retVal = this._propagateExp.getVal();

        // remove loop counters that were left unused in the stack due to leaving
        // the handler on "stopExecution() == true"
        let currLoopStackSize: number = this._task.getLoopStackSize();
        for (; currLoopStackSize > initialLoopStackSize; currLoopStackSize = currLoopStackSize--)
          this._task.popLoopCounter();
      }

      // after executing the operations update the arguments back and recompute
      if (args !== null)
        this.getArgValsFromFlds(args);

      if (rtEvt.getType() === ConstInterface.EVENT_TYPE_INTERNAL) {
        switch (rtEvt.getInternalCode()) {
          case InternalInterface.MG_ACT_REC_PREFIX:
            flowMonitor.addTaskFlowRec(InternalInterface.MG_ACT_REC_PREFIX, FlowMonitorInterface.FLWMTR_END);
            break;

          case InternalInterface.MG_ACT_REC_SUFFIX:
            flowMonitor.addTaskFlowRec(InternalInterface.MG_ACT_REC_SUFFIX, FlowMonitorInterface.FLWMTR_END);
            break;

          case InternalInterface.MG_ACT_TASK_PREFIX:
            flowMonitor.addTaskFlowRec(InternalInterface.MG_ACT_TASK_PREFIX, FlowMonitorInterface.FLWMTR_END);
            break;

          case InternalInterface.MG_ACT_TASK_SUFFIX:
            flowMonitor.addTaskFlowRec(InternalInterface.MG_ACT_TASK_SUFFIX, FlowMonitorInterface.FLWMTR_END);
            break;

          case InternalInterface.MG_ACT_CTRL_SUFFIX:
            flowMonitor.addTaskFlowCtrl(InternalInterface.MG_ACT_CTRL_SUFFIX, ctrl.Name, FlowMonitorInterface.FLWMTR_END);
            break;

          case InternalInterface.MG_ACT_CTRL_PREFIX:
            flowMonitor.addTaskFlowCtrl(InternalInterface.MG_ACT_CTRL_PREFIX, ctrl.Name, FlowMonitorInterface.FLWMTR_END);
            break;

          case InternalInterface.MG_ACT_VARIABLE:
            flowMonitor.addTaskFlowFld(InternalInterface.MG_ACT_VARIABLE, rtEvt.getFld().getName(), FlowMonitorInterface.FLWMTR_END);
            break;

          case InternalInterface.MG_ACT_CTRL_VERIFICATION:
            flowMonitor.addTaskFlowCtrl(InternalInterface.MG_ACT_CTRL_VERIFICATION, ctrl.Name, FlowMonitorInterface.FLWMTR_END);
            break;

          default:
            flowMonitor.addTaskFlowHandler(this._evt.getBrkLevel(true), FlowMonitorInterface.FLWMTR_END);
            break;
        }
      }
      else
        flowMonitor.addTaskFlowHandler(this._evt.getBrkLevel(true), 1);
    }
    finally {
      // restoring  the original break level state and current executing control index
      this._task.setBrkLevel(brkLevel, brkLevelIndex);
    }
    return new RetVals(retVal, true);
  }

  /// <summary>
  ///   execute the operations starting from fromIdx and ending at endIdx.
  /// </summary>
  private executeOperations(fromIdx: number, toIdx: number, taskEnd: boolean, mgdID: number, depth: number,
                            isChangedCurrWndRef: RefParam<boolean>, inBlockIf: boolean, inReturnedFromServer: boolean,
                            inNextOperIdx: number): RetVals {
    let oper: Operation;
    let operType: number;
    let nextOperIdx: number = -1;
    let returnedFromServer: boolean = false;
    let mgd: MGData = this._task.getMGData();
    let execFlowIdx: number = (this._task.getRevertDirection() === Task_Direction.BACK) ? toIdx : fromIdx; // index of the operation to execute
    let retvals: RetVals;
    let blockIfReturnedFromServer: boolean = false;
    let executeBlock: boolean;
    let blockLoopExeconServer: boolean;
    let flowMonitor: FlowMonitorQueue = FlowMonitorQueue.Instance;

    if (!inReturnedFromServer) {
      // we need to check if the server already started running this handler
      oper = this._operationTab.getOperation(execFlowIdx);
      nextOperIdx = ClientManager.Instance.EventsManager.getNextOperIdx(oper, true);
      if (nextOperIdx > -1) {
        returnedFromServer = true;
        if (inBlockIf)
          blockIfReturnedFromServer = true;
      }
      else returnedFromServer = false;
    }
    else {
      returnedFromServer = inReturnedFromServer;
      nextOperIdx = inNextOperIdx;
    }

    for (; (this._task.getRevertDirection() === Task_Direction.BACK ? execFlowIdx >= fromIdx : execFlowIdx <= toIdx) && (!ClientManager.Instance.EventsManager.GetStopExecutionFlag() || this._task.getRevertFrom() > -1) && !mgd.IsAborting; execFlowIdx += (this._task.getRevertDirection() === Task_Direction.BACK ? -1 : 1)) {
      if (inBlockIf && blockIfReturnedFromServer && this._operationTab.getOperation(toIdx).getServerId() < nextOperIdx)
        break;

      oper = this._operationTab.getOperation(execFlowIdx);

      operType = oper.getType();

      blockIfReturnedFromServer = false;

      // skip to the correct operation after returning from the server
      if (returnedFromServer && oper.getServerId() < nextOperIdx)
        if (operType !== ConstInterface.MG_OPER_BLOCK)
          continue;
        else if (this._operationTab.getOperation(oper.getBlockEnd()).getServerId() < nextOperIdx)
          continue;

      if (!taskEnd)
        this._task.evalEndCond(ConstInterface.END_COND_EVAL_IMMIDIATE);

      if (this._taskMgdID !== mgdID)
        isChangedCurrWndRef.value = true;

      if (!this._task.isMainProg() && this._task.isOpenWin())
        MGDataCollection.Instance.currMgdID = this._taskMgdID;

      switch (operType) {
        case ConstInterface.MG_OPER_VERIFY:
          // if true returned then the verify condition was true and the mode is Error
          if (oper.execute(returnedFromServer)) {
            if (!(this._task.getBrkLevel() === "TS")) {
              ClientManager.Instance.EventsManager.setStopExecution(true);
              let currCtrl: MgControl = (this._ctrl !== null ? this._ctrl : ClientManager.Instance.EventsManager.getCurrCtrl());
              // after verify error, we select the text of the ctrl we were on.
              if (currCtrl !== null)
                Manager.SetSelection(currCtrl, 0, -1, -1);
            }

            if (this._task.getInRecordSuffix() && this._task.getLevel() === Constants.TASK_LEVEL_TASK)
              this._task.setLevel(Constants.TASK_LEVEL_RECORD);
            // QCR #995108 - verify error in RS shouldn't trigger RP
            /*
             * if we are in the revert mode, dont stop immediately.
             * execute the operations of the handler in the reverse order and then stop.
             */
            if (this._task.getRevertFrom() === -1)
              return new RetVals(false, true);
          }
          break;

        case ConstInterface.MG_OPER_LOOP:
          // on getting a BlockLoop, execute the loop for the number of times intended,
          // and then move to BlockEnd.
          this._task.enterLoop();
          this._task.increaseLoopCounter();
          this._task.setUseLoopStack(true);

          flowMonitor.addFlowFieldOperation(oper, Task_Flow.NONE, Task_Direction.NONE, true);

          blockLoopExeconServer = false;
          if (!oper.getExecOnServer()) {
            // execute the loop for the number of times intended
            while (oper.execute(false)) {
              // call executeOperations() to execute the operations within a BlockLoop
              retvals = this.executeOperations(execFlowIdx + 1, oper.getBlockClose() - 1, taskEnd, mgdID, depth + 1,
                                               isChangedCurrWndRef, false, false, -1);
              if (retvals !== null)
                return retvals;

              // if we get a revert inside a loop, break the loop
              if ((this._task.getRevertFrom() > -1 && this._task.getRevertFrom() >= execFlowIdx + 1 && this._task.getRevertFrom() <= oper.getBlockEnd() - 1) || (mgd.IsAborting || ClientManager.Instance.EventsManager.GetStopExecutionFlag() && this._task.getRevertFrom() === -1))
                break;

              this._task.increaseLoopCounter();
              this._task.setUseLoopStack(true);
            }
          }
          else {
            if (oper.execute(false))
              blockLoopExeconServer = true;
          }
          if (this._task.getRevertDirection() === Task_Direction.FORE && !blockLoopExeconServer)
          /*
           * Once we finish executing the loop,
           * if we are moving in the forward direction, move to BlockEnd.
           */
            execFlowIdx = oper.getBlockEnd() - 1;
          this._task.leaveLoop();
          break;

        case ConstInterface.MG_OPER_BLOCK:
          // on getting a Block IF, execute the executable block (if or else)
          // and then move to BlockEnd.
          let startBlockIdx: number = execFlowIdx;
          if (!oper.getExecOnServer() || (returnedFromServer && oper.getServerId() < nextOperIdx)) {
            this._task.setUseLoopStack(true);
            if (!returnedFromServer || oper.getServerId() >= nextOperIdx)
            // get the executable block between Block IF and Block END
              execFlowIdx = this.getSignificantBlock(execFlowIdx, oper.getBlockEnd());
            else
              execFlowIdx = this.getStartBlockIfIdxByOper(execFlowIdx, nextOperIdx);
          }
          else {
            this._task.setUseLoopStack(depth > 0);
            oper.operServer(null);
            nextOperIdx = ClientManager.Instance.EventsManager.getNextOperIdx(oper, true);
            if (nextOperIdx > -1) {
              returnedFromServer = true;
              if (inBlockIf)
                blockIfReturnedFromServer = true;

              if (nextOperIdx < this._operationTab.getOperation(oper.getBlockEnd()).getServerId()) {
                // find the significant block in which the next operation is
                while (this._operationTab.getOperation(oper.getBlockClose()).getServerId() < nextOperIdx) {
                  execFlowIdx = oper.getBlockClose();
                  oper = this._operationTab.getOperation(execFlowIdx);
                }
              }
            }
            else {
              returnedFromServer = false;
              execFlowIdx = -1;
            }
          }
          if (execFlowIdx !== -1) {
            executeBlock = true;
            oper = this._operationTab.getOperation(execFlowIdx);

            if (returnedFromServer) {
              if (this._operationTab.getOperation(oper.getBlockClose()).getServerId() <= nextOperIdx) {
                executeBlock = false;
                blockIfReturnedFromServer = true;
              }
            }

            if (executeBlock) {
              // call executeOperations() to execute the operations in the executable block
              retvals = this.executeOperations(execFlowIdx + 1, oper.getBlockClose() - 1, taskEnd, mgdID, depth + 1,
                                               isChangedCurrWndRef, true, returnedFromServer, nextOperIdx);
              if (retvals !== null)
                if (!retvals.ReturnedFromServer)
                  return retvals;
                else {
                  returnedFromServer = retvals.ReturnedFromServer;
                  nextOperIdx = retvals.NextOperIdx;
                  blockIfReturnedFromServer = retvals.BlockIfReturnedFromServer;
                  if (this._task.getRevertDirection() === Task_Direction.BACK)
                    execFlowIdx = startBlockIdx;
                  else execFlowIdx = oper.getBlockEnd() - 1;
                  continue;
                }
            }
          }

          /*
           * Once we finish executing the block,
           * if we are moving in the forward direction, move to BlockEnd.
           * otherwise, move to Block IF
           */
          if (this._task.getRevertDirection() === Task_Direction.BACK)
            execFlowIdx = startBlockIdx;
          else
            execFlowIdx = oper.getBlockEnd() - 1;
          break;

        case ConstInterface.MG_OPER_ENDBLOCK:
          if (this._task.getRevertDirection() === Task_Direction.BACK)
            execFlowIdx = this.getStartBlockIdxByEnd(execFlowIdx) + 1;
          else
            flowMonitor.addFlowFieldOperation(oper, Task_Flow.NONE, Task_Direction.NONE, true);
          break;

        default:
          // the rest of the operations (those that do not affect the flow)
          this._task.setUseLoopStack(depth > 0);
          oper.execute(returnedFromServer);
          break;
      }

      // if the server have executed a block of operations then get the next
      // operation index
      if (!blockIfReturnedFromServer) {
        nextOperIdx = ClientManager.Instance.EventsManager.getNextOperIdx(oper, true);
        if (nextOperIdx > -1) {
          returnedFromServer = true;
          if (inBlockIf)
            blockIfReturnedFromServer = true;
        }
        else returnedFromServer = false;
      }
    }
    if (blockIfReturnedFromServer)
      retvals = new RetVals(nextOperIdx, returnedFromServer, blockIfReturnedFromServer);
    else
      retvals = null;
    return retvals;
  }

  /// <summary>
  ///   get the executable Block (IF or ELSE)
  /// </summary>
  /// <param name = "startBlockIdx">the index of the Block IF</param>
  /// <param name = "endIdx">the Block End Index of the Block IF</param>
  /// <returns>The index of the block (IF or ELSE or next ELSE ...)that can be executed.
  ///   If no blocks can be executed, return -1
  /// </returns>
  private getSignificantBlock(startBlockIdx: number, endIdx: number): number {
    let retIdx: number = -1;

    while (startBlockIdx < endIdx) {
      let oper: Operation = this._operationTab.getOperation(startBlockIdx);
      let operType: number = oper.getType();

      if (operType !== ConstInterface.MG_OPER_BLOCK && operType !== ConstInterface.MG_OPER_ELSE && operType !== ConstInterface.MG_OPER_SERVER)
        break;

      if (oper.execute(false)) {
        retIdx = startBlockIdx;
        break;
      }
      else
        startBlockIdx = oper.getBlockClose();
    }
    return retIdx;
  }

  /// <summary>
  ///   get the idx of the Block IF
  /// </summary>
  /// <param name = "endIdx">--- the index of the Block End
  /// </param>
  /// <returns> --- The index of the block IF whose BlockEnd Idx matches with the endIdx
  /// </returns>
  private getStartBlockIdxByEnd(endIdx: number): number {
    let retIdx: number = -1;
    let found: boolean = false;
    let j: number;
    for (j = endIdx - 1; j >= 0 && !found; j--) {
      let oper: Operation = this._operationTab.getOperation(j);
      let operType: number = oper.getType();

      if (operType === ConstInterface.MG_OPER_BLOCK || operType === ConstInterface.MG_OPER_LOOP) {
        if (oper.getBlockEnd() === endIdx) {
          retIdx = j;
          found = true;
        }
      }
    }
    return retIdx;
  }


  /// <summary>
  ///   get the idx of the Block IF
  /// </summary>
  /// <param name = "elseIdx">--- the index of the Block Else
  /// </param>
  /// <returns> --- The index of the block IF whose BlockEnd Idx matches with the endIdx
  /// </returns>
  private getStartBlockIdxByElse(elseIdx: number): number {
    let retIdx: number = -1;
    let found: boolean = false;
    let elseBlockEnd: number = this._operationTab.getOperation(elseIdx).getBlockEnd();
    let j: number;
    for (j = elseIdx - 1; j >= 0 && !found; j--) {
      let oper: Operation = this._operationTab.getOperation(j);
      let operType: number = oper.getType();

      if (operType === ConstInterface.MG_OPER_BLOCK) {
        if (oper.getBlockEnd() === elseBlockEnd) {
          retIdx = j;
          found = true;
        }
      }
    }
    return retIdx;
  }

  /// <summary>
  ///   get the index of the Block IF or Else according to the index of one of the of operations in it
  /// </summary>
  /// <param name = "blockOperIdx">--- index of the if block for which we have to find the appropriate block to execute
  /// </param>
  /// <param name = "srvrOperIdx">--- the server id of the next operation which the client should execute
  /// </param>
  /// <returns> --- The index of the block IF or Else which hold the operation which operIdx is its index
  /// </returns>
  private getStartBlockIfIdxByOper(blockOperIdx: number, srvrOperIdx: number): number {
    let retIdx: number = -1;
    let found: boolean = false;
    let j: number = this._operationTab.serverId2operIdx(srvrOperIdx, blockOperIdx) - 1;

    if (j === -2) {
      j = this._operationTab.serverId2FollowingOperIdx(srvrOperIdx, blockOperIdx) - 1;
    }

    while (j >= 0 && !found) {
      let oper: Operation = this._operationTab.getOperation(j);
      let operType: number = oper.getType();
      if (operType === ConstInterface.MG_OPER_BLOCK) {
        if (j === blockOperIdx) {
          retIdx = j;
          found = true;
        }
        else
          j--;
      }
      else if (operType === ConstInterface.MG_OPER_ELSE) {
        let blockStrt: number = this.getStartBlockIdxByElse(j);
        if (blockStrt === blockOperIdx) {
          retIdx = j;
          found = true;
        }
        else
          j = blockStrt - 1;
      }
      else if (operType === ConstInterface.MG_OPER_ENDBLOCK)
        j = this.getStartBlockIdxByEnd(j) - 1;
      else
        j--;
    }
    return retIdx;
  }


  /// <summary>
  ///   get the level
  /// </summary>
  getLevel(): string {
    return this._level;
  }

  /// <summary>
  ///   return the event of this handler
  /// </summary>
  getEvent(): Event {
    return this._evt;
  }

  /// <summary>
  ///   get the Id of the event handler
  /// </summary>
  getId(): number {
    return this._id;
  }

  /// <summary>
  ///   get the control of the event handler
  /// </summary>
  getStaticCtrl(): MgControl {
    return this._ctrl;
  }

  getRunTimeCtrl(): MgControl {
    return ClientManager.Instance.EventsManager.getLastRtEvent().Control;
  }

  /// <summary>
  ///   returns true if the handler is enabled
  /// </summary>
  isEnabled(): boolean {
    return this._enabledExp.getVal();
  }

  /// <summary>
  ///   reset the values of the local variables using the argument values or the default
  ///   values or the init expression
  /// </summary>
  /// <param name = "args">the arguments list </param>
  private resetLocalVariables(args: ArgumentsList): void {
    let dv: DataView = <DataView>this._task.DataView;
    let argIdx: number = 0;

    try {
      for (let fieldIdx: number = this._dvPos; fieldIdx < this._dvPos + this._dvLen; fieldIdx++) {
        let aField: Field = <Field>dv.getField(fieldIdx);
        let varIsParm: boolean = !this._hasParameters || aField.isParam();

        // check if the field should get its value from an argument
        if ((args !== null && argIdx < args.getSize()) && varIsParm) {
          if (!args.getArg(argIdx).skipArg()) {
            args.getArg(argIdx).setValueToField(aField);
          }
          else {
            aField.invalidate(true, Field.CLEAR_FLAGS);
            aField.compute(false);
          }
          argIdx++;
        }
        else {
          aField.invalidate(true, Field.CLEAR_FLAGS);
          aField.compute(false);
        }
        aField.updateDisplay();
      }
    }
    catch (exception) {
      throw exception;
    }
  }

  /// <summary>
  ///   return the result values to the field arguments
  /// </summary>
  /// <param name = "args">the arguments list </param>
  private getArgValsFromFlds(args: ArgumentsList): void {
    let dv: DataView = <DataView>this._task.DataView;
    let k: number = 0;
    let j: number;

    for (j = this._dvPos; j < this._dvPos + this._dvLen && k < args.getSize(); j++) {
      let aField: Field = <Field>dv.getField(j);
      if (!this._hasParameters || aField.isParam()) {
        let arg: Argument = args.getArg(k);
        if (arg.getType() === ConstInterface.ARG_TYPE_FIELD) {
          // update the field value from the the Param
          let argFld: Field = arg.getField();

          // A handler can be called either from the same task (of the handler) or from a
          // task lower down in the hierarchy.
          // Here we are copying value from the handler task to the invoker task.
          // Copying should not be done if any one of the task is aborting.
          // But checking only the invoker task's isAborting is sufficient here because,
          // it will be true even if the handler task is aborting.
          if (argFld.getTask() !== null && !(<Task>argFld.getTask()).isAborting()) {
            let val: string = aField.getValue(false);
            argFld.setValueAndStartRecompute(val, aField.isNull(), true, aField.isModified(), false);
            argFld.updateDisplay();
          }
        }
        k++;
      }
    }
  }

  /// <summary>
  ///   returns the handler's task
  /// </summary>
  getTask(): Task {
    return this._task;
  }

  /// <summary>
  ///   returns the number of parameters expected by the handler
  /// </summary>
  argsMatch(Exp_params: ExpVal[]): boolean {
    let argsMatched: boolean = true;
    let dv: DataView = <DataView>this._task.DataView;
    let j: number = 0;
    let paramCount: number = 0;

    for (let i: number = this._dvPos; i < this._dvPos + this._dvLen; i++) {
      let field: Field = <Field>dv.getField(i);
      if (field.isParam()) {
        paramCount++;
        if (j < Exp_params.length) {
          let fieldAttr: StorageAttribute = field.getType();
          let argAttr: StorageAttribute = Exp_params[j].Attr;


          // argument and parameter will not match if :
          // 1. They are not of the same type
          // 2. They Cannot be cast (alpha can be cast to unicode)
          // 3. All those apply if the parameter is not null. if the param val is null it can go into any type of parameter.
          if (!Exp_params[j].IsNull && !StorageAttributeCheck.isTheSameType(fieldAttr, argAttr) && !StorageAttributeCheck.StorageFldAlphaUnicodeOrBlob(fieldAttr, argAttr)) {
            argsMatched = false;
            break;
          }
          j++;
        }
      }
    }

    if (paramCount !== Exp_params.length) {
      argsMatched = false;
    }
    return argsMatched;
  }

  /// <summary>
  ///   returns the OperationTable
  /// </summary>
  getOperationTab(): OperationTable {
    return this._operationTab;
  }


  /// <summary>
  ///   check is task scope is appropriate
  /// </summary>
  /// <param name = "isSameTask"></param>
  /// <returns></returns>
  checkTaskScope(isSameTask: boolean): boolean {
    if (this._scope === BrkScope.Task && !isSameTask)
      return false;
    return true;
  }

  toString(): string {
    return NString.Format("(Hanlder for {0} on task {1}, scope {2})", this._evt, this._task, this._scope);
  }
}

/// <summary>
///   used to return the results of the execute() method
/// </summary>
export class RetVals  {
  BlockIfReturnedFromServer: boolean = false;
  Enabled: boolean = false;
  NextOperIdx: number = 0;
  Propagate: boolean = false;
  ReturnedFromServer: boolean = false;

  constructor(p: boolean, e: boolean);
  constructor(operIdx: number, inReturnedFromServer: boolean, inBlockIfReturnedFromServer: boolean);
  constructor(pOrOperIdx: any, eOrInReturnedFromServer: boolean, inBlockIfReturnedFromServer?: boolean) {
    if (arguments.length === 2)
      this.constructor_0(pOrOperIdx, eOrInReturnedFromServer);
    else
      this.constructor_1(pOrOperIdx, eOrInReturnedFromServer, inBlockIfReturnedFromServer);
  }


  /// <param name = "p">propagate </param>
  /// <param name = "e">enabled </param>
  private constructor_0(p: boolean, e: boolean): void {
    this.Propagate = p;
    this.Enabled = e;
    this.NextOperIdx = 0;
    this.ReturnedFromServer = false;
    this.BlockIfReturnedFromServer = false;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="operIdx"></param>
  /// <param name="inReturnedFromServer"></param>
  /// <param name="inBlockIfReturnedFromServer"></param>
  private constructor_1(operIdx: number, inReturnedFromServer: boolean, inBlockIfReturnedFromServer: boolean): void {
    this.Propagate = false;
    this.Enabled = true;
    this.NextOperIdx = operIdx;
    this.ReturnedFromServer = inReturnedFromServer;
    this.BlockIfReturnedFromServer = inBlockIfReturnedFromServer;
  }
}

