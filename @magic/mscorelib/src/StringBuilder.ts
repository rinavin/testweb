import {Debug} from "./Debug";
import {NString} from "./NString";

// StringBuilder class. Its Implementation currently uses string object. It could have been string[], but it has issues when inserting string.
// It would not have served purpose while inserting a string. Other  could be to use string[] with one chraracter per string. Even its utility
// is doubtful as while manipulation, it would be creting new objects instead pointers. So for now we have used only string and see if we have
// any performance issues.
export class StringBuilder {
  private part: string = "";

  // Ctor
  constructor(length?: number)
  constructor(value?: string, length?: number)
  constructor(valueOrLength?: any, length?: number) {
    if (arguments.length > 0) {
      if (valueOrLength != null  && valueOrLength.constructor === Number) {
        // TODO: Very low priority performance improvement - Implement this.
        // Debug.Assert(false, "StringBuilder: NotImplemented constructor with initial length/capacity");
        // throw  new Error("NotImplemented constructor with initial length/capacity");
      }
      else if (valueOrLength != null  && valueOrLength.constructor === String) {
        this.part = valueOrLength;
        // TODO: Very low priority performance improvement - Implement this.
        // if (arguments.length === 2)
        //   Debug.Assert(false, "NotImplemented constructor with initial length/capacity");
      }
    }
  }

  // Appends string/number
  Append(num: number, numberOfCharacters?: number): StringBuilder;
  Append(text: string): StringBuilder;
  Append(text: string, numberOfCharacters: number): StringBuilder;
  Append(text: string, startIndex: number, charCount: number): StringBuilder;
  Append(textOrNum: any, startIndexOrNumberOfCharacters?: number, charCount?: number): StringBuilder {

    if (textOrNum === null)
      return this;

    if (textOrNum.constructor === String) {
      if (arguments.length === 1)
        this.AppendString(textOrNum);
      else if (arguments.length === 2) {
        Debug.Assert(textOrNum.length === 1, "character is expected not string");
        this.AppendString(textOrNum.charAt(0).repeat(startIndexOrNumberOfCharacters));
      }
      else
        this.AppendString(textOrNum, startIndexOrNumberOfCharacters, charCount);
    }
    else
      this.AppendNumber(textOrNum, startIndexOrNumberOfCharacters);

    return this;
  }

  // Append string
  private AppendString(text: string, startIndex: number = 0, charCount: number = text.length): void {
    this.part = this.part + text.substr(startIndex, charCount);
  }

  // Append Number
  private AppendNumber(num: number, numberOfCharacters: number = 1): void {
    if (numberOfCharacters <= 0)
      throw new Error("numberOfCharacters cannot be less than or equal to zero");

    this.part = this.part + num.toString().repeat(numberOfCharacters);
  }

  // Append Line
  AppendLine(text: string = null): void {
    if (text !== null)
      this.part = this.part + text;
    this.part = this.part + '\n';
  }

  // Append Formatted string
  AppendFormat(format: string, arg0: any): StringBuilder
  AppendFormat(format: string, arg0: any, arg1: any): StringBuilder
  AppendFormat(format: string, arg0: any, arg1: any, arg2: any): StringBuilder
  AppendFormat(format: string, arg0: any, arg1?: any, arg2?: any): StringBuilder {
    this.part = this.part + NString.Format(format, arg0, arg1, arg2);
    return this;
  }

  // Convert to string
  ToString(): string;
  ToString(startIndex: number, length: number): string;
  ToString(startIndex ?: number, length ?: number): string {
    if (arguments.length === 2) {
      if (startIndex < 0 || length < 0 || (startIndex + length) > this.part.length)
        throw new Error("Argument out of range");

      return this.part.substr(startIndex, length);
    }
    return this.part;
  }

  get Length(): number {
    return this.part.length;
  }

  get_Item(index: number): string {
    if (index < 0 || index >= this.part.length)
      throw new Error("Index out of range");

    return this.part.charAt(index);
  }

  set_Item(index: number, value: string) {
    if (index < 0 || index >= this.part.length)
      throw new Error("Index out of range");

    Debug.Assert(value.length <= 1, "Length of string cannot be more than 1. Only character is expected");
    let leftPart: string = this.part.substring(0, index);
    let rightPart: string = this.part.substring(index + 1, this.part.length);
    this.part = leftPart + value.charAt(0) + rightPart;
  }

  Insert(index: number, value: string): StringBuilder {
    if (index < 0 || index > this.part.length)
      throw new Error("Argument out of range");

    let leftPart: string = this.part.substring(0, index);
    let rightPart: string = this.part.substring(index, this.part.length);
    this.part = leftPart + value + rightPart;

    return this;
  }

  Remove(startIndex: number, length: number): StringBuilder {
    if (startIndex < 0 || length < 0 || (startIndex + length) > this.part.length)
      throw new Error("Argument out of range");

    let leftPart: string = this.part.substring(0, startIndex);
    let rightPart: string = this.part.substring(startIndex + length, this.part.length);
    this.part = leftPart + rightPart;

    return this;
  }

  Replace(oldValue: string, newValue: string): StringBuilder;
  Replace(oldValue: string, newValue: string, startIndex: number, count: number): StringBuilder;
  Replace(oldValue: string, newValue: string, startIndex?: number, count?: number): StringBuilder {
    if (oldValue === null)
      throw  new Error("oldValue cannot be null");
    else if (oldValue.length === 0)
      throw  new Error("Length of oldValue cannot be 0");

    if (arguments.length === 4) {
      if (startIndex < 0 || count < 0 || (startIndex + count) > this.part.length)
        throw  new Error("Argument out of range");
    }

    if (arguments.length === 2)
      this.part = this.part.replace(new RegExp(oldValue, 'g'), newValue);
    else if (arguments.length === 4) {
      let substr: string = this.part.substring(startIndex, startIndex + count);
      substr = substr.replace(new RegExp(oldValue, 'g'), newValue);

      let leftPart: string = this.part.substring(0, startIndex);
      let rightPart: string = this.part.substring(startIndex + count, this.part.length);
      this.part = leftPart + substr + rightPart;
    }

    return this;
  }
}
