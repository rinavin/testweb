import {List} from "@magic/mscorelib";

export class GuiEvent {
  EventType: string = null;
  TaskID: string = null;
  ControlName: string = null;
  Line: number = 0;
  PageSize: number = 0;
  Value: string = null;
  RouterPath: string = null;
  RouterOutletName: string = null;
  RouterParams: List<any> = null;

  constructor();
  constructor(eventType: string, controlName: string, line: number)
  constructor(eventType?: string, controlName?: string, line?: number){
    if (arguments.length === 3) {
      this.EventType = eventType;
      this.ControlName = controlName;
      this.Line = line;
    }
  }
}
