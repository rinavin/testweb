import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';
import {TaskMagicService} from '../services/task.magics.service';
import {StringBuilder} from "@magic/mscorelib"
import {PICInterface} from "@magic/utils"

@Pipe({
  name: 'timeformat'
})
export class TimeFormatPipe extends DatePipe implements PipeTransform {

  constructor(protected _task: TaskMagicService) {
    super('en-US');
  }

  transform(value: any, controlId: string): any {
    let mask: string = this._task.GetControlPictureMask (controlId);
    let formatStr: StringBuilder = new StringBuilder ();

    if (typeof value !== "undefined" && mask !== null) {
      for (let i: number = 0; i < mask.length;) {
        switch (mask.charCodeAt(i)) {
          case PICInterface.PIC_HH:
            formatStr.Append('hh');
            i += 2;
            break;
          case PICInterface.PIC_MMT:
            formatStr.Append('mm');
            i += 2;
            break;
          case PICInterface.PIC_SS:
            formatStr.Append('ss');
            i += 2;
            break;
          default:
            formatStr.Append(mask.charAt(i));
            i++;
            break;
        }
      }

      return super.transform(value, formatStr.ToString());
    }
    return value;
  }
}
