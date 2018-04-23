import {IFlowMonitorQueue} from "@magic/gui";
import {DateTime, List, NString, StringBuilder,} from "@magic/mscorelib";
import {Constants, DateTimeUtils, InternalInterface, Logger, Queue, XMLConstants, XmlParser} from "@magic/utils";
import {ClientManager} from "../ClientManager";
import {Operation} from "../rt/Operation";
import {Task_Direction, Task_Flow} from "../tasks/Task";
import {FlowMonitorInterface} from "../FlowMonitorInterface";
import {ConstInterface} from "../ConstInterface";

// @dynamic
export class FlowMonitorQueue implements IFlowMonitorQueue {
  private static _instance: FlowMonitorQueue = null;
  private static S_EVENT_STR1: string = ">>Starts ";
  private static S_EVENT_STR2: string = " Event";
  private static S_EVENT_PROPAGATED: string = "Event was propagated";
  private static E_EVENT_STR: string = "<<Ends Event";
  private static TSK_CHNG_MODE: string = "Task Mode Change - ";
  private static S_RECPRF_STR: string = "Starts Record Prefix";
  private static E_RECPRF_STR: string = "Ends Record Prefix";
  private static S_RECSUF_STR: string = "Starts Record Suffix";
  private static E_RECSUF_STR: string = "Ends Record Suffix";
  private static S_TASKSUF_STR: string = "Starts Task Suffix";
  private static E_TASKSUF_STR: string = "Ends Task Suffix";
  private static S_TASKPRF_STR: string = "Starts Task Prefix";
  private static E_TASKPRF_STR: string = "Ends Task Prefix";
  private static S_CTRLPRF_STR: string = "Starts Control Prefix - ";
  private static E_CTRLPRF_STR: string = "Ends Control Prefix - ";
  private static S_CTRLSUF_STR: string = "Starts Control Suffix - ";
  private static E_CTRLSUF_STR: string = "Ends Control Suffix - ";
  private static S_HANDLER_STR: string = "Starts handling event {0}";
  private static E_HANDLER_STR: string = "Ends handling event {0}";
  private static S_CTRLVER_STR: string = "Starts Control Verification for Control - ";
  private static E_CTRLVER_STR: string = "Ends Control Verification for Control - ";
  private static RECOMP_STR: string = "Recomputes - ";
  private static S_VARIABLE_STR: string = "Starts Variable Change - ";
  private static E_VARIABLE_STR: string = "Ends Variable Change - ";
  private static VARIABLE_REASON_STR: string = " - Reason - Previous value";
  private static INFORM_STR: string = " >> INFORMATION >> ";
  private static FLW_STEP_FWD: string = "(Step Forward)";
  private static FLW_FAST_FWD: string = "(Fast Forward)";
  private static FLW_STEP_BWD: string = "(Step Backward)";
  private static FLW_FAST_BWD: string = "(Fast Backward)";
  private static FLW_NOT_EXEC: string = "[Not Executed]";
  private static FLW_PERFIX: string = "Flow - ";
  private static S_UPDATE_STR: string = "Starts Update";
  private static E_UPDATE_STR: string = "Ends Update";
  private static ACT_TASK: string = 'T';
  private static ACT_TASK_FLW: string = 'F';
  private static ACT_RECOMPUTE: string = 'R';
  private static ACT_FLW_OPER: string = 'T';

  static LongTimePattern = "HH:mm:ss:SSS";
  private _queue: Queue<ActivityItem> = new Queue<ActivityItem>();
  private _enabled: boolean = false;
  private _isFlowOperation: boolean = false;
  private _isRecompute: boolean = false;
  private _isTask: boolean = false;
  private _isTaskFlow: boolean = false;
  ShouldSerialize: boolean = false;

  static get Instance(): FlowMonitorQueue {
    if (FlowMonitorQueue._instance === null)
      FlowMonitorQueue._instance = new FlowMonitorQueue();

    return FlowMonitorQueue._instance;
  }

  addTaskCngMode(contextID: number, newTaskMode: string): void {
    let info: string = "Task Mode Change - ";
    if (this._enabled && this._isTask) {
      let activityItem: ActivityItem = new ActivityItem(this, FlowMonitorQueue.ACT_TASK, FlowMonitorInterface.FLWMTR_CHNG_MODE);

      switch (newTaskMode) {
        case Constants.TASK_MODE_MODIFY:
          info += "Modify";
          break;


        case Constants.TASK_MODE_CREATE:
          info += "Create";
          break;


        case Constants.TASK_MODE_DELETE:
          info += "Delete";
          break;


        case Constants.TASK_MODE_QUERY:
          info += "Query";
          break;


        default:
          info = null;
          break;
      }

      activityItem.setInfo(info);
      this._queue.put(activityItem);
    }
  }

  /// <summary>
  ///   parse the data
  /// </summary>
  fillData(): void {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;
    let endContext: number = parser.getXMLdata().indexOf("/>", parser.getCurrIndex());
    if (endContext !== -1 && endContext < parser.getXMLdata().length) {
      // find last position of its tag
      let tag: string = parser.getXMLsubstring(endContext);
      parser.add2CurrIndex(tag.indexOf("flwmtr_config") + "flwmtr_config".length);

      let tokens: List<string> = XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);
      Logger.Instance.WriteDevToLog("in FlowMonitorQueue.FillData: " + tokens.toString());

      this.initElements(tokens);
      parser.setCurrIndex(endContext + XMLConstants.TAG_TERM.length); // to delete "/>" too
      return;
    }
    Logger.Instance.WriteExceptionToLogWithMsg("in  FlowMonitorQueue.FillData() out of string bounds");
  }

  /// <summary>
  ///   parse the XML data
  /// </summary>
  /// <param name = "tokensVector">attribute/value/...attribute/value/ vector</param>
  private initElements(tokensVector: List<string>): void {

    for (let j: number = 0; j < tokensVector.length; j = j + 2) {
      let attribute: string = <string>tokensVector.get_Item(j);
      let valueStr: string = <string>tokensVector.get_Item(j + 1);
      Logger.Instance.WriteDevToLog(attribute + " value: " + valueStr);

      switch (attribute) {
        case ConstInterface.MG_ATTR_TASK:
          this._isTask = XmlParser.getBoolean(valueStr);
          break;

        case ConstInterface.MG_ATTR_TASKFLW:
          this._isTaskFlow = XmlParser.getBoolean(valueStr);
          break;

        case ConstInterface.MG_ATTR_RECOMP:
          this._isRecompute = XmlParser.getBoolean(valueStr);
          break;

        case ConstInterface.MG_ATTR_FLWOP:
          this._isFlowOperation = XmlParser.getBoolean(valueStr);
          break;

        case ConstInterface.MG_ATTR_ENABLED:
          this.enable(XmlParser.getBoolean(valueStr));
          break;

        default:
          Logger.Instance.WriteExceptionToLogWithMsg("in FlowMonitorQueue.initElements(): unknown  attribute: " + attribute);
          break;
      }
    }
  }

  /// <summary>
  ///   build XML and empty the inner queue
  /// </summary>
  buildXML(message: StringBuilder): void {
    if (!this._queue.isEmpty() && this.ShouldSerialize) {
      message.Append(XMLConstants.START_TAG + ConstInterface.MG_TAG_FLWMTR_MSG + XMLConstants.TAG_CLOSE);

      while (!this._queue.isEmpty()) {
        let currAct: ActivityItem = <ActivityItem>this._queue.get();
        currAct.buildXML(message);
      } // fill activities

      message.Append("</" + ConstInterface.MG_TAG_FLWMTR_MSG + XMLConstants.TAG_CLOSE);
    } // the queue is not empty
  }

  /// <summary>
  ///   is the Flow Monitor Queue empty
  /// </summary>
  isEmpty(): boolean {
    return this._queue.isEmpty();
  }

  /// <summary>
  ///   enable the flow monitor
  /// </summary>
  /// <returns>the previous state (enabled/disabled)</returns>
  enable(value: boolean): boolean {
    let wasEnabled: boolean = this._enabled;
    this._enabled = value;
    this.ShouldSerialize = this._enabled;
    return wasEnabled;
  }

  /// <summary>
  ///   add Activities to the queue
  /// </summary>
  /// <param name = "triggeredBy"></param>
  /// <param name = "state">of the event task activitie</param>
  addTaskEvent(triggeredBy: string, state: number): void {
    if (this._enabled && this._isTask) {
      let act: ActivityItem = new ActivityItem(this, FlowMonitorQueue.ACT_TASK, FlowMonitorInterface.FLWMTR_EVENT);

      let info: string;
      switch (state) {
        case FlowMonitorInterface.FLWMTR_START:
          info = FlowMonitorQueue.S_EVENT_STR1 + triggeredBy + FlowMonitorQueue.S_EVENT_STR2;
          break;

        case FlowMonitorInterface.FLWMTR_END:
          info = FlowMonitorQueue.E_EVENT_STR + triggeredBy;
          break;

        case FlowMonitorInterface.FLWMTR_PROPAGATE:
          info = FlowMonitorQueue.S_EVENT_PROPAGATED;
          break;

        default:
          info = null;
          break;
      }

      act.setInfo(info);
      this._queue.put(act);
    }
  }

  /// <summary>
  ///   add task flow for record prefix or sufix
  /// </summary>
  /// <param name = "id">is FLWMTR_PREFIX or FLWMTR_SUFFIX
  /// </param>
  /// <param name = "state">of the event task activitie
  /// </param>
  addTaskFlowRec(id: number, state: number): void {
    if (this._enabled && this._isTaskFlow) {
      let info: string;

      switch (id) {
        case InternalInterface.MG_ACT_REC_PREFIX:
          info = state === FlowMonitorInterface.FLWMTR_START
            ? FlowMonitorQueue.S_RECPRF_STR
            : FlowMonitorQueue.E_RECPRF_STR;
          id = FlowMonitorInterface.FLWMTR_PREFIX;
          break;

        case InternalInterface.MG_ACT_REC_SUFFIX:
          info = state === FlowMonitorInterface.FLWMTR_START
            ? FlowMonitorQueue.S_RECSUF_STR
            : FlowMonitorQueue.E_RECSUF_STR;
          id = FlowMonitorInterface.FLWMTR_SUFFIX;
          break;

        case InternalInterface.MG_ACT_TASK_PREFIX:
          info = state === FlowMonitorInterface.FLWMTR_START
            ? FlowMonitorQueue.S_TASKPRF_STR
            : FlowMonitorQueue.E_TASKPRF_STR;
          id = FlowMonitorInterface.FLWMTR_PREFIX;
          break;

        case InternalInterface.MG_ACT_TASK_SUFFIX:
          info = state === FlowMonitorInterface.FLWMTR_START
            ? FlowMonitorQueue.S_TASKSUF_STR
            : FlowMonitorQueue.E_TASKSUF_STR;
          id = FlowMonitorInterface.FLWMTR_SUFFIX;
          break;

        default:
          info = null;
          break;
      }

      let act: ActivityItem = new ActivityItem(this, FlowMonitorQueue.ACT_TASK_FLW, id);
      act.setInfo(info);
      this._queue.put(act);
    }
  }

  /// <param name = "id">is MG_ACT_VARIABLE</param>
  /// <param name = "fldName"></param>
  /// <param name = "state">of the event task activitie</param>
  addTaskFlowFld(id: number, fldName: string, state: number): void {
    this.addTaskFlowCtrl(id, fldName, state);
  }

  /// <param name = "id">is FLWMTR_CTRL_PREFIX or FLWMTR_CTRL_SUFFIX</param>
  /// <param name = "ctrlName"></param>
  /// <param name = "state">of the event task activitie</param>
  addTaskFlowCtrl(id: number, ctrlName: string, state: number): void {
    if (this._enabled && this._isTaskFlow) {
      let info: string;

      switch (id) {
        case InternalInterface.MG_ACT_VARIABLE:
          info = state === FlowMonitorInterface.FLWMTR_START
            ? FlowMonitorQueue.S_VARIABLE_STR
            : FlowMonitorQueue.E_VARIABLE_STR;
          id = FlowMonitorInterface.FLWMTR_VARCHG_VALUE;
          break;

        case InternalInterface.MG_ACT_CTRL_PREFIX:
          info = state === FlowMonitorInterface.FLWMTR_START
            ? FlowMonitorQueue.S_CTRLPRF_STR
            : FlowMonitorQueue.E_CTRLPRF_STR;
          id = FlowMonitorInterface.FLWMTR_CTRL_PREFIX;
          break;


        case InternalInterface.MG_ACT_CTRL_SUFFIX:
          info = state === FlowMonitorInterface.FLWMTR_START
            ? FlowMonitorQueue.S_CTRLSUF_STR
            : FlowMonitorQueue.E_CTRLSUF_STR;
          id = FlowMonitorInterface.FLWMTR_CTRL_SUFFIX;
          break;

        case InternalInterface.MG_ACT_CTRL_VERIFICATION:
          info = state === FlowMonitorInterface.FLWMTR_START
            ? FlowMonitorQueue.S_CTRLVER_STR
            : FlowMonitorQueue.E_CTRLVER_STR;
          id = FlowMonitorInterface.FLWMTR_CTRL_SUFFIX;
          break;

        default:
          info = null;
          break;
      }

      let act: ActivityItem = new ActivityItem(this, FlowMonitorQueue.ACT_TASK_FLW, id);
      if (info !== null) {
        info = info + ctrlName;
        if (id === FlowMonitorInterface.FLWMTR_VARCHG_VALUE && state === FlowMonitorInterface.FLWMTR_START)
          info = info + FlowMonitorQueue.VARIABLE_REASON_STR;
        act.setInfo(info);
      }
      this._queue.put(act);
    }
  }

  /// <param name = "handlerId">isid of the handler
  /// </param>
  /// <param name = "state">of the event task activitie
  /// </param>
  addTaskFlowHandler(handlerId: string, state: number): void {
    if (this._enabled && this._isTaskFlow) {
      let act: ActivityItem = new ActivityItem(this, FlowMonitorQueue.ACT_TASK_FLW, FlowMonitorInterface.FLWMTR_TSK_HANDLER);
      let info: string;

      switch (state) {
        case FlowMonitorInterface.FLWMTR_START:
          info = NString.Format(FlowMonitorQueue.S_HANDLER_STR, handlerId);
          break;

        case FlowMonitorInterface.FLWMTR_END:
          info = NString.Format(FlowMonitorQueue.E_HANDLER_STR, handlerId);
          break;

        default:
          info = null;
          break;
      }

      if (info !== null) {
        // BRK_LEVEL_HANDLER_INTERNAL,BRK_LEVEL_HANDLER_SYSTEM,BRK_LEVEL_HANDLER_TIMER
        // BRK_LEVEL_HANDLER_EXPRESSION,BRK_LEVEL_HANDLER_ERROR,BRK_LEVEL_HANDLER_USER
        act.setInfo(info);
      }
      this._queue.put(act);
    }
  }

  /// <param name = "triggeredByVarName">var name , has triggered Recompute
  /// </param>
  addRecompute(triggeredByVarName: string): void {
    if (this._enabled && this._isRecompute) {
      let act: ActivityItem = new ActivityItem(this, FlowMonitorQueue.ACT_RECOMPUTE, FlowMonitorInterface.FLWMTR_RECOMP);
      act.setInfo(FlowMonitorQueue.RECOMP_STR + triggeredByVarName);
      this._queue.put(act);
    }
  }

  /// <summary>
  ///   Add a field flow operation activity item.
  /// </summary>
  /// <param name = "oper">The operation being logged.</param>
  /// <param name = "flowMode">The task's flow mode.</param>
  /// <param name = "flowDirection">The task's flow direction.</param>
  /// <param name = "bExecuted">Will the operation be executed.</param>
  addFlowFieldOperation(oper: Operation, flowMode: Task_Flow, flowDirection: Task_Direction, bExecuted: boolean): void {
    if (this._enabled && this._isFlowOperation) {
      let act: ActivityItem = new ActivityItem(this, FlowMonitorQueue.ACT_FLW_OPER, FlowMonitorInterface.FLWMTR_DATA_OPER);
      let buffer: StringBuilder = new StringBuilder(FlowMonitorQueue.FLW_PERFIX);
      oper.AddFlowDescription(buffer);
      buffer.Append(' ');

      switch (flowMode) {
        case Task_Flow.FAST:
          if (flowDirection === Task_Direction.FORE)
            buffer.Append(FlowMonitorQueue.FLW_FAST_FWD);
          else if (flowDirection === Task_Direction.BACK)
          // FLOW_BACK
            buffer.Append(FlowMonitorQueue.FLW_FAST_BWD);
          break;
        // We add nothing for FLOW_NONE

        case Task_Flow.STEP:
          if (flowDirection === Task_Direction.FORE)
            buffer.Append(FlowMonitorQueue.FLW_STEP_FWD);
          else if (flowDirection === Task_Direction.BACK)
          // FLOW_BACK
            buffer.Append(FlowMonitorQueue.FLW_STEP_BWD);
          break;
        // For operation mode NONE we write STEP_FORWARD -
        // see FLWMTR_CTX::output_  case FLWMTR_DATA_OPER:

        case Task_Flow.NONE:
          buffer.Append(FlowMonitorQueue.FLW_STEP_FWD);
          break;

        default:
          Logger.Instance.WriteExceptionToLogWithMsg("FlowMonitorQueue.addFlowFieldOperation unknown flow mode " + flowMode);
          return;
      }

      if (!bExecuted)
        buffer.Append("[Not Executed]");

      act.setInfo(buffer.ToString());
      this._queue.put(act);
    }
  }

  /// <param name = "state">of the update
  /// </param>
  addFlowOperationUpdate(state: number): void {
    if (this._enabled && this._isFlowOperation) {
      let act: ActivityItem = new ActivityItem(this, FlowMonitorQueue.ACT_FLW_OPER, FlowMonitorInterface.FLWMTR_DATA_OPER); // MG_OPER_UPDATE
      if (state === FlowMonitorInterface.FLWMTR_START)
        act.setInfo("Starts Update");
      else
        act.setInfo("Ends Update");

      this._queue.put(act);
    }
  }

  /// <param name = "info">string passed to status line verify action</param>
  addFlowVerifyInfo(info: string): void {
    this.addFlowInfo(info);
  }

  /// <param name = "info">string added to flow monitor queue for InvokeOs</param>
  addFlowInvokeOsInfo(info: string): void {
    this.addFlowInfo(info);
  }

  /// <summary>
  ///   user string passed to status line for actions
  /// </summary>
  /// <param name = "info">
  /// </param>
  private addFlowInfo(info: string): void {
    if (!this._enabled)
      return;

    let act: ActivityItem = new ActivityItem(this, FlowMonitorQueue.ACT_FLW_OPER, FlowMonitorInterface.FLWMTR_DATA_OPER);
    let buffer: StringBuilder = new StringBuilder("");

    if (!(info === "")) {
      buffer.Append(" >> INFORMATION >> ");
      buffer.Append(info);
    }
    act.setInfo(buffer.ToString());
    this._queue.put(act);
  }
}

/// <summary>
///   all information about current Activity
/// </summary>
class ActivityItem {
  private _enclosingInstance: FlowMonitorQueue = null;
  private _id: number = 0;
  private _type: string = null; // ACTY_TASK|ACT_TASK_FLW|ACT_DATAVIEW|ACT_RECOMPUTE|ACT_FLW_OPER
  private _info: string = null;
  private _time: string = null;

  constructor(enclosingInstance: FlowMonitorQueue, type: string, id: number) {
    this._enclosingInstance = enclosingInstance;
    this._type = type;
    this._id = id;
    this.setTime();
  }

  /// <summary>
  ///   save current time in the needed format
  /// </summary>
  private setTime(): void {
    this._time = DateTimeUtils.ToString(DateTime.Now, FlowMonitorQueue.LongTimePattern);
  }

  /// <summary>
  ///   set added information for the activity
  /// </summary>
  setInfo(info_: string): void {
    this._info = ((info_ !== null) ? XmlParser.escape(info_) : info_);
  }

  /// <summary>
  ///   build XML string for the activity item
  /// </summary>
  buildXML(message: StringBuilder): void {
    message.Append(XMLConstants.START_TAG + ConstInterface.MG_TAG_FLWMTR_ACT);
    message.Append(" " + XMLConstants.MG_ATTR_TYPE + "=\"" + this._type + "\"");
    message.Append(" " + XMLConstants.MG_ATTR_ID + "=\"" + this._id + "\"");
    if (this._info != null)
      message.Append(" " + ConstInterface.MG_ATTR_INFO + "=\"" + this._info + "\"");
    message.Append(" " + ConstInterface.MG_ATTR_TIME + "=\"" + this._time + "\"");
    message.Append(XMLConstants.TAG_TERM);
  }
}
