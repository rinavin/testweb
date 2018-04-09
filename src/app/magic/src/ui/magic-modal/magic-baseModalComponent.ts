import {BaseTaskMagicComponent} from '../app.baseMagicComponent';
import {ElementRef, ViewChild} from '@angular/core';

export abstract class BaseModalComponent extends BaseTaskMagicComponent {
  @ViewChild('mainbody') mainBodyElement: ElementRef;

  abstract get X();
  abstract get Y();
  abstract get WindowPosition();
  abstract get FormName();
  abstract get ShowTitleBar();

  get Width() {
    return this.mainBodyElement.nativeElement.offsetWidth;
  }

  get Height() {
    return this.mainBodyElement.nativeElement.offsetHeight;
  }
}
