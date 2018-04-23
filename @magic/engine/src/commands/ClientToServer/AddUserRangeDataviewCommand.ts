import {DataviewCommand, DataViewCommandType} from "./DataviewCommand";
import {UserRange} from "../../tasks/Task";

/// <summary>
/// command for the RangeAdd function
/// </summary>
export class AddUserRangeDataviewCommand extends DataviewCommand {
  Range: UserRange = null;

  /// <summary>
  /// CTOR
  /// </summary>
  constructor() {
    super();
    this.CommandType = DataViewCommandType.AddUserRange;
  }
}
