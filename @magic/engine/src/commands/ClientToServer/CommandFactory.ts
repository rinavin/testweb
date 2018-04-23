import {NUM_TYPE, MgControlBase} from "@magic/gui";
import {Exception} from "@magic/mscorelib";
import {StorageAttribute, ViewRefreshMode} from "@magic/utils";
import {IClientCommand} from "../IClientCommand";
import {AbortCommand} from "../ServerToClient/AbortCommand";
import {EventCommand} from "./EventCommand";
import {RollbackEventCommand, RollbackEventCommand_RollbackType} from "./RollbackEventCommand";
import {DataviewCommand, DataViewCommandType} from "./DataviewCommand";
import {Task, UserRange} from "../../tasks/Task";
import {AddUserRangeDataviewCommand} from "./AddUserRangeDataviewCommand";
import {Sort} from "../../tasks/sort/Sort";
import {AddUserSortDataViewCommand} from "./AddUserSortDataViewCommand";
import {AddUserLocateDataViewCommand} from "./AddUserLocateDataViewCommand";
import {SetTransactionStateDataviewCommand} from "./SetTransactionStateDataviewCommand";
import {ControlItemsRefreshCommand} from "./ControlItemsRefreshCommand";
import {RefreshEventCommand} from "./RefreshEventCommand";
import {ArgumentsList} from "../../rt/ArgumentsList";
import {DataViewOutputCommand} from "./DataViewOutputCommand";
import {FetchDataControlValuesEventCommand} from "./FetchDataControlValuesEventCommand";
import {WriteMessageToServerLogCommand} from "./WriteMessageToServerLogCommand";
import {SubformRefreshEventCommand} from "./SubformRefreshEventCommand";
import {LocateQueryEventCommand} from "./LocateQueryEventCommand";
import {BrowserEscEventCommand} from "./BrowserEscEventCommand";
import {IndexChangeEventCommand} from "./IndexChangeEventCommand";
import {ColumnSortEventCommand} from "./ColumnSortEventCommand";
import {RefreshScreenEventCommand} from "./RefreshScreenEventCommand";
import {SubformOpenEventCommand} from "./SubformOpenEventCommand";
import {ComputeEventCommand} from "./ComputeEventCommand";
import {NonReversibleExitEventCommand} from "./NonReversibleExitEventCommand";
import {RecomputeCommand} from "./RecomputeCommand";
import {TransactionCommand} from "./TransactionCommand";
import {UnloadCommand} from "./UnloadCommand";
import {ExecOperCommand} from "./ExecOperCommand";
import {MenuCommand} from "./MenuCommand";
import {EvaluateCommand} from "./EvaluateCommand";
import {GlobalParamsQueryCommand} from "./GlobalParamsQueryCommand";
import {IniputForceWriteCommand} from "./IniputForceWriteCommand";

/// <summary>
/// factory class for creating commands
/// </summary>
export class CommandFactory {

  /// <summary>
  /// create the abort command for local command processing
  /// </summary>
  /// <param name="taskTag"></param>
  /// <returns></returns>
  static CreateAbortCommand(taskTag: string): IClientCommand {
    return new AbortCommand(taskTag);
  }

  /// <summary>
  ///   a factory method that creates an Event command
  /// </summary>
  /// <param name = "taskTag">the task id</param>
  /// <param name = "magicEvent">the code of the internal event</param>
  /// <returns>newly created command.</returns>
  static CreateEventCommand(taskTag: string, magicEvent: number): EventCommand {
    let eventCommand: EventCommand = new EventCommand(magicEvent);
    eventCommand.TaskTag = taskTag;
    return eventCommand;
  }

  /// <summary>
  ///   a factory method that creates an Event command
  /// </summary>
  /// <param name = "taskTag">the task id</param>
  /// <param name = "cHandlerId">the id of the handler where execution should start</param>
  /// <param name = "cObj">the DIT index of the control that had the focus when the event occurred</param>
  /// <param name = "magicEvent">the code of the internal event</param>
  /// <returns>newly created command.</returns>
  static CreateRollbackEventCommand(taskTag: string, rollbackType: RollbackEventCommand_RollbackType): RollbackEventCommand {
    let cmd: RollbackEventCommand = new RollbackEventCommand();
    cmd.TaskTag = taskTag;
    cmd.Rollback = rollbackType;
    return cmd;
  }

  /// <summary>
  /// create a general dataview command
  /// </summary>
  /// <param name="taskId"></param>
  /// <param name="commandType"></param>
  /// <returns></returns>
  static CreateDataViewCommand(taskId: string, commandType: DataViewCommandType): DataviewCommand {
    let dataviewCommand: DataviewCommand = new DataviewCommand();
    dataviewCommand.CommandType = commandType;
    dataviewCommand.TaskTag = taskId;
    return dataviewCommand;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="taskId"></param>
  /// <param name="userRange"></param>
  /// <returns></returns>
  static CreateAddUserRangeDataviewCommand(taskId: string, userRange: UserRange): AddUserRangeDataviewCommand {
    let addUserRangeDataviewCommand: AddUserRangeDataviewCommand = new AddUserRangeDataviewCommand();
    addUserRangeDataviewCommand.TaskTag = taskId;
    addUserRangeDataviewCommand.Range = userRange;
    return addUserRangeDataviewCommand;
  }


  /// <summary>
  /// CreateAddUserSortDataviewCommand
  /// </summary>
  /// <param name="taskId"></param>
  /// <param name="userRange"></param>
  /// <returns></returns>
  static CreateAddUserSortDataviewCommand(taskId: string, sort: Sort): AddUserSortDataViewCommand {
    let addUserSortDataViewCommand: AddUserSortDataViewCommand = new AddUserSortDataViewCommand();
    addUserSortDataViewCommand.TaskTag = taskId;
    addUserSortDataViewCommand.Sort = sort;
    return addUserSortDataViewCommand;
  }


  /// <summary>
  /// CreateAddUserLocateDataviewCommand
  /// </summary>
  /// <param name="taskId"></param>
  /// <param name="userRange"></param>
  /// <returns></returns>
  static CreateAddUserLocateDataviewCommand(taskId: string, userRange: UserRange): AddUserLocateDataViewCommand {
    let addUserLocateDataViewCommand: AddUserLocateDataViewCommand = new AddUserLocateDataViewCommand();
    addUserLocateDataViewCommand.TaskTag = taskId;
    addUserLocateDataViewCommand.Range = userRange;
    return addUserLocateDataViewCommand;
  }

  /// <summary>
  /// create a set transaction state command
  /// </summary>
  /// <param name="taskId"></param>
  /// <param name="transactionIsOpened"></param>
  /// <returns></returns>
  static CreateSetTransactionStateDataviewCommand(taskId: string, transactionIsOpened: boolean): SetTransactionStateDataviewCommand {
    let setTransactionStateDataviewCommand: SetTransactionStateDataviewCommand = new SetTransactionStateDataviewCommand();
    setTransactionStateDataviewCommand.TaskTag = taskId;
    setTransactionStateDataviewCommand.TransactionIsOpen = transactionIsOpened;
    return setTransactionStateDataviewCommand;
  }

  /// <summary>
  /// Create ControlItemsRefreshCommand to refersh the data control.
  /// </summary>
  /// <param name="taskId"></param>
  /// <param name="controlNameParam"></param>
  /// <param name="generationParam"></param>
  /// <returns></returns>
  static CreateControlItemsRefreshCommand(taskId: string, controlParam: MgControlBase): ControlItemsRefreshCommand {
    let controlItemsRefreshCommand: ControlItemsRefreshCommand = new ControlItemsRefreshCommand();
    controlItemsRefreshCommand.TaskTag = taskId;
    controlItemsRefreshCommand.CommandType = DataViewCommandType.ControlItemsRefresh;
    controlItemsRefreshCommand.Control = controlParam;
    return controlItemsRefreshCommand;
  }

  /// <summary>
  /// creates a refresh command which was initiated internally, i.e. not by a user function call
  /// </summary>
  /// <param name="taskId"></param>
  /// <param name="magicEvent"></param>
  /// <param name="currentRecId"></param>
  /// <returns></returns>
  static CreateInternalRefreshCommand(taskId: string, magicEvent: number, currentRecId: number, currentRow: number): RefreshEventCommand {
    let refreshEventCommand: RefreshEventCommand = new RefreshEventCommand(magicEvent);
    refreshEventCommand.TaskTag = taskId;
    refreshEventCommand.RefreshMode = ViewRefreshMode.CurrentLocation;
    refreshEventCommand.ClientRecId = currentRecId;
    refreshEventCommand.IsInternalRefresh = true;
    refreshEventCommand.CurrentRecordRow = currentRow;
    return refreshEventCommand;
  }

  /// <summary>
  ///   creates only a real refresh event command
  /// </summary>
  /// <returns>newly created command.</returns>
  static CreateRealRefreshCommand(taskId: string, magicEvent: number, currentRow: number, argList: ArgumentsList, currentRecId: number): RefreshEventCommand {
    let refreshEventCommand: RefreshEventCommand = new RefreshEventCommand(magicEvent);
    refreshEventCommand.TaskTag = taskId;
    refreshEventCommand.RefreshMode = ViewRefreshMode.CurrentLocation;
    refreshEventCommand.KeepUserSort = false;
    refreshEventCommand.ClientRecId = currentRecId;
    refreshEventCommand.CurrentRecordRow = currentRow;
    let cmd: RefreshEventCommand = refreshEventCommand;

    if (argList !== null && argList.getSize() !== 0) {
      try {
        let refreshMode: NUM_TYPE = new NUM_TYPE(argList.getArgValue(0, StorageAttribute.NUMERIC, 0));
        cmd.RefreshMode = refreshMode.NUM_2_LONG() + 1;
      }
      catch (e) {
        if (e instanceof Exception) {
          cmd.RefreshMode = ViewRefreshMode.CurrentLocation;
        }
        else
          throw e;
      }

      if (argList.getSize() > 1) {
        try {
          cmd.KeepUserSort = (argList.getArgValue(1, StorageAttribute.BOOLEAN, 0) === "1");
        }
        catch (e) {
          if (e instanceof Exception) {
            cmd.KeepUserSort = false;
          }
          else
            throw e;
        }
      }
    }
    return cmd;
  }

  static CreateDataViewToDataSourceCommand(taskId: string, generation: number, taskVarNames: string, destinationDSNumber: number, destinationDSName: string, destinationColumns: string): DataViewOutputCommand {
    let dataViewOutputCommand: DataViewOutputCommand = new DataViewOutputCommand(DataViewCommandType.DataViewToDataSource);
    dataViewOutputCommand.TaskTag = taskId;
    dataViewOutputCommand.Generation = generation;
    dataViewOutputCommand.TaskVarNames = taskVarNames;
    dataViewOutputCommand.DestinationDataSourceNumber = destinationDSNumber;
    dataViewOutputCommand.DestinationDataSourceName = destinationDSName;
    dataViewOutputCommand.DestinationColumns = destinationColumns;
    return dataViewOutputCommand;
  }

  /// <summary>
  /// Create FetchDataControlValuesEvent command which will fetch the data control values from server. This is used while executing ControlItemsRefresh() function.
  /// </summary>
  /// <param name="taskTag"></param>
  /// <param name="controlName"></param>
  /// <param name="generationParam"></param>
  /// <returns></returns>
  static CreatecFetchDataControlValuesCommand(taskTag: string, controlName: string): FetchDataControlValuesEventCommand {
    let fetchDataControlValuesEventCommand: FetchDataControlValuesEventCommand = new FetchDataControlValuesEventCommand();
    fetchDataControlValuesEventCommand.TaskTag = taskTag;
    fetchDataControlValuesEventCommand.ControlName = controlName;
    return fetchDataControlValuesEventCommand;
  }

  /// <summary>
  /// Create WriteMessagesToServerLog command
  /// </summary>
  /// <param name="taskTag"></param>
  /// <param name="errorMessage"></param>
  /// <returns></returns>
  static CreateWriteMessageToServerLogCommand(taskTag: string, errorMessage: string): WriteMessageToServerLogCommand {
    let writeMessageToServerLogCommand: WriteMessageToServerLogCommand = new WriteMessageToServerLogCommand();
    writeMessageToServerLogCommand.TaskTag = taskTag;
    writeMessageToServerLogCommand.ErrorMessage = errorMessage;
    return writeMessageToServerLogCommand;
  }

  static CreateSubformRefreshCommand(taskTag: string, subformTaskTag: string, explicitSubformRefresh: boolean): SubformRefreshEventCommand {
    let subformRefreshEventCommand: SubformRefreshEventCommand = new SubformRefreshEventCommand();
    subformRefreshEventCommand.TaskTag = taskTag;
    subformRefreshEventCommand.SubformTaskTag = subformTaskTag;
    subformRefreshEventCommand.ExplicitSubformRefresh = explicitSubformRefresh;
    subformRefreshEventCommand.RefreshMode = ViewRefreshMode.UseTaskLocate;
    return subformRefreshEventCommand;
  }

  /// <summary>
  ///   creates incremental search command
  /// </summary>
  /// <returns>newly created command.</returns>
  static CreateLocateQueryCommand(taskTag: string, currentDit: number, pressedString: string, reset: boolean, fieldId: number): LocateQueryEventCommand {
    let locateQueryEventCommand: LocateQueryEventCommand = new LocateQueryEventCommand();
    locateQueryEventCommand.TaskTag = taskTag;
    locateQueryEventCommand.DitIdx = currentDit;
    locateQueryEventCommand.IncrmentalSearchString = pressedString;
    locateQueryEventCommand.ResetIncrementalSearch = reset;
    locateQueryEventCommand.FldId = fieldId;
    return locateQueryEventCommand;
  }

  /// <summary>
  ///   creates a subform open event command
  /// </summary>
  /// <returns>newly created command.</returns>
  static CreateSubformOpenCommand(taskTag: string, subformDitIdx: number): SubformOpenEventCommand {
    let subformOpenEventCommand: SubformOpenEventCommand = new SubformOpenEventCommand();
    subformOpenEventCommand.TaskTag = taskTag;
    subformOpenEventCommand.DitIdx = subformDitIdx;
    return subformOpenEventCommand;
  }

  /// <summary>
  ///   creates screen refresh command
  /// </summary>
  /// <returns>newly created command.</returns>
  static CreateScreenRefreshCommand(taskTag: string, topRecIdx: number, clientRecId: number): RefreshScreenEventCommand {
    let refreshScreenEventCommand: RefreshScreenEventCommand = new RefreshScreenEventCommand();
    refreshScreenEventCommand.TaskTag = taskTag;
    refreshScreenEventCommand.TopRecIdx = topRecIdx;
    refreshScreenEventCommand.RefreshMode = ViewRefreshMode.CurrentLocation;
    refreshScreenEventCommand.ClientRecId = clientRecId;
    return refreshScreenEventCommand;
  }

  /// <summary>
  ///   creates a column sort event command
  /// </summary>
  /// <returns>newly created command.</returns>
  static CreateColumnSortCommand(taskTag: string, direction: number, ditIdx: number, fieldId: number, recId: number): ColumnSortEventCommand {
    let columnSortEventCommand: ColumnSortEventCommand = new ColumnSortEventCommand();
    columnSortEventCommand.TaskTag = taskTag;
    columnSortEventCommand.DitIdx = ditIdx;
    columnSortEventCommand.FldId = fieldId + 1;
    columnSortEventCommand.ClientRecId = recId;
    columnSortEventCommand.Direction = direction;
    return columnSortEventCommand;
  }

  ///   creates an Index Change event command
  /// </summary>
  /// <returns>newly created command.</returns>
  static CreateIndexChangeCommand(taskTag: string, recId: number, argList: ArgumentsList): IndexChangeEventCommand {
    let indexChangeEventCommand: IndexChangeEventCommand = new IndexChangeEventCommand();
    indexChangeEventCommand.TaskTag = taskTag;
    indexChangeEventCommand.ClientRecId = recId;
    let cmd: IndexChangeEventCommand = indexChangeEventCommand;

    // 1 parameter : The new Key Index
    if (argList !== null && argList.getSize() !== 0) {
      try {
        let keyIndex: NUM_TYPE = new NUM_TYPE(argList.getArgValue(0, StorageAttribute.NUMERIC, 0));
        cmd.KeyIndex = keyIndex.NUM_2_LONG();
      }
      catch (e) {
        if (e instanceof Exception) {
          cmd.KeyIndex = 0;
        }
        else
          throw e;
      }
    }
    return cmd;
  }

  /// <summary>
///   a factory method that creates an Event command
/// </summary>
/// <param name="taskTag"></param>
/// <param name="obj"></param>
/// <param name="exitByMenu"></param>
/// <param name="closeSubformOnly"></param>
  static CreateBrowserEscEventCommand(taskTag: string, exitByMenu: boolean, closeSubformOnly: boolean): BrowserEscEventCommand {
    let browserEscEventCommand: BrowserEscEventCommand = new BrowserEscEventCommand();
    browserEscEventCommand.TaskTag = taskTag;
    browserEscEventCommand.ExitByMenu = exitByMenu;
    browserEscEventCommand.CloseSubformOnly = closeSubformOnly;
    return browserEscEventCommand;
  }

  /// <summary>
  ///   a factory method that creates an Event command
  /// </summary>
  /// <param name="taskTag"></param>
  /// <param name="obj"></param>
  /// <param name="clientRecId"></param>
  /// <returns></returns>
  static CreateComputeEventCommand(taskTag: string, subforms: boolean, clientRecId: number): ComputeEventCommand {
    let computeEventCommand: ComputeEventCommand = new ComputeEventCommand();
    computeEventCommand.TaskTag = taskTag;
    computeEventCommand.Subforms = subforms;
    computeEventCommand.ClientRecId = clientRecId;
    return computeEventCommand;
  }

  /// <summary>
  ///   a factory method that creates a nonreversible exit command
  /// </summary>
  /// <param name = "taskTag">the task id</param>
  /// <returns>newly created command.</returns>
  static CreateNonReversibleExitCommand(taskTag: string, closeSubformOnly: boolean): NonReversibleExitEventCommand {
    let nonReversibleExitEventCommand: NonReversibleExitEventCommand = new NonReversibleExitEventCommand();
    nonReversibleExitEventCommand.TaskTag = taskTag;
    nonReversibleExitEventCommand.CloseSubformOnly = closeSubformOnly;
    return nonReversibleExitEventCommand;
  }

  /// <summary>
  ///   a factory method that creates a Recompute command
  /// </summary>
  /// <param name = "taskTag">the id of the task</param>
  /// <param name = "fieldId">the id of the field</param>
  /// <returns>newly created command.</returns>
  static CreateRecomputeCommand(taskTag: string, fieldId: number, ignoreSubformRecompute: boolean): RecomputeCommand {
    let recomputeCommand: RecomputeCommand = new RecomputeCommand();
    recomputeCommand.TaskTag = taskTag;
    recomputeCommand.FldId = fieldId;
    recomputeCommand.IgnoreSubformRecompute = ignoreSubformRecompute;
    return recomputeCommand;
  }

  /// <summary>
  ///   a factory method that creates a Transaction command
  /// </summary>
  /// <param name = "oper">the type of operation: Begin, Commit</param>
  /// <param name = "task">the task of the transaction</param>
  /// <param name = "cReversibleExit">true if the task exit is reversible</param>
  /// <param name = "level"></param>
  /// <returns>newly created command.</returns>
  static CreateTransactionCommand(oper: string, taskTag: string, cReversibleExit: boolean, level: string): TransactionCommand {
    let transactionCommand: TransactionCommand = new TransactionCommand();
    transactionCommand.TaskTag = taskTag;
    transactionCommand.Oper = oper;
    transactionCommand.ReversibleExit = cReversibleExit;
    transactionCommand.Level = level;
    return transactionCommand;
  }

  /// <summary>
  ///   a factory method that creates an Unload command
  /// </summary>
  /// <returns>newly created command.</returns>
  static CreateUnloadCommand(): UnloadCommand {
    return new UnloadCommand();
  }


  /// <summary>
  ///   a factory method that creates an ExecOper command
  /// </summary>
  /// <param name = "taskTag">the id of the task</param>
  /// <param name = "handlerId">the id of the handler where execution should start</param>
  /// <param name = "operIdx">the operation index is the server index indicated by the operation</param>
  /// <param name = "ditIdx">the control id</param>
  /// <param name = "value">the value of the control</param>
  /// <returns>newly created command.</returns>
  static CreateExecOperCommand(taskTag: string, handlerId: string, operIdx: number, ditIdx: number, value: string): ExecOperCommand {
    let execOperCommand: ExecOperCommand = new ExecOperCommand();
    execOperCommand.OperIdx = operIdx;
    execOperCommand.TaskTag = taskTag;
    execOperCommand.HandlerId = handlerId;
    execOperCommand.DitIdx = ditIdx;

    let cmd: ExecOperCommand = execOperCommand;
    if (value !== null && value.length === 0)
      cmd.Val = " ";
    else
      cmd.Val = value;
    return cmd;
  }

  /// <summary>
  ///   This method creates a command matching the passed menuUid and ctlIdx
  /// </summary>
  /// <param name = "currentTask">- the task from which the menu was selected</param>
  /// <param name = "menuUid">- the uid of the selected menu</param>
  /// <param name = "ctlIdx">- the ctlIdx of the selected menu</param>
  /// <returns>newly created command.</returns>
  static CreateMenuCommand(taskTag: string, menuUid: number, ctlIdx: number, menuPath: string): MenuCommand {
    let menuCommand: MenuCommand = new MenuCommand();
    menuCommand.MenuUid = menuUid;
    menuCommand.MenuComp = ctlIdx;
    menuCommand.TaskTag = taskTag;
    menuCommand.MenuPath = menuPath;
    return menuCommand;
  }

  /// <summary>
  ///   a factory method that creates an Evaluate command
  /// </summary>
  /// <param name = "taskTag">the id of the task</param>
  /// <param name = "expType">The expected type is the data type (attribute) of the result</param>
  /// <param name = "expIdx">expression id attributes are a unique identifier of the expression to evaluate</param>
  /// <param name = "expValLen"> represents the maximum length of an alpha result or the maximum digits to the right of the decimal point, for numeric result</param>
  /// <param name = "mprgCreator"></param>
  /// <returns>newly created command.</returns>
  static CreateEvaluateCommand(taskTag: string, expType: StorageAttribute, expIdx: number, expValLen: number, mprgCreator: Task): EvaluateCommand {
    let evaluateCommand: EvaluateCommand = new EvaluateCommand();
    evaluateCommand.TaskTag = taskTag;
    evaluateCommand.ExpIdx = expIdx;
    evaluateCommand.ExpType = expType;
    evaluateCommand.MprgCreator = mprgCreator;

    if (expValLen > 0)
      evaluateCommand.LengthExpVal = expValLen;
    return evaluateCommand;
  }


  /// <summary>
  ///
  /// </summary>
  /// <returns></returns>
  static CreateQueryGlobalParamsCommand(): GlobalParamsQueryCommand {
    return new GlobalParamsQueryCommand();
  }

  /// <summary>
  ///   force ini file update by INIPut()
  /// </summary>
  /// <param name = "param">env param changed by INIPut</param>
  /// <returns>newly created command.</returns>
  static CreateIniputForceWriteCommand(param: string): IniputForceWriteCommand {
    let iniputForceWriteCommand: IniputForceWriteCommand = new IniputForceWriteCommand();
    iniputForceWriteCommand.Text = param;
    return iniputForceWriteCommand;
  }
}
