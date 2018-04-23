import {GuiCommand} from "./gui/low/GuiCommand";
import {GuiInteractive} from "./gui/low/GuiInteractive";


export declare type ExecuteCommandsCallback = (commands: GuiCommand[]) => void;
export declare type GetIntractiveCallback = (command: GuiInteractive) => string;

// @dynamic
  export class UIBridge {

    // define callbacks
    getInteractiveCallback : GetIntractiveCallback = null;
    executeCommandsCallback: ExecuteCommandsCallback = null;

    private static instance: UIBridge;

    private constructor() {
      // do something construct...
    }

    static getInstance() {
      if (!UIBridge.instance) {
        UIBridge.instance = new UIBridge();
        // ... any one time initialization goes here ...
      }
      return UIBridge.instance;
    }


    public ExecuteInteractiveCommand(command:GuiInteractive): string {
      if (this.getInteractiveCallback != null)
        return this.getInteractiveCallback( command);
      return "";
    }

    public executeCommands(commands: GuiCommand[]): void {
      if (this.executeCommandsCallback != null && commands != null) {
        this.executeCommandsCallback(commands);

      }
    }


    public registerInteractiveCallback(getIntractiveCallback: GetIntractiveCallback): void {
      this.getInteractiveCallback = getIntractiveCallback;
    }

    public registerExecuteCommandsCallback(executeCommandsCallback: ExecuteCommandsCallback): void {
      this.executeCommandsCallback = executeCommandsCallback;
    }

    // used to save stub data
    public saveData(data: string): void {
      console.log(data);
    }
  }
