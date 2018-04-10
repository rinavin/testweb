import {Directive, ElementRef, HostListener, Input, Renderer2, ViewContainerRef} from '@angular/core';
import {MagicFullControlDirective} from './magic-fullcontrol-directive.directive';
import {TaskMagicService} from '../services/task.magics.service';
import {MagicDirectiveBase} from './magic-directive-base.directive';

@Directive({
  selector: 'mat-checkbox[magic], input[type=checkbox][magic]'
 // selector: 'input[type=checkbox][magic]'
})
export class MagicCheckboxDirective extends MagicFullControlDirective {
  // CTOR
  constructor(element: ElementRef,
              renderer: Renderer2,
              _task: TaskMagicService,
              vcRef: ViewContainerRef) {
    super(element, renderer, _task, vcRef);
    console.log('MagicCheckboxDirective');
  }

  @HostListener('change', ['$event'])
  onChange($event) {
    console.log('MagicCheckboxDirective mgOnCheckChanged');
    this.component.mgOnCheckChanged($event, this.id, +this.rowId);
  }

}
