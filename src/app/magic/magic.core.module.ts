import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {MagicEngine} from "./src/services/magic.engine";
import {MagicFullControlDirective} from "./src/ui/magic-fullcontrol-directive.directive";
import {MagicNoControlDirective} from "./src/ui/magic-nocontrol-directive.directive";
import {MagicDefaultValueAccessor, MagicFormControlNameDirective} from "./src/ui/magic.form-control-name.directive";
import {MagicModalWindow} from "./src/ui/magic-modal/magic-modal-window";
import {MagicRouterContainer} from './src/ui/MagicRouterContainer';

import {DynamicModule} from 'ng-dynamic-component';

import {ComponentsList} from '../ComponentList';
import {ThemeModule} from './src/ui/theme/theme.module';
import {AlphaDirective} from './src/ui/magic-alpha-directive.directive';
import {DateFormatPipe} from './src/ui/magic-datetransform-pipe';
import {TimeFormatPipe} from './src/ui/magic-timetransform-pipe';
import {Subform} from './src/ui/subform-component';

const comps = ComponentsList.getAllComponents();


const decs = [
  MagicFullControlDirective,
  MagicNoControlDirective,
  MagicDefaultValueAccessor,
  MagicFormControlNameDirective,
  MagicModalWindow,
  AlphaDirective,
  DateFormatPipe,
  TimeFormatPipe,
  MagicRouterContainer,
  Subform

];

@NgModule({
  declarations: decs,
  exports: decs,
  imports: [
    CommonModule,
    ThemeModule,
    DynamicModule.withComponents([MagicModalWindow])
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
