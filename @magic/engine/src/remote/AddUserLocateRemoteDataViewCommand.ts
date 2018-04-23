import {RemoteDataViewCommandBase} from "./RemoteDataViewCommandBase";
import {AddUserLocateDataViewCommand} from "../commands/ClientToServer/AddUserLocateDataViewCommand";
import {ReturnResultBase} from "../util/ReturnResultBase";
import {List} from "@magic/mscorelib";
import {ReturnResult} from "../util/ReturnResult";
import {UserRange} from "../tasks/Task";

/// <summary>
/// Remote DataView Command for Add User Locates.
/// </summary>
export class AddUserLocateRemoteDataViewCommand extends RemoteDataViewCommandBase {
  private userRange: UserRange = null;

  constructor(command: AddUserLocateDataViewCommand) {
    super(command);
    this.userRange = command.Range;
  }

  /// <summary>
  /// Add locate values into the task, so that view refresh command will use this values to locate the records.
  /// </summary>
  /// <returns></returns>
  Execute(): ReturnResultBase {
    if (this.Task.UserLocs === null) {
      this.Task.UserLocs = new List<UserRange>();
    }
    this.Task.UserLocs.push(this.userRange);
    return new ReturnResult();
  }
}
