import {DateTime, Exception, StringBuilder} from "@magic/mscorelib";
import {Logger} from "./Logger";
import {XMLConstants} from "./XMLConstants";

export class DateTimeUtils {

  /// <summary> returns the number in a 2 digit string
  private static int2str(n: number): string {
    return (n > 9) ? n.toString() : ("0" + n);
  }

  static ToString(dateTime: DateTime, format: string): string {
    let dateTimeString: string;
    try {
      dateTimeString = dateTime.Format(format);
    }
    catch (ex) {
      if (ex instanceof Exception) {
        if (format === XMLConstants.CACHED_DATE_TIME_FORMAT) {
          dateTimeString = DateTimeUtils.int2str(dateTime.Day) + "/" + DateTimeUtils.int2str(dateTime.Month) + "/" + dateTime.Year + " " +
            DateTimeUtils.int2str(dateTime.Hour) + ":" + DateTimeUtils.int2str(dateTime.Minute) + ":" +
            DateTimeUtils.int2str(dateTime.Second);
        }
        else {
          if (format === XMLConstants.ERROR_LOG_TIME_FORMAT) {
            dateTimeString = DateTimeUtils.int2str(dateTime.Hour) + ":" +
              DateTimeUtils.int2str(dateTime.Minute) + ":" +
              DateTimeUtils.int2str(dateTime.Second) + ".";
            if (dateTime.Millisecond % 100 > 50) {
              dateTimeString = dateTimeString + (Math.floor(dateTime.Millisecond / 100) + 1);
            }
            else {
              dateTimeString = dateTimeString + Math.floor(dateTime.Millisecond / 100);
            }
          }
          else {
            if (format === XMLConstants.ERROR_LOG_DATE_FORMAT) {
              dateTimeString = DateTimeUtils.int2str(dateTime.Day) + "/" + DateTimeUtils.int2str(dateTime.Month) + "/" + dateTime.Year;
            }
            else {

              if (format === XMLConstants.HTTP_ERROR_TIME_FORMAT) {
                dateTimeString = DateTimeUtils.int2str(dateTime.Hour) + ":" + DateTimeUtils.int2str(dateTime.Minute) + ":" + DateTimeUtils.int2str(dateTime.Second) + ".";
              }
              else {
                Logger.Instance.WriteExceptionToLogWithMsg(ex.Message);
                let dateTimeTmpString: StringBuilder = new StringBuilder();
                dateTimeString = dateTimeTmpString.ToString();
              }
            }
          }
        }
      }
      else
        throw ex;
    }
    return dateTimeString;
  }
}
