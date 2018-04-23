import {DataView} from "./DataView";
import {Transaction} from "../rt/Transaction";
import {Task} from "../tasks/Task";
import {IClientCommand} from "../commands/IClientCommand";
import {ReturnResult} from "../util/ReturnResult";

export class DataviewManagerBase {
  // the task that owns the current data view.
  Task: Task = null;
  Transaction: Transaction = null;

  constructor(task: Task) {
    this.Task = task;
  }

  Execute(command: IClientCommand): ReturnResult {
    return new ReturnResult();
  }

  GetDbViewRowIdx(): number {
    return (<DataView>this.Task.DataView).getCurrDBViewRowIdx();
  }
}
