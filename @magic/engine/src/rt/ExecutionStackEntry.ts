/// <summary> this class represents one entry in the execution stack</summary>
export class ExecutionStackEntry{
  TaskId: string = null;  // task id of the operation
  HandlerId: string = null; // handler id of the operation
  OperIdx: number = 0; // idx of the operation

  /// <summary> constructor for the execution stack entry - gets values for the 3 members</summary>
  /// <param name="intaskId"> </param>
  /// <param name="inhandlerId"> </param>
  /// <param name="inoperIdx"> </param>
  constructor(intaskId: string, inhandlerId: string, inoperIdx: number) {
    this.TaskId = intaskId;
    this.HandlerId = inhandlerId;
    this.OperIdx = inoperIdx;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="obj"></param>
  /// <returns></returns>
  Equals(obj: any): boolean {
    let executionStackEntry: ExecutionStackEntry = ((obj instanceof ExecutionStackEntry) ? <ExecutionStackEntry>obj : null);
    return executionStackEntry !== null &&
      executionStackEntry.HandlerId === this.HandlerId && executionStackEntry.TaskId === this.TaskId &&
      executionStackEntry.OperIdx === this.OperIdx;
  }
}
