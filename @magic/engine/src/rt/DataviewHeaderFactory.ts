import {DataviewHeaderBase} from "./DataviewHeaderBase";
import {RemoteDataviewHeader} from "./RemoteDataviewHeader";
import {Task} from "../tasks/Task";

/// <summary>
/// link factory
/// </summary>
export class DataviewHeaderFactory {
  CreateDataviewHeaders(task: Task, tableIndex: number): DataviewHeaderBase {
    return new RemoteDataviewHeader(task);
  }
}
