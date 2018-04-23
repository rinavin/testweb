import {ConstInterface} from "../../ConstInterface";
import {QueryCommand} from "./QueryCommand";

export class GlobalParamsQueryCommand extends QueryCommand {
  SerializeQueryCommandData(): string {
    return ConstInterface.MG_ATTR_VAL_QUERY_GLOBAL_PARAMS + "\"";
  }

  constructor() {
    super();
  }
}
