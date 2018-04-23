import {ApplicationException, Exception, NString} from "@magic/mscorelib";
import {ClientManager} from "../ClientManager";
import {MsgInterface, StrUtil} from "@magic/utils";
import {isNullOrUndefined} from "util";

export class ServerError extends ApplicationException {
  static INF_NO_RESULT: number = -11;
  static ERR_CTX_NOT_FOUND: number = -197;
  static ERR_AUTHENTICATION: number = -157;
  static ERR_ACCESS_DENIED: number = -133;
  static ERR_LIMITED_LICENSE_CS: number = -136;
  static ERR_UNSYNCHRONIZED_METADATA: number = -271;
  static ERR_CANNOT_EXECUTE_OFFLINE_RC_IN_ONLINE_MODE: number = -272;
  static ERR_INCOMPATIBLE_RIACLIENT: number = -275;

  private _code: number = 0;

  constructor(msg: string);
  constructor(msg: string, code: number);
  constructor(msg: string, innerException: Exception);
  constructor(msg: string, codeOrInnerException?: any) {
    super(msg);
    if (arguments.length === 1 || isNullOrUndefined(codeOrInnerException))
      return;

    if (codeOrInnerException.constructor === Number)
      this._code = codeOrInnerException;
    else
      this.InnerException = codeOrInnerException;

    this.errorLevel = 3;
  }

  GetCode(): number {
    return this._code;
  }

  ///<summary>
  ///  Return error message for ServerError exception.
  ///  This method will return detailed error message when :-
  ///      1) when detailed message is to be shown (i.e. DisplayGenericError = N in execution.properties)
  ///      2) when ServerError.Code is 0.
  ///  Otherwise generic error message will be returned.
  ///</summary>
  ///<returns>!!.</returns>
  GetMessage(): string {
    let message: string;

    let shouldDisplayGenericError: boolean = ClientManager.Instance.ShouldDisplayGenericError();
    if (shouldDisplayGenericError && this.GetCode() > 0) {
      let genericErrorMessage: string = ClientManager.Instance.getMessageString(MsgInterface.STR_GENERIC_ERROR_MESSAGE);
      genericErrorMessage = StrUtil.replaceStringTokens(genericErrorMessage, "%d", 1, "{0}");
      message = NString.Format(genericErrorMessage, this.GetCode());
    }
    else
      message = this.Message;
    return message;
  }
}
