import {MenuEntry} from "./MenuEntry";
import {List, RefParam} from "@magic/mscorelib";
import {GuiMenuEntry_MenuType, MenuEntryProgram_SrcContext} from "../../GuiEnums";
import {MgMenu} from "./MgMenu";

export class MenuEntryProgram extends MenuEntry {
  CopyGlobalParameters: boolean = false;            // Global parameters should be copied or not (applicable for paralle progs)
  MainProgVars: List<string> = null;                // argument from the main program
  Description: string = null;
  Flow: string = null;                                     // RC / batch / BC / on-line
  Comp: number = 0;                                 // program's component
  Idx: number = 0;                                  // program index
  PublicName: string = null;                        // internal name of the called program
  Prompt: string = null;                            // prompt
  SourceContext: MenuEntryProgram_SrcContext = null;       // Main/Current
  ReturnCtxIdVee: number = 0;                       // Main Prg var to receive ctx id
  IsParallel: boolean = false;                      // Is Program parallel.
  ProgramIsn: number = 0;                           // program ISN, to be used in offline mode
  CtlIndex: number = 0;                             // CTL index, to be used in offline mode

  /// <summary>
  /// CTOR
  /// </summary>
  /// <param name="mgMenu"></param>
  constructor(mgMenu: MgMenu) {
    super(GuiMenuEntry_MenuType.PROGRAM, mgMenu);
  }

  /// <summary>
  /// ShouldSetModal
  /// </summary>
  /// <param name="isModal"></param>
  /// <param name="mainContextIsModal"></param>
  ShouldSetModal(isModal: boolean, mainContextIsModal: boolean): boolean {
    let setModal: boolean = true;
    if (this.IsParallel) {
      setModal = false;
    }
    else {
      if (isModal) {
        // If MainContext is not Modal(i.e. batch is not running in MainContext), then MenuEntryProgram should not be set to Modal.
        if (this.SourceContext === MenuEntryProgram_SrcContext.Main) {
          if (!mainContextIsModal)
            setModal = false;
        }
      }
    }
    return setModal;
  }

  protected OnSetEnabled(enabled: RefParam<boolean>, checkValidation: boolean, checkEnableSystemAction: boolean, checkForName: string, IsChildOfCheckForName: boolean, refresh: boolean): void {
    if (super.menuType() === GuiMenuEntry_MenuType.PROGRAM) {
      if (this.Idx <= 0) {
        enabled.value = false;
      }
    }
  }

  public getPrompt(): string {
    return this.Prompt;
  }
}
