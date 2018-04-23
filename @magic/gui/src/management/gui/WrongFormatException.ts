import {Exception} from "@magic/mscorelib";
import {MsgInterface} from "@magic/utils";

/// <summary> this exception should be thrown whenever the User inserted input
/// to field which can not be initialized by mask/format, so
/// after catching the exception it needs:
/// set focus back to the field
/// return to the field old value
/// write in the status bar relevant message
/// </summary>
export class WrongFormatException extends Exception {

  // type of the field produced the exception
  private _type: string = null;


  constructor(type?: string) {

    super(type);

    this.name = "WrongFormatException";
    if (arguments.length === 0) {

      this.constructor_0();
      return;
    }

    this.constructor_1(type);
  }

  private initialize() {
    this._type = null;
  }

  /// <summary>constructor on case of wrong RANGE ONLY
  /// to insert relevant range to the status bar
  /// </summary>
  private constructor_0(): void {
    this.initialize();
    this._type = MsgInterface.STR_RNG_TXT;
  }

  /// <summary>constructor on case of wrong user input
  /// to insert 'Bad 'type' .'message to status bar
  /// </summary>
  private constructor_1(type: string): void {
    this.initialize();
    this._type = type;
  }

  getType(): string {
    return this._type;
  }
}
