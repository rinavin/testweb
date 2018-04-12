import {Directive, ElementRef, HostListener, Input, Renderer2, ViewContainerRef} from '@angular/core';
import {MagicFullControlDirective} from './magic-fullcontrol-directive.directive';
import {TaskMagicService} from '../services/task.magics.service';
import {MagicDirectiveBase} from './magic-directive-base.directive';

@Directive({
  selector: 'input[type=checkbox][magic]'
 // selector: 'input[type=checkbox][magic]'
})
export class MagicCheckboxDirective extends MagicFullControlDirective {
  @HostListener('change', ['$event'])
  onChange($event) {
    console.log('MagicCheckboxDirective mgOnCheckChanged');
    //TODO: use this insted of explicite handler in generated code
    //this.component.mgOnCheckChanged($event, this.id, +this.rowId);
  }

}


@Directive({
  selector: 'mat-checkbox[magic]'
})
export class MatCheckboxDirective extends MagicCheckboxDirective {
}
