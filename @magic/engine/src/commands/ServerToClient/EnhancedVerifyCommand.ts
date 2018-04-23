import {RefParam} from "@magic/mscorelib";
import {XmlParser} from "@magic/utils";
import {VerifyCommand} from "./VerifyCommand";
import {Operation} from "../../rt/Operation";
import {Task} from "../../tasks/Task";
import {ClientManager} from "../../ClientManager";
import {ConstInterface} from "../../ConstInterface";
import {Field} from "../../data/Field";


export class EnhancedVerifyCommand extends VerifyCommand {
  private _buttonsID: string = '\0'; // buttons of verify opr
  private _defaultButton: number = 0; // default button of verify opr
  private _image: string = '\0'; // image of verify opr
  private _returnValStr: string = null;
  private _returnVal: Field = null; // return value of verify opr

  ProcessMessageBoxResponse(task: Task, returnValue: number): void {
    if (task !== null)
      Operation.setoperVerifyReturnValue(returnValue, this._returnVal);
  }

  PrepareMessageBoxForDisplay(task: Task, mlsTransTitle: RefParam<string>, style: RefParam<number>): void {
    mlsTransTitle.value = ClientManager.Instance.getLanguageData().translate(this._title);
    style.value = Operation.getButtons(this._buttonsID);
    style.value |= Operation.getImage(this._image);
    style.value |= Operation.getDefaultButton(this._defaultButton);

    if (task !== null) {
      // Verify command return value can only be used with main program fields
      if (Task.isMainProgramField(this._returnValStr)) {
        this._returnVal = Operation.InitField(this._returnValStr, task);
      }
    }
  }

  public HandleAttribute(attribute: string, value: string): void {
    switch (attribute) {
      case ConstInterface.MG_ATTR_IMAGE:
        this._image = value[0];
        break;
      case ConstInterface.MG_ATTR_BUTTONS:
        this._buttonsID = value[0];
        break;
      case ConstInterface.MG_ATTR_DEFAULT_BUTTON:
        this._defaultButton = XmlParser.getInt(value);
        break;
      case ConstInterface.MG_ATTR_RETURN_VAL:
        this._returnValStr = value;
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
