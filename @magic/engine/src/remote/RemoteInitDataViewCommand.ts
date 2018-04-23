import {RemoteDataViewCommandBase} from "./RemoteDataViewCommandBase";
import {ClientOriginatedCommand} from "../commands/ClientToServer/ClientOriginatedCommand";
import {ReturnResultBase} from "../util/ReturnResultBase";
import {ReturnResult} from "../util/ReturnResult";

/// <summary>
/// remote command : dummy for now
/// </summary>
export class DummyDataViewCommand extends RemoteDataViewCommandBase {
  constructor(command: ClientOriginatedCommand) {
    super(command);
  }

  Execute(): ReturnResultBase {
    return new ReturnResult();
  }
}
