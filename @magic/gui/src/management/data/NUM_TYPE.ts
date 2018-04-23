import {NString, Exception, StringBuilder, NNumber, Int32, NumberStyles} from "@magic/mscorelib";
import {Misc, PICInterface, UtilStrByteMode, StorageAttribute, Constants, Randomizer} from "@magic/utils";
import {PIC} from "../gui/PIC";
import {IEnvironment} from "../../env/IEnvironment";
import {Manager} from "../../Manager";
import {Events} from "../../Events";

///   This class handles a Magic Number the identical way it's represented in Magic.
///   Most of the methods in this class were copied from the C++ sources of Magic,
///   in order to keep the exact logic used in order to implement all the functionality
///   expected, which means that the exact methods names and variables names where used
///   in order to make future debugging more easyer.
///   Notice a long data type that is used in Magic C++ sources, is represented in java
///   by the int data type.
/// </summary>
/// <author>  Alon Bar-Nes
/// </author>

export class NUM_TYPE {
  // --------------------------------------------------------------------------
  // Constants
  // --------------------------------------------------------------------------
  static INT_ZERO_HEX: string = "00000000";
  static BYTE_ZERO_BIT: string = "00000000";
  static NO_ROOM: number = -1;
  static ZERO_FILL: number = -2;
  static NUM_SIZE: number = 20;
  static NUM_LONG_TYPE: number = -1;
  static EXP_BIAS: number = 64;
  static SIGN_MASK: number = -128;
  private static _randtbl: number[] = [
    41, 179, 9, 40, 93, 224, 24, 94, 39, 110, 70, 85, 196, 129, 80, 11, 127, 42, 87,
    8, 243, 96, 174, 153, 61, 192, 17, 20, 235, 7, 47, 222, 53, 216, 101, 112, 44, 139, 109,
    233, 108, 57, 240, 229, 160, 219, 251, 15, 221, 245, 239, 104, 182, 33, 138, 59, 166, 247, 146,
    190, 31, 125, 188, 114, 97, 86, 157, 106, 3, 142, 66, 69, 152, 177, 116, 50, 149, 242, 144,
    28, 29, 95, 37, 2, 117, 246, 65, 183, 206, 241, 230, 131, 13, 145, 63, 98, 200, 176, 226,
    5, 158, 189, 49, 18, 54, 30, 120, 227, 68, 48, 91, 89, 252, 210, 185, 203, 140, 171, 155,
    56, 162, 249, 201, 134, 244, 67, 197, 148, 248, 82, 100, 34, 90, 236, 51, 167, 178, 207, 193,
    164, 225, 218, 147, 79, 71, 217, 151, 38, 198, 215, 212, 123, 156, 76, 121, 113, 253, 55, 255,
    23, 25, 231, 187, 21, 72, 209, 103, 81, 35, 12, 6, 122, 78, 32, 60, 92, 14, 202, 83,
    128, 195, 135, 223, 211, 181, 84, 0, 119, 173, 165, 234, 45, 208, 107, 136, 199, 126, 141, 163,
    180, 99, 172, 220, 75, 115, 232, 111, 228, 204, 237, 73, 254, 62, 105, 132, 22, 36, 118, 143,
    161, 133, 169, 10, 52, 186, 184, 170, 77, 205, 137, 124, 238, 16, 159, 250, 191, 74, 27, 130,
    4, 194, 1, 46, 58, 102, 64, 168, 150, 88, 214, 175, 213, 154, 26, 43, 19
  ];
  COMMACHAR: string = ',';
  DECIMALCHAR: string = '.';
  private SIGNIFICANT_NUM_SIZE: number = 0;
  private _data: Int8Array = new Int8Array(NUM_TYPE.NUM_SIZE);

  set Data(value: Int8Array) {
    this._data = value;
  }

  get Data(): Int8Array {
    return this._data;
  }

  // --------------------------------------------------------------------------
  // Constructor list
  // --------------------------------------------------------------------------

  constructor();
  constructor(recordHexStr: string);
  constructor(byteVal: Int8Array, offset: number, length: number);
  constructor(byteVal: Int8Array);
  constructor(decStr: string, pic: PIC, compIdx: number);
  constructor(numFrom: NUM_TYPE);
  constructor(recordHexStrOrByteValOrDecStrOrNumFrom?: any, offsetOrPic?: any, lengthOrCompIdx?: number) {
    if (arguments.length === 0) {
      this.constructor_0();
      return;
    }
    if (arguments.length === 1 && (recordHexStrOrByteValOrDecStrOrNumFrom === null || recordHexStrOrByteValOrDecStrOrNumFrom.constructor === String)) {
      this.constructor_1(recordHexStrOrByteValOrDecStrOrNumFrom);
      return;
    }
    if (arguments.length === 3 && (recordHexStrOrByteValOrDecStrOrNumFrom === null || recordHexStrOrByteValOrDecStrOrNumFrom instanceof Int8Array) && (offsetOrPic === null || offsetOrPic.constructor === Number) && (lengthOrCompIdx === null || lengthOrCompIdx.constructor === Number)) {
      this.constructor_2(recordHexStrOrByteValOrDecStrOrNumFrom, offsetOrPic, lengthOrCompIdx);
      return;
    }
    if (arguments.length === 1 && (recordHexStrOrByteValOrDecStrOrNumFrom === null || recordHexStrOrByteValOrDecStrOrNumFrom instanceof Int8Array)) {
      this.constructor_3(recordHexStrOrByteValOrDecStrOrNumFrom);
      return;
    }
    if (arguments.length === 3 && (recordHexStrOrByteValOrDecStrOrNumFrom === null || recordHexStrOrByteValOrDecStrOrNumFrom.constructor === String) && (offsetOrPic === null || offsetOrPic instanceof PIC) && (lengthOrCompIdx === null || lengthOrCompIdx.constructor === Number)) {
      this.constructor_4(recordHexStrOrByteValOrDecStrOrNumFrom, offsetOrPic, lengthOrCompIdx);
      return;
    }
    this.constructor_5(recordHexStrOrByteValOrDecStrOrNumFrom);
  }

  /// <summary>
  ///   Default constructor. Set value to 0
  /// </summary>
  private constructor_0(): void {
    this.initConst();
    this.NUM_ZERO();
  }

  /// <summary>
  ///   Creates a Magic Number from a string got from the XML record value. The
  ///   String is 40 characters long in an hexa representation.
  /// </summary>
  /// <param name = "recordHexStr">  Magic number in hex format, 40 characters long
  /// </param>
  private constructor_1(recordHexStr: string): void {
    let i: number = 0;
    let twoDigits: string;
    this.initConst();

    try {
      for (i = 0; i < this.SIGNIFICANT_NUM_SIZE; i = i + 1) {
        twoDigits = recordHexStr.substr( i * 2, 2);
        this._data[i] = NUM_TYPE.toSByte(NNumber.Parse(twoDigits, NumberStyles.HexNumber));
      }
    }
    catch (ex) {
      if (ex instanceof Exception) {
        Events.WriteWarningToLog(ex);

        this.NUM_ZERO();
      }
      else
        throw ex;
    }
  }

  /// <summary>
  ///   Creates a Magic Number from array of bytes. Used from the expression evaluator
  ///   when a Magic Number value apears within an expression.
  /// </summary>
  /// <param name = "byteVal">  Array of bytes representing a Magic Number</param>
  /// <param name = "offset">   Index of the first byte </param>
  /// <param name = "length">   Number of bytes to use </param>
  private constructor_2(byteVal: Int8Array, offset: number, length: number): void {
    this.constructor_0();
    for (let i: number = 0; i < length; i = i + 1) {
      this._data[i] = byteVal[i + offset];
    }
  }

  /// <summary>
  ///   Creates a Magic Number from array of bytes
  /// </summary>
  private constructor_3(byteVal: Int8Array): void {
    this.constructor_2(byteVal, 0, byteVal.length);
  }

  /// <summary>
  ///   Creates a Magic Number from a decimal for number and its picture
  /// </summary>
  /// <param name = "decStr">  The number in a string decimal format </param>
  /// <param name = "pic">     The picture format to be used </param>
  private constructor_4(decStr: string, pic: PIC, compIdx: number): void {
    this.constructor_0();
    this.from_a(decStr, pic, compIdx);
  }

  /// <summary>
  ///   Creates a Magic Number from a Magic Number
  /// </summary>
  /// <param name = "numFrom">  The source Magic Number </param>
  private constructor_5(numFrom: NUM_TYPE): void {
    this.initConst();
    this._data = new Int8Array(numFrom._data.length);
    for (let _ai: number = 0; _ai < this._data.length; ++_ai)
      this._data[_ai] = numFrom._data[_ai];
  }

  /// <summary>
  ///   Build a decimal string from the number stored in a Magic Number.
  ///   The string is build from the picture provided as a parameter.
  /// </summary>
  /// <param name = "pic">The picture to use for building the display string
  /// </param>
  /// <returns> The decimal form of the Magic Number in the specified format
  /// </returns>
  toDisplayValue(pic: PIC): string {
    return this.to_a(pic);
  }

  /// <summary>
  ///   init constants of the class
  /// </summary>
  private initConst(): void {
    let env: IEnvironment = Manager.Environment;
    this.DECIMALCHAR = env.GetDecimal();
    this.COMMACHAR = env.GetThousands();
    this.SIGNIFICANT_NUM_SIZE = env.GetSignificantNumSize();
  }

  /// <summary>
  ///   Build an hexadecimal string from the Magic Number for the data record in
  ///   the XML tag (to be sent to the Magic Server). The length of this string
  ///   will allways be two times the length of the Magic Numbers (in bytes)
  ///   because every byte in the Magic Number will be translated to two
  ///   character hexadecimal string.
  /// </summary>
  /// <returns> the hexadecimal string
  /// </returns>
  toXMLrecord(): string {
    let hexStr: StringBuilder = new StringBuilder(this.SIGNIFICANT_NUM_SIZE * 2);
    let num: number;

    if (this.NUM_IS_LONG())
      num = 5;
    else
      num = this.SIGNIFICANT_NUM_SIZE;

    for (let i: number = 0; i < this.SIGNIFICANT_NUM_SIZE; i++) {
      if (i < num)
        hexStr.Append(('0' + (this._data[i] & 0xFF).toString(16)).slice(-2));
      else
        hexStr.Append("00");
    }

    return hexStr.ToString().toUpperCase();
  }

  /// <summary>
  ///   Transforming a decimal string number to a Magic Number using the format
  ///   provided.
  /// </summary>
  /// <param name = "Alpha">  The number is decimal string form
  /// </param>
  /// <param name = "pic">    The picture fomat to use for the extracting the number
  /// </param>
  private from_a(Alpha: string, pic: PIC, compIdx: number): void {
    let i: number;
    let idx: number;
    let dec: boolean;
    let decs: number;
    let digit: number;
    let len: number;
    let no_pic: boolean;
    let Pos: number;
    let SType: boolean;
    let SPart: boolean;
    let Signed: number;
    let buf: string;
    let mask: string = "";
    let c: string;
    let NgtvPrmt: boolean;
    let Scan: string = "";
    let Pbuf: string = "";
    let is_negative: boolean;
    let negStr: string;
    let negPref: string;
    let posPref: string;
    let negSuff: string;
    let posSuff: string;

    // Parse the picture format
    no_pic = (pic == null);
    len = 0;
    SType = false;  // PIC_PSTV : true, PIC_NGTV: false
    SPart = false;  // PIC_PREF : true, PIC_SUF : false

    if (!no_pic) {
      mask = pic.getMask();
      if (Alpha.length > pic.getMaskSize())
        Alpha = Alpha.substr(0, pic.getMaskSize());
      NgtvPrmt = pic.isNegative();
      if (NgtvPrmt) {
        negPref = pic.getNegPref_();
        posPref = pic.getPosPref_();
        negSuff = pic.getNegSuff_();
        posSuff = pic.getPosSuff_();

        if (negPref.length === posPref.length) {
          if (negPref.length === 0 || negPref === posPref)
            SPart = false;
          // PIC_SUF
          else SPart = true; // PIC_PREF
        }
        else SPart = true; // PIC_PREF

        if (SPart)
          negStr = negPref;
        else
          negStr = negSuff;

        if (negStr.length === 0)
          SType = true;
        // PIC_POSITIVE
        else
          SType = false; // PIC_NEGATIVE

        if (SType)
          Scan = (SPart ? posPref : posSuff);
        else
          Scan = (SPart ? negPref : negSuff);
        len = Scan.length;
      }
    }
    else {
      pic = new PIC("", StorageAttribute.NUMERIC, compIdx);
      NgtvPrmt = false;
    }

    // Localize variables and flags
    dec = false;
    decs = 0;
    digit = 0;
    Signed = 0;

    // Loop on picture mask and decode the digits and the decimal point
    for (idx = 0; idx < Alpha.length; ) {
      if (no_pic || mask[idx] === String.fromCharCode(PICInterface.PIC_N)) {
        c = Alpha[idx];
        if (UtilStrByteMode.isDigit(c)) {
          digit++;
          Pbuf += c;
          if (dec)
            decs++;
        }
        else if (c === this.DECIMALCHAR) {
          Pbuf += this.DECIMALCHAR;
          dec = true;
        }
        else if (c !== this.COMMACHAR) {
          if (NgtvPrmt && Signed === 0) {
            Signed = 1;
            for (i = idx, Pos = 0; i <= Alpha.length && Pos < len; i++) {
              if (no_pic || mask[i] === String.fromCharCode(PICInterface.PIC_N)) {
                c = Alpha[i];
                if (c !== Scan[Pos]) {
                  if (c === '-' && !SType)
                    break;
                  if (c === '+' && SType)
                    break;
                  Signed = -1;
                  break;
                }
                Pos++;
              }
            }
            if (Pos > 0 && Pos < len)
              Signed = -1;
          }
          else {
            // QCR # 309623 : If prefix/suffix strings contains digits in it, it is considered as part of data.
            // In order to avoid it skip the prefix / suffix strings while extracting the data part to build NUM_TYPE.
            if (idx === 0) {
              if (pic.getNegPref_().length > 0)
                if (Alpha.startsWith(pic.getNegPref_())) {
                  idx += pic.getNegPref_().length;
                  continue;
                }
              if (pic.getPosPref_().length > 0)
                if (Alpha.startsWith(pic.getPosPref_())) {
                  idx += pic.getPosPref_().length;
                  continue;
                }
            }
            else {
              if (pic.getNegSuff_().length > 0)
                if (Alpha.endsWith(pic.getNegSuff_())) {
                  idx += pic.getNegSuff_().length;
                  continue;
                }
              if (pic.getPosSuff_().length > 0)
                if (Alpha.endsWith(pic.getPosSuff_())) {
                  idx += pic.getPosSuff_().length;
                  continue;
                }
            }
          }
        }
      }
      idx++;
    }

    if (Signed === 0 && SType)
      Signed = 1;

    // Return result of decoded digits
    is_negative = (Signed === 1 && !SType) || (Signed !== 1 && SType);
    if (decs > 0 || digit > 9) {
      buf = (is_negative ? '-' : ' ') + Pbuf;
      this.num_4_a_std(buf);
    }
    else
      this.NUM_4_LONG((is_negative ? -1 : 1) * this.a_2_long(Pbuf));
  }

  /// <summary>
  ///   Extracting a non long number from a decimal string number (numbers with
  ///   decimal point, etc...)
  /// </summary>
  /// <param name = "str">  The decimal string number
  /// </param>
  num_4_a_std(str: string): void {
    let digstr: string = "";
    let diglen: number = 0;
    let wholes: number = 0;
    let decs: number = 0;
    let isDec: boolean = false;
    let isminus: boolean = false;
    let pos: number;

    for (pos = 0; pos < str.length; pos++) {
      let c: string = str.charAt(pos);
      if (UtilStrByteMode.isDigit(c)) {
        if (diglen > 0 || c !== '0') {
          diglen++;
          digstr = digstr + c;
          if (!isDec)
            wholes++;
        }
        else if (isDec)
          decs = decs + 1;
      }
      else if (c === this.DECIMALCHAR)
        isDec = true;
      else if (c === '-')
        isminus = true;
    }

    this.NUM_ZERO();
    if (diglen === 0)
      return;

    if (((wholes + decs) & 1) > 0) {
      this._data[1] = NUM_TYPE.toSByte(digstr.charCodeAt(0) - '0'.charCodeAt(0));
      pos = 1;
    }
    else
      pos = 0;

    let numptr: number = 1 + pos;
    diglen = Math.min(diglen, (this.SIGNIFICANT_NUM_SIZE - 1) * 2 - pos);
    while (pos < diglen) {
      let digit1: number = NUM_TYPE.toSByte((digstr.charCodeAt(pos++) - '0'.charCodeAt(0)));
      let digit2: number = NUM_TYPE.toSByte(((pos < diglen)
        ? (digstr.charCodeAt(pos++) - '0'.charCodeAt(0))
        : '\0'.charCodeAt(0)));
      this._data[numptr++] = NUM_TYPE.toSByte(NUM_TYPE.toUByte(digit1) * 10 + NUM_TYPE.toUByte(digit2));
    }

    if (wholes > 0)
      this._data[0] = NUM_TYPE.toSByte(<number>NUM_TYPE.EXP_BIAS + ((wholes + 1) >> 1));
    else
      this._data[0] = NUM_TYPE.toSByte(<number>NUM_TYPE.EXP_BIAS - (decs >> 1));

    if (isminus)
      this._data[0] |= NUM_TYPE.SIGN_MASK;
  }

  /// <summary>
  ///   Translating a long value into an internal Magic Number form
  /// </summary>
  /// <param name = "longVal">  The number to be kept
  /// </param>
  NUM_4_LONG(longVal: number): void {
    let hexStr: string;
    this.NUM_ZERO();

    if (longVal !== 0) {
      if (longVal < 0)
        longVal = longVal + 0xFFFFFFFF;

      hexStr = longVal.toString(16);
      if (longVal > 0)
        hexStr = NUM_TYPE.INT_ZERO_HEX.substr(hexStr.length) + hexStr;

      this._data[1] = NUM_TYPE.toSByte(parseInt(hexStr.substr(6, (8) - (6)), 16));
      this._data[2] = NUM_TYPE.toSByte(parseInt(hexStr.substr(4, (6) - (4)), 16));
      this._data[3] = NUM_TYPE.toSByte(parseInt(hexStr.substr(2, (4) - (2)), 16));
      this._data[4] = NUM_TYPE.toSByte(parseInt(hexStr.substr(0, (2) - (0)), 16));
    }
  }

  /// <summary>
  ///   Getting a long value from a decimal string representing a long value
  /// </summary>
  /// <param name = "str">  the string representing a long value
  /// </param>
  /// <returns> the long number
  /// </returns>
  a_2_long(str: string): number {
    let n: number = 0;
    for (let pos: number = 0; pos < str.length; pos++) {
      if (UtilStrByteMode.isDigit(str.charAt(pos))) {
        n = n * 10;
        n = n + str.charCodeAt(pos) - '0'.charCodeAt(0);
      }
    }
    return n;
  }

  /// <summary>
  ///   Activating the process of building a decimal string by the format indicated
  /// </summary>
  /// <param name = "pic">a numeric picture to use for building the display string
  /// </param>
  to_a(pic: PIC): string {
    return this.to_a_pic(pic);
  }

  /// <summary>
  ///   Performs the process of building a decimal string by the picture provided
  /// </summary>
  /// <param name = "pic">  the picture class holding the information about the picture
  /// </param>
  /// <returns> the string form of the Magic Number
  /// </returns>
  protected to_a_pic(pic: PIC): string {
    let buf: string[] = new Array<string>(128);
    let remains: number;
    let sign_n: boolean;
    let pref_len: number;
    let suff_len: number;
    let pref_str: String;
    let suff_str: String;
    let str_pos: number;
    let str_len: number;
    let out_pos: number;
    let out_buf: string[];
    let tmp_out_buf: string[];
    let pad: string;
    let left: boolean;
    let pfill: boolean;
    let mask_chars: number;
    let len: number;
    let res: string[];
    let i: number;
    let isOut: boolean;
    let outVal: string[];

    len = pic.getMaskSize();

    // Set signs of number
    sign_n = (pic.isNegative() && this.num_is_neg() ? false : true);

    pref_len = (sign_n ? pic.getPosPref_().length : pic.getNegPref_().length); // pic_sign[PIC_PREF].len;
    suff_len = (sign_n ? pic.getPosSuff_().length : pic.getNegSuff_().length); // pic_sign[PIC_SUFF].len;

    left = pic.isLeft();
    pfill = pic.padFill();
    mask_chars = pic.getMaskChars();
    outVal = NString.ToCharArray(pic.getMask().substr(0, len));
    out_buf = ((left || (mask_chars > 0)) ? buf : outVal);
    isOut = ((left || (mask_chars > 0)) ? false : true);

    // Convert to string
    str_pos = pref_len;
    str_len = len - pref_len - suff_len;
    tmp_out_buf = out_buf.slice(str_pos, out_buf.length);
    if (this.NUM_IS_LONG())
      remains = this.num_l_2_str(this.NUM_LONG(), tmp_out_buf, str_len, pic);
    else
        remains = this.to_str(tmp_out_buf, str_len, pic);

    for (i = str_pos; i < out_buf.length; i++)
        out_buf[i] = tmp_out_buf[i - str_pos];
    tmp_out_buf = null;

    if (remains < mask_chars) {
        res = new Array(len);
      for (i = 0; i < len; i++)
        res[i] = (remains === NUM_TYPE.ZERO_FILL ? pic.getZeroPad() : '*');
      return NString.FromChars(res);
    }

    if (mask_chars > 0) {
      remains -= mask_chars;
      str_pos += mask_chars;
      str_len -= mask_chars;
    }

    // take care of pad after and before number
    if (pfill) {
      pad = pic.getPad();
      if (left) {
        for (i = 0; i < remains; i++)
          out_buf [str_pos + str_len + i] = pad;
        str_pos += remains;
      }
      else {
        for (i = 0; i < remains; i++)
          out_buf[str_pos + i] = pad;
      }
    }
    else {
      pad = ' ';
      str_pos += remains;
      str_len -= remains;
    }

    // take care of suffix and prefix
    if (suff_len > 0) {
      suff_str = sign_n ? pic.getPosSuff_() : pic.getNegSuff_();
      if (suff_len === 1)
        out_buf[str_pos + str_len] = suff_str[0];
      else {
        for (i = 0; i < suff_len; i++)
          out_buf[str_pos + str_len + i] = suff_str[i];
      }
      str_len += suff_len;
    }
    if (pref_len > 0) {
      str_pos -= pref_len;
      str_len += pref_len;
      pref_str = sign_n ? pic.getPosPref_() : pic.getNegPref_();
      if (pref_len === 1)
          out_buf[str_pos] = pref_str[0];
      else
        for (i = 0; i < pref_len; i++)
          out_buf[str_pos + i] = pref_str[i];
    }

    // str_pos now points to beginning of result str
    // take care of final pad after and before number
    if (!pfill) {
      let outBufLen: number = out_buf.length;

      if (left) {
        for (i = 0; i < remains && (str_pos + str_len + i < outBufLen); i++)
          out_buf[str_pos + str_len + i] = pad;
      }
      else {
        str_pos -= remains;

        for (i = 0; i < remains && (str_pos + i < outBufLen); i++)
          out_buf[str_pos + i] = pad;
      }
    }

    // result built, finish
    if (isOut)
      return NString.FromChars(out_buf);

    // Copy result to output buffer
    if (mask_chars === 0) {
      if (str_pos + len > out_buf.length)
        len = out_buf.length - str_pos;
      return NString.FromChars(out_buf, str_pos,  out_buf.length - str_pos);
    }

    for (out_pos = 0; out_pos < len && str_pos < out_buf.length; out_pos++)
      if (outVal[out_pos] === String.fromCharCode(PICInterface.PIC_N))
        outVal[out_pos] = out_buf[str_pos++];

    return NString.FromChars(outVal);
  }

  /// <summary>
  ///   Bulding the basic decimal string number from a long value (without
  ///   the special picture features).
  /// </summary>
  /// <param name = "num">  The number to be translated
  /// </param>
  /// <param name = "str">  The mask to use for building the string number
  /// </param>
  /// <len>    len   the len to use in the str char array </len>
  /// <param name = "pic">  The picture class holding the information about the picture
  /// </param>
  /// <returns> the length of the result string
  /// </returns>
  protected num_l_2_str(num: number, str: string[], len: number, pic: PIC): number {
    let commas: boolean;
    let digits: number;
    let i: number;
    let decs: number;
    let j: number;

    if (num < 0)
      num = -num;
    commas = pic.withComa();
    decs = Math.min(pic.getDec(), len - 1);
    if (decs > 0)
      len -= (decs + 1);
    i = len;

    // 26/11/97 Shay Z. Bug #770526 - If The decimal point is the first
    // in the picture's format - assume that the input value is legal !!
    if (num === 0 && !pic.decInFirstPos()) {
      if (pic.zeroFill())
        return (NUM_TYPE.ZERO_FILL);
      if (len === 0)
        return (NUM_TYPE.NO_ROOM);

      if (i > str.length)
        i = str.length;

      str[--i] = '0';
    }

    if (decs > 0) {
        str[len] = this.DECIMALCHAR;
      for (j = 0; j < decs; j++)
        str[len + 1 + j] = '0';
    }

    digits = 0;
    for (; num > 0; num = Math.floor(num / 10)) {
      i--;
      if (commas) {
        if (digits === 3) {
          if (i < 0)
            return (NUM_TYPE.NO_ROOM);
          digits = 0;
          str[i--] = this.COMMACHAR;
        }
        digits++;
      }
      if (i < 0)
        return (NUM_TYPE.NO_ROOM);
      str[i] = ((num % 10).toString());
    }

    return i;
  }

  /// <summary>
  ///   Bulding the basic decimal string number from a non long value (without
  ///   the special picture features).
  /// </summary>
  /// <param name = "str">  The mask to use for building the string number
  /// </param>
  /// <len>    len   the len to use in the str char array </len>
  /// <param name = "pic">  The picture class holding the information about the picture
  /// </param>
  /// <returns> the length of the result string
  /// </returns>
  protected to_str(str: string[], len: number, pic: PIC): number {
    let tmp: NUM_TYPE;
    let commas: boolean;
    let digits: number;
    let decpos: number;
    let last: number;
    let first: number;
    let j: number;
    let i: number;
    let decs: number;
    let num_char: number;

    commas = pic.withComa();
    decs = pic.getDec();
    if (decs >= len)
      decs = len - 1;

    tmp = new NUM_TYPE(this);
    tmp.round(decs);
    if (tmp.NUM_IS_LONG())
      return tmp.num_l_2_str(tmp.NUM_LONG(), str, len, pic);

    if (pic.zeroFill() && tmp._data[0] === 0)
      return (NUM_TYPE.ZERO_FILL);

    i = len - 1;
    digits = 0;
    decpos = ((tmp._data[0] & ~NUM_TYPE.SIGN_MASK) - NUM_TYPE.EXP_BIAS + 1) * 2;
    last = decpos - 1 + decs;
    first = decpos - 1;
    if (first > 2)
      first = (tmp._data[1] < 10) ? 3 : 2;

    for (j = last; j >= first; j--) {
      if (i < 0)
        return (NUM_TYPE.NO_ROOM);

      if (commas && (j < decpos)) {
        if (digits === 3) {
          digits = 0;
          str[i--] = this.COMMACHAR;
        }
        digits++;
      }

      // JPN:15/08/1996 Yama (JpnID:ZA0815001)
      // When Format="N12C" and num is bigger than 12 digits.
      // MAGIC crushes. Because the var i becomes negative.
      if (i < 0)
        return (NUM_TYPE.NO_ROOM);

      if ((j < 2) || (j >= this.SIGNIFICANT_NUM_SIZE * 2))
        str[i--] = '0';
      else {
        if (i < 0)
          return (NUM_TYPE.NO_ROOM);
        num_char = tmp._data[j >> 1];
        str[i--] = (((j & 1) !== 0) ? (num_char % 10) : (Math.floor(num_char / 10))).toString();
      }

      if (j === decpos) {
        if (i < 0)
          return (NUM_TYPE.NO_ROOM);
        str[i--] = this.DECIMALCHAR;

        // 26/11/97 Shay Z. Bug #770526 - If The decimal point is the first
        // in the picture's format - assume that the input value is legal !
        if (i < 0 && pic.decInFirstPos())
          return (0);
      }
    }

    return (i + 1);
  }

  /// <summary>
  ///   Performing an Add operation on two magic numbers
  /// </summary>
  /// <param name = "num1">  the first number
  /// </param>
  /// <param name = "num2">  the first number
  /// </param>
  /// <returns> the result
  /// </returns>
  static add(num1: NUM_TYPE, num2: NUM_TYPE): NUM_TYPE {
    let sign1: number;
    let sign2: number;
    let l: number;
    let l1: number;
    let l2: number;
    let SIGNIFICANT_NUM_SIZE: number;
    // null values
    if (num1 === null || num2 === null)
      return null;

    SIGNIFICANT_NUM_SIZE = Manager.Environment.GetSignificantNumSize();
    let tmpres: NUM_TYPE = new NUM_TYPE();
    let res: NUM_TYPE = new NUM_TYPE();
    let operData: OperData = new OperData();
    if (num1.NUM_IS_LONG()) {
      if (num2.NUM_IS_LONG()) {

        l = l1 = num1.NUM_LONG();
        if (l < 0)
          l = -l;

        if (l < 0x40000000) {
          l = l2 = num2.NUM_LONG();
          if (l < 0)
            l = -l;
          if (l < 0x40000000) {
            l1 += l2;
            res.NUM_4_LONG(l1);
            return res;
          }
        }
        num2.num_4_std_long();
      }
      num1.num_4_std_long();
    }
    else if (num2.NUM_IS_LONG())
      num2.num_4_std_long();

    sign1 = NUM_TYPE.toSByte(num1._data[0] & NUM_TYPE.SIGN_MASK);
    operData.NUM_Exp1_ = NUM_TYPE.toSByte(num1._data[0] & ~NUM_TYPE.SIGN_MASK);
    sign2 = NUM_TYPE.toSByte(num2._data[0] & NUM_TYPE.SIGN_MASK);
    operData.NUM_Exp2_ = NUM_TYPE.toSByte(num2._data[0] & ~NUM_TYPE.SIGN_MASK);
    operData.NUM_Diff_ = <number>(operData.NUM_Exp1_ - operData.NUM_Exp2_);

    let cmpval: number = operData.NUM_Diff_;
    if (cmpval === 0) {
      cmpval = NUM_TYPE.toUByte(num1._data[1]) - NUM_TYPE.toUByte(num2._data[1]);
      if (cmpval === 0)
        cmpval = NUM_TYPE.memcmp(num1, 2, num2, 2, SIGNIFICANT_NUM_SIZE - 2);
    }

    if (cmpval >= 0) {
      if (sign1 === sign2)
        tmpres = NUM_TYPE.add_pos(num1, num2, operData);
      else
        tmpres = NUM_TYPE.sub_pos(num1, num2, operData);

      if (tmpres._data[0] !== 0)
        tmpres._data[0] = NUM_TYPE.toSByte(tmpres._data[0] | sign1);
    }
    else {
      let exp: number = operData.NUM_Exp1_;
      operData.NUM_Exp1_ = operData.NUM_Exp2_;
      operData.NUM_Exp2_ = exp;
      operData.NUM_Diff_ = -operData.NUM_Diff_;

      if (sign1 === sign2)
        tmpres = NUM_TYPE.add_pos(num2, num1, operData);
      else
        tmpres = NUM_TYPE.sub_pos(num2, num1, operData);

      if (tmpres._data[0] !== 0)
        tmpres._data[0] |= sign2;
    }

    return tmpres;
  }

  /// <summary>
  ///   Performing a Subtract operation on two magic numbers
  /// </summary>
  /// <param name = "num1">  the first number
  /// </param>
  /// <param name = "num2">  the first number
  /// </param>
  /// <returns> the result
  /// </returns>
  static sub(num1: NUM_TYPE, num2: NUM_TYPE): NUM_TYPE {
    // null values
    if (num1 === null || num2 === null)
      return null;

    let tmpres: NUM_TYPE = new NUM_TYPE();
    let res: NUM_TYPE = new NUM_TYPE();
    let operData: OperData = new OperData();

    if (num1.NUM_IS_LONG()) {
      if (num2.NUM_IS_LONG()) {
        let l: number;
        let l1: number = l = num1.NUM_LONG();
        if (l < 0)
          l = -l;
        if (l < 0x40000000) {
          let l2: number = l = num2.NUM_LONG();
          if (l < 0)
            l = -l;
          if (l < 0x40000000) {
            l1 -= l2;
            res.NUM_4_LONG(l1);
            return res;
          }
        }
        num2.num_4_std_long();
      }
      num1.num_4_std_long();
    }
    else if (num2.NUM_IS_LONG())
      num2.num_4_std_long();

    let sign1: number = NUM_TYPE.toSByte(num1._data[0] & NUM_TYPE.SIGN_MASK);
    operData.NUM_Exp1_ = NUM_TYPE.toSByte(num1._data[0] & ~NUM_TYPE.SIGN_MASK);
    let sign2: number = NUM_TYPE.toSByte(num2._data[0] & NUM_TYPE.SIGN_MASK);
    operData.NUM_Exp2_ = NUM_TYPE.toSByte(num2._data[0] & ~NUM_TYPE.SIGN_MASK);
    operData.NUM_Diff_ = <number>(operData.NUM_Exp1_ - operData.NUM_Exp2_);

    let cmpval: number = operData.NUM_Diff_;
    if (cmpval === 0) {
      cmpval = NUM_TYPE.toUByte(num1._data[1]) - NUM_TYPE.toUByte(num2._data[1]);
      if (cmpval === 0)
        cmpval = NUM_TYPE.memcmp(num1, 2, num2, 2, Manager.Environment.GetSignificantNumSize() - 2);
    }

    if (cmpval >= 0) {
      if (sign1 === sign2)
        tmpres = NUM_TYPE.sub_pos(num1, num2, operData);
      else
        tmpres = NUM_TYPE.add_pos(num1, num2, operData);

    }
    else {
      let exp: number = operData.NUM_Exp1_;
      operData.NUM_Exp1_ = operData.NUM_Exp2_;
      operData.NUM_Exp2_ = exp;
      operData.NUM_Diff_ = -operData.NUM_Diff_;
      if (sign1 === sign2) {
        tmpres = NUM_TYPE.sub_pos(num2, num1, operData);
        sign1 ^= (NUM_TYPE.SIGN_MASK);
      }
      else
        tmpres = NUM_TYPE.add_pos(num2, num1, operData);
    }

    if (tmpres._data[0] !== 0)
      tmpres._data[0] |= sign1;

    return tmpres;
  }

  /// <summary>
  ///   Performing a Multiply operation on two magic numbers
  /// </summary>
  /// <param name = "num1">  the first number
  /// </param>
  /// <param name = "num2">  the first number
  /// </param>
  /// <returns> the result
  /// </returns>
  static mul(num1: NUM_TYPE, num2: NUM_TYPE): NUM_TYPE {

    let fullres: Int8Array = new Int8Array(38);
    let pwr: number;
    let len1: number;
    let len2: number;
    let pos1: number;
    let pos2: number;
    let pos: number;
    let digit1: number;
    let prod: number;
    let carry: number;
    let l: number;
    let l1: number;
    let l2: number;
    let SIGNIFICANT_NUM_SIZE: number;

    // null values
    if (num1 === null || num2 === null)
      return null;

    SIGNIFICANT_NUM_SIZE = Manager.Environment.GetSignificantNumSize();

    let res: NUM_TYPE = new NUM_TYPE();
    let operData: OperData = new OperData();
    let i: number;
    let tmpByte: number;

    if (num1.NUM_IS_LONG()) {
      if (num2.NUM_IS_LONG()) {
        l = l1 = num1.NUM_LONG();
        if (l < 0)
          l = -l;
        if (l < 0xB000) {
          l = l2 = num2.NUM_LONG();
          if (l < 0)
            l = -l;
          if (l < 0xB000) {
            l1 = l1 * l2;
            res.NUM_4_LONG(l1);
            return res;
          }
        }
        num2.num_4_std_long();
      }
      num1.num_4_std_long();
    }
    else if (num2.NUM_IS_LONG())
        num2.num_4_std_long();

    operData.NUM_Exp1_ = NUM_TYPE.toSByte(num1._data[0] & ~NUM_TYPE.SIGN_MASK);
    operData.NUM_Exp2_ = NUM_TYPE.toSByte(num2._data[0] & ~NUM_TYPE.SIGN_MASK);
    if (operData.NUM_Exp1_ === 0 || operData.NUM_Exp2_ === 0) {
      res.NUM_ZERO();
      return res;
    }

    for (len1 = SIGNIFICANT_NUM_SIZE - 1;
         num1._data[len1] === 0;
         len1--) {
    }
    for (len2 = SIGNIFICANT_NUM_SIZE - 1;
         num2._data[len2] === 0;
         len2--) {
    }

    for (i = 0; i < (NUM_TYPE.NUM_SIZE - 1) * 2; i++)
      fullres[i] = 0;

    pos = 0;
    for (pos1 = len1; pos1 > 0; pos1--) {
      pos = pos1 + len2 - 1;
      digit1 = num1._data[pos1];
      carry = 0;

      for (pos2 = len2; pos2 > 0; pos2--) {
        prod = NUM_TYPE.toUByte(digit1) * NUM_TYPE.toUByte(num2._data[pos2]) + carry;
        carry = Math.floor(prod / 100);
        fullres[pos] = NUM_TYPE.toSByte(NUM_TYPE.toUByte(fullres[pos]) + prod % 100);
        tmpByte = fullres[pos];
        pos--;
        if (NUM_TYPE.toUByte(tmpByte) >= 100) {
          fullres[pos + 1] = NUM_TYPE.toSByte(NUM_TYPE.toUByte(fullres[pos + 1]) - 100);
          carry++;
        }
      }
      fullres[pos] = NUM_TYPE.toSByte(carry);
    }

    pwr = NUM_TYPE.toUByte(operData.NUM_Exp1_) - NUM_TYPE.EXP_BIAS + (NUM_TYPE.toUByte(operData.NUM_Exp2_) - NUM_TYPE.EXP_BIAS);
    if (fullres[0] === 0) {
      pos++;
      pwr--;
    }

    if ((num1._data[0] & NUM_TYPE.SIGN_MASK) === (num2._data[0] & NUM_TYPE.SIGN_MASK))
      res._data[0] = 0;
    else
      res._data[0] = NUM_TYPE.SIGN_MASK;

    res._data[0] |= NUM_TYPE.toSByte(pwr + NUM_TYPE.EXP_BIAS);
    for (i = 0; i < SIGNIFICANT_NUM_SIZE - 1; i++)
      res._data[1 + i] = fullres[pos + i];

    return res;
  }

  /// <summary>
  ///   Performing a Mod operation on two magic numbers
  /// </summary>
  /// <param name = "num1">  the first number
  /// </param>
  /// <param name = "num2">  the first number
  /// </param>
  /// <returns> the result
  /// </returns>
  static mod(num1: NUM_TYPE, num2: NUM_TYPE): NUM_TYPE {
    // null values
    if (num1 === null || num2 === null)
      return null;

    let res: NUM_TYPE = new NUM_TYPE();
    if (num2.num_is_zero()) {
      res.NUM_ZERO();
      return res;
    }

    if (num1.NUM_IS_LONG())
      num1.num_4_std_long();

    if (num2.NUM_IS_LONG())
      num2.num_4_std_long();

    res = NUM_TYPE.div(num1, num2);
    res.num_trunc(0);
    res = NUM_TYPE.mul(res, num2);
    res = NUM_TYPE.sub(num1, res);

    return res;
  }

  /// <summary>
  ///   Performing a Divide operation on two magic numbers
  /// </summary>
  /// <param name = "num1">  the first number
  /// </param>
  /// <param name = "num2">  the first number
  /// </param>
  /// <returns> the result
  /// </returns>
  static div(num1: NUM_TYPE, num2: NUM_TYPE): NUM_TYPE {
    let dividend: Int8Array = new Int8Array((NUM_TYPE.NUM_SIZE - 1) * 2);
    let divisor: Int8Array = new Int8Array(NUM_TYPE.NUM_SIZE);
    let pwr: number;
    let len1: number;
    let len2: number;
    let pos1: number;
    let pos2: number;
    let pos: number;
    let quot: number;
    let prod: number;
    let carry: number;
    let SIGNIFICANT_NUM_SIZE: number;

    // null values
    if (num1 === null || num2 === null)
      return null;

    SIGNIFICANT_NUM_SIZE = Manager.Environment.GetSignificantNumSize();

    let res: NUM_TYPE = new NUM_TYPE();
    let operData: OperData = new OperData();
    let i: number;
    let tmpByte: number;

    if (num1.NUM_IS_LONG())
      num1.num_4_std_long();
    if (num2.NUM_IS_LONG())
      num2.num_4_std_long();

    operData.NUM_Exp1_ = NUM_TYPE.toSByte(num1._data[0] & ~NUM_TYPE.SIGN_MASK);
    operData.NUM_Exp2_ = NUM_TYPE.toSByte(num2._data[0] & ~NUM_TYPE.SIGN_MASK);
    if (operData.NUM_Exp1_ === 0 || operData.NUM_Exp2_ === 0) {
      res.NUM_ZERO();
      return res;
    }

    for (len1 = SIGNIFICANT_NUM_SIZE - 1;
         num1._data[len1] === 0;
         len1--) {
    }
    for (len2 = SIGNIFICANT_NUM_SIZE - 1;
         num2._data[len2] === 0;
         len2--) {
    }

    pos = (NUM_TYPE.memcmp(num1, 1, num2, 1, len2) < 0) ? 0 : 1;
    for (i = 0; i < (NUM_TYPE.NUM_SIZE - 1) * 2; i++)
      dividend[i] = 0;

    for (i = 0; i < len1; i++)
      dividend[pos + i] = num1._data[1 + i];

    for (i = 0; i < len2; i++)
      divisor[1 + i] = num2._data[1 + i];

    res.NUM_SET_ZERO();
    pwr = NUM_TYPE.toUByte(operData.NUM_Exp1_) - NUM_TYPE.toUByte(operData.NUM_Exp2_) + pos;
    res._data[0] = NUM_TYPE.toSByte(pwr + NUM_TYPE.EXP_BIAS);
    if ((num1._data[0] & NUM_TYPE.SIGN_MASK) !== (num2._data[0] & NUM_TYPE.SIGN_MASK))
      res._data[0] |= NUM_TYPE.SIGN_MASK;

    // normalize dividend & divisor
    quot = Math.floor(100 / (NUM_TYPE.toUByte(divisor[1]) + 1));
    if (quot > 1) {
      carry = 0;
      for (pos2 = len2; pos2 > 0; pos2--) {
        prod = quot * NUM_TYPE.toUByte(divisor[pos2]) + carry;
        carry = Math.floor(prod / 100);
        divisor[pos2] = NUM_TYPE.toSByte(prod % 100);
      }

      carry = 0;
      for (pos1 = len1 + pos - 1; pos1 >= 0; pos1--) {
        prod = quot * NUM_TYPE.toUByte(dividend[pos1]) + carry;
        carry = Math.floor(prod / 100);
        dividend[pos1] = NUM_TYPE.toSByte(prod % 100);
      }
    }

    // divide dividend by divisor
    for (pos1 = 1; pos1 < SIGNIFICANT_NUM_SIZE; pos1++) {
      quot = NUM_TYPE.toUByte(dividend[pos1 - 1]) * 100 + Math.floor(NUM_TYPE.toUByte(dividend[pos1]) / NUM_TYPE.toUByte(divisor[1]));
      if (quot >= 100)
        quot = 99;

      if (quot !== 0) {
        // multiply divisor by quotient, and subtract from dividend
        pos = pos1 + len2 - 1;
        carry = 0;
        for (pos2 = len2; pos2 > 0; pos2--) {
          prod = quot * NUM_TYPE.toUByte(divisor[pos2]) + carry;
          carry = Math.floor(prod / 100);
          dividend[pos] = NUM_TYPE.toSByte(NUM_TYPE.toUByte(dividend[pos]) - prod % 100);
          tmpByte = dividend[pos];
          pos--;
          if (tmpByte < 0) {
            dividend[pos + 1] = NUM_TYPE.toSByte(NUM_TYPE.toUByte(dividend[pos + 1]) + 100);
            carry++;
          }
        }
        dividend[pos] = NUM_TYPE.toSByte(NUM_TYPE.toUByte(dividend[pos]) - carry);

        // decrement quotient, and add back divisor to dividend
        while (dividend[pos] < 0) {
          quot--;
          pos = pos1 + len2 - 1;
          for (pos2 = len2; pos2 > 0; pos2--) {
            dividend[pos] = NUM_TYPE.toSByte(NUM_TYPE.toUByte(dividend[pos]) + NUM_TYPE.toUByte(divisor[pos2]));
            tmpByte = dividend[pos];
            pos--;
            if (NUM_TYPE.toUByte(tmpByte) >= 100) {
              dividend[pos + 1] = NUM_TYPE.toSByte(NUM_TYPE.toUByte(dividend[pos + 1]) - 100);
              dividend[pos] = NUM_TYPE.toSByte(NUM_TYPE.toUByte(dividend[pos]) + 1);
            }
          }
        }
      }
      res._data[pos1] = NUM_TYPE.toSByte(quot);
    }

    return res;
  }

  /// <summary>
  ///   Compare two magic numbers
  /// </summary>
  /// <param name = "num1">  The first number
  /// </param>
  /// <param name = "num2">  The second number
  /// </param>
  /// <returns> 0 if num1=num2, 1 if num1>num2 or -1 if num1<num2
  /// </returns>
  static num_cmp(num1: NUM_TYPE, num2: NUM_TYPE): number {
    let sign1: number;
    let sign2: number;
    let cmpval: number;
    let l1: number;
    let l2: number;
    let tmp: number;
    let SIGNIFICANT_NUM_SIZE: number;

    if (num1 == null || num2 == null)
      return Int32.MinValue;

    SIGNIFICANT_NUM_SIZE = Manager.Environment.GetSignificantNumSize();

    if (num1.NUM_IS_LONG()) {
      if (num2.NUM_IS_LONG()) {
        l1 = num1.NUM_LONG();
        l2 = num2.NUM_LONG();
        if (l1 >= 0 && l2 >= 0) {
          tmp = l1 - l2;
          if (tmp === 0)
            return (0);
          if (tmp > 0)
            return (1);
          return (-1);
    }
            num2.num_4_std_long();
          }
        num1.num_4_std_long();
      }
    else if (num2.NUM_IS_LONG())
          num2.num_4_std_long();

    sign1 = NUM_TYPE.toSByte(num1._data[0] & NUM_TYPE.SIGN_MASK);
    sign2 = NUM_TYPE.toSByte(num2._data[0] & NUM_TYPE.SIGN_MASK);
    cmpval = (sign1 === sign2)
      ? NUM_TYPE.memcmp(num1, 0, num2, 0, SIGNIFICANT_NUM_SIZE)
      : 1;
    if (sign1 !== 0)
      cmpval = -cmpval;
    return (cmpval);
        }

  /// <summary>
  ///   Check if the given hex string represents a long number.
  /// </summary>
  /// <param name = "numHexStr">  The hex string to check.
  /// </param>
  /// <returns> true, if the string represents a 'long' number in NUM_TYPE.
  /// </returns>
  static numHexStrIsLong(numHexStr: string): boolean {
    return numHexStr.substr(0, 2) === "FF";
  }

  /// <summary>
  ///   Zeroes the Magic Number as a long zero
  /// </summary>
  NUM_ZERO(): void {
    this.setZero(true);
  }

  /// <summary>
  ///   Zeroes the Magic Number (all bytes will set to 0)
  /// </summary>
  NUM_SET_ZERO(): void {
    this.setZero(false);
  }

  /// <summary>
  ///   Getting indication for the sign of the Magic Number
  /// </summary>
  /// <returns> true in the number is negative, false if positive
  /// </returns>
  num_is_neg(): boolean {
    if (this.NUM_IS_LONG())
      return ((this._data[4] & 0x80) !== 0);
    return ((this._data[0] & NUM_TYPE.SIGN_MASK) !== 0);
    }

  /// <summary>
  ///   Getting indication if the Magic Number is ZERO (all bytes equals to 0)
  /// </summary>
  /// <returns> true in the number is ZERO, false if positive
  /// </returns>
  num_is_zero(): boolean {
    if (this.NUM_IS_LONG())
      return (this.NUM_LONG() === 0);
    return (this._data[0] === 0);
    }

  /// <summary>
  ///   Changing sign of Magic Number
  /// </summary>
  num_neg(): void {
    let l: number;

    if (this.NUM_IS_LONG()) {
      l = -this.NUM_LONG();
      this.NUM_4_LONG(l);
      return;
    }
    if (this._data[0] !== 0)
      this._data[0] ^= NUM_TYPE.SIGN_MASK;
      }

  /// <summary>
  ///   Is the number kept in in the NUM_TYPE is a long number?
  /// </summary>
  /// <returns> true in the number is long, false if not
  /// </returns>
  NUM_IS_LONG(): boolean {
    return this._data[0] === NUM_TYPE.NUM_LONG_TYPE;
  }

  /// <summary>
  ///   Get the long value from the NUM_TYPE.
  ///   THIS FUNCTION MUST BE WRITTEN DIFERENTLY!
  /// </summary>
  /// <returns> the long number
  /// </returns>
  NUM_LONG(): number {
    let i: number;

    if (this._data[1] === 0 && this._data[2] === 0 && this._data[3] === 0 && this._data[4] === -128)
      return Int32.MinValue;

    let dataview = new DataView(this._data.buffer);
    return dataview.getInt32(1, true);
  }

  /// <summary>
  ///   Rounds the NUM_TYPE number
  /// </summary>
  /// <param name = "decs">  number of digits after to decimal point to round to
  /// </param>
  round(decs: number): void {

    let addval: NUM_TYPE;

    if (this.NUM_IS_LONG())
      return;

    addval = new NUM_TYPE();
    addval._data[0] = NUM_TYPE.toSByte((this._data[0] & NUM_TYPE.SIGN_MASK) | (NUM_TYPE.EXP_BIAS - (decs >> 1)));
    addval._data[1] = NUM_TYPE.toSByte((decs & 1) !== 0 ? 5 : 50);

    let temp: NUM_TYPE = NUM_TYPE.add(this, addval);
    this._data = new Int8Array(temp._data.length);

    this._data = temp._data;
      this.num_trunc(decs);
    }

  /// <summary>
  ///   Returns a numeric expression, rounded to the specified number of decimal places
  /// </summary>
  /// <param name = "whole">the number of decimal places to which the numeric expression is rounded
  /// </param>
  dbRound(whole: number): void {
    let addval: NUM_TYPE;
    let pwr: number;
    let num_diff: number;
    let i: number;

    if (this.NUM_IS_LONG())
      return;

    // Add 5 (in the corresponding to whole position)
    addval = new NUM_TYPE();
    addval._data[0] = NUM_TYPE.toSByte((this._data[0] & NUM_TYPE.SIGN_MASK) | (NUM_TYPE.EXP_BIAS + ((whole + 1) >> 1)));
    addval._data[1] = NUM_TYPE.toSByte(((whole & 1) !== 0) ? 5 : 50);

    let temp: NUM_TYPE = NUM_TYPE.add(this, addval);
    this._data = new Int8Array(temp._data.length);

      for (let _ai: number = 0; _ai < this._data.length; ++_ai)
      this._data[_ai] = temp._data[_ai];

    // Put 0 in the end of the number
    pwr = (this._data[0] & ~NUM_TYPE.SIGN_MASK) - NUM_TYPE.EXP_BIAS;

    if ((num_diff = pwr - ((whole + 1) >> 1)) >= 0) {
      if ((whole & 1) !== 0) {
        this._data[1 + num_diff] = NUM_TYPE.toSByte(this._data[1 + num_diff] - this._data[1 + num_diff] % 10);
        num_diff++;
        }
      for (i = 0;
           i < this.SIGNIFICANT_NUM_SIZE - (1 + num_diff);
           i++)
        this._data[1 + num_diff + i] = 0;
        }
    else
        this.NUM_SET_ZERO();
      }

  /// <summary>
  ///   Truncates the NUM_TYPE number
  /// </summary>
  /// <param name = "decs">  number of digits after to decimal point to have
  /// </param>
  num_trunc(decs: number): void {
    let pwr: number;
    let num_diff: number;
    let i: number;

    if (this.NUM_IS_LONG())
      return;

    pwr = (this._data[0] & ~NUM_TYPE.SIGN_MASK) - NUM_TYPE.EXP_BIAS;
    if ((num_diff = this.SIGNIFICANT_NUM_SIZE - 1 - pwr - ((decs + 1) >> 1)) < 0)
      return;
    if ((num_diff < this.SIGNIFICANT_NUM_SIZE - 1) && ((decs & 1) !== 0)) {
      this._data[this.SIGNIFICANT_NUM_SIZE - 1 - num_diff] =
        NUM_TYPE.toSByte(this._data[this.SIGNIFICANT_NUM_SIZE - 1 - num_diff] - this._data[this.SIGNIFICANT_NUM_SIZE - 1 - num_diff] % 10);
      if (this._data[this.SIGNIFICANT_NUM_SIZE - 1 - num_diff] === 0)
        num_diff++;
          }
    if (num_diff >= this.SIGNIFICANT_NUM_SIZE - 1) {
          this.NUM_ZERO();
      return;
        }
    for (i = 0;
         i < num_diff;
         i++)
      this._data[this.SIGNIFICANT_NUM_SIZE - num_diff + i] = 0;
          }

  /// <summary>
  ///   Converts a Magic number from std long
  /// </summary>
  /// <param name = "num">  The number to be translated
  /// </param>
  num_4_std_long(): void {
    let slong: number;

    slong = this.NUM_LONG();
    if (slong >= 0)
      this.num_4_ulong(slong);
    else {
      this.num_4_ulong(-slong);
      this._data[0] |= NUM_TYPE.SIGN_MASK;
    }
  }

  /// <summary>
  ///   Converts a Magic number from ulong
  /// </summary>
  /// <param name = "num">  The number to be translated
  /// </param>
  num_4_ulong(data: number): void {
    let pwr: number;
    let pos: number;
    let i: number;

    this.NUM_SET_ZERO();
    pos = pwr = 5;
    while (data > 0) {
      this._data[pos--] = NUM_TYPE.toSByte(data % 100);
      data = Math.floor(data / 100);
    }
    if (pos < pwr) {
      if (pos > 0) {
        for (i = 0; i < pwr - pos; i++)
          this._data[1 + i] = this._data[1 + pos + i];
        for (i = 0; i < pos; i++)
          this._data[pwr - pos + 1 + i] = 0;
        }
      this._data[0] = NUM_TYPE.toSByte(pwr - pos + NUM_TYPE.EXP_BIAS);
        }
      }

  /// <summary>
  ///   Get the long value from a Magic Number
  /// </summary>
  /// <returns> the long value of the number
  /// </returns>
  NUM_2_LONG(): number {
    if (this.NUM_IS_LONG())
      return this.NUM_LONG();
    else
      return this.num_2_long();
    }

  /// <summary>
  ///   Get the Ulong value from a Magic Number
  /// </summary>
  /// <returns> the long value of the number
  /// </returns>
  NUM_2_ULONG(): number {
    if (this.NUM_IS_LONG())
      return this.NUM_LONG();
    else
      return this.num_2_ulong();
    }

  /// <summary>
  ///   Get the long value from a non long Magic Number
  /// </summary>
  /// <returns> the long value of the number
  /// </returns>
  num_2_long(): number {
    let slong: number;
    let sign: number;

    sign = this._data[0] & NUM_TYPE.SIGN_MASK;
    this._data[0] &= NUM_TYPE.toSByte(~NUM_TYPE.SIGN_MASK);
    if (sign !== 0) {
      if (NUM_TYPE.memcmp(this, 0, NUM_TYPE.MinLONG(), 0, this.SIGNIFICANT_NUM_SIZE) > 0)
        return 0;
      }
    else {
      if (NUM_TYPE.memcmp(this, 0, NUM_TYPE.MaxLONG(), 0, this.SIGNIFICANT_NUM_SIZE) > 0)
        return 0;
      }
    slong = this.num_2_ulong();
    if (sign !== 0) {
      slong = -slong;
      this._data[0] |= NUM_TYPE.toSByte(sign);
    }
    return (slong);
    }

  /// <summary>
  ///   Get the ulong value from a non long Magic Number
  /// </summary>
  /// <returns> the ulong value of the number
  /// </returns>
  num_2_ulong(): number {
    let val: number;
    let pwr: number;
    let pos: number;
    let last: boolean;

    pwr = this._data[0] - NUM_TYPE.EXP_BIAS;
    if (pwr > 5)
      return (0);
    last = (pwr === 5);
    if (last)
      pwr = 4;

    val = 0;
    for (pos = 1; pos <= pwr; pos++)
      val = val * 100 + NUM_TYPE.toUByte(this._data[pos]);

    if (last)
      if (val <= Math.floor((0xFFFFFFFF - NUM_TYPE.toUByte(this._data[5])) / 100))
        val = val * 100 + NUM_TYPE.toUByte(this._data[5]);
      else
        val = 0;
    return (val);
    }

  /// <summary>
  ///   Perform the actuall add operation
  /// </summary>
  /// <param name = "num1">      The first number
  /// </param>
  /// <param name = "num2">      The second number
  /// </param>
  /// <param name = "operData">  Information for performing the operation
  /// </param>
  /// <returns> The two numbers added
  /// </returns>
  static add_pos(num1: NUM_TYPE, num2: NUM_TYPE, operData: OperData): NUM_TYPE {
    let len1: number;
    let len2: number;
    let len: number;
    let pos: number;
    let num1ptr: number;
    let resptr: number;
    let i: number;
    let SIGNIFICANT_NUM_SIZE: number;

    // null values
    if (num1 == null || num2 == null)
      return null;
    SIGNIFICANT_NUM_SIZE = Manager.Environment.GetSignificantNumSize();

    let res: NUM_TYPE = new NUM_TYPE();

    if (operData.NUM_Exp2_ === 0 || (operData.NUM_Diff_ >= SIGNIFICANT_NUM_SIZE - 1)) {
      res = new NUM_TYPE(num1);
      res._data[0] = operData.NUM_Exp1_;
      return res;
    }

    len1 = 1;
    for (i = SIGNIFICANT_NUM_SIZE - 2; i > 0; i -= 2) {
      if (num1.SHRT_IS_ZERO(i))
        continue;
    else {
        len1 = i + 1;
            break;
          }
        }

    if (num1._data[len1] === 0)
      len1--;

    len2 = 1;
    for (i = SIGNIFICANT_NUM_SIZE - 2; i > 0; i -= 2) {
      if (num2.SHRT_IS_ZERO(i))
        continue;
      else {
        len2 = i + 1;
            break;
          }
        }

    if (num2._data[len2] === 0)
      len2--;

    if ((len = Math.max(len1, len2 + operData.NUM_Diff_)) > SIGNIFICANT_NUM_SIZE - 1)
      len = SIGNIFICANT_NUM_SIZE - 1;

    res.NUM_SET_ZERO();
    num1ptr = operData.NUM_Diff_;
    resptr = operData.NUM_Diff_;
    for (pos = len - operData.NUM_Diff_; pos > 0; pos--) {
      res._data[resptr + pos] =
        NUM_TYPE.toSByte(NUM_TYPE.toUByte(res._data[resptr + pos]) + NUM_TYPE.toUByte(num1._data[num1ptr + pos]) + NUM_TYPE.toUByte(num2._data[pos]));
      if (NUM_TYPE.toUByte(res._data[resptr + pos]) >= 100) {
        res._data[resptr + pos] = NUM_TYPE.toSByte(NUM_TYPE.toUByte(res._data[resptr + pos]) - 100);
        res._data[resptr + pos - 1] = 1;
        }
        }
    for (pos = operData.NUM_Diff_; pos > 0; pos--) {
      res._data[pos] = NUM_TYPE.toSByte(NUM_TYPE.toUByte(res._data[pos]) + NUM_TYPE.toUByte(num1._data[pos]));
      if (NUM_TYPE.toUByte(res._data[pos]) >= 100) {
        res._data[pos] = NUM_TYPE.toSByte(NUM_TYPE.toUByte(res._data[pos]) - 100);
        res._data[pos - 1] = 1;
          }
        }
    if (res._data[0] !== 0) {
      for (pos = Math.min(len, SIGNIFICANT_NUM_SIZE - 2); pos >= 0; pos--)
        res._data[pos + 1] = res._data[pos];
      operData.NUM_Exp1_++;
          }
    res._data[0] = operData.NUM_Exp1_;

    return res;
        }

  /// <summary>
  ///   Perform the actuall sub operation
  /// </summary>
  /// <param name = "num1">      The first number
  /// </param>
  /// <param name = "num2">      The second number
  /// </param>
  /// <param name = "operData">  Information for performing the operation
  /// </param>
  /// <returns> The result of the subtraction operation
  /// </returns>
  static sub_pos(num1: NUM_TYPE, num2: NUM_TYPE, operData: OperData): NUM_TYPE {
    let len1: number;
    let len2: number;
    let len: number;
    let pos: number;
    let num1ptr: number;
    let resptr: number;
    let i: number;
    let SIGNIFICANT_NUM_SIZE: number;

    // null values
    if (num1 == null || num2 == null)
      return null;

    SIGNIFICANT_NUM_SIZE = Manager.Environment.GetSignificantNumSize();

    let res: NUM_TYPE = new NUM_TYPE();
    let j: number;

    if (operData.NUM_Exp2_ === 0 || (operData.NUM_Diff_ >= SIGNIFICANT_NUM_SIZE - 1)) {
      res = new NUM_TYPE(num1);
      res._data[0] = operData.NUM_Exp1_;
      return res;
    }

    len1 = 1;
    for (i = SIGNIFICANT_NUM_SIZE - 2; i > 0; i -= 2) {
      if (num1.SHRT_IS_ZERO(i))
        continue;
    else {
        len1 = i + 1;
            break;
          }
        }

    if (num1._data[len1] === 0)
      len1--;

    len2 = 1;
    for (i = SIGNIFICANT_NUM_SIZE - 2; i > 0; i -= 2) {
      if (num2.SHRT_IS_ZERO(i))
        continue;
      else {
        len2 = i + 1;
            break;
          }
        }

    if (num2._data[len2] === 0)
      len2--;

    if ((len = Math.max(len1, len2 + operData.NUM_Diff_)) > SIGNIFICANT_NUM_SIZE - 1)
      len = SIGNIFICANT_NUM_SIZE - 1;

    res.NUM_SET_ZERO();
    num1ptr = operData.NUM_Diff_;
    resptr = operData.NUM_Diff_;
    for (pos = len - operData.NUM_Diff_; pos > 0; pos--) {

      res._data[resptr + pos] = NUM_TYPE.toSByte(NUM_TYPE.toUByte(res._data[resptr + pos]) + NUM_TYPE.toUByte(num1._data[num1ptr + pos]) - NUM_TYPE.toUByte(num2._data[pos]));
      if (res._data[resptr + pos] < 0) {
        res._data[resptr + pos] = NUM_TYPE.toSByte(NUM_TYPE.toUByte(res._data[resptr + pos]) + 100);
        res._data[resptr + pos - 1] = NUM_TYPE.toSByte(0xFF); // 255
        }
            }
    for (pos = operData.NUM_Diff_; pos > 0; pos--) {
      res._data[pos] = NUM_TYPE.toSByte(NUM_TYPE.toUByte(res._data[pos]) + NUM_TYPE.toUByte(num1._data[pos]));
      if (res._data[pos] < 0) {
        res._data[pos] = NUM_TYPE.toSByte(NUM_TYPE.toUByte(res._data[pos]) + 100);
        res._data[pos - 1] = NUM_TYPE.toSByte(0xFF); // 255
            }
          }
    while ((++pos <= len) && res._data[pos] === 0) {
        }
    if (pos <= len) {
      operData.NUM_Diff_ = pos - 1;
      if (operData.NUM_Diff_ > 0) {
        for (j = 0; j < len - operData.NUM_Diff_; j++)
          res._data[1 + j] = res._data[pos + j];
        for (j = 0; j < operData.NUM_Diff_; j++)
          res._data[len - operData.NUM_Diff_ + 1 + j] = 0;
      }
      res._data[0] = NUM_TYPE.toSByte(NUM_TYPE.toUByte(operData.NUM_Exp1_) - operData.NUM_Diff_);
    }

    return res;
  }

  /// <summary>
  ///   Perform the actual  FIX operation with whole part of the number
  /// </summary>
  /// <param name = "wholes">number of needed whole digits
  /// </param>
  num_fix(wholes: number): void {
    let pwr: number;
    let num_diff: number;

    if (this.NUM_IS_LONG())
      this.num_4_std_long();
    pwr = (this._data[0] & ~NUM_TYPE.SIGN_MASK) - NUM_TYPE.EXP_BIAS;

    if ((num_diff = pwr - ((wholes + 1) >> 1)) < 0)
      return;
    if (num_diff < this.SIGNIFICANT_NUM_SIZE - 1) {
      if ((wholes & 1) === 1)
        this._data[1 + num_diff] = NUM_TYPE.toSByte(this._data[1 + num_diff] % 10);
      while ((num_diff < this.SIGNIFICANT_NUM_SIZE - 1) && this._data[1 + num_diff] === 0)
        num_diff++;
      }
    if (num_diff >= this.SIGNIFICANT_NUM_SIZE - 1) {
        this.NUM_ZERO();
      return;
      }
    if (num_diff > 0) {
      let i: number;
      for (i = 0; i < this.SIGNIFICANT_NUM_SIZE - 1 - num_diff; i++)
        this._data[1 + i] = this._data[1 + num_diff + i];

      for (i = 0; i < num_diff; i++)
        this._data[this.SIGNIFICANT_NUM_SIZE - num_diff + i] = 0;
      this._data[0] = NUM_TYPE.toSByte(this._data[0] - NUM_TYPE.toSByte(num_diff));
    }
  }

  /// <summary>
  ///   check if byte on specific position is zero or 0xFF
  /// </summary>
  /// <param name = "position">in NUM to be checked
  /// </param>
  /// <returns> is the byte zero
  /// </returns>
  SHRT_IS_ZERO(pos: number): boolean {
    return this._data[pos] === 0 && this._data[pos + 1] === 0;
  }

  /// <summary>
  ///   Zero a Magic Number. If the number should contain a long zero, the first
  ///   byte is set to NUM_LONG_TYPE.
  /// </summary>
  /// <param name = "asLong">  set the Magic Number to contain a long zero value
  /// </param>
  private setZero(asLong: boolean): void {
    let i: number;

    for (i = 0; i < NUM_TYPE.NUM_SIZE; i++)
      this._data[i] = 0;

    if (asLong)
      this._data[0] = NUM_TYPE.NUM_LONG_TYPE;
    }

  /// <summary>
  ///   Compare two Magic Numbers
  /// </summary>
  /// <param name = "num1">  The first number
  /// </param>
  /// <param name = "pos1">  The position of num1 to compare from
  /// </param>
  /// <param name = "num2">  The second number
  /// </param>
  /// <param name = "pos3">  The position of num2 to compare from
  /// </param>
  /// <returns> 0 if identical, 1 if num1>num2, -1 if num1<num2
  /// </returns>
  private static memcmp(num1: NUM_TYPE, pos1: number, num2: NUM_TYPE, pos2: number, len: number): number {
    let i: number = 0;

    while (i < len && num1._data[pos1] === num2._data[pos2] && pos1 < NUM_TYPE.NUM_SIZE && pos2 < NUM_TYPE.NUM_SIZE) {
      i++;
      pos1++;
      pos2++;
    }

    if (i === len)
      return 0;
    else if (this.toUByte(num1._data[pos1]) < this.toUByte(num2._data[pos2]))
      return -1;
    else
      return 1;
  }

  /// <summary>
  ///   Get a unsigned value from a byte
  /// </summary>
  /// <param name = "byteVal">  A signed byte value
  /// </param>
  /// <returns> the unsigned value of the byte
  /// </returns>
  static toUByte(byteVal: number): number {
    let val: number = byteVal;

    if (byteVal < 0)
      val = 256 + byteVal;

    return val;
  }

  /// <summary>
  ///   Get a signed byte value from a unsigned val
  /// </summary>
  /// <param name = "signedVal">  An unsigned byte value (as an integer)
  /// </param>
  /// <returns> the signed value as a byte
  /// </returns>
  static toSByte(unsignedVal: number): number {
    let val: number = 0;

    if (unsignedVal > Constants.SByteMaxValue)
      val = (unsignedVal - 256);
    else
      val = unsignedVal;

    return val;
  }

  /// <summary>
  ///   Get the maximum long number in NUM_TYPE std format
  /// </summary>
  static MaxLONG(): NUM_TYPE {
    let nUM_TYPE: NUM_TYPE = new NUM_TYPE();
    nUM_TYPE._data[0] = NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 5);
    nUM_TYPE._data[1] = 21;
    nUM_TYPE._data[2] = 47;
    nUM_TYPE._data[3] = 48;
    nUM_TYPE._data[4] = 36;
    nUM_TYPE._data[5] = 47;
    return nUM_TYPE;
  }

  /// <summary>
  ///   Get the minimum long number in NUM_TYPE std format
  /// </summary>
  static MinLONG(): NUM_TYPE {
    let num: NUM_TYPE = new NUM_TYPE();
    num._data[0] = NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 5);
    num._data[1] = 21;
    num._data[2] = 47;
    num._data[3] = 48;
    num._data[4] = 36;
    num._data[5] = 48;
    return num;
  }

  /// <summary>
  ///   Get double number from Magic NUM_TYPE
  /// </summary>
  to_double(): number {
    return this.storage_mg_2_float(8); // Length of double is 8 byte
  }

  /// <summary>
  ///   Get double number from Magic NUM_TYPE
  /// </summary>
  /// <param name = "len">of byte of needed number - USE 8
  /// </param>
  private storage_mg_2_float(len: number): number {
    let sign_pos: number;
    let sign: number;
    let compnum: NUM_TYPE = new NUM_TYPE();
    let tmpnum: NUM_TYPE = new NUM_TYPE();
    let divnum: NUM_TYPE = new NUM_TYPE();
    let pwr: number;
    let bits: number;
    let exp: number;
    let long1: number = 0;
    let long2: number = 0;
    let fltOut: number = 0;
    let cout: Int8Array = new Int8Array([0, 0, 0, 0, 0, 0, 0, 0]);
    let Num2Pwr23_: Int8Array = new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 4), 8, 38, 86, 8]);
    let Num2Pwr52_: Int8Array = new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 8), 45, 3, 59, 96, 27, 37, 4, 96]);
    let base_Num16Pwrs: Int8Array[] = [
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 1), 1]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 1), 16]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 2), 2, 56]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 2), 40, 96]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 3), 6, 55, 36]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 4), 1, 4, 85, 76]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 4), 16, 77, 72, 16]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 5), 2, 68, 43, 54, 56]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 5), 42, 94, 96, 72, 96]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 6), 6, 87, 19, 47, 67, 36]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 7), 1, 9, 95, 11, 62, 77, 76]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 7), 17, 59, 21, 86, 4, 44, 16]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 8), 2, 81, 47, 49, 76, 71, 6, 56]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 8), 45, 3, 59, 96, 27, 37, 4, 96]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 9), 7, 20, 57, 59, 40, 37, 92, 79, 36])
    ];

    let base_Num2Pwrs: Int8Array[] = [
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 1), 1]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 1), 2]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 1), 4]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 1), 8])
      ];

    if (this.NUM_IS_LONG())
      this.num_4_std_long();
    if (this._data[0] === 0)
      return 0;
    sign = NUM_TYPE.toSByte(this._data[0] & NUM_TYPE.SIGN_MASK);
    this._data[0] = NUM_TYPE.toSByte(this._data[0] & <number>(~NUM_TYPE.SIGN_MASK));
    if (len === 4) {
      bits = 24;
      compnum = new NUM_TYPE(Num2Pwr23_);
    }
    else {
      bits = 53;
      compnum = new NUM_TYPE(Num2Pwr52_);
    }
    pwr = (this._data[0] - NUM_TYPE.EXP_BIAS) << 1;
    if (pwr < 0)
      exp = pwr * 3 + Math.floor((pwr + 1) / 3);
    else exp = pwr * 3 + Math.floor((pwr + 2) / 3);
    pwr = bits - exp;
    if (pwr < 0) {
      pwr = -pwr;
      tmpnum = NUM_TYPE.div(this, new NUM_TYPE(base_Num16Pwrs[pwr >> 2]));
      tmpnum = NUM_TYPE.div(tmpnum, new NUM_TYPE(base_Num2Pwrs[pwr & 3]));
    }
    else {
      tmpnum = this;
      while (pwr >= 60) {
        tmpnum = NUM_TYPE.mul(tmpnum, new NUM_TYPE(base_Num16Pwrs[14]));
        pwr -= 56;
      }
      tmpnum = NUM_TYPE.mul(tmpnum, new NUM_TYPE(base_Num16Pwrs[pwr >> 2]));
      tmpnum = NUM_TYPE.mul(tmpnum, new NUM_TYPE(base_Num2Pwrs[pwr & 3]));
    }
    while (NUM_TYPE.num_cmp(tmpnum, compnum) < 0) {
      exp--;
      tmpnum = NUM_TYPE.add(tmpnum, tmpnum);
    }
    if (len === 4) {
      long1 = tmpnum.num_2_ulong();
    }
    else {
      divnum = NUM_TYPE.div(tmpnum, new NUM_TYPE(base_Num16Pwrs[8]));
      divnum.num_trunc(0);
      long1 = divnum.num_2_ulong();
      divnum = NUM_TYPE.mul(divnum, new NUM_TYPE(base_Num16Pwrs[8]));
      divnum = NUM_TYPE.sub(tmpnum, divnum);
      long2 = divnum.num_2_ulong();
    }
    sign_pos = len - 1;
    if (len === 4) {
      exp += 126;
      cout[3] = NUM_TYPE.toSByte(exp >> 1);
      cout[2] = NUM_TYPE.toSByte((this.LO_CHAR(this.HI_SHRT(long1)) & 0x7F) | ((exp & 0x01) << 7));
      cout[1] = NUM_TYPE.toSByte(this.HI_CHAR(this.LO_SHRT(long1)));
      cout[0] = NUM_TYPE.toSByte(this.LO_CHAR(this.LO_SHRT(long1)));
    }
    else {
      exp += 1022;
      cout[7] = NUM_TYPE.toSByte(exp >> 4);

      cout[6] = NUM_TYPE.toSByte((this.LO_CHAR(this.HI_SHRT(long1)) & 0x0F) | ((exp & 0x0F) << 4));

      cout[5] = NUM_TYPE.toSByte(this.HI_CHAR(this.LO_SHRT(long1)));

      cout[4] = NUM_TYPE.toSByte(this.LO_CHAR(this.LO_SHRT(long1)));
      cout[3] = NUM_TYPE.toSByte(this.HI_CHAR(this.HI_SHRT(long2)));
      cout[2] = NUM_TYPE.toSByte(this.LO_CHAR(this.HI_SHRT(long2)));
      cout[1] = NUM_TYPE.toSByte(this.HI_CHAR(this.LO_SHRT(long2)));
      cout[0] = NUM_TYPE.toSByte(this.LO_CHAR(this.LO_SHRT(long2)));
    }
    if (sign !== 0) {
      cout[sign_pos] |= NUM_TYPE.SIGN_MASK;
      this._data[0] |= NUM_TYPE.SIGN_MASK;
    }
    fltOut = this.sbyteArr_2_Double(cout);
    return fltOut;
  }

  /// <summary>
  ///   Bit_Wise mask : Leave last byte in number
  /// </summary>
  private LO_CHAR(n: number): number {
    return n & 255;
  }

  /// <summary>
  ///   Bit_Wise mask : Leave byte before last
  /// </summary>
  private HI_CHAR(n: number): number {
    return (n & 65280) >> 8;
  }

  /// <summary>
  ///   Bit_Wise mask : Leave 2 last bytes
  /// </summary>
  private LO_SHRT(n: number): number {
    return <number>(n & 65535);
  }

  /// <summary>
  ///   Bit_Wise mask
  /// </summary>
  private HI_SHRT(n: number): number {
    return <number>((n & -65536) >> 16);
  }

  /// <summary>
  ///   Bit_Wise mask
  /// </summary>
  private static MK_SHRT(c1: number, c2: number): number {
    let strInt: string = (c1 << 8 | c2).toString();
    return NNumber.Parse(strInt);
  }

  /// <summary>
  ///   Bit_Wise mask
  /// </summary>
  private static MK_LONG(s1: number, s2: number): number {
    let l1: number = <number>s1;
    let l2: number = <number>s2;
    let strLng: string = (l1 << 16 | l2).toString();
    return NNumber.Parse(strLng);
  }

  /// <summary>
  ///   get the double from array of bytes
  /// </summary>
  /// <param name = "array">of bytes, inner representation of the double
  /// </param>
  /// <returns> double
  /// </returns>
  private sbyteArr_2_Double(array: Int8Array): number {
    let dataview = new DataView(array.buffer);
    return dataview.getFloat64(0, true);
  }

  /// <summary>
  ///   get byte array for double (8 bytes in Java)
  /// </summary>
  /// <param name = "double">to get its byte representation
  /// </param>
  /// <returns> byte array
  /// </returns>
  private static double_2_sbyteArray(d: number): Int8Array {
    let buffer = new ArrayBuffer(8);
    let dataview = new DataView(buffer);
    dataview.setFloat64(0, d, true);
    return (new Int8Array(dataview.buffer));
  }

  /// <summary>
  ///   Performing an Power operation on two magic numbers Val1^Val2
  /// </summary>
  /// <param name = "num1">  the first number - number
  /// </param>
  /// <param name = "num2">  the first number - power
  /// </param>
  /// <returns> the result
  /// </returns>
  static eval_op_pwr(num1: NUM_TYPE, num2: NUM_TYPE): NUM_TYPE {
    let d0: number;
    let d1: number;

    // null values
    if (num1 == null || num2 == null)
      return null;

    // If second operator is an integer (which is so in most of the cases)
    // and it is not -ve, then calculate power using simple multiplication
    // There is a problem in from_double as it doesn't return exact
    // values (for example, passing 1.002441 in num to from_double would
    // return 1.00244099999999). btw, this problem exists even in Visual studio's
    // watch window (try typing 1.002441 in Name column of watch window).
    if (num2.NUM_IS_LONG() && !num2.num_is_neg()) {
      d1 = num2.to_double();
      let result: NUM_TYPE = NUM_TYPE.from_double(1);
      for (let i: number = 0; i < d1; i++)
        result = this.mul(result, num1);
      return result;
        }
        else {
      d0 = num1.to_double();
      d1 = num2.to_double();
      if (d0 < 0.0 && d1 !== <number> d1)
        d0 = 0.0;
      /* pwr (0.0, 0.0) -> error */
      /* ----------------------- */
      else if (d0 !== 0.0)
        d0 = Math.pow(d0, d1);
    }

    return NUM_TYPE.from_double(d0);
  }

  /// <summary>
  ///   translate double to NUM_TYPE
  /// </summary>
  /// <param name = "double">to translate
  /// </param>
  /// <returns> NUM_TYPE of the double
  /// </returns>
  static from_double(d0: number): NUM_TYPE {
    let array: Int8Array = NUM_TYPE.double_2_sbyteArray(d0);
    return NUM_TYPE.storage_mg_4_float(8, array);
  }

  /// <summary>
  ///   translate byte array  to NUM_TYPE
  /// </summary>
  /// <param name = "len">of the needed number(8)
  /// </param>
  /// <param name = "byte">array mask
  /// </param>
  /// <returns> NUM_TYPE for the needed attributes
  /// </returns>
  private static storage_mg_4_float(len: number, inp: Int8Array): NUM_TYPE {
    let cinp: number[];
    let sign: number;
    let tmp1: number;
    let exp: number;
    let bias: number;
    let long1: number;
    let long2: number;

    cinp = new Array<number>(inp.length);
    for (tmp1 = 0;
         tmp1 < inp.length;
         tmp1++)
      cinp[tmp1] = NUM_TYPE.toUByte(inp[tmp1]);

    sign = cinp[len - 1];
    if (len === 4) {
      exp = <number>((cinp[2] >> 7) | ((cinp[3] & 0x7F) << 1));
      bias = 150; // 126 + (1 + 23);
      long1 = 0;
      long2 = NUM_TYPE.MK_LONG(NUM_TYPE.MK_SHRT(0, cinp[2] | 0x80), NUM_TYPE.MK_SHRT(cinp[1], cinp[0]));
    }
    else {
      exp = <number>(((cinp[7] & 0x7F) << 4) | (cinp[6] >> 4));
      bias = 1075; // 1022 + (1 + 20 + 32);
      long1 = NUM_TYPE.MK_LONG(NUM_TYPE.MK_SHRT(0, (cinp[6] & 0x0F) | 0x10), NUM_TYPE.MK_SHRT(cinp[5], cinp[4]));
      long2 = NUM_TYPE.MK_LONG(NUM_TYPE.MK_SHRT(cinp[3], cinp[2]), NUM_TYPE.MK_SHRT(cinp[1], cinp[0]));
    }
    return NUM_TYPE.storage_num_4_fld_flt(long1, long2, 18, sign, bias, exp);
  }

  /// <summary>
  ///   translate byte array  to NUM_TYPE (like in Magic Souce code).
  /// </summary>
  private static storage_num_4_fld_flt(long1: number, long2: number, dec: number, sign: number, bias: number, expr: number): NUM_TYPE {
    let base_Num16Pwrs: Int8Array[] = [
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 1), 1]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 1), 16]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 2), 2, 56]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 2), 40, 96]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 3), 6, 55, 36]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 4), 1, 4, 85, 76]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 4), 16, 77, 72, 16]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 5), 2, 68, 43, 54, 56]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 5), 42, 94, 96, 72, 96]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 6), 6, 87, 19, 47, 67, 36]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 7), 1, 9, 95, 11, 62, 77, 76]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 7), 17, 59, 21, 86, 4, 44, 16]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 8), 2, 81, 47, 49, 76, 71, 6, 56]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 8), 45, 3, 59, 96, 27, 37, 4, 96]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 9), 7, 20, 57, 59, 40, 37, 92, 79, 36])
    ];

    let base_Num2Pwrs: Int8Array[] = [
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 1), 1]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 1), 2]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 1), 4]),
      new Int8Array([NUM_TYPE.toSByte(NUM_TYPE.EXP_BIAS + 1), 8])
    ];
    let tmpnum: NUM_TYPE = new NUM_TYPE();
    let outVal: NUM_TYPE = new NUM_TYPE();
    let exp: number = <number>expr;
    if (exp === 0) {
      outVal.NUM_ZERO();
      return outVal;
    }
    outVal.num_4_ulong(long2);
    if (long1 !== 0) {
      tmpnum.num_4_ulong(long1);
      tmpnum = NUM_TYPE.mul(tmpnum, new NUM_TYPE(base_Num16Pwrs[8]));
      outVal = NUM_TYPE.add(tmpnum, outVal);
    }
    exp = <number>(exp - bias);
    if (exp < 0) {
      exp = -exp;
      while (exp >= 60) {
        outVal = NUM_TYPE.div(outVal, new NUM_TYPE(base_Num16Pwrs[14]));
        exp -= 56;
      }
      tmpnum = NUM_TYPE.mul(new NUM_TYPE(base_Num16Pwrs[exp >> 2]),
        new NUM_TYPE(base_Num2Pwrs[exp & 3]));
      outVal = NUM_TYPE.div(outVal, tmpnum);
    }
    else {
      if (exp >= 60) {
        outVal.NUM_ZERO();
        return outVal;
      }
      tmpnum = NUM_TYPE.mul(new NUM_TYPE(base_Num16Pwrs[exp >> 2]),
        new NUM_TYPE(base_Num2Pwrs[exp & 3]));
      outVal = NUM_TYPE.mul(outVal, tmpnum);
    }
    if ((sign & 0x80) !== 0)
      outVal._data[0] = outVal._data[0] | NUM_TYPE.SIGN_MASK;
    outVal.round(dec);
    return outVal;
  }

  /// <summary>
  ///   Mathematical functions implementation
  /// </summary>
  static eval_op_log(val1: NUM_TYPE): NUM_TYPE {
    if (val1 == null)
      return null;
    let resVal: NUM_TYPE = new NUM_TYPE();
    let d: number = val1.to_double();

    if (d > 0.0)
      resVal = NUM_TYPE.from_double(Math.log(d));
    else
      resVal.NUM_ZERO();
    return resVal;
  }

  static eval_op_exp(val1: NUM_TYPE): NUM_TYPE {
    let resVal: NUM_TYPE;

    if (val1 === null)
      return null;
      let d: number = val1.to_double();
    resVal = NUM_TYPE.from_double(Math.exp(d));
    return resVal;
  }

  static eval_op_abs(val1: NUM_TYPE): NUM_TYPE {
    if (val1 === null)
      return null;
    let resVal: NUM_TYPE = new NUM_TYPE(val1);
    resVal.num_abs();
    return resVal;
  }

  static eval_op_sin(val1: NUM_TYPE): NUM_TYPE {
    if (val1 === null)
      return null;
    let resVal: NUM_TYPE = new NUM_TYPE();
    let d: number = val1.to_double();
    resVal = NUM_TYPE.from_double(Math.sin(d));
    return resVal;
  }

  static eval_op_cos(val1: NUM_TYPE): NUM_TYPE {
    if (val1 === null)
      return null;
    let resVal: NUM_TYPE = new NUM_TYPE();
      let d: number = val1.to_double();
    resVal = NUM_TYPE.from_double(Math.cos(d));
    return resVal;
  }

  static eval_op_tan(val1: NUM_TYPE): NUM_TYPE {
    if (val1 == null)
      return null;
    let resVal: NUM_TYPE = new NUM_TYPE();
    let d: number = val1.to_double();
    resVal = NUM_TYPE.from_double(Math.tan(d));
    return resVal;
  }

  static eval_op_asin(val1: NUM_TYPE): NUM_TYPE {
    if (val1 === null)
      return null;
    let resVal: NUM_TYPE = new NUM_TYPE();
    let d: number = val1.to_double();
    if (d <= 1.0 && d >= -1.0)
      resVal = NUM_TYPE.from_double(Math.asin(d));
    else
      resVal = NUM_TYPE.from_double(0.0);
    return resVal;
  }

  static eval_op_acos(val1: NUM_TYPE): NUM_TYPE {
    if (val1 === null)
      return null;
    let resVal: NUM_TYPE = new NUM_TYPE();
    let d: number = val1.to_double();

    if (d <= 1.0 && d >= -1.0)
      resVal = NUM_TYPE.from_double(Math.acos(d));
    else
      resVal = NUM_TYPE.from_double(0.0);
    return resVal;
  }

  static eval_op_atan(val1: NUM_TYPE): NUM_TYPE {
    if (val1 === null)
      return null;
    let resVal: NUM_TYPE = new NUM_TYPE();
      let d: number = val1.to_double();
    resVal = NUM_TYPE.from_double(Math.atan(d));
    return resVal;
  }

  num_abs(): void {
    let l: number;
    if (this.NUM_IS_LONG()) {
      l = this.NUM_LONG();
      if (l < 0)
        l = -l;
      this.NUM_4_LONG(l);
      return;
    }
    this._data[0] &= NUM_TYPE.toSByte(~NUM_TYPE.SIGN_MASK);
  }

  /// <summary>
  ///   Randomal Math function
  /// </summary>
  static eval_op_rand(val1: NUM_TYPE): NUM_TYPE {
    if (val1 === null)
      return null;

    let rand_initialized: boolean = Randomizer.get_initialized();
    let rand_mod: NUM_TYPE;
    let rand_mul: NUM_TYPE;
    let rand_seed: NUM_TYPE;

    let tmp_num: NUM_TYPE = new NUM_TYPE();

    if (!rand_initialized) {
      Randomizer.set_initialized(); // set to true
      rand_mod = new NUM_TYPE();
      rand_mul = new NUM_TYPE();
      rand_seed = new NUM_TYPE();
      rand_mod.num_4_a_std("100000007");
      rand_mul.num_4_a_std("75000007");
      rand_seed.num_4_a_std("12345678");

      Randomizer.set_mod(rand_mod.to_double());
      Randomizer.set_mul(rand_mul.to_double());
      Randomizer.set_seed(rand_seed.to_double());
        }
        else {
      rand_mod = NUM_TYPE.from_double(Randomizer.get_mod());
      rand_mul = NUM_TYPE.from_double(Randomizer.get_mul());
      rand_seed = NUM_TYPE.from_double(Randomizer.get_seed());
        }

    if (!val1.num_is_zero()) {
      if (val1.num_is_neg())
        rand_seed.NUM_4_LONG(NUM_TYPE.hash_rand());
      else
        rand_seed = new NUM_TYPE(val1);
      }
      else {
      if (rand_seed.num_is_neg()) {
        tmp_num.NUM_4_LONG(-1);
        rand_seed = NUM_TYPE.mul(rand_seed, tmp_num);
      }
    }

    rand_seed = NUM_TYPE.mul(rand_seed, rand_mul);
    rand_seed = NUM_TYPE.mod(rand_seed, rand_mod);
    tmp_num = NUM_TYPE.div(rand_seed, rand_mod);
    // reset globals variables
    Randomizer.set_mod(rand_mod.to_double());
    Randomizer.set_mul(rand_mul.to_double());
    Randomizer.set_seed(rand_seed.to_double());
    return tmp_num;
  }

  /// <summary>
  ///   get a random value to use as the ctl encription  key
  /// </summary>
  private static hash_rand(): number {
    return ((new Date().getMilliseconds()) ^ Math.random() * 12345678);
    // let array: number[] = new Array<number>(100);
    // for (let _ai: number = 0; _ai < array.length; ++_ai)
    //   array[_ai] = 0;
    // new Random().NextBytes(array);
    // return <number>(Misc.getSystemMilliseconds() ^ NUM_TYPE.hash_str_new(array));
  }
}

export class OperData {
  NUM_Diff_: number = 0;
  NUM_Exp1_: number = 0;
  NUM_Exp2_: number = 0;
}

