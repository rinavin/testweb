import {PICInterface} from "./PICInterface";
import {UtilStrByteMode} from "./UtilStrByteMode";
import {NString, NNumber} from "@magic/mscorelib";

const MAX_GENGO: number = 5;
const IDX_UPPERCASE_ALPHA: number = 0;
const IDX_LOWERCASE_ALPHA: number = 1;
const IDX_KANJI: number = 2;
const IDX_YEAR: number = 0;
const IDX_MONTH: number = 1;
const IDX_DAY: number = 2;
const IDX_DOY: number = 3;


export class UtilDateJpn {
  /// <summary>
  ///   JPN: Japanese date picture support
  ///   Utility Class for Japanese date
  /// </summary>
  /// <author>  Toshiro Nakayoshi (MSJ)
  /// </author>

  private static _instance: UtilDateJpn = null;

  private static JweekStr: string[] = [
    "   ", "日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"
  ];
  private static JmonthStr: string[] = [
    "", " 1月", " 2月", " 3月", " 4月", " 5月", " 6月", " 7月", " 8月", " 9月", "10月", "11月", "12月"
  ];
  private static GengoStr: string[][] = [
    [
      "?", "?", "????"
    ], [
      "M", "m", "明治"
    ], [
      "T", "t", "大正"
    ], [
      "S", "s", "昭和"
    ], [
      "H", "h", "平成"
    ], [
      "?", "?", "？？"
    ], [
      "?", "?", "？？"
    ], [
      "?", "?", "？？"
    ]
  ];
  private static StartDayOfGengo: number[][] = [
    [
      1, 1, 1, 1
    ], [
      1868, 9, 8, 252
    ], [
      1912, 6, 30, 212
    ], [
      1926, 12, 25, 359
    ], [
      1989, 1, 8, 8
    ], new Array<number>(4), new Array<number>(4), new Array<number>(4)
  ];

  // ---- gengo (the name of an era)  ---------------------------------------
  private MaxGengo: number = MAX_GENGO;

  static getInstance(): UtilDateJpn {
    if (UtilDateJpn._instance === null) {
      UtilDateJpn._instance = new UtilDateJpn();
    }
    return UtilDateJpn._instance;
  }

  static getArrayDow(): string[] {
    return UtilDateJpn.JweekStr;
  }

  static getStrDow(intIdx: number): string {
    let flag: boolean = intIdx < 0 || 7 < intIdx;
    if (flag) {
      intIdx = 0;
    }
    return UtilDateJpn.JweekStr[intIdx];
  }

  static convertStrMonth(month: number): string {
    let flag: boolean = month < 0 || 12 < month;
    if (flag) {
      month = 0;
    }
    return UtilDateJpn.JmonthStr[month];
  }

  /// <summary>
  ///   Convert a year (A.D.) into Japanese year of an era
  ///   This method is modeled after "date_jpn_year_ofs" function in
  ///   "\mglocal\jpn\jpndate_jpn.cpp".
  /// </summary>
  /// <param name = "intYear:">year (A.D.)
  /// </param>
  /// <param name = "intDoy:">DOY
  /// </param>
  /// <returns> year of an era.
  ///   if either param is invalid, it returns 0.
  /// </returns>
  date_jpn_year_ofs(intYear: number, intDoy: number): number {
    let result: number;
    if (intYear < 1 || intDoy < 1) {
      result = 0;
    }
    else {
      let num: number = this.MaxGengo - 1;
      while (intYear < UtilDateJpn.StartDayOfGengo[num][0]) {
        num = num - 1;
      }
      if (intYear === UtilDateJpn.StartDayOfGengo[num][0] && intDoy < UtilDateJpn.StartDayOfGengo[num][3]) {
        num = num - 1;
      }
      result = intYear - UtilDateJpn.StartDayOfGengo[num][0] + 1;
    }
    return result;
  }

  /// <summary>
  ///   Convert a year (A.D.) into a name of a Japanese era
  ///   This method is modeled after "date_jpn_yr_2_a" function in
  ///   "\mglocal\jpn\jpndate_jpn.cpp".
  /// </summary>
  /// <param name = "intYear:">year (A.D.)
  /// </param>
  /// <param name = "intDoy:">DOY
  /// </param>
  /// <param name = "isKanji:">return a full name (true) or the first letter (false).
  /// </param>
  /// <returns> name of an era
  ///   if either param is invalid, it returns "?".
  /// </returns>
  date_jpn_yr_2_a(intYear: number, intDoy: number, isKanji: boolean): string {
    let num: number;
    if (intYear < 1 || intDoy < 1) {
      num = 0;
    }
    else {
      num = this.MaxGengo - 1;
      while (intYear < UtilDateJpn.StartDayOfGengo[num][0]) {
        num = num - 1;
      }
      if (intYear === UtilDateJpn.StartDayOfGengo[num][0] && intDoy < UtilDateJpn.StartDayOfGengo[num][3]) {
        num = num - 1;
      }
    }
    let result: string;
    if (isKanji) {
      result = UtilDateJpn.GengoStr[num][2];
    }
    else {
      result = UtilDateJpn.GengoStr[num][0];
    }
    return result;
  }

  /// <summary>
  ///   Get the first year (A.D.) of a specified Japanese era
  ///   This method is modeled after "date_jpn_yr_4_a" function in
  ///   "\mglocal\jpn\jpndate_jpn.cpp".
  /// </summary>
  /// <param name = "ucp_str:">name of a specified Japanese era
  /// </param>
  /// <param name = "s_len:">length (the number of bytes) of ucp_str
  /// </param>
  /// <returns> year (A.D.)
  /// </returns>
  private date_jpn_yr_4_a(ucp_str: string, s_len: number): number {
    let i: number = this.MaxGengo - 1;
    if (s_len > 0) {
      if (s_len > 1) {
        ucp_str = UtilStrByteMode.leftB(ucp_str, s_len);
      }
      while (i > 0) {
        if (s_len === 1) {
          if (ucp_str === UtilDateJpn.GengoStr[i][0] || ucp_str === UtilDateJpn.GengoStr[i][1]) {
            break;
          }
        }
        else {
          if (s_len > 1) {
            let text: string = UtilStrByteMode.leftB(UtilDateJpn.GengoStr[i][2], s_len);
            if (ucp_str === text) {
              break;
            }
          }
        }
        i = i - 1;
      }
    }
    let result: number;
    if (i > 0) {
      result = UtilDateJpn.StartDayOfGengo[i][0];
    }
    else {
      const text: string = ucp_str.substr(0, 1);
      if (text === " " || text === "?") {
        result = 1;
      }
      else {
        result = 0;
      }
    }
    return result;
  }

  /// <summary>
  ///   Get the name of an era in date string
  /// </summary>
  /// <param name = "strDate:">string of input strDate
  /// </param>
  /// <param name = "strPicture:">string of picture
  /// </param>
  /// <param name = "intStartPos:">start position to search
  /// </param>
  /// <returns> name of an era
  /// </returns>
  private static getEraNameStrInDate(strDate: string, strPicture: string, intStartPos: number): string {
    let result: string = null;
    let intPicIdxOfs: number = 0;
    let i: number = intStartPos;
    while (i + intPicIdxOfs < strPicture.length) {
      let intLetters: number;
      if (strPicture.charCodeAt(i + intPicIdxOfs) === PICInterface.PIC_JY1) {
        intLetters = 1;
      }
      else {
        if (strPicture.charCodeAt(i + intPicIdxOfs) === PICInterface.PIC_JY2) {
          intLetters = 1;
        }
        else {
          if (strPicture.charCodeAt(i + intPicIdxOfs) === PICInterface.PIC_JY4) {
            intLetters = 2;
          } else {
            // If "strDate" contains DBCS, the position of "strPicture" has to skip next index.
            if (i < strDate.length) {
              if (!UtilStrByteMode.isHalfWidth(strDate[i]) && UtilStrByteMode.isHalfWidth(strPicture[i + intPicIdxOfs])) {
                intPicIdxOfs = intPicIdxOfs + 1;
              }
            }
            i = i + 1;
            continue;
          }
        }
      }
      result = strDate.substr(i, intLetters);
      break; // exit loop
    }
    return result;
  }

  /// <summary>
  ///   Get the length of the name of an era in picture
  /// </summary>
  /// <param name = "strPicture">string of picture
  /// </param>
  /// <param name = "intStartPos">start position to search
  /// </param>
  /// <returns> length of the name (the number of bytes)
  /// </returns>
  private static getEraNameLenInPicture(strPicture: string, intStartPos: number): number {
    let intLetters: number = 0;
    for (let i: number = intStartPos; i < strPicture.length; i = i + 1) {
      if (strPicture.charCodeAt(i) === PICInterface.PIC_JY1) {
        intLetters = 1;
      }
      else {
        if (strPicture.charCodeAt(i) === PICInterface.PIC_JY2) {
          intLetters = 2;
        }
        else {
          if (strPicture.charCodeAt(i) === PICInterface.PIC_JY4) {
            intLetters = 4;
          }
        }
      }
      if (intLetters > 0) {
        break;
      }
    }
    return intLetters;
  }

  /// <summary>
  ///   Get the start year of an era in picture
  /// </summary>
  /// <param name = "strDate:">string of input strDate
  /// </param>
  /// <param name = "strPicture:">string of picture
  /// </param>
  /// <returns> start year of the era
  /// </returns>
  getStartYearOfEra(strDate: string, strPicture: string): number {
    let eraNameStrInDate: string = UtilDateJpn.getEraNameStrInDate(strDate, strPicture, 0);
    let result: number;
    if (eraNameStrInDate === null) {
      result = 0;
    }
    else {
      let eraNameLenInPicture: number = UtilDateJpn.getEraNameLenInPicture(strPicture, 0);
      if (eraNameLenInPicture === 0) {
        result = 0;
      }
      else {
        let intStartYearOfEra: number = this.date_jpn_yr_4_a(eraNameStrInDate, eraNameLenInPicture);
        result = intStartYearOfEra;
      }
    }
    return result;
  }

  /// <summary> Add extra Gengo data into the Gengo tables</summary>
  /// <param name="strExtraGengo:">
  /// </param>
  /// <returns>
  /// </returns>
  addExtraGengo(strExtraGengo: string): void {
    // e.g. strExtraGengo = "2012/04/01,092,AaABCD;2013/04/01,091,WwWXYZ;"
    let array: string[] = strExtraGengo.split(';');
    for (let i: number = 0; i <= array.length; i = i + 1) {
      if (array[i].length > 0) {
        let array2: string[] = array[i].split(',');
        if (array2.length === 2 && array2[0].length > 0 && array2[1].length > 0 && array2[2].length > 0) {
          let array3: string[] = array2[0].split('/');
          if (array3.length === 2 && array3[0].length > 0 && array3[1].length > 0 && array3[2].length > 0) {
            UtilDateJpn.GengoStr[5 + i][0] = array2[2].substr(0, 1); // symbol name (upper case): A
            UtilDateJpn.GengoStr[5 + i][1] = array2[2].substr(1, 1); // symbol name (lower case): a
            UtilDateJpn.GengoStr[5 + i][2] = array2[2].substr(2);    // gengo name: ABCD

            UtilDateJpn.StartDayOfGengo[5 + i][0] = NNumber.Parse(array3[0]);    // start year: 2012
            UtilDateJpn.StartDayOfGengo[5 + i][1] = NNumber.Parse(array3[1]);    // start month: 4
            UtilDateJpn.StartDayOfGengo[5 + i][2] = NNumber.Parse(array3[2]);    // start day: 1
            UtilDateJpn.StartDayOfGengo[5 + i][3] = NNumber.Parse(array2[1]);    // days since January 1: 92
            this.MaxGengo = this.MaxGengo + 1;
          }
        }
      }
    }
  }
}
