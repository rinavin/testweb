import {Exception} from "@magic/mscorelib";

export class OSEnvironment {
  static EolSeq: string = "\n";
  static TabSeq: string = "\t";

  static getStackTrace(): string {
    let ex: Exception = new Exception();
    ex.errorLevel++;   // we need to remove the line which contains call to this method
    return ex.StackTrace;
  }
}
