import {HandlersTable} from "../rt/HandlersTable";
import {TasksTable} from "./TasksTable";
import {CommandsTable} from "../CommandsTable";
import {ClientManager} from "../ClientManager";
import {CompMainPrgTable} from "../rt/CompMainPrgTable";
import {MgForm} from "../gui/MgForm";
import {OpeningTaskDetails, Task} from "./Task";
import {Logger, XMLConstants, XmlParser} from "@magic/utils";
import {RecomputeTable} from "../rt/RecomputeTable";
import {List, NNumber, NString, StringBuilder} from "@magic/mscorelib";
import {MGDataCollection} from "./MGDataCollection";
import {EventHandler} from "../event/EventHandler";
import {GUIManager} from "../GUIManager";
import {IClientCommand} from "../commands/IClientCommand";
import {Manager} from "@magic/gui";
import {HttpManager} from "../http/HttpManager";
import {FlowMonitorQueue} from "../util/FlowMonitorQueue";
import {RunTimeEvent} from "../event/RunTimeEvent";
import {ConstInterface} from "../ConstInterface";
import {MenusDeserializer} from "./MenusDeserializer";

/// <summary>
///   Represents all details relevant to a specific task - related tasks, commands, handlers, etc..
/// </summary>
export class MGData {
  private _expHandlers: HandlersTable = null;
  private _id: number = 0;
  private _parent: MGData = null;
  private _mprgTab: TasksTable = null;
  private _tasksTab: TasksTable = null;
  private _timerHandlers: HandlersTable = null;
  private _timersStarted: boolean = false;
  private forceModal: boolean = false;
  CmdsToClient: CommandsTable = null;
  CmdsToServer: CommandsTable = null;
  IsModal: boolean = false;
  IsAborting: boolean = false;

  get ForceModal(): boolean {
    return this.forceModal;
  }


  constructor(id: number, parent: MGData, isModal: boolean);
  constructor(id: number, parent: MGData, isModal: boolean, forceModal: boolean);
  constructor(id: number, parent: MGData, isModal: boolean, forceModal?: boolean) {
    if (arguments.length === 3)
      this.constructor_0(id, parent, isModal);
    else
      this.constructor_1(id, parent, isModal, forceModal);
  }

  /// <summary>
  ///   CTOR
  /// </summary>
  /// <param name = "id">the id of this mgdata object</param>
  /// <param name = "parent">the parent MGData</param>
  /// <param name = "isModal">true for modal windows</param>
  private constructor_0(id: number, parent: MGData, isModal: boolean): void {
    this.CmdsToServer = new CommandsTable();
    this.CmdsToClient = new CommandsTable();
    this._timerHandlers = new HandlersTable();
    this._expHandlers = new HandlersTable();
    this._mprgTab = new TasksTable();
    this._tasksTab = new TasksTable();
    this._id = id;
    this._parent = parent;
    if (ClientManager.Instance.EventsManager.getCompMainPrgTab() === null) {
      let compMainPrgTab: CompMainPrgTable = new CompMainPrgTable();
      ClientManager.Instance.EventsManager.setCompMainPrgTab(compMainPrgTab);
    }
    this.IsModal = isModal;
  }

  /// <summary>
  /// CTOR to be used when running offline tasks - hold the command to enable right setting of modality
  /// </summary>
  /// <param name="id"></param>
  /// <param name="parent"></param>
  /// <param name="isModal"></param>
  /// <param name="forceModal"></param>
  private constructor_1(id: number, parent: MGData, isModal: boolean, forceModal: boolean): void {
    this.constructor_0(id, parent, isModal);
    this.forceModal = forceModal;
  }

  /// <summary>
  ///   returns the id of this MGData object
  /// </summary>
  GetId(): number {
    return this._id;
  }

  /// <summary>
  ///   Returns true if already moved to the first control on one of the MgData
  /// </summary>
  AlreadyMovedToFirstControl(): boolean {
    let alreadyMoved: boolean = false;
    let tasksCount: number = this.getTasksCount();
    for (let i: number = 0; i < tasksCount; i = i + 1) {
      let mgForm: MgForm = <MgForm>this.getTask(i).getForm();
      if (mgForm !== null && mgForm.MovedToFirstControl && !mgForm.IsMDIFrame) {
        alreadyMoved = true;
        break;
      }
    }
    return alreadyMoved;
  }

  /// <summary>
  ///   start the timers
  /// </summary>
  StartTimers(): void {
    if (this._timerHandlers !== null && !this._timersStarted) {
      this._timerHandlers.startTimers(this);
      this._timersStarted = true;
    }
  }

  /// <summary>
  ///   Function for filling own fields, allocate memory for inner objects. Parsing the input String.
  /// </summary>
  fillData(openingTaskDetails: OpeningTaskDetails): void {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;
    // To avoid the need to send data that sets default values, we'll assume we want the default values
    // unless different info was sent. i.e. if the relevant tags are not in the XML, set the default values.
    let canContinue: boolean;
    do {
      let nextTag: string = parser.getNextTag();
      canContinue = this.initInnerObjects(parser, nextTag, openingTaskDetails);
    }
    while (canContinue);
    Logger.Instance.WriteDevToLog("MGData.FillData(): THE END of the parsing " + parser.getCurrIndex() + " characters");
  }

  /// <summary>
  ///   To allocate and fill inner objects of the class
  /// </summary>
  /// <param name = "foundTagName">possible tag name, name of object, which need be allocated</param>
  /// <param name="openingTaskDetails">additional information of opening task</param>
  /// <returns> xmlParser.getCurrIndex(), the found object tag and ALL its subtags finish</returns>
  private initInnerObjects(parser: XmlParser, foundTagName: string, openingTaskDetails: OpeningTaskDetails): boolean {
    if (foundTagName == null)
      return false;
    switch (foundTagName) {
      case XMLConstants.MG_TAG_XML:
        parser.setCurrIndex(parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex()) + 1); // do
        // nothing
        break;
      case ConstInterface.MG_TAG_DATAVIEW:
        if (!this.insertDataView(parser)) {
          // the task of insert data view not found -> set parsers counter to the
          // end of the data view
          // the data view, got from server and there is no task to the data view , yet.
          let endContext: number = parser.getXMLdata().indexOf('/' + ConstInterface.MG_TAG_DATAVIEW,
            parser.getCurrIndex());
          parser.setCurrIndex(endContext);
          parser.setCurrIndex2EndOfTag();
        }
        break;
      case ConstInterface.MG_TAG_COMPLETE_DV: {
        let task: Task = null;
        let endContext: number = parser.getXMLdata().indexOf( XMLConstants.TAG_CLOSE, parser.getCurrIndex());
        let index: number = parser.getXMLdata().indexOf( ConstInterface.MG_TAG_COMPLETE_DV, parser.getCurrIndex()) + ConstInterface.MG_TAG_COMPLETE_DV.length;
        let tokensVector: List<string> = XmlParser.getTokens(parser.getXMLdata().substr(index, endContext - index), '"');
        let attribute: string = (tokensVector.get_Item(0));
        let valueStr: string;
        if (attribute === XMLConstants.MG_ATTR_TASKID) {
          valueStr = (tokensVector.get_Item(1));
          let taskId: string = valueStr;
          if (this.getTask(taskId) === null)
            task = <Task>MGDataCollection.Instance.GetTaskByID(taskId);
          else
            task = this.getTask(taskId);
        }
        let start: number = endContext + 1;
        endContext = parser.getXMLdata().indexOf( XMLConstants.END_TAG + ConstInterface.MG_TAG_COMPLETE_DV,
          parser.getCurrIndex());
        let dataViewContent: string = parser.getXMLdata().substr(start, endContext - start);
        task.dataViewContent = dataViewContent;
        parser.setCurrIndex(endContext);
        parser.setCurrIndex2EndOfTag();
      }
        break;
      case ConstInterface.MG_TAG_CONTEXT: {
        let endContext: number = parser.getXMLdata().indexOf( XMLConstants.TAG_TERM, parser.getCurrIndex());
        if (endContext !== -1 && endContext < parser.getXMLdata().length) {
          let tag: string = parser.getXMLsubstring(endContext);
          parser.add2CurrIndex(tag.indexOf(ConstInterface.MG_TAG_CONTEXT) + ConstInterface.MG_TAG_CONTEXT.length);
          parser.setCurrIndex(endContext + XMLConstants.TAG_TERM.length);
        }
        break;
      }
      case XMLConstants.MG_TAG_RECOMPUTE:
        let recompTab = new RecomputeTable();
        recompTab.fillData();
        break;
      case ConstInterface.MG_TAG_COMMAND:
        Logger.Instance.WriteDevToLog("goes to command");
        this.CmdsToClient.fillData();
        break;
      case ConstInterface.MG_TAG_LANGUAGE:
        Logger.Instance.WriteDevToLog("goes to language data");
        ClientManager.Instance.getLanguageData().fillData();
        break;
      case ConstInterface.MG_TAG_KBDMAP_URL:
        Logger.Instance.WriteDevToLog("goes to keyBoard");
        ClientManager.Instance.getEnvironment().fillFromUrl(foundTagName);
        break;
      case ConstInterface.MG_TAG_KBDMAP:
        Logger.Instance.WriteDevToLog("goes to keyBoard");
        let kbdStartIdx: number = parser.getCurrIndex();
        let kbdEndIdx: number = parser.getXMLdata().indexOf( '/' + ConstInterface.MG_TAG_KBDMAP,
          parser.getCurrIndex());
        parser.setCurrIndex(kbdEndIdx);
        parser.setCurrIndex2EndOfTag();
        let kbdData: string = parser.getXMLdata().substr(kbdStartIdx, parser.getCurrIndex() - kbdStartIdx);
        ClientManager.Instance.getKbdMap().fillKbdMapTable(kbdData);
        break;
      case ConstInterface.MG_TAG_COMPMAINPRG:
        Logger.Instance.WriteDevToLog("goes to compmainprg");
        ClientManager.Instance.EventsManager.getCompMainPrgTab().fillData();
        break;
      case ConstInterface.MG_TAG_EVENTS_QUEUE:
        Logger.Instance.WriteDevToLog("goes to eventsqueue");
        this.fillEventsQueue(parser);
        break;
      case ConstInterface.MG_TAG_TASKURL:
        ClientManager.Instance.ProcessTaskURL();
        break;
      case XMLConstants.MG_TAG_TASK:
        Logger.Instance.WriteDevToLog("goes to task");
        let taskCountBefore: number = this._mprgTab.getSize();
        this._mprgTab.fillData(this, openingTaskDetails);
        // QCR #759911: mprg must belong to the main application's MGData.
        // This ensures it will not be discarded until the end of execution.
        // There could be more then 1 mprgs that are added (Qcr #168549)
        if (this._id !== 0) {
          let taskCountAfter: number = this._mprgTab.getSize();
          let mgd0: MGData = MGDataCollection.Instance.getMGData(0);
          // check all the new main prgs.
          for (let taskIndex: number = taskCountBefore; taskIndex < taskCountAfter; taskIndex++) {
            let newTask: Task = this._mprgTab.getTask(taskIndex);
            if (newTask.isMainProg() && mgd0._mprgTab.getTask(newTask.getTaskTag()) == null) {
              mgd0._mprgTab.addTask(newTask);
              mgd0.addTask(newTask);
            }
          }
        }
        break;
      case ConstInterface.MG_TAG_ENV:
        Logger.Instance.WriteDevToLog("goes to environment");
        ClientManager.Instance.getEnvironment().fillData();
        break;
      case ConstInterface.MG_TAG_FLWMTR_CONFIG:
        FlowMonitorQueue.Instance.fillData();
        break;
      case XMLConstants.MG_TAG_XML_END:
        parser.setCurrIndex2EndOfTag();
        return false;
      case ConstInterface.MG_TAG_DBH_REAL_IDXS:
        // Webclient TODO : remove serialization of this from server
        parser.SkipXMLElement();
        break;
      case ConstInterface.MG_TAG_GLOBALPARAMSCHANGES:
        Logger.Instance.WriteDevToLog("applying global params changes from the server (Set/GetParams)");
        ClientManager.Instance.getGlobalParamsTable().fillData();
        break;
      case ConstInterface.MG_TAG_GLOBALPARAMS:
        Logger.Instance.WriteDevToLog("processing base64 encoded image of all global params from the server");
        ClientManager.Instance.fillGlobalParams();
        break;
      case ConstInterface.MG_TAG_ENV_PARAM_URL:
        Logger.Instance.WriteDevToLog("goes to env params name ");
        ClientManager.Instance.getEnvironment().fillFromUrl(foundTagName);
        break;
      case ConstInterface.MG_TAG_ENV_PARAM:
        Logger.Instance.WriteDevToLog("goes to env params name ");
        ClientManager.Instance.getEnvParamsTable().fillData();
        break;
      case ConstInterface.MG_TAG_CONTEXT_ID: {
        let ctxId: string;
        let ctxEndIdx: number;
        parser.setCurrIndex(parser.getXMLdata().indexOf( XMLConstants.TAG_CLOSE, parser.getCurrIndex()) + 1);
        ctxEndIdx = parser.getXMLdata().indexOf( XMLConstants.TAG_OPEN, parser.getCurrIndex());
        ctxId = parser.getXMLsubstring(ctxEndIdx).trim();
        parser.setCurrIndex(ctxEndIdx);
        parser.setCurrIndex2EndOfTag();
        ClientManager.Instance.RuntimeCtx.ContextID = ctxId;
      }
        break;
      case ConstInterface.MG_TAG_HTTP_COMMUNICATION_TIMEOUT: {
        let httpCommunicationTimeout: number; // communication-level timeout (i.e. the access to the web server, NOT the entire request/response round-trip), in seconds.
        let httpCommunicationTimeoutIdx: number;
        parser.setCurrIndex(parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex()) + 1);
        httpCommunicationTimeoutIdx = parser.getXMLdata().indexOf(XMLConstants.TAG_OPEN, parser.getCurrIndex());
        httpCommunicationTimeout = NNumber.Parse(parser.getXMLsubstring(httpCommunicationTimeoutIdx));
        parser.setCurrIndex(httpCommunicationTimeoutIdx);
        parser.setCurrIndex2EndOfTag();
        HttpManager.GetInstance().HttpCommunicationTimeoutMS = httpCommunicationTimeout * 1000;
      }
        break;
      case ConstInterface.MG_TAG_DATABASE_URL:
      case ConstInterface.MG_TAG_DATABASES_HEADER:
      case ConstInterface.MG_TAG_TASKDEFINITION_IDS_URL:
      case ConstInterface.MG_TAG_DBH_DATA_IDS_URL:
      case ConstInterface.MG_TAG_DBHS_END:
      case ConstInterface.MG_TAG_OFFLINE_SNIPPETS_URL:
        // TODO: server should not serialize these elements.
        parser.SkipXMLElement();
        break;

      case ConstInterface.MG_TAG_DBHS:
      case ConstInterface.MG_TAG_STARTUP_PROGRAM:
        // TODO: server should not serialize these elements.
        parser.ReadContentOfCurrentElement();
        break;

      case XMLConstants.MG_TAG_MENUS_OPEN:
        Logger.Instance.WriteDevToLog("goes to Menus");

        let startIdx1: number = parser.getCurrIndex();
        let endIdx1: number = parser.getXMLdata().indexOf(XMLConstants.MG_TAG_MENUS_CLOSE, parser.getCurrIndex());
        parser.setCurrIndex(endIdx1);
        parser.setCurrIndex2EndOfTag();
        let menusData: string = parser.getXMLdata().substr(startIdx1, parser.getCurrIndex() - startIdx1);
        MenusDeserializer.Instance.loadFromXML(menusData);
        break;

      default:
        Logger.Instance.WriteExceptionToLogWithMsg("There is no such tag name in MGData, add case to MGData.initInnerObjects and case to while of MGData.FillData  " + foundTagName);
        return false;
    }
    return true;
  }

  /// <summary>
  ///   Insert Records Table to DataView of the task
  /// </summary>
  /// <returns> if the task of dataview found</returns>
  private insertDataView(parser: XmlParser): boolean {
    let task: Task = null;
    let endContext: number = parser.getXMLdata().indexOf( XMLConstants.TAG_CLOSE, parser.getCurrIndex());
    let index: number = parser.getXMLdata().indexOf( ConstInterface.MG_TAG_DATAVIEW, parser.getCurrIndex()) + ConstInterface.MG_TAG_DATAVIEW.length;
    let tokensVector: List<string> = XmlParser.getTokens(parser.getXMLdata().substr(index, endContext - index), '"')/*'"'*/;
    let invalidate: boolean = false;
    // look for the task id
    for (let i: number = 0; i < tokensVector.length; i = i + 2) {
      let attribute: string = tokensVector.get_Item(i);
      if (attribute === XMLConstants.MG_ATTR_TASKID) {
        let valueStr: string = tokensVector.get_Item(i + 1);
        let taskId: string = valueStr;
        task = (this.getTask(taskId) || (<Task>MGDataCollection.Instance.GetTaskByID(taskId)));
      }
      if (attribute === ConstInterface.MG_ATTR_INVALIDATE) {
        let valueStr: string = tokensVector.get_Item(i + 1);
        invalidate = XmlParser.getBoolean(valueStr);
        break;
      }
    }
    let result: boolean;
    if (task !== null) {
      // add the records and update the current record in the dataview
      task.insertRecordTable(invalidate);
      result = true;
    }
    else {
      result = false; // the task not found
    }
    return result;
  }

  /// <summary>
  ///   add task to taskTab
  /// </summary>
  /// <param name = "newTask">to be added</param>
  addTask(newTask: Task): void {
    this._tasksTab.addTask(newTask);
  }

  /// <summary>
  ///   remove a task from the tasks table
  /// </summary>
  /// <param name = "task"></param>
  removeTask(task: Task): void {
    this._tasksTab.removeTask(task);
    this._mprgTab.removeTask(task);
  }

  /// <summary>
  ///   returns the number of tasks in the tasks table
  /// </summary>
  /// <returns></returns>
  getTasksCount(): number {
    let result: number;
    if (this._tasksTab !== null) {
      result = this._tasksTab.getSize();
    }
    else {
      result = 0;
    }
    return result;
  }

  getTask(taskId: string): Task;
  getTask(idx: number): Task;
  getTask(taskIdOrIdx: any): Task {
    if (arguments.length === 1 && (taskIdOrIdx === null || typeof taskIdOrIdx === "undefined" || taskIdOrIdx.constructor === String)) {
      return this.getTask_0(taskIdOrIdx);
    }
    return this.getTask_1(taskIdOrIdx);
  }

  /// <summary>
  ///   returns a task by its id
  /// </summary>
  /// <param name = "taskId">task ID</param>
  private getTask_0(taskId: string): Task {
    let result: Task;
    if (this._tasksTab !== null && typeof this._tasksTab !== "undefined") {
      result = this._tasksTab.getTask(taskId);
    }
    else {
      result = null;
    }
    return result;
  }

  /// <summary>
  ///   returns a task by its index in the tasks table
  /// </summary>
  /// <param name = "idx">index of the task in the tasks table</param>
  private getTask_1(idx: number): Task {
    return this._tasksTab.getTask(idx);
  }

  /// <summary>
  ///   build XML string of the MGData object
  /// </summary>
  /// <param name="message">a message being prepared.</param>
  /// <param name="serializeTasks">if true, tasks in the current execution will also be serialized.</param>
  buildXML(message: StringBuilder, serializeTasks: boolean): void {
    if (this.CmdsToServer !== null) {
      this.CmdsToServer.buildXML(message);
    }
    if (serializeTasks && this._tasksTab !== null) {
      this._tasksTab.buildXML(message);
    }
  }

  /// <summary>
  ///   get the first task which is not a main program in the task table
  /// </summary>
  getFirstTask(): Task {
    let task: Task = null;
    let MDIFrameTask: Task = null;
    for (let i: number = 0; i < this._tasksTab.getSize(); i = i + 1) {
      task = this._tasksTab.getTask(i);
      if (!task.isMainProg()) {
        break;
      }
      if (task.HasMDIFrame) {
        MDIFrameTask = task;
      }
      task = null;
    }
    if (task === null && this._id === 0) {
      task = MDIFrameTask; // return MDI frame program
    }
    return task;
  }

  /// <summary>
  ///   get a main program of a component by its ctl idx
  /// </summary>
  /// <param name = "ctlIdx">the ctl idx</param>
  getMainProg(ctlIdx: number): Task {
    for (let i: number = 0; i < this._mprgTab.getSize(); i = i + 1) {
      let task: Task = this._mprgTab.getTask(i);
      if (task.getCtlIdx() === ctlIdx && task.isMainProg()) {
        return task;
      }
    }
    return null;
  }

  /// <summary>
  ///   returns the next main program in the search order AFTER the ctlIdx
  /// </summary>
  /// <param name = "ctlIdx">the current ctl idx</param>
  getNextMainProg(ctlIdx: number): Task {
    let compMainPrgTab: CompMainPrgTable = ClientManager.Instance.EventsManager.getCompMainPrgTab();
    let currSearchIndex: number = compMainPrgTab.getIndexOf(ctlIdx);
    let nextCtlIdx: number = compMainPrgTab.getCtlIdx(currSearchIndex + 1);
    let result: Task;
    if (nextCtlIdx === -1) {
      result = null;
    }
    else {
      result = this.getMainProg(nextCtlIdx);
    }
    return result;
  }

  /// <summary>
  ///   get the timer event handlers
  getTimerHandlers(): HandlersTable {
    return this._timerHandlers;
  }

  /// <summary>
  ///   add a timer event handler to the timer event handlers table
  /// </summary>
  /// <param name = "handler">a reference to a timer event handler</param>
  addTimerHandler(handler: EventHandler): void {
    this._timerHandlers.add(handler);
  }

  /// <summary>
  ///   removes timer handlers for the specific task
  ///   it is needed for destination call for exit from the previous subform
  /// </summary>
  removeTimerHandler(task: Task): void {
    for (let i = 0; i < this._timerHandlers.getSize(); ) {
      let timerTask: Task = this._timerHandlers.getHandler(i).getTask();
      if (timerTask.isDescendentOf(task) && timerTask.getMGData() === this)
        this._timerHandlers.remove(i);
      else
        i++;
    }
  }

  /// <summary>
  ///   removes expression handlers for the specific task
  ///   it is needed for destination call for exit from the previous subform
  /// </summary>
  removeExpressionHandler(task: Task): void {
    for (let i = 0; i < this._expHandlers.getSize(); ) {
      let timerTask: Task = this._expHandlers.getHandler(i).getTask();
      if (timerTask.isDescendentOf(task) && timerTask.getMGData() === this)
        this._expHandlers.remove(i);
      else
        i++;
    }
  }

  /// <summary>
  ///   get the expression event handlers
  /// </summary>
  getExpHandlers(): HandlersTable {
    return this._expHandlers;
  }

  /// <summary>
  ///   add a expression event handler to the expression event handlers table
  /// </summary>
  /// <param name = "handler">a reference to an expression event handler</param>
  addExpHandler(handler: EventHandler, idx: number): void {
    this._expHandlers.insertAfter(handler, idx);
  }

  /// <summary>
  ///   stops timers that already no needed and start new timers
  /// </summary>
  /// <param name = "oldTimers"></param>
  /// <param name = "newTimers"></param>
  changeTimers(oldTimers: List<number>, newTimers: List<number>): void {
    let i: number = 0;
    let j: number = 0;
    let guiManager: GUIManager = GUIManager.Instance;
    oldTimers.sort();
    newTimers.sort();
    while (i < oldTimers.length && j < newTimers.length) {
      if (oldTimers.get_Item(i) > newTimers.get_Item(j)) {
        guiManager.startTimer(this, newTimers.get_Item(j), false);
        j = j + 1;
      }
      else {
        if (oldTimers.get_Item(i) < newTimers.get_Item(j)) {
          guiManager.stopTimer(this, oldTimers.get_Item(i), false);
          i = i + 1;
        }
        else {
          i = i + 1;
          j = j + 1;
        }
      }
    }
    while (i < oldTimers.length) {
      guiManager.stopTimer(this, oldTimers.get_Item(i), false);
      i = i + 1;
    }
    while (j < newTimers.length) {
      guiManager.startTimer(this, newTimers.get_Item(j), false);
      j = j + 1;
    }
  }

  /// <summary>
  ///   add data from <eventsqueue> tag to the events queue
  /// </summary>
  private fillEventsQueue(parser: XmlParser): void {
    while (this.initEvents(parser, parser.getNextTag())) {
    }
  }

  /// <summary>
  ///   add Run Time Events to the events queue
  /// </summary>
  /// <param name = "foundTagName">possible tag name, name of object, which need be allocated</param>
  private initEvents(parser: XmlParser, foundTagName: string): boolean {
    let result: boolean;
    if (foundTagName === null) {
      result = false;
    }
    else {
      if (foundTagName === ConstInterface.MG_TAG_EVENT) {
        let evt: RunTimeEvent = new RunTimeEvent(null);
        evt.fillData(parser, null);
        evt.convertParamsToArgs();
        evt.setTask(null);
        evt.setFromServer();
        ClientManager.Instance.EventsManager.addToTail(evt);
      }
      else {
        if (foundTagName === ConstInterface.MG_TAG_EVENTS_QUEUE) {
          parser.setCurrIndex(parser.getXMLdata().indexOf( ">", parser.getCurrIndex()) + 1);
        }
        else {
          if (foundTagName === "/" + ConstInterface.MG_TAG_EVENTS_QUEUE) {
            parser.setCurrIndex2EndOfTag();
            result = false;
            return result;
          }
          Logger.Instance.WriteExceptionToLogWithMsg("There is no such tag in EventsQueue: " + foundTagName);
          result = false;
          return result;
        }
      }
      result = true;
    }
    return result;
  }

  /// <summary>
  ///   returns true for the main windows MGData
  /// </summary>
  isMainWindow(): boolean {
    return this._parent === null;
  }

  /// <summary>
  ///   returns the parent MGDdata of this MGData (might be null)
  /// </summary>
  getParentMGdata(): MGData {
    return this._parent;
  }

  /// <summary>
  ///   set the aborting flag
  /// </summary>
  abort(): void {
    this.IsAborting = true;
  }

  /// <summary>
  ///   add all commands which are not attached to any window into the current window
  /// </summary>
  copyUnframedCmds(): void {
    let unframedCmds: List<IClientCommand> = ClientManager.Instance.getUnframedCmds();
    for (let i: number = 0; i < unframedCmds.length; i = i + 1) {
      this.CmdsToClient.Add(unframedCmds.get_Item(i));
    }
    unframedCmds.SetSize(0);
  }

  /// <summary>
  ///   returns an ancestor of this MGData object which is not pending unload
  /// </summary>
  getValidAncestor(): MGData {
    return this._parent;
  }

  getMaxCtlIdx(): number {
    let rc: number = 0;
    for (let i: number = 0; i < this._tasksTab.getSize(); i = i + 1) {
      let task: Task = this._tasksTab.getTask(i);
      if (task !== null) {
        rc = Math.max(rc, task.getCtlIdx());
      }
    }
    return rc;
  }
}
