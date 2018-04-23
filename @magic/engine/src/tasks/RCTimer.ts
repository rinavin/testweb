import {Dictionary, List} from "@magic/mscorelib";
import {MgTimer, Commands, CommandType} from "@magic/gui";
import {MGData} from "./MGData";

///<summary>mapping between each MgData to its list of timer objects.</summary>
class TimerObjectCollection {
  static MgDataToTimerObjList: Dictionary<List<RCTimer>> = new Dictionary<List<RCTimer>>();
}

export class RCTimer extends MgTimer {
  private _mgData: MGData = null;
  private _isIdle: boolean = false;

  ///<summary>Public property: set\get TimerInterval in seconds</summary>
  get TimerIntervalMiliSeconds(): number {
    return this._timerIntervalMilliSeconds;
  }

  ///<summary>Public property returning true if timer is idle else false.</summary>
  set IsIdleTimer(value: boolean) {
    this._isIdle = value;
  }

  get IsIdleTimer(): boolean {
    return this._isIdle;
  }

  constructor(mgData: MGData, milliseconds: number, isIdle: boolean) {
    super(milliseconds);
    this._mgData = mgData;
    this.IsIdleTimer = isIdle;

    let mgDataId: string = this._mgData.GetId().toString();

    if (!TimerObjectCollection.MgDataToTimerObjList.ContainsKey(mgDataId))
      TimerObjectCollection.MgDataToTimerObjList.Add(mgDataId, new List<RCTimer>());

    TimerObjectCollection.MgDataToTimerObjList.get_Item(mgDataId).push(this);
  }

  /// <summary>returns MgData.</summary>
  /// <returns></returns>
  GetMgdata(): MGData {
    return this._mgData;
  }

  /// <summary>Stops the timer corresponding to MGData passed with the interval specified in seconds.</summary>
  /// <param name="mgData">MgData object</param>
  /// <param name="seconds">Timer interval</param>
  /// <param name="isIdle">Is idle timer or not</param>
  static StopTimer(mgData: MGData, milliseconds: number, isIdle: boolean): void {
    let timers: List<RCTimer> = null;
    let timer: RCTimer = null;
    let mgDataId: string = mgData.GetId().toString();

    if (TimerObjectCollection.MgDataToTimerObjList.ContainsKey(mgDataId)) {
      timers = TimerObjectCollection.MgDataToTimerObjList.get_Item(mgDataId);

      timer = timers.find(rcTimer => {
        return (rcTimer !== null) && ( rcTimer._timerIntervalMilliSeconds === milliseconds && rcTimer._isIdle === isIdle)
      });

      if (timer != null) {
        // Placing STOP_TIMER command in queue.
        Commands.addAsync(CommandType.STOP_TIMER, timer);

        timers.Remove(timer);
      }

      Commands.beginInvoke();
      if (timers.length === 0)
        TimerObjectCollection.MgDataToTimerObjList.Remove(mgDataId);
    }
  }

  /// <summary>Stops all the timers.</summary>
  /// <param name="MgData"></param>
  static StopAll(mgData: MGData): void {
    let timers: List<RCTimer> = null;
    let mgDataId: string = mgData.GetId().toString();

    if (TimerObjectCollection.MgDataToTimerObjList.ContainsKey(mgDataId))
      timers = TimerObjectCollection.MgDataToTimerObjList.get_Item(mgDataId);

    if (timers !== null) {
      timers.forEach(rcTimer => {
        if (rcTimer !== null) {
          // Placing STOP_TIMER command in queue.
          Commands.addAsync(CommandType.STOP_TIMER, rcTimer);
        }
      });

      Commands.beginInvoke();
      timers.Clear();

      // Removing the key from the hash table, after the list of timer objects are cleared.
      TimerObjectCollection.MgDataToTimerObjList.Remove(mgDataId);
    }
  }
}
