import {ITask} from "./ITask";

export interface IMGDataTable {
  /// <summary>searches all the MGData objects till it finds the task with the given id</summary>
  /// <param name = "id">the id of the requested task</param>
  GetTaskByID(id: string): ITask;

  /// <summary>returns main program for given ctl index</summary>
  /// <param name="contextID">active/target context</param>
  /// <param name="ctlIdx">ctl index</param>
  /// <returns></returns>
  GetMainProgByCtlIdx(contextID: number, ctlIdx: number): ITask;
}
