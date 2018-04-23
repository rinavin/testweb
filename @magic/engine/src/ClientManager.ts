import {
  ApplicationException,
  DateTime,
  Debug,
  Exception,
  List,
  NNumber,
  NString,
  RefParam,
  StringBuilder
} from "@magic/mscorelib";

import {
  DateTimeUtils,
  InternalInterface,
  Logger,
  Logger_LogLevels,
  Misc,
  XMLConstants,
  XmlParser,
  MgControlType
} from "@magic/utils";
import {
  GuiConstants, ITask, KeyboardItem, Manager, MgFormBase, Modifiers, RuntimeContextBase, UIBridge, Events,
  MgControlBase, LastFocusedVal, PIC
} from "@magic/gui";
import {GuiEventsProcessor} from "./GuiEventsProcessor";
import {Environment} from "./env/Environment";
import {LanguageData} from "./env/LanguageData";
import {KeyboardMappingTable} from "./env/KeyboardMappingTable";
import {EnvParamsTable} from "./env/EnvVariablesTable";
import {GlobalParams} from "./exp/GlobalParamsTable";
import {TasksTable} from "./tasks/TasksTable";
import {TableCacheManager} from "./rt/TableCacheManager";
import {MgProperties} from "./util/MgProperties";
import {EventsAllowedType, EventsManager} from "./event/EventsManager";
import {MgControl} from "./gui/MgControl";
import {CreatedFormVector} from "./gui/CreatedFormVector";
import {IClientCommand} from "./commands/IClientCommand";
import {OpeningTaskDetails, Task} from "./tasks/Task";
import {IResultValue} from "./rt/IResultValue";
import {MGDataCollection} from "./tasks/MGDataCollection";
import {GUIManager} from "./GUIManager";
import {MgForm} from "./gui/MgForm";
import {Scrambler} from "./util/Scrambler";
import {RunTimeEvent} from "./event/RunTimeEvent";
import {UniqueIDUtils} from "./util/UniqueIDUtils";
import {HttpManager} from "./http/HttpManager";
import {CommandsTable} from "./CommandsTable";
import {Field} from "./data/Field";
import {IClientTargetedCommand} from "./commands/IClientTargetedCommand";
import {RemoteCommandsProcessor} from "./remote/RemoteCommandsProcessor";
import {ConstInterface} from "./ConstInterface";
import {
  CommandsProcessorBase,
  CommandsProcessorBase_SendingInstruction,
  CommandsProcessorBase_SessionStage
} from "./CommandsProcessorBase";
import {CommandsProcessorManager} from "./CommandsProcessorManager";
import {Expression} from "./exp/Expression";
import {MGData} from "./tasks/MGData";
import {ServerError} from "./remote/ServerError";
import {HttpClientEvents} from "./http/client/HttpClientEvents";
import {Http} from "@angular/http";
import {isNullOrUndefined} from "util";
import {GuiEvent} from "./bridge/GuiEvent"

// @dynamic
export class ClientManager {
  private _guiEventsProcessor: GuiEventsProcessor = null;

  // KEYBOARD EVENTS CONSTANTS
  readonly KBI_DOWN: KeyboardItem = null;
  readonly KBI_UP: KeyboardItem = null;

  /// <summary> Singleton members
  /// 1. DON'T change ORDER of calling the constructors in the singleton objects!
  /// 2. Must be created BEFORE the ClientManager class members
  /// </summary>
  private _runtimeCtx: RuntimeContextBase = null;
  get RuntimeCtx(): RuntimeContextBase {
    return this._runtimeCtx;
  }

  private _eventsManager: EventsManager = null;
  get EventsManager(): EventsManager {
    return this._eventsManager;
  }

  private _environment: Environment = null;
  private _languageData: LanguageData = null;
  private _keybMapTab: KeyboardMappingTable = null;
  private _envParamsTable: EnvParamsTable = null;
  private _unframedCmds: List<IClientCommand> = null;
  private _CommandsExecutedAfterTaskStarted: List<IClientTargetedCommand> = null;
  private _globalParams: GlobalParams = null;

  private _cmdFrame: number = 0;

  private _lastFocusedTasks: TasksTable = null; // array of tasks in focus per window
  private _idleTimerStarted: boolean = false;

  private _variableChangeEvts: List<Field | RunTimeEvent> = null; // for Variable Change event execution

  private _tableCacheManager: TableCacheManager = null;
  private _inIncrementalLocate: boolean = false;
  private _delayInProgress: boolean = false;  // true if delay is in progress

  private static _instance: ClientManager = null;
  private _serverUrl: URL = null;
  private _server: string = null;
  private _protocol: string = null;
  private _httpReq: string = null;
  private _appName: string = null;
  private _prgName: string = null; // the public name of the program for which the current session is started.
  private _prgDescription: string = null; // the name of the program (passed from studio and is used to identify the executed program in case it doesn't have a public name).
  private _prgArgs: string = null;
  private _localId: string = null;
  private _debugClient: string = null;
  private _executionProps: MgProperties = null;
  private _globalUniqueSessionId: string = null;

  LastActionTime: number = 0; // time of last user action for IDLE function
  ReturnToCtrl: MgControl = null;

  _moveByTab: boolean = false;
  get MoveByTab(): boolean {
    return this._moveByTab;
  }

  _createdForms: CreatedFormVector = null;
  get CreatedForms(): CreatedFormVector {
    return this._createdForms;
  }

  StartProgLevel: number = 0;  // recursive level of "startProg" invocations

  /// <summary>
  /// When true, requests are scrambled and responses are unscrambled.
  /// </summary>
  private _shouldScrambleAndUnscrambleMessages: boolean = false;
  set ShouldScrambleAndUnscrambleMessages(value: boolean) {
    this._shouldScrambleAndUnscrambleMessages = value;
    Logger.Instance.WriteServerMessagesToLog(NString.Format("ShouldScrambleAndUnscrambleMessages.Set: {0}", this._shouldScrambleAndUnscrambleMessages));
  }
  get ShouldScrambleAndUnscrambleMessages(): boolean {
    Logger.Instance.WriteServerMessagesToLog(NString.Format("ShouldScrambleAndUnscrambleMessages.Get: {0}", this._shouldScrambleAndUnscrambleMessages));
    return this._shouldScrambleAndUnscrambleMessages;
  }

  static _startedFromStudio: boolean = false;
  static get StartedFromStudio(): boolean {
    return this._startedFromStudio;
  }

  ErrorToBeWrittenInServerLog: string = null;
  private static readonly _executionPropertiesFileName: string = "/assets/execution.properties";  // path of the execution properties file from assets folder

  get IgnoreControl(): boolean {
    return false;
  }

  static get Instance(): ClientManager {
    if (ClientManager._instance === null)
      ClientManager._instance = new ClientManager();

    return ClientManager._instance;
  }

  /// <summary> get singleton Environment object</summary>
  getEnvironment(): Environment {
    return this._environment;
  }

  /// <summary> Returns language data</summary>
  getLanguageData(): LanguageData {
    return this._languageData;
  }

  /// <summary> Returns the keyboard mapping</summary>
  getKbdMap(): KeyboardMappingTable {
    return this._keybMapTab;
  }

  /// <summary> get singleton Environment variables object</summary>
  getEnvParamsTable(): EnvParamsTable {
    return this._envParamsTable;
  }

  /// <summary> get singleton global parameters object</summary>
  getGlobalParamsTable(): GlobalParams {
    return this._globalParams;
  }

  /// <summary> get commands which are not in a frame</summary>
  getUnframedCmds(): List<IClientCommand> {
    return this._unframedCmds;
  }

  /// <summary> add 1 to cmdFrame counter</summary>
  add1toCmdFrame(): void {
    this._cmdFrame++;
  }

  /// <summary> get cmdFrame counter</summary>
  getCmdFrame(): number {
    return this._cmdFrame;
  }

  /// <summary> adds a command to the list of commands which are not attached to any window yet</summary>
  addUnframedCmd(cmd: IClientCommand): void {
    this._unframedCmds.push(cmd);
  }

  /// <summary> adds a command to the list of commands which are to be executed after task started.</summary>
  addCommandsExecutedAfterTaskStarted(cmd: IClientTargetedCommand): void {
    this._CommandsExecutedAfterTaskStarted.push(cmd);
  }

  /// <summary> get commands which are to be executed after task started</summary>
  getCommandsExecutedAfterTaskStarted(): List<IClientTargetedCommand> {
    return this._CommandsExecutedAfterTaskStarted;
  }

  /// <summary> remove a command from the list</summary>
  removeCommandsExecutedAfterTaskStarted(cmd: IClientTargetedCommand): void {
    this._CommandsExecutedAfterTaskStarted.Remove(cmd);
  }

  /// <summary> check if the return-to-control points to an existing task.</summary>
  validReturnToCtrl(): boolean {
    if (this.ReturnToCtrl !== null && (<Task>this.ReturnToCtrl.getForm().getTask()).isAborting())
      return false;

    return true;
  }


  public AddEvent(guiEvent: GuiEvent): void {
    let task: Task = MGDataCollection.Instance.getCurrMGData().getTask(guiEvent.TaskID);
    let lineIdx: number = +guiEvent.Line;

    if (task === null && guiEvent.EventType === "RouterNavigate")
      task = this.getLastFocusedTask();

    if (task != null) {
      let control: MgControlBase = null;

      if (guiEvent.ControlName !== null)
        control = task.getForm().GetCtrl(guiEvent.ControlName);

      if (control != null) {
        switch (guiEvent.EventType) {

          case "columnSort":
            if (control.isColumnSortable()) {
              Events.OnColumnClick(control, guiEvent.Line, guiEvent.ControlName);
            }
            break;
          case "click":
            if (control.isButton())
              Events.OnSelection("", control, lineIdx, true);
            // sorting should be handled only on column click and not on rowData
            // else if (control.Type === MgControlType.CTRL_TYPE_COLUMN) {
            //   Events.OnColumnClick(control, guiEvent.Line, guiEvent.ControlName);
            // }
            else {
              if (control.Type === MgControlType.CTRL_TYPE_TEXT || control.Type === MgControlType.CTRL_TYPE_LABEL || control.Type === MgControlType.CTRL_TYPE_IMAGE)
                Events.OnFocus(control, lineIdx, true, false);
              let produceClick: boolean = control.isButton() || control.isTextControl() || control.isLabel() || control.isTabControl() || control.isTableControl() || control.isComboBox() || control.isImageControl();
              Events.OnMouseDown(control.getForm(), control, null, true, lineIdx, false, produceClick);
            }
            break;
          case "focus":
            Events.OnFocus(control, lineIdx, true, false);
            break;
          case "mouseenter":
            Events.OnMouseOver(control);
            break;
          case "mouseleave":
            Events.OnMouseOut(control);
            break;
          case "dblclick":
            Events.OnDblClick(control, lineIdx);
            break;
          case "selectionchanged":
            Events.OnSelection(guiEvent.Value, control, lineIdx, true);
            break;
          default:
            console.log("unhandled event: \"" + guiEvent.EventType + "\"");
            break;
        }
      }
      else {
        switch (guiEvent.EventType) {
          case "close":
            Events.CloseFormEvent(task.getForm());
            break;
          case "resize":
            Events.TableResizeEvent(task.getForm().getTableCtrl(), guiEvent.PageSize);
          case "getRows":
            let lastFocusedVal: LastFocusedVal = {guiMgControl: task.getForm().getTableCtrl(), Line: lineIdx, Val: ""};
            Events.OnGetRowsData(task.getForm().getTableCtrl(), lineIdx, false, lastFocusedVal);
            break;
          case "RouterNavigate":
            this.EventsManager.AddRouteEvent(task, InternalInterface.MG_ACT_WEBCLIENT_ROUTE, guiEvent.RouterPath, guiEvent.RouterOutletName,
                      guiEvent.RouterParams);
            break;
          default:
            console.log( "unhandled event: \"" + guiEvent.EventType + "\"");
            break;
        }
      }

      this._eventsManager.handleGUIEvent(task.getMGData());
    }
  }



  /// <summary>parse the log level from a string value</summary>
  /// <param name="strLogLevel">string value of the log level</param>
  /// <returns>log level</returns>
  parseLogLevel(strLogLevel: string): Logger_LogLevels {
    let logLevel: Logger_LogLevels = Logger_LogLevels.None;

    if (!NString.IsNullOrEmpty(strLogLevel)) {
      if (strLogLevel.toUpperCase().startsWith( "SERVER"))
        logLevel = strLogLevel.endsWith("#") ? Logger_LogLevels.ServerMessages : Logger_LogLevels.Server; // only requests to the server
      else if (strLogLevel.toUpperCase().startsWith("S") || strLogLevel.toUpperCase().startsWith("Q"))
        logLevel = Logger_LogLevels.Support;
      else if (strLogLevel.toUpperCase().startsWith("G"))
        logLevel = Logger_LogLevels.Gui;
      else if (strLogLevel.toUpperCase().startsWith("D"))
        logLevel = Logger_LogLevels.Development;
      else if (strLogLevel.toUpperCase().startsWith("B"))
        logLevel = Logger_LogLevels.Basic;
    }

    return logLevel;
  }

  /// <summary>parse a response (from the Server) and execute commands if returned within the response.</summary>
  /// <param name="response">(XML formatted) response.</param>
  /// <param name="currMgdID">number of window in global array</param>
  /// <param name="openingTaskDetails">additional information of opening task</param>
  /// <param name="res">result to be read from command returned witin the response.</param>
  ProcessResponse(response: string, currMgdID: number, openingTaskDetails: OpeningTaskDetails, res: IResultValue): void {
    Logger.Instance.WriteDevToLog("<-- ProcessResponse started -->");

    let systemMilliseconds: number = Misc.getSystemMilliseconds();
    if (response === null || response.trim().length === 0)
      return;

    let mgDataTab: MGDataCollection = MGDataCollection.Instance;
    mgDataTab.currMgdID = currMgdID;

    this.RuntimeCtx.Parser.push(); // allow recursive parsing
    this.RuntimeCtx.Parser.setXMLdata(response);
    this.RuntimeCtx.Parser.setCurrIndex(0);

    let currMGData: MGData = mgDataTab.getCurrMGData();
    currMGData.fillData(openingTaskDetails);

    // free memory
    this.RuntimeCtx.Parser.setXMLdata(null);
    this.RuntimeCtx.Parser.pop();

    Logger.Instance.WriteDevToLog("<-- ProcessResponse finished --> (" + (Misc.getSystemMilliseconds() - systemMilliseconds) + ")");
    // execute the commands that were returned in the response
      currMGData.CmdsToClient.Execute(res);
      this.ProcessRecovery();
  }

  /// <summary>
  /// processRecovery
  /// </summary>
  ProcessRecovery(): void {
    let mgDataTab: MGDataCollection = MGDataCollection.Instance;

    // QCR #771012 - process data error recovery only after the parsing process is over.
    this.EventsManager.pushNewExecStacks();
    mgDataTab.processRecovery();
    this.EventsManager.popNewExecStacks();
  }

  /// <summary>
  /// execute component's main program
  /// </summary>
  /// <param name="callByDestSubForm"></param>
  /// <param name="moveToFirstControl"></param>
  /// <returns>the non interactive task if any that executed</returns>
  ExecuteComponentMainPrograms(callByDestSubForm: boolean, moveToFirstControl: boolean): Task {
    let mgDataTab: MGDataCollection = MGDataCollection.Instance;
    let currentNonInteractiveTask: RefParam<Task> = new RefParam(null);
    let nonInteractiveTaskAlreadyExecuted: RefParam<Task> = new RefParam(null);

    let maxCtlIdx: number = mgDataTab.getMGData(0).getMaxCtlIdx();

    for (let i: number = 1; i <= maxCtlIdx; i = i + 1) {
      let componentMainProgram: Task = mgDataTab.GetMainProgByCtlIdx(i);

      if (componentMainProgram !== null)
        ClientManager.ExecuteMainProgram(i, callByDestSubForm, moveToFirstControl, currentNonInteractiveTask, nonInteractiveTaskAlreadyExecuted);
    }

    return nonInteractiveTaskAlreadyExecuted.value;
  }

  /// <summary>
  /// execute main program of CtlIndex
  /// </summary>
  /// <param name="CtlIndex"></param>
  /// <param name="callByDestSubForm"></param>
  /// <param name="moveToFirstControl"></param>
  /// <param name="currentNonInteractiveTask"></param>
  /// <param name="nonInteractiveTaskAlreadyExecuted"></param>
  private static ExecuteMainProgram(CtlIndex: number, callByDestSubForm: boolean, moveToFirstControl: boolean, currentNonInteractiveTask: RefParam<Task>, nonInteractiveTaskAlreadyExecuted: RefParam<Task>): void {
    let mainProgramTask: Task = MGDataCollection.Instance.GetMainProgByCtlIdx(CtlIndex);

    Logger.Instance.WriteDevToLog(NString.Format("  ClientManager.startProg: ctlIdx={0}, task={1}", CtlIndex, mainProgramTask));

    currentNonInteractiveTask.value = <Task>(mainProgramTask.Start(moveToFirstControl, callByDestSubForm));
    if (nonInteractiveTaskAlreadyExecuted.value)
      nonInteractiveTaskAlreadyExecuted.value = currentNonInteractiveTask.value;
    else if (currentNonInteractiveTask.value !== null) {
      Debug.Assert(false, "more than 1 non interactive tasks in startProg");
    }
  }

  /// <summary>
  /// start the execution of the program and set focus to the first control.
  /// </summary>
  StartProgram(callByDestSubForm: boolean, moveToFirstControl: boolean): Task {
    let orgStopExecution: boolean = this.EventsManager.GetStopExecutionFlag();
    let nonInteractiveTaskAlreadyExecuted: Task = null;
    let allowEvents: EventsAllowedType = this.EventsManager.getAllowEvents();
    this.EventsManager.setAllowEvents(EventsAllowedType.ALL);

    Logger.Instance.WriteDevToLog("Start \"startProg\"");

    this.StartProgLevel++;
    this.EventsManager.setStopExecution(false); // QCR #769734 - nothing can stop a task from starting up.

    // Fixed bug #283647 execute components main programs -  in the server we execute the same see ini.cpp method execute_main_progs()
    nonInteractiveTaskAlreadyExecuted = this.ExecuteComponentMainPrograms(callByDestSubForm, moveToFirstControl);

    let mgDataTab: MGDataCollection = MGDataCollection.Instance;
    // execute internal main programs
    let nonInteractiveTaskAlreadyExecutedRef: RefParam<Task> = new RefParam(nonInteractiveTaskAlreadyExecuted);
    let currentNonInteractiveTaskRef: RefParam<Task> = new RefParam(null);
    ClientManager.ExecuteMainProgram(0, callByDestSubForm, moveToFirstControl, nonInteractiveTaskAlreadyExecutedRef, currentNonInteractiveTaskRef);
    nonInteractiveTaskAlreadyExecuted = nonInteractiveTaskAlreadyExecutedRef.value;

    if (!this._idleTimerStarted) {
      GUIManager.Instance.startTimer(mgDataTab.getMGData(0), this._environment.getIdleTime(0), true);
      this._idleTimerStarted = true;
    }

    this.OpenForms(callByDestSubForm);
    this.DoFirstRecordCycle();
    this.MoveToFirstControls(callByDestSubForm);

    // Handle the events only when all the tasks and their forms are opened.
    if (this.StartProgLevel === 1) {
      let resetAllowEvents: boolean = false;
      let canExecuteEvents: boolean = true;

      // set the within non interactive since the handleEvents might try to execute an event
      // that was raised in the 1st rec pref (added in moveToFirstcontrols).
      if (nonInteractiveTaskAlreadyExecuted !== null && nonInteractiveTaskAlreadyExecuted.isStarted()) {
        resetAllowEvents = true;
        this.EventsManager.setNonInteractiveAllowEvents(nonInteractiveTaskAlreadyExecuted.isAllowEvents(), nonInteractiveTaskAlreadyExecuted);

        // non interactive task with allow events = NO is about to run.
        // don't try to execute the events before it starts because they will be lost. (#138493)
        canExecuteEvents = nonInteractiveTaskAlreadyExecuted.isAllowEvents();
      }

      // if the it is a subform with visibility expression evaluated to TRUE,
      // so after return from the server do not execute events from the queue.
      // These events will be executed from the 'startProg' of the parent task.
      if (this.getLastFocusedTask() !== null && canExecuteEvents) {
        this.EventsManager.pushNewExecStacks();
        this.EventsManager.handleEvents(mgDataTab.getCurrMGData(), 0);
        this.EventsManager.popNewExecStacks();
      }

      // restore. just to be on the safe side. it will be set again once in the correct eventsLoop.
      if (resetAllowEvents)
        this.EventsManager.setAllowEvents(allowEvents);
    }

    this.StartProgLevel--;

    Logger.Instance.WriteDevToLog("End \"startProg\"");

    // If originally we were instructed to stop events execution, then restore this
    if (orgStopExecution && !this.EventsManager.GetStopExecutionFlag())
      this.EventsManager.setStopExecution(orgStopExecution);

    return nonInteractiveTaskAlreadyExecuted;
  }

  /// <summary> Open all the form that are pending in CreatedForms vector. </summary>
  OpenForms(callByDestSubForm: boolean): void {
    let createdForms: CreatedFormVector = ClientManager.Instance.CreatedForms;
    let outMostForm: MgFormBase = null;

    if (createdForms.Count() > 0) {
      let i: number = 0;
      while (i < createdForms.Count()) {
        let mgForm: MgForm = createdForms.get(i);
        let canOpen: boolean = false;

        // Open a subform only if its container form is Opened.
        // isCurrentStartProgLevel() doesn't go well for subforms (QCR #919119).
        if (mgForm.isSubForm()) {
          let opened: boolean = mgForm.getSubFormCtrl().getForm().Opened;
          if (opened) {
            canOpen = true;
          }
        }
        else {
          if ((<Task>mgForm.getTask()).isCurrentStartProgLevel()) {
            canOpen = true;
          }
        }

        if (canOpen) {
          Manager.OpenForm(mgForm);
          Manager.DoFirstRefreshTable(mgForm);
        }

        if (mgForm.Opened) {
          if (callByDestSubForm && mgForm.isSubForm())
            outMostForm = mgForm.getTopMostForm();

          createdForms.remove(mgForm);
        }
        else
          i++;
      }

      // non interactive cannot be subform anyways, don't ask about it.
      if (callByDestSubForm && outMostForm !== null)
        outMostForm.executeLayout();
    }
  }

  /// <summary>
  /// For every mgdata perform move to first control to the form
  /// that we marked before with MoveToFirstControl flag
  /// </summary>
  private MoveToFirstControls(callByDestSubForm: boolean): void {
    let mgDataTab: MGDataCollection = MGDataCollection.Instance;

    for (let i: number = 0; i < mgDataTab.getSize(); i++) {
      let mgd: MGData = mgDataTab.getMGData(i);

      if (mgd === null || mgd.IsAborting)
        continue;

      let tasksCount: number = mgd.getTasksCount();
      for (let j: number = 0; j < tasksCount; j++) {
        let task: Task = mgd.getTask(j);
        let mgForm: MgForm = <MgForm>task.getForm();

        if (task.isCurrentStartProgLevel() && mgForm !== null && mgForm.MovedToFirstControl) {
          mgForm.MovedToFirstControl = false;
          if (mgForm.IsMDIFrame)
            this.EventsManager.HandleNonParkableControls(task);
          else {
            this.EventsManager.pushNewExecStacks();
            mgForm.moveToFirstCtrl(false, !callByDestSubForm);
            this.EventsManager.popNewExecStacks();
            break;
          }
        }
      }
    }
  }

  /// <summary> build the XML string of the data that should be sent to the server</summary>
  /// <param name="serializeTasks">if true, tasks in the current execution will also be serialized.</param>
  PrepareRequest(serializeTasks: boolean): string {
    let xmlBuf: StringBuilder = new StringBuilder();
    xmlBuf.Append(XMLConstants.MG_TAG_OPEN);

    // the client no longer sends (and empties) the event queue to the server
    // since the server has nothing useful to do with the client pending events
    let mgDataTab: MGDataCollection = MGDataCollection.Instance;
    if (mgDataTab.getCurrMGData() !== null) {
      let xmlUnscrambled: StringBuilder = new StringBuilder();
      mgDataTab.buildXML(xmlUnscrambled, serializeTasks);

      if (this.ShouldScrambleAndUnscrambleMessages)
        xmlBuf.Append(Scrambler.Scramble(xmlUnscrambled.ToString()));
      else
        xmlBuf.Append(xmlUnscrambled.ToString());
    }
    xmlBuf.Append("</" + XMLConstants.MG_TAG_XML + XMLConstants.TAG_CLOSE);

    return xmlBuf.ToString();
  }

  /// <summary>
  /// the work thread's entry method
  /// </summary>
  WorkThreadExecution(): void {
    if (Logger.Instance.ShouldLog()) {
      Logger.Instance.WriteToLog("", true);
      Logger.Instance.WriteToLog("Started on " + DateTimeUtils.ToString(DateTime.Now, XMLConstants.ERROR_LOG_DATE_FORMAT), true);
      this.WriteExecutionPropertiesToLog();
    }

    try {
      if (CommandsProcessorManager.StartSession()) {
        let mgDataTab: MGDataCollection = MGDataCollection.Instance;
        let startupMgData: MGData = mgDataTab.StartupMgData;
        mgDataTab.currMgdID = startupMgData.GetId();

        let nonInteractiveTask: Task = null;
        if (!startupMgData.IsAborting)
          nonInteractiveTask = this.StartProgram(false, false);

        if (nonInteractiveTask === null)
          this.EventsManager.EventsLoop(startupMgData);
        else
          this.EventsManager.NonInteractiveEventsLoop(startupMgData, nonInteractiveTask);

        // set the "end of work" flag only for the main window
        this.EventsManager.setEndOfWork(true);
      }
    }
    catch (ex) {
      if (ex instanceof ApplicationException) {
        let isNoResultError: boolean = false;
        if (ex instanceof ServerError && (<ServerError>ex).GetCode() === ServerError.INF_NO_RESULT)
          isNoResultError = true;

        if (!isNoResultError)
          this.ProcessAbortingError(ex);

        this.EventsManager.setEndOfWork(true);
      }
      else
        throw ex;
    }
  }

  /// <summary>
  /// Checks if restart session is allowed. Session restart is not allowed for InvalidSourcesException,
  /// DataSourceConversionFailedException and few instances of ServerError.
  /// </summary>
  /// <param name="ex"></param>
  private AllowRestartSession(ex: Exception): boolean {
    let allowRestart: boolean = true;

    // don't allow restart:
    // 1. if Server error is RQMRI_ERR_LIMITED_LICENSE_CS, as this is a license restriction aimed to switch to Studio Mode.
    // 2. if Server error is RQMRI_ERR_INCOMPATIBLE_RIACLIENT, as there is no point in restart.
    // 3. if application sources are invalid or failed to convert data sources
    let serverError: ServerError = ((ex instanceof ServerError) ? <ServerError>ex : null);
    if (serverError !== null && (serverError.GetCode() === ServerError.ERR_LIMITED_LICENSE_CS || serverError.GetCode() === ServerError.ERR_INCOMPATIBLE_RIACLIENT))
      allowRestart = false;

    return allowRestart;
  }

  /// <summary>
  /// If a server error occurred, display a generic error message and instead of the message from the server.
  /// True by default.
  /// </summary>
  /// <returns></returns>
  ShouldDisplayGenericError(): boolean {
    let shouldDisplayGenericError: boolean = true;

    let displayGenericError: string = this._executionProps.getProperty(ConstInterface.DISPLAY_GENERIC_ERROR);

    if (displayGenericError !== null && NString.Compare(displayGenericError, "N", true))
      shouldDisplayGenericError = false;

    return shouldDisplayGenericError;
  }

  ProcessAbortingError(ex: ApplicationException): void {
    GUIManager.Instance.abort();

    let eMsg: string;
    if (ex instanceof ServerError)
      eMsg = (<ServerError>ex).GetMessage();
    else
      eMsg = ((ex.Message !== null) ? ex.Message : ex.GetType());

    if (ex.InnerException !== null)
      Logger.Instance.WriteExceptionToLog(ex.InnerException, ex.Message);
    else {
      if (!(ex instanceof ServerError) || Logger.Instance.LogLevel !== Logger_LogLevels.Basic) {
        Logger.Instance.WriteExceptionToLogWithMsg(eMsg);
      }
    }

    // TODO : handle errors
    // let num: number = 7;
    // let flag4: boolean = this.RuntimeCtx.ContextID !== -1;
    // MGDataCollection.Instance.currMgdID = 0;
    // let messageString: string = ClientManager.Instance.getMessageString(MsgInterface.BRKTAB_STR_ERROR);
    // let num2: number = 16;
    // let flag6: boolean = this.AllowRestartSession(ex);
    // if (flag6) {
    //   eMsg = eMsg + OSEnvironment.EolSeq + OSEnvironment.EolSeq + ClientManager.Instance.getMessageString(MsgInterface.STR_RESTART_SESSION);
    //   num2 = (num2 | 4);
    // }
    // let flag7: boolean = NString.StartsWith(ex.Message, "<HTML", );
    // if (flag7) {
    //   this.processHTMLContent(ex.Message);
    // }
    // else {
    //   num = Commands.messageBox(null, messageString, eMsg, num2);
    // }
    // let flag8: boolean = ex.InnerException !== null && ex.InnerException.GetType().FullName === "System.Net.WebException";
    // if (flag8) {
    //   let ex2: WebException = <WebException>ex.InnerException;
    //   let flag9: boolean = ex2.Status === WebExceptionStatus.ConnectFailure || ex2.Status === WebExceptionStatus.ProtocolError;
    //   if (flag9) {
    //     flag4 = false;
    //   }
    // }
    // let flag10: boolean = ex instanceof ServerError;
    // if (flag10) {
    //   let flag11: boolean = (<ServerError>ex).GetCode() === -197;
    //   if (flag11) {
    //     flag4 = false;
    //   }
    // }
    // let flag12: boolean = flag4;
    // if (flag12) {
    //   try {
    //     let cmd: IClientCommand = CommandFactory.CreateUnloadCommand();
    //     MGDataCollection.Instance.getMGData(0).CmdsToServer.Add(cmd);
    //     CommandsProcessorManager.GetCommandsProcessor().Execute(CommandsProcessorBase_SendingInstruction.TASKS_AND_COMMANDS);
    //   }
    //   catch (ex3) {
    //     if (ex3 instanceof ApplicationException) {
    //       Logger.Instance.WriteExceptionToLog(ex3);
    //     }
    //     else
    //       throw ex3;
    //   }
    // }
    // GUIManager.Instance.abort();
    // let flag13: boolean = num === 6;
    // if (flag13) {
    //   let flag15: boolean = this._executionProps.get_Item("CtxGroup") === NNumber.ToString(ClientManager.Instance.RuntimeCtx.ContextID);
    //   if (flag15) {
    //     this._executionProps.Remove("CtxGroup");
    //   }
    //   let stringBuilder: StringBuilder = new StringBuilder();
    //   this._executionProps.storeToXML(stringBuilder);
    //   let exeProps: string = HttpUtility.UrlEncode(stringBuilder.ToString(), Encoding.UTF8);
    //   Process.StartCurrentExecutable(exeProps);
    // }
  }

  processHTMLContent(htmlContent: string): void {
    // TODO: show HTML error
    // let currTask: Task = ClientManager.Instance.EventsManager.getCurrTask();
    // let flag: boolean = currTask !== null;
    // if (flag) {
    //   let rect: MgRectangle = new MgRectangle(0, 0, 0, 0);
    //   Commands.getBounds(currTask.getForm(), rect);
    // }
    // GUIManager.Instance.showContent(htmlContent);
  }

  /// <summary>
  /// Write Execution properties to log.
  /// </summary>
  WriteExecutionPropertiesToLog(): void {
    if (Logger.Instance.ShouldLogServerRelatedMessages()) {
      Logger.Instance.WriteToLog("-----------------------------------------------------------------------------", true);
      // Write heading
      Logger.Instance.WriteToLog("Execution Properties:", true);

      // Write property and its value.
      this._executionProps.Keys.forEach((key: string) => {
        let line: string;
        if (key.toLowerCase() ===  ConstInterface.MG_TAG_PASSWORD)
          line = NString.Format("{0,-35} : ***", key);
        else {
          let value: string = this._executionProps.get_Item(key);
          if (key.toLowerCase() === ConstInterface.REQ_PRG_NAME) {
            // If Public name is not given to the RC program then in log file write it's description as well as it's fictive internal name.
            // If Public name is given in log write it's internal name.
            let prgDescription: string = this.getPrgDescription();
            if (!NString.IsNullOrEmpty(prgDescription) && value !== prgDescription) {
              value = NString.Format("\"{0}\" (\"{1}\")", prgDescription, value);
            }
          }
          line = NString.Format("{0,-35} : {1}", key, value);
        }
        Logger.Instance.WriteToLog(line, true);
      });

      Logger.Instance.WriteToLog("-----------------------------------------------------------------------------", true);
    }
  }

  /// <summary> get last task that is in focus</summary>
  /// <returns></returns>
  getLastFocusedTask(mgdID?: number): Task {
    if (arguments.length === 0)
      return this._lastFocusedTasks.getTask(MGDataCollection.Instance.currMgdID);
    else
      return this._lastFocusedTasks.getTask(mgdID);
  }

  /// <summary>
  /// get Current processing task</summary>
  /// </summary>
  getCurrTask(): Task {
    let rtEvnt: RunTimeEvent = this.EventsManager.getLastRtEvent();
    return (rtEvnt !== null && rtEvnt.getTask() !== null && rtEvnt.getTask().GetContextTask() !== null)
      ? this.getLastFocusedTask((<Task>rtEvnt.getTask().GetContextTask()).getMgdID())
      : this.getLastFocusedTask();
  }

  /// <summary> set last focused control for current window</summary>
  /// <param name="last">focused control for current window</param>
  setLastFocusedTask(iTask: ITask): void {
    let currFocusedTask: Task = ClientManager.Instance.getLastFocusedTask();

    if (currFocusedTask !== null && currFocusedTask !== iTask) {
      let oldForm: MgFormBase = currFocusedTask.getForm();
      if (oldForm !== null)
        oldForm.SetActiveHighlightRowState(false);
    }

    let task: Task = <Task>iTask;
    let currMgdID: number = task.getMgdID();
    this._lastFocusedTasks.setTaskAt(task, currMgdID);
    if (task.getForm() !== null) {
      task.getForm().SetActiveHighlightRowState(true);
    }
  }

  /// <summary> set last focused control for current window</summary>
  /// <param name="ctrl">focused control for current window</param>
  setLastFocusedCtrl(ctrl: MgControl): void {
    GUIManager.setLastFocusedControl(<Task>ctrl.getForm().getTask(), ctrl);
  }

  /// <summary>  return message string form Language XML according to index</summary>
  /// <param name="msgId">message index</param>
  getMessageString(msgId: string): string {
    return this.getLanguageData().getConstMessage(msgId);
  }

  /// <summary> memory leak fix: clean dangaling refrences to closed mgData's</summary>
  /// <param name="index">the mgData index/// </param>
  clean(index: number): void {
    GUIManager.deleteLastFocusedControlAt(index);

    if (this._lastFocusedTasks !== null) {
      this._lastFocusedTasks.setTaskAt(null, index);
    }
  }

  getTableCacheManager(): TableCacheManager {
    return this._tableCacheManager;
  }

  /// <summary>
  ///   set MoveByTab value
  /// </summary>
  setMoveByTab(val: boolean): boolean {
    let moveByTab: boolean = this.MoveByTab;
    this._moveByTab = val;
    return moveByTab;
  }

  getPendingVarChangeEvents(): List<Field | RunTimeEvent> {
    return this._variableChangeEvts;
  }

  constructor() {
    this.KBI_DOWN = new KeyboardItem(GuiConstants.KEY_DOWN, Modifiers.MODIFIER_NONE);
    this.KBI_UP = new KeyboardItem(GuiConstants.KEY_UP, Modifiers.MODIFIER_NONE);

    this._runtimeCtx = new RuntimeContextBase(RemoteCommandsProcessor.RC_NO_CONTEXT_ID);

    this._eventsManager = new EventsManager();
    this._environment = new Environment();

    this._languageData = new LanguageData();
    this._keybMapTab = new KeyboardMappingTable();
    this._envParamsTable = new EnvParamsTable();
    this._globalParams = new GlobalParams();

    this._unframedCmds = new List(); // client commands which do not belong to any mgdata yet
    this._CommandsExecutedAfterTaskStarted = new List();

    this._cmdFrame = 0;

    this._lastFocusedTasks = new TasksTable();
    this.LastActionTime = Misc.getSystemMilliseconds();
    this.ReturnToCtrl = null;

    this._idleTimerStarted = false;

    this.ShouldScrambleAndUnscrambleMessages = true;

    this._variableChangeEvts = new List();

    this._tableCacheManager = new TableCacheManager();

    this._createdForms = new CreatedFormVector();

    this._executionProps = new MgProperties();

    this._inIncrementalLocate = false;

    // TODO: How to get Process.GetCurrentProcess().Id?
    this._globalUniqueSessionId = UniqueIDUtils.GetUniqueMachineID() + "_"; // + Process.GetCurrentProcess().Id;

    this.RegisterDelegates();
  }

  /// <summary> Returns the single instance of the ClientManager class.
  /// In case this instance does not exist it creates that instance.
  /// </summary>
  /// <returns> ClientManager instance</returns>
  private InitGuiManager(): void {
    Manager.Environment = this._environment;
    Manager.EventsManager = this.EventsManager;
    Manager.MGDataTable = MGDataCollection.Instance;

    Manager.DefaultServerName = this.getServer();
    Manager.DefaultProtocol = this.getProtocol();
  }

  /// <summary> Entry point to the Web Client </summary>
  /// <param name="args">array of command line arguments</param>
  static Main(): void {
    // TODO : Check how to load from Studio i.e. F7
    // if (args.length !== 0 && NString.StartsWith(args[0], "/spawnahead")) {
    //   ClientManager._startedFromStudio = true;
    //   StudioLauncher.Init(args);
    // }
    // else
      ClientManager.StartExecution();

    Logger.Instance.Flush();
  }

  static StartExecution(): void {
    let loaded: boolean = ClientManager.Instance.LoadExecutionProps();

    if (loaded) {
      ClientManager.Instance._guiEventsProcessor = new GuiEventsProcessor();
      ClientManager.Instance.InitGuiManager();

      // TODO: is this required?
      console.log("<CLIENTMANAGER>OK</CLIENTMANGER>");

      HttpManager.GetInstance().HttpCommunicationTimeoutMS = ClientManager.Instance.GetFirstHttpRequestTimeout();

      ClientManager.Instance.EventsManager.Init();

      Logger.Instance.Initialize(ClientManager.Instance.parseLogLevel(ClientManager.Instance.getInternalLogLevel()), ClientManager.Instance.getInternalLogSync(), ClientManager.StartedFromStudio);

      let mgd: MGData = new MGData(0, null, false);
      MGDataCollection.Instance.addMGData(mgd, 0, true);

      ClientManager.Instance.WorkThreadExecution();

      // TODO: this log is to be written when the session ends. I do not know the exact place as of now, so marking it as todo.
      // if (Logger.Instance.ShouldLog()) {
      //   Logger.Instance.WriteToLog(NString.Concat([
      //                                               OSEnvironment.EolSeq, "Ended on ", DateTimeUtils.ToString(DateTime.Now, "dd/MM/yyyy"), OSEnvironment.EolSeq, OSEnvironment.EolSeq
      //                                             ]), false);
      // }
    }
  }

  /// <summary> returns the URL needed to connect to the server</summary>
  /// <returns> server URL</returns>
  getServerURL(): URL {
    if (this._serverUrl === null) {
      // construct the URL string
      let uriString: string = this.getProtocol() + "://" + this.getServer() + "/" + this.getHttpReq();

      try {
        // TODO: does new URL() throw any exception? OR, we need to handle it?
        this._serverUrl = new URL(uriString);
        Debug.Assert(this._serverUrl.protocol === "http:" || this._serverUrl.protocol === "https:" || this._serverUrl.protocol === "file:");
      }
      catch (ex) {
        Logger.Instance.WriteExceptionToLog(ex);
      }
    }

    return this._serverUrl;
  }

  /// <summary> Loads the execution properties file that contains information about the server,
  /// application and program to execute
  /// </summary>
  LoadExecutionProps(): boolean {
    // return true, if successfully loaded.
    let response: string = "";
    let succeeded: boolean = true;

    try {
      // isError cannot be true here, because it is returned by runtime engine and to read execution properties, we do not reach the engine.
      let isError: RefParam<boolean> = new RefParam(false);
      response = HttpManager.GetInstance().GetContent(ClientManager._executionPropertiesFileName, null, isError);
      this._executionProps.loadFromXML(response);
    }
    catch (ex) {
      succeeded = false;
      // TODO: should we write the error message to log?
      // TODO: should we display an error message on the browser?
    }

    return succeeded;
  }

  /// <summary>
  /// return a copy of the current execution properties
  /// </summary>
  /// <returns>a copy of the current execution properties</returns>
  copyExecutionProps(): MgProperties {
    return this._executionProps.Clone();
  }

  setUsername(username: string): void {
    this._executionProps.set_Item(ConstInterface.MG_TAG_USERNAME, username);
  }

  setPassword(password: string): void {
    this._executionProps.set_Item(ConstInterface.MG_TAG_PASSWORD, password);
  }

  setSkipAuthenticationDialog(value: boolean): void {
    this._executionProps.set_Item(ConstInterface.REQ_SKIP_AUTHENTICATION, value.toString());
  }

  setGlobalParams(val: string): void {
    if (val !== null)
      this._executionProps.set_Item(ConstInterface.MG_TAG_GLOBALPARAMS, val);
    else
      this._executionProps.Remove(ConstInterface.MG_TAG_GLOBALPARAMS);
  }

  getLogClientSequenceForActivityMonitor(): boolean {
    let bRet: boolean = false;
    let logSeqProp: string = this._executionProps.getProperty("LogClientSequenceForActivityMonitor");

    if (logSeqProp !== null && NString.Compare(logSeqProp, "Y", true) === 0)
      bRet = true;

    return bRet;
  }

  getGlobalParams(): string {
    return this._executionProps.getProperty(ConstInterface.MG_TAG_GLOBALPARAMS);
  }

  getProtocol(): string {
    if (this._protocol === null)
      this._protocol = this._executionProps.getProperty(ConstInterface.MG_TAG_PROTOCOL);

    return this._protocol;
  }

  getServer(): string {
    if (this._server === null)
      this._server = this._executionProps.getProperty(ConstInterface.SERVER);

    return this._server;
  }

  getHttpReq(): string {
    if (this._httpReq === null) {
      this._httpReq = this._executionProps.getProperty(ConstInterface.REQUESTER);

      // remove leading slashes
      if (this._httpReq !== null) {
        while (this._httpReq.startsWith("/"))
          this._httpReq = this._httpReq.substr(1);

        while (this._httpReq.endsWith("/"))
          this._httpReq = this._httpReq.substr(0, this._httpReq.length - 1);
      }
    }

    return this._httpReq;
  }

  getAppName(): string {
    if (this._appName === null)
      this._appName = this._executionProps.getProperty(ConstInterface.REQ_APP_NAME);

    return this._appName;
  }

  getPrgName(): string {
    if (this._prgName === null)
      this._prgName = this._executionProps.getProperty(ConstInterface.REQ_PRG_NAME);

    return this._prgName;
  }

  /// <summary></summary>
  /// <returns>the name of the program (passed from studio and is used to identify the executed program in case it doesn't have a public name)</returns>
  getPrgDescription(): string {
    if (this._prgDescription === null)
      this._prgDescription = this._executionProps.getProperty(ConstInterface.REQ_PRG_DESCRIPTION);

    return this._prgDescription;
  }

  getPrgArgs(): string {
    if (this._prgArgs === null)
      this._prgArgs = this._executionProps.getProperty(ConstInterface.REQ_ARGS);

    return this._prgArgs;
  }

  getLocalID(): string {
    if (this._localId === null)
      this._localId = this._executionProps.getProperty(ConstInterface.LOCALID);

    return this._localId;
  }

  getDebugClient(): string {
    if (this._debugClient === null) {
      let value: string = this._executionProps.getProperty(ConstInterface.DEBUGCLIENT);
      if (value !== null && value === "true") {
        this._debugClient = "DEBUG_CLIENT=1";
      }
    }
    return this._debugClient;
  }

  getInternalLogLevel(): string {
    return this._executionProps.get_Item(ConstInterface.INTERNAL_LOG_LEVEL);
  }

  setInternalLogLevel(value: string): void {
    this._executionProps.set_Item(ConstInterface.INTERNAL_LOG_LEVEL, value);
  }

  getInternalLogSync(): string {
    return this._executionProps.get_Item(ConstInterface.INTERNAL_LOG_SYNC);
  }

  getUsername(): string {
    return this._executionProps.getProperty(ConstInterface.MG_TAG_USERNAME);
  }

  getPassword(): string {
    return this._executionProps.getProperty(ConstInterface.MG_TAG_PASSWORD);
  }

  getCtxGroup(): string {
    return this._executionProps.getProperty(ConstInterface.CTX_GROUP);
  }

  setCtxGroup(CtxGroup: string): void {
    this._executionProps.set_Item(ConstInterface.CTX_GROUP, CtxGroup);
  }

  /// <summary>
  /// GET URL value of the execution property
  /// </summary>
  /// <returns></returns>
  getURLFromExecutionProperties(executionPropName: string): URL {
    let url: URL = null;
    let urlStr: string = this._executionProps.get_Item(executionPropName);

    if (urlStr !== null) {
      // if relative, prefix with the 'protocol://server/' from which the rich-client was activated
      if (urlStr.startsWith("/"))
        urlStr = this.getProtocol() + "://" + this.getServer() + urlStr;

      try {
        url = new URL(urlStr);
        Debug.Assert(url.protocol === "http:" || url.protocol === "https:");
      }
      catch (ex) {
        Logger.Instance.WriteExceptionToLog(ex);
      }
    }
    return url;
  }

  IsLogonRTL(): boolean {
    let text: string = this._executionProps.get_Item(GuiConstants.STR_LOGON_RTL);
    return text !== null && text === "Y";
  }

  getLogonWindowIconURL(): URL {
    return this.getURLFromExecutionProperties(GuiConstants.STR_LOGO_WIN_ICON_URL);
  }

  getLogonWindowImageURL(): URL {
    return this.getURLFromExecutionProperties(GuiConstants.STR_LOGON_IMAGE_URL);
  }

  getLogonWindowTitle(): string {
    return this._executionProps.get_Item(GuiConstants.STR_LOGON_WIN_TITLE);
  }

  getLogonGroupTitle(): string {
    return this._executionProps.get_Item(GuiConstants.STR_LOGON_GROUP_TITLE);
  }

  getLogonMsgCaption(): string {
    return this._executionProps.get_Item(GuiConstants.STR_LOGON_MSG_CAPTION);
  }

  getLogonUserIdCaption(): string {
    return this._executionProps.get_Item(GuiConstants.STR_LOGON_USER_ID_CAPTION);
  }

  getLogonPasswordCaption(): string {
    return this._executionProps.get_Item(GuiConstants.STR_LOGON_PASS_CAPTION);
  }

  getLogonOKCaption(): string {
    return this._executionProps.get_Item(GuiConstants.STR_LOGON_OK_CAPTION);
  }

  getLogonCancelCaption(): string {
    return this._executionProps.get_Item(GuiConstants.STR_LOGON_CANCEL_CAPTION);
  }

  getLogonChangePasswordCaption(): string {
    return this._executionProps.get_Item(ConstInterface.MG_TAG_CHNG_PASS_CAPTION);
  }

  getChangePasswordWindowTitle(): string {
    return this._executionProps.get_Item(ConstInterface.MG_TAG_CHNG_PASS_WIN_TITLE);
  }

  getChangePasswordOldPasswordCaption(): string {
    return this._executionProps.get_Item(ConstInterface.MG_TAG_CHNG_PASS_OLD_PASS_CAPTION);
  }

  getChangePasswordNewPasswordCaption(): string {
    return this._executionProps.get_Item(ConstInterface.MG_TAG_CHNG_PASS_NEW_PASS_CAPTION);
  }

  getChangePasswordConfirmPasswordCaption(): string {
    return this._executionProps.get_Item(ConstInterface.MG_TAG_CHNG_PASS_CONFIRM_PASS_CAPTION);
  }

  getChangePasswordMismatchMsg(): string {
    return this._executionProps.get_Item(ConstInterface.MG_TAG_CHNG_PASS_MISMATCH_MSG);
  }

  getSkipAuthenticationDialog(): boolean {
    let property: string = this._executionProps.getProperty(ConstInterface.REQ_SKIP_AUTHENTICATION);
    return !NString.IsNullOrEmpty(property) && property === true.toString();
  }

  getEnvVars(): string {
    return this._executionProps.getProperty(ConstInterface.ENVVARS);
  }

  GetFirstHttpRequestTimeout(): number {
    let firstHttpTimeout: number = NNumber.Parse(this._executionProps.getProperty(ConstInterface.FIRST_HTTP_REQUEST_TIMEOUT));
    return <number>((firstHttpTimeout > 0) ? (firstHttpTimeout * 1000) : HttpManager.DEFAULT_OFFLINE_HTTP_COMMUNICATION_TIMEOUT);
  }

  WasSpawnedForParallelProgram(): boolean {
    let text: string = this._executionProps.get_Item(ConstInterface.PARALLEL_EXECUTION);
    return text !== null && text === "Y";
  }

  /// <summary> Goes over forms is createdFormVec and performs move to first record cycle control</summary>
  DoFirstRecordCycle(): void {
    let mgDataTab: MGDataCollection = MGDataCollection.Instance;

    for (let i: number = 0; i < mgDataTab.getSize(); i++) {
      let mgd: MGData = mgDataTab.getMGData(i);
      if (mgd === null || mgd.IsAborting)
        continue;

      for (let j: number = 0; j < mgd.getTasksCount(); j++) {
        let task: Task = mgd.getTask(j);

        if (task !== null) {
          let mgForm: MgForm = <MgForm>task.getForm();

          if (mgForm !== null && !task.IsSubForm)
            mgForm.RecomputeTabbingOrder(true);

          if (mgForm !== null && task.isCurrentStartProgLevel() && !mgForm.IgnoreFirstRecordCycle) {
            mgForm.IgnoreFirstRecordCycle = true;
              task.doFirstRecordCycle();
          }
        }
      }
    }
  }

  /// <summary> Clean flag for Subform record cycle </summary>
  cleanDoSubformPrefixSuffix(): void {
    let mgDataTab: MGDataCollection = MGDataCollection.Instance;

    for (let i: number = 0; i < mgDataTab.getSize(); i++) {
      let mgd: MGData = mgDataTab.getMGData(i);

      if (mgd === null || mgd.IsAborting)
        continue;

      let tasksCount: number = mgd.getTasksCount();
      for (let j: number = 0; j < tasksCount; j++) {
        let task: Task = mgd.getTask(j);
        task.DoSubformPrefixSuffix = false;
      }
    }
  }

  /// <summary> Execute Record cycle for all subforms that their flag is on </summary>
  execAllSubformRecordCycle(): void {
    let mgDataTab: MGDataCollection = MGDataCollection.Instance;

    for (let i: number = 0; i < mgDataTab.getSize(); i = i + 1) {
      let mgd: MGData = mgDataTab.getMGData(i);

      if (mgd === null || mgd.IsAborting)
        continue;

      let tasksCount: number = mgd.getTasksCount();
      for (let j: number = 0; j < tasksCount; j = j + 1) {
        let task: Task = mgd.getTask(j);
        if (task.IsSubForm && task.DoSubformPrefixSuffix) {
          // In the record prefix of the current task (commonHandlerBefore) we execute record prefix of all fathers.
          // But when we return from the server we do not need it. So we prevent father record prefix execution.
          task.PerformParentRecordPrefix = false;
          this.EventsManager.pushNewExecStacks();
            this.EventsManager.handleInternalEventWithTaskAndSubformRefresh(task, InternalInterface.MG_ACT_REC_PREFIX, true);

          if (!this.EventsManager.GetStopExecutionFlag())
            this.EventsManager.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_SUFFIX);

          this.EventsManager.popNewExecStacks();
          task.PerformParentRecordPrefix = true;
        }
      }
    }
  }

  /// <summary>
  /// Add command, execute request and do record cycle for subforms that the server sent their new dataview
  /// </summary>
  /// <param name="cmdsToServer"></param>
  /// <param name="cmdToServer">additional command to the Server</param>
  execRequestWithSubformRecordCycle(cmdsToServer: CommandsTable, cmdToServer: IClientCommand, exp: Expression): void {
    this.cleanDoSubformPrefixSuffix();
    cmdsToServer.Add(cmdToServer);

    let commandsProcessor: CommandsProcessorBase = CommandsProcessorManager.GetCommandsProcessor();

    commandsProcessor.Execute(CommandsProcessorBase_SendingInstruction.TASKS_AND_COMMANDS, CommandsProcessorBase_SessionStage.NORMAL, exp);
    this.execAllSubformRecordCycle();
  }

  /// <summary> When something in the user's rights has changed either the user has changed, or he
  /// gained \ lost some rights he had, We need to refresh the form's pulldown menu and context menu,
  /// and the context menu of all of the controls.
  /// </summary>
  RefreshMenus(): void {
    let rmgDataTab: MGDataCollection = MGDataCollection.Instance;

    let internalMainProgram: Task = rmgDataTab.GetMainProgByCtlIdx(0);
    if (internalMainProgram !== null)
      internalMainProgram.resetMenusContent();

    // we need to refresh all the menus, since the rights hash key has changed
    Manager.MenuManager.destroyAndRebuild();
  }

  /// <summary> true if delay is in progress</summary>
  isDelayInProgress(): boolean {
    return this._delayInProgress;
  }

  setDelayInProgress(delayInProgress: boolean): void {
    this._delayInProgress = delayInProgress;
  }

  /// <summary> save the global params (one base64 encoded value) that was passed from the runtime-engine to the rich-client</summary>
  fillGlobalParams(): void {
    let XMLdata: string = ClientManager.Instance.RuntimeCtx.Parser.getXMLdata();
    let endContext: number = ClientManager.Instance.RuntimeCtx.Parser.getXMLdata().indexOf(XMLConstants.TAG_TERM, ClientManager.Instance.RuntimeCtx.Parser.getCurrIndex());

    if (endContext !== -1 && endContext < XMLdata.length) {
      // find last position of its tag
      let tag: string = ClientManager.Instance.RuntimeCtx.Parser.getXMLsubstring(endContext);
      ClientManager.Instance.RuntimeCtx.Parser.add2CurrIndex(tag.indexOf(ConstInterface.MG_TAG_GLOBALPARAMS) + ConstInterface.MG_TAG_GLOBALPARAMS.length);

      let tokens: List<string> = XmlParser.getTokens(ClientManager.Instance.RuntimeCtx.Parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);

      Debug.Assert(tokens.get_Item(0) === XMLConstants.MG_ATTR_VALUE);
      this.setGlobalParams(tokens.get_Item(1));

      endContext = XMLdata.indexOf(XMLConstants.TAG_OPEN, endContext);
      if (endContext === -1)
        endContext = XMLdata.length;

      ClientManager.Instance.RuntimeCtx.Parser.setCurrIndex(endContext);
    }
  }

  /// <summary>global unique ID of the session = 'machine unique ID' + 'process ID'</summary>
  /// <returns></returns>
  GetGlobalUniqueSessionID(): string {
    return this._globalUniqueSessionId;
  }

  /// <summary>return the absolute file name of the execution properties file being used by the client</summary>
  /// <returns></returns>
  private static getExecutionPropertiesFileName(): string {
    let fullyQualifiedName: string = null;
    let lastPathSeparator: number = fullyQualifiedName.lastIndexOf('\\');
    return NString.Remove(fullyQualifiedName, lastPathSeparator + 1, fullyQualifiedName.length - lastPathSeparator - 1) + ConstInterface.EXECUTION_PROPERTIES_FILE_NAME;
  }

  /// <summary></summary>
  /// <param name="inIncrementalLocate"></param>
  SetInIncrementalLocate(inIncrementalLocate: boolean): void {
    this._inIncrementalLocate = inIncrementalLocate;
  }

  /// <summary></summary>
  /// <returns></returns>
  InIncrementalLocate(): boolean {
    return this._inIncrementalLocate;
  }

  static  GetControlPictureMask(taskId: string, controlName: string): string
  {
    let task: Task = MGDataCollection.Instance.getCurrMGData().getTask(taskId);

    let control: MgControlBase = null;

    if (controlName !== null)
      control = task.getForm().GetCtrl(controlName);

    let pic: PIC = control.getPIC();
    return ((pic !== null) ? pic.getMask() : null);
  }

  /// <summary>
  ///   get ranged value for input value
  /// </summary>
  static  GetRangedValue(taskId: string, controlName: string, value: string): string
  {
    let task: Task = MGDataCollection.Instance.getCurrMGData().getTask(taskId);

    let control: MgControlBase = null;

    if (controlName !== null)
    {
      control =  task.getForm().GetCtrl(controlName);
      return control.getRangedValue(value);
    }
    return null;
  }

  /// <summary>
  ///   validate user input value
  /// </summary>
  static  ValidateControlValue(taskId: string, controlName: string, value: any): string
  {
    let task: Task = MGDataCollection.Instance.getCurrMGData().getTask(taskId);

    let control: MgControl = null;

    if (controlName !== null)
    {
      control =  task.getForm().GetCtrl(controlName) as MgControl;
      return control.validate(value);
    }
    return null;
  }

  /// <summary>
  ///   Get fld ranges
  /// </summary>
  static GetFldRanges(taskId: string, controlName: string): string {
    let task: Task = MGDataCollection.Instance.getCurrMGData().getTask(taskId);

    let control: MgControl = null;

    if (controlName !== null)
    {
      control =  task.getForm().GetCtrl(controlName) as MgControl;
      return control.getRanges();
    }
    return null;
  }

  /// <summary> parses the taskURL tag
  /// every taskURL tag is replaced by the data of the xml island it refers to</summary>
  ProcessTaskURL(): void {
    let xmlData: string = this.RuntimeCtx.Parser.getXMLdata();
    let endTaskUrlIdx: number = xmlData.indexOf(XMLConstants.TAG_CLOSE, this.RuntimeCtx.Parser.getCurrIndex());
    Debug.Assert(endTaskUrlIdx !== -1 && endTaskUrlIdx < xmlData.length);

    // extract the task url and the ref list
    let tag: string = this.RuntimeCtx.Parser.getXMLsubstring(endTaskUrlIdx);
    this.RuntimeCtx.Parser.add2CurrIndex(tag.indexOf(ConstInterface.MG_TAG_TASKURL) + ConstInterface.MG_TAG_TASKURL.length);

    let tokensVector: List<string> = XmlParser.getTokens(this.RuntimeCtx.Parser.getXMLsubstring(endTaskUrlIdx), XMLConstants.XML_ATTR_DELIM);
    let taskCacheURL: string = tokensVector.get_Item(1);
    let refListStr: string = tokensVector.get_Item(3);

    // bring the data
    let taskContentOriginal: string = CommandsProcessorManager.GetContent(taskCacheURL);

    // prefix the original data till the start of the current <taskURL>
    let taskContentFinal: StringBuilder = new StringBuilder(xmlData.substr(0, this.RuntimeCtx.Parser.getCurrIndex() - (ConstInterface.MG_TAG_TASKURL.length + 1)), taskContentOriginal.length);
    // the number of tokens in refList and the number of location in the xml to be replaced (i.e. the places with [:) should be equal
    let reflist: List<string> = this.getReflist(refListStr, ';', true, -1);
    let refListIdx = 0;

    let currIdx: number = taskContentOriginal.indexOf("[:");
    let prevIdx: number = 0;
    while (currIdx !== -1) {
      taskContentFinal.Append(taskContentOriginal.substr( prevIdx, currIdx - prevIdx));
      taskContentFinal.Append(reflist.get_Item(refListIdx++));
      currIdx += 2;
      prevIdx = currIdx;
      currIdx = taskContentOriginal.indexOf("[:", prevIdx);
    }
    taskContentFinal.Append(taskContentOriginal.substr(prevIdx));

    // suffix the rest of the original xml from the end of the current </taskURL>
    taskContentFinal.Append(xmlData.substr(xmlData.indexOf(XMLConstants.TAG_CLOSE, endTaskUrlIdx + 1) + 1));
    xmlData = taskContentFinal.ToString();

    Logger.Instance.WriteDevToLog(NString.Format("{0} -------> {1}", taskCacheURL, xmlData));

    this.RuntimeCtx.Parser.setXMLdata(xmlData);
    this.RuntimeCtx.Parser.setCurrIndex(this.RuntimeCtx.Parser.getCurrIndex() - (ConstInterface.MG_TAG_TASKURL.length + 1));
  }

  /// <summary> parses the data acording to the delimeter and the reflist delimeters logic</summary>
  /// <param name="delim"></param>
  /// <param name="trunc">if true trucate first '\\' (in use for island data parsing</param>
  /// <param name="maxTokens">if -1 all tokens avialable else the number of tokens to search</param>
  /// <param name="data"></param>
  private getReflist(data: string, delim: string, trunc: boolean, maxTokens: number): List<string> {
    let currStr: StringBuilder = new StringBuilder();
    let list: List<string> = new List<string>();
    let tokensCnt: number = 0;

    // since the first character is always ';' we start from 1
    for (let i: number = 1; i < data.length; i++) {
      let curr: string = data.charAt(i);

      if (curr !== '\\' && curr !== delim)
        currStr.Append(curr);
      else if (curr === delim) {
        list.push(currStr.ToString());
        currStr = new StringBuilder();
        tokensCnt++;

        if (tokensCnt === maxTokens)
          break;
      }
      else if (curr === '\\') {
        // the format '\\delimiter' is always truncated
        if (!trunc && data.charAt(i + 1) !== delim)
          currStr.Append(data.charAt(i));

        i++;
        currStr.Append(data.charAt(i));
      }
    }

    // append the last element in the ref list
    list.push(currStr.ToString());

    return list;
  }

  /// <summary>
  /// Subscribe for events defined at HttpClientEvents and
  /// attach appropriate event handlers
  /// </summary>
  /// <returns></returns>
  RegisterDelegates(): void {
    HttpClientEvents.GetExecutionProperty_Event = this.GetExecutionProperty.bind(this);
    HttpClientEvents.GetRuntimeCtxID_Event = this.GetRuntimeCtxID.bind(this);
    HttpClientEvents.GetGlobalUniqueSessionID_Event = this.GetGlobalUniqueSessionID.bind(this);
    HttpClientEvents.ShouldDisplayGenericError_Event = this.ShouldDisplayGenericError.bind(this);
  }

  /// <summary>
  /// Retrieves execution property value by it's name
  /// </summary>
  /// <param name="propertyName"></param>
  /// <returns>property value as string</returns>
  GetExecutionProperty(propName: string): string {
    return this._executionProps.getProperty(propName);
  }

  /// <summary>
  /// Retrieves runtime context ID
  /// </summary>
  /// <returns></returns>
  GetRuntimeCtxID(): string {
    return this.RuntimeCtx.ContextID;
  }
}
