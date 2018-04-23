import {ReturnResultBase} from "./ReturnResultBase";
import {ClientManager} from "../ClientManager";

/// <summary>
/// class to be used for the result of operations - failure indicator and a string describing the problem
/// </summary>
export class ReturnResult extends ReturnResultBase {
  private errorDescription: string = null;
  private success: boolean = false;
  static SuccessfulResult: ReturnResult = new ReturnResult();

  get Success(): boolean {
    return this.success;
  }

  get ErrorDescription(): string {
    return this.errorDescription;
  }

  ErrorId: string = null;

  constructor();
  constructor(errorDescriptionCode: string);
  constructor(innerResult: ReturnResultBase);
  constructor(errorDescription: string, innerResult: ReturnResultBase);
  constructor(errorDescriptionCodeOrErrorDescriptionOrInnerResult?: any, innerResult?: ReturnResultBase) {
    super();
    if (arguments.length === 1 && (errorDescriptionCodeOrErrorDescriptionOrInnerResult === null || errorDescriptionCodeOrErrorDescriptionOrInnerResult.constructor === String))
      this.constructor_00(errorDescriptionCodeOrErrorDescriptionOrInnerResult);
    else if (arguments.length === 0)
      this.constructor_01();
    else if (arguments.length === 2)
      this.constructor_02(errorDescriptionCodeOrErrorDescriptionOrInnerResult, innerResult);
    else
      this.constructor_03(errorDescriptionCodeOrErrorDescriptionOrInnerResult);
  }

  /// <summary>
  /// CTOR
  /// </summary>
  private constructor_00(errorDescriptionCode: string): void {
    this.success = false;
    this.ErrorId = errorDescriptionCode;
    this.errorDescription = ClientManager.Instance.getMessageString(errorDescriptionCode);
  }

  /// <summary>
  /// CTOR
  /// </summary>
  private constructor_01(): void {
    this.success = true;
    this.ErrorId = "";
  }

  /// <summary>
  /// CTOR with inner result and description
  /// </summary>
  private constructor_02(errorDescription: string, innerResult: ReturnResultBase): void {
    this.success = false;
    this.errorDescription = errorDescription;
  }

  /// <summary>
  /// CTOR - use the inner command's success ad description
  /// </summary>
  /// <param name="innerResult"></param>
  private constructor_03(innerResult: ReturnResultBase): void {
    this.success = innerResult.Success;
    this.errorDescription = innerResult.ErrorDescription;
  }

  GetErrorId(): any {
    return this.ErrorId;
  }
}
