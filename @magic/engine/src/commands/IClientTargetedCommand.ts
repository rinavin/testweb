import {IClientCommand} from "./IClientCommand";
import {IResultValue} from "../rt/IResultValue";

export abstract class IClientTargetedCommand implements IClientCommand {
  /// <summary>
  /// Gets a value denoting whether the execution of the command will block
  /// the execution of everything else on the client until the command execution ends.
  /// </summary>
  IsBlocking: boolean;

  /// <summary>
  /// Gets or sets a value denoting the frame identifier for the command execution.
  /// This value is expected to be set by the commands table, before running the command.
  /// </summary>
  Frame: number;

  /// <summary>
  /// Gets a value denoting whether executing the command will activate a window
  /// other than the current. This will reflect on the timing of the command execution.
  /// </summary>
  WillReplaceWindow: boolean;

  /// <summary>
  /// The tag of the task in whose context the command is executed.
  /// </summary>
  TaskTag: string;

  Obj: string;

  ShouldExecute: boolean;

  /// <summary>
  /// Run the command on the client.
  /// </summary>
  /// <param name="res"></param>
  abstract Execute(res: IResultValue): void;

  /// <summary>
  /// Manipulates inner state according to an XML attribute value.
  /// </summary>
  /// <param name="attribute">The name of the attribute.</param>
  /// <param name="value">The value of the attribute as a string read from the XML.</param>
  abstract HandleAttribute(attribute: string, value: string): void;
}
