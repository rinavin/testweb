export abstract class ReturnResultBase {
  abstract get Success(): boolean;
  abstract get ErrorDescription(): string;
  InnerResult: ReturnResultBase = null;

  abstract GetErrorId(): any ;

  constructor(innerResult: ReturnResultBase);
  constructor();
  constructor(innerResult?: ReturnResultBase) {
    if (arguments.length === 1)
      this.constructor_0(innerResult);
    else
      this.constructor_1();
  }

  /// <summary>
  /// CTOR
  /// </summary>
  /// <param name="innerResult"></param>
  private constructor_0(innerResult: ReturnResultBase): void {
    this.InnerResult = innerResult;
  }

  /// <summary>
  /// CTOR
  /// </summary>
  private constructor_1(): void {
  }

  /// <summary>
  /// return true if this error need to be handled
  /// </summary>
  /// <returns></returns>
  static ErroNeedToBeHandled(): boolean {
    return false;
  }
}
