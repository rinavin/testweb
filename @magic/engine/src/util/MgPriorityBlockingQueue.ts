import {MgBlockingQueue} from "./MgBlockingQueue";
import {MgPriorityQueue} from "./MgPriorityQueue";
import {RunTimeEvent} from "../event/RunTimeEvent";
import {Misc, Priority} from "@magic/utils";
import {Debug, Int32} from "@magic/mscorelib";

export class MgPriorityBlockingQueue implements MgBlockingQueue {
  private _queue: MgPriorityQueue = null;
  private _timeFirstEvent: number = 0;

  constructor() {
    this._queue = new MgPriorityQueue();
  }

  private isBackgroundEvent(o: any): boolean {
    let result: boolean = false;
    if (o instanceof RunTimeEvent) {
      let runTimeEvent: RunTimeEvent = <RunTimeEvent>o;
      if (runTimeEvent.getPriority() === Priority.LOWEST)
        result = true;
    }

    return result;
  }

  offer(o: any): boolean {
    try {
      let condition: boolean = this._queue.offer(o);
      if (this._timeFirstEvent === 0) {
        if (!this.isBackgroundEvent(o)) {
          this._timeFirstEvent = Misc.getSystemMilliseconds();
        }
      }
      Debug.Assert(condition);
      return true;
    }
    finally {}
  }

  put(o: any): void {
    this.offer(o);
  }

  // TODO: Remove this method as worker thread won't wait for events getting added to the queue.
  waitForElement(): void {
    if (this._queue.Size === 0) {
      this._timeFirstEvent = 0;
    }
  }

  GetTime(): number {
    return this._timeFirstEvent;
  }

  poll(): any {
    let result: any;
    try {
      let obj: any = this._queue.poll();
      if (this.isBackgroundEvent(obj)) {
        this._timeFirstEvent = 0;
      }
      result = obj;
    }
    finally {}

    return result;
  }

  peek(): any {
      return this._queue.peek();
  }

  size(): number {
    let size: number;
    return this._queue.Size;
  }

  remainingCapacity(): number {
    return Int32.MaxValue;
  }

  clear(): void {
    this._queue.clear();
  }

  isEmpty(): boolean {
    let result: boolean;
    return this._queue.isEmpty();
  }
}
