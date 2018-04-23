import {List, NString} from "@magic/mscorelib";
import {XmlParser, Logger, XMLConstants} from "@magic/utils";
import {ClientManager} from "../ClientManager";
import {Task} from "../tasks/Task";
import {Event} from "./Event";
import {ConstInterface} from "../ConstInterface";

// User events table:<userevents> event …</userevents>
export class UserEventsTable {
  private _userEventsTab: List<Event> = null;

  /// <summary>
  ///   CTOR
  /// </summary>
  constructor() {
    this._userEventsTab = new List<Event>();
  }

  /// <summary>
  ///   parse input string and fill inner data : Vector userEventsTab
  /// </summary>
  fillData(tsk: Task): void {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;
    while (this.initInnerObjects(parser, parser.getNextTag(), tsk)) {
    }
  }

  /// <summary>
  ///   allocate and fill inner objects of the class
  /// </summary>
  /// <param name = "foundTagName">possible  tag name, name of object, which need be allocated </param>
  private initInnerObjects(parser: XmlParser, foundTagName: string, tsk: Task): boolean {
    if (foundTagName === null)
      return false;

    switch (foundTagName) {
      case ConstInterface.MG_TAG_EVENT: {
        let evt: Event = new Event();
        evt.fillData(parser, tsk);
        this._userEventsTab.push(evt);
        break;
      }
      case ConstInterface.MG_TAG_USER_EVENTS:
        parser.setCurrIndex(parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex()) + 1);
        // end of outer tag and its ">"
        break;

      case ConstInterface.MG_TAG_USER_EVENTS_END:
        parser.setCurrIndex2EndOfTag();
        return false;

      default:
        Logger.Instance.WriteExceptionToLogWithMsg("There is no such tag in UserEventsTable.initInnerObjects : " + foundTagName);
        return false;
    }
    return true;
  }

  /// <summary>
  ///   get user event by its index in the vector
  /// </summary>
  /// <param name = "idx">the index of the requested event </param>
  getEvent(idx: number): Event {

    if (idx < 0 || this._userEventsTab === null || idx >= this._userEventsTab.length)
      return null;
    return this._userEventsTab.get_Item(idx);
  }

  /// <summary>
  ///   get idx of the event in the events table
  /// </summary>
  /// <param name = "event">to find its idx </param>
  getIdxByEvent(evt: Event): number {
    return this._userEventsTab.indexOf(evt);
  }

  /// <summary>
  ///   get size of the user events table
  /// </summary>
  getSize(): number {

    if (this._userEventsTab === null)
      return 0;
    return this._userEventsTab.length;
  }
}
