import {Logger_LogLevels, Logger_MessageDirection} from "./enums";
import {DateTime, Debug, Exception, NString, StackTrace, StringBuilder, Thread} from "@magic/mscorelib";
import {OSEnvironment} from "./PlatformUtils";
import {DateTimeUtils} from "./DateTimeUtils";
import {XMLConstants} from "./XMLConstants";
import * as JSStackTrace from 'stacktrace-js';
import {isNullOrUndefined} from "util";
import JSStackFrame = JSStackTrace.StackFrame;

export enum LogType {
  info = 1,
  warning,
  error
}


/// <summary>
/// Logger class will take care of client side logging . It will check for various log levels and accordingly will write messages in log file.
/// </summary>
//@dynamic
export class Logger {
  static instance: Logger = null;
  LogLevel: Logger_LogLevels = 0; // InternalLogLevel

  /// <summary>
  /// While writing the error messages in the file play the beep.
  /// </summary>
  ShouldBeep: boolean = false;

  static set Instance(value: Logger) {
    Logger.instance = value;
  }

  static get Instance(): Logger {
    if (Logger.instance === null) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

/// <summary>
  /// Initialize logger
  /// </summary>
  /// <param name="logLevel"></param>
  /// <param name="internalLogSync"></param>
  Initialize(logLevel: Logger_LogLevels, internalLogSync: string, shouldBeep: boolean): void {
    try {
      // let logSync: LogSyncMode  = LogSyncMode.Session;
      this.LogLevel = logLevel;
      this.ShouldBeep = shouldBeep;

      // TODO: implement
//   String strLogSync = internalLogSync;
//   if (!string.IsNullOrEmpty(strLogSync))
// {
//   if (strLogSync.StartsWith("M", StringComparison.CurrentCultureIgnoreCase))
//   logSync = LogSyncMode.Message;
//   else if (strLogSync.StartsWith("F", StringComparison.CurrentCultureIgnoreCase))
//   logSync = LogSyncMode.Flush;
// }
//
    }
    catch (e) {
      this.WriteDevToLog("ClientManager.init(): " + e.Message);
    }
  }

  /// <summary></summary>
  /// <param name="logLevel"></param>
  /// <returns></returns>

  ShouldLog(logLevel: Logger_LogLevels): boolean;
  ShouldLog(): boolean;
  ShouldLog(logLevel?: Logger_LogLevels): boolean {
    if (arguments.length === 1)
      return this.ShouldLog_0(logLevel);
    else
      return this.ShouldLog_1();
  }

  private ShouldLog_0(logLevel: Logger_LogLevels): boolean {
    return this.LogLevel === logLevel;
  }

  private ShouldLog_1(): boolean {
    return this.LogLevel > Logger_LogLevels.None;
  }

  ShouldLogServerRelatedMessages(): boolean {
    return (this.ShouldLogExtendedServerRelatedMessages() || Logger.Instance.ShouldLog(Logger_LogLevels.Server)) && this.LogLevel !== Logger_LogLevels.Basic;
  }

  ShouldLogExtendedServerRelatedMessages(): boolean {
    return (Logger.Instance.ShouldLog(Logger_LogLevels.ServerMessages) || Logger.Instance.ShouldLog(Logger_LogLevels.Support) || Logger.Instance.ShouldLog(Logger_LogLevels.Development)) && this.LogLevel !== Logger_LogLevels.Basic;
  }

  /// <summary></summary>
  /// <param name="msg"></param>
  /// <param name="openIfNecessary">open the log file if not opened yet</param>

  WriteToLog(msg: string, openIfNecessary: boolean, logType: LogType = LogType.info): void {

    if (this.LogLevel > Logger_LogLevels.None || openIfNecessary) {
      msg = NString.Format("{0} {1}", (this.LogLevel === Logger_LogLevels.Basic) ? new Date().toISOString() : DateTimeUtils.ToString(DateTime.Now, XMLConstants.ERROR_LOG_TIME_FORMAT),
                           msg);

      switch (logType) {
        case LogType.error:
          console.error(msg);
          break;
        case LogType.warning:
          console.warn(msg);
          break;
        default:
          console.log(msg);
      }
    }
  }

  /// <summary>
  /// write a server access to the log
  /// </summary>
  /// <param name="msg">the message to write to the log</param>
  WriteServerToLog(msg: string): void {
    if (this.ShouldLogServerRelatedMessages()) {
      this.WriteToLog(NString.Format("Server, Thread={0}: ", Thread.CurrentThread.ManagedThreadId) + msg, false, LogType.info);
    }
  }

  /// <summary>
  /// write a server access to the log, including the content
  /// </summary>
  /// <param name="msg">the message to write to the log</param>
  WriteServerMessagesToLog(msg: string): void {
    if (this.ShouldLogExtendedServerRelatedMessages()) {
      this.WriteToLog(NString.Format("Server#, Thread={0}: ", Thread.CurrentThread.ManagedThreadId) + msg, false, LogType.info);
    }
  }

  /// <summary>Write a QC message to the log</summary>
  /// <param name="msg">the message to write to the log</param>
  WriteSupportToLog(msg: string, skipLine: boolean): void {

    if (this.LogLevel >= Logger_LogLevels.Support && this.LogLevel !== Logger_LogLevels.Basic) {
      if (skipLine) {
        this.WriteToLog("SUPPORT: " + msg, false, LogType.info);
      }
      else {
        this.WriteToLog("SUPPORT: " + msg + OSEnvironment.EolSeq + "-----------------------------------------------------------------------------------------------------------", false, LogType.info);
      }
    }
  }

  /// <summary>
  /// write a performance message to the log
  /// </summary>
  /// <param name="msg">the message to write to the log</param>
  WriteGuiToLog(msg: string): void {

    if (this.LogLevel >= Logger_LogLevels.Gui && this.LogLevel !== Logger_LogLevels.Basic) {
      this.WriteToLog(msg, false, LogType.info);
    }
  }

  /// <summary>
  /// write a developer message to the log
  /// </summary>
  /// <param name="msg">the message to write to the log</param>
  WriteDevToLog(msg: string): void {
    if (this.LogLevel >= Logger_LogLevels.Development && this.LogLevel !== Logger_LogLevels.Basic) {
      this.WriteToLog("DEV: " + msg, false, LogType.info);
    }
  }

  /// <summary>
  /// Writes a basic level entry to log
  /// </summary>
  /// <param name="messageDirection">message direction relative to the current module (RIA client). Can be either MessageEntering or MessageLeaving</param>
  /// <param name="statusCode">HTTP status code</param>
  /// <param name="contentLength">length of the http message</param>
  /// <param name="httpHeaders">HTTP headers</param>
  WriteBasicToLog(messageDirection: Logger_MessageDirection, contextID: string, sessionCounter: number, clientID: string, serverID: string, responseTime: number, statusCode: string, httpHeaders: string, contentLength: number): void {
    if (this.LogLevel === Logger_LogLevels.Basic) {
      let text: string = httpHeaders;
      text = text.trim();
      text = NString.Replace(text, "\r\n", "|");
      let arg_E4_0: string = "RIA,{0}_{1},{2},{3},{4},{5},-,{6},{7},{8},{9},{10},{11}";
      let expr_3E: any[] = new Array<any>(12);

      // TODO : need to check How to handle Process class.
      // expr_3E[0] = Process.GetCurrentProcess().Id;
      expr_3E[1] = Thread.CurrentThread.ManagedThreadId;
      expr_3E[2] = new Date().toISOString();
      expr_3E[3] = ((messageDirection === Logger_MessageDirection.MessageLeaving) ? "MSGL" : "MSGE");
      expr_3E[4] = contextID;
      expr_3E[5] = sessionCounter;
      expr_3E[6] = clientID;
      expr_3E[7] = serverID;
      expr_3E[8] = ((responseTime !== 0) ? responseTime.toString() : "-");
      let arg_D3_1: number = 9;
      let arg_D3_2: any;
      arg_D3_2 = statusCode;
      expr_3E[arg_D3_1] = arg_D3_2;
      expr_3E[10] = text;
      expr_3E[11] = contentLength;
      let value: string = NString.Format(arg_E4_0, expr_3E);
      console.log(value);
    }
  }

  /// <summary>
  /// Writes a request exception basic level entry to log
  /// </summary>
  /// <param name="contextID"></param>
  /// <param name="sessionCounter"></param>
  /// <param name="clientID"></param>
  /// <param name="serverID"></param>
  /// <param name="ex">the logged exception</param>
  WriteBasicErrorToLog(contextID: string, sessionCounter: number, clientID: string, serverID: string, ex: Exception): void {
    Debug.Assert(this.LogLevel === Logger_LogLevels.Basic);

    // TODO : Need to check how to handle Process
    // let value: string = NString.Format("RIA,{0}_{1},{2},{3},{4},{5},-,{6},{7},-,-,-,{8} {9}", [
    // Process.GetCurrentProcess().Id, Thread.CurrentThread.ManagedThreadId, DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffffffZ"), "RES", contextID, sessionCounter, clientID, serverID, ex.GetType(), ex.Message
    // ]);
    // NConsole.WriteLine(value);
  }

  /// <summary>
  /// Write an error to the log
  /// </summary>
  /// <param name="msg">the message to write to the log</param>
  WriteErrorToLog(msg: string): void {
    this.WriteToLog("ERROR: " + msg, true, LogType.error);
  }

  /// <summary>
  /// Write an internal error to the log. Also prints stack trace along with the message
  /// </summary>
  /// <param name="msg">the message to write to the log</param>
  WriteExceptionToLog(ex: Exception): void;
  WriteExceptionToLog(ex: Error): void;
  WriteExceptionToLog(ex: Exception, msg: string): void;
  WriteExceptionToLog(msgOrEx: any, msg?: string): void {
    if (msgOrEx instanceof Error) {
      this.WriteExceptionToLog_2(msgOrEx, msg);
      return;
    }
    if (arguments.length === 1 && (msgOrEx !== null || msgOrEx instanceof Exception)) {
      this.WriteExceptionToLog_1(msgOrEx);
      return;
    }

    this.WriteExceptionToLog_3(msgOrEx, msg);
  }

  WriteExceptionToLogWithMsg(msg: string): void {
    this.WriteToLog("ERROR: " + msg, true, LogType.error);
  }

  private WriteExceptionToLog_1(ex: Exception): void {
    this.WriteExceptionToLogWithMsg(NString.Format("{0} : {1}{2}{3}{4}", [
      ex.GetType(), OSEnvironment.EolSeq, ex.StackTrace, OSEnvironment.EolSeq, ex.Message
    ]));
  }

  private WriteExceptionToLog_2(ex: Error, message: string): void {
    if (isNullOrUndefined(message))
      this.WriteExceptionToLogWithMsg(NString.Format("{0}{1}{2}", [ex.stack, OSEnvironment.EolSeq, ex.message]));
    else
      this.WriteExceptionToLogWithMsg(NString.Format("{0}{1}{2}{4}{5}", [message, OSEnvironment.EolSeq, ex.stack, OSEnvironment.EolSeq, ex.message]));
  }

  private WriteExceptionToLog_3(ex: Exception, msg: string): void {
    this.WriteExceptionToLogWithMsg(NString.Format("{0}, {1} : {2}{3}{4}{5}", [
      ex.GetType(), msg, OSEnvironment.EolSeq, ex.StackTrace, OSEnvironment.EolSeq, ex.Message
    ]));
  }

  /// <summary> write a warning to the log</summary>
  /// <param name="msg">the message to write to the log</param>
  WriteWarningToLog(ex: Exception): void;
  WriteWarningToLog(ex: Exception, msg: string): void;
  WriteWarningToLog(ex: Error): void;
  WriteWarningToLog(msgOrEx: any, msg?: string): void {
    if (arguments.length === 1 && (msgOrEx !== null || msgOrEx instanceof Exception)) {
      this.WriteWarningToLog_1(msgOrEx);
      return;
    }
    if (arguments.length === 1 && (msgOrEx !== null || msgOrEx instanceof Error)) {
      this.WriteWarningToLog_2(msgOrEx);
    }
    this.WriteWarningToLog_3(msgOrEx, msg);
  }

  WriteWarningToLogWithMsg(msg: string): void {

    if (this.LogLevel !== Logger_LogLevels.Basic) {
      this.WriteToLog("WARNING: " + msg, true, LogType.warning);
    }
  }

  private WriteWarningToLog_1(ex: Exception): void {
    this.WriteWarningToLogWithMsg(ex.GetType() + " : " + OSEnvironment.EolSeq + ex.StackTrace + OSEnvironment.EolSeq + ex.Message);
  }

  private WriteWarningToLog_2(ex: Error): void {
    this.WriteWarningToLogWithMsg(NString.Format("{0}{1}{2}", [
      ex.stack, OSEnvironment.EolSeq, ex.message
    ]));
  }

  private WriteWarningToLog_3(ex: Exception, msg: string): void {
    this.WriteWarningToLogWithMsg(NString.Format("{0}, {1} : {2}{3}{4}{5}", [
      ex.GetType(), msg, OSEnvironment.EolSeq, ex.StackTrace, OSEnvironment.EolSeq, ex.Message
    ]));
  }

  WriteStackTrace(stackTrace: StackTrace, framesToPrint: number, traceTitle: string): void {

    if (traceTitle === null) {
      traceTitle = "Stack trace:";
    }
    let stringBuilder: StringBuilder = new StringBuilder(traceTitle + OSEnvironment.EolSeq);
    let frames: JSStackFrame[] = stackTrace.GetFrames();
    let array: JSStackFrame[] = frames;
    for (let i: number = 0; i < array.length; i = i + 1) {
      let stackFrame: JSStackFrame = array[i];
      framesToPrint = framesToPrint - 1;

      stringBuilder.Append(stackFrame.toString());

      if (framesToPrint === 0) {
        stringBuilder.Append("\t... more stack frames ...\n");
        break;
      }
    }
    this.WriteToLog(stringBuilder.ToString(), true);
  }

  /// <summary>
  /// Flush the log writer.
  /// </summary>
  Flush(): void {

  }

  constructor() {
  }
}
