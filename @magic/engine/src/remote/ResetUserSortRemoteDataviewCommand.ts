import {RemoteDataViewCommandBase} from "./RemoteDataViewCommandBase";
import {ReturnResultBase} from "../util/ReturnResultBase";
import {ReturnResult} from "../util/ReturnResult";
import {ClientOriginatedCommand} from "../commands/ClientToServer/ClientOriginatedCommand";

export class ResetUserSortRemoteDataviewCommand extends RemoteDataViewCommandBase {
  constructor(command: ClientOriginatedCommand) {
    super(command);
  }

  /// <summary>
  /// Reset User Sorts added by SortAdd function.
  /// </summary>
  /// <returns></returns>
  Execute(): ReturnResultBase {
    if (this.Task.UserSorts !== null) {
      this.Task.UserSorts.Clear();
      this.Task.UserSorts = null;
    }
    this.Task.ResetSort = true;
    return new ReturnResult();
  }
}
