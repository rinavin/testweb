import {ExpVal} from "@magic/gui";
import {List, StringBuilder} from "@magic/mscorelib";
import {Argument} from "./Argument";
import {Task} from "../tasks/Task";
import {StorageAttribute, StrUtil} from "@magic/utils";
import {MGDataCollection} from "../tasks/MGDataCollection";
import {ConstInterface} from "../ConstInterface";

export class ArgumentsList {
  private _list: List<Argument> = null;

  // String for subform arguments
  // Only for offline. It's relevant for call with destination
  RefreshOnString: string = null;

  constructor();
  constructor(srcArgs: ArgumentsList);
  constructor(Exp_params: ExpVal[]);
  constructor(argument: Argument);
  constructor(srcArgsOrExp_paramsOrArgument?: any) {
    if (arguments.length === 0) {
      this.constructor_0();
      return;
    }
    if (arguments.length === 1 && (srcArgsOrExp_paramsOrArgument === null || srcArgsOrExp_paramsOrArgument instanceof ArgumentsList)) {
      this.constructor_1(srcArgsOrExp_paramsOrArgument);
      return;
    }
    if (arguments.length === 1 && (srcArgsOrExp_paramsOrArgument === null || srcArgsOrExp_paramsOrArgument instanceof Array)) {
      this.constructor_2(srcArgsOrExp_paramsOrArgument);
      return;
    }
    this.constructor_3(srcArgsOrExp_paramsOrArgument);
  }

  /// <summary>
  ///   CTOR
  /// </summary>
  private constructor_0(): void {
  }

  /// <summary>
  ///   CTOR that creates a VALUE argument list using a given argument list
  /// </summary>
  private constructor_1(srcArgs: ArgumentsList): void {
    this.constructor_0();
    if (srcArgs === null)
      this._list = null;
    else {
      this._list = new List<Argument>();

      for (let i: number = 0; i < srcArgs.getSize(); i = i + 1) {
        this._list.push(new Argument(srcArgs.getArg(i)));
      }
    }
  }

  /// <summary>
  ///   CTOR that creates a VALUE argument list using a given expression value list
  /// </summary>
  private constructor_2(Exp_params: ExpVal[]): void {
    this.constructor_0();
    let argCnt: number = Exp_params.length;

    if (argCnt === 0)
      this._list = null;
    else {
      this._list = new List<Argument>();

      for (let i: number = 0; i < argCnt; i = i + 1) {
        this._list.push(new Argument(Exp_params[i]));
      }
    }
  }

  /// <summary>
  /// CTOR - create an argument list with one specified argument
  /// </summary>
  /// <param name="argument"></param>
  private constructor_3(argument: Argument): void {
    this.Add(argument);
  }

  /// <summary>
  ///   fill the argument list
  /// </summary>
  /// <param name = "valueStr">string in the format of: "[F:str,str]|[E:str]$..."</param>
  /// <param name = "srcTask">the source task for parsing expression arguments</param>
  fillList(valueStr: string, srcTask: Task): void {
    let tok: string[] = StrUtil.tokenize(valueStr, "$");
    let size: number = tok.length;

    this._list = new List<Argument>();

    for (let i: number = 0; i < size; i = i + 1) {
      let argument: Argument = new Argument();
      argument.fillData(tok[i], srcTask);
      this._list.push(argument);
    }
  }

  /// <summary>
  ///   builds argument list from the event parameters
  /// </summary>
  /// <param name = "size">   - argument number </param>
  /// <param name = "attrs">  - string of attributes</param>
  /// <param name = "vals">   - value strings</param>
  /// <param name = "nulls">  - arguments nulls</param>
  buildListFromParams(size: number, attrs: string, vals: string[], nulls: string): void {
    this._list = new List<Argument>();

    for (let i: number = 0; i < size; i = i + 1) {
      let argument: Argument = new Argument();
      argument.fillDataByParams(<StorageAttribute>attrs.charAt(i), vals[i], nulls.charAt(i) !== '0'/*'0'*/);
      this._list.push(argument);
    }
  }

  /// <summary>
  ///   build the XML string for the arguments list
  /// </summary>
  /// <param name = "message">the XML string to append the arguments to</param>
  buildXML(message: StringBuilder): void {
    for (let i: number = 0; i < this._list.length; i = i + 1) {
      if (i > 0)
        message.Append('$')/*'$'*/;
      this._list.get_Item(i).buildXML(message);
    }
  }

  /// <summary>
  ///   returns the size of the list
  /// </summary>
  getSize(): number {
    return (this._list === null) ? 0 : this._list.length;
  }

  /// <summary>
  ///   returns an argument item from the list by its index
  /// </summary>
  /// <param name = "idx">the index of the requested argument</param>
  getArg(idx: number): Argument {
    if (idx < 0 || idx >= this._list.length)
      return null;

    return this._list.get_Item(idx);
  }

  /// <summary>
  ///   get Value of Argument
  /// </summary>
  /// <param name = "idx">the index of the requested argument</param>
  /// <param name = "expType">type of expected type of evaluation, for expression only</param>
  /// <param name = "expSize">size of expected string from evaluation, for expression only</param>
  /// <returns> value of evaluated Argument</returns>
  getArgValue(idx: number, expType: StorageAttribute, expSize: number): string {
    let arg: Argument = this.getArg(idx);
    if (arg === null)
      return null;
    return arg.getValue(expType, expSize);
  }

  /// <returns> translation of the arguments content into Magic URL style arguments</returns>
  toURL(makePrintable: boolean): string {
    let htmlArgs: StringBuilder = new StringBuilder();
    for (let i: number = 0; i < this.getSize(); i = i + 1) {
      if (i > 0) {
        htmlArgs.Append(ConstInterface.REQ_ARG_COMMA);
      }
      this._list.get_Item(i).toURL(htmlArgs, makePrintable);
    }
    return htmlArgs.ToString();
  }

  /// <summary>
  ///   This method fills the argument data from the mainProgVar strings
  /// </summary>
  /// <param name = "mainProgVars">- a vector of strings of main program variables</param>
  /// <param name = "ctlIdx"></param>
  fillListByMainProgVars(mainProgVars: List<string>, ctlIdx: number): void {
    if (mainProgVars === null) {
      this._list = null;
    }
    else {
      this._list = new List<Argument>();
      let mainProgTask: Task = <Task> MGDataCollection.Instance.GetMainProgByCtlIdx(ctlIdx);
      for (let i: number = 0; i < mainProgVars.length; i = i + 1) {
        let argument: Argument = new Argument();
        argument.fillDataByMainProgVars(mainProgVars.get_Item(i), mainProgTask);
        this._list.push(argument);
      }
    }
  }

  /// <summary>
  /// fill the arguments list from a string
  /// </summary>
  /// <param name="argsString"></param>
  FillListFromString(argsString: string): void {

    // TODO : check size of bundle and decide whether to use RegExp
    let pattern = new RegExp("(?<!\\\\),");
    let array: string[] = argsString.split(pattern);
    this._list = new List<Argument>();

    for (let i: number = 0; i < array.length; i = i + 1) {
      let argument: Argument = new Argument();
      argument.FillFromString(array[i]);
      this._list.push(argument);
    }
  }

  /// <summary>
  /// add an argument to the list
  /// </summary>
  /// <param name="argument"></param>
  Add(argument: Argument): void {
    if (this._list === null)
      this._list = new List<Argument>();
    this._list.push(argument);
  }
}
