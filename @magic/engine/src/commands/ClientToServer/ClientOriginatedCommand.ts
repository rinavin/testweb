import {IClientCommand} from "../IClientCommand";
import {RefParam} from "@magic/mscorelib";

/// <summary>
/// base class for commands created in the client
/// </summary>
export abstract class ClientOriginatedCommand implements IClientCommand {
  /// <summary>
  /// attribute of command to be sent to the server
  /// </summary>
  abstract get CommandTypeAttribute(): string;

  /// <summary>
  /// used to tell which commands are handled locally and should not be serialized
  /// </summary>
  /// <returns></returns>
  get ShouldSerialize(): boolean {
    return true;
  }

  /// <summary>
  /// should the SerializeRecords method be called for this command
  /// </summary>
  get ShouldSerializeRecords(): boolean {
    return true;
  }

  /// <summary>
  /// virtual method, to allow commands to serialize specific data
  /// </summary>
  /// <param name="hasChildElements"></param>
  /// <returns></returns>
  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    return null;
  }

  /// <summary>
  /// enable commands to serialize extra data after the command serialization (e.g. execution stack)
  /// </summary>
  /// <returns></returns>
  SerializeDataAfterCommand(): string {
    return null;
  }
}
