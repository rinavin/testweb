/**
 * Created by rinav on 05/07/2017.
 */
import {Injectable} from "@angular/core";
import {Subject} from "rxjs/Subject";
import {MagicBridge, GuiEvent} from "@magic/engine";
import {UIBridge, GuiCommand, GuiInteractive} from "@magic/gui";


@Injectable()
export class MagicEngine {
  magic = MagicBridge;
  isStub  = false;
  //TODO - unregister
  refreshDom: Subject<GuiCommand> = new Subject();
  interactiveCommands: Subject<GuiInteractive> = new Subject();

  startMagic() {
    this.magic.registerExecuteCommands(data => {
      if (!this.isStub) {
        const list = data as GuiCommand[];
        for (let c of list) {
          this.refreshDom.next(c);
        }
      }
    });

    this.magic.registerInteractiveCallback(data => {
      if (!this.isStub) {
          this.interactiveCommands.next(data);
        }
    });

    this.magic.StartMagic();
  }

  insertEvent(guiEvent: GuiEvent) {
    if (!this.isStub)
      this.magic.insertEvent(guiEvent);

  }

  saveData(data:string)
  {
    //this.magic.saveData(data);
  }

}
