import {
  Component, ComponentFactoryResolver, ComponentRef, Injector, Input, OnInit, ReflectiveInjector, ViewChild,
  ViewContainerRef
} from '@angular/core';
import {BaseTaskMagicComponent} from '../app.baseMagicComponent';

@Component({
  selector: 'app-magic-modal',
  template: `
    <div>
      <div class="modal-foreground">
        <div class="modal-header">
          {{getText()}}
          <P align="RIGHT">
          <button (click)="OnClick()">X</button>
          </P>
          <HR style="height:2px;border-width:0;background-color:red">
        </div>
        <div #modalbody>
        </div>
      </div>
      <div class="modal-background"> </div>
    </div>
  `,
  styleUrls: ['./magic-modal.component.css']
})
export class MagicModalComponent implements OnInit {
  @ViewChild('modalbody', {read: ViewContainerRef}) viewContainerRef;

  @Input() private ModalComp = null;
  @Input() private ModalCompParameters: any = {};

  private componentRef = null;

  constructor(
    private injector: Injector,
    private componentFactoryResolver: ComponentFactoryResolver) {
  }

  ngOnInit() {
    const factory = this.componentFactoryResolver.resolveComponentFactory(this.ModalComp);
    this.componentRef = this.viewContainerRef.createComponent(factory);
    Object.assign(this.componentRef.instance, this.ModalCompParameters);
  }

  getText() {
    if (this.componentRef !== null) {
      let comp: BaseTaskMagicComponent = this.componentRef.instance as BaseTaskMagicComponent;
      return comp.taskId;
    }
    else
      return "";
  }

  OnClick() {
    this.componentRef.instance.close();
  }
}
