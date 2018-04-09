import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {BaseTaskMagicComponent} from './app.baseMagicComponent';
import {MagicEngine} from '../services/magic.engine';
import {GuiEvent} from "@magic/engine";

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

  constructor(private changeDetectorRef: ChangeDetectorRef,
              private activatedRoute: ActivatedRoute,
              protected magic: MagicEngine) {}

  ngOnInit() {
    if (BaseTaskMagicComponent.routeInfo === null) {
      let guiEvent: GuiEvent = new GuiEvent('RouterNavigate', null, 0);
      guiEvent.RouterPath = this.activatedRoute.snapshot.routeConfig.path;

      if (this.activatedRoute.snapshot.routeConfig.outlet !== 'primary')
        guiEvent.RouterOutletName = this.activatedRoute.snapshot.routeConfig.outlet;

      this.magic.insertEvent(guiEvent);
    }

    if (BaseTaskMagicComponent.routeInfo !== null) {

      this.MainComp = BaseTaskMagicComponent.componentListBase.getComponents(BaseTaskMagicComponent.routeInfo.formName);
      this.MainCompParameters = BaseTaskMagicComponent.routeInfo.parameters;

      BaseTaskMagicComponent.routeInfo = null;

      this.changeDetectorRef.detectChanges();
    }
  }
}
