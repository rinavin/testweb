import {ApplicationException, Int32, List} from "@magic/mscorelib";
import {Operation} from "./Operation";
import {EventHandler} from "../event/EventHandler";
import {ClientManager} from "../ClientManager";
import {Task} from "../tasks/Task";
import {ConstInterface} from "../ConstInterface";

export class OperationTable {
  private _operations: List<Operation> = new List<Operation>();
  private _firstBlockOperIdx: number = Int32.MaxValue;

  /// <summary>
  ///   Function for filling own fields, allocate memory for inner objescts.
  ///   Parsing the input String.
  /// </summary>
  /// <param name = "taskRef">reference</param>
  /// <param name = "evtHandler">to event handler</param>
  fillData(taskRef: Task, evtHandler: EventHandler): void {
    while (this.initInnerObjects(ClientManager.Instance.RuntimeCtx.Parser.getNextTag(), taskRef, evtHandler)) {
    }

    /* QCR# 180535.
         * Since blank operations are not sent from the Server, there can be
         * a mismatch in the BlockClose and BlockEnd idx because they contain
         * the serverId.
         * We need to update these idx with the corresponding Client-side idx
         */

    for (let i: number = this._firstBlockOperIdx; i < this._operations.length; i = i + 1) {
      let operation: Operation = this._operations.get_Item(i);
      let operType: number = operation.getType();

      if (operType === ConstInterface.MG_OPER_LOOP || operType === ConstInterface.MG_OPER_BLOCK ||
        operType === ConstInterface.MG_OPER_ELSE) {
        let operIdx: number = this.serverId2operIdx(operation.getBlockClose(), i + 1);
        operation.setBlockClose(operIdx);

        operIdx = this.serverId2operIdx(operation.getBlockEnd(), operIdx);
        operation.setBlockEnd(operIdx);
      }
    }
  }

  /// <summary>
  ///   To allocate and fill inner objects of the class
  /// </summary>
  /// <param name = "foundTagName">possible  tag name, name of object, which need be allocated
  /// </param>
  /// <param name = "mgdata">references
  /// </param>
  /// <param name = "task">current
  /// </param>
  /// <param name = "evtHandler">to event handler
  /// </param>
  private initInnerObjects(foundTagName: String, taskRef: Task, evtHandler: EventHandler): boolean {
    if (foundTagName != null && foundTagName === (ConstInterface.MG_TAG_OPER)) {
      let oper = new Operation();
      oper.fillData(taskRef, evtHandler);
      this._operations.push(oper);

      if (this._firstBlockOperIdx === Int32.MaxValue
        && (oper.getType() === ConstInterface.MG_OPER_LOOP || oper.getType() === ConstInterface.MG_OPER_BLOCK))
        this._firstBlockOperIdx = this._operations.length - 1;
      return true;
    }
    return false;
  }

  /// <summary>
  ///   get the number of operations in the table
  /// </summary>
  getSize(): number {
    return this._operations.length;
  }

  /// <summary>
  ///   get an operation by its index
  /// </summary>
  /// <param name = "idx">the index of the operation in the table
  /// </param>
  getOperation(idx: number): Operation {
    if (idx >= 0 && idx < this._operations.length)
      return this._operations.get_Item(idx);
    throw new ApplicationException("in OperationTable.getOperation() index out of bounds: " + idx);
  }

  /// <summary>
  ///   get the operation idx (i.e. the position in the OperationTab)
  ///   depending on the serverId
  /// </summary>
  /// <param name = "id:">the serverId to search
  /// </param>
  /// <param name = "startFrom:">the idx from where the search is to begin
  /// </param>
  /// <returns> the operation idx, if serverId is matched. Otherwise -1.
  /// </returns>
  serverId2operIdx(id: number, startFrom: number): number {
    let operIdx: number = -1;

    for (let i: number = startFrom; i < this._operations.length; i = i + 1) {
      let operation: Operation = this._operations.get_Item(i);

      if (id === operation.getServerId()) {
        operIdx = i;
        break;
      }
    }
    return operIdx;
  }

  /// <summary>
  ///   get the operation idx (i.e. the position in the OperationTab)
  ///   depending on the serverId
  /// </summary>
  /// <param name = "id:">the serverId to search
  /// </param>
  /// <param name = "startFrom:">the idx from where the search is to begin
  /// </param>
  /// <returns> the operation idx, if serverId is matched. Otherwise -1.
  /// </returns>
  serverId2FollowingOperIdx(id: number, startFrom: number): number {
    let operIdx: number = -1;

    for (let i: number = startFrom; i < this._operations.length; i = i + 1) {
      let operation: Operation = this._operations.get_Item(i);

      if (id < operation.getServerId()) {
        operIdx = i;
        break;
      }
    }
    return operIdx;
  }
}
