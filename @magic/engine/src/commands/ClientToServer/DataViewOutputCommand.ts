import {DataviewCommand, DataViewCommandType} from "./DataviewCommand";

/// <summary>
/// command for various types of DataView output operation.
/// </summary>
export class DataViewOutputCommand extends DataviewCommand {
  Generation: number = 0;
  TaskVarNames: string = null;
  DestinationDataSourceNumber: number = 0;
  DestinationDataSourceName: string = null;
  DestinationColumns: string = null;

  /// <summary>
  /// CTOR
  /// </summary>
  constructor(OutputCommandType: DataViewCommandType) {
    super();
    this.CommandType = OutputCommandType;
  }
}
