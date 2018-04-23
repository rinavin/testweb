import {StringBuilder} from "@magic/mscorelib";

/// <summary>
///
/// </summary>

export class UsernamePasswordCredentials  {
  Username: string = null;
  Password: string = null;

  constructor();
  constructor(userName: string, password: string);
  constructor(userName?: string, password?: string) {
    if (arguments.length === 0) {
      this.constructor_0();
      return;
    }
    this.constructor_1(userName, password);
  }

  private constructor_0(): void {
  }

  private constructor_1(userName: string, password: string): void {
    this.Username = userName;
    this.Password = password;
  }

  /// <summary> Get this object string.
  ///
  /// </summary>
  /// <returns> the username:password formed string
  /// </returns>
  toString(): string {
    let result: StringBuilder = new StringBuilder();
    result.Append(this.Username);
    result.Append(":");
    result.Append(this.Password || "null");
    return result.ToString();
  }
}

export class ChangePasswordCredentials extends UsernamePasswordCredentials {
  NewUserName: string = null;
  NewPassword: string = null;

  constructor();
  constructor(oldUserName: string, newUserName: string, password: string);
  constructor(oldUserName?: string, newUserName?: string, password?: string) {
    super(oldUserName, password);
    if (arguments.length === 0) {
      this.constructor_2();
      return;
    }
    this.constructor_3(oldUserName, newUserName, password);
  }

  private constructor_2() {

  }


  private constructor_3(oldUserName: string, newUserName: string, password: string): void {
    this.NewUserName = newUserName;
  }

  ToString(): string {
    let result: StringBuilder = new StringBuilder();
    result.Append(this.Username);
    result.Append(":");
    result.Append(this.NewUserName);
    result.Append(":");
    result.Append(this.Password || "null");

    return result.ToString();
  }
}
