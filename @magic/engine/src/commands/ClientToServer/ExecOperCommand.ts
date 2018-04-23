import {Int32, StringBuilder, RefParam} from "@magic/mscorelib";
import {XMLConstants, XmlParser, } from "@magic/utils";
import {ExecutionStack} from "../../rt/ExecutionStack";
import {Operation} from "../../rt/Operation";
import {ConstInterface} from "../../ConstInterface";
import {CommandSerializationHelper} from "./CommandSerializationHelper";
import {MGDataCollection} from "../../tasks/MGDataCollection";
import {Task} from "../../tasks/Task";
import {ClientOriginatedCommandTaskTag} from "../ClientOriginatedCommandTaskTag";


export class ExecOperCommand extends ClientOriginatedCommandTaskTag {
  private ExecutionStack: ExecutionStack = null;
  TaskTag: string = null;
  HandlerId: string = null;
  OperIdx: number = 0;
  DitIdx: number = 0;
  Val: string = null;
  MprgCreator: Task = null;
  Operation: Operation = null;
  CheckOnly: boolean = false;

  get CommandTypeAttribute(): string {
    return ConstInterface.MG_ATTR_VAL_EXEC_OPER;
  }

  /// <summary>
  /// CTOR
  /// </summary>
  constructor() {
    super();
    this.DitIdx = Int32.MinValue;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="hasChildElements"></param>
  /// <returns></returns>
  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    let helper: CommandSerializationHelper = new CommandSerializationHelper();

    let execStackExists: boolean = this.ExecutionStack !== null && !this.ExecutionStack.empty();

    helper.SerializeTaskTag(this.TaskTag);
    if (this.HandlerId !== null && !execStackExists)
      helper.SerializeAttribute(ConstInterface.MG_ATTR_HANDLERID, this.HandlerId);

    if (this.OperIdx > Int32.MinValue && !execStackExists)
      helper.SerializeAttribute(ConstInterface.MG_ATTR_OPER_IDX, this.OperIdx);

    if (this.Operation.getType() === ConstInterface.MG_OPER_CALL && this.Operation.getRouteParams() !== null) {
      helper.SerializeRouteParams(this.Operation);
    }
    if (this.Val !== null)
      helper.SerializeAttribute(XMLConstants.MG_ATTR_VALUE, XmlParser.escape(this.Val));

    if (this.CheckOnly)
      helper.SerializeAttribute(ConstInterface.MG_ATTR_CHECK_ONLY, "1");

    return helper.GetString();
  }

  /// <summary>
  ///   sets the execstack of the current command to be sent to the server
  /// </summary>
  /// <param name = "execStack">- current execution stack of raise event operations from rt </param>
  SetExecutionStack(execStack: ExecutionStack): void {
    this.ExecutionStack = new ExecutionStack();
    this.ExecutionStack.push(MGDataCollection.Instance.getTaskIdById(this.TaskTag), this.HandlerId, this.OperIdx);
    this.ExecutionStack.pushUpSideDown(execStack);
  }

  /// <summary>
  /// extra data - add serialization of the execution stack
  /// </summary>
  /// <returns></returns>
  SerializeDataAfterCommand(): string {
    let execStackExists: boolean = this.ExecutionStack !== null && !this.ExecutionStack.empty();

    if (execStackExists) {
      let message: StringBuilder = new StringBuilder();
      this.ExecutionStack.buildXML(message);
      return message.ToString();
    }
      return null;
  }
}
