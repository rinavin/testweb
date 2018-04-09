import {
  Component, ComponentFactoryResolver, Injector, Input, OnInit, ReflectiveInjector, ViewChild,
  ViewContainerRef, ElementRef
} from '@angular/core';
import {BaseModalComponent} from './magic-baseModalComponent';
import {WindowPosition} from '@magic/utils';
import {isNullOrUndefined} from "util";

@Component({
  selector: 'app-magic-modal',
  template: `
    <div>
      <div class="modal-foreground" [ngStyle]="getStyle()">
        <div #modalheader class="modal-header" *ngIf="getShowTitleBar()">
          {{getText()}}
          <button (click)="OnClick()" style="float:right">X</button>
        </div>
        <div #modalbody>
        </div>
      </div>
      <div class="modal-background">
        <button (click)="OnClick()" style="float:right; border: none; background-color: transparent; outline: none; color: white" *ngIf="!getShowTitleBar()">X</button>
      </div>
    </div>
  `,
  styleUrls: ['./magic-modal-window.css']
})
export class MagicModalWindow implements OnInit {
  @ViewChild('modalbody', {read: ViewContainerRef}) modalbodyViewContainerRef;
  @ViewChild('modalheader') headerElementRef: ElementRef;

  @Input() private ModalComp = null;
  @Input() private ModalCompParameters: any = {};

  private componentRef = null;

  constructor(
    private injector: Injector,
    private componentFactoryResolver: ComponentFactoryResolver) {
  }

  ngOnInit() {
    const factory = this.componentFactoryResolver.resolveComponentFactory(this.ModalComp);
    this.componentRef = this.modalbodyViewContainerRef.createComponent(factory);
    Object.assign(this.componentRef.instance, this.ModalCompParameters);
  }

  getText() {
    if (this.componentRef !== null) {
      let comp: BaseModalComponent = this.componentRef.instance as BaseModalComponent;
      return comp.FormName;
    }
    else
      return "";
  }

  getStyle() {
    let styles = {};
    let comp: BaseModalComponent = this.componentRef.instance as BaseModalComponent;

    styles['width'] = comp.Width + "px";

    const headerHeight = this.getShowTitleBar() && !isNullOrUndefined(this.headerElementRef) ? (this.headerElementRef.nativeElement.offsetHeight + 1) : 0;
    const height = headerHeight + comp.Height;
    styles['height'] = height + "px";

    if (comp.WindowPosition === WindowPosition.CenteredToWindow) {
      styles['margin'] = "auto";
    }
    else {
      styles['margin-left'] = comp.X + "px";
      styles['margin-top'] = comp.Y + "px";
    }

    return styles;
  }

  getShowTitleBar() {
    let comp: BaseModalComponent = this.componentRef.instance as BaseModalComponent;
    return comp.ShowTitleBar;
  }

  OnClick() {
    this.componentRef.instance.close();
  }
}
