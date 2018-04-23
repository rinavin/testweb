import {ApplicationException, Debug, Int32, Int64, List, NNumber, StringBuilder} from "@magic/mscorelib";
import {Constants, InternalInterface, Logger, Misc, XMLConstants, XmlParser} from "@magic/utils";
import {DataModificationTypes, DataViewBase, DcValues, IRecord, MgFormBase, Property, PropInterface} from "@magic/gui";
import {ConstInterface} from "../ConstInterface";
import {RecordsTable} from "./RecordsTable";
import {Record} from "./Record";
import {Task} from "../tasks/Task";
import {MgForm} from "../gui/MgForm";
import {FieldsTable} from "./FieldsTable";
import {ClientManager} from "../ClientManager";
import {RecordOutOfDataViewException, RecordOutOfDataViewException_ExceptionType} from "./RecordOutOfDataViewException";
import {IClientCommand} from "../commands/IClientCommand";
import {CommandFactory} from "../commands/ClientToServer/CommandFactory";
import {XMLBasedDcValuesBuilder} from "./XMLBasedDcValuesBuilder";
import {Field} from "./Field";
import {MGDataCollection} from "../tasks/MGDataCollection";
import {MgControl} from "../gui/MgControl";
import {EventSubType} from "../enums";
import {EventCommand} from "../commands/ClientToServer/EventCommand";
import {RemoteCommandsProcessor} from "../remote/RemoteCommandsProcessor";


// CONSTANTS
export const SET_DISPLAYLINE_BY_DV: number = Int32.MinValue;
const COMPUTE_NEWREC_ON_CLIENT: string = 'C';
const UNKNOWN_RCMPS_NOT_INITED: string = 'M';
const UNKNOWN_RCMPS_FOUND: string = 'Y';

const INVOKED_FROM_OFFLINE_TASK: string = "-99999";

const CHUNK_CACHE_NEXT: string = 'N';
const CHUNK_CACHE_PREV: string = 'P';
const CHUNK_DV_BOTTOM: string = 'B';
const CHUNK_DV_TOP: string = 'T';

const COMPUTE_FLUSH_UPDATES: string = 'H';

const COMPUTE_NEWREC_ON_SERVER: string = 'S';
const END_DV_TAG: string = "</" + ConstInterface.MG_TAG_DATAVIEW + ">";
const RECOVERY_ACT_BEGIN_SCREEN: string = 'S';

// recovery action taken by the client in response to recovery type
const RECOVERY_ACT_BEGIN_TABLE: string = 'T';
const RECOVERY_ACT_CANCEL: string = 'C';
const RECOVERY_ACT_MOVE_DIRECTION_BEGIN: string = 'B';
const RECOVERY_ACT_NONE: string = 'N';
const TRANS_STAT_CLOSED: string = 'C';
const TRANS_STAT_OPENED: string = 'O';

/// <summary>
///   this class represents the dataview of a task
export class DataView extends DataViewBase {

  private _cacheLruTimeStamp: number = 0;
  private _changed: boolean = false;
  private _chunkSize: number = 30;
  private _chunkSizeExpression: number = 0;
  private _computeBy: string = '\0'; // tells the client to execute the compute of new records on the client or on the server
  private _currRecId: number = 0;
  private _currRecIdx: number = 0;
  private _dvPosValue: number = 0;
  private _firstDv: boolean = true;
  private _flushUpdates: boolean = false; // TRUE means that whenever a record is changed we must send it to the server
  private _hasMainTable: boolean = true;

  private _insertAt: string = ' ';

  set InsertAt(value: string) {
    this._insertAt = value;
  }

  get InsertAt(): string {
    return this._insertAt;
  }

  /// <summary>
  /// true, if we are executing local dataview command
  /// </summary>
  InLocalDataviewCommand: boolean = false;
  private _lastCreatedRecId: number = 0; // the record id of the last created record id
  private _lastSessionCounter: number = Int64.MinValue;
  private _locateFirstRec: number = -1;
  private _modifiedRecordsTab: RecordsTable = null; // after sending these records to the server the list is cleared

  private _oldTopRecIdx: number = Int32.MinValue;
  private _original: Record = null;
  private _pendingRecovery: string = RECOVERY_ACT_NONE; // when different than NONE, means the server order for recovery was not performed (yet).
  private _prevCurrRec: Record = null;
  private _recordsTab: RecordsTable = null; // <dataview> ...</dataview> tag
  private _recovery: string = ConstInterface.RECOVERY_NONE; // recovery action request, received from the server
  private _rmIdx: number = 0; // the index of the first field in the record main
  private _rmSize: number = 0; // number of "select"s in the record main
  private _skipParsing: boolean = false;
  private _topRecId: number = 0;
  private _topRecIdx: number = Int32.MinValue;
  private _topRecIdxModified: boolean = false;
  private _transCleared: boolean = false; // If true, _task is the owner of a Rec level transaction and the _task is in _task suffix
  private _unknownRcmp: string = UNKNOWN_RCMPS_NOT_INITED; // signals if a virtual field without init expression has server rcmp action

  IsOneWayKey: boolean = false;

  _includesFirst: boolean = false;
  _includesLast: boolean = false;

  private _currRec_DO_NOT_USE_DIRECTLY_USE_SETTER_GETTER: Record = null;

  private get CurrRec(): Record {
    return this._currRec_DO_NOT_USE_DIRECTLY_USE_SETTER_GETTER;
  }

  private set CurrRec(value: Record) {
    // reset the prev dcValIds in mgcontrol
    if (this._currRec_DO_NOT_USE_DIRECTLY_USE_SETTER_GETTER !== null && value === null) {
      this._currRec_DO_NOT_USE_DIRECTLY_USE_SETTER_GETTER.resetDcValueId();
    }
    this._currRec_DO_NOT_USE_DIRECTLY_USE_SETTER_GETTER = value;

    // set the dcValIds in mgcontrol
    if (this._currRec_DO_NOT_USE_DIRECTLY_USE_SETTER_GETTER !== null) {
      this._currRec_DO_NOT_USE_DIRECTLY_USE_SETTER_GETTER.SetDcValueId();
    }
  }

  get FlushUpdates(): boolean {
    return this._flushUpdates;
  }

  get HasMainTable(): boolean {
    return this._hasMainTable;
  }

  DBViewSize: number = 0;
  taskModeFromCache: string;

  get CurrentRecId(): number {
    return this._currRecId;
  }

  Dvcount: number = 0;
  TotalRecordsCount: number = 0;
  RecordsBeforeCurrentView: number = 0;

  /// <summary>
  /// first Dataview Record
  /// </summary>
  get FirstRecord(): IRecord {
    return this._recordsTab.getRecByIdx(0);
  }

  /// <summary>
  /// last dataview record
  /// </summary>
  get LastRecord(): IRecord {
    return this._recordsTab.getRecByIdx(this._recordsTab.getSize() - 1);
  }

  /// <summary>
  ///   CTOR
  /// </summary>
  constructor(task: Task);
  constructor(DataView: DataView);
  constructor(taskOrDataView: DataView|Task) {
    super();

    if (arguments[0] instanceof Task) {
      this._task = <Task>taskOrDataView;
      this._fieldsTab = new FieldsTable();
      this._recordsTab = new RecordsTable(true);
      this._modifiedRecordsTab = new RecordsTable(false);
      this.init();
    }
    else {
      Object.assign(this, taskOrDataView);
    }
  }

  /// <summary>
  ///   checks if the first row of data is exists in the client's data view
  /// </summary>
  /// <returns> true is the first row of data is included in the client </returns>
  IncludesFirst(): boolean {
    return this._includesFirst;
  }

  /// <summary>
  ///   checks if the last row of data is included in the client's data view
  /// </summary>
  /// <returns> true if the last row of data is included in the client's data view </returns>
  IncludesLast(): boolean {
    return this._includesLast;
  }

  /// <summary>
  ///   parse the DVHEADER tag
  /// </summary>
  fillHeaderData(): void {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;
    while (this.initHeaderInnerObjects(parser, parser.getNextTag())) {
    }
    this.Dvcount = (<Task>this._task).ctl_itm_4_parent_vee(0, 1);
  }

  /// <summary>
  ///   parse the DVHEADER inner objects
  /// </summary>
  /// <param name = "foundTagName">  name of tag, of object, which need be allocated</param>
  /// <returns> is finished inner tag</returns>
  private initHeaderInnerObjects(parser: XmlParser, foundTagName: String): boolean {
    if (foundTagName === null)
      return false;

    if (foundTagName === XMLConstants.MG_TAG_DVHEADER) {
      Logger.Instance.WriteDevToLog("dvheader found");
      this.getHeaderAttributes(parser);
      this._fieldsTab.fillData(this);
      (<FieldsTable>this._fieldsTab).setRMPos(this._rmSize, this._rmIdx);
    }
    else if (foundTagName === ('/' + XMLConstants.MG_TAG_DVHEADER)) {
      parser.setCurrIndex2EndOfTag();
      return false;
    }
    else return false;
    return true;
  }

  /// <summary>
  ///   get the attributes of the DVHEADER tag
  /// </summary>
  private getHeaderAttributes(parser: XmlParser): void {
    let tokensVector: List<string>;
    let tag: string;
    let attribute: string;
    let valueStr: string;

    let endContext: number = parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex());
    if (endContext !== -1 && endContext < parser.getXMLdata().length) {
      // last position of its tag
      tag = parser.getXMLsubstring(endContext);
      parser.add2CurrIndex(tag.indexOf(XMLConstants.MG_TAG_DVHEADER) + XMLConstants.MG_TAG_DVHEADER.length);
      tokensVector = XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);

      for (let j: number = 0; j < tokensVector.length; j += 2) {
        attribute = (tokensVector.get_Item(j));
        valueStr = (tokensVector.get_Item(j + 1));

        switch (attribute) {
          case ConstInterface.MG_ATTR_RMPOS: {
            let i: number = valueStr.indexOf(",");

            if (i > -1) {
              this._rmSize = NNumber.Parse(valueStr.substr(0, i));
              this._rmIdx = NNumber.Parse(valueStr.substr(i + 1));
            }
            break;
          }
          case ConstInterface.MG_ATTR_COMPUTE_BY:
            this._computeBy = valueStr[0];

            if (this._computeBy === COMPUTE_FLUSH_UPDATES) {
              this._computeBy = COMPUTE_NEWREC_ON_SERVER;
              this._flushUpdates = true;
            }
            else
              this._flushUpdates = false;

            break;
          case ConstInterface.MG_ATTR_HAS_MAIN_TBL:
            this._hasMainTable = XmlParser.getBoolean(valueStr);
            break;
          case ConstInterface.MG_ATTR_CHUNK_SIZE:
            this._chunkSize = XmlParser.getInt(valueStr);
            break;
          case ConstInterface.MG_ATTR_CHUNK_SIZE_EXPRESSION:
            this._chunkSizeExpression = XmlParser.getInt(valueStr);
            break;
          default:
            Logger.Instance.WriteExceptionToLogWithMsg("Unknown attribute for <" + XMLConstants.MG_TAG_DVHEADER + "> tag: " +
              attribute); // to delete ">" too
            break;
        }
      }
      parser.setCurrIndex(++endContext);
      return;
    }
    Logger.Instance.WriteExceptionToLogWithMsg("in DataView.getHeaderAttributes(): out of bounds");
  }

  /// <summary>
  ///   parse the DATAVIEW tag
  /// </summary>
  fillData(): void {
    this._skipParsing = false;
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;
    while (this.initInnerObjects(parser, parser.getNextTag())) {
    }
    this.ResetFirstDv();
  }

  /// <summary>
  /// get transaction begin of the task
  /// </summary>
  /// <returns></returns>
  private GetTransactionBegin(): string {
    let transBegin: string = '\0';
    let transBeginProp: Property = this._task.getProp(PropInterface.PROP_TYPE_TRASACTION_BEGIN);
    if (transBeginProp !== null) {
      transBegin = (transBeginProp.getValue()).charAt(0);
    }

    return transBegin;
  }

  /// <summary>
  ///   parse the DATAVIEW inner objects
  /// </summary>
  /// <param name = "foundTagName">  name of tag, of object, which need be allocated</param>
  /// <returns> is finished inner tag</returns>
  private initInnerObjects(parser: XmlParser, foundTagName: string): boolean {
    let form: MgForm = <MgForm>this._task.getForm();

    if (foundTagName == null)
      return false;

    if (foundTagName === (ConstInterface.MG_TAG_DATAVIEW)) {
      let invalidate: boolean = this.getAttributes(parser);

      if (this._skipParsing) {
        let endContext: number = parser.getXMLdata().indexOf(END_DV_TAG, parser.getCurrIndex());
        parser.setCurrIndex(endContext + END_DV_TAG.length);
      }
      else {
        // parse the exec stack entries values
        this.fillExecStack(parser);

        // parse the data controls values
        this.fillDataDc(parser);
        if (invalidate && form != null)
          form.SetTableItemsCount(0, true);

        let taskRefreshType: string = this._recordsTab.fillData(this, this._insertAt);

        if (form != null) {
          // For the first time, as the table control is not yet created, no need to update the table item's count.
          // Set the updated table items count only when form is already opened.
          if (form.Opened) {
            if (this._insertAt === 'B' && (invalidate || this._recordsTab.InsertedRecordsCount > 0))
              form.SetTableItemsCount(0, true);

            form.setTableItemsCount(false);
          }
        }
        if (this.CurrRec != null && this.CurrRec.InRecompute && taskRefreshType === Constants.TASK_REFRESH_NONE)
          taskRefreshType = Constants.TASK_REFRESH_CURR_REC;

        if (invalidate) {
          taskRefreshType = Constants.TASK_REFRESH_FORM;
          if (this._task.IsSubForm)
            this.getTask().DoSubformPrefixSuffix = true;
        }

        this.getTask().SetRefreshType(taskRefreshType);
        this.UpdateDataviewAfterInsert();

        /*
             * the records table might set a new current record. It
             * actually becomes the current record by calling setCurrRec()
             */
        let newRecId: number = this._recordsTab.getInitialCurrRecId();

        if (newRecId !== Int32.MinValue && (this._recovery === ConstInterface.RECOVERY_NONE || this._firstDv)) {

          // Make sure the client performs the first record prefix
          if (this._firstDv && this._recovery === ConstInterface.RECOVERY_NONE &&
            (this._task.getLevel().charCodeAt(0) === 0 || this._task.getLevel() === Constants.TASK_LEVEL_TASK))
            this._task.setLevel(Constants.TASK_LEVEL_TASK);

          // If the server sent us an updated currRec then invalidate all current values.
          // this will force all new values to be copied from the currRec to the dataview,
          // especially virtual fields with no init expression.
          (<FieldsTable>this._fieldsTab).invalidate(true, Field.LEAVE_FLAGS);

          if (newRecId !== this._currRecId) {
            this.setCurrRec(newRecId, !this._firstDv);
            this._original = this.CurrRec.replicate();

            // fix bug #779858: force compute for the first record in a screen mode _task
            if (this._firstDv)
              this.takeFldValsFromCurrRec();

            // QCR #981320: make sure that virtuals with no init or control are initialized
            if (this._task.getForm() != null)
              (<MgForm>(this._task.getForm())).updateDisplayLineByDV();
          }
          else this.takeFldValsFromCurrRec();
        }
        else if (invalidate && this._recordsTab.getSize() > 0) {
          if (form == null || form.isScreenMode()) {
            try {
              this.setCurrRecByIdx(0, false, true, false, 0);
            }
            catch (exception) {
              if (exception instanceof RecordOutOfDataViewException) {
              }
              else
                throw exception;
            }
          }
          else {

            // QCR #431630: For forms in line mode there was a situation in which
            // after invalidation, the current record was set to be the first of
            // the dataview but the current line of the form was greater than 0.
            // It caused saving an original record which is different than the
            // original of the current form line. To solve this problem we first
            // make sure that the cursor parks on the first row of the dataview.
            (<FieldsTable>this._fieldsTab).invalidate(true, Field.LEAVE_FLAGS);
            this.setTopRecIdx(0);

            if (this._task.getForm() != null)
              (<MgForm>this._task.getForm()).SetTableTopIndex();

            try {
              this.setCurrRecByIdx(0, false, true, true, 0);
              if (this._task.getForm() != null)
              // to update tree we need to load nodes first
                (<MgForm>(this._task.getForm())).updateDisplayLineByDV();
            }
            catch (exception) {
              if (exception instanceof RecordOutOfDataViewException) {
              }
              else
                throw exception;
            }

            if (this._task.getLevel() === Constants.TASK_LEVEL_CONTROL && this._task.getLastParkedCtrl() != null)
              this._task.getLastParkedCtrl().resetPrevVal();
          }
          this.saveOriginal(); // After invalidation, we must save the original record too
          (<FieldsTable>this._fieldsTab).invalidate(true, Field.CLEAR_FLAGS);
        }

        // QCR #761848 prevCurrRec should set the first time the dataview is initialized
        if (this._firstDv)
          this.setPrevCurrRec();

        // Make sure that the sub forms are not unnecessarily refreshed:
        // After setting the current record and before executing record prefix
        // we save the current record as the previous record so when the record prefix
        // is executed it will skip refreshing the sub forms. We do that because
        // the server already passes back to the client all the dataviews of the
        // sub forms in a single iteration.
        if (invalidate && this._task.IsSubForm)
          this._task.getForm().getSubFormCtrl().RefreshOnVisible = false;

        if (this._recovery === ConstInterface.RECOVERY_NONE) {
          // No need to perform record prefix after a record level transaction retry
          if (this.getTask().getAfterRetry(ConstInterface.RECOVERY_RETRY) &&
            !this.getTask().IsAfterRetryBeforeBuildXML)
            this._task.setLevel(Constants.TASK_LEVEL_RECORD);
        }
        else {
          let transBegin = <string> this.GetTransactionBegin();

          let stopExecution: boolean = true;

          switch (this._recovery) {
            case ConstInterface.RECOVERY_ROLLBACK:

              if (transBegin === ConstInterface.TRANS_RECORD_PREFIX) {
                // QCR #747316 can't rollback a lost record
                // Also, in case of non interactive _task, skip to the next record.
                if (this._task.getMode() === Constants.TASK_MODE_DELETE ||
                  !this._task.IsInteractive)
                  stopExecution = false;
                else {
                  this.getTask().setAfterRetry(ConstInterface.RECOVERY_ROLLBACK);
                  this.CurrRec.restart(this.CurrRec.getMode());
                  this.CurrRec.resetModified();
                  this._original = this.CurrRec.replicate();
                  this._pendingRecovery = RECOVERY_ACT_CANCEL;
                }
              }
              else if (transBegin !== ConstInterface.TRANS_NONE) {
                this._task.setLevel(Constants.TASK_LEVEL_TASK);
                this._pendingRecovery = RECOVERY_ACT_BEGIN_TABLE;
                this.getTask().setAfterRetry(ConstInterface.RECOVERY_ROLLBACK);
                // ensure _task close action is stopped (taskEnd)
              }
              break;

            case ConstInterface.RECOVERY_RETRY:
              this.RecoveryRetry(transBegin);
              break;
          }
          if (stopExecution) {
            ClientManager.Instance.EventsManager.setStopExecution(true);
            // in case the task suffix was already executed, need to set this flag to false in order to enable it to execute TS again.
            this.getTask().TaskSuffixExecuted = false;
          }
        }
      }
    }
    else if (foundTagName === '/' + ConstInterface.MG_TAG_DATAVIEW) {
      if (this._includesFirst && this._includesLast && this.isEmpty()) {
        this._currRecId = Int32.MinValue;
        this._currRecIdx = Int32.MinValue;
        this.CurrRec = null;
        this.setTopRecIdx(Int32.MinValue);
      }
      parser.setCurrIndex2EndOfTag();
      return false;
    }
    else
      return false;

    return true;
  }


  /// <summary>
  ///
  /// </summary>
  /// <param name="transBegin"></param>
  private RecoveryRetry(transBegin: string): void {
    if (transBegin === ConstInterface.TRANS_RECORD_PREFIX) {
      // No need to re-perform record prefix during retry.
      this._task.setLevel(Constants.TASK_LEVEL_RECORD);

      // ensure that the record will be passed to the server after correction
      this.getTask().setTransactionFailed(true);

      // ensure record prefix is not executed for all tasks which participate in the transaction
      this.getTask().setAfterRetry(ConstInterface.RECOVERY_RETRY);

      // QCR #479686: no need to add the curr rec to the list anymore
      // because the insert/modify may be canceled and a rollback event
      // would be sent to the server
      this.CurrRec.restart(this.CurrRec.getMode());

      // An error when initializing the _task needs no movement (error in rec-prefix)
      if (!this._firstDv) {
        this.takeFldValsFromCurrRec();
        this._pendingRecovery = RECOVERY_ACT_MOVE_DIRECTION_BEGIN;
      }
    }
    else if (transBegin !== ConstInterface.TRANS_NONE) {
      this._task.setLevel(Constants.TASK_LEVEL_TASK);
      this._pendingRecovery = RECOVERY_ACT_BEGIN_SCREEN;
      this.getTask().setAfterRetry(ConstInterface.RECOVERY_RETRY);
      // ensure _task close action is stopped (taskEnd)
      this.getTask().setTransactionFailed(true);
    }
  }

  /// <summary>
  /// insert single record
  /// </summary>
  /// <param name="record"></param>
  InsertSingleRecord(record: Record): void {
    this._recordsTab.InsertedRecordsCount = 0;
    this._recordsTab.InsertRecord(this._insertAt, record);
    this.UpdateDataviewAfterInsert();
  }

  /// <summary>
  /// update Dataview After insert
  /// </summary>
  private UpdateDataviewAfterInsert(): void {
    if (this._insertAt === 'B'/*'B'*/) {

      let newRecs: number = this._recordsTab.InsertedRecordsCount;
      if (this._currRecIdx !== Int32.MinValue)
        this._currRecIdx += newRecs;

      if (this._topRecIdx !== Int32.MinValue)
        this._topRecIdx += newRecs;

      if (this._oldTopRecIdx !== Int32.MinValue)
        this._oldTopRecIdx += newRecs;
    }
  }

  /// <summary>
  ///   get the attributes of the DATAVIEW tag
  /// </summary>
  private getAttributes(parser: XmlParser): boolean {
    let tokensVector: List<string>;
    let tag: String;
    let boolVal: boolean;
    let dataViewCommand: IClientCommand = null;

    this._recovery = ConstInterface.RECOVERY_NONE;
    let endContext: number = parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex());
    if (endContext !== -1 && endContext < parser.getXMLdata().length) {

      // last position of its tag
      tag = parser.getXMLsubstring(endContext);
      parser.add2CurrIndex(tag.indexOf(ConstInterface.MG_TAG_DATAVIEW) + ConstInterface.MG_TAG_DATAVIEW.length);
      tokensVector = XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);

      this._insertAt = ' ';
      // find and execute invalidate immediately
      let invalidate: boolean = this.peekInvalidate(tokensVector);

      // [MH] A rather bad solution for the problem of QCR 293064: The 'empty data view' flag should not be
      // changed for local data. This solution relies on the fact that the task can have only local data or
      // remote data. However, when we support 'mixed' mode, we'd have to refine this condition.
      this.setEmptyDataview(false);

      // locateFirstRec is sent by server only if records are located for the subform.
      // So, it should be initialized to 0.
      this._locateFirstRec = 0;

      for (let j: number = 0; j < tokensVector.length; j += 2) {
        let attribute: string = (tokensVector.get_Item(j));
        let valueStr: string = (tokensVector.get_Item(j + 1));

        switch (attribute) {
          case ConstInterface.MG_ATTR_INSERT_AT:
            this._insertAt = valueStr[0];
            break;
          case ConstInterface.MG_ATTR_INCLUDE_FIRST:
            boolVal = XmlParser.getBoolean(valueStr);
            this.SetIncludesFirst(boolVal);
            break;
          case ConstInterface.MG_ATTR_INCLUDE_LAST:
            boolVal = XmlParser.getBoolean(valueStr);
            this.SetIncludesLast(boolVal);
            break;
          case ConstInterface.MG_ATTR_IS_ONEWAY_KEY:
            boolVal = XmlParser.getBoolean(valueStr);
            this.SetOneWayKey(boolVal);
            break;
          case ConstInterface.MG_ATTR_DBVIEWSIZE:
            this.DBViewSize = XmlParser.getInt(valueStr);
            break;
          case ConstInterface.MG_ATTR_INVALIDATE: {

          }
            break;
          case ConstInterface.MG_ATTR_TOP_REC_ID:
            this._topRecId = NNumber.Parse(valueStr);
            break;
          case ConstInterface.MG_ATTR_TASKMODE:
            if ((<Task>this._task).getOriginalTaskMode() === Constants.TASK_MODE_NONE || invalidate)
              (<Task>this._task).setOriginalTaskMode(valueStr);
            this._task.setProp(PropInterface.PROP_TYPE_TASK_MODE, valueStr);
            break;
          case ConstInterface.MG_ATTR_EMPTY_DATAVIEW:
            this.setEmptyDataview(true);
            break;
          case XMLConstants.MG_ATTR_TASKID:
            continue;
          case ConstInterface.MG_ATTR_LOW_ID:
            this._lastCreatedRecId = NNumber.Parse(valueStr);
            break;
          case ConstInterface.MG_ATTR_TRANS_STAT:
            let transStat: string = valueStr[0];
            switch (transStat) {
              case TRANS_STAT_OPENED:
                dataViewCommand = CommandFactory.CreateSetTransactionStateDataviewCommand(this.getTask().getTaskTag(), true);
                this.getTask().DataviewManager.RemoteDataviewManager.Execute(dataViewCommand);
                break;
              case TRANS_STAT_CLOSED:
                dataViewCommand = CommandFactory.CreateSetTransactionStateDataviewCommand(this.getTask().getTaskTag(), false);
                this.getTask().DataviewManager.RemoteDataviewManager.Execute(dataViewCommand);
                this.getTask().setTransactionFailed(false);
                break;
              default:
                break;
            }
            break;
          case ConstInterface.MG_ATTR_RECOVERY:
            if ((<Task>this._task).IsTryingToStop)
              this.getTask().setTryingToStop(false);
            this.getTask().resetExecEndTask();
            this._recovery = valueStr[0];
            break;
          case ConstInterface.MG_ATTR_DVPOS_VALUE:
            this._dvPosValue = NNumber.Parse(valueStr);
            break;
          case ConstInterface.MG_ATTR_LOCATE_FIRST_ID:
            this._locateFirstRec = NNumber.Parse(valueStr);
            break;
          case ConstInterface.MG_ATTR_OFFSET:
            this.getTask().locateQuery.Offset = NNumber.Parse(valueStr);
            break;
          case ConstInterface.MG_ATTR_USER_SORT:
            // QCR # 923380:Getting the value of userSort from the dataview header.If true then sort sign will be removed or else shown.
            let form: MgForm = <MgForm>this._task.getForm();
            form.clearTableColumnSortMark(XmlParser.getBoolean(valueStr));
            break;
          case ConstInterface.MG_ATTR_VAL_TOTAL_RECORDS_COUNT:
            this.TotalRecordsCount = XmlParser.getInt(valueStr);
            break;
          case ConstInterface.MG_ATTR_VAL_RECORDS_BEFORE_CURRENT_VIEW:
            this.RecordsBeforeCurrentView = XmlParser.getInt(valueStr);
            break;
          default:
            Logger.Instance.WriteExceptionToLogWithMsg("Unknown attribute for <" + ConstInterface.MG_TAG_DATAVIEW + "> tag: " + attribute);
            break;
        }
      }
      parser.setCurrIndex(++endContext);
      return invalidate;
    }
    Logger.Instance.WriteExceptionToLogWithMsg("in DataView.getAttributes(): out of bounds");
    return false;
  }


  SetOneWayKey(val: boolean): void {
    this.IsOneWayKey = val;
  }

  SetIncludesLast(val: boolean): void {
    this._includesLast = val;
  }

  SetIncludesFirst(val: boolean): void {
    let prevIncludeFirst: boolean = this._includesFirst;
    this._includesFirst = val;

    if (this._includesFirst !== prevIncludeFirst) {
      let form: MgFormBase = this._task.getForm();
      if (form !== null) {
        form.SetTableItemsCount(0, true);
      }
    }
  }

  /// <summary>
  ///   parse and fill inner data for all <dc_val> tags are contained into the <dataview>
  /// </summary>
  private fillDataDc(parser: XmlParser): void {

    // Create a DC values builder.
    let dcvBuilder: XMLBasedDcValuesBuilder = new XMLBasedDcValuesBuilder();

    // Loop through all "dc_vals" tags.
    let foundTagName: string = parser.getNextTag();

    while (foundTagName !== null && foundTagName === ConstInterface.MG_TAG_DC_VALS) {

      // Save current index for future reference, in case of an error.
      let dcValsPosition: number = parser.getCurrIndex();

      dcvBuilder.SerializedDCVals = parser.ReadToEndOfCurrentElement();
      let dcv: DcValues = dcvBuilder.Build();

      if (dcv !== null)
        this.AddDcValues(dcv);
      else
        Logger.Instance.WriteExceptionToLogWithMsg("Error while parsing DC values at position " + dcValsPosition);

      foundTagName = parser.getNextTag();
    }
  }

  AddDcValues(dcv: DcValues): void {
    this._dcValsCollection.Add(dcv.getId().toString(), dcv);
  }

  /// <summary>
  ///   parse and fill inner data for all <execstackentry> tags are contained into the <dataview>
  /// </summary>
  private fillExecStack(parser: XmlParser): void {
    let foundTagName: string = parser.getNextTag();
    let execStackTagExists: boolean = false;

    while (foundTagName !== null && foundTagName === ConstInterface.MG_TAG_EXEC_STACK_ENTRY) {
      this.fillInnerExecStack(parser);
      foundTagName = parser.getNextTag();
      execStackTagExists = true;
    }
    if (execStackTagExists) {
      ClientManager.Instance.EventsManager.reverseServerExecStack();
    }
  }

  /// <summary>
  ///   fill inner objects of <execstackentry> tag
  /// </summary>
  private fillInnerExecStack(parser: XmlParser): void {
    let tokensVector: List<string>;
    const endContext: number = parser.getXMLdata().indexOf(XMLConstants.TAG_TERM, parser.getCurrIndex());
    let attribute: string;
    let taskId: string = "";
    let handlerId: string = "";
    let operIdx: number = 0;

    if (endContext !== -1 && endContext < parser.getXMLdata().length) {
      // last position of its tag
      let tag: string = parser.getXMLsubstring(endContext);
      parser.add2CurrIndex(tag.indexOf(ConstInterface.MG_TAG_EXEC_STACK_ENTRY) + ConstInterface.MG_TAG_EXEC_STACK_ENTRY.length);

      tokensVector = XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);

      for (let j: number = 0; j < tokensVector.length; j += 2) {
        attribute = (tokensVector.get_Item(j));
        let valueStr: string = (tokensVector.get_Item(j + 1));

        switch (attribute) {
          case XMLConstants.MG_ATTR_TASKID:
            taskId = valueStr;
            break;
          case ConstInterface.MG_ATTR_HANDLERID:
            handlerId = valueStr;
            break;
          case ConstInterface.MG_ATTR_OPER_IDX:
            operIdx = XmlParser.getInt(valueStr);
            break;
        }
      }
      ClientManager.Instance.EventsManager.pushServerExecStack(taskId, handlerId, operIdx);
      parser.setCurrIndex(endContext + XMLConstants.TAG_TERM.length);
    }
    else
      Logger.Instance.WriteExceptionToLogWithMsg("in DataView.fillInnerExecStack() out of bounds");
  }

  /// <summary>
  ///   search for the invalidate attribute and if it is true then it also clears the dataview
  ///   execute this method BEFORE parsing the records
  /// </summary>
  /// <param name = "tokensVector">of all attributes and values</param>
  private peekInvalidate(tokensVector: List<string>): boolean {
    let sessionCounter: number = Task.CommandsProcessor.GetSessionCounter();

    for (let j: number = 0; j < tokensVector.length; j += 2) {
      let attribute = tokensVector.get_Item(j);
      if (attribute === (ConstInterface.MG_ATTR_INVALIDATE)) {
        let valueStr = tokensVector.get_Item(j + 1);

        if (XmlParser.getBoolean(valueStr)) {

          // QCR #2863: When executing RECURSIVE calls to the server there were cases
          // in which an older dataview superseds a new one because its parsing comes
          // after the parsing of the new dataview. The solution is to skip the
          // parsing of the older dataview if the newer dataview has invalidate=true
          if (sessionCounter < this._lastSessionCounter)
            this._skipParsing = true;
          else {
            this._lastSessionCounter = sessionCounter;
            this.clear();
            return true;
          }
        }
        return false;
      }
    }
    return false;
  }

  /// <summary>
  ///   get a field by its name
  /// </summary>
  /// <param name = "fldName">of the field </param>
  /// <returns> required field (or null if not found) </returns>
  getFieldByName(fldName: string): Field {

    if (this._fieldsTab !== null)
      return <Field>this._fieldsTab.getField(fldName);

    Logger.Instance.WriteExceptionToLogWithMsg("in DataView.getField(String): There is no fieldsTab object");
    return null;
  }

  /// <summary>
  ///   build the XML string for the dataview
  /// </summary>
  /// <param name = "message">the message buffer
  /// </param>
  public buildXML(message: StringBuilder): void {
    let dcv: DcValues;
    let taskTag: String = this._task.getTaskTag();
    let brkLevelIndex: number = this._task.getBrkLevelIndex();
    let currRecDeleted: boolean = false;
    let serverParent: String;

    let contextTask: Task = <Task>(this.getTask().GetContextTask());
    let invokingTaskTag: string = contextTask.IsOffline ? INVOKED_FROM_OFFLINE_TASK : contextTask.getTaskTag();

    // put the dataview tag even if there are no modified records just to let
    // the server know the current record
    message.Append("\n      <" + ConstInterface.MG_TAG_DATAVIEW + " " + XMLConstants.MG_ATTR_TASKID + "=\"" +
      taskTag + "\"");

    // QCR 423064 puts the current executing handler index
    message.Append(" " + ConstInterface.MG_ATTR_TASKLEVEL + "=\"" + brkLevelIndex + "\"");

    // If the trigger task is an Offline program, the parent on the server should be
    // the Main Program of the current CTL.
    serverParent = "0";
    let triggeringTask: Task = this.getTask().getTriggeringTask();
    if (triggeringTask != null) {
      if (triggeringTask.IsOffline) {
        let ctlIdx: number = triggeringTask.getCtlIdx();
        let mainPrg: Task = <Task> MGDataCollection.Instance.GetMainProgByCtlIdx(ctlIdx);
        serverParent = mainPrg.getTaskTag();
      }
      else
        serverParent = triggeringTask.getTaskTag();
    }

    if (this._currRecId > Int32.MinValue) {
      if (this.CurrRec != null)
        message.Append(" " + ConstInterface.MG_ATTR_CURR_REC + "=\"" + this._currRecId + "\"");
      message.Append(" " + ConstInterface.MG_ATTR_TASKMODE + "=\"" + this._task.getMode() + "\"");

      if (this._transCleared) {
        message.Append(" " + ConstInterface.MG_ATTR_TRANS_CLEARED + "=\"1\"");
        this._transCleared = false;
      }

      // QCR 779982 puts the invoking _task id and the direct parent _task id
      message.Append(" " + ConstInterface.MG_ATTR_INVOKER_ID + "=\"" + invokingTaskTag + "," + serverParent + "\"");

// put the current ((DataView)dataView) dvPos value
      if (this.getTask().isCached())
        message.Append(" " + ConstInterface.MG_ATTR_DVPOS_VALUE + "=\"" + this._dvPosValue + "\"");

      message.Append(" " + ConstInterface.MG_ATTR_LOOP_COUNTER + "=\"" + this.getTask().getLoopCounter() + "\"");

      // send subform visibility only if the subform with property "RefreshWhenHidden=N" and it is not visible,
      // i.e. not needed refresh from the server
      if (this._task.IsSubForm) {
        let subformCtrl: MgControl = <MgControl>this._task.getForm().getSubFormCtrl();
        if (!subformCtrl.isVisible() &&
          !subformCtrl.checkProp(PropInterface.PROP_TYPE_REFRESH_WHEN_HIDDEN, false))
          message.Append(" " + ConstInterface.MG_ATTR_SUBFORM_VISIBLE + "=\"0\"");
      }

      if (!this._task.IsInteractive)
        message.Append(" " + ConstInterface.MG_ATTR_TASK_COUNTER + "=\"" + this.getTask().getCounter() + "\"");

      // QCR#591973: lastRecid and oldFirstRecID should be sent by client.
      // In case of mouse scrolling, we park on the same record (don't leave the current record). So on server we get curr record on which
      // we were parked before scrolling. So we can not use this index to fetch the record.
      // In this case, we need to send the last fetched record's idx from client in case of scroll down
      // and oldFirstRecID (first record of last sent chunk) in case of scroll up, from which we need to fetch the chunk of records.
      if (this._task != null && this._task.checkProp(PropInterface.PROP_TYPE_PRELOAD_VIEW, false)) {
        message.Append(" " + ConstInterface.MG_ATTR_LAST_REC_ID + "=\"" +
          (this._recordsTab.getRecByIdx(this.getSize() - 1).getId()) + "\"");
        message.Append(" " + ConstInterface.MG_ATTR_OLD_FIRST_REC_ID + "=\"" +
          this._recordsTab.getRecByIdx(0).getId() + "\"");
      }


      // send the current position of the current rec in the forms table.
      // it can be used by the server to keep the record in this position after the view refresh.
      if (this._task.IsInteractive) {
        let form: MgForm = <MgForm>this._task.getForm();
        if (form != null && form.getRowsInPage() > 1) {
          message.Append(" " + ConstInterface.MG_ATTR_CURR_REC_POS_IN_FORM + "=\"" +
            form.getCurrRecPosInForm() + "\"");
        }
      }
      message.Append(XMLConstants.TAG_CLOSE);

      // Add User Ranges
      if (this.getTask().ResetRange || this.getTask().UserRngs != null) {
        message.Append(XMLConstants.START_TAG + ConstInterface.USER_RANGES);
        if (this.getTask().ResetRange) {
          message.Append(" " + ConstInterface.CLEAR_RANGE + "=\"1\"");
          this.getTask().ResetRange = false;
        }
        if (this.getTask().UserRngs != null) {
          this.getTask().buildXMLForRngs(message, this.getTask().UserRngs, false);
          this.getTask().UserRngs.Clear();
          this.getTask().UserRngs = null;
        }
        else message.Append(XMLConstants.TAG_TERM);
      }

      // Add User Locates
      if (this.getTask().ResetLocate || this.getTask().UserLocs != null) {
        message.Append(XMLConstants.START_TAG + ConstInterface.USER_LOCATES);
        if (this.getTask().ResetLocate) {
          message.Append(" " + ConstInterface.CLEAR_LOCATES + "=\"1\"");
          this.getTask().ResetLocate = false;
        }
        if (this.getTask().UserLocs != null) {
          this.getTask().buildXMLForRngs(message, this.getTask().UserLocs, true);
          this.getTask().UserLocs.Clear();
          this.getTask().UserLocs = null;
        }
        else message.Append(XMLConstants.TAG_TERM);
      }


      // Add User Sorts
      if (this.getTask().ResetSort || this.getTask().UserSorts != null) {
        message.Append(XMLConstants.START_TAG + ConstInterface.MG_TAG_SORTS);
        if (this.getTask().ResetSort) {
          message.Append(" " + ConstInterface.CLEAR_SORTS + "=\"1\"");
          this.getTask().ResetSort = false;
        }
        if (this.getTask().UserSorts != null)
          this.getTask().buildXMLForSorts(message);
        else
          message.Append(XMLConstants.TAG_TERM);
      }

      // send deleted cache entries
      if (this.getTask().isCached()) {
        let delList: String = this.getTask().getTaskCache().getDeletedListToXML();
        if (delList !== "") {
          message.Append(XMLConstants.START_TAG + ConstInterface.MG_TAG_DEL_LIST);
          message.Append(" " + XMLConstants.MG_ATTR_ID + "=\"" + this._task.getTaskTag() + "\"");
          message.Append(" " + ConstInterface.MG_ATTR_REMOVE + "=\"" + delList + "\"");
          message.Append(XMLConstants.TAG_TERM);

          // if the current active dataview is in the deltede list mark it as un-valid so
          // it wont enter the cache on return from server
          if (this.getTask().getTaskCache().isDeleted(this._dvPosValue))
            this.setChanged(true);
          this.getTask().getTaskCache().clearDeletedList();
        }
      }

      // remove unnecessary data control values
      let dcValKeys: string[] = this._dcValsCollection.Keys;

      dcValKeys.forEach((dcValKey: string) => {
        dcv = this._dcValsCollection.get_Item(dcValKey);

        if (!dcv.HasReferences) {
          message.Append(XMLConstants.START_TAG + ConstInterface.MG_TAG_DC_VALS);
          message.Append(" " + XMLConstants.MG_ATTR_ID + "=\"" + dcv.getId() + "\"");
          message.Append(" " + ConstInterface.MG_ATTR_REMOVE + "=\"1\"");
          message.Append(XMLConstants.TAG_TERM);

          this._dcValsCollection.Remove(dcValKey);
        }
      });

      if (this.CurrRec != null)
        currRecDeleted = (this.CurrRec.getMode() === DataModificationTypes.Delete
          && this._modifiedRecordsTab.getRecord(this.CurrRec.getId()) != null && this.CurrRec.SendToServer);

      // If the current user event being handled has Force exit = 'Pre Record Update', then
      // do not add current record to the modified records list. We anyway send current
      // record separately.
      let skipCurrRec: boolean = false;

      if (this.CurrRec != null && this._modifiedRecordsTab.getRecord(this.CurrRec.getId()) != null)
        skipCurrRec = ClientManager.Instance.EventsManager.isForceExitPreRecordUpdate(this.getTask());

      this._modifiedRecordsTab.buildXML(<FieldsTable>this._fieldsTab, message, skipCurrRec, this.CurrRec.getId());

      if (this._original != null)
        this._original.clearMode();

      for (let i: number = this._modifiedRecordsTab.getSize() - 1; i >= 0; i--) {
        if (skipCurrRec && this._modifiedRecordsTab.getRecByIdx(i).getId() === this.CurrRec.getId())
          continue;

        this._modifiedRecordsTab.getRecByIdx(i).clearFlagsHistory();
        this._modifiedRecordsTab.removeRecord(i);
      }

      if (this.CurrRec != null && !currRecDeleted) {

        // When we reconnect to the server once it is disconnected, server will create a new context and
        // therefore MP variables are with their intial (empty) value and not with their real values.
        // So, we must always send Main program's field's latest  values to the server.
        let forceBuild: boolean = (this._task.isMainProg() && ClientManager.Instance.RuntimeCtx.ContextID === RemoteCommandsProcessor.RC_NO_CONTEXT_ID);
        this.CurrRec.buildXML(message, true, forceBuild);
      }
    }

    // QCR 779982 if we have main prog with no select's send the invoker and parent _task
    else {
      message.Append(" " + ConstInterface.MG_ATTR_INVOKER_ID + "=\"" + invokingTaskTag + "," + serverParent + "\"" +
        XMLConstants.TAG_CLOSE);
    }
    message.Append("\n      </" + ConstInterface.MG_TAG_DATAVIEW + XMLConstants.TAG_CLOSE);
  }

/// <summary>
  ///   get a reference to the current record
  /// </summary>
  /// <returns> Record is the reference to the current record </returns>
  getCurrRec(): Record {
    if (this.CurrRec === null && this._currRecId > Int32.MinValue) {
      if (!this.setCurrRec(this._currRecId, true))
        Logger.Instance.WriteExceptionToLogWithMsg("DataView.getCurrRec(): record " + this._currRecId + " not found");
    }
    return this.CurrRec;
  }

  /// <summary>
  ///   get a reference to the previous current record
  /// </summary>
  /// <returns> Record is the reference to the previous current record </returns>
  getPrevCurrRec(): Record {
    return this._prevCurrRec;
  }

  /// <summary>
  ///   get a reference to the original record
  /// </summary>
  /// <returns> Record is the reference to the original record
  /// </returns>
  getOriginalRec(): Record {

    if (this._original === null || this._original.getId() !== this.CurrRec.getId())
      return this.CurrRec;
    return this._original;
  }

  /// <summary>
  ///   set the current record - returns true on success
  /// </summary>
  /// <param name = "id">the record id
  /// </param>
  /// <param name = "compute">if true then execute compute for the new record
  /// </param>
  setCurrRec(id: number, compute: boolean): boolean {
    let oldRecId: number = this._currRecId;

    if (id > Int32.MinValue) {
      let newIdx: number = this._recordsTab.getRecIdx(id);

      if (newIdx === -1)
        this._original = null;
      else {
        try {
          let ignoreCurrRec: boolean = this._currRecId === Int32.MinValue;
          this.setCurrRecByIdx(newIdx, !ignoreCurrRec, ignoreCurrRec, compute, Int32.MinValue);
          if (id !== oldRecId)
            this.saveOriginal();
          return true;
        }
        catch (exception) {
          if (exception instanceof RecordOutOfDataViewException) {
          }
          else
            throw exception;
        }
      }
    }
    else {
      // do not point to any current record
      this.CurrRec = null;
      this._original = null;
      this._currRecId = Int32.MinValue;
    }
    return false;
  }

  /// <summary>
  ///   Set the current record index and returns true for success
  ///   Use the MG_DATAVIEW_FIRST_RECORD and MG_DATAVIEW_LAST_RECORD constants
  ///   to retrieve the first or the last record respectively
  /// </summary>
  /// <param name = "newIdx">the new index </param>
  /// <param name = "doSuffix">if true then do the record suffix for the previous record when the record was changed </param>
  /// <param name = "ignoreCurrRec">if true all the operations are done is if there is no current record </param>
  /// <param name = "compute">if true then execute compute for the new record </param>
  /// <param name = "newDisplayLine">to update form </param>
  setCurrRecByIdx(newIdx: number, doSuffix: boolean, ignoreCurrRec: boolean, compute: boolean, newDisplayLine: number): void {
    let lastRecIdx: number = this._recordsTab.getSize() - 1;
    let oldFirstRec: Record, nextRec: Record;

    // QCR #984960: the variable recordSuff is used to recognize if we have pressed
    // ctrl+home or ctrl+end in these cases we must initiate record suffix
    // the correct way to do this is using the doSuffix parameter but since it is used
    // in a lot of cases sometime not in a correct way, forcing record suffix
    // using doSuffix will cause many changes in the code.
    let recordSuff: boolean = false;

    if (newIdx === Constants.MG_DATAVIEW_FIRST_RECORD) {

      // As moving to first record in the view, recordsBeforeCurrentView should be 0.
      if (this.getTask().isTableWithAbsolutesScrollbar()) {
        this.RecordsBeforeCurrentView = 0;
      }

      if (this._includesFirst) {
        // check if the current record is already the first record of the data view
        if (this._currRecIdx >= 0 || this._currRecIdx === Int32.MinValue) {
          newIdx = 0;

          // ctrl+home wase pressed
          recordSuff = true;
        }
        else
          throw new RecordOutOfDataViewException(RecordOutOfDataViewException_ExceptionType.TOP);
      }
      else {
        this.fetchChunkFromServer(CHUNK_DV_TOP, doSuffix);
        this.setCurrRecByIdx(newIdx, false, ignoreCurrRec, compute, SET_DISPLAYLINE_BY_DV);
        return;
      }
    }
    else if (newIdx === Constants.MG_DATAVIEW_LAST_RECORD) {
      if (this._includesLast) {
        // check if the current record is already the last record of the data view
        if (this._currRecIdx <= lastRecIdx) {
          newIdx = lastRecIdx;
          // ctrl+end was pressed
          recordSuff = true;
        }
        else throw new RecordOutOfDataViewException(RecordOutOfDataViewException_ExceptionType.BOTTOM);
      }
      else {
        // If last record is not in the view, and being fetched from the server, RecordsBeforeCurrentView = TotalRecordsCount. And as this chunk get added
        // into records table, the RecordsBeforeCurrentView will be decremented by no of rows in view.
        // This is because, we open the cursor with reverse direction for which do not bring the counts from gateway.
        if (this.getTask().isTableWithAbsolutesScrollbar())
          this.RecordsBeforeCurrentView = this.TotalRecordsCount;

        this.fetchChunkFromServer(CHUNK_DV_BOTTOM, doSuffix);

        if (!this._includesLast)
          throw new RecordOutOfDataViewException(RecordOutOfDataViewException_ExceptionType.BOTTOM);

        let form: MgForm = <MgForm>this._task.getForm();
        if (form != null) {
          while (!this._includesFirst && form.getRowsInPage() >= this.getSize()) {
            this.fetchChunkFromServer(CHUNK_CACHE_PREV, false);
          }
        }
        this.setCurrRecByIdx(newIdx, false, ignoreCurrRec, compute, SET_DISPLAYLINE_BY_DV);
        return;
      }
    }
    // check whether the record was not found beyond the TOP end
    else if (newIdx < 0) {
      if (this._includesFirst)
        throw new RecordOutOfDataViewException(RecordOutOfDataViewException_ExceptionType.TOP);

      oldFirstRec = this._recordsTab.getRecByIdx(0);

      if (this._recordsTab.getSize() > 0 || this.IncludesLast())
        this.fetchChunkFromServer(CHUNK_CACHE_PREV, doSuffix);
      // if no records and its first simulate start table
      else if (this._recordsTab.getSize() === 0 && this.IncludesFirst())
        this.fetchChunkFromServer(CHUNK_DV_TOP, doSuffix);
      else
        Logger.Instance.WriteExceptionToLogWithMsg("in DataView.fetchChunkFromServer() wrong option");

      // get the new index of the record which was first before the fetch
      let oldFirstNewIdx: number = oldFirstRec != null
        ? this._recordsTab.getRecIdx(oldFirstRec.getId())
        : this._recordsTab.getSize();
      if (oldFirstNewIdx !== 0)
        this.setCurrRecByIdx(oldFirstNewIdx + newIdx, false, ignoreCurrRec, compute, SET_DISPLAYLINE_BY_DV);
      return;
    }
    // check whether the record was not found beyond the BOTTOM end
    else if (newIdx > lastRecIdx) {
      if (this._includesLast)
        throw new RecordOutOfDataViewException(RecordOutOfDataViewException_ExceptionType.BOTTOM);
      this.fetchChunkFromServer(CHUNK_CACHE_NEXT, doSuffix);
      this.setCurrRecByIdx(newIdx, false, ignoreCurrRec, compute, SET_DISPLAYLINE_BY_DV);
      return;
    }

    // QCR # 984960 - see documentation for the variable recordSuff in the top of this method
    if (recordSuff || newIdx !== this._currRecIdx || ignoreCurrRec && compute) {
      if (!ignoreCurrRec && doSuffix && this.CurrRec != null) {
        let oldRecTabSize: number = this._recordsTab.getSize();

        nextRec = this._recordsTab.getRecByIdx(newIdx);
        if (nextRec.isNewRec()) {
          if (this._task.getMode() !== Constants.TASK_MODE_CREATE &&
            !this._task.checkProp(PropInterface.PROP_TYPE_ALLOW_CREATE, true))
            ClientManager.Instance.EventsManager.setStopExecution(true);
        }

        if (!ClientManager.Instance.EventsManager.GetStopExecutionFlag()) {
          let orgTopRecIdx: number = 0;
          if (this._topRecIdxModified) {
            orgTopRecIdx = this.getTopRecIdx();
            this.restoreTopRecIdx();
          }
          ClientManager.Instance.EventsManager.handleInternalEventWithTask(this._task, InternalInterface.MG_ACT_REC_SUFFIX);
          if (this._topRecIdxModified)
            this.setTopRecIdx(orgTopRecIdx);
        }
        if (ClientManager.Instance.EventsManager.GetStopExecutionFlag())
          throw new RecordOutOfDataViewException(RecordOutOfDataViewException_ExceptionType.REC_SUFFIX_FAILED);

        // QCR #2046: when the next record is different than the current one we should
        // allow the execution of the record prefix by setting the _task level to TASK.
        if (nextRec !== this.CurrRec && this.getTask().getAfterRetry())
          this._task.setLevel(Constants.TASK_LEVEL_TASK);

        // if the records table size was decreased during handling the
        // record suffix (e.g. cancel edit) and the user tries to move to
        // a record with a higher index then we should also decrease the
        // newIdx to reflect the change
        if (oldRecTabSize - 1 === this._recordsTab.getSize() && this._currRecIdx < newIdx)
          newIdx--;

        // the new curr rec may be already set by the events chain triggered by the
        // record suffix above - in that case there is no need to continue
        if (newIdx === this._currRecIdx) {

          // QCR 918983 changes to the _task mode must be done before recompute
          if (this._task.getMode() === Constants.TASK_MODE_CREATE && !this.CurrRec.isNewRec() &&
            !this._task.getForm().inRefreshDisplay())
            this._task.setMode(Constants.TASK_MODE_MODIFY);
          return;
        }
      }
      this.CurrRec = this._recordsTab.getRecByIdx(newIdx);

      if (this.CurrRec == null)
        throw new ApplicationException("in DataView.setCurrRecByIdx() current record not found!");

      this._currRecId = this.CurrRec.getId();
      this._currRecIdx = newIdx;

      if (this._task.getForm() != null) {

        // QCR #107926, we must update display line here, since currRecCompute which is activated later
        // may go to server and cause refresh display.
        // In case of adding new node to the tree, the node must be actually added to the tree.
        if (newDisplayLine === SET_DISPLAYLINE_BY_DV) {
          (<MgForm>(this._task.getForm())).updateDisplayLineByDV();
        }
        else
          this._task.getForm().DisplayLine = newDisplayLine;
      }
      // QCR 918983 changes to the _task mode must be done before recompute
      if (this._task.getMode() === Constants.TASK_MODE_CREATE && !this.CurrRec.isNewRec() &&
        !this._task.getForm().inRefreshDisplay())
        this._task.setMode(Constants.TASK_MODE_MODIFY);

      if (compute)
        this.currRecCompute(false);
    }
  }

  /// <summary>
  ///   recompute ALL the init expressions of the current record - call this method when
  ///   entering a record
  /// </summary>
  /// <param name = "forceClientCompute">if TRUE forces the client to compute the record even if it is flagged
  ///   as "server computed".
  /// </param>
  currRecCompute(forceClientCompute: boolean): void {
    (<FieldsTable>this._fieldsTab).invalidate(false, true);
    this.compute(false, forceClientCompute);
  }

  /// <summary>
  ///   saves a replication of the current record
  /// </summary>
  saveOriginal(): void {
    if (!this.CurrRec.Modified)
      this._original = this.CurrRec.replicate();
  }

  /// <summary>
  ///   fetch a chunk of records from the server
  /// </summary>

  public fetchChunkFromServer(chunkId: string, doSuffix: boolean): void {

    // QCR #430134: if the server sent us records fewer than the number that fits into a table
    // then we go back to the server and must refresh the screen.
    (<MgForm>this._task.getForm()).FormRefreshed = true;

    if (doSuffix && this.CurrRec != null) {
      ClientManager.Instance.EventsManager.handleInternalEventWithTask(this._task, InternalInterface.MG_ACT_REC_SUFFIX);
      if (ClientManager.Instance.EventsManager.GetStopExecutionFlag() || this._task.isAborting())
        throw new RecordOutOfDataViewException(RecordOutOfDataViewException_ExceptionType.REC_SUFFIX_FAILED);
      (<MgForm>this._task.getForm()).setSuffixDone(); // QCR 758639
    }

    let eventCode: number;
    let clientRecId: number = this._currRecId;
    switch (chunkId) {
      case CHUNK_DV_TOP:
        eventCode = InternalInterface.MG_ACT_DATAVIEW_TOP;
        break;
      case CHUNK_DV_BOTTOM:
        eventCode = InternalInterface.MG_ACT_DATAVIEW_BOTTOM;
        break;
      case CHUNK_CACHE_PREV:
        clientRecId = this.FirstRecord == null ? 0 : this.FirstRecord.getId();
        eventCode = InternalInterface.MG_ACT_CACHE_PREV;
        break;
      case CHUNK_CACHE_NEXT:
        eventCode = InternalInterface.MG_ACT_CACHE_NEXT;
        clientRecId = this.LastRecord == null ? 0 : this.LastRecord.getId();
        break;
      default:
        Logger.Instance.WriteExceptionToLogWithMsg("in DataView.fetchChunkFromServer() unknown chunk id: " + chunkId);
        return;
    }
    let cmd: EventCommand = CommandFactory.CreateEventCommand(this._task.getTaskTag(), eventCode);
    cmd.ClientRecId = clientRecId;
    this.getTask().DataviewManager.Execute(cmd);
  }

/// <summary>
  ///   returns true if and only if a record with the given index exist
  /// </summary>
  /// <param name = "recIdx">index to check </param>
  recExists(recIdx: number): boolean {
    let lastRecIdx: number = this._recordsTab.getSize() - 1;
    return recIdx >= 0 && recIdx <= lastRecIdx;
  }

  /// <summary>
  ///   checks if the if the current first record exist
  ///   in case there is no locate check include first
  /// </summary>
  checkFirst(locateFirst: number): boolean {
    return this._recordsTab.getRecord(locateFirst) !== null;
  }

  /// <summary>
  ///   get the current record index
  /// </summary>
  /// <returns> the record index </returns>
  getCurrRecIdx(): number {
    if (this._currRecIdx === Int32.MinValue) {
      if (!this.setCurrRec(this._currRecId, true)) {
        if (!this.getTask().HasMDIFrame) {
          Logger.Instance.WriteWarningToLogWithMsg("DataView.getCurrRecIdx(): _task " +
            (this.getTask()).PreviouslyActiveTaskId +
            ", record " + this._currRecId + " not found");
        }
      }
    }
    return this._currRecIdx;
  }

  /// <summary>
  /// return the dbviewrowid for the current record
  /// </summary>
  getCurrDBViewRowIdx(): number {
    return this.CurrRec.getDBViewRowIdx();
  }


  /// <summary>
  ///   set the top record index and saves the old value
  /// </summary>
  /// <param name = "newTopRecIdx">the new value for the top record index </param>
  setTopRecIdx(newTopRecIdx: number): void {
    this._oldTopRecIdx = this.getTopRecIdx();
    this._topRecIdx = newTopRecIdx;
  }

  /// <summary>
  ///   get the top record index
  /// </summary>
  getTopRecIdx(): number {
    return this._topRecIdx;
  }

  /// <summary>
  ///   set the top record index modified
  /// </summary>
  /// <param name = "val">the new value for topRecIdxModified </param>
  setTopRecIdxModified(val: boolean): void {
    this._topRecIdxModified = val;
  }

  /// <summary>
  ///   get the chunk size index
  /// </summary>
  getChunkSize(): number {
    return this._chunkSize;
  }

  /// <summary>
  ///   restore the old saved value of the top record index
  /// </summary>
  restoreTopRecIdx(): void {
    this._topRecIdx = this._oldTopRecIdx;
  }

  /// <summary>
  ///   removes all the records from the Dataview
  /// </summary>
  clear(): void {
    this._recordsTab.removeAll();
    this._original = null;
    let mgForm: MgForm = <MgForm>this._task.getForm();
    if (mgForm !== null) {
      this._task.getForm().SetTableItemsCount(0, true);
    }
    this._modifiedRecordsTab.removeAll();
    this.init();
  }

  /// <summary>
  ///   initialize the class members
  /// </summary>
  private init(): void {
    this._currRecId = Int32.MinValue;
    this._currRecIdx = Int32.MinValue;
    this.CurrRec = null;
    this._prevCurrRec = null;
    this._includesFirst = false;
    this._includesLast = false;
    this.IsOneWayKey = false;
    this.setTopRecIdx(Int32.MinValue);
    (<FieldsTable>this._fieldsTab).invalidate(false, true);
  }

  /// <summary>
  ///   refreshes the subForms
  /// </summary>
  computeSubForms(): void {
    // we do not need to go to the server due to updates
    if (this.getTask().prepareCache(true)) {

      // one of the needed d.v was not found in the cache
      if (!this.getTask().testAndSet(true))
        this.compute(true, false);
    }
    else
      this.compute(true, false);
  }

  /// <summary>
  ///   compute the values of the fields without updating the display
  /// </summary>
  /// <param name = "subForms">if true the a subForms compute is to be done</param>
  /// <param name = "forceClientCompute">if TRUE forces the client to compute the record even if it is flagged
  ///   as "server computed".
  /// </param>
  private compute(subForms: boolean, forceClientCompute: boolean): void {
    let tmpRec: Record = null;
    let computeByServer: boolean = !this.computeByClient();
    let orgComputeBy: string = this._computeBy;
    /*'C'*/
    if (forceClientCompute)
      this._computeBy = COMPUTE_NEWREC_ON_CLIENT/*'C'*/;

    try {
      this.CurrRec.setInCompute(true);

      if (!subForms) {
        if (this.CurrRec.isNewRec()) {
          if (this._task.getMode() !== Constants.TASK_MODE_CREATE /*'C'*/ && !super.isEmptyDataview()) {
            this._task.setMode(Constants.TASK_MODE_CREATE)/*'C'*/;
          }
        }
        else if (this._task.getMode() === Constants.TASK_MODE_CREATE) {
          this._task.setMode(Constants.TASK_MODE_MODIFY)/*'M'*/;
        }
      }

      let getRecordData: boolean = computeByServer;
      // for newly created records - go to the server (if they were not computed already)
      if (subForms || (getRecordData && !this.CurrRec.isComputed() && !forceClientCompute)) {
        let command: IClientCommand = CommandFactory.CreateComputeEventCommand(this._task.getTaskTag(), subForms, this._currRecId);
        (<Task>this._task).DataviewManager.Execute(command);
      }
      else {
        // QCR #921475 - relink during compute destroys values of virtual fields with no init exp.
        // thus we save them before the compute and restore them during the loop.
        if (getRecordData) {
          tmpRec = new Record(this.CurrRec.getId(), this, true);
        }

        (<FieldsTable>this._fieldsTab).setServerRcmp(false);
        let from: number = (<FieldsTable>this._fieldsTab).getRMIdx();
        let size: number = (<FieldsTable>this._fieldsTab).getRMSize();

        for (let i: number = from; i < from + size; i = i + 1) {
          let fld: Field = <Field>this._fieldsTab.getField(i);
          if (getRecordData && (<FieldsTable>this._fieldsTab).serverRcmpDone() && fld.IsVirtual && !fld.VirAsReal && !fld.hasInitExp()) {
            let currRec2: Record = this.CurrRec;
            this.CurrRec = tmpRec;
            try {
              fld.takeValFromRec();
            }
            finally {
              this.CurrRec = currRec2;
            }
          }
          fld.compute(false);
        }
        if (this._task !== null && this._task.getForm() !== null) {
          (<MgForm>this._task.getForm()).RecomputeTabbingOrder(true);
        }
      }
    }
    finally {
      this.CurrRec.setInCompute(false);
      this.CurrRec.setLateCompute(false);
      this._computeBy = orgComputeBy;
    }
  }

  addRecord(doSuffix: boolean, ignoreCurrRec: boolean): number;
  addRecord(doSuffix: boolean, ignoreCurrRec: boolean, isFirstRecord: boolean, newCurrRecId: number, mode: DataModificationTypes): number;
  addRecord(doSuffix: boolean, ignoreCurrRec: boolean, isFirstRecord?: boolean, newCurrRecId?: number, mode?: DataModificationTypes): number {
    if (arguments.length === 2)
      return this.addRecord_0(doSuffix, ignoreCurrRec);
    else
      return this.addRecord_1(doSuffix, ignoreCurrRec, isFirstRecord, newCurrRecId, mode);
  }

  /// <summary>
  ///   create and add a record to the dataview and make it the current record
  /// </summary>
  /// <param name = "doSuffix">if true then do the suffix of the previous record </param>
  /// <param name = "ignoreCurrRec">if true then do the suffix of the previous record</param>
  /// <returns> the new rec index </returns>
  private addRecord_0(doSuffix: boolean, ignoreCurrRec: boolean): number {
    let newCurrRecId: number = (--this._lastCreatedRecId);
    let mode: DataModificationTypes = DataModificationTypes.Insert;
    return this.addRecord(doSuffix, ignoreCurrRec, false, newCurrRecId, mode);
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="doSuffix">if true then do the suffix of the previous record</param>
  /// <param name="ignoreCurrRec">if true then do the suffix of the previous record</param>
  /// <param name="isFirstRecord"> is first record</param>
  /// <param name="newCurrRecId"> new record id</param>
  /// <param name="mode"> operation mode</param>
  /// <returns>the new rec index</returns>
  private addRecord_1(doSuffix: boolean, ignoreCurrRec: boolean, isFirstRecord: boolean, newCurrRecId: number, mode: DataModificationTypes): number {

    // give the new record a negative id
    let rec: Record = new Record(newCurrRecId, this, false, isFirstRecord);

    let newCurrRecIdx: number = (this._currRecIdx !== Int32.MinValue) ?
      (this._currRecIdx + 1)
      : 0;

    this._recordsTab.insertRecord(rec, newCurrRecIdx);
    rec.setMode(mode);

    try {
      let compute: boolean = !isFirstRecord;
      this.setCurrRecByIdx(newCurrRecIdx, doSuffix, ignoreCurrRec, compute, Int32.MinValue);

      // while we in create mode don't set reset to _newRec
      if (isFirstRecord && this.getTask().getMode() !== Constants.TASK_MODE_CREATE)
        rec.setOldRec();
    }
    catch (execption) {
      if (execption instanceof RecordOutOfDataViewException) {
        if (ClientManager.Instance.EventsManager.GetStopExecutionFlag())
          newCurrRecIdx = -1;
        else
          throw new ApplicationException("in DataView.addRecord() invalid exception");

      }
      else
        throw execption;
    }
    return newCurrRecIdx;
  }

  /// <summary>
  ///   remove the current record from the dataview
  /// </summary>
 removeCurrRec(): void {
    let mgForm: MgForm = <MgForm>this._task.getForm();
    let onDelete: boolean; // true if we are removing the record due to delete. false if due to cancel on insert

    if (this.CurrRec.getMode() === DataModificationTypes.Insert &&
      !this.getTask().transactionFailed(ConstInterface.TRANS_RECORD_PREFIX)) {
      // the record was created by the client so it has to be removed from the
      // modified records table (if it is already there) because the server
      // doesn't have to know anything about it
      this._modifiedRecordsTab.removeRecord(this.CurrRec);
      onDelete = false;
    }
    else {
      // move the current record from the records table to the modified table
      this.CurrRec.clearMode();
      this.CurrRec.setMode(DataModificationTypes.Delete);
      onDelete = true;
    }
    this.CurrRec.removeRecFromDc();
    this._recordsTab.removeRecord(this._currRecIdx);
    this.setChanged(true);

    if (this.isEmpty() && !(<Task>this._task).IsTryingToStop) {
      this.MoveToEmptyDataviewIfAllowed();
    }

    let newDisplayLine: number = this.calcLineToMove(onDelete);
    try {
      if (mgForm.isScreenMode()) {
        this.setCurrRecByIdx(newDisplayLine, false, false, true, SET_DISPLAYLINE_BY_DV);
      }
      else {
        mgForm.setCurrRowByDisplayLine(newDisplayLine, false, true);
      }
    }
    catch (exception) {
      if (exception instanceof RecordOutOfDataViewException) {
        // if the current index is beyond the bottom end of the dataview
        // try to set it to the preceding record
        try {
          if (!super.isEmptyDataview())
            newDisplayLine = mgForm.getPrevLine(newDisplayLine);
          if (mgForm.isScreenMode())
            this.setCurrRecByIdx(newDisplayLine, false, false, true, SET_DISPLAYLINE_BY_DV);
          else
            mgForm.setCurrRowByDisplayLine(newDisplayLine, false, true);
        }
        catch (exception) {
          if (exception instanceof RecordOutOfDataViewException) {

            // no more records in the dataview
            // or no nodes in the tree
            this.reset();
          }
          else
            throw exception;
        }
      }
      else
        throw exception;
    }
  }

  /// <summary>
  /// remove record
  /// </summary>
  /// <param name="record"></param>
  RemoveRecord(record: Record): void {
    let recIdx: number = this._recordsTab.getRecIdx(record.getId());

    if (this._topRecIdx > recIdx)
      this._topRecIdx--;
    if (this._oldTopRecIdx > recIdx)
      this._oldTopRecIdx--;
    if (this._currRecIdx > recIdx)
      this._currRecIdx--;
    this._recordsTab.removeRecord(record);
  }

  /// <summary>
  /// move to empty dataview if allowed
  /// </summary>
  MoveToEmptyDataviewIfAllowed(): void {
    if (!super.isEmptyDataview() && (<Task>this._task).getMode() !== Constants.TASK_MODE_CREATE) {
      if (this._task.checkProp(PropInterface.PROP_TYPE_ALLOW_EMPTY_DATAVIEW, true))
        super.setEmptyDataview(true);
    }
    else {
      if ((<Task>this._task).getMode() === Constants.TASK_MODE_CREATE && super.isEmptyDataview())
        super.setEmptyDataview(false);
    }
  }

  /// <summary>
  ///   returns display line to move after delete
  /// </summary>
  /// <param name = "onDelete">true if we are removing the record due to delete. false if due to cancel on insert
  /// </param>
  /// <returns>
  /// </returns>
  private calcLineToMove(onDelete: boolean): number {
    let newDisplayLine: number;

    // if the record is removed due to its deletion, we need to got to the next record in the view -
    // now that we deleted the current record, the index of the next record is the same index that was
    // of the record that was deleted.

    if (onDelete)
      newDisplayLine = this._currRecIdx;
    else {
      // #750190 Shaya
      // move to the PREV record after cancel
      if (this._currRecIdx > 0)
        newDisplayLine = this._currRecIdx - 1;
      else
        newDisplayLine = this._currRecIdx;
    }
    return newDisplayLine;
  }

  /// <summary>
  ///   reset values if there is no current record
  /// </summary>
  reset(): void {
    this._currRecId = Int32.MinValue;
    this._currRecIdx = Int32.MinValue;
    this.CurrRec = null;
    this.setTopRecIdx(Int32.MinValue);
    this.SetIncludesFirst(true);
    this.SetIncludesLast(true);
  }

  /// <summary>
  ///   cancel the editing of the current record and restore the old values of
  ///   the fields
  /// </summary>
  /// <param name = "onlyReal">if true only restores the values of the real fields. </param>
  /// <param name = "recomputeUnknowns">re-perform unknown recomputes. </param>
  cancelEdit(onlyReal: boolean, recomputeUnknowns: boolean): boolean {
    let tempCurrRec: Record = null;
    let recRemoved: boolean = false;
    let inEndTask: boolean = (<Task>this._task).InEndTask;

    // QCR #362903 - At _task suffix, we want to preserve the last values of the virtuals.
    if (inEndTask)
      onlyReal = true;

    if (this.CurrRec.getMode() === DataModificationTypes.Insert && this.CurrRec.isNewRec()) {
      if ((this._includesFirst && this._includesLast && (this._recordsTab === null || this._recordsTab.getSize() === 1)) || !this.HasMainTable) {

        // defect 121968. When from the parent task "ViewRefresh" or "Cancel" are done and the subform is in Create node
        // and the subform has no records, _original is null. So pass it.
        if (this._original !== null) {
          this.CurrRec.setSameAs(this._original, onlyReal);
        }
      }
      else {
        this.removeCurrRec();
        recRemoved = true;
        this._original = this.CurrRec.replicate(); // must copy again to prevent altering the original values
      }
    }
    // if (currRec.modified())
    else {
      if (!this.CurrRec.Modified) {
        let currCtrl: MgControl = <MgControl>this._task.getLastParkedCtrl();
        if (currCtrl !== null)
          currCtrl.resetPrevVal();
      }

      if (recomputeUnknowns)
        tempCurrRec = this.CurrRec.replicate();

      // ATTENTION !!!
      // we don't step over the currRec reference with the original record
      // to assure that if this record is both in the records table and in
      // the modified table these tables will keep referencing the same instance
      if (this._original !== null)
        this.CurrRec.setSameAs(this._original, onlyReal);

      if ((this._original !== null && recomputeUnknowns) && !this.CurrRec.isSameRecData(tempCurrRec, false, false))
        this.execUnknownRcmps(this._original);

      this.takeFldValsFromCurrRec();
      this._original = this.CurrRec.replicate(); // must copy again to prevent altering the original values
    }
    return recRemoved;
  }

  /// <summary>
  ///   check if there are no records in the dataview
  /// </summary>
  isEmpty(): boolean {
    return this._includesFirst && this._includesLast && (this._recordsTab === null || this._recordsTab.getSize() === 0);
  }

  addCurrToModified(): void;
  addCurrToModified(setRecToOld: boolean): void;
  addCurrToModified(setRecToOld?: boolean): void {
    if (arguments.length === 0) {
      this.addCurrToModified_0();
      return;
    }
    this.addCurrToModified_1(setRecToOld);
  }

  /// <summary>
  ///   add the current record to the modified records table - if it is not already there
  /// </summary>
  private addCurrToModified_0(): void {
    this.addCurrToModified(true);
  }

  /// <summary>
  ///   add the current record to the modified records table - if it is not already there
  /// </summary>
  /// <param name="isSetOldRec"></param>
  private addCurrToModified_1(setRecToOld: boolean): void {
    this._modifiedRecordsTab.addRecord(this.CurrRec);
    if (setRecToOld) {
      this.CurrRec.setOldRec();
    }
    let command: IClientCommand = CommandFactory.CreateSetTransactionStateDataviewCommand(this.getTask().getTaskTag(), true);
    this.getTask().DataviewManager.RemoteDataviewManager.Execute(command);
  }

  /// <summary>
  ///   returns the value of the field from the previous record
  /// </summary>
  /// <param name = "fld">a reference to the field descriptor </param>
  /// <returns> a String array in which:
  ///   cell[1] is the real value of the field
  ///   cell[0] is a null flag ("1" means a null value)
  /// </returns>
  getDitto(fld: Field): string[] {
    let fldVal: string[] = new Array<string>(2);

    // if the current record is the first in the cache don't bother to get the ditto
    if (this._currRecIdx <= 0)
      return null;

    try {
      if (this._task.getForm() !== null) {
        // switch the current record to the previous record
        this.setCurrRecByIdx(this._currRecIdx - 1, false, false, true, SET_DISPLAYLINE_BY_DV);
        fld.compute(false);
        fldVal[0] = (fld.isNull() ? "1" : "0");
        fldVal[1] = fld.getValue(false);
        // restore the current record
        this.setCurrRecByIdx(this._currRecIdx + 1, false, false, true, SET_DISPLAYLINE_BY_DV);
      }
    }
    catch (exception) {
      if (exception instanceof RecordOutOfDataViewException) {
        return null;
      }
      else
        throw exception;
    }
    return fldVal;
  }

  /// <summary>
  ///   take the field values from the current record
  /// </summary>
  takeFldValsFromCurrRec(): void {
    (<FieldsTable>this._fieldsTab).takeValsFromRec();
  }

  /// <summary>
  ///   compare a selected fields values between the current record and the previous record
  ///   and return true if their values are equal
  /// </summary>
  /// <param name = "fldList">the list of field indexes to compare
  /// </param>
  currEqualsPrev(fldList: number[]): boolean {
    if (this.CurrRec !== null && this._prevCurrRec !== null) {
      if (this.CurrRec === this._prevCurrRec)
        return true;

      for (let i: number = 0; i < fldList.length; i = i + 1) {
        if (!this.CurrRec.fldValsEqual(this._prevCurrRec, fldList[i]))
          return false;
      }
    }
    else if (this.CurrRec !== this._prevCurrRec)
  return false;

    return true;
  }

  /// <summary>
  ///   return a reference to the _task of this dataview
  /// </summary>
  getTask(): Task {
    Debug.Assert(this._task instanceof Task);
    return <Task>this._task;
  }

  /// <summary>
  ///   return a reference to the form for _task of this dataview
  /// </summary>
  getForm(): MgForm {
    return <MgForm>this._task.getForm();
  }

  /// <summary>
  ///   return the number of records in the modified records table
  /// </summary>
  modifiedRecordsNumber(): number {
    return this._modifiedRecordsTab.getSize();
  }

  /// <summary>
  ///   return the number of records in the dataview
  /// </summary>
  getSize(): number {
    return this._recordsTab.getSize();
  }

  /// <summary>
  ///   returns true if the client knows how to init a new record.
  /// </summary>
  computeByClient(): boolean {
    return this._computeBy === COMPUTE_NEWREC_ON_CLIENT/*'C'*/;
  }

  /// <summary>
  ///   is Record exists in the DataView
  /// </summary>
  /// <param name = "id">of needed record </param>
  /// <returns> true if the record exists </returns>
  recExistsById(id: number): boolean {
    return this._recordsTab.getRecord(id) !== null;
  }


  ParametersExist(iPos: number, iLen: number): boolean;
  ParametersExist(): boolean;
  ParametersExist(iPos?: number, iLen?: number): boolean {
    if (arguments.length === 2)
      return this.ParametersExist_0(iPos, iLen);
    return this.ParametersExist_1();
  }

  /// <summary>
  ///   check if there are params in the specified range
  /// </summary>
  /// <param name = "iPos">position of first field</param>
  /// <param name = "iLen">number of fields in the range</param>
  /// <returns> true = there are parameters in the range</returns>
  private ParametersExist_0(iPos: number, iLen: number): boolean {
    for (let i: number = iPos; i < iPos + iLen; i = i + 1) {
      if ((<Field>super.getField(i)).isParam())
        return true;
    }
    return false;
  }

  /// <summary>
  /// check if there are params in Dataview tab
  /// </summary>
  /// <returns></returns>
  private ParametersExist_1(): boolean {
    return this.ParametersExist(this._rmIdx, this._rmSize);
  }

  /// <summary>
  ///   returns true if a record is in the modified records table
  /// </summary>
  /// <param name = "id">the id of the record</param>
  recInModifiedTab(id: number): boolean {
    let record: Record = this._modifiedRecordsTab.getRecord(id);
    return record !== null;
  }

  setPrevCurrRec(): void;
  setPrevCurrRec(rec: Record): void;
  setPrevCurrRec(rec?: Record): void {
    if (arguments.length === 0) {
      this.setPrevCurrRec_0();
      return;
    }
    this.setPrevCurrRec_1(rec);
  }

  /// <summary>
  ///   saves the current record as the previous current record
  /// </summary>
  private setPrevCurrRec_0(): void {
    this._prevCurrRec = this.CurrRec;
  }

  private setPrevCurrRec_1(rec: Record): void {
    this._prevCurrRec = rec;
  }

  isPrevCurrRecNull(): boolean {
    return this._prevCurrRec === null;
  }

  /// <summary>
  ///   recompute all virtuals with no init expression which have server recompute defined for them.
  /// </summary>
  /// <param name = "orgRec">contains the virtual's original value </param>
  private execUnknownRcmps(orgRec: Record): void {

    let i: number;
    let from: number = (<FieldsTable>this._fieldsTab).getRMIdx();
    let size: number = (<FieldsTable>this._fieldsTab).getRMSize();

    let rec: Record = this.getCurrRec();

    // First time - initialize unknownRcmp value
    if (this._unknownRcmp === UNKNOWN_RCMPS_NOT_INITED) {

      for (i = from;
           i < from + size && this._unknownRcmp === UNKNOWN_RCMPS_NOT_INITED;
           i++) {

        let field: Field = <Field>this._fieldsTab.getField(i);

        if (field.IsVirtual && !field.hasInitExp() && field.isServerRcmp())
          this._unknownRcmp = UNKNOWN_RCMPS_FOUND/*'Y'*/;

      }
    }

    if (this._unknownRcmp === UNKNOWN_RCMPS_FOUND /*'Y'*/ && rec !== null) {
      for (i = from; i < from + size; i = i + 1) {

        let field: Field = <Field>this._fieldsTab.getField(i);
        if (field.IsVirtual && !field.hasInitExp() && field.isServerRcmp() && !rec.fldValsEqual(orgRec, i)) {
          let fieldValue: string = rec.GetFieldValue(i);
          let isNullFld: boolean = rec.IsNull(i);
          rec.setFieldValue(i, orgRec.GetFieldValue(i), false);
          field.setValueAndStartRecompute(fieldValue, isNullFld, false, false, false);
        }
      }
    }
  }

  /// <summary>
  ///   set the transCleared flag
  /// </summary>
  setTransCleared(): void {
    this._transCleared = true;
  }

  /// <summary>
  ///   perform any data error recovery action
  /// </summary>
  public processRecovery(): void {
    if (!this._task.isAborting()) {
      let orgAction: string = this._pendingRecovery;
      let orgStopExecution: boolean = ClientManager.Instance.EventsManager.GetStopExecutionFlag();

      this._pendingRecovery = RECOVERY_ACT_NONE;
      if (orgStopExecution)
        ClientManager.Instance.EventsManager.setStopExecution(false);

      let temporaryResetInCtrlPrefix: boolean = (<Task>this._task).InCtrlPrefix;

      // if the error from which we recover happened while in ctrl prefix, reset it for the action to be executed here,
      // so that entering a new control will work (Defect 122387).
      if (temporaryResetInCtrlPrefix)
        (<Task>this._task).InCtrlPrefix = false;

      switch (orgAction) {
        case RECOVERY_ACT_CANCEL:
          (<DataView>this._task.DataView).getCurrRec().resetUpdated();

          // QCR #773979 (updated record cant be canceled)

          // clear the cache
          this.getTask().getTaskCache().clearCache();

          // qcr #776952. create mode and only 1 rec on dv. The server has ordered
          // a rollback. Here, we reset original rec and curr rec to insert mode,
          // otherwise, next time the client will set update mode for the rec instead of insert.
          if (this.getSize() === 1 && this._task.getMode() === Constants.TASK_MODE_CREATE) {
            this.CurrRec.resetModified();
            this.CurrRec.clearMode();
            this.CurrRec.setMode(DataModificationTypes.Insert);
            this.CurrRec.setNewRec();
            this._original.setSameAs(this.CurrRec, false);
          }

          // try and set the last parked ctrl on the _task being cancled. But when calling to getFirstParkableCtrl
          // do not search into subforms since we cannot have _task A having lastparked ctrl from _task B.
          if (this._task.getLastParkedCtrl() == null) {
            let FirstParkableCtrl: MgControl = (<MgForm>this._task.getForm()).getFirstParkableCtrlIncludingSubform(false);

            // same reason we sent fasle to getFirstParkableCtrl. Do not set last parked of a different _task.
            // What the server wants after all is to rollback a specific _task.
            if (FirstParkableCtrl != null && FirstParkableCtrl.getForm().getTask() === this._task)
              this._task.setLastParkedCtrl((<MgForm> this._task.getForm()).getFirstParkableCtrlIncludingSubform(false));
          }

          // The cancel handled here will not caused a rollback since it was raised by rollback. (rollb already done in server).
          ClientManager.Instance.EventsManager.handleInternalEventWithTaskAndEventSubtype(this.getTask(), InternalInterface.MG_ACT_CANCEL,
            EventSubType.CancelWithNoRollback);
          break;

        case RECOVERY_ACT_MOVE_DIRECTION_BEGIN:
          (<MgForm>this._task.getForm()).moveInRow(null, Constants.MOVE_DIRECTION_BEGIN);
          break;

        case RECOVERY_ACT_BEGIN_SCREEN:
          this.getTask().setPreventRecordSuffix(true);
          ClientManager.Instance.EventsManager.handleInternalEventWithTask(this._task, InternalInterface.MG_ACT_TBL_BEGPAGE);
          this.getTask().setPreventRecordSuffix(false);
          break;

        case RECOVERY_ACT_BEGIN_TABLE:
          // make sure the action is enabled no matter our location in the table. otherwise, rec prefix will not be executed after rollback.
          this._task.ActionManager.enable(InternalInterface.MG_ACT_TBL_BEGTBL, true);
          ClientManager.Instance.EventsManager.handleInternalEventWithTask(this._task, InternalInterface.MG_ACT_TBL_BEGTBL);
          // clear the cache
          this.getTask().getTaskCache().clearCache();
          break;


        default:
          ClientManager.Instance.EventsManager.setStopExecution(orgStopExecution);
          break;
      }
      if (temporaryResetInCtrlPrefix)
        (<Task>this._task).InCtrlPrefix = true;

      if (orgAction !== RECOVERY_ACT_NONE)
        ClientManager.Instance.EventsManager.setStopExecution(true, orgAction !== RECOVERY_ACT_BEGIN_TABLE);
    }
  }

  /// <summary>
  ///   repleciates the current dataview
  /// </summary>
  replicate(): DataView {
    let rep: DataView = new DataView(this);
    rep._recordsTab = this._recordsTab.replicate();
    rep._currRecId = rep._recordsTab.getRecByIdx(0).getId();
    rep._currRecIdx = 0;
    rep.CurrRec = rep._recordsTab.getRecByIdx(0);
    rep._prevCurrRec = rep._recordsTab.getRecByIdx(0);
    rep._original = rep._recordsTab.getRecByIdx(0);
    rep.setTopRecIdx(Int32.MinValue);
    // we must check dcVals if it need to be replicated as well currenty we think not
    return rep;
  }

  /// <summary>
  ///   returns the dvPos value non hashed
  /// </summary>
  getDvPosValue(): number {
    return this._dvPosValue;
  }

  /// <summary>
  ///   check is it is the first time the d.v is parsed
  /// </summary>
  getFirstDv(): boolean {
    return this._firstDv;
  }

  /// <summary>
  ///   reset is the first time the d.v is parsed
  /// </summary>
  ResetFirstDv(): void {
    this._firstDv = false;
  }

  /// <summary>
  ///   get this dataview cache time stamp
  /// </summary>
  getCacheLRU(): number {
    return this._cacheLruTimeStamp;
  }

  /// <summary>
  ///   sets the time stamp of the dataview
  ///   used when inserting dataview in cache
  /// </summary>
  setCacheLRU(): void {
    this._cacheLruTimeStamp = Misc.getSystemMilliseconds();
  }

  /// <summary>
  ///   news to take the values from the given dv and to set them as the current values
  ///   the given dv is usually created via dataview.replicate()
  ///   this method does not take the values of  lastSessionCount and cacheLRUTimeStamp
  ///   from the given dv since they should be propagated from one current dv to the other
  /// </summary>
  setSameAs(newDv: DataView): void {
    this._rmSize = newDv._rmSize;
    this._rmIdx = newDv._rmIdx;
    this._computeBy = newDv._computeBy;
    this._flushUpdates = newDv._flushUpdates;
    this._currRecId = newDv._currRecId;
    this._currRecIdx = newDv._currRecIdx;
    this._topRecId = newDv._topRecId;
    this.CurrRec = newDv.CurrRec;
    this._original = newDv._original;
    this._prevCurrRec = null;
    this._fieldsTab = newDv._fieldsTab;
    this._recordsTab = newDv._recordsTab;
    this._modifiedRecordsTab = newDv._modifiedRecordsTab;
    this._includesFirst = newDv._includesFirst;
    this._includesLast = newDv._includesLast;
    this._insertAt = newDv._insertAt;
    this._lastCreatedRecId = newDv._lastCreatedRecId;
    this._task = newDv._task;
    this._dcValsCollection = newDv._dcValsCollection;
    this._recovery = newDv._recovery;
    this._pendingRecovery = newDv._pendingRecovery;
    this._hasMainTable = newDv._hasMainTable;
    this._chunkSize = newDv._chunkSize;
    this._firstDv = newDv._firstDv;
    this._lastSessionCounter = newDv._lastSessionCounter;
    this._skipParsing = newDv._skipParsing;
    this._unknownRcmp = newDv._unknownRcmp;
    this._transCleared = newDv._transCleared;
    this._dvPosValue = newDv._dvPosValue;
    this._cacheLruTimeStamp = newDv._cacheLruTimeStamp;
    this._changed = newDv._changed;
    this._locateFirstRec = newDv._locateFirstRec;
    super.setEmptyDataview(newDv.isEmptyDataview());
    this._task.setMode(newDv.taskModeFromCache);

    // UPDATE THE TABLE DISPLAY
    try {
      if (this.getTask().HasLoacte()) {
        this.setCurrRec(this._locateFirstRec, true);
        this.setTopRecIdx(this._recordsTab.getRecIdx(this._locateFirstRec));
      }
      else {
        this.getTask().setPreventRecordSuffix(true);
        this.setCurrRecByIdx(Int32.MinValue, true, false, true, Int32.MinValue);
        this.getTask().setPreventRecordSuffix(false);
        this.setTopRecIdx(0);
      }

      if (!this._task.getForm().isScreenMode())
        this.setCurrRecByIdx(this._topRecIdx, true, false, true, Int32.MinValue);

      if (this._task.getForm() !== null)
        (<MgForm>this._task.getForm()).updateDisplayLineByDV();
    }
    catch (ex) {
      if (ex instanceof RecordOutOfDataViewException) {
        Logger.Instance.WriteExceptionToLogWithMsg("wrong top record idx in DataView.setSameAs" + ex.Message);
      }
      else
        throw ex;
    }
  }

  setChanged(val: boolean): void {
    this._changed = val;
  }

  getChanged(): boolean {
    return this._changed;
  }

  getLocateFirstRec(): number {
    return this._locateFirstRec;
  }

  setLocateFirstRec(newFirst: number): void {
    this._locateFirstRec = newFirst;
  }

  /// <summary>
  ///   returns a record by its idx
  /// </summary>
  getRecByIdx(idx: number): Record {
    return this._recordsTab.getRecByIdx(idx);
  }

  getServerCurrRec(): Record {
    return this._recordsTab.getServerCurrRec();
  }

  zeroServerCurrRec(): void {
    this._recordsTab.zeroServerCurrRec();
  }

  inRollback(): boolean {
    let inRollback: boolean = false;

    if (this._recovery === ConstInterface.RECOVERY_ROLLBACK /*'R'*/ && this.getTask().isTransactionOwner()) {
      inRollback = true;
    }
    return inRollback;
  }

  /// <summary>
  /// </summary>
  /// <param name = "id"> </param>
  /// <returns> </returns>
  getRecIdx(id: number): number {
    return this._recordsTab.getRecIdx(id);
  }

  /// <summary>
  ///   backup current record
  /// </summary>
  backupCurrent(): Record {
    return this.CurrRec.replicate();
  }

  /// <summary>
  ///   restore current record from backup
  /// </summary>
  /// <param name = "recBackup">backup of previous current record </param>
  restoreCurrent(recBackup: Record): void {
    Debug.Assert(recBackup !== null);
    this._currRecId = recBackup.getId();
    this._currRecIdx = this._recordsTab.getRecIdx(this._currRecId);
    this.CurrRec = this._recordsTab.getRecByIdx(this._currRecIdx);
    this.CurrRec.setSameAs(recBackup, false);
    this.takeFldValsFromCurrRec();
  }

  GetRecordById(id: number): IRecord {
    return this._recordsTab.getRecord(id);
  }

  /// <summary>
  /// returns modified record of the task - null if no record was modified
  /// </summary>
  /// <returns></returns>
  GetModifiedRecord(): Record {
    let record: Record = null;

    if (this._modifiedRecordsTab.getSize() > 0) {
      // in modRecordTbl we need to have only 1 record
      Debug.Assert(this._modifiedRecordsTab.getSize() === 1);
      record = this._modifiedRecordsTab.getRecByIdx(0);
    }
    return record;
  }

  /// <summary>
  /// return the id of the current record
  /// </summary>
  /// <returns></returns>
  GetCurrentRecId(): number {
    return this._currRecId;
  }

  /// <summary>
  /// dataview boundaries are changed
  /// </summary>
  /// <param name="orgIncludesFirst"></param>
  /// <param name="orgIncludesLast"></param>
  /// <returns></returns>
  DataviewBoundriesAreChanged(orgIncludesFirst: boolean, orgIncludesLast: boolean): boolean {
    return orgIncludesFirst !== this.IncludesFirst() || orgIncludesLast !== this.IncludesLast();
  }

  /// <summary>
  /// Returns index of first field in DataView Tab
  /// </summary>
  /// <returns></returns>
  GetRecordMainIdx(): number {
    return this._rmIdx;
  }

  /// <summary>
  /// Returns number of fields in DataView Tab
  /// </summary>
  /// <returns></returns>
  GetRecordMainSize(): number {
    return this._rmSize;
  }
}
