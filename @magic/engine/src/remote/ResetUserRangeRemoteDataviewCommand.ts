import {RemoteDataViewCommandBase} from "./RemoteDataViewCommandBase";
import {ClientOriginatedCommand} from "../commands/ClientToServer/ClientOriginatedCommand";
import {ReturnResultBase} from "../util/ReturnResultBase";
import {ReturnResult} from "../util/ReturnResult";

/// <summary>
/// command to reset the user ranges on the remote dataview
/// </summary>
export class ResetUserRangeRemoteDataviewCommand extends RemoteDataViewCommandBase {
  constructor(command: ClientOriginatedCommand) {
    super(command);
  }

  Execute(): ReturnResultBase {
    this.Task.UserRngs = null;
    this.Task.ResetRange = true;
    return new ReturnResult();
  }
}
