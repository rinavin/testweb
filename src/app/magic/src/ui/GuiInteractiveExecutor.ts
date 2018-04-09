import {GuiInteractive, InteractiveCommandType, Styles} from "@magic/gui";
import {BaseTaskMagicComponent} from './app.baseMagicComponent';
import {isNullOrUndefined} from "util";
import {TaskMagicService} from '../services/task.magics.service';
import {confirmationBox} from './magic-confirmationBox'

export class GuiInteractiveExecutor {
  command: GuiInteractive;
  component: BaseTaskMagicComponent;
  task: TaskMagicService;

  Run(): void {
    // Sets the currentContextID
    try {
      switch (this.command._commandType) {

        case InteractiveCommandType.GET_VALUE:
          this.onValue();
          break;

        case InteractiveCommandType.GET_ROWS_IN_PAGE:
          this.onGetRowsInPage();
          break;
        case InteractiveCommandType.MESSAGE_BOX:
          this.OnMessageBox();
          break;
      }
    }

    catch (ex) {
      throw ex;
      //want to see all the exceptions for now
    }
  }


  private onValue(): void {
    let result = this.task.getFormControl("" + this.command._line, this.command.controlName);
    let val: any;
    if (!isNullOrUndefined(result)) {
      val = result.value;
    }
    else if (this.task.isTableControl(this.command.controlName))
      val = this.task.getValue(this.command.controlName, "" + this.command._line);

    val = this.component.ConvertValToNative(this.command.controlName, this.command._line, val);

    this.command._mgValue.obj = val;
  }

  private onGetRowsInPage(): void {
    this.command._intVal1 = this.component.getPageSize();
  }

  private OnMessageBox() {

    this.command._mgValue.number = confirmationBox.showConfirmationBox(this.command._mgValue.title, this.command._mgValue.str, this.command._mgValue.style);
  }
}
