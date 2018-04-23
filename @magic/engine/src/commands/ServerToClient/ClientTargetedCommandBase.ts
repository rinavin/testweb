import {IClientTargetedCommand} from "../IClientTargetedCommand";
import {IClientCommand} from "../IClientCommand";
import {IResultValue} from "../../rt/IResultValue";
import {XMLConstants} from "@magic/utils";
import {ConstInterface} from "../../ConstInterface";
import {NString} from "@magic/mscorelib";

/// <summary>
/// Base class for ClientTargetedCommands. This class implements
/// common properties and methods shared by all inheriting command classes.
/// </summary>
export abstract class ClientTargetedCommandBase extends IClientTargetedCommand implements IClientCommand {

  private _oldId: string = null;

  get IsBlocking(): boolean {
    return false;
  }

  Frame: number = 0;

  get WillReplaceWindow(): boolean {
    return this._oldId !== null;
  }

  TaskTag: string = null;

  Obj: string = null;

  get ShouldExecute(): boolean {
    return true;
  }

  abstract Execute(res: IResultValue): void ;

  HandleAttribute(attribute: string, value: string): void {
    switch (attribute) {
      case XMLConstants.MG_ATTR_TASKID:
        this.TaskTag = value;
        break;

      case ConstInterface.MG_ATTR_OLDID:
        this._oldId = NString.TrimEnd(value);
        break;
    }
  }
}
