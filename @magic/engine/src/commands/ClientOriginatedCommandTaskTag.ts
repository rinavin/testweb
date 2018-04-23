import {ClientOriginatedCommand} from "./ClientToServer/ClientOriginatedCommand";
import {ICommandTaskTag} from "./ClientToServer/ICommandTaskTag";

export abstract class ClientOriginatedCommandTaskTag extends ClientOriginatedCommand implements ICommandTaskTag {
  TaskTag: string;
}
