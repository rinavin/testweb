
import {Http} from "@angular/http";
import {UIBridge, GuiCommand} from "@magic/gui";
import {Subject} from "rxjs/Subject";
import {ClientManager} from "../ClientManager";
import {GuiEvent} from "./GuiEvent";


 export  class MagicBridge {
   static refreshDom: Subject<GuiCommand> = new Subject();

   static StartMagic(): void {
     ClientManager.Main();
   }

   static registerExecuteCommands(cb) {
     UIBridge.getInstance().registerExecuteCommandsCallback(cb);
   }

   static registerInteractiveCallback(cb) {
     UIBridge.getInstance().registerInteractiveCallback(cb);
   }

   static insertEvent(guiEvent: GuiEvent) {
     ClientManager.Instance.AddEvent(guiEvent);
   }

   static GetControlPictureMask(taskId: string, controlName: string): string {
     return ClientManager.GetControlPictureMask(taskId, controlName);
   }

   static GetRangedValue(taskId: string, controlName: string, value: string): string {
     return ClientManager.GetRangedValue(taskId, controlName, value);
   }


   static ValidateControlValue(taskId: string, controlName: string, value: any): string {
     return ClientManager.ValidateControlValue(taskId, controlName, value);
   }

   static GetFldRanges(taskId: string, controlName: string): string {
     return ClientManager.GetFldRanges(taskId, controlName);
   }
   }

