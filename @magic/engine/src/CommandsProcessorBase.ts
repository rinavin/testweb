import {XMLConstants} from "@magic/utils";
import {IResultValue} from "./rt/IResultValue";
import {Scrambler} from "./util/Scrambler";
import {NotImplementedException} from "@magic/mscorelib";

// The stage in the session this execution belongs to
export enum CommandsProcessorBase_SessionStage
{
  HANDSHAKE = 1,
  INITIAL,
  NORMAL
}

// instruction what to send during execution
export enum CommandsProcessorBase_SendingInstruction {
  NO_TASKS_OR_COMMANDS,
  ONLY_COMMANDS,
  TASKS_AND_COMMANDS
}

/// <summary> this class is responsible for the communication with the server and handling the server messages</summary>
export abstract class CommandsProcessorBase {
  _sessionCounter: number = 0; // the session counter that should be used on the next access to the server.

  GetSessionCounter(): number {
    return this._sessionCounter;
  }

  /// <summary>
  /// start the session - e.g. exchange handshake requests with the Server, if connected.
  /// </summary>
  /// <returns>true only if the Client should continue to start the actual requested program.</returns>
  abstract StartSession(): boolean;

  /// <summary>build the xml request; send it to the runtime-engine; receive a response</summary>
  /// <param name="sendingInstruction">instruction what to send during execution - NO_TASKS_OR_COMMANDS / ONLY_COMMANDS / TASKS_AND_COMMANDS.</param>
  /// <param name="sessionStage">HANDSHAKE / INITIAL / NORMAL.</param>
  /// <param name="res">result ot be  read after parsing the response from the server.</param>
  Execute(sendingInstruction: CommandsProcessorBase_SendingInstruction): void;
  Execute(sendingInstruction: CommandsProcessorBase_SendingInstruction, sessionStage: CommandsProcessorBase_SessionStage, res: IResultValue): void;
  Execute(sendingInstruction: CommandsProcessorBase_SendingInstruction, sessionStage?: CommandsProcessorBase_SessionStage, res?: IResultValue): void {
    if (arguments.length === 1) {
      this.Execute_0(sendingInstruction);
      return;
    }
    this.Execute_1(sendingInstruction, sessionStage, res);
  }

  /// <summary>build the xml request; send it to the runtime-engine</summary>
  /// <param name="sendingInstruction">instruction what to send during execution - NO_TASKS_OR_COMMANDS / ONLY_COMMANDS / TASKS_AND_COMMANDS.</param>
  private Execute_0(sendingInstruction: CommandsProcessorBase_SendingInstruction): void {
    this.Execute_1(sendingInstruction, CommandsProcessorBase_SessionStage.NORMAL, null);
  }

  /// <summary>build the xml request; send it to the runtime-engine; receive a response</summary>
  /// <param name="sendingInstruction">instruction what to send during execution - NO_TASKS_OR_COMMANDS / ONLY_COMMANDS / TASKS_AND_COMMANDS.</param>
  /// <param name="sessionStage">HANDSHAKE / INITIAL / NORMAL.</param>
  /// <param name="res">result ot be  read after parsing the response from the server.</param>
  abstract Execute_1(sendingInstruction: CommandsProcessorBase_SendingInstruction, sessionStage: CommandsProcessorBase_SessionStage, res: IResultValue): void;

  /// <summary> Invoke the request URL & return the response.</summary>
  /// <param name="requestedURL">URL to be accessed.</param>
  /// <returns>response (from the server).</returns>
  abstract GetContent(requestedURL: string): string;

  /// <summary>send Monitor messaging to the server</summary>
  abstract SendMonitorOnly(): void ;

  /// <summary> unscramble servers response</summary>
  /// <returns>unscrambled content</returns>
  static UnScramble(respBuf: string): string {
    let openTagLocation: number = respBuf.indexOf(XMLConstants.MG_TAG_OPEN);
    let core: string;

    if (openTagLocation !== -1) {
      let start: number = openTagLocation + XMLConstants.MG_TAG_OPEN.length;
      let openTag: string = respBuf.substr(0, start);

      let finish: number = respBuf.lastIndexOf(XMLConstants.TAG_OPEN);
      let closeTag: string = respBuf.substr(finish);

      core = openTag + Scrambler.UnScramble(respBuf, start, finish - 1) + closeTag;
    }
    else {
      // We got a scrambled error message, there is no open tag
      core = Scrambler.UnScramble(respBuf, 0, respBuf.length - 1);
    }
    return core;
  }
}
