import {StringBuilder} from "@magic/mscorelib";
import { XMLConstants} from "@magic/utils";
import {List} from "@magic/mscorelib";
import {MGData} from "./MGData";
import {OpeningTaskDetails, Task} from "./Task";
import {ClientManager} from "../ClientManager";

export class TasksTable {
  private readonly _tasks: List<Task> = null;

  constructor() {
    this._tasks = new List();
  }

  /// <summary>
  ///   parse a set of tasks
  /// </summary>
  /// <param name = "mgdata">to parent -> MGData </param>
  /// <param name="openingTaskDetails">additional information of opening task</param>
  fillData(mgdata: MGData, openingTaskDetails: OpeningTaskDetails): void {
    while (this.initInnerObjects(ClientManager.Instance.RuntimeCtx.Parser.getNextTag(), mgdata, openingTaskDetails)) {
    }
  }

  /// <summary>
  ///   Start task,parsing
  /// </summary>
  private initInnerObjects(foundTagName: string, mgdata: MGData, openingTaskDetails: OpeningTaskDetails): boolean {
    let result: boolean;
    if (foundTagName === null) {
      result = false;
    }
    else {
      if (foundTagName === XMLConstants.MG_TAG_TASK) {
        let task: Task = new Task();
        this._tasks.push(task);
        task.fillData(mgdata, openingTaskDetails);
        result = true;
      }
      else {
        result = false;
      }
    }
    return result;
  }

  /// <summary>
  ///   add a new task to the table
  /// </summary>
  /// <param name = "task">the new task to add </param>
  addTask(task: Task): void {
    this._tasks.push(task);
  }

  removeTask(task: Task): void {
    this._tasks.Remove(task);
  }

  getTask(tasktag: string): Task;
  getTask(idx: number): Task;
  getTask(tasktagOrIdx: any): Task {
    if (arguments.length === 1 && (tasktagOrIdx === null || typeof tasktagOrIdx === "undefined" || tasktagOrIdx.constructor === String)) {
      return this.getTask_0(tasktagOrIdx);
    }
    return this.getTask_1(tasktagOrIdx);
  }

  /// <summary>
  ///   get a task by its Id
  /// </summary>
  /// <param name = "tasktag">the requested task id (current id or original id)</param>
  private getTask_0(tasktag: string): Task {
    let result: Task;
    for (let i: number = 0; i < this._tasks.length; i = i + 1) {
      let task: Task = this._tasks.get_Item(i);
      if (tasktag === task.getTaskTag()) {
        result = task;
        return result;
      }
    }
    result = null;
    return result;
  }

  /// <summary>
  ///   get a task by its index
  /// </summary>
  /// <param name = "idx">task index in the table</param>
  private getTask_1(idx: number): Task {
    let result: Task;
    if (idx >= 0 && idx < this._tasks.length) {
      result = this._tasks.get_Item(idx);
    }
    else {
      result = null;
    }
    return result;
  }

  /// <summary>
  ///   get the number of tasks in the table
  /// </summary>
  getSize(): number {
    return this._tasks.length;
  }

  /// <summary>
  ///   build the XML string for the tasks in the table
  /// </summary>
  /// <param name = "message">the xml message to append to </param>
  buildXML(message: StringBuilder): void {
    for (let i: number = 0; i < this.getSize(); i = i + 1) {
      this.getTask(i).buildXML(message);
    }
  }

  /// <summary>
  ///   set task of event
  /// </summary>
  /// <param name = "task"></param>
  /// <param name = "index"> </param>

  setTaskAt(task: Task, index: number): void {
    if (this._tasks.length <= index) {
      this._tasks.SetSize(index + 1);
    }
    this._tasks.set_Item(index, task);
  }
}
