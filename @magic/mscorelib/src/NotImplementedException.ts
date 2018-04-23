import {Exception} from "./Exception";

export class NotImplementedException extends Exception {
  constructor(message: string = "Not implemented") {
    super(message);
  }
}
