import * as momentNs from 'moment';
const moment = momentNs;

export enum DateTimeKind {
  Local,
  Utc
}

// @dynamic
export class DateTime {
  private dt: Date = null;
  private kind: DateTimeKind = null;

  // the number of .net ticks at the unix epoch
  private readonly epochTicks = 621355968000000000;

  // there are 10000 .net ticks per millisecond
  private readonly ticksPerMillisecond = 10000;

  get Ticks(): number {
    // https://stackoverflow.com/questions/7966559/how-to-convert-javascript-date-object-to-ticks
    // TODO - check if we need this or to use Misc.getSystemMilliseconds()
    return ((this.dt.getTime() * this.ticksPerMillisecond) + this.epochTicks) - (this.dt.getTimezoneOffset() * 600000000);
  }

  get Year(): number {
    return this.kind === DateTimeKind.Utc ? this.dt.getUTCFullYear() : this.dt.getFullYear();
  }

  get Month(): number {
    return this.kind === DateTimeKind.Utc ? this.dt.getUTCMonth() + 1 : this.dt.getMonth() + 1;
  }

  get Day(): number {
    return this.kind === DateTimeKind.Utc ? this.dt.getUTCDate() : this.dt.getDate();
  }

  get Hour(): number {
    return this.kind === DateTimeKind.Utc ? this.dt.getUTCHours() : this.dt.getHours();
  }

  get Minute(): number {
    return this.kind === DateTimeKind.Utc ? this.dt.getUTCMinutes() : this.dt.getMinutes();
  }

  get Second(): number {
    return this.kind === DateTimeKind.Utc ? this.dt.getUTCSeconds() : this.dt.getSeconds();
  }

  get Millisecond(): number {
    return this.kind === DateTimeKind.Utc ? this.dt.getUTCMilliseconds() : this.dt.getMilliseconds();
  }


  constructor(date: Date);
  constructor(year: number, month: number, day: number);
  constructor(year: number, month: number, day: number, hour : number, minute : number, second: number);
  constructor(yearOrDate: any, month?: number, day?: number, hour?: number, minute?: number, second?: number) {
    if (arguments.length === 1) {
      this.dt = <Date>yearOrDate;
    }
    if (arguments.length === 3) {
      this.dt = new Date(<number>yearOrDate, month - 1, day);
    }
    if (arguments.length === 6) {
      this.dt = new Date(<number>yearOrDate, month - 1, day, hour, minute, second);
    }
    this.kind = DateTimeKind.Local;
  }




  Format(formatString: string): string {
    return moment(this.dt).format(formatString);
  }

  static get UtcNow(): DateTime {
    let d = new DateTime(new Date());
    d.kind = DateTimeKind.Utc;
    return d;
  }

  static get Now(): DateTime {
    let d = new DateTime(new Date());
    d.kind = DateTimeKind.Local;
    return d;
  }

  static GetTotalSecondsFromMidnight(utcTime: boolean, date: Date): number {
    let hh = utcTime ? date.getUTCHours() : date.getHours();
    let mm = utcTime ? date.getUTCMinutes() : date.getMinutes();
    let ss = utcTime ? date.getUTCSeconds() : date.getSeconds();

    return hh * 60 * 60 + mm * 60 + ss;
  }
}


