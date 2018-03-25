import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {MagicEngine} from "./src/services/magic.engine";
import {MagicFullControlDirective} from "./src/ui/magic-fullcontrol-directive.directive";
import {MagicNoControlDirective} from "./src/ui/magic-nocontrol-directive.directive";
import {MagicDefaultValueAccessor, MagicFormControlNameDirective} from "./src/ui/magic.form-control-name.directive";
import {MagicModalComponent} from "./src/ui/magic-modal/magic-modal.component";

import {DynamicModule} from 'ng-dynamic-component';

import {ComponentsList} from '../ComponentList';
import {ThemeModule} from './src/ui/theme/theme.module';
const comps = ComponentsList.getAllComponents();

const decs = [
  MagicFullControlDirective,
  MagicNoControlDirective,
  MagicDefaultValueAccessor,
  MagicFormControlNameDirective,
  MagicModalComponent,


];

@NgModule({
  declarations: decs,
  exports: decs,
  imports: [
    CommonModule,
    ThemeModule,
    DynamicModule.withComponents([MagicModalComponent])
  ],
  entryComponents: [  comps]
})

export class MagicModule {
  static forRoot() {
    return {
      ngModule: MagicModule,
      providers: [
        MagicEngine,
      ]
    }
  }
}
