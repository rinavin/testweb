import {
  Base64,
  JSON_Utils,
  Logger,
  Logger_LogLevels,
  Misc,
  MsgInterface,
  OSEnvironment,
  XMLConstants
} from "@magic/utils";
import {Debug, Encoding, NString, RefParam, StringBuilder, Exception} from "@magic/mscorelib";
import {AuthenticationDialogHandler, Commands, Styles, UsernamePasswordCredentials} from "@magic/gui";
import {
  CommandsProcessorBase,
  CommandsProcessorBase_SendingInstruction,
  CommandsProcessorBase_SessionStage
} from "../CommandsProcessorBase";
import {ClientManager} from "../ClientManager";
import {HttpManager} from "../http/HttpManager";
import {ConstInterface} from "../ConstInterface";
import {Scrambler} from "../util/Scrambler";
import {ServerError} from "./ServerError";
import {IResultValue} from "../rt/IResultValue";
import {FlowMonitorQueue} from "../util/FlowMonitorQueue";
import {MGDataCollection} from "../tasks/MGDataCollection";
import {OpeningTaskDetails, Task} from "../tasks/Task";
import {isNullOrUndefined, isUndefined} from "util";
import {HttpUtility} from "../http/client/HttpUtility";
import {HttpClientEvents} from "../http/client/HttpClientEvents";


export class RemoteCommandsProcessor extends CommandsProcessorBase {
  static readonly RC_NO_CONTEXT_ID: string = '-1';
  private static _instance: RemoteCommandsProcessor = null;

  // *****************************************************************************************************
  // *****************************************************************************************************
  // ******** When changing RIA_COMMUNICATION_PROTOCOL_VERSION, please change on mobile platforms as well:
  // ******** Android: RemoteCommandsProcessor.java
  // ******** iOS: RemoteCommandsProcessor.h
  // ******** W10M: RemoteCommandsProcessor.cs
  private static readonly RIA_COMMUNICATION_PROTOCOL_VERSION: string = "14000";
  // *****************************************************************************************************
  // *****************************************************************************************************

  // TODO: Check if we need _logAccumulator.
  // private _logAccumulator: ClientLogAccumulator = null;

  private _lastRequestTime: number = 0; // the time of the last request to the server

  ServerUrl: string = null;

  static GetInstance(): RemoteCommandsProcessor {
    if (RemoteCommandsProcessor._instance === null) {
      RemoteCommandsProcessor._instance = new RemoteCommandsProcessor();
    }

    return RemoteCommandsProcessor._instance;
  }

  private constructor() {
    super();
    this.ServerUrl = null;
    let serverURL: URL = ClientManager.Instance.getServerURL();

    if (serverURL.host.length > 0) {
      let httpReq: string = ClientManager.Instance.getHttpReq();

      if (httpReq !== null && httpReq.toLowerCase().startsWith("http"))
        this.ServerUrl = httpReq;
      else
        this.ServerUrl = serverURL.href;
    }

    HttpManager.GetInstance();

    this.RegisterDelegates();
  }

  /// <summary>
  /// Checks that session counter is consecutive during the session and sets new value.
  /// The only exception is in case the client sent to the server ConstInterface.SESSION_COUNTER_CLOSE_CTX_INDICATION,
  ///    the server is expected to return ConstInterface.SESSION_COUNTER_CLOSE_CTX_INDICATION in response (RequestsServerBase::ProcessRequest), to acknowledge the request to close the context.
  /// </summary>
  /// <param name="newSessionCounter">!!.</param>
  CheckAndSetSessionCounter(newSessionCounter: number): void {
    if (newSessionCounter === ConstInterface.SESSION_COUNTER_CLOSE_CTX_INDICATION) {
      Debug.Assert(this.GetSessionCounter() === ConstInterface.SESSION_COUNTER_CLOSE_CTX_INDICATION);
    }
    else {
      Debug.Assert(newSessionCounter === this.GetSessionCounter() + 1);
      this.SetSessionCounter(newSessionCounter);
      Logger.Instance.WriteServerToLog(NString.Format("Session Counter --> {0}", this._sessionCounter));
    }
  }

  /// <summary>
  /// </summary>
  /// <param name="newSessionCounter"></param>
  private SetSessionCounter(newSessionCounter: number): void {
    this._sessionCounter = newSessionCounter;
  }

  /// <summary>Prepare and execute the 1st & 2nd handshake requests:
  /// 1st request:  UTF8TRANS=..&appname=..&prgname=..&arguments=-A<Richclient><RequestingVersionDetails=".."/></Richclient>
  ///     response: instructions to the client - whether to display authentication dialog, the server's version, and more ..
  ///               e.g. <Richclientresponse><ContextID>120308789726371200</ContextID><Environment InputPassword="N" SystemLogin="N" ScrambleMessages="N" MaxInternalLogLevel="Server#" HttpTimeout="10" ClientNetworkRecoveryInterval="0" ForwardSlash="web"/></Richclientresponse>
  /// 2nd request: authentication (optional, depending on the 1st request).
  /// </summary>
  /// <returns>true only if the client should continue to start the actual program (i.e. after handshake).</returns>
  StartSession(): boolean {
    let authenticationCancelled: boolean = false;
    let handshakeResponse: HandshakeResponse = null;
    let dialog: AuthenticationDialogHandler = null;

    try {
      let lastTypedUserId: string = null;

      // ----------------------------------------------------------------------
      // 1st handshake request: prepare 1st handshake request and scramble it
      // ----------------------------------------------------------------------
      let handshakeInitialTokens: StringBuilder = new StringBuilder();
      handshakeInitialTokens.Append(ConstInterface.UTF8TRANS +
        ConstInterface.REQ_APP_NAME + "=" +
        HttpUtility.UrlEncode(ClientManager.Instance.getAppName(), Encoding.UTF8) + "&" +
        ConstInterface.REQ_PRG_NAME + "=" +
        HttpUtility.UrlEncode(ClientManager.Instance.getPrgName(), Encoding.UTF8));

      if (ClientManager.Instance.getLocalID() !== null) {
        handshakeInitialTokens.Append("|" + ClientManager.Instance.getLocalID());
        if (ClientManager.Instance.getDebugClient() !== null) {
          handshakeInitialTokens.Append("&" + ClientManager.Instance.getDebugClient());
        }
      }

      handshakeInitialTokens.Append("&" + ConstInterface.REQ_ARGS + "=" + ConstInterface.REQ_ARG_ALPHA +
        "<Richclient><Requires EncryptionKey=\"False\"/><RIAProtocolVersion=\"" + RemoteCommandsProcessor.RIA_COMMUNICATION_PROTOCOL_VERSION + "\"/></Richclient>");

      Logger.Instance.WriteDevToLog(NString.Format("Handshake request #1 (not scrambled) : {0}",
        this.ServerUrl + ConstInterface.REQ_ARG_START +
        ConstInterface.RC_INDICATION_INITIAL + handshakeInitialTokens));

      let handshakeInitialUrl: string = this.ServerUrl + ConstInterface.REQ_ARG_START +
        ConstInterface.RC_INDICATION_INITIAL +
        ConstInterface.RC_TOKEN_DATA +
        HttpUtility.UrlEncode(Scrambler.Scramble(handshakeInitialTokens.ToString()), Encoding.UTF8);

      Logger.Instance.WriteServerMessagesToLog("");
      Logger.Instance.WriteServerMessagesToLog(NString.Format("Handshake request #1: {0}", handshakeInitialUrl));

      // Initialize temp ctxGroup with CtxGroup from execution.properties
      let ctxGroup: string = ClientManager.Instance.getCtxGroup();

      while (!authenticationCancelled) {
        // execute the 1st request
        let responseStr: string = this.DispatchRequest(handshakeInitialUrl, null, CommandsProcessorBase_SessionStage.HANDSHAKE);

        // process the 1st response - check if the response is error, unscramble and parse it
        if (NString.IsNullOrEmpty(responseStr)) {
          throw new ServerError("Client failed to initialize a session." + OSEnvironment.EolSeq +
            "Empty response was received from the web server." + OSEnvironment.EolSeq + OSEnvironment.EolSeq + this.ServerUrl);
        }

        Logger.Instance.WriteServerMessagesToLog(NString.Format("Handshake response #1: {0}", responseStr));
        Logger.Instance.WriteServerMessagesToLog("");

        handshakeResponse = new HandshakeResponse(responseStr);

        ClientManager.Instance.RuntimeCtx.ContextID = handshakeResponse.ContextId;
        HttpManager.GetInstance().HttpCommunicationTimeoutMS = handshakeResponse.HttpTimeout * 1000;

        // During authentication, if authentication failed then server unloads ctx and creates new ctx for next authentication request.
        // So every time after authentication fails we receive new ctxid for next authentication request.
        // Hence take ctxgroup in local variable and update ClientManager only after authentication is done.
        if (NString.IsNullOrEmpty(ClientManager.Instance.getCtxGroup())) {
          ctxGroup = handshakeResponse.ContextId;
        }

        // -----------------------
        // 2nd handshake request
        // -----------------------
        let credentials: UsernamePasswordCredentials = null;
        if (ClientManager.Instance.getSkipAuthenticationDialog()) {
          // skip authentication (to the runtime-engine) dialog
          if (ClientManager.Instance.getUsername() !== null) {
            // user the userId & password that were passed, and reset them (they'll be set below, if authenticated by the runtime-engine)
            credentials = new UsernamePasswordCredentials(ClientManager.Instance.getUsername(), ClientManager.Instance.getPassword());
            ClientManager.Instance.setUsername("");
            ClientManager.Instance.setPassword("");
          }
        }
        else if (handshakeResponse.InputPassword && handshakeResponse.SystemLogin !== HandshakeResponse.SYSTEM_LOGIN_AD) {
          // authentication (to the runtime-engine) dialog
          if (lastTypedUserId !== null) {
            let title: string = ClientManager.Instance.getMessageString(MsgInterface.BRKTAB_STR_ERROR);
            let error: string = ClientManager.Instance.getMessageString(MsgInterface.USRINP_STR_BADPASSW);
            Commands.messageBox(null, title, error, Styles.MSGBOX_ICON_ERROR | Styles.MSGBOX_BUTTON_OK);
          }

          // TODO: implement authentication dialog
          // let userId: string = lastTypedUserId;
          //
          // if (dialog === null) {
          //   dialog = new AuthenticationDialogHandler(userId, GetLogonDialogExecProps());
          // }
          // dialog.openDialog();

          // credentials = dialog.getCredentials();
          // if (credentials !== null)
          //   lastTypedUserId = credentials.Username;
          // else
          //   authenticationCancelled = true;
        }

        // ConstInterface.SESSION_COUNTER_CLOSE_CTX_INDICATION instructs the server to close the context.
        // (note: unloading a context post handshake should be done using Command.createUnloadCommand).
        if (authenticationCancelled) {
          this.SetSessionCounter(ConstInterface.SESSION_COUNTER_CLOSE_CTX_INDICATION);
        }

        let handshakeAuthUrl: string = this.PrepareAuthenticationUrl(handshakeResponse.ContextId, ctxGroup, this.GetSessionCounter());

        try {
          if (credentials !== null) {
            let credentialsStr: string = credentials.Username + ":";
            if (!NString.IsNullOrEmpty(credentials.Password)) {
              credentialsStr = credentialsStr + credentials.Password + ":";
            }
            credentialsStr += handshakeResponse.ContextId;
            credentialsStr = Scrambler.Scramble(credentialsStr);
            credentialsStr = Base64.encode(credentialsStr, true, Encoding.UTF8);
            handshakeAuthUrl += ("&USERNAME=" + HttpUtility.UrlEncode(credentialsStr, Encoding.UTF8));

            // send 2nd handshake request - with authentication
            Logger.Instance.WriteServerMessagesToLog(NString.Format("Handshake request #2: {0}", handshakeAuthUrl));
            responseStr = this.DispatchRequest(handshakeAuthUrl, null, CommandsProcessorBase_SessionStage.HANDSHAKE);

            // verify that the response wasn't replayed
            if (responseStr.indexOf(handshakeResponse.ContextId) === -1) {
              throw new ServerError(ClientManager.Instance.getMessageString(MsgInterface.USRINP_STR_BADPASSW));
            }

            ClientManager.Instance.setUsername(credentials.Username);
            ClientManager.Instance.setPassword(credentials.Password);
          }
          else {
            // send 2nd handshake request - without authentication
            Logger.Instance.WriteServerMessagesToLog(NString.Format("Handshake request #2: {0}", handshakeAuthUrl));
            responseStr = this.DispatchRequest(handshakeAuthUrl, null, CommandsProcessorBase_SessionStage.HANDSHAKE);
          }
          Logger.Instance.WriteServerMessagesToLog(NString.Format("Handshake response #2: {0}", responseStr));
          Logger.Instance.WriteServerMessagesToLog("");
          break;
        }
        catch (ex) {
          if (ex instanceof ServerError) {
            let serverError: ServerError = <ServerError>ex;
            if (ClientManager.Instance.getSkipAuthenticationDialog()) {
              switch (serverError.GetCode())
              {
                case ServerError.ERR_ACCESS_DENIED:
                // External Authenticator authenticated the user, access to the application wasn't authorized.
                case ServerError.ERR_AUTHENTICATION:
                  // External Authenticator authenticated the user but application authentication failed
                  ClientManager.Instance.setSkipAuthenticationDialog(false);
                  throw serverError;
              }
            }

            // the session will never provide a way to change the credentials, therefore abort
            if (!handshakeResponse.InputPassword)
              throw serverError;

            // Error.INF_NO_RESULT:
            //    if authentication dialog was canceled, the request was sent only to close the context,
            //    and the server isn't expected to return a response
            if (serverError.GetCode() !== ServerError.ERR_AUTHENTICATION &&
                (!authenticationCancelled || serverError.GetCode() !== ServerError.INF_NO_RESULT)) {
              throw serverError;
            }
          }
          else
            throw ex;
        }
      }

      // store an indication to skip future authentication (session restart, parallel program)
      ClientManager.Instance.setSkipAuthenticationDialog(true);

      // save context group
      ClientManager.Instance.setCtxGroup(ctxGroup);

      if (dialog !== null)
        dialog.closeDialog();

      // ------------------------
      // set session properties
      // ------------------------
      ClientManager.Instance.ShouldScrambleAndUnscrambleMessages = handshakeResponse.ScrambleMessages;
      if (Logger.Instance.LogLevel !== Logger_LogLevels.Basic) {
        // maximal value of the InternalLogLevel that can be set by the client.
        // if set, it controls the maximal value; otherwise, any log level is allowed.
        let maxInternalLogLevel: string = handshakeResponse.MaxInternalLogLevel;
        if (maxInternalLogLevel !== null) {
          let maxLogLevel: Logger_LogLevels = ClientManager.Instance.parseLogLevel(maxInternalLogLevel);
          if (maxLogLevel < Logger.Instance.LogLevel) {
            // textual value (as loaded from the execution properties)
            ClientManager.Instance.setInternalLogLevel(maxInternalLogLevel);

            // set the actual log level to the level allowed by the server
            Logger.Instance.WriteToLog(NString.Format("Internal log level was restricted to '{0}' by the Magic xpa server.", maxInternalLogLevel), false);
            Logger.Instance.LogLevel = maxLogLevel;
          }
        }
      }

      // ----------------------------------------------------------------------
      // 3rd request: Executes the initial program in the server.
      // ----------------------------------------------------------------------
      if (!authenticationCancelled) {
        this.ExecuteInitialRequest();
      }
    }
    catch (ex) {
      if (ex instanceof ServerError)
        throw ex;

      if (isNullOrUndefined(ex.InnerException))
        throw  new ServerError(ex.message, new Exception(ex));
      else
        throw new ServerError(ex.message, ex.InnerException);
    }

    return !authenticationCancelled;
  }

  /// <summary>
  /// prepares handshake request url for authentication
  /// </summary>
  /// <param name="contextId"></param>
  /// <param name="ctxGroup"></param>
  /// <param name="sessionCount"></param>
  /// <returns></returns>
  private PrepareAuthenticationUrl(contextId: string, ctxGroup: string, sessionCount: number): string {
    return this.ServerUrl + ConstInterface.REQ_ARG_START +
        ConstInterface.RC_INDICATION + ConstInterface.UTF8TRANS +
        ConstInterface.RC_TOKEN_CTX_ID + contextId +
        ConstInterface.REQ_ARG_SEPARATOR +
        ConstInterface.RC_TOKEN_SESSION_COUNT + sessionCount +
        ConstInterface.REQ_ARG_SEPARATOR +
        ConstInterface.RC_TOKEN_CTX_GROUP + ctxGroup +
        ConstInterface.REQ_ARG_SEPARATOR +
        ConstInterface.RC_AUTHENTICATION_REQUEST;
  }

  /// <summary>
  /// Executes the initial program in the server:
  /// </summary>
  private ExecuteInitialRequest(): void {
    // send the INITIAL request to the server.
    this.Execute_1(CommandsProcessorBase_SendingInstruction.TASKS_AND_COMMANDS, CommandsProcessorBase_SessionStage.INITIAL, null);
  }

  // private static GetLogonDialogExecProps(): Dictionary<string, string> {
  //   let dictionary: Dictionary<string, string> = new Dictionary<string, string>();
  //   let value: string = ClientManager.Instance.getLogonWindowTitle();
  //   let flag: boolean = NString.IsNullOrEmpty(value);
  //   if (flag) {
  //     value = "Logon - " + ClientManager.Instance.getAppName();
  //   }
  //   dictionary.Add("LogonWindowTitle", value);
  //   let text: string = ClientManager.Instance.getLogonGroupTitle();
  //   let flag2: boolean = !NString.IsNullOrEmpty(text);
  //   if (flag2) {
  //     text = ((text.length > 62) ? NString.Substring(text, 0, 62) : text);
  //   }
  //   else {
  //     text = "Logon Parameters";
  //   }
  //   dictionary.Add("LogonGroupTitle", text);
  //   let text2: string = ClientManager.Instance.getLogonMsgCaption();
  //   let flag3: boolean = !NString.IsNullOrEmpty(text2);
  //   if (flag3) {
  //     text2 = ((text2.length > 56) ? NString.Substring(text2, 0, 56) : text2);
  //     dictionary.Add("LogonMessageCaption", text2);
  //   }
  //   let logonWindowIconURL: Uri = ClientManager.Instance.getLogonWindowIconURL();
  //   let flag4: boolean = Uri.op_Inequality(logonWindowIconURL, null) && !NString.IsNullOrEmpty(logonWindowIconURL.ToString());
  //   if (flag4) {
  //     dictionary.Add("LogonWindowIconURL", logonWindowIconURL.ToString());
  //   }
  //   let logonWindowImageURL: Uri = ClientManager.Instance.getLogonWindowImageURL();
  //   let flag5: boolean = Uri.op_Inequality(logonWindowImageURL, null) && !NString.IsNullOrEmpty(logonWindowImageURL.ToString());
  //   if (flag5) {
  //     dictionary.Add("LogonImageURL", logonWindowImageURL.ToString());
  //   }
  //   let text3: string = ClientManager.Instance.getLogonUserIdCaption();
  //   let flag6: boolean = !NString.IsNullOrEmpty(text3);
  //   if (flag6) {
  //     text3 = ((text3.length > 9) ? NString.Substring(text3, 0, 9) : text3);
  //     dictionary.Add("LogonUserIDCaption", text3);
  //   }
  //   let text4: string = ClientManager.Instance.getLogonPasswordCaption();
  //   let flag7: boolean = !NString.IsNullOrEmpty(text4);
  //   if (flag7) {
  //     text4 = ((text4.length > 9) ? NString.Substring(text4, 0, 9) : text4);
  //     dictionary.Add("LogonPasswordCaption", text4);
  //   }
  //   let logonOKCaption: string = ClientManager.Instance.getLogonOKCaption();
  //   let flag8: boolean = !NString.IsNullOrEmpty(logonOKCaption);
  //   if (flag8) {
  //     dictionary.Add("LogonOKCaption", logonOKCaption);
  //   }
  //   let logonCancelCaption: string = ClientManager.Instance.getLogonCancelCaption();
  //   let flag9: boolean = !NString.IsNullOrEmpty(logonCancelCaption);
  //   if (flag9) {
  //     dictionary.Add("LogonCancelCaption", logonCancelCaption);
  //   }
  //   return dictionary;
  // }

  Execute_1(sendingInstruction: CommandsProcessorBase_SendingInstruction, sessionStage: CommandsProcessorBase_SessionStage, res: IResultValue): void {
    let reqBuf: string;
    let isInitialCall: boolean = sessionStage === CommandsProcessorBase_SessionStage.INITIAL;

    if (sendingInstruction === CommandsProcessorBase_SendingInstruction.NO_TASKS_OR_COMMANDS)
      reqBuf = null;
    else {
      reqBuf = ClientManager.Instance.PrepareRequest(sendingInstruction === CommandsProcessorBase_SendingInstruction.TASKS_AND_COMMANDS);

      if (!isInitialCall) {
        let changes: StringBuilder = new StringBuilder();
        let buffer: StringBuilder = new StringBuilder(reqBuf);

        // send activity monitor logs to the server
        // if (this._logAccumulator !== null && !this._logAccumulator.Empty())
        //   buffer.Append(this._logAccumulator.Read());

        // synchronize client-side SetParams and INIPut data to the server
        changes.Append(ClientManager.Instance.getGlobalParamsTable().mirrorToXML());
        changes.Append(ClientManager.Instance.getEnvParamsTable().mirrorToXML());

        // If there is stuff to synchronize, wrap it, scramble it and add the MGDATA flag
        if (changes.Length > 0) {
          changes.Insert(0, "<" + ConstInterface.MG_TAG_ENV_CHANGES + ">");
          changes.Append("</" + ConstInterface.MG_TAG_ENV_CHANGES + ">");

          if (ClientManager.Instance.ShouldScrambleAndUnscrambleMessages) {
            let scrambledChanges: string = Scrambler.Scramble(changes.ToString());
            changes = new StringBuilder(scrambledChanges);
          }
          changes.Insert(0, XMLConstants.MG_TAG_OPEN);
          changes.Append(XMLConstants.MG_TAG_XML_END_TAGGED);

          buffer.Append(changes.ToString());
        }

        reqBuf = buffer.ToString();
      }
    }

    let respBuf: string = this.DispatchRequest(this.ServerUrl, reqBuf, sessionStage);
    if (respBuf == null)
      return;

    FlowMonitorQueue.Instance.enable(false);
    ClientManager.Instance.ProcessResponse(respBuf, MGDataCollection.Instance.currMgdID, new OpeningTaskDetails(), res);

    // if (isInitialCall) {
    //   // If it was initial call, we will send all pending logs (Failed earlier execution scenario)
    //   // They will be sent here, after first request is served.
    //   if (ClientManager.Instance.getLogClientSequenceForActivityMonitor() && ClientLogAccumulator.ExistingLogsFound()) {
    //     let success: boolean = this.SendPendingLogsToServer();
    //
    //     // if we have successfully sent the pending logs delete them
    //     if (success) {
    //       RemoteCommandsProcessor.DeletePendingLogs();
    //     }
    //   }
    // }
    // else if (this._logAccumulator !== null && !this._logAccumulator.Empty()) {
    //   // Accumulated logs were sent, so reset (delete) them now
    //   this._logAccumulator.Reset();
    // }

    // refresh the displays
    if (sendingInstruction === CommandsProcessorBase_SendingInstruction.TASKS_AND_COMMANDS) {
      let mgdTab: MGDataCollection = MGDataCollection.Instance;
      mgdTab.startTasksIteration();
      let task: Task;
      while ((task = mgdTab.getNextTask()) !== null) {
        let dataViewWasRetrieved: boolean = task.DataViewWasRetrieved;
        if (dataViewWasRetrieved) {
          task.RefreshDisplay();
        }
      }
    }

    if (isInitialCall)
      ClientManager.Instance.setGlobalParams(null);
  }

  /// <summary>send 'reqBuf' to 'url'; receive a response.
  /// For Normal/InitialCall requests, the url points to the web-requester.
  /// The other parameters and data goes as the encoded body.
  /// This means that it is a POST request.
  /// On the other hand, HandShake request is a GET request and so the parameters are
  /// sent in the URL itself. In this case, encodedBody has to be null.
  /// </summary>
  /// <param name="url">URL to be accessed.</param>
  /// <param name="reqBuf">data to be sent to the url</param>
  /// <param name="sessionStage">HANDSHAKE / INITIAL / NORMAL.</param>
  /// <returns>response</returns>
   private DispatchRequest(url: string, reqBuf: string, sessionStage: CommandsProcessorBase_SessionStage): string {
    let response: string = null;
    let encodedBody: string = null;

    if (url === null) {
      Logger.Instance.WriteExceptionToLogWithMsg("in sendMsgToSrvr() unknown server");
      return response;
    }

    if (sessionStage !== CommandsProcessorBase_SessionStage.HANDSHAKE) {
      let urlSuffix: string = this.BuildUrlSuffix(reqBuf !== null, sessionStage === CommandsProcessorBase_SessionStage.INITIAL);
      let reqBufEncoded: string = HttpUtility.UrlEncode(reqBuf, Encoding.UTF8);
      encodedBody = urlSuffix + reqBufEncoded;
    }

    if (Logger.Instance.ShouldLogExtendedServerRelatedMessages())
      Logger.Instance.WriteServerMessagesToLog(NString.Format("MESSAGE TO SERVER:\n URL: {0}\n BODY: {1}", url, encodedBody));

    response = this.ExecuteRequest(url, encodedBody);

    /* remove the unwanted data before the MGDATA tag */
    if (!response.toUpperCase().startsWith("<HTML")) {
      let startIdx: number = response.indexOf("<xml id=\"MGDATA\">");
      if (startIdx > 0)
        response = response.substr(startIdx);
    }

    Logger.Instance.WriteServerMessagesToLog("MESSAGE FROM SERVER: " + response);

    // handshake requests are always scrambled (the scrambling can be disabled starting from the 3rd request).
    if (sessionStage === CommandsProcessorBase_SessionStage.HANDSHAKE ||
        (response.length > 0 &&
        ClientManager.Instance.ShouldScrambleAndUnscrambleMessages && response !== "<xml id=\"MGDATA\">\n</xml>")) {
      if (sessionStage === CommandsProcessorBase_SessionStage.HANDSHAKE) {
        // handshake requests are always scrambled.
        Debug.Assert(response.length > 0 && response[0] !== '<');
      }
      response = CommandsProcessorBase.UnScramble(response);
    }

    Logger.Instance.WriteDevToLog("MESSAGE FROM SERVER: (size = " + response.length + ")" + OSEnvironment.EolSeq + response);

    this._lastRequestTime = Misc.getSystemMilliseconds();

    return response;
  }

  /// <summary> Checks the response string, throws an error if the response string contains
  /// an xml/html error</summary>
  /// <param name="response"></param>
  private HandleErrorResponse(response: string): void {
    try {
      // error responses are always scrambled by the web server.
      Logger.Instance.WriteServerMessagesToLog("MESSAGE FROM SERVER: " + response);
      response = CommandsProcessorBase.UnScramble(response);
      Logger.Instance.WriteServerMessagesToLog("MESSAGE FROM SERVER: " + response);
    }
    catch (ex) {
    }

    if (response.startsWith("<xmlerr")) {
      let errorMessageXml: ErrorMessageXml = new ErrorMessageXml(response, this._lastRequestTime);
      throw new ServerError(errorMessageXml.GetMessage(), errorMessageXml.GetCode());
    }
    else if (response.toUpperCase().startsWith("<HTML")) {
      throw new ServerError(response);
    }
  }

  /// <summary>send 'encodedBody' to 'url' and receive a response.
  /// </summary>
  /// <param name="url">URL to be accessed.</param>
  /// <param name="encodedBody">In case of POST, content to be sent to server. For other methods, null.</param>
  /// <returns>the response from the server</returns>
 private ExecuteRequest(url: string, encodedBody: string): string {
    return this.GetContent(url, encodedBody);
  }

  GetContent(requestedURL: string, requestContent?: any): string {
    if (isUndefined(requestContent))
      requestContent = null;

    let responseStr: string;

    try {
      // if relative, prefix with the 'protocol://server/' from which the rich-client was activated
      if (requestedURL.startsWith("/"))
        requestedURL = ClientManager.Instance.getProtocol() + "://" + ClientManager.Instance.getServer() + requestedURL;
      else if (requestedURL.startsWith("?"))
        requestedURL = ClientManager.Instance.getServerURL() + requestedURL;

      requestedURL = RemoteCommandsProcessor.ValidateURL(requestedURL, this.GetSessionCounter());

      let isError: RefParam<boolean> = new RefParam(false);
      responseStr =  HttpManager.GetInstance().GetContent(requestedURL, requestContent, isError);

      if (isError.value) {
        this.HandleErrorResponse(responseStr);
      }
    }
    catch (ex) {
      // don't write server error to log when the log level is basic
      if (!(ex instanceof ServerError) || Logger.Instance.LogLevel !== Logger_LogLevels.Basic) {
        Logger.Instance.WriteExceptionToLog(ex, NString.Format("requested URL = \"{0}\"", requestedURL));
      }

      // the exception should be thrown and the callers should handle it.
      if (!(ex instanceof ServerError)) {
        ex = new ServerError(ex.Message, ex.InnerException ? ex.InnerException : ex);
      }

      throw ex;
    }

    return responseStr;
  }

  /// <summary> When LogClientSequenceForActivityMonitor = Y we will be keeping the logs in file and send the file with next
  /// server access. If client is abnormally terminated then there can be 1 or more files containing logs since
  /// last server access.Now these logs will be sent to server, when next time RC program is executed,.</summary>
  /// <returns> If sending was successful</returns>
  //   TODO: Handle pending logs.
  // private SendPendingLogsToServer(): boolean {
  //   let success: boolean = true;
  //
  //   The pending logs cannot be read from the file system since WebClient doesn't have access to that.
  //   Maybe, the logs should be written into LocalStorage ad read from there.
  //
  //   let stringBuilder: StringBuilder = new StringBuilder(1000);
  //   let flowMonitor: FlowMonitorQueue = FlowMonitorQueue.Instance;
  //
  //   // Get iterator to names of log files.
  //   let enumerator: IEnumerator<string> = ClientLogAccumulator.ExistingLogIterator();
  //
  //   // while there are more files
  //   while (enumerator.MoveNext()) {
  //     // Take next file name
  //     let logName: string = enumerator.Current;
  //     // Prepare the header line (Client log file : <Context : XXXXXX>) and add it to
  //     // flow monitor build monitor message
  //     let headerLine: string = ClientLogAccumulator.BuildLogHeaderLine(logName);
  //     flowMonitor.addFlowVerifyInfo(headerLine);
  //     let logCtxBuf: StringBuilder = RemoteCommandsProcessor.BuildMonitorMessage();
  //
  //     let fileContents: string = HandleFiles.readToString(logName);
  //     logCtxBuf.Append(fileContents);
  //     stringBuilder.Append(logCtxBuf.ToString());
  //   }
  //
  //   let respBuf: string = null;
  //
  //   try {
  //     respBuf = this.DispatchRequest(this.ServerUrl, stringBuilder.ToString(), CommandsProcessorBase_SessionStage.NORMAL);
  //   }
  //   catch (ex) {
  //     // do nothing. if sending log fails, there is no harm.
  //   }
  //
  //   if (respBuf === null) {
  //     success = false;
  //   }
  //
  //   return success;
  // }

  // TODO: Handle pending logs.
  // private static DeletePendingLogs(): void {
  //   let enumerator: IEnumerator = ClientLogAccumulator.ExistingLogIterator();
  //   while (enumerator.MoveNext()) {
  //     let filename: string = <string>enumerator.Current;
  //     HandleFiles.deleteFile(filename);
  //   }
  // }

  /// <summary> get the suffix of the URL to be sent to the server. This includes the CTX, SESSION and DATA parameters.</summary>
  /// <param name="hasContent">if true, the HTTP DATA parameter contains something.</param>
  /// <param name="isInitialCall">if true then the generated suffix has no specific context data</param>
  /// <returns> the URL suffix (i.e. "CTX=...&SESSION=...&DATA="</returns>
  private BuildUrlSuffix(hasContent: boolean, isInitialCall: boolean): string {
    let prefix: string = ConstInterface.RC_INDICATION + ConstInterface.RC_TOKEN_CTX_ID + ClientManager.Instance.RuntimeCtx.ContextID;

    if (isInitialCall) {
      let prgArgs: string = ClientManager.Instance.getPrgArgs();
      if (prgArgs !== null) {
        prefix += (ConstInterface.REQ_ARG_SEPARATOR + ConstInterface.REQ_ARGS + "=");

        // insert -A (if missing) before each argument; for example: xxx,yyy --> -Axxx,-Ayyy
        // splits the args based on ',' ignores '\,'

        let pattern = new RegExp("(?<!\\\\),");
        let st: string[] = prgArgs.split(pattern);
        prgArgs = "";

        for (let i: number = 0; i < st.length; i++) {
          let prgArg: string = st[i];
          if (!prgArg.startsWith(ConstInterface.REQ_ARG_ALPHA) &&
            !prgArg.startsWith(ConstInterface.REQ_ARG_UNICODE) &&
            !prgArg.startsWith(ConstInterface.REQ_ARG_NUMERIC) &&
            !prgArg.startsWith(ConstInterface.REQ_ARG_DOUBLE) &&
            !prgArg.startsWith(ConstInterface.REQ_ARG_LOGICAL) &&
            !prgArg.startsWith(ConstInterface.REQ_ARG_NULL))
          {
            prgArgs += ConstInterface.REQ_ARG_ALPHA;
          }

          prgArgs = prgArgs + HttpUtility.UrlEncode(prgArg, Encoding.UTF8);

          // if there is at least one more token, append ","
          if (i + 1 < st.length) {
            prgArgs = prgArgs + ",";
          }
        }

        prefix = prefix + prgArgs;
      } // prgArgs != null

      // TODO: How to get environment variables?
      // let envVars: string = ClientManager.Instance.getEnvVars();
      // if (!NString.IsNullOrEmpty(envVars)) {
      //   // environment variables: ENV1,ENV2,.. --> &ENV1=val1&ENV2=val2...
      //   let envVarsVec: string[] = envVars.split(",");
      //   for (let i: number = 0; i < envVarsVec.length; i = i + 1) {
      //     prefix += ("&" + envVarsVec[i] + "=" + OSEnvironment.get(envVarsVec[i]));
      //   }
      // }

      let globalParams: string = ClientManager.Instance.getGlobalParams();
      if (globalParams !== null) {
        globalParams = NString.Replace(globalParams, "+", "%2B");
        prefix += ("&" + ConstInterface.MG_TAG_GLOBALPARAMS + "=" + globalParams);
      }
    } // isInitialCall

    if (hasContent) {
      prefix += ("&" + ConstInterface.RC_TOKEN_SESSION_COUNT + this.GetSessionCounter() +
        ConstInterface.REQ_ARG_SEPARATOR + ConstInterface.RC_TOKEN_DATA);
    }

    return prefix;
  }

  /// <summary>send Monitor messaging to the server</summary>
  public  SendMonitorOnly(): void
  {
    let mgdTab: MGDataCollection = MGDataCollection.Instance;
    let flowMonitor: FlowMonitorQueue = FlowMonitorQueue.Instance;

    if (mgdTab == null || mgdTab.getMGData(0) == null || mgdTab.getMGData(0).IsAborting)
      return;

    if (!flowMonitor.isEmpty())
    {
      // build out message
      let buffer: StringBuilder = RemoteCommandsProcessor.BuildMonitorMessage();

      // If client sequence is to be accumulated until next server access.
      let shouldAccumulateClientLog: boolean = false;
      // shouldAccumulateClientLog = ClientManager.Instance.getLogClientSequenceForActivityMonitor();
      // if (shouldAccumulateClientLog) {
      //   if (this._logAccumulator == null)
      //     this._logAccumulator = new ClientLogAccumulator(ClientManager.Instance.RuntimeCtx.ContextID);
      //
      //   // If we're unable to open the file, deactivate logging accumulation,
      //   //    and let the message be sent to the server as done without accumulated logging
      //   if (this._logAccumulator.IsFailed())
      //     shouldAccumulateClientLog = false;
      // }

      if (shouldAccumulateClientLog) {
        // Write message to file.
        // this._logAccumulator.Write(buffer.ToString());
      }
      else {
        try {
          this.DispatchRequest(this.ServerUrl, buffer.ToString(), CommandsProcessorBase_SessionStage.NORMAL);
        }
        catch (err) {
          // do nothing. if sending log fails, there is no harm.
        }
      }
    }
  }

  /// <summary>build Flow Monitor message</summary>
  private static BuildMonitorMessage(): StringBuilder {
    let buffer: StringBuilder = new StringBuilder(1000);
    let flowMonitor: FlowMonitorQueue = FlowMonitorQueue.Instance;

    if (!ClientManager.Instance.ShouldScrambleAndUnscrambleMessages) {
      buffer.Append(XMLConstants.MG_TAG_OPEN);
      flowMonitor.buildXML(buffer);
    }
    else {
      flowMonitor.buildXML(buffer);
      let scrambledOut: string = Scrambler.Scramble(buffer.ToString());
      buffer = new StringBuilder(1000);
      buffer.Append(XMLConstants.MG_TAG_OPEN + scrambledOut);
    }
    buffer.Append("</" + XMLConstants.MG_TAG_XML + XMLConstants.TAG_CLOSE);

    return buffer;
  }

  static ValidateURL(urlStr: string, sessionCounter: number): string {
    // Create URL object from string
    let url: URL = new URL(urlStr);

    // URL doesn't throw Exception if the protocol is not one of the expected values i.e. http, https, file. So assert.
    Debug.Assert(url.protocol === "http:" || url.protocol === "https:" || url.protocol === "file:");

    // Add the query string. If it contains the "CTX=&" substring, it means that the server didn't specify the context ID
    // because by now it should be already known to the client, and so here we will insert the actual context ID before
    // the '&' symbol.
    if (url.search !== null) {
      let modifiedQuery: string = url.search;  // this query string will be modified to contain the actual context ID
      const CTX_ID_PLACEHOLDER: string = "CTX=&";
      let ctxIdIdx: number = url.search.indexOf(CTX_ID_PLACEHOLDER);

      // We use (CTX_ID_PLACEHOLDER.Length-1) because we would like to insert the context ID before the last character ('&').
      if (ctxIdIdx > -1)
        modifiedQuery = NString.Insert(modifiedQuery, ctxIdIdx + CTX_ID_PLACEHOLDER.length - 1,
          NString.Format("{0}&{1}{2}",
            ClientManager.Instance.RuntimeCtx.ContextID.toString(),
            ConstInterface.RC_TOKEN_SESSION_COUNT, sessionCounter));

      url.search = modifiedQuery;
    }

    return url.toString();
  }

  RegisterDelegates(): void {
    HttpClientEvents.GetSessionCounter_Event = this.GetSessionCounter.bind(this);
    HttpClientEvents.CheckAndSetSessionCounter_Event = this.CheckAndSetSessionCounter.bind(this);
  }
}

/// <summary>helper class: details from the runtime-engine - environment values.
/// Handshake response: <Richclientresponse> <ContextID>...</ContextID> <Environment InputPassword="Y|N"
/// SystemLogin="F|N|D|L" /> </Richclientresponse>
/// </summary>
class HandshakeResponse {
  static readonly SYSTEM_LOGIN_AD: string = 'D';

  private _scrambleMessages: boolean = true; // true if messages should be scrambled/unscrambled by the client and server
  get ScrambleMessages(): boolean {
    return this._scrambleMessages;
  }

  private _contextId: string = null;
  get ContextId(): string {
    return this._contextId;
  }

  private _inputPassword: boolean = false;
  get InputPassword(): boolean {
    return this._inputPassword;
  }

  private _httpTimeout: number = 0;
  get HttpTimeout(): number {
    return this._httpTimeout;
  }

  private _systemLogin: string = null;
  get SystemLogin(): string {
    return this._systemLogin;
  }

  private _maxInternalLogLevel: string = null;
  get MaxInternalLogLevel(): string {
    return this._maxInternalLogLevel;
  }

  constructor(responseXML: string) {
    try {
      JSON_Utils.JSONFromXML(responseXML, this.FillFromJSON.bind(this));
    }
    catch (ex) {
      Logger.Instance.WriteExceptionToLog(ex, responseXML);
    }
  }

  private FillFromJSON (error, result): void {

    // If there was an error in parsing the XML,
    if (error != null) {
      throw error;
    }

    let response = result['Richclientresponse'];

    for (let elementName in response) {
      if (response.hasOwnProperty(elementName)) {

        switch (elementName)
        {
          case "ContextID":
            this._contextId = response[elementName][0];
            break;

          case "Environment":
            let envAttributes = response["Environment"][0]['$'];

            if (!isNullOrUndefined(envAttributes["ScrambleMessages"])) {
              Debug.Assert(envAttributes["ScrambleMessages"] === "N");
              this._scrambleMessages = false;
            }
            if (!isNullOrUndefined(envAttributes["MaxInternalLogLevel"]))
              this._maxInternalLogLevel = envAttributes["MaxInternalLogLevel"];
            if (!isNullOrUndefined(envAttributes["InputPassword"]) && envAttributes["InputPassword"].toLocaleLowerCase() === "y")
              this._inputPassword = true;
            if (!isNullOrUndefined(envAttributes["SystemLogin"]))
              this._systemLogin = envAttributes["SystemLogin"];
            if (!isNullOrUndefined(envAttributes[ConstInterface.MG_TAG_HTTP_COMMUNICATION_TIMEOUT]))
              this._httpTimeout = +envAttributes[ConstInterface.MG_TAG_HTTP_COMMUNICATION_TIMEOUT];
            if (!isNullOrUndefined(envAttributes["ForwardSlash"]))
              ClientManager.Instance.getEnvironment().ForwardSlashUsage = envAttributes["ForwardSlash"];
            break;
        }
      }
    }
  }
}

/// <summary>This class implements MgSAXHandlerInterface, which means that it defines all the "callback"
/// methods that the SAX parser will invoke to notify the application. In this example we override the
/// methods that we require.</summary>
class ErrorMessageXml {
  private _lastRequestTime: number = 0;

  private _errorMessage: string = null;
  private _errorCode: number = 0;
  private _middlewareAddress: string = null;
  private readonly _parsingFailed: boolean = false;

  constructor(xmlContent: string, lastRequestTime: number) {
    this._lastRequestTime = lastRequestTime;
    try {
      JSON_Utils.JSONFromXML(xmlContent, this.FillFromJSON.bind(this));
    }
    catch (ex) {
      Logger.Instance.WriteExceptionToLog(ex);
      Misc.WriteStackTrace(ex);
      this._parsingFailed = true;
    }
  }

  private FillFromJSON (error, result): void {

    // If there was an error in parsing the XML,
    if (error != null) {
      throw error;
    }

    let xmlerr = result['xmlerr'];

    for (let elementName in xmlerr) {
      if (xmlerr.hasOwnProperty(elementName)) {
        switch (elementName)
        {
          case "errmsg":
            this._errorMessage = xmlerr[elementName][0];
            break;
          case "errcode":
            this._errorCode = +(xmlerr[elementName]);
            break;
          case "server":
            this._middlewareAddress = xmlerr[elementName][0];
            break;
          case "appname": // ignored - the client lists this value from the execution properties
          case "prgname": // ignored - the client lists this value from the execution properties
          case "arguments": // ignored
          case "username":  // ignored
          case "xmlerr": // end of the error message
            break;
          default:
            Logger.Instance.WriteExceptionToLogWithMsg(NString.Format("Unknown element: '{0}'", elementName));
            break;
        }
      }
    }
  }

  GetCode(): number {
    return this._errorCode;
  }

  // build & return a formatted error message
  GetMessage(): string {
    let sb: StringBuilder = new StringBuilder();

    if (this._parsingFailed) {
      sb.Append(ClientManager.Instance.getMessageString(MsgInterface.RC_STR_F7_UNEXPECTED_ERR));
    }
    else {
      switch (this._errorCode) {
        case ServerError.ERR_CTX_NOT_FOUND:
          if (this.InactivityTimeoutExpired())
            sb.Append(NString.Format("{0} ({1} {2})",
              ClientManager.Instance.getMessageString(MsgInterface.STR_ERR_SESSION_CLOSED_INACTIVITY),
              Math.floor(ClientManager.Instance.getEnvironment().getContextInactivityTimeout() / 600), // conversion from 1/10 of seconds to minutes
              ClientManager.Instance.getMessageString(MsgInterface.STR_MINUTES)));
          else
            sb.Append(NString.Format("{0} ({1}).", ClientManager.Instance.getMessageString(MsgInterface.STR_ERR_SESSION_CLOSED), this._errorCode));
          break;

        case ServerError.ERR_AUTHENTICATION:
          sb.Append(ClientManager.Instance.getMessageString(MsgInterface.USRINP_STR_BADPASSW));
          break;

        case ServerError.ERR_ACCESS_DENIED:
          sb.Append(ClientManager.Instance.getMessageString(MsgInterface.STR_ERR_AUTHORIZATION_FAILURE));
          break;

        default:
          sb.Append(this._errorMessage);
          break;
      }

      sb.Append(OSEnvironment.EolSeq + OSEnvironment.EolSeq);

      if (!ClientManager.Instance.ShouldDisplayGenericError()) {
        sb.Append(ClientManager.Instance.getMessageString(MsgInterface.BROWSER_OPT_INFO_SERVER_STR) + ":   ");
        sb.Append(ClientManager.Instance.getServer());
        if (!NString.IsNullOrEmpty(this._middlewareAddress)) {
          sb.Append(" --> ");
          sb.Append(this._middlewareAddress);
        }
        sb.Append(OSEnvironment.EolSeq);
      }

      sb.Append(ClientManager.Instance.getMessageString(MsgInterface.TASKRULE_STR_APPLICATION) + ":   \"");
      sb.Append(ClientManager.Instance.getAppName());
      sb.Append("\" (\"");
      let prgDescription: string = ClientManager.Instance.getPrgDescription();
      if (NString.IsNullOrEmpty(prgDescription)) {
        prgDescription = ClientManager.Instance.getPrgName();
      }
      sb.Append(prgDescription);
      sb.Append("\")");
    }

    return sb.ToString();
  }

  private InactivityTimeoutExpired(): boolean {
    let expired: boolean = false;
    if (ClientManager.Instance.getEnvironment().getContextInactivityTimeout() > 0) {
      let currTimeMilli: number = Misc.getSystemMilliseconds();
      expired = ((currTimeMilli - this._lastRequestTime) > (ClientManager.Instance.getEnvironment().getContextInactivityTimeout() * 100));
    }
    return expired;
  }
}

// TODO: Implement this class
// class ClientLogAccumulator {
//
//   private static CLIENT_LOG_HDR_MSG: string = "Client log file";
//   private static _existingLogNames: List<string> = new List<string>();
//   private _clientLogOs: StreamWriter = null;
//   private _contextId: number = 0;
//   private _failed: boolean = false;
//   private _fileName: string = null;
//
//   constructor(contextID: number) {
//     this._contextId = contextID;
//     this._fileName = this.BuildFileName();
//     this.OpenForWrite();
//   }
//
//   Write(buffer: string): void {
//     try {
//       let flag: boolean = !this._failed;
//       if (!flag) {
//         throw new IOException("ClientLogSequence : Loging client sequence is deactivated");
//       }
//       let flag2: boolean = this.OpenForWrite();
//       if (flag2) {
//         this._clientLogOs.Write(buffer);
//         this._clientLogOs.Close();
//         this._clientLogOs = null;
//         this.OpenForWrite();
//       }
//     }
//     catch (ex) {
//       if (ex instanceof IOException) {
//         Logger.Instance.WriteDevToLog(ex.Message);
//         Misc.WriteStackTrace(ex, NConsole.Error);
//       }
//       else
//         throw ex;
//     }
//   }
//
//   Read(): string {
//     let result: string = null;
//     try {
//       let flag: boolean = !this._failed;
//       if (!flag) {
//         throw new IOException("ClientLogSequence : Loging client sequence is deactivated");
//       }
//       this._clientLogOs.Close();
//       this._clientLogOs = null;
//       result = HandleFiles.readToString(this._fileName, Encoding.Default);
//       this.OpenForWrite();
//     }
//     catch (ex) {
//       if (ex instanceof IOException) {
//         Logger.Instance.WriteDevToLog(ex.Message);
//         Misc.WriteStackTrace(ex, NConsole.Error);
//       }
//       else
//         throw ex;
//     }
//     return result;
//   }
//
//   Reset(): void {
//     try {
//       let flag: boolean = !this._failed;
//       if (!flag) {
//         throw new IOException("ClientLogSequence : Loging client sequence is deactivated");
//       }
//       this._clientLogOs.Close();
//       this._clientLogOs = null;
//       HandleFiles.deleteFile(this._fileName);
//     }
//     catch (ex) {
//       if (ex instanceof IOException) {
//         Logger.Instance.WriteExceptionToLog(ex);
//       }
//       else
//         throw ex;
//     }
//   }
//
//   static ExistingLogsFound(): boolean {
//     let result: boolean = false;
//     ClientLogAccumulator.BuildexistingLogList();
//     let flag: boolean = ClientLogAccumulator._existingLogNames !== null && ClientLogAccumulator._existingLogNames.Count > 0;
//     if (flag) {
//       result = true;
//     }
//     return result;
//   }
//
//   static ExistingLogIterator(): IEnumerator<string> {
//     return ClientLogAccumulator._existingLogNames.GetEnumerator();
//   }
//
//   static BuildLogHeaderLine(logName: string): string {
//     let stringBuilder: StringBuilder = new StringBuilder("Client log file");
//     let str: string = NString.Substring(logName, logName.LastIndexOf(NNumber.ToString(Path.DirectorySeparatorChar) + "CS") + 3, logName.LastIndexOf(".log") - (logName.LastIndexOf(NNumber.ToString(Path.DirectorySeparatorChar) + "CS") + 3));
//     stringBuilder.Append(" (Context : ");
//     stringBuilder.Append(str + " ) ");
//     return stringBuilder.ToString();
//   }
//
//   Empty(): boolean {
//     return this._failed || !HandleFiles.isExists(this._fileName) || HandleFiles.getFileSize(this._fileName) === 0;
//   }
//
//   IsFailed(): boolean {
//     return this._failed;
//   }
//
//   private static BuildexistingLogList(): void {
//     let flag: boolean = ClientLogAccumulator._existingLogNames !== null && ClientLogAccumulator._existingLogNames.Count === 0;
//     if (flag) {
//       let path: string = "";
//       ClientLogAccumulator._existingLogNames.AddRange(NArray.ToEnumerable(Directory.GetFiles(path, "CS*.LOG")));
//     }
//   }
//
//   private OpenForWrite(): boolean {
//     let flag: boolean = this._clientLogOs === null;
//     if (flag) {
//       try {
//         this._clientLogOs = new StreamWriter(this._fileName, true, Encoding.Default);
//         this._failed = false;
//       }
//       catch (ex) {
//         if (ex instanceof IOException) {
//           Logger.Instance.WriteDevToLog("ClientLogSequences : " + ex.Message);
//           this._failed = true;
//           this._clientLogOs = null;
//           this._contextId = -1;
//           this._fileName = null;
//         }
//         else
//           throw ex;
//       }
//     }
//     return !this._failed;
//   }
//
//   private BuildFileName(): string {
//     return "";
//   }
// }
