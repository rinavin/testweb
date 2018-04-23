import {
  Int32,
  Encoding,
  ApplicationException,
  Debug,
  Exception,
  List,
  NNumber,
  NString,
  StringBuilder,
  RefParam
} from "@magic/mscorelib";

import {
  FlwMode,
  CallOperationMode,
  CallOsShow,
  FlowDirection,
  XmlParser,
  StorageAttributeCheck,
  Logger,
  StorageAttribute,
  StrUtil,
  UtilStrByteMode,
  XMLConstants,
  Constants,
  InternalInterface
} from "@magic/utils";

import {
  TaskDefinitionId,
  TaskDefinitionIdTableSaxHandler,
  Manager,
  VectorType,
  ProcessLauncher,
  Commands,
  NUM_TYPE,
  Styles
} from "@magic/gui";

import {YesNoExp} from "../exp/YesNoExp";
import {ArgumentsList} from "./ArgumentsList";
import {IClientCommand} from "../commands/IClientCommand";
import {Expression} from "../exp/Expression";
import {EventHandler} from "../event/EventHandler";
import {Field} from "../data/Field";
import {RunTimeEvent} from "../event/RunTimeEvent";
import {ClientManager} from "../ClientManager";
import {MgForm, GUIManager} from "../../index";
import {CommandFactory} from "../commands/ClientToServer/CommandFactory";
import {FlowMonitorQueue} from "../util/FlowMonitorQueue";
import {CommandsProcessorBase_SendingInstruction} from "../CommandsProcessorBase";
import {CommandsProcessorManager} from "../CommandsProcessorManager";
import {ExecOperCommand} from "../commands/ClientToServer/ExecOperCommand";
import {MgControl} from "../gui/MgControl";
import {MGData} from "../tasks/MGData";
import {MgProperties} from "../util/MgProperties";
import {Process} from "../util/Process";
import {ConstInterface} from "../ConstInterface";
import {Task, Task_Direction, Task_Flow} from "../tasks/Task";
import {FlowMonitorInterface} from "../FlowMonitorInterface";
import {Event} from "../event/Event";
import {HttpUtility} from "../http/client/HttpUtility";

/// <summary>
///   data for <oper> tag
/// </summary>
export class Operation {
  private _condExp: YesNoExp = new YesNoExp(true);
  private _retainFocus: YesNoExp = new YesNoExp(false);
  private _waitExp: YesNoExp = new YesNoExp(false);
  private _syncData: YesNoExp = new YesNoExp(false); // call operation: Sync data
  private _argList: ArgumentsList = null;
  private _blockClose: number = 0;
  // in Block Begin/Else/Loop operation: the operation id which is the end of the execution block (else/end)
  private _blockEnd: number = 0;  // in Block Begin/Else/Loop operation: the Block End operation that ends the nesting level
  private _buttons: string = '\0'; // buttons of verify opr
  private _checkByServer: boolean = false; // for Call operation with subform destination
  private _cmdToServer: IClientCommand = null; // default button of verify opr
  private _defaultButton: number = 0;  // expression attached to default button of verify opr
  private _defaultButtonExp: Expression = null;
  private _display: string = 'S'; // Status line | message Box
  private _errLogAppend: boolean = false; // append to error log for verify opr
  private _evtHandler: EventHandler = null;
  private _execOnServer: boolean = false; // for block if which should be executed on the server
  private _exp: Expression = null;
  private _field: Field = null; // reference to the field
  private _globalParamsShouldBeCopied: boolean = false;
  private _image: string = '\0'; // image of verify opr
  private _incremental: boolean = false;  // INCR->true, NORMAL->false (how attribute)
  private _methodNameSnippet: string = null; // Entry point methodName for snippet
  private _mode: string = '\0'; // Error|Warning
  // but we still need to skip the block operations in the client
  private _operDirection: FlowDirection = FlowDirection.Combined;
  private _operFlowMode: FlwMode = FlwMode.Combine;
  private _prgDescription: string = null;
  private _publicName: string = null;
  private _returnVal: Field = null; // return value of verify opr
  private _rtEvt: RunTimeEvent = null; // for Raise event
  private _serverId: number = -1;
  // the index of this operation in the server's flow (0 means it's the first operation in the handler, 1 for the second etc.). Valid for: Server
  private calledTaskDefinitionId: TaskDefinitionId = null;

  private _show: CallOsShow = CallOsShow.Normal;
  private _subformCtrlName: string = null; // for Call operation with subform destination
  private _subtype: string = '\0'; // If|Else|Loop
  private _task: Task = null; // the task of the operation
  private _text: string = null; // the verify message
  private _title: string = null; // title of verify opr
  private _titleExp: Expression = null; // expression attached to title of verify opr
  private _type: number = 0; // operation number (like in Magic)
  private _undo: boolean = true;

  private _isRoute: boolean = false;
  private _routerPath: string = null;
  private _originalRouterOutletName: string = null;
  private _routeParams: List<any> = null;

  get CalledTaskDefinitionId(): TaskDefinitionId {
    return this.calledTaskDefinitionId;
  }

  OperCallMode: CallOperationMode = 0;

  set Task(value: Task) {
    this._task = value;
  }

  get Task(): Task {
    return this._task;
  }

  private Immediate(): boolean {
    return this._waitExp.getVal();
  }


  /// <summary>
  ///   parse an operation
  /// </summary>
  fillData(taskRef: Task, evtHandler: EventHandler): void {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;

    this._task = taskRef;
    this._evtHandler = evtHandler;

    while (this.initInnerObjects(parser, parser.getNextTag(), taskRef)) {
    }
  }

  /// <summary>
  ///   init inner attributes of Operation object on parsing time
  /// </summary>
  private initInnerObjects(parser: XmlParser, foundTagName: string, taskRef: Task): boolean {
    if (foundTagName === null)
      return false;

    if (foundTagName === ConstInterface.MG_TAG_EVENT) {
      this._rtEvt = new RunTimeEvent(taskRef);
      this._rtEvt.fillData(parser, taskRef);
    }
    else if (foundTagName === ConstInterface.MG_TAG_OPER) {
      this.fillAttributes(parser, taskRef);
    }
    else if (foundTagName === "/" + ConstInterface.MG_TAG_OPER) {
      parser.setCurrIndex2EndOfTag(); // setCurrIndex(XmlParser.isNextTagClosed(MG_TAG_CONTROL));
      return false;
    }
    else if (foundTagName === XMLConstants.MG_TAG_TASKDEFINITIONID_ENTRY) {
      this.InitTaskDefinitionID(parser);
    }
    else {
      Logger.Instance.WriteExceptionToLogWithMsg("There is no such tag in Operation. Insert else if to Operation.initInnerObjects for " + foundTagName);
      return false;
    }
    return true;
  }


  /// <summary>
  ///   get the attributes of the operation
  /// </summary>
  /// <param name = "taskRef">the task of the handler current</param>
  private fillAttributes(parser: XmlParser, taskRef: Task): void {
    let tokensVector: List<string>;
    let endContext: number = parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex());

    if (endContext !== -1 && endContext < parser.getXMLdata().length) {

      // last position of its tag
      let tag: String = parser.getXMLsubstring(endContext);
      parser.add2CurrIndex(tag.indexOf(ConstInterface.MG_TAG_OPER) + ConstInterface.MG_TAG_OPER.length);

      tokensVector = XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);
      this.initElements(tokensVector, taskRef);

      // init inner reference:
      parser.setCurrIndex(endContext + XMLConstants.TAG_CLOSE.length);
      return;
    }
    Logger.Instance.WriteExceptionToLogWithMsg("in Command.FillData() out of string bounds");
  }

  /// <summary>
  ///   Make initialization of private elements by found tokens
  /// </summary>
  /// <param name = "tokensVector">found tokens, which consist attribute/value of every found	element</param>
  /// <param name = "taskRef">current</param>
  private initElements(tokensVector: List<String>, taskRef: Task): void {
    let attribute: String, valueStr;
    let expId: number;
    let isGuiThreadExecution: boolean = false;

    for (let j: number = 0; j < tokensVector.length; j += 2) {
      attribute = (tokensVector.get_Item(j));
      valueStr = (tokensVector.get_Item(j + 1));

      switch (attribute) {
        case XMLConstants.MG_ATTR_TYPE:
          this._type = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_FLD:
          this._field = Operation.InitField(valueStr, this._task);
          break;
        case XMLConstants.MG_ATTR_EXP:
          expId = XmlParser.getInt(valueStr);
          this._exp = taskRef.getExpById(expId);
          break;
        case ConstInterface.MG_ATTR_TEXT:
          this._text = XmlParser.unescape(valueStr);
          break;
        case ConstInterface.MG_ATTR_MODE:
          this._mode = valueStr[0];
          break;
        case ConstInterface.MG_ATTR_SUBTYPE:
          this._subtype = valueStr[0];
          if (this._type === ConstInterface.MG_OPER_BLOCK) {
            if (this._subtype === 'E')
              this._type = ConstInterface.MG_OPER_ELSE;
            else if (this._subtype === 'L')
              this._type = ConstInterface.MG_OPER_LOOP;
          }
          break;
        case ConstInterface.MG_ATTR_CLOSE:
          this._blockClose = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_END:
          this._blockEnd = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_HOW:
          this._incremental = (valueStr.Equals("I"));
          break;
        case ConstInterface.MG_ATTR_UNDO:
          if (valueStr[0] === 'N')
            this._undo = false;
          else if (valueStr[0] === 'Y')
            this._undo = true;
          else Logger.Instance.WriteExceptionToLogWithMsg("in Operation.initElements(): No such value to the MG_ATTR_UNDO for " + valueStr);
          break;
        case ConstInterface.MG_ATTR_DISPLAY:
          this._display = valueStr[0];
          break;
        case ConstInterface.MG_ATTR_WAIT:
          this._waitExp.setVal(taskRef, valueStr);
          break;
        case ConstInterface.MG_ATTR_RETAIN_FOCUS:
          this._retainFocus.setVal(taskRef, valueStr);
          break;
        case ConstInterface.MG_ATTR_SYNC_DATA:
          this._syncData.setVal(taskRef, valueStr);
          break;
        case ConstInterface.MG_ATTR_SHOW:
          this._show = <CallOsShow>XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_CND:
          this._condExp.setVal(taskRef, valueStr);
          break;
        case ConstInterface.MG_ATTR_ARGLIST:
          this._argList = new ArgumentsList();
          this._argList.fillList(valueStr, this._task);
          break;
        case ConstInterface.MG_ATTR_REFRESHON:
          this._argList.RefreshOnString = valueStr.Trim();
          break;
        case ConstInterface.MG_ATTR_SERVER_ID:
          this._serverId = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_OPER_CALLMODE:
          this.OperCallMode = <CallOperationMode>valueStr[0];
          break;

        case ConstInterface.MG_ATTR_SUBFORM_CTRL:
          this._subformCtrlName = XmlParser.unescape(valueStr);
          break;
        case ConstInterface.MG_ATTR_CHECK_BY_SERVER:
          this._checkByServer = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_PUBLIC:
          this._publicName = valueStr;
          break;
        case ConstInterface.MG_ATTR_PRG_DESCRIPTION:
          this._prgDescription = valueStr;
          break;
        case ConstInterface.MG_ATTR_CPY_GLB_PRMS:
          this._globalParamsShouldBeCopied = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_EXEC_ON_SERVER:
          this._execOnServer = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_TITLE:
          this._title = XmlParser.unescape(valueStr);
          break;
        case ConstInterface.MG_ATTR_TITLE_EXP:
          expId = XmlParser.getInt(valueStr);
          this._titleExp = taskRef.getExpById(expId);
          break;
        case ConstInterface.MG_ATTR_IMAGE:
          this._image = valueStr[0];
          break;
        case ConstInterface.MG_ATTR_BUTTONS:
          this._buttons = valueStr[0];
          break;
        case ConstInterface.MG_ATTR_DEFAULT_BUTTON:
          this._defaultButton = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_DEFAULT_BUTTON_EXP:
          expId = XmlParser.getInt(valueStr);
          this._defaultButtonExp = taskRef.getExpById(expId);
          break;
        case ConstInterface.MG_ATTR_RETURN_VAL:
          this._returnVal = Operation.InitField(valueStr, this._task);
          break;
        case ConstInterface.MG_ATTR_ERR_LOG_APPEND:
          this._errLogAppend = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_OPER_DIRECTION:
          this._operDirection = <FlowDirection>valueStr[0];
          break;
        case ConstInterface.MG_ATTR_OPER_FLOWMODE:
          this._operFlowMode = <FlwMode>valueStr[0];
          break;
        case ConstInterface.MG_ATTR_OPER_METHODNAME:
          this._methodNameSnippet = valueStr;
          break;
        case ConstInterface.MG_ATTR_IS_GUI_THREAD_EXECUTION:
          isGuiThreadExecution = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_IS_ROUTE:
          this._isRoute = XmlParser.getBoolean(valueStr);
          break;
        case XMLConstants.MG_ATTR_ROUTER_PATH:
          this._routerPath = XmlParser.unescape(valueStr);
          break;
        default:
          Logger.Instance.WriteExceptionToLogWithMsg("There is no such tag in Operation class. Insert case to Operation.initElements for " + attribute);
          break;
      }
    }
    if (this._serverId > -1)
      this._cmdToServer = CommandFactory.CreateExecOperCommand(this._task.getTaskTag(), "" + this._evtHandler.getId(), this._serverId, Int32.MinValue, null);

    if (this._isRoute) {
      this._originalRouterOutletName = this._subformCtrlName !== null ? this._subformCtrlName : "";

      if (this._subformCtrlName == null) {
        this._subformCtrlName = this._task.getForm().DefaultRouterOutlet.Name;
      }
    }
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="parser"></param>
  InitTaskDefinitionID(parser: XmlParser): void {
    let xmlBuffer: string = parser.ReadToEndOfCurrentElement();
    let taskDefinitionIdTableSaxHandler: TaskDefinitionIdTableSaxHandler = new TaskDefinitionIdTableSaxHandler(this.SetTaskDefinitionId);
    taskDefinitionIdTableSaxHandler.parse(xmlBuffer);
  }

  /// <summary>
  /// callback for the sax parser
  /// </summary>
  /// <param name="taskDefinitionId"></param>
  /// <param name="xmlId"></param>
  /// <param name="defaultTagList"></param>
  private SetTaskDefinitionId(taskDefinitionId: TaskDefinitionId): void {
    this.calledTaskDefinitionId = taskDefinitionId;
  }

  /// <summary>
  ///   Initialize the field
  /// </summary>
  /// <param name = "valueStr">a reference to the field</param>
  /// <param name = "task"></param>
  static InitField(valueStr: string, task: Task): Field {
    let TaskField: List<string> = XmlParser.getTokens(valueStr, ',')/*','*/;
    if (TaskField.length === 2) {
      let parent: number = NNumber.Parse(TaskField.get_Item(0));
      let fldID: number = NNumber.Parse(TaskField.get_Item(1));
      let field: Field = <Field>task.getFieldDef(parent, fldID);
      return field;
    }
    Logger.Instance.WriteExceptionToLogWithMsg(NString.Format("Unknown field: '{0}'", valueStr));
    return null;
  }

  /// <summary>
  ///   execute the operation
  /// </summary>
  /// <param name = "mprgCreator">relevant only when the operation belongs to a main program.
  ///   It identifies the task which caused this main program to participate in the runtime
  ///   flow (i.e. when running a task from a different component, we instantiate his main program
  ///   right above it.
  /// </param>
  /// <param name = "ctrl">the focus need to be returned after the VERIFY operation in Message Box needs only
  ///   all another operations can use null
  /// </param>
  /// <param name = "returnedFromServer">true if the server returned the execution to this operation</param>
  /// <returns> boolean for verify and block operations</returns>
  execute(returnedFromServer: boolean): boolean {
    let lastRtEvent: RunTimeEvent = ClientManager.Instance.EventsManager.getLastRtEvent();
    let mprgCreator: Task = null;
    let flowMonitor: FlowMonitorQueue = FlowMonitorQueue.Instance;

    if (lastRtEvent !== null)
      mprgCreator = lastRtEvent.getMainPrgCreator();

    if (returnedFromServer ||
      (!returnedFromServer && (this._type !== ConstInterface.MG_OPER_SERVER || !this._condExp.isServerExp()))) {
      if (!this.canExecute()) {
        if (this._type !== ConstInterface.MG_OPER_LOOP)
          flowMonitor.addFlowFieldOperation(this, this._task.getFlowMode(), this._task.getDirection(), false);
        return false;
      }
    }
    if (this._type !== ConstInterface.MG_OPER_LOOP && this._type !== ConstInterface.MG_OPER_ENDBLOCK)
    // We call addFlowOperationSelect only at the begining and end of the loop at EventHandler::execute
      flowMonitor.addFlowFieldOperation(this, this._task.getFlowMode(), this._task.getDirection(), true);

    try {
      switch (this._type) {
        case ConstInterface.MG_OPER_VERIFY:
          return this.operVerify();
        case ConstInterface.MG_OPER_BLOCK:
          return this.operBlock();
        case ConstInterface.MG_OPER_LOOP:
          if (!this.getExecOnServer())
            return this.operBlock();
          else {
            this.operServer(mprgCreator);
            break;
          }
        case ConstInterface.MG_OPER_ELSE:
          return this.operElse();
        case ConstInterface.MG_OPER_EVALUATE:
          this.operEvaluate();
          break;
        case ConstInterface.MG_OPER_UPDATE:
          this.operUpdate(mprgCreator);
          break;
        case ConstInterface.MG_OPER_USR_EXIT:
          this.operInvokeOS();
          break;
        case ConstInterface.MG_OPER_RAISE_EVENT:
          this.operRaiseEvent(mprgCreator, returnedFromServer);
          break;
        case ConstInterface.MG_OPER_SERVER:
          this.operServer(mprgCreator);
          break;
        case ConstInterface.MG_OPER_CALL:
          if (this._publicName != null) {
            this.operCallParallel();
          }
          else if (this._subformCtrlName == null)
            this.operCall(mprgCreator);
          // Subform Destination Call oR Call Route
          else {
            let subformTask: Task;
            let isEndProg: boolean = true;

            if (this._checkByServer) {
              if (!(this._cmdToServer instanceof ExecOperCommand))
                Debug.Assert(false);

              let command: ExecOperCommand = <ExecOperCommand>this._cmdToServer;
              command.CheckOnly = true;
              this.operCall(mprgCreator);
              command.CheckOnly = false;
              if (ClientManager.Instance.EventsManager.getNextOperIdx(this, true) > -1)
                isEndProg = false;
            }
            if (isEndProg) {
              let destSubForm: MgControl = (<MgForm>this._task.getForm()).getSubFormCtrlByName(this._subformCtrlName);

              if (destSubForm != null) {

                if (this._isRoute) {
                  let canRoute: boolean = false;
                  let rtEvnt = ClientManager.Instance.EventsManager.getLastRtEvent();
                  if (rtEvnt !== null) {
                    this._routeParams = rtEvnt.getRouteParamList();

                    if (rtEvnt.getArgList().getArg(0).getValue(StorageAttribute.ALPHA, 0) === this._routerPath &&
                      ((rtEvnt.getArgList().getArg(1).skipArg()) ||
                        (rtEvnt.getArgList().getArg(1).getValue(StorageAttribute.ALPHA, 0) === this._originalRouterOutletName)))
                      canRoute = true;

                    if (!canRoute)
                      return false;
                  }
                }

                subformTask = destSubForm.getSubformTask();

                if (subformTask != null) {
                  if (subformTask.endTask(true, false, true, false)) {
                    let parentTask: Task = <Task>destSubForm.getForm().getTask();
                    parentTask.TaskService.RemoveRecomputes(parentTask, subformTask);
                  }
                  else
                  // if the task failed to terminate, do no proceed to call the new task.
                    break;
                }
                if (GUIManager.getLastFocusedControl() != null &&
                  GUIManager.getLastFocusedControl().isDescendentOfControl(destSubForm))
                  this._task.RetainFocus = false;
                else this._task.RetainFocus = this._retainFocus.getVal();
              }
              this.operCall(mprgCreator);

              if (this._isRoute) // Since we reached here, it means that the match was found. So, stop executing the handler further.
                ClientManager.Instance.EventsManager.setStopExecution(true);
            }
          }
          break;
        default:
          Logger.Instance.WriteExceptionToLogWithMsg("There is no such type of operation " + this._type);
          break;
      }
    }
    catch (ex) {
      throw ex;
    }
    return true;
  }

  /// <summary>
  ///   call a parallel rich-client program
  /// </summary>
  private operCallParallel(): void {
    Operation.callParallel(this._task, this._publicName, this._argList, this._globalParamsShouldBeCopied, this._prgDescription);
  }

  static callParallel(task: Task, publicName: string, argList: ArgumentsList, globalParamsShouldBeCopied: boolean, prgDescription: string): void {
    if (task.IsOffline) {
      Logger.Instance.WriteExceptionToLogWithMsg("Can't run a parallel program from an offline task");
      return;
    }

    //  The rich-client will query the runtime-engine for the up-to-date list of global params
    //  of the current context only if the callED (parallel) program requests copying of global params,
    //  the callER program should query them from the runtime-engine
    if (globalParamsShouldBeCopied) {
      let mgData: MGData = task.getMGData();
      let cmd: IClientCommand = CommandFactory.CreateQueryGlobalParamsCommand();
      mgData.CmdsToServer.Add(cmd);
      CommandsProcessorManager.GetCommandsProcessor().Execute(CommandsProcessorBase_SendingInstruction.ONLY_COMMANDS);
    }
    // clone the execution properties of the current client
    let calledProgramProps: MgProperties = ClientManager.Instance.copyExecutionProps();
    ClientManager.Instance.setGlobalParams(null);

    // set the called program's internal name
    calledProgramProps.set_Item(ConstInterface.REQ_PRG_NAME, publicName);

    // Server sends prgDesciprtion only when PublicName is not specified.
    // Otherwise server sends a fictive prgDescription like : _Program_Id_<ISN>.
    // When public name is specified prgDescription is not used and it will be null.
    if (!NString.IsNullOrEmpty(prgDescription)) {
      calledProgramProps.set_Item(ConstInterface.REQ_PRG_DESCRIPTION, prgDescription);
    }
    calledProgramProps.set_Item(ConstInterface.PARALLEL_EXECUTION, "Y");

    // arguments to the parallel program
    if (argList !== null) {
      let prgArgs: string = argList.toURL(true);
      calledProgramProps.set_Item(ConstInterface.REQ_ARGS, prgArgs);
    }
    let XMLdata: StringBuilder = new StringBuilder();
    try {
      calledProgramProps.storeToXML(XMLdata);

      // If encoding was disabled, enable it to create the right command line for the parallel program
      let encodingEnabled: boolean = HttpUtility.EncodingEnabled;
      if (!encodingEnabled)
        HttpUtility.EncodingEnabled = true;

      let spawningArguments: string = HttpUtility.UrlEncode(XMLdata.ToString(), Encoding.UTF8);
      if (!encodingEnabled)
        HttpUtility.EncodingEnabled = false;

      // spawn a new instance of the assembly inside the current process
      Process.StartCurrentExecutable(spawningArguments);
    }
    catch (ex) {
      if (ex instanceof Exception) {
        Operation.callOprShowError(task, ex.toString());
      }
      else
        throw ex;
    }
  }

  /// <summary>
  /// </summary>
  /// <param name = "ClientManager.Instance"></param>
  /// <param name = "task"></param>
  /// <param name = "errMsg"></param>
  private static callOprShowError(task: Task, errMsg: string): void {
    Manager.WriteToMessagePane(<Task>task.GetContextTask(), errMsg, false);
    FlowMonitorQueue.Instance.addFlowInvokeOsInfo(errMsg);
    Logger.Instance.WriteExceptionToLogWithMsg(errMsg);
  }

  /// <summary>
  ///   returns the condition value
  /// </summary>
  private getCondVal(): boolean {
    return this._condExp.getVal();
  }

  /// <summary>
  ///   get the operation type
  /// </summary>
  getType(): number {
    return this._type;
  }

  /// <summary>
  ///   get the operation type
  /// </summary>
  getRouteParams(): List<any> {
    return this._routeParams;
  }

  /// <summary>
  ///   returns the server ID of this operation
  /// </summary>
  getServerId(): number {
    return this._serverId;
  }

  /// <summary>
  ///   execute Verify
  /// </summary>
  /// <returns> boolean is true if and only if mode==error</returns>

  private operVerify(): boolean {
    let isError: boolean = (this._mode === ConstInterface.FLW_VERIFY_MODE_ERROR || this._mode === ConstInterface.FLW_VERIFY_MODE_REVERT);

    let textToDisplay: string = this._exp === null ? this._text : this._exp.evaluateWithResultTypeAndLength(StorageAttribute.UNICODE, 255);

    let titleToDisplay: string = this._titleExp === null ? this._title : this._titleExp.evaluateWithResultTypeAndLength(StorageAttribute.UNICODE, 255);

    textToDisplay = textToDisplay === null ? "" : StrUtil.rtrim(textToDisplay);
    titleToDisplay = titleToDisplay === null ? "" : StrUtil.rtrim(titleToDisplay);

    // InOrder to keep the behavior same as in Online, Verify Operation Warning messages will be written
    // as Error messages in Client log (QCR #915122)
    if (this._errLogAppend) {
      let PrgDescription: string = ClientManager.Instance.getPrgDescription();
      if (PrgDescription == null)
        PrgDescription = ClientManager.Instance.getPrgName();
      Logger.Instance.WriteExceptionToLogWithMsg(textToDisplay + ", program : " + PrgDescription);
    }
    // Status line
    if (this._display === ConstInterface.DISPLAY_STATUS) {
      // Blank Message will not be shown, same as in Online
      if (!NString.IsNullOrEmpty(textToDisplay)) {

        FlowMonitorQueue.Instance.addFlowVerifyInfo(textToDisplay);
        // Product #178, Topic #61: beep on the client side only upon user errors (e.g. duplicate record),
        // otherwise only if started from the studio (F7)
        let beep: boolean = ClientManager.StartedFromStudio;
        Manager.WriteToMessagePane(<Task>this._task.GetContextTask(), textToDisplay, beep);
      }
    }
    // Message Box
    else {
      // Blank Message will not be shown, same as in Online
      if (!NString.IsNullOrEmpty(textToDisplay)) {
        // mls translation when displaying to box. for status the rans is i the control property.
        let mlsTransTextToDisplay: string = ClientManager.Instance.getLanguageData().translate(textToDisplay);
        let mlsTransTitleToDisplay: string = ClientManager.Instance.getLanguageData().translate(titleToDisplay);

        let tmpdefaultButton: number = this._defaultButtonExp == null ? this._defaultButton : (this._defaultButtonExp.evaluateWithResType(StorageAttribute.NUMERIC)).MgNumVal.NUM_2_LONG();

        let verifyMode: number = Operation.getButtons(this._buttons);
        verifyMode = verifyMode || Operation.getImage(this._image);
        verifyMode = verifyMode || Operation.getDefaultButton(tmpdefaultButton);

        if (UtilStrByteMode.isLocaleDefLangJPN()) {
          let delimPos: number = mlsTransTextToDisplay.indexOf('|');
          if (0 <= delimPos && delimPos < mlsTransTextToDisplay.length) {
            mlsTransTitleToDisplay = mlsTransTextToDisplay.substr(delimPos + 1);
            mlsTransTextToDisplay = mlsTransTextToDisplay.substr(0, delimPos);
          }
        }

        let mgForm: MgForm = null;
        // get the object for which the messagebox will be displayed
        if (!(<Task>this._task.GetContextTask()).getMGData().IsAborting)
          mgForm = <MgForm>(<Task>this._task.GetContextTask()).getTopMostForm();

        // if the form of the current task is null (main program) then use the form
        // of last focused task
        if (mgForm == null && ClientManager.Instance.getLastFocusedTask() != null)
          mgForm = <MgForm>ClientManager.Instance.getLastFocusedTask().getTopMostForm();

        let returnValue: number = Commands.messageBox(mgForm, mlsTransTitleToDisplay, mlsTransTextToDisplay, verifyMode);
        Operation.setoperVerifyReturnValue(returnValue, this._returnVal);
      }
    }

    // if we are in the revert mode and get a verify error, nullify the revert mode
    if (this._mode === ConstInterface.FLW_VERIFY_MODE_ERROR && this._task.getRevertFrom() > -1) {
      this._task.setRevertFrom(-1);
      this._task.setRevertDirection(Task_Direction.FORE);
    }
    if (this._mode === ConstInterface.FLW_VERIFY_MODE_REVERT) {
      // set the revert direction to the opposite of what it was.
      this._task.setRevertFrom(this._evtHandler.getOperationTab().serverId2operIdx(this._serverId, 0));
      let dir: Task_Direction = this._task.getRevertDirection();
      this._task.setRevertDirection(dir === Task_Direction.FORE
        ? Task_Direction.BACK
        : Task_Direction.FORE);

      // reverse the direction of flow
      let flowDir: Task_Direction = this._task.getDirection();
      this._task.setDirection(Task_Direction.NONE);
      this._task.setDirection(flowDir === Task_Direction.FORE || flowDir === Task_Direction.NONE
        ? Task_Direction.BACK
        : Task_Direction.FORE);
    }
    return isError;
  }

  /// <summary>
  ///   returns code assigned to corresponding buttonsID
  /// </summary>

  public static getButtons(buttonsID: string): number {
    let tmpbuttons: number = 0;

    switch (buttonsID) {
      case ConstInterface.BUTTONS_OK:
        tmpbuttons = Styles.MSGBOX_BUTTON_OK;
        break;
      case ConstInterface.BUTTONS_OK_CANCEL:
        tmpbuttons = Styles.MSGBOX_BUTTON_OK_CANCEL;
        break;
      case ConstInterface.BUTTONS_ABORT_RETRY_IGNORE:
        tmpbuttons = Styles.MSGBOX_BUTTON_ABORT_RETRY_IGNORE;
        break;
      case ConstInterface.BUTTONS_YES_NO_CANCEL:
        tmpbuttons = Styles.MSGBOX_BUTTON_YES_NO_CANCEL;
        break;
      case ConstInterface.BUTTONS_YES_NO:
        tmpbuttons = Styles.MSGBOX_BUTTON_YES_NO;
        break;
      case ConstInterface.BUTTONS_RETRY_CANCEL:
        tmpbuttons = Styles.MSGBOX_BUTTON_RETRY_CANCEL;
        break;
      default:
        break;
    }
    return tmpbuttons;
  }

  /// <summary>
  ///   returns code assigned to corresponding imageID
  /// </summary>
  public static getImage(imageID: string): number {
    let tmpImage: number = 0;
    switch (imageID) {
      case ConstInterface.IMAGE_EXCLAMATION:
        tmpImage = Styles.MSGBOX_ICON_EXCLAMATION;
        break;
      case ConstInterface.IMAGE_CRITICAL:
        tmpImage = Styles.MSGBOX_ICON_ERROR;
        break;
      case ConstInterface.IMAGE_QUESTION:
        tmpImage = Styles.MSGBOX_ICON_QUESTION;
        break;
      case ConstInterface.IMAGE_INFORMATION:
        tmpImage = Styles.MSGBOX_ICON_INFORMATION;
        break;
      default:
        break;
    }
    return tmpImage;
  }


  /// <summary>
  ///   returns code assigned to corresponding defaultButtonID
  /// </summary>
  public static getDefaultButton(defaultButtonID: number): number {
    let tmpdefaultButton: number = 0;
    switch (defaultButtonID) {
      case 1:
        tmpdefaultButton = Styles.MSGBOX_DEFAULT_BUTTON_1;
        break;
      case 2:
        tmpdefaultButton = Styles.MSGBOX_DEFAULT_BUTTON_2;
        break;
      case 3:
        tmpdefaultButton = Styles.MSGBOX_DEFAULT_BUTTON_3;
        break;
      default:
        break;
    }
    return tmpdefaultButton;
  }

  /// <summary>
  ///   Set Verify Operation Return Value
  /// </summary>
  static setoperVerifyReturnValue(returnValue: number, returnVal: Field): void {
    if (returnVal !== null) {
      let retValueNum: NUM_TYPE = new NUM_TYPE();

      retValueNum.NUM_4_LONG(returnValue);
      let returnValueStr: string = retValueNum.toXMLrecord();

      returnVal.setValueAndStartRecompute(returnValueStr, false, true, true, false);
      returnVal.updateDisplay();
    }
  }

  /// <summary>
  ///   execute Block
  /// </summary>
  /// <returns> boolean true
  /// </returns>
  private operBlock(): boolean {
    return true;
  }

  /// <summary>
  ///   execute else / elseif
  /// </summary>
  /// <returns> boolean true
  /// </returns>
  private operElse(): boolean {
    return true;
  }

  /// <summary>
  ///   execute Evaluate
  /// </summary>
  private operEvaluate(): void {
    let result: string = '\0';

    if (this._field !== null) {
      result = this._exp.evaluateWithResultTypeAndLength(this._field.getType(), this._field.getSize());
      this._field.setValueAndStartRecompute(result, result === null, true, true, false);
      this._field.updateDisplay();
    }
    else
      result = this._exp.evaluateWithResultTypeAndLength(StorageAttribute.BOOLEAN, 0);
  }

  /// <summary>
  ///   execute Update
  /// </summary>
  private operUpdate(mprgCreator: Task): void {
    let result: string, oldVal, newVal, fieldVal;
    let setRecordUpdated: boolean;
    let recompute: boolean;
    let nOld: NUM_TYPE, nNew, nResult;

    let flowMonitor: FlowMonitorQueue = FlowMonitorQueue.Instance;
    flowMonitor.addFlowOperationUpdate(FlowMonitorInterface.FLWMTR_START);

    // for non-modifiable field go to the server, i.e. server can abort the task
    if (!this._field.DbModifiable && (this._task.getMode() !== Constants.TASK_MODE_CREATE)) {
      if (!this.CanModify(mprgCreator))
        return;
    }
    let fieldType: StorageAttribute = this._field.getType();

    // if this is an incremental update
    if (this._incremental) {
      if (!this._field.IsLinkField) {
        fieldVal = this._field.getValue(true);
        nResult = (fieldVal != null
          ? new NUM_TYPE(fieldVal)
          : null);

        // subtract the old value if not in create mode
        if (this._task.getMode() !== Constants.TASK_MODE_CREATE) {

          // indicate we are evaluating the old value of the fields
          this._task.setEvalOldValues(true);
          oldVal = (this._field.isNull()
            ? this._field.getMagicDefaultValue()
            : this._exp.evaluateWithResultTypeAndLength(fieldType, this._field.getSize()));
          this._task.setEvalOldValues(false);
          nOld = new NUM_TYPE(oldVal);
          nResult = NUM_TYPE.sub(nResult, nOld);
        }

        if (this._task.getMode() !== Constants.TASK_MODE_DELETE) {
          newVal = this._exp.evaluateWithResultTypeAndLength(fieldType, this._field.getSize());
          if (newVal != null) {
            nNew = new NUM_TYPE(newVal);
            nResult = NUM_TYPE.add(nResult, nNew);
          }
          else
            nNew = nResult = null;
        }
        if (nResult != null)
          result = nResult.toXMLrecord();
        else
          result = this._field.getMagicDefaultValue();
      }
      else {
        /* If the incremental update is for a link field, go to server. */
        /* This is required to be done on server because on client, we do */
        /* not have the reference to the old link record. */
        /* And for incremental update, we need to work on 2 records as in */
        /* case of QCR# 900738.                                           */
        this.operServer(mprgCreator);
        return;
      }
    }
    // end of  incremental update
    else
      result = this._exp.evaluateWithResultTypeAndLength(fieldType, this._field.getSize());

    // QCR 746053 if the cells type don't match throw error
    if (fieldType === StorageAttribute.BLOB_VECTOR)
      if (result != null)
        result = Operation.operUpdateVectors(this._field, result);

    recompute = (this._field.getTask() === this._task);
    setRecordUpdated = (!recompute || !this._undo);
    this._field.setValueAndStartRecompute(result, result == null, true, setRecordUpdated, false);
    if (!this._undo)
      this._field.setUpdated();

    // QCR # 270949 : If field is updated with update operation, modified flag should be set in order to cause re-compute.
    this._field.setModified();

    this._field.updateDisplay();
    flowMonitor.addFlowOperationUpdate(FlowMonitorInterface.FLWMTR_END);
  }

  /// <summary>
  /// can a non-modifiable field be modified. the way to get the answer depends on the local/remote dataview
  /// </summary>
  /// <param name="mprgCreator">true if the field may be modified and the calling method should continue</param>
  /// <returns></returns>
  private CanModify(mprgCreator: Task): boolean {
    let execOperCommand: ExecOperCommand = ((this._cmdToServer instanceof ExecOperCommand) ? <ExecOperCommand>this._cmdToServer : null);

    execOperCommand.Operation = this;
    execOperCommand.MprgCreator = mprgCreator;
    return (this.Task.DataviewManager.Execute(this._cmdToServer)).Success;
  }

  /// <summary>
  ///   updates the data content of a vector without changing its header data
  ///   such as cell type and size - is used only in update operations between vectors
  ///   for example vectors of alpha with cell size the differ or vector of memo with vector of alpha
  /// </summary>
  /// <param name = "vec">the flat representation of the the new vector
  ///   field the field to be updated
  /// </param>
  /// <returns> a flat representation of the updated vector after the Update</returns>
  static operUpdateVectors(field: Field, vec: string): string {
    let result: string = null;
    if (field.getType() === StorageAttribute.BLOB_VECTOR) {
      let cellsAttr: StorageAttribute = VectorType.getCellsAttr(vec);
      let cellsType: StorageAttribute = field.getCellsType();

      if (StorageAttributeCheck.isTheSameType(cellsAttr, cellsType)) {
        let newVec: VectorType = new VectorType(vec);
        newVec.adjustToFit(field);
        return newVec.toString();
      }
      return result;
    }
    throw new ApplicationException("in operUpdateVectors " + field.getName() + " is not of type vector");
  }

  /// <summary>
  ///   execute Invoke OS
  /// </summary>
  private operInvokeOS(): void {
    let command: string;
    let retCode: number;

    if (this._exp == null)
      command = this._text;
    else
      command = this._exp.evaluateWithResultTypeAndLength(StorageAttribute.ALPHA, 2048);

    command = ClientManager.Instance.getEnvParamsTable().translate(command);
    let wait: boolean = this._waitExp.getVal();

    let errMsg: RefParam<string> = new RefParam<string>(null);
    let exitCode: RefParam<number> = new RefParam<number>(null);
    retCode = ProcessLauncher.InvokeOS(command, wait, this._show, errMsg, exitCode);

    if (retCode === 0)
      retCode = exitCode.value;
    if (errMsg != null) {
      Manager.WriteToMessagePane(<Task>this._task.GetContextTask(), errMsg.value, false);
      FlowMonitorQueue.Instance.addFlowInvokeOsInfo(errMsg.value);
      Logger.Instance.WriteExceptionToLogWithMsg(errMsg.value);
    }

    /* Set the field with the result. */
    if (this._field != null) {
      let returnVal: string;

      let retCodeNum = new NUM_TYPE();
      retCodeNum.NUM_4_LONG(retCode);
      returnVal = retCodeNum.toXMLrecord();

      this._field.setValueAndStartRecompute(returnVal, false, true, true, false);
      this._field.updateDisplay();
    }
  }

  /// <summary>
  ///   execute Raise Event
  /// </summary>
  /// <param name = "mprgCreator">if the operation belongs to a main program it points to the task which
  ///   caused the main program to become active. Otherwise it's false.
  /// </param>
  /// <param name = "returnedFromServer">indicates whether we just came back from the server to be passed to ClientManager.Instance.EventsManager.handleEvent()</param>
  private operRaiseEvent(mprgCreator: Task, returnedFromServer: boolean): void {

    let immediate: boolean = this.Immediate();

    // create a new run time event using the original as template
    let aRtEvt: RunTimeEvent = this._rtEvt.replicate();
    aRtEvt.setPublicName();

    aRtEvt.setImmediate(immediate);
    aRtEvt.setMainPrgCreator(null);

    if (immediate) {
      aRtEvt.setCtrl(<MgControl>this._task.getLastParkedCtrl());
      aRtEvt.setArgList(this._argList);

      if (aRtEvt.getTask().isMainProg())
        aRtEvt.setMainPrgCreator(mprgCreator);

      ClientManager.Instance.EventsManager.pushExecStack(this._task.getTaskTag() , this._evtHandler.getId().toString() , this._serverId);
      ClientManager.Instance.EventsManager.handleEvent(aRtEvt, returnedFromServer);
      ClientManager.Instance.EventsManager.popExecStack();
    }
    else {
      // send arguments by value
      aRtEvt.setArgList(new ArgumentsList(this._argList));
      aRtEvt.setTask(null);
      ClientManager.Instance.EventsManager.addToTail(aRtEvt);
    }
  }

  /// <summary>
  ///   execute browser Call operation
  /// </summary>
  /// <param name = "mprgCreator">if the operation belongs to a main program it points to the task which
  ///   caused the main program to become active. Otherwise it's false.
  /// </param>
  private operCall(mprgCreator: Task): void {
    this.operServer(mprgCreator);
  }

  /// <summary>
  ///   execute Server operation
  /// </summary>
  /// <param name = "mprgCreator">if the operation belongs to a main program it points to the task which
  ///   caused the main program to become active. Otherwise it's false.
  /// </param>
  operServer(mprgCreator: Task): void {
    let command: ExecOperCommand = ((this._cmdToServer instanceof ExecOperCommand) ? <ExecOperCommand>this._cmdToServer : null);
    Debug.Assert(command !== null);
    if (this._task.isMainProg())
      command.MprgCreator = mprgCreator;
    else
      command.MprgCreator = null;

    command.SetExecutionStack(ClientManager.Instance.EventsManager.getExecStack());
    command.Operation = this;
    ClientManager.Instance.execRequestWithSubformRecordCycle(this._task.getMGData().CmdsToServer, this._cmdToServer, null);
  }

  /// <summary>
  ///   returns the value of the Block End index
  /// </summary>
  getBlockEnd(): number {
    return this._blockEnd;
  }

  /// <summary>
  ///   sets the value of the Block End index
  /// </summary>
  setBlockEnd(val: number): void {
    this._blockEnd = val;
  }

  /// <summary>
  ///   returns the value of the Block Close index
  /// </summary>
  getBlockClose(): number {
    return this._blockClose;
  }

  /// <summary>
  ///   sets the value of the Block Close index
  /// </summary>
  setBlockClose(val: number): void {
    this._blockClose = val;
  }

  getTaskTag(): string {
    return this._task.getTaskTag();
  }

  getHandlerId(): string {
    return this._evtHandler.getId().toString();
  }

  getExecOnServer(): boolean {
    return this._execOnServer;
  }

  /// <summary>
  /// </summary>
  /// <param name = "handler"></param>
  /// <returns></returns>
  private checkFlowForHandler(handler: EventHandler): boolean {
    let internalEvent: number;
    let handlerEvt: Event = handler.getEvent();
    switch (handlerEvt.getType()) {
      case ConstInterface.EVENT_TYPE_INTERNAL:
        internalEvent = handlerEvt.getInternalCode();

        // return TRUE for all internal action (like Zoom) handlers except...
        if (internalEvent !== InternalInterface.MG_ACT_TASK_PREFIX &&
          internalEvent !== InternalInterface.MG_ACT_TASK_SUFFIX &&
          internalEvent !== InternalInterface.MG_ACT_REC_PREFIX &&
          internalEvent !== InternalInterface.MG_ACT_REC_SUFFIX &&
          internalEvent !== InternalInterface.MG_ACT_CTRL_PREFIX &&
          internalEvent !== InternalInterface.MG_ACT_CTRL_SUFFIX &&
          internalEvent !== InternalInterface.MG_ACT_VARIABLE)
          return true;
        break;
      case ConstInterface.EVENT_TYPE_SYSTEM:
      case ConstInterface.EVENT_TYPE_USER:
        return true;
    }
    return false;
  }

  /// <summary>
  /// </summary>
  /// <param name = "handler"></param>
  /// <returns></returns>
  private checkDirForHandler(handler: EventHandler): boolean {
    let internalEvent: number;
    let handlerEvt: Event = handler.getEvent();

    switch (handlerEvt.getType()) {
      case ConstInterface.EVENT_TYPE_INTERNAL:
        internalEvent = handlerEvt.getInternalCode();

        // return TRUE for all internal action (like Zoom) handlers except...
        if (internalEvent !== InternalInterface.MG_ACT_TASK_PREFIX &&
          internalEvent !== InternalInterface.MG_ACT_TASK_SUFFIX &&
          internalEvent !== InternalInterface.MG_ACT_REC_PREFIX &&
          internalEvent !== InternalInterface.MG_ACT_REC_SUFFIX &&
          internalEvent !== InternalInterface.MG_ACT_VARIABLE)
          return true;
        break;
      case ConstInterface.EVENT_TYPE_SYSTEM:
      case ConstInterface.EVENT_TYPE_USER:
        return true;
    }
    return false;
  }

  /// <summary>
  ///   checks if the operation can be executed or not
  /// </summary>
  /// <returns></returns>
  private canExecute(): boolean {
    let canExecute: boolean = false;
    let checkFlow: boolean = this.checkFlowForHandler(this._evtHandler);
    let checkDir: boolean = this.checkDirForHandler(this._evtHandler);

    let taskDirection: Task_Direction = this._task.getDirection();
    let taskFlowMode: Task_Flow = this._task.getFlowMode();

    // Oper can execute if Condition is true and operation flow matches the flow of task
    if (this.getCondVal()) {
      let validFlow: boolean = false, validDir = false;

      // set task dir to forward if none
      if (taskDirection === Task_Direction.NONE)
        taskDirection = Task_Direction.FORE;

      // set task flow mode to step if none
      if (taskFlowMode === Task_Flow.NONE)
        taskFlowMode = Task_Flow.STEP;

      if (checkDir) {
        switch (this._operDirection) {
          case FlowDirection.Combined:
            validDir = true;
            break;
          case FlowDirection.Forward:
            validDir = (taskDirection === Task_Direction.FORE) ? true : false;
            break;
          case FlowDirection.Backward:
            validDir = (taskDirection === Task_Direction.BACK) ? true : false;
            break;
        }
      }
      else
        validDir = true;

      // if direstion is valid, check for flow
      if (validDir) {
        if (checkFlow) {
          switch (this._operFlowMode) {
            case FlwMode.Combine:
              validFlow = true;
              break;
            case FlwMode.Fast:
              validFlow = taskFlowMode === Task_Flow.FAST;
              break;
            case FlwMode.Step:
              validFlow = taskFlowMode === Task_Flow.STEP;
              break;
          }
        }
        else
          validFlow = true;
      }
      canExecute = validFlow && validDir;
    }
    return canExecute;
  }

  /// <summary>
  /// </summary>
  /// <param name = "buffer"></param>
  /// <returns></returns>
  public AddFlowDescription(buffer: StringBuilder): void {
    switch (this._type) {
      case ConstInterface.MG_OPER_VERIFY:
        buffer.Append("Verify: ");
        if (this._exp == null)
          buffer.Append(this._text);
        else buffer.Append("Exp #").Append(this._exp.getId());
        break;
      case ConstInterface.MG_OPER_BLOCK:
        buffer.Append("Block If");
        break;
      case ConstInterface.MG_OPER_LOOP:
        buffer.Append("Block Loop");
        break;
      case ConstInterface.MG_OPER_ELSE:
        buffer.Append("Block Else");
        break;
      case ConstInterface.MG_OPER_EVALUATE:
        buffer.Append("Evaluate Exp #").Append(this._exp.getId());
        break;
      case ConstInterface.MG_OPER_UPDATE:
        buffer.AppendFormat(null, "Update {0} with Exp #{1}", this._field.getVarName(), this._exp.getId());
        break;
      case ConstInterface.MG_OPER_ENDBLOCK:
        buffer.Append("End Block");
        break;
      case ConstInterface.MG_OPER_USR_EXIT:
        buffer.Append("Invoke OS");
        break;
      case ConstInterface.MG_OPER_RAISE_EVENT:
        buffer.Append("Raise Event:");
        this._rtEvt.AppendDescription(buffer);
        buffer.AppendFormat(null, " (Wait={0})", (this.Immediate() ? 'Y' : 'N'));
        break;
      case ConstInterface.MG_OPER_SERVER:
        buffer.Append("Run server-side operation");
        break;
      case ConstInterface.MG_OPER_CALL:
        buffer.Append("Call program");
        break;
      default:
        buffer.AppendFormat(null, "<<Unknown Operation Code {0}>>", this._type);
        break;
    }
  }

  /// <summary>
  ///
  /// </summary>
  /// <returns></returns>
  GetArgList(): ArgumentsList {
    return this._argList;
  }

  /// <summary>
  ///
  /// </summary>
  /// <returns></returns>
  GetReturnValueField(): Field {
    return this._field;
  }

  /// <summary>
  ///  returns subform control name for call with destination
  /// </summary>
  /// <returns></returns>
  GetSubformControlName(): string {
    return this._subformCtrlName;
  }
}
