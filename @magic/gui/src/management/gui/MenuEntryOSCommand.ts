import {MenuEntry} from "./MenuEntry";
import {CallOsShow} from "@magic/utils";
import {MgMenu} from "./MgMenu";
import {GuiMenuEntry_MenuType} from "../../GuiEnums";

export class MenuEntryOSCommand extends MenuEntry {
  OsCommand: string = null;   // OS Command text
  Prompt: string = null;      // prompt
  Show: CallOsShow = 0;       // how to open the window
  Wait: boolean = false;      // wait till end of execution

  /// <summary>
  /// CTOR
  /// </summary>
  /// <param name="mgMenu"></param>
  constructor(mgMenu: MgMenu) {
    super(GuiMenuEntry_MenuType.OSCOMMAND, mgMenu);
    this.Show = CallOsShow.Normal;
  }

  /// <summary>
  /// ShouldSetModal
  /// </summary>
  /// <param name="isModal"></param>
  ShouldSetModal(isModal: boolean, mainContextIsModal: boolean): boolean {
    return true;
  }

  public getPrompt(): string {
    return this.Prompt;
  }
}
