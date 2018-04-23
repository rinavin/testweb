import {RemoteDataViewCommandBase} from "./RemoteDataViewCommandBase";
import {ExecOperCommand} from "../commands/ClientToServer/ExecOperCommand";
import {ReturnResultBase} from "../util/ReturnResultBase";
import {ReturnResult} from "../util/ReturnResult";
import {MsgInterface} from "@magic/utils";

export class RemoteDataViewCommandUpdateNonModifiable extends RemoteDataViewCommandBase {
  private get execOperCommand(): ExecOperCommand {
    return <ExecOperCommand>this.Command;
  }

  constructor(command: ExecOperCommand) {
    super(command);
  }

  Execute(): ReturnResultBase {
    this.execOperCommand.Operation.operServer(this.execOperCommand.MprgCreator);
    return new ReturnResult(MsgInterface.RT_STR_NON_MODIFIABLE);
  }
}
