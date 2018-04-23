import {CommandType, DockingStyle, MenuStyle} from "../../GuiEnums";
import {ControlBase} from "../ControlBase";
import {GuiMgControl} from "../GuiMgControl";
import {GuiMgMenu} from "../GuiMgMenu";
import {GuiMenuEntry} from "../GuiMenuEntry";
import {Manager} from "../../Manager";
import {List} from "@magic/mscorelib";
import {ListboxSelectionMode, WindowType} from "@magic/utils";

export class GuiCommand {
  TaskTag: string = null;
  Operation: string;
  CommandType: CommandType = 0;
  options:any = null;
  Bool1: boolean = false;
  Bool3: boolean = false;
  CtrlsList: List<GuiMgControl> = null;
  params: List<any> = null;
  fileName: string = null;
  height: number = 0;
  intArray: number[] = null;
  intArrayList: List<number[]> = null;
  intList: List<number> = null;
  itemsList: string[] = null;
  layer: number = 0;
  line: number = 0;
  menu: GuiMgMenu = null;
  menuEntry: GuiMenuEntry = null;
  menuStyle: MenuStyle = 0;
  number: number = 0;
  number1: number = 0;
  number2: number = 0;
  obj: any = null;
  parentObject: any = null;
  obj1: any = null;
  str: string = null;
  value: any = null;
  stringList: List<string> = null;
  style: number = 0;
  width: number = 0;
  windowType: WindowType = 0;
  x: number = 0;
  y: number = 0;
  userDropFormat: string = null;
  isHelpWindow: boolean = false;
  isParentHelpWindow: boolean = false;
  dockingStyle: DockingStyle = 0;
  listboxSelectionMode: ListboxSelectionMode = 0;
  contextID: string = '\0';
  createInternalFormForMDI: boolean = false;

  public CtrlName: string;

  constructor(commandType: CommandType);
  constructor(commandType: CommandType, str: string);
  constructor(obj: any, commandType: CommandType);
  constructor(parentObject: any, obj: any, cmmandType: CommandType);
  constructor(commandTypeOrObjOrParentObject: any, strOrCommandTypeOrObj?: any, cmmandType?: CommandType) {
    if (arguments.length === 1 && (commandTypeOrObjOrParentObject === null || commandTypeOrObjOrParentObject.constructor === Number)) {
      this.constructor_0(commandTypeOrObjOrParentObject);
      return;
    }
    if (arguments.length === 2 && (commandTypeOrObjOrParentObject === null || commandTypeOrObjOrParentObject.constructor === Number)
      && (strOrCommandTypeOrObj === null || strOrCommandTypeOrObj.constructor === String)) {
      this.constructor_1(commandTypeOrObjOrParentObject, strOrCommandTypeOrObj);
      return;
    }
    else if (arguments.length === 2) {
      // && (commandTypeOrObjOrParentObject === null || commandTypeOrObjOrParentObject.constructor === Object) && (strOrCommandTypeOrObj === null || strOrCommandTypeOrObj.constructor === Number)) {
      this.constructor_2(commandTypeOrObjOrParentObject, strOrCommandTypeOrObj);
      return;
    }
    this.constructor_3(commandTypeOrObjOrParentObject, strOrCommandTypeOrObj, cmmandType);
  }

  /// <summary>
  /// </summary>
  private constructor_0(commandType: CommandType): void {
    this.CommandType = commandType;
    this.contextID = Manager.GetCurrentContextID();
  }

  /// <summary></summary>
  /// <param name = "commandType"></param>
  /// <param name = "str"></param>
  private constructor_1(commandType: CommandType, str: string): void {
    this.constructor_0(commandType);
    this.str = str;
  }

  /// <summary></summary>
  private constructor_2(obj: any, commandType: CommandType): void {
    this.constructor_0(commandType);
    this.obj = obj;
    if (this.obj instanceof ControlBase) {
      this.CtrlName = (<ControlBase>this.obj).UniqueName;
      this.TaskTag = (<ControlBase>this.obj).TaskTag;
    }

  }

  /// <summary>
  ///   this is my comment
  /// </summary>
  /// <param name = "parentObject">the parent object of the object</param>
  private constructor_3(parentObject: any, obj: any, cmmandType: CommandType): void {
    this.constructor_2(obj, cmmandType);
    this.parentObject = parentObject;
  }

/// <summary>
  /// return true if the command is for showing a modal form
  /// </summary>
  /// <returns></returns>
  IsModalShowFormCommand(): boolean {
    return this.CommandType === CommandType.SHOW_FORM && this.Bool3;
  }

  toString(): string {
    return "{" + this.CommandType + "}";
  }
}
