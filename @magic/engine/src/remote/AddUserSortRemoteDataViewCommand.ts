import {RemoteDataViewCommandBase} from "./RemoteDataViewCommandBase";
import {Sort} from "../tasks/sort/Sort";
import {AddUserSortDataViewCommand} from "../commands/ClientToServer/AddUserSortDataViewCommand";
import {ReturnResultBase} from "../util/ReturnResultBase";
import {List} from "@magic/mscorelib";
import {ReturnResult} from "../util/ReturnResult";

/// <summary>
/// Remote DataView Command for Add user sort.
/// </summary>
export class AddUserSortRemoteDataViewCommand extends RemoteDataViewCommandBase {
  private sort: Sort = null;

  constructor(command: AddUserSortDataViewCommand) {
    super(command);
    this.sort = command.Sort;
  }

  /// <summary>
  /// This will add user sorts on task so that view refresh command will apply this sort.
  /// </summary>
  /// <returns></returns>
  Execute(): ReturnResultBase {
    if (this.Task.UserSorts === null) {
      this.Task.UserSorts = new List<Sort>();
    }
    this.Task.UserSorts.push(this.sort);
    return new ReturnResult();
  }
}
