import {ApplicationException, Debug, NString, RefParam} from "@magic/mscorelib";
import {Logger} from "@magic/utils";
import {ConstInterface} from "../ConstInterface";
import {HttpClient} from "./client/HttpClient";
import {HttpClientEvents} from "./client/HttpClientEvents";
import {ICommunicationsFailureHandler} from "./client/ICommunicationsFailureHandler";
import {Http} from "@angular/http";

export class HttpManager {
  private static _instance: HttpManager = null;

  static readonly DEFAULT_HTTP_COMMUNICATION_TIMEOUT: number = 5 * 1000;
  static readonly DEFAULT_OFFLINE_HTTP_COMMUNICATION_TIMEOUT: number = 2 * 1000;

  private _httpCommunicationTimeoutMS: number = HttpManager.DEFAULT_HTTP_COMMUNICATION_TIMEOUT;
  private _httpClient: HttpClient = null;

  set HttpCommunicationTimeoutMS(value: number) {
    this._httpCommunicationTimeoutMS = value;
  }

  static GetInstance(): HttpManager {
    if (HttpManager._instance === null) {
      HttpManager._instance = new HttpManager();
    }

    return HttpManager._instance;
  }

  private constructor() {
    this._httpClient = new HttpClient();
    this.RegisterBasicDelegates();
  }

  private RegisterBasicDelegates(): void {
    HttpClientEvents.GetHttpCommunicationTimeout_Event = this.GetHttpCommunicationTimeoutMS.bind(this);
  }

  GetHttpCommunicationTimeoutMS(): number {
    return this._httpCommunicationTimeoutMS;
  }

  SetCommunicationsFailureHandler(handler: ICommunicationsFailureHandler): void {
    this._httpClient.CommunicationsFailureHandler = handler;
  }

  GetContent(requestedURL: string, requestContent: string, isError: RefParam<boolean>): string {
    let response: string;
    // let startTime: number = Misc.getSystemMilliseconds();

    try {
      Logger.Instance.WriteServerToLog("*************************************************************************************************");

      isError.value = false;

      Logger.Instance.WriteServerToLog(requestedURL);

      HttpManager.LogAccessToServer("", requestContent);
      response = this._httpClient.GetContent(requestedURL, requestContent);
      Debug.Assert(response !== null);
      let errorResponse: string = HttpManager.CheckAndGetErrorResponse(response);

      if (errorResponse !== null) {
        response = errorResponse;
        isError.value = true;
      }

        return response;
    }
    catch (ex) {
      // TODO: relative requestedURL doesn't work here.
      let url: URL = new URL(requestedURL);
      throw new ApplicationException(ex.Message + "\n" + url.origin + url.pathname, ex);
    }
    finally {
      // TODO: Implement in WebClient.
      // How do we know if the contents were returned form browser cache?
      // let elapsedTime: number = Misc.getSystemMilliseconds() - startTime;

      // Logger.Instance.WriteServerToLog(
      //               string.Format(
      //                  "Completed {0}: {1:N0} ms, accumulated: {2:N0} ms (server: {3:N0}), {4}{5}{6}**************************************************************************************************",
      //                  (cachingStrategy.FoundInCache
      //                      ? ""
      //                      : NString.Format("#{0:N0}", Statistics.GetRequestsCnt())
      //                  ),
      //                  elapsedTime,
      //                  Statistics.GetAccumulatedExternalTime(), Statistics.GetAccumulatedServerTime(),
      //                  (cachingStrategy.FoundInCache
      //                      ? ""
      //                      : (response != null
      //                            ? NString.Format("{0:N0} bytes downloaded", response.length)
      //                            : "Null response!")
      //                  ),
      //                  OSEnvironment.EolSeq, OSEnvironment.TabSeq)
      //               );
    }
  }

  /// <summary>Check if an HTTP response is an error response.
  /// <param name="httpResponse">response returned to an HTTP request.</param>
  /// <returns>if the response contains the error indicator - the error indicator is truncated and the remaining is returned.
  /// otherwise - null (indicating that the 'http Response' didn't contain an error).</returns>
  private static CheckAndGetErrorResponse(httpResponse: string): string {
    let errorResponse: string = null;

    if (httpResponse.startsWith(ConstInterface.V24_RIA_ERROR_PREFIX))
      errorResponse = httpResponse.substr(ConstInterface.V24_RIA_ERROR_PREFIX.length);

    return errorResponse;
  }

  private static LogAccessToServer(msg: string, requestContent: string): void {
    if (Logger.Instance.ShouldLogServerRelatedMessages()) {
      if (!NString.IsNullOrEmpty(msg)) {
        msg = msg + "; accessing server ...";
      }

      if (requestContent === null) {
        if (!NString.IsNullOrEmpty(msg)) {
          Logger.Instance.WriteServerToLog(msg);
        }
      }
      else {
        if (!NString.IsNullOrEmpty(msg)) {
          msg = msg + " ";
        }

        msg = msg + "uploading " + requestContent.length + " bytes";
        Logger.Instance.WriteServerToLog(msg);
      }
    }
  }
}
