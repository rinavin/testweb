import {IEnvironment} from "../../env/IEnvironment";
import {Manager} from "../../Manager";
import {PIC} from "./PIC";
import {
  DateTime,
  Debug,
  List,
  NNumber,
  NotImplementedException,
  NString,
  RefParam,
  StringBuilder
} from "@magic/mscorelib";
import {
  DateUtil,
  HTML_2_STR,
  MsgInterface,
  PICInterface,
  SEQ_2_HTML,
  StorageAttribute,
  StrUtil,
  UtilDateJpn,
  UtilStrByteMode
} from "@magic/utils";
import {BlobType} from "../data/BlobType";
import {ValidationDetails} from "./ValidationDetails";
import {NUM_TYPE} from "../data/NUM_TYPE";
import {HebrewDate} from "./HebrewDate";
import {Events} from "../../Events";
import {MgRectangle} from "../../util/MgRectangle";
import {FieldValidator} from "./FieldValidator";
// @dynamic
export class DisplayConvertor {
  private _environment: IEnvironment = null;
  private DATECHAR: number = 0;
  private static _instance: DisplayConvertor = null;

  static get Instance(): DisplayConvertor {
    if (DisplayConvertor._instance === null) {
      DisplayConvertor._instance = new DisplayConvertor();
    }
    return DisplayConvertor._instance;
  }

  constructor() {
    this._environment = Manager.Environment;
  }

  getNewDateBreakParams(): DateBreakParams {
    return new DateBreakParams();
  }

  getNewTimeBreakParams(): TimeBreakParams {
    return new TimeBreakParams();
  }

  /// <summary>
  ///   Build a display string of a value from its picture format
  /// </summary>
  /// <param name = "mgValue">  the internal value (as sent in the XML)
  /// </param>
  /// <param name = "rangeStr"> value range
  /// </param>
  /// <param name = "pic">      the picture format
  /// </param>
  /// <returns> string to display
  /// </returns>
  mg2disp(mgValue: string, rangeStr: string, pic: PIC, useNative: boolean, compIdx: number, time_date_pic_Z_edt: boolean): any;
  mg2disp(mgValue: string, rangeStr: string, pic: PIC, useNative: boolean, alwaysFill: boolean, compIdx: number, time_date_pic_Z_edt: boolean): any;
  mg2disp(mgValue: string, rangeStr: string, pic: PIC, useNative: boolean, alwaysFill: boolean, compIdx: number, convertCase: boolean, time_date_num_pic_Z_edt: boolean): any;
  mg2disp(mgValue: string, rangeStr: string, pic: PIC, useNative: boolean, compIdxOrAlwaysFill: any, time_date_pic_Z_edtOrCompIdx: any, time_date_pic_Z_edtOrConvertCase?: boolean, time_date_num_pic_Z_edt?: boolean): any {
    if (arguments.length === 5)
      return this.mg2disp_0(mgValue, rangeStr, pic, useNative, compIdxOrAlwaysFill, time_date_pic_Z_edtOrCompIdx);

    else if (arguments.length === 6)
      return this.mg2disp_1(mgValue, rangeStr, pic, useNative, compIdxOrAlwaysFill, time_date_pic_Z_edtOrCompIdx, time_date_pic_Z_edtOrConvertCase);

    else
      return this.mg2disp_2(mgValue, rangeStr, pic, useNative, compIdxOrAlwaysFill, time_date_pic_Z_edtOrCompIdx, time_date_pic_Z_edtOrConvertCase, time_date_num_pic_Z_edt);
  }

  private mg2disp_0(mgValue: string, rangeStr: string, pic: PIC, useNative: boolean, compIdx: number, time_date_pic_Z_edt: boolean): any {
    return this.mg2disp(mgValue, rangeStr, pic, useNative, false, compIdx, time_date_pic_Z_edt);
  }

  private mg2disp_1(mgValue: string, rangeStr: string, pic: PIC, useNative: boolean, alwaysFill: boolean, compIdx: number, time_date_pic_Z_edt: boolean): any {
    return this.mg2disp(mgValue, rangeStr, pic, useNative, alwaysFill, compIdx, false, time_date_pic_Z_edt);

  }

  /// <summary>
  ///   Build a display string of a value from its picture format
  /// </summary>
  /// <param name = "mgValue">the internal value (as sent in the XML)
  /// </param>
  /// <param name = "rangeStr">value range
  /// </param>
  /// <param name = "pic">the picture format
  /// </param>
  /// <param name = "alwaysFill">Always auto fill alpha over its picture (used for select controls)
  /// </param>
  /// <returns> string to display
  /// </returns>
  private mg2disp_2(mgValue: string, rangeStr: string, pic: PIC, useNative: boolean, alwaysFill: boolean, compIdx: number, convertCase: boolean, time_date_num_pic_Z_edt: boolean): any {
    let str: string = "";
    let tmpRange: string = (rangeStr === null) ? "" : rangeStr;

    switch (pic.getAttr()) {

      case StorageAttribute.ALPHA:
      case StorageAttribute.UNICODE:
        str = this.fromAlpha(mgValue, pic, tmpRange, alwaysFill, convertCase);
        break;

      case StorageAttribute.NUMERIC: {
          if (useNative)
            pic = new PIC("N38.38", StorageAttribute.NUMERIC, compIdx);
          str = this.fromNum(mgValue, pic);
          // Value should be trimmed when we are displaying control in order to display alignment properly. But while entering control, it should not be trimmed
          // in order to read it properly.
          if (pic.getMaskChars() === 0 || !time_date_num_pic_Z_edt)
            str = StrUtil.ltrim(str);

          if (useNative) {
            let dbl: number = Number(str);
            return dbl;
          }
          else
            return str;
          }
      case StorageAttribute.DATE:
      {
        if (useNative) {
          let dt: Date;
          dt = this.fromMgDateToNativeDate(mgValue, compIdx);
          return dt;
        }
        else
        {
          str = this.fromDate(mgValue, pic, compIdx, time_date_num_pic_Z_edt);
          break;
        }
      }
      case StorageAttribute.TIME:
      {
        if (useNative) {
          let dt: Date;
          dt = this.fromMgTimeToNativeTime(mgValue, pic, time_date_num_pic_Z_edt);
          return dt;
        }
        else
        {
          str = this.fromTime(mgValue, pic, time_date_num_pic_Z_edt);
          break;
        }
      }
      case StorageAttribute.BOOLEAN:
      {
        let logVal: boolean;
        logVal = this.fromMgLogicalToNativeLogical(mgValue);
        return logVal;
      }

      case StorageAttribute.BLOB:
        str = BlobType.getString(mgValue);
        break;
      case StorageAttribute.BLOB_VECTOR:
        str = mgValue;
        break;
    }
    return str;
  }

  /// <summary>
  ///   Build an internal representation of a display value from its picture format
  /// </summary>
  /// <param name = "dispValue">the value as entered by user
  /// </param>
  /// <param name = "rangeStr">value range
  /// </param>
  /// <param name = "pic">the picture format
  /// </param>
  /// <param name = "blobContentType">if the attribute is blob, its content type
  /// </param>
  /// <returns> internal form of data (as used in the XML)
  /// </returns>
  disp2mg(dispValue: any, rangeStr: string, pic: PIC, compIdx: number, blobContentType: string): string {
    let str: string = "";

    switch (pic.getAttr()) {
      case StorageAttribute.ALPHA:
      case StorageAttribute.UNICODE:
        str = this.toAlpha(dispValue, pic);
        break;


      case StorageAttribute.NUMERIC: {
        dispValue = String(dispValue);
        // Remove the mask from display value.
        let len: number = dispValue.length;
        while (len > 0) {
          if (!pic.picIsMask(len - 1) && dispValue[len - 1] !== (' '))
            break;
          len--;
        }
        if (dispValue.length > len)
          dispValue = NString.Remove(dispValue, len, (dispValue.length - len));

        if (pic.isNegative() && dispValue.trim().startsWith("-"))
          dispValue = StrUtil.ltrim(dispValue);

        str = this.toNum(dispValue, pic, compIdx);
      }
        break;


      case StorageAttribute.DATE:
        str = this.fromNativeDateToMgDate (dispValue, pic, compIdx);
        break;


      case StorageAttribute.TIME:
        str = this.fromNativeTimeToMgTime(dispValue, pic);
        break;


      case StorageAttribute.BOOLEAN:
        str = this.fromNativeLogicalToMgLogical(dispValue);
        break;


      case StorageAttribute.BLOB:
        str = BlobType.createFromString(dispValue, blobContentType);
        break;
    }
    return str;
  }

  // --------------------------------------------------------------------------
  //  Methods for coverting INTERNAL ---> DIPLAY
  // --------------------------------------------------------------------------

  /// <summary>
  ///   Handles magic number value
  /// </summary>
  /// <param name = "mgNum">   A Magic Number</param>
  /// <param name = "picStr">  The picture to use</param>
  /// <returns> the string to be displayed</returns>
  private fromNum(mgValue: string, pic: PIC): string {
    let mgNum: NUM_TYPE = new NUM_TYPE(mgValue);
    return mgNum.toDisplayValue(pic);
  }

  /// <summary>
  ///   Build a display string for an alpha value according to the picture
  /// </summary>
  /// <param name = "dataStr">   The source data
  /// </param>
  /// <param name = "picStr">    The picture to use for the value to display
  /// </param>
  /// <param name = "rangeStr">  The range of values to check
  /// </param>
  /// <param name = "alwaysFill">Always auto fill alpha over its picture (used for select controls)
  /// </param>
  /// <returns> the string to be displayed
  /// </returns>
  private fromAlpha(dataStr: string, pic: PIC, rangeStr: string, alwaysFill: boolean, convertCase: boolean): string {
    let len: number = pic.getMaskSize();
    let min_len: number = len;
    let maskStr: string = pic.getMask();
    let resStr: string;

    if (pic.getMaskChars() > 0) {
      resStr = this.win_data_cpy(NString.ToCharArray(maskStr), len, NString.ToCharArray(dataStr), pic.isAttrAlpha(), convertCase);
    }
    else {
      if (UtilStrByteMode.isLocaleDefLangDBCS() && pic.isAttrAlpha())
      // JPN: DBCS support
      {
        // substring by the number of bytes
        let intDataStrLenB: number = UtilStrByteMode.lenB(dataStr);
        if (min_len > intDataStrLenB) {
          min_len = intDataStrLenB;
        }
        resStr = UtilStrByteMode.leftB(dataStr, min_len);
      }
      else {
        if (min_len > dataStr.length) {
          min_len = dataStr.length;
        }
        if (convertCase) {
          resStr = this.win_data_cpy(NString.ToCharArray(maskStr), len, NString.ToCharArray(dataStr), pic.isAttrAlpha(), convertCase);
        }
        else {
          resStr = dataStr.substr(0, min_len);
        }
      }
    }

    // We do not fill Alpha filed over control's picture length QCR # 295408
    if (alwaysFill || (rangeStr !== null && rangeStr.length > 0 && resStr.length < len)) {
      let vd: ValidationDetails = new ValidationDetails(rangeStr);
      let continuousRangeValues: List<string> = vd.getContinuousRangeValues();
      let discreteRangeValues: List<string> = vd.getDiscreteRangeValues();
      if (continuousRangeValues !== null || discreteRangeValues !== null) {
        resStr = this.fillAlphaByRange(continuousRangeValues, discreteRangeValues, resStr);
      }
    }
    return resStr;
  }

  private caseConvertedChar(data: string, mask: string): string {

    let ch: string;
    if (mask.charCodeAt(0) === PICInterface.PIC_U) {
      ch = data.toUpperCase();
    }
    else {
      if (mask.charCodeAt(0) === PICInterface.PIC_L) {
        ch = data.toLowerCase();
      }
      else {
        ch = data;
      }
    }
    return ch;
  }

  private win_data_cpy(maskStr: string[], maskLen: number, dataStr: string[], isAttrAlpha: boolean): string;
  private win_data_cpy(maskStr: string[], maskLen: number, dataStr: string[], isAttrAlpha: boolean, convertCase: boolean): string;
  private win_data_cpy(maskStr: any, maskLen: number, dataStr: any, isAttrAlpha: boolean, convertCase?: boolean): string {
    if (arguments.length === 4)
      return this.win_data_cpy_0(maskStr, maskLen, dataStr, isAttrAlpha);

    return this.win_data_cpy_1(maskStr, maskLen, dataStr, isAttrAlpha, convertCase);
  }

  private win_data_cpy_0(maskStr: string[], maskLen: number, dataStr: string[], isAttrAlpha: boolean): string {
    return this.win_data_cpy(maskStr, maskLen, dataStr, isAttrAlpha, false);
  }

  /// <summary>
  ///   Handles alpha value
  /// </summary>
  /// <param name = "maskStr">   The mask to be used in order to build the string
  /// </param>
  /// <param name = "picStr">    The picture to use
  /// </param>
  /// <returns> the string to be displayed
  /// </returns>
  private win_data_cpy_1(maskStr: string[], maskLen: number, dataStr: string[], isAttrAlpha: boolean, convertCase: boolean): string {
    let maskIdx: number = 0;
    let dataIdx: number = 0;
    let resStr: string[] = new Array<string>(maskLen);

    if (isAttrAlpha && UtilStrByteMode.isLocaleDefLangDBCS()) {
      let num2: number = 0;
      while (maskIdx < maskLen && num2 < maskLen) {
        if (maskStr[maskIdx].charCodeAt(0) <= PICInterface.PIC_MAX_OP) {
          if (dataIdx < dataStr.length) {
            let strVal: string = NString.FromChars(dataStr, dataIdx, 1);
            if (UtilStrByteMode.lenB(strVal) === 2) {
              if (maskIdx + 1 < maskLen) {
                if (maskStr[maskIdx + 1].charCodeAt(0) <= PICInterface.PIC_MAX_OP) {
                  if (convertCase) {
                    resStr[num2++] = this.caseConvertedChar(dataStr[dataIdx++], maskStr[maskIdx + 1]);
                  }
                  else {
                    resStr[num2++] = dataStr[dataIdx++];
                  }
                  maskIdx = maskIdx + 1;
                }
                else {
                  resStr[num2++] = ' ';
                }
              }
              else {
                resStr[num2++] = ' ';
              }
            }
            else {
              if (convertCase) {
                resStr[num2++] = this.caseConvertedChar(dataStr[dataIdx++], maskStr[maskIdx + 1]);
              }
              else {
                resStr[num2++] = dataStr[dataIdx++];
              }
            }
          }
          else {
            resStr[num2++] = ' '/*' '*/;
          }
        }
        else {
          resStr[num2++] = maskStr[maskIdx];
        }
        maskIdx = maskIdx + 1;
      }
      return NString.FromChars(resStr).substr(0, num2);
    }

    while (maskIdx < maskLen) {
      if (maskStr[maskIdx].charCodeAt(0) <= PICInterface.PIC_MAX_OP) {
        if (dataIdx < dataStr.length) {
          resStr[maskIdx] = dataStr[dataIdx];
          if (convertCase) {
            resStr[maskIdx] = this.caseConvertedChar(dataStr[dataIdx], maskStr[maskIdx]);
          }
          else {
            resStr[maskIdx] = dataStr[dataIdx];
          }
          dataIdx = dataIdx + 1;
        }
        else {
          resStr[maskIdx] = ' '/*' '*/;
        }
      }
      else {
        resStr[maskIdx] = maskStr[maskIdx];
      }
      maskIdx = maskIdx + 1;
    }
    return NString.FromChars(resStr);
  }

  /// <summary>
  ///   Build a display string for an date value according to the picture
  /// </summary>
  /// <param name = "dataStr">   The source data</param>
  /// <param name = "picStr">    The picture to use for the value to display</param>
  /// <returns> the string to be displayed</returns>
  fromDate(dataStr: string, pic: PIC, compIdx: number, time_date_pic_Z_edt: boolean): string {
    let mask: string = pic.getMask();
    let maskSize: number = pic.getMaskSize();
    let date: number = new NUM_TYPE(dataStr).NUM_2_ULONG();
    return this.to_a_pic_datemode(mask, maskSize, date, pic, time_date_pic_Z_edt, false, compIdx);
  }

  /// <summary>
  ///   Build a display string for an time value according to the picture
  /// </summary>
  /// <param name = "dataStr">   The source data</param>
  /// <param name = "picStr">    The picture to use for the value to display</param>
  /// <returns> the string to be displayed</returns>
  fromTime(dataStr: string, pic: PIC, time_date_pic_Z_edt: boolean): string {
    let mask: string = pic.getMask();
    let maskSize: number = pic.getMaskSize();
    let time: number = new NUM_TYPE(dataStr).NUM_2_ULONG();
    return this.time_2_a_pic(mask, maskSize, time, pic, time_date_pic_Z_edt, false);
  }

  /// <summary>
  ///   Build a display string for an date value according to the picture
  /// </summary>
  /// <param name = "dataStr">   The source data</param>
  /// <param name = "picStr">    The picture to use for the value to display</param>
  /// <returns> the string to be displayed</returns>
  fromMgDateToNativeDate(dataStr: string, compIdx: number): Date {

    let date: number = new NUM_TYPE(dataStr).NUM_2_ULONG();
    let breakParams: DateBreakParams;
    let outIdx: number = 0;

    // Break data into its components
    breakParams = new DateBreakParams();
    this.date_break_datemode(breakParams, date, false, compIdx);
    if (breakParams.month > 0)
      breakParams.month = breakParams.month - 1; //month is 0 based in Date class
    let nativeDt: Date = new Date(breakParams.year, breakParams.month, breakParams.day);
    return nativeDt;
  }


  /// <summary>
  ///   Build a display string for an date value according to the picture
  /// </summary>
  /// <param name = "dataStr">   The source data</param>
  /// <param name = "picStr">    The picture to use for the value to display</param>
  /// <returns> the string to be displayed</returns>
  fromNativeDateToMgDateNumber(nativeDate: Date, pic: PIC, compIdx: number): number {
    let mgNum: NUM_TYPE = new NUM_TYPE();
    let numVal: number;
    let dateParams: DateBreakParams;
    let millenium: number = 0;
    let year: number = nativeDate.getFullYear();
    let day: number = nativeDate.getDate();
    let month: number = nativeDate.getMonth()+1;

    // Hebrew Year
    if (pic.isHebrew()) {
      if (year > 0) {
        if (millenium === 0)
          millenium = 5;
        year += millenium * 1000;
      }
      numVal = (HebrewDate.dateheb_2_d(year, month, day));
    }
    else
    {
      // the next 2 lines support 4.xx DD/MM pictures
      if (year === 0) {
        dateParams = this.date_sys();
        year = dateParams.year;
      }

      numVal = this.date_4_calender(year, month, day, 0, false);    // we are adding a little empty space to the variable, because we might later
    }
    return numVal;
  }

  /// <summary>
  ///   Build a display string for an date value according to the picture
  /// </summary>
  /// <param name = "dataStr">   The source data</param>
  /// <param name = "picStr">    The picture to use for the value to display</param>
  /// <returns> the string to be displayed</returns>
  fromNativeDateToMgDate(nativeDate: Date, pic: PIC, compIdx: number): string {

    let mgNum: NUM_TYPE = new NUM_TYPE();
    let numVal: number = this.fromNativeDateToMgDateNumber(nativeDate, pic, compIdx);
    mgNum.NUM_4_LONG(numVal);

    return mgNum.toXMLrecord();
  }

  /// <summary>
  ///   Handle date value
  /// </summary>
  /// <param name = "outStr">          The mask to be used
  /// </param>
  /// <param name = "out_len">         Mask length
  /// </param>
  /// <param name = "pic">             The picure information
  /// </param>
  /// <param name = "date_pic_Z_edt">
  /// </param>
  /// <param name = "ignore_dt_fmt">
  /// </param>
  /// <returns> the string to be displayed
  /// </returns>
  to_a_pic_datemode(outStr: string, out_len: number, date: number, pic: PIC, date_pic_Z_edt: boolean, ignore_dt_fmt: boolean, compIdx: number): string {
    let len: number;
    let day: number = 0;
    let doy: number = 0;
    let dow: number = 0;
    let year: number = 0;
    let month: number = 0;
    let hday: number = 0;
    let hyear: number = 0;
    let hmonth: number = 0;
    let leap: Boolean = false;
    let i: number;
    let p: string[];
    let outVal: string[] = NString.ToCharArray(outStr);
    let breakParams: DateBreakParams;
    let dateNameParams: DateNameParams;
    let outIdx: number = 0;

    // If result overflows return buffer, fill with asterixs and bail out
    if (pic.getMaskSize() > out_len) {
      for (; i < out_len; i++)
        outVal[i] = '*';
      return NString.FromChars(outVal);
    }

    // If zero fill requested and date value is zero, fill it and bail out
    out_len = len = pic.getMaskSize();
    if (pic.zeroFill() && date === 0 && !date_pic_Z_edt) {
      for (; i < out_len; i++)
        outVal[i] = pic.getZeroPad();
      return NString.FromChars(outVal);
    }
    if (pic.isHebrew() && (date === 0 || date === 1000000000))
    {
      for (; i < out_len; i++)
        outVal[i] = ' ';
      return NString.FromChars(outVal);
    }

    // Break data into its components
    breakParams = new DateBreakParams(year, month, day, doy, dow);
    this.date_break_datemode(breakParams, date, ignore_dt_fmt, compIdx);
    if (pic.isHebrew()) {
      let refhday: RefParam<number> = new RefParam<number>(hday);
      let refhmonth: RefParam<number> = new RefParam<number>(hmonth);
      let refhyear: RefParam<number> = new RefParam<number>(hyear);
      leap = HebrewDate.dateheb_4_d(date, refhday, refhmonth, refhyear);

      hday = refhday.value;
      hmonth = refhmonth.value;
      hyear = refhyear.value;
    }

    year = breakParams.year;
    month = breakParams.month;
    day = breakParams.day;
    doy = breakParams.doy;
    dow = breakParams.dow;
    breakParams = null;
    while (len > 0) {
      let refOutLen: RefParam<number> = new RefParam<number>(out_len);
      switch (outVal[outIdx].charCodeAt(0)) {
        case PICInterface.PIC_YY:
          if (pic.zeroFill() && date === 0 && date_pic_Z_edt)
            DisplayConvertor.char_memset(outVal, outIdx, pic.getZeroPad(), 2);
          else
            this.int_2_a(outVal, outIdx, 2, year, '0');
          outIdx += 2;
          len -= 2;
          break;
        case PICInterface.PIC_HYYYYY:
          i = HebrewDate.dateheb_2_str(outVal, outIdx, len, refOutLen, 5, hyear, pic.isTrimed(), true);
          out_len = refOutLen.value;
          outIdx += i;
          len -= i;
          break;
        case PICInterface.PIC_HL:
          i = HebrewDate.dateheb_i_2_h((hyear / 1000) % 10, outVal, outIdx, false, false);
          outIdx++;
          len--;
          break;
        case PICInterface.PIC_HDD:
          i = HebrewDate.dateheb_2_str(outVal, outIdx, len, refOutLen, 2, hday, pic.isTrimed(), false);
          out_len = refOutLen.value;
          outIdx += i;
          len -= i;
          break;
        case PICInterface.PIC_YYYY:
          if (pic.zeroFill() && date === 0 && date_pic_Z_edt)
            DisplayConvertor.char_memset(outVal, outIdx, pic.getZeroPad(), 4);
          else
            this.int_2_a(outVal, outIdx, 4, year, '0');
          outIdx += 4;
          len -= 4;
          break;
        case PICInterface.PIC_MMD:
          if (pic.zeroFill() && date === 0 && date_pic_Z_edt)
            DisplayConvertor.char_memset(outVal, outIdx, pic.getZeroPad(), 2);
          else
            this.int_2_a(outVal, outIdx, 2, month, '0');
          outIdx += 2;
          len -= 2;
          break;
        case PICInterface.PIC_MMM:
          if (pic.isHebrew()) {
            if (leap && hmonth === 6)
              hmonth = 14;
            let monthNames: string[] = HebrewDate.GetLocalMonths();
            p = NString.ToCharArray(monthNames[hmonth]);
          }
          else {
            let monthStr: string = Events.GetMessageString(MsgInterface.MONTHS_PTR);
            let monthNames: string[] = DateUtil.getLocalMonths(monthStr);
            p = NString.ToCharArray(monthNames[month]);
          }
          dateNameParams = new DateNameParams(outVal, outIdx, len);
          out_len -= this.date_i_2_nm(dateNameParams, p, pic.isTrimed());
          outIdx = dateNameParams.outIdx;
          len = dateNameParams.len;
          dateNameParams = null;
          break;
        case PICInterface.PIC_DD:
          let isZero: boolean = pic.zeroFill();
          if (isZero && date === 0 && date_pic_Z_edt)
            DisplayConvertor.char_memset(outVal, outIdx, pic.getZeroPad(), 2);
          else
            this.int_2_a(outVal, outIdx, 2, day, '0');
          outIdx += 2;
          len -= 2;
          break;
        case PICInterface.PIC_DDD:
          if (pic.zeroFill() && date === 0 && date_pic_Z_edt)
            DisplayConvertor.char_memset(outVal, outIdx, pic.getZeroPad(), 3);
          else
            this.int_2_a(outVal, outIdx, 3, doy, '0');
          len -= 3;
          outIdx += 3;
          break;
        case PICInterface.PIC_DDDD:
          i = this.date_2_DDDD(day, outVal, outIdx, len, pic.isTrimed());
          outIdx += i;
          out_len += i - 4;
          len -= 4;
          break;
        case PICInterface.PIC_W:
          if (pic.zeroFill() && date === 0 && date_pic_Z_edt)
            DisplayConvertor.char_memset(outVal, outIdx, pic.getZeroPad(), 1);
          else
            this.int_2_a(outVal, outIdx, 1, dow, '0');
          len--;
          outIdx++;
          break;
        case PICInterface.PIC_WWW:
          if (pic.isHebrew()) {
            let dowsNames: string[] = HebrewDate.GetLocalDows();
            p = NString.ToCharArray(dowsNames[dow]);
          }
          else {
            let dayStr: string = Events.GetMessageString(MsgInterface.DAYS_PTR);
            let dayNames: string[] = DateUtil.getLocalDays(dayStr);
            p = NString.ToCharArray(dayNames[dow]);
          }
          dateNameParams = new DateNameParams(outVal, outIdx, len);
          out_len -= this.date_i_2_nm(dateNameParams, p, pic.isTrimed());
          outIdx = dateNameParams.outIdx;
          len = dateNameParams.len;
          dateNameParams = null;
          break;
        case PICInterface.PIC_BB: // JPN: Japanese date picture support
          // Japanese day of the week
          p = NString.ToCharArray(UtilDateJpn.getStrDow(dow));
          let strOut: string = null;
          dateNameParams = new DateNameParams(outVal, outIdx, len);
          strOut = this.date_i_2_nm_bytemode(strOut, dateNameParams, NString.FromChars(p), out_len);
          outVal = new String[strOut.length];
          NString.CopyTo(strOut, 0, outVal, 0, strOut.length);

          outIdx = dateNameParams.outIdx;
          len = dateNameParams.len;
          strOut = null;
          dateNameParams = null;
          break;
        case PICInterface.PIC_JY1:
        case PICInterface.PIC_JY2:
        case PICInterface.PIC_JY4:
          // Japanese the name of an era
          if (outVal[outIdx] === PICInterface.PIC_JY1.toString())
            p = NString.ToCharArray(UtilDateJpn.getInstance().date_jpn_yr_2_a(year, doy, false));
          else
            p = NString.ToCharArray(UtilDateJpn.getInstance().date_jpn_yr_2_a(year, doy, true));
          strOut = null;
          dateNameParams = new DateNameParams(outVal, outIdx, len);
          let strNum: String = String(p);
          strOut = this.date_i_2_nm_bytemode(strOut, dateNameParams, strNum.toString(), out_len);
          outVal = null;
          outVal = new Array(strOut.length);
          NString.CopyTo(strOut, 0, outVal, 0, strOut.length);
          outIdx = dateNameParams.outIdx;
          len = dateNameParams.len;
          strOut = null;
          dateNameParams = null;
          break;
        case PICInterface.PIC_YJ:
          if (pic.zeroFill() && date === 0 && date_pic_Z_edt)
            DisplayConvertor.char_memset(outVal, outIdx, pic.getZeroPad(), 2);
          else
            this.int_2_a(outVal, outIdx, 2, UtilDateJpn.getInstance().date_jpn_year_ofs(year, doy), '0');
          outIdx += 2;
          len -= 2;
          break;
        default:
          outIdx++;
          len--;
          break;
      }
    }
    if (out_len < outVal.length)
      DisplayConvertor.char_memset(outVal, out_len, ' ', outVal.length - out_len);

    return NString.FromChars(outVal);
  }

  /// <summary>
  ///   Break a date into Year, Month, Day in month, Day in year and Day in week
  /// </summary>
  date_break_datemode(breakParams: DateBreakParams, date: number, ignore_dt_fmt: boolean, compIdx: number): void {

    let year: number = breakParams.year;
    let month: number = breakParams.month;
    let day: number = breakParams.day;
    let doy: number = breakParams.doy;
    let dow: number = breakParams.dow;

    if (date <= 0) {
      breakParams.day = 0;
      breakParams.doy = 0;
      breakParams.dow = 0;
      breakParams.year = 0;
      breakParams.month = 0;
    }
    else {
      dow = date % 7 + 1;
      date = date - 1;
      let cent4: number = Math.floor(date / PICInterface.DAYSINFOURCENT);
      date = date - cent4 * PICInterface.DAYSINFOURCENT;
      let cent: number = Math.floor(date / PICInterface.DAYSINCENTURY);
      if (cent > 3) {
        cent = 3;
      }
      date = date - cent * PICInterface.DAYSINCENTURY;
      let year4: number = Math.floor(date / PICInterface.DAYSINFOURYEAR);
      date = date - year4 * PICInterface.DAYSINFOURYEAR;
      year = Math.floor(date / PICInterface.DAYSINYEAR);
      if (year > 3) {
        year = 3;
      }
      date = date - year * PICInterface.DAYSINYEAR;
      year = cent4 * 400 + cent * 100 + year4 * 4 + year + 1;
      let leapyear: number = 0;
      if (year % 4 === 0) {
        if (year % 100 !== 0 || year % 400 === 0) {
          leapyear = 1;
        }
      }

      if (!ignore_dt_fmt && this._environment.GetDateMode(compIdx) === 'B') {
        year = year + PICInterface.DATE_BUDDHIST_GAP;
      }
      month = (Math.floor(date / PICInterface.DAYSINMONTH) + 1);
      day = PICInterface.date_day_tab[month];
      if (leapyear > 0) {
        if (month > 1) {
          day = day + 1;
        }
      }

      if (date >= day) {
        month = month + 1;
      }
      else {
        day = PICInterface.date_day_tab[month - 1];
        if (leapyear > 0) {
          if (month > 2) {
            day = day + 1;
          }
        }
      }
      day = date - day + 1;
      doy = date + 1;
      breakParams.year = year;
      breakParams.month = month;
      breakParams.day = day;
      breakParams.doy = doy;
      breakParams.dow = dow;
    }
  }

  /// <summary>
  ///   get alpha string from int value
  /// </summary>
  /// <param name = "str">     the output string (as an char array)
  /// </param>
  /// <param name = "strPos">  starting position
  /// </param>
  /// <param name = "len">     string length
  /// </param>
  /// <param name = "n">       the number to convert
  /// </param>
  /// <param name = "lead">    leading character
  /// </param>
  /// <returns> the result string length
  /// </returns>
  private int_2_a(str: string[], strPos: number, len: number, n: number, lead: string): number {
    let neg: boolean = n < 0;

    if (len <= 0)
      return;

    n = Math.abs(n);
    let pos: number = len;

    do {
      str[strPos + (pos = pos - 1)] = String.fromCharCode(48 + n % 10);
      n = Math.floor(n / 10);
    }
    while (pos > 0 && n > 0);

    if (neg && pos > 0) {
      str[strPos + (pos = pos - 1)] = '-'/*'-'*/;
    }
    return this.lib_a_fill(str, strPos, len, pos, lead.charCodeAt(0));

  }

  /// <summary>
  ///   Fill the char array for the converting of int->string
  /// </summary>
  /// <param name = "str">     the output string (as an char array)
  /// </param>
  /// <param name = "strPos">  starting position
  /// </param>
  /// <param name = "len">     string length
  /// </param>
  /// <param name = "lead">    leading character
  /// </param>
  /// <returns> the result string length
  /// </returns>
  private lib_a_fill(str: string[], strPos: number, len: number, pos: number, lead: number): number {

    if (lead === 0) {
      len = len - pos;

      if (len > 0 && pos > 0) {
        DisplayConvertor.char_memcpy(str, strPos, str, pos, len);
        DisplayConvertor.char_memset(str, strPos + len, ' ', /*' '*/pos);
      }
    }
    else {
      if (pos > 0) {
        DisplayConvertor.char_memset(str, strPos, String.fromCharCode(lead), pos);
      }
    }
    return len;
  }

  /// <summary>
  ///   Convert index to Name
  /// </summary>
  /// <param name = "dateNameParams">  output sting details
  /// </param>
  /// <param name = "nm">              name
  /// </param>
  /// <param name = "trim">            output string should be trimed
  /// </param>
  /// </param>
  /// <returns> the length of the string
  /// </returns>
  private date_i_2_nm(dateNameParams: DateNameParams, nm: string[], trim: boolean): number {

    let n: number = this.date_msk_cnt(dateNameParams.outVal, dateNameParams.outIdx, <number>dateNameParams.len);
    let l: number;
    if (trim) {
      l = this.mem_trim(nm, 0, n);
    }
    else {
      l = n;
    }
    l = Math.min(l, dateNameParams.len);
    DisplayConvertor.char_memcpy(dateNameParams.outVal, dateNameParams.outIdx, nm, 0, l);
    dateNameParams.outIdx = dateNameParams.outIdx + l;
    dateNameParams.len = dateNameParams.len - n;

    // -----------------------------------------------------------------------
    // Trimed ? Jump other trimed mask : nothing
    // -----------------------------------------------------------------------

    n = n - l;

    if (n > 0) {
      DisplayConvertor.char_memcpy(dateNameParams.outVal, dateNameParams.outIdx, dateNameParams.outVal, dateNameParams.outIdx + n, dateNameParams.len);
    }
    return <number>n;
  }

  /// <summary>
  ///   JPN: Japanese date picture support
  ///   Convert index to Name
  /// </summary>
  /// <param name = "strOut">          output sting (original)
  /// </param>
  /// <param name = "dateNameParams">  output sting details
  /// </param>
  /// <param name = "strNm">           name which will be embedded in output string
  /// </param>
  /// <param name = "intOutLen">       the remaining length of the output string
  /// </param>
  /// <returns>                 output sting (processed)
  /// </returns>
  private date_i_2_nm_bytemode(strOut: string, dateNameParams: DateNameParams, strNm: string, intOutLen: number): string {
    let intMskCnt: number = this.date_msk_cnt(dateNameParams.outVal, dateNameParams.outIdx, <number>dateNameParams.len);
    let strWork: string = NString.FromChars(dateNameParams.outVal);

    strWork = strWork.substr(0, dateNameParams.outIdx);

    let intOfs: number = UtilStrByteMode.lenB(strWork);
    strNm = UtilStrByteMode.leftB(strNm, intMskCnt);
    strOut = UtilStrByteMode.repB(NString.FromChars(dateNameParams.outVal), strNm, intOfs + 1, intMskCnt);

    dateNameParams.outIdx = dateNameParams.outIdx + strNm.length;
    dateNameParams.len = dateNameParams.len - intMskCnt;
    intOutLen = intOutLen - intMskCnt;
    return strOut;
  }

  /// <summary>
  ///   Return N of consecutive Mask characters
  /// </summary>
  /// <param name = "msk">     the mask to check
  /// </param>
  /// <param name = "mskPos">  index of first char to check
  /// </param>
  /// <param name = "len">     length of the mask
  /// </param>
  /// <returns> number of consecutive Mask characters
  /// </returns>
  private date_msk_cnt(msk: string[], mskPos: number, len: number): number {
    let c: string = msk[mskPos++];
    let i: number = 1;
    while (<number>i < len) {
      if (msk[mskPos] !== c) {
        break;
      }
      mskPos = mskPos + 1;
      i = i + 1;
    }
    return i;
  }

  /// <summary>
  ///   Compute Day name
  /// </summary>
  private date_2_DDDD(day: number, outVal: string[], outIdx: number, len: number, trim: boolean): number {


    let ret: number = 4;
    let ext: string[];

    if (day > 9) {
      this.int_2_a(outVal, outIdx, 2, day, (<number>0).toString());
      outIdx += 2;
    }
    else {
      if (trim) {
        DisplayConvertor.char_memcpy(outVal, outIdx, outVal, outIdx + 1, len - 1);
        /*17-May-90*/
        ret--;
      }
      else {
        // *(out++) = ' '; // Original Line
        outVal[outIdx++] = ' ';
      }
      this.int_2_a(outVal, outIdx, 1, day, (<number>0).toString());
      outIdx++;
    }
    switch (day) {
      case 1:
      case 21:
      case 31:
        ext = NString.ToCharArray("st");
        break;

      case 2:
      case 22:
        ext = NString.ToCharArray("nd");
        break;

      case 3:
      case 23:
        ext = NString.ToCharArray("rd");
        break;

      default:
        ext = NString.ToCharArray("th");
        break;
    }
    outVal[outIdx++] = ext[0];
    outVal[outIdx] = ext[1];

    return (ret);

  }



  /// <summary>
  ///   Build a display string for an time value according to the picture
  /// </summary>
  /// <param name = "dataStr">   The source data</param>
  /// <param name = "picStr">    The picture to use for the value to display</param>
  /// <returns> the string to be displayed</returns>
  fromMgTimeToNativeTime(dataStr: string, pic: PIC, time_date_pic_Z_edt: boolean): Date {
    let mask: string = pic.getMask();
    let maskSize: number = pic.getMaskSize();
    let time: number = new NUM_TYPE(dataStr).NUM_2_ULONG();

    let Ascii: string[] = NString.ToCharArray(mask);
    let breakParams: TimeBreakParams = new TimeBreakParams();

    DisplayConvertor.time_break(breakParams, time);

    let nativeDt: Date = new Date();

    nativeDt.setHours(breakParams.hour);
    nativeDt.setMinutes(breakParams.minute);
    nativeDt.setSeconds(breakParams.second);

    return nativeDt;
  }

  /// <summary>
  ///   Handle time value
  /// </summary>
  /// <param name = "AsciiStr">        The mask to be used</param>
  /// <param name = "AsciiL">          Mask length</param>
  /// <param name = "pic">             The picure information</param>
  /// <param name = "time_pic_Z_edt"></param>
  /// <param name = "seconds">/ milliSeconds flag</param>
  /// <returns> the string to be displayed
  /// </returns>
  private time_2_a_pic(AsciiStr: string, AsciiL: number, time: number, pic: PIC, time_pic_Z_edt: boolean, milliSeconds: boolean): string {

    // Original vars
    let hour: number = 0;
    let minute: number = 0;
    let second: number = 0;
    let millisec: number = 0;

    let Ascii: string[] = NString.ToCharArray(AsciiStr);
    let breakParams: TimeBreakParams = new TimeBreakParams(hour, minute, second);
    let timeSec: number;
    if (milliSeconds) {
      timeSec = Math.floor(time / 1000);
      millisec = time - timeSec * 1000;
    }
    else {
      timeSec = time;
    }

    DisplayConvertor.time_break(breakParams, timeSec);
    hour = breakParams.hour;
    minute = breakParams.minute;
    second = breakParams.second;

    // If ascii representation overflows output buffer
    // fill with '*' and bail out

    let result: string;
    if (pic.getMaskSize() > AsciiL) {
      DisplayConvertor.char_memset(Ascii, 0, '*', /*'*'*/AsciiL);
      result = NString.FromChars(Ascii);
    }
    else {
      if (pic.zeroFill()) {
        if (timeSec === 0 && (!milliSeconds || millisec === 0)) {
          if (time_pic_Z_edt) {
            for (let intx: number = 0; intx < pic.getMaskSize(); intx = intx + 1) {
              if (Ascii[intx] <= '\u001f') {
                Ascii[intx] = pic.getZeroPad();
              }
            }
            result = NString.FromChars(Ascii);
            return result;
          }
          DisplayConvertor.char_memset(Ascii, 0, pic.getZeroPad(), pic.getMaskSize());
          result = NString.FromChars(Ascii);
          return result;
        }
      }
      let I: number = 0;
      let am: number = 0;
      let len: number = pic.getMaskSize();
      let HourI: number = -1;

      while (I < len) {
        switch (Ascii[I].charCodeAt(0)) {
          case (PICInterface.PIC_HH):
            HourI = I;
            I += 2;
            break;


          case (PICInterface.PIC_MMT):
            this.int_2_a(Ascii, I, 2, minute, '0');
            I += 2;
            break;

          case (PICInterface.PIC_SS):
            this.int_2_a(Ascii, I, 2, second, '0');
            I += 2;
            break;

          case (PICInterface.PIC_MS):
            this.int_2_a(Ascii, I, 3, millisec, '0');
            I += 3;
            break;

          case (PICInterface.PIC_PM):
            am = 1;
            let tmpHour: number = hour % 24;
            if (tmpHour < 12 || tmpHour === 0)
              DisplayConvertor.char_memcpy(Ascii, I, NString.ToCharArray("am"), 0, 2);
            else
              DisplayConvertor.char_memcpy(Ascii, I, NString.ToCharArray("pm"), 0, 2);
            I += 2;
            break;

          default:
            I++;
            break;
        }
      }
      if (HourI >= 0) {
        if (am > 0) {
          hour = hour % 24;
          if (hour === 0) {
            hour = 12;
          }
          else {
            hour = hour % 12;
            if (hour === 0) {
              hour = 12;
            }
          }
        }
        this.int_2_a(Ascii, HourI, 2, hour, (am !== 0 && hour < 10) ? ' ' : /*' '*/'0'/*'0'*/);
      }
      result = NString.FromChars(Ascii);
    }
    return result;
  }

  /// <summary>
  ///   Break time into its components
  /// </summary>
  static time_break(breakParams: TimeBreakParams, time: number): void {

    if (time <= 0) {
      breakParams.second = 0;
      breakParams.minute = 0;
      breakParams.hour = 0;
    }
    else {
      breakParams.hour = Math.floor(time / 3600);
      time = time - breakParams.hour * 3600;
      breakParams.minute = Math.floor(time / 60);
      breakParams.second = time - breakParams.minute * 60;
    }
  }

  /// <summary>
  ///   Build a display string for a logical value according to the picture
  /// </summary>
  /// <param name = "dataStr">   "0" for false or "1" for true
  /// </param>
  /// <param name = "picStr">    The picture to use for the value to display
  /// </param>
  /// <param name = "rangeStr">  The range of values to check
  /// </param>
  /// <returns> the string to be displayed
  /// </returns>
  private fromLogical(dataStr: string, pic: PIC, rangeStr: string): string {

    let Str: string[] = NString.ToCharArray(pic.getMask());

    // If picture overflows string, reset with '*'
    if (pic.getMaskSize() > Str.length) {
      DisplayConvertor.char_memset(Str, 0, '*', /*'*'*/Str.length);
      return NString.FromChars(Str);
    }
    else {

      // Crack range and copy the data

      let array2: string[] = new Array<string>(50);
      for (let _ai: number = 0; _ai < array2.length; ++_ai)
        array2[_ai] = (0).toString();
      this.win_rng_bool_sub(array2, array2.length, dataStr.charAt(0) === '1'/*'1'*/, rangeStr);
      let len: number = pic.getMaskSize();

      // Original Code - not relevant in java because the result is allways the mask len
      // if (len < StrLen)
      // char_memset (Str, len, ' ', StrLen - len);
      let resStr: string = this.win_data_cpy(Str, len, array2, pic.isAttrAlpha());
      return resStr;
    }
  }

  /// <summary>
  ///   Build a display string for a logical value according to the picture
  /// </summary>
  /// <param name = "dataStr">   "0" for false or "1" for true
  /// </param>
  /// <returns> boolean
  /// </returns>
  private fromMgLogicalToNativeLogical(dataStr: string): boolean {

    let nativeVal: boolean;
    nativeVal = (dataStr.charAt(0) === '1') ? true : false;
    return nativeVal;
  }


  /// <summary>
  ///   Build a mg string for a logical value according to the boolean value
  /// </summary>
  /// <param name = "dispVal">  boolean
  /// </param>
  /// <returns> string
  /// </returns>
  private fromNativeLogicalToMgLogical(dispVal: boolean): string {

    let mgVal: string;
    mgVal = (dispVal === true) ? "1" : "0";

    return mgVal;
  }

  /// <summary>
  ///   Get a boolean value from the range specified
  /// </summary>
  /// <param name = "Sub">      the result string</param>
  /// <param name = "SubSiz">   the result string length</param>
  /// <param name = "BoolVal">  '1' if true or '0' if false</param>
  /// <param name = "rng">      range of values</param>
  private win_rng_bool_sub(Sub: string[], SubSiz: number, BoolVal: boolean, rng: string): void {

    let crk: string[] = new Array<string>(PICInterface.DB_STR_MAX + 2);
    for (let _ai: number = 0; _ai < crk.length; ++_ai)
      crk[_ai] = (0).toString();

    let gap: string[] = new Array<string>(PICInterface.DB_STR_MAX + 2);
    for (let _ai: number = 0; _ai < gap.length; ++_ai)
      gap[_ai] = (0).toString();

    let i: number = 0;

    // Set the default range if none is specified
    rng = this.win_rng_bool(rng);

    // Crack range and choose the first element as True value
    // or the second element as the False value.
    this.win_rng_crk(crk, gap, rng);
    let s: number;
    if (BoolVal) {
      s = 0;
    }
    else {
      while (crk[i] > '\0'/*' '*/) {
        i = i + 1;
      }
      s = i + 1;
    }
    let len: number = s;
    while (crk[len] > '\0'/*' '*/) {
      len = len + 1;
    }
    len = len - s;
    DisplayConvertor.char_memcpy(Sub, 0, crk, s, Math.min(len, SubSiz));
    if (len < SubSiz) {
      DisplayConvertor.char_memset(Sub, len, ' ', /*' '*/SubSiz - len);
    }
  }

  /// <summary>
  ///   Get the default range for logical values
  /// </summary>
  /// <param name = "rng">  current range</param>
  /// <returns> the default range if the input range is empty</returns>
  private win_rng_bool(rng: string): string {

    if (rng === null || rng.length === 0) {
      rng = "True, False";
    }
    return rng;
  }

  /// <summary>
  ///   Crack a 'range' string into its components
  /// </summary>
  private win_rng_crk(crk: string[], gap: string[], range: string): void {
    let rngLen: number = range.length;
    let rng: string[] = NString.ToCharArray(range);
    let crkPos: number = 0;
    let rngPos: number = 0;
    let gapPos: number = 0;

    while (rngPos < rngLen) {
      if (rng[rngPos] === ',' || rng[rngPos] === '-') {
        gap[gapPos++] = rng[rngPos++];
        crk[crkPos++] = '\0';

        if (rngPos < rngLen) {
          while (rng[rngPos] === ' ') {
            rngPos = rngPos + 1;
          }
        }
      }
      else {
        // 05/10/95 - Mr. Takada :
        // Japanese char may have '\' code of its second byte.
        // str_chr_1_byt needs mglocal.h.
        // according to Mr. Maruoka:
        if (rng[rngPos] === '\\') {
          rngPos = rngPos + 1;
        }
        crk[crkPos] = rng[rngPos++];
        crkPos = crkPos + 1;
      }
    }

    // JPN: 01/11/95 Yama*/
    // Upper function is implemented in str.c and
    // it is also overrided by mglocal function.
    // So MAGIC needs to call this function
    // instead of CST_hdr.uppr_tab[].

    // if (up)
    // 	str_upper (org_crk, (long)(crk-org_crk));


    gap[gapPos] = '\0';
    crk[crkPos++] = '\0';
    crk[crkPos] = '\0';
  }

  // --------------------------------------------------------------------------
  // Methods for coverting DIPLAY ---> INTERNAL
  // --------------------------------------------------------------------------

  /// <summary>
  ///   Translates a string number to magic number
  /// </summary>
  /// <param name = "dispValue">   A string number</param>
  /// <param name = "picStr">      The picture to use</param>
  /// <returns> the magic number</returns>
  toNum(dispValue: string, pic: PIC, compIdx: number): string {
    let mgNum: NUM_TYPE = new NUM_TYPE(dispValue, pic, compIdx);
    return mgNum.toXMLrecord();
  }



  /// <summary>
  ///   builds the date magic number from the string value
  /// </summary>
  /// <param name = "str">            the date string</param>
  /// <param name = "str_len">        length of string</param>
  /// <param name = "pic">            the picture info</param>
  /// <param name = "mask">           the mask of the string</param>
  /// <param name = "ignore_dt_fmt"></param>
  /// <returns> the magic number</returns>
  a_2_date_pic_datemode(str: string[], str_len: number, pic: PIC, mask: string[], compIdx: number): number {
    let pos: number = 0;
    let year_in_pic: boolean = false;
    let month_in_pic: boolean = false;
    let day_in_pic: boolean = false;
    let inp: boolean = false;
    let bYearIsZero: boolean = false;
    let era_year: number = 0;
    let intRef: IntRef = new IntRef(0);
    let intPicIdxOfs: number = 0;
    let millenium: number = 0;
    let dateParams: DateBreakParams;

    let len: number = Math.min(str.length, pic.getMaskSize());

    if (str.length < mask.length)
      str.length = mask.length;

    let year: number = 0;
    let month: number = 1;
    let day: number = 1;
    let doy: number = 1;
    let usedoy: boolean = false;

    let i: number;
    for (i = 0; i < str_len; i = i + 1) {
      if (str[i] !== '0' && str[i] !== ' ') {
        break;
      }
    }

    if (i === str_len)
      return 0;

    while (pos < str_len && pos + intPicIdxOfs < len) {

      switch (mask[pos + intPicIdxOfs].charCodeAt(0)) {
        case PICInterface.PIC_YY:
          year_in_pic = true;
          inp = true;
          year = this.date_a_2_i(str, 2, pos);
          pos += 2;
          // Hen 16/11/97 : Fix #768442
          if (year === 0)
            bYearIsZero = true;
          let century_year: number = this._environment.GetCentury(compIdx) % 100; // DEF_century
          if (year < century_year)
            year += 100;
          year += this._environment.GetCentury(compIdx) - century_year; // DEF_century
          if (this._environment.GetDateMode(compIdx) === 'B')
          // DEF_date_mode
            year -= PICInterface.DATE_BUDDHIST_GAP;
          break;


        case (PICInterface.PIC_YYYY):
          year_in_pic = true;
          inp = true;
          let YearDigitsNo: number;
          // --------------------------------------------------------------
          // Make sure we have 4 year digit. If not, adjust it
          // according to the 'century year'
          // --------------------------------------------------------------
          if (UtilStrByteMode.isLocaleDefLangJPN()) {
            for (YearDigitsNo = 0; YearDigitsNo < 4 && pos + YearDigitsNo < str.length && UtilStrByteMode.isDigit(str[pos + YearDigitsNo]); YearDigitsNo++) {
            }
            i = YearDigitsNo;
          }
          else {
            for (i = 0; pos + i < str.length && str[pos + i] !== this.DATECHAR.toString() && i < 4; i++) {
            }

            for (YearDigitsNo = 0;
                 pos + YearDigitsNo < str.length && UtilStrByteMode.isDigit(str[pos + YearDigitsNo]) &&
                 YearDigitsNo < 4;
                 YearDigitsNo++) {
            }
          }

          if (UtilStrByteMode.isLocaleDefLangJPN()) {
            if (i < 4 && str.length < mask.length)
              this.move_date(str, pos, 4 - i, str.length);
          }
          else {
            if (i < 4 && len < mask.length) {
              this.move_date(str, pos, 4 - i, len);
              len = len + 4 - i;
            }
          }

          year = this.date_a_2_i(str, 4, pos);
          pos += 4;

          // Hen 16/11/97 : Fix #768442
          if (year === 0)
            bYearIsZero = true;

          if (YearDigitsNo <= 2) {
            century_year = this._environment.GetCentury(compIdx) % 100; // DEF_century
            if (year < century_year)
              year += 100;
            year += this._environment.GetCentury(compIdx) - century_year; // DEF_century
          }

          if (this._environment.GetDateMode(compIdx) === 'B')
          // DEF_date_mode
            year -= PICInterface.DATE_BUDDHIST_GAP;
          break;


        case PICInterface.PIC_HYYYYY:
          inp = true;
          let quotes: number = 0;
          if (len > pos + 5 && mask[pos + 5].charCodeAt(0) === (PICInterface.PIC_HYYYYY))
            quotes = 1;
          year = HebrewDate.dateheb_h_2_i(str, 5 + quotes, pos);
          pos += 5 + quotes;
          if (year === 0)
            bYearIsZero = true;
          break;

        case PICInterface.PIC_HL:
          intPicIdxOfs = HebrewDate.dateheb_h_2_i(str, 1, pos);
          pos++;
          break;

        case PICInterface.PIC_HDD:
          inp = true;
          quotes = 0;
          if (len > pos + 2 && mask[pos + 2].charCodeAt(0) === PICInterface.PIC_HDD)
            quotes = 1;
          day = HebrewDate.dateheb_h_2_i(str, 2 + quotes, pos);
          pos += 2 + quotes;
          break;

        case PICInterface.PIC_MMD:
          inp = true;
          month_in_pic = true;
          if (UtilStrByteMode.isLocaleDefLangJPN()) {
            if ((str.length === pos + 1 || str[pos + 1].charCodeAt(0) === this.DATECHAR || !UtilStrByteMode.isDigit(str[pos + 1])) && str.length < mask.length)
              this.move_date(str, pos, 1, str.length);
          }
          else {
            if (str[pos + 1].charCodeAt(0) === this.DATECHAR && len < mask.length) {
              this.move_date(str, pos, 1, len);
              len += 1;
            }
          }
          month = this.date_a_2_i(str, 2, pos);
          pos += 2;
          break;


        case PICInterface.PIC_MMM:
          inp = true;
          month_in_pic = true;
          intRef.val = pos;
          month = this.date_MMM_2_m(str, mask, intRef, len, pic.isHebrew());
          pos = intRef.val;
          if (pic.isHebrew() && month === 14)
            month = 6;
          break;


        case (PICInterface.PIC_DD):
          inp = true;
          day_in_pic = true;
          if (UtilStrByteMode.isLocaleDefLangJPN()) {
            if ((str.length === pos + 1 || str[pos + 1].charCodeAt(0) === this.DATECHAR || !UtilStrByteMode.isDigit(str[pos + 1])) && str.length < mask.length)
              this.move_date(str, pos, 1, str.length);
          }
          else {
            if (str[pos + 1].charCodeAt(0) === this.DATECHAR && len < mask.length) {
              this.move_date(str, pos, 1, len);
              len += 1;
            }
          }
          day = this.date_a_2_i(str, 2, pos);
          pos += 2;
          break;


        case (PICInterface.PIC_DDD):
          inp = true;
          usedoy = true;
          day_in_pic = true;
          doy = this.date_a_2_i(str, 3, pos);
          pos += 3;
          break;


        case (PICInterface.PIC_DDDD):
          inp = true;
          day_in_pic = true;
          day = this.date_a_2_i(str, 2, pos);
          pos += 2 + 2;
          break;


        case (PICInterface.PIC_YJ): // JPN: Japanese date picture support
          year_in_pic = true;
          inp = true;
          if (UtilStrByteMode.isLocaleDefLangJPN()) {
            if ((str.length === pos + 1 || str[pos + 1].charCodeAt(0) === this.DATECHAR || !UtilStrByteMode.isDigit(str[pos + 1])) && str.length < mask.length)
              this.move_date(str, pos, 1, str.length);
          }
          year = this.date_a_2_i(str, 2, pos);
          pos += 2;

          let str1: string = NString.FromChars(str);
          era_year = UtilDateJpn.getInstance().getStartYearOfEra(str1, pic.getMask());

          if (era_year === 0)
            return 0;
          year += era_year - 1;

          if (year === 0)
            bYearIsZero = true;
          break;


        default:
          if (UtilStrByteMode.isLocaleDefLangDBCS()) {
            // if "str[pos]" contains DBCS, the next index of "mask" has to be skipped.
            if (UtilStrByteMode.isHalfWidth(str[pos]) === false &&
              UtilStrByteMode.isHalfWidth(mask[pos + intPicIdxOfs]))
              intPicIdxOfs++;
          }

          pos += 1;
          break;
      }
    }

    if (bYearIsZero) {
      if (!month_in_pic)
        month = 0;
      if (!day_in_pic && month === 0)
        day = 0;
    }

    // Hen 16/11/97 : Fix #768442
    // Zero date is valid and should return 0L. This check must be here
    // because the year value may be changed because of century year.
    if (day === 0 && month === 0 && (bYearIsZero || year === 0))
      return (0);

    if (!inp)
      return (0);

    // Hebrew Year
    if (pic.isHebrew()) {
      if (year > 0) {
        if (millenium === 0)
          millenium = 5;
        year += millenium * 1000;
      }
      return (HebrewDate.dateheb_2_d(year, month, day));
    }

    // the next 2 lines support 4.xx DD/MM pictures
    if ((year === 0) && !year_in_pic) {
      dateParams = this.date_sys();
      year = dateParams.year;
    }
    return (this.date_4_calender(year, month, day, doy, usedoy));
  }

  /// <summary>
  ///   Decode digits from a date string
  /// </summary>
  private date_a_2_i(s: string[], len: number, pos: number): number;
  private date_a_2_i(s: string, len: number, pos: number): number;
  private date_a_2_i(s: any, len: number, pos: number): number {
    if (arguments.length === 3 && (s === null || s instanceof Array) && (len === null || len.constructor === Number) && (pos === null || pos.constructor === Number)) {
      return this.date_a_2_i_0(s, len, pos);
    }
    return this.date_a_2_i_1(s, len, pos);
  }

  /// <summary>
  ///   Decode digits from a date string
  /// </summary>
  private date_a_2_i_0(s: string[], len: number, pos: number): number {
    let array: string[] = new Array<string>(len);
    let mgNum: NUM_TYPE = new NUM_TYPE();
    for (let i: number = 0; i < len; i = i + 1) {
      array[i] = s[pos + i];
    }
    return mgNum.a_2_long(NString.FromChars(array));
  }

  /// <summary>
  ///   moving part of the date string
  /// </summary>
  private move_date(str: string[], pos: number, moveby: number, len: number): void;
  private move_date(str: string, pos: number, moveby: number, len: number): void;
  private move_date(str: any, pos: number, moveby: number, len: number): void {
    if (arguments.length === 4 && (str === null || str instanceof Array) && (pos === null || pos.constructor === Number) && (moveby === null || moveby.constructor === Number) && (len === null || len.constructor === Number)) {
      this.move_date_0(str, pos, moveby, len);
      return;
    }
    this.move_date_1(str, pos, moveby, len);
  }

  /// <summary>
  ///   moving part of the date string
  /// </summary>
  private move_date_0(str: string[], pos: number, moveby: number, len: number): void {
    DisplayConvertor.char_memmove(str, pos + moveby, str, pos, len - (pos + moveby) + 1);
    DisplayConvertor.char_memset(str, pos, '0', /*'0'*/moveby);
  }

  /// <summary>
  ///   Translate a month name -> month index
  /// </summary>
  /// <param name = "string">to evaluate
  /// </param>
  /// <param name = "picture">mask
  /// </param>
  /// <param name = "pos">current position in the string the intRef not exactly the same reference to integer , like in C++,
  ///   so the global pos MUST be updated by the pos.value after the function returns.
  /// </param>
  private date_MMM_2_m(str: string[], mask: string[], pos: IntRef, len: number, isHebrew: boolean): number {
    let l: number;

    if (UtilStrByteMode.isLocaleDefLangJPN()) {
      let maskPos: number = UtilStrByteMode.convPos(NString.FromChars(str), NString.FromChars(mask), pos.val, false);
      l = this.date_msk_cnt(mask, maskPos, <number>(len - maskPos));
    }
    else {
      l = this.date_msk_cnt(mask, pos.val, <number>(len - pos.val));
    }
    let strPos: number = pos.val;
    pos.val = pos.val + l;
    len = this.mem_trim(str, strPos, l);

    if (len === 0) {
      return 0;
    }
    else {
      let strB: string = NString.FromChars(str, strPos, len);
      let monthNames: string[];
      if (isHebrew) {
        monthNames = HebrewDate.GetLocalMonths();
      }
      else {
        let months: string = Events.GetMessageString(MsgInterface.MONTHS_PTR);
        monthNames = DateUtil.getLocalMonths(months);
      }

      for (let i: number = 1; i < monthNames.length; i = i + 1) {
        if (NString.Compare(monthNames[i].substr(0, len), strB, true) === 0)
          return i;
      }
    }
    return 0;
  }

  /// <summary>
  ///   Get the curret daye seperated to year, month, day
  /// </summary>
  date_sys(): DateBreakParams {
    let date: DateBreakParams = new DateBreakParams();
    let CurrDate: DateTime = DateTime.Now;

    date.year = CurrDate.Year;
    date.month = CurrDate.Month;
    date.day = CurrDate.Day;

    return date;
  }

  /// <summary>
  ///   to get current date in magic representation Query Magic's Date
  /// </summary>
  /// <returns> the 'Magic' current date
  /// </returns>
  date_magic(utcDate: boolean): number {
    let dateTime: DateTime;
    if (utcDate) {
      dateTime = DateTime.UtcNow;
    }
    else {
      dateTime = DateTime.Now;
    }

    let year: number = dateTime.Year;
    let month: number = dateTime.Month;
    let day: number = dateTime.Day;

    return this.date_4_calender(year, month, day, 1, false);
  }

  /// <summary>
  ///   to get  the system time
  /// </summary>
  /// <returns> the 'Magic' current time
  /// </returns>
  time_magic(utcTime: boolean): number {
    return DateTime.GetTotalSecondsFromMidnight(utcTime, new Date());
  }

  mtime_magic(utcTime: boolean): number {
    // TODO : implement system time.
    throw new NotImplementedException();
  }

  /// <summary>
  ///   Compute MAGIC date
  /// </summary>
  date_4_calender(year: number, month: number, day: number, doy: number, usedoy: boolean): number {

    let LeapYear: boolean = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

    // 3.11.97 - Hen (Fixed bug #764265 and #8186) :
    // If the date is 0 then return 0L (zero value is valid), else if the date
    // is illegal then return 1000000000L (wrong date).
    if (usedoy) {
      if (doy === 0) {
        return 0;
      }
      if (doy > 366 || (!LeapYear && doy > 365)) {
        return (1000000000);
      }
    }
    else {
      if (day === 0 && month === 0 && year === 0) {
        return 0;
      }
      if (day === 0 || month === 0 || year === 0 || month > 12) {
        return 1000000000;
      }
    }
    year = year - 1;
    let num: number = Math.floor(year / 400);
    year = year - num * 400;
    let num2: number = Math.floor(year / 100);
    year = year - num2 * 100;
    let num3: number = Math.floor(year / 4);
    year = year - num3 * 4;

    if (!usedoy) {
      let num4: number = PICInterface.date_day_tab[month - 1];
      let num5: number = PICInterface.date_day_tab[month];

      if (LeapYear) {
        if (month > 1) {
          num5 = num5 + 1;
          if (month > 2) {
            num4 = num4 + 1;
          }
        }
      }

      if (day > num5 - num4) {
        return 1000000000;
      }
      doy = num4 + day;
    }
    return num * 146097 + num2 * 36524 + num3 * 1461 + year * 365 + doy;
  }

  /// <summary>
  ///   Translates a string time to magic number
  /// </summary>
  /// <param name = "dispValue">   A string value</param>
  /// <param name = "picStr">      The picture to use</param>
  /// <returns> the magic number</returns>
  fromNativeTimeToMgTime(dispValue: Date, pic: PIC): string {
    let mgNum: NUM_TYPE = new NUM_TYPE();
    let numVal: number = this.fromNativeTimeToMgTimeNumber(dispValue, pic);
    mgNum.NUM_4_LONG(numVal);
    return mgNum.toXMLrecord();
  }

  fromNativeTimeToMgTimeNumber(dispValue: Date, pic: PIC): number {
    let numVal: number = this.time_2_int(dispValue.getHours(), dispValue.getMinutes(), dispValue.getSeconds());
    return numVal;
  }
  /// <summary>
  ///   Convert Alpha into a Time according to a given picture
  /// </summary>
  a_2_time(Ascii: string, pic: PIC, milliSeconds: boolean): number;
  a_2_time(Ascii: string, AsciiL: number, mask: string[], milliSeconds: boolean): number;
  a_2_time(Ascii: any, picOrAsciiL: any, milliSecondsOrMask: any, milliSeconds?: boolean): number {
    if (arguments.length === 3)
      return this.a_2_time_0(Ascii, picOrAsciiL, milliSecondsOrMask);

    return this.a_2_time_1(Ascii, picOrAsciiL, milliSecondsOrMask, milliSeconds);
  }

  /// <summary>
  ///   Convert Alpha into a Time according to a given picture
  /// </summary>
  private a_2_time_0(Ascii: string, pic: PIC, milliSeconds: boolean): number {
    return this.a_2_time(Ascii, Ascii.length, NString.ToCharArray(pic.getMask()), milliSeconds);
  }

  /// <summary>
  ///   Convert Alpha into a Time according to a given picture
  /// </summary>
  private a_2_time_1(Ascii: string, AsciiL: number, mask: string[], milliSeconds: boolean): number {
    let mgNum: NUM_TYPE = new NUM_TYPE();
    let I: number = 0;
    let len: number = mask.length; // Length of mask or string to scan

    // Initialize counters and flags
    if (len > AsciiL) {
      len = AsciiL;
    }
    let ampm: number = 0; // AM/PM indicator
    let hour: number = 0;
    let minute: number = 0;
    let second: number = 0;
    let millisecond: number = 0;

    while (I < len) {
      let maskLength: number;
      let maxMaskLen: number;

      // To get the maximum possible length of the constants in the mask
      switch (mask[I].charCodeAt(0)) {
        case (PICInterface.PIC_HH):
        case (PICInterface.PIC_MMT):
        case (PICInterface.PIC_SS):
        case (PICInterface.PIC_PM):
          maxMaskLen = 2;
          break;

        case (PICInterface.PIC_MS):
          maxMaskLen = 3;
          break;

        default:
          maxMaskLen = 1;
          break;
      }

      /* To get the minimum of maxMaskLen & number of characters remained in string
      because if the Ascii is shorter(has less characters)then create String only
      of that no. of characters (maskLength), not of maxMaskLength */
      maskLength = Math.min(maxMaskLen, len - I);

      switch (mask[I].charCodeAt(0)) {
        case (PICInterface.PIC_HH):
        {
          hour = mgNum.a_2_long(Ascii.substr(I, maskLength));
        }
        break;

        case (PICInterface.PIC_MMT):
        {
          minute = mgNum.a_2_long(Ascii.substr(I, maskLength));
        }
        break;

        case (PICInterface.PIC_SS):
        {
          second = mgNum.a_2_long(Ascii.substr(I, maskLength));
        }
        break;

        case (PICInterface.PIC_MS):
        {
          millisecond = mgNum.a_2_long(Ascii.substr(I, maskLength));
        }
        break;

        case (PICInterface.PIC_PM):
          ampm = 0;
          let c0: string = Ascii[I];
          let c1: string;
          c0 = c0.toUpperCase();
          if (I + 1 < len) {
            c1 = Ascii[I + 1];
            c1 = c1.toUpperCase();

            if (c1 === 'M') {
              if (c0 === 'A')
                ampm = -1;
              if (c0 === 'P')
                ampm = 1;
            }
          }
          break;

        default:
          break;
      }
      I += maskLength;
    }

    // Check validity of minutes and seconds
    if (second > 59 || minute > 59)
      return (0);

    // Convert hour to PM if specified as AM
    if (ampm !== 0)
      if (ampm === -1)
      // AM
      {
        if (hour === 12)
          hour = 0;
      }
      else if (hour < 12)
      // PM
        hour += 12;
    if (milliSeconds)
      return this.time_2_int(hour, minute, second) * 1000 + millisecond;
    else
      return this.time_2_int(hour, minute, second);
  }

  time_2_int(hour: number, minute: number, second: number): number {
    return hour * 3600 + minute * 60 + second;
  }

  /// <summary>
  ///   Convert "0"/"1" to false/true
  /// </summary>
  /// <param name = "boolStr">  "0"/"1"
  /// </param>
  /// <returns> true if "1" or false if others
  /// </returns>
  static toBoolean(boolStr: string): boolean {
      return boolStr !== null && boolStr === "1";
  }

  /// <summary>
  ///   converts string like "x,y,dx,dy" to MgRectangle
  /// </summary>
  /// <param name = "rectStr">
  /// </param>
  /// <returns>
  /// </returns>
  static toRect(val: string): MgRectangle {
    let array: number[] = new Array<number>(4);
    let array2: string[] = StrUtil.tokenize(val, ",");
    for (let i: number = 0; i < array2.length; i = i + 1) {
      Debug.Assert(i < 4);
      array[i] = NNumber.Parse(array2[i]);
    }
    Debug.Assert(array.length === 4);
    return new MgRectangle(array[0], array[1], array[2], array[3]);
  }

  /// <summary>
  ///   Java version of memset function to char[]
  /// </summary>
  /// <param name = "charArray">  A character array
  /// </param>
  /// <param name = "pos">        Position to start
  /// </param>
  /// <param name = "charToSet">  Character to set
  /// </param>
  /// <param name = "len">        number of Characters to set
  /// </param>
  static char_memset(charArray: string[], pos: number, charToSet: string, len: number): void {

    if (len <= 0)
      return;

    for (let i: number = 0; i < len; i = i + 1) {
      charArray[pos + i] = charToSet;
    }
  }

  /// <summary>
  ///   Java version of memcopy function to char[]
  /// </summary>
  /// <param name = "to">    destination array
  /// </param>
  /// <param name = "pos1">  Position to start in destination
  /// </param>
  /// <param name = "from">  source array
  /// </param>
  /// <param name = "pos2">  Position to start in source
  /// </param>
  /// <param name = "len">   number of Characters to copy
  /// </param>
  static char_memcpy(to: string[], pos1: number, from: string[], pos2: number, len: number): void {
    if (len <= 0)
      return;

    for (let i: number = 0; i < len; i = i + 1) {
      to[pos1 + i] = from[pos2 + i];
    }
  }

  /// <summary>
  ///   Java version of memmove function to char[]
  /// </summary>
  /// <param name = "to">    destination array
  /// </param>
  /// <param name = "pos1">  Position to start in destination
  /// </param>
  /// <param name = "from">  source array
  /// </param>
  /// <param name = "pos2">  Position to start in source
  /// </param>
  /// <param name = "len">   number of Characters to move
  /// </param>
  private static char_memmove(to: string[], pos1: number, from: string[], pos2: number, len: number): void {

    if (len <= 0)
      return;

    let tmp: string[] = new Array<string>(len);
    for (let i: number = 0; i < len; i = i + 1) {
      tmp[i] = from[pos2 + i];
    }
    for (let i: number = 0; i < len; i = i + 1) {
      to[pos1 + i] = tmp[i];
    }
  }


  /// <summary>
  ///   Magic's mem_trim function
  /// </summary>
  private mem_trim(s: string[], sPos: number, len: number): number {
    let i: number;

    for (i = sPos + len - 1; len > 0 && i < s.length; i--, len--)
      if (s[i] !== ' ' && s[i] !== '\x0000')
        break;
    return len;
  }

  /// <summary>
  ///   String to Date function
  /// </summary>
  a_2_date(str: string, Format: string, compIdx: number): number {
    return this.a_2_date_datemode(str, Format, compIdx);
  }

  a_2_date_pic(str: string, pic: PIC, mask: string, compIdx: number): number {
    if ( str === null) {
      str = "";
    }
    return this.a_2_date_pic_datemode(NString.ToCharArray(str), str.length, pic, NString.ToCharArray(mask), compIdx);
  }

  to_a(outVal: string, out_len: number, date: number, Format: string, compIdx: number): string {
    return this.to_a_datemode(outVal, out_len, date, Format, false, compIdx);
  }

  /// <summary>
  ///   Convert string -> date using a format string
  /// </summary>
  private a_2_date_datemode(str: string, Format: string, compIdx: number): number {
    let pIC: PIC = new PIC(Format, StorageAttribute.DATE, compIdx);
    if (str === null) {
      str = "";
    }
    return this.a_2_date_pic_datemode(NString.ToCharArray(str), str.length, pIC, NString.ToCharArray(pIC.getMask()), compIdx);
  }

  /// <summary>
  ///   String to a datemode
  /// </summary>
  private to_a_datemode(outVal: string, out_len: number, date: number, Format: string, ignore_dt_fmt: boolean, compIdx: number): string {

    // Parse the picture
    let pic: PIC = new PIC(Format, StorageAttribute.DATE, compIdx);

    // Convert the  date -> string
    if (outVal === null) {
      outVal = pic.getMask();
    }
    return this.to_a_pic_datemode(outVal, out_len, date, pic, true, ignore_dt_fmt, compIdx);
  }

  /// <summary>
  ///   Decode digits from a date string
  /// </summary>
  private date_a_2_i_1(s: string, len: number, pos: number): number {

      // don't forget to include 'pos+=len' after the using of the function
      let mgNum: NUM_TYPE = new NUM_TYPE();
      let str: string;

      str = s.substr(pos, len);
      return mgNum.a_2_long(str);
  }

  private move_date_1(str: string, pos: number, moveby: number, len: number): string {
    str = StrUtil.memmove(str, pos + moveby, str, pos, len - pos);

    str = StrUtil.memset (str, pos, '0', moveby);
    return str;
  }

  time_2_a(Ascii: string, AsciiL: number, time: number, Format: string, compIdx: number, milliSeconds: boolean): string {

    if (StrUtil.rtrim(Format).length === 0) {
      Format = "HH:MM:SS";
    }
    let pic: PIC = new PIC(Format, StorageAttribute.TIME, compIdx);
    if (Ascii === null) {
      Ascii = pic.getMask();
    }
    return this.time_2_a_pic(Ascii, AsciiL, time, pic, false, milliSeconds);
  }

  /// <summary>
  ///   Translates a string to magic logical
  /// </summary>
  /// <param name = "dispValue">   A string value
  /// </param>
  /// <param name = "pic">         The picture to use
  /// </param>
  /// <param name = "rangeStr">    The range
  /// </param>
  /// <returns> the logical value
  /// </returns>
  toLogical(dispValue: string, pic: PIC, rangeStr: string): string {
    dispValue = dispValue.trim();
    if (dispValue === null || dispValue.length === 0) {
      dispValue = "False";
    }
    return this.disp_2_logical(dispValue, pic.getMask(), rangeStr);
  }

  /// <summary>
  ///   translate the displayed value to a magic logical value
  /// </summary>
  /// <param name = "dispValue">the displayed value </param>
  /// <param name = "mask">the mask of the displayed value </param>
  /// <param name = "rangeStr">the range string </param>
  private disp_2_logical(dispValue: string, mask: string, rangeStr: string): string {

    let strippedValue: StringBuilder = new StringBuilder(dispValue.length);

    rangeStr = this.win_rng_bool(rangeStr);
    rangeStr = StrUtil.makePrintableTokens(rangeStr, SEQ_2_HTML);
    let i: number = rangeStr.indexOf(',');
    let trueStr: string = rangeStr.substr(0, i);
    trueStr = StrUtil.makePrintableTokens(trueStr, HTML_2_STR);
    i = 0;

    for (i = 0; i < dispValue.length && i < mask.length; i++) {
      if (mask.charCodeAt(i) === PICInterface.PIC_X) {
        strippedValue.Append(dispValue.charAt(i));
      }
    }
    let val: string = strippedValue.ToString();
    if (trueStr.length < val.length) {
      val = val.substr(0, trueStr.length);
    }
    else {
      if (val.length < trueStr.length) {
        trueStr = trueStr.substr(0, val.length);
      }
    }
    return (val.toUpperCase() === trueStr.toUpperCase()) ? "1" : "0";
  }

  /// <summary>
  ///   converting the displayed value of a string to internal
  ///   representation must remove the masking characters from it
  /// </summary>
  private toAlpha(dispValue: string, pic: PIC): string {

    let picture: string = pic.getMask();
    let buffer: StringBuilder = new StringBuilder(pic.getMaskSize());
    let IsAlphaDBCS: boolean = UtilStrByteMode.isLocaleDefLangDBCS() && pic.isAttrAlpha();
    let currPicture: number;
    let i: number = currPicture = 0;

    for (currPicture = i = 0; i < dispValue.length && currPicture < picture.length; i++, currPicture++)
    {
      if (FieldValidator.isAlphaPositionalDirective(picture.charAt(currPicture))) {
        buffer.Append(dispValue.charAt(i));

        if (IsAlphaDBCS) {
          // a DBCS character in "dispValue" consumes two characters in "picture"
          let strDspValOneChar: string = dispValue.substr(i, 1);
          if ( UtilStrByteMode.lenB(strDspValOneChar) === 2) {
            currPicture = currPicture + 1;
          }
        }
      }
    }
    return buffer.ToString();
  }

  /// <summary>
  ///   Comparative newValue with possible Range in ContinuousRangeValues/discreteRangeValues
  /// </summary>
  /// <returns> newValue if it possible, old value owervise
  /// </returns>
  private fillAlphaByRange(ContinuousRangeValues: List<string>, discreteRangeValues: List<string>, newValue: string): string {

    let tmpBuffer: string = this.fillAlphaByDiscreteRangeValues(discreteRangeValues, newValue);
    if ( tmpBuffer !== null) {
      return tmpBuffer;
    }
    else {
      tmpBuffer = this.fillAlphaByContinuousRangeValues(ContinuousRangeValues, newValue);
      if (tmpBuffer !== null) {
        return tmpBuffer;
      }
      else {
        if (discreteRangeValues !== null) {
          tmpBuffer = this.completeAlphaByRange(discreteRangeValues, newValue);
          if (tmpBuffer !== null) {
            return tmpBuffer;
          }
        }
      }
    }
    // unpossible to find it in the range return not changed oldvalue
    return newValue;
  }

  /// <summary>
  ///   fill Alpha string by discrete range
  /// </summary>
  /// <param name = "discreteRangeValues">vector of discrete range values
  /// </param>
  /// <param name = "newValue">value, try found in the vector of discrete ranges
  /// </param>
  /// <returns> found value or null(not found)
  /// </returns>
  fillAlphaByDiscreteRangeValues(discreteRangeValues: List<string>, newValue: string): string {
    let result: string;

    if (discreteRangeValues !== null) {
      for (let i: number = 0; i < discreteRangeValues.length; i = i + 1) {
        let discreteValue: string = discreteRangeValues.get_Item(i);
        let truncatedValue: string = discreteValue.substr(0, Math.min(newValue.length, discreteValue.length));
        if (newValue.toUpperCase() === truncatedValue.toUpperCase()) {
          return discreteValue;
        }
      }
    }
    return null;
  }

  /// <summary>
  ///   fill Alpha string by continuous range
  /// </summary>
  /// <param name = "ContinuousRangeValues">vector of continuous range values
  /// </param>
  /// <param name = "newValue">value, try found in the vector of continuous ranges
  /// </param>
  /// <returns> found value or null(not found)
  /// </returns>
  fillAlphaByContinuousRangeValues(ContinuousRangeValues: List<string>, newValue: string): string {
    newValue = StrUtil.rtrim(newValue);


    if (ContinuousRangeValues !== null) {
      for (let i: number = 0; i < ContinuousRangeValues.length; i = i + 1) {
        let from: string = ContinuousRangeValues.get_Item(i);
        let to: string = ContinuousRangeValues.get_Item(i = i + 1);
        if (NString.CompareOrdinal(newValue, from) >= 0 && NString.CompareOrdinal(newValue, to) <= 0) {
          return newValue;
        }
      }
    }

    return null;
  }

  /// <summary>
  ///   Try to complete the newValue using the Range
  ///   first try to comlete the value for case meaning and after that for ignore case
  /// </summary>
  /// <param name = "vector">of ranges
  /// </param>
  /// <param name = "checked">value
  /// </param>
  /// <returns> value completed by range
  /// </returns>
  completeAlphaByRange(discreteRangeValues: List<string>, newValue: string): string {

    let maxCoincide: number[] = new Array<number>(2);
    for (let _ai: number = 0; _ai < maxCoincide.length; ++_ai)
      maxCoincide[_ai] = 0;

    let bestItem: string[] = new Array<string>(2);
    for (let _ai: number = 0; _ai < bestItem.length; ++_ai)
      bestItem[_ai] = null;

    let CHECK_CASE: number = 0;
    let IGNORE_CASE: number = 1;

    let caseLetters: number = CHECK_CASE;

    while (caseLetters === CHECK_CASE || caseLetters === IGNORE_CASE) {
      let lowerValue: string;
      if (caseLetters === CHECK_CASE) {
        lowerValue = newValue;
      }
      else {
        lowerValue = newValue.toLowerCase();
      }
      lowerValue = StrUtil.rtrim(lowerValue);
      for (let i: number = 0; i < discreteRangeValues.length; i = i + 1) {
        let wrongLetter: boolean = false;
        let currCoincide: number = 0;
        let rangeItem: string;
        if (caseLetters === CHECK_CASE) {
          rangeItem = discreteRangeValues.get_Item(i);
        }
        else {
          rangeItem = discreteRangeValues.get_Item(i).toLowerCase();
        }
        let lowLength: number = lowerValue.length;
        let rangeLength: number = rangeItem.length;
        if (lowLength < rangeLength) {
          for (let j: number = 0; j < lowLength; j = j + 1) {
            if (!(lowerValue.charAt(j) === rangeItem.charAt(j))) {
              wrongLetter = true;
              break;
            }
            currCoincide = currCoincide + 1;
          }
        }
        else {
          wrongLetter = true;
        }

        if (currCoincide > maxCoincide[caseLetters] && !wrongLetter) {
          bestItem[caseLetters] = discreteRangeValues.get_Item(i);
          maxCoincide[caseLetters] = currCoincide;
        }
      }
      caseLetters = caseLetters + 1;
    }


    if (bestItem[CHECK_CASE] !== null)
      return bestItem[CHECK_CASE];
    else {
      if (bestItem[IGNORE_CASE] !== null)
        return bestItem[IGNORE_CASE];
    }

    return null;
  }

  setDateChar(dateChar: number): void {
    this.DATECHAR = dateChar;
  }

  getDateChar(): number {
    return this.DATECHAR;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="value"></param>
  /// <param name="storageAttribute"></param>
  /// <returns></returns>
  static StringValueToMgValue(value: string, storageAttribute: StorageAttribute, filler: string, length: number): any {
    switch (storageAttribute) {
      case StorageAttribute.ALPHA:
      case StorageAttribute.UNICODE: {
        let newVal: string = value;
        newVal = NString.PadRight(newVal, length, filler);
        return newVal;
      }
      case StorageAttribute.NUMERIC:
      case StorageAttribute.DATE:
      case StorageAttribute.TIME:
        return new NUM_TYPE(value);
      default:
        return value;
    }
  }
}
/// <summary>
///   Being used to send parameters to the 'time_break' method
/// </summary>
export class TimeBreakParams {
  hour: number = 0;
  minute: number = 0;
  second: number = 0;

  constructor();
  constructor(hour_: number, minute_: number, second_: number);
  constructor(hour_?: number, minute_?: number, second_?: number) {
    if (arguments.length === 0) {
      this.constructor_0();
      return;
    }
    this.constructor_1(hour_, minute_, second_);
  }

  private constructor_0(): void {
  }

  private constructor_1(hour_: number, minute_: number, second_: number): void {
    this.hour = hour_;
    this.minute = minute_;
    this.second = second_;
  }
}

/// <summary>
///   Being used to send int by Ref
/// </summary>
class IntRef {
  val: number = 0;

  constructor(val_: number) {
    this.val = val_;
  }
}

/// <summary>
///   Being used to send parameters to the 'date_i_2_nm' method
/// </summary>
class DateNameParams  {
  outVal: string[] = null;
  len: number = 0;
  outIdx: number = 0;

  constructor(out_: string[], outIdx_: number, len_: number) {
    this.outVal = out_;
    this.outIdx = outIdx_;
    this.len = len_;
  }
}

/// <summary>
///   Being used to send parameters to the 'date_break_datemode' method
///   it's struct
/// </summary>
export class DateBreakParams {
  day: number = 0;
  dow: number = 0;
  doy: number = 0;
  month: number = 0;
  year: number = 0;

  constructor();
  constructor(year_: number, month_: number, day_: number, doy_: number, dow_: number);
  constructor(year_?: number, month_?: number, day_?: number, doy_?: number, dow_?: number) {
    if (arguments.length === 0) {
      this.constructor_0();
      return;
    }
    this.constructor_1(year_, month_, day_, doy_, dow_);
  }

  private constructor_0(): void {
  }

  private constructor_1(year_: number, month_: number, day_: number, doy_: number, dow_: number): void {
    this.year = year_;
    this.month = month_;
    this.day = day_;
    this.doy = doy_;
    this.dow = dow_;
  }
}
