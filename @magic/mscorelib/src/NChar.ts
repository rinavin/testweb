import {isDigit, isWhitespace, isAsciiLetter} from "codelyzer/angular/styles/chars";
import {isLowerCase, isUpperCase} from "tslint/lib/utils";

export class NChar {
  static IsWhiteSpace(str: string): boolean {
    let ch = str.charCodeAt(0);
    return isWhitespace(ch);
  }

  static IsLetterOrDigit(str: string): boolean {
    let ch = str.charCodeAt(0);
    return isDigit(ch) || isAsciiLetter(ch);
  }

  static IsDigit(str: string): boolean {
    let ch = str.charCodeAt(0);
    return isDigit(ch);
  }

  static IsLetter(ltr: string): boolean {
    return isAsciiLetter(ltr.charCodeAt(0));
  }

  static IsLower(ch: string): boolean {
    return isLowerCase(ch);
  }

  static IsUpper(ch: string): boolean {
    return isUpperCase(ch)
  }
}
