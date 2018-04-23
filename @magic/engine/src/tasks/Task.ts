import {Debug, HashUtils, List, NNumber, NString, RefParam, Stack, StringBuilder} from "@magic/mscorelib";
import {
  Constants,
  InternalInterface,
  Logger,
  StorageAttribute,
  StrUtil,
  UniqueTskSort,
  WindowType,
  XMLConstants,
  XmlParser
} from "@magic/utils";
import {
  DisplayConvertor,
  ExpVal,
  FieldDef,
  Manager,
  MgControlBase,
  MgFormBase,
  NUM_TYPE,
  PIC,
  Property,
  PropInterface,
  ITask,
  TaskBase,
  TaskDefinitionId,
  DataModificationTypes,
  Commands,
  Styles
} from "@magic/gui";
import {Event} from "../event/Event";
import {DataView} from "../data/DataView";
import {DvCache} from "../data/DvCache";
import {MGData} from "./MGData";
import {DataViewCommandType} from "../commands/ClientToServer/DataviewCommand";
import {CommandsProcessorBase, CommandsProcessorBase_SendingInstruction} from "../CommandsProcessorBase";
import {TaskServiceBase} from "./TaskServiceBase";
import {ArgumentsList} from "../rt/ArgumentsList";
import {TaskTransactionManager} from "../data/TaskTransactionManager";
import {DataviewManager} from "../data/DataviewManager";
import {SortCollection} from "./sort/SortCollection";
import {Sort} from "./sort/Sort";
import {MgForm} from "../gui/MgForm";
import {MgControl} from "../gui/MgControl";
import {ClientManager} from "../ClientManager";
import {RemoteTaskService} from "./RemoteTaskService";
import {ReturnResult} from "../util/ReturnResult";
import {RunTimeEvent} from "../event/RunTimeEvent";
import {IClientCommand} from "../commands/IClientCommand";
import {CommandFactory} from "../commands/ClientToServer/CommandFactory";
import {DataviewHeaders} from "../rt/DataviewHeaders";
import {Transaction} from "../rt/Transaction";
import {MGDataCollection} from "./MGDataCollection";
import {TasksTable} from "./TasksTable";
import {Argument} from "../rt/Argument";
import {IClientTargetedCommand} from "../commands/IClientTargetedCommand";
import {HandlersTable} from "../rt/HandlersTable";
import {RecomputeTable} from "../rt/RecomputeTable";
import {ExpTable} from "../exp/ExpTable";
import {UserEventsTable} from "../event/UserEventsTable";
import {FormsTable} from "../gui/FormsTable";
import {FlowMonitorQueue} from "../util/FlowMonitorQueue";
import {Field} from "../data/Field";
import {ActionManager} from "../event/ActionManager";
import {ConstInterface} from "../ConstInterface";
import {EventHandler} from "../event/EventHandler";
import {Expression} from "../exp/Expression";
import {FieldsTable} from "../data/FieldsTable";
import {GUIManager} from "../GUIManager";
import {CommandsProcessorManager} from "../CommandsProcessorManager";
import {Record} from "../data/Record";
import {EventSubType} from "../enums";
import {Subscription} from "rxjs/Subscription";

export enum Task_Flow {
  NONE,
  STEP,
  FAST
}

export enum Task_Direction {
  BACK = -1,
  NONE,
  FORE
}

export enum Task_SubformExecModeEnum {
  NO_SUBFORM = -1,
  SET_FOCUS,
  FIRST_TIME,
  REFRESH
}

enum FlowModeDir {
  NONE = ' ',
  FAST_BACKWARD = 'R',
  FAST_FORWARD = 'F',
  STEP_BACKWARD = 'P',
  STEP_FORWARD = 'N'
}

// @dynamic
export class Task extends TaskBase {
  private _dvCache: DvCache = null;
  private _mgData: MGData = null;
  public PreviouslyActiveTaskId: string;                // ID of the task that was the active context task, when this task was created
  private _aborting: boolean = false;                   // true if an abort command was executed for this task or one of its ancestors
  private _bExecEndTask: boolean = false;
  public InEndTask: boolean = false;                    // am I checking whether the task should be closed?
  private _isStarted: boolean = false;
  public IsTryingToStop: boolean = false;               // if true then the task is trying to stop but not necessarily stopped yet
  public IsAfterRetryBeforeBuildXML: boolean = false;   // indicates whether flag AfterRetry is set to TRUE before building the XML
  private _evalOldValues: boolean = false;              // indicates for the get value to get the old value of the field
  private _inRecordSuffix: boolean = false;             // indicate we are in record suffix (handle before)
  private _cancelWasRaised: boolean = false;            // was cancel/quit event raised ?
  private _counter: number = 0;                         // increases only in non interval tasks.
  private _currStartProgLevel: number = 0;              // the level of startProg request in which we task is started
  private _destinationSubform: boolean = false;         // if TRUE, the task is a Destination Subform task
  private _enableZoomHandler: boolean = false;          // if TRUE, there is a zoom handler for this field
  private _exitingByMenu: boolean = false;
  private _firstRecordCycle: boolean = false;           // indicates whether we are in the first record cycle
  private _direction: Task_Direction = 0;
  private _flowMode: Task_Flow = 0;
  private _originalTaskMode: string = ' ';
  public MenuUid: number = 0;
  private _inCreateLine: boolean = false;               // is the task into processing CREATE LINE
  public InSelect: boolean = false;                            // true when the task is executing a SELECT internal event
  public InStartProcess: boolean = false;
  private _isDestinationCall: boolean = false;          // if TRUE, the task is a Destination Subform task by call operation
  private _knownToServer: boolean = true;               // False if the server has
  locateQuery: Task_LocateQuery = new Task_LocateQuery();
  private _loopStack: Stack<number> = null;

  ///<summary>
  /// This is the task which invoked the handler containing the Call operation.
  /// This member is used for searching the variables like VarIndex(), etc
  ///</summary>
  private _parentTask: Task = null;

  public get ParentTask(): Task {
    return this._parentTask;
  }

  public ContextTask: Task = null;                             // under context of which task this task is currently running
  /// <summary>
  /// This is same as _parentTask except for Modal tasks. In case, the current task is modal, _triggeringTask refers to
  ///  the task which invoked the handler of the _parentTask. This member is used for all generation-based functions and Prog().
  /// </summary>
  private _triggeringTask: Task = null;                 // reference to the task that triggered the handler which created me
  /// <summary>
  ///   This is the task which contained the Call operation. If the task was executed without call
  ///   operation eg. the MP, the startup program, etc., it refers to itself. This member used to search for the event handlers
  /// </summary>
  public PathParentTask: Task = null;

  private _preventControlChange: boolean = false;
  private _preventRecordSuffix: boolean = false;
  private _revertDirection: Task_Direction = Task_Direction.FORE;
  private _revertFrom: number = -1;
  private _taskPath: List<Task> = null;
  private _transactionFailed: boolean = false;

  // returns true if the task is currently trying to commit a dynamicDef.transaction
  private _tryingToCommit: boolean = false;

  set TryingToCommit(value: boolean) {
    this._tryingToCommit = value;
  }

  get TryingToCommit(): boolean {
    return this._tryingToCommit;
  }

  private _useLoopStack: boolean = false;               // indicates whether the expression (LOOPCOUNTER()) is in the scope of Block Loop.
  private _inProcessingTopMostEndTaskSaved: boolean = false;

  public InHandleActCancel: boolean = false;
  public UserLocs: List<UserRange> = null;
  public UserRngs: List<UserRange> = null;
  public UserSorts: List<Sort> = null;
  public RuntimeSorts: SortCollection = null;
  public ResetLocate: boolean = false;
  public ResetRange: boolean = false;
  public ResetSort: boolean = false;
  public VewFirst: number = 0;
  public dataViewContent: string = null;                // dataViewContent retrieved by GetDataViewContent command.
  public PerformParentRecordPrefix: boolean = false;    // In record prefix (commonHandlerBefore) we execute record prefix of all fathers.

  // But we do not need it in all cases.
  // When we return from the server we do not need it.
  // When we click on the nested subform we need it.
  // if true, do the parent subform record prefix
  public SubformExecMode: Task_SubformExecModeEnum = 0;      // for SubformExecMode function

  // -1 – The task is not executed as a subform
  //  0 – The task is executed by setting the focus on it
  //  1 – The subtask is executed for the first time
  //  2 – The task is executed because the Automatic Refresh property
  //      or the Subform Refresh event has been triggered
  public ModeAsParent: boolean = false;                 // if the task mode is 'As Parent' we need to care out it specifically
  public DataviewManager: DataviewManager = null;       // the data view manager of the task
  public TaskTransactionManager: TaskTransactionManager = null;

  /// <summary>
  /// is set true after initial data from remote and local database is fetched
  /// </summary>
  public AfterFirstRecordPrefix: boolean = false;

  /// <summary>
  /// Indicates that the subform must be refreshed on the client.
  /// Relevant only for non-offline with local data.
  /// </summary>
  public ExecuteClientSubformRefresh: boolean = false;

  /// <summary>
  /// Indicates that the task executes CommonHandlerBefore method.
  /// For subforms we do not execute it's RP if the parent didn't finished yet
  /// it's CommandHandlerBefore method.
  /// </summary>
  public InCommonHandlerBeforeRP: boolean = false;

  /// <summary>
  /// retrieve and return a service object containing functionality that is different in the task level between connected and offline states.
  /// </summary>
  private _taskService: TaskServiceBase = null;

  get TaskService(): TaskServiceBase {
    if (this._taskService == null)
      this._taskService = new RemoteTaskService();

    return this._taskService;
  }

  /// <summary>
  /// retrieve and return a commands processor depending on task type and state.
  /// </summary>
  static get CommandsProcessor(): CommandsProcessorBase {
    return CommandsProcessorManager.GetCommandsProcessor();
  }

  private _menusFileName: string = null;
  TransactionErrorHandlingsRetry: Transaction = null;
  private hasLocate: boolean = false;
  private taskDefinitionId: TaskDefinitionId = null;
  public ArgumentsList: ArgumentsList = null;           // off-line execution - task argument, to enable the update of field values

  /// <summary>
  /// parent task of the subtask by toolkit tree include the main program.
  /// </summary>
  get LogicalStudioParentTask(): Task {
    if (this.StudioParentTask === null && !super.isMainProg()) {
      return <Task>Manager.MGDataTable.GetMainProgByCtlIdx(this.ContextID, this._ctlIdx);
    }

    return <Task>this.StudioParentTask;
  }

  get KnownToServer(): boolean {
    return this._knownToServer;
  }

  public DoSubformPrefixSuffix: boolean = false;            // if true, do the subform record prefix & suffix
  public ConfirmUpdateNo: boolean = false;                  // only for confirms update
  public RetainFocus: boolean = false;                      // only for Call operation with destination
  public InCtrlPrefix: boolean = false;
  public DataSynced: boolean = false;
  public UniqueSort: UniqueTskSort = null;

  // Only main prog can be MDI frame. if not, don't bother because IsMDIFrame may have
  // an expression and we don't want a compute.
  get HasMDIFrame(): boolean {
    return super.isMainProg() && this.Form !== null && this.Form.IsMDIFrame;
  }

  /// <summary>
  /// the transaction need to be on the data view manager
  /// </summary>
  set Transaction(value: Transaction) {
    this.DataviewManager.CurrentDataviewManager.Transaction = value;
  }

  get Transaction(): Transaction {
    return this.DataviewManager.CurrentDataviewManager.Transaction;
  }

  public RefreshOnVars: number[] = null;
  public DvPosDescriptor: List<string[]> = null;
  public SubTasks: TasksTable = null;
  public ExpTab: ExpTable = null;
  public UserEvtTab: UserEventsTable = null;
  public DataviewHeadersTable: DataviewHeaders = null;
  public HandlersTab: HandlersTable = null;
  public _forms: FormsTable = null;
  public Name: string = null;
  public PublicName: string = null;
  public IsOffline: boolean = false;

  /// <summary>
  /// indicates whether the task suffix was performed for this task
  /// </summary>
  public TaskSuffixExecuted: boolean = false;

  get TaskDefinitionId(): TaskDefinitionId {
    if (this.taskDefinitionId === null) {
      this.taskDefinitionId = new TaskDefinitionId(this._ctlIdx, this.ProgramIsn, this.TaskIsn, this._isPrg);
    }
    return this.taskDefinitionId;
  }

  public RetrunValueExp: number = 0;
  public SubformControl: MgControl = null;

  static get IsBlockingBatch(): boolean {
    return false;
  }

  /// <summary>
  ///   CTOR
  /// </summary>
  constructor();
  constructor(parent: Task);
  constructor(parent?: Task) {
    super();
    if (arguments.length === 0) {
      this.constructor_0();
      return;
    }
    this.constructor_1(parent);
  }

  private constructor_0(): void {
    this.ActionManager = new ActionManager(this);
    this.DataView = new DataView(this);
    this._flowMonitor = FlowMonitorQueue.Instance;
    this.ContextTask = this;
    this._dvCache = new DvCache(this);
    this.MenuUid = Manager.GetCurrentRuntimeContext().LastClickedMenuUid;
    Manager.GetCurrentRuntimeContext().LastClickedMenuUid = 0;
    this.PerformParentRecordPrefix = true;
    this.DataviewManager = new DataviewManager(this);
    this.TaskTransactionManager = new TaskTransactionManager(this);
  }

  private constructor_1(parent: Task): void {
    this.constructor_0();
    this.PathParentTask = parent;
    this._parentTask = parent;
    this._triggeringTask = null;
    this.buildTaskPath();
  }

  // ITask Members
  /// <summary>
  ///   tells whether the task is aborting
  /// </summary>
  isAborting(): boolean {
    return this._aborting;
  }

  private buildTaskPath(): void {
    this._taskPath = new List<Task>();
    if (this._parentTask._taskPath !== null)
      this._taskPath.AddRange(this._parentTask._taskPath.GetEnumerator());
    this._taskPath.push(this);
  }

  /// <summary>
  ///   get the task data by parsing the xml string
  /// </summary>
  /// <param name = "mgd">reference to MGData</param>
  /// <param name="openingTaskDetails">additional information of opening task</param>
  fillData(mgd: MGData, openingTaskDetails: OpeningTaskDetails): void {
    // If this task was opened by an "open window" command - connect him to its parent
    if (!super.isMainProg()) {
      if (this._parentTask === null && openingTaskDetails.CallingTask !== null) {
        this._parentTask = openingTaskDetails.CallingTask;
        this.buildTaskPath();
        openingTaskDetails.CallingTask.addSubTask(this);
      }
      if (this.PathParentTask === null && openingTaskDetails.PathParentTask !== null) {
        this.PathParentTask = openingTaskDetails.PathParentTask;
      }
    }
    // for MG_ACT_ZOOM action enable
    if (this._parentTask !== null && this._parentTask.getEnableZoomHandler()) {
      this.setEnableZoomHandler();
    }

    this._mgData = mgd;
    this.fillAttributes();

    this._mgData.addTask(this);

    let parentForm: MgFormBase = (this._parentTask !== null) ? this._parentTask.getForm() : null;

    while (this.initInnerObjects(ClientManager.Instance.RuntimeCtx.Parser.getNextTag(), parentForm)) {
    }

      this.initCtrlVerifyHandlerBits();
      this.TaskTransactionManager.PrepareTransactionProperties(this.DataviewManager.RemoteDataviewManager.Transaction, false);

      this.HandleTriggerTask();
      this.HandlePreviouslyActiveTaskId();

    if (this.Form !== null) {
      this.Form.FormToBoActivatedOnClosingCurrentForm = openingTaskDetails.FormToBeActivatedOnClosingCurrentForm;
    }

    // Set isSubform flag
    this.CheckAndSetSubForm();

    if (this.IsSubForm) {
      // get the subform control from the parent task
      let subFormCtrl: MgControl = (<MgForm>this.getParent().getForm()).getSubFormCtrlForTask(this._taskTag);
      if (subFormCtrl !== null) {
        subFormCtrl.setSubformTaskId(this._taskTag);
      }

      // update the form with the subform control from the parent task
      if (this.Form !== null) {
        (<MgForm>this.Form).setSubFormCtrl(subFormCtrl);
      }
    }
  }

  /// handle the PreviouslyActiveTaskId
  /// </summary>
  HandlePreviouslyActiveTaskId(): void {
    if (this._parentTask !== null && this._parentTask.GetContextTask() !== null && this._mgData !== this._parentTask.getMGData())
      this.PreviouslyActiveTaskId = this._parentTask.GetContextTask().getTaskTag();
    else if (this._parentTask !== null)
        this.PreviouslyActiveTaskId = this._parentTask.getTaskTag();
      }

  /// <summary>
  /// handle the trigger task
  /// </summary>
  HandleTriggerTask(): void {
    this._triggeringTask = this._parentTask;
  }

  FillTaskTables(taskTablesData: string): void;
  FillTaskTables(): void;
  FillTaskTables(taskTablesData?: string): void {
    if (arguments.length === 1) {
      this.FillTaskTables_0(taskTablesData);
      return;
    }
    this.FillTaskTables_1();
  }

  private FillTaskTables_0(taskTablesData: string): void {
  }

  /// <summary>
  ///   get the task attributes
  /// </summary>
  fillAttributes(): void {
    let endContext: number = ClientManager.Instance.RuntimeCtx.Parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, ClientManager.Instance.RuntimeCtx.Parser.getCurrIndex());
    if (endContext !== -1 && endContext < ClientManager.Instance.RuntimeCtx.Parser.getXMLdata().length) {
      super.fillAttributes();

      // QCR #759911: mprg must belong to the main application's MGData.
      // This ensures it will not be discarded until the end of execution.
      if (super.isMainProg())
        this._mgData = MGDataCollection.Instance.getMGData(0);
    }
    else {
      Logger.Instance.WriteExceptionToLogWithMsg("in Task.fillAttributes() out of string bounds");
    }
  }

  /// <summary>
  ///   set the task attributes
  /// </summary>
  public setAttribute(attribute: string, valueStr: string): boolean {
    let isTagProcessed: boolean;
    isTagProcessed = super.setAttribute(attribute, valueStr);
    if (!isTagProcessed) {
      isTagProcessed = true;
      switch (attribute) {
        case ConstInterface.MG_ATTR_REFRESHON:
          if (!(valueStr.trim() === ""))
                        this.SetRefreshOnVars(valueStr);
          break;
        case XMLConstants.MG_ATTR_NAME:
                          this.Name = valueStr;
          break;
        case ConstInterface.MG_ATTR_DVPOS_DEC:
          if (!(valueStr.trim() === ""))
            this.setDescriptor(valueStr);
          break;
        case ConstInterface.MG_ATTR_HAS_LOCATE:
                        this.hasLocate = true;
          break;
        case ConstInterface.MG_ATTR_AS_PARENT:
                      this.ModeAsParent = true;
          break;
        case ConstInterface.MG_ATTR_TASK_UNIQUE_SORT:
          this.UniqueSort = <UniqueTskSort>valueStr[0];
          break;
        case ConstInterface.MG_ATTR_TRANS_ID:
                          this.setRemoteTransaction(valueStr);
          break;
        case ConstInterface.MG_ATTR_PUBLIC:
                        this.PublicName = XmlParser.unescape(valueStr);
          break;
        case XMLConstants.MG_ATTR_IS_OFFLINE:
          this.IsOffline = XmlParser.getBoolean(valueStr);
          break;
        case XMLConstants.MG_ATTR_RETURN_VALUE_EXP:
                      this.RetrunValueExp = XmlParser.getInt(valueStr);
          break;
        case XMLConstants.MG_ATTR_MENUS_FILE_NAME:
          this._menusFileName = valueStr;
          break;
        default:
          isTagProcessed = false;
          break;
                    }
                  }
    if (!isTagProcessed)
      Logger.Instance.WriteExceptionToLogWithMsg(NString.Format("Unrecognized attribute: '{0}'", attribute));
    return true;
  }

  /// <summary>
  ///   To allocate and fill inner objects of the class
  /// </summary>
  /// <param name = "foundTagName">possible tag name , name of object, which need be allocated</param>
  initInnerObjects(foundTagName: string, parentForm: MgFormBase): boolean {
    if (foundTagName == null)
      return false;
    let isTagProcessed: boolean = super.initInnerObjects(foundTagName, parentForm);
    if (!isTagProcessed) {
      isTagProcessed = true;
      switch (foundTagName) {
        case XMLConstants.MG_TAG_FORMS:
          this._forms = new FormsTable(this, parentForm);
          Logger.Instance.WriteDevToLog(NString.Format("{0} ...", foundTagName));
          this._forms.fillData();
          break;
        case XMLConstants.MG_TAG_TASK:
          if (this.SubTasks == null)
            this.SubTasks = new TasksTable();
          let subtask = new Task(this);
          this.SubTasks.addTask(subtask);
          let mgd: MGData = this._mgData;
          if (this.isMainProg())
            mgd = MGDataCollection.Instance.GetMGDataForStartupProgram();
          subtask.fillData(mgd, new OpeningTaskDetails());
          break;
        case ConstInterface.MG_TAG_TASKURL:
          ClientManager.Instance.ProcessTaskURL();
          break;
        case ConstInterface.MG_TAG_EXPTABLE:
          if (this.ExpTab == null)
                            this.ExpTab = new ExpTable();
                          Logger.Instance.WriteDevToLog("goes to exp");
                          this.ExpTab.fillData(this);
          break;
        case ConstInterface.MG_TAG_USER_EVENTS:
          if (this.UserEvtTab == null)
            this.UserEvtTab = new UserEventsTable();
          Logger.Instance.WriteDevToLog("goes to user event tab");
          this.UserEvtTab.fillData(this);
          break;
        case ConstInterface.MG_TAG_LINKS:
                        this.DataviewHeadersTable = new DataviewHeaders(this);
                        this.DataviewHeadersTable.fillData();
          break;
        case ConstInterface.MG_TAG_SORTS:
          this.RuntimeSorts = new SortCollection();
          this.RuntimeSorts.fillData(this);
          break;
        case ConstInterface.MG_TAG_TASK_TABLES:
          this.FillTaskTables();
          break;
        case XMLConstants.MG_TAG_RECOMPUTE:
          Logger.Instance.WriteDevToLog("goes to recompute");
          this.RecomputeFillData();
          break;
        case ConstInterface.MG_TAG_EVENTHANDLERS:
          Logger.Instance.WriteDevToLog("goes to eventhandlers");
          if (this.HandlersTab == null)
            this.HandlersTab = new HandlersTable();
          this.HandlersTab.fillData(this);
          this.addExpHandlersToMGData();
          break;
        default:
          if (foundTagName === ("/" + XMLConstants.MG_TAG_TASK)) {
                  ClientManager.Instance.RuntimeCtx.Parser.setCurrIndex2EndOfTag();
            return false;
                }
          else isTagProcessed = false;
          break;
            }
          }
    if (!isTagProcessed) {
        Logger.Instance.WriteDevToLog("There is no such tag in Task.initInnerObjects . Enter case for " + foundTagName);
      return false;
      }
    return true;
      }

  RecomputeFillData(): void {
    let recomputeTable: RecomputeTable = new RecomputeTable();
    recomputeTable.fillData_1(<DataView>this.DataView, this);
  }

  private FillTaskTables_1(): void {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;
    // Get the end of the task table element
    let endContext: number = parser.getXMLdata().indexOf( ConstInterface.MG_TAG_TASK_TABLES_END, parser.getCurrIndex());
    endContext = parser.getXMLdata().indexOf( XMLConstants.TAG_CLOSE, endContext) + XMLConstants.TAG_CLOSE.length;
    // get the task table xml string
    let taskTablesData: string = parser.getXMLsubstring(endContext);
    this.FillTaskTables(taskTablesData);
    parser.setCurrIndex(endContext);
  }

  /// <summary>
  ///   fill the control verification handler bits
  /// </summary>
  initCtrlVerifyHandlerBits(): void {
    Debug.Assert(this.HandlersTab !== null);

    // go over the task handlers
    for (let i: number = 0; i < this.HandlersTab.getSize(); i = i + 1) {
      let aHandler: EventHandler = this.HandlersTab.getHandler(i);

      // for each handler which is a ctrlVerify handler
      if (InternalInterface.MG_ACT_CTRL_VERIFICATION === aHandler.getEvent().getInternalCode()) {
        // locate the control and update the relevant bit
        let hndCtrl: MgControl = aHandler.getStaticCtrl();
        if (hndCtrl !== null)
          hndCtrl.HasVerifyHandler = true;
        }
      }
    }

  /// <summary>
  ///   add handlers triggered by expressions to mgdata
  /// </summary>
  private addExpHandlersToMGData(): void {
    let idx: number = 0;
    for (let i: number = this.HandlersTab.getSize() - 1; i >= 0; i--) {
      let handler: EventHandler = this.HandlersTab.getHandler(i);
      let evt: Event = handler.getEvent();
      if (evt.getType() === ConstInterface.EVENT_TYPE_EXPRESSION ||
        (evt.getType() === ConstInterface.EVENT_TYPE_USER && evt.getUserEventType() === ConstInterface.EVENT_TYPE_EXPRESSION)) {
        this._mgData.addExpHandler(handler, idx);
        idx++;
      }
    }
  }

  /// <summary>
  ///   get the refresh on variable list
  /// </summary>
  public SetRefreshOnVars(variables: string): void {
    let strTok: string[] = StrUtil.tokenize(variables, ",");
    let fldNum: number;
    let intVals = new List<number>();
    let i: number;
    for (i = 0; i < strTok.length; i++) {
      fldNum = NNumber.Parse(strTok[i]);
      intVals.push(fldNum);
    }
    this.RefreshOnVars = new Array(intVals.length);
    for (i = 0; i < intVals.length; i++) {
      fldNum = intVals.get_Item(i);
      this.RefreshOnVars[i] = fldNum;
    }
  }

  /// <summary>
  ///   set the DataSynced property of task
  /// </summary>
  setDataSynced(synced: boolean): void {
    this.DataSynced = synced;
  }

  /// <summary>
  ///   get a field by its name
  /// </summary>
  /// <param name = "fldName">of the field</param>
  /// <returns> the field by its name</returns>
  getField(fldName: string): Field {
    return (<DataView>this.DataView).getFieldByName(fldName);
  }

  /// <summary>
  ///   return an expression by its id
  /// </summary>
  /// <param name = "id">id of the expression</param>
  getExpById(id: number): Expression {
    if (this.ExpTab !== null)
      return this.ExpTab.getExpById(id);
    else
      Logger.Instance.WriteExceptionToLogWithMsg("in Task.GetExpById(): no expression table");
    return null;
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
  CalculateExpression(expId: number, resType: StorageAttribute, length: number, contentTypeUnicode: boolean, resCellType: StorageAttribute): string {
    let result: string = null;
    if (expId > 0) {
      let expById: Expression = this.getExpById(expId);
      Debug.Assert(expById !== null);
      result = expById.evaluateWithResultTypeAndLength(resType, length);
    }
    return result;
  }

  /// <summary>
  /// Evaluate the expression whose id is 'expressionId', expecting the result to be
  /// a unicode value.
  /// </summary>
  /// <param name="expressionId">The expression number to evaluate</param>
  /// <param name="result">The evaluation result</param>
  /// <returns>
  /// The method returns 'true' if it evaluated the expression. Otherwise
  /// it returns 'false', in which case the value of result should not be regarded.
  /// </returns>
  EvaluateExpressionAsUnicode(expressionId: number, value: RefParam<string>): boolean {
    let wasEvaluated: RefParam<boolean> = new RefParam<boolean>(false);
    value.value = this.EvaluateExpression(expressionId, StorageAttribute.UNICODE, 0, false, StorageAttribute.NONE, true, wasEvaluated);
    return wasEvaluated.value;
  }

  /// <summary>
  /// Evaluate the expression whose id is 'expressionId', expecting the result to be
  /// a long numeric value.
  /// </summary>
  /// <param name="expressionId">The expression number to evaluate</param>
  /// <param name="result">The evaluation result</param>
  /// <returns>
  /// The method returns 'true' if it evaluated the expression. Otherwise
  /// it returns 'false', in which case the value of result should not be regarded.
  /// </returns>
  EvaluateExpressionAsLong(expressionId: number, result: RefParam<number>): boolean {
    result.value = 0;
    let evalutationResult: ExpVal;
    let wasEvaluated: boolean = false;
    if (expressionId > 0) {
      let exp: Expression = this.getExpById(expressionId);
      Debug.Assert(exp !== null);

      evalutationResult = exp.evaluateWithResType(StorageAttribute.NUMERIC);
      result.value = evalutationResult.MgNumVal.NUM_2_LONG();
      wasEvaluated = true;
    }
    return wasEvaluated;
  }

  /// <summary>
  ///   Insert Record Table to dataview of the task if it came after closing task tag
  /// </summary>
  insertRecordTable(invalidate: boolean): void {
    // check cache logic only for sub-forms
    if (this.isCached()) {
      let firstTime: boolean = (<DataView>this.DataView).getFirstDv();
      // if it is the first time the task get dv or the old dv is not invalidated or
      // the old dv does not include the first record do not put in cache
      if (!firstTime && invalidate) {
        if (!this.hasLocate) {
          // the old d.v was not updated put it in cache (its replicate)
          if ((<DataView>this.DataView).IncludesFirst()) {
            if (!(<DataView>this.DataView).getChanged())
              this._dvCache.putInCache((<DataView>this.DataView).replicate());
            else
              this._dvCache.removeDvFromCache((<DataView>this.DataView).getDvPosValue(), true);
            }
          }
        else this.locatePutInCache();
        }
        }
    // parse the new dataview
    (<DataView>this.DataView).fillData();

    if (invalidate)
      (<DataView>this.DataView).setChanged(false);
    }

  /// <summary>
  ///   get the handlers table
  /// </summary>
  getHandlersTab(): HandlersTable {
    return this.HandlersTab;
  }

  /// <summary>
  ///   build the XML string for the dataview
  /// </summary>
  buildXML(message: StringBuilder): void {
    this.IsAfterRetryBeforeBuildXML = this.getAfterRetry();
    if (this.KnownToServer && !this.IsOffline) {
      message.Append(XMLConstants.START_TAG + XMLConstants.MG_TAG_TASK);
      message.Append(" " + XMLConstants.MG_ATTR_TASKID + "=\"" + this.getTaskTag() + "\"");
      message.Append(" " + ConstInterface.MG_ATTR_TASK_MAINLEVEL + "=\"" + this.getMainLevel() + "\"");
      message.Append(" " + ConstInterface.MG_ATTR_TASK_FLOW_DIRECTION + "=\"" + <string>this.getFlowModeDir() + "\"");
      message.Append(XMLConstants.TAG_CLOSE);
      (<DataView>this.DataView).buildXML(message);
      if (this.Form != null && this.Form.Opened)
        message.Append((<MgForm>this.Form).GetHiddenControlListXML());
      message.Append("\n   </" + XMLConstants.MG_TAG_TASK + XMLConstants.TAG_CLOSE);
      }
    }

  /// <summary>
  ///   build the XML string for the ranges
  /// </summary>
  buildXMLForRngs(message: StringBuilder, UserRanges: List<UserRange>, locate: boolean): void {
    let i: number;
    let fld: Field;
    let cellAttr: StorageAttribute = StorageAttribute.SKIP;
    let toBase64: boolean = (ClientManager.Instance.getEnvironment().GetDebugLevel() <= 1);

    message.Append(XMLConstants.TAG_CLOSE);
    for (i = 0; i < UserRanges.length; i++) {
      message.Append(XMLConstants.START_TAG + ConstInterface.USER_RNG);

      let rng: UserRange = UserRanges.get_Item(i);

      message.Append(" " + XMLConstants.MG_TAG_FLD + "=\"" + rng.veeIdx + "\"");

      fld = <Field>this.DataView.getField(<number>rng.veeIdx - 1);
      let fldAttr: StorageAttribute = fld.getType();

      if (rng.nullMin)
        message.Append(" " + ConstInterface.NULL_MIN_RNG + "=\"1\"");

      if (!rng.discardMin && rng.min != null) {
        let val: string = Record.itemValToXML(rng.min, fldAttr, cellAttr, toBase64);
        message.Append(" " + ConstInterface.MIN_RNG + "=\"" + val + "\"");
      }

      if (rng.nullMax)
        message.Append(" " + ConstInterface.NULL_MAX_RNG + "=\"1\"");

      if (!rng.discardMax && rng.max != null) {
        let val: string = Record.itemValToXML(rng.max, fldAttr, cellAttr, toBase64);
        message.Append(" " + ConstInterface.MAX_RNG + "=\"" + val + "\"");
      }

      message.Append(XMLConstants.TAG_TERM);
      }
    if (locate)
      message.Append(XMLConstants.END_TAG + ConstInterface.USER_LOCATES + XMLConstants.TAG_CLOSE);
    else
      message.Append(XMLConstants.END_TAG + ConstInterface.USER_RANGES + XMLConstants.TAG_CLOSE);
      }

  /// <summary>
  ///   build the XML string for the user added sorts
  /// </summary>
  buildXMLForSorts(message: StringBuilder): void {
    if (this.UserSorts != null && this.UserSorts.length > 0) {
      let i: number;
      for (i = 0; i < this.UserSorts.length; i++) {
        message.Append(XMLConstants.TAG_CLOSE);
        let srt: Sort = this.UserSorts.get_Item(i);

        message.Append(XMLConstants.START_TAG + ConstInterface.SORT);
        message.Append(" " + XMLConstants.MG_TAG_FLD + "=\"" + srt.fldIdx + "\"");
        if (srt.dir)
          message.Append(" " + ConstInterface.MG_ATTR_DIR + "=\"1\"");

        message.Append(XMLConstants.TAG_TERM);
        }
      this.UserSorts.Clear();
      this.UserSorts = null;
      message.Append(XMLConstants.END_TAG + ConstInterface.MG_TAG_SORTS + XMLConstants.TAG_CLOSE);
    }
  }

  /// <summary>
  ///   returns a user event by its index
  /// </summary>
  /// <param name = "idx">the index of the requested event</param>
  getUserEvent(idx: number): Event {
    Debug.Assert(this.UserEvtTab !== null);
    let retEvent: Event = null;
    if (this.UserEvtTab !== null)
      retEvent = this.UserEvtTab.getEvent(idx);
    return retEvent;
    }

  /// <summary> Set the MoveToFirstControl flag on the form. </summary>
  /// <param name="moveToFirstControl"></param>
  private SetMoveToFirstControl(moveToFirstControl: boolean): void {
    if (moveToFirstControl || !this.IsSubForm) {
      if (this.Form !== null) {
        // this is a call destination/ subform call
        // We perform move to first control only to one control form per request - the first one that we receive
        let alreadyMoved: boolean = (<MgForm>this.Form).alreadyMovedToFirstControl();
        if (!alreadyMoved)
          (<MgForm>this.Form).MovedToFirstControl = true;
        }
      }
    }

  /// <summary>
  ///   start the execution of the task and its subTasks
  /// </summary>
  Start(moveToFirstControl: boolean, callByDestSubForm: boolean): ITask {
    let nonInteractiveTask: Task = null;

    if (!this._isStarted) {
      this._isStarted = true;

      this.InitializeExecution();

      this.InStartProcess = true;
      let result: ReturnResult = this.Setup();

      // task initialization failed - close the task
      if (!result.Success)
        return null;

      this._inProcessingTopMostEndTaskSaved = ClientManager.Instance.EventsManager.getProcessingTopMostEndTask();
      ClientManager.Instance.EventsManager.setProcessingTopMostEndTask(false);

      this.EnableActions();

      if (this._isMainPrg || this.Form == null)
        Manager.MenuManager.getApplicationMenus(this);

      nonInteractiveTask = this.InitializeForm(moveToFirstControl, nonInteractiveTask);

      this.DataViewWasRetrieved = true;

      // QCR # 167332 :
      // If we start porgram P1, for which MP is started. MP is calling P2 from it's TP. So, when it calls P2
      // again it starts MP, but from MP it again starts P1. as P1 is in it's subtask and it is not yet started.
      // So, it's wrong to start P1 while executing TP of MP. It should execute only P2.
      // So, in order to avoid this, set MP's subtasks to null before entering TP. and again restore it back, in order to
      // start P1 properly.
      let subTasks: TasksTable = this.SubTasks;
      if (this.isMainProg())
        this.SubTasks = null;
      if (this.isMainProg())
        this.SubTasks = subTasks;

      if (!result.Success)
        return null;
      if (this._aborting)
        return null;

      let dataViewCommand: IClientCommand = CommandFactory.CreateDataViewCommand(this.getTaskTag(), DataViewCommandType.FirstChunk);
      result = this.DataviewManager.Execute(dataViewCommand);

      if (!result.Success)
        return null;

      this.ResumeSubformLayout(false);
    }
    nonInteractiveTask = this.StartSubTasks(moveToFirstControl, nonInteractiveTask, callByDestSubForm);
    this.InStartProcess = false;
    return nonInteractiveTask;
  }

  CanResumeSubformLayout(): boolean {
    // wait till we retrive dataview (relevant for local) before resuming layout
    // number of records affect visibility of scrollbar and initial table pacement
    return this.DataViewWasRetrieved;
  }

  /// <summary>
  /// Initialize execution-related stuff.
  /// This method should be called ONLY from Task.Start
  /// </summary>
  private InitializeExecution(): void {
    // currently the is no control executing there for the
    // current executing control index is set to -1
    super.setBrkLevel(ConstInterface.BRK_LEVEL_REC_MAIN, -1);
    this._firstRecordCycle = true;      // While starting a Task, set firstRecordCycle = TRUE

    this._currStartProgLevel = ((this.IsSubForm && (<MgForm>this.getParent().getForm()).alreadyMovedToFirstControl())
      ? this.getParent()._currStartProgLevel
      : ClientManager.Instance.StartProgLevel);
  }

  /// <summary>
  /// initialize form-related stuff
  /// </summary>
  /// <param name="moveToFirstControl"></param>
  /// <param name="nonInteractiveTask"></param>
  /// <returns></returns>
  private InitializeForm(moveToFirstControl: boolean, nonInteractiveTask: Task): Task {
    if (this.Form !== null) {
      if (!this._isMainPrg)
        this.resetRcmpTabOrder();

      // set MoveToFirstControl flag on the form.
      this.SetMoveToFirstControl(moveToFirstControl);

      // the InitForm might cause execution of code (variable change) so we should do it with a new server execution stack
      ClientManager.Instance.EventsManager.pushNewExecStacks();

      // initialize the current task's form.
      nonInteractiveTask = <Task>(this.InitForm());

      ClientManager.Instance.EventsManager.popNewExecStacks();

      this.getMGData().StartTimers();
      Commands.beginInvoke();
    }
    return nonInteractiveTask;
  }

  /// <summary>
  /// start sub tasks of this task
  /// </summary>
  /// <param name="moveToFirstControl"></param>
  /// <param name="nonInteractiveTask"></param>
  /// <returns></returns>
  private StartSubTasks(moveToFirstControl: boolean, nonInteractiveTask: Task, callByDestSubForm: boolean): Task {
    if (this.hasSubTasks()) {
      for (let i: number = 0; i < this.SubTasks.getSize(); i = i + 1) {
        let task: Task = this.SubTasks.getTask(i);
        let tmpNonInteractiveTask: Task = <Task>(task.Start(moveToFirstControl, callByDestSubForm));
        if (nonInteractiveTask === null)
          nonInteractiveTask = tmpNonInteractiveTask;
        else if (tmpNonInteractiveTask !== null)
            Debug.Assert(false, "more than 1 non interactive in task.start");
          }
        }

    return nonInteractiveTask;
  }

  private EnableActions(): void {
    let actList: number[] = this.HasMDIFrame ? ActionManager.actMDIFrameEnabled : ActionManager.actEnabled;
    this.ActionManager.enableList(actList, true, false);

    if (this.IsSubForm)
      this.ActionManager.enable(InternalInterface.MG_ACT_POST_REFRESH_BY_PARENT, true);

    if (!this.HasMDIFrame) {
      // when we have default button then enable the action
      if (this.Form != null && (<MgForm>this.Form).getDefaultButton(false) != null)
        this.ActionManager.enable(InternalInterface.MG_ACT_DEFAULT_BUTTON, true);

      // enable actions depending on task properties
      this.enableModes();
      if (this.checkProp(PropInterface.PROP_TYPE_SELECTION, false)) {
        if ((this.Form.getProp(PropInterface.PROP_TYPE_DEFAULT_BUTTON)).getValue() !== "") {
          let defaultButtonName: string = (this.Form.getProp(PropInterface.PROP_TYPE_DEFAULT_BUTTON)).getValue();
          let ctrl: MgControl = (<MgForm>this.Form).getCtrlByCtrlName(defaultButtonName);
          let aRtEvt = new RunTimeEvent(ctrl);
          if (aRtEvt.getType() === ConstInterface.EVENT_TYPE_INTERNAL &&
            aRtEvt.getInternalCode() === InternalInterface.MG_ACT_SELECT)
            this.ActionManager.enable(InternalInterface.MG_ACT_SELECT, true);
        }
        else this.ActionManager.enable(InternalInterface.MG_ACT_SELECT, true);
      }

      let enablePrintdata: boolean = this.checkProp(PropInterface.PROP_TYPE_PRINT_DATA, false);
      this.ActionManager.enable(InternalInterface.MG_ACT_PRINT_DATA, enablePrintdata);
    }
  }

  /// <summary>
  /// show error on task's form
  /// </summary>
  /// <param name="text"></param>
  ShowError(text: string): void {
    // Fixed bug #311878, while the task is in abort and we try to display message box,
    //                   the form is dispose and then we get the message box command in GuiInteractive,
    //                   so if the task in abort we will send null and form (so the command will create a dummy form).
    let currForm: MgForm = (this.InStartProcess || this.isAborting()) ? null : (<MgForm>super.getTopMostForm());
    let mlsTransText: string = ClientManager.Instance.getLanguageData().translate(text);
    let mlsTransTitle: string = ClientManager.Instance.getLanguageData().translate(ConstInterface.ERROR_STRING);
    // mls ???
    Commands.messageBox(currForm, mlsTransTitle, mlsTransText, Styles.MSGBOX_ICON_ERROR | Styles.MSGBOX_BUTTON_OK);
  }

  /// <summary>
  /// check the result. If failed - display the error messagebox and end the task
  /// </summary>
  /// <param name="result"></param>
  /// <returns></returns>
  EndTaskOnError(result: ReturnResult, displayError: boolean): boolean {
    if (!result.Success && !this.isAborting()) {
      if (this.InStartProcess) {
        this.endTask(false, false, false);
        if (displayError)
          this.ShowError(result.ErrorDescription);
        this.InStartProcess = false;
        return true;
      }
      else {
        if (displayError)
        this.ShowError(result.ErrorDescription);
        ClientManager.Instance.EventsManager.handleInternalEventWithTask(this, InternalInterface.MG_ACT_EXIT);
      }
    }

    return false;
  }

  /// <summary>
  ///
  /// </summary>
  /// <returns></returns>
  private Setup(): ReturnResult {
    let result: ReturnResult;
    this.TaskService.InitTaskPrefixExecutedFlag(this);
    this.TaskSuffixExecuted = false;

    TaskServiceBase.CreateFirstRecord(this);

    // init data view
    // Note: Even if the resultInitMode is false we MUST init the data view
    let dataViewCommand: IClientCommand = CommandFactory.CreateDataViewCommand(this.getTaskTag(), DataViewCommandType.Init);
    result = this.DataviewManager.Execute(dataViewCommand);

    // need to check result(of the data view init and if not success then return this error
    if (!result.Success)
      return result;

    if (result.Success) {
      // Execute the command, whose execution was delayed becuase task was not started. So Excute those commands after task started.
      let commands: List<IClientTargetedCommand> = ClientManager.Instance.getCommandsExecutedAfterTaskStarted();

      for (let cmdIdx: number = 0; cmdIdx < commands.length; cmdIdx++) {
        let command: IClientTargetedCommand = (commands.get_Item(cmdIdx));
        if (command.TaskTag === this.getTaskTag()) {
          command.Execute(null);
          ClientManager.Instance.removeCommandsExecutedAfterTaskStarted(command);
          }
        }

      dataViewCommand = CommandFactory.CreateDataViewCommand(this.getTaskTag(), DataViewCommandType.Prepare);
      result = this.DataviewManager.Execute(dataViewCommand);
        }

    if (result.Success) {
      result = this.TaskService.PrepareTask(this);
      if (!result.Success)
        this.EndTaskOnError(result, true);
      }

    if (result.Success) {
      dataViewCommand = CommandFactory.CreateDataViewCommand(this.getTaskTag(), DataViewCommandType.InitDataControlViews);
      result = this.DataviewManager.Execute(dataViewCommand);
    }
    return result;
  }

  /// <summary>
  /// set the arguments on the task parameters
  /// </summary>
  /// <param name="task"></param>
  /// <param name="args"></param>
  CopyArguments(args: ArgumentsList): void {
    let fieldsTable: FieldsTable = <FieldsTable>(this.DataView.GetFieldsTab());

    let numberOfArguments: number = (args != null) ? args.getSize() : 0;
    let currentArgIndex: number = 0;
    let taskHasParameters: boolean = (<DataView>this.DataView).ParametersExist();

    if (numberOfArguments > 0) {
      let dvPos: number = (<DataView>this.DataView).GetRecordMainIdx();
      let dvSize: number = (<DataView>this.DataView).GetRecordMainSize();

      // Go over the fields, find the fields to set the arguments to
      for (let i: number = dvPos; (i < dvSize) && (currentArgIndex < numberOfArguments); i++) {
        let field: Field = <Field>(fieldsTable.getField(i));

        if (!field.IsForArgument(taskHasParameters))
          continue;

        // get the argument
        let arg: Argument = args.getArg(currentArgIndex);
        if (arg.skipArg()) {
          field.invalidate(true, Field.CLEAR_FLAGS);
            field.compute(false);
          }
        else
          arg.setValueToField(field);

        currentArgIndex++;
      }
    }
  }

  /// <summary>
  ///   do first record prefix & suffix
  ///   This function is executed only for connected task.
  ///   For offline task we run EnterFirstRecord function. There we execute RP and open subforms.
  /// </summary>
  doFirstRecordCycle(): void {
    if (!this._isMainPrg) {
      ClientManager.Instance.EventsManager.pushNewExecStacks();
      this.SubformExecMode = Task_SubformExecModeEnum.FIRST_TIME;
      ClientManager.Instance.EventsManager.handleInternalEventWithTaskAndSubformRefresh(this, InternalInterface.MG_ACT_REC_PREFIX, this.IsSubForm);

      if (!ClientManager.Instance.EventsManager.GetStopExecutionFlag()) {
        if (this.IsSubForm) {
          if (this.hasSubTasks())
            for (let i: number = 0; i < this.SubTasks.getSize(); i++) {
              let subTask: Task = this.SubTasks.getTask(i);
              if (subTask.IsSubForm) {
                (<MgForm>subTask.getForm()).IgnoreFirstRecordCycle = true;
                subTask.doFirstRecordCycle();
            }
          }
          ClientManager.Instance.EventsManager.handleInternalEventWithTask(this, InternalInterface.MG_ACT_REC_SUFFIX);
        }
      }

      this.SubformExecMode = Task_SubformExecModeEnum.SET_FOCUS;
      ClientManager.Instance.EventsManager.popNewExecStacks();
    }
  }

  /// <summary>
  ///   returns true if this task is a sub form by its mgd definition (used only while initiating task for setting isSubform)
  /// </summary>
  private CheckAndSetSubForm(): void {
    this.IsSubForm = (!super.isMainProg() && this !== this._mgData.getFirstTask());
  }

  /// <summary>
  ///   returns true if this task is a sub form under frame set (not pure sub form)
  /// </summary>
  isSubFormUnderFrameSet(): boolean {
    return this.IsSubForm && this._parentTask.getForm().IsFrameSet;
  }

  IsRoute() {
    return (this.RouterPath != null);
  }

  /// <summary>
  ///   moves the cursor to the first parkable control in the task
  /// </summary>
  /// <param name = "formFocus">if true and if no control found - focus on form</param>
  moveToFirstCtrl(formFocus: boolean): void {
    (<MgForm>this.Form).moveToFirstCtrl(false, formFocus);
  }

  /// <summary>
  ///   stop the execution of a program
  /// </summary>
  stop(): void {
        let task: Task;
    let form: MgFormBase = this.getForm();

    if (this._aborting)
      return;

    if (this.hasSubTasks()) {
      while ((task = this.SubTasks.getTask(0)) != null) {
          task.setDestinationSubform(this._destinationSubform);
          task.stop();
        }
      }

    if (!this._isMainPrg)
        this._aborting = true;

    if (form != null)
        form.SaveUserState();

    // if this task and its parent are from different MGDATA objects then disconnect
    // them by removing the reference to this task from its parent
    if (this._parentTask != null) {
      (<Task>this._parentTask).removeSubTask(this);
      if (this.IsSubForm) {
        let oldTimers: List<number> = new List<number>(), newTimers = new List<number>();
        let mgd = this.getMGData();

        if (mgd.getTimerHandlers() != null)
          oldTimers = mgd.getTimerHandlers().getTimersVector();
        mgd.removeTimerHandler(this);
        mgd.removeExpressionHandler(this);
        if (mgd.getTimerHandlers() != null)
          newTimers = mgd.getTimerHandlers().getTimersVector();
        mgd.changeTimers(oldTimers, newTimers);

        mgd.removeTask(this);
        GUIManager.Instance.abort(<MgForm>this.getForm());
        }
      }

      this.AbortTransaction();
      this.locateQuery.FreeTimer();

    // If the task got closed due to a click on same task, then set CurrentClickedCtrl to null
    if (this.getClickedControl() != null)
        ClientManager.Instance.RuntimeCtx.CurrentClickedCtrl = null;
    if (this.Form != null)
        (<MgForm>this.Form).removeRefsToCtrls();

    if (this.IsSubForm) {
      let subForm = <MgControl>this.Form.getSubFormCtrl();

      subForm.setSubformTaskId(null);
      subForm.initSubformTask();
        (<MgForm>this.Form).removeFromParentsTabbingOrder();
      if (ClientManager.Instance.getLastFocusedTask() === this)
          ClientManager.Instance.setLastFocusedTask(this._parentTask);

      // QCR #310113. If the subform task for was not loaded yet, do not refresh it.
      if (subForm.SubformLoaded)
        (subForm.getProp(PropInterface.PROP_TYPE_VISIBLE)).RefreshDisplay(true);
    }

    let clearDataViewCommand: IClientCommand = CommandFactory.CreateDataViewCommand(this.getTaskTag(), DataViewCommandType.Clear);
    this.DataviewManager.Execute(clearDataViewCommand);
  }

  /// <summary>
  /// abort the MgData to which the task belongs
  /// </summary>
  abort(): void {
    this.getMGData().abort();
  }

  /// <summary>
  ///   returns true if the task has sub-tasks
  /// </summary>
  hasSubTasks(): boolean {
    return this.SubTasks !== null && this.SubTasks.getSize() > 0;
  }

  /// <summary>
  ///   A number, 1-24, the current task's depth in the task execution hierarchy.
  /// </summary>
  /// <param name = "byParentOrder">if true, we travel the parents, otherwise we travel the triggering tasks</param>
  /// <returns> depth of the task, 1 if called from the root task</returns>
  getTaskDepth(byParentOrder: boolean): number {
    if (byParentOrder)
      return this.getTaskDepth_(byParentOrder);


    let depth: number = (<Task>this.GetContextTask()).getTaskDepth_(byParentOrder);

    // QCR 366748 if we are in a component handler add it to the path
    if (this.isMainProg() && this.getCtlIdx() !== ConstInterface.TOP_LEVEL_CONTAINER)
      depth = depth + 1;

    return depth;
  }

  /// <summary>
  ///   helper function which implements the getTaskDepth recursion.
  /// </summary>
  /// <param name = "byParentOrder">if true, we travel the parents, otherwise we travel the triggering tasks</param>
  private getTaskDepth_(byParentOrder: boolean): number {
    let tmpTask: Task = this.getTriggeringTask();
    if (tmpTask == null || byParentOrder)
      if (this._parentTask == null)
        return 1;
    else {
        /* if the ctlIdx of the current task and the parent are different,   */
        /* that is the current task is from a component, add the component's */
        /* Main Prg as well. */
        if (byParentOrder && this.getCtlIdx() !== this._parentTask.getCtlIdx())
          return 2 + (<Task>this._parentTask).getTaskDepth_(byParentOrder);
        return 1 + (<Task>this._parentTask).getTaskDepth_(byParentOrder);
    }
    return 1 + (tmpTask).getTaskDepth_(byParentOrder);
  }

  /// <summary>
  ///   get the ancestor of the Task
  /// </summary>
  /// <param name = "generation">of the ancestor task</param>
  GetTaskAncestor(generation: number): ITask {
    return this.getTaskAncestor_(generation);
  }

  /// <summary>
  ///
  /// </summary>
  private getTaskAncestor_(generation: number): ITask {
    let retTask: ITask = null;

    if (generation === 0)
      retTask = this;
    else {
      let tmpTask: Task = this.getTriggeringTask();
      if (tmpTask === null)
        tmpTask = this._parentTask;
      if (tmpTask !== null)
        retTask = tmpTask.getTaskAncestor_(--generation);
    }

    return retTask;
  }

  /// <summary>
  /// Returns task depth
  /// </summary>
  /// <returns></returns>
  GetTaskDepth(): number {
    return this.getTaskDepth(false);
  }

  /// <param name="task"></param>
  /// <returns>true iff the path of the current task contains the task passed as parameter</returns>
  pathContains(task: Task): boolean {
    return this._taskPath.Contains(task);
  }

  /// <summary>
  ///   sets the context task of this task
  /// </summary>
  /// <param name = "context">the new context task of the current task</param>
  SetContextTask(context: Task): void {
    this.ContextTask = context;
  }

  /// <summary>
  ///   returns the task which is the context of the currently executing handler.
  /// </summary>
  GetContextTask(): ITask {
    let currRec: Record = ((<DataView>this.DataView).getCurrRec());

    if (this.InStartProcess
      || currRec !== null && (currRec.InCompute || currRec.InRecompute)
      || this.Form !== null && this.Form.inRefreshDisplay())
      return this;

    return this.ContextTask;
  }

  /// <summary>
  ///   get a reference to the task that triggered the handler which created me
  /// </summary>
  getTriggeringTask(): Task {
    // This is a semi patch which fixes problems such as the ones in QCR #296428
    // When a modal task gets opened, it might set its triggering task to a task
    // whose 'abort' command arrived and is pending for execution. Under these
    // circumstances, we must check every access to triggeringTask and make sure
    // it points to a valid task.
    if (this._triggeringTask !== null && this._triggeringTask.getMGData().IsAborting)
      this._triggeringTask = this._parentTask;

    return this._triggeringTask;
  }

  /// <summary>
  ///   set the last parked control in this task
  /// </summary>
  /// <param name = "ctrl">last focused control</param>
  setLastParkedCtrl(ctrl: MgControlBase): void {
    super.setLastParkedCtrl(ctrl);
    GUIManager.setLastFocusedControl(this, ctrl);
  }

  /// <summary>
  ///   Query Task Path Returns the task path that leads to the current task. The resulting alpha string
  ///   contains the task names, as well as the current name of the task. Names are separated by the ';'
  ///   character. For PROG() using.
  /// </summary>
  queryTaskPath(): StringBuilder {
    let insertedNames: number = 0;        // how mach names inserted to the output string
    let result = new StringBuilder(7936); // 31 * 256 */
    let treeRoute = new Array(this.getTaskDepth(false));
    this.pathToRoot(treeRoute, false);
    for (let tsk: number = treeRoute.length - 1; tsk >= 0; tsk--) {
      let currTsk: Task = treeRoute[tsk];
      if (currTsk.isMainProg())
        continue;
      let nameProp: Property = currTsk.getProp(PropInterface.PROP_TYPE_NAME);
      if (nameProp == null)
        continue;
      let name: string = nameProp.getValue();
      if (!NString.IsNullOrEmpty(name)) {
        // if there is only 1 name -> don't insert ';'
        // after last name don't insert ';' too.
        if (insertedNames++ !== 0)
          result.Append(';');
        result.Append(name);
      }
    }
    return result;
  }

  /// <summary>
  ///   Get Field which contain item number itm
  /// </summary>
  ctl_itm_2_parent_vee(itm: number): Field {
    let currTsk: Task;
    let currItm: number = 0;
    let lastItm: number = 0;      // start of the field in fieldeTab number for checked task
    // save the route to the root in the treeRoute array
    let treeRoute = new Array(this.getTaskDepth(true));
    // the route up, the insert (our task) is [0], and exit (root) is [treeRoute.length-1]
    this.pathToRoot(treeRoute, true);

    for (let tsk: number = treeRoute.length - 1; tsk >= 0; tsk--) {
      currTsk = treeRoute[tsk];

      currItm += currTsk.DataView.GetFieldsTab().getSize();

      // found task which contains the needed field
      if (itm < currItm) {
        // number of Field in found task
        itm -= lastItm;
        return <Field>currTsk.DataView.getField(itm);
      }
      lastItm = currItm;
    }
    // not found the field
    return null;
  }

  /// <summary>
  /// Get the control id which contain field attached to control
  /// </summary>
  /// <param name="item"></param>
  /// <returns></returns>
  GetControlIDFromVarItem(item: number): number {
    let currTask: Task;
    let currItem: number = 0;
    let lastItem: number = 0;   // start of the field in fieldeTab number for checked task
    let noOfControlsBeforeCurrTask: number = 0;

    // save the route to the root in the treeRoute array
    let treeRoute = new Array(this.getTaskDepth(true));
    // the route up, the insert (our task) is [0], and exit (root) is [treeRoute.length - 1]
    this.pathToRoot(treeRoute, true);

    for (let task: number = treeRoute.length - 1; task >= 0; task--) {
      currTask = treeRoute[task];
      currItem += currTask.DataView.GetFieldsTab().getSize();

      // Found the task which contains the needed control & field
      if (item < currItem) {
        // Number of fields in found task
        item -= lastItem;

        let field: Field = <Field>currTask.DataView.getField(item);
        if (field.getCtrl() != null)
          return noOfControlsBeforeCurrTask = noOfControlsBeforeCurrTask + currTask.Form.getControlIdx(field.getCtrl()) + 1;

        return 0;
      }

      if (currTask.Form != null)
        noOfControlsBeforeCurrTask += currTask.Form.getCtrlCount();

      lastItem = currItem;
    }

    // Control attached to the variable in same task not found
    return 0;
  }

  /// <summary>
  /// Get the control from controlID
  /// </summary>
  /// <param name="controlID"></param>
  /// <returns></returns>
  GetControlFromControlID(controlID: number, parent: RefParam<number>): MgControl {
    let control: MgControl = null;
    parent.value = -1;

    if (controlID >= 0) {
      let currTask: Task = null;
      let callerTask: Task = null;
      let noOfControlsInCurrtask: number = 0;
      let noOfControlsBeforeCurrTask: number = 0;
      let controlIdx: number = 0;

      // save the route to the root in the treeRoute array
      let treeRoute = new Array(this.getTaskDepth(true));

      // the route up, the insert (our task) is [0], and exit (root) is [treeRoute.length - 1]
      this.pathToRoot(treeRoute, true);

      for (let task: number = treeRoute.length - 1; task >= 0; task--) {

        currTask = treeRoute[task];

        if (currTask.Form != null) {
          noOfControlsInCurrtask = currTask.Form.getCtrlCount();

          // Found the task which contains the needed control
          if (controlID < (noOfControlsBeforeCurrTask + noOfControlsInCurrtask)) {
            // Idx of the control in current task
            controlIdx = controlID - noOfControlsBeforeCurrTask;
            control = <MgControl>currTask.Form.CtrlTab.getCtrl(controlIdx);
            callerTask = currTask;
            break;
          }

          noOfControlsBeforeCurrTask += noOfControlsInCurrtask;
      }
          }

      // Get parent
      if (control != null) {
        parent.value = 0;
        let prevCtlIdx: number = treeRoute[0].TaskDefinitionId.CtlIndex;

        for (let task: number = 0; task < treeRoute.length - 1; task++) {
          currTask = treeRoute[task];

          if (prevCtlIdx !== currTask.TaskDefinitionId.CtlIndex)
            parent.value++;

          if (callerTask.TaskDefinitionId.CtlIndex === currTask.TaskDefinitionId.CtlIndex)
            break;

          prevCtlIdx = currTask.TaskDefinitionId.CtlIndex;
        }
      }
    }

    // Control corresponding to the specified ControlID
    return control;
  }

  /// <summary>
  /// </summary>
  ctl_itm_4_parent_vee(parent: number, vee: number): number {
    let tsk: Task;
    let depth: number = this.getTaskDepth(true);

    if (parent !== TaskBase.MAIN_PRG_PARENT_ID && depth <= parent)
      return vee;

    let treeRoute = new Array(depth);

    if (vee !== 0) {
      this.pathToRoot(treeRoute, true);

      // get the index of parent in the task tree
      let indOfParentInTaskTree: number = this.getIndOfParentInTaskTree(parent, treeRoute);

      let i: number;
      for (i = treeRoute.length - 1; i > indOfParentInTaskTree; i--) {
        tsk = treeRoute[i];
        vee += tsk.DataView.GetFieldsTab().getSize();
      }
    }
    return vee;
  }

  /// <summary>
  /// </summary>
  /// <param name = "parent"></param>
  /// <param name = "taskTree"></param>
  /// <returns></returns>
  getIndOfParentInTaskTree(parent: number, taskTree: Task[]): number {
    let indOfParentInTaskTree: number = 0;
    if (parent === TaskBase.MAIN_PRG_PARENT_ID) {
      for (let i: number = 1; i < taskTree.length; i = i + 1) {
        if (taskTree[i].isMainProg() && this._ctlIdx === taskTree[i].getCtlIdx()) {
          indOfParentInTaskTree = i;
          break;
        }
      }
    }
    else
      indOfParentInTaskTree = parent;

    return indOfParentInTaskTree;
  }

  /// <summary>
  ///   entry point to the recursion induced by getFieldByName_.
  /// </summary>
  /// <returns> a field which belongs to me or to my parents with the matching name</returns>
  getFieldByName(fldName: string): Field {
    return (<Task>this.GetContextTask()).getFieldByName_(fldName);
  }

  /// <summary>
  ///   find field with the name in task or its ancestors
  /// </summary>
  /// <param name = "fldName">name, the name can be empty string too</param>
  /// <returns> If the variable name is not found then the function will return NULL.</returns>
  private getFieldByName_(fldName: string): Field {
    let tmpTask: Task;

    if (fldName == null)
      return null;
    let fld: Field = this.getField(fldName);

    // if the field is not ours - recursive check the ancestors
    if (fld == null) {
      tmpTask = this.getTriggeringTask() != null ? this.getTriggeringTask() : <Task>this._parentTask;

      if (tmpTask != null) {
        if (!this.isMainProg() && this.getCtlIdx() !== tmpTask.getCtlIdx()) {
          let mainPrg: Task = <Task>MGDataCollection.Instance.GetMainProgByCtlIdx(this.getCtlIdx());
          fld = mainPrg.getFieldByName_(fldName);
        }

        if (fld == null)
          fld = tmpTask.getFieldByName_(fldName);
      }
    }
    return fld;
  }

  /// <summary>
  ///   get index of the field in the task or its ancestors
  /// </summary>
  /// <param name = "fldName">name</param>
  /// <returns> If the variable name is not found then this function will return Zero.</returns>
  getIndexOfFieldByName(fldName: string): number {
    let depth: number = this.getTaskDepth(true);
    let index: number = 0;
    let fld: Field = this.getFieldByName(fldName);
    let fldTab: FieldsTable;

    if (fld == null)
      return 0;

    let treeRoute = new Array(depth);
    this.pathToRoot(treeRoute, true);
    for (let curr: number = depth - 1; curr >= 0; curr--) {
      let currTask: Task = treeRoute[curr];
      if (currTask === fld.getTask()) {
        curr = fld.getId();
        index += ++curr;         // start index in Magic from 1 and not from 0
        break;                   // get out of the task tree - the index is found
      }
      fldTab = <FieldsTable>currTask.DataView.GetFieldsTab();
      index += fldTab.getSize();
    }
    return index;
  }

  /// <summary>
  ///   calculate the path from this task to the root of the tasks tree
  /// </summary>
  /// <param name = "path">array of tasks, the route up. The 0 item is start point task</param>
  /// <param name = "byParentOrder">if true, we travel the parents, otherwise we travel the triggering tasks</param>
  pathToRoot(path: Task[], byParentOrder: boolean): void {
    let task: Task = (byParentOrder ? this : <Task>this.GetContextTask());

    for (let i: number = 0; i < path.length; i++) {
      path[i] = task;
      let ctlIdx: number = task.getCtlIdx();

      let tmpTask: Task = byParentOrder ? null : task.getTriggeringTask();

      if (tmpTask != null)
        task = tmpTask;
      else {
        task = <Task>task.getParent();

        if (task == null) {
          // QCR 366748 if we are in a component global handler add it to the path
          if (!byParentOrder && this.isMainProg() && this.getCtlIdx() !== ConstInterface.TOP_LEVEL_CONTAINER)
            path[i + 1] = this;
          break;
        }

        if (byParentOrder && ctlIdx !== task.getCtlIdx())
          path[++i] = <Task>MGDataCollection.Instance.GetMainProgByCtlIdx(ctlIdx);
      }
    }
  }

  /// <summary>
  ///   check if this task should be refreshed - compare the "refresh on" fields of the current record to the
  ///   previous record and if different values are found returns true
  /// </summary>
  private shouldBeRefreshed(): boolean {
    let dataView: DataView = <DataView>this._parentTask.DataView;
    let result: boolean = false;

    // prevCurrRec is null only if it is the first time or after Cancel.
    // After Cancel in the parent task Subform refresh must be done always
    if (this._parentTask === null || dataView.isPrevCurrRecNull() ||
      (this.RefreshOnVars !== null && !dataView.currEqualsPrev(this.RefreshOnVars)))
      result = true;

    return result;
  }

  /// <summary>
  ///   returns true if the subTasks (subforms) should be refreshed
  /// </summary>
  CheckRefreshSubTasks(): boolean {
    let ret: boolean = false;

    // do not refresh subforms before the first record prefix. The server sent us their dataview!
    if (this._enteredRecLevel) {
      let subformsToRefresh: List<Task> = this.GetSubformsToRefresh();

      if (subformsToRefresh.length > 0)
        ret = true;
    }
    return ret;
  }

  /// <summary>
  /// Gets a list of subtasks
  /// </summary>
  /// <returns>a list of subtasks</returns>
  private GetSubTasks(): List<Task> {
    let subTasks: List<Task> = new List<Task>();

    if (this.hasSubTasks()) {
      for (let i: number = 0; i < this.SubTasks.getSize(); i = i + 1)
        subTasks.push(this.SubTasks.getTask(i));
    }

    return subTasks;
  }

  /// <summary>
  /// Gets a list of those subforms that must be refreshed.
  /// </summary>
  /// <returns>list of subforms to refresh</returns>
  GetSubformsToRefresh(): List<Task> {
    let subTasks: List<Task> = this.GetSubTasks();
    let subTasksToRefresh: List<Task> = new List<Task>();

    for (let i: number = 0; i < subTasks.length; i++) {
      let subTask: Task = subTasks.get_Item(i);
      if (this.ShouldRefreshSubformTask(subTask))
          subTasksToRefresh.push(subTask)
    }

    return subTasksToRefresh;
  }

  /// <summary>
  /// Refresh all subforms that should be refreshed
  /// </summary>
  RefreshSubforms(): void {
    this.CleanDoSubformPrefixSuffix();
    let subformsToRefresh: List<Task> = this.GetSubformsToRefresh();


    for (let i: number = 0; i < subformsToRefresh.length; i++) {
      let subFormTask: Task = subformsToRefresh.get_Item(i);
      this.SubformRefresh(subFormTask, false);
  }

  }

  /// <summary>
  /// Check if the specific subform must be refreshed
  /// </summary>
  /// <param name="subTask"></param>
  /// <returns></returns>
  ShouldRefreshSubformTask(subTask: Task): boolean {
    let refresh: boolean = false;
    let subformCtrl: MgControl = <MgControl>subTask.getForm().getSubFormCtrl();

    subTask.DoSubformPrefixSuffix = false;
    // Defect 76979. Subform can execute refresh only after it has TaskView.
    if (subformCtrl != null && !subTask.InSelect && subTask.AfterFirstRecordPrefix) {
      let parentMode: string = this.getMode();
      let modeProperty: number = (parentMode === Constants.TASK_MODE_QUERY ? PropInterface.PROP_TYPE_ALLOW_QUERY
        : parentMode === Constants.TASK_MODE_MODIFY
          ? PropInterface.PROP_TYPE_ALLOW_MODIFY
          : PropInterface.PROP_TYPE_ALLOW_CREATE);

      // For a subform with 'AsParent' mode we also must refresh the subform
      // after the parent record prefix. If the specific mode is not allowed
      // the subform continues in the old mode.
      if (subTask.ModeAsParent && parentMode !== subTask.getMode() &&
        this.getLevel() === Constants.TASK_LEVEL_RECORD &&
        (subTask.getProp(PropInterface.PROP_TYPE_ALLOW_OPTION)).getValueBoolean() &&
        subTask.checkProp(modeProperty, true)) {
        if (!subformCtrl.isVisible() &&
          !subformCtrl.checkProp(PropInterface.PROP_TYPE_REFRESH_WHEN_HIDDEN, false)) {
          subformCtrl.RefreshOnVisible = true;
          refresh = false;
        }
        else
          refresh = true;

        subTask.SetModeAsParent(parentMode);
        }
      else {
        refresh = subformCtrl.checkProp(PropInterface.PROP_TYPE_AUTO_REFRESH, true) && subTask.shouldBeRefreshed();

        if (refresh) {
          if (!subformCtrl.isVisible() &&
            !subformCtrl.checkProp(PropInterface.PROP_TYPE_REFRESH_WHEN_HIDDEN, false)) {
            subformCtrl.RefreshOnVisible = true;
            refresh = false;
          }
        }
      }

      if (refresh)
        subTask.DoSubformPrefixSuffix = true;
      }
    return refresh;
    }

  /// <summary>
  /// Sets the task mode as parent mode
  /// </summary>
  /// <param name="parentMode"></param>
  SetModeAsParent(parentMode: string): void {
    this.enableModes();

    if (parentMode === Constants.TASK_MODE_CREATE) {
      let cmd: IClientCommand = CommandFactory.CreateEventCommand(this.getTaskTag(), InternalInterface.MG_ACT_RTO_CREATE);
      this.DataviewManager.Execute(cmd);
    }
    else if (this.getMode() === Constants.TASK_MODE_CREATE) {
        this.setPreventRecordSuffix(true);
        this.setPreventControlChange(true);
      ClientManager.Instance.EventsManager.handleInternalEventWithTask(this, InternalInterface.MG_ACT_RT_REFRESH_VIEW);
        this.setPreventRecordSuffix(false);
        this.setPreventControlChange(false);
      let subTaskDv: DataView = <DataView>this.DataView;
      if (!subTaskDv.isEmpty() && (<Record>subTaskDv.getCurrRec()).getMode() !== DataModificationTypes.Insert)
          this.setMode(parentMode);
      else
        this.setMode(Constants.TASK_MODE_CREATE);
      (<MgForm>this.getForm()).RefreshDisplay(Constants.TASK_REFRESH_CURR_REC);
        }
    else
        this.setMode(parentMode);

    this.setOriginalTaskMode(parentMode);
    this.setCreateDeleteActsEnableState();
  }

  // after compute do subform task record prefix & suffix
  doSubformRecPrefixSuffix(): void {
    let subTasks: List<Task> = this.GetSubTasks();


    for (let i: number = 0; i < subTasks.length; i++) {
      let subTask: Task = subTasks.get_Item(i);
      if (subTask.DoSubformPrefixSuffix) {
        ClientManager.Instance.EventsManager.handleInternalEventWithTaskAndSubformRefresh(subTask, InternalInterface.MG_ACT_REC_PREFIX, true);
        if (!ClientManager.Instance.EventsManager.GetStopExecutionFlag())
          ClientManager.Instance.EventsManager.handleInternalEventWithTask(subTask, InternalInterface.MG_ACT_REC_SUFFIX);
          }
        }
  }

  /// <summary> Clean flag for Subform record cycle </summary>
  CleanDoSubformPrefixSuffix(): void {
    let subTasks: List<Task> = this.GetSubTasks();

    for (let i: number = 0; i < subTasks.length; i++) {
      let subTask: Task = subTasks.get_Item(i);
      subTask.DoSubformPrefixSuffix = false;
    }
  }

  /// <summary>
  ///   returns true if the task must display confirmation window prior to deleting a record.
  /// </summary>
  mustConfirmInDeleteMode(): boolean {
    let prop: Property = this.getProp(PropInterface.PROP_TYPE_CONFIRM_UPDATE);

    // As strange as it sounds, if the property is an expression which evaluates to
    // False, then no need to display confirmation...
    return !prop.isExpression();
  }

  /// <summary>
  ///   add a sub-task
  /// </summary>
  /// <param name = "subTask">the sub task to add</param>
  addSubTask(subTask: Task): void {
    if (this.SubTasks === null)
      this.SubTasks = new TasksTable();
    this.SubTasks.addTask(subTask);
  }

  /// <summary>
  ///   remove one of this tasks sub-task
  /// </summary>
  /// <param name = "subTask">a reference to the sub-task to remove</param>
  removeSubTask(subTask: Task): void {
    if (this.SubTasks !== null)
      this.SubTasks.removeTask(subTask);
    }

  /// <summary>
  ///   sets the value of the dynamicDef.transaction failed flag
  /// </summary>
  /// <param name = "val">the new value of the flag</param>
  setTransactionFailed(val: boolean): void {
    this._transactionFailed = val;

    if (!val)
      this.TransactionErrorHandlingsRetry = null;
    }

  /// <summary>
  ///   returns the value of the "dynamicDef.transaction failed" flag
  /// </summary>
  /// <param name = "level">is the dynamicDef.transaction level we are interested in checking. TRANS_NONE --> check for any
  ///   dynamicDef.transaction level failure TRANS_RECORD/TASK_PREFIX --> check for a failure in that specific
  ///   level</param>
  transactionFailed(level: string): boolean {
    if (level === ConstInterface.TRANS_NONE ||
      (this.Transaction != null && this.Transaction.getLevel() === level))
      return this._transactionFailed;
    else if (level === ConstInterface.TRANS_NONE ||
      (this.TransactionErrorHandlingsRetry != null && this.TransactionErrorHandlingsRetry.getLevel() === level))
      return this._transactionFailed;
    return false;
    }

  /// <summary>
  ///   set the flag of a dynamicDef.transaction retry on the task's dynamicDef.transaction
  /// </summary>
  /// <param name = "val">value of flag</param>
  setAfterRetry(val: string): void {
    if (this.Transaction != null)
      this.Transaction.setAfterRetry(val);
    else if (this.TransactionErrorHandlingsRetry != null) {
      if (val === ConstInterface.RECOVERY_NONE)
          this.TransactionErrorHandlingsRetry = null;
      else
          this.TransactionErrorHandlingsRetry.setAfterRetry(val);
        }
      }

  getAfterRetry(): boolean;
  getAfterRetry(recovery: string): boolean;
  getAfterRetry(recovery?: string): boolean {
    if (arguments.length === 0) {
      return this.getAfterRetry_0();
    }
    return this.getAfterRetry_1(recovery);
  }

  /// <returns> true if this task is part of a dynamicDef.transaction currently being retried</returns>
  private getAfterRetry_0(): boolean {
    if (this.Transaction != null)
      return this.Transaction.getAfterRetry();
    else if (this.TransactionErrorHandlingsRetry != null)
      return this.TransactionErrorHandlingsRetry.getAfterRetry();
    return false;
    }

  /// <returns> true if this task is part of a dynamicDef.transaction currently being retried with a specific recovery</returns>
  private getAfterRetry_1(recovery: string): boolean {
    if (this.Transaction != null)
      return this.Transaction.getAfterRetry(recovery);
    else if (this.TransactionErrorHandlingsRetry != null)
      return this.TransactionErrorHandlingsRetry.getAfterRetry(recovery);
    return false;
    }

  /// <summary>
  ///   get the ExecEndTask flag
  /// </summary>
  /// <returns> the _bExecEndTask value</returns>
  getExecEndTask(): boolean {
    return this._bExecEndTask;
  }

  /// <summary>
  ///   reset the "execute end task" flag
  /// </summary>
  resetExecEndTask(): void {
    this._bExecEndTask = false;
  }

  /// <summary>
  ///   reset the "execute end task" flag
  /// </summary>
  setExecEndTask(): void {
    this._bExecEndTask = true;
  }

  /// <summary>
  ///   Evaluate the end condition property
  /// </summary>
  /// <param name = "mode">the mode to compare to</param>
  /// <returns> should we evaluate the end condition?</returns>
  evalEndCond(mode: string): boolean {
    let endTaskCondProp: Property;
    let evalEndCondProp: Property = this.getProp(PropInterface.PROP_TYPE_EVAL_END_CONDITION);

    // Dont evaluate end condition if we are already closing the task
    if (this.InEndTask)
      return false;

    if (this._bExecEndTask)
      return true;

    if (evalEndCondProp != null && (NString.Compare(evalEndCondProp.getValue(), ConstInterface.END_COND_EVAL_IMMIDIATE,
        true) || ((evalEndCondProp.getValue()).toLowerCase() === mode.toLowerCase()))) {
      // check the end condition
      endTaskCondProp = this.getProp(PropInterface.PROP_TYPE_END_CONDITION);
      if (endTaskCondProp == null)
        return false;
      let endTask: string = endTaskCondProp.getValue();
      // signal we need to perform an end task after we get out of the loop
      if (DisplayConvertor.toBoolean(endTask)) {
              this._bExecEndTask = true;
        return true;
            }
      return false;
            }
    return false;
          }

  /// <summary>
  ///   set the "trying to stop" flag for the task and it's subTasks
  /// </summary>
  /// <param name = "val">the value to use for the flag</param>
  setTryingToStop(val: boolean): void {
    if (this.hasSubTasks()) {
      for (let i: number = 0; i < this.SubTasks.getSize(); i = i + 1) {
        let task: Task = this.SubTasks.getTask(i);
        task.setTryingToStop(val);
      }
    }
    this.IsTryingToStop = val;
  }

  /// <summary>
  ///   get the bInRecordSuffix
  /// </summary
  getInRecordSuffix(): boolean {
    return this._inRecordSuffix;
  }

  /// <summary>
  ///   set the bInRecordSuffix
  /// </summary>
  setInRecordSuffix(bValue: boolean): boolean {
    if (bValue !== this._inRecordSuffix) {
      this._inRecordSuffix = bValue;
      return true;
    }
    return false;
    }

  /// <summary>
  ///   set the bEvalOldValues flag
  /// </summary>
  /// <param name = "bFlag">true/false value</param>
  /// <returns> true/flase - value updated</returns>
  setEvalOldValues(bFlag: boolean): boolean {
    if (bFlag !== this._evalOldValues) {
      this._evalOldValues = bFlag;
      return true;
    }
    return false;
    }

  /// <summary>
  ///   get the bEvalOldValues value
  /// </summary>
  /// <returns> true/false - look at old values when getting the field value</returns>
  getEvalOldValues(): boolean {
    return this._evalOldValues;
  }

  endTask(reversibleExit: boolean, onlyDescs: boolean, dueToVerifyError: boolean): boolean;
  endTask(reversibleExit: boolean, onlyDescs: boolean, subformDestination: boolean, dueToVerifyError: boolean): boolean;
  endTask(reversibleExit: boolean, onlyDescs: boolean, dueToVerifyErrorOrSubformDestination: boolean, dueToVerifyError?: boolean): boolean {
    if (arguments.length === 3)
      return this.endTask_0(reversibleExit, onlyDescs, dueToVerifyErrorOrSubformDestination);
    else
      return this.endTask_1(reversibleExit, onlyDescs, dueToVerifyErrorOrSubformDestination, dueToVerifyError);
  }

  /// <summary>
  ///   returns true if succeeded in ending the task and its sub tasks
  /// </summary>
  /// <param name = "reversibleExit">if true then the exit is reversible</param>
  /// <param name = "onlyDescs">if true then end only the sub tasks and handle rec suffix for this task</param>
  /// <param name = "dueToVerifyError"></param>
  private endTask_0(reversibleExit: boolean, onlyDescs: boolean, dueToVerifyError: boolean): boolean {
    return this.endTask(reversibleExit, onlyDescs, false, dueToVerifyError);
  }

  /// <summary>
  ///   returns true if succeeded in ending the task and its sub tasks
  /// </summary>
  /// <param name = "reversibleExit">if true then the exit is reversible</param>
  /// <param name = "onlyDescs">if true then end only the sub tasks and handle rec suffix for this task</param>
  /// <param name = "subformDestination">if true then end only this task</param>
  private endTask_1(reversibleExit: boolean, onlyDescs: boolean, subformDestination: boolean, dueToVerifyError: boolean): boolean {
    let succeeded: boolean = true;
    let closedSubForm: boolean = false;
    let subTask: Task;
    let mgdTab: MGDataCollection = MGDataCollection.Instance;

    if ((this.IsSubForm && !subformDestination) && !(<Task>this._parentTask).InEndTask) {
      // if this task is a subform and its parent is not trying to stop then
      // start stopping the tasks sub tree from the parent form
      succeeded = (<Task>this._parentTask).endTask(reversibleExit, onlyDescs, dueToVerifyError);
    }
    else if (!this.isAborting() && !this.InEndTask) {
        try {
          this.InEndTask = true;

        if (!this.IsTryingToStop)
            this.setTryingToStop(true);

        // exit from subTasks in a prefix manner
        let i: number;
          if (reversibleExit) {
          // exit from the sub tasks
          if (this.hasSubTasks()) {
            for (i = 0; i < this.SubTasks.getSize() && succeeded; i++) {
              subTask = this.SubTasks.getTask(i);
              closedSubForm = closedSubForm || subTask.IsSubForm;
              ClientManager.Instance.EventsManager.handleInternalEventWithTask(subTask, InternalInterface.MG_ACT_EXIT);
              succeeded = (!ClientManager.Instance.EventsManager.GetStopExecutionFlag() || dueToVerifyError);
              }
            }

          // exit for the first task must end all tasks
          if (this === mgdTab.StartupMgData.getFirstTask()) {
            for (i = mgdTab.getSize() - 1; i > 0 && succeeded; i--) {
              if (mgdTab.getMGData(i) != null) {
                ClientManager.Instance.EventsManager.handleInternalEventWithTask(mgdTab.getMGData(i).getFirstTask(),
                  InternalInterface.MG_ACT_EXIT);
                succeeded = (!ClientManager.Instance.EventsManager.GetStopExecutionFlag() || dueToVerifyError);
                }
              }
            }
          }

        if (succeeded) {
          // if closing the sub tasks was successful then execute record suffix
          if (reversibleExit && !dueToVerifyError && !this.HasMDIFrame) {
            let forceSuffix: boolean = this.checkProp(PropInterface.PROP_TYPE_FORCE_SUFFIX, false);
            // for non interactive, turn off the force record suffix,
            // otherwise an unwanted update might be sent when task ends.
            if (!this.IsInteractive && forceSuffix === true && this.getMode() === Constants.TASK_MODE_CREATE)
              this.setProp(PropInterface.PROP_TYPE_FORCE_SUFFIX, "0");

            ClientManager.Instance.EventsManager.handleInternalEventWithTask(this, InternalInterface.MG_ACT_REC_SUFFIX);

            // restore the force suffix, for just in case.
            if (!this.IsInteractive && forceSuffix === true && this.getMode() === Constants.TASK_MODE_CREATE)
              this.setProp(PropInterface.PROP_TYPE_FORCE_SUFFIX, "1");
              }

          succeeded = (!ClientManager.Instance.EventsManager.GetStopExecutionFlag() || dueToVerifyError);

          if (succeeded && !onlyDescs)
              this.HandleTransactionInfo();

          let preTskSuffix: boolean = succeeded;

          // now perform task suffix
          if (succeeded && !onlyDescs && reversibleExit && !dueToVerifyError &&
            (!this.IsSubForm || subformDestination) &&
            !this.HasMDIFrame && this.TaskPrefixExecuted && !this.TaskSuffixExecuted)
            succeeded = this.handleTaskSuffix(true);

          // Don't forget to exit from any subTasks opened during the last rec-suffix or task suffix
          if (reversibleExit && this.hasSubTasks())
            for (i = 0; i < this.SubTasks.getSize(); i++) {

              subTask = this.SubTasks.getTask(i);

              if (!subTask.IsSubForm)
                ClientManager.Instance.EventsManager.handleNonReversibleEvent(subTask, InternalInterface.MG_ACT_EXIT);
            }

          // dont continue with task exit if a data error occured during task suffix (e.g. rollback())
          if (reversibleExit)
            succeeded = (!ClientManager.Instance.EventsManager.GetStopExecutionFlag() || dueToVerifyError);

          // task suffix only stops execution for current task, which is being closed
          if (preTskSuffix)
              ClientManager.Instance.EventsManager.setStopExecution(false);

          this.setAfterRetry(ConstInterface.RECOVERY_NONE);

          if (!this.isAborting() && succeeded && !onlyDescs) {
            // Try closing any task level dynamicDef.transaction
              if (reversibleExit) {
                this.setTransactionFailed(false);
              this.TaskTransactionManager.checkAndCommit(false, ConstInterface.TRANS_TASK_PREFIX, false);
              succeeded = (!ClientManager.Instance.EventsManager.GetStopExecutionFlag() || dueToVerifyError) && !this.isAborting() && !this.transactionFailed(ConstInterface.TRANS_TASK_PREFIX);
              }

            this.setAfterRetry(ConstInterface.RECOVERY_NONE);

            if (succeeded) {
              let baseMgd: MGData = MGDataCollection.Instance.StartupMgData;
              // If we are closing the topmost task - dont loose any events, left in the queue
              if (reversibleExit && baseMgd.getFirstTask().getTaskTag() === this.getTaskTag()) {
                  ClientManager.Instance.EventsManager.setProcessingTopMostEndTask(true);
                ClientManager.Instance.EventsManager.handleEvents(baseMgd, 0);
                  ClientManager.Instance.EventsManager.setProcessingTopMostEndTask(false);

                // var st = new SessionStatisticsForm();
                // st.WriteToFlowMonitor((FlowMonitorQueue)_flowMonitor);

                if (this.isAborting())
                  return true;
                  }

              TaskServiceBase.Exit(this, reversibleExit, subformDestination);

              // When closing a task whose parent is a main program, check the main program's end
              // condition
              if (this._parentTask != null && this._parentTask.isMainProg()) {
                let mgd: MGData = MGDataCollection.Instance.getMGData(0);
                let mainPrgTask: Task = mgd.getMainProg(0);
                let rootTask: Task = MGDataCollection.Instance.StartupMgData.getFirstTask();
                let endMainPrg: boolean = mainPrgTask.checkProp(PropInterface.PROP_TYPE_END_CONDITION, false);

                // No need to end the root task if we are already doing it.
                if (this !== rootTask && endMainPrg) {
                  let rtEvt = new RunTimeEvent(rootTask);
                  rtEvt.setInternal(InternalInterface.MG_ACT_CLOSE);
                  rtEvt.setCtrl(null);
                  rtEvt.setArgList(null);
                  ClientManager.Instance.EventsManager.addToTail(rtEvt);
                  }
                }
                ClientManager.Instance.CreatedForms.remove(<MgForm>this.Form);
              }
            }
          }
        }

        finally {
        if (!this.IsSubForm || subformDestination)
          this.handleFinallyEndTask(succeeded, reversibleExit);
          }
        }

    // Qcr #914645 : return false in a recursive call.
    // otherwise commonHandlerAfter(eventManager) will not be executed if the call is recursively made from handleEvent.
    // for example : task cond fulfilled. handleInternalEvent(this, MG_ACT_REC_SUFFIX) is called.
    // while in rec suf handler, endTask is called again..if we return true then the commonHandlerAfter is not executed.
    // if the rec suffix handler did not exist, there will be no call to endTask and the commonHandlerAfter will be executed.
    // The name 'succeeded' is a bit misleading..its more like 'executed'..but we decided to keep it.
    else if (this.InEndTask)
      succeeded = false;

    // restore the flag.
    ClientManager.Instance.EventsManager.setProcessingTopMostEndTask(this._inProcessingTopMostEndTaskSaved);

    return succeeded;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="onlyDescs"></param>
  /// <param name="succeeded"></param>
  private HandleTransactionInfo(): void {
    // while remote task without local data, has subform that has local data : Remote transaction is set on the parent task and local Transaction is set on subform.
    // The member task.Transaction is get the DataviewManager.CurrentDataviewManager.Transaction
    // for subform :  the CurrentDataviewManager is the localDataview so the transaction is the local transaction that the subform is the owner but not the owner of the remote transaction
    // The method setTransCleared() need to be called only for remote transaction that is the owner task . (_transCleared is send to the server )

    // check the remote transaction
    let transaction: Transaction = this.DataviewManager.RemoteDataviewManager.Transaction;
    if (transaction !== null && transaction.isOwner(this) && transaction.getLevel() === 'P') {
      this.DataviewManager.RemoteDataviewManager.Transaction = null;
      (<DataView>this.DataView).setTransCleared();
    }
  }

  /// <summary>
  /// Creates exit command, adds it to commands for execution and execute it if it's needed
  /// </summary>
  /// <param name="reversibleExit"></param>
  /// <param name="subformDestination"></param>
  Exit(reversibleExit: boolean, subformDestination: boolean): void {
    // if record suffix was successful and this task is not a sub form
    // then end the task at the server side
    let cmd: IClientCommand = reversibleExit ?
      <IClientCommand>CommandFactory.CreateBrowserEscEventCommand(this.getTaskTag(), this.getExitingByMenu(), subformDestination) :
      <IClientCommand>CommandFactory.CreateNonReversibleExitCommand(this.getTaskTag(), subformDestination);

    this._mgData.CmdsToServer.Add(cmd);
    if (!subformDestination || this.IsRoute()) {
      try {
        Task.CommandsProcessor.Execute(CommandsProcessorBase_SendingInstruction.TASKS_AND_COMMANDS);
      }
      catch (err) {
        // If the closing of Main Program didn't succeed on server, close it here --- ofcourse it
        // includes the execution of TS as well.
        if (this.isMainProg()) {
          this._mgData.CmdsToServer.Add(cmd);
        }
        else
          throw err;
      }

    }
  }

  /// <summary>
  ///   Recursive function for finally operation of endTask function
  /// </summary>
  /// <param name = "succeeded"></param>
  /// <param name = "reversibleExit">
  /// </param>
  private handleFinallyEndTask(succeeded: boolean, reversibleExit: boolean): void {
    let subTask: Task;

    if (this.hasSubTasks()) {
      for (let i: number = 0; i < this.SubTasks.getSize(); i++) {
        subTask = this.SubTasks.getTask(i);
        subTask.handleFinallyEndTask(succeeded, reversibleExit);
      }
    }

    this.InEndTask = false;

    if (succeeded)
      this._isStarted = false;

    if (!succeeded && reversibleExit && this.IsTryingToStop)
      this.setTryingToStop(false);
    }

  /// <summary>
  ///   Recursive function for Task Prefix execution for all subforms
  /// </summary>
  /// <returns></returns>
  handleTaskSuffix(withSubTasks: boolean): boolean {
    let succeeded: boolean = true;
    let subTask: Task;

    if (withSubTasks) {
      if (this.hasSubTasks()) {
        for (let i: number = 0; i < this.SubTasks.getSize() && succeeded; i++) {
          subTask = this.SubTasks.getTask(i);
          succeeded = subTask.handleTaskSuffix(withSubTasks);
        }
      }
    }

    if (succeeded)
      ClientManager.Instance.EventsManager.handleInternalEventWithTask(this, InternalInterface.MG_ACT_TASK_SUFFIX);
    succeeded = !ClientManager.Instance.EventsManager.GetStopExecutionFlag();
    this.TaskSuffixExecuted = true;
    return succeeded;
  }

  /// <summary>
  ///   set the flow mode, the function checks if it is allowed to change the mode
  /// </summary>
  /// <param name = "aFlowMode">the new flow mode</param>
  /// <returns> true if the flow mode was changed</returns>
  setFlowMode(aFlowMode: Task_Flow): boolean {
    if (aFlowMode === Task_Flow.NONE || this._flowMode === Task_Flow.NONE) {
      this._flowMode = aFlowMode;
      return true;
    }

    return false;
    }

  /// <summary>
  ///   set the direction, the function checks if it is allowed to change the direction
  /// </summary>
  /// <param name = "aDirection">the new direction</param>
  /// <returns> true if the direction was changed successfully</returns>
  setDirection(aDirection: Task_Direction): boolean {
    if (aDirection === Task_Direction.NONE || this._direction === Task_Direction.NONE) {
      this._direction = aDirection;
      return true;
    }

    return false;
    }

  /// <summary>
  ///   Compares the current flow attributes of the task to a given flow mode and returns true if they are
  ///   compatible.
  /// </summary>
  /// <param name = "modeStr">N=next,step; F=fast,forward; P=prev,step; R=reverse,fast; S=select exit; C=cancel exit</param>
  checkFlowMode(modeStr: string): boolean {
    let bRc: boolean = false;
    let i: number;

    for (i = 0; i < modeStr.length && !bRc; i++) {

      let aMode: string = modeStr[i];

      // Server had many more FlowModeDir. However, only four is supported at client
      switch (aMode) {
        case FlowModeDir.STEP_FORWARD:
          bRc = this._direction === Task_Direction.FORE && this._flowMode === Task_Flow.STEP;
            break;

        case FlowModeDir.FAST_FORWARD:
          bRc = this._direction === Task_Direction.FORE && this._flowMode === Task_Flow.FAST;
            break;

        case FlowModeDir.STEP_BACKWARD:
          bRc = this._direction === Task_Direction.BACK && this._flowMode === Task_Flow.STEP;
            break;

        case FlowModeDir.FAST_BACKWARD:
          bRc = this._direction === Task_Direction.BACK && this._flowMode === Task_Flow.FAST;
          break;
        }
      }
    return bRc;
      }

  /// <summary>
  ///   set if the task into create line processing or not
  /// </summary>
  setInCreateLine(inCreateLine: boolean): void {
    this._inCreateLine = inCreateLine;
  }

  /// <summary>
  ///   get if the task is into Create line processing
  /// </summary>
  getInCreateLine(): boolean {
    return this._inCreateLine;
  }

  /// <summary>
  ///   get tasks flow mode
  /// </summary>
  getFlowMode(): Task_Flow {
    return this._flowMode;
  }

  /// <summary>
  ///   get tasks direction
  /// </summary
  getDirection(): Task_Direction {
    return this._direction;
  }

  /// <summary>
  ///   handle an internal event on this tasks slave tasks. Slave tasks are: (1) If this task is a dynamicDef.transaction
  ///   owner - all tasks participating in the transactions are its slaves. (2) If this task is not an owner -
  ///   all its subforms are considered slaves. if one of the sub tasks failed handling the event then a
  ///   reference to that task is returned otherwise the returned value is null
  /// </summary>
  /// <param name = "internalEvtCode">the code of the internal event to handle</param>
  handleEventOnSlaveTasks(internalEvtCode: number): Task {
    let i: number;
    let task: Task = null;
    let failureTask: Task = null;
    let mgdTab: MGDataCollection = MGDataCollection.Instance;
    let triggeredTasks: List<Task> = mgdTab.getTriggeredTasks(this);
    let orphans: List<Task> = null;
    let sameTrans: boolean;
    let hasSlaves: boolean = false;
    let isOwner: boolean = this.Transaction != null && this.Transaction.isOwner(this);

    // event on trans-owner should be propogated to all other tasks in the dynamicDef.transaction.
    if (isOwner) {
      ClientManager.Instance.EventsManager.setEventScopeTrans();
      orphans = new List<Task>();

      // In case a change of trans-ownership previously took place, there might be tasks
      // which belong to the current dynamicDef.transaction but their parent is gone. These are orphan tasks
      // and we need to propogate the event to them too.
      mgdTab.startTasksIteration();
      while ((task = mgdTab.getNextTask()) != null) {
        sameTrans = task.Transaction != null && this.Transaction.getTransId() === task.Transaction.getTransId();
        if (task !== this && sameTrans && task.PreviouslyActiveTaskId != null && mgdTab.GetTaskByID(task.PreviouslyActiveTaskId) == null)
          orphans.push(task);
        }
      }

    let scopeTrans: boolean = ClientManager.Instance.EventsManager.isEventScopeTrans();

    // Propagate the event according to the scope, on all tasks triggered by me
    for (i = 0; i < triggeredTasks.length && !ClientManager.Instance.EventsManager.GetStopExecutionFlag(); i++) {
      task = triggeredTasks.get_Item(i);
      sameTrans = this.Transaction != null && task.Transaction != null && this.Transaction.getTransId() === task.Transaction.getTransId();

      if (!task.IsSubForm && (scopeTrans && sameTrans) && task.isStarted()) {
        // QCR 438530 Guarantee that before prefix compute will be executed
        if (task.getForm().FormRefreshed && internalEvtCode === InternalInterface.MG_ACT_REC_PREFIX && task.getLevel() === Constants.TASK_LEVEL_TASK)
          (<DataView>task.DataView).currRecCompute(false);
        ClientManager.Instance.EventsManager.handleInternalEventWithTask(task, internalEvtCode);
        hasSlaves = true;
      }
    }

    // Propagate the event on orphans too.
    for (; isOwner && i < orphans.length && !ClientManager.Instance.EventsManager.GetStopExecutionFlag(); i++) {
      task = orphans.get_Item(i);

      // QCR 438530 Guarantee that before prefix compute will be executed
      if (task.getForm().FormRefreshed && internalEvtCode === InternalInterface.MG_ACT_REC_PREFIX && task.getLevel() === Constants.TASK_LEVEL_TASK)
        (<DataView>task.DataView).currRecCompute(false);
      ClientManager.Instance.EventsManager.handleInternalEventWithTask(task, internalEvtCode);
      hasSlaves = true;
    }

    if (hasSlaves && ClientManager.Instance.EventsManager.GetStopExecutionFlag())
      failureTask = task;

    if (isOwner)
      ClientManager.Instance.EventsManager.clearEventScope();

    return failureTask;
    }

  /// <summary>
  ///   enable-disable actions for a record
  /// </summary>
  enableRecordActions(): void {
    let dataview: DataView = <DataView>this.DataView;

    this.setCreateDeleteActsEnableState();

    if (dataview.IncludesFirst() || dataview.IsOneWayKey) {
      if (dataview.isEmptyDataview() || dataview.getCurrRecIdx() === 0) {
        this.ActionManager.enable(InternalInterface.MG_ACT_TBL_PRVLINE, false);
        if (dataview.IsOneWayKey)
          this.ActionManager.enable(InternalInterface.MG_ACT_TBL_BEGTBL, true);
        else this.ActionManager.enable(InternalInterface.MG_ACT_TBL_BEGTBL, false);
        if (this.Form.isScreenMode())
          this.ActionManager.enable(InternalInterface.MG_ACT_TBL_PRVPAGE, false);
        }
        else {
        this.ActionManager.enable(InternalInterface.MG_ACT_TBL_PRVLINE, true);
        this.ActionManager.enable(InternalInterface.MG_ACT_TBL_BEGTBL, true);
        if (this.Form.isScreenMode())
          this.ActionManager.enable(InternalInterface.MG_ACT_TBL_PRVPAGE, true);
        }
      if (!this.Form.isScreenMode())
        if (dataview.isEmptyDataview() || (dataview.getCurrRecIdx() === 0) || (dataview.getTopRecIdx() === 0))
          this.ActionManager.enable(InternalInterface.MG_ACT_TBL_PRVPAGE, false);
        else this.ActionManager.enable(InternalInterface.MG_ACT_TBL_PRVPAGE, true);
        }
      else {
      this.ActionManager.enable(InternalInterface.MG_ACT_TBL_BEGTBL, true);
      this.ActionManager.enable(InternalInterface.MG_ACT_TBL_PRVPAGE, true);
      this.ActionManager.enable(InternalInterface.MG_ACT_TBL_PRVLINE, true);
        }

    if (dataview.IncludesLast()) {
      if (((this.getMode() === Constants.TASK_MODE_QUERY) || dataview.isEmptyDataview() ||
        ((this.getMode() === Constants.TASK_MODE_MODIFY) &&
        (!ClientManager.Instance.getEnvironment().allowCreateInModifyMode(this.getCompIdx()) ||
        !this.checkProp(PropInterface.PROP_TYPE_ALLOW_CREATE, true)))) && (dataview.getCurrRecIdx() + 1) === dataview.getSize()) {
        this.ActionManager.enable(InternalInterface.MG_ACT_TBL_NXTLINE, false);
        this.ActionManager.enable(InternalInterface.MG_ACT_TBL_ENDTBL, false);
        if (this.Form.isScreenMode())
          this.ActionManager.enable(InternalInterface.MG_ACT_TBL_NXTPAGE, false);
      }
        else {
        this.ActionManager.enable(InternalInterface.MG_ACT_TBL_NXTLINE, true);
        this.ActionManager.enable(InternalInterface.MG_ACT_TBL_ENDTBL, true);
        if (this.Form.isScreenMode())
          this.ActionManager.enable(InternalInterface.MG_ACT_TBL_NXTPAGE, true);
        }

      if (!this.Form.isScreenMode()) {
        if (dataview.isEmptyDataview() || ((dataview.getSize() - dataview.getTopRecIdx()) <= this.Form.getRowsInPage()))
          this.ActionManager.enable(InternalInterface.MG_ACT_TBL_NXTPAGE, false);
        else this.ActionManager.enable(InternalInterface.MG_ACT_TBL_NXTPAGE, true);
      }
    }
    else {
      this.ActionManager.enable(InternalInterface.MG_ACT_TBL_NXTLINE, true);
      this.ActionManager.enable(InternalInterface.MG_ACT_TBL_NXTPAGE, true);
      this.ActionManager.enable(InternalInterface.MG_ACT_TBL_ENDTBL, true);
    }

    if (dataview.isEmptyDataview())
      this.ActionManager.enable(InternalInterface.MG_ACT_CANCEL, false);
    else
      this.ActionManager.enable(InternalInterface.MG_ACT_CANCEL, true);
        }

  /// <summary>
  ///   returns true if the task is started
  /// </summary>
  isStarted(): boolean {
    return this._isStarted;
  }

  /// <summary>
  ///   returns the sub tasks table
  /// </summary>
  getSubTasks(): TasksTable {
    return this.SubTasks;
  }

  /// <summary>
  ///   returns true if this tasks refreshes on a change of one of its parent fields with the given id
  /// </summary>
  /// <param name = "fldId">the id of the parent field</param>
  refreshesOn(fldId: number): boolean {
    let result: boolean = false;

    for (let i: number = 0; !result && this.RefreshOnVars !== null && i < this.RefreshOnVars.length; i++) {
      result = (this.RefreshOnVars[i] === fldId);
    }

    return result;
  }

  /// <summary>
  ///   clear this task from the active transactions account
  /// </summary>
  private AbortTransaction(): void {
    this.DataviewManager.RemoteDataviewManager.Transaction = null;
  }

  /// <summary>
  ///   set value of preventRecordSuffix to val
  /// </summary>
  /// <param name = "val">true if we already performed record suffix</param>
  setPreventRecordSuffix(val: boolean): void {
    this._preventRecordSuffix = val;
  }

  /// <summary>
  ///   get value of preventRecordSuffix
  /// </summary
  getPreventRecordSuffix(): boolean {
    return this._preventRecordSuffix;
  }

  setPreventControlChange(val: boolean): void {
    this._preventControlChange = val;
  }

  getPreventControlChange(): boolean {
    return this._preventControlChange;
  }

  /// <summary>
  ///   signal the server closed this task
  /// </summary>
  resetKnownToServer(): void {
    this._knownToServer = false;
  }

  /// <summary>
  ///   returns the dvPos value
  /// </summary>
  /// <param name = "-">evaluates the dercriptor and return the non-have dvPos value</param>
  evaluateDescriptor(): number {
    let result: string = "";
    let res: NUM_TYPE;
    if (this.DvPosDescriptor == null)
      return HashUtils.GetHashCode(result);

    let first: boolean = true;

    // go over the list of the descriptor
    for (let i: number = 0; i < this.DvPosDescriptor.length; i++) {
      if (!first)
        result += ";";

      let currentCell: string[] = this.DvPosDescriptor.get_Item(i);

      // parse the current task and field number
      let currentTag: string = currentCell[0];
      let currentVeeIdx: number = NNumber.Parse(currentCell[1]);
      let currentTask = <Task>MGDataCollection.Instance.GetTaskByID(currentTag);
      let currentField = <Field>currentTask.DataView.getField(currentVeeIdx);
      let dispVal: string = currentField.getDispValue();

      // QCR 978566
      if (currentField.isNull())
        dispVal = "";

      // QCR 743290
      let pic: PIC;
      switch (currentField.getType()) {
                  case StorageAttribute.BOOLEAN:
        // boolean is stored as "o" or "1" so we just add them as we
        // do in the server
        case StorageAttribute.ALPHA:
        case StorageAttribute.UNICODE:
        case StorageAttribute.BLOB:
        case StorageAttribute.BLOB_VECTOR:
          result += dispVal;
                    break;

                  case StorageAttribute.DATE:
        case StorageAttribute.TIME:
          // QCR 742966 date and time special treatment
          if (dispVal !== "") {
            pic = new PIC(currentField.getPicture(), currentField.getType(), 0);
            let conv: DisplayConvertor = DisplayConvertor.Instance;
            result += conv.mg2disp(dispVal, "", pic, false, this.getCompIdx(), false);
                        }
                        break;

        case StorageAttribute.NUMERIC:
          // QCR 543204 when there is an empty string (alpha)append nothing
          if (dispVal !== "") {
            res = new NUM_TYPE(dispVal);
            pic = new PIC(currentField.getPicture(), currentField.getType(), 0);
            result += res.to_a(pic);
                      }
                    break;
                }

      first = false;
                }

    let tmpStr2: string = StrUtil.stringToHexaDump(result, 4);

    return HashUtils.GetHashCode(tmpStr2);
            }

  /// <summary>
  ///   builds the dvPos descriptor vector each of the dvPosDescriptor vector elements is a String array of size
  ///   2 in the first cell of each array we have the tag and in the second we have the vee iindex
  /// </summary>
  setDescriptor(newDesc: string): void {
    if (!(newDesc.trim() === "")) {
      let desc: string[] = StrUtil.tokenize(newDesc, ";");
      this.DvPosDescriptor = new List<string[]>();

      for (let i: number = 0; i < desc.length; i = i + 1) {
        let cell: string[] = new Array<string>(2);
        let tagVeePair: string[] = StrUtil.tokenize(desc[i], ",");
        cell[0] = tagVeePair[0];
        cell[1] = tagVeePair[1];

        // put the cell value into the vector
        this.DvPosDescriptor.push(cell);
      }
    }
  }

  /// <summary>
  ///   returns the cache object of this task
  /// </summary>
  getTaskCache(): DvCache {
    return this._dvCache;
  }

  /// <summary>
  ///   prepare all sub-form tree's to either go to server (after deleting relevant entries) or to take d.v from
  ///   cache
  /// </summary>
  /// <returns> true if all subform can do need to go to the server because of updates</returns>
  prepareCache(ignoreCurr: boolean): boolean {
    let success: boolean = true;

    // checking myself if i am a subform
    if (!ignoreCurr) {
      if (this.isCached()) {
        if ((<DataView>this.DataView).getChanged()) {
          // is the current update dataview were previously taken from cache
          this._dvCache.removeDvFromCache((<DataView>this.DataView).getDvPosValue(), true);
          success = false;
        }
      }
      else {
        // checks that i am a sub form but i am not cached
        if (this.IsSubForm && !this.isCached()) {
          success = false;
        }
      }
    }

    let curretTask: Task;

    // check all my sub forms
    if (this.hasSubTasks()) {
      // this loop must run to its end so all updated d.v will be deleted
      for (let i: number = 0; i < this.SubTasks.getSize(); i = i + 1) {
        curretTask = this.SubTasks.getTask(i);
        // if one of my sub-forms needs to go to the server - so do i
        if (!curretTask.prepareCache(false)) {
          success = false;
        }
      }
    }
    return success;
  }

  /// <summary>
  ///   checks if we can take the d.v of the task and all his sub-forms from cache is we can - take them and
  ///   replace them with the current d.v of each task
  /// </summary>
  /// <returns> true if all d.v's were found and set</returns>
  testAndSet(ignoreCurr: boolean): boolean {
    // check current task
    if (!ignoreCurr && this.isCached()) {
      let requestedDv: number = this.evaluateDescriptor();

      // try to take from cache only if requested is not current
      if (requestedDv !== (<DataView>this.DataView).getDvPosValue()) {
        let fromCache: DataView = this._dvCache.getCachedDataView(requestedDv);
        if (fromCache == null)
          return false;
        this.changeDv(fromCache);     // changes the current d.v with the one taken from cache do not forget to
                                      // check if the current needs to be inserted to the cache
      }

      // QCR #430045. Indicate that RP must be executed after get from the cache.
      this.DoSubformPrefixSuffix = true;
    }

    // check all sub-forms tasksd
    if (this.hasSubTasks()) {
      // this loop does not need to reach its end
      // the moment one that need to go to the server is discovered all need to go also
      for (let i: number = 0; i < this.SubTasks.getSize(); i++) {
        // does the i-th son need to go to the server
        if (!this.SubTasks.getTask(i).testAndSet(false))
          return false;
      }
    }
    return true;
  }


  /// <summary>
  ///   changes the current d.v with one taken from cache in this method we do not have to worry about updates
  ///   of the current dataview since the method is only called from testAndSet that in turn is only used after
  ///   a Successful run prapreCache which is responsible for checking for updates in the current dataview of
  ///   each related task. however to be on the safe side we check it anyway
  /// </summary>
  /// <param name = "fromCache">the new d.v</param>
  private changeDv(fromCache: DataView): void {
    let dataview: DataView = <DataView>this.DataView;
    // the data view we receive is Certainly from the cache

    if (!this.hasLocate) {
      if (!dataview.getChanged() && dataview.IncludesFirst())
        this._dvCache.putInCache(dataview.replicate());
    }
    else
      this.locatePutInCache();

    // set the data view from the cache as the current
    dataview.setSameAs(fromCache);
    dataview.takeFldValsFromCurrRec();

    this.Form.SetTableItemsCount(0, true);
    (<MgForm>this.Form).setTableItemsCount(false);

    (<MgForm>this.Form).RefreshDisplay(Constants.TASK_REFRESH_FORM);

    // QCR 9248094
    this.setOriginalTaskMode(this.getMode());
  }

  setOriginalTaskMode(originalTaskMode: string): void {
    this._originalTaskMode = originalTaskMode.charAt(0);
  }


  /// <summary>
  ///   get mode of task
  /// </summary>
  getOriginalTaskMode(): string {
    return this._originalTaskMode;
  }

  /// <summary>
  ///   returns the is Cache property value of the sub form control this task Correlates with this method
  ///   actually combines two test first that the task is a sub form second that the sub that the sub form has
  ///   the is cached property set to yes
  /// </summary>
  isCached(): boolean {
    return this.IsSubForm && this.Form.getSubFormCtrl().checkProp(PropInterface.PROP_TYPE_IS_CACHED, false);
  }

  /// <summary>
  ///   does the insert in cache logic in case the task has locate expressions
  /// </summary>
  private locatePutInCache(): void {
    let cached: DataView = this._dvCache.getCachedDataView((<DataView>this.DataView).getDvPosValue());

    // if this data view has been inserted to the cache before
    if (cached != null) {
      if ((<DataView>this.DataView).checkFirst(cached.getLocateFirstRec()) && !(<DataView>this.DataView).getChanged()) {
        (<DataView>this.DataView).setLocateFirstRec(cached.getLocateFirstRec());
        this._dvCache.putInCache((<DataView>this.DataView).replicate());
      }
      else
        this._dvCache.removeDvFromCache((<DataView>this.DataView).getDvPosValue(), true);
      }
    // put it in the cache if it is not updated
    else {
      if (!(<DataView>this.DataView).getChanged())
        this._dvCache.putInCache((<DataView>this.DataView).replicate());
      }
    }

  /// <summary>
  ///   returns the hasLocate flag
  /// </summary>
  HasLoacte(): boolean {
    return this.hasLocate;
  }

  /// <summary>
  ///   opens a new Transaction or set reference to the existing Transaction
  /// </summary>
  private setRemoteTransaction(transId: string): void {
    let mgdTab: MGDataCollection = MGDataCollection.Instance;
    let transTask: Task;
    let isFind: boolean = false;

    mgdTab.startTasksIteration();
    while ((transTask = mgdTab.getNextTask()) != null) {
      // transaction might be null when task is aborting but not yet unloaded.
      if (transTask.DataviewManager.RemoteDataviewManager.Transaction != null &&
        transTask.DataviewManager.RemoteDataviewManager.Transaction.getTransId() === transId) {
        isFind = true;
        break;
      }
    }

    this.DataviewManager.RemoteDataviewManager.Transaction = (isFind ?
      transTask.DataviewManager.RemoteDataviewManager.Transaction :
      new Transaction(this, transId, false));
  }

  /// <summary>
  ///   sets the new Transaction Owner
  /// </summary>
  setTransOwnerTask(): void {
    this.Transaction.setOwnerTask(this);
    this.Transaction.setTransBegin('T')/*'T'*/;
  }

  /// <summary>
  ///   returns the value of the loop counter according to the topmost value in the stack and the status of the
  ///   "useLoopStack" flag
  /// </summary>
  getLoopCounter(): number {
    let result: number = 0;
    if (this._useLoopStack && this._loopStack !== null && !(this._loopStack.count() === 0)) {
      result = <number>this._loopStack.peek();
    }
    return result;
  }

  /// <summary>
  ///   pushes the value 0 on the top of the loop stack
  /// </summary>
  enterLoop(): void {
    if (this._loopStack === null)
      this._loopStack = new Stack();

    this._loopStack.push(0);
  }

  /// <summary>
  ///   pops the topmost entry from the loop stack
  /// </summary>
  leaveLoop(): void {
    this.popLoopCounter();
  }

  /// <summary>
  ///   pops the value of the loop counter from the stack and returns it
  /// </summary>
  popLoopCounter(): number {
    let result: number = 0;

    if (this._loopStack !== null && !(this._loopStack.count() === 0))
      result = <number>this._loopStack.pop();

    return result;
  }

  /// <summary>
  ///   increases the value at the top of the loop stack
  /// </summary>
  increaseLoopCounter(): void {
    this._loopStack.push(this.popLoopCounter() + 1);
  }

  /// <summary>
  ///   returns the number of entries in the loop stack
  /// </summary>
  getLoopStackSize(): number {
    if (this._loopStack !== null)
      return this._loopStack.count();

    return 0;
  }

  /// <summary>
  ///   set the value of the "use loop stack" variable
  /// </summary>
  /// <param name = "val">the new value to set</param>
  setUseLoopStack(val: boolean): void {
    this._useLoopStack = val;
  }

  /// <summary>
  ///   return the links table
  /// </summary>
  getDataviewHeaders(): DataviewHeaders {
    return this.DataviewHeadersTable;
  }

  isFirstRecordCycle(Value_?: boolean): any {
    if (arguments.length === 0) {
      return this.isFirstRecordCycle_0();
    }
    return this.isFirstRecordCycle_1(Value_);
  }

  private isFirstRecordCycle_0(): boolean {
    return this._firstRecordCycle;
  }

  private isFirstRecordCycle_1(Value_: boolean): void {
    this._firstRecordCycle = Value_;
  }

  ///<summary>get the internal name</summary>
  getPublicName(): string {
    return this.PublicName;
  }

  ///<summary>get the AllowEvents</summary>
  isAllowEvents(): boolean {
    let prop: Property = this.getProp(PropInterface.PROP_TYPE_TASK_PROPERTIES_ALLOW_EVENTS);
    return prop.getValueBoolean();
  }

  ///<summary>get the task id</summary>
  getExternalTaskId(): string {
    let taskId: string = "";
    let prop: Property = this.getProp(PropInterface.PROP_TYPE_TASK_ID);

    if (prop != null)
      taskId = prop.getValue();

    return taskId;
  }

  /// <summary>
  ///   returns the value of the "revertFrom" flag
  /// </summary>
  getRevertFrom(): number {
    return this._revertFrom;
  }

  /// <summary>
  ///   sets the value of the "revertFrom" flag
  /// </summary>
  setRevertFrom(RevertFrom: number): void {
    this._revertFrom = RevertFrom;
  }

  /// <summary>
  ///   returns the value of the "revertDirection" flag
  /// </summary>
  getRevertDirection(): Task_Direction {
    return this._revertDirection;
  }

  /// <summary>
  ///   sets the value of the "revertDirection" flag
  /// </summary>
  setRevertDirection(RevertDirection: Task_Direction): void {
    this._revertDirection = RevertDirection;
  }

  /// <summary>
  ///   returns TRUE if this task owns a dynamicDef.transaction
  /// </summary>
  isTransactionOwner(): boolean {
    let isTransOwner: boolean = false;

    if (this.Transaction != null && this.Transaction.isOwner(this))
      isTransOwner = true;

    return isTransOwner;
  }

  isTransactionOnLevel(level: string): boolean {
    return this.isTransactionOwner() && this.Transaction.getLevel() === level;
  }

  /// <summary>
  ///   get whether the task is the Program (i.e. not a subtask)
  /// </summary>
  isProgram(): boolean {
    return this._isPrg;
  }

  /// <summary>
  ///   enable-disable actions for task modes
  /// </summary>
  enableModes(): void {
    let enable: boolean = this.checkProp(PropInterface.PROP_TYPE_ALLOW_MODIFY, true);
    this.ActionManager.enable(InternalInterface.MG_ACT_RTO_MODIFY, enable);

    enable = this.checkProp(PropInterface.PROP_TYPE_ALLOW_CREATE, true);
    this.ActionManager.enable(InternalInterface.MG_ACT_RTO_CREATE, enable);

    enable = this.checkProp(PropInterface.PROP_TYPE_ALLOW_QUERY, true);
    this.ActionManager.enable(InternalInterface.MG_ACT_RTO_QUERY, enable);

    enable = this.checkProp(PropInterface.PROP_TYPE_ALLOW_RANGE, true);
    this.ActionManager.enable(InternalInterface.MG_ACT_RTO_RANGE, enable);

    enable = this.checkProp(PropInterface.PROP_TYPE_ALLOW_LOCATE, true);
    this.ActionManager.enable(InternalInterface.MG_ACT_RTO_LOCATE, enable);
    this.ActionManager.enable(InternalInterface.MG_ACT_RTO_SEARCH, enable);

    enable = this.checkProp(PropInterface.PROP_TYPE_ALLOW_SORT, true);
    this.ActionManager.enable(InternalInterface.MG_ACT_SORT_RECORDS, enable);

    enable = this.checkProp(PropInterface.PROP_TYPE_TASK_PROPERTIES_ALLOW_INDEX, true);
    this.ActionManager.enable(InternalInterface.MG_ACT_VIEW_BY_KEY, enable);
  }

  /// <summary>
  ///   set hasZoomHandler to true
  /// </summary>
  setEnableZoomHandler(): void {
    this._enableZoomHandler = true;
  }


  /// <returns> the hasZoomHandler
  /// </returns>
  getEnableZoomHandler(): boolean {
    return this._enableZoomHandler;
  }

  /// <returns> is the task is a Destination Subform task</returns>
  isDestinationSubform(): boolean {
    return this._destinationSubform;
  }

  /// <summary>
  ///   set for Destination Subform task
  /// </summary>
  /// <param name = "destinationSubform"></param>
  setDestinationSubform(destinationSubform: boolean): void {
    this._destinationSubform = destinationSubform;
  }

  /// <returns> is the task is a Destination Subform task</returns>
  getIsDestinationCall(): boolean {
    return this._isDestinationCall;
  }

  /// <summary>
  ///   set for Destination Subform task
  /// </summary>
  /// <param name = "isDestinationCall"></param>
  setIsDestinationCall(isDestinationCall: boolean): void {
    this._isDestinationCall = isDestinationCall;
  }

  /// <summary>
  /// </summary>
  /// <param name="action"></param>
  /// <param name="enable"></param>
  enableActionMenu(action: number, enable: boolean): void {
    if (this.Form != null) {
      let actualForm: MgFormBase = this.Form;

      if (this.Form.isSubForm()) {
        let subformCtrl: MgControlBase = this.Form.getSubFormCtrl();
        actualForm = subformCtrl.getForm().getTopMostForm();
      }

      actualForm.EnableActionMenu(action, enable);
    }
  }

  /// <summary>
  ///   for Destination Subform call it is needed to recompute tab order
  ///   for whole subform chain. If the current subform is a nested subform,
  ///   so up to the first not subform parent. From it start recompute tab order.
  /// </summary>
  resetRcmpTabOrder(): void {
    if (this.IsSubForm)
      this._parentTask.resetRcmpTabOrder();
    else
      this.resetRcmpTabOrderForSubTasks();
    }

  /// <summary>
  ///   recompute tabbing order for all subforms and its subforms too.
  /// </summary>
  private resetRcmpTabOrderForSubTasks(): void {
    (<MgForm>super.getForm()).resetRcmpTabOrder();
    if (this.hasSubTasks()) {
      for (let i: number = 0; i < this.getSubTasks().getSize(); i = i + 1) {
        let subTask: Task = this.getSubTasks().getTask(i);
        if (subTask.IsSubForm)
          subTask.resetRcmpTabOrderForSubTasks();
      }
    }
  }

  /// <param name = "val">
  /// </param>
  setCancelWasRaised(val: boolean): void {
    this._cancelWasRaised = val;
  }

  /// <returns>
  /// </returns>
  cancelWasRaised(): boolean {
    return this._cancelWasRaised;
  }

  enableCreateActs(val: boolean): void {
    this.ActionManager.enable(37, val);
  }

  /// <summary>
  ///   sets enable/disable status of create and delete actions
  /// </summary
  setCreateDeleteActsEnableState(): void {
    if (!(this.DataView).isEmptyDataview() && this.checkProp(PropInterface.PROP_TYPE_ALLOW_DELETE, true) &&
      this.getMode() === Constants.TASK_MODE_MODIFY && (<DataView>this.DataView).HasMainTable)
      this.ActionManager.enable(InternalInterface.MG_ACT_DELLINE, true);
    else
      this.ActionManager.enable(InternalInterface.MG_ACT_DELLINE, false);

    if ((this.checkProp(PropInterface.PROP_TYPE_ALLOW_CREATE, true)) &&
      ((<DataView>this.DataView).HasMainTable &&
      (this.getMode() === Constants.TASK_MODE_MODIFY && ClientManager.Instance.getEnvironment().allowCreateInModifyMode(this.getCompIdx())) ||
      (this.getMode() === Constants.TASK_MODE_CREATE)))
      this.enableCreateActs(true);
    else
      this.enableCreateActs(false);
    }

  /// <param name = "emptyDataview">the emptyDataview to set </param>
  setEmptyDataview(emptyDataview: boolean): void {
    this.DataView.setEmptyDataview(emptyDataview);
  }

  /// <returns> </returns>
  getName(): string {
    return this.Name;
  }

  /// <summary>
  ///   This function is executed when task starts its execution in Empty Dataview mode
  /// </summary>
  emptyDataviewOpen(subformRefresh: boolean): void {
    // to prevent double prefix on the same record
    if (this.getLevel() === Constants.TASK_LEVEL_TASK) {
      this.ActionManager.enable(InternalInterface.MG_ACT_EMPTY_DATAVIEW, true);
      // if the task is a subform and subform refresh is done, so execute the empty datatview handler,
      // if the task is not a subform, put the empty dataview event on the queue
      if (this.IsSubForm) {
        if (subformRefresh) {
          let rtEvt: RunTimeEvent = new RunTimeEvent(this);
          rtEvt.setInternal(InternalInterface.MG_ACT_EMPTY_DATAVIEW);
          rtEvt.SetEventSubType(EventSubType.Normal);
          ClientManager.Instance.EventsManager.handleEvent(rtEvt, false);
      }
      }
      else
        ClientManager.Instance.EventsManager.addInternalEventWithItaskAndCode(this, InternalInterface.MG_ACT_EMPTY_DATAVIEW);

      this.setLevel(Constants.TASK_LEVEL_RECORD);

      // for subform mode 'AsParent'. If the parent task that in 'Empty Dataview' state changes its mode
      // the subform also must change mode.
      // QCR #281862. If the subform task is opened in the first time do not refresh it's subforms,
      // because they've received their dataviews already.
      // We must refresh them when the subform task passes to empty DV.
      if (this.SubformExecMode !== Task_SubformExecModeEnum.FIRST_TIME && subformRefresh && this.CheckRefreshSubTasks()) {
        (<DataView>this.DataView).computeSubForms();
        this.doSubformRecPrefixSuffix();
      }

      this.enableRecordActions();
      this.ActionManager.enable(InternalInterface.MG_ACT_RT_REFRESH_RECORD, false);
      this.ActionManager.enable(InternalInterface.MG_ACT_RT_REFRESH_SCREEN, false);
    }
  }

  /// <summary>
  ///   This function is executed when task ends its execution in Empty Dataview mode
  /// </summary>
  emptyDataviewClose(): void {
    this.ActionManager.enable(InternalInterface.MG_ACT_EMPTY_DATAVIEW, false);
    this.setLevel(Constants.TASK_LEVEL_TASK);

    this.ActionManager.enable(InternalInterface.MG_ACT_RT_REFRESH_RECORD, true);
    this.ActionManager.enable(InternalInterface.MG_ACT_RT_REFRESH_SCREEN, true);
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="subformTask"></param>
  SubformRefresh(subformTask: Task, explicitSubformRefresh: boolean): void {
    let currTask: Task = ClientManager.Instance.getLastFocusedTask();
    let isInside: boolean = subformTask.ExecuteNestedRS(currTask);

    if (ClientManager.Instance.EventsManager.GetStopExecutionFlag())
      return;

    // QCR #434467. Execute RS of the current subform if it's the current (last focused) task.
    if (subformTask.getLevel() !== Constants.TASK_LEVEL_TASK && !ClientManager.Instance.EventsManager.GetStopExecutionFlag()) {
        ClientManager.Instance.EventsManager.pushNewExecStacks();
      ClientManager.Instance.EventsManager.handleInternalEventWithTaskAndSubformRefresh(subformTask, InternalInterface.MG_ACT_REC_SUFFIX, true);
        ClientManager.Instance.EventsManager.popNewExecStacks();
      isInside = true;

      // Defect 77483. Do not continue if the record suffix execution is failed.
      if (ClientManager.Instance.EventsManager.GetStopExecutionFlag())
        return;
    }

    // create command for the server
    let cmd: IClientCommand = CommandFactory.CreateSubformRefreshCommand(this.getTaskTag(), subformTask.getTaskTag(), explicitSubformRefresh);
    (<Task>subformTask).DataviewManager.Execute(cmd);
    if (subformTask.isAborting())
          return;

        if (explicitSubformRefresh) {
      // QCR #429112. Push execution stack before RP execution.
          ClientManager.Instance.EventsManager.pushNewExecStacks();

      // Defect #77049. Do not execute parent RP. We need it only when click on subformwas done.
      let performParentRecordPrefixOrg: boolean = subformTask.PerformParentRecordPrefix;
          subformTask.PerformParentRecordPrefix = false;
      ClientManager.Instance.EventsManager.handleInternalEventWithTaskAndSubformRefresh(subformTask, InternalInterface.MG_ACT_REC_PREFIX, true);
      subformTask.PerformParentRecordPrefix = performParentRecordPrefixOrg;
          ClientManager.Instance.EventsManager.popNewExecStacks();
      if (ClientManager.Instance.EventsManager.GetStopExecutionFlag())
        return;
          }

    // if SubformRefresh event to itself so the cursor must be on the first control of the current record
    // as for ViewRefresh event.
    if (isInside) {
      // Defect 115793. currTask can't be null.
      if (!ClientManager.Instance.EventsManager.GetStopExecutionFlag() && !subformTask.getPreventControlChange() && currTask != null)
        currTask.moveToFirstCtrl(false);
        }
        else {
      if (!ClientManager.Instance.EventsManager.GetStopExecutionFlag()) {
            if (explicitSubformRefresh) {
          ClientManager.Instance.EventsManager.handleInternalEventWithTask(subformTask, InternalInterface.MG_ACT_REC_SUFFIX);
          if (currTask != null)
            (<DataView>currTask.DataView).setPrevCurrRec();
              subformTask.DoSubformPrefixSuffix = false;
            }
          }
        }
      }

  /// <summary>
  /// Executes Record Suffixes of all nested subforms from bottom to top.
  /// </summary>
  /// <param name="subformTask"></param>
  /// <param name="currTask"></param>
  /// <returns></returns>
  ExecuteNestedRS(lastTask: Task): boolean {
    let isExecuteNestedRS: boolean = false;

    // QCR #168342. A new task is set as focused task after the first CP.
    // So if in CP Update operation is executed currTask is null. But we must refresh the subform.
    if (lastTask == null)
      return isExecuteNestedRS;

    // Do not execute subform refresh when the focused task is not opened as a subform (it was opened from call operation),
    // but the focused task is a child of the subform task. See for example QCR #431850.
    if (this.getLevel() !== Constants.TASK_LEVEL_TASK && lastTask.getMgdID() !== this.getMgdID())
      return isExecuteNestedRS;

    for (let task: Task = lastTask; task !== this && task.pathContains(this) && task.getLevel() !== Constants.TASK_LEVEL_TASK; task = <Task>task.getParent()) {
          ClientManager.Instance.EventsManager.pushNewExecStacks();
      ClientManager.Instance.EventsManager.handleInternalEventWithTask(task, InternalInterface.MG_ACT_REC_SUFFIX);
          ClientManager.Instance.EventsManager.popNewExecStacks();
      isExecuteNestedRS = true;
    }

    return isExecuteNestedRS;
  }

  /// <summary>
  ///   get the Flow mode and direction of the task
  /// </summary>
  /// <returns></returns>
  private getFlowModeDir(): FlowModeDir {
    let flowModeDir: FlowModeDir = FlowModeDir.NONE;

    if (this._flowMode === Task_Flow.FAST)
      flowModeDir = this._direction === Task_Direction.BACK ? FlowModeDir.FAST_BACKWARD : FlowModeDir.FAST_FORWARD;
    else { // Step
      switch (this._direction) {
        case Task_Direction.BACK:
          flowModeDir = FlowModeDir.STEP_BACKWARD;
          break;
        case Task_Direction.FORE:
          flowModeDir = FlowModeDir.STEP_FORWARD;
          break;
      }
    }
    return flowModeDir;
  }

  /// <summary>
  ///   execute Rec suffix for all nested subforms untill subform task that contains these 2 subforms
  /// </summary>
  /// <param name = "newTask"></param>
  /// <returns></returns>
  execSubformRecSuffix(newTask: Task): number {
    let subfTask: Task;
    let i: number, idx = 0;
    for (i = this._taskPath.length; i > 0; i--) {
      subfTask = this._taskPath.get_Item(i - 1);
      if (!newTask._taskPath.Contains(subfTask)) {
        ClientManager.Instance.EventsManager.handleInternalEventWithTask(subfTask, InternalInterface.MG_ACT_REC_SUFFIX);
        if (ClientManager.Instance.EventsManager.GetStopExecutionFlag())
        break;

        // Change the Create mode to Modify if the current record is not a new record.
        // So the mode is changed only for the first record that was not changed.
        if (subfTask.getMode() === Constants.TASK_MODE_CREATE && !(<DataView>subfTask.DataView).getCurrRec().isNewRec())
          subfTask.setMode(Constants.TASK_MODE_MODIFY);
      }
      else {
        idx = newTask._taskPath.indexOf(subfTask);
        break;
      }
    }
    Debug.Assert(i > 0);
    return idx;
  }

  /// <summary>
  ///   get the counter of the task
  /// </summary>
  /// <returns>counter</returns>
  getCounter(): number {
    return this._counter;
  }

  /// <summary>
  ///   increase the tasks counter by 1.
  /// </summary>
  /// <returns>counter</returns>
  increaseCounter(): void {
    this._counter = this._counter + 1;
  }

  setCounter(cnt: number): void {
    this._counter = cnt;
  }

  /// <summary>
  ///   !!
  /// </summary>
  /// <returns></returns>
  isCurrentStartProgLevel(): boolean {
    return this._currStartProgLevel === ClientManager.Instance.StartProgLevel;
  }

  /// <summary>
  /// returns url for menus
  /// </summary>
  /// <returns></returns>
  getMenusFileURL(): string {
    return this._menusFileName;
  }

  /// <summary>
  /// set menus file name
  /// </summary>
  /// <returns></returns>
  setMenusFileURL(menuFileName: string) {
    this._menusFileName = menuFileName;
  }

  /// <summary>
  /// return menus content (passed completely inside a response, i.e. not thru the cache)
  /// </summary>
  /// <returns></returns>
  getMenusContent(): string {
    let menusContent: string = super.getMenusContent();

    if (menusContent == null) {
      Debug.Assert(this.getMenusFileURL() != null);           // We got a file name from the cache

      menusContent = Task.CommandsProcessor.GetContent(this.getMenusFileURL());
      super.setMenusContent(menusContent);
    }

    return menusContent;
  }

  /// <summary>
  ///   Check if reference to main program field
  /// </summary>
  /// <param name = "fieldStr">a reference to the field</param>
  /// <returns></returns>
  static isMainProgramField(fieldStr: string): boolean {
    let Field: List<string> = XmlParser.getTokens(fieldStr, ',');
    let mainProgField: boolean = false;

    if (Field.length === 2) {
      let parent: number = NNumber.Parse(Field.get_Item(0));
      if (parent === TaskBase.MAIN_PRG_PARENT_ID)
        mainProgField = true;
    }

    return mainProgField;
  }

  toString(): string {
    return NString.Format("(task {0}-\"{1}\"{2})", this._taskTag, this.Name, super.isMainProg() ? (" ctl " + this._ctlIdx) : "");
  }

  setExitingByMenu(val: boolean): void {
    this._exitingByMenu = val;
  }

  getExitingByMenu(): boolean {
    return this._exitingByMenu;
  }

  /// <summary>
  /// return menus file name
  /// </summary>
  /// <returns></returns>
  getMenusFileName(): string {
    return this._menusFileName;
  }


  /// <summary></summary>
  /// <returns>true iff menus were attached to the program (in the server side)</returns>
  menusAttached(): boolean {
    return super.menusAttached() || this.getMenusFileName() !== null;
  }

  /// <summary>
  ///
  /// </summary>
  /// <returns></returns>
  ConstructMgForm(alreadySetParentForm: RefParam<boolean>): MgFormBase {
    let form: MgForm = new MgForm();
    let parentForm: MgFormBase = (this.ParentTask != null ? this.ParentTask.getForm() : null);

    // ParentForm of any form should be a visible one. It might happen that the ParentTask
    // is a non-interactive task with OpenWindow=No. In this case, the Parent of the non-interactive
    // task, should be the parent of the current form.
    while (parentForm != null && !parentForm.getTask().isOpenWin()) {
      parentForm = parentForm.ParentForm;
    }

    form.ParentForm = parentForm;
    alreadySetParentForm.value = true;
    return form;
  }

  /// <summary>
  ///   returns the mgdata ID to which task belongs
  /// </summary>
  getMgdID(): number {
    return this._mgData.GetId();
  }

  /// <summary>
  ///   get reference to current MGData
  /// </summary>
  getMGData(): MGData {
    return this._mgData;
  }

  /// <summary> refresh the display, paint the controls and their properties again </summary>
 RefreshDisplay(): void {
    if (this.Form !== null && !this.isAborting() && this.isStarted()) {
      Logger.Instance.WriteDevToLog("Start task.RefreshDisplay()");

      // records from the DataView and refreshes the rows.
      // Now, Task.RefreshDisplay() is called from 2 places:
      // 1. while initing the form
      // 2. when coming back from server
      // In case #1, we do not need to refresh the table as it is done from firstTableRefresh().
      // Check if this can be eliminated.
      if (this._refreshType !== Constants.TASK_REFRESH_NONE) {
        let form: MgForm = <MgForm>this.Form;
        let wasRefreshed: boolean = form.RefreshDisplay(Constants.TASK_REFRESH_FORM);
        if (wasRefreshed) {
          this._refreshType = Constants.TASK_REFRESH_NONE;
        }
      }
      Logger.Instance.WriteDevToLog("End task.RefreshDisplay()");
    }
  }

  /// <summary> get the value of a field. </summary>
  /// <param name="fieldDef"></param>
  /// <param name="value"></param>
  /// <param name="isNull"></param>
  getFieldValue(fieldDef: FieldDef, value: RefParam<string>, isNull: RefParam<boolean>): void {
    value.value = (<Field>fieldDef).getValue(false);
    isNull.value = (<Field>fieldDef).isNull();
  }

  /// <summary> get the display value of a field. </summary>
  /// <param name="fieldDef"></param>
  /// <param name="value"></param>
  /// <param name="isNull"></param>
  getFieldDisplayValue(fieldDef: FieldDef, value: RefParam<string>, isNull: RefParam<boolean>): void {
    value.value = (<Field>fieldDef).getDispValue();
    isNull.value = (<Field>fieldDef).isNull();
  }

  /// <summary> updates the field's value and starts recompute. </summary>
  /// <param name="fieldDef"></param>
  /// <param name="value"></param>
  /// <param name="isNull"></param>
  UpdateFieldValueAndStartRecompute(fieldDef: FieldDef, value: string, isNull: boolean): void {
    if (this.TaskPrefixExecuted) {
      (<Field>fieldDef).setValueAndStartRecompute(value, isNull, true, false, false);
    }
  }

  /// <summary> /// This function returns true if field in null else false.</summary>
  /// <param name="fieldDef"></param>
  /// <returns>true if field is null else false</returns>
   IsFieldNull(fieldDef: FieldDef): boolean {
    let field: Field = <Field>fieldDef;
    return field.isNull();
  }

  /// <summary>
  /// For a richclient tasks, Non-Interactive task will be always Modal.
  /// </summary>
  /// <returns>true</returns>
  static ShouldNonInteractiveBeModal(): boolean {
    return true;
  }

  /// <summary>
  /// For a richclient tasks, check if Non-Interactive task child should be Modal.
  /// </summary>
  /// <returns>true</returns>
  ShouldNonInteractiveChildBeModal(): boolean {
    return this.ShouldChildBeModal();
  }

  /// <summary>
  /// Check if a tasks child should be modal
  ///
  /// </summary>
  /// <returns></returns>
  private ShouldChildBeModal(): boolean {
    let childShouldBehaveAsModal: boolean = false;

    // window is opened and of modal type (doesn't matter if interactive or not)
    if ((this.Form.ConcreteWindowType === WindowType.Modal || this.Form.ConcreteWindowType === WindowType.ApplicationModal) && this.getForm().Opened)
      childShouldBehaveAsModal = true;
    else if (!this.IsInteractive) {
      // if special flag is off
      if (!ClientManager.Instance.getEnvironment().CloseTasksOnParentActivate())
        childShouldBehaveAsModal = true;
      // when the form is opened (no matter what is type is), except from main prog.
      else if (this.getForm().Opened && !this.isMainProg())
        childShouldBehaveAsModal = true;
      // we got here when a non interactive did not open a form and the special is on.
      // in that case we need to recursively check the parent task. (for example , a no form non interactive,
      // might have a modal interactive parent.
      // if the parent task is main program, there is no need to keep the recursive loop (we will get an exception when trying to check its form)
      else if (this.ParentTask != null && !this.ParentTask.isMainProg())
        childShouldBehaveAsModal = this.ParentTask.ShouldChildBeModal();
    }
    return childShouldBehaveAsModal;
  }

  /// <summary>
  ///   get the parent task of this task
  /// </summary>
  getParent(): Task {
    return this._parentTask;
  }

  /// <summary>
  ///   returns true if and only if this task is the checked task or a descendant of it
  /// </summary>
  isDescendentOf(chkTask: Task): boolean {
    if (chkTask === this)
      return true;
    else if (chkTask === null || this._parentTask === null)
      return false;

    return this._parentTask.isDescendentOf(chkTask);
  }

  /// <summary>
  /// return true for remote task for expression that was computed once on server
  /// </summary>
  /// <returns></returns>
  ShouldEvaluatePropertyLocally(propId: number): boolean {
    return this.TaskService.ShouldEvaluatePropertyLocally(propId);
  }

  /// <summary>
  /// This method runs actions after the 'form' tag is handled.
  ///
  /// </summary>
  EnsureValidForm(): void {
    // Default implementation of the method:
    // If this task is the main program and _openWin evaluates to 'false', then
    // prevent the display of the form, by setting it to 'null'.
    if (this._isMainPrg && this.Form !== null) {
      if (!this._openWin || !this.Form.isLegalForm) {   // This can be mdi frame
        this.Form = null;
      }
    }
  }

  /// <summary>
  /// compute the main display once
  /// </summary>
  /// <returns></returns>
  ComputeMainDisplay(): void {
    let propMainDisplay: Property = this.getProp(PropInterface.PROP_TYPE_MAIN_DISPLAY);
    let mainDisplayIndex: number = propMainDisplay.GetComputedValueInteger();

    mainDisplayIndex = this.GetRealMainDisplayIndexOnCurrentTask(mainDisplayIndex);

    this._forms.InitFormFromXmlString(mainDisplayIndex);
    this.EnsureValidForm();
  }

  /// <summary>
  /// prepare task form
  /// </summary>
  PrepareTaskForm(): ReturnResult {
    TaskServiceBase.PreparePropOpenTaskWindow(this);
    return TaskServiceBase.PreparePropMainDisplay(this);
  }

  /// <summary>
  /// return true if form is legal
  /// we are not get to that method for main display that open window is false
  /// </summary>
  /// <returns></returns>
  FormIsLegal(): boolean {
    let isFormIsLegal: boolean = super.isMainProg();
    return isFormIsLegal || super.getForm().isLegalForm;
  }

  /// <summary>
  /// get the main display on studio depth
  /// </summary>
  /// <param name="mainDspIdx"></param>
  /// <returns></returns>
  GetRealMainDisplayIndexOnDepth(mainDspIdx: number): number {
    let task: Task = this.LogicalStudioParentTask;

    while (task != null) {
      mainDspIdx += (<Task>task)._forms.Count;
      task = task.LogicalStudioParentTask;
    }

    return mainDspIdx;
  }

  /// <summary>
  /// get the main display on studio depth
  /// </summary>
  /// <param name="mainDspIdx"></param>
  /// <returns></returns>
  GetRealMainDisplayIndexOnCurrentTask(mainDspIdx: number): number {
    if (mainDspIdx > 1) {

      let task: Task = this.LogicalStudioParentTask;

      while (task != null) {
        mainDspIdx -= (<Task>task)._forms.Count;
        task = task.LogicalStudioParentTask;
      }
    }

    return mainDspIdx;
  }

  /// <summary>
  /// get Ancestor task (on runtime tree) of the send task definition id
  /// </summary>
  /// <param name="findTaskDefinitionId"></param>
  /// <returns></returns>
  GetAncestorTaskByTaskDefinitionId(findTaskDefinitionId: TaskDefinitionId): Task {
    let currentTask: Task = this;

    // Fixed bug #:172959
    // if the findTaskDefinitionId is main program (can be of component) we will not found it in the _parentTask
    // so we will take the task from the MGDataTable
    if (findTaskDefinitionId.IsMainProgram())
      return <Task>Manager.MGDataTable.GetMainProgByCtlIdx(this.ContextID, findTaskDefinitionId.CtlIndex);

    while (currentTask != null) {
      if (currentTask.TaskDefinitionId.Equals(findTaskDefinitionId))
        return currentTask;

      currentTask = <Task>currentTask._parentTask;
    }

    return null;
  }

  SetDataControlValuesReference(controlId: number, dcValuesId: number): void {
    let ctrl: MgControlBase = super.getForm().getCtrl(controlId);
    ctrl.setDcValId(dcValuesId);
  }

  /// <summary>
  /// display test on status bar
  /// </summary>
  /// <param name="task"></param>
  /// <param name="text"></param>
  DisplayMessageToStatusBar(text: string): void {
    // Qcr #798311. if server side had MP doing verify to pane and MP has no form
    // we will get an exception. so in case of no form, get it from last focused task.
    let taskToVerifyOn: Task = <Task>this.GetContextTask();
    if (taskToVerifyOn.getForm() == null)
      taskToVerifyOn = ClientManager.Instance.getLastFocusedTask();

    Manager.WriteToMessagePane(taskToVerifyOn, text, true);
  }

  /// <summary>
  /// abort all direct tasks
  /// </summary>
  AbortDirectTasks(): void {
    if (this.hasSubTasks()) {

      let tasks: List<Task> = new List<Task>();

      for (let i: number = 0; i < this.SubTasks.getSize(); i++) {
        let subtask: Task = <Task>this.SubTasks.getTask(0);
        if (!subtask.IsSubForm)
          tasks.push(subtask);
      }

      // abort all the direct tasks (not subform)
      for (let i: number = 0; i < tasks.length; i++) {
        let subtask: Task = tasks[i];
        ClientManager.Instance.EventsManager.handleInternalEventWithTask(subtask, InternalInterface.MG_ACT_EXIT);
  }


    }
  }

  isTableWithAbsolutesScrollbar(): boolean {
    let isTableWithAbsolutesScrollbar: boolean = false;

    if (this.getForm() != null)
      isTableWithAbsolutesScrollbar = (<MgForm>this.getForm()).isTableWithAbsoluteScrollbar();

    return isTableWithAbsolutesScrollbar;
  }
}

export class Task_LocateQuery {
  ServerReset: boolean = false;
  InitServerReset: boolean = false;
  Offset: number = 0;
  Ctrl: MgControl = null;
  Timer: Subscription = null;
  Buffer: StringBuilder = null;

  constructor() {
    this.InitServerReset = true;
    this.Buffer = new StringBuilder();
  }


  FreeTimer(): void {
    if (this.Timer !== null) {
      this.Timer.unsubscribe();
      this.Timer = null;
    }
  }

  ClearIncLocateString(): void {
    this.Buffer.Remove(0, this.Buffer.Length);
  }

  IncLocateStringAddBackspace(): void {
    let c: string = 'ÿ';
    let flag: boolean = this.Buffer.Length > 0;
    if (flag) {
      let flag2: boolean = this.Buffer.get_Item(this.Buffer.Length - 1) === c;
      if (flag2) {
        this.Buffer.Append(c);
      }
      else {
        this.Buffer.Remove(this.Buffer.Length - 1, 1);
      }
    }
    else {
      this.Buffer.Append(c);
    }
  }

  Init(currCtrl: MgControl): void {
    let initServerReset: boolean = this.InitServerReset;
    if (initServerReset) {
      this.ServerReset = true;
      this.Offset = 0;
    }
    this.ClearIncLocateString();
    this.Ctrl = currCtrl;
    this.FreeTimer();
  }
}

/// <summary>
///
/// </summary>
export class UserRange {
  public veeIdx: number = 0;
  public min: string = null;
  public max: string = null;
  public nullMax: boolean = false;
  public nullMin: boolean = false;
  public discardMax: boolean = false;
  public discardMin: boolean = false;
}

/// <summary>
/// Class holding additional information regarding a task being opened.
/// </summary>
export class OpeningTaskDetails  {
  CallingTask: Task = null;
  PathParentTask: Task = null;
  FormToBeActivatedOnClosingCurrentForm: MgForm = null;

  constructor();
  constructor(callingTask: Task, pathParentTask: Task, formToBeActivatedOnClosingCurrentForm: MgForm);
  constructor(callingTask?: Task, pathParentTask?: Task, formToBeActivatedOnClosingCurrentForm?: MgForm) {
    if (arguments.length === 0) {
      this.constructor_0();
      return;
    }
    this.constructor_1(callingTask, pathParentTask, formToBeActivatedOnClosingCurrentForm);
  }

  private constructor_0(): void {
    this.CallingTask = (this.PathParentTask = null);
    this.FormToBeActivatedOnClosingCurrentForm = null;
  }

  private constructor_1(callingTask: Task, pathParentTask: Task, formToBeActivatedOnClosingCurrentForm: MgForm): void {
    this.CallingTask = callingTask;
    this.PathParentTask = pathParentTask;
    this.FormToBeActivatedOnClosingCurrentForm = formToBeActivatedOnClosingCurrentForm;
  }
}
