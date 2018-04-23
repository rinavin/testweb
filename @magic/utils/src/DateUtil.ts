import {NString} from "@magic/mscorelib";
import {PICInterface} from "./PICInterface";

const DATE_MONTH_LEN: number = 10;
const DATE_DOW_LEN: number = 10;

export class DateUtil {

  private static readonly _localMonths: string[] = new Array<string>(13);
  private static readonly _localDays: string[] = new Array<string>(8);

  /// <summary>
  ///  extract the vector which contains the names of the months, as specified by the
  ///  language CAB
  /// </summary>
  static getLocalMonths(names: string): string[] {
    let monthLen: number = DATE_MONTH_LEN;

    // if it's the first time then access the language CAB and take the values
    if (typeof DateUtil._localMonths[0] === "undefined") {

      //cut the string into separate values
      if (names !== null) {
        DateUtil._localMonths[0] = PICInterface.date_month_str[0];
        for (let i: number = 1; i < DateUtil._localMonths.length; i = i + 1) {

          if (i * monthLen >= names.length) {
            DateUtil._localMonths[i] = names.substr((i - 1) * monthLen);
            while (monthLen - DateUtil._localMonths[i].length > 0) {
              DateUtil._localMonths[i] = DateUtil._localMonths[i] + " ";
            }
          }
          else {
            DateUtil._localMonths[i] = names.substr((i - 1) * monthLen, i * monthLen - (i - 1) * monthLen);
          }
        }
      }
      else {
        for (let i: number = 0; i < DateUtil._localMonths.length; i = i + 1) {
          DateUtil._localMonths[i] = PICInterface.date_month_str[i];
        }
      }
    }
    return DateUtil._localMonths;
  }

  /// <summary>
  ///   extract the vector which contains the names of the days, as specified by the
  ///   language CAB
  /// </summary>
  static getLocalDays(names: string): string[] {
    let dowLen: number = DATE_DOW_LEN;

    // if it's the first time then access the language CAB and take the values
    if (typeof DateUtil._localDays[0] === "undefined") {

      //cut the string into separate values
      if (names !== null) {
        DateUtil._localDays[0] = PICInterface.date_dow_str[0];
        for (let i: number = 1; i < DateUtil._localDays.length; i = i + 1) {

          if (i * dowLen >= names.length) {
            DateUtil._localDays[i] = names.substr((i - 1) * dowLen);
            while (dowLen - DateUtil._localDays[i].length > 0) {
              DateUtil._localDays[i] = DateUtil._localDays[i] + " ";
            }
          }
          else {
            DateUtil._localDays[i] = names.substr((i - 1) * dowLen, i * dowLen - (i - 1) * dowLen);
          }
        }
      }
      else {
        for (let i: number = 0; i < DateUtil._localMonths.length; i = i + 1) {
          DateUtil._localMonths[i] = PICInterface.date_dow_str[i];
        }
      }
    }
    return DateUtil._localDays;
  }
}
