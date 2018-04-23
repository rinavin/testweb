import {EventCommand} from "./EventCommand";
import {CommandSerializationHelper} from "./CommandSerializationHelper";
import {InternalInterface} from "@magic/utils";
import {ConstInterface} from "../../ConstInterface";
import {RefParam} from "@magic/mscorelib";

export class BrowserEscEventCommand extends EventCommand {
  ExitByMenu: boolean = false;
  CloseSubformOnly: boolean = false;

  /// <summary>
  /// CTOR
  /// </summary>
  constructor() {
    super(InternalInterface.MG_ACT_BROWSER_ESC);
  }


  /// <summary>
  ///
  /// </summary>
  /// <param name="hasChildElements"></param>
  /// <returns></returns>
  SerializeCommandData(refHasChildElements: RefParam<boolean>): string {
    let helper: CommandSerializationHelper = new CommandSerializationHelper();

    helper.SerializeTaskTag(this.TaskTag);
    helper.SerializeMagicEvent(this.MagicEvent);
    if (this.ExitByMenu)
      helper.SerializeAttribute(ConstInterface.MG_ATTR_EXIT_BY_MENU, "1");

    helper.SerializeAttribute(ConstInterface.MG_ATTR_OBJECT, "1");
    helper.SerializeCloseSubformOnly(this.CloseSubformOnly);

    return helper.GetString();
  }
}
