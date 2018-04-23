import {List, ApplicationException, Debug, StringBuilder} from "@magic/mscorelib";
import {IMGDataTable, ITask, MgFormBase} from "@magic/gui";
import {MGData} from "./MGData";
import {ClientManager} from "../ClientManager";
import {FlowMonitorQueue} from "../util/FlowMonitorQueue";
import {Task} from "./Task"
import {DataView} from "../data/DataView"

/// <summary>
///   this class handles a table of MGData objects
/// </summary>
// @dynamic
export class MGDataCollection implements IMGDataTable {
  private static _instance: MGDataCollection = null;      // singleton
  private _mgDataTab: List<MGData> = new List<MGData>();

  // the current MGDATA
  private _iteratorMgdIdx: number = 0;
  private _iteratorTaskIdx: number = 0;
  currMgdID: number = 0;
  StartupMgData: MGData = null;

  /// <summary>
  /// singleton
  /// </summary>
  constructor() {
  }

  /// <summary>
  ///   searches all the MGData objects till it finds the task with the given id
  /// </summary>
  /// <param name = "id">the id of the requested task</param>
  GetTaskByID(id: string): ITask {
    let task: Task = null;

    for (let i: number = 0; i < this.getSize() && task == null; i++) {
      let mgd: MGData = this.getMGData(i);

      if (mgd == null)
      // the window connected to the MGData was closed
        continue;

      task = mgd.getTask(id);
    }

    return task;
  }

  /// <summary>
  /// singleton
  /// </summary>
  static get Instance(): MGDataCollection {
    if (MGDataCollection._instance == null) {
        if (MGDataCollection._instance == null)
          MGDataCollection._instance = new MGDataCollection();
    }

    return MGDataCollection._instance;
  }

  /// <summary>
  ///   add MGData object to the table
  /// </summary>
  /// <param name = "mgd">the MGData object to add</param>
  /// <param name = "idx">the index within the table for the new MGData</param>
  addMGData(mgd: MGData, idx: number, isStartup: boolean): void {
    if (idx < 0 || idx > this.getSize())
      throw new ApplicationException("Illegal MGData requested");

    if (isStartup)
      this.StartupMgData = mgd;

    if (idx === this.getSize())
      this._mgDataTab.push(mgd);
    else {
      let oldMgd: MGData = this.getMGData(idx);

      if (oldMgd != null && !oldMgd.IsAborting) {
        oldMgd.getFirstTask().stop();
        oldMgd.abort();
      }

      this._mgDataTab.set_Item(idx, mgd);
    }
  }

  /// <summary>
  ///   returns MGData object by its index
  /// </summary>
  getMGData(idx: number): MGData {
    let mgd: MGData = null;

    if (idx >= 0 && idx < this.getSize()) {
      mgd = this._mgDataTab.get_Item(idx);
    }

    return mgd;
  }

  /// <summary>
  ///   returns available index
  /// </summary>
  getAvailableIdx(): number {
    let i: number;

    for (i = 0; i < this._mgDataTab.length; i = i + 1) {
      if (this._mgDataTab.get_Item(i) === null)
        break;
    }

    return i;
  }

  /// <summary>
  ///   returns the index of MGData in MGDataTable
  /// </summary>
  /// <param name = "mgd">to find into table</param>
  getMgDataIdx(mgd: MGData): number {
    return this._mgDataTab.indexOf(mgd);
  }

  /// <summary>
  ///   free memory from unneeded MGData and its descendant MGDs
  /// </summary>
  /// <param name = "index">number of MGData/window to be deleted</param>
  /// <returns></returns>
  deleteMGDataTree(index: number): void {
    let mgd: MGData, childMgd;
    let i: number;

    if (index < 0 || index >= this.getSize())
      throw new ApplicationException("in deleteMGData() illegal index: " + index);

    mgd = this.getMGData(index);
    if (mgd != null) {
      // TODO: when closing a frameset we should clear the MGDs of the frames
      // from the MGDTab
      if (index > 0 && mgd.getParentMGdata() != null) {
        this._mgDataTab.set_Item(index, null);
        ClientManager.Instance.clean(index);
      }

      for (i = 0; i < this.getSize(); i++) {
        childMgd = this.getMGData(i);
        if (childMgd != null && childMgd.getParentMGdata() === mgd)
          this.deleteMGDataTree(i);
      }
    }
  }

  /// <summary>
  ///   get the current MGData
  /// </summary>
  /// <returns> MGData object</returns>
  getCurrMGData(): MGData {
    return this.getMGData(this.currMgdID);
  }

  GetMainProgByCtlIdx(contextIDOrCtlIdx: any, ctlIdx?: number): Task {
    if (arguments.length === 2)
      return this.GetMainProgByCtlIdx_0(contextIDOrCtlIdx, ctlIdx);
    else
      return this.GetMainProgByCtlIdx_1(contextIDOrCtlIdx);
  }

  /// <summary>
  ///   searches all the MGData objects till it finds a main program with the given ctl idx
  /// </summary>
  /// <param name = "contextID"></param>
  /// <param name = "ctlIdx">the idx of the requested component</param>
  private GetMainProgByCtlIdx_0(contextID: number, ctlIdx: number): Task {
    let task: Task = null;

    for (let i: number = 0; i < this.getSize() && task == null; i++) {
      let mgd: MGData = this.getMGData(i);

      if (mgd == null)
        // the window connected to the MGData was closed
        continue;

      task = mgd.getMainProg(ctlIdx);
    }

    return task;
  }

  private GetMainProgByCtlIdx_1(ctlIdx: number): Task {
    return <Task>this.GetMainProgByCtlIdx(-1, ctlIdx);    // TODO (-1): RC is unaware to context ids at the moment
  }

  /// <summary>
  ///   start the tasks iterator
  /// </summary>
  startTasksIteration(): void {
    this._iteratorMgdIdx = 0;
    this._iteratorTaskIdx = 0;
  }

  /// <summary>
  ///   get the next task using the tasks iterator
  /// </summary>
  getNextTask(): Task {
    let task: Task;

    let mgd: MGData = this.getMGData(this._iteratorMgdIdx);
    if (mgd == null)
      return null;

    task = mgd.getTask(this._iteratorTaskIdx);

    if (task == null) {
      do {
        this._iteratorMgdIdx++;
      }
      while (this._iteratorMgdIdx < this.getSize() && this.getMGData(this._iteratorMgdIdx) == null);
      this._iteratorTaskIdx = 0;
      return this.getNextTask();
    }

    this._iteratorTaskIdx++;
    return task;
  }

  /// <summary>
  ///   build XML string of the MGDataTABLE object,
  ///   ALL MGData in the table
  /// </summary>
  /// <param name="message">a message being prepared.</param>
  /// <param name="serializeTasks">if true, tasks in the current execution will also be serialized.</param>
  buildXML(message: StringBuilder, serializeTasks: boolean): void {
    for (let i: number = 0; i < this.getSize(); i = i + 1) {
      let mgd: MGData = this.getMGData(i);

      if (mgd !== null && !mgd.IsAborting) {
        mgd.buildXML(message, serializeTasks);
      }
    }

    FlowMonitorQueue.Instance.buildXML(message);
  }

  /// <summary> Removes all the pending server commands </summary>
  RemoveServerCommands(): void {
    for (let i: number = 0; i < this.getSize(); i = i + 1) {
      let mgd: MGData = this.getMGData(i);

      if (mgd !== null)
        mgd.CmdsToServer.clear();
    }
  }

  /// <summary>
  ///   get size of MGData table
  /// </summary>
  /// <returns> size of table</returns>
  getSize(): number {
    return this._mgDataTab.length;
  }

  /// <summary>
  ///   perform any data error recovery action on all dataviews
  /// </summary>
  processRecovery(): void {
    for (let i: number = 0; i < this.getSize(); i = i + 1) {
      let mgd: MGData = this.getMGData(i);

      if (mgd !== null) {
        for (let j: number = 0; j < mgd.getTasksCount(); j = j + 1) {
          let task: Task = mgd.getTask(j);
          if (task !== null)
            (<DataView>task.DataView).processRecovery();
        }
      }
    }
  }

  /// <summary>
  ///   find all tasks which were triggered by a specific task
  /// </summary>
  /// <param name = "triggeringTask">the task who triggered all other tasks.</param>
  /// <returns> vector containing all tasks which were triggered by the parameter task</returns>
  getTriggeredTasks(triggeringTask: Task): List<Task> {
    let list: List<Task> = new List<Task>();
    let task: Task;
    let tag: string = triggeringTask.getTaskTag();

    this.startTasksIteration();

    while ((task = this.getNextTask()) !== null) {
      if (tag === task.PreviouslyActiveTaskId)
        list.push(task);
    }

    return list;
  }

  /// <summary>
  /// returns task list according to the predicate
  /// </summary>
  /// <param name="p"></param>
  /// <returns></returns>
  GetTasks(p: (obj: Task) => boolean): List<Task> {
    let taskList: List<Task> = new List<Task>();

    this._mgDataTab.forEach(mgd => {
      if (mgd !== null && !mgd.IsAborting) {
        for (let i: number = 0; i < mgd.getTasksCount(); i = i + 1) {
          let task: Task = mgd.getTask(i);
          if (task !== null && p(task)) {
            taskList.push(task);
          }
        }
      }
    });

    return taskList;
  }

  /// <summary>
  ///   this method returns the current id of a task according to its original id
  ///   it will usually return the same id as sent to it, but for subform after error and retry it will
  ///   convert the original id to the current.
  /// </summary>
  /// <param name = "taskId">- original task id</param>
  /// <returns> the current taskid for this task</returns>
  getTaskIdById(taskId: string): string {
    // QCR #980454 - the task id may change during the task's lifetime, so taskId might
    // be holding the old one - find the task and refetch its current ID.
    let task: ITask = this.GetTaskByID(taskId);
    let tag: string = taskId;

    if (task != null)
      tag = task.getTaskTag();

    return tag;
  }

  /// <summary>
  ///   return all top level forms that exist
  /// </summary>
  GetTopMostForms(): List<MgFormBase> {
    let task: Task;
    let forms = new List<MgFormBase>();

    // move on the tasks and add the forms to the arrayList
    this.startTasksIteration();

    while ((task = this.getNextTask()) != null) {
      let form: MgFormBase = task.getForm();

      if (!task.isAborting() && form != null && !form.isSubForm())
        forms.push(form);
    }
    return forms;
  }

  /// <summary>
  /// Gets the MGData that holds/should hold the startup program.
  /// The method takes into consideration whether the application uses MDI or not.
  /// </summary>
  /// <returns></returns>
  GetMGDataForStartupProgram(): MGData {
    Debug.Assert(this._mgDataTab.length > 0, "The main program must be processed before invoking this method.");

    let mainProgByCtlIdx: Task = <Task>this.GetMainProgByCtlIdx(0);
    Debug.Assert(mainProgByCtlIdx !== null, "The main program must be processed before invoking this method.");

    Debug.Assert(mainProgByCtlIdx.getMgdID() === 0, "Main program is expected to be on MGData 0. Is this an error?");

    // if the main program does not have MDI frame, the startup MGData index is 0.
    if (!mainProgByCtlIdx.HasMDIFrame)
      return this._mgDataTab.get_Item(0);

    // If the main program has MDI, the startup MGData index is 1. If it already exists,
    // return it.
    if (this._mgDataTab.length >= 2)
      return this._mgDataTab.get_Item(1);

    // The startup MGData is 1, but it does not exist yet, so create it.
    let mgd: MGData = new MGData(1, null, false);
    this.addMGData(mgd, 1, true);
    return mgd;
  }
}
