import {NNumber, Stack, StringBuilder} from "@magic/mscorelib";
import {ExecutionStackEntry} from "./ExecutionStackEntry";
import {ConstInterface} from "../ConstInterface";
import {XMLConstants} from "@magic/utils";

/// <summary> this class represents an execution stack of all operations that can be interupted by going to the server
/// to continue execution (raise event or any call to user defined function)
/// </summary>
export class ExecutionStack {
  private _execStack: Stack<ExecutionStackEntry> = null;

  constructor();
  constructor(inExecStack: ExecutionStack);
  constructor(inExecStack?: ExecutionStack) {
    if (arguments.length === 0) {
      this.constructor_0();
      return;
    }
    this.constructor_1(inExecStack);
  }

  /// <summary> default constructor</summary>
  private constructor_0(): void {
    this._execStack = new Stack();
  }

  /// <summary> constructor which copies the parameter execution stack</summary>
  /// <param name="inExecStack">- the execution stack to copy </param>
  private constructor_1(inExecStack: ExecutionStack): void {
    this._execStack = inExecStack.getStack().Clone();
  }

  /// <summary> getter for the execution stack itself</summary>
  /// <returns> the stack </returns>
  getStack(): Stack<ExecutionStackEntry> {
    return this._execStack;
  }

  push(execEntry: ExecutionStackEntry): void;
  push(taskId: string, handlerId: string, operIdx: number): void;
  push(execEntryOrTaskId: any, handlerId?: string, operIdx?: number): void {
    if (arguments.length === 1)
      this.push_0(execEntryOrTaskId);
    else
      this.push_1(execEntryOrTaskId, handlerId, operIdx);
  }

  /// <summary> pushes one entry into the stack</summary>
  /// <param name="execEntry">- to be pushed </param>
  private push_0(execEntry: ExecutionStackEntry): void {
    this._execStack.push(execEntry);
  }

  /// <summary> pushes an entry to the execution stack constructed by its 3 elements which are recieved as parameters</summary>
  /// <param name="taskId"> </param>
  /// <param name="handlerId"> </param>
  /// <param name="operIdx"> </param>
  private push_1(taskId: string, handlerId: string, operIdx: number): void {
    let execEntry: ExecutionStackEntry = new ExecutionStackEntry(taskId, handlerId, operIdx);
    this._execStack.push(execEntry);
  }

  /// <summary> pops an entry from the execution stack</summary>
  /// <returns> the popped entry
  /// </returns>
  pop(): ExecutionStackEntry {
    return <ExecutionStackEntry>this._execStack.pop();
  }

  /// <summary> check if the execution stack is empty </summary>
  /// <returns> an indication if it's empty or not
  /// </returns>
  empty(): boolean {
    return this._execStack.count() === 0;
  }

  /// <summary> clears the execution stack</summary>
  clear(): void {
    this._execStack.Clear();
  }

  /// <returns> the size of the execution stack
  /// </returns>
  size(): number {
    return this._execStack.count();
  }

  /// <summary> checks if two execution stacks are equal</summary>
  /// <param name="execStackCmp">- execution stack to compare to the current </param>
  /// <returns>s an indication whether the two are equal or not </returns>
  Equals(execStackCmp: any): boolean {
    let tmpExecStack: ExecutionStack = new ExecutionStack(this);
    let tmpExecStackCmp: ExecutionStack = new ExecutionStack(<ExecutionStack>execStackCmp);
    let equalStacks: boolean = false;

    if (tmpExecStack.size() === tmpExecStackCmp.size()) {
      equalStacks = true;
      while (!tmpExecStack.empty() && equalStacks) {
        if (!tmpExecStack.pop().Equals(tmpExecStackCmp.pop()))
          equalStacks = false;
      }
    }
    return equalStacks;
  }

  /// <summary> push into the current execution stack the execution stack that we get as parameter, but in reverse order</summary>
  /// <param name="inExecStack">- the execution stack to be pushed </param>
  pushUpSideDown(inExecStack: ExecutionStack): void {
    let tmpStack: ExecutionStack = new ExecutionStack(inExecStack);

    while (!tmpStack.empty()) {
      let tmpStackEntry: ExecutionStackEntry = tmpStack.pop();
      this._execStack.push(tmpStackEntry);
    }
  }

  /// <summary> reverse the order of the entries in the current execution stack</summary>
  reverse(): void {
    let tmpExecStack: ExecutionStack = new ExecutionStack(this);

    this.clear();

    while (!tmpExecStack.empty()) {
      let tmpExecStackEntry: ExecutionStackEntry = tmpExecStack.pop();
      this.push(tmpExecStackEntry);
    }
  }

  /// <summary> builds the xml of the current execution stack to be sent to the server</summary>
  /// <param name="Message">- the message which the xml needs to be appended to
  /// </param>
  public buildXML(message: StringBuilder): void {
    let forMessage: StringBuilder = new StringBuilder();
    while (this._execStack.count() !== 0) {
      let ExecEntry = <ExecutionStackEntry>this._execStack.pop();
      // offline tasks, and all tasks before them, should not be passed to the server
      let taskTag: number = NNumber.Parse(ExecEntry.TaskId);
      if (taskTag > ConstInterface.INITIAL_OFFLINE_TASK_TAG) {
        // clean the buffer and continue with the next task
        forMessage.Remove(0, forMessage.Length);
        continue;
      }
      forMessage.Append("\n " + XMLConstants.TAG_OPEN + ConstInterface.MG_TAG_EXEC_STACK_ENTRY);
      forMessage.Append(" " + XMLConstants.MG_ATTR_TASKID + "=\"" + ExecEntry.TaskId + "\"");
      forMessage.Append(" " + ConstInterface.MG_ATTR_HANDLERID + "=\"" + ExecEntry.HandlerId + "\"");
      forMessage.Append(" " + ConstInterface.MG_ATTR_OPER_IDX + "=\"" + ExecEntry.OperIdx + "\"");
      forMessage.Append(" " + XMLConstants.TAG_TERM);
    }
    message.Append(forMessage.ToString());
  }
}
