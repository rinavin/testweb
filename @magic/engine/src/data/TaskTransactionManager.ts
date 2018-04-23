import {PropInterface, Property} from "@magic/gui";
import {Transaction} from "../rt/Transaction";
import {ReturnResult} from "../util/ReturnResult";
import {DataViewCommandType} from "../commands/ClientToServer/DataviewCommand";
import {CommandsProcessorBase_SendingInstruction} from "../CommandsProcessorBase";
import {IClientCommand} from "../commands/IClientCommand";
import {DataviewManagerBase} from "./DataviewManagerBase";
import {CommandFactory} from "../commands/ClientToServer/CommandFactory";
import {DataView} from "./DataView";
import {Task} from "../tasks/Task";
import {ConstInterface} from "../ConstInterface";
import {RefParam} from "@magic/mscorelib";

/// local transaction manager
export class TaskTransactionManager {
  task: Task = null;

  constructor(task: Task) {
    this.task = task;
  }

  /// return true if the transaction begain supported
  AllowTransaction(transBegin: string, forLocal: boolean): boolean {
    let result: boolean;
    if (forLocal)
      result = (transBegin === ConstInterface.TRANS_TASK_PREFIX || transBegin === ConstInterface.TRANS_RECORD_PREFIX);
    else
      result = (transBegin === ConstInterface.TRANS_TASK_PREFIX || transBegin === ConstInterface.TRANS_RECORD_PREFIX || transBegin === ConstInterface.TRANS_NONE);

    return result;
  }

  PrepareTransactionProperties(transaction: Transaction, forLocal: boolean): void {
    let transactionBeginValue: string = this.GetTransactionBeginValue(forLocal);
    let flag: boolean = transaction !== null && this.AllowTransaction(transactionBeginValue, forLocal);
    if (flag)
      transaction.setTransBegin(transactionBeginValue);
  }

  GetTransactionBeginValue(forLocal: boolean): string {
    let result: string = ConstInterface.TRANS_NONE;
    let prop: Property = this.task.getProp(PropInterface.PROP_TYPE_TRASACTION_BEGIN);
    if (prop !== null) {
      let propgetValue: string = forLocal ? prop.StudioValue : prop.getValue();
      if (propgetValue !== null) {
        result = propgetValue.charAt(0);
      }
    }

    return result;
  }

  /// <summary>
  ///   check if all the conditions imply a commit and do the commit return true if a commit was executed
  /// </summary>
  /// <param name = "reversibleExit">if true then the task exit is non reversible</param>
  /// <param name = "level">of the dynamicDef.transaction to commit (task / record)</param>
  public checkAndCommit(reversibleExit: boolean, level: string, isAbort: boolean): boolean
  {
    let oper: string = isAbort ? ConstInterface.TRANS_ABORT : ConstInterface.TRANS_COMMIT;
    let result: ReturnResult = this.ExecuteLocalUpdatesCommand();
    // is failed the return
    if (!result.Success) {
      // TODO: Check if this code is needed
      // definition : for non Interactive and we get problem with ExecuteLocalUpdates command we need to abort the task.
      if (!this.task.IsInteractive)
        this.task.abort();
      return false;
    }

    let refResult: RefParam<ReturnResult> = new RefParam(result);

    let ret: boolean = this.checkAndCommitPerDataview(this.task.DataviewManager.RemoteDataviewManager, reversibleExit, level, oper, refResult);
    result = refResult.value;

    /// relevant for remote only
    if (!ret) {
      // If we modified the record but didn't flush it yet even though we should have -
      // send it now.
      if (level === ConstInterface.TRANS_RECORD_PREFIX && (<DataView>this.task.DataView).modifiedRecordsNumber() > 0 && (<DataView>this.task.DataView).FlushUpdates) {
        try {
          this.task.TryingToCommit = true;
          Task.CommandsProcessor.Execute(CommandsProcessorBase_SendingInstruction.TASKS_AND_COMMANDS);
        }

        finally {
          this.task.TryingToCommit = false;
        }
      }
    }
    return false;
  }

  // TODO: Check if this method is needed
  /// execute the local updfates command
  ExecuteLocalUpdatesCommand(): ReturnResult {
    let command: IClientCommand = CommandFactory.CreateDataViewCommand(this.task.getTaskTag(), DataViewCommandType.ExecuteLocalUpdates);
    return this.task.DataviewManager.Execute(command);
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="dataviewmanager"></param>
  /// <param name="reversibleExit"></param>
  /// <param name="level"></param>
  /// <param name="oper"></param>
  /// <returns></returns>
  checkAndCommitPerDataview(dataviewmanager: DataviewManagerBase, reversibleExit: boolean, level: string, oper: string, refResult: RefParam<ReturnResult>): boolean {
    refResult.value = new ReturnResult();
    let returnValue: boolean = false;

    let currentTransaction: Transaction = dataviewmanager.Transaction;
    if (currentTransaction !== null && !this.task.isAborting() && currentTransaction.isOpened() && currentTransaction.isOwner(this.task) && currentTransaction.getLevel() === level) {
      let cmd: IClientCommand = CommandFactory.CreateTransactionCommand(oper, this.task.getTaskTag(), reversibleExit, level);
      try {
        this.task.TryingToCommit = true;
        refResult.value = dataviewmanager.Execute(cmd);
      }
      finally {
        // Don't catch any exception here. Just turn off the "tryingToCommit" flag.
        this.task.TryingToCommit = false;
      }

      returnValue = true;
    }

    return returnValue;
  }

  /// <summary>
  // while we don't have transaction we must faild stack on the record(same as we doing for duplicate index)
  // so we create TransactionErrorHandlingsRetry and we use this dummy transaction
  /// </summary>
  /// <param name="transBegin"></param>
  /// <returns></returns>
  HandelTransactionErrorHandlingsRetry(transBegin: string[]): void {
    let task: Task = this.task;
    if (task.Transaction === null && transBegin[0] === ConstInterface.TRANS_NONE) {
      task.TransactionErrorHandlingsRetry = new Transaction(task, task.getTaskTag(), false);
      task.TransactionErrorHandlingsRetry.setTransBegin(ConstInterface.TRANS_RECORD_PREFIX);
      transBegin[0] = ConstInterface.TRANS_RECORD_PREFIX;
    }
  }
}
