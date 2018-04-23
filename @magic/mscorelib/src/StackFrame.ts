import * as StackTrace from 'stacktrace-js';
import JSStackFrame = StackTrace.StackFrame;

// StackFrame uses StackTrace utility using stacktrace-js utility from npm
// https://www.npmjs.com/package/stacktrace-js
export class StackFrame {
  private stackFrame: JSStackFrame = null;

  constructor(skipFrames: number, fNeedFileInfo: boolean) {

    let stackFrames: JSStackFrame[] = StackTrace.getSync();
    if (skipFrames < 0 || skipFrames >= stackFrames.length)
      throw  new Error("Argument out of range");

    this.stackFrame = stackFrames[skipFrames];
  }

  public GetFileName(): string {
    return this.stackFrame.fileName;
  }
}
