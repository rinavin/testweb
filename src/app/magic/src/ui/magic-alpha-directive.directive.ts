import { Directive, OnInit, ElementRef} from '@angular/core';
import { NgControl } from '@angular/forms';
import {TaskMagicService} from "../services/task.magics.service";
import {StringBuilder} from "@magic/mscorelib"
import {PICInterface} from "@magic/utils"

@Directive({
  selector: '[alphadirective]',
  host: {

    '(change)': 'onEvent($event, true)'
  }
})


export class AlphaDirective implements OnInit {

  constructor(private el: ElementRef, private control: NgControl, protected _task: TaskMagicService) { }


  public onEvent($event){
    let value: string = this.el.nativeElement.value;

    //this.magic.
    if (value !== null && value.length > 0)
    {
      const newValue: string = this._task.GetRangedValue (this.control.name, value);
      if (newValue != null)
        value = newValue;

      let mask: string = this._task.GetControlPictureMask (this.control.name);
      let valueStr: StringBuilder = new StringBuilder ();

      for (let i: number = 0; i < value.length; i++) {
        switch (mask.charCodeAt(i)){
          case PICInterface.PIC_U:
            valueStr.Append(value.charAt(i).toUpperCase());
            break;
          case PICInterface.PIC_L:
            valueStr.Append(value.charAt(i).toLowerCase());
            break;
          default:
            valueStr.Append(value.charAt(i));
            break;
          }
      }

      this.control.control.setValue(valueStr.ToString());

    }
  }

  ngOnInit(): void {
  }


}
