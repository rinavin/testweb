import {RemoteDataViewCommandBase} from "./RemoteDataViewCommandBase";
import {UserRange} from "../tasks/Task";
import {AddUserRangeDataviewCommand} from "../commands/ClientToServer/AddUserRangeDataviewCommand";
import {ReturnResultBase} from "../util/ReturnResultBase";
import {List} from "@magic/mscorelib";
import {ReturnResult} from "../util/ReturnResult";

/// <summary>
/// command to add the user range, from RangeAdd, to the remote data view
/// </summary>
export class AddUserRangeRemoteDataViewCommand extends RemoteDataViewCommandBase {
  private userRange: UserRange = null;

  constructor(command: AddUserRangeDataviewCommand) {
    super(command);
    this.userRange = command.Range;
  }

  Execute(): ReturnResultBase {
    if (this.Task.UserRngs === null) {
      this.Task.UserRngs = new List<UserRange>();
    }
    this.Task.UserRngs.push(this.userRange);
    return new ReturnResult();
  }
}
