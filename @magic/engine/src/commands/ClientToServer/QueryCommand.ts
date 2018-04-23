import {RefParam, StringBuilder} from "@magic/mscorelib";
import {ClientOriginatedCommand} from "./ClientOriginatedCommand";
import {ConstInterface} from "../../ConstInterface";

/// <summary>
/// base class for query commands
/// </summary>
export abstract class QueryCommand extends ClientOriginatedCommand {
  get CommandTypeAttribute(): string {
    return ConstInterface.MG_ATTR_VAL_QUERY;
  }

  get ShouldSerializeRecords(): boolean {
    return false;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="hasChildElements"></param>
  /// <returns></returns>
  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    let message: StringBuilder = new StringBuilder();

    message.Append(" " + ConstInterface.MG_ATTR_VAL_QUERY_TYPE + "=\"");

    message.Append(this.SerializeQueryCommandData());

    return message.ToString();
  }

  abstract SerializeQueryCommandData(): string ;

  constructor() {
    super();
  }
}
