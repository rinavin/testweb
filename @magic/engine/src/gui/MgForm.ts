import {
  Commands,
  CommandType,
  ControlTable,
  DataModificationTypes,
  GuiConstants,
  LastFocusedVal,
  Manager,
  MgControlBase,
  MgFormBase,
  NUM_TYPE,
  Property,
  PropInterface,
  Row,
  RuntimeContextBase,
  TaskBase
} from "@magic/gui";
import {
  Constants,
  InternalInterface,
  Logger,
  MgControlType,
  Misc,
  Priority,
  WindowType,
  XMLConstants,
  XmlParser
} from "@magic/utils";
import {ApplicationException, Debug, Exception, Int32, List, NString, RefParam, StringBuilder} from "@magic/mscorelib";
import {MgControl} from "./MgControl";
import {ClientManager} from "../ClientManager";
import {RecordOutOfDataViewException} from "../data/RecordOutOfDataViewException";
import {Field} from "../data/Field";
import {GUIManager} from "../GUIManager";
import {DataView, SET_DISPLAYLINE_BY_DV} from "../data/DataView";
import {Record} from "../data/Record";
import {Task, Task_Direction} from "../tasks/Task"
import {ServerError} from "../remote/ServerError";
import {MGData} from "../tasks/MGData";
import {MGDataCollection} from "../tasks/MGDataCollection";
import {ConstInterface} from "../ConstInterface";

/// <summary>
///   data for <form>...</form>
/// </summary>
export class MgForm extends MgFormBase {
  private static TIME_LIMIT: number = 50; // time limit for one transfer operation (in milli seconds)
  IsMovingInView: boolean = false;
  PrevDisplayLine: number = 0; // display identifier of prev line

  private _ctrlOrderHead: MgControl = null;
  private _ctrlOrderTail: MgControl = null;

  IgnoreFirstRecordCycle: boolean = false;
  MovedToFirstControl: boolean = false; // true when move to first control should be executed on the form

  private _recomputeTabOrder: string = '\0'; // If 'Y' this ownerTask has to rcmp tabbing
  private _suffixDone: boolean = false;

  private hiddenControlsIsnsList: List<number> = null;

  get InRestore(): boolean {
    return this._inRestore;
  }

  /// <summary>
  /// Get the task dataview, if the task exist
  /// </summary>
  /// <returns>the task dataview</returns>
  private GetDataview(): DataView {
    let dv: DataView = null;

    if (this._task != null)
      dv = <DataView>this._task.DataView;

    return (dv);
  }

  moveInView(unit: string, direction: string): void;
  moveInView(unit: string, direction: string, returnToCtrl: boolean): void;
  moveInView(unit: string, direction: string, returnToCtrl?: boolean): void {
    if (arguments.length === 2)
      this.moveInView_0(unit, direction);
    else
      this.moveInView_1(unit, direction, returnToCtrl);
  }

  /// <summary>
  ///   move one page/row up/down or to the beginning/end of table
  /// </summary>
  /// <param name = "unit">to move into</param>
  /// <param name = "Direction">of moving</param>
  private moveInView_0(unit: string, direction: string): void {
    this.moveInView(unit, direction, true);
  }

  /// <summary>
  ///   move one page/row up/down or to the beginning/end of table
  /// </summary>
  /// <param name = "unit">to move into</param>
  /// <param name = "Direction">of moving</param>
  /// <param name = "returnToCtrl">should the cursor return to the last parked control</param>
  private moveInView_1(unit: string, direction: string, returnToCtrl: boolean): void {
    let oldRecId: number = Int32.MinValue;
    let lastParkedCtrl: MgControl;
    let currRec: Record = <Record>this.GetDataview().getCurrRec();
    let oldTaskMode: string = ' ';
    let oldMoveByTab: boolean = ClientManager.Instance.setMoveByTab(false);
    let returnToVisibleLine: boolean = false;
    let recordOutOfView: boolean = false;
    let visibleLine: number = 0;

    try {
      this.IsMovingInView = true;
      let oldDisplayLine: number = this.DisplayLine;

      // table movements (first / last record)
      if (unit === Constants.MOVE_UNIT_TABLE) {
        try {
          // BEGINING OF TABLE
          if (direction === Constants.MOVE_DIRECTION_BEGIN) {
            this.GetDataview().setCurrRecByIdx(Constants.MG_DATAVIEW_FIRST_RECORD, true, false, true,
              SET_DISPLAYLINE_BY_DV);
            // check if there is a table in the form
            if (this.isLineMode()) {
              this.GetDataview().setTopRecIdx(0);
              this.setCurrRowByDisplayLine(0, false, false);
            }
          }
          // END OF TABLE
          else {
            this.GetDataview().setCurrRecByIdx(Constants.MG_DATAVIEW_LAST_RECORD, true, false, true,
              SET_DISPLAYLINE_BY_DV);
            // check if there is a table in the form
            if (this.isLineMode()) {
              this.GetDataview().setTopRecIdx(this.GetDataview().getCurrRecIdx() - this._rowsInPage + 1);
              if (this.GetDataview().getTopRecIdx() >= 0)
                this.setCurrRowByDisplayLine(this.GetDataview().getCurrRecIdx(), false, false);
              else {
                this.GetDataview().setTopRecIdx(0);
                this.setCurrRowByDisplayLine(this.GetDataview().getCurrRecIdx(), false, false);
              }
            }
          }
          this.updateDisplayLineByDV();

          this.RefreshDisplay(Constants.TASK_REFRESH_FORM);
        }
        catch (ex) {
          if (ex instanceof RecordOutOfDataViewException)
            Logger.Instance.WriteExceptionToLog(ex);
        }
      }
      // page and row movements
      else {
        this.getTopIndexFromGUI();
        // calculate the amount of records to skip
        let size: number;
        if (unit === Constants.MOVE_UNIT_PAGE && this.isLineMode()) {
          switch (direction) {
            case Constants.MOVE_DIRECTION_BEGIN:
              size = this.GetDataview().getCurrRecIdx() - this.GetDataview().getTopRecIdx();
              break;
            case Constants.MOVE_DIRECTION_END:

              let last: number = this.GetDataview().getTopRecIdx() + this._rowsInPage - 1;
              last = Math.min(last, this.GetDataview().getSize() - 1);
              size = last - this.GetDataview().getCurrRecIdx();
              break;
            default:
              returnToVisibleLine = true;
              size = this._rowsInPage;
              break;
          }
        }
        else
          size = 1;

        size = (direction === Constants.MOVE_DIRECTION_PREV ||
        direction === Constants.MOVE_DIRECTION_BEGIN
          ? -size
          : size);

        if (this.isLineMode()) {
          visibleLine = this.getVisibleLine();
          if (visibleLine < 0) {
            visibleLine = 0;
            recordOutOfView = true;
          }
          if (visibleLine > this._rowsInPage + 1) {
            visibleLine = this._rowsInPage;
            recordOutOfView = true;
          }
          // scrolling the table one page or one row up or down
          if (unit === Constants.MOVE_UNIT_PAGE &&
            (direction === Constants.MOVE_DIRECTION_NEXT ||
              direction === Constants.MOVE_DIRECTION_PREV) ||
            unit === Constants.MOVE_UNIT_ROW &&
            (direction === Constants.MOVE_DIRECTION_NEXT && visibleLine === this._rowsInPage - 1 ||
              direction === Constants.MOVE_DIRECTION_PREV && visibleLine === 0)) {
            // if we move to the previous row but we are at the first row of the table and data view
            // then do nothing
            if (direction === Constants.MOVE_DIRECTION_PREV &&
              (unit === Constants.MOVE_UNIT_ROW || unit === Constants.MOVE_UNIT_PAGE) &&
              visibleLine === 0 && this.GetDataview().getCurrRecIdx() === 0 && this.GetDataview().IncludesFirst())
              return;

            // if we move to the next row but we are at the last row of the table and the data view
            // then do nothing
            if (direction === Constants.MOVE_DIRECTION_NEXT && unit === Constants.MOVE_UNIT_PAGE &&
              visibleLine === this.getLastValidRow() && this.GetDataview().getCurrRecIdx() === this.GetDataview().getSize() - 1 && this.GetDataview().IncludesLast())
              return;

            oldRecId = this.GetDataview().getCurrRec().getId();
            this.GetDataview().setTopRecIdx(this.GetDataview().getTopRecIdx() + size);
            (<DataView>this.GetDataview()).setTopRecIdxModified(true);
            try {
              this._suffixDone = false;

              this.setCurrRowByDisplayLine(this.GetDataview().getCurrRecIdx() + size, true, false);
              (<DataView>this.GetDataview()).setTopRecIdxModified(false);
              this.RefreshDisplay(Constants.TASK_REFRESH_FORM);
            }
            catch (ex) {
              if (ex instanceof RecordOutOfDataViewException) {
                (<DataView>this.GetDataview()).setTopRecIdxModified(false);
                if (ClientManager.Instance.EventsManager.GetStopExecutionFlag()) {
                  (<DataView>this.GetDataview()).restoreTopRecIdx();
                  this.restoreOldDisplayLine(oldDisplayLine);
                  return;
                }
                if (this.GetDataview().getTopRecIdx() < 0) {
                  this.GetDataview().setTopRecIdx(0);
                  try {
                    this.setCurrRowByDisplayLine(0, true, false);
                  }
                  catch (exception) {
                    if (exception instanceof Exception) {
                      // QCR #995496: when the record suffix failed go back to the
                      // original row
                      if (ClientManager.Instance.EventsManager.GetStopExecutionFlag()) {
                        (<DataView>this.GetDataview()).restoreTopRecIdx();
                        this.restoreOldDisplayLine(oldDisplayLine);
                        return;
                      }
                    }
                  }
                  this.RefreshDisplay(Constants.TASK_REFRESH_FORM);
                }
                else if (unit !== Constants.MOVE_UNIT_ROW && (<DataView>this.GetDataview()).recExists(this.GetDataview().getTopRecIdx())) {
                  // QCR #992101: if we reached this point it means that the rec suffix
                  // wasn't executed so we must handle it before we go to a new row
                  let newRecId: number = this.GetDataview().getCurrRec().getId();
                  if (newRecId === oldRecId && !this._suffixDone)
                  // QCR 758639
                  {
                    ClientManager.Instance.EventsManager.handleInternalEventWithTask(this._task, InternalInterface.MG_ACT_REC_SUFFIX);
                    if (ClientManager.Instance.EventsManager.GetStopExecutionFlag()) {
                      (<DataView>this.GetDataview()).restoreTopRecIdx();
                      this.restoreOldDisplayLine(oldDisplayLine);
                      return;
                    }
                    try {
                      this.RefreshDisplay(Constants.TASK_REFRESH_FORM);
                      this.setCurrRowByDisplayLine(this.GetDataview().getTopRecIdx() + this.getLastValidRow(), false, true);
                    }
                    catch (Exception) {
                    }
                  }
                }
                else {
                  (<DataView>this.GetDataview()).restoreTopRecIdx();
                  this.restoreOldDisplayLine(oldDisplayLine);
                  if (unit === Constants.MOVE_UNIT_ROW && direction === Constants.MOVE_DIRECTION_NEXT) {
                    // non interactive, end of data means end of ownerTask, unless we are in create mode.
                    if (!this._task.IsInteractive && this._task.getMode() !== Constants.TASK_MODE_CREATE)
                      (<Task>this._task).setExecEndTask();
                    else
                      ClientManager.Instance.EventsManager.handleInternalEventWithTask(this._task, InternalInterface.MG_ACT_CRELINE);
                  }
                  return;
                }
                Logger.Instance.WriteExceptionToLog(ex);
              }
            }
          }
          // moving the marking one row up or down
          else {
            try {
              oldTaskMode = this._task.getMode();

              oldRecId = this.GetDataview().getCurrRec().getId();
              this.setCurrRowByDisplayLine(oldDisplayLine + size, true, false);

              // if the record was deleted in Run Time by Force Delete for example
              if (!(<DataView>this.GetDataview()).recExistsById(oldRecId)) {
                if (size > 0 || oldTaskMode !== Constants.TASK_MODE_CREATE)
                  if (size !== -1 || (<DataView>this.GetDataview()).recExists(oldDisplayLine))
                  // QCR #293668
                    this.setCurrRowByDisplayLine(oldDisplayLine, false, false);
                  else
                    Logger.Instance.WriteDevToLog(NString.Format("skipped setcurrRow for row {0}", oldDisplayLine));
                this.RefreshDisplay(Constants.TASK_REFRESH_FORM);
              }
              else if (ClientManager.Instance.EventsManager.GetStopExecutionFlag()) {
                // performance improvement: if everything is OK, curr rec will later be refreshed in
                // REC_PREFIX
                // thus, refresh only in case of error.
                this.RefreshDisplay(Constants.TASK_REFRESH_CURR_REC);
              }
            }
            catch (ex) {
              if (ex instanceof RecordOutOfDataViewException) {
                // Sometimes the error is because the old-rec was removed (cancelEdit'ed), so refresh form.
                if ((<DataView>this.GetDataview()).recExistsById(oldRecId)) {
                  this.restoreOldDisplayLine(oldDisplayLine);

                  // QCR #775309: if leaving the new created record failed then restore
                  // all the attributes of the a new record so the next action would
                  // "know" that it is still a new record.
                  // Defect # 81627 : If task is having a subform, then while moving to subform, newly created record
                  // is synced and it is inserted in _modifiedTab as 'insert' record. So, any request to server inserts
                  // record to server. Even if we dont go to server, it is there in _modifiedTab as new record. Inserting
                  // here already synced record causes insertion of record twice. So, If current record is not synced then only insert.

                  if (!currRec.Synced && oldTaskMode === Constants.TASK_MODE_CREATE) {
                    this._task.setMode(Constants.TASK_MODE_CREATE);
                    currRec.clearMode();
                    currRec.setMode(DataModificationTypes.Insert);
                    currRec.setNewRec();
                  }
                  // QCR #980528: Refresh the current row after cancel edit to reflect
                  // the restored values
                  this.RefreshDisplay(Constants.TASK_REFRESH_CURR_REC);
                  if (this._task.getLastParkedCtrl() != null)
                    Manager.SetSelect(this._task.getLastParkedCtrl());
                }
                else {
                  if (oldTaskMode === Constants.TASK_MODE_CREATE && oldDisplayLine > 0)
                    this.restoreOldDisplayLine(oldDisplayLine - 1);
                  this.RefreshDisplay(Constants.TASK_REFRESH_FORM);
                }
                if (size <= 0 || ClientManager.Instance.EventsManager.GetStopExecutionFlag())
                  Logger.Instance.WriteExceptionToLog(ex);
                else {
                  // non interactive, end of data means end of ownerTask, unless we are in create mode.
                  if (!this._task.IsInteractive && this._task.getMode() !== Constants.TASK_MODE_CREATE) {
                    (<Task>this._task).setExecEndTask();
                    return;
                  }
                  else {
                    if (this._task.ActionManager.isEnabled(InternalInterface.MG_ACT_CRELINE))
                      ClientManager.Instance.EventsManager.handleInternalEventWithTask(this._task, InternalInterface.MG_ACT_CRELINE);
                    else {
                      // fixed bug #:941763, while create isn't allowed need to do suffix and prefix of the current record
                      let doRecordSuffix: boolean = true;
                      let refdoRecordSuffix: RefParam<boolean> = new RefParam(doRecordSuffix);
                      if (!ClientManager.Instance.EventsManager.DoTaskLevelRecordSuffix(<Task>this._task, refdoRecordSuffix))
                        ClientManager.Instance.EventsManager.DoTaskLevelRecordPrefix(<Task>this._task, this, false);
                      doRecordSuffix = refdoRecordSuffix.value;
                    }
                  }
                }
                if (this._task.getLastParkedCtrl() != null)
                  Manager.SetSelect(this._task.getLastParkedCtrl()); // QCR 248681

                return;
              }
            }
          }
        }
        // if the form does not have a table, move to one row in the chosen Direction
        else {
          try {
            this.GetDataview().setCurrRecByIdx(this.GetDataview().getCurrRecIdx() + size, true, false, true, SET_DISPLAYLINE_BY_DV);
            this.RefreshDisplay(Constants.TASK_REFRESH_FORM);
          }
          catch (ex) {
            if (ex instanceof RecordOutOfDataViewException) {
              if (size > 0) {
                // non interactive, end of data means end of ownerTask, unless we are in create mode.
                if (!this._task.IsInteractive && this._task.getMode() !== Constants.TASK_MODE_CREATE)
                  (<Task>this._task).setExecEndTask();
                else
                  ClientManager.Instance.EventsManager.handleInternalEventWithTask(this._task, InternalInterface.MG_ACT_CRELINE);
              }
              else
                Logger.Instance.WriteExceptionToLog(ex);
              return;
            }
            else if (ex instanceof ServerError) {
              (<Task>this._task).stop();
              (<Task>this._task).abort();
              ClientManager.Instance.ProcessAbortingError(ex);
            }
            else if (ex instanceof Exception) {
              Logger.Instance.WriteExceptionToLogWithMsg(ex.Message);
              return;
            }
          }
        }
      }
      if (returnToVisibleLine) {
        if (recordOutOfView) {
          if (visibleLine === 0)
            this.GetDataview().setTopRecIdx(this.GetDataview().getCurrRecIdx());
          else
            this.GetDataview().setTopRecIdx(this.GetDataview().getCurrRecIdx() - this._rowsInPage);
          this.SetTableTopIndex();
        }
        else {
          this.SetTableTopIndex();
          this.setCurrRowByDisplayLine(this.GetDataview().getTopRecIdx() + visibleLine, false, true);
        }
      }
      else
        this.SetTableTopIndex();

      ClientManager.Instance.EventsManager.handleInternalEventWithTask(this._task, InternalInterface.MG_ACT_REC_PREFIX);

      if (returnToCtrl) {
        lastParkedCtrl = <MgControl>this._task.getLastParkedCtrl();
        if (lastParkedCtrl != null) {
          let cursorMoved: boolean = lastParkedCtrl.invoke();
          if (!cursorMoved) {
            cursorMoved = this.moveInRow(null, Constants.MOVE_DIRECTION_NEXT);
            if (!cursorMoved)
              ClientManager.Instance.EventsManager.HandleNonParkableControls(this._task);
          }
        }
      }
    }
    catch (e) {
      if (e instanceof RecordOutOfDataViewException) {
        Misc.WriteStackTrace(e);
      }
    }
    finally {
      ClientManager.Instance.setMoveByTab(oldMoveByTab);

      this.SelectRow();
      this.IsMovingInView = false;
    }
  }

  moveInRow(ctrl: MgControl, direction: string): boolean {
    let lastParkedControl: MgControl, clickedControl: MgControl;
    let nextCtrl: MgControl, prevCtrl: MgControl;
    let cursorMoved: boolean = false;

    this._task.setLastMoveInRowDirection(direction);

    lastParkedControl = <MgControl>this._task.getLastParkedCtrl();
    clickedControl = <MgControl>this._task.getClickedControl();
    if (lastParkedControl != null) {
      ClientManager.Instance.EventsManager.handleInternalEventWithMgControlBase(lastParkedControl, InternalInterface.MG_ACT_CTRL_SUFFIX);
      if (ClientManager.Instance.EventsManager.GetStopExecutionFlag()) {
        this._task.setLastMoveInRowDirection(Constants.MOVE_DIRECTION_NONE);
        return cursorMoved;
      }
    }
    else
      lastParkedControl = <MgControl>ClientManager.Instance.EventsManager.getStopExecutionCtrl();

    switch (direction) {
      case Constants.MOVE_DIRECTION_BEGIN:
        cursorMoved = this.moveToFirstParkableCtrl(ClientManager.Instance.MoveByTab);
        break;

      case Constants.MOVE_DIRECTION_END:
        cursorMoved = this.moveToLastParkbleCtrl(lastParkedControl);
        break;

      case Constants.MOVE_DIRECTION_PREV:
        if (ctrl != null && ctrl === clickedControl &&
          (!ctrl.IsParkable(false) || !ctrl.allowedParkRelatedToDirection())) {
          prevCtrl = this.getPrevControlToParkAccordingToTabbingCycle(ctrl);

          if (prevCtrl == null)
            ctrl = this.getNextControlToParkAccordingToTabbingCycle(ctrl);
          else
            ctrl = prevCtrl;

          if (ctrl != null)
            cursorMoved = ctrl.invoke(ClientManager.Instance.MoveByTab, true);
          break;
        }

        if (ctrl == null)
          ctrl = lastParkedControl;
        if (ctrl == null)
          break;

        cursorMoved =
          (this.moveToNextControlAccordingToTabbingCycle(ctrl, lastParkedControl, cursorMoved,
            Constants.MOVE_DIRECTION_PREV));
        break;

      case Constants.MOVE_DIRECTION_NEXT:
        if (ctrl !== null && ctrl === clickedControl &&
          (!ctrl.IsParkable(false) || !ctrl.allowedParkRelatedToDirection())) {
          nextCtrl = this.getNextControlToParkAccordingToTabbingCycle(ctrl);

          if (nextCtrl === null)
            ctrl = this.getPrevControlToParkAccordingToTabbingCycle(ctrl);
          else
            ctrl = nextCtrl;

          if (ctrl != null)
            cursorMoved = ctrl.invoke(ClientManager.Instance.MoveByTab, true);
          break;
        }

        if (ctrl === null)
          ctrl = lastParkedControl;

        if (ctrl === null)
          break;

        cursorMoved =
          (this.moveToNextControlAccordingToTabbingCycle(ctrl, lastParkedControl, cursorMoved,
            Constants.MOVE_DIRECTION_NEXT));
        break;

      default:
        Logger.Instance.WriteExceptionToLogWithMsg(NString.Format("in Form.moveInRow() illigal move direction: {0}", direction));
        this._task.setLastMoveInRowDirection(Constants.MOVE_DIRECTION_NONE);
        return cursorMoved;
    }
    if (!cursorMoved && lastParkedControl != null) {
      // we might have parked here, if Direction of all control have failed. So, while returning back to this ctrl allowdir must be ignored.
      lastParkedControl.IgnoreDirectionWhileParking = true;
      cursorMoved = lastParkedControl.invoke();
      lastParkedControl.IgnoreDirectionWhileParking = false;
    }

    this._task.setLastMoveInRowDirection(Constants.MOVE_DIRECTION_NONE);

    return cursorMoved;
  }

  /// <summary>
  ///  move to next control according to the ownerTask property Tabbing Cycle.
  /// </summary>
  /// <param name="currentCtrl"></param>
  /// <param name="lastParkedControl"></param>
  /// <param name="cursorMoved"></param>
  /// <param name="Direction"></param>
  private moveToNextControlAccordingToTabbingCycle(currentCtrl: MgControl, lastParkedControl: MgControl, cursorMoved: boolean, direction: string): boolean {
    let forceMoveToParent: boolean = this.checkForceMoveToParent(lastParkedControl);
    let moveToParentTask: boolean = this.isTabbingCycleMoveToParentTask();
    let remainInCurrentRecord: boolean = this.isTabbingCycleRemainInCurrentRecord();

    if (direction === Constants.MOVE_DIRECTION_NEXT)
      currentCtrl = this.getNextControlToParkAccordingToTabbingCycle(currentCtrl);
    else if (direction === Constants.MOVE_DIRECTION_PREV)
      currentCtrl = this.getPrevControlToParkAccordingToTabbingCycle(currentCtrl);
    else
      Debug.Assert(false);

    while (currentCtrl !== lastParkedControl) {
      // check for the end of the controls list
      if (currentCtrl == null) {
        if (moveToParentTask || forceMoveToParent || remainInCurrentRecord) {
          // for sub form while tabbingCycle="Move to parent ownerTask" we need to call this method by recursively
          currentCtrl = this.getFirstParkableCtrl();
          if (moveToParentTask || forceMoveToParent) {
            // if we get to the last control and it is subform, then we need to back to the parent
            if (this.isSubForm()) {
              // call this method again for the parent recursively
              cursorMoved = (<MgForm>this.getSubFormCtrl().getForm()).moveToNextControlAccordingToTabbingCycle(
                <MgControl>this.getSubFormCtrl(),
                lastParkedControl,
                cursorMoved, direction);
              // if we moved(succeeded) to control on the cycle control then we don't need to move again to other control
              // that came by the recursively method.
              if (cursorMoved)
                return cursorMoved;
            }
          }
          // get the prev control to be park on it
          if (currentCtrl != null)
            currentCtrl = currentCtrl.getControlToFocus();
        }
        else // moveToNextRecord
        {
          // MoveToNextRecord: we need to move to the next record in the ownerTask
          ClientManager.Instance.EventsManager.handleInternalEventWithTask(lastParkedControl.getForm().getTask(), InternalInterface.MG_ACT_CTRL_SUFFIX);
          if (!ClientManager.Instance.EventsManager.GetStopExecutionFlag()) {
            if (direction === Constants.MOVE_DIRECTION_NEXT) {
              // execute CV from lastparked control's next ctrl to the last control
              ClientManager.Instance.EventsManager.executeVerifyHandlersTillLastCtrl(lastParkedControl.getForm().getTask(), lastParkedControl);

              if (!ClientManager.Instance.EventsManager.GetStopExecutionFlag()) {
                // go to the beginning of the next row
                this.moveInView(Constants.MOVE_UNIT_ROW, Constants.MOVE_DIRECTION_NEXT, false);
                if (ClientManager.Instance.EventsManager.GetStopExecutionFlag())
                  return cursorMoved;

                // QCR#483721 curserMoved Must be changed if a parkable control was found in the current
                // row
                // if ownerTask is in create mode then CP is executed from createline in moveinview called above.
                if (this._task.getMode() === Constants.TASK_MODE_CREATE)
                  cursorMoved = true;
                else
                  cursorMoved = this.moveInRow(currentCtrl, Constants.MOVE_DIRECTION_BEGIN);
              }
            }
            else {
              // Shift+Tab is not allowed from the first parkable control. Hence, it is reset to first
              // parkable control.
              currentCtrl = this.getFirstParkableCtrl();
            }
            if (ClientManager.Instance.EventsManager.GetStopExecutionFlag())
              return cursorMoved;
          }
          break;
        }
      }
      let checkSubFormTabIntoProperty: boolean = lastParkedControl != null &&
        !lastParkedControl.onTheSameSubFormControl(currentCtrl);
      if (currentCtrl != null)
        cursorMoved = currentCtrl.invoke(ClientManager.Instance.MoveByTab, checkSubFormTabIntoProperty);

      if (cursorMoved)
        break;

      // QCR #781204, if currentCtrl is null - there is no parkable controls
      if (currentCtrl == null)
        return false;

      // QCR 745527 when looking for the next parkable control in the row we must avoid loops
      if (direction === Constants.MOVE_DIRECTION_NEXT) {
        if (currentCtrl !== lastParkedControl) {
          currentCtrl = currentCtrl.getNextCtrl();
          // when get to the end of the list (after pass all controls) we need to exit from the while.
          if (currentCtrl == null)
            break;
        }
      }
      else {
        if (currentCtrl !== lastParkedControl) {
          currentCtrl = currentCtrl.getPrevCtrl();
          // when get to the first of the list (after pass all controls) we need to exit from the while.
          if (currentCtrl == null)
            break;
        }
      }
    }
    return cursorMoved;
  }

  /// <summary>
  /// </summary>
  /// <param name = "lastParkedControl"></param>
  /// <returns></returns>
  private checkForceMoveToParent(lastParkedControl: MgControl): boolean {
    let forceMoveToParent: boolean = false;
    let LastControlIsNotParkOnSubForm: boolean = lastParkedControl !== null && super.isSubForm() && !lastParkedControl.IsParkable(true);

    if (LastControlIsNotParkOnSubForm) {
      let remainInCurrentRecord: boolean = this.isTabbingCycleRemainInCurrentRecord();
      let moveToNextRecord: boolean = this.isTabbingCycleMoveToNextRecord();

      if (remainInCurrentRecord || moveToNextRecord) {
        let prevMgControl: MgControl = this.getFirstParkableCtrl();
        if (prevMgControl === null)
          forceMoveToParent = true;
      }
    }
    return forceMoveToParent;
  }

  /// <summary>
  ///   set the value of the current field to be the same as the value of this field in the previous record
  /// </summary>
  ditto(): void {
    let currFld: Field = <Field> this._task.getCurrField();
    if (currFld == null)
      return;

    let val: string[] = this.GetDataview().getDitto(currFld);
    if (val !== null) {
      // value[1] is the real value of the field
      // value[0] is a null flag ("1" means a null value)
      currFld.setValueAndStartRecompute(val[1], val[0] === "1", true, true, false);
      currFld.updateDisplay();
    }
  }

  /// <summary>
  ///   add a record to the form and make it the current record
  /// </summary>
  addRec(doSuffix: boolean, parentLine: number, prevLine: number): void {
    let newLine: number = 1;
    let currLine: number = -1;

    if (!this._task.DataView.isEmptyDataview())
      currLine = this.getVisibleLine();

    let newRecIdx: number = (<DataView>this.GetDataview()).addRecord(doSuffix, false);

    if (newRecIdx > -1) {
      // forms with a table
      if (this.isLineMode()) {
        // there are no records in the table so the new row is created after
        // setting the top record to 0 and the current row to 0
        let newCurrRow: number;
        if (this.GetDataview().getSize() === 0 || this.GetDataview().getTopRecIdx() === Int32.MinValue) {
          this.GetDataview().setTopRecIdx(0);
          newCurrRow = 0;
        }
        // the cursor is parking on the last row of the displayed table so the
        // new row is created after incrementing the top record index
        else if (currLine === this._rowsInPage - 1) {
          this.GetDataview().setTopRecIdx(this.GetDataview().getTopRecIdx() + 1);
          newCurrRow = this.getVisibleLine();
        }
        // the new row is created without changing the top record
        else
          newCurrRow = currLine + 1;

        newLine = this.GetDataview().getTopRecIdx() + newCurrRow;

        // Increment the TotalRecordsCount as record being added into the view.
        if (this.isTableWithAbsoluteScrollbar())
          this.GetDataview().TotalRecordsCount += 1;

        // invalidates all records after newCurrRow
        this.removeRecordsAfterIdx(this.GetDataview().getTopRecIdx() + newCurrRow);

        try {
          // invalidates all records after newCurrRow
          if (!this._task.DataView.isEmptyDataview())
            this._task.setMode(Constants.TASK_MODE_CREATE);
          this.setCurrRowByDisplayLine(newLine, false, false);
        }
        catch (ex) {
          if (ex instanceof RecordOutOfDataViewException) {
            // no exception should really be caught here
            Logger.Instance.WriteExceptionToLogWithMsg(NString.Format("in Form.addRec() {0}", ex.Message));
          }
        }
        this.RefreshDisplay(Constants.TASK_REFRESH_TABLE);
      }
    }
  }

  /// <summary>
  ///   delete the current record
  /// </summary>
  delCurrRec(): void {
    let topTableRow: boolean = super.isLineMode() && this.GetDataview().getTopRecIdx() === this.GetDataview().getCurrRecIdx();

    this.GetDataview().removeCurrRec();

    if (this.GetDataview().isEmpty() && !(<Task>this._task).IsTryingToStop) {
      if (this._task.DataView.isEmptyDataview()) {
        this.addRec(false, 0, 0);
      }
      else {
        if (this._task.checkProp(PropInterface.PROP_TYPE_ALLOW_CREATE, true)) {
          // change to create mode
          if (this._task.getMode() !== Constants.TASK_MODE_CREATE)
            this._task.setMode(Constants.TASK_MODE_CREATE);

          // MG_ACT_CRELINE may be disabled .i.e. PROP_TYPE_ALLOW_CREATE expression can be changed
          (<Task>this._task).enableCreateActs(true);
          ClientManager.Instance.EventsManager.handleInternalEventWithTask(this._task, InternalInterface.MG_ACT_CRELINE);
        }
        // exit from the ownerTask
        else
          ClientManager.Instance.EventsManager.handleInternalEventWithTask(this._task, InternalInterface.MG_ACT_EXIT);
      }
    }

    // the emptiness of the DV must be checked again because the "create line" may fail
    if (!this.GetDataview().isEmpty()) {
      if (topTableRow)
        this.GetDataview().setTopRecIdx(this.GetDataview().getCurrRecIdx());

      if (super.isLineMode()) {
        if (super.HasTable()) {
          // Decrement the TotalRecordsCount as record being deleted.
          if (this.isTableWithAbsoluteScrollbar())
            this.GetDataview().TotalRecordsCount--;

          this.removeRecordsAfterIdx(this.GetDataview().getCurrRecIdx());
          this.RefreshDisplay(Constants.TASK_REFRESH_FORM);
        }
        else
          this.RefreshDisplay(Constants.TASK_REFRESH_CURR_REC);
      }
      // screen mode
      else {
        try {
          this.GetDataview().setCurrRecByIdx(this.GetDataview().getCurrRecIdx(), true, true, true, SET_DISPLAYLINE_BY_DV);
        }
        catch (ex) {
          if (ex instanceof RecordOutOfDataViewException) {
          }
          else
            throw ex;
        }
        this.RefreshDisplay(Constants.TASK_REFRESH_CURR_REC);
      }
    }
  }

  /// <summary>
  ///   cancel the editing of the current record and restore the old values of the fields
  /// </summary>
  /// <param name = "isActCancel">true if called for ACT_CANCEL, false otherwise</param>
  /// <param name = "isQuitEvent"></param>
  cancelEdit(isActCancel: boolean, isQuitEvent: boolean): void {
    let mode: string = this._task.getMode();
    let newMode: string;
    let row: number = 0;
    let execRecPrefix: boolean = false;

    // We return to create mode only if there is no record to go to after the cancel action
    if (this.GetDataview().getSize() === 1 && mode === Constants.TASK_MODE_CREATE)
      newMode = Constants.TASK_MODE_CREATE;
    else
      newMode = Constants.TASK_MODE_MODIFY;

    /**********************************************************************/
    // 997073 & 931021.
    // Expected behavior during cancel event, for a new record:
    // If the original ownerTask mode is not create, delete the new record and go back to the previous record.
    // If the original ownerTask mode is create, stay on the new record.

    // dv.cancelEdit() removes the new record under some condition.
    // So, in case of orgTaskMode=C, since we want to stay on the new record, we need to re-create a record.

    // But as said, dv.cancelEdit() removes the new record ONLY under some condition.
    // The condition is as follows:
    // The record is removed only if the dv size is greater than 1. So, if the dv size is 1, dv.cancelEdit()
    // does not remove the record and hence in this case, form.cancelEdit() should not create a new record.
    // For this reason, the signature of dv.cancelEdit() is changed to indicate whether the record was removed or not.

    // This is one part.

    // Now, after cancelEdit, RP has to be executed. This was done in EventsManager.commonHandler()->case MG_ACT_CANCEL.
    // But what happens is, if form.cancelEdit() created a new line, RP was already executed from there. And from
    // EventsManager.commonHandler(), RP is executed for the second time.
    // So, moved the code of executing RP from EventsManager.commonHandler()->case MG_ACT_CANCEL to form.cancelEdit()
    // and that will be done only if the create line was not executed.

    // Now, we have one more issue.

    // Until now, the RP was executed after form.cancelEdit().
    // So, when the code is moved to form.cancelEdit(), it should be the last thing to be executed.
    /**********************************************************************/

    let recRemoved: boolean = this.GetDataview().cancelEdit(false, false);
    this.GetDataview().setPrevCurrRec(null);
    if ((this.GetDataview().isEmpty() || ((isActCancel && recRemoved) && (<Task>this._task).getOriginalTaskMode() === Constants.TASK_MODE_CREATE)) && !(<Task>this._task).IsTryingToStop) {
      // Set Cancel indication on the task for to not perform control value validation in the Create line action.
      let orgCancelWasRaised: boolean = (<Task>this._task).cancelWasRaised();
      (<Task>this._task).setCancelWasRaised(isActCancel);
      ClientManager.Instance.EventsManager.handleInternalEventWithTask(this._task, InternalInterface.MG_ACT_CRELINE);
      (<Task>this._task).setCancelWasRaised(orgCancelWasRaised);
    }
    else if (isActCancel)
      execRecPrefix = true;

    // the emptiness of the DV must be checked again because the "create line" may fail
    if (!this.GetDataview().isEmpty()) {
      if (super.isLineMode()) {
        try {
          if (super.HasTable()) {
            row = this.getVisibleLine();
            if (row < 0 || row >= this._rowsInPage) {
              let topRecIdx: number = this.GetDataview().getTopRecIdx();
              let currRecIdx: number = this.GetDataview().getCurrRecIdx();
              if (topRecIdx > currRecIdx)
                this.GetDataview().setTopRecIdx(currRecIdx);
              row = 0;
            }
            this.setCurrRowByDisplayLine(this.GetDataview().getTopRecIdx() + row, false, true);
          }
        }
        catch (ex) {
          if (ex instanceof RecordOutOfDataViewException) {
            // no exception should really be caught here.
            if (row !== 0)
              Logger.Instance.WriteExceptionToLogWithMsg(NString.Format("in Form.cancelEdit() {0}", ex.Message));
          }
          else
            throw ex;
        }
        if (super.HasTable()) {
          this.removeRecordsAfterIdx(this.GetDataview().getCurrRecIdx());

          // Decrement the TotalRecordsCount as record being deleted.
          if (this.isTableWithAbsoluteScrollbar() && recRemoved)
            this.GetDataview().TotalRecordsCount--;
        }
      }
      // screen mode
      else {
        try {
          this.GetDataview().setCurrRecByIdx(this.GetDataview().getCurrRecIdx(), false, true, true, SET_DISPLAYLINE_BY_DV);
        }
        catch (ex) {
          if (ex instanceof RecordOutOfDataViewException) {
            Logger.Instance.WriteExceptionToLogWithMsg("in Form.cancelEdit() error in Screen mode for Current Record");
          }
          else
            throw ex;
        }
      }
      this._task.setMode(newMode);
      if (!(<Task>this._task).InEndTask)
        this.RefreshDisplay(Constants.TASK_REFRESH_FORM);

      if (!(<Task>this._task).InEndTask)
        this.RefreshDisplay(Constants.TASK_REFRESH_CURR_REC);
    }

    if (execRecPrefix) {
      // QCR #925646, #454167: exit to the ownerTask level in order to skip control suffix
      // and record suffix of the canceled new record and make sure that the
      // next record perfix would be executed
      this._task.setLevel(Constants.TASK_LEVEL_TASK);
      // we rollback a parent ownerTask while focused on subform/ownerTask. We do not want the ctrl on the subform to do ctrl suffix.
      let lastParkedCtrl: MgControl = GUIManager.getLastFocusedControl();
      if (lastParkedCtrl !== null) {
        if ((<Task>lastParkedCtrl.getForm().getTask()).pathContains(<Task>this._task))
          for (let parent = <Task>lastParkedCtrl.getForm().getTask();
               parent !== null && parent !== this._task;
               parent = <Task>parent.getParent()) {
            parent.setLevel(Constants.TASK_LEVEL_TASK);
            (<DataView>parent.DataView).getCurrRec().resetModified();
          }
        else
          lastParkedCtrl.getForm().getTask().setLevel(Constants.TASK_LEVEL_TASK);
      }
      if (!isQuitEvent) {
        ClientManager.Instance.EventsManager.handleInternalEventWithTask(this._task, InternalInterface.MG_ACT_REC_PREFIX);
        this._task.setCurrVerifyCtrl(null);
        (<MgForm>this._task.getForm()).moveInRow(null, Constants.MOVE_DIRECTION_BEGIN);
      }
    }
  }

  /// <summary>
  ///   return a url of the help for this form
  /// </summary>
  getHelpUrlProp(): Property {
    if (this._propTab === null)
      return null;

    let helpProp: Property = this._propTab.getPropById(PropInterface.PROP_TYPE_HELP_SCR);
    if (helpProp === null) {
      if (super.isSubForm()) {
        let parent: Task = (<Task>super.getTask()).getParent();
        if (parent !== null && parent.getForm() !== null)
          helpProp = (<MgForm>parent.getForm()).getHelpUrlProp();
      }
    }
    return helpProp;
  }

  /// <summary>
  ///   return a url of the help for this form
  /// </summary>
  getHelpUrl(): string {
    if (this._propTab == null)
      return null;

    let helpUrlProp: Property = this.getHelpUrlProp();
    if (helpUrlProp === null)
      return null;
    return helpUrlProp.GetComputedValue();
  }

  /// <summary>
  ///   scan all controls in the form. Every control which has a property that is an expression will be
  ///   refreshed. This is done to ensure the control's display is synched with the expressin's value
  /// </summary>
  refreshOnExpressions(): void {
    for (let i: number = 0; i < this.CtrlTab.getSize(); i = i + 1) {
      let mgControl: MgControl = ((this.CtrlTab.getCtrl(i) instanceof MgControl) ? <MgControl>this.CtrlTab.getCtrl(i) : null);

      if (mgControl != null)
        mgControl.refreshOnExpression();
      else
        Debug.Assert(false);
    }
    // refresh the form properties
    super.refreshPropsOnExpression();
  }

  /// <summary>
  ///   Call getFirstParkableCtrl to search also in subform.
  /// </summary>
  /// <returns></returns>
  getFirstParkableCtrl(): MgControl {
    return this.getFirstParkableCtrlIncludingSubform(true);
  }

  /// <summary>
  ///   Return the first parkable control. If the currCtrl is a subform then return the first parkable child
  ///   control of the subform (recursively).
  ///   if IncludingSubForm is false, do not look inside subform for the ctrl.
  /// </summary>
  getFirstParkableCtrlIncludingSubform(IncludingSubForm: boolean): MgControl {
    let currCtrl: MgControl = this._ctrlOrderHead;

    // QCR #316850. For subforms always enter into the loop for to find it's really first control.
    while (currCtrl !== null && (currCtrl.isSubform() || !currCtrl.IsParkable(false))) {
      if (IncludingSubForm) {
        if (currCtrl.isSubform() && currCtrl.getSubformTask() !== null)
          return (<MgForm>currCtrl.getSubformTask().getForm()).getFirstParkableCtrl();
      }
      currCtrl = currCtrl.getNextCtrl();
    }
    return currCtrl;
  }

  /// <summary>
  ///   return the next\prev control on which the cursor can park after\before the current control
  /// </summary>
  /// <param name = "currCtrl">the current control</param>
  /// <param name = "Next">True if get the next parkable control, otherwise return the prev parkable control</param>
  private getNextCtrlByDirection(currCtrl: MgControl, Next: boolean): MgControl {
    let parentControl: any = null;
    let ctrl: MgControl = currCtrl;
    if (currCtrl !== null)
      parentControl = currCtrl.getParent();

    let skippCtrl: boolean;
    do {
      skippCtrl = false;
      if (Next)
        currCtrl = currCtrl.getNextCtrl();
      else
        currCtrl = currCtrl.getPrevCtrl();

      if (currCtrl !== null && parentControl === currCtrl.getParent()) {
        // It is possible that .Net control will not have any field attached.
        if (currCtrl.getField() == null) {
          // do nothing. skippCtrl is already false.
        }
        // if controls have same data attached, it must be skipped
        else if (ctrl.getField() === currCtrl.getField())
          skippCtrl = true;
      }
    }
    while (skippCtrl || (currCtrl !== null && (!currCtrl.IsParkable(ClientManager.Instance.MoveByTab) || !currCtrl.allowedParkRelatedToDirection())));

    // fixed bug #:800951, 933525, 763887, 978023, 998172 ,get the focus control
    return (currCtrl !== null) ? currCtrl.getControlToFocus() : currCtrl;
  }

  /// <summary>
  ///   return the next control on which the cursor can park after the current control
  /// </summary>
  /// <param name = "currCtrl">the current control</param>
  getNextParkableCtrl(currCtrl: MgControl): MgControl {
    return this.getNextCtrlByDirection(currCtrl, true);
  }

  /// <summary>
  ///   return the prev control on which the cursor can park before the current control
  /// </summary>
  /// <param name = "currCtrl">the current control</param>
  getPrevParkableCtrl(currCtrl: MgControl): MgControl {
    return this.getNextCtrlByDirection(currCtrl, false);
  }

  /// <summary>
  ///   return the non subform control on the form which the cursor can park after
  ///   the current control in 'Direction'
  /// </summary>
  /// <param name = "currCtrl"></param>
  /// <param name = "Direction"></param>
  /// <returns></returns>
  getNextParkableNonSubformCtrl(currCtrl: MgControl, direction: Task_Direction): MgControl {
    do {
      currCtrl = this.getNextCtrlIgnoreSubforms(currCtrl, direction);
    }
    while (currCtrl !== null && !currCtrl.IsParkable(false));
    return currCtrl;
  }

  /// <summary>
  ///   combines the tabbing order of this form with its subforms
  /// </summary>
  /// <param name = "parentSubformCtrl">a reference to the subform control in the parent task of this subform ownerTask</param>
  combineTabbingOrder(parentSubformCtrl: MgControl): void {
    let ctrl: MgControlBase;
    let prevCtrl: MgControl, nextCtrl: MgControl;
    let subform: MgForm;
    let dynamicRecompute: boolean = false;
    let prop: Property;
    let i: number;

    // if tabbing order is static, and it was already calculated, no need to re-calculate it
    if (this._recomputeTabOrder !== 'N') {
      if (this._ctrlOrderHead === null)
        this.buildTabbingOrder();

      // if this task is a subform then combine its order list into its parent order list
      if (this._task.IsSubForm) {
        // no control in form in subform, remove this subfrom from tabbing order.
        if (this._ctrlOrderHead === null && this._ctrlOrderTail === null)
          MgForm.removeSubformFromTabbingOrder(parentSubformCtrl);
        else {
          prevCtrl = parentSubformCtrl.getPrevCtrl();
          nextCtrl = parentSubformCtrl.getNextCtrl();

          if (this._ctrlOrderHead !== null)
            this._ctrlOrderHead.setPrevCtrl(prevCtrl);
          if (this._ctrlOrderTail !== null)
            this._ctrlOrderTail.setNextCtrl(nextCtrl);
          if (prevCtrl !== null)
            prevCtrl.setNextCtrl(this._ctrlOrderHead);
          if (nextCtrl !== null)
            nextCtrl.setPrevCtrl(this._ctrlOrderTail);
        }
      }

      // scan this form controls and recursively combine their tabbing order list
      // into the unified list
      for (i = 0; i < this.CtrlTab.getSize(); i = i + 1) {
        ctrl = this.CtrlTab.getCtrl(i);
        if (ctrl.isSubform()) {
          if (ctrl.GetSubformMgForm() !== null) {
            subform = <MgForm>ctrl.GetSubformMgForm();
            subform.combineTabbingOrder(<MgControl>ctrl);
          }
          else
          // if subform doesn't contain a ownerTask, it must be removed from tabbing order
            MgForm.removeSubformFromTabbingOrder(<MgControl>ctrl);
        }
      }

      // If this is the first combine, check if there is any dynamic element in it, and mark it on the
      // the form. This way, the recompute tabbing order will be skipped for tasks in which it is static
      if (parentSubformCtrl === null && this._recomputeTabOrder === '\0') {
        ctrl = this._ctrlOrderHead;
        if (ctrl !== null) {
          if (ctrl.isSubform() && ctrl.GetSubformMgForm() !== null)
            ctrl = (<MgForm>ctrl.GetSubformMgForm())._ctrlOrderHead;
          while (ctrl !== null && !dynamicRecompute) {
            prop = ctrl.getProp(PropInterface.PROP_TYPE_TAB_ORDER);
            if (prop !== null && prop.isExpression())
              dynamicRecompute = true;

            if (ctrl === this._ctrlOrderTail)
              break;

            ctrl = (<MgControl>ctrl).getNextCtrl();
          }
          ctrl = this._ctrlOrderHead;
          if (ctrl.isSubform() && ctrl.checkProp(PropInterface.PROP_TYPE_TAB_IN, true) && ctrl.GetSubformMgForm() !== null)
            ctrl = (<MgForm>ctrl.GetSubformMgForm())._ctrlOrderHead;

          while (ctrl !== null) {
            (<MgForm>ctrl.getForm())._recomputeTabOrder = (dynamicRecompute ? 'Y' : 'N');

            if (ctrl === this._ctrlOrderTail)
              break;
            ctrl = (<MgControl>ctrl).getNextCtrl();
          }
        }
      }
    }
  }

  /// <summary>
  ///   remove the subform from tabbing order
  /// </summary>
  /// <param name = "subformCtrl"></param>
  private static removeSubformFromTabbingOrder(subformCtrl: MgControl): void {
    let prevCtrl: MgControl, nextCtrl: MgControl;

    Debug.Assert(subformCtrl.isSubform());

    prevCtrl = subformCtrl.getPrevCtrl();
    nextCtrl = subformCtrl.getNextCtrl();

    if (prevCtrl != null)
      prevCtrl.setNextCtrl(nextCtrl);
    if (nextCtrl != null)
      nextCtrl.setPrevCtrl(prevCtrl);
  }

  /// <summary>
  ///   Remove current form from its parents control tabbing order
  /// </summary>
  removeFromParentsTabbingOrder(): void {
    if (!this._task.IsSubForm)
      return;

    if (this._ctrlOrderHead !== null && this._ctrlOrderHead.getPrevCtrl() !== null) {
      let nextCtrl: MgControl = (this._ctrlOrderTail !== null) ? this._ctrlOrderTail.getNextCtrl() : null;
      this._ctrlOrderHead.getPrevCtrl().setNextCtrl(nextCtrl);
      this._ctrlOrderHead.setPrevCtrl(null);
    }

    if (this._ctrlOrderTail !== null && this._ctrlOrderTail.getNextCtrl() !== null) {
      let prevCtrl: MgControl = (this._ctrlOrderHead !== null) ? this._ctrlOrderHead.getPrevCtrl() : null;
      this._ctrlOrderTail.getNextCtrl().setPrevCtrl(prevCtrl);
      this._ctrlOrderTail.setNextCtrl(null);
    }
  }

  /// <summary>
  ///  This method is build the tabbing order for this form.
  ///  if this form is subform then it need to build the tabbing order from the topmost form and down.
  /// </summary>
  /// <param name = "first"></param>
  RecomputeTabbingOrder(first: boolean): void {
    // QCR #429987. Do not recompute tabbing order until task doesn't finish it's start process.
    // Because in offline tasks subform programs are loaded after the first record prefix of the parent,
    // and we need combine the subform tabbing order with the parent.

    if (!this.getTask().isStarted() || (<Task>this.getTask()).InStartProcess)
      return;

    let form = (this.getTask().IsSubForm ? <MgForm>this.getTask().getTopMostForm() : this);
    form.RecomputeTabbingOrderThisFormAndDown(first);
  }

  /// <summary>
  /// build the tabbing order from this form and all his subform
  /// </summary>
  /// <param name="first"></param>
  /// <returns></returns>
  private RecomputeTabbingOrderThisFormAndDown(first: boolean): void {
    if (!this.getTask().isStarted())
      return;

    // if this task starts the recompute cycle, then create a dummy control, which holds a reference to the
    // place where the current order-list was inserted into our ancestor's list.
    let tmpCtrl: MgControl;
    if (first && this.getTask().IsSubForm) {
      tmpCtrl = new MgControl();
      tmpCtrl.setPrevCtrl(this._ctrlOrderHead.getPrevCtrl());
      tmpCtrl.setNextCtrl(this._ctrlOrderTail.getNextCtrl());
    }
    else
      tmpCtrl = null;

    // build my order-list
    this.buildTabbingOrder();

    // build order-list of all my subforms (recursively)
    for (let i: number = 0; i < this.CtrlTab.getSize(); i++) {
      let ctrl = this.CtrlTab.getCtrl(i);
      if (ctrl.isSubform() && ctrl.GetSubformMgForm() != null) {
        let subform = <MgForm>ctrl.GetSubformMgForm();
        subform.RecomputeTabbingOrderThisFormAndDown(false);
      }
    }

    // The ownerTask on which the rcmp was initiated will combine the tabbing order of all its descendant subforms
    if (first)
      this.combineTabbingOrder(tmpCtrl);
  }

  /// <summary>
  ///   moves the cursor to the first parkable control in the task or in the subtree (i.e.: including subforms)
  /// </summary>
  /// <param name = "formFocus">if true and if no control found - focus on form</param>
  moveToFirstCtrl(moveByTab: boolean, formFocus: boolean): boolean {
    // try to park on the first parkable control
    let cursorMoved = this.moveToFirstParkableCtrl(moveByTab);

    // there is no where to park. error (till no parkable controls will be implemented).
    if (!cursorMoved && formFocus)
      ClientManager.Instance.EventsManager.HandleNonParkableControls(this._task);

    return cursorMoved;
  }

  /// <summary>
  ///   return first control that is not subform
  /// </summary>
  /// <returns></returns>
  getFirstNonSubformCtrl(): MgControl {
    let ctrl: MgControl = this._ctrlOrderHead;
    while (ctrl !== null && ctrl.isSubform()) {
      ctrl = ctrl.getNextCtrl();
    }
    return ctrl;
  }

  /// <summary>
  ///   return first parkable control that is not subform
  /// </summary>
  /// <returns></returns>
  getFirstParkNonSubformCtrl(): MgControl {
    let ctrl: MgControl = this._ctrlOrderHead;
    while (ctrl !== null && ctrl.isSubform() && !ctrl.IsParkable(true)) {
      ctrl = ctrl.getNextCtrl();
    }
    return ctrl;
  }

  /// <summary>
  ///   return Last parkable control that is not subform
  /// </summary>
  /// <returns></returns>
  getLastParkNonSubformCtrl(): MgControl {
    let ctrl: MgControl = this._ctrlOrderTail;
    while (ctrl !== null && ctrl.isSubform() && !ctrl.IsParkable(true))
      ctrl = ctrl.getPrevCtrl();

    return ctrl;
  }

  /// <summary>
  ///   moves the cursor to the first parkable control beginning at the given control
  /// </summary>
  /// <param name="moveByTab"></param>
  /// <returns></returns>
  private moveToFirstParkableCtrl(moveByTab: boolean): boolean {
    let cursorMoved: boolean = false;
    let parkableInfo: ParkableControlInfo = new ParkableControlInfo(this, Constants.MOVE_DIRECTION_BEGIN);
    let ctrl: MgControl = this.getParkableControlInSubTree(parkableInfo, ClientManager.Instance.MoveByTab);
    let leastFailedCtrl: MgControl = null; // ctrl to park incase no parkable ctrl

    while (ctrl !== null) {
      let parkCtrl: MgControl = ctrl.getControlToFocus();
      cursorMoved = parkCtrl.invoke(moveByTab, true);
      if (cursorMoved)
        break;

      if (ctrl.IsParkable(moveByTab) && !ctrl.allowedParkRelatedToDirection())
        leastFailedCtrl = ctrl;

      ctrl = ctrl.getNextCtrl();
    }

    if (!cursorMoved) {
      // if there is no parkable ctrl, find the last ctrl with Direction failed and park on it.
      if (leastFailedCtrl !== null) {
        leastFailedCtrl.IgnoreDirectionWhileParking = true;
        cursorMoved = leastFailedCtrl.invoke(moveByTab, true);
        leastFailedCtrl.IgnoreDirectionWhileParking = false;
      }
    }
    return cursorMoved;
  }

  private moveToLastParkbleCtrl(lastParkedControl: MgControl): boolean {
    let cursorMoved: boolean = false;
    let parkableInfo: ParkableControlInfo = new ParkableControlInfo(this, Constants.MOVE_DIRECTION_END);
    let ctrl: MgControl = this.getParkableControlInSubTree(parkableInfo, ClientManager.Instance.MoveByTab);

    while (ctrl != null) {
      let checkSubFormTabIntoProperty: boolean = !(lastParkedControl == null || lastParkedControl.onTheSameSubFormControl(ctrl));
      cursorMoved = ctrl.invoke(ClientManager.Instance.MoveByTab, checkSubFormTabIntoProperty);
      if (cursorMoved)
        break;
      ctrl = ctrl.getPrevCtrl();
    }

    return cursorMoved;
  }

  /// <summary>
  ///   remove references to the controls of this form
  /// </summary>
  removeRefsToCtrls(): void {
    // if last focused control was from this task - zero it.
    let lastFocusedControl: MgControl = GUIManager.getLastFocusedControl();
    if (lastFocusedControl !== null && lastFocusedControl.getForm() === this)
      GUIManager.setLastFocusedControl(<Task>this._task, null);

    super.removeRefsToCtrls();
  }

  /// <summary>
  ///   Return the control with a given name
  /// </summary>
  /// <param name = "ctrlName">the of the requested control</param>
  /// <returns> a reference to the control with the given name or null if does not exist</returns>
  getCtrlByCtrlName(ctrlName: string): MgControl {
    return <MgControl>this.CtrlTab.getCtrl(ctrlName);
  }

  /// <summary>
  ///   Return the subform control with the typed name from all parents
  /// </summary>
  /// <param name = "ctrlName"> the requested subform control</param>
  /// <returns>a reference to the control with the given name or null if does not exist</returns>
  getSubFormCtrlByName(ctrlName: string): MgControl {
    let guiParentTask: Task;
    let destSubForm: MgControl = null;

    for (guiParentTask = <Task>this._task;
         destSubForm === null && guiParentTask !== null && guiParentTask.getForm() !== null;
         guiParentTask = <Task>guiParentTask.getParent()) {
      destSubForm = <MgControl>guiParentTask.getForm().getCtrlByName(ctrlName, MgControlType.CTRL_TYPE_SUBFORM);
      if (destSubForm == null) {
        if (!guiParentTask.IsSubForm || NString.Equals( guiParentTask.getForm().getSubFormCtrl().Name, ctrlName, true ))
          break;
      }
    }

    return destSubForm;
  }

  /// <summary>
  ///   sets suffixDone parameter to true
  /// </summary>
  setSuffixDone(): void {
    this._suffixDone = true;
  }

  getDestinationRow(): number {
    return this._destTblRow;
  }

  /// <summary>
  ///   find the next control in the tabbing order, according to a requested Direction of movement. 1. if we try
  ///   to move back of the first control, null is returned. 2. if we try to move past the last control, and
  ///   record cycle is not allowed - null is returned. 3. However, if we can cycle then the first control will
  ///   be returned. 4. We rely on the fact that the tab-order head and tail belong to this task (not
  ///   Subforms/containers) but in between them, controls from other tasks might appear.
  /// </summary>
  /// <param name = "curr">control. We find the control adjacent to this one. Null represents the location prior to the first control.</param>
  /// <param name = "forward">do we move forward of backward</param>
  /// <returns> to the next control or null if we passed the edge of the record</returns>
  getNextTabCtrl(curr: MgControl, forward: boolean): MgControl {
    let cycleRecMain: boolean = this.isRecordCycle();
    let realTail: MgControl = this._ctrlOrderTail;
    let realHead: MgControl = this._ctrlOrderHead;

    while (realTail !== null && realTail.isSubform())
      realTail = realTail.getPrevCtrl();

    while (realHead !== null && realHead.isSubform())
      realHead = realHead.getNextCtrl();

    // what happens if we are positioned just before the first control
    if (curr === null) {
      if (forward)
        curr = this._ctrlOrderHead;
    }
    else if (curr === realTail && forward) {
      // Try to move past the end of record
      if (cycleRecMain)
        curr = realHead;
      else
        curr = null;
    }
    else if (curr === realHead && !forward)
    // try to move past the beginning of the record
    {
      curr = null;
    }
    else {
      if (forward)
        curr = curr.getNextCtrl();
      else
        curr = curr.getPrevCtrl();
    }
    return curr;
  }

  /// <summary>
  ///   return the last control in the tabbing order of this task.
  /// </summary>
  getLastTabbedCtrl(): MgControl {
    let ctrl: MgControl = this._ctrlOrderTail;
    while (ctrl.isSubform())
      ctrl = ctrl.getPrevCtrl();

    return ctrl;
  }

  /// <summary>
  ///   return the index of a control in the tabbing order. Note that we only search the tabbing order of this
  ///   ownerTask
  /// </summary>
  /// <param name = "dst">control to search for its index</param>
  /// <returns> -1 if control not found or index (starting from 0)</returns>
  ctrlTabOrderIdx(dst: MgControl): number {
    let idx: number = -1;
    let curr: MgControl, subFormCtrl: MgControl, lastSubFormCtrl: MgControl;

    if (dst === null)
      return idx;

    curr = this._ctrlOrderHead;

    // #710425 - if first ctrl is a subform, get the first ctrl in the subform. repeat until a ctrl is found
    while (curr !== null && curr.isSubform() && curr.getSubformTask() !== null)
      curr = (<MgForm>curr.getSubformTask().getForm())._ctrlOrderHead;

    lastSubFormCtrl = null;
    for (idx = 0; curr !== null && curr !== this._ctrlOrderTail && curr !== dst; curr = curr.getNextCtrl()) {
      subFormCtrl = <MgControl> curr.getForm().getSubFormCtrl();
      if (subFormCtrl != null && lastSubFormCtrl !== subFormCtrl && subFormCtrl.getForm().getTask() === this._task) {
        // increment on entering a new subform on the ownerTask
        idx++;
        lastSubFormCtrl = subFormCtrl;
      }
      else if (curr.getForm().getTask() === this._task)
        idx++;
    }

    // increment once more if dst ctrl is same as currCtrl
    if (curr === dst) {
      // for same ownerTask
      if (dst.getForm().getTask() === this._task)
        idx++;
      else {
        // #919560 - if currCtrl and destCtrl is the first ctrl on the subform, we haven't increment
        // for the new subform.
        subFormCtrl = <MgControl>curr.getForm().getSubFormCtrl();
        if (subFormCtrl !== null && (<MgForm>curr.getForm())._ctrlOrderHead === curr
          && curr.getPrevCtrl() != null && curr.getPrevCtrl().getForm().getTask() !== curr.getForm().getTask())
          idx++;
      }
    }

    // if dst is on parent form, and we have move down to nested subform 'curr' would not be equal
    // to ctrlOrderTail, in such a case we move past the last ctrl of innermost form and 'curr'
    // is null. In this case too, -1 should be returned.
    if (curr == null || (curr === this._ctrlOrderTail && curr !== dst))
      return -1;

    return idx;
  }

  setSubFormCtrl(subFormCtrl: MgControl): void {
    Debug.Assert(this._subFormCtrl === null && subFormCtrl !== null);
    this._subFormCtrl = subFormCtrl;
  }

  /// <summary>
  ///   returns a subform control that points to a task whose id is given in taskId
  /// </summary>
  /// <param name = "taskId">the id of requested subform ownerTask</param>
  getSubFormCtrlForTask(taskId: string): MgControl {
    let curr: MgControl = null;
    let parentCtrlTab: ControlTable;
    let guiParentForm: MgFormBase = null;
    let destSubForm: MgControl = null;

    for (guiParentForm = this; guiParentForm != null; guiParentForm = guiParentForm.ParentForm) {
      parentCtrlTab = guiParentForm.CtrlTab;
      for (let i: number = 0; i < parentCtrlTab.getSize(); i++) {
        curr = ((parentCtrlTab.getCtrl(i) instanceof MgControl) ? <MgControl>parentCtrlTab.getCtrl(i) : null);
        if (curr != null && curr.isSubform() && (curr.getSubformTaskId() != null))
          if (curr.getSubformTaskId() === taskId) {
            destSubForm = curr;
            break;
          }
      }

      if (destSubForm != null)
        break;
    }
    return destSubForm;
  }

  /// <summary>
  ///   rearranges tabbing order after table reorder event if form has automatic tabbing order
  /// </summary>
  /// <param name = "list"></param>
  applyTabOrderChangeAfterTableReorder(list: List<MgControlBase>): void {
    let num: NUM_TYPE = new NUM_TYPE();
    let tabOrderIdx: number = 0;

    for (let i: number = 0; i < list.length; i = i + 1) {
      // only those controls which have TabOrder property should be re-adjusted.
      let tabOrderProp: Property = list.get_Item(i).getProp(PropInterface.PROP_TYPE_TAB_ORDER);

      if (tabOrderProp == null)
        continue;

      num.NUM_4_LONG(this._firstTableTabOrder + tabOrderIdx++);
      list.get_Item(i).setProp(PropInterface.PROP_TYPE_TAB_ORDER, num.toXMLrecord());
    }
    this.resetRcmpTabOrder();
    this.RecomputeTabbingOrder(true);
  }

  /// <summary>
  ///   recreate records between idx and end of dataview
  /// </summary>
  /// <param name = "idx"></param>
  removeRecordsAfterIdx(idx: number): void {
    let removeAll: boolean = false;

    // in some cases invisible -1 row (that exist only for scrollbar effects) becomes visible.
    // To prevent this we'll remove all records. This will not cause perfromance problems since
    // we will add maximum rowInPage records more then we intended in the begining

    if (idx <= this._rowsInPage + 1 && this.GetDataview().getSize() > this._rowsInPage)
      idx = 0;
    if (idx === 0)
      removeAll = true;

    // invalidates all records after newCurrRow
    super.SetTableItemsCount(idx, removeAll);
    // updates table item's count
    this.setTableItemsCount(false);
  }

  /// <summary>
  ///   returns true if row is valid
  /// </summary>
  /// <param name = "idx"></param>
  /// <returns></returns>
  isRowValidated(idx: number): boolean {
    if (this.Rows.length <= idx || idx < 0)
      return false;
    let row = <Row>this.Rows.get_Item(idx);
    if (row == null)
      return false;
    return row.Created && row.Validated;
  }

  /// <summary>
  ///   runs in Worker thread when the thread is free and send to GUI thread controls data of all rows
  /// </summary>
  transferDataToGui(): void {
    let saveRowIdx: number = this.GetDataview().getCurrRecIdx();
    let maxTime: number = Misc.getSystemMilliseconds() + MgForm.TIME_LIMIT;
    let updated: boolean = false;
    let currentEditingControl: MgControlBase = super.getTask().CurrentEditingControl;

    try {
      let bkpRecord: Record = this.GetDataview().backupCurrent();
      // this limitation is needed so this request will never take too much time
      while (Misc.getSystemMilliseconds() < maxTime && this.RefreshRepeatableAllowed) {
        if (this._lastRowSent + 1 >= this.GetDataview().getSize()) {
          // all rows already sent
          break;
        }
        this._lastRowSent++;
        this.AllowedSubformRecompute = false;
        if (!this.isRowValidated(this._lastRowSent)) {
          // row needs to be sent
          // send row data
          super.checkAndCreateRow(this._lastRowSent);
          if (this._lastRowSent !== saveRowIdx) {
            super.getTask().CurrentEditingControl = null; // reset the flag
            // irrelevant for tree
            this.setCurrRowByDisplayLine(this._lastRowSent, false, true);
            super.refreshControls(true);
            updated = true;
          }
        }
        this.AllowedSubformRecompute = true;
      }
      // restore previous current record
      if (updated) {
        this.restoreBackup(saveRowIdx, bkpRecord);
        super.refreshControls(true);
        super.getTask().CurrentEditingControl = currentEditingControl; // set the flag to the original value
      }
    }
    catch (ex) {
      if (ex instanceof RecordOutOfDataViewException) {
        Logger.Instance.WriteWarningToLog(ex);
      }
      else
        throw ex;
    }
    this._transferingData = false;
    this.checkAndCreateRowsEvent();
  }

  /// <summary>
  ///   check if any rows need to be sent to GUI thread
  ///   if there are, puts event in event queue
  /// </summary>
  private checkAndCreateRowsEvent(): void {
    if (this._tableMgControl !== null && this.Opened && this.RefreshRepeatableAllowed) {
      let size: number = this.GetDataview().getSize();
      if (this._lastRowSent >= this.Rows.length) {
        // when we decrease size of rows array adjust lastRowSent
        this._lastRowSent = this.Rows.length - 1;
      }
      if (this._lastRowSent < size - 1 && !this._transferingData) {
        // there are rows to send and there is now request for rows yet
        // add request for rows
        ClientManager.Instance.EventsManager.addInternalEventWithCtrlAndCodeAndPriority(this._tableMgControl, InternalInterface.MG_ACT_DV_TO_GUI, Priority.LOWEST);
        this._transferingData = true;
      }
    }
  }

  /// <summary>
  ///   gets row data for the page
  /// </summary>
  /// <param name = "desiredTopIndex">desired top index if desiredTopIndex is Integer.MIN_VALUE, top index is cecieved form dv</param>
  /// <param name = "sendAll">if true, send all records, even if they are created and valid</param>
  /// <param name="lastFocusedVal"></param>
  setRowData(desiredTopIndex: number, sendAll: boolean, lastFocusedVal: LastFocusedVal): void {
    let saveRowIdx: number = this.GetDataview().getCurrRecIdx();
    let diff: number = 0;
    let getPrevChunk: boolean = false;
    let getNextChunk: boolean = false;
    let updated: boolean = false;

    if (desiredTopIndex !== Int32.MinValue) {
      if (desiredTopIndex < 0) {
        // this is request for line or page before current chunk
        // in this case the top index is always 0
        getPrevChunk = true;
        this.GetDataview().setTopRecIdx(0);
      }
      else if (desiredTopIndex + this._rowsInPage + 1 >= this.GetDataview().getSize())
      // pagedown or arrowdown at end of the dataview
        getNextChunk = true;
    }
    else
      desiredTopIndex = this.GetDataview().getTopRecIdx();

    let bkpRecord: Record = this.GetDataview().backupCurrent();

    this.AllowedSubformRecompute = false;
    let diffRef: RefParam<number> = new RefParam(diff);
    updated = this.refreshRows(desiredTopIndex, sendAll, saveRowIdx, diffRef);
    diff = diffRef.value;

    if ((getPrevChunk && diff !== 0) || getNextChunk) {
      // if diff != 0 a new chunk was brought to the begining of the dv
      // set top index to first requested index
      // if next chunk was brought, top index may also be updated
      this.GetDataview().setTopRecIdx(desiredTopIndex + diff);
      this.SetTableTopIndex();
      if (this._topIndexUpdated) {
        // if top index was updated in the setTableTopIndex - we might have rows that were not refreshed
        this._topIndexUpdated = false;
      }
    }

    this.AllowedSubformRecompute = true;

    if (updated) {
      // any row was updated
      // restore current record
      this.restoreBackup(saveRowIdx + diff, bkpRecord);
      super.refreshControls(true);
    }
    // ask table to refresh the page

    super.SelectRow();
    if (getPrevChunk) {
      let lastFocusedControl: MgControl = GUIManager.getLastFocusedControl();
      // check if this is focused
      if (lastFocusedControl !== null && lastFocusedControl.getParentTable() === this._tableMgControl) {
        if (lastFocusedVal !== null && lastFocusedControl === lastFocusedVal.guiMgControl && saveRowIdx === lastFocusedVal.Line) {
          // QCR #925367 need to restore value of edit control, since we did not save it anywere before the scroll
          Commands.addAsync(CommandType.PROP_SET_TEXT, lastFocusedControl, saveRowIdx + diff, lastFocusedVal.Val, 0);
        }
        Manager.SetFocus(lastFocusedControl, this.DisplayLine);
      }
      else {
        // previous chunk was brought, table items were distroyed and recteated,
        // update index of tmp editor
        Commands.addAsync(CommandType.UPDATE_TMP_EDITOR_INDEX, this._tableMgControl);
        Commands.addAsync(CommandType.REFRESH_TABLE, this._tableMgControl, 0, true);
      }
    }
    else if (updated)
      Commands.addAsync(CommandType.REFRESH_TABLE, this._tableMgControl, 0, true);
  }

  /// <summary>
  ///   refreshes rows in the page
  /// </summary>
  /// <param name = "desiredTopIndex"></param>
  /// <param name = "sendAll"></param>
  /// <param name = "saveRowIdx"></param>
  /// <param name = "diff"></param>
  /// <returns></returns>
  private refreshRows(desiredTopIndex: number, sendAll: boolean, saveRowIdx: number, diffRef: RefParam<number>): boolean {
    let index: number = 0;
    let updated: boolean = false;
    diffRef.value = 0;
    let orgIncludesFirst: boolean = this.GetDataview().IncludesFirst();
    let orgIncludesLast: boolean = this.GetDataview().IncludesLast();
    for (let i: number = 0; i < this._rowsInPage - 1; i++) {
      let idx: number = desiredTopIndex + i;
      let prevTopIdx: number = this.GetDataview().getTopRecIdx();
      try {
        // if we fail to get one record, we may succeed to get the next one
        index = idx + diffRef.value;
        if (!this.isRowValidated(idx) || sendAll) {
          if (index >= 0)
            super.checkAndCreateRow(index);

          if (saveRowIdx + diffRef.value !== index) { // not current line
            // irrelevant for tree
            this.setCurrRowByDisplayLine(index, false, true);
            super.refreshControls(true);
          }

          // if a new chunk is brought top index will be changed
          updated = true;
        }
      }
      catch (ex) {
        if (ex instanceof RecordOutOfDataViewException) {
          // creation of row failed, mark the row as not created
          if (super.isRowCreated(index))
            super.markRowNOTCreated(index);

          break;
        }
        else
          throw ex;
      }
      finally {
        // QCR #261055, even so required record may not be found, it is possible that a new chunk has been sent
        // and diff must be updated
        diffRef.value = diffRef.value + (this.GetDataview().getTopRecIdx() - prevTopIdx);
        prevTopIdx = this.GetDataview().getTopRecIdx();
        if (!updated && this.GetDataview().DataviewBoundriesAreChanged(orgIncludesFirst, orgIncludesLast))
          updated = true;

      }
    }
    return updated;
  }

  /// <summary>
  /// </summary>
  /// <returns> row in the page</returns>
  getVisibleLine(): number {
    let currRecIdx: number = 0;
    if (this.GetDataview().getCurrRecIdx() !== Int32.MinValue)
      currRecIdx = this.GetDataview().getCurrRecIdx();

    return currRecIdx - Math.max(this.GetDataview().getTopRecIdx(), 0);
  }

  /// <summary>
  ///   asserts that current record is in the view, if it is not on the page, adjusts top index, so that current
  ///   record will be on the visible page
  /// </summary>
  bringRecordToPage(): void {
    if (this._tableMgControl !== null && !this._task.DataView.isEmptyDataview()) {
      let topIndex: number = Commands.getTopIndex(this._tableMgControl);
      let currIdx: number = this.GetDataview().getCurrRecIdx();
      let newTopIndex: number = this._prevTopIndex = topIndex;
      if (topIndex > currIdx) {
        this._topIndexUpdated = true;
        newTopIndex = currIdx;
      }
      else if (topIndex + this._rowsInPage - 1 < currIdx) {
        this._topIndexUpdated = true;
        if (this._rowsInPage > 0)
          newTopIndex = currIdx - this._rowsInPage + 1;
        else
          newTopIndex = currIdx;
      }

      // set top index to be current line
      if (this.GetDataview().getTopRecIdx() !== newTopIndex || this._topIndexUpdated) {
        this.GetDataview().setTopRecIdx(newTopIndex);
        this.SetTableTopIndex();
        this.setRowData(Int32.MinValue, false, null);
        this._topIndexUpdated = false;
      }
    }
  }

  /// <summary>
  ///   invalidate table
  /// </summary>
  invalidateTable(): void {
    for (let i: number = 0; i < this.Rows.length; i++) {
      let row: Row = <Row>this.Rows.get_Item(i);
      if (row !== null)
        row.Validated = false;
    }
    if (this._tableMgControl !== null)
      Commands.addAsync(CommandType.INVALIDATE_TABLE, this._tableMgControl);

    this._lastRowSent = -1;
    this.checkAndCreateRowsEvent();
  }

  /// <summary>
  ///   resets recomputeTabOrder for Destination Subform call
  /// </summary>
  resetRcmpTabOrder(): void {
    this._recomputeTabOrder = '\0';
  }

  /// <summary>
  ///   change Tab control selection to next/previous
  /// </summary>
  /// <param name = "ctrl">current parked control</param>
  /// <param name = "Direction">next/previous</param>
  changeTabSelection(ctrl: MgControl, direction: string): void {
    let tabControl: MgControl = <MgControl>super.getTabControl(ctrl);
    if (tabControl !== null)
      tabControl.changeSelection(direction);
  }

  /**
   * get the next control to park on for next field event according to the task property: tabbing cycle
   *
   * when parking on the last control of the form and Tabbing cycle is:
   * ==========================================
   * "Remain In Current Record" or "Move To Next Record": return null
   * "Move To Parent Task":                               the next control in the list
   *
   * if there is no control then it return null.
   * @param currentCtrl : the current control.
   * @return the next control to park on it.
   */
  private getNextControlToParkAccordingToTabbingCycle(currentCtrl: MgControl): MgControl {
    let retNextControl: MgControl = this.getNextParkableCtrl(currentCtrl);
    let parkableInfo: ParkableControlInfo = new ParkableControlInfo(<MgForm>currentCtrl.getForm(), Constants.MOVE_DIRECTION_END);
    let lastParkbleControlByTab: MgControl = this.getParkableControlInSubTree(parkableInfo, true);
    let lastParkbleControlByClick: MgControl = this.getParkableControlInSubTree(parkableInfo, false);
    // if we on the last control in the current task (subform or root) it mean that we need to move
    // to the next control in the current form (and dowm)
    if ((currentCtrl === lastParkbleControlByTab || currentCtrl === lastParkbleControlByClick) && (this.isTabbingCycleRemainInCurrentRecord() || this.isTabbingCycleMoveToNextRecord()))
      retNextControl = null;
    return retNextControl;
  }

  /**
   * get the last parkable control in the current sub tree
   * @param Direction == MOVE_DIRECTION_END is return the last parkble control in the sub tree
   * @param Direction == MOVE_DIRECTION_BEGIN is return the first parkble control in the sub tree
   * @return
   */
  private getParkableControlInSubTree(parkableInfo: ParkableControlInfo, moveByTab: boolean): MgControl {
    let checkParkableControl: MgControl = null;
    if (parkableInfo.Direction === Constants.MOVE_DIRECTION_END)
      checkParkableControl = this._ctrlOrderTail;
    else if (parkableInfo.Direction === Constants.MOVE_DIRECTION_BEGIN)
      checkParkableControl = this._ctrlOrderHead;
    else
      Debug.Assert(false);

    if (checkParkableControl !== null) {
      // find the prev\next parkable control on the same sub tree
      while (checkParkableControl !== null && !parkableInfo.ParkableControlWasFound && checkParkableControl.isDescendent(parkableInfo.BaseForm)) {
        // QCR #438241. For a subform control check its parkability and parkability of all its controls.
        if (checkParkableControl.IsParkable(moveByTab)) {
          if (checkParkableControl.isSubform() && checkParkableControl.getSubformTask() !== null) {
            let subformParkableControl: MgControl = (<MgForm>checkParkableControl.getSubformTask().getForm()).getParkableControlInSubTree(parkableInfo, moveByTab);

            if (subformParkableControl !== null) {
              parkableInfo.ParkableControlWasFound = true;
              checkParkableControl = subformParkableControl;
            }
          }
          else {
            // mgValue.bool that say that we found the last parkable control on the sub tree
            parkableInfo.ParkableControlWasFound = true;
          }
        }
        if (!parkableInfo.ParkableControlWasFound) {
          if (parkableInfo.Direction === Constants.MOVE_DIRECTION_END)
            checkParkableControl = checkParkableControl.getPrevCtrl();
          else if (parkableInfo.Direction === Constants.MOVE_DIRECTION_BEGIN) {
            checkParkableControl = checkParkableControl.getNextCtrl();
          }
        }
      }
    }
    return checkParkableControl;
  }

  /**
   * get the prev control to park on for prev field event according to the task property: tabbing cycle
   *
   * when parking on the first control of the form and Tabbing cycle is:
   * ==========================================
   * "Remain In Current Record" or "Move To Next Record": return null
   * "Move To Parent Task":                               the prev control in the list
   *
   * if there is no control then it return null.
   * @param currentCtrl : the current control.
   * @return the next control to park on it.
   */
  private getPrevControlToParkAccordingToTabbingCycle(currentCtrl: MgControl): MgControl {
    let retPrevControl: MgControl = this.getPrevParkableCtrl(currentCtrl);
    let parkableInfo: ParkableControlInfo = new ParkableControlInfo(<MgForm>currentCtrl.getForm(), Constants.MOVE_DIRECTION_BEGIN);
    let FirstParkbleControlByTab: MgControl = this.getParkableControlInSubTree(parkableInfo, true);
    let FirstParkbleControlByClick: MgControl = this.getParkableControlInSubTree(parkableInfo, false);

    // if we on the first control in the current task (subform or root) it mean that we need to move
    // to the prev control in the current form (and dowm)
    if ((currentCtrl === FirstParkbleControlByTab || currentCtrl === FirstParkbleControlByClick) && (this.isTabbingCycleRemainInCurrentRecord() || this.isTabbingCycleMoveToNextRecord()))
      retPrevControl = null;

    return retPrevControl;
  }

  /// <summary>
  ///   get the prev control to be park on it(with not the same field)
  /// </summary>
  /// <param name = "control"></param>
  /// <returns></returns>
  getPrevControlToFocus(control: MgControl): MgControl {
    let retPrevControl: MgControl = control.getPrevCtrl();

    while (retPrevControl !== null && retPrevControl.getField() === control.getField())
      retPrevControl = retPrevControl.getPrevCtrl();

    return (retPrevControl === null) ? null : retPrevControl.getControlToFocus();
  }

  /// <summary>
  ///   return previous visible line
  /// </summary>
  /// <param name = "line"></param>
  /// <returns></returns>
  getPrevLine(line: number): number {
    return line - 1;
  }

  /// <summary>
  ///   get the default button control of the form, if exist, otherwise return NULL
  /// </summary>
  /// <returns></returns>
  getDefaultButton(checkVisibleEnable: boolean): MgControl {
    let defaultButton: MgControl = null;
    let prop: Property = super.getProp(PropInterface.PROP_TYPE_DEFAULT_BUTTON);
    if (prop !== null) {
      defaultButton = <MgControl>super.getCtrlByName(prop.getValue(), MgControlType.CTRL_TYPE_BUTTON);
      if (checkVisibleEnable && defaultButton !== null) {
        if (!defaultButton.isVisible() || !defaultButton.isEnabled())
          defaultButton = null;
      }
    }
    return defaultButton;
  }

  /**
   * the task is define as record cycle while the tabbing cycle is set to
   * remain in current record OR move to parent task
   * @return
   */
  isRecordCycle(): boolean {
    return this.isTabbingCycleRemainInCurrentRecord() || this.isTabbingCycleMoveToParentTask();
  }

  /**
   * return true is the task is define as cycle record that mean:
   * When the property TABBING CYCLE is set to "Move to parent task" :
   * pressing Tab (or raising a next field event) from the last parkable control in a task,
   * will move the caret to the next parkable control in the parent task.
   * This behavior is affective if the current task runs as a subfrom or a frame.
   * If the ownerTask is not running as a subfrom or a frame, the behavior will be as defined for the default value (?emain in current record..
   * This behavior is similar to the current RC task behavior.
   * it is the same as isCycleRecordMain
   */
  private isTabbingCycleMoveToParentTask(): boolean {
    let prop: Property = this._task.GetComputedProperty(PropInterface.PROP_TYPE_TABBING_CYCLE);
    return prop !== null && prop.GetComputedValue().charAt(0) === GuiConstants.TABBING_CYCLE_MOVE_TO_PARENT_TASK;
  }

  /**
   * When this new property is set to ?emain in current record. pressing Tab
   * (or raising a next field event) from the last parkable control in a task,
   * will move the caret to the first parkable control in the same record of the task.
   * This behavior is the same when the caret is positioned in a parent task or in a subfrom/frame task.
   * This behavior is similar to online ownerTask with ?ycle on record.?es.
   * @return
   */
  private isTabbingCycleRemainInCurrentRecord(): boolean {
    let prop: Property = this._task.GetComputedProperty(PropInterface.PROP_TYPE_TABBING_CYCLE);
    return prop !== null && prop.GetComputedValue().charAt(0) === GuiConstants.TABBING_CYCLE_REMAIN_IN_CURRENT_RECORD;
  }

  /**
   * When this new property is set to ?ove to next record. pressing Tab (
   * or raising a next field event) from the last parkable control in a task,
   * will move the caret to the first parkable control in the next record of the task.
   * Note: on modify mode, tabbing from the last control in the last record will open a new record.
   * This behavior is the same when the caret is positioned in a parent task or in a subfrom/frame task.
   * This behavior is similar to online task with ?ycle on record.?o.
   * @return
   */
  private isTabbingCycleMoveToNextRecord(): boolean {
    let prop: Property = this._task.GetComputedProperty(PropInterface.PROP_TYPE_TABBING_CYCLE);
    return prop !== null && prop.GetComputedValue().charAt(0) === GuiConstants.TABBING_CYCLE_MOVE_TO_NEXT_RECORD;
  }

  /// <summary>
  ///   returns the last non subform ctrl
  /// </summary>
  /// <returns></returns>
  getLastNonSubformCtrl(): MgControl {
    let firstCtrl: MgControl = this.getFirstNonSubformCtrl();
    let lastCtrl: MgControl = null;
    let currCtrl: MgControl = null;
    let subFormCtrl: MgControl = null;

    if (firstCtrl !== null) {
      lastCtrl = firstCtrl;
      currCtrl = firstCtrl.getNextCtrl();
      if (currCtrl !== null)
        subFormCtrl = <MgControl>currCtrl.getForm().getSubFormCtrl();
    }

    while (currCtrl !== null) {
      while (currCtrl !== null && subFormCtrl !== null && firstCtrl.onDiffForm(currCtrl)) {
        subFormCtrl = <MgControl>currCtrl.getForm().getSubFormCtrl();
        if (subFormCtrl !== null)
          currCtrl = subFormCtrl.getNextCtrl();
      }

      if (currCtrl !== null) {
        // #919260 - we should set lastCtrl only if currCtrl is not subform
        if (!currCtrl.isSubform() && lastCtrl.getForm().getTask() === currCtrl.getForm().getTask())
          lastCtrl = currCtrl;

        currCtrl = currCtrl.getNextCtrl();
        if (currCtrl !== null)
          subFormCtrl = <MgControl>currCtrl.getForm().getSubFormCtrl();
      }
    }

    return lastCtrl;
  }

  /// <summary>
  /// Depending on 'Direction', it returns next ctrl on the form ignoring subforms.
  ///   'ctrl' can be a ctrl inside a subformCtrl.
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "Direction"></param>
  /// <returns></returns>
  getNextCtrlIgnoreSubforms(ctrl: MgControl, direction: Task_Direction): MgControl {
    let firstCtrl: MgControl = this.getFirstNonSubformCtrl();
    let result: MgControl;
    let nextCtrl: MgControl;
    if (ctrl === null)
      return null;

    if (direction === Task_Direction.FORE)
      nextCtrl = ctrl.getNextCtrl();
    else
      nextCtrl = ctrl.getPrevCtrl();

    // #756675 - we should not exit if nextCtrl is on diff form as we need to find the next ctrl on this form.
    if (nextCtrl === null)
      return null;

    let nextNonSubformCtrl: MgControl = nextCtrl;

    if (firstCtrl.onDiffForm(nextNonSubformCtrl)) {
      let subformCtrl: MgControl = <MgControl>nextNonSubformCtrl.getForm().getSubFormCtrl();
      if (subformCtrl !== null) {
        nextNonSubformCtrl = subformCtrl;

        while (nextNonSubformCtrl !== null && nextNonSubformCtrl.isSubform()) {
          nextCtrl = (<MgForm>nextNonSubformCtrl.getForm()).getNextTabCtrl(nextNonSubformCtrl, direction === Task_Direction.FORE);

          if (nextCtrl !== null && firstCtrl.onDiffForm(nextCtrl)) {
            subformCtrl = <MgControl>nextCtrl.getForm().getSubFormCtrl();

            // finds subformCtrl on same form as firstCtrl
            while (subformCtrl !== null && firstCtrl.onDiffForm(subformCtrl))
              subformCtrl = <MgControl>subformCtrl.getForm().getSubFormCtrl();

            if (subformCtrl !== null)
              nextCtrl = subformCtrl;
            else
              nextCtrl = null;
          }
          nextNonSubformCtrl = nextCtrl;
        }
      }
    }
    else if (nextNonSubformCtrl.isSubform()) {
      while ((nextNonSubformCtrl = nextNonSubformCtrl.getNextCtrlOnDirection(direction)) !== null && nextNonSubformCtrl.isSubform()) {
      }
    }

    return nextNonSubformCtrl;
  }

  /// <summary>
  ///   This function clears the sort mark(delta) from the column.
  /// </summary>
  /// <param name = "clearSortMark"></param>
  clearTableColumnSortMark(clearSortMark: boolean): void {
    if (clearSortMark) {
      let table: MgControl = <MgControl>super.getTableCtrl();
      Commands.addAsync(CommandType.CLEAR_TABLE_COLUMNS_SORT_MARK, table);
    }
  }

  /// <summary>
  ///   update the display, the controls and their properties
  /// </summary>
  RefreshDisplay(refreshType: string): boolean {
    let task: Task = <Task>this._task;

    if (task.isAborting())
      return false;

    let currRec: Record = this.GetDataview().getCurrRec();

    // Take another approach to the solution of QCRs #984999, #933639 & #699821:
    // Now, the display would be refreshed only if the current record is NOT an old
    // record which is being computed. The result of this change is that during the
    // compute process of a record the display is not refreshed (which is good for us).
    // The display would be refreshed anyway AFTER the compute process is done.
    // (Ehud 21-MAY-2002)
    if (currRec !== null && currRec.InCompute && !currRec.isNewRec())
      return false;

    if (this._inRefreshDisp)
      return false;
    this._inRefreshDisp = true;

    try {
      if (refreshType === Constants.TASK_REFRESH_FORM || refreshType === Constants.TASK_REFRESH_TABLE) {
        // check if there is a table in the form and refresh it
        if (super.HasTable() && this.Opened)
          this.refreshTable();
      }

      if (refreshType === Constants.TASK_REFRESH_FORM || refreshType === Constants.TASK_REFRESH_CURR_REC) {
        if (refreshType === Constants.TASK_REFRESH_CURR_REC && super.hasTable()) {
          this.SetTableTopIndex();
          super.SelectRow();
        }
        // refresh the form properties
        super.refreshProps();
        // refresh the current record/Row
        super.refreshControls(false);
      }
    }
    catch (ex) {
      if (ex instanceof Exception) {
        Logger.Instance.WriteExceptionToLogWithMsg(NString.Format("{0} : {1} in task {2}", ex.GetType(), ex.Message, (<Task>super.getTask()).PreviouslyActiveTaskId));
      }
      else
        throw ex;
    }
    finally {
      this._inRefreshDisp = false;
    }

    // Signal we completed the first cycle of refreshing the form
    if (refreshType === Constants.TASK_REFRESH_CURR_REC && (!super.isLineMode() || this._tableRefreshed))
      this.FormRefreshed = true;

    return true;
  }

  public  RefreshUI(): void {
    if (!this.getTask().isMainProg() /*&& InitializationFinished*/) {
      Commands.addNoParameters(CommandType.REFRESH_TASK, this.getForm());
    }
  }

  /// <summary>
  ///   refresh forms with tables
  /// </summary>
  private refreshTable(): void {
    Logger.Instance.WriteGuiToLog("Start form.refreshTable()");
    // todo for now - always show all records
    // save the old current row
    this.updateDisplayLineByDV();
    let oldCurrRow: number = this.DisplayLine;
    let currRecIdx: number = this.GetDataview().getCurrRecIdx();

    // For the first time we refresh the table - set curr-row and top-rec-idx to be the
    // ones requested by the dataview.
    // In the following table refreshes - we change curr-row and top-rec only if the table
    // becomes empty.
    if (!this._tableRefreshed && currRecIdx >= 0) {
      oldCurrRow = this.GetDataview().getCurrRecIdx();

      (this._tableMgControl.getProp(PropInterface.PROP_TYPE_HEIGHT)).RefreshDisplay(false);

      if (oldCurrRow + 1 > this._rowsInPage)
        this.GetDataview().setTopRecIdx(oldCurrRow - Math.floor(this._rowsInPage / 2) + 1);

      else
        this.GetDataview().setTopRecIdx(0);
    }
    else {
      if (oldCurrRow === Int32.MinValue)
        oldCurrRow = 0;

      if (this.GetDataview().getTopRecIdx() === Int32.MinValue)
        this.GetDataview().setTopRecIdx(currRecIdx);
    }

    // When TopRecIdx < 0 it means we shold not continue the refresh since we are in temporary situation.
    // Another refresh will be done soon with correct values.
    // This is can happen when :
    // In fetchChunkFromServer we go to the server and the client expects new records.
    // While in the process of fetchingChunk, we might go again to the server, before the server sends us the chunk.
    // Going to the server in the get chunk process , can be for example: record suffix, or any server side op in rec suff or VC.
    // Usually, during this part, we do not refresh the table.
    // But, for example in QCR #698217, a call was made to refreshTable with TopRecIdx == -1.
    // The reason was, that in the VC there was a server op that updated a var in the task. As a result, the 'modi' flag
    // from the server was on, which caused the "temp" refreshTable before the real chunk arrived.
    // This in turn caused a change in the curr rec id, which was wrong.
    // After the chunk arrives, the refresh sets the correct values.
    if (this.GetDataview().getTopRecIdx() < 0)
      return;

    oldCurrRow = oldCurrRow - this.GetDataview().getTopRecIdx(); // save oldCurrRow relatively to the top index
    let bkpRecord: Record = this.GetDataview().backupCurrent();
    this._tableRefreshed = true;
    this.AllowedSubformRecompute = false;
    // QCR #998067, we must not refresh subforms for any rows that are not our real current row

    // refresh all the rows BUT not the old current row
    for (let i: number = 0; i < this._rowsInPage - 1; i++) {
      // when there is no record for a row just disable it and vice versa
      let topIndex: number = this.GetDataview().getTopRecIdx();
      if (topIndex < 0) {
        this.GetDataview().setTopRecIdx(0);
        topIndex = 0;
      }
      let idx: number = topIndex + i;
      try {
        super.checkAndCreateRow(idx);

        // skip the old current row. the refresh for this row is done by the caller
        // and refresh only valid lines that were not disabled
        if (i !== oldCurrRow) {
          this.setCurrRowByDisplayLine(idx, false, true);
          super.refreshControls(true);
        }
      }
      catch (ex) {
        if (ex.name == "RecordOutOfDataViewException") {
          // creation of row failed, mark the row as not created
          if (super.isRowCreated(idx))
            super.markRowNOTCreated(idx);
          break;
        }
        else
          throw ex;
      }
    }
    this.AllowedSubformRecompute = true;
    this.restoreBackup(oldCurrRow + this.GetDataview().getTopRecIdx(), bkpRecord);
    super.refreshControls(true);
    this.RefreshUI();
    Logger.Instance.WriteGuiToLog("End form.refreshTable()");

  }

  /// <summary>
  ///   set display line by record line
  /// </summary>
  updateDisplayLineByDV(): void {
    this.DisplayLine = this.recordIdx2DisplayLine(this.GetDataview().getCurrRecIdx());
  }

  /// <summary>
  ///   set the current row
  /// </summary>
  /// <param name = "displayLine">is the new current display line</param>
  /// <param name = "doSuffix">do the record suffix for the previous record</param>
  /// <param name = "ignoreCurrRec">do the actions as if there is no current record</param>
  setCurrRowByDisplayLine(displayLine: number, doSuffix: boolean, ignoreCurrRec: boolean): void {
    let recIdx: number = this.displayLine2RecordIdx(displayLine);
    this.setCurrRowByRecIdx(recIdx, doSuffix, ignoreCurrRec, displayLine);
    if (super.HasTable())
      this.updateDisplayLineByDV();
    else
      this.DisplayLine = displayLine;
  }

  /// <summary>
  ///   set the current row
  /// </summary>
  /// <param name = "rowNum">is the new current row number</param>
  /// <param name = "doSuffix">do the record suffix for the previous record</param>
  /// <param name = "ignoreCurrRec">do the actions as if there is no current record</param>
  private setCurrRowByRecIdx(rowNum: number, doSuffix: boolean, ignoreCurrRec: boolean, displayLine: number): void {
    if (this.GetDataview() === null || (!super.hasTable() && rowNum !== 0))
      throw new ApplicationException("in Form.setCurrRow() no table ");

    try {
      this._destTblRow = rowNum;
      this.GetDataview().setCurrRecByIdx(rowNum, doSuffix, ignoreCurrRec, true, displayLine);
    }
    finally {
      this._destTblRow = rowNum - this.GetDataview().getTopRecIdx();
    }
  }

  /// <summary>
  ///   returns the last valid row in the table
  /// </summary>
  getLastValidRow(): number {
    return Math.min(this._rowsInPage - 1, this.GetDataview().getSize() - 1 - this.GetDataview().getTopRecIdx());
  }

  /// <summary>
  ///   translate record line to display line
  /// </summary>
  /// <param name = "recIdx"></param>
  /// <returns></returns>
  recordIdx2DisplayLine(recIdx: number): number {
    return recIdx;
  }

  /// <summary>
  ///   translate display line to record line
  /// </summary>
  /// <param name = "displayLine"></param>
  /// <returns></returns>
  displayLine2RecordIdx(displayLine: number): number {
    return displayLine;
  }

  /// <summary>
  ///   restore the old current row using the parameter and ignoring any exception
  /// </summary>
  /// <param name = "displayLine">the old current row number to be restored</param>
  restoreOldDisplayLine(displayLine: number): void {
    try {
      this._inRestore = true;
      this.setCurrRowByDisplayLine(displayLine, false, true);
    }
    catch (ex) {
      if (ex instanceof RecordOutOfDataViewException) {
      }
      else
        throw ex;
    }
    finally {
      this._inRestore = false;
    }
  }

  /// <summary>
  ///   gets record from gui level
  /// </summary>
  getTopIndexFromGUI(): number {
    let topDisplayLine: number = super.getTopIndexFromGUI();

    if (super.hasTable())
      this.GetDataview().setTopRecIdx(this.displayLine2RecordIdx(topDisplayLine));

    return topDisplayLine;
  }

  /// <summary>
  /// returns the current record position in the form.
  /// </summary>
  /// <returns></returns>
  getCurrRecPosInForm(): number {
    // when the selected record is outside the view, topIndex and DisplayLine will be 0
    // resulting in currRecPosInForm == 1
    let topDisplayLine: number = super.getTopIndexFromGUI();
    return this.DisplayLine - topDisplayLine + 1;
  }

  /// <summary>
  ///   restores current record
  /// </summary>
  /// <param name = "oldDisplayLine">old current record idx</param>
  /// <param name = "bkpRecord">saved record</param>
  restoreBackup(oldDisplayLine: number, bkpRecord: Record): void {
    // QCR #942878, if record is in process of insert, delete or modify we must perform restoreOldCurrRow
    // that will perform all necessary actions for the record, otherwise we can just restore it from backup
    if (bkpRecord.getId() >= 0 && this.GetDataview().getRecIdx(bkpRecord.getId()) >= 0 && oldDisplayLine >= 0 && oldDisplayLine < this.GetDataview().getSize() && this.GetDataview().getCurrRecIdx() >= 0 && bkpRecord.getMode() === DataModificationTypes.None) {
      this.GetDataview().restoreCurrent(bkpRecord);
      this.updateDisplayLineByDV();
    }
    else
      this.restoreOldDisplayLine(oldDisplayLine);
  }


  /// <summary>
  ///   build the controls tabbing order of this form
  /// </summary>
  buildTabbingOrder(): void {
    // if tabbing order is static, and it was already calculated, no need to re-calculate it
    if (this._recomputeTabOrder !== 'N') {
      // make sure that the head & tail are null
      this._ctrlOrderHead = null;
      this._ctrlOrderTail = null;

      // create a temp arrayList to hold the controls
      let ctrlArray: List<MgControlBase> = new List<MgControlBase>();

      // get the sorted ctrls based on tab order property
      this.getSortedControls(ctrlArray);

      if (super.isSubForm()) {
        let parentForm: MgFormBase = super.getTopMostForm();
        // QCR #241403 If tabbing order of any subform is changed, topmostform must combine Tabbing Order again
        (<MgForm>parentForm)._recomputeTabOrder = 'Y';
      }

      // loop on the sorted array and build a list of controls. Only controls which have a field from the
      // current task, or subform controls into which we are tabbing into, will be added to the list.
      for (let i: number = 0; i < ctrlArray.length; i++) {
        let ctrl: MgControl = <MgControl>ctrlArray.get_Item(i);
        if (!ctrl.isStatic() && !ctrl.isFrameSet()) {
          if (this._ctrlOrderHead === null) {
            this._ctrlOrderHead = (this._ctrlOrderTail = ctrl);
            this._ctrlOrderHead.setNextCtrl(null);
            this._ctrlOrderTail.setPrevCtrl(null);
          }
          else {
            this._ctrlOrderTail.setNextCtrl(ctrl);
            ctrl.setPrevCtrl(this._ctrlOrderTail);
            this._ctrlOrderTail = ctrl;
            this._ctrlOrderTail.setNextCtrl(null);
          }
        }
      }
    }
  }

  /// <summary>
  ///   return the sorted ctrls based on tab order property
  /// </summary>
  /// <param name = "ctrlArray">outParam to hold the sortedCtrlArray</param>
  private getSortedControls(ctrlArray: List<MgControlBase>): void {
    for (let i: number = 0; i < this.CtrlTab.getSize(); i = i + 1) {
      let ctrlToSort: MgControlBase = this.CtrlTab.getCtrl(i);

      if (ctrlToSort === null)
        continue;

      // only ctrls with taborder property other than label, group should be included in list
      let ctrlToSortProp: Property = ctrlToSort.getProp(PropInterface.PROP_TYPE_TAB_ORDER);
      if (ctrlToSortProp == null)
        continue;


      let ctrlToSortPropVal: number = ctrlToSortProp.getValueInt();
      let insertPos: number = 0;

      // Find the position of insertion in sortedList
      for (let sortArrayIdx: number = 0; sortArrayIdx < ctrlArray.length; sortArrayIdx++) {
        let sortedCtrl: MgControlBase = ctrlArray.get_Item(sortArrayIdx);
        let sortedCtrlProp: Property = sortedCtrl.getProp(PropInterface.PROP_TYPE_TAB_ORDER);
        let sortedCtrlPropVal: number = sortedCtrlProp.getValueInt();

        if (ctrlToSortPropVal === sortedCtrlPropVal) {
          // if ctrlToSort is an Exp and sortedCtrl in not an Exp, we need to shift sortedCtrl.
          // OtherWise, we need to insert after sortedCtrl
          insertPos = ((ctrlToSortProp.isExpression() && !sortedCtrlProp.isExpression()) ? sortArrayIdx : (sortArrayIdx + 1));
        }
        else if (ctrlToSortPropVal > sortedCtrlPropVal)
          insertPos = sortArrayIdx + 1;
      }

      // append an entry
      ctrlArray.Insert(insertPos, ctrlToSort);
    }
  }


  ConstructMgControl(): MgControlBase;
  ConstructMgControl(type: MgControlType, task: TaskBase, parentControl: number): MgControlBase;
  ConstructMgControl(type: MgControlType, parentMgForm: MgFormBase, parentControlIdx: number): MgControlBase;
  ConstructMgControl(type?: MgControlType, taskOrParentMgForm?: any, parentControlOrParentControlIdx?: number): MgControlBase {
    if (arguments.length === 0) {
      return this.ConstructMgControl_0();
    }
    if (arguments.length === 3 && (type === null || type.constructor === Number) && (taskOrParentMgForm === null || taskOrParentMgForm instanceof TaskBase) && (parentControlOrParentControlIdx === null || parentControlOrParentControlIdx.constructor === Number)) {
      return this.ConstructMgControl_1(type, taskOrParentMgForm, parentControlOrParentControlIdx);
    }
    return this.ConstructMgControl_2(type, taskOrParentMgForm, parentControlOrParentControlIdx);
  }

  /// <summary>
  /// constructs an object of MgControl
  /// </summary>
  /// <returns></returns>
  private ConstructMgControl_0(): MgControlBase {
    return new MgControl();
  }

  /// <summary>
  /// constructs an object of MgControl
  /// </summary>
  /// <param name="type"></param>
  /// <param name="task"></param>
  /// <param name="parentControl"></param>
  /// <returns></returns>
  private ConstructMgControl_1(type: MgControlType, task: TaskBase, parentControl: number): MgControlBase {
    return new MgControl(type, <Task>task, parentControl);
  }

  /// <summary>constructs an object of MgControl</summary>
  /// <param name="type"></param>
  /// <param name="parentMgForm"></param>
  /// <param name="parentControlIdx"></param>
  /// <returns></returns>
  private ConstructMgControl_2(type: MgControlType, parentMgForm: MgFormBase, parentControlIdx: number): MgControlBase {
    return new MgControl(type, parentMgForm, parentControlIdx);
  }

  /// <summary>
  ///   Returns true if already moved to the first control on one of the MgData
  /// </summary>
  alreadyMovedToFirstControl(): boolean {
    return (<Task>this._task).getMGData().AlreadyMovedToFirstControl();
  }

  /// <summary>
  ///   refresh table first time we enter the ownerTask
  ///   get rows number form gui level
  /// </summary>
  firstTableRefresh(): void {
    if (this._tableMgControl !== null) {
      super.firstTableRefresh();
      this.setTableItemsCount(false);
      this.refreshTable();
      super.SelectRow();
    }
  }

  /// <summary>
  ///   update table item's count according to dataview
  /// </summary>
  setTableItemsCount(removeAll: boolean): void {
    let tableItemsCount: number;

    // For absolute scrollbar, set the virtual items count accordingly.
    if (this.isTableWithAbsoluteScrollbar() && this.GetDataview().TotalRecordsCount > 0) {
      tableItemsCount = this.GetDataview().TotalRecordsCount;
      this.SetRecordsBeforeCurrentView(this.GetDataview().RecordsBeforeCurrentView);
    }
    else
      tableItemsCount = this.GetDataview().getSize();

    super.SetTableItemsCount(tableItemsCount, removeAll);
  }


  InitTableControl(): void;
  InitTableControl(size: number, removeAll: boolean): void;
  InitTableControl(size?: number, removeAll?: boolean): void {
    if (arguments.length === 0) {
      this.InitTableControl_00();
      return;
    }
    this.InitTableControl_01(size, removeAll);
  }

  /// <summary>
  /// inits the table control
  /// </summary>
  private InitTableControl_00(): void {
    super.InitTableControl();
    this.SetTableTopIndex();
  }

  /// <summary>
  /// inits table control's rows to 'size' count
  /// </summary>
  /// <param name="size"></param>
  /// <param name="removeAll"></param>
  private InitTableControl_01(size: number, removeAll: boolean): void {
    if (this._tableMgControl !== null) {
      if (removeAll) {
        Commands.addBoolWithLine(CommandType.SET_TABLE_INCLUDES_FIRST, this._tableMgControl, 0, true);
        Commands.addBoolWithLine(CommandType.SET_TABLE_INCLUDES_LAST, this._tableMgControl, 0, true);
      }
      else {
        Commands.addBoolWithLine(CommandType.SET_TABLE_INCLUDES_FIRST, this._tableMgControl, 0, this.GetDataview().IncludesFirst() || this.GetDataview().IsOneWayKey);
        Commands.addBoolWithLine(CommandType.SET_TABLE_INCLUDES_LAST, this._tableMgControl, 0, this.GetDataview().IncludesLast());
      }

      super.InitTableControl(size, removeAll);

      this.checkAndCreateRowsEvent();
    }
  }

  /// <summary>
  ///   set top index
  /// </summary>
  SetTableTopIndex(): void {
    if (this._tableMgControl !== null) {
      let index: number = this.GetDataview().getTopRecIdx();
      if (index === Int32.MinValue)
        index = 0;

      if (this.GetDataview().IncludesLast()) {
        // table now behaves like listview, it can not show empty lines
        // so we must update top index
        if (index + this._rowsInPage > this.GetDataview().getSize()) {
          // but we do show empty lines if includeFirst = false
          // and we have less records then rows on screen QCR #!!!!!!
          if (this.GetDataview().IncludesFirst() || this.GetDataview().getSize() > this._rowsInPage + 1) {
            index = Math.max(this.GetDataview().getSize() - this._rowsInPage, 0);
            this.GetDataview().setTopRecIdx(index);
            this._topIndexUpdated = true;
          }
        }
      }
      if (index !== this._prevTopIndex) {
        Commands.addWithNumber(CommandType.SET_TABLE_TOP_INDEX, this._tableMgControl, index);
        this._prevTopIndex = index;
      }
    }
  }


  FindParent(runtimeContext: RuntimeContextBase): any {
    let parent: any = super.FindParent(runtimeContext);
    // defect 122145, modal window must have owner to prevent behavior described in the defect
    // see article:
    // http://stackoverflow.com/questions/6712026/problem-with-showdialog-when-showintaskbar-is-false
    if (parent === null && this.ConcreteWindowType === WindowType.Modal)
      parent = MgForm.CalculateOwnerForm(GUIManager.LastFocusMgdID);
    return parent;
  }

  /// <summary>
  /// find owner window fro new form
  /// </summary>
  /// <returns></returns>
  private static CalculateOwnerForm(lastFocusMgdID: number): MgFormBase {
    let form: MgFormBase = null;
    let mgData: MGData = MGDataCollection.Instance.getCurrMGData();
    while (form === null && mgData !== null) {
      let task: Task = ClientManager.Instance.getLastFocusedTask(mgData.GetId());
      // get current task
      if (task !== null)
        form = task.getForm();
      // if it is subfrom - get its form
      if (form !== null && form.Opened)
        form = form.getTopMostForm();
      // if not found - look for previous windows
      if (form === null)
        mgData = mgData.getParentMGdata();
    }

    // form is null in all task parents. last chance, try the last focused mgData
    if (form === null) {
      let task: Task = ClientManager.Instance.getLastFocusedTask(lastFocusMgdID);
      if (task !== null)
        form = task.getForm();

      if (form !== null && form.Opened)
        form = form.getTopMostForm();
    }
    return form;
  }

  /// <summary>
  ///   Creates the window defined by this form and its child controls
  /// </summary>
  createForm(): void {
    super.createForm();
    ClientManager.Instance.CreatedForms.add(this);
    super.SetActiveHighlightRowState(false);
  }


  /// <summary>Writes the string or sets the image on the pane with the specified index.</summary>
  /// <param name="paneIdx">Index of the pane to be updated</param>
  /// <param name="strInfo">Message</param>
  /// <param name="soundBeep">Sound beep or not</param>
  UpdateStatusBar(paneIdx: number, strInfo: string, soundBeep: boolean): void {
    // TODO: implement in WebClient.
    // if (paneIdx == Constants.SB_MSG_PANE_LAYER || ClientManager.Instance.getEnvironment().getSpecialShowStatusBarPanes())
    //   base.UpdateStatusBar(paneIdx, strInfo, soundBeep);
  }

  /// <summary>
  /// init the recompute table for that form
  /// </summary>
  /// <param name="foundTagName"></param>
  /// <returns></returns>
  initInnerObjects(foundTagName: string): boolean {
    if (foundTagName === null)
      return false;

    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;
    if (foundTagName === XMLConstants.MG_TAG_RECOMPUTE) {
      Logger.Instance.WriteDevToLog("goes to recompute form");
      (<Task>this._task).RecomputeFillData();
      return true;
    }
    return super.initInnerObjects(foundTagName);
  }

  toString(): string {
    return "{" + this.constructor.name + ": task=" + this._task + ", Id=" + this.UserStateId + "}";
  }

  /// <summary>
  /// build the XML entry of the hidden controls
  /// </summary>
  /// <returns></returns>
  GetHiddenControlListXML(): string {
    let xml: StringBuilder = new StringBuilder();

    if (this.hiddenControlsIsnsList !== null && this.hiddenControlsIsnsList.length > 0) {
      // write the id
      xml.Append("<" + ConstInterface.MG_TAG_HIDDEN_CONTOLS + " " + ConstInterface.MG_ATTR_ISNS + "=\"");

      this.hiddenControlsIsnsList.forEach((change: number) => { xml.Append(change + ","); });

      xml.Remove(xml.Length - 1, 1);

      xml.Append("\"/>");

      this.hiddenControlsIsnsList = null;
    }
    return xml.ToString();
  }

  /// <summary>
  /// Should this form behave as Modal although its WindowType != Modal?
  /// For RIA, Non Interactive task's and its all child task should behave as a Modal.
  /// </summary>
  /// <returns></returns>
  ShouldBehaveAsModal(): boolean {
    let shouldBeModal: boolean = false;
    if (!this.IsHelpWindow) {
      // QCR #802495, non interactive tasks and its children will be opened using show dialog to prevent events on their ancestors
      if (!this._task.IsInteractive && !this._task.isMainProg())
        shouldBeModal = Task.ShouldNonInteractiveBeModal();
      else {
        let parentTask: Task = (<Task>this._task).ParentTask;
        if (parentTask !== null && !parentTask.IsInteractive && !parentTask.isMainProg())
          shouldBeModal = parentTask.ShouldNonInteractiveChildBeModal();
      }
    }
    return shouldBeModal;
  }

  /// <summary>
  /// Check whether table being used with absolute scrollbar thumb.
  /// </summary>
  isTableWithAbsoluteScrollbar(): boolean {
    let tableWithAbsoluteScrollbar: boolean = false;
    if (this._tableMgControl !== null)
      tableWithAbsoluteScrollbar = (<MgControl>this._tableMgControl).IsTableWithAbsoluteScrollbar();

    return tableWithAbsoluteScrollbar;
  }

  /// <summary>
  /// Update recordsBeforeCurrentView
  /// </summary>
  /// <param name="value"></param>
  private SetRecordsBeforeCurrentView(value: number): void {
      if (this._tableMgControl !== null) {
          Commands.addAsync(CommandType.SET_RECORDS_BEFORE_CURRENT_VIEW, this._tableMgControl, value, 0);
      }
  }

  buildFormName(): string {
    let name: string = this.UniqueName;
    let task: Task = <Task>this.getTask();

    name = task.getProp(PropInterface.PROP_TYPE_NAME).getValue() + '_' + name;
    while (task.IsSubtask)
    {
      task = task.ParentTask;
      name = task.getProp(PropInterface.PROP_TYPE_NAME).getValue() + '_' + name;
    }

    name = name.replace(/ /g,"_");
    name = name.replace(/-/g,"_");
    return name;
  }
}

class ParkableControlInfo {
  BaseForm: MgForm = null;
  Direction: string = null;
  ParkableControlWasFound: boolean = false;

  constructor(baseForm: MgForm, direction: string) {
    this.BaseForm = baseForm;
    this.Direction = direction;
  }
}
