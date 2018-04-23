import {InternalInterface, Logger} from "@magic/utils";
import {HandlersTable} from "../rt/HandlersTable";
import {RunTimeEvent} from "./RunTimeEvent";
import {Task} from "../tasks/Task";
import {EventHandler} from "./EventHandler";
import {MGData} from "../tasks/MGData";
import {ClientManager} from "../ClientManager";
import {MGDataCollection} from "../tasks/MGDataCollection";
import {ConstInterface} from "../ConstInterface";

/// <summary>
///   an object of this class points to the position of an event handler in the
///   chain of the event handlers
/// </summary>
export class EventHandlerPosition {
  private static PHASE_CONTROL_SPECIFIC: number = 1;
  private static PHASE_CONTROL_NON_SPECIFIC: number = 2;
  private static PHASE_GLOBAL: number = 3;
  private static PHASE_GLOBAL_SPECIFIC: number = 4;

  private _handlerIdx: number = 0; // the index of the handler within the task
  private _handlersTab: HandlersTable = null;
  private _orgPrevTask: Task = null; // reference to the previous checked task
  private _orgTask: Task = null; // reference to the current checked task
  private _phase: number = 0; // the phase of the search: control specific, control non-specific, global
  private _prevTask: Task = null; // reference to the previous checked task
  private _rtEvt: RunTimeEvent = null; // the event
  private _task: Task = null; // reference to the current checked task

  ///   init the position to start a new chain of search
  init(rtEvent: RunTimeEvent): void {
    this._rtEvt = rtEvent;
    this._task = this._rtEvt.getTask();
    if (this._task.isMainProg()) {
      this._prevTask = this._rtEvt.getMainPrgCreator();
      if (this._prevTask !== null && this._prevTask.isMainProg())
        this._prevTask = null;
    }

    if (rtEvent.getType() === ConstInterface.EVENT_TYPE_USER_FUNC)
      this._phase = EventHandlerPosition.PHASE_CONTROL_NON_SPECIFIC;
    else {
      if (rtEvent.getType() === ConstInterface.EVENT_TYPE_USER_FUNC)
        this._phase = EventHandlerPosition.PHASE_CONTROL_NON_SPECIFIC;
      else
        this._phase = EventHandlerPosition.PHASE_CONTROL_SPECIFIC;
    }

    this._orgTask = this._task;
    this._orgPrevTask = this._prevTask;
    this._handlersTab = this._task.getHandlersTab();
    if (this._handlersTab === null) {
      this.goUpTaskChain();
    }

    this._handlerIdx = -1;
  }

  getNext(evt: RunTimeEvent): EventHandler;
  getNext(): EventHandler;
  getNext(evt?: RunTimeEvent): EventHandler {
    if (arguments.length === 1)
      return this.getNext_0(evt);
    else
      return this.getNext_1();
  }

  ///   changes the current run time event and returns the next event handler
  private getNext_0(evt: RunTimeEvent): EventHandler {
    this._rtEvt = evt;
    return this.getNext();
  }

  ///   returns the next event handler
  private getNext_1(): EventHandler {
    if (this._handlersTab === null)
      return null;

    let result: EventHandler;

    if (this._rtEvt.getType() === ConstInterface.EVENT_TYPE_INTERNAL && this._rtEvt.getInternalCode() !== InternalInterface.MG_ACT_VARIABLE) {
      // special treatment for TASK, RECORD and CONTROL level Prefix/Suffix events
      switch (this._rtEvt.getInternalCode()) {
        case InternalInterface.MG_ACT_TASK_PREFIX:
        case InternalInterface.MG_ACT_TASK_SUFFIX:
        case InternalInterface.MG_ACT_REC_PREFIX:
        case InternalInterface.MG_ACT_REC_SUFFIX:
        case InternalInterface.MG_ACT_CTRL_PREFIX:
        case InternalInterface.MG_ACT_CTRL_SUFFIX:
        case InternalInterface.MG_ACT_CTRL_VERIFICATION: {
          if (this._handlerIdx === -1) {
            for (this._handlerIdx = this._handlersTab.getSize() - 1; this._handlerIdx >= 0; this._handlerIdx--) {
              let handler: EventHandler = this._handlersTab.getHandler(this._handlerIdx);
              if (handler.isNonSpecificHandlerOf(this._rtEvt) || handler.isSpecificHandlerOf(this._rtEvt)) {
                return handler;
              }
            }
          }

          // an event handler was not found or was returned in a previous call to this method
          return null;
        }

        default:
          // other internal events should continue
          break;
      }
    }

    while (this.setNextHandlerIdx()) {
      let handler: EventHandler = this._handlersTab.getHandler(this._handlerIdx);
      switch (this._phase) {
        case EventHandlerPosition.PHASE_CONTROL_SPECIFIC:
          if (handler.isSpecificHandlerOf(this._rtEvt))
            return handler;
          continue;

        case EventHandlerPosition.PHASE_CONTROL_NON_SPECIFIC:
          if (handler.isNonSpecificHandlerOf(this._rtEvt))
            return handler;
          continue;

        case EventHandlerPosition.PHASE_GLOBAL_SPECIFIC:
          if (handler.isGlobalHandlerOf(this._rtEvt))
            return handler;
          continue;

        case EventHandlerPosition.PHASE_GLOBAL:
          if (handler.isGlobalSpecificHandlerOf(this._rtEvt))
            return handler;
          continue;

        default:
          Logger.Instance.WriteExceptionToLogWithMsg("in EventHandlerPosition.getNext() invalid phase: " + this._phase);
          break;
      }
    }

    return null;
  }

  ///   returns true if a next handler was found
  private setNextHandlerIdx(): boolean {

    // the handler idx is (-1) when starting to search in a task
    if (this._handlerIdx < 0)
      this._handlerIdx = this._handlersTab.getSize() - 1;
    else
      this._handlerIdx = this._handlerIdx - 1;

    if (this._handlerIdx < 0 || this._task.isAborting()) {
      // if there are no more handlers in the task then go up the chain of tasks
      if (this.goUpTaskChain())
        return this.setNextHandlerIdx();
      else // no more tasks in the chain
        return false;
    }

    return true;
  }

  ///   get the next task in the tasks chain and returns false if no task was found.
  ///   this function changes the phase variable accordingly
  private goUpTaskChain(): boolean {
    let mGData: MGData = this._task.getMGData();
    let ctlIdx: number = this._task.getCtlIdx();

    switch (this._phase) {
      case EventHandlerPosition.PHASE_CONTROL_SPECIFIC:
      case EventHandlerPosition.PHASE_CONTROL_NON_SPECIFIC: {
        // non specific handlers are searched till we hit our main program (inclusive)
        // afterwards we switch to global phase.
        if (!this._task.isMainProg()) {
          this.getParentOrCompMainPrg();
          break;
        }
        else {
          // internal, internal, system and user events may cross component bounderies
          if ((this._rtEvt.getType() === ConstInterface.EVENT_TYPE_PUBLIC ||
               this._rtEvt.getType() === ConstInterface.EVENT_TYPE_INTERNAL ||
               this._rtEvt.getType() === ConstInterface.EVENT_TYPE_SYSTEM ||
               this._rtEvt.getType() === ConstInterface.EVENT_TYPE_USER) && ctlIdx > 0) {
            // load the RT parent of the previous task. If no prevtask exists then we are
            // simply running on the main progs list (for example, when a main prg catches
            // a timer event, no prevtask exists.
            if (this._prevTask === null) {
              this._task = mGData.getNextMainProg(ctlIdx);
              if (this._task === null && ctlIdx > 0)
                this._task = MGDataCollection.Instance.GetMainProgByCtlIdx(ClientManager.Instance.EventsManager.getCompMainPrgTab().getCtlIdx(0));
            }
            else {
              // the component main program that was set in getParentOrCompMainPrg, is now replaced back to the path parent.
              this._task = this._prevTask.PathParentTask;
              this._prevTask = null;
            }
            this._rtEvt.setMainPrgCreator(null); // moving out of a main program to another task
            break;
          }

          if (this._phase === EventHandlerPosition.PHASE_CONTROL_SPECIFIC) {
            // specific search is over. start the non specific search from the first task.
            this._phase = EventHandlerPosition.PHASE_GLOBAL_SPECIFIC;
          }
          else {
            // here we scan the main progs according to the load sequence (first to last).
            this._phase = EventHandlerPosition.PHASE_GLOBAL;
          }

          this._task = MGDataCollection.Instance.GetMainProgByCtlIdx(ClientManager.Instance.EventsManager.getCompMainPrgTab().getCtlIdx(0));
          this._rtEvt.setMainPrgCreator(this._task);
          if (this._task === null)
            return false;
          break;
        }
      }
      case EventHandlerPosition.PHASE_GLOBAL_SPECIFIC:
      case EventHandlerPosition.PHASE_GLOBAL: {
        this._task = mGData.getNextMainProg(ctlIdx);
        if (this._task === null) {
          if (this._phase === EventHandlerPosition.PHASE_GLOBAL)
            return false;

          // specific search is over. start the non specific search from the first task.
          this._phase = EventHandlerPosition.PHASE_CONTROL_NON_SPECIFIC;
          this._task = this._orgTask;
          this._prevTask = this._orgPrevTask;
        }
        break;
      }
      default:
        Logger.Instance.WriteExceptionToLogWithMsg("in EventHandlerPosition.goUpTaskChain() invalid phase: " + this._phase);
        break;
    }
    if (this._task === null)
      return false;

    this._handlersTab = this._task.getHandlersTab();
    if (this._handlersTab === null)
      return this.goUpTaskChain();

    this._handlerIdx = -1;
    return true;
  }

  ///   if the current task and its parent are from different components then
  ///   set the task to the main program of the component of the current task.
  ///   otherwise, set the task to be the parent of the current task
  private getParentOrCompMainPrg(): void {
    let ctlIdx: number = this._task.getCtlIdx();
    this._prevTask = this._task;

    // Retrieve the task's calling-parent. We need the task who invoked the current task
    // rather than the task's triggering parent.
    // The Path Parent is the parent of that task as if the server had done build path. It is more logical to search using the trigger task tree
    // but since the online/server does not use the trigger tree, we decided not to use it here as well.
    // If the path parent is from a different comp, it means that between curr task and parent there should be a comp main prog.
    let pathParentTask: Task = this._task.PathParentTask;
    if (pathParentTask === null) {
      this._task = null;
      return;
    }

    // check if the parent task is from another component
    if (ctlIdx !== pathParentTask.getCtlIdx()) {
      // replace the parent task to search with the comp main program. later on, the main prog will be replaced with
      // the real PathParentTask.
      this._rtEvt.setMainPrgCreator(this._task);
      this._task = MGDataCollection.Instance.GetMainProgByCtlIdx(ctlIdx);
    }
    else {
      this._rtEvt.setMainPrgCreator(null);
      this._task = pathParentTask;
    }
  }
}
