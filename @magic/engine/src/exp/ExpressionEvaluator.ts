import {
  BlobType,
  DataModificationTypes,
  DateBreakParams,
  DisplayConvertor,
  ExpressionInterface,
  ExpVal,
  GuiExpressionEvaluator,
  ITask,
  Manager,
  MgControlBase,
  MgFormBase,
  NUM_TYPE,
  PIC,
  Property,
  PropInterface,
  TimeBreakParams,
  VectorType
} from "@magic/gui";
import {
  Constants,
  InternalInterface,
  Logger,
  Misc,
  MsgInterface,
  PICInterface,
  StorageAttribute,
  StorageAttributeCheck,
  StrUtil,
  UtilDateJpn,
  UtilStrByteMode
} from "@magic/utils";
import {
  ApplicationException,
  Array_Enumerator,
  Debug,
  Encoding,
  Exception,
  List,
  NChar,
  NNumber,
  NString,
  RefParam,
  Stack,
  StringBuilder
} from "@magic/mscorelib";
import {ExpressionLocalJpn} from "./ExpressionLocalJpn";
import {CommandsProcessorBase} from "../CommandsProcessorBase";
import {Field} from "../data/Field";
import {ClientManager} from "../ClientManager";
import {ExpDesc, ExpressionDict} from "./ExpressionDict";
import {DataViewCommandType} from "../commands/ClientToServer/DataviewCommand";
import {RunTimeEvent} from "../event/RunTimeEvent";
import {EventHandlerPosition} from "../event/EventHandlerPosition";
import {EventHandler} from "../event/EventHandler";
import {ArgumentsList} from "../rt/ArgumentsList";
import {Expression} from "./Expression";
import {IClientCommand} from "../commands/IClientCommand";
import {CommandFactory} from "../commands/ClientToServer/CommandFactory";
import {Sort} from "../tasks/sort/Sort";
import {Task, Task_SubformExecModeEnum, UserRange} from "../tasks/Task";
import {MGDataCollection} from "../tasks/MGDataCollection";
import {MGData} from "../tasks/MGData";
import {GlobalParams} from "./GlobalParamsTable";
import {Operation} from "../rt/Operation";
import {ConstInterface} from "../ConstInterface";
import {MgControl} from "../gui/MgControl";
import {DataView} from "../data/DataView";
import {Record} from "../data/Record";
import {MgForm} from "../gui/MgForm";
import {MenuManager} from "../MenuManager";
import {MgProperties} from "../util/MgProperties";
import {Process} from "../util/Process";
import {ReturnResult} from "../util/ReturnResult";
import {HttpUtility} from "../http/client/HttpUtility";

export class ExpressionEvaluator extends GuiExpressionEvaluator {

  private static ASTERISK_CHR: string = String.fromCharCode(1);
  private static QUESTION_CHR: string = String.fromCharCode(2);

  // Some items in polish are saved as short or long.
  // Following constants are used while reading the polished expression.
  static PARENT_LEN: number = 2; // 2 bytes
  static SHORT_OBJECT_LEN: number = 2; // 2 bytes
  static LONG_OBJECT_LEN: number = 4; // 4 bytes

  private static _recursiveExpCalcCount: number = 0;
  private _charsToTrim: string[] = [' ', '\0'];
  private _expressionLocalJpn: ExpressionLocalJpn = null;

  private get commandsProcessor(): CommandsProcessorBase {
    return Task.CommandsProcessor;
  }

  /// <summary>
  ///   CTOR
  /// </summary>
  constructor() {
    super();
    this._expressionLocalJpn = (UtilStrByteMode.isLocaleDefLangJPN() ? new ExpressionLocalJpn(this) : null);
  }

  /// <summary>
  ///   Get a basic value from the expression string
  /// </summary>
  /// <param name = "expStrTracker">the expression processed</param>
  /// <param name = "opCode">the opcode of the expression</param>
  /// <returns> the basic data value as an ExpVal instance</returns>
  private getExpBasicValue(expStrTracker: ExpStrTracker, opCode: number): ExpVal {
    let Val: ExpVal = new ExpVal();
    let len: number;
    let parent: number, vee: number;
    let field: Field;

    switch (opCode) {
      // --------------------------------------------------------------------
      // String Value
      // --------------------------------------------------------------------
      case ExpressionInterface.EXP_OP_A:
      case ExpressionInterface.EXP_OP_H:
        Val.Attr = StorageAttribute.UNICODE;
        len = expStrTracker.get4ByteNumber();
        Val.StrVal = expStrTracker.getString(len, true, true); // first value is unicode
        // since the server sends us both Unicode string Ansi string for
        // each string in the expression, and the client uses only unicode,
        // we will diregard the Ansi string
        len = expStrTracker.get4ByteNumber();
        expStrTracker.getString(len, true, false); // second value is ansi
        break;

      case ExpressionInterface.EXP_OP_EXT_A:
        Val.Attr = StorageAttribute.ALPHA;
        len = expStrTracker.get4ByteNumber();
        expStrTracker.getString(len, true, true); // first value is unicode
        // since the server sends us both Unicode string Ansi string for
        // each string in the expression, and the client uses only unicode,
        // we will diregard the Ansi string
        len = expStrTracker.get4ByteNumber();
        Val.StrVal = expStrTracker.getString(len, true, false);
        break;

      // --------------------------------------------------------------------
      // Magic Number value
      // --------------------------------------------------------------------
      case ExpressionInterface.EXP_OP_N:
      case ExpressionInterface.EXP_OP_T:
      case ExpressionInterface.EXP_OP_D:
      case ExpressionInterface.EXP_OP_E:
        if (opCode === ExpressionInterface.EXP_OP_D)
          Val.Attr = StorageAttribute.DATE;
        else if (opCode === ExpressionInterface.EXP_OP_T)
          Val.Attr = StorageAttribute.TIME;
        else
          Val.Attr = StorageAttribute.NUMERIC;
        len = expStrTracker.get2ByteNumber();
        Val.MgNumVal = expStrTracker.getMagicNumber(len, true);
        break;

      // --------------------------------------------------------------------
      // Logical Value
      // --------------------------------------------------------------------
      case ExpressionInterface.EXP_OP_L:
        Val.Attr = StorageAttribute.BOOLEAN;
        Val.BoolVal = (expStrTracker.get2ByteNumber() === 1);
        break;

      // --------------------------------------------------------------------
      // Variable Value
      // --------------------------------------------------------------------
      case ExpressionInterface.EXP_OP_V:
        parent = expStrTracker.getVarIdx();
        vee = expStrTracker.get4ByteNumber();
        field = <Field>(<Task>this.ExpTask).getFieldDef(parent, vee - 1);
        Val.Attr = field.getType();
        /* For Vector, null allowed is always true. If the field is a vector, the  */
        /* field.nullAllowed() actually returns the null allowed for the vec cell. */
        let nullAllowed: boolean = (field.getType() === StorageAttribute.BLOB_VECTOR)
          ? true
          : field.NullAllowed;
        Val.IsNull = field.isNull() && nullAllowed;
        Val.OriginalNull = Val.IsNull;
        let fldVal: string = field.getValue(true);

        if (fldVal != null && Val.IsNull &&
          field.getTask().getNullArithmetic() === Constants.NULL_ARITH_USE_DEF)
          Val.IsNull = false;

        switch (Val.Attr) {
          case StorageAttribute.ALPHA:
          case StorageAttribute.UNICODE:
            Val.StrVal = fldVal;
            break;

          case StorageAttribute.BLOB_VECTOR:
            Val.VectorField = field;
          // falls through

          case StorageAttribute.BLOB:
            Val.StrVal = fldVal;

            if (Val.StrVal == null) {
              Val.IsNull = true;
              Val.IncludeBlobPrefix = false;
            }
            else
              Val.IncludeBlobPrefix = true;
            break;

          case StorageAttribute.NUMERIC:
          case StorageAttribute.DATE:
          case StorageAttribute.TIME:
            Val.MgNumVal = fldVal != null ? new NUM_TYPE(fldVal) : null;
            break;

          case StorageAttribute.BOOLEAN:
            if (fldVal != null)
              Val.BoolVal = DisplayConvertor.toBoolean(fldVal);
            break;

        }
        break;

      case ExpressionInterface.EXP_OP_FORM:
        parent = expStrTracker.getVarIdx();
        let formDisplayIndexInTask: number = expStrTracker.get4ByteNumber();
        formDisplayIndexInTask = (<Task>this.ExpTask).GetRealMainDisplayIndexOnDepth(formDisplayIndexInTask);
        this.ConstructMagicNum(Val, formDisplayIndexInTask, StorageAttribute.NUMERIC);
        break;

      case ExpressionInterface.EXP_OP_VAR:
        parent = expStrTracker.getVarIdx();
        vee = expStrTracker.get4ByteNumber();
        let itm: number = (<Task>this.ExpTask).ctl_itm_4_parent_vee(parent, vee);
        this.ConstructMagicNum(Val, itm, StorageAttribute.NUMERIC);
        break;

      case ExpressionInterface.EXP_OP_RIGHT_LITERAL:
        len = expStrTracker.get2ByteNumber();
        Val.MgNumVal = expStrTracker.getMagicNumber(len, true);
        // Skip extra unused string stored after literal
        len = expStrTracker.get2ByteNumber();
        Val.Attr = StorageAttribute.NUMERIC;
        expStrTracker.getString(len, true, false);
        break;
    }

    return Val;
  }

  /// <summary>
  ///   Does the operator represents a basic data value?
  /// </summary>
  /// <param name = "opCode">  the current operation code</param>
  /// <returns> true if the operator indicates basic data item, false if not</returns>
  static isBasicItem(opCode: number): boolean {
    return (opCode <= ExpressionInterface.EXP_OP_L ||
            opCode === ExpressionInterface.EXP_OP_EXT_A ||
            opCode === ExpressionInterface.EXP_OP_RIGHT_LITERAL ||
            opCode === ExpressionInterface.EXP_OP_E ||
            opCode === ExpressionInterface.EXP_OP_FORM);
  }

  /// <summary>
  ///   Checks if the function has variable argument list
  ///   like in magic : EXP_OP_IS_VARARG(opr)
  /// </summary>
  private static isVarArgList(expDesc: ExpDesc): boolean {
    if (expDesc.ArgCount_ < 0 || expDesc.ArgAttr_.length > <number>expDesc.ArgCount_)
      return true;
    return false;
  }

  /// <summary>
  ///   Execute single operation
  /// </summary>
  /// <param name = "opCode">operation code to execute</param>
  /// <param name = "expStrTracker">the expression being processed</param>
  /// <param name = "valStack">stack of values that are the result of the operation</param>
  /// <param name = "addedOpers">stack of operation to execute as a result of this operator</param>
  /// <param name = "expectedType"></param>
  private execOperation(opCode: number, expStrTracker: ExpStrTracker, valStack: Stack<any>, addedOpers: List<DynamicOperation>, expectedType: StorageAttribute): void {
    let val1: ExpVal;
    let val2: ExpVal;
    let val3: ExpVal;
    let val4: ExpVal;
    let val5: ExpVal;
    let val6: ExpVal;
    let val7: ExpVal;
    let val8: ExpVal;
    let val9: ExpVal;

    let resVal = new ExpVal();
    let Exp_params: ExpVal[];
    let addResult: boolean = true;
    let nArgs: number;
    let specialAnsiExpression: boolean = ClientManager.Instance.getEnvironment().getSpecialAnsiExpression();

    // temporary values:
    let ofs: number, len: number, LenMax: number, j: number = 0;
    let pic: PIC;

    // this part puts the number of arguments in the TOP of the stack
    // 4 variable argument list functions ONLY
    // don't forget pop this argument in the start of the cases of variable argument list functions
    let expDesc: ExpDesc = ExpressionDict.expDesc[opCode];

    // for function with NOT constant number of arguments ONLY
    // don't use this block for another cases, because the try-catch part insert unusable values to the expression queue
    if (ExpressionEvaluator.isVarArgList(expDesc)) {
      nArgs = expStrTracker.get1ByteNumber();

      for (j = 0; j < nArgs; j++) {
        try {
          this.execExpression(expStrTracker, valStack, StorageAttribute.NONE);
        }
        catch (exception) {
          if (exception instanceof Exception) {
            // getOutLoop
            break;
          }
          else throw exception;
        }
      }
      if (ExpressionEvaluator.isVarArgList(expDesc) && j === nArgs) // the for_loop finished without exception
      {
        let temp_object: Object = nArgs;
        valStack.push(temp_object);
      }
      else
        Logger.Instance.WriteExceptionToLogWithMsg("ExpressionEvaluator.execOperation() there is problem with arguments of " +
          opCode + "(see ExpressionDict for name)");
    }

    switch (opCode) {
      case ExpressionInterface.EXP_OP_ADD:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        resVal.MgNumVal = NUM_TYPE.add(val1.MgNumVal, val2.MgNumVal);
        resVal.Attr = StorageAttribute.NUMERIC;
        resVal.IsNull = (resVal.MgNumVal == null);
        break;

      case ExpressionInterface.EXP_OP_SUB:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        resVal.MgNumVal = NUM_TYPE.sub(val1.MgNumVal, val2.MgNumVal);
        resVal.Attr = StorageAttribute.NUMERIC;
        resVal.IsNull = (resVal.MgNumVal == null);
        break;

      case ExpressionInterface.EXP_OP_MUL:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        resVal.MgNumVal = NUM_TYPE.mul(val1.MgNumVal, val2.MgNumVal);
        resVal.Attr = StorageAttribute.NUMERIC;
        resVal.IsNull = (resVal.MgNumVal == null);
        break;

      case ExpressionInterface.EXP_OP_DIV:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        resVal.MgNumVal = NUM_TYPE.div(val1.MgNumVal, val2.MgNumVal);
        resVal.Attr = StorageAttribute.NUMERIC;
        resVal.IsNull = (resVal.MgNumVal == null);
        break;

      case ExpressionInterface.EXP_OP_MOD:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        resVal.MgNumVal = NUM_TYPE.mod(val1.MgNumVal, val2.MgNumVal);
        resVal.Attr = StorageAttribute.NUMERIC;
        resVal.IsNull = (resVal.MgNumVal == null);
        break;

      case ExpressionInterface.EXP_OP_NEG:
        val1 = <ExpVal>valStack.pop();
        resVal.Attr = StorageAttribute.NUMERIC;
        if (val1.MgNumVal == null) {
          super.SetNULL(resVal, StorageAttribute.NUMERIC);
          break;
        }

        val1.MgNumVal.num_neg();
        resVal.MgNumVal = new NUM_TYPE(val1.MgNumVal);
        break;

      case ExpressionInterface.EXP_OP_FIX:
        let whole: number;
        let dec: number;
        val3 = <ExpVal>valStack.pop(); // dec
        val2 = <ExpVal>valStack.pop(); // whole
        val1 = <ExpVal>valStack.pop();
        resVal.Attr = StorageAttribute.NUMERIC;
        if (val1.MgNumVal == null || val2.MgNumVal == null || val3.MgNumVal == null) {
          super.SetNULL(resVal, StorageAttribute.NUMERIC);
          break;
        }

        resVal.MgNumVal = new NUM_TYPE(val1.MgNumVal);
        whole = val2.MgNumVal.NUM_2_LONG();
        resVal.MgNumVal.num_fix(whole);
        dec = val3.MgNumVal.NUM_2_LONG();
        resVal.MgNumVal.num_trunc(dec);
        break;

      case ExpressionInterface.EXP_OP_ROUND:
        // int whole, dec;         needn't this variables, them defined in EXP_OP_FIX
        val3 = <ExpVal>valStack.pop(); // dec
        val2 = <ExpVal>valStack.pop(); // whole
        val1 = <ExpVal>valStack.pop();
        resVal.Attr = StorageAttribute.NUMERIC;
        if (val1.MgNumVal == null || val2.MgNumVal == null || val3.MgNumVal == null) {
          super.SetNULL(resVal, StorageAttribute.NUMERIC);
          break;
        }

        resVal.MgNumVal = new NUM_TYPE(val1.MgNumVal);
        whole = val2.MgNumVal.NUM_2_LONG();
        resVal.MgNumVal.num_fix(whole);
        dec = val3.MgNumVal.NUM_2_LONG();
        resVal.MgNumVal.round(dec);

        break;

      case ExpressionInterface.EXP_OP_EQ:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        resVal.Attr = StorageAttribute.BOOLEAN;
        try {
          resVal.BoolVal = (ExpressionEvaluator.val_cmp_any(val1, val2, false) === 0);
        }
        catch (nullValueException) {
          if (nullValueException instanceof NullValueException) {
            resVal.BoolVal = false;
          }
          else throw nullValueException;
        }
        expStrTracker.resetNullResult();
        break;

      case ExpressionInterface.EXP_OP_NE:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        resVal.Attr = StorageAttribute.BOOLEAN;
        try {
          resVal.BoolVal = (ExpressionEvaluator.val_cmp_any(val1, val2, false) !== 0);
        }
        catch (nullValueException) {
          if (nullValueException instanceof NullValueException) {
            super.SetNULL(resVal, StorageAttribute.BOOLEAN);
          }
          else throw nullValueException;
        }
        break;

      case ExpressionInterface.EXP_OP_LE:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        resVal.Attr = StorageAttribute.BOOLEAN;
        try {
          resVal.BoolVal = (ExpressionEvaluator.val_cmp_any(val1, val2, true) <= 0);
        }
        catch (nullValueException) {
          if (nullValueException instanceof NullValueException) {
            super.SetNULL(resVal, StorageAttribute.BOOLEAN);
          }
          else throw nullValueException;
        }
        break;

      case ExpressionInterface.EXP_OP_LT:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        resVal.Attr = StorageAttribute.BOOLEAN;
        try {
          resVal.BoolVal = (ExpressionEvaluator.val_cmp_any(val1, val2, true) < 0);
        }
        catch (nullValueException) {
          if (nullValueException instanceof NullValueException) {
            super.SetNULL(resVal, StorageAttribute.BOOLEAN);
          }
          else throw nullValueException;
        }
        break;

      case ExpressionInterface.EXP_OP_GE:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        resVal.Attr = StorageAttribute.BOOLEAN;
        try {
          resVal.BoolVal = (ExpressionEvaluator.val_cmp_any(val1, val2, true) >= 0);
        }
        catch (nullValueException) {
          if (nullValueException instanceof NullValueException) {
            super.SetNULL(resVal, StorageAttribute.BOOLEAN);
          }
          else throw nullValueException;
        }
        break;

      case ExpressionInterface.EXP_OP_GT:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        resVal.Attr = StorageAttribute.BOOLEAN;
        try {
          resVal.BoolVal = (ExpressionEvaluator.val_cmp_any(val1, val2, true) > 0);
        }
        catch (nullValueException) {
          if (nullValueException instanceof NullValueException) {
            super.SetNULL(resVal, StorageAttribute.BOOLEAN);
          }
          else throw nullValueException;
        }
        break;

      case ExpressionInterface.EXP_OP_NOT:
        resVal = <ExpVal>valStack.pop();
        resVal.BoolVal = !resVal.BoolVal;
        break;

      case ExpressionInterface.EXP_OP_OR:
        resVal = <ExpVal>valStack.pop();
        let dynOper = new DynamicOperation();
        dynOper.argCount_ = 1;

        if (resVal.BoolVal) {
          dynOper.opCode_ = ExpressionInterface.EXP_OP_IGNORE;
          dynOper.argCount_ = 1;
          addedOpers.push(dynOper);
        }
        else {
          dynOper.opCode_ = ExpressionInterface.EXP_OP_EVALX;
          dynOper.argCount_ = 0;
          addedOpers.push(dynOper);
          addResult = false;
        }
        break;

      case ExpressionInterface.EXP_OP_AND:
        resVal = <ExpVal>valStack.pop();
        dynOper = new DynamicOperation();
        if (!resVal.BoolVal) {
          dynOper.opCode_ = ExpressionInterface.EXP_OP_IGNORE;
          dynOper.argCount_ = 1;
          addedOpers.push(dynOper);
        }
        else {
          dynOper.opCode_ = ExpressionInterface.EXP_OP_EVALX;
          dynOper.argCount_ = 0;
          addedOpers.push(dynOper);
          addResult = false;
        }
        break;

      case ExpressionInterface.EXP_OP_IF:
        val1 = <ExpVal>valStack.pop();
        if (val1.BoolVal) {
          dynOper = new DynamicOperation();
          dynOper.opCode_ = ExpressionInterface.EXP_OP_EVALX;
          dynOper.argCount_ = 0;

          addedOpers.push(dynOper);
          dynOper = new DynamicOperation();
          {
            dynOper.opCode_ = ExpressionInterface.EXP_OP_IGNORE;
            dynOper.argCount_ = 1;
          }

          addedOpers.push(dynOper);
        }
        else {
          dynOper = new DynamicOperation();
          {
            dynOper.opCode_ = ExpressionInterface.EXP_OP_IGNORE;
            dynOper.argCount_ = 1;
          }

          addedOpers.push(dynOper);
          dynOper = new DynamicOperation();
          {
            dynOper.opCode_ = ExpressionInterface.EXP_OP_EVALX;
            dynOper.argCount_ = 0;
          }

          addedOpers.push(dynOper);
        }
        addResult = false;
        expStrTracker.resetNullResult();
        break;

      case ExpressionInterface.EXP_OP_LEN:
        val1 = <ExpVal>valStack.pop();

        resVal.Attr = StorageAttribute.NUMERIC;
        if (val1.StrVal == null) {
          super.SetNULL(resVal, StorageAttribute.NUMERIC);
          break;
        }
        resVal.MgNumVal = new NUM_TYPE();
        // count the number of bytes, not characters (JPN: DBCS support)
        if (specialAnsiExpression || val1.Attr !== StorageAttribute.UNICODE)
          resVal.MgNumVal.NUM_4_LONG(UtilStrByteMode.lenB(val1.StrVal));
        else
          resVal.MgNumVal.NUM_4_LONG(val1.StrVal.length);

        break;

      case ExpressionInterface.EXP_OP_CON:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        resVal.Attr = StorageAttribute.UNICODE;
        if (val1.Attr === StorageAttribute.UNICODE && val1.StrVal == null ||
          val2.Attr === StorageAttribute.UNICODE && val2.StrVal == null)
          super.SetNULL(resVal, StorageAttribute.UNICODE);
        else
          resVal.StrVal = (!NString.IsNullOrEmpty(val1.StrVal) ? val1.StrVal : "") + (!NString.IsNullOrEmpty(val2.StrVal) ? val2.StrVal : "" );
        break;

      case ExpressionInterface.EXP_OP_MID:
        val3 = <ExpVal>valStack.pop(); // length
        val2 = <ExpVal>valStack.pop(); // start, ofset
        val1 = <ExpVal>valStack.pop(); // string

        resVal.Attr = val1.Attr;
        if (val2.MgNumVal == null || val3.MgNumVal == null || val1.StrVal == null) {
          super.SetNULL(resVal, resVal.Attr);
          break;
        }

        /* Compute offset and length of substring */
        ofs = val2.MgNumVal.NUM_2_LONG();
        ofs = (ofs > 1
          ? ofs - 1
          : 0); // in MID magic function start=0 && start=1 the same
        len = val3.MgNumVal.NUM_2_LONG();

        if (specialAnsiExpression || val1.Attr !== StorageAttribute.UNICODE) {
          resVal.Attr = StorageAttribute.ALPHA;
          resVal.StrVal = UtilStrByteMode.midB(val1.StrVal, ofs, len);
        }
        else {
          LenMax = val1.StrVal.length - ofs;
          if (LenMax < len)
            len = LenMax;
          if (len < 0)
            len = 0;
          resVal.StrVal = val1.StrVal.substr(ofs, len); // code from try block
        }

        if (resVal.StrVal == null)
          resVal.StrVal = "";

        break;

      case ExpressionInterface.EXP_OP_LEFT:
        val2 = <ExpVal>valStack.pop(); // length
        val1 = <ExpVal>valStack.pop(); // string

        resVal.Attr = val1.Attr;
        if (val2.MgNumVal == null || val1.StrVal == null) {
          super.SetNULL(resVal, val1.Attr);
          break;
        }
        len = val2.MgNumVal.NUM_2_LONG();

        // count the number of bytes, not characters (JPN: DBCS support)
        if (specialAnsiExpression || val1.Attr !== StorageAttribute.UNICODE) {
          resVal.Attr = StorageAttribute.ALPHA;
          resVal.StrVal = UtilStrByteMode.leftB(val1.StrVal, len);
          if (resVal.StrVal == null)
            resVal.StrVal = "";
        }
        else {
          if (len > val1.StrVal.length)
            len = val1.StrVal.length;
          if (len < 0)
            len = 0;
          resVal.StrVal = val1.StrVal.substr(0, len);
        }
        break;

      case ExpressionInterface.EXP_OP_RIGHT:
        val2 = <ExpVal>valStack.pop(); // length
        val1 = <ExpVal>valStack.pop(); // string

        resVal.Attr = val1.Attr;
        if (val2.MgNumVal == null || val1.StrVal == null) {
          super.SetNULL(resVal, val1.Attr);
          break;
        }
        len = val2.MgNumVal.NUM_2_LONG();

        // count the number of bytes, not characters (JPN: DBCS support)
        if (specialAnsiExpression || val1.Attr !== StorageAttribute.UNICODE) {
          resVal.Attr = StorageAttribute.ALPHA;
          resVal.StrVal = UtilStrByteMode.rightB(val1.StrVal, len);
          if (resVal.StrVal == null)
            resVal.StrVal = "";
        }
        else {
          if (len > val1.StrVal.length)
            len = val1.StrVal.length;
          if (len < 0)
            len = 0;
          ofs = val1.StrVal.length - len;

          // memcpy (EXP_parms[0].ads, EXP_parms[0].ads + ofs, len);
          resVal.StrVal = val1.StrVal.substr(ofs);
        }
        break;

      case ExpressionInterface.EXP_OP_FILL:
        val2 = <ExpVal>valStack.pop(); // times
        val1 = <ExpVal>valStack.pop(); // string

        resVal.Attr = StorageAttribute.UNICODE;
        if (val2.MgNumVal == null || val1.StrVal == null) {
          super.SetNULL(resVal, StorageAttribute.UNICODE);
          break;
        }

        len = val1.StrVal.length;
        j = val2.MgNumVal.NUM_2_LONG();
        if (j < 0)
          j = 0;
        LenMax = len * j;
        if (LenMax > 0x7FFF)
        // there is MAX lenght in Magic (actually it needn't in Java, but ...)
          LenMax = Math.floor(0x7FFF / len) * len;
        if (LenMax > 0) {
          if (len <= 0)
            resVal.StrVal = "";
          else if (LenMax === 1)
            resVal.StrVal = val1.StrVal;
          else {
            let tmpBuffer = new StringBuilder(LenMax);
            for (; LenMax > 0; LenMax -= len)
              tmpBuffer.Append(val1.StrVal);
            resVal.StrVal = tmpBuffer.ToString();
          }
        }
        if (resVal.StrVal == null)
          resVal.StrVal = "";
        break;

      case ExpressionInterface.EXP_OP_INSTR:
        val2 = <ExpVal>valStack.pop(); // subStr
        val1 = <ExpVal>valStack.pop(); // string

        ofs = 0;
        resVal.Attr = StorageAttribute.NUMERIC;
        if (val1.StrVal == null || val2.StrVal == null) {
          super.SetNULL(resVal, StorageAttribute.NUMERIC);
          break;
        }

        resVal.MgNumVal = new NUM_TYPE();
        // count the number of bytes, not characters (JPN: DBCS support)
        if (specialAnsiExpression ||
          !(val1.Attr === StorageAttribute.UNICODE ||
          val2.Attr === StorageAttribute.UNICODE)) {
          ofs = UtilStrByteMode.instrB(val1.StrVal, val2.StrVal);
        }
        else {
          if (val2.StrVal.length === 0)
          // nothing 2 look for
          {
            resVal.MgNumVal.NUM_4_LONG(ofs);
            break;
          }
          ofs = val1.StrVal.indexOf(val2.StrVal);
          if (ofs < 0)
          // string in magic starts from 1, in java from 0.
            ofs = 0;
          else
            ofs++;
        }

        resVal.MgNumVal.NUM_4_LONG(ofs);
        break;

      case ExpressionInterface.EXP_OP_TRIM:
      case ExpressionInterface.EXP_OP_LTRIM:
      case ExpressionInterface.EXP_OP_RTRIM:
        val1 = <ExpVal>valStack.pop(); // string
        resVal.Attr = val1.Attr === StorageAttribute.ALPHA
          ? StorageAttribute.ALPHA
          : StorageAttribute.UNICODE;
        if (val1.StrVal == null) {
          super.SetNULL(resVal, resVal.Attr);
          break;
        }

        switch (opCode) {
          case ExpressionInterface.EXP_OP_TRIM:
            val1.StrVal = ExpressionEvaluator.trimStr(val1.StrVal, 'B');
            break;

          case ExpressionInterface.EXP_OP_LTRIM:
            val1.StrVal = ExpressionEvaluator.trimStr(val1.StrVal, 'L');
            break;

          case ExpressionInterface.EXP_OP_RTRIM:
            val1.StrVal = ExpressionEvaluator.trimStr(val1.StrVal, 'R');
            break;
        }
        resVal.StrVal = val1.StrVal;
        break;

      case ExpressionInterface.EXP_OP_STR:
        val2 = <ExpVal>valStack.pop(); // picture format
        val1 = <ExpVal>valStack.pop(); // Num invert to string
        resVal.Attr = StorageAttribute.UNICODE;
        if (val2.StrVal == null || val1.MgNumVal == null) {
          super.SetNULL(resVal, StorageAttribute.UNICODE);
          break;
        }

        // Max length of the picture is 100 characters, like in Magic
        pic = new PIC(ExpressionEvaluator.set_a_pic(val2.StrVal), StorageAttribute.NUMERIC, (<Task>this.ExpTask).getCompIdx());
        resVal.StrVal = val1.MgNumVal.to_a(pic);
        break;

      case ExpressionInterface.EXP_OP_VAL:
        val2 = <ExpVal>valStack.pop(); // picture format
        val1 = <ExpVal>valStack.pop(); // string invert to Num
        resVal.Attr = StorageAttribute.NUMERIC;
        if (val2.StrVal == null || val1.StrVal == null) {
          super.SetNULL(resVal, StorageAttribute.NUMERIC);
          break;
        }
        pic = new PIC(ExpressionEvaluator.set_a_pic(val2.StrVal), StorageAttribute.NUMERIC, (<Task>this.ExpTask).getCompIdx());
        resVal.MgNumVal = new NUM_TYPE(val1.StrVal, pic, (<Task>this.ExpTask).getCompIdx());
        break;

      case ExpressionInterface.EXP_OP_M:
        len = expStrTracker.get2ByteNumber();
        let codes: string = expStrTracker.getString(len, true, false);
        this.eval_op_m(resVal, codes);
        break;

      case ExpressionInterface.EXP_OP_K:
        resVal.Attr = StorageAttribute.NUMERIC;
        len = expStrTracker.get2ByteNumber();
        resVal.MgNumVal = expStrTracker.getMagicNumber(len, true);
        break;

      case ExpressionInterface.EXP_OP_F:
      case ExpressionInterface.EXP_OP_P:
        resVal.Attr = StorageAttribute.NUMERIC;
        len = expStrTracker.get2ByteNumber();
        resVal.MgNumVal = expStrTracker.getMagicNumber(len, true);
        // skip second number (the component idx)
        len = expStrTracker.get2ByteNumber();
        expStrTracker.getMagicNumber(len, true);
        break;

      case ExpressionInterface.EXP_OP_STAT:
        val2 = <ExpVal>valStack.pop(); // Modes
        val1 = <ExpVal>valStack.pop(); // Generation
        this.eval_op_stat(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_SUBFORM_EXEC_MODE:
        val1 = <ExpVal>valStack.pop(); // Generation
        this.eval_op_subformExecMode(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_SYS:
        this.eval_op_appname(resVal);
        break;

      case ExpressionInterface.EXP_OP_PROG:
        this.eval_op_prog(resVal);
        break;

      case ExpressionInterface.EXP_OP_LEVEL:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_level(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_COUNTER:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_counter(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_EMPTY_DATA_VIEW:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_emptyDataview(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_MAINLEVEL:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_mainlevel(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_MAINDISPLAY:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_maindisplay(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_ISFIRSTRECORDCYCLE:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_IsFirstRecordCycle(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_DATE:
      case ExpressionInterface.EXP_OP_UTCDATE:
        resVal.MgNumVal = new NUM_TYPE();
        resVal.MgNumVal.NUM_4_LONG(DisplayConvertor.Instance.date_magic(opCode === ExpressionInterface.EXP_OP_UTCDATE));
        resVal.Attr = StorageAttribute.DATE; // DATE
        break;

      case ExpressionInterface.EXP_OP_ADDDT:
        val8 = <ExpVal>valStack.pop();
        val7 = <ExpVal>valStack.pop();
        val6 = <ExpVal>valStack.pop(); // hours
        val5 = <ExpVal>valStack.pop(); // days
        val4 = <ExpVal>valStack.pop(); // months
        val3 = <ExpVal>valStack.pop(); // years
        val2 = <ExpVal>valStack.pop(); // Time
        val1 = <ExpVal>valStack.pop(); // Date
        this.eval_op_addDateTime(resVal, val1, val2, val3, val4, val5, val6, val7, val8);
        break;

      case ExpressionInterface.EXP_OP_DIFDT:
        val6 = <ExpVal>valStack.pop(); // time diff
        val5 = <ExpVal>valStack.pop(); // date diff
        val4 = <ExpVal>valStack.pop(); // time 2
        val3 = <ExpVal>valStack.pop(); // date 2
        val2 = <ExpVal>valStack.pop(); // Time 1
        val1 = <ExpVal>valStack.pop(); // Date 1
        this.eval_op_difdt(resVal, val1, val2, val3, val4, val5, val6);
        break;

      case ExpressionInterface.EXP_OP_VARPREV:
        val1 = <ExpVal>valStack.pop();
        // exp_itm_2_vee ();
        this.exp_get_var(resVal, val1, true);
        break;

      case ExpressionInterface.EXP_OP_VARCURR:
        val1 = <ExpVal>valStack.pop();
        this.exp_get_var(resVal, val1, false);
        break;

      case ExpressionInterface.EXP_OP_VARMOD:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_varmod(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_VARINP:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_varinp(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_VARNAME:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_varname(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_VARDISPLAYNAME:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_VarDisplayName(resVal, val1);
        expStrTracker.resetNullResult();
        break;

      case ExpressionInterface.EXP_OP_VARCONTROLID:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_VarControlID(resVal, val1);
        expStrTracker.resetNullResult();
        break;

      case ExpressionInterface.EXP_OP_CONTROLITEMSLIST:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_ControlItemsList(resVal, val1);
        expStrTracker.resetNullResult();
        break;

      case ExpressionInterface.EXP_OP_CONTROLDISPLAYLIST:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_ControlDisplayList(resVal, val1);
        expStrTracker.resetNullResult();
        break;

      case ExpressionInterface.EXP_OP_VIEWMOD:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_viewmod(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_TIME:
      case ExpressionInterface.EXP_OP_UTCTIME:
        resVal.MgNumVal = new NUM_TYPE();
        resVal.MgNumVal.NUM_4_LONG(DisplayConvertor.Instance.time_magic(opCode === ExpressionInterface.EXP_OP_UTCTIME));
        resVal.Attr = StorageAttribute.TIME; // TIME
        break;

      case ExpressionInterface.EXP_OP_MTIME:
      case ExpressionInterface.EXP_OP_UTCMTIME:
        resVal.MgNumVal = new NUM_TYPE();
        resVal.MgNumVal.NUM_4_LONG(DisplayConvertor.Instance.mtime_magic(opCode === ExpressionInterface.EXP_OP_UTCMTIME));
        resVal.Attr = StorageAttribute.TIME; // TIME
        break;

      case ExpressionInterface.EXP_OP_PWR:
        val2 = <ExpVal>valStack.pop(); // power
        val1 = <ExpVal>valStack.pop(); // number
        resVal.MgNumVal = new NUM_TYPE();
        resVal.MgNumVal = NUM_TYPE.eval_op_pwr(val1.MgNumVal, val2.MgNumVal);
        resVal.IsNull = (resVal.MgNumVal == null);
        resVal.Attr = StorageAttribute.NUMERIC;
        break;

      case ExpressionInterface.EXP_OP_LOG:
        val1 = <ExpVal>valStack.pop();
        resVal.MgNumVal = NUM_TYPE.eval_op_log(val1.MgNumVal);
        resVal.IsNull = (resVal.MgNumVal == null);
        resVal.Attr = StorageAttribute.NUMERIC;
        break;

      case ExpressionInterface.EXP_OP_EXP:
        val1 = <ExpVal>valStack.pop();
        resVal.MgNumVal = NUM_TYPE.eval_op_exp(val1.MgNumVal);
        resVal.IsNull = (resVal.MgNumVal == null);
        resVal.Attr = StorageAttribute.NUMERIC;
        break;

      case ExpressionInterface.EXP_OP_ABS:
        val1 = <ExpVal>valStack.pop();
        resVal.MgNumVal = NUM_TYPE.eval_op_abs(val1.MgNumVal);
        resVal.IsNull = (resVal.MgNumVal == null);
        resVal.Attr = StorageAttribute.NUMERIC;
        break;

      case ExpressionInterface.EXP_OP_SIN:
        val1 = <ExpVal>valStack.pop();
        resVal.MgNumVal = NUM_TYPE.eval_op_sin(val1.MgNumVal);
        resVal.IsNull = (resVal.MgNumVal == null);
        resVal.Attr = StorageAttribute.NUMERIC;
        break;

      case ExpressionInterface.EXP_OP_COS:
        val1 = <ExpVal>valStack.pop();
        resVal.MgNumVal = NUM_TYPE.eval_op_cos(val1.MgNumVal);
        resVal.IsNull = (resVal.MgNumVal == null);
        resVal.Attr = StorageAttribute.NUMERIC;

        break;

      case ExpressionInterface.EXP_OP_TAN:
        val1 = <ExpVal>valStack.pop();
        resVal.MgNumVal = NUM_TYPE.eval_op_tan(val1.MgNumVal);
        resVal.IsNull = (resVal.MgNumVal == null);
        resVal.Attr = StorageAttribute.NUMERIC;
        break;

      case ExpressionInterface.EXP_OP_ASIN:
        val1 = <ExpVal>valStack.pop();
        resVal.MgNumVal = NUM_TYPE.eval_op_asin(val1.MgNumVal);
        resVal.IsNull = (resVal.MgNumVal == null);
        resVal.Attr = StorageAttribute.NUMERIC;
        break;

      case ExpressionInterface.EXP_OP_ACOS:
        val1 = <ExpVal>valStack.pop();
        resVal.MgNumVal = NUM_TYPE.eval_op_acos(val1.MgNumVal);
        resVal.IsNull = (resVal.MgNumVal == null);
        resVal.Attr = StorageAttribute.NUMERIC;
        break;

      case ExpressionInterface.EXP_OP_ATAN:
        val1 = <ExpVal>valStack.pop();
        resVal.MgNumVal = NUM_TYPE.eval_op_atan(val1.MgNumVal);
        resVal.IsNull = (resVal.MgNumVal == null);
        resVal.Attr = StorageAttribute.NUMERIC;
        break;

      case ExpressionInterface.EXP_OP_RAND:
        val1 = <ExpVal>valStack.pop();
        resVal.MgNumVal = NUM_TYPE.eval_op_rand(val1.MgNumVal);
        resVal.IsNull = (resVal.MgNumVal == null);
        resVal.Attr = StorageAttribute.NUMERIC;
        break;

      case ExpressionInterface.EXP_OP_MIN:
      case ExpressionInterface.EXP_OP_MAX:
        nArgs = valStack.pop();
        this.val_cpy(<ExpVal>valStack.pop(), resVal);
        try {
          for (j = 1; j < nArgs; j++) {
            val1 = <ExpVal>valStack.pop();
            if (opCode === ExpressionInterface.EXP_OP_MIN) {
              if (ExpressionEvaluator.val_cmp_any(val1, resVal, true) < 0)
                this.val_cpy(val1, resVal);
            }
            // EXP_OP_MAX
            else {
              if (ExpressionEvaluator.val_cmp_any(val1, resVal, true) > 0)
                this.val_cpy(val1, resVal);
            }
          }
        }
        catch (oneOfValuesIsNull) {
          if (oneOfValuesIsNull instanceof NullValueException) {
            for (; valStack.count() > 0 && j < nArgs; j++)
              // clean queue
              valStack.pop();
            resVal.IsNull = true;
            resVal.Attr = oneOfValuesIsNull.getAttr();
          }
          else throw oneOfValuesIsNull;
        }
        break;

      case ExpressionInterface.EXP_OP_RANGE:
        val3 = <ExpVal>valStack.pop(); // upper: A value that represents the upper limit of the range.
        val2 = <ExpVal>valStack.pop(); // lower: A value that represents the lower limit of the range.
        val1 = <ExpVal>valStack.pop(); // value: The value checked.
        this.eval_op_range(val1, val2, val3, resVal);
        break;

      case ExpressionInterface.EXP_OP_REP:
        val4 = <ExpVal>valStack.pop();
        // len_origin: The number of characters that will be moved from origin to target, starting from the leftmost character of origin.
        val3 = <ExpVal>valStack.pop();
        // pos_target: The first position in the target string that will receive the substring from origin.
        val2 = <ExpVal>valStack.pop();
        // origin: The alpha string or expression that provides the substring to be copied to target.
        val1 = <ExpVal>valStack.pop();
        // target: The target alpha string or expression where the replacement will take place.

        // count the number of bytes, not characters (JPN: DBCS support)
        if (specialAnsiExpression ||
          !(val1.Attr === StorageAttribute.UNICODE ||
          val2.Attr === StorageAttribute.UNICODE)) {
          resVal.Attr = StorageAttribute.ALPHA;
          resVal.StrVal = UtilStrByteMode.repB(val1.StrVal, val2.StrVal, val3.MgNumVal.NUM_2_LONG(),
            val4.MgNumVal.NUM_2_LONG());
        }
        else {
          this.eval_op_rep_1(resVal, val1, val2, val3, val4);
        }

        break;

      case ExpressionInterface.EXP_OP_INS:
        val4 = <ExpVal>valStack.pop();
        // length: A number that represents the number of characters from source that will be inserted into target.
        val3 = <ExpVal>valStack.pop(); // position: A number that represents the starting position in target.
        val2 = <ExpVal>valStack.pop(); // source: An alpha string that represents the source string.
        val1 = <ExpVal>valStack.pop(); // target: An alpha string that represents the target string

        // count the number of bytes, not characters (JPN: DBCS support)
        if (specialAnsiExpression ||
          !(val1.Attr === StorageAttribute.UNICODE ||
          val2.Attr === StorageAttribute.UNICODE)) {
          resVal.Attr = StorageAttribute.ALPHA;
          resVal.StrVal = UtilStrByteMode.insB(val1.StrVal, val2.StrVal, val3.MgNumVal.NUM_2_LONG(),
            val4.MgNumVal.NUM_2_LONG());
        }
        else {
          this.eval_op_ins(resVal, val1, val2, val3, val4);
        }

        break;

      case ExpressionInterface.EXP_OP_DEL:
        val3 = <ExpVal>valStack.pop();
        // length: The number of characters to be deleted, beginning with position start and proceeding rightward.
        val2 = <ExpVal>valStack.pop(); // start : The position of the first character to be deleted.
        val1 = <ExpVal>valStack.pop(); // string: An alpha string or an alpha string expression.

        // count the number of bytes, not characters (JPN: DBCS support)
        if (specialAnsiExpression || val1.Attr !== StorageAttribute.UNICODE) {
          resVal.Attr = StorageAttribute.ALPHA;
          resVal.StrVal = UtilStrByteMode.delB(val1.StrVal, val2.MgNumVal.NUM_2_LONG(),
            val3.MgNumVal.NUM_2_LONG());
        }
        else {
          this.eval_op_del(resVal, val1, val2, val3);
        }

        break;

      case ExpressionInterface.EXP_OP_FLIP:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_flip(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_UPPER:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_upper(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_LOWER:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_lower(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_CRC:
        val2 = <ExpVal>valStack.pop();
        // numeric: A number that represents the CRC algorithm. In this version of Magic use 0 to apply CRC-16.
        val1 = <ExpVal>valStack.pop(); // string : An alpha string to which the CRC is applied.
        this.eval_op_crc(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_CHKDGT:
        val2 = <ExpVal>valStack.pop(); // 0 or 1 (number) for Modulus 10 or Modulus 11, respectively.
        val1 = <ExpVal>valStack.pop();
        // An alpha string that represents the number for which the check digit will be calculated
        this.eval_op_chkdgt(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_SOUNDX:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_soundx(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_HSTR:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_hstr(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_HVAL:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_hval(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_CHR:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_chr(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_ASC:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_asc(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_MSTR:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        this.eval_op_mstr(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_MVAL:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_mval(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_DSTR:
        val2 = <ExpVal>valStack.pop(); // picture string
        val1 = <ExpVal>valStack.pop(); // date string it's LOGICAL ??????
        this.eval_op_dstr(resVal, val1, val2, DisplayConvertor.Instance);
        break;

      case ExpressionInterface.EXP_OP_DVAL:
        val2 = <ExpVal>valStack.pop(); // picture  format of date string output
        val1 = <ExpVal>valStack.pop(); // date string
        this.eval_op_dval(resVal, val1, val2, DisplayConvertor.Instance);
        break;

      case ExpressionInterface.EXP_OP_TSTR:
        val2 = <ExpVal>valStack.pop(); // picture format of time string output
        val1 = <ExpVal>valStack.pop(); // time string
        this.eval_op_tstr(resVal, val1, val2, DisplayConvertor.Instance, false);
        break;

      case ExpressionInterface.EXP_OP_MTSTR:
        val2 = <ExpVal>valStack.pop(); // picture format of time string output
        val1 = <ExpVal>valStack.pop(); // time string
        this.eval_op_tstr(resVal, val1, val2, DisplayConvertor.Instance, true);
        break;

      case ExpressionInterface.EXP_OP_TVAL:
        val2 = <ExpVal>valStack.pop(); // picture string
        val1 = <ExpVal>valStack.pop(); // time string
        this.eval_op_tval(resVal, val1, val2, DisplayConvertor.Instance, false);
        break;

      case ExpressionInterface.EXP_OP_MTVAL:
        val2 = <ExpVal>valStack.pop(); // picture string
        val1 = <ExpVal>valStack.pop(); // time string
        this.eval_op_tval(resVal, val1, val2, DisplayConvertor.Instance, true);
        break;

      case ExpressionInterface.EXP_OP_DAY:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_day(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_MONTH:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_month(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_YEAR:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_year(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_DOW:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_dow(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_CDOW:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_cdow(resVal, val1.MgNumVal, DisplayConvertor.Instance);
        break;

      case ExpressionInterface.EXP_OP_CMONTH:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_cmonth(resVal, val1.MgNumVal, DisplayConvertor.Instance);
        break;

      case ExpressionInterface.EXP_OP_NDOW:
        val1 = <ExpVal>valStack.pop(); // number or day of week
        this.eval_op_ndow(resVal, val1, DisplayConvertor.Instance);
        break;

      case ExpressionInterface.EXP_OP_NMONTH:
        val1 = <ExpVal>valStack.pop(); // number or month of year
        this.eval_op_nmonth(resVal, val1, DisplayConvertor.Instance);
        break;

      case ExpressionInterface.EXP_OP_SECOND:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_second(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_MINUTE:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_minute(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_HOUR:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_hour(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_DELAY:
        val1 = <ExpVal>valStack.pop();
        // this function not wark, not checked
        this.eval_op_delay(val1);
        resVal.Attr = StorageAttribute.BOOLEAN;
        resVal.BoolVal = true;
        break;

      case ExpressionInterface.EXP_OP_IDLE:
        this.eval_op_idle(resVal);
        break;

      case ExpressionInterface.EXP_OP_FLOW:
        val1 = <ExpVal>valStack.pop();
        if (val1.StrVal == null) {
          super.SetNULL(resVal, StorageAttribute.BOOLEAN);
          break;
        }
        resVal.Attr = StorageAttribute.BOOLEAN;
        resVal.BoolVal = (<Task>this.ExpTask).checkFlowMode(val1.StrVal);
        break;

      case ExpressionInterface.EXP_OP_ADDDATE:
        val4 = <ExpVal>valStack.pop(); // days: The number of days to add to date. May be zero.
        val3 = <ExpVal>valStack.pop(); // months: The number of months to add to date. May be zero.
        val2 = <ExpVal>valStack.pop(); // years : The number of years to add to date. May be zero.
        val1 = <ExpVal>valStack.pop(); // date : A date.
        this.eval_op_adddate(resVal, val1, val2, val3, val4);
        break;

      case ExpressionInterface.EXP_OP_ADDTIME:
        val4 = <ExpVal>valStack.pop(); // seconds: The number of seconds to add to time.
        val3 = <ExpVal>valStack.pop(); // minutes: The number of minutes to add to time.
        val2 = <ExpVal>valStack.pop(); // hours : The number of hours to add to time
        val1 = <ExpVal>valStack.pop(); // time : A time value.
        this.eval_op_addtime(resVal, val1, val2, val3, val4);
        break;

      case ExpressionInterface.EXP_OP_OWNER:
        resVal.Attr = StorageAttribute.ALPHA;
        resVal.StrVal = ClientManager.Instance.getEnvironment().getOwner();
        break;

      case ExpressionInterface.EXP_OP_VARATTR:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_varattr(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_VARPIC:
        val2 = (<ExpVal>valStack.pop());
        val1 = <ExpVal>valStack.pop();
        // to add this method
        this.eval_op_varpic(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_DBROUND:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        // to add this method
        this.eval_op_dbround(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_NULL:
      case ExpressionInterface.EXP_OP_NULL_A:
      case ExpressionInterface.EXP_OP_NULL_N:
      case ExpressionInterface.EXP_OP_NULL_B:
      case ExpressionInterface.EXP_OP_NULL_D:
      case ExpressionInterface.EXP_OP_NULL_T:
      case ExpressionInterface.EXP_OP_NULL_U:
      case ExpressionInterface.EXP_OP_NULL_O:
        this.exp_null_val_get(expectedType, opCode, resVal);
        break;

      case ExpressionInterface.EXP_OP_ISNULL:
        val1 = <ExpVal>valStack.pop();
        resVal.BoolVal = val1.IsNull;

        // identify a situation where a value was un-nullified due to "null arithmetic"
        // and still, make ISNULL() return TRUE although the value is flagged as non-null
        if (!val1.IsNull && val1.OriginalNull)
          resVal.BoolVal = val1.OriginalNull;

        resVal.Attr = StorageAttribute.BOOLEAN;

        // null values accepted into the ISNULL() function do not nullify the
        // Whole expression, thus UNLESS SOMETHING ELSE nullified the expression,
        // we mark it as NON-NULL. We check if something else nullified the expression
        // by scanning the values currently on the parameters stack.
        if (expStrTracker.isNull()) {
          let myArray: List<ExpVal> = new List<ExpVal>();
          let prevNull: boolean = false;
          let i: number;
          while (!(valStack.count() === 0) && !prevNull) {
            myArray.push(<ExpVal>valStack.pop());
            if (myArray.get_Item(myArray.length - 1).IsNull)
              prevNull = true;
          }

          for (i = myArray.length - 1; i >= 0; i--)
            valStack.push(myArray.get_Item(i));

          if (!prevNull)
            expStrTracker.resetNullResult();
        }

        break;

      case ExpressionInterface.EXP_OP_BOM:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_bom(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_BOY:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_boy(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_EOM:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_eom(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_EOY:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_eoy(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_ROLLBACK:
        val2 = <ExpVal>valStack.pop(); // show message
        val1 = <ExpVal>valStack.pop(); // generation (?)
        this.eval_op_rollback(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_VARSET:
        val2 = <ExpVal>valStack.pop(); // value
        val1 = <ExpVal>valStack.pop(); // number
        this.eval_op_varset(resVal, val2, val1);
        break;

      case ExpressionInterface.EXP_OP_CLICKWX:
      case ExpressionInterface.EXP_OP_CLICKWY:
      case ExpressionInterface.EXP_OP_CLICKCX:
      case ExpressionInterface.EXP_OP_CLICKCY:
        // case EXP_OP_HIT_ZORDER:
        this.eval_op_lastclick(resVal, opCode);
        break;

      case ExpressionInterface.EXP_OP_CTRL_NAME:
        this.eval_op_ctrl_name(resVal);
        break;

      case ExpressionInterface.EXP_OP_WIN_BOX:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        this.eval_op_win_box(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_TDEPTH:
        // use the context task of the current task of expression
        let currTsk: Task = <Task>this.ExpTask.GetContextTask();
        len = currTsk.getTaskDepth(false) - 1; // start from First Task and not from main Task
        this.ConstructMagicNum(resVal, len, StorageAttribute.NUMERIC);
        break;

      case ExpressionInterface.EXP_OP_ISDEFAULT:
        val1 = <ExpVal>valStack.pop();
        this.exp_is_default(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_STRTOKEN:
        val3 = <ExpVal>valStack.pop(); // Delimiters String - alpha string containing the delimiter string.
        val2 = <ExpVal>valStack.pop(); // Token Index - requested token index (numeric).
        val1 = <ExpVal>valStack.pop(); // Source String - delimited alpha string with tokens.
        this.eval_op_strtok(resVal, val1, val2, val3);
        break;

      case ExpressionInterface.EXP_OP_STRTOK_CNT:
        val2 = <ExpVal>valStack.pop(); // the delimeters string
        val1 = <ExpVal>valStack.pop(); // the source string
        this.eval_op_strTokenCnt(val1, val2, resVal);
        break;

      case ExpressionInterface.EXP_OP_STRTOKEN_IDX:
        val3 = <ExpVal>valStack.pop(); // the delimeters string
        val2 = <ExpVal>valStack.pop(); // the token to be found
        val1 = <ExpVal>valStack.pop(); // the source string
        this.eval_op_strTokenIdx(val1, val2, val3, resVal);
        break;

      case ExpressionInterface.EXP_OP_BLOBSIZE:
        val1 = <ExpVal>valStack.pop(); // Blob
        this.eval_op_blobsize(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_CTRL_CLIENT_CX:
      case ExpressionInterface.EXP_OP_CTRL_CLIENT_CY:
      case ExpressionInterface.EXP_OP_CTRL_LEFT:
      case ExpressionInterface.EXP_OP_CTRL_TOP:
      case ExpressionInterface.EXP_OP_CTRL_WIDTH:
      case ExpressionInterface.EXP_OP_CTRL_HEIGHT:
        val2 = <ExpVal>valStack.pop(); // generation
        val1 = <ExpVal>valStack.pop(); // control name
        this.GetCtrlSize(resVal, val1, val2, opCode);
        break;

      case ExpressionInterface.EXP_OP_SETCRSR:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_setcrsr(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_LAST_CTRL_PARK:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_last_parked(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_WEB_REFERENCE:
        val1 = <ExpVal>valStack.pop();
        resVal.Attr = StorageAttribute.ALPHA;
        resVal.StrVal = "%" + val1.StrVal + "%";
        break;

      case ExpressionInterface.EXP_OP_CURRROW:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_curr_row(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_CASE:
        // the case not work with Date field, but not work in OnLine too.
        nArgs = valStack.pop();
        Exp_params = new Array(nArgs);
        for (j = 0; j < nArgs; j++)
          Exp_params[nArgs - 1 - j] = <ExpVal>valStack.pop();
        this.val_cpy(Exp_params[0], resVal); // get  case(A) -> 'A' value

        for (j = 1; j < nArgs; j += 2) {
          val1 = Exp_params[j];
          let valueMatched: boolean;
          try {
            valueMatched = (ExpressionEvaluator.val_cmp_any(val1, resVal, false) === 0);
          }
          catch (nullValueException) {
            if (nullValueException instanceof NullValueException) {
              valueMatched = false;
            }
            else
              throw nullValueException;
          }

          if (valueMatched) {
            this.val_cpy(Exp_params[j + 1], resVal); // the case found
            break;
          }
          if (j === (nArgs - 3))
          // array starts from 0 ->nArgs-1; last is diffault value ->nArgs-1;
          // looking one before diffault ->nArgs-1 =>-3
          {
            this.val_cpy(Exp_params[j + 2], resVal); // diffault argument found
            break;
          }
        } // end of for loop

        expStrTracker.resetNullResult();
        break;

      case ExpressionInterface.EXP_OP_THIS:
        this.eval_op_this(resVal);
        break;

      case ExpressionInterface.EXP_OP_LIKE:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        this.eval_op_like(val1, val2, resVal);
        break;

      case ExpressionInterface.EXP_OP_REPSTR:
        val3 = <ExpVal>valStack.pop();
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        this.eval_op_repstr(val1, val2, val3, resVal);
        break;

      case ExpressionInterface.EXP_OP_EDITGET:
        this.eval_op_editget(resVal);
        break;

      case ExpressionInterface.EXP_OP_EDITSET:
        val1 = <ExpVal>valStack.pop(); // set the edited value of the control that invoked the last handler
        this.eval_op_editset(val1, resVal);
        break;

      case ExpressionInterface.EXP_OP_VARCURRN:
        val1 = <ExpVal>valStack.pop(); // string, name of control
        this.exp_get_var(val1, resVal);
        break;

      case ExpressionInterface.EXP_OP_VARINDEX:
        val1 = <ExpVal>valStack.pop(); // string, name of control
        this.exp_get_indx(val1, resVal);
        break;

      case ExpressionInterface.EXP_OP_HAND_CTRL:
        this.eval_op_hand_ctrl_name(resVal);
        break;

      case ExpressionInterface.EXP_OP_JCDOW:
        if (this._expressionLocalJpn == null)
          super.SetNULL(resVal, StorageAttribute.ALPHA);
        else {
          val1 = <ExpVal>valStack.pop(); // date
          this._expressionLocalJpn.eval_op_jcdow(resVal, val1.MgNumVal, DisplayConvertor.Instance);
        }
        break;

      case ExpressionInterface.EXP_OP_JMONTH:
        if (this._expressionLocalJpn == null)
          super.SetNULL(resVal, StorageAttribute.ALPHA);
        else {
          val1 = <ExpVal>valStack.pop(); // number or month of year
          this._expressionLocalJpn.eval_op_jmonth(resVal, val1);
        }
        break;

      case ExpressionInterface.EXP_OP_JNDOW:
        if (this._expressionLocalJpn == null)
          super.SetNULL(resVal, StorageAttribute.ALPHA);
        else {
          val1 = <ExpVal>valStack.pop(); // number or day of week
          this._expressionLocalJpn.eval_op_jndow(resVal, val1, DisplayConvertor.Instance);
        }
        break;

      case ExpressionInterface.EXP_OP_JYEAR:
        if (this._expressionLocalJpn == null)
          super.SetNULL(resVal, StorageAttribute.ALPHA);
        else {
          val1 = <ExpVal>valStack.pop(); // date
          this._expressionLocalJpn.eval_op_jyear(resVal, val1);
        }
        break;

      case ExpressionInterface.EXP_OP_JGENGO:
        if (this._expressionLocalJpn == null)
          super.SetNULL(resVal, StorageAttribute.ALPHA);
        else {
          val2 = <ExpVal>valStack.pop(); // date
          val1 = <ExpVal>valStack.pop(); // mode
          this._expressionLocalJpn.eval_op_jgengo(resVal, val1.MgNumVal, val2.MgNumVal,
            DisplayConvertor.Instance);
        }
        break;

      case ExpressionInterface.EXP_OP_HAN:
        val1 = <ExpVal>valStack.pop(); // string
        resVal.Attr = val1.Attr;

        if (this._expressionLocalJpn == null)
          resVal.StrVal = val1.StrVal;
        else if (val1.StrVal == null)
          super.SetNULL(resVal, val1.Attr);
        else {
          resVal.StrVal = this._expressionLocalJpn.eval_op_han(val1.StrVal);
          if (resVal.StrVal == null)
            resVal.StrVal = "";
        }
        break;

      case ExpressionInterface.EXP_OP_ZEN:
        val1 = <ExpVal>valStack.pop(); // string
        resVal.Attr = val1.Attr;

        if (this._expressionLocalJpn == null)
          resVal.StrVal = val1.StrVal;
        else if (val1.StrVal == null)
          super.SetNULL(resVal, val1.Attr);
        else {
          resVal.StrVal = this._expressionLocalJpn.eval_op_zens(val1.StrVal, 0);
          if (resVal.StrVal == null)
            resVal.StrVal = "";
        }
        break;

      case ExpressionInterface.EXP_OP_ZENS:
        val2 = <ExpVal>valStack.pop(); // mode
        val1 = <ExpVal>valStack.pop(); // string
        resVal.Attr = val1.Attr;

        if (this._expressionLocalJpn == null)
          resVal.StrVal = val1.StrVal;
        else if (val2.MgNumVal == null || val1.StrVal == null)
          super.SetNULL(resVal, val1.Attr);
        else {
          resVal.StrVal = this._expressionLocalJpn.eval_op_zens(val1.StrVal, val2.MgNumVal.NUM_2_LONG());
          if (resVal.StrVal == null)
            resVal.StrVal = "";
        }
        break;

      case ExpressionInterface.EXP_OP_ZIMEREAD:
        val1 = <ExpVal>valStack.pop();
        resVal.Attr = StorageAttribute.ALPHA;
        if (this._expressionLocalJpn == null)
          resVal.StrVal = val1.StrVal;
        else {
          resVal.StrVal = this._expressionLocalJpn.eval_op_zimeread(val1.MgNumVal.NUM_2_LONG());
          if (resVal.StrVal == null)
            resVal.StrVal = "";
        }
        break;

      case ExpressionInterface.EXP_OP_ZKANA:
        val2 = <ExpVal>valStack.pop(); // mode
        val1 = <ExpVal>valStack.pop(); // string
        resVal.Attr = val1.Attr;

        if (this._expressionLocalJpn == null)
          resVal.StrVal = val1.StrVal;
        else if (val2.MgNumVal == null || val1.StrVal == null)
          super.SetNULL(resVal, val1.Attr);
        else {
          resVal.StrVal = this._expressionLocalJpn.eval_op_zkana(val1.StrVal, val2.MgNumVal.NUM_2_LONG());
          if (resVal.StrVal == null)
            resVal.StrVal = "";
        }
        break;

      case ExpressionInterface.EXP_OP_GOTO_CTRL:
        val3 = <ExpVal>valStack.pop();
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        this.eval_op_gotoCtrl(val1, val2, val3, resVal);
        break;

      case ExpressionInterface.EXP_OP_TRANSLATE:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_translate(val1, resVal);
        break;

      case ExpressionInterface.EXP_OP_ASTR:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        this.eval_op_astr(val1, val2, resVal);
        break;


      case ExpressionInterface.EXP_OP_LOOPCOUNTER:
        this.ConstructMagicNum(resVal, (<Task>this.ExpTask).getLoopCounter(), StorageAttribute.NUMERIC);
        break;

      case ExpressionInterface.EXP_OP_VECCELLATTR:
        val1 = <ExpVal>valStack.pop();
        ExpressionEvaluator.eval_op_vecCellAttr(val1, resVal);
        break;

      case ExpressionInterface.EXP_OP_VECGET:
        val2 = <ExpVal>valStack.pop(); // the cell index
        val1 = <ExpVal>valStack.pop(); // the vector not a 'var' literal
        this.eval_op_vecGet(val1, val2, resVal);
        break;

      case ExpressionInterface.EXP_OP_VECSET:
        val3 = <ExpVal>valStack.pop(); // the new value of the cell
        val2 = <ExpVal>valStack.pop(); // the cells index to be set
        val1 = <ExpVal>valStack.pop(); // a 'var' literal representing the vector
        this.eval_op_vecSet(val1, val2, val3, resVal);
        resVal.IsNull = false;
        if (expStrTracker.isNull())
          expStrTracker.resetNullResult();
        break;

      case ExpressionInterface.EXP_OP_VECSIZE:
        val1 = <ExpVal>valStack.pop(); // the vector not a 'var' literal
        this.eval_op_vecSize(val1, resVal);
        expStrTracker.resetNullResult();
        break;

      case ExpressionInterface.EXP_OP_IN:
        nArgs = valStack.pop();

        resVal.Attr = StorageAttribute.BOOLEAN;
        resVal.BoolVal = false;

        Exp_params = new Array<ExpVal>(nArgs);
        for (j = 0; j < nArgs; j++)
          Exp_params[nArgs - 1 - j] = <ExpVal>valStack.pop();

        try {
          for (j = 1; j < nArgs; j++) {
            if (ExpressionEvaluator.val_cmp_any(Exp_params[0], Exp_params[j], false) === 0) {
              resVal.BoolVal = true;
              break;
            }
          }
        }
        catch (nullValueException) {
          if (nullValueException instanceof NullValueException) {
            super.SetNULL(resVal, StorageAttribute.BOOLEAN);
          }
          else throw nullValueException;
        }

        break;

      case ExpressionInterface.EXP_OP_ISCOMPONENT:
        this.eval_op_iscomponent(resVal);
        break;

      case ExpressionInterface.EXP_OP_MARKTEXT:
        val2 = <ExpVal>valStack.pop(); // # of chars to mark
        val1 = <ExpVal>valStack.pop(); // start position (1 = first position)
        this.eval_op_markText(val1, val2, resVal);
        break;

      case ExpressionInterface.EXP_OP_MARKEDTEXTSET:
        val1 = <ExpVal>valStack.pop(); // string to set
        this.eval_op_markedTextSet(val1, resVal);
        break;

      case ExpressionInterface.EXP_OP_MARKEDTEXTGET:
        this.eval_op_markedTextGet(resVal);
        break;

      case ExpressionInterface.EXP_OP_CARETPOSGET:
        this.eval_op_caretPosGet(resVal);
        break;

      case ExpressionInterface.EXP_OP_MNU:
        resVal.Attr = StorageAttribute.NUMERIC;
        len = expStrTracker.get2ByteNumber();
        resVal.MgNumVal = expStrTracker.getMagicNumber(len, true);
        break;

      case ExpressionInterface.EXP_OP_USER_DEFINED_FUNC:
        nArgs = valStack.pop();
        /* nArgs should atleast be 1 (for holding the function name) */
        if (nArgs > 0) {
          nArgs--; // one of the arguments is the name of the function (it will be the 1st value)
          Exp_params = new Array<ExpVal>(nArgs);
          for (j = 0; j < nArgs; j++)
            Exp_params[nArgs - 1 - j] = <ExpVal>valStack.pop();

          let funcName: string = (<ExpVal>valStack.pop()).StrVal;
          this.eval_op_ExecUserDefinedFunc(funcName, Exp_params, resVal, expectedType);
          expStrTracker.resetNullResult();
        }
        break;

      case ExpressionInterface.EXP_OP_UNICODEASC:
        // get a unicode string and return the unicode numeric code of its first char
        val1 = <ExpVal>valStack.pop();
        resVal.Attr = StorageAttribute.NUMERIC;
        resVal.IsNull = false;

        if (!val1.IsNull && val1.StrVal.length > 0) {
          resVal.MgNumVal = new NUM_TYPE();
          resVal.MgNumVal.NUM_4_LONG(val1.StrVal[0].charCodeAt(0));
        }
        else
          resVal.IsNull = true;
        break;

      case ExpressionInterface.EXP_OP_CLIPADD:
        nArgs = valStack.pop();
        resVal.Attr = StorageAttribute.BOOLEAN;
        resVal.BoolVal = false;

        Exp_params = new Array<ExpVal>(nArgs);
        for (j = 0; j < nArgs; j++)
          Exp_params[nArgs - 1 - j] = <ExpVal>valStack.pop();
        resVal.BoolVal = this.eval_op_clipAdd(Exp_params);
        break;

      case ExpressionInterface.EXP_OP_CLIPREAD:
        this.eval_op_clipread(resVal);
        break;

      case ExpressionInterface.EXP_OP_CLIPWRITE:
        this.eval_op_clipwrite(resVal);
        break;

      case ExpressionInterface.EXP_OP_PUBLICNAME:
        val1 = <ExpVal>valStack.pop(); // Generation
        this.eval_op_publicName(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_TASKID:
        val1 = <ExpVal>valStack.pop(); // Generation
        this.eval_op_taskId(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_DBVIEWSIZE:
        val1 = <ExpVal>valStack.pop(); // Generation
        this.eval_op_dbviewsize(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_DBVIEWROWIDX:
        val1 = <ExpVal>valStack.pop(); // Generation
        this.eval_op_dbviewrowidx(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_PROJECTDIR:
        this.eval_op_projectdir(resVal);
        break;

      case ExpressionInterface.EXP_OP_BROWSER_SET_CONTENT:
        val1 = <ExpVal>valStack.pop(); // the text to be set
        val2 = <ExpVal>valStack.pop(); // the control name
        this.eval_op_browserSetContent(resVal, val2, val1);
        break;

      case ExpressionInterface.EXP_OP_BROWSER_GET_CONTENT:
        val1 = <ExpVal>valStack.pop(); // the control name
        this.eval_op_browserGetContent(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_BROWSER_SCRIPT_EXECUTE:
        nArgs = valStack.pop();
        this.eval_op_browserExecute(valStack, resVal, nArgs);
        break;

      case ExpressionInterface.EXP_OP_MLS_TRANS:
        val1 = <ExpVal>valStack.pop(); // the control name
        this.eval_op_MlsTrans(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_STR_BUILD:
        nArgs = valStack.pop();
        this.eval_op_StrBuild(valStack, resVal, nArgs);
        break;

      case ExpressionInterface.EXP_OP_CHECK_MENU:
        val2 = <ExpVal>valStack.pop(); // To check or uncheck
        val1 = <ExpVal>valStack.pop(); // Menu name
        this.eval_op_menu_check(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_ENABLE_MENU:
        val2 = <ExpVal>valStack.pop(); // To enable or disabled.
        val1 = <ExpVal>valStack.pop(); // Menu name
        this.eval_op_menu_enable(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_MNUADD:
        val2 = <ExpVal>valStack.pop(); // Path where the menu structure is to be merged
        val1 = <ExpVal>valStack.pop(); // A numeric value for the number of the menu in the Menu repository
        this.eval_op_menu_add(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_MNUREMOVE:
        nArgs = valStack.pop();
        if (nArgs > 1)
          val2 = <ExpVal>valStack.pop(); // Path from where the menu entried to be removed
        else
          val2 = null;
        val1 = <ExpVal>valStack.pop(); // A numeric value for the number of the menu in the Menu repository
        this.eval_op_menu_remove(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_MNURESET:
        this.eval_op_menu_reset(resVal);
        break;

      case ExpressionInterface.EXP_OP_MENU_NAME:
        val2 = <ExpVal>valStack.pop(); // Entry Text
        val1 = <ExpVal>valStack.pop(); // Entry name
        this.eval_op_menu_name(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_MENU:
        this.eval_op_menu(resVal);
        break;

      case ExpressionInterface.EXP_OP_SHOW_MENU:
        val2 = <ExpVal>valStack.pop(); // To Show or hide
        val1 = <ExpVal>valStack.pop(); // Menu Name
        this.eval_op_menu_show(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_MENU_IDX:
        val2 = <ExpVal>valStack.pop(); // isPublic
        val1 = <ExpVal>valStack.pop(); // Menu Name
        this.eval_op_menu_idx(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_STATUSBARSETTEXT:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_statusbar_set_text(resVal, val1);
        expStrTracker.resetNullResult();
        break;

      case ExpressionInterface.EXP_OP_GETPARAM:
        val1 = <ExpVal>valStack.pop(); // parameter name
        this.eval_op_getParam(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_SETPARAM:
        val2 = <ExpVal>valStack.pop(); // parameter value
        val1 = <ExpVal>valStack.pop(); // parameter name
        this.eval_op_setParam(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_INIPUT:
        val2 = <ExpVal>valStack.pop(); // parameter value
        val1 = <ExpVal>valStack.pop(); // parameter name
        this.eval_op_iniput(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_INIGET:
        val1 = <ExpVal>valStack.pop(); // parameter name
        this.eval_op_iniget(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_INIGETLN:
        val2 = <ExpVal>valStack.pop(); // parameter number
        val1 = <ExpVal>valStack.pop(); // section name
        this.eval_op_inigetln(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_EXPCALC:
        val1 = <ExpVal>valStack.pop(); // EXP
        this.eval_op_expcalc(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_TASKTYPE:
        val1 = <ExpVal>valStack.pop(); // Generation
        this.eval_op_taskType(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_RANGE_ADD:
        nArgs = valStack.pop();

        if (nArgs > 0) {
          Exp_params = new Array<ExpVal>(nArgs);
          for (j = 0; j < nArgs; j++)
            Exp_params[nArgs - 1 - j] = <ExpVal>valStack.pop();

          this.eval_op_range_add(resVal, Exp_params);
        }
        break;

      case ExpressionInterface.EXP_OP_RANGE_RESET:
        val1 = <ExpVal>valStack.pop(); // generation
        this.eval_op_range_reset(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_LOCATE_ADD:
        nArgs = valStack.pop();
        if (nArgs > 0) {
          Exp_params = new Array<ExpVal>(nArgs);
          for (j = 0; j < nArgs; j++)
            Exp_params[nArgs - 1 - j] = <ExpVal>valStack.pop();

          this.eval_op_locate_add(resVal, Exp_params);
        }
        break;

      case ExpressionInterface.EXP_OP_LOCATE_RESET:
        val1 = <ExpVal>valStack.pop(); // generation
        this.eval_op_locate_reset(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_SORT_ADD:
        val2 = <ExpVal>valStack.pop(); // dir
        val1 = <ExpVal>valStack.pop(); // varnum
        this.eval_op_sort_add(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_SORT_RESET:
        val1 = <ExpVal>valStack.pop(); // generation
        this.eval_op_sort_reset(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_TSK_INSTANCE:
        val1 = <ExpVal>valStack.pop(); // generation
        this.eval_op_tsk_instance(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_WIN_HWND:
        val1 = <ExpVal>valStack.pop(); // Generation
        this.eval_op_formhandle(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_CTRLHWND:
        val1 = <ExpVal>valStack.pop(); // Control name
        this.eval_op_ctrlhandle(resVal, val1);
        break;

      case ExpressionInterface.EXP_OP_TERM:
        this.eval_op_terminal(resVal);
        break;

      case ExpressionInterface.EXP_OP_FORMSTATECLEAR:
        val1 = <ExpVal>valStack.pop(); // formName
        this.eval_op_formStateClear(val1, resVal);
        break;

      case ExpressionInterface.EXP_OP_CLIENTSESSION_SET:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();

        this.eval_op_ClientSessionSet(val1, val2, resVal);
        break;
      case ExpressionInterface.EXP_OP_DRAG_SET_DATA:
        nArgs = valStack.pop();      // Get the nArgs.

        val3 = null;
        if (nArgs > 2)
          val3 = <ExpVal>valStack.pop();   // Get UserFormat string
        val2 = <ExpVal>valStack.pop();      // Get Format
        val1 = <ExpVal>valStack.pop();      // Get Data

        ExpressionEvaluator.eval_op_DragSetData(resVal, val1, val2, val3);
        break;

      case ExpressionInterface.EXP_OP_DROP_FORMAT:
        nArgs = valStack.pop();      // Get the nArgs.

        val2 = null;
        if (nArgs > 1)
          val2 = <ExpVal>valStack.pop();   // Get UserFormat string
        val1 = <ExpVal>valStack.pop();      // Get Format
        ExpressionEvaluator.eval_op_DropFormat(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_GET_DROP_DATA:
        nArgs = valStack.pop();      // Get the nArgs.

        val2 = null;
        if (nArgs > 1)
          val2 = <ExpVal>valStack.pop();   // Get UserFormat string
        val1 = <ExpVal>valStack.pop();      // Get Format

        ExpressionEvaluator.eval_op_DropGetData(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_DROP_GET_X:
        this.eval_op_GetDropMouseX(resVal);
        break;

      case ExpressionInterface.EXP_OP_DROP_GET_Y:
        this.eval_op_GetDropMouseY(resVal);
        break;

      case ExpressionInterface.EXP_OP_CND_RANGE:
        val2 = <ExpVal>valStack.pop(); // range to be used
        val1 = <ExpVal>valStack.pop(); // condition to use range

        this.eval_op_CndRange(resVal, val1, val2);
        break;

      case ExpressionInterface.EXP_OP_DATAVIEW_TO_DATASOURCE:
        val5 = <ExpVal>valStack.pop();
        val4 = <ExpVal>valStack.pop();
        val3 = <ExpVal>valStack.pop();
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();

        if (val1.IsNull || val2.IsNull || val3.IsNull || val4.IsNull || val5.IsNull) {
          resVal.BoolVal = false;
          resVal.Attr = StorageAttribute.BOOLEAN;
        }
        else {
          this.eval_op_dataview_to_datasource(resVal, val1, val2, val3, val4, val5);

          if (!NString.IsNullOrEmpty(ClientManager.Instance.ErrorToBeWrittenInServerLog)) {
             ClientManager.Instance.EventsManager.WriteErrorMessageesToServerLog(this.ExpTask, ClientManager.Instance.ErrorToBeWrittenInServerLog);
          }
        }
        break;

      case ExpressionInterface.EXP_OP_CONTROL_ITEMS_REFRESH:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        this.eval_op_control_items_refresh(val1, val2, resVal);
        break;
      case ExpressionInterface.EXP_OP_PIXELSTOFROMUNITS:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        this.eval_op_PixelsToFormUnits(val1, val2, resVal);
        break;
      case ExpressionInterface.EXP_OP_FORMUNITSTOPIXELS:
        val2 = <ExpVal>valStack.pop();
        val1 = <ExpVal>valStack.pop();
        this.eval_op_FormUnitsToPixels(val1, val2, resVal);
        break;

      case ExpressionInterface.EXP_OP_CONTROL_SELECT_PROGRAM:
        val1 = <ExpVal>valStack.pop();
        this.eval_op_control_select_program(val1, resVal);
        break;

      default:
        return;
    }
    if (addResult) {
      this.ConvertExpVal(resVal, expectedType);
      valStack.push(resVal);
      /* check if we must nullify result, because one of the members of the expression is NULL
       */
      if (resVal.IsNull)
        expStrTracker.setNullResult();
    }
  }

  /// <summary>
  /// Sets the client session with Key, Value pair provided.
  /// </summary>
  /// <param name="val1"></param>
  /// <param name="val2"></param>
  /// <param name="resVal"></param>
  private eval_op_ClientSessionSet(val1: ExpVal, val2: ExpVal, resVal: ExpVal): void {
    resVal.BoolVal = false;
    resVal.Attr = StorageAttribute.BOOLEAN;

    if (!val1.isEmptyString()) {
      switch (val1.StrVal) {
        case ConstInterface.ENABLE_COMMUNICATION_DIALOGS:
          if (val2.Attr === StorageAttribute.BOOLEAN) {
            resVal.BoolVal = true;
          }
          else
            Logger.Instance.WriteExceptionToLogWithMsg("Invalid attribute for " + ConstInterface.ENABLE_COMMUNICATION_DIALOGS + " key in ClientSessionSet()");
          break;

        default:
          Logger.Instance.WriteExceptionToLogWithMsg("Invalid Key in ClientSessionSet()");
          break;
      }
    }
  }

  /// <summary>
  ///   Execute the expression itself
  /// </summary>
  /// <param name = "expStrTracker">the expression</param>
  /// <param name = "valStack">stack of values to use while executing the expression</param>
  /// <param name = "expectedType"></param>
  private execExpression(expStrTracker: ExpStrTracker, valStack: Stack<any>, expectedType: StorageAttribute): void {
    let expVal: ExpVal;
    let i: number;
    let addedOpers: List<DynamicOperation> = new List<DynamicOperation>();
    let dynOper: DynamicOperation;

    let opCode: number = expStrTracker.getOpCode();

    // if a basic data item, just get it and push it to the stack
    if (ExpressionEvaluator.isBasicItem(opCode)) {
      expVal = this.getExpBasicValue(expStrTracker, opCode);

      this.ConvertExpVal(expVal, expectedType);
      valStack.push(expVal);
      /* check if we must nullify result, because one of the members of the expression is NULL
       */
      if (expVal.IsNull)
        expStrTracker.setNullResult();

      return;
    }

    let expDesc: ExpDesc = ExpressionDict.expDesc[opCode];

    // Null result of a function depends only on return value its parameters
    // It doesn't depend on whether any parameter in the whole expression is NULL
    // For example in IF (VecSet ('A'Var, 1, NULL()), A, B)
    // IF should not return NULL because VecSet has a NULL parameter but it should
    // return NULL if either of the parameters (VecSet, A or B) is NULL
    let nullArgs: boolean = false;
    if (expDesc.ArgEvalCount_ > 0) {
      for (i = 0; i < expDesc.ArgEvalCount_; i++) {
        expStrTracker.resetNullResult();
        this.execExpression(expStrTracker, valStack, <StorageAttribute>expDesc.ArgAttr_[i]);
        if (expStrTracker.isNull())
          nullArgs = true;
      }
    }

    if (nullArgs)
      expStrTracker.setNullResult();

    // execute the current operator
    this.execOperation(opCode, expStrTracker, valStack, addedOpers, expectedType);

    // if there are side effect operation, execute them
    let nDynOpers: number = addedOpers.length;
    if (nDynOpers > 0) {
      for (i = 0; i < nDynOpers; i++) {
        dynOper = addedOpers.get_Item(0);
        addedOpers.RemoveAt(0);
        switch (dynOper.opCode_) {
          case ExpressionInterface.EXP_OP_IGNORE:
            let j: number;
            for (j = 0; j < dynOper.argCount_; j++)
              expStrTracker.skipOperator();
            break;

          case ExpressionInterface.EXP_OP_EVALX:
            this.execExpression(expStrTracker, valStack, expectedType);
            break;
        }
      }
    }
  }

  /// <summary>
  /// Calculate the value of the 1st CndRange parameter, and return true if the CndRange result should be discarded
  /// Similar to execExpression, but works only on CndRange, and returns the result of the CndRange 1st parameter
  /// </summary>
  /// <param name="expStrTracker"></param>
  /// <param name="valStack"></param>
  /// <param name="expectedType"></param>
  /// <returns>true if CndRange evaluated to false and the range should be discarded</returns>
  private DiscardCndRangeExpression(expStrTracker: ExpStrTracker, valStack: Stack<any>): boolean {
    let expVal: ExpVal;
    let addedOpers: List<DynamicOperation> = new List<DynamicOperation>();

    let opCode: number = expStrTracker.getOpCode();

    // if a basic data item, just get it and push it to the stack
    if (opCode !== ExpressionInterface.EXP_OP_CND_RANGE) {
      return false;
    }

    let expDesc: ExpDesc = ExpressionDict.expDesc[opCode];

    this.execExpression(expStrTracker, valStack, <StorageAttribute>expDesc.ArgAttr_[0]);

    expVal = <ExpVal>valStack.pop();
    return expVal.Attr === StorageAttribute.BOOLEAN && !expVal.BoolVal;
  }

  static val_cmp_any(val1: ExpVal, val2: ExpVal, forceComparer: boolean): number {
    let retval: number = 0;
    let attr1: StorageAttribute = val1.Attr;
    let attr2: StorageAttribute = val2.Attr;
    let expVal: ExpressionEvaluator = new ExpressionEvaluator();

    if (val1.IsNull && val2.IsNull)
      return 0;

    if (val1.IsNull || val2.IsNull)
      throw new NullValueException(attr1);

    if (StorageAttributeCheck.isTypeBlob(attr1)) {
      if (val1.IncludeBlobPrefix && BlobType.getContentType(val1.StrVal) === BlobType.CONTENT_TYPE_BINARY) {
        val1.StrVal = BlobType.removeBlobPrefix(val1.StrVal);
        val1.Attr = StorageAttribute.ALPHA;
        val1.IncludeBlobPrefix = false;
      }
      else
        expVal.ConvertExpVal(val1, StorageAttribute.UNICODE);
    }
    if (StorageAttributeCheck.isTypeBlob(attr2)) {
      if (val2.IncludeBlobPrefix && BlobType.getContentType(val2.StrVal) === BlobType.CONTENT_TYPE_BINARY) {
        val2.StrVal = BlobType.removeBlobPrefix(val2.StrVal);
        val2.Attr = StorageAttribute.ALPHA;
        val2.IncludeBlobPrefix = false;
      }
      else
        expVal.ConvertExpVal(val2, StorageAttribute.UNICODE);
    }

    attr1 = val1.Attr;
    attr2 = val2.Attr;

    if (attr1 !== attr2) {
      if ((StorageAttributeCheck.isTypeNumeric(attr1) && StorageAttributeCheck.isTypeNumeric(attr2)) ||
        (StorageAttributeCheck.IsTypeAlphaOrUnicode(attr1) && StorageAttributeCheck.IsTypeAlphaOrUnicode(attr2))) {
        /* Do nothing : it's OK to compare these types */
      }
      else
        return 1;
    }

    // -----------------------------------------------------------------------
    // This code was taken from STORAGE::fld_cmp method in Magic
    // -----------------------------------------------------------------------
    switch (attr1) {
      case StorageAttribute.ALPHA:
      case StorageAttribute.BLOB:
      case StorageAttribute.BLOB_VECTOR:
      case StorageAttribute.UNICODE:
        if (val1.StrVal === null && val2.StrVal === null)
          return 0;

        if (val1.StrVal === null || val2.StrVal === null)
          throw new NullValueException(attr1);

        let str1: string = StrUtil.rtrim(val1.StrVal);
        let str2: string = StrUtil.rtrim(val2.StrVal);

        if (ClientManager.Instance.getEnvironment().getSpecialAnsiExpression() ||
            (UtilStrByteMode.isLocaleDefLangDBCS() &&
            attr1 === StorageAttribute.ALPHA && attr2 === StorageAttribute.ALPHA))
            retval = UtilStrByteMode.strcmp(str1, str2);
        else
          retval = NString.CompareOrdinal(str1, str2);
        break;


      case StorageAttribute.NUMERIC:
      case StorageAttribute.DATE:
      case StorageAttribute.TIME:
        if (val1.MgNumVal === null && val2.MgNumVal === null)
          return 0;

        if (val1.MgNumVal === null || val2.MgNumVal === null)
          throw new NullValueException(attr1);
        retval = NUM_TYPE.num_cmp(val1.MgNumVal, val2.MgNumVal);
        break;


      case StorageAttribute.BOOLEAN:
        retval = (val1.BoolVal ? 1 : 0) - (val2.BoolVal ? 1 : 0);
        break;

    }
    return (retval);
  }

  /// <summary>
  ///   calculate the result of the expression
  /// </summary>
  /// <param name = "exp">is a reference to the expression string to be evaluated. this string
  ///   is in an expression in polish notation where every byte is represented by a
  ///   2-digit hex number</param>
  /// <param name = "expectedType">is the expected type of the expression. when the expressions type does
  ///   not match the expected type an exception should be thrown. a space (' ') here
  ///   means any expression. it is used for Evaluate operation.</param>
  /// <param name = "task">is a reference to the task in which the expression is defined. it is
  ///   used for getting a reference to fields for getting/setting their values</param>
  /// <returns> String is the result of the evaluation:
  ///   1. string value will be a string
  ///   2. numeric, date, time will be a Magic number as a string of hex digits
  ///   3. logical will be one digit: 0 for FALSE, 1 for TRUE
  ///   4. null value just return null (not an empty string!)</returns>
  static eval(exp: Int8Array, expectedType: StorageAttribute, task: Task): ExpVal {
    let res: ExpVal = null;
    let valStack: Stack<ExpVal> = new Stack();

    if (exp !== null && exp.length > 0) {
      let me: ExpressionEvaluator = new ExpressionEvaluator();
      let expStrTracker: ExpStrTracker = new ExpStrTracker(exp, task.getNullArithmetic() === Constants.NULL_ARITH_NULLIFY);
      me.ExpTask = task;
      me.execExpression(expStrTracker, valStack, expectedType);
      res = <ExpVal>valStack.pop();
      if (expStrTracker.isNull())
      // null arithmetic == nullify and one of the members of the expression is null,
      // so the result must be NULL
        res.IsNull = true;
    }
    return res;
  }

  static DiscardCndRangeResult(exp: Int8Array, task: Task): boolean {
    let valStack: Stack<ExpVal> = new Stack();

    if (exp !== null && exp.length > 0) {
      let me: ExpressionEvaluator = new ExpressionEvaluator();
      let expStrTracker: ExpStrTracker = new ExpStrTracker(exp, task.getNullArithmetic() === Constants.NULL_ARITH_NULLIFY);
      me.ExpTask = task;
      return me.DiscardCndRangeExpression(expStrTracker, valStack);
    }
    return false;
  }

  /// <summary>
  ///   Convert a string to a Null terminated Pic
  ///   max length of the mask is 100 characters
  /// </summary>
  private static set_a_pic(val: string): string {
    let len: number = Math.min(val.length, 99);
    return StrUtil.ZstringMake(val, len);
  }

  /// <summary>
  ///   Evaluate RANGE magic function
  /// </summary>
  private eval_op_range(val1: ExpVal, val2: ExpVal, val3: ExpVal, resVal: ExpVal): void {
    resVal.BoolVal = false;
    resVal.Attr = StorageAttribute.BOOLEAN;
    try {
      if (ExpressionEvaluator.val_cmp_any(val1, val2, true) >= 0) {
        val2 = val3;
        if (ExpressionEvaluator.val_cmp_any(val1, val2, true) <= 0)
          resVal.BoolVal = true;
      }
    }
    catch (ex) {
      if (ex instanceof NullValueException) {
        super.SetNULL(resVal, ex.getAttr());
      }
      else
        throw ex;
    }
  }

  /// <summary>
  ///   Evaluate REP magic function
  /// </summary>
  private eval_op_rep_1(resVal: ExpVal, val1: ExpVal, val2: ExpVal, val3: ExpVal, val4: ExpVal): void {
    if (val1.StrVal === null || val2.StrVal === null || val3.MgNumVal === null || val4.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.UNICODE);
      return;
    }
    ExpressionEvaluator.val_s_cpy(val1, resVal);
    let i: number = val3.MgNumVal.NUM_2_LONG();
    if (i < 1)
      i = 1;
    let j: number = val4.MgNumVal.NUM_2_LONG();

    if (j > val2.StrVal.length)
      j = val2.StrVal.length;

    if (i + j - 1 > resVal.StrVal.length)
      j = resVal.StrVal.length - i + 1;

    if ((j <= 0))
      return;

    let tmp_s: string = StrUtil.memcpy("", 0, resVal.StrVal, i + j - 1, resVal.StrVal.length - i - j + 1);

    resVal.StrVal = StrUtil.memcpy(resVal.StrVal, i - 1, val2.StrVal, 0, j);
    resVal.StrVal = StrUtil.memcpy(resVal.StrVal, i - 1 + j, tmp_s, 0, resVal.StrVal.length - i - j + 1);

    /* add blanks to the end*/
    if (j - val2.StrVal.length > 0)
      resVal.StrVal = StrUtil.memset(resVal.StrVal, i + val2.StrVal.length - 1, ' ', j - val2.StrVal.length);
  }

  private static val_s_cpy(val: ExpVal, resVal: ExpVal): void {
    resVal.Attr = val.Attr;
    resVal.StrVal = val.StrVal;
    resVal.IsNull = val.IsNull;
    resVal.IncludeBlobPrefix = val.IncludeBlobPrefix;
  }

  private val_cpy(val: ExpVal, resVal: ExpVal): void {
    switch (val.Attr) {
      case StorageAttribute.ALPHA:
      case StorageAttribute.UNICODE:
      case StorageAttribute.BLOB:
      case StorageAttribute.BLOB_VECTOR:
        ExpressionEvaluator.val_s_cpy(val, resVal);
        break;

      case StorageAttribute.NUMERIC:
      case StorageAttribute.DATE:
      case StorageAttribute.TIME:
        if (!val.IsNull)
          resVal.MgNumVal = new NUM_TYPE(val.MgNumVal);
        break;

      case StorageAttribute.BOOLEAN:
        resVal.BoolVal = val.BoolVal;
        break;

      default:
        Logger.Instance.WriteExceptionToLogWithMsg("Expression Evaluator.val_cpy no such type of attribute : " + val.Attr);
        break;
    }
    resVal.Attr = val.Attr;
    resVal.IsNull = val.IsNull;
  }

  /// <summary>
  ///   insert string into another string, INS magic function
  /// </summary>
  private eval_op_ins(resVal: ExpVal, val1: ExpVal, val2: ExpVal, val3: ExpVal, val4: ExpVal): void {
    resVal.Attr = StorageAttribute.UNICODE;
    if (val1.StrVal === null || val2.StrVal === null || val3.MgNumVal === null || val4.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.UNICODE);
      return;
    }
    let i: number = val1.StrVal.length;

    let ins_ofs: number = val3.MgNumVal.NUM_2_LONG() - 1;
    ins_ofs = Math.max(ins_ofs, 0);
    ins_ofs = Math.min(ins_ofs, i);

    let ins_len: number = val4.MgNumVal.NUM_2_LONG();
    ins_len = Math.max(ins_len, 0);
    ins_len = Math.min(ins_len, val2.StrVal.length);

    resVal.StrVal = StrUtil.memcpy("", 0, val1.StrVal, 0, ins_ofs);
    resVal.StrVal = StrUtil.memcpy(resVal.StrVal, ins_ofs, val2.StrVal, 0, ins_len);
    resVal.StrVal = StrUtil.memcpy(resVal.StrVal, ins_ofs + ins_len, val1.StrVal, ins_ofs, i - ins_ofs);
  }

  /// <summary>
  ///   DEL magic function
  /// </summary>
  private eval_op_del(resVal: ExpVal, val1: ExpVal, val2: ExpVal, val3: ExpVal): void {
    if (val1.StrVal === null || val2.MgNumVal === null || val3.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.UNICODE);
      return;
    }


    ExpressionEvaluator.val_s_cpy(val1, resVal);
    let i: number = val2.MgNumVal.NUM_2_LONG() - 1;
    if (i < 0) {
      i = 0;
    }
    if (i > resVal.StrVal.length)
      i = resVal.StrVal.length;
    let j: number = val3.MgNumVal.NUM_2_LONG();
    if (i + j > resVal.StrVal.length)
      j = resVal.StrVal.length - i;
    if (j <= 0)
      return;

    resVal.StrVal = StrUtil.memcpy(resVal.StrVal, i, resVal.StrVal, i + j, resVal.StrVal.length - i);
  }

  /// <summary>
  ///   FLIP magic function (reverse)
  /// </summary>
  private eval_op_flip(resVal: ExpVal, val1: ExpVal): void {
    resVal.Attr = StorageAttribute.UNICODE;
    if (val1.StrVal === null) {
      super.SetNULL(resVal, StorageAttribute.UNICODE);
      return;
    }
    let rev_str = new StringBuilder(val1.StrVal);
    resVal.StrVal = StrUtil.ReverseString(rev_str).ToString();
  }

  /// <summary>
  ///   UPPER magic function
  /// </summary>
  private eval_op_upper(resVal: ExpVal, val1: ExpVal): void {
    resVal.Attr = StorageAttribute.UNICODE;
    if (val1.StrVal === null) {
      super.SetNULL(resVal, StorageAttribute.UNICODE);
      return;
    }
    resVal.StrVal = val1.StrVal.toUpperCase();
  }

  /// <summary>
  ///   LOWER magic function
  /// </summary>
  private eval_op_lower(resVal: ExpVal, val1: ExpVal): void {
    resVal.Attr = StorageAttribute.UNICODE;
    if (val1.StrVal == null) {
      super.SetNULL(resVal, StorageAttribute.UNICODE);
      return;
    }
    resVal.StrVal = val1.StrVal.toLowerCase();
  }

  /// <summary>
  ///   CRC magic function
  /// </summary>
  private eval_op_crc(resVal: ExpVal, val1: ExpVal, val2: ExpVal): void {
    resVal.Attr = StorageAttribute.ALPHA;
    if (val1.StrVal == null || val2.MgNumVal == null) {
      super.SetNULL(resVal, StorageAttribute.ALPHA);
      return;
    }
    let mode: number = val2.MgNumVal.NUM_2_LONG();
    let res: number = 0;
    switch (mode) {
      case 0:
        res = ExpressionEvaluator.eval_crc_16(val1.StrVal);
        break;
    }
    let left = String.fromCharCode(res % 256);
    let right = String.fromCharCode(res / 256);
    resVal.StrVal = "" + left + right;
  }

  private static eval_crc_16(buf: String): number {
    let crc_16_table = [
      40961, 61441, 55297, 52225, 50689, 49921, 49537, 49345
    ];
    let buffer_idx: number = 0;
    let len: number = buf.length;
    let crc: number = 0;
    for (; len > 0; len--) {
      let bt = buf.charCodeAt(buffer_idx++);
      bt = <number>(bt ^ ExpressionEvaluator.LO_CHAR(crc));
      crc = ExpressionEvaluator.LO_CHAR(ExpressionEvaluator.MK_SHRT(0, ExpressionEvaluator.HI_CHAR(crc)));
      let mask: number;
      let tbl_idx: number;
      for (tbl_idx = 0, mask = <number>ExpressionEvaluator.LO_CHAR(0x80); tbl_idx < 8; tbl_idx++ , mask = <number>(ExpressionEvaluator.LO_CHAR(mask) >> 1)) {
        if (<number>ExpressionEvaluator.LO_CHAR(<number>(bt & <number>ExpressionEvaluator.LO_CHAR(mask))) !== 0)
          crc = <number>(crc ^ crc_16_table[tbl_idx]);
      }
    }
    return (crc);
  }

  private static LO_CHAR(n: number): number {
    return <number>(n & 0xff);
  }

  private static HI_CHAR(n: number): number {
    return <number>((n & 0xff00) >> 8);
  }

  static MK_SHRT(c1: number, c2: number): number {
    return <number>(<number>(c1 << 8) | <number>c2);
  }

  static MK_LONG(c1: number, c2: number, c3: number, c4: number): number {
    return ((c1 << 24) | (c2 << 16) | (c3 << 8) | c4);
  }

  private eval_op_chkdgt(resVal: ExpVal, val1: ExpVal, val2: ExpVal): void {
    let weight_vals: string[] = [
      String.fromCharCode(1), String.fromCharCode(2), String.fromCharCode(5), String.fromCharCode(3), String.fromCharCode(6), String.fromCharCode(4), String.fromCharCode(8),
      String.fromCharCode(7), String.fromCharCode(10), String.fromCharCode(9)
    ];
    let pos: number;
    let mul: number;
    let c_str: string;
    let digits: number;

    if (val1.StrVal === null || val2.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.NUMERIC);
      return;
    }

    let mode: number = val2.MgNumVal.NUM_2_LONG();
    let res: number = 0;
    switch (mode) {
      case 0:
        mul = 2;
        for (pos = val1.StrVal.length; pos >= 1; pos--) {
          c_str = val1.StrVal.substr(pos - 1);
          digits = this.a_2_long(c_str, 1) * mul;
          res += digits + (digits > 9 ? 1 : 0);
          mul = 3 - mul;
        }
        res %= 10;
        if (res !== 0)
          res = 10 - res;
        break;

      case 1:
        for (pos = val1.StrVal.length; pos >= 1; pos--) {
          mul = weight_vals[(val1.StrVal.length - pos) % 10].charCodeAt(0);
          let c_char: string = val1.StrVal[pos - 1].toUpperCase();
          c_str = val1.StrVal.substr(pos - 1);
          if (UtilStrByteMode.isDigit(c_char))
            digits = this.a_2_long(c_str, 1) * mul;
          else if (NChar.IsUpper(c_str[0]))
            digits = (c_str[0].charCodeAt(0) - 'A'.charCodeAt(0) + 1) * mul;
          else
            digits = 0;
          res += digits;
        }
        res %= 11;
        if (res !== 0)
          res = 11 - res;
        break;
    }
    super.ConstructMagicNum(resVal, res, StorageAttribute.NUMERIC);
  }

  private a_2_long(str: string, len: number): number {
    let n: number = 0;
    for (let pos: number = 0; pos < len; pos = pos + 1) {
      if (UtilStrByteMode.isDigit(str.charAt(pos))) {
        n = n * 10;
        n += <number>(str.charCodeAt(pos) - '0'.charCodeAt(0));
      }
    }
    return n;
  }

  private eval_op_soundx(resVal: ExpVal, val1: ExpVal): void {
    let soundx_vals: string[] = [
      '0', '1', '2', '3', '0', '1', '2', '0', '0', '2', '2', '4', '5', '5', '0', '1', '2',
      '6',
      '2', '3', '0', '1', '0', '2', '0', '2'
    ];

    if (val1.StrVal === null) {
      super.SetNULL(resVal, StorageAttribute.ALPHA);
      return;
    }
    resVal.Attr = StorageAttribute.ALPHA;
    resVal.StrVal = "0000";
    let lastc: string = ' ';
    let outpos: number = 0;
    for (let inpos: number = 0; inpos < val1.StrVal.length; inpos++) {
      let inc: string = val1.StrVal.charAt(inpos).toUpperCase();
      let outc: string = soundx_vals[(inc.charCodeAt(0) - 'A'.charCodeAt(0))];
      if (inpos === 0)
        resVal.StrVal = ExpressionEvaluator.setAt(resVal.StrVal, outpos++, inc);
      else if (outc > '0' && outc !== lastc) {
        resVal.StrVal = ExpressionEvaluator.setAt(resVal.StrVal, outpos++, outc);
        if (outpos > 3)
          break;
      }
      lastc = outc;
    }
  }

  /// <summary>
  ///   set character inside string on needed position
  /// </summary>
  /// <param name = "str">to insert char into</param>
  /// <param name = "pos">of character to insert</param>
  /// <param name = "ch">to be inserted</param>
  /// <returns> string with inserted char</returns>
  private static setAt(str: string, pos: number, ch: string): string {
    let buffer: StringBuilder = new StringBuilder(str);

    if (pos < str.length) {
      buffer.set_Item(pos, ch); // try block
    }
    else {
      buffer.Append(ch); // catch block
    }
    return buffer.ToString();
  }

  private eval_op_hstr(resVal: ExpVal, val1: ExpVal): void {
    let num16 = new NUM_TYPE();
    let newnum: NUM_TYPE;
    let digit: number;
    let outstr = new Array(30);
    let tmpOutStr = new StringBuilder(outstr.length);
    let negative: boolean = false;
    resVal.Attr = StorageAttribute.ALPHA;
    if (val1.MgNumVal == null) {
      super.SetNULL(resVal, StorageAttribute.ALPHA);
      return;
    }

    /* note: can be optimized by using larger divisor */
    num16.num_4_a_std("16");
    let orgnum = new NUM_TYPE(val1.MgNumVal);
    if (orgnum.num_is_neg()) {
      negative = true;
      orgnum.num_abs();
    }
    let digits: number = 0;
    while (true) {
      newnum = NUM_TYPE.mod(orgnum, num16);
      orgnum = NUM_TYPE.div(orgnum, num16);
      orgnum.num_trunc(0);
      digit = newnum.NUM_2_LONG();
      digits++;
      ExpressionEvaluator.int_2_hex(outstr, outstr.length - digits, 1, digit, 0);
      if (orgnum.num_is_zero())
        break;
    }

    if (negative) {
      digits++;
      outstr[outstr.length - digits] = '-';
    }
    for (digit = outstr.length - digits; digit < outstr.length; digit++)
      tmpOutStr.Append(outstr[digit]);
    resVal.StrVal = tmpOutStr.ToString();
  }

  private static int_2_hex(str: string[], strPos: number, len: number, n: number, lead: number): void {
    let pos: number = len;
    do
    {
      let digit: number = n % 16;
      if (digit < 10)
        str[--pos + strPos] = String.fromCharCode('0'.charCodeAt(0) + digit);
      else str[--pos + strPos] = String.fromCharCode('A'.charCodeAt(0) + digit - 10);
      n = Math.floor(n / 16);
    }
    while (pos > 0 && n !== 0);
    ExpressionEvaluator.lib_a_fill(str, len, pos + strPos, lead);
    return;
  }


  private static lib_a_fill(str: string[], len: number, pos: number, lead: number): void {
    if (lead === 0) {
      len -= pos;
      if (len > 0 && pos > 0) {
        StrUtil.memcpy(str, 0, str, pos, len);
        StrUtil.memset(str, len, ' ', pos);
      }
    }
    else {
      if (pos > 0)
        StrUtil.memset(str, 0, String.fromCharCode(lead), pos);
    }
    return;
  }


  private eval_op_hval(resVal: ExpVal, val1: ExpVal): void {
    let num16 = new NUM_TYPE();
    let num = new NUM_TYPE();
    let digits: number;
    let state: number = 0; // STATE_BEFORE_NUMBER = 0; STATE_IN_NUMBER = 1
    let negative: boolean = false;

    if (val1.StrVal === null) {
      super.SetNULL(resVal, StorageAttribute.NUMERIC);
      return;
    }

    /* note: can be optimized by using larger divisor */
    num16.num_4_a_std("16");
    resVal.MgNumVal = new NUM_TYPE();
    resVal.MgNumVal.NUM_ZERO();
    for (digits = 0; digits < val1.StrVal.length; digits++) {
      let digitc: string = val1.StrVal[digits];
      if (digitc === '-' && state === 0)
        negative = true;
      let digit: number = this.hex_2_long(val1.StrVal, digits, 1);
      if (digit === 0 && digitc !== '0')
        continue;
      state = 1;
      resVal.MgNumVal = NUM_TYPE.mul(resVal.MgNumVal, num16);
      num.NUM_4_LONG(digit);
      resVal.MgNumVal = NUM_TYPE.add(resVal.MgNumVal, num);
    }
    if (negative)
      resVal.MgNumVal.num_neg();
    resVal.Attr = StorageAttribute.NUMERIC;
  }

  private hex_2_long(str: String, strCount: number, len: number): number {
    let pos: number;
    let n: number = 0;
    for (pos = strCount; pos < strCount + len; pos++) {
      let digit: string = str.charAt(pos).toUpperCase();
      if (UtilStrByteMode.isDigit(digit)) {
        n *= 16;
        n += digit.charCodeAt(0) - '0'.charCodeAt(0);
      }
      else if (digit >= 'A' && digit <= 'F') {
        n *= 16;
        n += digit.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
      }
    }
    return n;
  }

  private eval_op_chr(resVal: ExpVal, val1: ExpVal): void {
    resVal.Attr = StorageAttribute.ALPHA;

    if (val1.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.ALPHA);
      return;
    }

    resVal.StrVal = String.fromCharCode(val1.MgNumVal.NUM_2_LONG())[0];
  }

  private eval_op_asc(resVal: ExpVal, val1: ExpVal): void {
    if (val1.StrVal === null) {
      super.SetNULL(resVal, StorageAttribute.NUMERIC);
      return;
    }

    let c: number = (val1.StrVal.length > 0) ? (Encoding.ASCII.GetBytes(val1.StrVal))[0] : 0;

    this.ConstructMagicNum(resVal, c, StorageAttribute.NUMERIC);
  }

  private eval_op_mstr(resVal: ExpVal, val1: ExpVal, val2: ExpVal): void {
    resVal.Attr = StorageAttribute.ALPHA;
    if (val1.MgNumVal == null && val2.MgNumVal == null) {
      super.SetNULL(resVal, StorageAttribute.ALPHA);
      return;
    }
    let num = new NUM_TYPE(val1.MgNumVal);
    if (num.NUM_IS_LONG())
      num.num_4_std_long();
    let len: number = val2.MgNumVal.NUM_2_LONG();
    len = Math.max(len, 2);
    let tmpArray: Int8Array = new Int8Array(len);
    for (let i: number = 0; i < len; i++)
      tmpArray[i] = num.Data[i];
    let tmpBytes: Uint8Array = Misc.ToByteArray(tmpArray);
    resVal.StrVal = ClientManager.Instance.getEnvironment().GetEncoding().GetString(tmpBytes, 0, tmpBytes.length);
  }

  private eval_op_mval(resVal: ExpVal, val1: ExpVal): void {
    resVal.Attr = StorageAttribute.NUMERIC;
    if (val1.StrVal == null) {
      super.SetNULL(resVal, StorageAttribute.NUMERIC);
      return;
    }
    resVal.MgNumVal = new NUM_TYPE();
    resVal.MgNumVal.NUM_SET_ZERO();
    let len: number = Math.min(val1.StrVal.length, NUM_TYPE.NUM_SIZE);
    resVal.MgNumVal = new NUM_TYPE(Misc.ToSByteArray(ClientManager.Instance.getEnvironment().GetEncoding().GetBytes(val1.StrVal)), 0, len);
  }


  /// <summary>
  ///   evaluation of Date to the Alfa string with special format
  /// </summary>
  private eval_op_dstr(resVal: ExpVal, val1: ExpVal, val2: ExpVal, displayConvertor: DisplayConvertor): void {
    resVal.Attr = StorageAttribute.UNICODE;
    if (val1.MgNumVal == null || val2.StrVal == null) {
      super.SetNULL(resVal, StorageAttribute.UNICODE);
      return;
    }
    resVal.StrVal = displayConvertor.to_a(resVal.StrVal, 100, val1.MgNumVal.NUM_2_ULONG(), val2.StrVal,
      (<Task>this.ExpTask).getCompIdx());
  }

  private eval_op_tstr(resVal: ExpVal, val1: ExpVal, val2: ExpVal, displayConvertor: DisplayConvertor,
                       milliSeconds: boolean): void {
    resVal.Attr = StorageAttribute.ALPHA;
    if (val1.MgNumVal == null || val2.StrVal == null) {
      super.SetNULL(resVal, StorageAttribute.ALPHA);
      return;
    }
    resVal.StrVal = displayConvertor.time_2_a(resVal.StrVal, 100, val1.MgNumVal.NUM_2_ULONG(), val2.StrVal,
      (<Task>this.ExpTask).getCompIdx(), milliSeconds);
  }


  private eval_op_dval(resVal: ExpVal, val1: ExpVal, val2: ExpVal, displayConvertor: DisplayConvertor): void {
    if (val1.StrVal === null || val2.StrVal === null) {
      super.SetNULL(resVal, StorageAttribute.DATE);
      return;
    }

    /*--------------------------------------------------------------*/
    /* year 2000 bug - if the user inserts a date value with only 2 */
    /* year digits (i.e. DD/MM/YY), the a_2_date might insert extra */
    /* 2 century digits, and enlarge the input string. In order to  */
    /* aviod memory corruptions, we enlarge the date string input   */
    /* buffer - Ilan shiber                                         */
    /*--------------------------------------------------------------*/
    if (val1.Attr === StorageAttribute.UNICODE)
      if (val1.StrVal.length + 2 <= NUM_TYPE.NUM_SIZE) {
      }
      else {
          let tmp = new Array(val1.StrVal.length + 2);
          for (let _ai: number = 0; _ai < tmp.length; ++_ai)
            tmp[_ai] = '\0';
        StrUtil.memcpy(tmp, 0, NString.ToCharArray(val1.StrVal), 0, val1.StrVal.length);
      }
    let l: number = displayConvertor.a_2_date(val1.StrVal, val2.StrVal, (<Task>this.ExpTask).getCompIdx());
    if (l >= 1000000000)
      l = 0;
    super.ConstructMagicNum(resVal, l, StorageAttribute.DATE);
  }


  private eval_op_tval(resVal: ExpVal, val1: ExpVal, val2: ExpVal, displayConvertor: DisplayConvertor,
                       milliSeconds: boolean): void {
    if (val1.StrVal === null || val2.StrVal === null) {
      super.SetNULL(resVal, StorageAttribute.TIME);
      return;
    }
    let pic = new PIC(val2.StrVal, StorageAttribute.TIME, (<Task>this.ExpTask).getCompIdx());
    let l: number = displayConvertor.a_2_time(val1.StrVal, pic, milliSeconds);
    if (l >= 1000000000)
      l = 0;
    super.ConstructMagicNum(resVal, l, StorageAttribute.TIME);
  }


  private eval_op_day(resVal: ExpVal, val1: ExpVal): void {
    this.eval_op_date_brk(resVal, val1.MgNumVal, 0);
  }

  public eval_op_month(resVal: ExpVal, val1: ExpVal): void {
    this.eval_op_date_brk(resVal, val1.MgNumVal, 1);
  }

  private eval_op_year(resVal: ExpVal, val1: ExpVal): void {
    this.eval_op_date_brk(resVal, val1.MgNumVal, 2);
  }

  private eval_op_dow(resVal: ExpVal, val1: ExpVal): void {
    this.eval_op_date_brk(resVal, val1.MgNumVal, 3);
  }

  private eval_op_second(resVal: ExpVal, val1: ExpVal): void {
    this.eval_op_time_brk(resVal, val1.MgNumVal, 2);
  }

  private eval_op_minute(resVal: ExpVal, val1: ExpVal): void {
    this.eval_op_time_brk(resVal, val1.MgNumVal, 1);
  }

  private eval_op_hour(resVal: ExpVal, val1: ExpVal): void {
    this.eval_op_time_brk(resVal, val1.MgNumVal, 0);
  }


  public eval_op_date_brk(resVal: ExpVal, val1: NUM_TYPE, typ: number): void {
    if (val1 === null) {
      super.SetNULL(resVal, StorageAttribute.NUMERIC);
      return;
    }
    let d: number = val1.NUM_2_LONG();
    // -----------------------------------------------------------------------
    // Break data into its components
    // -----------------------------------------------------------------------
    let breakParams: DateBreakParams = DisplayConvertor.Instance.getNewDateBreakParams();
    DisplayConvertor.Instance.date_break_datemode(breakParams, d, false, (<Task>this.ExpTask).getCompIdx());
    let year: number = breakParams.year;
    let month: number = breakParams.month;
    let day: number = breakParams.day;
    let doy: number = breakParams.doy;
    let dow: number = breakParams.dow;
    switch (typ) {
      case 0:
        d = day;
        break;
      case 1:
        d = month;
        break;
      case 2:
        d = year;
        break;
      case 3:
        d = dow;
        break;
      case 4:
        d = UtilDateJpn.getInstance().date_jpn_year_ofs(year, doy);
        break;
      default:
        d = 0;
        break;
    }
    super.ConstructMagicNum(resVal, d, StorageAttribute.NUMERIC);
  }

  private eval_op_time_brk(resVal: ExpVal, val1: NUM_TYPE, typ: number): void {
    if (val1 === null) {
      super.SetNULL(resVal, StorageAttribute.NUMERIC);
      return;
    }
    let d: number = val1.NUM_2_ULONG();
    // -----------------------------------------------------------------------
    // Breake data into its components
    // -----------------------------------------------------------------------
    let breakParams: TimeBreakParams = DisplayConvertor.Instance.getNewTimeBreakParams();
    DisplayConvertor.time_break(breakParams, d);
    let hour: number = breakParams.hour;
    let minute: number = breakParams.minute;
    let second: number = breakParams.second;
    switch (typ) {
      case 0:
        d = hour;
        break;
      case 1:
        d = minute;
        break;
      case 2:
        d = second;
        break;
      default:
        d = 0;
        break;
    }
    super.ConstructMagicNum(resVal, d, StorageAttribute.NUMERIC);
  }


  private eval_op_addDateTime(resVal: ExpVal, dateVal: ExpVal, timeVal: ExpVal, yearsVal: ExpVal,
                              monthsVal: ExpVal, daysVal: ExpVal, hoursVal: ExpVal, minutesVal: ExpVal,
                              secondsVal: ExpVal): void {
    let tmpVal = new ExpVal();

    // values check
    if (dateVal.MgNumVal === null || timeVal.MgNumVal === null) {
      resVal.Attr = StorageAttribute.BOOLEAN;
      resVal.BoolVal = false;
      return;
    }

    // get the time field
    let fldTime: Field = this.GetFieldOfContextTask(timeVal.MgNumVal.NUM_2_LONG());
    super.SetVal(tmpVal, fldTime.getType(), fldTime.getValue(true), null);

    // Add time
    this.eval_op_addtime(resVal, tmpVal, hoursVal, minutesVal, secondsVal);

    let time: number = resVal.MgNumVal.NUM_2_LONG();
    let date: number = Math.floor(time / (60 * 60 * 24)); // if diff is more then 24 hours, remove the full date changes
    time = time % (60 * 60 * 24); // If time is negative, move back a day and change the time
    if (time < 0) {
      date--;
      time = (60 * 60 * 24) - (-time);
    }

    // Get the date field
    let fldDate: Field = this.GetFieldOfContextTask(dateVal.MgNumVal.NUM_2_LONG());
    super.SetVal(tmpVal, fldDate.getType(), fldDate.getValue(true), null);

    // Add the date
    this.eval_op_adddate(resVal, tmpVal, yearsVal, monthsVal, daysVal);

    // Add the result date to the date diff calculated earlier
    date += resVal.MgNumVal.NUM_2_LONG();

    // Set new time and date in fields
    tmpVal.MgNumVal.NUM_4_LONG(time);
    fldTime.setValueAndStartRecompute(tmpVal.ToMgVal(), false, true, false, false);
    fldTime.updateDisplay();

    tmpVal.MgNumVal.NUM_4_LONG(date);
    fldDate.setValueAndStartRecompute(tmpVal.ToMgVal(), false, true, false, false);
    fldDate.updateDisplay();

    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = true;
  }


  private eval_op_difdt(resVal: ExpVal, date1val: ExpVal, time1val: ExpVal, date2val: ExpVal, time2val: ExpVal, difDateVal: ExpVal, difTimeVal: ExpVal): void {

    let tmpVal: ExpVal = new ExpVal();
    tmpVal.MgNumVal = new NUM_TYPE();
    tmpVal.Attr = StorageAttribute.NUMERIC;
    let expVal: ExpVal = tmpVal;

    // values check
    if (difDateVal.MgNumVal === null || difTimeVal.MgNumVal === null) {
      resVal.Attr = StorageAttribute.BOOLEAN;
      resVal.BoolVal = false;
      return;
    }

    // Calculate time difs
    let difDate: number = date1val.MgNumVal.NUM_2_LONG() - date2val.MgNumVal.NUM_2_LONG();
    let difTime: number = time1val.MgNumVal.NUM_2_LONG() - time2val.MgNumVal.NUM_2_LONG();

    if ((difTime < 0) && (difTime > -86400) && (difDate > 0)) {
      difDate--;
      difTime = 86400 - (-difTime);
    }

    // get the fields
    let fldDate: Field = this.GetFieldOfContextTask(difDateVal.MgNumVal.NUM_2_LONG());
    let fldTime: Field = this.GetFieldOfContextTask(difTimeVal.MgNumVal.NUM_2_LONG());

    // Set the dif values
    tmpVal.MgNumVal.NUM_4_LONG(difDate);
    fldDate.setValueAndStartRecompute(tmpVal.ToMgVal(), false, true, false, false);
    fldDate.updateDisplay();

    tmpVal.MgNumVal.NUM_4_LONG(difTime);
    fldTime.setValueAndStartRecompute(tmpVal.ToMgVal(), false, true, false, false);
    fldTime.updateDisplay();

    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = true;
  }


  private eval_op_ndow(resVal: ExpVal, val1: ExpVal, displayConvertor: DisplayConvertor): void {
    if (val1.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.NUMERIC);
      return;
    }
    val1.MgNumVal = this.mul_add(val1.MgNumVal, 0, 6);
    this.eval_op_cdow(resVal, val1.MgNumVal, displayConvertor);
  }


  private eval_op_nmonth(resVal: ExpVal, val1: ExpVal, displayConvertor: DisplayConvertor): void {

    if (val1.MgNumVal == null) {
      super.SetNULL(resVal, StorageAttribute.NUMERIC);
      return;
    }
    val1.MgNumVal = this.mul_add(val1.MgNumVal, 31, -30);
    this.eval_op_cmonth(resVal, val1.MgNumVal, displayConvertor);
  }

  /// <summary>
  ///   Multiply & add to numeric type
  /// </summary>
  public mul_add(num: NUM_TYPE, mul: number, add: number): NUM_TYPE {
    let tmp = new NUM_TYPE();

    if (num === null)
      return null;

    if (mul !== 0) {
      tmp.NUM_4_LONG(mul);
      num = NUM_TYPE.mul(num, tmp);
    }
    if (add !== 0) {
      tmp.NUM_4_LONG(add);
      num = NUM_TYPE.add(num, tmp);
    }
    return num;
  }

  private eval_op_cdow(resVal: ExpVal, val1: NUM_TYPE, displayConvertor: DisplayConvertor): void {
    this.eval_op_date_str(resVal, val1, "WWWWWWWWWWT", displayConvertor);
  }

  private eval_op_cmonth(resVal: ExpVal, val1: NUM_TYPE, displayConvertor: DisplayConvertor): void {
    this.eval_op_date_str(resVal, val1, "MMMMMMMMMMT", displayConvertor);
  }

  public eval_op_date_str(resVal: ExpVal, val1: NUM_TYPE, format: string, displayConvertor: DisplayConvertor): void {
    resVal.Attr = StorageAttribute.ALPHA;
    if (val1 === null) {
      super.SetNULL(resVal, StorageAttribute.ALPHA);
      return;
    }
    let dow: number = val1.NUM_2_ULONG();
    resVal.StrVal = displayConvertor.to_a(resVal.StrVal, 10, dow, format, (<Task>this.ExpTask).getCompIdx());
  }

  /// <summary>
  /// </summary>
  // TODO: Implement Monitor for delay
  private eval_op_delay(val1: ExpVal): void {
  }


  private eval_op_idle(resVal: ExpVal): void {
    let n: number = 0;
    let idleTime: number = ClientManager.Instance.getEnvironment().getIdleTime((<Task>this.ExpTask).getCompIdx());
    if (idleTime > 0) {
      let CurrTimeMilli: number = Misc.getSystemMilliseconds();
      // act_idle ():
      n = Math.floor(Math.floor((CurrTimeMilli - ClientManager.Instance.LastActionTime) / 1000) / idleTime);
    }
    resVal.MgNumVal = new NUM_TYPE();
    resVal.Attr = StorageAttribute.NUMERIC;
    resVal.MgNumVal.NUM_4_LONG(n * idleTime * 10);
  }

  private eval_op_adddate(resVal: ExpVal, val1: ExpVal, val2: ExpVal, val3: ExpVal, val4: ExpVal): void {
    let tries: number;
    if (val1.MgNumVal === null || val2.MgNumVal === null || val3.MgNumVal === null || val4.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.DATE);
      return;
    }
    let date: number = val1.MgNumVal.NUM_2_LONG();
    // -----------------------------------------------------------------------
    // Breake data into its components
    // -----------------------------------------------------------------------
    let breakParams: DateBreakParams = DisplayConvertor.Instance.getNewDateBreakParams();
    DisplayConvertor.Instance.date_break_datemode(breakParams, date, false, (<Task>this.ExpTask).getCompIdx());
    let year: number = breakParams.year;
    let month: number = breakParams.month;
    let day: number = breakParams.day;

    /* 20.7.95 - Hen : Fix bug 1975 */
    if (ClientManager.Instance.getEnvironment().GetDateMode((<Task>this.ExpTask).getCompIdx()) === 'B')
      year = Math.max(year - PICInterface.DATE_BUDDHIST_GAP, 0);
    year += val2.MgNumVal.NUM_2_LONG();
    month += val3.MgNumVal.NUM_2_LONG();
    let day1: number = val4.MgNumVal.NUM_2_LONG();
    let add_day: number = (day === 0 && year !== 0 && month !== 0 && day1 !== 0) ? 1 : 0;
    let month1: number = month + year * 12;
    year = Math.floor((month1 - 1) / 12);
    month = (month1 - 1) % 12 + 1;
    for (tries = 0; tries < 4; tries++) {
      date = DisplayConvertor.Instance.date_4_calender(year, month, day + add_day, 0, false);
      if (date < 1000000000)
        break;
      day--;
    }

    /* FMI-264, 99/01/08, JPNID: MKP99010008                    */
    /* date_4_calender() returns 1000000000L as an invalid date */
    /* in which case date should be 0000/00/00.                 */
    if (date === 1000000000)
      date = 0;
    else {
      date += day1 - add_day;
      date = Math.max(date, 0);
    }
    super.ConstructMagicNum(resVal, date, StorageAttribute.DATE);
  }


  private eval_op_addtime(resVal: ExpVal, val1: ExpVal, val2: ExpVal, val3: ExpVal, val4: ExpVal): void {
    if (val1.MgNumVal === null || val2.MgNumVal === null || val3.MgNumVal === null || val4.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.TIME);
      return;
    }
    let time: number = val1.MgNumVal.NUM_2_ULONG() + val2.MgNumVal.NUM_2_LONG() * 3600 + val3.MgNumVal.NUM_2_LONG() * 60 + val4.MgNumVal.NUM_2_LONG();
    super.ConstructMagicNum(resVal, time, StorageAttribute.TIME);
  }

  private eval_op_bom(resVal: ExpVal, val1: ExpVal): void {
    let breakParams: DateBreakParams;
    if (val1.MgNumVal == null) {
      super.SetNULL(resVal, StorageAttribute.DATE);
      return;
    }
    let date: number = val1.MgNumVal.NUM_2_ULONG();
    if (date !== 0) {
      breakParams = DisplayConvertor.Instance.getNewDateBreakParams();
      DisplayConvertor.Instance.date_break_datemode(breakParams, date, false, (<Task>this.ExpTask).getCompIdx());
      let day: number = breakParams.day;
      date -= (day - 1);
    }
    super.ConstructMagicNum(resVal, date, StorageAttribute.DATE);
  }

  private eval_op_boy(resVal: ExpVal, val1: ExpVal): void {
    let breakParams: DateBreakParams;
    if (val1.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.DATE);
      return;
    }
    let date: number = val1.MgNumVal.NUM_2_ULONG();
    if (date !== 0) {
      breakParams = DisplayConvertor.Instance.getNewDateBreakParams();
      DisplayConvertor.Instance.date_break_datemode(breakParams, date, false, (<Task>this.ExpTask).getCompIdx());
      let year: number = breakParams.year;
      let day: number = 1;
      let month: number = 1;
      if (ClientManager.Instance.getEnvironment().GetDateMode((<Task>this.ExpTask).getCompIdx()) === 'B')
        year = Math.max(year - PICInterface.DATE_BUDDHIST_GAP, 0);
      date = DisplayConvertor.Instance.date_4_calender(year, month, day, 0, false);
    }
    super.ConstructMagicNum(resVal, date, StorageAttribute.DATE);
  }

  private eval_op_eom(resVal: ExpVal, val1: ExpVal): void {
    let breakParams: DateBreakParams;
    if (val1.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.DATE);
      return;
    }
    let date: number = val1.MgNumVal.NUM_2_ULONG();
    if (date !== 0) {
      breakParams = DisplayConvertor.Instance.getNewDateBreakParams();
      DisplayConvertor.Instance.date_break_datemode(breakParams, date, false, (<Task>this.ExpTask).getCompIdx());
      let year: number = breakParams.year;
      let month: number = breakParams.month;
      let day: number = 31;
      if (ClientManager.Instance.getEnvironment().GetDateMode((<Task>this.ExpTask).getCompIdx()) === 'B')
        year = Math.max(year - PICInterface.DATE_BUDDHIST_GAP, 0);
      let tries: number;
      for (tries = 0; tries < 4; tries++) {
        date = DisplayConvertor.Instance.date_4_calender(year, month, day, 0, false);
        if (date < 1000000000)
          break;
        day--;
      }
    }
    super.ConstructMagicNum(resVal, date, StorageAttribute.DATE);
  }

  private eval_op_eoy(resVal: ExpVal, val1: ExpVal): void {
    if (val1.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.DATE);
      return;
    }
    let date: number = val1.MgNumVal.NUM_2_ULONG();
    if (date !== 0) {
      let breakParams: DateBreakParams = DisplayConvertor.Instance.getNewDateBreakParams();
      DisplayConvertor.Instance.date_break_datemode(breakParams, date, false, (<Task>this.ExpTask).getCompIdx());
      let year: number = breakParams.year;
      let month: number = 12;
      let day: number = 31;
      if (ClientManager.Instance.getEnvironment().GetDateMode((<Task>this.ExpTask).getCompIdx()) === 'B')
        year = Math.max(year - PICInterface.DATE_BUDDHIST_GAP, 0);
      date = DisplayConvertor.Instance.date_4_calender(year, month, day, 0, false);
    }
    super.ConstructMagicNum(resVal, date, StorageAttribute.DATE);
  }

  private eval_op_strtok(resVal: ExpVal, val1: ExpVal, val2: ExpVal, val3: ExpVal): void {
    let tmp_s: StringBuilder;
    let tmp_str: string;
    let idx: number;
    let delim: string;
    let ret_str: string = "";
    if (val1.StrVal === null || val2.MgNumVal === null || val3.StrVal === null) {
      super.SetNULL(resVal, StorageAttribute.UNICODE);
    }
    if (!NString.IsNullOrEmpty(val1.StrVal) && val3.StrVal.length > 0) {
      tmp_s = new StringBuilder(val1.StrVal.length + 2);
      idx = val2.MgNumVal.NUM_2_LONG();
      if (idx > 0) {
        delim = NString.TrimEnd(val3.StrVal, this._charsToTrim);
        tmp_s.Append(val1.StrVal);
        if (delim.length === 0) {
          if (idx === 1)
            ret_str = tmp_s.ToString();
        }
        else {
          tmp_str = tmp_s.ToString();
          let i: number;
          for (i = 0; i < idx; i++) {
            ret_str = StrUtil.strstr(tmp_str, delim);
            if (ret_str === null) {
              if (i === idx - 1)
                ret_str = tmp_str;
              break;
            }
            ret_str = tmp_str.substr(0, tmp_str.length - ret_str.length);
            tmp_str = tmp_str.substr(ret_str.length + delim.length);
          }
        }
      }
    }
    if (ret_str !== null) {
      resVal.Attr = StorageAttribute.UNICODE;
      resVal.StrVal = ret_str;
    }
    else {
      resVal.Attr = StorageAttribute.UNICODE;
      resVal.StrVal = "";
    }
    idx = val2.MgNumVal.NUM_2_LONG();
    if (!NString.IsNullOrEmpty(val1.StrVal) && val3.StrVal.length === 0 && idx === 1) {
      resVal.Attr = StorageAttribute.UNICODE;
      resVal.StrVal = val1.StrVal;
    }
  }

  private eval_op_dbround(resVal: ExpVal, val1: ExpVal, val2: ExpVal): void {
    if (val1.MgNumVal === null || val2.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.NUMERIC);
      return;
    }
    resVal.MgNumVal = new NUM_TYPE(val1.MgNumVal);
    let whole: number = val2.MgNumVal.NUM_2_LONG();
    if (whole < 0)
      resVal.MgNumVal.dbRound(-whole);
    else resVal.MgNumVal.round(whole);
    resVal.Attr = StorageAttribute.NUMERIC;
  }

  private eval_op_varpic(resVal: ExpVal, val1: ExpVal, val2: ExpVal): void {
    let fld: Field;
    let ctrl: MgControl;

    // validation checks on the expression arguments
    if (val2.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.UNICODE);
      return;
    }

    if (val1.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.UNICODE);
      return;
    }

    let mode: number = val2.MgNumVal.NUM_2_LONG();
    let itm: number = val1.MgNumVal.NUM_2_LONG();
    resVal.Attr = StorageAttribute.UNICODE;

    try {
      fld = this.GetFieldOfContextTask(itm); // itm starts from A -> 1, but our array starts from 0 -> (itm-1)
    }
    catch (ex) {
      if (ex instanceof Exception) {
        Logger.Instance.WriteExceptionToLog(ex);
        // makeNullString
        fld = null;
      }
      else
        throw ex;
    }

    if (fld === null) {
      // val_pre_s (0) in Magic
      Logger.Instance.WriteExceptionToLogWithMsg("ExpressionEvaluator.eval_op_varpic there is no control number " + itm);
      resVal.StrVal = "";
      return;
    }
    if (mode !== 0) {
      // gets the control associated with the field
      ctrl = fld.getCtrl();

      if (ctrl !== null) {
        // we dont need to check if the control format is an expression since
        // the PIC object always keep an up to date value of the expression resulte
        resVal.StrVal = ctrl.getPIC().getFormat();
        return;
      }
    }
    if (fld.getType() !== StorageAttribute.BLOB && fld.getType() !== StorageAttribute.BLOB_VECTOR) {
      resVal.StrVal = fld.getPicture();
      return;
    }
    resVal.StrVal = "";
    return;
  }


  private eval_op_varattr(resVal: ExpVal, val1: ExpVal): void {
    let fld: Field;
    resVal.Attr = StorageAttribute.ALPHA;
    if (val1.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.ALPHA);
      return;
    }
    let itm: number = val1.MgNumVal.NUM_2_LONG();
    try {
      fld = this.GetFieldOfContextTask(itm);
    }
    catch (ex) {
      if (ex instanceof Exception) {
        Logger.Instance.WriteExceptionToLog(ex);
        fld = null;
      }
      else
        throw ex;
    }

    if (fld === null) {
      Logger.Instance.WriteExceptionToLogWithMsg("ExpressionEvaluator.eval_op_varattr there is no control number " + itm);
      resVal.StrVal = "";
      return;
    }
    let attr: StorageAttribute = fld.getType();
    resVal.StrVal = "" + ExpressionEvaluator.GetAttributeChar(attr);
  }


  private exp_null_val_get(exp_attr: StorageAttribute, opcode: number, null_parm: ExpVal): void {
    let ptr: string = "";
    let num_val: number = 0;

    null_parm.IsNull = true;


    // If the The Attribute is Unknown - use the expected Attribute:
    if (opcode === ExpressionInterface.EXP_OP_NULL) {
      null_parm.Attr = exp_attr;
      if (exp_attr === StorageAttribute.ALPHA)
        ptr = "";

      switch (exp_attr) {
        case StorageAttribute.ALPHA:
        case StorageAttribute.BLOB:
        case StorageAttribute.BLOB_VECTOR:
        case StorageAttribute.MEMO:
          opcode = ExpressionInterface.EXP_OP_NULL_A;
          break;

        case StorageAttribute.NUMERIC:
          opcode = ExpressionInterface.EXP_OP_NULL_N;
          break;

        case StorageAttribute.BOOLEAN:
          opcode = ExpressionInterface.EXP_OP_NULL_B;
          break;

        case StorageAttribute.DATE:
          opcode = ExpressionInterface.EXP_OP_NULL_D;
          break;

        case StorageAttribute.TIME:
          opcode = ExpressionInterface.EXP_OP_NULL_T;
          break;

        case StorageAttribute.UNICODE:
          opcode = ExpressionInterface.EXP_OP_NULL_U;
          break;
      }
    }

    switch (opcode) {
      case ExpressionInterface.EXP_OP_NULL:
      case ExpressionInterface.EXP_OP_NULL_A:
        if (exp_attr !== StorageAttribute.BLOB &&
          exp_attr !== StorageAttribute.BLOB_VECTOR)
          null_parm.Attr = StorageAttribute.ALPHA;
        ptr = "";
        break;

      case ExpressionInterface.EXP_OP_NULL_N:
        null_parm.Attr = StorageAttribute.NUMERIC;
        break;

      case ExpressionInterface.EXP_OP_NULL_B:
        null_parm.Attr = StorageAttribute.BOOLEAN;
        num_val = 0;
        break;

      case ExpressionInterface.EXP_OP_NULL_D:
        null_parm.Attr = StorageAttribute.DATE;
        num_val = NNumber.Parse(PICInterface.DEFAULT_DATE);
        break;

      case ExpressionInterface.EXP_OP_NULL_T:
        null_parm.Attr = StorageAttribute.TIME;
        num_val = NNumber.Parse(PICInterface.DEFAULT_TIME);
        break;

      case ExpressionInterface.EXP_OP_NULL_U:
        if (exp_attr !== StorageAttribute.BLOB &&
          exp_attr !== StorageAttribute.BLOB_VECTOR)
          null_parm.Attr = StorageAttribute.UNICODE;
        ptr = "";
        break;
      case ExpressionInterface.EXP_OP_NULL_O:
        null_parm.Attr = StorageAttribute.BLOB;
        break;
    }

    switch (null_parm.Attr) {
      case StorageAttribute.ALPHA:
      case StorageAttribute.BLOB:
      case StorageAttribute.BLOB_VECTOR:
        null_parm.StrVal = ptr;
        break;

      case StorageAttribute.NUMERIC:
      case StorageAttribute.DATE:
      case StorageAttribute.TIME:
        if (opcode === ExpressionInterface.EXP_OP_NULL_N) {
          // init NULL Numeric number
          let num_value = new Int8Array(NUM_TYPE.NUM_SIZE);
          for (let i: number = 0; i < num_value.length; i++)
            num_value[i] = 0;
          null_parm.MgNumVal = new NUM_TYPE(num_value);
        }
        // Time & Data
        else
          this.ConstructMagicNum(null_parm, num_val, null_parm.Attr);
        break;

      case StorageAttribute.UNICODE:
        null_parm.StrVal = ptr;
        break;

      case StorageAttribute.BOOLEAN:
        null_parm.BoolVal = false; // false is default 4 boolean
        break;

    }
  }

  private exp_get_var(resVal: ExpVal, val1: ExpVal, is_previous: boolean): void;
  private exp_get_var(val1: ExpVal, resVal: ExpVal): void;
  private exp_get_var(resValOrVal1: ExpVal, val1OrResVal: ExpVal, is_previous?: boolean): void {
    if (arguments.length === 3)
      this.exp_get_var_0(resValOrVal1, val1OrResVal, is_previous);
    else
      this.exp_get_var_1(resValOrVal1, val1OrResVal);
  }

  private exp_get_var_0(resVal: ExpVal, val1: ExpVal, is_previous: boolean): void {
    let fld: Field = null;

    // evaluate fld from mgNumVal
    if (val1.MgNumVal !== null) {
      let itm: number = val1.MgNumVal.NUM_2_LONG();
      fld = this.GetFieldOfContextTask(itm);
    }

    // if fld is null, set resVal to null and return
    if (fld === null) {
      super.SetNULL(resVal, StorageAttribute.NONE);
      return;
    }

    if (is_previous)
    // set the flag that will be used by fld.getValue
      (<Task>fld.getTask()).setEvalOldValues(true);

    // first get the value of the field and set it to the result.
    super.SetVal(resVal, fld.getType(), fld.getValue(true), null);

    // now for the null indication.
    if (is_previous) {
      // for previous, the null indication is not on the fld, we should get it from the original record.
      if (fld.isOriginalValueNull())
      // the original value of the record is NULL
        super.SetNULL(resVal, StorageAttribute.NONE);
    }
    // for current value, the null indication is already on the fld.

    else
      resVal.IsNull = fld.isNull();

    if (is_previous)
    // reset the flag.
      (<Task>fld.getTask()).setEvalOldValues(false);
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="val1"></param>
  private eval_op_varmod(resVal: ExpVal, val1: ExpVal): void {
    if (val1.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.BOOLEAN);
      return;
    }
    let itm: number = val1.MgNumVal.NUM_2_LONG();
    let fld: Field = this.GetFieldOfContextTask(itm);

    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = false;

    // QCR 752270 if the the arguments does not represent a valid field return false
    if (fld !== null) {
      let idx: number = fld.getId();
      let dv: DataView = <DataView>(<Task>fld.getTask()).DataView;
      let rec: Record = dv.getCurrRec();
      resVal.BoolVal = !rec.fldValsEqual(dv.getOriginalRec(), idx);
    }
  }

  private eval_op_varinp(resVal: ExpVal, val1: ExpVal): void {
    let i: number = 0;

    if (val1.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.NUMERIC);
      return;
    }

    let expkern_parent: number = val1.MgNumVal.NUM_2_LONG();
    if ((expkern_parent >= 0 && expkern_parent < (<Task>this.ExpTask).getTaskDepth(false)) || expkern_parent === ExpressionEvaluator.TRIGGER_TASK) {
      let tsk: Task = <Task>super.GetContextTask(expkern_parent);
      if (tsk !== null)
        i = tsk.ctl_itm_4_parent_vee(0, tsk.getCurrFieldIdx() + 1);
    }
    super.ConstructMagicNum(resVal, i, StorageAttribute.NUMERIC);
  }

  private eval_op_varname(resVal: ExpVal, val1: ExpVal): void {
    if (val1.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.ALPHA);
      return;
    }

    let itm: number = val1.MgNumVal.NUM_2_LONG();
    let fld: Field = this.GetFieldOfContextTask(itm);
    let buffer: string = (fld !== null) ? fld.getName() : "";
    resVal.StrVal = buffer;
    resVal.Attr = StorageAttribute.ALPHA;
  }


  private eval_op_VarDisplayName(resVal: ExpVal, val1: ExpVal): void {
    resVal.Attr = StorageAttribute.UNICODE;
    resVal.StrVal = "";

    if (val1.MgNumVal !== null) {
      let itm: number = val1.MgNumVal.NUM_2_LONG();
      let fld: Field = this.GetFieldOfContextTask(itm);

      if (fld !== null)
        resVal.StrVal = fld.VarDisplayName;
    }
  }

  /// <summary>
  /// Return the control ID of the control to which item (Data property literal) is attached.
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="val1"></param>
  private eval_op_VarControlID(resVal: ExpVal, val1: ExpVal): void {
    let ret: number = 0;

    if (val1.MgNumVal !== null) {
      let itm: number = val1.MgNumVal.NUM_2_LONG();

      // if itm is trigger task, calculate the item from field.
      if (itm === ExpressionEvaluator.TRIGGER_TASK)
        itm = (<Task>this.ExpTask.GetContextTask()).ctl_itm_4_parent_vee(0, (<Task>this.ExpTask.GetContextTask()).getCurrFieldIdx() + 1);

      ret = (<Task>this.ExpTask.GetContextTask()).GetControlIDFromVarItem(itm - 1);
    }

    resVal.Attr = StorageAttribute.NUMERIC;
    resVal.MgNumVal = new NUM_TYPE();
    resVal.MgNumVal.NUM_4_LONG(ret);
  }

  /// <summary>
  /// Return the choice control's items list according to control ID.
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="val1"></param>
  private eval_op_ControlItemsList(resVal: ExpVal, val1: ExpVal): void {
    resVal.Attr = StorageAttribute.UNICODE;
    resVal.StrVal = "";

    if (val1.MgNumVal !== null) {
      let controlID: number = val1.MgNumVal.NUM_2_LONG();
      let parent: number = 0;

      let refParent: RefParam<number> = new RefParam(parent);
      let mgControl: MgControl = (<Task>this.ExpTask.GetContextTask()).GetControlFromControlID(controlID - 1, refParent);
      parent = refParent.value;

      if (mgControl !== null && mgControl.isChoiceControl())
        resVal.StrVal = mgControl.getForm().GetChoiceControlItemList(mgControl);
    }
  }

  /// <summary>
  /// Return the choice control's display list according to control ID.
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="val1"></param>
  private eval_op_ControlDisplayList(resVal: ExpVal, val1: ExpVal): void {
    resVal.Attr = StorageAttribute.UNICODE;
    resVal.StrVal = "";

    if (val1.MgNumVal !== null) {
      let controlID: number = val1.MgNumVal.NUM_2_LONG();
      let parent: number = 0;

      let refParent: RefParam<number> = new RefParam(parent);
      let mgControl: MgControl = (<Task>this.ExpTask.GetContextTask()).GetControlFromControlID(controlID - 1, refParent);
      parent = refParent.value;

      if (mgControl !== null && mgControl.isChoiceControl())
        resVal.StrVal = mgControl.getForm().GetChoiceControlDisplayList(mgControl);
    }
  }

  private eval_op_viewmod(resVal: ExpVal, val1: ExpVal): void {
    if (val1.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.BOOLEAN);
      return;
    }

    let parent: number = val1.MgNumVal.NUM_2_LONG();
    if ((parent >= 0 && parent < (<Task>this.ExpTask).getTaskDepth(false)) || parent === ExpressionEvaluator.TRIGGER_TASK) {
      let tsk: Task = <Task>super.GetContextTask(parent);
      if (!tsk.isMainProg()) {
        resVal.BoolVal = (<DataView>tsk.DataView).getCurrRec().Modified;
        // record might be modified even if the flag is false (like when there is an update with force up = no
        // in the server the check is comparing all the fields in the view.
        // Here, if the modified is false, we will compare the current rec to the original current rec.
        if (!resVal.BoolVal) {
          let currRec: Record = (<DataView>tsk.DataView).getCurrRec();
          let originalRec: Record = (<DataView>tsk.DataView).getOriginalRec();
          // compare fields between current record and original record. compare only fields that are part of data view.
          resVal.BoolVal = !currRec.isSameRecData(originalRec, true, true);
        }
      }
      else {
        resVal.BoolVal = false;
      }
    }
    else
      resVal.BoolVal = false;

    resVal.Attr = StorageAttribute.BOOLEAN;

  }

  private eval_op_level(resVal: ExpVal, val1: ExpVal): void {
    let outstr: string = "";

    if (val1.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.ALPHA);
      return;
    }
    let parent: number = val1.MgNumVal.NUM_2_LONG();
    if ((parent >= 0 && parent < (<Task>this.ExpTask).getTaskDepth(false)) || parent === ExpressionEvaluator.TRIGGER_TASK) {
      let tsk: Task = <Task>super.GetContextTask(parent);
      outstr = tsk.getBrkLevel();

      /*
       * Check the level of the generation task.
       * A. If it is not RM, return the handler text.
       * B. If it is RM, then we have 3 different situations:
       * 1. If the generation task is Main Program, return "MP".
       * 2. If the generation task is a task whose immediate called task (in the runtime task tree) is a SubForm, return "SUBFORM".
       * 3. In any other case, return the handler text.
       */
      if (parent !== ExpressionEvaluator.TRIGGER_TASK && tsk !== <Task>this.ExpTask) {
        if (outstr.toUpperCase() === ConstInterface.BRK_LEVEL_REC_MAIN.toUpperCase()) {
          if (tsk.isMainProg()) {
            outstr = ConstInterface.BRK_LEVEL_MAIN_PROG;
          }
          else {
            let tskTree: Task[] = new Array<Task>((<Task>this.ExpTask).getTaskDepth(false));
            for (let _ai: number = 0; _ai < tskTree.length; ++_ai)
              tskTree[_ai] = null;
            (<Task>this.ExpTask).pathToRoot(tskTree, false);

            if (parent > 0 && tskTree[parent - 1].isSubFormUnderFrameSet())
              outstr = ConstInterface.BRK_LEVEL_FRAME;

            else if (parent > 0 && tskTree[parent - 1].IsSubForm)
              outstr = ConstInterface.BRK_LEVEL_SUBFORM;
          }
        }
      }
    }
    resVal.StrVal = outstr;
    resVal.Attr = StorageAttribute.ALPHA;
  }


  // get the task's counter (by task generation).
  private eval_op_counter(resVal: ExpVal, val1: ExpVal): void {
    let num: number = 0;
    let parent: number = val1.MgNumVal.NUM_2_LONG();
    if ((parent >= 0 && parent < (<Task>this.ExpTask).getTaskDepth(false)) || parent === ExpressionEvaluator.TRIGGER_TASK) {
      let task: Task = <Task>super.GetContextTask(parent);
      num = <number>((task === null) ? 0 : task.getCounter());
    }
    resVal.Attr = StorageAttribute.NUMERIC;
    resVal.MgNumVal = new NUM_TYPE();
    resVal.MgNumVal.NUM_4_LONG(<number>num);
  }

  private eval_op_emptyDataview(resVal: ExpVal, val1: ExpVal): void {
    let ret: boolean = false;
    let parent: number = val1.MgNumVal.NUM_2_LONG();
    if ((parent >= 0 && parent < (<Task>this.ExpTask).getTaskDepth(false)) || parent === ExpressionEvaluator.TRIGGER_TASK) {
      let tsk: Task = <Task>super.GetContextTask(parent);
      if (tsk !== null && tsk.DataView.isEmptyDataview())
        ret = true;
    }
    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = ret;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="val1"></param>
  private eval_op_mainlevel(resVal: ExpVal, val1: ExpVal): void {
    let outstr: string = "";

    if (val1.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.ALPHA);
      return;
    }

    let parent: number = val1.MgNumVal.NUM_2_LONG();
    if ((parent >= 0 && parent < (<Task>this.ExpTask).getTaskDepth(false)) || parent === ExpressionEvaluator.TRIGGER_TASK) {
      let tsk: Task = <Task>super.GetContextTask(parent);
      outstr = tsk.getMainLevel();
    }
    resVal.StrVal = outstr;
    resVal.Attr = StorageAttribute.ALPHA;
  }


  private eval_op_maindisplay(resVal: ExpVal, val1: ExpVal): void {
    let mainDspIdx: number = 0;
    if (val1.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.NUMERIC);
      return;
    }

    let parent: number = val1.MgNumVal.NUM_2_LONG();
    if ((parent >= 0 && parent < (<Task>this.ExpTask).getTaskDepth(false)) || parent === ExpressionEvaluator.TRIGGER_TASK) {
      let tsk: Task = <Task>super.GetContextTask(parent);
      mainDspIdx = (tsk.getProp(PropInterface.PROP_TYPE_MAIN_DISPLAY)).getValueInt();
    }
    super.ConstructMagicNum(resVal, mainDspIdx, StorageAttribute.NUMERIC);
  }


  private eval_op_IsFirstRecordCycle(resVal: ExpVal, val1: ExpVal): void {
    let isFirstRecCycle: boolean = false;
    if (val1.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.ALPHA);
      return;
    }

    let parent: number = val1.MgNumVal.NUM_2_LONG();
    if ((parent >= 0 && parent < (<Task>this.ExpTask).getTaskDepth(false)) || parent === ExpressionEvaluator.TRIGGER_TASK) {
      let tsk: Task = <Task>super.GetContextTask(parent);
      isFirstRecCycle = tsk.isFirstRecordCycle();
    }
    resVal.BoolVal = isFirstRecCycle;
    resVal.Attr = StorageAttribute.BOOLEAN;

  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="val1"></param>
  private exp_is_default(resVal: ExpVal, val1: ExpVal): void {
    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = false;
    let itm: number = val1.MgNumVal.NUM_2_LONG();
    // itm starts from A->1 but the array starts from 0 -> itm-1
    let fld: Field = (<Task>this.ExpTask).ctl_itm_2_parent_vee(itm - 1);
    if (fld === null)
      return;

    // QCR 928308 - for vectors as vectors ( not per cell of the vector) the Behavior is the same as blobs
    // that is null is allowed and null is default
    if (fld.isNull() && (fld.isNullDefault() || fld.getType() === StorageAttribute.BLOB_VECTOR))
      resVal.BoolVal = true;

    let val: string = fld.getValue(false);
    let defVal: string = fld.getDefaultValue();
    let type: StorageAttribute = fld.getType();

    resVal.BoolVal = ExpressionEvaluator.mgValsEqual(val, fld.isNull(), type, defVal, fld.isNullDefault(), type);
    // value not equivalent to default value function should return FALSE
  }


  private eval_op_curr_row(resVal: ExpVal, val1: ExpVal): void {
    let Result: number = 0;
    if (val1.MgNumVal === null) {
      super.SetNULL(resVal, StorageAttribute.NUMERIC);
      return;
    }

    let Parent: number = val1.MgNumVal.NUM_2_LONG();
    if ((Parent >= 0 && Parent < (<Task>this.ExpTask).getTaskDepth(false)) || Parent === ExpressionEvaluator.TRIGGER_TASK) {
      let tsk: Task = <Task>super.GetContextTask(Parent);
      if (tsk !== null && !tsk.isMainProg())
      // there is no form & row in main program
      {
        let Form: MgForm = <MgForm>tsk.getForm();
        if (Form.getTableCtrl() !== null) {
          let inCompute: boolean = (<DataView>tsk.DataView).getCurrRec().InCompute;
          if (inCompute)
            Result = Form.getDestinationRow() + 1;
          // inner numbering starts from 0, but for user it
          // starts from 1 -> +1
          else {
            Form.getTopIndexFromGUI();
            Result = Form.getVisibleLine() + 1; // inner numbering starts from 0, but for user it starts
            // from 1 -> +1
          }
          if (Result < 0 || Result > Form.getRowsInPage() + 1)
            Result = 0;
        }
      }
    }
    super.ConstructMagicNum(resVal, Result, StorageAttribute.NUMERIC);
  }

  private eval_op_appname(resVal: ExpVal): void {
    resVal.Attr = StorageAttribute.ALPHA;
    resVal.StrVal = ClientManager.Instance.getAppName();
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="resVal"></param>
  private eval_op_prog(resVal: ExpVal): void {
    resVal.Attr = StorageAttribute.ALPHA;
    resVal.StrVal = ((<Task>this.ExpTask).queryTaskPath()).ToString();
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="resVal"></param>
  private eval_op_this(resVal: ExpVal): void {
    let triggerTask: Task = <Task>this.ExpTask;
    let Result: number = 0;

    // EXPKERN_parent = EXPKERN_vee = 0;

    if (triggerTask !== null) {
      // EXPKERN_parent = TRIGGER_TASK;
      Result = ExpressionEvaluator.TRIGGER_TASK;
    }
    super.ConstructMagicNum(resVal, Result, StorageAttribute.NUMERIC);
  }

  /// <summary>
  /// </summary>
  /// <param name = "resVal"></param>
  /// <param name = "Parent"></param>
  /// <param name = "Modes">MODE literal given as mode parameter</param>
  private eval_op_stat(resVal: ExpVal, Parent: ExpVal, Modes: ExpVal): void {
    let Ret: boolean = false;
    let iParent: number = Parent.MgNumVal.NUM_2_LONG();
    if ((iParent >= 0 && iParent < (<Task>this.ExpTask).getTaskDepth(false)) || iParent === ExpressionEvaluator.TRIGGER_TASK) {
      let Tsk: Task = <Task>super.GetContextTask(iParent);
      if (Tsk !== null) {
        let tskMode: string = (Tsk.getMode()).toUpperCase();
        for (let i: number = 0; i < Modes.StrVal.length; i = i + 1) {
          let mode: string = Modes.StrVal.charAt(i).toUpperCase();
          let code: string = this.cst_code_trans_buf('I', "MCDEPLRKSONB", mode, MsgInterface.EXPTAB_TSK_MODE_RT);

          // code not found, it might be English (same as in online).
          if (code === '\0') {
            code = mode.toUpperCase();
            if (code === 'Q')
              code = 'E';
          }
          if (code === tskMode) {
            Ret = true;
            break;
          }
        }
      }
    }
    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = Ret;
  }

  /// <summary>
  /// Returns subform execution mode for the task with the corresponding generation
  /// -1 EThe task is not executed as a subform
  ///  0 EThe task is executed by setting the focus on it
  ///  1 EThe subtask is executed for the first time
  ///  2 EThe task is executed because the Automatic Refresh property or the Subform Refresh event has been
  ///      triggered.
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="generation"></param>
  private eval_op_subformExecMode(resVal: ExpVal, generation: ExpVal): void {
    let subformExecMode: Task_SubformExecModeEnum = Task_SubformExecModeEnum.NO_SUBFORM;
    let iParent: number = generation.MgNumVal.NUM_2_LONG();
    if ((iParent >= 0 && iParent < (<Task>this.ExpTask).getTaskDepth(false)) || iParent === ExpressionEvaluator.TRIGGER_TASK) {
      let task: Task = <Task>super.GetContextTask(iParent);
      if (task !== null) {
        if (task.IsSubForm)
          subformExecMode = task.SubformExecMode;
      }
    }
    super.ConstructMagicNum(resVal, <number>subformExecMode, StorageAttribute.NUMERIC);
  }

  private eval_op_varset(resVal: ExpVal, val: ExpVal, num: ExpVal): void {
    // init returned value
    resVal.BoolVal = true;
    resVal.Attr = StorageAttribute.BOOLEAN;

    if (num.MgNumVal === null) {
      // the varset function always returns true.
      // SetNULL(resVal,STORAGE_ATTR_BOOLEAN);
      return;
    }

    let itm: number = num.MgNumVal.NUM_2_LONG();

    let fld: Field = this.GetFieldOfContextTask(itm);

    if (fld === null) {
      resVal.BoolVal = false;
      return;
    }

    if (StorageAttributeCheck.StorageFldAlphaUnicodeOrBlob(fld.getType(), val.Attr))
      this.ConvertExpVal(val, fld.getType());

    let bufptr: string;
    if (StorageAttributeCheck.isTheSameType(fld.getType(), val.Attr)) {
      switch (fld.getType()) {
        case StorageAttribute.ALPHA:
        case StorageAttribute.UNICODE:
          bufptr = val.StrVal;
          break;

        case StorageAttribute.NUMERIC:
        case StorageAttribute.DATE:
        case StorageAttribute.TIME:
          bufptr = val.MgNumVal.toXMLrecord();
          break;

        case StorageAttribute.BOOLEAN:
          bufptr = val.BoolVal ? "1" : "0";
          break;

        case StorageAttribute.BLOB:
          bufptr = val.ToMgVal();
          break;

        case StorageAttribute.BLOB_VECTOR:
          bufptr = val.ToMgVal();

          // QCR 4486682
          if (!val.IsNull) {
            // check for valid vector in the blob
            if (val.Attr === StorageAttribute.BLOB)
              if (!VectorType.validateBlobContents(val.StrVal))
                bufptr = null;

            if (bufptr != null)
              bufptr = Operation.operUpdateVectors(fld, bufptr);

            if (bufptr != null)
              break;
          }

        // falls through
        default:
          // can't come to this point
          super.SetNULL(resVal, StorageAttribute.BOOLEAN);
          return;
      }
    }
    // it's not the same type of the field and value :
    else {
      // every field has to get it's default value
      bufptr = fld.getDefaultValue();
    }

    if (val.IsNull) {
      // get the null value or the magic default value
      bufptr = fld.getNullValue();
      if (bufptr === null)
        fld.getMagicDefaultValue();
    }
    // QCR 984563 var set in creat mode sould not creat a new record
    // #777700. The record should be marked as updated if the field's task and the expression task are different or
    // the field's task is in Record Suffix. This is same as OL (refer RT::PostVeeUpdate in vew.cpp).
    let setRecordUpdated: boolean = fld.getTask() !== this.ExpTask || (<Task>fld.getTask()).getBrkLevel() === ConstInterface.BRK_LEVEL_REC_SUFFIX;
    fld.setValueAndStartRecompute(bufptr, val.IsNull, true, setRecordUpdated, false);
    fld.updateDisplay();
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="showMessage"></param>
  /// <param name="generation"></param>
  private eval_op_rollback(resVal: ExpVal, showMessage: ExpVal, generation: ExpVal): void {
    let task: Task = (<Task>this.ExpTask.GetContextTask()) || (<Task>this.ExpTask);

    // execute rollback command
    ClientManager.Instance.EventsManager.handleInternalEventWithTask(task, InternalInterface.MG_ACT_ROLLBACK);

    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = true; // in the server we return alwes true
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="source"></param>
  /// <param name="maskOrg"></param>
  /// <param name="resVal"></param>
  private eval_op_like(source: ExpVal, maskOrg: ExpVal, resVal: ExpVal): void {
    let i: number;
    let j: number;
    let Source: string = source.StrVal;
    let MaskOrg: string = maskOrg.StrVal;
    let asteriskCnt: number = 0; // counter of '*' in the source string
    let Same: boolean = true;
    let esc_ch: boolean;
    if (Source === null || MaskOrg === null) {
      super.SetNULL(resVal, StorageAttribute.BOOLEAN);
      return;
    }
    let SourceLen: number = Source.length;
    let MaskLen: number = MaskOrg.length;
    let Mask = new Array(MaskLen);
    let buffer = new StringBuilder(MaskLen);

    // Change in the mask '\\' -> '\', '\*' -> '*', '\?' -> '?',
    //                                 '*' -> ASTERISK_CHR, '?' -> QUESTION_CHR
    for (i = 0, j = 0, esc_ch = false; i < MaskLen; i++) {
      let currChr: string = MaskOrg[i];
      switch (currChr) {
        case '\\':
          if (esc_ch)
            Mask[j++] = currChr;
          esc_ch = !esc_ch;
          break;

        case '*':
          if (esc_ch)
            Mask[j++] = currChr;
          else {
            Mask[j++] = ExpressionEvaluator.ASTERISK_CHR;
            asteriskCnt++;
          }
          esc_ch = false;
          break;

        case '?':
          Mask[j++] = esc_ch ? currChr : ExpressionEvaluator.QUESTION_CHR;
          esc_ch = false;
          break;

        default:
          Mask[j++] = currChr;
          esc_ch = false;
          break;
      }
    }
    MaskLen = j;
    MaskOrg = ExpressionEvaluator.arrToStr(Mask, 0, Mask.length);
    // 1. Find the last '*'
    let ast_last_ptr: number = MaskOrg.lastIndexOf(ExpressionEvaluator.ASTERISK_CHR);

    if (ast_last_ptr === -1)
    // 2. In the case: there is not any '*'
      Same = ExpressionEvaluator.op_like_cmp(Source, MaskOrg);
    else {
      // 2. In the case: there are one or more '*'
      // 2.1 Compare the piece of the string before the first '*'
      for (i = 0; Mask[i] !== ExpressionEvaluator.ASTERISK_CHR && Same; i++, MaskLen--, SourceLen--) {
        if (SourceLen === 0)
          Same = false;
        else Same = (Mask[i] === ExpressionEvaluator.QUESTION_CHR ? true : Mask[i] === Source[i]);
      }
      // i - is index of first '*' in the mask
      Source = Source.substr(i);
      Mask = ExpressionEvaluator.cutArray(Mask, i);

      // 2.2 Compare the all pieces between the '*' and '*'
      while (Same && asteriskCnt !== 1) {
        let ast_ptr: number;
        let tmp_len: number;
        for (ast_ptr = 1, tmp_len = 0; ast_ptr + i !== ast_last_ptr; ast_ptr++ , tmp_len++)
          if (Mask[ast_ptr] === ExpressionEvaluator.ASTERISK_CHR)
            break;
        asteriskCnt--;
        SourceLen = Source.length;
        // ast_ptr - index of next '*' (not first and not last)

        if (tmp_len !== 0) {
          // next index of '*' found
          if (SourceLen > 0)
          // there is still members in source
          {
            buffer.Remove(0, buffer.Length);
            buffer.Append(Source);
            Same = ExpressionEvaluator.op_like_map(buffer, ExpressionEvaluator.arrToStr(Mask, 1, tmp_len + 1), false);
            Source = buffer.ToString();
          }
          else Same = false;
        }
        i += ast_ptr; // move 'pointer' to the next piece of string (between 2 asterisks)
        Mask = ExpressionEvaluator.cutArray(Mask, ast_ptr);
      } // end of while

      if (Mask[0] === ExpressionEvaluator.ASTERISK_CHR)
      // delete last '*'
        Mask = ExpressionEvaluator.cutArray(Mask, 1);

      // 2.3 Compare the piece of the string after the last '*'
      if (Same && (Mask.length > 0)) {
        buffer.Remove(0, buffer.Length);
        buffer.Append(Source);
        Same = ExpressionEvaluator.op_like_map(buffer, ExpressionEvaluator.arrToStr(Mask), true);
      }
    }
    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = Same;
  }

  /// <summary>
  ///   cut source array from special member
  /// </summary>
  /// <param name = "source">array, to cut it</param>
  /// <param name = "from">to cut all member before it in array</param>
  /// <returns> cutted array</returns>
  private static cutArray(source: string[], from: number): string[] {
    let length: number = source.length - from;
    let buffer: string[] = new Array<string>(length);
    for (let curr: number = 0; curr < length; curr++)
      buffer[curr] = source[from + curr];
    return buffer;
  }

  /// <summary>
  ///   implements RepStr
  /// </summary>
  private eval_op_repstr(source: ExpVal, orgSubstr: ExpVal, newSubstr: ExpVal, resVal: ExpVal): void {
    if (source.StrVal === null || orgSubstr.StrVal === null || newSubstr.StrVal === null || !StorageAttributeCheck.IsTypeAlphaOrUnicode(source.Attr) || !StorageAttributeCheck.IsTypeAlphaOrUnicode(orgSubstr.Attr) || !StorageAttributeCheck.IsTypeAlphaOrUnicode(newSubstr.Attr)) {
      super.SetNULL(resVal, StorageAttribute.UNICODE);
      return;
    }

    resVal.StrVal = NString.Replace(source.StrVal, orgSubstr.StrVal, newSubstr.StrVal);
    resVal.Attr = StorageAttribute.UNICODE;
  }

  private static arrToStr(arr: string[]): string;
  private static arrToStr(arr: string[], from: number, to: number): string;
  private static arrToStr(arr: any, from?: number, to?: number): string {
    if (arguments.length === 1)
      return ExpressionEvaluator.arrToStr_0(arr);
    else
      return ExpressionEvaluator.arrToStr_1(arr, from, to);
  }

  /// <summary>
  ///   Make string from array of characters
  /// </summary>
  /// <param name = "arr">to make string from</param>
  /// <returns> string contains all characters from the array</returns>
  private static arrToStr_0(arr: string[]): string {
    return ExpressionEvaluator.arrToStr(arr, 0, arr.length);
  }

  /// <summary>
  ///   Make string from array of characters
  /// </summary>
  /// <param name = "arr">to make string from</param>
  /// <param name = "from">to start copy from array</param>
  /// <param name = "to">to finish copy from array</param>
  /// <returns> string contains all characters from the array</returns>
  private static arrToStr_1(arr: string[], from: number, to: number): string {
    let buffer: StringBuilder = new StringBuilder(to - from);
    for (; from < to; from++)
      buffer.Append(arr[from]);
    return buffer.ToString();
  }

  /// <summary>
  ///   compile 2 strings , regular expression for '?' - any ONE character
  /// </summary>
  /// <param name = "Source">to be checked by pattern</param>
  /// <param name = "MaskOrg">for Regular expression</param>
  /// <returns> true if string muches for the pattern</returns>
  private static op_like_cmp(Source: string, MaskOrg: string): boolean {
    let Same: boolean = true;
    let Mask: string = MaskOrg;
    let SourceLen: number = Source.length;
    let MaskLen: number = MaskOrg.length;
    if (SourceLen < MaskLen)
      Same = false;

    else if (SourceLen > MaskLen)
      Mask = MaskOrg;

    // QCR 743187
    while (Mask.length < SourceLen)
      Mask += " ";

    for (let i: number = 0; i < SourceLen && Same; i++)
      Same = (Mask.charAt(i) === ExpressionEvaluator.QUESTION_CHR || Mask.charAt(i) === Source.charAt(i));

    return Same;
  }

  /// <summary>
  ///   compile 2 strings and move source
  /// </summary>
  /// <param name = "Source">source for checking, CHANGED in process of checking, must be changed
  ///   in accordance to changing after the using of function</param>
  /// <param name = "Mask">for Regular expression</param>
  /// <param name = "end">it the last asterisk in the pattern</param>
  /// <returns> true if string muches for the pattern</returns>
  private static op_like_map(source: StringBuilder, mask: string, end: boolean): boolean {
    let same: boolean = false;
    let ptr: string = source.ToString();
    let i: number = 0;

    // mask is larger then the source. They do not match.
    if (!end && source.Length < mask.length)
      return false;

    let j: number = 0;
    for (j = 0; j < source.Length && !same; j++) {
      same = true;
      if (end) {
        same = ExpressionEvaluator.op_like_cmp(ptr.substr(j), mask);
      }
      else {
        for (i = 0; i < mask.length && same; i++) {
          // If already reached at the end of source string, return false.
          if (j + i === source.Length) {
            return false;
          }
          same = (mask.charAt(i) === ExpressionEvaluator.QUESTION_CHR || mask.charAt(i) === ptr.charAt(j + i));
        }
      }
    }
    if (same) {
      source.Remove(0, source.Length);
      source.Append(ptr.substr(j + i - 1));
    }
    return same;
  }

  /// <summary>
  ///   Get the name of the control being parked on event shooting.
  /// </summary>
  private eval_op_hand_ctrl_name(resVal: ExpVal): void {
    let rtEvt: RunTimeEvent = ClientManager.Instance.EventsManager.getLastRtEvent();
    let currCtrl: MgControl = rtEvt.Control;
    let ctrlName: string;

    if (currCtrl === null || (rtEvt.getType() === ConstInterface.EVENT_TYPE_INTERNAL && rtEvt.getInternalCode() > 1000 && rtEvt.getInternalCode() !== InternalInterface.MG_ACT_VARIABLE && (<Task>currCtrl.getForm().getTask()).getLevel() !== Constants.TASK_LEVEL_CONTROL))
      ctrlName = "";
    else
      ctrlName = currCtrl.Name;

    resVal.StrVal = ctrlName;
    resVal.Attr = StorageAttribute.ALPHA;
  }


  private exp_get_var_1(val1: ExpVal, resVal: ExpVal): void {
    let fldName: string = val1.StrVal;
    let fld: Field = (<Task>this.ExpTask).getFieldByName(fldName);

    if (fld === null) {
      super.SetNULL(resVal, StorageAttribute.NONE);
      return;
    }

    let fldValue: string = fld.getValue(true);
    resVal.IsNull = fld.isNull();
    // ctrl = fld.getControl();
    // pic = (ctrl == null) ? null : ctrl.getPIC();
    super.SetVal(resVal, fld.getType(), fldValue, null);
  }


  private exp_get_indx(val1: ExpVal, resVal: ExpVal): void {
    let index: number = (<Task>this.ExpTask.GetContextTask()).getIndexOfFieldByName(val1.StrVal);
    super.ConstructMagicNum(resVal, index, StorageAttribute.NUMERIC);
  }

  /// <summary>
  ///   get needed Field from var functions
  /// </summary>
  /// <param name = "itm">number of item
  /// </param>
  /// <returns> field  from which an event was triggered or field of itm index of the variable
  /// </returns>
  getField(itm: number): Field {
    let fld: Field = (itm !== ExpressionEvaluator.TRIGGER_TASK) ? (<Task>this.ExpTask).ctl_itm_2_parent_vee(itm - 1) : ClientManager.Instance.EventsManager.getCurrField();
    return fld;
  }

  /// <summary>
  /// </summary>
  /// <param name="itm"></param>
  /// <returns></returns>
  private GetFieldOfContextTask(itm: number): Field {
    return (itm !== ExpressionEvaluator.TRIGGER_TASK) ? (<Task>this.ExpTask.GetContextTask()).ctl_itm_2_parent_vee(itm - 1) : ClientManager.Instance.EventsManager.getCurrField();
  }

  /// <summary>
  ///   remove spaces from the edges of the string
  ///   this is a high performance implementation that does not create unnecessary Strings
  /// </summary>
  /// <param name = "s">the source string</param>
  /// <param name = "type">Left, Right, Both</param>
  private static trimStr(s: string, type: string): string {
    let l: number = 0;

    if (NString.IsNullOrEmpty(s))
      return s;


    let r: number = s.length - 1;

    // trim the left side
    if (type !== 'R') {
      while (l < s.length && s.charAt(l) === ' ')
        l++;
    }

    // trim the right side
    if (type !== 'L') {
      while (r >= l && s.charAt(r) === ' ')
        r--;
    }

    r++; // point the right bound of the string (exclusive)
    return r > l ? s.substr(l, (r) - (l)) : "";
  }

  /// <summary>
  ///   compare 2 magic values and return true if they are equal
  /// </summary>
  /// <param name = "aVal">the first value to compare</param>
  /// <param name = "aIsNull">true if the first value is null</param>
  /// <param name = "aDataType">the data type of the first value</param>
  /// <param name = "bVal">the second value to compare</param>
  /// <param name = "bIsNull">true if the second value is null</param>
  /// <param name = "bDataType">the data type of the second value</param>
  static mgValsEqual(aVal: string, aIsNull: boolean, aDataType: StorageAttribute, bVal: string, bIsNull: boolean, bDataType: StorageAttribute): boolean {
    let a: ExpVal = null;
    let b: ExpVal = null;
    let result: boolean = false;

    // if one of aVal or bVal has a null Java value and has a boolean data type
    // then don't enter the "if block" because the val_cmp_any() method will
    // treat that value as false, so it might return a bad result
    if (aIsNull === bIsNull && (aIsNull || (aVal !== null && bVal !== null))) {
      try {
        a = new ExpVal(aDataType, aIsNull, aVal);
        b = new ExpVal(bDataType, bIsNull, bVal);
        result = (ExpressionEvaluator.val_cmp_any(a, b, false) === 0);
      }
      catch (nullValueException) {
        // QCR 983332 if both values are null then they are equal
        if (nullValueException instanceof NullValueException) {
          if (a.IsNull && b.IsNull)
            result = true;
        }
        else
          throw nullValueException;
      }
    }
    return result;
  }

  /// <summary>
  ///   funtion that get the logical name translate
  /// </summary>
  /// <param name = "str"></param>
  /// <param name = "resVal"></param>
  private eval_op_translate(str: ExpVal, resVal: ExpVal): void {
    resVal.Attr = StorageAttribute.ALPHA;
    resVal.StrVal = "";

    let name: string = str.StrVal;
    if (NString.IsNullOrEmpty(name))
      super.SetNULL(resVal, StorageAttribute.ALPHA);
    else
      resVal.StrVal = ClientManager.Instance.getEnvParamsTable().translate(name);
  }

  /// <summary>
  ///   function that get a string and format
  ///   and change the string to be convert as the format
  /// </summary>
  private eval_op_astr(source: ExpVal, format: ExpVal, resVal: ExpVal): void {
    resVal.Attr = StorageAttribute.UNICODE;

    if (source.StrVal === null || format.StrVal === null) {
      super.SetNULL(resVal, StorageAttribute.UNICODE);
      return;
    }

    if (format.StrVal.length > 0 && source.StrVal.length > 0) {
      let pic: PIC = new PIC(ExpressionEvaluator.set_a_pic(format.StrVal), StorageAttribute.UNICODE, (<Task>this.ExpTask).getCompIdx());
      resVal.StrVal = DisplayConvertor.Instance.mg2disp(source.ToMgVal(), null, pic, false, false, (<Task>this.ExpTask).getCompIdx(), true, false);
    }
  }

  /// <summary>
  ///   calculates the attribute of a vector cells
  /// </summary>
  /// <param name = "vec">- the actuall vector not a 'var' literal </param>
  /// <param name = "res"></param>
  private static eval_op_vecCellAttr(vec: ExpVal, res: ExpVal): void {
    // return type is allway alpha
    res.Attr = StorageAttribute.ALPHA;
    res.IsNull = false;
    let attr: StorageAttribute = StorageAttribute.NONE;

    // if the vector is null take the type from the field
    // QCR 928308 && 426618
    if (vec.IsNull && vec.VectorField !== null) {
      attr = vec.VectorField.getCellsType();
    }
    else if (ExpressionEvaluator.IsValidVector(vec))
    // if it a valid vector take from vector
    {
      attr = VectorType.getCellsAttr(vec.StrVal);
    }

    res.StrVal = "" + ExpressionEvaluator.GetAttributeChar(attr);
  }

  /// <summary>
  ///   returns a cells value from a vector
  /// </summary>
  /// <param name = "vec">- the actuall vector not a 'var' literal</param>
  /// <param name = "cell">- the cell index to get </param>
  /// <param name = "res"></param>
  private eval_op_vecGet(vec: ExpVal, cell: ExpVal, res: ExpVal): void {
    if (cell.MgNumVal === null || !ExpressionEvaluator.IsValidVector(vec) || cell.MgNumVal.NUM_2_LONG() <= 0) {
      res.IsNull = true;
    }
    else {
      let cellAttr: StorageAttribute;
      let cellVal: string;
      if (vec.VectorField !== null) {
        cellAttr = vec.VectorField.getCellsType();
        cellVal = (<Field>vec.VectorField).getVecCellValue(cell.MgNumVal.NUM_2_LONG());
      }
      else {
        let vector = new VectorType(vec.StrVal);
        cellVal = vector.getVecCell(cell.MgNumVal.NUM_2_LONG());
        cellAttr = vector.getCellsAttr();
      }

      // check the return value type type
      if (cellVal == null)
        res.IsNull = true;
      else {
        switch (cellAttr) {
          case StorageAttribute.ALPHA:
          case StorageAttribute.MEMO:
            res.Attr = StorageAttribute.ALPHA;
            res.StrVal = cellVal;
            break;

          case StorageAttribute.UNICODE:
            res.Attr = cellAttr;
            res.StrVal = cellVal;
            break;

          case StorageAttribute.BLOB:
            res.Attr = cellAttr;
            res.StrVal = cellVal;
            res.IncludeBlobPrefix = true;
            break;

          case StorageAttribute.BLOB_VECTOR:
            res.Attr = cellAttr;
            res.StrVal = cellVal;
            res.IncludeBlobPrefix = true;
            break;

          case StorageAttribute.NUMERIC:
            res.Attr = cellAttr;
            res.MgNumVal = new NUM_TYPE(cellVal);
            break;

          case StorageAttribute.DATE:
            res.Attr = cellAttr;
            res.MgNumVal = new NUM_TYPE(cellVal);
            break;

          case StorageAttribute.TIME:
            res.Attr = cellAttr;
            res.MgNumVal = new NUM_TYPE(cellVal);
            break;

          case StorageAttribute.BOOLEAN:
            res.Attr = cellAttr;
            res.BoolVal = DisplayConvertor.toBoolean(cellVal);
            break;

          default:
            throw new ApplicationException("in ExpressionEvaluator.eval_op_vecGet unknowen storage type: " +
              cellAttr);
        }
      }
    }
  }

  /// <summary>
  ///   returns the size of the vector
  /// </summary>
  /// <param name = "vec">- the actuall vector not a 'var' literal</param>
  /// <param name = "res"></param>
  private eval_op_vecSize(vec: ExpVal, res: ExpVal): void {
    // the resulte will always be numeric
    res.Attr = StorageAttribute.NUMERIC;
    res.IsNull = false;
    res.MgNumVal = new NUM_TYPE();

    res.MgNumVal.NUM_4_LONG(-1); // if there is a problem return -1
    // QCR 426618
    if (ExpressionEvaluator.IsValidVector(vec))
      res.MgNumVal.NUM_4_LONG(<number>new VectorType(vec.StrVal).getVecSize());
  }

  /// <summary>
  ///   sets the value of a given cell
  /// </summary>
  /// <param name = "vec">-  a 'var' literal pointing to the vector</param>
  /// <param name = "cell">- the cell index to set</param>
  /// <param name = "newVal">- the value to be set</param>
  /// <param name = "res"></param>
  private eval_op_vecSet(vec: ExpVal, cell: ExpVal, newVal: ExpVal, res: ExpVal): void {
    // result is logical
    res.Attr = StorageAttribute.BOOLEAN;
    res.BoolVal = false;

    if (vec.MgNumVal !== null && cell.MgNumVal !== null) {
      let vecField: Field;
      try {
        vecField = <Field>this.getField(vec.MgNumVal.NUM_2_LONG());
      }
      catch (ex) {
        if (ex instanceof Exception) {
          Logger.Instance.WriteExceptionToLog(ex);
          vecField = null;
        }
        else
          throw ex;
      }


      if ((StorageAttributeCheck.IsTypeAlphaOrUnicode(vecField.getCellsType()) && StorageAttributeCheck.IsTypeAlphaOrUnicode(newVal.Attr)) || (vecField !== null && (vecField.IsVirtual || vecField.getTask().getMode() === Constants.TASK_MODE_CREATE || vecField.DbModifiable) && vecField.getType() === StorageAttribute.BLOB_VECTOR && (StorageAttributeCheck.isTheSameType(vecField.getCellsType(), newVal.Attr) || newVal.IsNull || (StorageAttributeCheck.IsTypeAlphaOrUnicode(newVal.Attr) && vecField.getCellsType() === StorageAttribute.BLOB))))
      // allow alpha into blob rtf
      {
        // QCR 745541
        // convert the alpha data into blob
        if (StorageAttributeCheck.IsTypeAlphaOrUnicode(newVal.Attr) && vecField.getCellsType() === StorageAttribute.BLOB) {
          this.ConvertExpVal(newVal, StorageAttribute.BLOB);
        }

        res.BoolVal = vecField.setCellVecValue(cell.MgNumVal.NUM_2_LONG(), newVal.ToMgVal(), newVal.IsNull);
      }
    }
  }

  /// <summary>
  ///   returns the number of tokens in the string acourding to the given delimeters
  ///   If the SourceString is empty, return value is 0.
  ///   If the delimiter was not found  in the SourceString or was empty, return value is 1.
  /// </summary>
  /// <param name = "sourceString">- the data string</param>
  /// <param name = "delimiter">the delimeter</param>
  /// <param name = "resVal"></param>
  private eval_op_strTokenCnt(sourceString: ExpVal, delimiter: ExpVal, resVal: ExpVal): void {
    // the return value is always numeric
    resVal.Attr = StorageAttribute.NUMERIC;
    resVal.MgNumVal = new NUM_TYPE();

    // the result
    let res: number = 0;

    // continue only if the source string exists and is not empty
    if (!sourceString.IsNull && sourceString.StrVal !== null && NString.TrimEnd(sourceString.StrVal, this._charsToTrim).length !== 0) {
      // if the delimiter is empty
      if (delimiter.IsNull || NString.TrimEnd(delimiter.StrVal, this._charsToTrim).length === 0)
        res = 1;
      // find the delimiter in the source string
      else {
        // if the delimiter was not found in the data
        let tokensSize: number = this.strTokenCount(sourceString.StrVal, delimiter.StrVal);
        if (tokensSize === 0)
          res = 1;
        else
          res = tokensSize;
      }
    }
    // return the res value
    resVal.MgNumVal.NUM_4_LONG(res);
  }

  /// <summary>
  ///   This function returns the index of the given token within the source
  ///   string or 0 if the token was not found.
  ///   If the SourceString or the token are empty, return value is 0.
  /// </summary>
  private eval_op_strTokenIdx(sourceString: ExpVal, token: ExpVal, delimiter: ExpVal, resVal: ExpVal): void {
    // the return value is always numeric
    resVal.Attr = StorageAttribute.NUMERIC;
    resVal.MgNumVal = new NUM_TYPE();

    // the result
    let res: number = 0;

    // continue only if the source string exists and is not empty
    // and the token exist and not empty
    if (!sourceString.IsNull && sourceString.StrVal !== null && !token.IsNull && token.StrVal !== null && NString.TrimEnd(sourceString.StrVal, this._charsToTrim).length !== 0 && token.StrVal.trim().length > 0) {

      // if the delimiter is empty check if the data equals to the token
      if (!delimiter.IsNull && NString.TrimEnd(delimiter.StrVal, this._charsToTrim).length !== 0)
        res = this.strTokenIndex(sourceString.StrVal, delimiter.StrVal, token.StrVal);

      else if (sourceString.StrVal === token.StrVal)
        res = 1;
      else
        res = 0;
    }
    // return the res value
    resVal.MgNumVal.NUM_4_LONG(res);
  }

  /// <summary>
  /// Find a given token index in a given string (1 base)
  /// </summary>
  /// <param name="source">The string to search on</param>
  /// <param name="delimiter">The delimiter</param>
  /// <param name="token">The token to search</param>
  /// <returns></returns>
  private strTokenIndex(source: string, delimiter: string, token: string): number {
    // add the delimiter at the front and end of the string and the token
    // this will help us if finding tokens that are at the beginning/end of the string.
    let trimDelim: string = NString.TrimEnd(delimiter, this._charsToTrim);
    let trimSource: string = trimDelim + NString.TrimEnd(source, this._charsToTrim) + trimDelim;
    let trimToken: string = (token !== null) ? NString.TrimEnd(token, this._charsToTrim) : null;

    if (trimToken === null)
      return 0;
    // surround the token with delimiters
    trimToken = trimDelim + trimToken + trimDelim;

    let tokenOffset: number = trimSource.indexOf(trimToken);

    if (tokenOffset === -1)
      return 0;
    else {
      // The token count is the number of tokens till our token offset +1
      // since we added 1 token before the string, we will have to subtract 1
      let tokenIndex: number = this.strTokenCount(trimSource.substr(0, tokenOffset + trimDelim.length), trimDelim);
      tokenIndex--;
      return tokenIndex;
    }
  }

  /// <summary>
  /// Count the tokens
  /// </summary>
  /// <param name="source">The string to split</param>
  /// <param name="delimiter">The delimitrer</param>
  /// <returns></returns>
  private strTokenCount(source: string, delimiter: string): number {
    let counter: number = 1;
    let trimDelim: string = NString.TrimEnd(delimiter, this._charsToTrim);
    let trimSource: string = NString.TrimEnd(source, this._charsToTrim);

    let delimLength: number = trimDelim.length;
    let data: string = trimSource;
    let fromOffset: number = 0;
    let delimiterOffset: number = 0;

    // empty string. no tokens.
    if (source === null || source.length === 0)
      return 0;

    delimiterOffset = data.indexOf(trimDelim, fromOffset);
    // find the number of tokens by counting the delimiters + 1
    while (delimiterOffset >= 0) {
      counter++;

      // start next search after the delimiter
      fromOffset = delimiterOffset + delimLength;

      delimiterOffset = data.indexOf(trimDelim, fromOffset)
    }
    return counter;
  }

  private eval_op_blobsize(resVal: ExpVal, blobVal: ExpVal): void {
    let size: number = 0;
    switch (blobVal.Attr) {
      case StorageAttribute.BLOB_VECTOR:
        size = <number>VectorType.getVecSize(blobVal.StrVal);
        break;
      case StorageAttribute.BLOB:
        size = BlobType.getBlobSize(blobVal.StrVal);
        break;
      default:
        break;
    }
    resVal.Attr = StorageAttribute.NUMERIC;
    resVal.MgNumVal = new NUM_TYPE();
    resVal.MgNumVal.NUM_4_LONG(size);
  }

  private eval_op_iscomponent(resVal: ExpVal): void {
    let currTsk: Task = ClientManager.Instance.EventsManager.getCurrTask() || (<Task>this.ExpTask);

    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = (currTsk.getCompIdx() !== 0);
  }

  /// <summary>
  ///   Find and Execute user defined function
  /// </summary>
  private eval_op_ExecUserDefinedFunc(funcName: string, Exp_params: ExpVal[], resVal: ExpVal, expectedType: StorageAttribute): void {
    let rtEvt: RunTimeEvent = new RunTimeEvent(<Task>this.ExpTask);
    rtEvt.setType(ConstInterface.EVENT_TYPE_USER_FUNC);
    rtEvt.setUserDefinedFuncName(funcName);

    let evtHanPos: EventHandlerPosition = new EventHandlerPosition();
    evtHanPos.init(rtEvt);

    let handler: EventHandler = evtHanPos.getNext();
    let argsMatch: boolean = handler !== null && handler.argsMatch(Exp_params);
    let val: ExpVal = null;
    let valIniated: boolean = false;

    if (argsMatch) {
      // if there is a handler change the handler's context task to the event's task
      let handlerContextTask: Task = <Task>handler.getTask().GetContextTask();
      // If user-defined function is executed from handler which is invoked from  context task already,
      // then do not change the context task again.
      if (handler.getTask() === <Task>handler.getTask().GetContextTask())
        handler.getTask().SetContextTask(rtEvt.getTask());

      let argList: ArgumentsList = new ArgumentsList(Exp_params);

      rtEvt.setArgList(argList);
      // if the execution of the user defined function will go to the server, we don't want it to continue
      // any other execution on the server, like if we are in the middle of raise event or something
      // like that because the server cannot know on which operation we are currently on and which exprssion
      // and which part of the expression we are evaluating
      ClientManager.Instance.EventsManager.pushNewExecStacks();
      handler.execute(rtEvt, false, false);
      ClientManager.Instance.EventsManager.popNewExecStacks();

      // evaluate the return value of the user defined function
      let exp: Expression = handler.getTask().getExpById(handler.getEvent().getUserDefinedFuncRetExp());
      if (exp !== null) {
        val = exp.evaluateWithResType(expectedType);
        valIniated = true;
      }

      // restoring the context
      handler.getTask().SetContextTask(handlerContextTask);
    }
    if (!valIniated) {
      if (expectedType === StorageAttribute.NONE) {
        expectedType = StorageAttribute.ALPHA;
      }
      val = new ExpVal(expectedType, true, null);
    }
    // copy contents from the Val helper variable to the resVal parameter.
    resVal.Copy(val);
  }

  /// <summary>(private)
  /// add values to clipboard
  /// </summary>
  /// <param name="vals">list values (val1, format1, val2, format2..)</param>
  /// <returns></returns>
  eval_op_clipAdd(vals: ExpVal[]): boolean {
    for (let i: number = 0; i < vals.length - 1; i += 2) {
      if (!vals[i].IsNull && !vals[i + 1].IsNull && (vals[i + 1].Attr === StorageAttribute.ALPHA || vals[i + 1].Attr === StorageAttribute.UNICODE)) {
        if (i > 0)
          Manager.ClipboardAdd("\t"); // a tab character should be present between values
        let mgVal: string = vals[i].ToMgVal();
        let pic: PIC = new PIC(vals[i + 1].StrVal, vals[i].Attr, this.ExpTask.getCompIdx());
        let val: string = DisplayConvertor.Instance.mg2disp(mgVal, null, pic, false, this.ExpTask.getCompIdx(), false);

        Manager.ClipboardAdd(val);
      }
    }
    Manager.ClipboardAdd("\r\n"); // new line placement at the end
    return true;
  }

  /// <summary>(private)
  /// places the buffer created by the ClipAdd() into the clipboard
  /// </summary>
  /// <param name="resVal"></param>
  private eval_op_clipwrite(resVal: ExpVal): void {
    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.IsNull = false;
    let currTask: Task = <Task>this.ExpTask.GetContextTask();
    resVal.BoolVal = Manager.ClipboardWrite(currTask);
  }

  /// <summary>(private)
  /// returns the contents from clipboard
  /// </summary>
  /// <param name="resVal">contents from clipboard</param>
  private eval_op_clipread(resVal: ExpVal): void {
    resVal.Attr = StorageAttribute.UNICODE;
    resVal.StrVal = Manager.ClipboardRead();
    if (NString.IsNullOrEmpty(resVal.StrVal))
      resVal.IsNull = true;
  }

  /// <summary>
  ///   returns the internal name of the task
  /// </summary>
  private eval_op_publicName(resVal: ExpVal, Parent: ExpVal): void {
    let publicName: string = "NULL";

    let iParent: number = Parent.MgNumVal.NUM_2_LONG();
    if ((iParent >= 0 && iParent < (<Task>this.ExpTask).getTaskDepth(false)) || iParent === ExpressionEvaluator.TRIGGER_TASK) {
      let task: Task = <Task>super.GetContextTask(iParent);
      if (task !== null && task.isProgram() && !task.isMainProg())
        publicName = task.getPublicName();
    }

    resVal.Attr = StorageAttribute.ALPHA;
    resVal.StrVal = publicName;
  }

  /// <summary>
  ///   returns the external task ID of the task
  /// </summary>
  private eval_op_taskId(resVal: ExpVal, Parent: ExpVal): void {
    let taskId: string = "NULL";

    let iParent: number = Parent.MgNumVal.NUM_2_LONG();
    if ((iParent >= 0 && iParent < (<Task>this.ExpTask).getTaskDepth(false)) || iParent === ExpressionEvaluator.TRIGGER_TASK) {
      let task: Task = <Task>super.GetContextTask(iParent);
      if (task !== null)
        taskId = task.getExternalTaskId();
    }

    resVal.Attr = StorageAttribute.ALPHA;
    resVal.StrVal = taskId;
  }

  /// <summary>
  ///   returns the number of cached records
  /// </summary>
  private eval_op_dbviewsize(resVal: ExpVal, Parent: ExpVal): void {
    let size: number = 0;

    let iParent: number = Parent.MgNumVal.NUM_2_LONG();
    if ((iParent >= 0 && iParent < (<Task>this.ExpTask).getTaskDepth(false)) || iParent === ExpressionEvaluator.TRIGGER_TASK) {
      let task: Task = <Task>super.GetContextTask(iParent);
      if (task !== null && (<DataView>task.DataView).HasMainTable) {
        if (task.checkProp(PropInterface.PROP_TYPE_PRELOAD_VIEW, false)) {
          size = (<DataView>task.DataView).DBViewSize;
        }
        else if (task.isTableWithAbsolutesScrollbar())
          size = (<DataView>task.DataView).TotalRecordsCount;
      }
    }
    super.ConstructMagicNum(resVal, size, StorageAttribute.NUMERIC);
  }

  /// <summary>
  ///   returns the numeric value representing the sequential number
  ///   of a record in a cached view
  /// </summary>
  private eval_op_dbviewrowidx(resVal: ExpVal, Parent: ExpVal): void {
    let idx: number = 0;

    let iParent: number = Parent.MgNumVal.NUM_2_LONG();
    if ((iParent >= 0 && iParent < (<Task>this.ExpTask).getTaskDepth(false)) || iParent === ExpressionEvaluator.TRIGGER_TASK) {
      let task: Task = <Task>super.GetContextTask(iParent);
      if (task !== null && task.checkProp(PropInterface.PROP_TYPE_PRELOAD_VIEW, false)) {
        /* QCR# 969723 - Do not return the row idx untill the record is commited.  */
        if ((<DataView>task.DataView).getCurrRec().getMode() !== DataModificationTypes.Insert) {
          idx = task.DataviewManager.CurrentDataviewManager.GetDbViewRowIdx();
        }
      }
    }
    super.ConstructMagicNum(resVal, idx, StorageAttribute.NUMERIC);
  }

  /// <summary>
  ///   for Browser Control only: execute java script on on the browser Control
  /// </summary>
  eval_op_browserExecute(valStack: Stack<ExpVal>, resVal: ExpVal, nArgs: number): void {
    let Exp_parms: ExpVal[] = new Array<ExpVal>(nArgs);

    // Read parameters
    for (let i: number = nArgs - 1; i >= 0; i = i - 1) {
      Exp_parms[i] = <ExpVal>valStack.pop();
    }
    let controlName: ExpVal = Exp_parms[0];
    let text: ExpVal = Exp_parms[1];
    let sync: ExpVal = Exp_parms[2];
    let language: string = "JScript";

    if (nArgs === 4)
      language = Exp_parms[3].StrVal; // language

    super.eval_op_browserExecute_DO(resVal, controlName, text, sync, language);
  }

  /// <summary>
  ///   Call the Mls translation to return the translation of 'fromString'.
  /// </summary>
  private eval_op_MlsTrans(resVal: ExpVal, fromString: ExpVal): void {
    resVal.Attr = StorageAttribute.UNICODE;
    resVal.StrVal = "";

    resVal.StrVal = ClientManager.Instance.getLanguageData().translate(NString.TrimEnd(fromString.StrVal, this._charsToTrim));
  }

  /// <summary>
  ///   Implements StrBuild
  /// </summary>
  private eval_op_StrBuild(valStack: Stack<ExpVal>, resVal: ExpVal, nArgs: number): void {
    let Exp_parms: ExpVal[] = new Array<ExpVal>(nArgs);

    // Read parameters
    for (let i: number = 0; i < nArgs; i++)
      Exp_parms[nArgs - 1 - i] = <ExpVal>valStack.pop();
    this.val_cpy(Exp_parms[0], resVal);

    let resultStr: StringBuilder = new StringBuilder(resVal.StrVal);
    // For each parameter, search "@n@" string in the given string.
    // If found, and if it is not preceded by '\'
    for (let i: number = 1; i < nArgs; i++) {
      let toReplace: string = "@" + i.toString().trim() + "@";
      let indexFrom: number = 0;
      while (indexFrom !== -1) {
        let nextIndex: number = resultStr.ToString().indexOf(toReplace, indexFrom);
        if (nextIndex === -1)
          break;

        let precededBySlash: boolean = false;
        let shashIndex: number = resultStr.ToString().indexOf("\\" + toReplace, indexFrom);
        if (shashIndex !== -1)
          precededBySlash = true;

        // if '\' is found check if, it is referring the current occurrance of @n@
        if ((precededBySlash && nextIndex !== shashIndex + 1) || !precededBySlash) {
          resultStr.Replace(resultStr.ToString(nextIndex, nextIndex + toReplace.length - nextIndex), Exp_parms[i].StrVal.trim(), nextIndex, nextIndex + toReplace.length - nextIndex);
          indexFrom = nextIndex + Exp_parms[i].StrVal.trim().length;
        }
        else
          indexFrom = nextIndex + 1;
      }
    }
    resultStr.Replace("\\@", "@");
    resVal.StrVal = resultStr.ToString();
  }

  /// <summary>
  ///   Add user ranges on Task..
  /// </summary>
  /// <param name = "resVal">Will return BoolVal.</param>
  /// <param name="varnum"> varnum contains var num on which range is specified.</param>
  /// <param name="min"> min contains min range value.</param>
  /// <param name="max"> max contains max range value.</param>
  private eval_op_range_add(resVal: ExpVal, Exp_params: ExpVal[]): void {
    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = this.add_rt_ranges(Exp_params, false);
  }

  /// <summary>
  ///   Free user ranges on Task..
  /// </summary>
  /// <param name = "resVal">Will return BoolVal.</param>
  /// <param name = "parent"> parent contains generation of the task.</param>
  private eval_op_range_reset(resVal: ExpVal, parent: ExpVal): void {
    resVal.Attr = StorageAttribute.BOOLEAN;

    let iParent: number = parent.MgNumVal.NUM_2_LONG();
    if ((iParent >= 0 && iParent < (<Task>this.ExpTask).getTaskDepth(false)) || iParent === ExpressionEvaluator.TRIGGER_TASK) {
      let task: Task = <Task>super.GetContextTask(iParent);
      if (task !== null) {
        let command: IClientCommand = CommandFactory.CreateDataViewCommand(task.getTaskTag(), DataViewCommandType.ResetUserRange);
        task.DataviewManager.Execute(command);

        resVal.BoolVal = true;
      }
    }
  }

  /// <summary>
  ///   Add user locates on Task..
  /// </summary>
  /// <param name = "resVal">Will return BoolVal.</param>
  /// <param name="varnum"> varnum contains var num on which range is specified.</param>
  /// <param name="min"> min contains min range value.</param>
  /// <param name="max"> max contains max range value.</param>
  private eval_op_locate_add(resVal: ExpVal, Exp_params: ExpVal[]): void {
    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = this.add_rt_ranges(Exp_params, true);
  }

  /// <summary>
  ///   Free user locates on Task..
  /// </summary>
  /// <param name = "resVal">Will return BoolVal.</param>
  /// <param name = "parent"> parent contains generation of the task.</param>
  private eval_op_locate_reset(resVal: ExpVal, parent: ExpVal): void {
    resVal.Attr = StorageAttribute.BOOLEAN;
    let iParent: number = parent.MgNumVal.NUM_2_LONG();
    if ((iParent >= 0 && iParent < (<Task>this.ExpTask).getTaskDepth(false)) || iParent === ExpressionEvaluator.TRIGGER_TASK) {
      let task: Task = <Task>super.GetContextTask(iParent);
      if (task !== null) {
        let command: IClientCommand = CommandFactory.CreateDataViewCommand(task.getTaskTag(), DataViewCommandType.ResetUserLocate);
        task.DataviewManager.Execute(command);
        resVal.BoolVal = true;
      }
    }
  }

  /// <summary>
  ///   Add user sorts on Task..
  /// </summary>
  /// <param name = "resVal">Will return BoolVal. Successful and Attr will be set to STORAGE_ATTR_BOOLEAN.</param>
  /// <param name="varnum"> val1 contains var num on which range is specified.</param>
  /// <param name="dir"> dir contains direction of sort.</param>
  private eval_op_sort_add(resVal: ExpVal, varnum: ExpVal, dir: ExpVal): void {
    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = this.add_sort(varnum, dir);
  }

  /// <summary>
  ///   Free user ranges on Task..
  /// </summary>
  /// <param name = "resVal">Will return BoolVal.</param>
  /// <param name="parent"> parent contains generation of task.</param>
  private eval_op_sort_reset(resVal: ExpVal, parent: ExpVal): void {
    resVal.Attr = StorageAttribute.BOOLEAN;
    let iParent: number = parent.MgNumVal.NUM_2_LONG();
    if ((iParent >= 0 && iParent < (<Task>this.ExpTask).getTaskDepth(false)) || iParent === ExpressionEvaluator.TRIGGER_TASK) {
      let task: Task = <Task>super.GetContextTask(iParent);
      if (task !== null) {
        let command: IClientCommand = CommandFactory.CreateDataViewCommand(task.getTaskTag(), DataViewCommandType.ResetUserSort);
        task.DataviewManager.Execute(command);
        resVal.BoolVal = true;
      }
    }
  }


  /// <summary>
  ///   This function returns current instance i.e. tag of the task
  /// </summary>
  /// <param name = "resVal">Will return BoolVal.</param>
  /// <param name = "Parent"> parent contains generation of task.</param>
  private eval_op_tsk_instance(resVal: ExpVal, Parent: ExpVal): void {
    let tag: number = 0;
    let iParent: number = Parent.MgNumVal.NUM_2_LONG();
    if ((iParent >= 0 && iParent < (<Task>this.ExpTask).getTaskDepth(false)) || iParent === ExpressionEvaluator.TRIGGER_TASK) {
      let task: Task = <Task>super.GetContextTask(iParent);
      if (task !== null) {
        tag = NNumber.Parse(task.getTaskTag());
      }
    }

    resVal.Attr = StorageAttribute.NUMERIC;
    resVal.MgNumVal = new NUM_TYPE();
    resVal.MgNumVal.NUM_4_LONG(tag);
  }

  /// <summary>
  ///   This function adds User Sort on task.
  /// </summary>
  private add_sort(varnum: ExpVal, dir: ExpVal): boolean {
    if (varnum.MgNumVal === null)
      return false;

    let itm: number = varnum.MgNumVal.NUM_2_LONG();

    if (itm === 0)
      return false;


    let fld: Field = this.GetFieldOfContextTask(itm);

    if (fld === null)
      return false;

    let task: Task = <Task>fld.getTask();
    let vee_idx: number = fld.getId() + 1;

    let expr_64: Sort = new Sort();

    expr_64.fldIdx = vee_idx;
    expr_64.dir = dir.BoolVal;
    let sort: Sort = expr_64;

    let command: IClientCommand = CommandFactory.CreateAddUserSortDataviewCommand(task.getTaskTag(), sort);
    task.DataviewManager.Execute(command);

    return true;
  }

  /// <summary>
  ///   This function adds User Sort on task.
  /// </summary>
  private add_rt_ranges(Exp_params: ExpVal[], locate: boolean): boolean {
    let varnum: ExpVal = Exp_params[0];
    let min: ExpVal = Exp_params[1];

    if (varnum.MgNumVal === null)
      return false;

    let itm: number = varnum.MgNumVal.NUM_2_LONG();

    if (itm === 0)
      return false;

    let fld: Field = this.GetFieldOfContextTask(itm);

    if (fld === null)
      return false;

    let task: Task = <Task>fld.getTask();
    let vee_idx: number = fld.getId() + 1;

    let expr_78: UserRange = new UserRange();
    expr_78.veeIdx = <number>vee_idx;

    let rng: UserRange = expr_78;

    if (min.IsNull)
      rng.nullMin = true;

    if (!rng.nullMin && (min.Attr === StorageAttribute.ALPHA || min.Attr === StorageAttribute.UNICODE) && min.StrVal.length === 0)
      rng.discardMin = true;

    else {
      if (!rng.nullMin) {
        if (!StorageAttributeCheck.isTheSameType(fld.getType(), min.Attr))
          return false;

        if (StorageAttributeCheck.StorageFldAlphaUnicodeOrBlob(fld.getType(), min.Attr))
          this.ConvertExpVal(min, fld.getType());

        rng.min = min.ToMgVal();
      }
    }
    if (Exp_params.length === 3) {
      let max: ExpVal = Exp_params[2];
      if (max.IsNull)
        rng.nullMax = true;

      if (!rng.nullMax && (max.Attr === StorageAttribute.ALPHA || max.Attr === StorageAttribute.UNICODE) && max.StrVal.length === 0)
        rng.discardMax = true;

      else {
        if (!rng.nullMax) {
          if (!StorageAttributeCheck.isTheSameType(fld.getType(), max.Attr))
            return false;

          if (StorageAttributeCheck.StorageFldAlphaUnicodeOrBlob(fld.getType(), max.Attr))
            this.ConvertExpVal(max, fld.getType());

          rng.max = max.ToMgVal();
        }
      }
    }
    else
      rng.discardMax = true;

    if (!rng.discardMin || !rng.discardMax) {
      if (locate) {
        let command: IClientCommand = CommandFactory.CreateAddUserLocateDataviewCommand(task.getTaskTag(), rng);
        task.DataviewManager.Execute(command);
      }
      else {
        let command2: IClientCommand = CommandFactory.CreateAddUserRangeDataviewCommand(task.getTaskTag(), rng);
        task.DataviewManager.Execute(command2);
      }
    }
    return true;
  }

  /// <summary>
  /// Refresh the items of data control.
  /// </summary>
  /// <param name="val1"></param>
  /// <param name="val2"></param>
  /// <param name="resVal"></param>
  private eval_op_control_items_refresh(val1: ExpVal, val2: ExpVal, resVal: ExpVal): void {
    let success: boolean = false;

    resVal.Attr = StorageAttribute.BOOLEAN;
    let parent: number = val2.MgNumVal.NUM_2_LONG();

    if ((parent >= 0 && parent < (<Task>this.ExpTask).getTaskDepth(false)) || parent === ExpressionEvaluator.TRIGGER_TASK) {
      let task: Task = <Task>super.GetContextTask(parent);
      if (task !== null) {
        let control: MgControlBase = task.getForm().GetCtrl(val1.StrVal);
        // This function is applicable only for Combo box, List box etc. i.e. for choice controls. Also it will refresh items only if Source table is attached to the data control.
        if (control !== null && control.isChoiceControl() && control.isDataCtrl()) {
          let command: IClientCommand = CommandFactory.CreateControlItemsRefreshCommand(task.getTaskTag(), control);
          task.DataviewManager.CurrentDataviewManager.Execute(command);
          success = true;
        }
      }
    }
    resVal.BoolVal = success;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="val1"></param>
  /// <param name="val2"></param>
  private eval_op_menu_check(resVal: ExpVal, val1: ExpVal, val2: ExpVal): void {
    let entryName: string = GuiExpressionEvaluator.exp_build_string(val1);

    let retVal: boolean = Manager.MenuManager.MenuCheckByName(<Task>this.ExpTask.GetContextTask(), entryName, val2.BoolVal);

    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = retVal;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="val1"></param>
  /// <param name="val2"></param>
  private eval_op_menu_enable(resVal: ExpVal, val1: ExpVal, val2: ExpVal): void {
    let entryName: string = GuiExpressionEvaluator.exp_build_string(val1);

    let retVal: boolean = Manager.MenuManager.MenuEnableByName(<Task>this.ExpTask.GetContextTask(), entryName, val2.BoolVal);

    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = retVal;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="val1"></param>
  /// <param name="val2"></param>
  private eval_op_menu_add(resVal: ExpVal, val1: ExpVal, val2: ExpVal): void {
    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = false;

    let mainProg: Task = MGDataCollection.Instance.GetMainProgByCtlIdx((<Task>this.ExpTask).getCtlIdx());

    let menuPath: string = val2.StrVal; // path where the menu is to be added
    let menuIndex: number = val1.MgNumVal.NUM_2_LONG(); // index of the menu inside Menu repository

    let success: boolean = Manager.MenuManager.MenuAdd(mainProg, <Task>(<Task>this.ExpTask).GetContextTask(), menuIndex, menuPath);

    resVal.BoolVal = success;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="val1"></param>
  /// <param name="val2"></param>
  private eval_op_menu_remove(resVal: ExpVal, val1: ExpVal, val2: ExpVal): void {
    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = false;

    let mainProg: Task = MGDataCollection.Instance.GetMainProgByCtlIdx((<Task>this.ExpTask).getCtlIdx());

    let menuPath: string = null;
    if (val2 !== null) // path from where the menu entries is to be added
      menuPath = val2.StrVal;

    let menuIndex: number = val1.MgNumVal.NUM_2_LONG();

    let success: boolean = Manager.MenuManager.MenuRemove(mainProg, <Task>(<Task>this.ExpTask).GetContextTask(), menuIndex, menuPath);

    resVal.BoolVal = success;
  }

  /// <summary>
  /// Reset pulldown menu.
  /// </summary>
  /// <param name="resVal"></param>
  private eval_op_menu_reset(resVal: ExpVal): void {
    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = false;

    let mainProg: Task = MGDataCollection.Instance.GetMainProgByCtlIdx((<Task>this.ExpTask).getCtlIdx());
    resVal.BoolVal = Manager.MenuManager.MenuReset(mainProg, <Task>(<Task>this.ExpTask).GetContextTask());
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="val1"></param>
  /// <param name="val2"></param>
  private eval_op_menu_name(resVal: ExpVal, val1: ExpVal, val2: ExpVal): void {
    let entryName: string = GuiExpressionEvaluator.exp_build_string(val1);
    let entryText: string = GuiExpressionEvaluator.exp_build_string(val2);

    let isNameSet: boolean = Manager.MenuManager.SetMenuName(<Task>this.ExpTask.GetContextTask(), entryName, entryText);

    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = isNameSet;
  }

  /// <summary>
  ///   Returns the menu program path of the current program menu clicked.
  ///   The menu uid is stored on the menu manager and stored in the new task which is created
  ///   when the program menu is clicked.
  /// </summary>
  /// <param name="resVal"></param>
  private eval_op_menu(resVal: ExpVal): void {
    let menuPath: string = MenuManager.GetMenuPath(<Task>this.ExpTask);

    resVal.Attr = StorageAttribute.UNICODE;
    resVal.StrVal = menuPath;
  }

  /// <summary>
  ///   Creates/Deletes menu item on show/hide
  /// </summary>
  /// <param name = "resVal"></param>
  /// <param name = "val1">menu entry to be shown/hidden</param>
  /// <param name = "val2">visibility</param>
  private eval_op_menu_show(resVal: ExpVal, val1: ExpVal, val2: ExpVal): void {
    let currMGData: MGData = MGDataCollection.Instance.getCurrMGData();

    let entryName: string = GuiExpressionEvaluator.exp_build_string(val1);

    let retVal: boolean = Manager.MenuManager.MenuShowByName(<Task>this.ExpTask.GetContextTask(), entryName, val2.BoolVal);

    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = retVal;
  }


  /// <summary>
  ///
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="val1"></param>
  /// <param name="val2"></param>
  private eval_op_menu_idx(resVal: ExpVal, val1: ExpVal, val2: ExpVal): void {
    let mainProg: Task = MGDataCollection.Instance.GetMainProgByCtlIdx((<Task>this.ExpTask).getCtlIdx());
    let entryName: string = GuiExpressionEvaluator.exp_build_string(val1);

    let index: number = Manager.MenuManager.GetMenuIdx(mainProg, entryName, val2.BoolVal);

    resVal.Attr = StorageAttribute.NUMERIC;
    resVal.MgNumVal = new NUM_TYPE();
    resVal.MgNumVal.NUM_4_LONG(index);
  }

  /// <summary>
  ///   get a context value (GetParam)
  /// </summary>
  /// <param name = "resVal"></param>
  /// <param name = "name"></param>
  private eval_op_getParam(resVal: ExpVal, name: ExpVal): void {
    Debug.Assert(!name.IsNull && name.StrVal !== null);

    let expVal: ExpVal = ClientManager.Instance.getGlobalParamsTable().get(name.StrVal);
    if (expVal !== null)
      resVal.Copy(expVal);
    else
      resVal.Nullify();
  }

  /// <summary>
  /// set a context value (SetParam)
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="name"></param>
  /// <param name="value"></param>
  private eval_op_setParam(resVal: ExpVal, name: ExpVal, value: ExpVal): void {
    Debug.Assert(!name.IsNull && name.StrVal !== null);

    resVal.Attr = StorageAttribute.BOOLEAN;
    let globalParams: GlobalParams = ClientManager.Instance.getGlobalParamsTable();

    globalParams.set(name.StrVal, value);
    resVal.BoolVal = true;
  }

  /// <summary>
  ///   set an environment variable (INIput)
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="value"></param>
  /// <param name="updateIni"></param>
  private eval_op_iniput(resVal: ExpVal, value: ExpVal, updateIni: ExpVal): void {
    resVal.Attr = StorageAttribute.BOOLEAN;
    resVal.BoolVal = ClientManager.Instance.getEnvParamsTable().set(value.StrVal, updateIni.BoolVal);
  }

  /// <summary>
  ///   get an environment variable value (INIget)
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="name"></param>
  private eval_op_iniget(resVal: ExpVal, nameVal: ExpVal): void {
    resVal.StrVal = ClientManager.Instance.getEnvParamsTable().get(nameVal.StrVal);
    resVal.Attr = StorageAttribute.ALPHA;
  }

  /// <summary>
  ///   get an environment variable value by section name and location
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="name"></param>
  private eval_op_inigetln(resVal: ExpVal, sectionVal: ExpVal, numberVal: ExpVal): void {
    resVal.StrVal = ClientManager.Instance.getEnvParamsTable().getln(sectionVal.StrVal, numberVal.MgNumVal.NUM_2_LONG());
    resVal.Attr = StorageAttribute.ALPHA;
  }

  /// <summary>
  ///   Evaluates MODE literal
  /// </summary>
  /// <param name = "resVal"></param>
  /// <param name = "codes">codes string given in MODE literal</param>
  private eval_op_m(resVal: ExpVal, codes: string): void {
    resVal.Attr = StorageAttribute.ALPHA;
    resVal.StrVal = "";

    for (let i: number = 0; i < codes.length; i++) {
      let mode: string = this.cst_code_trans_buf('O', "MCDELRKSON ", codes.charAt(i), MsgInterface.EXPTAB_TSK_MODE_RT);
      resVal.StrVal = resVal.StrVal + mode;
    }
  }

  /// <summary>
  ///   Translate codes according to given string and vice versa
  /// </summary>
  /// <param name = "opr">Input/Output</param>
  /// <param name = "intStr">List of internal values used by magic</param>
  /// <param name = "code">Internal/external code of magic</param>
  /// <param name = "strId">index of string</param>
  /// <returns></returns>
  private cst_code_trans_buf(opr: string, intStr: String, code: string, strId: string): string {
    let i: number;
    let constStr: string = ClientManager.Instance.getMessageString(strId);
    let tokens: Array_Enumerator<string> = new Array_Enumerator(StrUtil.tokenize(constStr, ","));
    let token: string;
    let resVal: string = '\0';
    for (i = 0; i < intStr.length && tokens.MoveNext(); i++) {
      token = <string>tokens.Current;
      let ofs: number = token.indexOf('&');

      // if '&' is found, move to character next to '&'
      // else move to first character
      ofs++;
      let currCode: string = token.charAt(ofs).toUpperCase();
      if (opr === 'I') {
        if (code === currCode) {
          resVal = intStr.charAt(i);
          break;
        }
      }
      // opr == 'O'
      else {
        if (code === intStr.charAt(i)) {
          resVal = currCode;
          break;
        }
      }
    }
    return resVal;
  }

  /// <summary>
  /// implementing ExpCalc - get index of expression, find the expression and evaluate it
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="expVal"> expression index </param>
  private eval_op_expcalc(resVal: ExpVal, expVal: ExpVal): void {
    resVal.IsNull = true;
    // Avoid over 50 recursive calls
    if (ExpressionEvaluator._recursiveExpCalcCount < 50) {
      ExpressionEvaluator._recursiveExpCalcCount++;
      // get expression from idx and evaluate it. pass "none" for type, so we get whatever type the server sent back
      let expVal2: ExpVal = (<Task>this.ExpTask).getExpById(expVal.MgNumVal.NUM_2_LONG()).evaluateWithResType(StorageAttribute.NONE);
      ExpressionEvaluator._recursiveExpCalcCount--;

      if (expVal2 !== null)
        resVal.Copy(expVal2);
    }
  }

  /// <summary>
  /// implementation of CndRange function: If condition is true, use the 2nd parameter as range. if not -
  /// mark the result as null
  /// </summary>
  /// <param name="resVal"></param>
  /// <param name="val1"></param>
  /// <param name="val2"></param>
  private eval_op_CndRange(resVal: ExpVal, val1: ExpVal, val2: ExpVal): void {
    if (val1.BoolVal)
      resVal.Copy(val2);
    else
      resVal.IsNull = true;
  }

  /// <summary>
  ///   returns the external task type of the task
  /// </summary>
  private eval_op_taskType(resVal: ExpVal, Parent: ExpVal): void {
    let iParent: number = Parent.MgNumVal.NUM_2_LONG();
    if ((iParent >= 0 && iParent < (<Task>this.ExpTask).getTaskDepth(false)) || iParent === ExpressionEvaluator.TRIGGER_TASK) {
      let task: Task = <Task>super.GetContextTask(iParent);
      if (task !== null) {
        resVal.StrVal = (task.isMainProg() ? "MW" : "W");
      }
      else
        resVal.StrVal = " ";
    }

    resVal.Attr = StorageAttribute.ALPHA;
  }

  /// <summary>
  ///   Function getting the terminal number.
  /// </summary>
  /// <param name="resVal"></param>
  private eval_op_terminal(resVal: ExpVal): void {
    let terminal: number = ClientManager.Instance.getEnvironment().getTerminal();

    super.ConstructMagicNum(resVal, terminal, StorageAttribute.NUMERIC);
  }

  /// <summary>
  ///   return the project's dir
  /// </summary>
  /// <param name="resVal"></param>
  private eval_op_projectdir(resVal: ExpVal): void {
    resVal.StrVal = ClientManager.Instance.getEnvironment().getProjDir(this.ExpTask.getCompIdx());
    resVal.Attr = StorageAttribute.ALPHA;
  }

  /// <summary>
  ///   this method checks if the blob is valid vector i.e. if the blob is in vector's flatten format
  /// </summary>
  /// <param name = "vec">the blob to be checked</param>
  /// <returns> true if valid vector</returns>
  private static IsValidVector(vec: ExpVal): boolean {
    return vec !== null && vec.Attr === StorageAttribute.BLOB_VECTOR && VectorType.validateBlobContents(vec.StrVal);
  }

  /// <summary>
  /// This function returns the attribute according to magic, for eg 'L' is returned for boolean.
  /// </summary>
  /// <param name="storageAttr"></param>
  /// <returns>attribute character corresponding to storage attribute.</returns>
  private static GetAttributeChar(storageAttr: StorageAttribute): string {
    let attr: string = <string>storageAttr;
    switch (storageAttr) {
      case StorageAttribute.BLOB:
        attr = 'B';
        break;

      case StorageAttribute.BOOLEAN:
        attr = 'L';
        break;

      default:
        break;
    }
    return attr;
  }

  /// <summary>
  /// returns Val for the itmIdx
  /// </summary>
  /// <param name="itmIdx"></param>
  /// <returns></returns>
  GetItemVal(itmIdx: number): ExpVal {
    let fld: Field = <Field>this.getField(itmIdx);

    let expVal: ExpVal = new ExpVal(fld.getType(), fld.isNull(), fld.getValue(false));

    return expVal;
  }

  /// <summary>
  /// sets the object on 'itmIdx' and recomputes
  /// </summary>
  /// <param name="itmIdx"></param>
  /// <param name="valueToSet"></param>
  SetItemVal(itmIdx: number, valueToSet: any): void {
    let fld: Field = <Field>this.getField(itmIdx);
    let newVal: string = null;

    fld.setValueAndStartRecompute(newVal, false, true, true, false);
  }

  /// <summary>(protected)
  /// returns last focused task of context.
  /// If handler is executing then returns the task which is the context
  /// of the currently executing handler. This is achieved by calling getCurrTask().
  /// Although the function name sounds incorrect, it returns exactly what we need.
  /// </summary>
  /// <returns></returns>
  GetLastFocusedTask(): ITask {
    return ClientManager.Instance.getCurrTask();
  }

  /// <summary>
  /// return all top level forms that exist
  /// </summary>
  /// <param name="contextId"></param>
  /// <returns></returns>
  GetTopMostForms(contextID: number): List<MgFormBase> {
    return MGDataCollection.Instance.GetTopMostForms();
  }

  /// <summary>
  /// Moves the caret to specified control
  /// </summary>
  /// <param name="ctrlTask"></param>
  /// <param name="ctrl"></param>
  /// <param name="rowNo"></param>
  /// <returns></returns>
  HandleControlGoto(ctrlTask: ITask, ctrl: MgControlBase, rowNo: number): boolean {
    let task: Task = <Task>ctrlTask;
    if (ctrl !== null) {
      let dv: DataView = <DataView>task.DataView;
      let tCtrl: MgControl = <MgControl>ctrl;
      let wantedLine: number = task.getForm().DisplayLine; // 0-based record index

      // validate specified row
      if (ctrl.IsRepeatable && rowNo > 0) {
        task.getForm().getTopIndexFromGUI();
        let topRecIdx: number = dv.getTopRecIdx();
        wantedLine = topRecIdx + rowNo - 1;

        // check if the record is exist in the current page
        if (wantedLine - topRecIdx - 1 >= task.getForm().getRowsInPage())
          return false;

        // check for invalid record index
        if (!task.getForm().IsValidRow(wantedLine))
          return false;
      }

      if (tCtrl.isVisible()) {
        let noSubformTask: boolean = false;
        if (tCtrl.isSubform() || tCtrl.isFrameFormControl()) {
          let subForm: MgForm = null;
          if (tCtrl.isSubform())
            if (tCtrl.getSubformTask() === null)
              noSubformTask = true;
            else
              subForm = <MgForm>tCtrl.getSubformTask().getForm();
          else
            subForm = <MgForm>tCtrl.getForm();

          if (!noSubformTask)
            tCtrl = subForm.getFirstParkableCtrl();
        }

        // jump to the control
        if (tCtrl !== null && !noSubformTask) {
          let rtEvt: RunTimeEvent = new RunTimeEvent(tCtrl, wantedLine);
          rtEvt.setInternal(InternalInterface.MG_ACT_CTRL_FOCUS);
          ClientManager.Instance.EventsManager.addToTail(rtEvt);
          return true;
        }
      }
    }
    return false;
  }

  /// <summary>
  /// translates the string containing logical name
  /// </summary>
  /// <param name="name">the string containing logical name</param>
  /// <returns>translated string </returns>
  Translate(name: string): string {
    return ClientManager.Instance.getEnvParamsTable().translate(name);
  }

  /// <summary>(protected)
  /// this function implements "EditGet()" for RC
  ///
  /// We have different implementation for Online and RC, because there is difference behavior
  /// OL: 1. In case of choice control, on change of selection, variable is updated immediately (as VC handler should get called)
  ///     2. Radio control - if two controls referring single variable, EditGet() executing inside control modify handler fails because the
  ///        last parked control still points previous control. The focus is not moved. So using variable's value fixes this.
  /// RC: 1. on change of selection, variable is not updated immediately.
  ///     2. Radio control - if two controls referring single variable , on change of selection CS and CP handlers get executed.
  ///        So last parked control points to selected control. EditGet() returns correct value from CM event handler
  /// </summary>
  /// <param name="ctrl">control</param>
  /// <param name="resVal">out: resultant ExpVal</param>
  /// <returns></returns>
  EditGet(ctrl: MgControlBase, refResVal: RefParam<ExpVal>): void {
    this.GetValidatedMgValue(ctrl, refResVal);
  }


  /// <summary>
  /// Disconnect the database connection of given database name.
  /// </summary>
  /// <param name="val"> Database name</param>
  /// <param name="resVal">Return status of disconnect operation</param>
  // private void exp_op_ClientDbDisconnect(ExpVal val, ExpVal resVal)
  // {
  //   string databaseName = val.StrVal;
  //   Task task = (Task)ExpTask;

  //   IClientCommand command = CommandFactory.CreateClientDbDisconnectCommand(databaseName);
  //   ReturnResult result = task.DataviewManager.LocalDataviewManager.Execute(command);

  //   resVal.Attr = StorageAttribute.BOOLEAN;
  //   resVal.BoolVal = result.Success;
  // }

  /// <summary>
  /// Adds the dataview to destination datasource.
  /// </summary>
  /// <param name="resVal">Return result</param>
  /// <param name="val1">Generation</param>
  /// <param name="val2">task var names</param>
  /// <param name="val3">destination data source number</param>
  /// <param name="val4">destination data source name</param>
  /// <param name="val5">destination columns db names</param>
  private eval_op_dataview_to_datasource(resVal: ExpVal, val1: ExpVal, val2: ExpVal, val3: ExpVal, val4: ExpVal, val5: ExpVal): void {
    let task: Task = null;
    resVal.BoolVal = false;
    let iParent: number = val1.MgNumVal.NUM_2_LONG();
    resVal.Attr = StorageAttribute.BOOLEAN;
    let error: string = NString.Empty;
    if (iParent >= 0) {
      task = <Task>super.GetContextTask(iParent);

      if (task !== null) {
        if (!(<DataView>task.DataView).HasMainTable) {
          error = "DataViewToDataSource - Task doesn’t have main data source.";
          Logger.Instance.WriteExceptionToLogWithMsg(error);
          ClientManager.Instance.ErrorToBeWrittenInServerLog = error;
          return;
        }

        let taskVarName: string = val2.StrVal.trim();
        // if taskVarName is empty, then add all the fields from dataview in the task var names list.
        if (NString.IsNullOrEmpty(taskVarName)) {
          for (let fieldIndex: number = 0; fieldIndex < task.DataView.GetFieldsTab().getSize(); fieldIndex++) {
            if (fieldIndex !== 0) {
              taskVarName += ",";
            }
            taskVarName += task.DataView.GetFieldsTab().getField(fieldIndex).getVarName();
          }
        }

        let destinationDSNumber: number = val3.MgNumVal.NUM_2_LONG();
        let destinationDSName: string = val4.StrVal;

        let destinationColumns: string = val5.StrVal.trim();

        // If destinationColumns is empty, then it will be same as task var list.
        if (NString.IsNullOrEmpty(destinationColumns)) {
          destinationColumns = taskVarName;
        }

        let command: IClientCommand = CommandFactory.CreateDataViewToDataSourceCommand(this.ExpTask.getTaskTag(), iParent, taskVarName, destinationDSNumber, destinationDSName, destinationColumns);
        let result: ReturnResult = task.DataviewManager.Execute(command);

        if (result.Success)
          resVal.BoolVal = true;
      }
    }
    if (task === null) {
      error = "DataViewToDataSource - Invalid generation specified.";
      Logger.Instance.WriteExceptionToLogWithMsg(error);
      ClientManager.Instance.ErrorToBeWrittenInServerLog = error;
      return;
    }
  }

  /// <summary>
  /// Execute ControlSelectProgram() functon.
  /// </summary>
  /// <param name="expVal"></param>
  /// <param name="resVal"></param>
  eval_op_control_select_program(expVal: ExpVal, resVal: ExpVal): void {
    let controlID: number = expVal.MgNumVal.NUM_2_LONG();
    let parent: number = 0;

    let refParent: RefParam<number> = new RefParam(parent);
    let mgControl: MgControl = (<Task>this.ExpTask.GetContextTask()).GetControlFromControlID(controlID - 1, refParent);
    parent = refParent.value;

    resVal.Attr = StorageAttribute.NUMERIC;
    resVal.MgNumVal = new NUM_TYPE();

    // If control has select program property.
    if (mgControl !== null && mgControl.HasSelectProgram()) {
      let selectProgProp: Property = mgControl.getProp(PropInterface.PROP_TYPE_SELECT_PROGRAM);
      let realIndex: number = NNumber.Parse(selectProgProp.getValue());
      let programIndex: number = 0;
      if (realIndex > 0) {
        if (parent > 0)
          programIndex = <number>realIndex + <number>parent / 100;
        else
          programIndex = <number>realIndex;
      }
      resVal.MgNumVal = NUM_TYPE.from_double(<number>programIndex);
    }
  }
}
  /// <summary>
  ///   This exception used when at least one of the operands is null
  /// </summary>
  export class NullValueException  extends  Exception {
  private _attr: StorageAttribute = StorageAttribute.NONE;

  constructor(attr: StorageAttribute) {
    super();
    this._attr = attr;
    this.name = "NullValueException";
  }

  getAttr(): StorageAttribute {
    return this._attr;
  }
}

/// <summary>
///   This class is used for tracking the current position in the current
///   executed expression.
///   expStr_ - is the current string of the expression being executed
///   posIdx_ - is the current position in the expression (while executing it)
///   The class also provides methods for extracting values/operator from
///   the expression being executed.
/// </summary>
export class ExpStrTracker {
  private _expBytes: Int8Array = null; // Current string of the expression being executed
  private _lowHigh: boolean = true;
  private _nullArithmetic: boolean = false; // true, if task of the expression has null arithmetic == nullify;
  private _isNull: boolean = false; // is expression result NULL
  private _posIdx: number = 0; // The current position in the expression (while executing it)

  /// <summary>
  ///   initializing the class with the expression to be executed
  /// </summary>
  constructor(expBytes: Int8Array, nullArithmetic: boolean) {
    this._expBytes = new Int8Array(expBytes.length);
    for (let _ai: number = 0; _ai < this._expBytes.length; ++_ai)
      this._expBytes[_ai] = 0;

    for (let i: number = 0; i < expBytes.length; i++)
      this._expBytes[i] = expBytes[i];

    this._nullArithmetic = nullArithmetic;
    this._lowHigh = ClientManager.Instance.getEnvironment().getLowHigh();
  }

  /// <summary>
  ///   set result to be NULL
  /// </summary>
  setNullResult(): void {
    if (this._nullArithmetic)
      this._isNull = true;
  }

  /// <summary>
  ///   reset result to be NULL
  /// </summary>
  resetNullResult(): void {
    if (this._nullArithmetic) {
      this._isNull = false;
    }
  }

  /// <summary>
  ///   check if the result must be null
  /// </summary>
  isNull(): boolean {
    return this._isNull;
  }

  /// <summary>
  ///   Get a number represented in 1 byte from the expression
  /// </summary>
  /// <returns> the number
  /// </returns>
  get1ByteNumber(): number {
    let num: number = (this._expBytes[this._posIdx] >= 0) ? (<number>this._expBytes[this._posIdx]) : (256 + <number>this._expBytes[this._posIdx]);
    this._posIdx += 1;

    return num;
  }

  /// <summary>
  ///   Get a number represented in 2 bytes from the expression
  /// </summary>
  /// <returns> the number
  /// </returns>
  get2ByteNumber(): number {
    let c1: number = (this._expBytes[this._posIdx] >= 0) ? (<number>this._expBytes[this._posIdx]) : (256 + <number>this._expBytes[this._posIdx]);
    this._posIdx += 1;

    let c2: number = (this._expBytes[this._posIdx] >= 0) ? (<number>this._expBytes[this._posIdx]) : (256 + <number>this._expBytes[this._posIdx]);
    this._posIdx += 1;

    let num: number = <number>(this._lowHigh ? ExpressionEvaluator.MK_SHRT(<number>c2, <number>c1) : ExpressionEvaluator.MK_SHRT(<number>c1, <number>c2));
    return num;
  }

  /// <summary>
  ///   Get a number represented in 4 byte from the expression
  /// </summary>
  /// <returns>the number</returns>
  get4ByteNumber(): number {
    let c4: number = (this._expBytes[this._posIdx] >= 0) ? (<number>this._expBytes[this._posIdx]) : (256 + <number>this._expBytes[this._posIdx]);
    this._posIdx += 1;

    let c3: number = (this._expBytes[this._posIdx] >= 0) ? (<number>this._expBytes[this._posIdx]) : (256 + <number>this._expBytes[this._posIdx]);
    this._posIdx += 1;

    let c2: number = (this._expBytes[this._posIdx] >= 0) ? (<number>this._expBytes[this._posIdx]) : (256 + <number>this._expBytes[this._posIdx]);
    this._posIdx += 1;

    let c1: number = (this._expBytes[this._posIdx] >= 0) ? (<number>this._expBytes[this._posIdx]) : (256 + <number>this._expBytes[this._posIdx]);
    this._posIdx += 1;

    let num: number = this._lowHigh ? ExpressionEvaluator.MK_LONG(c1, c2, c3, c4) : ExpressionEvaluator.MK_LONG(c4, c3, c2, c1);
    return num;
  }

  /// <summary>
  ///   Get alpha string from the expression by its length
  /// </summary>
  /// <param name = "len">        length of string to extract</param>
  /// <param name = "updateIdx">  the current position will be incremented</param>
  /// <param name = "isUnicode"></param>
  /// <returns> the number</returns>
  getString(len: number, updateIdx: boolean, isUnicode: boolean): string {
    let str: string = "";
    let bytes: number;

    if (isUnicode === false) {
      bytes = len;
      let tmpChar: string[] = new Array<string>(this._expBytes.length);
      for (let i: number = 0; i < this._expBytes.length; i = i + 1)
        tmpChar[i] = String.fromCharCode(this._expBytes[i]);

      str = NString.FromChars(tmpChar, this._posIdx, len);
    }
    else {
      bytes = len * 2;

      let tmp: Uint8Array = new Uint8Array(bytes);

      let increment: number = (!this._lowHigh) ? ConstInterface.BYTES_IN_CHAR : 1;

      for (let i: number = this._posIdx; i < this._posIdx + bytes; i = i + increment) {
        if (!this._lowHigh) {
          tmp[i - this._posIdx] = <number>this._expBytes[i + 1];
          tmp[i + 1 - this._posIdx] = <number>this._expBytes[i];
        }
        else
          tmp[i - this._posIdx] = <number>this._expBytes[i];
      }

      try {
        str = Encoding.Unicode.GetString(tmp, 0, tmp.length);
      }
      catch (ex) {
        if (ex instanceof Exception) {
          Logger.Instance.WriteExceptionToLog(ex);
        }
        else
          throw ex;
      }
    }
    if (updateIdx) {
      this._posIdx += bytes;
    }
    return str;
  }

  /// To enhance the performance of the runtime expression evaluator,
  /// the function pointer to the relevant entry in the EXP_OP_TAB is saved
  /// in the polished expression instead of referencing it each time we need
  /// it in runtime. But in Browser Client we do not (rather we cannot) use
  /// this function pointer and so we have to skip it.
  /// <summary>
  ///   To enhance the performance of the runtime expression evaluator,
  ///   the function pointer to the relevant entry in the EXP_OP_TAB is saved
  ///   in the polished expression instead of referencing it each time we need
  ///   it in runtime. But in Browser Client we do not (rather we cannot) use
  ///   this function pointer and so we have to skip it.
  /// </summary>
  private skipOpFunctionPtr(): void {
    this._posIdx += ExpressionInterface.EXP_OPER_FUNC_PTR_LEN;
  }

  /// <summary>
  ///   Get an operator from the current position in the expression
  /// </summary>
  /// <returns> the current operator</returns>
  getOpCode(): number {
    let tmp: number[] = [
      this._lowHigh ? this._expBytes[this._posIdx] : this._expBytes[this._posIdx + 1], this._lowHigh ? this._expBytes[this._posIdx + 1] : this._expBytes[this._posIdx]
    ];
    let num: number = (tmp[1] >= 0) ? (<number>tmp[1]) : (256 + <number>tmp[1]);
    num <<= 8;
    num = (num | ((tmp[0] >= 0) ? (<number>tmp[0]) : (256 + <number>tmp[0])));
    this._posIdx += ExpressionInterface.EXP_OPER_LEN;

    this.skipOpFunctionPtr();

    return num;
  }

  /// <summary>
  ///   Get a variable idx from the current position in the expression
  /// </summary>
  /// <returns> the variable idx</returns>
  getVarIdx(): number {
    let flip: number = 0;

    if (this._lowHigh)
      flip = 1 - flip;

    // the first byte is the least significant here
    let num: number = (this._expBytes[this._posIdx + flip] >= 0) ? (<number>this._expBytes[this._posIdx + flip]) : (256 + <number>this._expBytes[this._posIdx + flip]);
    num <<= 8;
    flip = 1 - flip;
    num |= ((this._expBytes[this._posIdx + flip] >= 0) ? (<number>this._expBytes[this._posIdx + flip]) : (256 + <number>this._expBytes[this._posIdx + flip]));
    this._posIdx += ExpressionInterface.EXP_OPER_LEN;

    return num;
  }

/// <summary>
///   Get a Magic Number from the expression
/// </summary>
/// <param name = "len"> length of the magic number within the expression</param>
/// <param name = "updateIdx">  the current position will be incremented</param>
/// <returns> the Magic Number</returns>
  getMagicNumber(len: number, updateIdx: boolean): NUM_TYPE {
    let mgNum: NUM_TYPE = new NUM_TYPE(this._expBytes, this._posIdx, len);
    if (updateIdx)
      this._posIdx += len;
    return mgNum;
  }

  /// <summary>
  ///   Skips an operator within an expression from the current position
  /// </summary>
  skipOperator(): void {
    let argsRemain: number = 1;
    let expDesc: ExpDesc;

    while (argsRemain > 0) {
      argsRemain--;
      let opCode: number = this.getOpCode();
      switch (opCode) {
        // --------------------------------------------------------------
        // Skip String value
        // --------------------------------------------------------------
        case ExpressionInterface.EXP_OP_A:
        case ExpressionInterface.EXP_OP_H:
          let len: number = this.get4ByteNumber();
          this._posIdx += (len * ConstInterface.BYTES_IN_CHAR);
          // since the server sends us both Unicode string Ansi string for
          // each string in the expression, and the client uses only unicode,
          // we will diregard the Ansi string
          len = this.get4ByteNumber();
          this._posIdx += len;
          break;

        case ExpressionInterface.EXP_OP_EXT_A:
          len = this.get2ByteNumber();
          this._posIdx += len;
          break;

        // --------------------------------------------------------------
        // Skip Magic Number value
        // --------------------------------------------------------------

        case ExpressionInterface.EXP_OP_N:
        case ExpressionInterface.EXP_OP_T:
        case ExpressionInterface.EXP_OP_D:
        case ExpressionInterface.EXP_OP_M:
        case ExpressionInterface.EXP_OP_K:
        case ExpressionInterface.EXP_OP_E:
          len = this.get2ByteNumber();
          this._posIdx += len;
          break;

        // --------------------------------------------------------------
        // Skip Prog and File literals which also include a component reference
        // --------------------------------------------------------------

        case ExpressionInterface.EXP_OP_F:
        case ExpressionInterface.EXP_OP_P:
          len = this.get2ByteNumber();
          this._posIdx += len;
          len = this.get2ByteNumber();
          this._posIdx += len;
          break;

        // --------------------------------------------------------------
        // Skip Logical Value
        // --------------------------------------------------------------

        case ExpressionInterface.EXP_OP_L:
          this._posIdx += 2;
          break;

        // --------------------------------------------------------------
        // Skip variable
        // --------------------------------------------------------------

        case ExpressionInterface.EXP_OP_V:
          // if something wrong with escape variable, change this number.
          this._posIdx += (ExpressionEvaluator.PARENT_LEN + ExpressionEvaluator.LONG_OBJECT_LEN);
          break;

        case ExpressionInterface.EXP_OP_FORM:
          this._posIdx += (ExpressionEvaluator.PARENT_LEN + ExpressionEvaluator.LONG_OBJECT_LEN);
          break;

        case ExpressionInterface.EXP_OP_VAR:
          this._posIdx += (ExpressionEvaluator.PARENT_LEN + ExpressionEvaluator.LONG_OBJECT_LEN);
          break;

        case ExpressionInterface.EXP_OP_MNU:
          len = this.get2ByteNumber();
          this._posIdx += len;
          break;

        case ExpressionInterface.EXP_OP_RIGHT_LITERAL:
          len = this.get2ByteNumber();
          this._posIdx += len;
          // Skip extra unused string stored after literal
          len = this.get2ByteNumber();
          this._posIdx += len;
          break;

        /* case EXP_OP_ACT:
         posIdx_ +=2;
         break;

         case EXP_OP_KBD:
         posIdx_ ++;
         break; */

        // --------------------------------------------------------------
        // Current operator is a function, so we just need to update
        //  the number of arguments to skip
        // --------------------------------------------------------------

        default:
          expDesc = ExpressionDict.expDesc[opCode];
          if (expDesc.ArgCount_ < 0)
            argsRemain += this.get1ByteNumber();
          else
            argsRemain += expDesc.ArgCount_;
          break;
      }
    }
  }
}

class DynamicOperation {
  argCount_: number = 0;
  opCode_: number = ExpressionInterface.EXP_OP_NONE;
}

