/// <summary>
/// The base class of all exceptions
/// </summary>

import {isNullOrUndefined} from "util";

export class Exception{

  name: string = "Exception";
  message: string = "";
  stack: string = "";


  errorLevel = 1;
  /// <summary>
  /// constructor
  /// </summary>
  /// <param name="message"  denotes the message of exception></param>
  /// <param name="name"  denotes the type of exception></param>
  constructor(message?: string)
  constructor(error: Error)
  constructor(messageOrError: string | Error) {
    if (!isNullOrUndefined(messageOrError)) {
      if (messageOrError instanceof Error) {
        this.stack = (<Error>messageOrError).stack;
        this.message = (<Error>messageOrError).message;
      }
      else {
        this.message = <string>messageOrError;
        this.stack = new Error().stack;
      }
    }
  }

  /// <summary>
  /// get the message of exception
  /// </summary>
  get Message() {
    return this.message;
  }

  /// <summary>
  /// get the stack trace of exception
  /// </summary>
  get StackTrace() {

    let stackTrace = this.stack || '';
    let stackLines = stackTrace.split("\n").map(function (line) { return line.trim(); });

    // On some browsers (e.g. Chrome), the statck includes a title as "Error", so remove it.
    stackTrace = stackLines.splice(stackLines[0] === 'Error' ? this.errorLevel + 1 : this.errorLevel).join("\n");

    return "\n" + stackTrace;
  }

  /// <summary>
  /// get the type of exception
  /// </summary>
  public GetType(): string {
    return this.name;
  }
}


