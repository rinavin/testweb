import {NotImplementedException} from "./NotImplementedException";

export class Thread {
  private static nextId: number = 1;
  static CurrentThread: Thread = new Thread();
  ManagedThreadId: number = 0;

  constructor() {
    this.ManagedThreadId = Thread.nextId++;
  }

  static Sleep(millisecondsTimeout: number): void {
    throw new NotImplementedException();
  }
}
