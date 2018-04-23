import {DataviewCommand} from "./DataviewCommand";
import {MgControlBase} from "@magic/gui";

/// <summary>
/// ControlItemsRefreshCommand class
/// </summary>
export class ControlItemsRefreshCommand extends DataviewCommand {
  Control: MgControlBase = null;

  constructor() {
    super();
  }
}
