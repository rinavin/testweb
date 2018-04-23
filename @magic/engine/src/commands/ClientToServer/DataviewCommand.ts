import {RefParam, Debug, NotImplementedException} from "@magic/mscorelib";
import {ClientOriginatedCommandTaskTag} from "../ClientOriginatedCommandTaskTag";

export enum DataViewCommandType {
  Init,
  Clear,
  Prepare,
  FirstChunk,
  RecomputeUnit,
  ExecuteLocalUpdates,
  InitDataControlViews,
  OpenTransaction,
  CloseTransaction,
  SetTransactionState,
  AddUserRange,
  ResetUserRange,
  DbDisconnect,
  AddUserLocate,
  ResetUserLocate,
  AddUserSort,
  ResetUserSort,
  DataViewToDataSource,
  DbDelete,
  ControlItemsRefresh,
  SQLExecute
}

/// <summary>
/// general base class for dataview commands
/// </summary>
export class DataviewCommand extends ClientOriginatedCommandTaskTag {
  CommandType: DataViewCommandType = 0;
  TaskTag: string = null;

  get CommandTypeAttribute(): string {
    throw new NotImplementedException();
  }

  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    Debug.Assert(false, "Dataview commands need not be serialized");
    return null;
  }

  get ShouldSerialize(): boolean {
    return false;
  }

  constructor() {
    super();
  }
}
