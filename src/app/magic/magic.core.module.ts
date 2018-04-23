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
import {BooleanDirective} from './src/ui/magic-boolean-directive.directive';
import {DateFormatPipe} from './src/ui/magic-datetransform-pipe';
import {TimeFormatPipe} from './src/ui/magic-timetransform-pipe';
import {RangeValidator} from './src/ui/magic-range-validator.directive';
import {Subform} from './src/ui/subform-component';
import {MagicCheckboxDirective, MatCheckboxDirective} from './src/ui/magic-checkbox.directive';
import{RouterModule} from "@angular/router";

const comps = ComponentsList.getAllComponents();


const decs = [
  MagicFullControlDirective,

  MagicCheckboxDirective,
  MatCheckboxDirective,

  MagicNoControlDirective,
  MagicDefaultValueAccessor,
  MagicFormControlNameDirective,
  MagicModalWindow,
  AlphaDirective,
  BooleanDirective,
  DateFormatPipe,
  TimeFormatPipe,
  RangeValidator,
  MagicRouterContainer,
  Subform,
];

@NgModule({
  declarations: decs,
  exports: decs,
  imports: [
    CommonModule,
    ThemeModule,
    RouterModule,
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
