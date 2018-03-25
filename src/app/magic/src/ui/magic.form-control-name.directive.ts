import {Directive, forwardRef, Input} from "@angular/core";
import {DefaultValueAccessor, FormControlName, NG_VALUE_ACCESSOR} from "@angular/forms";

export const MAGIC_DEFAULT_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => MagicDefaultValueAccessor),
  multi: true
};


@Directive({
  selector: 'input[magic]:not([type=checkbox]):not([formControlName])',
  providers: [MAGIC_DEFAULT_VALUE_ACCESSOR]
})
export class MagicDefaultValueAccessor extends DefaultValueAccessor {

}


@Directive({
  selector: 'input[magic]:not([formControlName]):not([formControl])'
})
export class MagicFormControlNameDirective extends FormControlName {
  @Input()
  set magic(val: string) {
    this.name = val;

  }
}
