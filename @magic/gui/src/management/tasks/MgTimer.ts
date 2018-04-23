/// <summary>
/// This class acts as base class for the timers implemented in RC and Merlin.
/// </summary>
import {Observable} from "rxjs/rx";
import {Events} from "../../Events";
import {Subscription} from "rxjs/Subscription";

export abstract class MgTimer {
  // member variables.
  protected _timerIntervalMilliSeconds: number = 0;
  private _threadTimer: Subscription = null;

  ///<summary>Constructor</summary>
  ///<param name="timerIntervalMilliSeconds">Timer Interval in milliseconds
  ///</param>
  constructor(timerIntervalMilliSeconds: number) {
    this._timerIntervalMilliSeconds = timerIntervalMilliSeconds;
  }

  /// <summary>Call back method of threading timer.
  /// <param name="state"></param>
  /// </summary>
  static Run(state: any): void {
    Events.OnTimer(<MgTimer>state);
  }

  /// <summary>
  /// Starts the timer thread with the interval passed in milliseconds.
  /// </summary>
  Start(): void {
    var timer = Observable.timer(this._timerIntervalMilliSeconds, this._timerIntervalMilliSeconds);
    this._threadTimer = timer.subscribe(state => MgTimer.Run(this));
  }

  /// <summary>Stops the thread.
  /// </summary>
  Stop(): void {
    this._threadTimer.unsubscribe();
    this._threadTimer = null;
  }
}
