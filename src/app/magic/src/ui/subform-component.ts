/**
 * Created by rinav on 10/09/2017.
 */
import {Component, Input, ViewContainerRef} from "@angular/core";
import {BaseTaskMagicComponent} from "./app.baseMagicComponent";

@Component({
  selector: 'm-subform',
  template:    `
    <ndc-dynamic  [ndcDynamicComponent]="Component" [ndcDynamicInputs]="Parameters">
    </ndc-dynamic>
`
})

//not working for now
export class Subform {
  id : string;
  @Input('magic') set magic(val) {this.id = val; };

  component: BaseTaskMagicComponent;

  constructor(private vcRef: ViewContainerRef) {
    this.component = (<any>this.vcRef)._view.component as BaseTaskMagicComponent;
  }

  get Component(): Component {
    return this.component.mgGetComp(this.id);
  }

  get Parameters(): any {
    return this.component.mgGetParameters(this.id);
  }
}

