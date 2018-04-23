/// <summary>
///   An interface to define the constantes used by the Picture mechanism.
/// </summary>

export class PICInterface {
  //--------------------------------------------------------------------------
  // TEMP!
  //--------------------------------------------------------------------------

  static readonly PIC_X: number = 1;
  static readonly PIC_U: number = 2;
  static readonly PIC_L: number = 3;
  static readonly PIC_N: number = 4;
  static readonly PIC_YY: number = 5;
  static readonly PIC_YYYY: number = 6;
  static readonly PIC_MMD: number = 7;
  static readonly PIC_MMM: number = 8;
  static readonly PIC_DD: number = 9;
  static readonly PIC_DDD: number = 10;
  static readonly PIC_DDDD: number = 11;
  static readonly PIC_W: number = 12;
  static readonly PIC_WWW: number = 13;
  static readonly PIC_HH: number = 14;
  static readonly PIC_MMT: number = 15;
  static readonly PIC_SS: number = 16;
  static readonly PIC_PM: number = 17;
  static readonly PIC_HYYYYY: number = 18; // Hebrew year
  static readonly PIC_HL: number = 19; // Hebrew thousand year
  static readonly PIC_HDD: number = 20; // Hebrew day of month
  static readonly PIC_MS: number = 21; // Milliseconds
  static readonly PIC_LOCAL: number = 23; // the space between PIC_LOCAL and PIC_MAX_OP
  static readonly PIC_MAX_MSK_LEN: number = 100;

  // JPN: Japanese date picture support
  static readonly PIC_JY1: number = PICInterface.PIC_LOCAL + 0; // the name of an era (1 byte)
  static readonly PIC_JY2: number = PICInterface.PIC_LOCAL + 1; // the name of an era (2 bytes)
  static readonly PIC_JY4: number = PICInterface.PIC_LOCAL + 2; // the name of an era (4 bytes)
  static readonly PIC_YJ: number = PICInterface.PIC_LOCAL + 3;  // a year of an era
  static readonly PIC_BB: number = PICInterface.PIC_LOCAL + 4;  // a day of the week (2, 4 or 6 bytes)

  // DBCS pictures for iSeries
  static readonly PIC_J: number = PICInterface.PIC_LOCAL + 5; // DBCS only (with SO/SI)
  static readonly PIC_T: number = PICInterface.PIC_LOCAL + 6; // All SBCS or All DBCS (with SO/SI)
  static readonly PIC_G: number = PICInterface.PIC_LOCAL + 7; // DBCS only (without SO/SI)
  static readonly PIC_S: number = PICInterface.PIC_LOCAL + 8; // SBCS only
  static readonly PIC_MAX_OP: number = 31; // is reserved for DLL"s picture
  static readonly NULL_CHAR: number = -1;
  static readonly DB_STR_MAX: number = 255;
  static readonly DAYSINFOURCENT: number = 146097; // ((365*4+1)*25-1)*4+1 */
  static readonly DAYSINCENTURY: number = 36524; // (365*4+1)*25-1 */
  static readonly DAYSINFOURYEAR: number = 1461; // 365*4+1 */
  static readonly DAYSINYEAR: number = 365;
  static readonly DAYSINMONTH: number = 31;
  static readonly DATE_BUDDHIST_GAP: number = 543; // years above the gregorian date
  static readonly DEFAULT_DATE: string = "693961";
  static readonly DEFAULT_TIME: string = "0";
  static readonly date_day_tab: number[] = [
    0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365
  ];

  static readonly date_month_str: string[] = [
    "          ", "January   ", "February  ", "March     ", "April     ", "May       ", "June      ", "July      ", "August    ", "September ", "October   ", "November  ", "December  "
  ];

  static readonly date_dow_str: string[] = [
    "          ", "Sunday    ", "Monday    ", "Tuesday   ", "Wednesday ", "Thursday  ", "Friday    ", "Saturday  "
  ];

  //public final static readonly int    DEF_century       = 1920;
  //public final static readonly Nchar   DEF_date_mode     = 'E';
  // vec of pictures that can be given a numeric char only
  static readonly NumDirective: number[] = [
    4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16
  ];

  constructor() {
  }
}
