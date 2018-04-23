import {Modifiers} from "../GuiEnums";
import {StringBuilder} from "@magic/mscorelib";
import {GuiConstants} from "../GuiConstants";

/// <summary>
///   data for <kbditm>
/// </summary>
export class KeyboardItem {
  private _keyCode: number = 0;
  private _modifier: Modifiers = Modifiers.MODIFIER_NONE; // Alt|Ctrl|Shift|None
  private _states: number = 0;
  private _actionId: number = 0;

  constructor(cKeyCode: number, cModifier: Modifiers);
  constructor(actionId_: number, keyCode_: number, modifier_: Modifiers, states_: number);
  constructor(cKeyCodeOrActionId_?: number, cModifierOrKeyCode_?: any, modifier_?: Modifiers, states_?: number) {
    if (arguments.length === 2)
      this.constructor_1(cKeyCodeOrActionId_, cModifierOrKeyCode_);
    else
      this.constructor_2(cKeyCodeOrActionId_, cModifierOrKeyCode_, modifier_, states_);
  }

  /// <summary>
  ///   CTOR
  /// </summary>
  /// <param name = "cKeyCode">key code
  /// </param>
  /// <param name = "cModifier">modifier key: Alt|Ctrl|Shift|None
  /// </param>
  private constructor_1(cKeyCode: number, cModifier: Modifiers): void {
    this._keyCode = cKeyCode;
    this._modifier = cModifier;
  }

  private constructor_2(actionId_: number, keyCode_: number, modifier_: Modifiers, states_: number): void {
    this._actionId = actionId_;
    this._keyCode = keyCode_;
    this._modifier = modifier_;
    this._states = states_;
  }

  /// <summary>
  ///   returns the key code of the keyboard item
  /// </summary>
  getKeyCode(): number {
    return this._keyCode;
  }

  /// <summary>
  ///   returns the modifier of the keyboard item
  /// </summary>
  getModifier(): Modifiers {
    return this._modifier;
  }

  /// <summary>
  ///   returns states of the keyboard item
  /// </summary>
  getStates(): number {
    return this._states;
  }

  /// <summary>
  ///   compares this keyboard item to a given keyboard item and returns true if and only if
  ///   the keycode and the modifier are equal
  /// </summary>
  /// <param name = "kbdItm">the keyboard item to compare to
  /// </param>
  equals(kbdItm: KeyboardItem): boolean {
    return this === kbdItm || (kbdItm !== null && this._keyCode === kbdItm._keyCode && this._modifier === kbdItm._modifier);
  }

  /// <summary>
  ///   get the action id
  /// </summary>
  getAction(): number {
    return this._actionId;
  }

  /// <param name = "actionId">
  /// </param>
  setAction(actionId: number): void {
    this._actionId = actionId;
  }

  /// <summary>
  ///   translate the Keyboard Item to its String representation
  /// </summary>
  /// <returns> string representation of the KeyBoard Item
  /// </returns>
  ToString(): string {
    let buffer: StringBuilder = new StringBuilder();
    let counter: number = 0;

    switch (this._modifier) {
      case Modifiers.MODIFIER_ALT:
        buffer.Append("Alt+");
        break;

      case Modifiers.MODIFIER_CTRL:
        buffer.Append("Ctrl+");
        break;

      case Modifiers.MODIFIER_SHIFT:
        buffer.Append("Shift+");
        break;

      case Modifiers.MODIFIER_SHIFT_CTRL:
        buffer.Append("Shift+Ctrl+");
        break;

      case Modifiers.MODIFIER_ALT_CTRL:
        buffer.Append("Alt+Ctrl+");
        break;

      case Modifiers.MODIFIER_ALT_SHIFT:
        buffer.Append("Shift+Alt+");
        break;

      case Modifiers.MODIFIER_NONE:
      default:
        break;
    }

    switch (this._keyCode) {
      case GuiConstants.KEY_SPACE:
        buffer.Append("Space");
        break;

      case GuiConstants.KEY_PG_UP:
        buffer.Append("PgUp");
        break;

      case GuiConstants.KEY_PG_DOWN:
        buffer.Append("PgDn");
        break;

      case GuiConstants.KEY_END:
        buffer.Append("End");
        break;

      case GuiConstants.KEY_HOME:
        buffer.Append("Home");
        break;

      case GuiConstants.KEY_LEFT:
        buffer.Append("Left");
        break;

      case GuiConstants.KEY_UP:
        buffer.Append("Up");
        break;

      case GuiConstants.KEY_RIGHT:
        buffer.Append("Rght");
        break;

      case GuiConstants.KEY_DOWN:
        buffer.Append("Down");
        break;

      case GuiConstants.KEY_TAB:
        buffer.Append("Tab");
        break;

      case GuiConstants.KEY_INSERT:
        buffer.Append("Ins");
        break;

      case GuiConstants.KEY_DELETE:
        buffer.Append("Del");
        break;

      case GuiConstants.KEY_RETURN:
        buffer.Append("Ent");
        break;

      case GuiConstants.KEY_ESC:
        buffer.Append("Esc");
        break;

      case GuiConstants.KEY_BACKSPACE:
        buffer.Append("Back");
        break;

      default:
        if (this._keyCode >= GuiConstants.KEY_F1 && this._keyCode <= GuiConstants.KEY_F12)
        // KEY_F1 = 112; KEY_F12 = 123;
        {
          counter = this._keyCode - GuiConstants.KEY_F1 + 1;
          buffer.Append("F" + counter);
        }
        else if (this._keyCode >= GuiConstants.KEY_0 && this._keyCode <= GuiConstants.KEY_9)
        // KEY_0 = 48;KEY_9 = 57;
        {
          counter = this._keyCode - GuiConstants.KEY_0;
          buffer.Append(counter);
        }
        else if (this._keyCode >= GuiConstants.KEY_A && this._keyCode <= GuiConstants.KEY_Z)
        // KEY_A = 65; KEY_Z = 90;
        {
          counter = this._keyCode - GuiConstants.KEY_A + ('A').charCodeAt(0);
          buffer.Append(String.fromCharCode(counter));
        }
        else
          buffer.Append("? (" + this._keyCode + ")");
        break;

    }
    return buffer.ToString();
  }
}

