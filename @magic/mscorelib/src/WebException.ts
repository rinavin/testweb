import {Exception} from "./Exception";

export class WebException extends Exception {
  constructor(error: Error, statusCode ?: number) {
    super();
    this.name = "WebException";
    this.stack = error.stack;
    this.message = error.message;
  }
}
