import {AddRangeCommand} from "./AddRangeCommand";
import {IResultValue} from "../../rt/IResultValue";
import {MGDataCollection} from "../../tasks/MGDataCollection";
import {FieldDef, RecordUtils} from "@magic/gui";
import {AddUserLocateDataViewCommand} from "../ClientToServer/AddUserLocateDataViewCommand";
import {Task} from "../../tasks/Task";
import {CommandFactory} from "../ClientToServer/CommandFactory";
import {RefParam} from "@magic/mscorelib";

/// <summary>
/// AddLocateCommand
/// </summary>
export class AddLocateCommand extends AddRangeCommand {

  /// <summary>
  /// Execute AddLocateCommand
  /// </summary>
  /// <param name="exp"></param>
  public Execute(res: IResultValue): void {
    let mgDataTab: MGDataCollection = MGDataCollection.Instance;

    let task: Task = <Task>mgDataTab.GetTaskByID(this.TaskTag);
    let fieldDef: FieldDef = task.DataView.getField(<number>this.UserRange.veeIdx - 1);
    let parsedLen: RefParam<number> = new RefParam(0);

    let command: AddUserLocateDataViewCommand = CommandFactory.CreateAddUserLocateDataviewCommand(this.TaskTag, this.UserRange);
    if (!this.UserRange.nullMin)
      command.Range.min = RecordUtils.deSerializeItemVal(this.UserRange.min, fieldDef.getType(), fieldDef.getSize(), true, fieldDef.getType(), parsedLen);
    if (!this.UserRange.nullMax)
      command.Range.max = RecordUtils.deSerializeItemVal(this.UserRange.max, fieldDef.getType(), fieldDef.getSize(), true, fieldDef.getType(), parsedLen);

    task.DataviewManager.Execute(command);
  }

  constructor() {
    super();
  }
}
