import {List, NChar, NString, NNumber, NumberStyles, ApplicationException, RefParam} from "@magic/mscorelib";
import {HelpCommand, Rtf, StorageAttribute, StorageAttributeCheck, UtilImeJpn, StrUtil} from "@magic/utils";
import {TaskBase} from "../tasks/TaskBase";
import {ITask} from "../tasks/ITask";
import {Manager} from "../../Manager";
import {MgFormBase} from "../gui/MgFormBase";
import {MgControlBase} from "../gui/MgControlBase";
import {Commands} from "../../Commands";
import {ClipFormats, CommandType, MgCursors} from "../../GuiEnums";
import {NUM_TYPE} from "../data/NUM_TYPE";
import {RuntimeContextBase} from "../RuntimeContextBase";
import {ExpressionInterface} from "./ExpressionInterface";
import {Field} from "../data/Field";
import {DroppedData} from "../../gui/low/DroppedData";
import {BlobType} from "../data/BlobType";
import {ValidationDetails} from "../gui/ValidationDetails";
import {PIC} from "../gui/PIC";
import {DisplayConvertor} from "../gui/DisplayConvertor";


export abstract class GuiExpressionEvaluator {
  static TRIGGER_TASK: number = 500000;
  ExpTask: TaskBase = null;
  private Events: any = null;


  abstract GetItemVal(itm: number): ExpVal;

  abstract SetItemVal(itm: number, valueToSet: any): void;

  abstract GetLastFocusedTask(): ITask;

  abstract GetTopMostForms(contextId: number): List<MgFormBase>;

  abstract HandleControlGoto(task: ITask, ctrl: MgControlBase, rowNo: number): boolean;

  abstract Translate(name: string): string;

  abstract EditGet(ctrl: MgControlBase, isNull: RefParam<ExpVal>): void;

  /// <summary>(protected)
  ///   finds the handle of the window control associated with the magic control.
  /// </summary>
  /// <param name = "resVal"> Contains the value passed by the user.</param>
  /// <param name = "ctrlName">Contains return value.</param>
  eval_op_ctrlhandle(resVal: ExpVal, ctrlName: ExpVal): void {
    let ctrlHandle: number = 0;
    // Getting magic form.
    let form: MgFormBase = (<TaskBase>this.ExpTask.GetContextTask()).getForm();
    if (form !== null) {
      // Getting control on that form.
      let ctrl: MgControlBase = form.GetCtrl(ctrlName.ToMgVal());
      if (ctrl !== null) {
        ctrlHandle = Commands.getCtrlHandle(ctrl, ctrl.getDisplayLine(true));
      }
    }
    // Assigning handle value to resVal.
    this.ConstructMagicNum(resVal, ctrlHandle, StorageAttribute.NUMERIC);
  }

  /// <summary>(protected)
  /// returns the position(X/Y) of the last click, relative to a control or window according to opCode.
  /// The value is in pixels and not in Magic Units
  eval_op_lastclick(resVal: ExpVal, opcode: number): void {
    resVal.Attr = StorageAttribute.NUMERIC;
    resVal.MgNumVal = new NUM_TYPE();
    let uom: number = -1;
    let currTask: TaskBase = <TaskBase>this.ExpTask.GetContextTask();
    let form: MgFormBase = currTask.getForm();

    // Getting magic form.
    if (form === null) {
      currTask = currTask.GetAncestorTaskContainingForm();
      form = ((currTask !== null) ? currTask.getForm() : null);
    }
    let runtimeContext: RuntimeContextBase = Manager.GetCurrentRuntimeContext();

    if (form !== null) {
      switch (opcode) {
        case ExpressionInterface.EXP_OP_CLICKWX:
          uom = form.pix2uom(<number>runtimeContext.GetClickProp(0), true);
          break;
        case ExpressionInterface.EXP_OP_CLICKWY:
          uom = form.pix2uom(<number>runtimeContext.GetClickProp(1), false);
          break;
        case ExpressionInterface.EXP_OP_CLICKCX: {
          uom = runtimeContext.GetClickProp(2);
          let lastClickCoordinatesAreInPixels: boolean = runtimeContext.LastClickCoordinatesAreInPixels;
          if (lastClickCoordinatesAreInPixels) {
            uom = form.pix2uom(<number>uom, true);
          }
          break;
        }
        case ExpressionInterface.EXP_OP_CLICKCY: {
          uom = runtimeContext.GetClickProp(3);
          let lastClickCoordinatesAreInPixels2: boolean = runtimeContext.LastClickCoordinatesAreInPixels;
          if (lastClickCoordinatesAreInPixels2) {
            uom = form.pix2uom(<number>uom, false);
          }
          break;
        }
      }
    }
    resVal.MgNumVal.NUM_4_LONG(uom);
  }

  /// <summary>(protected)
  /// return control size
  /// </summary>
  /// <param name="resVal">result </param>
  /// <param name="val1">control name </param>
  /// <param name="val2">generation </param>
  /// <param name="opCode">opcode which specifies required size (height/width/top/left etc)</param>
  GetCtrlSize(resVal: ExpVal, val1: ExpVal, val2: ExpVal, opCode: number): void {

    if (val2.MgNumVal === null) {
      this.SetNULL(resVal, StorageAttribute.NUMERIC);
    }
    else {
      let ctrlName: string = StrUtil.ZstringMake(val1.StrVal, val1.StrVal.length);
      let generation: number = val2.MgNumVal.NUM_2_LONG();
      let ancestorTask: TaskBase = this.GetContextTask(generation);
      let res: number = Manager.GetControlFocusedData(ancestorTask, opCode, ctrlName);
      this.ConstructMagicNum(resVal, res, StorageAttribute.NUMERIC);
    }
  }

  /// <summary>(protected)
  /// sets the status bar text with the given text and
  /// sets the result with the last text that was set to the status bar by the use of this function
  /// </summary>
  /// <param name = "resVal">last text of status bar</param>
  /// <param name = "statusBarText">the text to be set at status bar</param>
  eval_op_statusbar_set_text(resVal: ExpVal, statusBarText: ExpVal): void {
    resVal.Attr = StorageAttribute.UNICODE;
    resVal.StrVal = Manager.GetCurrentRuntimeContext().DefaultStatusMsg;

    if (Manager.GetCurrentRuntimeContext().DefaultStatusMsg === null) {
      resVal.StrVal = "";
    }
    else {
      resVal.StrVal = Manager.GetCurrentRuntimeContext().DefaultStatusMsg;
    }
    resVal.IsNull = false;

    if (!(statusBarText.Attr !== StorageAttribute.ALPHA && statusBarText.Attr !== StorageAttribute.UNICODE)) {
      if (!statusBarText.IsNull) {
        let text: string = statusBarText.StrVal;
        let task: TaskBase = <TaskBase>this.ExpTask.GetContextTask();

        // In case of non interactive tasks, it is possible that task has open window = No, So display the status bar msg on frame window.
        if (task.getForm() === null && Manager.GetCurrentRuntimeContext().FrameForm !== null) {
          task = Manager.GetCurrentRuntimeContext().FrameForm.getTask();
        }
        Manager.WriteToMessagePane(task, text, false);
        Manager.GetCurrentRuntimeContext().DefaultStatusMsg = text;
      }
    }
  }

  /// <summary>(protected)
  /// returns the handle of the window form depending on the generation user has specified
  /// </summary>
  /// <param name = "resVal">return value(window handle)</param>
  /// <param name = "generation">generation</param>
  eval_op_formhandle(resVal: ExpVal, generation: ExpVal): void {
    let handle: number = 0;

    if (generation.MgNumVal === null) {
      this.SetNULL(resVal, StorageAttribute.NUMERIC);
    }
    else {
      let parent: number = generation.MgNumVal.NUM_2_LONG();
      let currTask: TaskBase = <TaskBase>this.ExpTask.GetContextTask();

      if ((parent >= 0 && parent < currTask.GetTaskDepth()) || parent === GuiExpressionEvaluator.TRIGGER_TASK) {
        // Getting the parent task of context task based on generation.
        let tsk: TaskBase = this.GetContextTask(parent);
        let form: MgFormBase = tsk.getForm();
        if (form !== null) {
          if (form.isSubForm()) {
            let ctrl: MgControlBase = form.getSubFormCtrl();
            handle = Commands.getCtrlHandle(ctrl, ctrl.getDisplayLine(true));
          }
          else {
            handle = Commands.getFormHandle(form);
          }
        }
      }
      this.ConstructMagicNum(resVal, handle, StorageAttribute.NUMERIC);
    }
  }

  /// <summary>(protected)
  /// sets the cursor shape
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="cursorShapeNo">cursor shape number</param>
  eval_op_setcrsr(resVal: ExpVal, cursorShapeNo: ExpVal): void {
    if (cursorShapeNo.MgNumVal === null) {
      this.SetNULL(resVal, StorageAttribute.BOOLEAN);
    }
    else {
      let val: number = cursorShapeNo.MgNumVal.NUM_2_LONG();
      // this values are allowed by magic
      let ret: boolean = Commands.setCursor(<MgCursors>val);
      resVal.BoolVal = ret;
      resVal.Attr = StorageAttribute.BOOLEAN;
    }
  }

  IsParallel(task: TaskBase): boolean {
    return false;
  }

  /// <summary>(protected)
  ///  returns a window dimension, X position, Y position, Width or Height.
  /// </summary>
  /// <param name="resVal">window dimension</param>
  /// <param name="val1">generation</param>
  /// <param name="val2">dimension char (W/H/X/Y)</param>
  eval_op_win_box(resVal: ExpVal, val1: ExpVal, val2: ExpVal): void {
    if (val1.MgNumVal === null || val2.StrVal === null) {
      this.SetNULL(resVal, StorageAttribute.NUMERIC);
    }
    else {
      let parent: number = val1.MgNumVal.NUM_2_LONG();
      this.ConstructMagicNum(resVal, 0, StorageAttribute.NUMERIC);
      if (!(!val1.MgNumVal.num_is_zero() && parent === 0)) {
        let len: number = val2.StrVal.length;
        let currTask: TaskBase = <TaskBase>this.ExpTask.GetContextTask();

        if (((parent >= 0 && parent < currTask.GetTaskDepth()) || parent === GuiExpressionEvaluator.TRIGGER_TASK) && len === 1) {
          let temp: string = val2.StrVal;
          let s: string = temp.toUpperCase();
          let tsk: TaskBase = this.GetContextTask(parent);
          // if the task's window wasn't opened - return 0
          // if we get to the main program of parallel task - return 0 as in 1.9
          if (tsk === null || tsk.getForm() === null || (tsk.isMainProg() && this.IsParallel(tsk))) {
            resVal.MgNumVal.NUM_SET_ZERO();
          }
          else {
            if (s === 'X' || s === 'Y' || s === 'W' || s === 'H') {
              len = Manager.WinPropGet(tsk.getForm(), s);
              resVal.MgNumVal.NUM_4_LONG(len);
            }
          }
        }
      }
    }
  }


  /// <summary>
  ///   for Browser Control only: get the text from the browser Control
  /// </summary>
  eval_op_browserGetContent(resVal: ExpVal, controlName: ExpVal): void {
    resVal.Attr = StorageAttribute.ALPHA;
    resVal.StrVal = "";

    // Find the browser control by the control name
    let form: MgFormBase = this.ExpTask.getForm();
    let ctrlName: string = StrUtil.rtrim(controlName.StrVal);
    let ctrl: MgControlBase = this.ExpTask.getForm().GetCtrl(ctrlName);
    if (ctrl !== null) {
      resVal.StrVal = Commands.getBrowserText(ctrl);
    }
  }

  /// <summary>
  ///   for Browser Control only: set the text on the browser Control
  /// </summary>
  eval_op_browserSetContent(resVal: ExpVal, controlName: ExpVal, text: ExpVal): void {
    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = false;

    // Find the browser control by the control name

    let form: MgFormBase = this.ExpTask.getForm();
    let sCtrlName: string = StrUtil.rtrim(controlName.StrVal);
    let control: MgControlBase = this.ExpTask.getForm().GetCtrl(sCtrlName);
    if (control !== null) {
      resVal.BoolVal = Commands.setBrowserText(control, text.StrVal);
    }
  }

  eval_op_browserExecute_DO(resVal: ExpVal, controlName: ExpVal, text: ExpVal, sync: ExpVal, language: string): void {
    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = false;

    // Find the browser control by the control name
    let form: MgFormBase = this.ExpTask.getForm();
    let sCtrlName: string = StrUtil.rtrim(controlName.StrVal);
    let control: MgControlBase = this.ExpTask.getForm().GetCtrl(sCtrlName);
    if (control !== null && control.isBrowserControl()) {
      resVal.BoolVal = Commands.browserExecute(control, text.StrVal, sync.BoolVal, language);
    }
  }

  /// <summary>(protected)
  /// return the control name of last clicked control
  /// </summary>
  eval_op_ctrl_name(resVal: ExpVal): void {
    let lastClickedCtrlName: string = Manager.GetCurrentRuntimeContext().LastClickedCtrlName;
    resVal.StrVal = (NString.IsNullOrEmpty(lastClickedCtrlName) ? "" : lastClickedCtrlName);
    resVal.Attr = StorageAttribute.ALPHA;
  }

  /// <summary>(protected)
  /// returns name of the control on which the user was last parked in a task
  /// </summary>
  /// <param name="resVal">control name</param>
  /// <param name="val1">generation</param>
  eval_op_last_parked(resVal: ExpVal, val1: ExpVal): void {
    let taskBase: TaskBase = <TaskBase>this.ExpTask.GetContextTask();
    resVal.Attr = StorageAttribute.ALPHA;
    resVal.StrVal = "";
    let text: string = "";
    let num: number = val1.MgNumVal.NUM_2_LONG();
    if (num !== GuiExpressionEvaluator.TRIGGER_TASK) {
      if (num < taskBase.GetTaskDepth()) {
        text = taskBase.GetLastParkedCtrlName(num);
      }
    }
    // THIS() used.
    else  {
      let triggeredTsk: TaskBase = this.GetContextTask(num); // find triggered task
      if (triggeredTsk !== null) {
        text = triggeredTsk.GetLastParkedCtrlName(0);
      }
    }
    if (!NString.IsNullOrEmpty(text)) {
      resVal.StrVal = text;
    }
  }

  /// <summary>(protected)
  /// returns current caret position
  /// </summary>
  /// <param name="res">caret position</param>
  eval_op_caretPosGet(res: ExpVal): void {

    // result is logical
    res.Attr = StorageAttribute.NUMERIC;
    res.IsNull = false;
    res.MgNumVal = new NUM_TYPE();

    let lastFocusedTask: TaskBase = <TaskBase>this.GetLastFocusedTask();
    if (!(lastFocusedTask === null || this.ExpTask.ContextID !== lastFocusedTask.ContextID)) {
      let currCtrl: MgControlBase = lastFocusedTask.getLastParkedCtrl();

      // Make sure a control exists, the task is in the control level and that we are allowed to update it
      if (currCtrl !== null && currCtrl.isTextControl() && currCtrl.InControl) {
        res.MgNumVal.NUM_4_LONG(Manager.CaretPosGet(currCtrl) + 1);
      }
    }
  }

  /// <summary>(protected)
  /// marks the text of control
  /// </summary>
  /// <param name="startPosVal">starting position in text to be marked</param>
  /// <param name="lenVal">number of characters to be marked</param>
  /// <param name="res">number of characters marked</param>
  eval_op_markText(startPosVal: ExpVal, lenVal: ExpVal, res: ExpVal): void {

    // result is logical
    res.Attr = StorageAttribute.NUMERIC;
    res.IsNull = false;
    res.MgNumVal = new NUM_TYPE();

    // null inputs are not allowed
    if (!(startPosVal.IsNull || lenVal.IsNull)) {
      let lastFocusedTask: TaskBase = <TaskBase>this.GetLastFocusedTask();
      if (!(lastFocusedTask === null || this.ExpTask.ContextID !== lastFocusedTask.ContextID)) {
        let currCtrl: MgControlBase = lastFocusedTask.getLastParkedCtrl();
        let startPos: number = startPosVal.MgNumVal.NUM_2_LONG();
        let len: number = lenVal.MgNumVal.NUM_2_LONG();

        // Select in "reverse" mode (backwards instead of forward)
        if (len < 0) {
          startPos = startPos + len;
          len = -len;
        }

        // Make sure the selection is in the control's boundaries and that the control is of the right type
        if (currCtrl !== null && startPos > 0 && len !== 0 && currCtrl.isTextControl() && currCtrl.InControl) {
          let val: string = Manager.GetCtrlVal(currCtrl);
          let ctrlLen: number = val.length;
          if (startPos <= ctrlLen) {
            if (startPos + len - 1 > ctrlLen) {
              len = ctrlLen - startPos + 1;
            }
            Manager.MarkText(currCtrl, startPos - 1, len);
            res.MgNumVal.NUM_4_LONG(len);
          }
        }
      }
    }
  }

  /// <summary>(protected)
  /// replaces the marked text with a specified string
  /// </summary>
  /// <param name="strToSet">new text</param>
  /// <param name="res">returns marked text has been replaced or not</param>
  eval_op_markedTextSet(strToSet: ExpVal, res: ExpVal): void {
    // result is logical
    res.Attr = StorageAttribute.BOOLEAN;
    res.IsNull = false;
    res.BoolVal = false;

    // null input not allowed
    if (!(strToSet.IsNull || strToSet.StrVal === null)) {
      let lastFocusedTask: TaskBase = <TaskBase>this.GetLastFocusedTask();
      if (!(lastFocusedTask === null || this.ExpTask.ContextID !== lastFocusedTask.ContextID)) {
        let currCtrl: MgControlBase = lastFocusedTask.getLastParkedCtrl();
        let strVal: string = strToSet.StrVal;

        // Make sure a control exists, the task is in the control level and that we are allowed to update it
        if (currCtrl !== null && currCtrl.isTextControl() && currCtrl.InControl &&
          currCtrl.IsParkable(false) && currCtrl.isModifiable()) {
          res.BoolVal = Manager.MarkedTextSet(currCtrl, strVal);
        }
      }
    }
  }

  /// <summary>(protected)
  /// returns marked text
  /// </summary>
  /// <param name="res">marked text</param>
  eval_op_markedTextGet(res: ExpVal): void {

    // result is logical
    res.Attr = StorageAttribute.ALPHA;
    res.IsNull = true;
    res.StrVal = null;

    let lastFocusedTask: TaskBase = <TaskBase>this.GetLastFocusedTask();

    if (!(lastFocusedTask === null || this.ExpTask.ContextID !== lastFocusedTask.ContextID)) {
      let currCtrl: MgControlBase = lastFocusedTask.getLastParkedCtrl();

      // Make sure a control exists, the task is in the control level and that we are allowed to update it
      if (currCtrl !== null && currCtrl.isTextControl() && currCtrl.InControl) {
        res.StrVal = Manager.MarkedTextGet(currCtrl);
        if (!NString.IsNullOrEmpty(res.StrVal)) {
          res.IsNull = false;
        }
        else {
          res.StrVal = null;
        }
      }
    }
  }

  /// <summary>(protected)
  /// returns the value of a last focused control
  /// <param name="resVal">control value</param>
  /// </summary>
  eval_op_editget(resVal: ExpVal): void {
    let currCtrl: MgControlBase = null;
    let lastFocusedTask: TaskBase = <TaskBase>this.GetLastFocusedTask();

    if (lastFocusedTask !== null) {
      currCtrl = lastFocusedTask.getLastParkedCtrl();
    }

    // Needs to check context because in case of parallel program, if handler(eg. timer) that executing
    // the expression is running in different context than active context, then function should not work.
    if (currCtrl === null || !currCtrl.InControl || this.ExpTask.ContextID !== lastFocusedTask.ContextID) {
      resVal.Attr = StorageAttribute.ALPHA;
      resVal.StrVal = "";
      resVal.IsNull = false;
    }

    let refResVal: RefParam<ExpVal> = new RefParam(resVal);
    this.EditGet(currCtrl, refResVal);
    resVal = refResVal.value;
  }

  /// <summary>(protected)
  ///   updates the value of a last focused control while in edit mode
  /// </summary>
  eval_op_editset(val1: ExpVal, resVal: ExpVal): void {
    resVal.Attr = StorageAttribute.BOOLEAN;

    let currCtrl: MgControlBase = null;
    let lastFocusedTask: TaskBase = <TaskBase>this.GetLastFocusedTask();

    if (lastFocusedTask !== null) {
      currCtrl = lastFocusedTask.getLastParkedCtrl();
    }

    // Needs to check context because in case of parallel program, if handler(eg. timer) that executing
    // the expression is running in different context than active context, then function should not work.
    if (currCtrl === null || !currCtrl.InControl || this.ExpTask.ContextID !== lastFocusedTask.ContextID) {
      resVal.BoolVal = false;
    }
    else {
      if (val1.Attr === StorageAttribute.NONE) {
        this.Events.WriteExceptionToLog("ExpressionEvaluator.eval_op_editset() there is no such type of variable");
        resVal.BoolVal = false;
      }
      else {
        let currFld: Field = currCtrl.getField();
        this.ConvertExpVal(val1, currFld.getType());
        if (val1.IsNull || StorageAttributeCheck.isTheSameType(val1.Attr, currFld.getType())) {
          let mgVal: string = val1.ToMgVal();

          // For all choice controls, the VC should be executed immediately. So, we should directly
          // update the variable's value (In 1.9 OL, we called eval_op_varset())

          if (currCtrl.isSelectionCtrl() || currCtrl.isTabControl() || currCtrl.isRadio() || currCtrl.isCheckBox()) {
            lastFocusedTask.UpdateFieldValueAndStartRecompute(currFld, mgVal, val1.IsNull);
          }
          else {
            // If the new value is null, get the null/default value of the field and set it on the control.
            // VC will be fired when we leave the control.
            if (val1.IsNull) {
              mgVal = currCtrl.getField().getDefaultValue();
            }
            currCtrl.getField().updateDisplay(mgVal, val1.IsNull, true);
            currCtrl.ModifiedByUser = true;
          }
          resVal.BoolVal = true;
        }
        else {
          resVal.BoolVal = false;
        }
      }
    }
  }

  /// <summary>
  /// PixelsToFormUnits
  /// </summary>
  /// <param name="pixels"></param>
  /// <param name="isX"></param>
  /// <param name="resVal"></param>
  eval_op_PixelsToFormUnits(pixels: ExpVal, isX: ExpVal, resVal: ExpVal): void {
    let pix: number = pixels.MgNumVal.to_double();
    let isXcoordinate: boolean = isX.BoolVal;

    resVal.MgNumVal = new NUM_TYPE();
    resVal.Attr = StorageAttribute.NUMERIC;

    let currentForm: MgFormBase = this.ExpTask.getForm();
    pix = pix * <number>(<number>Commands.getResolution(currentForm.getMapObject()).x / 96);

    let uom: number = currentForm.pix2uomWithDoubleVal(pix, isXcoordinate);
    resVal.MgNumVal = NUM_TYPE.from_double(isXcoordinate ? (uom / <number>currentForm.getHorizontalFactor()) : (uom / <number>currentForm.getVerticalFactor()));
  }

  /// <summary>
  /// FormUnitsToPixels
  /// </summary>
  /// <param name="uom"></param>
  /// <param name="isX"></param>
  /// <param name="resVal"></param>
  eval_op_FormUnitsToPixels(uom: ExpVal, isX: ExpVal, resVal: ExpVal): void {
    let inUOM: number = uom.MgNumVal.to_double();
    let isXcoordinate: boolean = isX.BoolVal;
    resVal.MgNumVal = new NUM_TYPE();
    resVal.Attr = StorageAttribute.NUMERIC;

    let form: MgFormBase = this.ExpTask.getForm();
    inUOM = inUOM / <number>(<number>Commands.getResolution(form.getMapObject()).x / 96);

    let pix: number = form.uom2pixWithDoubleVal(inUOM, isXcoordinate);
    resVal.MgNumVal = NUM_TYPE.from_double(isXcoordinate ? (pix * <number>form.getHorizontalFactor()) : (pix * <number>form.getVerticalFactor()));
  }

  /// <summary>(protected)
  ///   Clears the form user state
  /// </summary>
  /// <param name="formName">form name (current form('') /all forms(*)) </param>
  /// <param name="resVal">succeed or failed</param>
  eval_op_formStateClear(formName: ExpVal, resVal: ExpVal): void {
  }

  /// <summary>(protected)
  /// Moves the caret to specified control
  /// </summary>
  /// <param name = "ctrlName">the name of the destination control</param>
  /// <param name = "rowNum">the row in the table  0 represents current row</param>
  /// <param name = "generation">the task generation</param>
  /// <param name = "retVal">the result</param>
  eval_op_gotoCtrl(ctrlName: ExpVal, rowNum: ExpVal, generation: ExpVal, retVal: ExpVal): void {
    retVal.Attr = StorageAttribute.BOOLEAN;
    retVal.BoolVal = false;
    let task: TaskBase = this.GetContextTask(generation.MgNumVal.NUM_2_LONG());
    if (task === null || task.getForm() === null)
      return;

    let iRowNum: number = rowNum.MgNumVal.NUM_2_LONG();
    let sCtrlName: string = StrUtil.rtrim(ctrlName.StrVal);
    let ctrl: MgControlBase = task.getForm().GetCtrl(sCtrlName);
    retVal.BoolVal = this.HandleControlGoto(task, ctrl, iRowNum);
  }

  /// <summary>(protected)
  /// shows the Directory Dialog box and returns the selected directory
  /// </summary>
  /// <param name = "descriptionVal">description shown in Directory Dialog Box. It can be blank.</param>
  /// <param name = "initDir">the initial path to be shown.</param>
  /// <param name = "showNew">should the dialog show the new folder button.</param>
  /// <param name = "resVal">selected directory</param>
  eval_op_client_dir_dlg(descriptionVal: ExpVal, initDir: ExpVal, showNew: ExpVal, resVal: ExpVal): void {
    resVal.Attr = StorageAttribute.ALPHA;
    let description: string = GuiExpressionEvaluator.exp_build_string(descriptionVal);
    let path: string = this.exp_build_ioname(initDir);
    let showNewFolder: boolean = showNew.BoolVal;
    resVal.StrVal = Commands.directoryDialogBox(description, path, showNewFolder);
  }

  /// <summary>(protected)
  /// get context task by a specified generation
  /// </summary>
  /// <param name = "currTask">current task</param>
  /// <param name = "generation">task generation</param>
  /// <returns> task at specified generation</returns>
  static GetContextTask(currTask: TaskBase, generation: number): TaskBase {
    let task: TaskBase = null;
    let taskBase: TaskBase = <TaskBase>currTask.GetContextTask();
    if (generation === GuiExpressionEvaluator.TRIGGER_TASK) {
      task = taskBase;
    }
    else {
      if (generation < taskBase.GetTaskDepth()) {
        task = <TaskBase>taskBase.GetTaskAncestor(generation);
      }
    }
    return task;
  }

  /// <summary>(protected)
  /// get context task by a specified generation
  /// </summary>
  /// <param name = "generation">task generation</param>
  /// <returns> task at specified generation</returns>
  GetContextTask(generation: number): TaskBase {
    return GuiExpressionEvaluator.GetContextTask(this.ExpTask, generation);
  }

  /// <summary>(protected)
  /// Create a NUM_TYPE with the value of i and set the ExpVal with it
  /// </summary>
  ConstructMagicNum(resVal: ExpVal, i: number, attr: StorageAttribute): void {
    resVal.MgNumVal = new NUM_TYPE();
    resVal.MgNumVal.NUM_4_LONG(i);
    resVal.Attr = attr;
  }

  /// <summary>(public)
  /// set null value to Expression Evaluator
  /// </summary>
  /// <param name = "resVal">to set it NULL</param>
  /// <param name = "attr">attribute of ExpValue</param>
  SetNULL(resVal: ExpVal, attr: StorageAttribute): void {

        switch (attr) {
          case StorageAttribute.ALPHA:
          case StorageAttribute.UNICODE:
            resVal.StrVal = null;
            break;

          case StorageAttribute.TIME:
          case StorageAttribute.DATE:
          case StorageAttribute.NUMERIC:
            resVal.MgNumVal = null;
            break;

          case StorageAttribute.BOOLEAN:
            resVal.BoolVal = false;
            break;

          default:
            break;
        }
  }

  /// <summary>
  ///   validate value of the control
  /// </summary>
  /// <param name = "currCtrl">control whose value need to be evaluated</param>
  /// <param name = "oldValue">old value of the control</param>
  /// <param name = "newValue">new value of the control</param>
  GetValidatedValue(currCtrl: MgControlBase, oldValue: string, newValue: string): string {
    let vd: ValidationDetails = currCtrl.buildCopyPicture(oldValue, newValue);
    vd.evaluate();
    let validationFailed: boolean = vd.ValidationFailed;
    let ctrlValue: string;
    if (validationFailed) {
      let field: Field = currCtrl.getField();
      ctrlValue = ((field.getType() === StorageAttribute.BLOB_VECTOR) ? field.getCellDefualtValue() : field.getDefaultValue());
    }
    else {
      ctrlValue = vd.getDispValue();
    }
    return ctrlValue;
  }

  /// <summary>
  ///   set expValue of needed type . the value is inited by value
  /// </summary>
  /// <param name = "resVal">need be evaluated/initialized</param>
  /// <param name = "type">of resVal (Alpha|Numeric|Logical|Date|Time|Blob|Vector)</param>
  /// <param name = "val">string/hexa string</param>
  /// <param name = "pic">for string evaluation</param>
  SetVal(resVal: ExpVal, type: StorageAttribute, val: string, pic: PIC): void {

      switch (type) {

        case StorageAttribute.ALPHA:
        case StorageAttribute.BLOB:
        case StorageAttribute.BLOB_VECTOR:
        case StorageAttribute.UNICODE:
          resVal.Attr = type;
          resVal.StrVal = val;

          if (type === StorageAttribute.BLOB || type === StorageAttribute.BLOB_VECTOR)
            resVal.IncludeBlobPrefix = true;
          break;

        case StorageAttribute.NUMERIC:
        case StorageAttribute.DATE:
        case StorageAttribute.TIME:
          resVal.Attr = type;
          if (val == null)
            resVal.MgNumVal = null;
          else if (pic == null)
            resVal.MgNumVal = new NUM_TYPE(val);
          else
            resVal.MgNumVal = new NUM_TYPE(val, pic, (this.ExpTask).getCompIdx());
          break;

        case StorageAttribute.BOOLEAN:
          resVal.Attr = type;
          resVal.BoolVal = DisplayConvertor.toBoolean(val);
          break;

        default:
          this.SetNULL(resVal, type);

          this.Events.WriteExceptionToLog("ExpressionEvaluator.SetVal() there is no such type : " + type);

          // ClientManager.Instance.WriteErrorToLog("ExpressionEvaluator.SetVal() there is no such type : " + type);
          break;
      }
  }

  /// <summary>(protected)
  /// trims and returns the string.
  /// </summary>
  /// <param name = "val">containing string to be trimmed (strVal_ member of ExpVal)</param>
  /// <returns>trimmed string</returns>
  static exp_build_string(val: ExpVal): string {
    let name: string = "";
    if (val.StrVal !== null) {
      let len: number = <number>val.StrVal.length;
      if (len > 0) {
        name = StrUtil.ZstringMake(val.StrVal, <number>len);
      }
    }
    return name;
  }

  /// <summary>(protected)
  /// translates a filepath (supports logical name)
  /// </summary>
  /// <param name = "val">containing filepath (strVal_ member of ExpVal)</param>
  /// <returns> trimmed and translated string.</returns>
  exp_build_ioname(val: ExpVal): string {
    let name: string = "";
    if (val.StrVal !== null) {
      let len: number = <number>Math.min(val.StrVal.length, 260);
      if (len > 0) {
        let tempName: string = StrUtil.ZstringMake(val.StrVal, <number>len);
        name = this.Translate(tempName);
      }
    }
    return name;
  }

  /// <summary>
  /// checks if the object is instance of ExpVal
  /// </summary>
  /// <param name="obj"></param>
  /// <returns></returns>
  static isExpVal(obj: any): boolean {
    return obj instanceof ExpVal;
  }

  /// <summary>(private)
  /// handle conversions between blob and unicode/alpha
  /// </summary>
  /// <param name="val"></param>
  /// <param name="expectedType"></param>
  private BlobStringConversion(val: ExpVal, expectedType: StorageAttribute): void {
    if (StorageAttributeCheck.IsTypeAlphaOrUnicode(expectedType)) {
      if (val.Attr === StorageAttribute.BLOB) {
        let includeBlobPrefix: boolean = val.IncludeBlobPrefix;
        if (includeBlobPrefix) {
          let contentType: string = BlobType.getContentType(val.StrVal);
          val.StrVal = BlobType.getString(val.StrVal);
          val.IncludeBlobPrefix = false;
          if (contentType !== BlobType.CONTENT_TYPE_BINARY && Rtf.isRtf(val.StrVal)) {
            val.StrVal = StrUtil.GetPlainTextfromRtf(val.StrVal);
          }
        }
        val.Attr = expectedType;
      }
      else {
        if (val.Attr === StorageAttribute.BLOB_VECTOR) {
          let includeBlobPrefix2: boolean = val.IncludeBlobPrefix;
          if (includeBlobPrefix2) {
            val.StrVal = BlobType.removeBlobPrefix(val.StrVal);
            val.IncludeBlobPrefix = false;
          }
          val.Attr = expectedType;
        }
      }
    }
    else {
      if (expectedType === StorageAttribute.BLOB) {
        if (StorageAttributeCheck.IsTypeAlphaOrUnicode(val.Attr)) {
          let contentType: string = (val.Attr === StorageAttribute.ALPHA) ? BlobType.CONTENT_TYPE_ANSI : BlobType.CONTENT_TYPE_UNICODE;
          val.StrVal = BlobType.createFromString(val.StrVal, contentType);
          val.IncludeBlobPrefix = true;
          val.Attr = expectedType;
        }
      }
    }
  }

  /// <summary>(protected)
  /// prepares ExpVal from controls value(in edit mode)
  /// it validates the value and copy the actual value (excluding format)
  /// to ExpVal if valid. Other wise copy default value.
  /// </summary>
  /// <param name="ctrl">control</param>
  /// <param name="resVal">out: resultant ExpVal</param>
  /// <returns></returns>
  GetValidatedMgValue(ctrl: MgControlBase, refResVal: RefParam<ExpVal>): void {
    let currValOfcontrol: string = Manager.GetCtrlVal(ctrl);
    let orgCurrValOfControl: string = currValOfcontrol;
    let prevValOfControl: string = ctrl.Value;
    currValOfcontrol = this.GetValidatedValue(ctrl, prevValOfControl, currValOfcontrol);
    currValOfcontrol = ctrl.getMgValue(orgCurrValOfControl);
    this.SetVal(refResVal.value, ctrl.DataType, currValOfcontrol, null);
    refResVal.value.IsNull = ctrl.IsNull;
  }

  /// <summary>
  /// SetWindow Focus.
  /// </summary>
  /// <param name="expVal"></param>
  /// <param name="resVal"></param>
  eval_op_setwindow_focus(expVal: ExpVal, resVal: ExpVal): void {
  }

  /// <summary>
  /// Set data to be dragged.
  /// </summary>
  static eval_op_DragSetData(resVal: ExpVal, expData: ExpVal, expFormat: ExpVal, expUserFormat: ExpVal): void {
    let format: ClipFormats = <ClipFormats>expFormat.MgNumVal.NUM_2_LONG();
    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = false;
    if (expData.StrVal !== null && DroppedData.IsFormatSupported(format) && Commands.IsBeginDrag()) {
      if (StorageAttributeCheck.isTypeBlob(expData.Attr) && expData.IncludeBlobPrefix) {
        expData.StrVal = BlobType.removeBlobPrefix(expData.StrVal);
      }
      Commands.addAsync(CommandType.SETDATA_FOR_DRAG, null, 0, NString.TrimEnd(expData.StrVal, null), (expUserFormat !== null) ? expUserFormat.StrVal : null, expFormat.MgNumVal.NUM_2_LONG());
      resVal.BoolVal = true;
    }
  }


  /// <summary>
  /// Get the dropped data, from GuiUtils.DroppedData according to the format.
  /// </summary>
  static eval_op_DropGetData(resVal: ExpVal, expFormat: ExpVal, expUserFormat: ExpVal): void {
    let format: ClipFormats = <ClipFormats>expFormat.MgNumVal.NUM_2_LONG();
    resVal.Attr = StorageAttribute.UNICODE;
    resVal.StrVal = null;
    if (DroppedData.IsFormatSupported(format)) {
      let droppedData: string = Commands.GetDroppedData(format, (expUserFormat !== null) ? expUserFormat.StrVal : null);
      resVal.StrVal = ((droppedData.length > 0) ? droppedData : "");
    }
  }

  /// <summary>
  /// Check whether the format is present in dropped data or not.
  /// </summary>
  static eval_op_DropFormat(resVal: ExpVal, expFormat: ExpVal, expUserFormat: ExpVal): void {
    let format: ClipFormats = <ClipFormats>expFormat.MgNumVal.NUM_2_LONG();
    resVal.BoolVal = false;
    resVal.Attr = StorageAttribute.BOOLEAN;
    if (DroppedData.IsFormatSupported(format)) {
      resVal.BoolVal = Commands.CheckDropFormatPresent(format, (expUserFormat !== null) ? expUserFormat.StrVal : null);
    }
  }

  /// <summary>
  /// return the drop mouse as uom
  /// </summary>
  /// <returns></returns>
  private GetDropMouseAsUom(isXaxis: boolean): number {
    let dropInt: number = isXaxis ? Commands.GetDroppedX() : Commands.GetDroppedY();
    let form: MgFormBase = (<TaskBase>this.ExpTask.GetContextTask()).getForm();
    let runtimeContext: RuntimeContextBase = Manager.GetCurrentRuntimeContext();
    return form.pix2uom(<number>dropInt, isXaxis);
  }

  /// <summary>
  /// Get the X coordinate relative to form where drop occurs.
  /// </summary>
  eval_op_GetDropMouseX(resVal: ExpVal): void {
    resVal.MgNumVal = new NUM_TYPE();
    let uom: number = this.GetDropMouseAsUom(true);
    resVal.MgNumVal.NUM_4_LONG(uom);
    resVal.Attr = StorageAttribute.NUMERIC;
  }

  /// <summary>
  /// Get the Y coordinate relative to form where drop occurs.
  /// </summary>
  eval_op_GetDropMouseY(resVal: ExpVal): void {
    resVal.MgNumVal = new NUM_TYPE();
    let uomY: number = this.GetDropMouseAsUom(false);
    resVal.MgNumVal.NUM_4_LONG(uomY);
    resVal.Attr = StorageAttribute.NUMERIC;
  }

  /// <summary>
  /// Set the Cursor for Drag operation.
  /// </summary>
  /// <param name="resVal">bool whether cursor is set or not.</param>
  /// <param name="val1">It will contain FileName of a cursor.</param>
  /// <param name="val2">Cursor type : Copy / None </param>
  static eval_op_DragSetCursor(resVal: ExpVal, val1: ExpVal, val2: ExpVal): void {
  }

  eval_op_zimeread(resVal: ExpVal): void {
    resVal.Attr = StorageAttribute.ALPHA;
    resVal.StrVal = "";
    let utilImeJpn: UtilImeJpn = Manager.UtilImeJpn;
    if (utilImeJpn !== null) {
      let strImeRead: string = utilImeJpn.StrImeRead;
      if (!NString.IsNullOrEmpty(utilImeJpn.StrImeRead)) {
        resVal.StrVal = strImeRead;
      }
    }
  }

  eval_op_win_help(expFilePath: ExpVal, expHelpCmd: ExpVal, expHelpKey: ExpVal, resVal: ExpVal): void {
    let filePath: string = expFilePath.StrVal;
    let helpCmd: HelpCommand = <HelpCommand>expHelpCmd.MgNumVal.NUM_2_LONG();
    let helpKey: string = expHelpKey.StrVal;
    resVal.Attr = StorageAttribute.BOOLEAN;

    try {
      Manager.ShowWindowHelp(filePath, helpCmd, helpKey);
      resVal.BoolVal = true;
    } catch (ex) {
        resVal.BoolVal = false;
    }
  }

  ConvertExpVal(val: ExpVal, expectedType: StorageAttribute): void {
    if (StorageAttributeCheck.StorageFldAlphaUnicodeOrBlob(val.Attr, expectedType)) {
      this.BlobStringConversion(val, expectedType);
    }
  }

  constructor() {

  }
}

/// <summary>
///   The class holds data of a basic element (constant or variable) that
///   appears or are result of execution of operator
/// </summary>
export class ExpVal {
  Attr: StorageAttribute = StorageAttribute.NONE;
  IsNull: boolean = false;
  MgNumVal: NUM_TYPE = null;
  StrVal: string = null;
  BoolVal: boolean = false;
  IncludeBlobPrefix: boolean = false;
  OriginalNull: boolean = false;
  VectorField: Field = null;

  constructor();
  constructor(attr: StorageAttribute, isNull: boolean, mgVal: string);
  constructor(attr?: StorageAttribute, isNull?: boolean, mgVal?: string) {
    if (arguments.length === 0) {
      this.constructor_0();
      return;
    }
    this.constructor_1(attr, isNull, mgVal);
  }

  private constructor_0(): void {
    this.Attr = StorageAttribute.NONE;
  }

  private constructor_1(attr: StorageAttribute, isNull: boolean, mgVal: string): void {
    this.Init(attr, isNull, mgVal);
  }

  Copy(src: ExpVal): void {
    this.Attr = src.Attr;
    this.BoolVal = src.BoolVal;
    this.IncludeBlobPrefix = src.IncludeBlobPrefix;
    this.IsNull = src.IsNull;
    this.MgNumVal = src.MgNumVal;
    this.StrVal = src.StrVal;
    this.VectorField = src.VectorField;
    this.OriginalNull = src.OriginalNull;
  }

  /// <summary>
  /// nullify
  /// </summary>
  Nullify(): void {
    this.Init(StorageAttribute.NONE, true, null);
  }

  /// <summary>
  ///   initialize
  /// </summary>
  Init(attr: StorageAttribute, isNull: boolean, mgVal: string): void {
    this.Attr = attr;
    this.IsNull = isNull;


    switch (this.Attr) {
      case StorageAttribute.ALPHA:
      case StorageAttribute.UNICODE:
        this.StrVal = mgVal;
        break;

      case StorageAttribute.BLOB:
      case StorageAttribute.BLOB_VECTOR:
        this.StrVal = mgVal;
        this.IncludeBlobPrefix = true;
        break;

      case StorageAttribute.NUMERIC:
      case StorageAttribute.DATE:
      case StorageAttribute.TIME:
        this.MgNumVal = ((mgVal !== null) ? new NUM_TYPE(mgVal) : null);
        break;

      case StorageAttribute.BOOLEAN:
        this.BoolVal = (mgVal !== null && mgVal === "1");
        break;

      case StorageAttribute.NONE:
        this.BoolVal = false;
        this.StrVal = null;
        this.MgNumVal = null;
        this.OriginalNull = true;
        this.VectorField = null;
        this.IncludeBlobPrefix = false;
        break;

      case StorageAttribute.DOTNET:
        // For dotnet objects, ExpVal should be constructed using overloaded Constructor.
        // If it is a blobPrefix, it should be done here.
        this.StrVal = mgVal;
        break;

      default:
        throw new ApplicationException("in ExpVal.ExpVal() illegal attribute: '" + this.Attr + "'");
    }
  }

  /// <summary>
  ///   Gets the string form of the value in the ExpVal class
  /// </summary>
  ToMgVal(): string {

    let str: string;

    switch (this.Attr) {
      case StorageAttribute.ALPHA:
      case StorageAttribute.BLOB:
      case StorageAttribute.BLOB_VECTOR:
      case StorageAttribute.UNICODE:
        str = this.StrVal;
        break;

      case StorageAttribute.NUMERIC:
      case StorageAttribute.DATE:
      case StorageAttribute.TIME:
        str = this.MgNumVal.toXMLrecord();
        break;

      case StorageAttribute.BOOLEAN:
        str = this.BoolVal
          ? "1"
          : "0";
        break;

      default:
        str = "[illegal attribute: " + this.Attr + "]";
        break;
    }
    return str;
  }

  /// <summary>
  /// return true if the value is an empty string
  /// </summary>
  /// <returns></returns>
  isEmptyString(): boolean
  {
    return (this.Attr === StorageAttribute.ALPHA || this.Attr === StorageAttribute.UNICODE) && this.StrVal === "";
  }

}
