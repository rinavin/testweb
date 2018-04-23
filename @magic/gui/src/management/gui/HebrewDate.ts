import {DisplayConvertor} from "./DisplayConvertor";
import {Events} from "../../Events";
import {MsgInterface} from "@magic/utils";
import {NString, RefParam, StringBuilder } from "@magic/mscorelib";

export class HebrewDate {
  private static PARTS_PER_HOUR: number = 1080;
  private static HOURS_PER_DAY: number = 24;
  private static PARTS_PER_DAY: number = (HebrewDate.HOURS_PER_DAY * HebrewDate.PARTS_PER_HOUR);
  private static MONTH_DAYS: number = 29;
  private static MONTH_EXTRA_PARTS: number = (12 * HebrewDate.PARTS_PER_HOUR + 793);
  private static PARTS_PER_MONTH: number = (HebrewDate.MONTH_DAYS * HebrewDate.PARTS_PER_DAY + HebrewDate.MONTH_EXTRA_PARTS);
  private static MONTHS_PER_NORM_YEAR: number = 12;
  private static MONTHS_PER_LEAP_YEAR: number = 13;
  private static NORM_YEARS_PER_CYCLE: number = 12;
  private static LEAP_YEARS_PER_CYCLE: number = 7;
  private static YEARS_PER_CYCLE: number = (HebrewDate.NORM_YEARS_PER_CYCLE + HebrewDate.LEAP_YEARS_PER_CYCLE);
  private static MONTHS_PER_CYCLE: number = (HebrewDate.NORM_YEARS_PER_CYCLE * HebrewDate.MONTHS_PER_NORM_YEAR + HebrewDate.LEAP_YEARS_PER_CYCLE * HebrewDate.MONTHS_PER_LEAP_YEAR);
  private static PARTS_PER_NORM_YEAR: number = (HebrewDate.MONTHS_PER_NORM_YEAR * HebrewDate.PARTS_PER_MONTH);
  private static DAYS_PER_NORM_YEAR: number = Math.floor(HebrewDate.PARTS_PER_NORM_YEAR / HebrewDate.PARTS_PER_DAY);
  private static PARTS_PER_LEAP_YEAR: number = (HebrewDate.MONTHS_PER_LEAP_YEAR * HebrewDate.PARTS_PER_MONTH);
  private static DAYS_PER_LEAP_YEAR: number = Math.floor(HebrewDate.PARTS_PER_LEAP_YEAR / HebrewDate.PARTS_PER_DAY);
  private static PARTS_PER_CYCLE: number = (HebrewDate.MONTHS_PER_CYCLE * HebrewDate.PARTS_PER_MONTH);
  private static DAYS_PER_CYCLE: number = Math.floor(HebrewDate.PARTS_PER_CYCLE / HebrewDate.PARTS_PER_DAY);
  private static CREATION_DOW: number = 2;
  private static CREATION_PARTS: number = (5 * HebrewDate.PARTS_PER_HOUR + 204);
  private static DAYS_TIL_JESUS: number = 1373428;

  private static HESHVAN: number = 2;
  private static KISLEV: number = 3;
  private static ADAR: number = 6;
  private static ADAR_B: number = 13;

  /*-----------------------------------------------------*/
  /* Hebrew numeric representation of each Hebrew letter */
  /* --------------------------------------------------- */
  private static DATEHEB_letters: number[] = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 20, 30, 40, 40, 50, 50, 60, 70,
    80, 80, 90, 90, 100, 200, 300, 400
  ];

  private static ALEF: string = 'א';
  private static TAV: string = 'ת';

  /* ------------------------------------------------ */
  /* N of Months from beginning of 19 years cycle, to */
  /* the beginning of a year (in the range 0 - 18)    */
  /* ------------------------------------------------ */
  private static DATEHEB_months_n: number[] = [
    0, 12, 24, 37, 49, 61, 74, 86, 99, 111, 123, 136, 148, 160, 173, 185, 197, 210, 222,
    235
  ];

  /* ------------------------------------------------------------------ */
  /* N of days from the beginning of a year to the beginning of a month */
  /* Tishrei, Heshvan, Kislev, Tevet, Shvat, Adar,                      */
  /* Nisan,   Iyar,    Sivan,  Tamuz, Av,    Elul                       */
  /* ------------------------------------------------------------------ */
  private static DATEHEB_norm_days_in_month: number[] = [
    30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 0
  ];
  private static DATEHEB_leap_days_in_month: number[] = [
    30, 29, 30, 29, 30, 30, 29, 30, 29, 30, 29, 30, 29
  ];

  private static MONTH_LEN: number = 5;
  private static _localMonths: string[] = new Array<string>(15);
  private static DOW_LEN: number = 5;
  private static _localDows: string[] = new Array<string>(8);

  /// <summary>
  /// calculate if year is leap
  /// </summary>
  /// <param name="year"></param>
  /// <returns></returns>
  private static dateheb_year_is_leap(year: number): boolean {
    year = year % HebrewDate.YEARS_PER_CYCLE;
    return (HebrewDate.DATEHEB_months_n[(year + 1)] - HebrewDate.DATEHEB_months_n[year] === 13);
  }

  /// <summary>
  /// calculate days in month
  /// </summary>
  /// <param name="month"></param>
  /// <param name="leap"></param>
  /// <param name="days_in_year"></param>
  /// <returns></returns>
  private static dateheb_days_in_month(month: number, leap: boolean, days_in_year: number): number {
    let days_in_month: number = leap ? HebrewDate.DATEHEB_leap_days_in_month[month - 1] : HebrewDate.DATEHEB_norm_days_in_month[month - 1];

    if (leap)
      days_in_year = days_in_year - 30;

    switch (days_in_year) {
      case 353:
        if (month === HebrewDate.KISLEV)
          days_in_month = 29;
        break;
      case 355:
        if (month === HebrewDate.HESHVAN)
          days_in_month = 30;
        break;
    }
    return days_in_month;
  }

  /// <summary>
  /// calculate days from creation till start of the year
  /// </summary>
  /// <param name="year"></param>
  /// <returns></returns>
  private static dateheb_year_start(year: number): number {

    /*---------------------------*/
    /* calculate "molad" of year */
    /*---------------------------*/
    year = year - 1;
    let cycle: number = Math.floor(year / HebrewDate.YEARS_PER_CYCLE);
    year = year % HebrewDate.YEARS_PER_CYCLE;

    /*---------------------------------------*/
    /* How many months passed since creation */
    /*---------------------------------------*/
    let months: number = cycle * HebrewDate.MONTHS_PER_CYCLE + HebrewDate.DATEHEB_months_n[year];

    /*-------------------------------------*/
    /* How many days passed since creation */
    /*-------------------------------------*/
    let days: number = months * HebrewDate.MONTH_DAYS;

    /*--------------------------------------------*/
    /* How many extra parts passed since creation */
    /*--------------------------------------------*/
    let parts: number = months * HebrewDate.MONTH_EXTRA_PARTS + HebrewDate.CREATION_PARTS;

    days = days + Math.floor(parts / HebrewDate.PARTS_PER_DAY);
    parts = parts % HebrewDate.PARTS_PER_DAY;

    /*---------------------------*/
    /* Reminder > 3/4 of a day ? */
    /*---------------------------*/
    if (<number>parts >= Math.floor(HebrewDate.PARTS_PER_DAY * 3 / 4)) {
      parts = 0;
      days = days + 1;
    }

    /*--------------------------------------------------*/
    /* verify day-of-week not Sunday, Wednesday, Friday */
    /*--------------------------------------------------*/
    let dow: number = (days - 1 + HebrewDate.CREATION_DOW) % 7 + 1;
    if ((dow === 1) || (dow === 4) || (dow === 6)) {
      parts = 0;
      days = days + 1;
    }

    /*-------------------------------*/
    /* verify if year too long/long */
    /*-------------------------------*/
    if (!HebrewDate.dateheb_year_is_leap(<number>year)) {
      if (dow === 3 && <number>parts >= (9 * HebrewDate.PARTS_PER_HOUR + 204))
        days = days + 2;
    }

    if (HebrewDate.dateheb_year_is_leap(<number>year + HebrewDate.YEARS_PER_CYCLE - 1)) {
      if (dow === 2 && <number>parts >= (15 * HebrewDate.PARTS_PER_HOUR + 589))
        days = days + 1;
    }

    return days;
  }

  /// <summary>
  /// Convert a Magic internal Date to a Hebrew date (year, month, day)
  /// Note that ADAR_B is represented by month = 13
  /// </summary>
  /// <param name="date"></param>
  /// <param name="hday"></param>
  /// <param name="hmonth"></param>
  /// <param name="hyear"></param>
  /// <returns>TRUE if leap year</returns>
  static dateheb_4_d(date: number, day: RefParam<number>, month: RefParam<number>, year: RefParam<number>): boolean {
    /*--------------------*/
    /* Days from creation */
    /*--------------------*/
    date = date + HebrewDate.DAYS_TIL_JESUS;

    /*--------------------------------*/
    /* Guess a year (<= correct year) */
    /*--------------------------------*/
    let cycle: number = Math.floor(date / (HebrewDate.DAYS_PER_CYCLE + 1));
    let days: number = date % (HebrewDate.DAYS_PER_CYCLE + 1);
    year.value = cycle * HebrewDate.YEARS_PER_CYCLE;
    year.value = year.value + Math.floor(days / (HebrewDate.DAYS_PER_LEAP_YEAR + 1));

    /*----------------------------*/
    /* Advance year until correct */
    /*----------------------------*/
    let next_year_start: number;
    while (true) {
      next_year_start = HebrewDate.dateheb_year_start(year.value + 1);
      if (next_year_start >= date)
        break;
      year.value = year.value + 1;
    }
    let curr_year_start: number = HebrewDate.dateheb_year_start(year.value);
    day.value = date - curr_year_start;
    let days_in_year: number = next_year_start - curr_year_start;
    let leap: boolean = days_in_year > 355;

    /*------------*/
    /* Find Month */
    /*------------*/
    let i: number;
    for (i = 1; i < 13; i = i + 1) {
      let days_in_month: number = HebrewDate.dateheb_days_in_month(i, leap, days_in_year);
      if (day.value <= days_in_month)
        break;
      day.value = day.value - days_in_month;
    }

    if (!leap || i <= HebrewDate.ADAR)
      month.value = i;
    else if (i === HebrewDate.ADAR + 1)
      month.value = HebrewDate.ADAR_B;
    else
      month.value = i - 1;

    return leap;
  }

  /// <summary>
  /// Compute a Hebrew letter to add to string, representing a numeric value
  /// </summary>
  /// <param name="val"></param>
  /// <param name="str"></param>
  /// <param name="strPos"></param>
  /// <param name="use_ending"></param>
  /// <param name="quote"></param>
  /// <returns></returns>
  static dateheb_i_2_h(val: number, str: string[], strPos: number, use_ending: boolean, quote: boolean): number {
    let let_idx: number = 0;
    let len: number = 0;

    while (val > 0) {
      for (let_idx = HebrewDate.DATEHEB_letters.length; let_idx > 0; let_idx = let_idx - 1) {
        let letter: number = HebrewDate.DATEHEB_letters[let_idx - 1];
        if (val >= letter) {
          val = val - letter;
          str[strPos++] = String.fromCharCode(HebrewDate.ALEF.charCodeAt(0) + let_idx - 1);
          len = len + 1;
          break;
        }
      }
    }

    if (len > 0) {
      if (len >= 2) {
        if (str[strPos - 2] === 'י')
          if (str[strPos - 1] === 'ה' || str[strPos - 1] === 'ו') {
            str[strPos - 2] = String.fromCharCode(str[strPos - 2].charCodeAt(0) - 1);
            str[strPos - 1] = str[strPos - 1] + '\u0001';
          }
      }

      // Final letters: only from 'מ'.
      if (let_idx > 10 && use_ending) {
        if (HebrewDate.DATEHEB_letters[let_idx - 1] === HebrewDate.DATEHEB_letters[let_idx - 2]) {
          str[strPos - 1] = String.fromCharCode(str[strPos - 1].charCodeAt(0) - 1);
        }
      }

      if (quote) {
        if (len === 1)
          str[strPos] = '\'';
        else {
          str[strPos] = str[strPos - 1];
          str[strPos - 1] = '"';
        }
        len = len + 1;
      }
    }
    return len;
  }

  /// <summary>
  /// Convert Hebrew year/day to a string
  /// </summary>
  /// <param name="outStr"></param>
  /// <param name="len"></param>
  /// <param name="full_len"></param>
  /// <param name="hyear"></param>
  /// <param name="trim"></param>
  /// <param name="use_ending"></param>
  /// <returns>length</returns>
  static dateheb_2_str(outStr: string[], strPos: number, len: number, out_len: RefParam<number>, full_len: number, hyear: number, trim: boolean, use_ending: boolean): number {
    let quote: boolean = len > full_len && outStr[strPos + full_len] === outStr[strPos];
    if (quote)
      full_len = full_len + 1;
    let heb_len: number = HebrewDate.dateheb_i_2_h(hyear % 1000, outStr, strPos, use_ending, quote);

    let rem_len: number = full_len - heb_len;
    if (rem_len > 0) {
      if (trim) {
        out_len.value = out_len.value - rem_len;
        let tmp_out_len: number = len - full_len;
        if (tmp_out_len > 0)
          DisplayConvertor.char_memcpy(outStr, strPos + heb_len, outStr, strPos + full_len, tmp_out_len);
        else
          heb_len = full_len;
      }
      else {
        // Do not over the string length. It may be when YYYY in the end. (DDD MMMMM YYYY)
        if (rem_len > outStr.length - strPos - heb_len)
          rem_len = outStr.length - strPos - heb_len;
        DisplayConvertor.char_memset(outStr, strPos + heb_len, ' ', /*' '*/rem_len);
        heb_len = full_len;
      }
    }
    return heb_len;
  }

  /// <summary>
  /// Cut the month string from 'const' into separate values
  /// </summary>
  /// <returns></returns>
  static GetLocalMonths(): string[] {
    let monthLen: number = HebrewDate.MONTH_LEN;

    if (HebrewDate._localMonths[0] === null) {
      let monthStr: string = Events.GetMessageString(MsgInterface.DATEHEB_MONTH_STR);
      if (monthStr !== null) {
        HebrewDate._localMonths[0] = "       ";
        for (let i: number = 1; i < HebrewDate._localMonths.length; i = i + 1)
          HebrewDate._localMonths[i] = monthStr.substr((i - 1) * monthLen, i * monthLen - (i - 1) * monthLen);
      }
    }
    return HebrewDate._localMonths;
  }

  /// <summary>
  /// Cut the day of week string from 'const' into separate values
  /// </summary>
  /// <returns></returns>
  static GetLocalDows(): string[] {
    let dowLen: number = HebrewDate.DOW_LEN;

    if (HebrewDate._localDows[0] === null) {
      let dowsStr: string = Events.GetMessageString(MsgInterface.DATEHEB_DOW_STR);
      if (dowsStr !== null) {
        HebrewDate._localDows[0] = "     ";
        for (let i: number = 1; i < HebrewDate._localDows.length; i = i + 1)
          HebrewDate._localDows[i] = dowsStr.substr((i - 1) * dowLen, i * dowLen - (i - 1) * dowLen);
      }
    }
    return HebrewDate._localDows;
  }

  /// <summary>
  /// Convert a hebrew string -> integer
  /// </summary>
  /// <param name="str"></param>
  /// <param name="len"></param>
  /// <param name="pos"></param>
  /// <returns>converted to integer</returns>
  static dateheb_h_2_i(str: string[], len: number, pos: number): number {
    let val: number;
    let has_1_to_9: boolean = false;
    let has_10_to_90: boolean = false;
    let has_100_to_300: boolean = false;
    let cnt_400: number = 0;
    let last_val: number = 1000;
    let let_val: number;

    for (val = 0; len > 0 && pos < str.length; pos++, len--)
      if (str[pos] >= HebrewDate.ALEF && str[pos] <= HebrewDate.TAV) {
        let_val = HebrewDate.DATEHEB_letters[<number>(str[pos].charCodeAt(0) - HebrewDate.ALEF.charCodeAt(0))];
        if (let_val > last_val)
          return 0;

        if (let_val === 400) {
          if (cnt_400 === 2)
            return 0;
          cnt_400 = cnt_400 + 1;
        }
        else if (let_val >= 100) {
          if (has_100_to_300)
            return 0;
          has_100_to_300 = true;
        } else if (let_val >= 10) {
          if (has_10_to_90)
            return 0;
          has_10_to_90 = true;
        }
        else {
          if (has_1_to_9) {
            if (has_10_to_90 || last_val !== 9)
              return 0;
            if (let_val !== 6 && let_val !== 7)
              return 0;
          }
          has_1_to_9 = true;
        }
        val = val + let_val;
        last_val = let_val;
      }

    return val;
  }

  /// <summary>
  /// Check whether the character is a Hebrew letter
  /// </summary>
  /// <param name="letter"></param>
  /// <returns></returns>
  static isHebrewLetter(letter: string): boolean {
    if (letter >= HebrewDate.ALEF && letter <= HebrewDate.TAV)
      return true;
    else
      return false;
  }

  /// <summary>Add found in newvalue numbers(2 or 3 letters) to buffer and return
  /// last found number index
  /// </summary>
  /// <param name="currValue">in newvalue</param>
  /// <param name="buffer"></param>
  /// <returns> currValue in newvalue</returns>
  static add2Date(newValue: string, currValue: number, letters: number, buffer: StringBuilder): number {
    let start: number = currValue;
    let i: number;
    let currAdd: StringBuilder = new StringBuilder(newValue.length);

    while (start < newValue.length && !HebrewDate.isHebrewLetter(newValue.charAt(start)))
      start = start + 1; // find first hebrew letter

    for (i = start; i < start + letters && i < newValue.length; i++) {
      if (HebrewDate.isHebrewLetter(newValue.charAt(i)) || newValue.charAt(i) === ' ' || newValue.charAt(i) === '"' || newValue.charAt(i) === '\'')
        buffer.Append(newValue.charAt(i));
      else
        break;
    }

    return i;
  }

  /// <summary>
  /// Convert a Hebrew date (year, month, day) to Magic internal date
  /// </summary>
  /// <param name="year"></param>
  /// <param name="month"></param>
  /// <param name="day"></param>
  /// <returns></returns>
  static dateheb_2_d(year: number, month: number, day: number): number {

    if (day === 0 && month === 0 && year === 0)
      return 0;

    if (day === 0 || month === 0 || year === 0)
      return 1000000000;

    /*--------------------------------------------------------*/
    /* How many days from creation, to begining of the year ? */
    /*--------------------------------------------------------*/
    let days_from_creation: number = HebrewDate.dateheb_year_start(year);

    /*------------------------*/
    /* How days in the year ? */
    /*------------------------*/
    let days_in_year: number = HebrewDate.dateheb_year_start(year + 1) - days_from_creation;
    let leap: boolean = days_in_year > 355;

    /*-----------------*/
    /* Add month + day */
    /*-----------------*/
    if (leap && month > HebrewDate.ADAR)
      if (month === HebrewDate.ADAR_B)
        month = HebrewDate.ADAR + 1;
      else
        month = month + 1;

    if (day > HebrewDate.dateheb_days_in_month(month, leap, days_in_year))
      return 1000000000;

    for (let i: number = 1; i < month; i = i + 1)
      days_from_creation = days_from_creation + HebrewDate.dateheb_days_in_month(i, leap, days_in_year);
    days_from_creation = days_from_creation + day;

    /*-------------------------------*/
    /* Convert to Christian calender */
    /*-------------------------------*/
    return Math.max(days_from_creation - HebrewDate.DAYS_TIL_JESUS, 0);
  }

}
