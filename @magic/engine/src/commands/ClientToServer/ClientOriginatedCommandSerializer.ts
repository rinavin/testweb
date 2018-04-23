import {Logger, XMLConstants} from "@magic/utils";
import {Exception, StringBuilder, RefParam} from "@magic/mscorelib";
import {MGData} from "../../tasks/MGData";
import {MGDataCollection} from "../../tasks/MGDataCollection";
import {ClientManager} from "../../ClientManager";
import {MgControl} from "../../gui/MgControl";
import {ConstInterface} from "../../ConstInterface";
import {TaskBase} from "@magic/gui";
import {ClientOriginatedCommand} from "./ClientOriginatedCommand";

export class ClientOriginatedCommandSerializer {

  /// <summary>
  /// general serialization for stuff common to all serialized commands
  /// </summary>
  /// <returns></returns>
  public static Serialize(cmd: ClientOriginatedCommand): string {
      if (!cmd.ShouldSerialize)
        return null;

      let message: StringBuilder = new StringBuilder();
      let hasChildElements: boolean = false;

      message.Append(XMLConstants.START_TAG + ConstInterface.MG_TAG_COMMAND);
      message.Append(" " + XMLConstants.MG_ATTR_TYPE + "=\"" + cmd.CommandTypeAttribute + "\"");

      let refHasChildElements: RefParam<boolean> = new RefParam(hasChildElements);
      message.Append(cmd.SerializeCommandData(refHasChildElements));
      hasChildElements = refHasChildElements.value;

      if (cmd.ShouldSerializeRecords)
        message.Append(/*this.SerializeRecords()*/ ClientOriginatedCommandSerializer.SerializeRecords());

      if (hasChildElements)
        message.Append(XMLConstants.TAG_CLOSE);
      else
        message.Append(XMLConstants.TAG_TERM);

      message.Append(cmd.SerializeDataAfterCommand());
      return message.ToString();
  }

  /// <summary>
  /// should not be called for Query and for IniputForceWrite:
  /// </summary>
  /// <returns></returns>
  static SerializeRecords(): string {
    let message: StringBuilder = new StringBuilder();
    try {
      let currMGData: MGData = MGDataCollection.Instance.getCurrMGData();
      let length: number = currMGData.getTasksCount();
      let titleExist: boolean = false;
      let currFocusedTask: TaskBase = <TaskBase>ClientManager.Instance.getLastFocusedTask();

      for (let i: number = 0; i < length; i++) {
        let task: TaskBase = currMGData.getTask(i);
        let ctrl: MgControl = <MgControl>task.getLastParkedCtrl();
        if (ctrl !== null /*&& task.KnownToServer && !task.IsOffline*/) {
          if (!titleExist) {
            message.Append(" " + ConstInterface.MG_ATTR_FOCUSLIST + "=\"");
            titleExist = true;
          }
          else
            message.Append('$');
          message.Append(task.getTaskTag() + ",");
          message.Append(task.getLastParkedCtrl().getDitIdx());
        }
      }
      if (titleExist)
        message.Append("\"");

      if (currFocusedTask !== null /*&& !currFocusedTask.IsOffline*/)
        message.Append(" " + ConstInterface.MG_ATTR_FOCUSTASK + "=\"" + currFocusedTask.getTaskTag() + "\"");
    }
    catch (ex) {
      if (ex instanceof Exception) {
        Logger.Instance.WriteExceptionToLog(ex);
      }
      else
        throw ex;
    }
    return message.ToString();
  }
}
