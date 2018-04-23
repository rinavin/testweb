import {DialogHandler} from "../gui/low/DialogHandler";
import {UsernamePasswordCredentials} from "./UsernamePasswordCredentials";

/// <summary> Authentication dialog: username (label, text), password (label, text), OK button, CANCEL button;</summary>
export class AuthenticationDialogHandler extends DialogHandler {
  private _credentials: UsernamePasswordCredentials = new UsernamePasswordCredentials();
  ChangePasswordRequested: boolean = false;

  constructor(username: string);
  constructor(username: string, windowTitle: string, groupTitle: string);
  constructor(username?: string, windowTitle?: string, groupTitle?: string) {
    super();
    if (arguments.length === 0)
      this.constructor_0();
    else if (arguments.length === 1)
      this.constructor_1(username);
    else
      this.constructor_2(username, windowTitle, groupTitle);
  }

  private constructor_0(): void {
    this.constructor_2(null, null, null);
  }

  private constructor_1(username: string): void {
    this.constructor_2(username, null, null);
  }

  private constructor_2(username: string, windowTitle: string, groupTitle: string): void {
  }

  /// <summary> dispose(and close) the dialog</summary>
  closeDialog(): void {
    super.closeDialog();
  }

  /// <summary> set current credentials with new credentials </summary>
  setCredentials(newCredentials: UsernamePasswordCredentials): void {
    this._credentials.Username = newCredentials.Username;
    this._credentials.Password = newCredentials.Password;
  }

  getCredentials(): UsernamePasswordCredentials {
    return this._credentials;
  }
}
