import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';
import {TaskMagicService} from '../services/task.magics.service';
import {StringBuilder} from "@magic/mscorelib"
import {PICInterface} from "@magic/utils"

export class Constants {
  static readonly DATE_FMT = 'dd/MMM/yyyy';
}

@Pipe({
  name: 'dateformat'
})
export class DateFormatPipe extends DatePipe implements PipeTransform {

  constructor(protected _task: TaskMagicService) {
    super('en-US');

    }

  transform(value: any, controlId: string): any {

    let mask: string = this._task.GetControlPictureMask (controlId);
    let formatStr: StringBuilder = new StringBuilder ();

    if (typeof value !== "undefined" && mask !== null) {
      for (let i: number = 0; i < mask.length;) {
        switch (mask.charCodeAt(i)) {
          case PICInterface.PIC_YYYY:
            formatStr.Append('yyyy');
            i += 4;
            break;
          case PICInterface.PIC_MMD:
            formatStr.Append('MM');
            i += 2;
            break;
          case PICInterface.PIC_YY:
            formatStr.Append('yy');
            i += 2;
            break;
          case PICInterface.PIC_MMM:
            formatStr.Append('MMM');
            i += 2;

            break;
          case PICInterface.PIC_DD:
            formatStr.Append('dd');
            i += 2;

            break;

          case PICInterface.PIC_DDD:
            formatStr.Append('EEE');
            i += 3;

            break;

          case PICInterface.PIC_DDDD:
            formatStr.Append('EEEE');
            i += 4;

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
