import {RemoteDataViewCommandBase} from "./RemoteDataViewCommandBase";
import {Transaction} from "../rt/Transaction";
import {ReturnResult} from "../util/ReturnResult";
import {ReturnResultBase} from "../util/ReturnResultBase";
import {SetTransactionStateDataviewCommand} from "../commands/ClientToServer/SetTransactionStateDataviewCommand";

/// <summary>
/// set state transaction
/// </summary>
export class SetTransactionStateRemoteDataViewCommand extends RemoteDataViewCommandBase {
  private get dataviewCommand(): SetTransactionStateDataviewCommand {
    return <SetTransactionStateDataviewCommand>this.Command;
  }

  constructor(command: SetTransactionStateDataviewCommand) {
    super(command);
  }

  Execute(): ReturnResultBase {
    if (this.Task !== null) {
      let transaction: Transaction = this.Task.DataviewManager.RemoteDataviewManager.Transaction;
      if (transaction !== null) {
        transaction.Opened = this.dataviewCommand.TransactionIsOpen;
      }
    }
    return new ReturnResult();
  }
}
