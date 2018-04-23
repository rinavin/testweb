import {RefParam} from "@magic/mscorelib";
import {CommandSerializationHelper} from "./CommandSerializationHelper";
import {ConstInterface} from "../../ConstInterface";
import {ClientOriginatedCommandTaskTag} from "../ClientOriginatedCommandTaskTag";

export class TransactionCommand extends ClientOriginatedCommandTaskTag {
  TaskTag: string = null;
  Oper: string;
  ReversibleExit: boolean = false;
  Level: string;

  get CommandTypeAttribute(): string {
    return ConstInterface.MG_ATTR_VAL_TRANS;
  }

  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    let helper: CommandSerializationHelper = new CommandSerializationHelper();

    helper.SerializeTaskTag(this.TaskTag);
    helper.SerializeAttribute(ConstInterface.MG_ATTR_OPER, this.Oper);
    if (!this.ReversibleExit)
      helper.SerializeAttribute(ConstInterface.MG_ATTR_REVERSIBLE, "0");

    if (this.Level !== '\0')
      helper.SerializeAttribute(ConstInterface.MG_ATTR_TRANS_LEVEL, this.Level);

    return helper.GetString();
  }

  constructor() {
    super();
  }
}
