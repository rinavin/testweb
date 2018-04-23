import {Headers, Http, RequestMethod} from "@angular/http";
import {NString, RefParam, StringBuilder, Thread, WebException} from "@magic/mscorelib";
import {Logger, Logger_LogLevels, Logger_MessageDirection, Misc} from "@magic/utils";
import {ICommunicationsFailureHandler} from "./ICommunicationsFailureHandler";
import {isNullOrUndefined} from "util";
import {HttpClientEvents} from "./HttpClientEvents";

import * as SyncRequestNs from "sync-request";
const SyncRequest = SyncRequestNs;
import * as ResponseNs from "http-response-object";
const Response = ResponseNs;

// execution properties
const HTTP_EXPECT100CONTINUE: string = "Expect100Continue"; // Add HTTP header "Expect:100Continue"
const USE_HIGHEST_SECURITY_PROTOCOL: string = "UseHighestSecurityProtocol"; // This property decides to use TLS v1.2 (implemented at .NET v4.5) or TLS v1.0

class MgRequestOptions {
  headers;
  body: string;
  timeout: number;
}

/// <summary>
/// this class is responsible for:
///    (i) deciding which method to use (GET/POST).
///   (ii) handling communication failures.
///  (iii) adding HTTP headers to requests.
///  (iV) retrieving HTTP headers from responses.
/// </summary>

export class HttpClient {
  private _HTTPMaxURLLength: number = 2048;

  /// <summary>
  /// Gets or sets a handler for communications failure. This property may be
  /// set to null, in which case the HttpClient will automatically fail after
  /// the first reconnection attempt.
  /// </summary>
  CommunicationsFailureHandler: ICommunicationsFailureHandler = null;

  constructor() {
    this.CommunicationsFailureHandler = null;
  }

  /// <summary>
  /// Returns the request method (POST or GET) based on its contents and length.
  /// </summary>
  /// <param name="requestURL"></param>
  /// <returns></returns>
  private DecideOnRequestMethod(requestContent: string, requestURL: RefParam<string>): RequestMethod {
    let method: RequestMethod = RequestMethod.Get;

    if (requestContent === null) {
      // requestContent (== content to be sent to server) is allowed only in POST requests. In case no content is required, opt for GET (for the aforementioned performance reason).
      method = RequestMethod.Get;
    }
    else {
      if (requestURL.value.length + 1 + requestContent.length <= this._HTTPMaxURLLength) {
        // append the request content to the URL, and switch to using a GET request.
        requestURL.value = requestURL.value + "?" + requestContent;
        method = RequestMethod.Get;
      }
      else {
        method = RequestMethod.Post;
      }
    }

    return method;
  }

  /// <summary>Gets contents of a URL, using either GET or POST methods.
  /// The method executes the HTTP request, reads the response and return the content.
  /// </summary>
  /// <param name="requestURL">URL to be accessed.</param>
  /// <param name="requestContent">content to be sent to server (relevant only for POST method - is null for other methods).</param>
  /// <returns>response (from the server).</returns>
  GetContent(requestURL: string, requestContent: any): string {
    let contentFromServer: RefParam<string> = new RefParam(null);
    let requestUrlRef: RefParam<string> = new RefParam(requestURL);

    let httpMethod: RequestMethod = this.DecideOnRequestMethod(requestContent, requestUrlRef);
    requestURL = requestUrlRef.value;

    try {
      // Execute the http request
      let response: Response = this.ExecuteHttpRequest(requestURL, requestContent, httpMethod, contentFromServer);

      Logger.Instance.WriteServerToLog("Incoming Headers : " + HttpClient.HeadersToString(response.headers, true));

      // set the next session counter (which will be expected by the server in the next request).
      let nextSessionCounterString: string = response.headers["MgxpaNextSessionCounter".toLowerCase()];
      if (!isNullOrUndefined(nextSessionCounterString)) {
        HttpClientEvents.CheckAndSetSessionCounter(+nextSessionCounterString);
      }
    }
    catch (ex) {
      Logger.Instance.WriteWarningToLog(ex);
      throw ex;
    }

    return contentFromServer.value;
  }

  /// <summary>This function executes the HTTP request and make the response object. It can execute
  ///   GET or POST request. In case of POST request the variables to server will contain the
  ///   variables to be send to the server.
  /// </summary>
  /// <param name="urlString">URL to be accessed.</param>
  /// <param name="requestContent">content to be sent to server (relevant only for POST method - is null for other methods).</param>
  /// <param name="httpMethod">enum RequestMethod to specify the method that will be used to execute the request.</param>
  /// <param name="contentFromServer">content received from the response. [OUT]</param>
  /// <returns></returns>
  private ExecuteHttpRequest(urlString: string, requestContent: string, httpMethod: RequestMethod, contentFromServer: RefParam<any>): Response {
    let httpResponse: Response = null;

    let httpCommunicationTimeoutMS: number = HttpClientEvents.GetHttpCommunicationTimeout();
    let clientID: string = HttpClientEvents.GetGlobalUniqueSessionID();

    let executionAttempts: number = 0;  // for logging purpose only.

    let startTime: number = Misc.getSystemMilliseconds();

    // Retrying:
    //    Is controlled by:
    //       (I)  The method variable 'httpCommunicationTimeoutMS' (above),
    //       (II) The class member 'CommunicationsFailureHandler' (above).
    while (true) {
      executionAttempts++;

      try {
        // TODO: implement TLS protocol.
        // let useHighestSecurityProtocol: boolean = HttpClient.GetUseHighestSecurityProtocol();
        // if (useHighestSecurityProtocol) {
        //   ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
        // }

        const requestOptions = new MgRequestOptions();

        // Do not add MgxpaRIAglobalUniqueSessionID while getting execution properties
        // TODO: headers should not be sent for cached file requests
        const headers: Headers = new Headers();
        if (!urlString.startsWith("/"))
          headers.append("MgxpaRIAglobalUniqueSessionID", clientID);

        requestOptions.headers = headers.toJSON();
        requestOptions.body = requestContent;
        requestOptions.timeout = httpCommunicationTimeoutMS;

        Logger.Instance.WriteServerToLog(NString.Format("Request Timeout set to {0} ms", httpCommunicationTimeoutMS));

        if (Logger.Instance.LogLevel === Logger_LogLevels.Basic) {
          let contentLength: number = 0;
          if (httpMethod === RequestMethod.Get) {
            let parts: string[] = urlString.split('?');

            if (parts.length === 2)
              contentLength = parts[1].length;
          }
          else // (httpRequest.method === RequestMethod.Post)
            contentLength = requestContent.length;

          Logger.Instance.WriteBasicToLog(Logger_MessageDirection.MessageLeaving,
            HttpClientEvents.GetRuntimeCtxID(),
            HttpClientEvents.GetSessionCounter(),
            clientID,
            HttpClientEvents.ShouldDisplayGenericError() ? "-" : new URL(urlString).host,
            0,
            '-',
            JSON.stringify(requestOptions.headers),
            contentLength);
        }

        let timeBeforeRequest: number = Misc.getSystemMilliseconds();
        Logger.Instance.WriteServerToLog(NString.Format("Accessing (method: '{0}'): '{1}'", httpMethod, urlString));

        Logger.Instance.WriteServerToLog("Outgoing Headers : " + HttpClient.HeadersToString(requestOptions.headers, false));

        if (httpMethod === RequestMethod.Post) {
          // TODO: Handle Expect100Continue.
          // httpWebRequest.ServicePoint.Expect100Continue = this.GetHTTPExpect100Continue();
          // this.WriteContentToRequest(requestContent, httpWebRequest);
        }

        // =============================================================================================================
        // send the request & get the response:
        // ===================
        // TODO : Handle errors
        httpResponse = SyncRequest(RequestMethod[httpMethod], urlString, requestOptions);
        contentFromServer.value = httpResponse.body as any;
        let statusCode = httpResponse['statusCode'];
        if (statusCode === 404 || statusCode === 403) {
          throw new WebException(new Error("bad URL: " + urlString + " - StatusCode = " + statusCode), statusCode);
        }

        let responseTime: number = Misc.getSystemMilliseconds() - timeBeforeRequest;
        if (Logger.Instance.LogLevel === Logger_LogLevels.Basic)
          Logger.Instance.WriteBasicToLog(Logger_MessageDirection.MessageEntering,
            HttpClientEvents.GetRuntimeCtxID(),
            HttpClientEvents.GetSessionCounter(),
            clientID,
            HttpClientEvents.ShouldDisplayGenericError() ? "-" : new URL(urlString).host,
            responseTime,
            statusCode,
            JSON.stringify(httpResponse.headers),
            contentFromServer.value.length);

        break;
      }
      catch (ex) {
        if (Logger.Instance.LogLevel === Logger_LogLevels.Basic)
          Logger.Instance.WriteBasicErrorToLog(HttpClientEvents.GetRuntimeCtxID(),
            HttpClientEvents.GetSessionCounter(),
            clientID,
            HttpClientEvents.ShouldDisplayGenericError() ? "-" : new URL(urlString).host,
            ex);
        else
          Logger.Instance.WriteWarningToLog(ex);

        if (ex instanceof WebException)
          throw ex;

        // delay the total http timeout / 10.
        let currentDelayMS = Math.floor(httpCommunicationTimeoutMS / 10); // ms
        let httpElapsedTimeMS: number = Misc.getSystemMilliseconds() - startTime + currentDelayMS;
        if (httpElapsedTimeMS <= httpCommunicationTimeoutMS)
        {
          Thread.Sleep(currentDelayMS);
          Logger.Instance.WriteWarningToLogWithMsg(NString.Format("Retrying {0} : elapsed time {1:N0}ms out of {2:N0}ms",
            urlString, httpElapsedTimeMS, httpCommunicationTimeoutMS));
          continue;
        }

        Logger.Instance.WriteWarningToLogWithMsg(NString.Format("{0} : http timeout {1:N0}ms expired", urlString, httpCommunicationTimeoutMS));
        if (this.CommunicationsFailureHandler != null)
        {
          this.CommunicationsFailureHandler.CommunicationFailed(urlString, ex);
          if (this.CommunicationsFailureHandler.ShouldRetryLastRequest)
          {
            Logger.Instance.WriteServerToLog(NString.Format("Retrying {0}, confirmed by user ...", urlString));
            startTime = Misc.getSystemMilliseconds();
            continue;
          }
        }

        Logger.Instance.WriteWarningToLogWithMsg("Re-throwing ...");
        Logger.Instance.WriteWarningToLog(ex);
        throw new WebException(ex);
      }
    }

    if (executionAttempts > 1) {
      Logger.Instance.WriteServerToLog(NString.Format("Succeeded after {0} attempts ...", executionAttempts));
    }

    return httpResponse;
  }

  /// <summary>Write Mg* prefixed headers to string in format "HEADER1:VALUE1 HEADER2:VALUE2 ..."</summary>
  /// <param name="headers"></param>
  /// <param name="bFilter">if true, list only headers prefixed with "Mg"</param>
  private static HeadersToString(headers, bFilter: boolean): StringBuilder {
    let headersStr: StringBuilder = new StringBuilder();

    for (let key in headers) {
      // filter only headers that are prefixed with Mg* (sent from the Middleware and Server):
      if (!bFilter || headers[key].startsWith("Mg"))
        headersStr.Append(NString.Format("{0}:{1} ", key, headers[key]));
    }

    return headersStr;
  }

  /// <summary>Return the property which decide whether to set HTTP header "Expect:100Continue"</summary>
  /// <returns>bool</returns>
  private static GetHTTPExpect100Continue(): boolean {
    let result: boolean = true;
    let executionProperty: string = HttpClientEvents.GetExecutionProperty(HTTP_EXPECT100CONTINUE);

    // In case the property is not given in the execution properties, it should default to true
    if (!NString.IsNullOrEmpty(executionProperty))
      result = (executionProperty.toUpperCase() === "Y");

    return result;
  }

  /// <summary>Return the property which allows to use TLS v1.2 (implemented at .NET v4.5) as a highest TLS protocol version.
  /// Otherwise use TLS v1.0 as a highest TLS protocol version</summary>
  /// <returns>bool</returns>
  private static GetUseHighestSecurityProtocol(): boolean {
    let result: boolean = false;
    let executionProperty: string = HttpClientEvents.GetExecutionProperty(USE_HIGHEST_SECURITY_PROTOCOL);

    // In case the property is not given in the execution properties, it should default to false (a highest TLS protocol version is v1.0)
    if (!NString.IsNullOrEmpty(executionProperty))
      result = (executionProperty.toUpperCase() === "Y");

    return result;
  }
}
