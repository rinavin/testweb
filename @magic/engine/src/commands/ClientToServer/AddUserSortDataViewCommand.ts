import {DataviewCommand, DataViewCommandType} from "./DataviewCommand";
import {Sort} from "../../tasks/sort/Sort";

/// <summary>
/// DataView Command for Add User Sort.
/// </summary>
export class AddUserSortDataViewCommand extends DataviewCommand {
  Sort: Sort = null;

  /// <summary>
  /// CTOR
  /// </summary>
  constructor() {
    super();
    this.CommandType = DataViewCommandType.AddUserSort;
  }
}
