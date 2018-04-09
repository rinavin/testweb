import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {BaseTaskMagicComponent} from './app.baseMagicComponent';

@Component({
  selector: 'app-container',
  template: `
    <ndc-dynamic [ndcDynamicComponent]="MainComp"
                 [ndcDynamicInputs]="MainCompParameters">
    </ndc-dynamic>
  `
})
export class MagicRouterContainer implements OnInit {
  private MainComp = null;
  private MainCompParameters: any = {};

  constructor(private changeDetectorRef: ChangeDetectorRef) {}

  ngOnInit() {
    if (BaseTaskMagicComponent.routeInfo !== null) {

      this.MainComp = BaseTaskMagicComponent.componentListBase.getComponents(BaseTaskMagicComponent.routeInfo.formName);
      this.MainCompParameters = BaseTaskMagicComponent.routeInfo.parameters;

      BaseTaskMagicComponent.routeInfo = null;

      this.changeDetectorRef.detectChanges();
    }
  }
}
