import {DataViewCommandType} from "./DataviewCommand";
import {AddUserRangeDataviewCommand} from "./AddUserRangeDataviewCommand";

/// <summary>
/// DataView Command for Add user locates.
/// </summary>
export class AddUserLocateDataViewCommand extends AddUserRangeDataviewCommand {

  /// <summary>
  /// CTOR
  /// </summary>
  constructor() {
    super();
    this.CommandType = DataViewCommandType.AddUserLocate;
  }
}
