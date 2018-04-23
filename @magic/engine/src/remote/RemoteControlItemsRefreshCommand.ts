import {RemoteDataViewCommandBase} from "./RemoteDataViewCommandBase";
import {MgControlBase} from "@magic/gui";
import {ControlItemsRefreshCommand} from "../commands/ClientToServer/ControlItemsRefreshCommand";
import {ReturnResultBase} from "../util/ReturnResultBase";
import {ResultValue} from "../rt/ResultValue";
import {IClientCommand} from "../commands/IClientCommand";
import {CommandFactory} from "../commands/ClientToServer/CommandFactory";
import {RemoteCommandsProcessor} from "./RemoteCommandsProcessor";
import {CommandsProcessorBase_SendingInstruction, CommandsProcessorBase_SessionStage} from "../CommandsProcessorBase";
import {ReturnResult} from "../util/ReturnResult";
import {DataView} from "../data/DataView";

export class RemoteControlItemsRefreshCommand extends RemoteDataViewCommandBase {
  private control: MgControlBase = null;

  constructor(command: ControlItemsRefreshCommand) {
    super(command);
    this.control = command.Control;
  }

  Execute(): ReturnResultBase {
    let res: ResultValue = new ResultValue();
    let cmd: IClientCommand = CommandFactory.CreatecFetchDataControlValuesCommand(this.Task.getTaskTag(), this.control.getName());
    this.Task.getMGData().CmdsToServer.Add(cmd);
    // Fetch data control values from server.
    RemoteCommandsProcessor.GetInstance().Execute_1(CommandsProcessorBase_SendingInstruction.TASKS_AND_COMMANDS, CommandsProcessorBase_SessionStage.NORMAL, res);
    // Update DCValRef of every record after fetching the dataControl values.
    for (let i: number = 0; i < (<DataView>this.Task.DataView).getSize(); i = i + 1) {
      (<DataView>this.Task.DataView).getRecByIdx(i).AddDcValuesReference(this.control.getDitIdx(), this.control.getDcRef());
    }
    // Update DCValRef of original record.
    (<DataView>this.Task.DataView).getOriginalRec().AddDcValuesReference(this.control.getDitIdx(), this.control.getDcRef());
    return new ReturnResult();
  }
}
