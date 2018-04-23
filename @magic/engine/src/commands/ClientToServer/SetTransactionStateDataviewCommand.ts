import {DataviewCommand, DataViewCommandType} from "./DataviewCommand";

export class SetTransactionStateDataviewCommand extends DataviewCommand {
  TransactionIsOpen: boolean = false;


  /// <summary>
  /// CTOR
  /// </summary>
  constructor() {
    super();
    this.CommandType = DataViewCommandType.SetTransactionState;
  }
}
