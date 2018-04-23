import {ClientTargetedCommandBase} from "./ClientTargetedCommandBase";
import {Sort} from "../../tasks/sort/Sort";
import {IResultValue} from "../../rt/IResultValue";
import {MGDataCollection} from "../../tasks/MGDataCollection";
import {Task} from "../../tasks/Task";
import {AddUserSortDataViewCommand} from "../ClientToServer/AddUserSortDataViewCommand";
import {CommandFactory} from "../ClientToServer/CommandFactory";
import {XmlParser} from "@magic/utils";
import {ConstInterface} from "../../ConstInterface";

/// <summary>
/// AddSortCommand
/// </summary>
export class AddSortCommand extends ClientTargetedCommandBase {
  UserSort: Sort = null;

  /// <summary>
  /// Execute AddSortCommand
  /// </summary>
  /// <param name="res"></param>
  Execute(res: IResultValue): void {
    let mgDataTab: MGDataCollection = MGDataCollection.Instance;
    let task: Task = <Task>mgDataTab.GetTaskByID(this.TaskTag);
    let command: AddUserSortDataViewCommand = CommandFactory.CreateAddUserSortDataviewCommand(this.TaskTag, this.UserSort);
    task.DataviewManager.Execute(command);
  }


  /// <summary>
  /// Handle Attributes of the command.
  /// </summary>
  /// <param name="attribute"></param>
  /// <param name="value"></param>
  public HandleAttribute(attribute: string, value: string): void {
    switch (attribute) {
      case ConstInterface.MG_ATTR_FIELD_INDEX:
        if (this.UserSort == null)
          this.UserSort = new Sort();
        this.UserSort.fldIdx = XmlParser.getInt(value);
        break;
      case ConstInterface.MG_ATTR_DIR:
        this.UserSort.dir = XmlParser.getInt(value) === 1 ? true : false;
        break;
      default:
        super.HandleAttribute(attribute, value);
        break;
    }
  }

  constructor() {
    super();
  }
}
