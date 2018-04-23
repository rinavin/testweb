import {RemoteDataViewCommandBase} from "./RemoteDataViewCommandBase";
import {ClientOriginatedCommand} from "../commands/ClientToServer/ClientOriginatedCommand";
import {ReturnResultBase} from "../util/ReturnResultBase";
import {ReturnResult} from "../util/ReturnResult";

/// <summary>
/// ResetUserLocateRemoteDataviewCommand
/// </summary>
export class ResetUserLocateRemoteDataviewCommand extends RemoteDataViewCommandBase {
  constructor(command: ClientOriginatedCommand) {
    super(command);
  }

  /// <summary>
  /// Reset User Locates Added by LocateAdd function
  /// </summary>
  /// <returns></returns>
  Execute(): ReturnResultBase {
    let flag: boolean = this.Task.UserLocs !== null;
    if (flag) {
      this.Task.UserLocs.Clear();
      this.Task.UserLocs = null;
    }
    this.Task.ResetLocate = true;
    return new ReturnResult();
  }
}
