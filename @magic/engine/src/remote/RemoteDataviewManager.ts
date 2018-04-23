import {DataviewManagerBase} from "../data/DataviewManagerBase";
import {RemoteDataViewCommandFactory} from "./RemoteDataViewCommandFactory";
import {Task} from "../tasks/Task";
import {IClientCommand} from "../commands/IClientCommand";
import {ClientOriginatedCommand} from "../commands/ClientToServer/ClientOriginatedCommand";
import {ReturnResult} from "../util/ReturnResult";
import {ReturnResultBase} from "../util/ReturnResultBase";
import {RemoteDataViewCommandBase} from "./RemoteDataViewCommandBase";

/// <summary>
/// remote dataview manager:
/// will pass requests to the server
/// when reply is received will perform fillData to the dataview.xml
/// Note: in next phase will implement more complicated tasks
/// </summary>
export class RemoteDataviewManager extends DataviewManagerBase {
  private _remoteDataViewCommandFactory: RemoteDataViewCommandFactory = null;

  constructor(task: Task) {
    super(task);
    this._remoteDataViewCommandFactory = new RemoteDataViewCommandFactory();
  }

  /// <summary>
  /// execute the command by pass requests to the server
  /// </summary>
  /// <param name="command"></param>
  Execute(command: IClientCommand): ReturnResult {
    super.Execute(command);
    let remoteDataViewCommandBase: RemoteDataViewCommandBase = this._remoteDataViewCommandFactory.CreateDataViewCommand(<ClientOriginatedCommand>command);
    let innerResult: ReturnResultBase = remoteDataViewCommandBase.Execute();
    return new ReturnResult(innerResult);
  }
}
