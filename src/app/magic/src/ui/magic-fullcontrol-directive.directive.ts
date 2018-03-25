import {Directive, ElementRef, Input, OnInit, Renderer2, ViewContainerRef} from '@angular/core';
import {MagicDirectiveBase} from "./magic-directive-base.directive";
import {TaskMagicService} from "../services/task.magics.service";

@Directive({
  selector: '[magic]'
})

// magic directive for full-control
export class MagicFullControlDirective extends MagicDirectiveBase {

  @Input('magic') set magic(val) {this.id = val; this.selector = 'magic';};

  // CTOR
  constructor(element: ElementRef,
              renderer: Renderer2,
              _task: TaskMagicService,
              vcRef: ViewContainerRef) {
    super(element, renderer, _task, vcRef);
  }
}




