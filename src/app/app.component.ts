import {Component, OnInit, ChangeDetectorRef} from '@angular/core';
import {MagicEngine} from "./magic/src/services/magic.engine";
import {ComponentsList} from './ComponentList';
import {BaseTaskMagicComponent} from "./magic/src/ui/app.baseMagicComponent";
import {GuiCommand, CommandType} from "@magic/gui";
import {GuiInteractiveExecutor} from './magic/src/ui/GuiInteractiveExecutor';
import { Title }     from '@angular/platform-browser';

declare let myExtObject: any;

@Component({
  selector: 'app-root',
  template: `
    <ndc-dynamic [ndcDynamicComponent]="MainComp"
                 [ndcDynamicInputs]="MainCompParameters">
    </ndc-dynamic>
    <app-magic-modal
      *ngIf="ModalFormDefinition.comp !== null"
      [ModalComp]="ModalFormDefinition.comp"
      [ModalCompParameters]="ModalFormDefinition.parameters">
    </app-magic-modal>
 `
})

export class AppComponent implements OnInit {
  private MainComp: Component;
  private MainCompParameters: any;

  private ModalFormDefinition: ModalFormDefinition = new ModalFormDefinition();

  constructor(protected magic: MagicEngine,
              protected changeDetectorRef: ChangeDetectorRef,
              private titleService: Title) {

    this.initializeMagic();
    BaseTaskMagicComponent.componentListBase = new ComponentsList();
    this.setTitle();
  }

  ngOnInit() {
    this.magic.startMagic();
  }

  initializeMagic() {
    this.regUpdatesUI();
  }

  public setTitle( ) {
    const newTitle: string = BaseTaskMagicComponent.componentListBase.getTitle();
    this.titleService.setTitle( newTitle );
  }

  private InjectComponent(formName: string, taskId: string, taskDescription: string) {
    this.MainComp = BaseTaskMagicComponent.componentListBase.getComponents(formName);
    this.MainCompParameters = {myTaskId: taskId, taskDescription: taskDescription};

    this.changeDetectorRef.detectChanges();
  }

  regUpdatesUI() {
    this.magic
      .refreshDom
      .filter(command => command.TaskTag === '0')
      .subscribe(command => {
        this.executeCommand(command);
      });

    this.magic
      .interactiveCommands
      .filter(command => command.TaskTag === '0')
      .subscribe(command => {
        let executor = new GuiInteractiveExecutor();
        executor.command = command;
        executor.Run();
      });
  }

  executeCommand(command: GuiCommand): void {
    console.log("AppComponent.executeCommand()");
    switch (command.CommandType) {
      case CommandType.OPEN_FORM:
        if(command.Bool1) { //open as modal dialog
          this.ModalFormDefinition.taskId = command.stringList[0];
          this.ModalFormDefinition.comp = BaseTaskMagicComponent.componentListBase.getComponents(command.str);
          this.ModalFormDefinition.parameters = {
            myTaskId: command.stringList[0],
            taskDescription: command.stringList[1]
          };
          this.changeDetectorRef.detectChanges();
        }
        else {
          this.InjectComponent(command.str, command.stringList[0], command.stringList[1]);
        }

        break;

      case CommandType.CLOSE_FORM:
        if (command.str === this.ModalFormDefinition.taskId) {
          this.ModalFormDefinition = new ModalFormDefinition();
        }
        break;
    }
  }
}

class ModalFormDefinition {
  taskId: string = "";
  comp: Component = null;
  parameters: any = {};
}
