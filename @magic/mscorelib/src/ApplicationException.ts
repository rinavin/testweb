import {Exception} from "./Exception";
import {isUndefined} from "util";

export class ApplicationException extends Exception {

  InnerException: Exception = null;

  constructor(message: string = "", innerException?: Exception) {
    super(message);
    this.name = 'ApplicationException';
    this.InnerException = (isUndefined(innerException) ? null : innerException);
    this.errorLevel = 2;
  }
}
