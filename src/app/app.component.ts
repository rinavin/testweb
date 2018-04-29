import {Component, OnInit, ChangeDetectorRef} from '@angular/core';
import {GuiCommand, CommandType} from "@magic/gui";
import { Title }     from '@angular/platform-browser';
import { BaseTaskMagicComponent,TaskMagicService ,ComponentListService,MagicEngine,GuiInteractiveExecutor} from "@magic/angular";


declare let myExtObject: any;

@Component({
  selector: 'app-root',
  template: `
    <ndc-dynamic [ndcDynamicComponent]="MainComp"
                 [ndcDynamicInputs]   ="MainCompParameters">
    </ndc-dynamic>
    
    <!--<app-magic-modal
      *ngIf="ModalFormDefinition.comp !== null"
      [ModalComp]          ="ModalFormDefinition.comp"
      [ModalCompParameters]="ModalFormDefinition.parameters">
    </app-magic-modal>-->
 `
})

export class AppComponent implements OnInit {
  MainComp          : Component;
  MainCompParameters: any;

  ModalFormDefinition: ModalFormDefinition = new ModalFormDefinition();

  constructor(protected magic: MagicEngine,
              protected changeDetectorRef: ChangeDetectorRef,
              private componentList:ComponentListService,
              private titleService: Title) {

    this.initializeMagic();
    this.setTitle();
  }

  ngOnInit() {
    this.magic.startMagic();
  }

  initializeMagic() {
    this.regUpdatesUI();
  }

  public setTitle( ) {
    const newTitle: string = this.componentList.title;
    this.titleService.setTitle( newTitle );
  }

  private InjectComponent(formName: string, taskId: string, taskDescription: string) {
    this.MainComp = this.componentList.getComponent(formName);
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
          this.ModalFormDefinition.comp = this.componentList.getComponent(command.str);
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
