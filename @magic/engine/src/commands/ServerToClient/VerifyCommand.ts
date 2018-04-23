import {ClientTargetedCommandBase} from "./ClientTargetedCommandBase";
import {IResultValue} from "../../rt/IResultValue";
import {MGDataCollection} from "../../tasks/MGDataCollection";
import {ClientManager} from "../../ClientManager";
import {NString, RefParam} from "@magic/mscorelib";
import {Task} from "../../tasks/Task";
import {MgForm} from "../../gui/MgForm";
import {Commands, Styles} from "@magic/gui";
import {CommandsProcessorBase_SendingInstruction} from "../../CommandsProcessorBase";
import {Logger, MsgInterface, XmlParser} from "@magic/utils";
import {ConstUtils} from "../../util/ConstUtils";
import {ConstInterface} from "../../ConstInterface";

export class VerifyCommand extends ClientTargetedCommandBase {
  private _callingTaskTag: string = null; // is the id of the task that called the new window
  _title: string = null; // title of verify opr
  private _errLogAppend: boolean = false; // append to error log for verify opr
  private _text: string = null; // the verify message
  private _display: string = '\0';
  private _mode: string = '\0';
  private _sendAck: boolean = true;

  /// <summary>
  ///
  /// </summary>
  /// <param name="exp"></param>
  Execute(res: IResultValue): void {
    let instance: MGDataCollection = MGDataCollection.Instance;

    let task: Task = <Task>(instance.GetTaskByID(this.TaskTag) || instance.GetTaskByID(this._callingTaskTag));
    if (task === null)
      task = ClientManager.Instance.getLastFocusedTask();

    // In order to keep the behavior same as in Online, verify operation warning messages
    // will be written as error messages in Client log (QCR #915122)
    let errLogAppend: boolean = this._errLogAppend;
    if (errLogAppend)
      Logger.Instance.WriteExceptionToLogWithMsg(this._text + ", program : " + ClientManager.Instance.getPrgName());

    // Blank Message will not be shown, same as in Online
    if (!NString.IsNullOrEmpty(this._text)) {
      if (this._display === ConstInterface.DISPLAY_BOX) {
        let currForm: MgForm;
        let style: RefParam<number> = new RefParam(0);

        // on verify box, show translated value. (status is handled in property).
        let mlsTransText: string =  ClientManager.Instance.getLanguageData().translate(this._text);
        let mlsTransTitle: RefParam< string> = new RefParam(NString.Empty);

        if (task != null && task.isStarted())
          currForm = <MgForm>task.getTopMostForm();
        else
          currForm = null;

        this.PrepareMessageBoxForDisplay(task, mlsTransTitle, style);
        let returnValue: number = Commands.messageBox(currForm, mlsTransTitle.value, mlsTransText, style.value);
        this.ProcessMessageBoxResponse(task, returnValue);
      }
      // display message on status only if we have a task
      // Blank Message will not be shown, same as in Online
      else if (this._display === ConstInterface.DISPLAY_STATUS && task != null) {
        task.DisplayMessageToStatusBar(this._text);
      }
    }
    if (this._sendAck)
      Task.CommandsProcessor.Execute(CommandsProcessorBase_SendingInstruction.NO_TASKS_OR_COMMANDS);
  }

  /// <summary>
  /// Prepares the message box's style and title for display.
  /// </summary>
  /// <param name="task"></param>
  /// <param name="mlsTransTitle"></param>
  /// <param name="style"></param>
  PrepareMessageBoxForDisplay(task: Task, mlsTransTitle: RefParam<string>, style: RefParam<number>): void {
    let options: string = ClientManager.Instance.getMessageString(MsgInterface.BRKTAB_STOP_MODE_TITLE);
    this._title = ConstUtils.getStringOfOption(options, "EW", this._mode);
    mlsTransTitle.value = ClientManager.Instance.getLanguageData().translate(this._title);

    // add the icon according to the mode :is Error \ Warning
    style.value = Styles.MSGBOX_BUTTON_OK |
            ((this._mode === 'E')
              ? Styles.MSGBOX_ICON_ERROR
              : Styles.MSGBOX_ICON_WARNING);
  }

  /// <summary>
  /// Handles the response received from the message box.
  /// </summary>
  /// <param name="task"></param>
  /// <param name="returnValue"></param>
  ProcessMessageBoxResponse(task: Task, returnValue: number): void {
    // intentionally left empty.
  }

  public HandleAttribute(attribute: string, value: string): void {
    switch (attribute) {
      case ConstInterface.MG_ATTR_TITLE:
        this._title = value;
        break;

      case ConstInterface.MG_ATTR_CALLINGTASK:
        this._callingTaskTag = value;
        break;

      case ConstInterface.MG_ATTR_ERR_LOG_APPEND:
        this._errLogAppend = XmlParser.getBoolean(value);
        break;

      case ConstInterface.MG_ATTR_TEXT:
        this._text = XmlParser.unescape(value);
        break;

      case ConstInterface.MG_ATTR_DISPLAY:
        this._display = value[0];
        break;

      case ConstInterface.MG_ATTR_MODE:
        this._mode = value[0];
        break;

      case ConstInterface.MG_ATTR_ACK:
        this._sendAck = (XmlParser.getInt(value) !== 0);
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
