import {List, NString} from "@magic/mscorelib";
import {Logger, XMLConstants, XmlParser} from "@magic/utils";
import {Event} from "../event/Event";
import {EventHandler} from "../event/EventHandler";
import {Task} from "../tasks/Task";
import {ClientManager} from "../ClientManager";
import {MGData} from "../tasks/MGData";
import {GUIManager} from "../GUIManager";
import {ConstInterface} from "../ConstInterface";

///   the handlers table
export class HandlersTable {
  private _handlers: List<EventHandler> = null;

  constructor() {
    this._handlers = new List<EventHandler>();
  }

  ///   parse the handlers of a task
  fillData(taskRef: Task): void {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;
    while (this.initInnerObjects(parser, parser.getNextTag(), taskRef)) {
    }
  }

  /// <summary>
  ///   To allocate and fill inner objects of the class
  /// </summary>
  /// <param name = "foundTagName">name of tag, of oject, which need be allocated </param>
  private initInnerObjects(parser: XmlParser, foundTagName: string, taskRef: Task): boolean {
    if (foundTagName === null)
      return false;

    if (foundTagName === ConstInterface.MG_TAG_EVENTHANDLERS) {
      parser.setCurrIndex(parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex()) + 1);
    }
    else {
      if (foundTagName === ConstInterface.MG_TAG_HANDLER) {
        let eventHandler: EventHandler = new EventHandler();
        eventHandler.fillData(taskRef);
        this._handlers.push(eventHandler);
      }
      else {
        if (foundTagName === '/' + ConstInterface.MG_TAG_EVENTHANDLERS) {
          parser.setCurrIndex2EndOfTag();
          return false;
        }

        Logger.Instance.WriteExceptionToLogWithMsg("There is no such tag in HandlersTable. Insert else if to HandlersTable.initInnerObjects for " + foundTagName);
        return false;
      }
    }

    return true;
  }

  /// <summary>
  ///   add a new event handler to the table
  /// </summary>
  /// <param name = "handler">the new event handler </param>
  add(handler: EventHandler): void {
    this._handlers.push(handler);
  }

  /// <summary>
  /// calculate control by control name
  /// </summary>
  CalculateControlFormControlName(): void {
    this._handlers.forEach(item => { item.calculateCtrlFromControlName(item.getTask()); } );
  }

  /// <summary>
  ///   removes the handler at idx place
  /// </summary>
  /// <param name = "idx"> </param>
  remove(idx: number): void {
    this._handlers.RemoveAt(idx);
  }

  /// <summary>
  ///   insert a new event handler to the table after the idx's element
  /// </summary>
  /// <param name = "handler">the new event handler </param>
  /// <param name = "idx">index of the element to add the new element after </param>
  insertAfter(handler: EventHandler, idx: number): void {
    this._handlers.Insert(idx, handler);
  }

  /// <summary>
  ///   returns the number of handlers in the table
  /// </summary>
  getSize(): number {
    return this._handlers.length;
  }

  /// <summary>
  ///   get a handler by its index
  /// </summary>
  /// <param name = "idx">the index of the handler in the table </param>
  getHandler(idx: number): EventHandler {
    if (idx < 0 || idx >= this._handlers.length)
      return null;

    return this._handlers.get_Item(idx);
  }

  /// <summary>
  ///   start timers for timer events
  /// </summary>
  startTimers(mgd: MGData): void {
    let guiManager: GUIManager = GUIManager.Instance;
    if (this._handlers !== null) {
      let timersVector: List<number> = this.getTimersVector();
      for (let i: number = 0; i < timersVector.length; i++)
        guiManager.startTimer(mgd, timersVector.get_Item(i), false);
    }
  }

  /// <summary>
  ///   Returns a list of the number of seconds for each timer
  ///   If there is more than one timer handler with the same number of seconds
  ///   this number will appear in the list only once.
  /// </summary>
  getTimersVector(): List<number> {
    let timers: List<number> = new List<number>();

    // scan the timers
    for (let i: number = 0; i < this._handlers.length; i++) {
      let timerEvt: Event = this.getHandler(i).getEvent();
      let sec: number;
      if (timerEvt.getType() === ConstInterface.EVENT_TYPE_TIMER)
        sec = timerEvt.getSeconds();
      else // EVENT_TYPE_USER
        sec = timerEvt.getSecondsOfUserEvent();
      let timerExists: boolean = false;
      for (let j: number = 0; j < timers.length; j++) {
        if (sec === timers.get_Item(j)) {
          timerExists = true;
          break;
        }
      }
      if (!timerExists) {
        timers.push(sec);
      }
    }
    return timers;
  }
}
