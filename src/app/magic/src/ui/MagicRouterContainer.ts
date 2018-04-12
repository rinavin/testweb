import {ChangeDetectorRef, Component, OnInit, ComponentFactoryResolver, ViewContainerRef} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {BaseTaskMagicComponent} from './app.baseMagicComponent';
import {MagicEngine} from '../services/magic.engine';
import {GuiEvent} from "@magic/engine";

@Component({
  selector: 'app-container',
  template: `
  `
})
export class MagicRouterContainer implements OnInit {
  private componentRef = null;

  constructor(private changeDetectorRef: ChangeDetectorRef,
              private activatedRoute: ActivatedRoute,
              protected magic: MagicEngine,
              private componentFactoryResolver: ComponentFactoryResolver,
              private viewContainerRef: ViewContainerRef) {}

  ngOnInit() {
    if (BaseTaskMagicComponent.routeInfo === null) {
      let guiEvent: GuiEvent = new GuiEvent('RouterNavigate', null, 0);
      guiEvent.RouterPath = this.activatedRoute.snapshot.routeConfig.path;

      if (this.activatedRoute.snapshot.routeConfig.outlet !== 'primary')
        guiEvent.RouterOutletName = this.activatedRoute.snapshot.routeConfig.outlet;

      this.magic.insertEvent(guiEvent);
    }

    if (BaseTaskMagicComponent.routeInfo !== null) {
      let comp = null;
      comp = BaseTaskMagicComponent.componentListBase.getComponents(BaseTaskMagicComponent.routeInfo.formName);
      const componentFactory = this.componentFactoryResolver.resolveComponentFactory(comp);
      this.componentRef = this.viewContainerRef.createComponent(componentFactory);
      Object.assign(this.componentRef.instance, BaseTaskMagicComponent.routeInfo.parameters);

      BaseTaskMagicComponent.routeInfo = null;

      this.changeDetectorRef.detectChanges();
    }
  }

  ngOnDestroy() {
    // TODO Routing: Call close() only if the task is not already closed.
    // Task can be closed when a router is overlayed by another task via call operation.
    (<BaseTaskMagicComponent>this.componentRef.instance).close();
  }
}
