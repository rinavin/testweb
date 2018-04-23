import {ClientOriginatedCommand} from "../commands/ClientToServer/ClientOriginatedCommand";
import {RemoteDataViewCommandBase} from "./RemoteDataViewCommandBase";
import {DummyDataViewCommand} from "./RemoteInitDataViewCommand";
import {ExecOperCommand} from "../commands/ClientToServer/ExecOperCommand";
import {RemoteDataViewCommandUpdateNonModifiable} from "./RemoteDataViewCommandUpdateNonModifiable";
import {DataviewCommand, DataViewCommandType} from "../commands/ClientToServer/DataviewCommand";
import {SetTransactionStateRemoteDataViewCommand} from "./SetTransactionStateRemoteDataViewCommand";
import {SetTransactionStateDataviewCommand} from "../commands/ClientToServer/SetTransactionStateDataviewCommand";
import {AddUserRangeRemoteDataViewCommand} from "./AddUserRangeRemoteDataViewCommand";
import {ResetUserRangeRemoteDataviewCommand} from "./ResetUserRangeRemoteDataviewCommand";
import {AddUserLocateRemoteDataViewCommand} from "./AddUserLocateRemoteDataViewCommand";
import {ResetUserLocateRemoteDataviewCommand} from "./ResetUserLocateRemoteDataviewCommand";
import {AddUserLocateDataViewCommand} from "../commands/ClientToServer/AddUserLocateDataViewCommand";
import {AddUserSortRemoteDataViewCommand} from "./AddUserSortRemoteDataViewCommand";
import {ResetUserSortRemoteDataviewCommand} from "./ResetUserSortRemoteDataviewCommand";
import {RemoteControlItemsRefreshCommand} from "./RemoteControlItemsRefreshCommand";
import {ControlItemsRefreshCommand} from "../commands/ClientToServer/ControlItemsRefreshCommand";
import {AddUserSortDataViewCommand} from "../commands/ClientToServer/AddUserSortDataViewCommand";
import {AddUserRangeDataviewCommand} from "../commands/ClientToServer/AddUserRangeDataviewCommand";
import {ConstInterface} from "../ConstInterface";

export class RemoteDataViewCommandFactory {

  /// <summary>
  /// a factory method that creates an data view command from the send command
  /// </summary>
  /// <param name="command"></param>
  /// <returns></returns>
  CreateDataViewCommand(command: ClientOriginatedCommand): RemoteDataViewCommandBase {
    let remoteDataViewCommandBase: RemoteDataViewCommandBase = new DummyDataViewCommand(command);
    let execOperCommand: ExecOperCommand = ((command instanceof ExecOperCommand) ? <ExecOperCommand>command : null);
    if (execOperCommand !== null && execOperCommand.Operation !== null && execOperCommand.Operation.getType() === ConstInterface.MG_OPER_UPDATE) {
      remoteDataViewCommandBase = new RemoteDataViewCommandUpdateNonModifiable(execOperCommand);
    }
    else {
      if (!(command instanceof DataviewCommand)) { // this is local dataview commands
        remoteDataViewCommandBase = new RemoteDataViewCommandBase(command);
      }
      else { // if (command.Type == ConstInterface.CMD_TYPE_DATAVIEW)
        let dataviewCommand: DataviewCommand = ((command instanceof DataviewCommand) ? <DataviewCommand>command : null);
        switch (dataviewCommand.CommandType) {
          case DataViewCommandType.SetTransactionState:
            remoteDataViewCommandBase = new SetTransactionStateRemoteDataViewCommand(<SetTransactionStateDataviewCommand>dataviewCommand);
            break;
          case DataViewCommandType.AddUserRange:
            remoteDataViewCommandBase = new AddUserRangeRemoteDataViewCommand(<AddUserRangeDataviewCommand>command);
            break;
          case DataViewCommandType.ResetUserRange:
            remoteDataViewCommandBase = new ResetUserRangeRemoteDataviewCommand(command);
            break;
          case DataViewCommandType.AddUserLocate:
            remoteDataViewCommandBase = new AddUserLocateRemoteDataViewCommand(<AddUserLocateDataViewCommand>command);
            break;
          case DataViewCommandType.ResetUserLocate:
            remoteDataViewCommandBase = new ResetUserLocateRemoteDataviewCommand(command);
            break;
          case DataViewCommandType.AddUserSort:
            remoteDataViewCommandBase = new AddUserSortRemoteDataViewCommand(<AddUserSortDataViewCommand>command);
            break;
          case DataViewCommandType.ResetUserSort:
            remoteDataViewCommandBase = new ResetUserSortRemoteDataviewCommand(command);
            break;
          case DataViewCommandType.ControlItemsRefresh:
            remoteDataViewCommandBase = new RemoteControlItemsRefreshCommand(<ControlItemsRefreshCommand>command);
            break;
        }
      }
    }
    return remoteDataViewCommandBase;
  }

  constructor() {
  }
}
