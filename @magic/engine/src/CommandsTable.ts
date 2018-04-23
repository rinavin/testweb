import {ClientManager} from "./ClientManager";
import {IClientTargetedCommand} from "./commands/IClientTargetedCommand";
import {XMLBasedCommandBuilder} from "./commands/ServerToClient/XMLBasedCommandBuilder";
import {IResultValue} from "./rt/IResultValue"
import {ResultCommand} from "./commands/ServerToClient/ResultCommand";
import {IClientCommand} from "./commands/IClientCommand";
import {AbortCommand} from "./commands/ServerToClient/AbortCommand";
import {RefParam, StringBuilder, List} from "@magic/mscorelib";
import {VerifyCommand} from "./commands/ServerToClient/VerifyCommand";
import {MGDataCollection} from "./tasks/MGDataCollection";
import {ClientOriginatedCommand} from "./commands/ClientToServer/ClientOriginatedCommand";
import {ConstInterface} from "./ConstInterface";
import {Task} from "./tasks/Task";
import {ClientOriginatedCommandSerializer} from "./commands/ClientToServer/ClientOriginatedCommandSerializer";

export class CommandsTable {
  private _cmds: List<IClientCommand> = null;
  private _iterationIdx: number = 0;

  constructor() {
    this._cmds = new List();
  }

  /// <summary>
  ///   To parse input string and fill  _cmds
  /// </summary>
  /// <returns> index of end last  <command ...> tag</returns>
  fillData(): void {
    while (this.initInnerObjects(ClientManager.Instance.RuntimeCtx.Parser.getNextTag())) {
    }
  }

  /// <summary>
  ///   To allocate and fill inner objects of the class
  /// </summary>
  /// <param name = "foundTagName">  name of inner tag </param>
  private initInnerObjects(foundTagName: string): boolean {
    if (foundTagName == null)
      return false;

    if (foundTagName === ConstInterface.MG_TAG_COMMAND) {
      let cmd: IClientTargetedCommand = new XMLBasedCommandBuilder().fillData() as IClientTargetedCommand;

      if (cmd.WillReplaceWindow)
        cmd.Execute(null);
      // Expression needed for CMD_TYPE_RESULT only
      else
        this._cmds.push(cmd);
    }
    else
      return false;
    return true;
  }

  /// <summary>
  ///   Execute all commands in command table and delete them
  /// </summary>
  /// <param name="res">result.</param>
  Execute(res: IResultValue): void {
    let currFrame: number = ClientManager.Instance.getCmdFrame(); // cmdFrame++;  save a local value of the frame
    ClientManager.Instance.add1toCmdFrame();
    let firstBlocking: number = -1;
    let i: number, j: number;
    let cmd: IClientTargetedCommand;

    // frames are used here to make sure that when this method is called recursively
    // the inner call will not execute commands that should be executed by some outer
    // call to the method

    // First step - move all result commands before any blocking commands (QCR #693428)
    // it can't be that they belong to the blocking task.
    for (i = 0; i < this.getSize(); i = i + 1) {

      cmd = this.getCmd(i) as IClientTargetedCommand;
      if (cmd.IsBlocking && firstBlocking === -1)
        firstBlocking = i;
      else if (cmd instanceof ResultCommand && firstBlocking !== -1) {
        this._cmds.Insert(firstBlocking, cmd);
        this._cmds.RemoveAt(i + 1);
      }
    }
    // set the frame for commands which has no frame yet
    for (i = 0; i < this.getSize(); i = i + 1) {

      cmd = this.getCmd(i) as IClientTargetedCommand;
      cmd.Frame = currFrame;

      // If a command blocks the caller, following commands are moved to
      // the next active MGdata, so they will be executed (QCR #438387)
      if (cmd.IsBlocking) {
        for (j = i + 1; j < this.getSize(); j = j + 1)
          ClientManager.Instance.addUnframedCmd(this.getCmd(j));

        this._cmds.SetSize(i + 1);
        break;
      }
    }

    while (this.getSize() > 0) {
      // TODO: Check 'as' for Interface in typescript
      const tmpCmd = this.extractCmd(currFrame);
      if (tmpCmd instanceof IClientTargetedCommand)
        cmd = tmpCmd;

      if (cmd != null) {
        if (cmd.ShouldExecute) {
          cmd.Execute(res);
        }
        else {
          ClientManager.Instance.addCommandsExecutedAfterTaskStarted(cmd);
        }
      }
      else
        break;
    }
  }

  /// <summary>
  ///   returns the next command to execute or null if there is no such command
  ///   the abort commands are returned first
  /// </summary>
  /// <param name = "frame">the frame from which to extract a command </param>
  private extractCmd(frame: number): IClientCommand {
    let size: number = this.getSize();
    let cmd: IClientTargetedCommand = null;
    let verifyCmd: IClientTargetedCommand = null;
    let verifyIndex: number;
    let verifyTask: Task = null;
    let abortTask: Task = null;
    let startIterationIdx: number;
    let tid: string;

    if (size === 0)
      return null;

    if (this._iterationIdx >= size)
      this._iterationIdx = 0;

    startIterationIdx = this._iterationIdx;

    // try to find an ABORT command and return it
    for (; this._iterationIdx < size; this._iterationIdx++) {
      cmd = ((this.getCmd(this._iterationIdx) instanceof AbortCommand) ? <AbortCommand>this.getCmd(this._iterationIdx) : null);
      if (cmd != null && !cmd.TaskTag.startsWith("-") && cmd.Frame === frame) {
        // if an abort command was found, execute all previous verify commands of the task or its' sub-tasks
        for (verifyIndex = 0; verifyIndex < this._iterationIdx; verifyIndex++) {
          verifyCmd = ((this.getCmd(verifyIndex) instanceof VerifyCommand) ? <VerifyCommand>this.getCmd(verifyIndex) : null);
          if (verifyCmd != null && verifyCmd.Frame === frame) {
            verifyTask = <Task>MGDataCollection.Instance.GetTaskByID(verifyCmd.TaskTag);
            abortTask = <Task>MGDataCollection.Instance.GetTaskByID(cmd.TaskTag);

            // Sometimes the task which issued the verify is not known to the client (e.g. a batch task).
            if (verifyTask != null && verifyTask.isDescendentOf(abortTask)) {
              this._cmds.RemoveAt(verifyIndex);
              this._iterationIdx--;
              return verifyCmd;
            }
          }
        }
        this._cmds.RemoveAt(this._iterationIdx);

        // for an abort CMD of task "tid", the server might send another abort CMD for task
        // "-tid". We should combine them and get rid of the second CMD.
        size = this.getSize();
        for (startIterationIdx = 0; startIterationIdx < size; startIterationIdx++) {
          tid = (<IClientTargetedCommand>this.getCmd(startIterationIdx)).TaskTag;
          if (tid != null && tid.substr(1) === cmd.TaskTag) {
            this._cmds.RemoveAt(startIterationIdx);
            break;
          }
        }

        return cmd;
      }
    }

    // at this stage no ABORT command was found in the table

    for (verifyIndex = 0; verifyIndex < size; verifyIndex++) {
      verifyCmd = ((this.getCmd(verifyIndex) instanceof VerifyCommand) ? <VerifyCommand>this.getCmd(verifyIndex) : null);
      if (verifyCmd != null && verifyCmd.Frame === frame &&
        MGDataCollection.Instance.GetTaskByID(verifyCmd.TaskTag) != null) {
        this._cmds.RemoveAt(verifyIndex);
        return verifyCmd;
      }
    }

    // at this stage no VERIFY command was found in the table

    for (this._iterationIdx = 0; this._iterationIdx < size; this._iterationIdx++) {
      cmd = this.getCmd(this._iterationIdx) as IClientTargetedCommand;
      if (cmd.Frame === frame) {
        this._cmds.RemoveAt(this._iterationIdx);
        return cmd;
      }
    }
    return null;

  }

  /// <summary>
  ///   returns the command by its index in the table
  /// </summary>
  /// <param name = "idx">the index of the requested command</param>
  getCmd(idx: number): IClientCommand {
    return this._cmds.get_Item(idx);
  }

  /// <summary>
  ///   build the XML structure of the commands and CLEAR the table
  /// </summary>
  buildXML(message: StringBuilder): void {
    for (let i: number = 0; i < this._cmds.length; i = i + 1) {
      let cmd: ClientOriginatedCommand = <ClientOriginatedCommand>this._cmds.get_Item(i);
      let temp: RefParam<boolean> = new RefParam(false);
      message.Append(ClientOriginatedCommandSerializer.Serialize(cmd));
    }

    this.clear();
  }

  /// <summary>
  ///   add a command to the table
  /// </summary>
  /// <param name = "cmd">a command to to add to the table</param>
  Add(cmd: IClientCommand): void {
    this._cmds.push(cmd);
  }

  /// <summary>
  /// extract and remove a command from the table
  /// </summary>
  /// <param name="commandIndex"> index of command in the table</param>
  /// <returns></returns>
  ExtractCommand(commandIndex: number): IClientCommand {
    let command: IClientCommand = this.getCmd(commandIndex);
    this._cmds.RemoveAt(commandIndex);
    return command;
  }

  /// <summary>
  ///   clear all the commands from the table
  /// </summary>
  clear(): void {
    this._cmds.Clear();
  }

  /// <summary>
  ///   returns the number of commands in the table
  /// </summary>
  getSize(): number {
    return this._cmds.length;
  }
}
