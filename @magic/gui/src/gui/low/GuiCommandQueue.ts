/// <summary>
/// <summary>
///   Gui command queue
/// </summary>
import {ListboxSelectionMode, Queue, WindowType} from "@magic/utils";
import {ApplicationException, Debug, Exception, List} from "@magic/mscorelib";
import {GuiMenuEntry} from "../GuiMenuEntry";
import {CommandType, DockingStyle, MenuStyle} from "../../GuiEnums";
import {GuiMgForm} from "../GuiMgForm";
import {Events} from "../../Events";
import {GuiMgControl} from "../GuiMgControl";
import {GuiMgMenu} from "../GuiMgMenu";
import {MenuReference} from "./MenuReference";
import {ContextIDGuard, Manager} from "../../Manager";
import {GuiConstants} from "../../GuiConstants";
import {ControlBase} from "../ControlBase";
import {UIBridge} from "../../UIBridge";
import {GuiCommand} from "./GuiCommand";

export class GuiCommandQueue {
  private static _instance: GuiCommandQueue = null;

  private _commandsQueue: Array<GuiCommand> = null;

  /// <summary>
  ///   basis Constructor
  /// </summary>
  constructor() {
    this.init();
  }

  /// <summary>
  ///   end inner class GuiCommand
  /// </summary>
  /// <summary>singleton</summary>
  /// <returns> reference to GuiCommandQueue object</returns>
  static getInstance(): GuiCommandQueue {
    if (GuiCommandQueue._instance === null)
      GuiCommandQueue._instance = new GuiCommandQueue();
    return GuiCommandQueue._instance;
  }

/// <summary>do not allow to clone singleton</summary>
  Clone(): any {
    throw new Exception("CloneNotSupportedException");
  }


  get QueueSize(): number {
    return this._commandsQueue.length;
  }

  // private _modalShowFormCommandPresentInQueue: boolean = false;

  /// <summary>Constructor</summary>
  init(): void {
    this._commandsQueue = new Array<GuiCommand>();
  }

  createMenu(guiCommand: GuiCommand): void {
    Events.WriteExceptionToLog("createMenu - Not Implemented Yet");
  }

  /// <summary>
  ///   CommandType.CREATE_MENU_ITEM Translate the passed gui command to a call to the next method.
  /// </summary>
  createMenuItem(guiCommand: GuiCommand): void;
  createMenuItem(menuEntry: GuiMenuEntry, parentMenu: any, menuStyle: MenuStyle, parentIsMenu: boolean, index: number, form: GuiMgForm): void;
  createMenuItem(guiCommandOrMenuEntry: any, parentMenu?: any, menuStyle?: MenuStyle, parentIsMenu?: boolean, index?: number, form?: GuiMgForm): void {
    if (arguments.length === 1 && (guiCommandOrMenuEntry === null || guiCommandOrMenuEntry instanceof GuiCommand)) {
      this.createMenuItem_0(guiCommandOrMenuEntry);
      return;
    }
    this.createMenuItem_1(guiCommandOrMenuEntry, parentMenu, menuStyle, parentIsMenu, index, form);
  }

  private createMenuItem_0(guiCommand: GuiCommand): void {
  }

  private createMenuItem_1(menuEntry: GuiMenuEntry, parentMenu: any, menuStyle: MenuStyle, parentIsMenu: boolean, index: number, form: GuiMgForm): void {
    Events.WriteExceptionToLog("createMenuItem - Not Implemented Yet");
  }

  SetAllowDrop(guiCommand: GuiCommand): void {
    Events.WriteExceptionToLog("setAllowDrop - Not Implemented Yet");
  }

  SetAllowDrag(guiCommand: GuiCommand): void {
    Events.WriteExceptionToLog("setAllowDrag - Not Implemented Yet");
  }

  SetDataForDrag(guiCommand: GuiCommand): void {
    // We won't get guiCommand.obj when it is called from Expression.
    Events.WriteExceptionToLog("setDataForDrag - Not Implemented Yet");
  }

  PerformDragDrop(guiCommand: GuiCommand): void {
    Events.WriteExceptionToLog("performDragDrop - Not Implemented Yet");
  }

  RegisterDNControlValueChangedEvent(guiCommand: GuiCommand): void {
    Events.WriteExceptionToLog("RegisterDNControlValueChangedEvent - Not Implemented Yet");
  }

  addCommand(guiCommand: GuiCommand): void {
    this.put(guiCommand);
  }

  /// <summary>
  /// Adds a command to the queue. If there are already enough commands in the queue then
  /// it will wait till the queue is emptied bu Gui thread.
  /// </summary>
  /// <param name="guiCommand"></param>
  private put(guiCommand: GuiCommand): void {
    // const QUEUE_SIZE_THRESHOLD: number = 1200; // a threshold above which commands will not be inserted to the queue until the queue will be empty.
    // const MAX_SLEEP_DURATION: number = 4;// duration, in ms, between checking that the queue is empty.
    //
    // // If worker thread wants to add a command and there are too many commands in the queue pending
    // // to be processed by Gui thread then suspend current thread till the commands are over. If we keep
    // // on adding commands to the queue and Gui thread enters Run(), then sometimes (specially in cases of
    // // batch tasks) Gui thread remains in Run() for a long time and hence it is unable to process user
    // // interactions (as described in QCR#722145)
    // // Before entering the loop confirm that the command is NOT being added by Gui thread itself and Gui
    // // thread is already processing the commands. This is to ensure that the commands will be processed by
    // // Gui thread. If Gui thread is not processing commands, then it will never process it again as it is
    // // the worker thread that invokes Gui thread for processing commands
    // // Also, suspend worker thread from adding new commands to the queue till SHOW_FORM for modal window
    // // is processed. Problem occurs if SHOW_FORM is followed by few more commands and then a call to
    // // GuiInteractive  that depends on the earlier commands. In such cases, GuiInteractive will not process
    // // commands between SHOW_FORM and interactive command because GuiThreadIsAvailableToProcessCommands
    // // was set to false before opening the dialog.
    // if (((this._commandsQueue.Size() > QUEUE_SIZE_THRESHOLD ) || this._modalShowFormCommandPresentInQueue)) {
    //   let sleepDuration: number = MAX_SLEEP_DURATION;
    //   do {
    //     // get current size of the queue and wait for some time
    //     const size: number = this._commandsQueue.Size();
    //     //System.Threading.Thread.Sleep(sleepDuration);
    //     const newSize: number = this._commandsQueue.Size();
    //
    //     // while current thread was sleeping, gui thread should have processed some commands.
    //     // get average duration required by gui thread for processing a command and estimate new duration for remaining commands.
    //     if (size > newSize) {
    //       let averageDurationPerCommand: number = sleepDuration / (size - newSize);
    //       let newSleepDuration: number = <number>(newSize * averageDurationPerCommand);
    //       if (newSleepDuration > 0)
    //         sleepDuration = Math.min(MAX_SLEEP_DURATION, newSleepDuration);
    //     }
    //   }
    //   while (this._commandsQueue.Size() > 0);
    this._commandsQueue.push(guiCommand);

    // if (guiCommand.CommandType === CommandType.REFRESH_TABLE && guiCommand.Bool3) {
    //   let mgControl: MgControlBase = <MgControlBase>(guiCommand.obj);
    //   mgControl.refreshTableCommandCount++;
    // }
    // else if (guiCommand.IsModalShowFormCommand())
    //   this._modalShowFormCommandPresentInQueue = true;
  }


  add(commandType: CommandType, obj: any): void;
  add(commandType: CommandType, obj: any, boolVal: boolean, formName: string): void;
  add(commandType: CommandType, obj: any, boolVal: boolean, isHelpWindow: boolean, formName: string): void;
  add(commandType: CommandType, obj: any, boolVal: boolean): void;
  add(commandType: CommandType, obj: any, obj1: any): void;
  add(commandType: CommandType, parentObject: any, obj: any, layer: number, line: number, style: number): void;
  add(commandType: CommandType, obj: any, line: number, num1: number, num2: number, num3: number): void;
  add(commandType: CommandType, parentObject: any, obj: any, windowType: WindowType, formName: string, isHelpWindow: boolean, createInternalFormForMDI: boolean, shouldBlock: boolean): void;
  add(commandType: CommandType, parentObject: any, obj: any, line: number, style: number, stringList: List<string>, ctrlList: List<GuiMgControl>, columnCount: number, boolVal: boolean, boolVal1: boolean, number1: number, number2: number, obj1: any, isParentHelpWindow: boolean, dockingStyle: DockingStyle): void;
  add(commandType: CommandType, parentObject: any, obj: any, line: number, style: number, stringList: List<string>, ctrlList: List<GuiMgControl>, columnCount: number, boolVal: boolean, boolVal1: boolean, number1: number, number2: number, obj1: any): void;
  add(commandType: CommandType, obj: any, number: number, boolVal: boolean): void;
  add(commandType: CommandType, obj: any, number: number, boolVal: boolean, executeParentLayout: boolean): void;
  add(commandType: CommandType, obj: any, line: number, x: number, y: number, width: number, height: number, boolVal: boolean, bool1: boolean): void;
  add(commandType: CommandType, obj: any, eventName: string): void;
  add(commandType: CommandType, obj: any, line: number, number: number, prevNumber: number): void;
  add(commandType: CommandType, obj: any, line: number, number: number): GuiCommand;
  add(commandType: CommandType, obj: any, line: number, objectValue1: any, objectValue2: any): void;
  add(commandType: CommandType, obj: any, line: number, objectValue1: any, objectValue2: any, bool1: boolean): void;
  add(commandType: CommandType, obj: any, line: number, objectValue: any): void;
  add(commandType: CommandType, obj: any, line: number, str: string, style: number): void;
  add(commandType: CommandType, obj: any, line: number, str: string, userDropFormat: string, style: number): void;
  add(commandType: CommandType, obj: any, line: number, displayList: string[], bool1: boolean): void;
  add(commandType: CommandType, parentObj: any, containerForm: GuiMgForm, menuStyle: MenuStyle, guiMgMenu: GuiMgMenu, parentTypeForm: boolean): void;
  add(commandType: CommandType, parentObj: any, containerForm: GuiMgForm, menuStyle: MenuStyle, guiMgMenu: GuiMgMenu, parentTypeForm: boolean, shouldShowPulldownMenu: boolean): void;
  add(commandType: CommandType, parentObj: any, menuStyle: MenuStyle, menuEntry: GuiMenuEntry, guiMgForm: GuiMgForm, index: number): void;
  add(commandType: CommandType, parentObj: any, menuStyle: MenuStyle, menuEntry: GuiMenuEntry): void;
  add(commandType: CommandType, mnuRef: MenuReference, menuEntry: GuiMenuEntry, val: any): void;
  add(commandType: CommandType, form: GuiMgForm, newToolbar: any): void;
  add(commandType: CommandType, toolbar: any, form: GuiMgForm, menuEntry: GuiMenuEntry, index: number): void;
  add(commandType: CommandType, objOrParentObjectOrMnuRefOrFormOrToolbar?: any, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm?: any,
      formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal?: any,
      formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex?: any, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex?: any, createInternalFormForMDIOrCtrlListOrHeightOrShouldShowPulldownMenu?: any,
      shouldBlockOrColumnCountOrBoolVal?: any, boolValOrBool1?: boolean, boolVal1OrNumber1?: any, number1OrNumber2?: any,
      number2?: number, obj1?: any, isParentHelpWindow?: boolean, dockingStyle?: DockingStyle): GuiCommand | void {
 /*   if (arguments.length === 2 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object)) {
      this.add_1(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar);
      return;
    }
    if (arguments.length === 4 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Boolean) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === String)) {
      this.add_2(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal);
      return;
    }
    if (arguments.length === 5 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Boolean) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Boolean) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === String)) {
      this.add_3(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex);
      return;
    }
    if (arguments.length === 3 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Boolean)) {
      this.add_4(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm);
      return;
    }
    if (arguments.length === 3 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Object)) {
      this.add_5(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm);
      return;
    }
    if (arguments.length === 6 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Object) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Number) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === Number) && (styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex === null || styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex.constructor === Number)) {
      this.add_6(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex);
      return;
    }
    if (arguments.length === 6 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Number) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === Number) && (styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex === null || styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex.constructor === Number)) {
      this.add_7(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex);
      return;
    }
    if (arguments.length === 8 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Object) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Number) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === String) && (styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex === null || styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex.constructor === Boolean) && (createInternalFormForMDIOrCtrlListOrHeightOrShouldShowPulldownMenu === null || createInternalFormForMDIOrCtrlListOrHeightOrShouldShowPulldownMenu.constructor === Boolean) && (shouldBlockOrColumnCountOrBoolVal === null || shouldBlockOrColumnCountOrBoolVal.constructor === Boolean)) {
      this.add_8(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex, createInternalFormForMDIOrCtrlListOrHeightOrShouldShowPulldownMenu, shouldBlockOrColumnCountOrBoolVal);
      return;
    }
    if (arguments.length === 4 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Boolean)) {
      this.add_11(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal);
      return;
    }
    if (arguments.length === 5 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Boolean) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === Boolean)) {
      this.add_12(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex);
      return;
    }
    if (arguments.length === 9 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Number) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === Number) && (styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex === null || styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex.constructor === Number) && (createInternalFormForMDIOrCtrlListOrHeightOrShouldShowPulldownMenu === null || createInternalFormForMDIOrCtrlListOrHeightOrShouldShowPulldownMenu.constructor === Number) && (shouldBlockOrColumnCountOrBoolVal === null || shouldBlockOrColumnCountOrBoolVal.constructor === Boolean) && (boolValOrBool1 === null || boolValOrBool1.constructor === Boolean)) {
      this.add_13(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex, createInternalFormForMDIOrCtrlListOrHeightOrShouldShowPulldownMenu, shouldBlockOrColumnCountOrBoolVal, boolValOrBool1);
      return;
    }
    if (arguments.length === 3 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === String)) {
      this.add_15(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm);
      return;
    }
    if (arguments.length === 5 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Number) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === Number)) {
      this.add_16(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex);
      return;
    }
    if (arguments.length === 4 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Number)) {
      this.add_17(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal);
      return;
    }
    if (arguments.length === 5 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Object) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === Object)) {
      this.add_18(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex);
      return;
    }
    if (arguments.length === 6 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Object) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === Object) && (styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex === null || styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex.constructor === Boolean)) {
      this.add_19(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex);
      return;
    }
    if (arguments.length === 4 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Object)) {
      this.add_21(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal);
      return;
    }
    if (arguments.length === 5 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === String) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === Number)) {
      this.add_22(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex);
      return;
    }
    if (arguments.length === 6 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === String) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === String) && (styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex === null || styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex.constructor === Number)) {
      this.add_23(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex);
      return;
    }
    if (arguments.length === 5 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal instanceof Array) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex.constructor === Boolean)) {
      this.add_25(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex);
      return;
    }
    if (arguments.length === 6 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm instanceof GuiMgForm) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Number) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex instanceof GuiMgMenu) && (styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex === null || styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex.constructor === Boolean)) {
      this.add_26(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex);
      return;
    }
    if (arguments.length === 7 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm instanceof GuiMgForm) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Number) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex instanceof GuiMgMenu) && (styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex === null || styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex.constructor === Boolean) && (createInternalFormForMDIOrCtrlListOrHeightOrShouldShowPulldownMenu === null || createInternalFormForMDIOrCtrlListOrHeightOrShouldShowPulldownMenu.constructor === Boolean)) {
      this.add_27(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex, createInternalFormForMDIOrCtrlListOrHeightOrShouldShowPulldownMenu);
      return;
    }
    if (arguments.length === 6 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal instanceof GuiMenuEntry) && (formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex === null || formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex instanceof GuiMgForm) && (styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex === null || styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex.constructor === Number)) {
      this.add_28(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex, styleOrNum3OrIsHelpWindowOrStringListOrWidthOrBool1OrNumberOrParentTypeFormOrIndex);
      return;
    }
    if (arguments.length === 4 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar.constructor === Object) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Number) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal instanceof GuiMenuEntry)) {
      this.add_29(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal);
      return;
    }
    if (arguments.length === 4 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar instanceof MenuReference) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm instanceof GuiMenuEntry) && (formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal === null || formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal.constructor === Object)) {
      this.add_30(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal);
      return;
    }
    if (arguments.length === 3 && (commandType === null || commandType.constructor === Number) && (objOrParentObjectOrMnuRefOrFormOrToolbar === null || objOrParentObjectOrMnuRefOrFormOrToolbar instanceof GuiMgForm) && (boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm === null || boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm.constructor === Object)) {
      this.add_31(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm);
      return;
    }
    this.add_32(commandType, objOrParentObjectOrMnuRefOrFormOrToolbar, boolValOrObj1OrLineOrNumberOrEventNameOrContainerFormOrMenuStyleOrMenuEntryOrNewToolbarOrForm, formNameOrIsHelpWindowOrLayerOrNum1OrWindowTypeOrLineOrBoolValOrXOrNumberOrObjectValue1OrStrOrByteArrayOrDisplayListOrMenuStyleOrMenuEntryOrVal, formNameOrLineOrNum2OrStyleOrExecuteParentLayoutOrYOrPrevNumberOrObjectValue2OrUserDropFormatOrBool1OrGuiMgMenuOrGuiMgFormOrIndex);
  */
  }

  /// <summary>
  ///   BEEP,
  /// </summary>
  private add_0(commandType: CommandType): void {
    let guiCommand: GuiCommand = new GuiCommand(commandType);
    this.put(guiCommand);
  }

  /// <summary>
  ///   DISPOSE_OBJECT REMOVE_CONTROLS EXECUTE_LAYOUT CLOSE_SHELL, REMOVE_ALL_TABLE_ITEMS,
  ///   REMOVE_CONTROLS, INVALIDATE_TABLE, SET_SB_LAYOUT_DATA, SET_WINDOW_ACTIVE
  ///   SET_FRAMESET_LAYOUT_DATA, RESUME_LAYOUT, UPDATE_MENU_VISIBILITY
  ///   ORDER_MG_SPLITTER_CONTAINER_CHILDREN, CLEAR_TABLE_COLUMNS_SORT_MARK, MOVE_ABOVE, START_TIMER
  /// </summary>
  private add_1(commandType: CommandType, obj: any): void {
    this.checkObject(obj);

    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    this.put(guiCommand);
  }

  /// <summary>
  ///   OPEN_FORM, OPEN HELP FORM.
  /// </summary>
  private add_2(commandType: CommandType, obj: any, boolVal: boolean, formName: string): void {
    this.checkObject(obj);

    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    guiCommand.Bool3 = boolVal;
    guiCommand.str = formName;
    this.put(guiCommand);
  }

  /// <summary>
  /// SHOW_FORM
  /// </summary>
  /// <param name="commandType"></param>
  /// <param name="obj"></param>
  /// <param name="boolVal"></param>
  /// <param name="isHelpWindow"></param>
  /// <param name="formName"></param>
  private add_3(commandType: CommandType, obj: any, boolVal: boolean, isHelpWindow: boolean, formName: string): void {
    this.checkObject(obj);
    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    guiCommand.Bool3 = boolVal;
    guiCommand.Bool1 = isHelpWindow;
    guiCommand.str = formName;
    this.put(guiCommand);
  }

  /// <summary>
  ///   EXECUTE_LAYOUT, REORDER_FRAME, PROP_SET_SHOW_ICON, SET_FORMSTATE_APPLIED, PROP_SET_FILL_WIDTH
  /// </summary>
  private add_4(commandType: CommandType, obj: any, boolVal: boolean): void {
    this.checkObject(obj);

    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    guiCommand.Bool3 = boolVal;
    this.put(guiCommand);
  }

  /// <summary>
  ///   ADD_DVCONTROL_HANDLER, REMOVE_DVCONTROL_HANDLER
  /// </summary>
  private add_5(commandType: CommandType, obj: any, obj1: any): void {
    this.checkObject(obj);
    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    guiCommand.obj1 = obj1;
    this.put(guiCommand);
  }

  /// <summary>
  ///   PROP_SET_DEFAULT_BUTTON style : not relevant PROP_SET_SORT_COLUMN
  /// </summary>
  /// <param name = "line">TODO CREATE_RADIO_BUTTON PROP_SET_SORT_COLUMN layer, line,style isn't relevant parentObject:
  ///   must to be the table control object: must to be the Column control
  /// </param>
  private add_6(commandType: CommandType, parentObject: any, obj: any, layer: number, line: number, style: number): void {
    this.checkObject(obj);

    if (!((parentObject instanceof GuiMgForm) || (parentObject instanceof GuiMgControl)))
      throw new ApplicationException("in GuiCommandQueue.add(): parent object is not GuiMgForm or GuiMgControl");

    let guiCommand: GuiCommand = new GuiCommand(parentObject, obj, commandType);
    guiCommand.line = line;
    switch (commandType) {
      case CommandType.PROP_SET_DEFAULT_BUTTON:
        guiCommand.parentObject = parentObject;
        guiCommand.obj = obj;
        break;


      default:
        guiCommand.layer = layer;
        guiCommand.style = style;
        break;

    }
    this.put(guiCommand);
  }

  /// <summary>
  ///   SELECT_TEXT
  /// </summary>
  private add_7(commandType: CommandType, obj: any, line: number, num1: number, num2: number, num3: number): void {
    this.checkObject(obj);
    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    guiCommand.line = line;
    switch (commandType) {
      case CommandType.SELECT_TEXT:
        guiCommand.number = num1; // (0) -unmark all text, (1)- mark all text, (-1)-mark from pos until pos
        // for unmark\mark(0,1) all text, num1 & num 2 are not relevants
        guiCommand.layer = num2; // mark from text pos
        guiCommand.number1 = num3; // mark until text pos
        break;


      default:
        Debug.Assert(false);
        break;

    }
    this.put(guiCommand);
  }

  /// <summary>
  ///   CREATE_FORM, CREATE_HELP_FORM
  /// </summary>
  /// <param name = "commandType"></param>
  /// <param name = "parentObject"></param>
  /// <param name = "obj"></param>
  /// <param name = "windowType"></param>
  /// <param name = "formName"></param>
  /// <param name = "isHelpWindow"></param>
  private add_8(commandType: CommandType, parentObject: any, obj: any, windowType: WindowType, formName: string, isHelpWindow: boolean, createInternalFormForMDI: boolean, shouldBlock: boolean): void {
    this.checkObject(obj);

    let guiCommand: GuiCommand = new GuiCommand(parentObject, obj, commandType);
    guiCommand.windowType = windowType;
    guiCommand.str = formName;
    guiCommand.isHelpWindow = isHelpWindow;
    guiCommand.createInternalFormForMDI = createInternalFormForMDI;
    guiCommand.Bool1 = shouldBlock;
    this.put(guiCommand);
  }

  /// <summary>
  ///   Applies for: REFRESH_TABLE, SELECT_TEXT, PROP_SET_READ_ONLY, PROP_SET_MODIFIABLE, PROP_SET_ENABLE,
  ///   PROP_SET_CHECKED (Table): PROP_SET_LINE_VISIBLE, PROP_SET_RESIZABLE, SET_FOCUS, PROP_SET_MOVEABLE
  ///   PROP_SET_SORTABLE_COLUMN
  ///   PROP_SET_MENU_DISPLAY, PROP_SET_TOOLBAR_DISPLAY PROP_HORIZONTAL_PLACEMENT, PROP_VERTICAL_PLACEMENT
  ///   PROP_SET_MULTILINE, PROP_SET_PASSWORD_EDIT, PROP_SET_MULTILINE_VERTICAL_SCROLL, PROP_SET_BORDER,
  ///   CHANGE_COLUMN_SORT_MARK.
  /// </summary>
  /// <param name = "commandType"></param>
  /// <param name = "obj"></param>
  /// <param name = "number">
  ///   If command type is <code>CHANGE_COLUMN_SORT_MARK</code> then number means direction.
  ///   Otherwise it means line.
  /// </param>
  /// <param name = "boolVal">
  ///   If command type is <code>CHANGE_COLUMN_SORT_MARK</code> this value is ignored.
  /// </param>
  private add_11(commandType: CommandType, obj: any, number: number, boolVal: boolean): void {
    this.add(commandType, obj, number, boolVal, false);
  }

  /// <summary>
  ///   PROP_SET_VISIBLE, SET_ACTIVETE_KEYBOARD_LAYOUT
  /// </summary>

  private add_12(commandType: CommandType, obj: any, number: number, boolVal: boolean, executeParentLayout: boolean): void {
    this.checkObject(obj);

    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    guiCommand.Bool3 = boolVal;
    guiCommand.Bool1 = executeParentLayout;

    // for SET_ACTIVETE_KEYBOARD_LAYOUT guiCommand.bool1 is define if it restore or not

    switch (commandType) {
      case CommandType.CHANGE_COLUMN_SORT_MARK:
      case CommandType.START_TIMER:
      case CommandType.STOP_TIMER:
        guiCommand.number = number;
        break;

      default:
        guiCommand.line = number;
        break;

    }

    this.put(guiCommand);
  }

  /// <summary>
  ///   PROP_SET_BOUNDS, PROP_SET_COLUMN_WIDTH, PROP_SET_SB_PANE_WIDTH, PROP_SET_PLACEMENT
  ///   subformAsControl isn't relevant, need to be false
  /// </summary>
  private add_13(commandType: CommandType, obj: any, line: number, x: number, y: number, width: number, height: number, boolVal: boolean, bool1: boolean): void {
    this.checkObject(obj);

    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    guiCommand.line = line;
    guiCommand.Bool3 = boolVal;
    guiCommand.Bool1 = bool1;
    guiCommand.x = x;
    guiCommand.y = y;
    guiCommand.width = width;
    guiCommand.height = height;

    this.put(guiCommand);
  }

  /// <summary>
  /// REGISTER_DN_CTRL_VALUE_CHANGED_EVENT
  /// </summary>
  /// <param name="commandType"></param>
  /// <param name="obj"></param>
  /// <param name="eventName"></param>
  private add_15(commandType: CommandType, obj: any, eventName: string): void {
    this.checkObject(obj);
    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    guiCommand.str = eventName;
    this.put(guiCommand);
  }

  /// <summary>
  /// PROP_SET_SELECTION
  /// </summary>
  /// <param name="commandType"></param>
  /// <param name="obj"></param>
  /// <param name="line"></param>
  /// <param name="number"></param>
  /// <param name="prevNumber"></param>
  private add_16(commandType: CommandType, obj: any, line: number, number: number, prevNumber: number): void {
    let guiCommand: GuiCommand = this.add(commandType, obj, line, number);
    guiCommand.number1 = prevNumber;
  }

  /// <summary>
  ///   PROP_SET_TEXT_SIZE_LIMIT, PROP_SET_VISIBLE_LINES, PROP_SET_MIN_WIDTH, PROP_SET_MIN_HEIGHT,
  ///   SET_WINDOW_STATE, VALIDATE_TABLE_ROW, SET_ORG_COLUMN_WIDTH, PROP_SET_COLOR_BY,
  ///   PROP_SET_TRANSLATOR, PROP_SET_HORIZANTAL_ALIGNMENT, PROP_SET_MULTILINE_WORDWRAP_SCROLL
  /// </summary>
  private add_17(commandType: CommandType, obj: any, line: number, number: number): GuiCommand {
    this.checkObject(obj);

    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    guiCommand.line = line;

    switch (commandType) {
      case CommandType.PROP_SET_GRADIENT_STYLE:
      case CommandType.SET_WINDOW_STATE:
        guiCommand.style = number;
        break;

      case CommandType.PROP_SET_MIN_WIDTH:
        guiCommand.width = number;
        break;

      case CommandType.PROP_SET_MIN_HEIGHT:
        guiCommand.height = number;
        break;

      case CommandType.PROP_SET_SELECTION_MODE:
        guiCommand.listboxSelectionMode = <ListboxSelectionMode>number;
        break;

      default:
        guiCommand.number = number;
        break;

    }
    this.put(guiCommand);
    return guiCommand;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="commandType"></param>
  /// <param name="obj"></param>
  /// <param name="line"></param>
  /// <param name="objectValue1"></param>
  /// <param name="objectValue2"></param>
  private add_18(commandType: CommandType, obj: any, line: number, objectValue1: any, objectValue2: any): void {
    this.add(commandType, obj, line, objectValue1, objectValue2, false);
  }

  /// <summary>
  ///   PROP_SET_GRADIENT_COLOR, SET_DVCONTROL_DATASOURCE, PROP_SET_BACKGOUND_COLOR, PROP_SET_FONT
  /// </summary>
  /// <param name = "commandType"></param>
  /// <param name = "obj"></param>
  /// <param name = "line"></param>
  /// <param name = "objectValue1"></param>
  /// <param name = "objectValue2"></param>
  private add_19(commandType: CommandType, obj: any, line: number, objectValue1: any, objectValue2: any, bool1: boolean): void {
    this.checkObject(obj);

    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    guiCommand.line = line;

    switch (commandType) {
      // case CommandType.PROP_SET_GRADIENT_COLOR:
      //   guiCommand.mgColor = <MgColor>objectValue1;
      //   guiCommand.mgColor1 = <MgColor>objectValue2;
      //   break;


      case CommandType.INSERT_ROWS:
      case CommandType.REMOVE_ROWS:
        guiCommand.number = <number>objectValue1;
        guiCommand.number1 = <number>objectValue2;
        guiCommand.Bool1 = bool1;
        break;


      case CommandType.PROP_SET_CHECKED:
        guiCommand.line = line;
        guiCommand.number = <number>objectValue1;
        guiCommand.Bool3 = <boolean>objectValue2;
        break;


      case CommandType.PROP_SET_SELECTION:
        guiCommand.str = objectValue1.ToString();
        guiCommand.intArray = <number[]>objectValue2;
        guiCommand.Bool1 = bool1;
        break;


      case CommandType.APPLY_CHILD_WINDOW_PLACEMENT:
        guiCommand.width = <number>objectValue1;
        guiCommand.height = <number>objectValue2;
        break;


      case CommandType.UPDATE_DVCONTROL_COLUMN:
      case CommandType.REJECT_DVCONTROL_COLUMN_CHANGES:
        guiCommand.line = <number>line;
        guiCommand.number = <number>objectValue1;
        guiCommand.obj1 = objectValue2;
        break;


      // case CommandType.PROP_SET_BACKGOUND_COLOR:
      //   guiCommand.mgColor = <MgColor>objectValue1;
      //   guiCommand.number = <number>objectValue2;
      //   break;


      // case CommandType.PROP_SET_FONT:
      //   guiCommand.mgFont = <MgFont>objectValue1;
      //   guiCommand.number = <number>objectValue2;
      //   break;
      case CommandType.SET_CLASS:
      case CommandType.SET_PROPERTY:
        guiCommand.Operation = <string>objectValue1;
        guiCommand.Bool1 = <boolean>objectValue2;
        break;

      default:
        throw new ApplicationException("in GuiCommandQueue.add(): command type not handled: " + commandType);
    }
    this.put(guiCommand);
  }

  /// <summary>
  ///   PROP_SET_BACKGOUND_COLOR, PROP_SET_FOREGROUND_COLOR, PROP_SET_ALTENATING_COLOR
  ///   PROP_SET_STARTUP_POSITION
  /// </summary>
  /// <param name = "line">TODO PROP_SET_ROW_HIGHLIGHT_COLOR, PROP_SET_ROW_HIGHLIGHT_FGCOLOR : line not relevant
  ///   PROP_SET_FORM_BORDER_STYLE,SET_ALIGNMENT, SET_FRAMES_WIDTH, SET_FRAMES_HEIGHT, REORDER_COLUMNS
  /// </param>
  private add_21(commandType: CommandType, obj: any, line: number, objectValue: any): void {
    this.checkObject(obj);

    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    guiCommand.line = line;

    switch (commandType) {
      case CommandType.SET_ALIGNMENT:
      case CommandType.PROP_SET_CHECK_BOX_CHECKED:
      case CommandType.PROP_SET_STARTUP_POSITION:
        guiCommand.number = <number>objectValue;
        break;

      case CommandType.PROP_SET_FORM_BORDER_STYLE:
        guiCommand.style = <number>objectValue;
        break;

      // case CommandType.PROP_SET_ROW_HIGHLIGHT_FGCOLOR:
      // case CommandType.PROP_SET_ROW_HIGHLIGHT_BGCOLOR:
      // case CommandType.PROP_SET_INACTIVE_ROW_HIGHLIGHT_BGCOLOR:
      // case CommandType.PROP_SET_INACTIVE_ROW_HIGHLIGHT_FGCOLOR:
      // case CommandType.PROP_SET_FOREGROUND_COLOR:
      // case CommandType.PROP_SET_BORDER_COLOR:
      // case CommandType.PROP_SET_ALTENATING_COLOR:
      // case CommandType.PROP_SET_TITLE_COLOR:
      // case CommandType.PROP_SET_DIVIDER_COLOR:
      // case CommandType.PROP_SET_TITLE_FGCOLOR:
      // case CommandType.PROP_SET_HOT_TRACK_COLOR:
      // case CommandType.PROP_SET_HOT_TRACK_FGCOLOR:
      // case CommandType.PROP_SET_SELECTED_TAB_COLOR:
      // case CommandType.PROP_SET_SELECTED_TAB_FGCOLOR:
      // case CommandType.PROP_SET_EDIT_HINT_COLOR:
      // case CommandType.PROP_SET_ROW_BG_COLOR:
      //   guiCommand.mgColor = <MgColor>objectValue;
      //   break;

      case CommandType.PROP_SET_IMAGE_LIST_INDEXES:
        guiCommand.intArray = <number[]>objectValue;
        break;

      case CommandType.SET_FRAMES_WIDTH:
      case CommandType.SET_FRAMES_HEIGHT:
      case CommandType.RESTORE_COLUMNS:
        guiCommand.intList = <List<number>>objectValue;
        break;

      case CommandType.REORDER_COLUMNS:
        guiCommand.intArrayList = <List<number[]>>objectValue;
        break;

      case CommandType.CREATE_ENTRY_IN_CONTROLS_MAP:
        guiCommand.obj1 = objectValue;
        break;

      case CommandType.PERFORM_DRAGDROP:
      case CommandType.UPDATE_DVCONTROL_ROW:
      case CommandType.ADD_DVCONTROL_HANDLER:
      case CommandType.CREATE_ROW_IN_DVCONTROL:
      case CommandType.DELETE_DVCONTROL_ROW:
      case CommandType.SET_DVCONTROL_ROW_POSITION:
        guiCommand.obj1 = objectValue;
        break;

      case CommandType.PROP_SET_EDIT_HINT:
        guiCommand.str = <string>objectValue;
        break;

      default:
        throw new ApplicationException("in GuiCommandQueue.add(): command type not handled: " + commandType);
    }
    this.put(guiCommand);
  }

  /// <summary>
  ///   PROP_SET_TOOLTIP, PROP_SET_TEXT style: not relevant PROP_SET_WALLPAPER PROP_SET_IMAGE_FILE_NAME
  ///   PROP_SET_URL, PROP_SET_ICON_FILE_NAME : style isn't relevant
  ///   PROP_SET_CONTROL_NAME : style isn't relevant
  /// </summary>
  private add_22(commandType: CommandType, obj: any, line: number, str: string, style: number): void {
    this.checkObject(obj);

    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);

    guiCommand.line = line;

    switch (commandType) {
      case CommandType.PROP_SET_ICON_FILE_NAME:
      case CommandType.PROP_SET_WALLPAPER:
      case CommandType.PROP_SET_IMAGE_FILE_NAME:
      case CommandType.PROP_SET_IMAGE_LIST:
        guiCommand.fileName = str;
        guiCommand.style = style;
        break;


      case CommandType.SETDATA_FOR_DRAG:
      case CommandType.PROP_SET_IMAGE_DATA:
        guiCommand.str = str;
        guiCommand.style = style;
        break;


      default:
        guiCommand.str = str;
        break;

    }
    this.put(guiCommand);
  }

  /// <summary>
  /// SETDATA_FOR_DRAG
  /// </summary>
  /// <param name="commandType"></param>
  /// <param name="obj"></param>
  /// <param name="line">line no</param>
  /// <param name="str">string</param>
  /// <param name="userDropFormat">user defined format, if any.</param>
  /// <param name="style"></param>
  private add_23(commandType: CommandType, obj: any, line: number, str: string, userDropFormat: string, style: number): void {
    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    guiCommand.line = line;
    guiCommand.str = str;
    guiCommand.userDropFormat = userDropFormat;
    guiCommand.style = style;

    this.put(guiCommand);
  }


  /// <summary>
  ///   PROP_SET_ITEMS_LIST,
  /// </summary>
  /// <param name = "line">TODO
  /// </param>
  private add_25(commandType: CommandType, obj: any, line: number, displayList: string[], bool1: boolean): void {
    this.checkObject(obj);

    let guiCommand: GuiCommand = new GuiCommand(obj, commandType);
    guiCommand.itemsList = displayList;
    guiCommand.line = line;
    guiCommand.Bool1 = bool1;
    this.put(guiCommand);
  }

  /// <summary>
  ///   PROP_SET_MENU, REFRESH_MENU_ACTIONS
  /// </summary>
  private add_26(commandType: CommandType, parentObj: any, containerForm: GuiMgForm, menuStyle: MenuStyle,
                 guiMgMenu: GuiMgMenu, parentTypeForm: boolean): void {
    let guiCommand: GuiCommand = new GuiCommand(parentObj, containerForm, commandType);
    guiCommand.menu = guiMgMenu;
    guiCommand.menuStyle = menuStyle;
    guiCommand.Bool3 = parentTypeForm;
    guiCommand.line = GuiConstants.ALL_LINES;
    this.put(guiCommand);
  }

  /// <summary>
  ///   CREATE_MENU
  /// </summary>
  private add_27(commandType: CommandType, parentObj: any, containerForm: GuiMgForm, menuStyle: MenuStyle,
                 guiMgMenu: GuiMgMenu, parentTypeForm: boolean, shouldShowPulldownMenu: boolean): void {
    let guiCommand: GuiCommand = new GuiCommand(parentObj, containerForm, commandType);
    guiCommand.menu = guiMgMenu;
    guiCommand.menuStyle = menuStyle;
    guiCommand.Bool3 = parentTypeForm;
    guiCommand.line = GuiConstants.ALL_LINES;
    guiCommand.Bool1 = shouldShowPulldownMenu;
    this.put(guiCommand);
  }

  /// <summary>
  ///   CREATE_MENU_ITEM
  /// </summary>
  /// <param name = "commandType"></param>
  /// <param name = "parentObj"></param>
  /// <param name = "menuStyle"></param>
  /// <param name = "menuEntry"></param>
  /// <param name = "form"></param>
  /// <param name = "index"></param>
  private add_28(commandType: CommandType, parentObj: any, menuStyle: MenuStyle, menuEntry: GuiMenuEntry,
                 guiMgForm: GuiMgForm, index: number): void {
    let guiCommand: GuiCommand = new GuiCommand(parentObj, guiMgForm, commandType);
    guiCommand.menuEntry = menuEntry;
    guiCommand.menuStyle = menuStyle;
    guiCommand.line = index;
    this.put(guiCommand);
  }

  /// <summary>
  ///   DELETE_MENU_ITEM
  /// </summary>
  /// <param name = "commandType"></param>
  /// <param name = "parentObj"></param>
  /// <param name = "menuStyle"></param>
  /// <param name = "menuEntry"></param>
  /// <param name = "menuItemReference"></param>
  private add_29(commandType: CommandType, parentObj: any, menuStyle: MenuStyle, menuEntry: GuiMenuEntry): void {
    let guiCommand: GuiCommand = new GuiCommand(parentObj, commandType);
    guiCommand.menuEntry = menuEntry;
    guiCommand.menuStyle = menuStyle;
    this.put(guiCommand);
  }

  /// <summary>
  ///   PROP_SET_CHECKED PROP_SET_ENABLE PROP_SET_VISIBLE PROP_SET_MENU_ENABLE PROP_SET_MENU_VISIBLE Above
  ///   properties for menu entry
  /// </summary>
  /// <param name = "commandType"></param>
  /// <param name = "menuEntry">TODO</param>
  /// <param name = "menuEntry"></param>
  /// <param name = "value"></param>
  private add_30(commandType: CommandType, mnuRef: MenuReference, menuEntry: GuiMenuEntry, val: any): void {
    let guiCommand: GuiCommand = new GuiCommand(mnuRef, commandType);

    guiCommand.menuEntry = menuEntry;

    if (val.constructor === Boolean) { // todo - check this
      guiCommand.Bool3 = <boolean>val;
    }
    else {
      guiCommand.str = <string>val;
    }
    this.put(guiCommand);
  }

  /// <summary>
  ///   CREATE_TOOLBAR
  /// </summary>
  /// <param name = "commandType"></param>
  /// <param name = "form"></param>
  /// <param name = "newToolbar"></param>
  private add_31(commandType: CommandType, form: GuiMgForm, newToolbar: any): void {
    let guiCommand: GuiCommand = new GuiCommand(form, newToolbar, commandType);
    this.put(guiCommand);
  }

  /// <summary>
  ///   CREATE_TOOLBAR_ITEM, DELETE_TOOLBAR_ITEM
  /// </summary>
  /// <param name = "commandType"></param>
  /// <param name = "toolbar">is the ToolBar to which we add a new item (placed in parentObject)</param>
  /// <param name = "menuEntry">is the menuEntry for which we create this toolitem</param>
  /// <param name = "index">is the index of the new object in the toolbar (placed in line)</param>
  private add_32(commandType: CommandType, toolbar: any, form: GuiMgForm, menuEntry: GuiMenuEntry, index: number): void {
    let guiCommand: GuiCommand = new GuiCommand(toolbar, form, commandType);
    guiCommand.menuEntry = menuEntry;
    guiCommand.line = index;
    this.put(guiCommand);
  }

  /// <summary>
  ///   Verifies that the object is either MgForm or MgControl and throws Error if not.
  /// </summary>
  /// <param name = "object">the object to check</param>
  checkObject(obj: any): void {
  }

  /// <summary>
  ///   Function returns true if control is supported.///
  /// </summary>
  /// <param name = "obj"> MgControl object</param>
  /// <returns> whether supported or not</returns>
  isSupportedControl(guiCommand: GuiCommand): boolean {
    return true;
  }


  /// <summary>
  ///   execute all pending commands, asynchronously
  /// </summary>
  beginInvoke(): void {
    this.invoke();

  }

  /// <summary>
  ///   execute all pending commands, synchronously
  /// </summary>
  invoke(): void {
    UIBridge.getInstance().executeCommands(this._commandsQueue);
    this._commandsQueue.length = 0;
  }

}
/// <summary>inner class for the gui command</summary>

