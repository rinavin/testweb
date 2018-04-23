import {RefParam, Int32} from "@magic/mscorelib";
import {StorageAttribute} from "@magic/utils";
import {CommandSerializationHelper} from "./CommandSerializationHelper";
import {Task} from "../../tasks/Task";
import {ConstInterface} from "../../ConstInterface";
import {ClientOriginatedCommandTaskTag} from "../ClientOriginatedCommandTaskTag";

export class EvaluateCommand extends ClientOriginatedCommandTaskTag {
  TaskTag: string = null;
  ExpIdx: number = 0;
  ExpType: StorageAttribute;
  LengthExpVal: number = 0;
  MprgCreator: Task = null;

  get CommandTypeAttribute(): string {
    return ConstInterface.MG_ATTR_VAL_EVAL;
  }

  /// <summary>
  /// CTOR
  /// </summary>
  constructor() {
    super();
    this.LengthExpVal = Int32.MinValue;
  }

  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    let helper: CommandSerializationHelper = new CommandSerializationHelper();

    helper.SerializeTaskTag(this.TaskTag);
    helper.SerializeAttribute(ConstInterface.MG_ATTR_EXP_IDX, this.ExpIdx);

    if (this.ExpType !== StorageAttribute.NONE) {
      let maxDigits: string = "";
      if (this.LengthExpVal > 0)
        maxDigits += this.LengthExpVal;

      helper.SerializeAttribute(ConstInterface.MG_ATTR_EXP_TYPE, <string>this.ExpType + maxDigits);
    }
    if (this.MprgCreator !== null)
      helper.SerializeAttribute(ConstInterface.MG_ATTR_MPRG_SOURCE, this.MprgCreator.getTaskTag());

    return helper.GetString();
  }
}
