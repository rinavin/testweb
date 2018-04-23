import {StorageAttribute, PICInterface, UtilStrByteMode, UtilImeJpn, MsgInterface} from "@magic/utils";
import {IEnvironment} from "../../env/IEnvironment";
import {Manager} from "../../Manager";
import {Events} from "../../Events";
import {ApplicationException, Int32, NString, StringBuilder} from "@magic/mscorelib";

/// <summary>
///   The class handles the process of converting internal data to displayed data
///   by using a specific format.
///   The class implements the PIC structure of Magic, and all its related operations.
/// </summary>
// @dynamic
export class PIC {
  // --------------------------------------------------------------------------
  // Original members of the Magic PIC structure
  // --------------------------------------------------------------------------
  private _mskLen: number = 0; // The mask len
  private _negPref: StringBuilder = new StringBuilder();
  private _negSuff: StringBuilder = new StringBuilder();
  private _picAttr: StorageAttribute = StorageAttribute.NONE;
  private _posPref: StringBuilder = new StringBuilder();
  private _posSuff: StringBuilder = new StringBuilder();
  private _autoSkip_: boolean = false;  // Autoskip ?
  private _padFill: boolean = false; // Pad fill ?
  private _zeroFill: boolean = false;  // Zero fill ?
  private _comma: boolean = false; // Display numbers with commas ?
  private _decimalDigits: number = 0; // Decimal digits
  private _decPointIsFirst: boolean = false;
  private _decimal: boolean = false; // Decimals ?
  private _embeded: boolean = false; // Embeded characters ?
  private _formatIdx: number = 0; // Current char processed in format_;
  private _format: string[] = null; // The format processed
  private hebrew: boolean = false; // Hebrew ?
  private _imeMode: number = -1; // JPN: IME support
  private _left: boolean = false; // Left justified ?
  private _maskLength: number = 0;
  private _maskChars: number = 0; // Mask chars count
  private _maskSize: number = 0; // Size of picture i/o mask
  private _mixed: boolean = false; // Mixed language ?

  private static get _environment(): IEnvironment {
    return Manager.Environment;
  }

  // --------------------------------------------------------------------------
  // Added variables
  // --------------------------------------------------------------------------
  private _msk: string[] = null; // The mask for the specified picture format
  private _needLength: boolean = false; // get length of the picture after parsing
  private _negative: boolean = false; // Negative values allowed ?
  private _pad: string = '\0'; // Pad character
  private _prefLen: number = 0;
  private _size: number = 0; // Size of Alpha data  without mask characters
  private _suffLen: number = 0;
  private _termFlag: boolean = false; // are terminators specified ?
  private _trim: boolean = false; // Trim ?
  private _whole: number = 0; // Whole digits
  private _zero: string = '\0'; // Zero character


  /// <summary>
  ///   Builds a PIC class from picture format and attribute
  /// </summary>
  /// <param name = "picStr">The picture format string</param>
  /// <param name = "attr">The data attribute (N/A/D/T/...)</param>
  constructor(picStr: string, attr: StorageAttribute, compIdx: number) {
    this._picAttr = attr;

    if (this._picAttr === StorageAttribute.BLOB ||
      this._picAttr === StorageAttribute.BLOB_VECTOR) {
      if (picStr.trim().length > 0) {
        Events.WriteDevToLog("PIC.PIC the picture of BLOB must be empty string");
      }
      return;
    }

    this._format = NString.ToCharArray(picStr);
    this._formatIdx = 0;

    this._mskLen = this.getMaskLen(compIdx);
    this.prs_all(compIdx);

  }

  /// <summary>
  /// Get information methods
  /// </summary>
  /// <returns></returns>
  isHebrew(): boolean {
    return this.hebrew;
  }

  isMixed(): boolean {
    return this._mixed;
  }

  embededChars(): boolean {
    return this._embeded;
  }

  isNegative(): boolean {
    return this._negative;
  }

  withComa(): boolean {
    return this._comma;
  }

  isLeft(): boolean {
    return this._left;
  }

  padFill(): boolean {
    return this._padFill;
  }

  getPad(): string {
    return this._pad;
  }

  zeroFill(): boolean {
    return this._zeroFill;
  }

  getZeroPad(): string {
    return this._zero;
  }

  isTrimed(): boolean {
    return this._trim;
  }

  autoSkip(): boolean {
    return this._autoSkip_;
  }

  withDecimal(): boolean {
    return this._decimal;
  }

  withTerm(): boolean {
    return this._termFlag;
  }

  getMaskChars(): number {
    return this._maskChars;
  }

  getWholes(): number {
    return this._whole;
  }

  getDec(): number {
    return this._decimalDigits;
  }

  getSize(): number {
    return this._size;
  }

  getMaskSize(): number {
    return this._maskSize;
  }

  getMaskLength(): number {
    return this._maskLength;
  }

  decInFirstPos(): boolean {
    return this._decPointIsFirst;
  }

  getPosPref_(): string {
    return this._posPref.ToString();
  }

  getPosSuff_(): string {
    return this._posSuff.ToString();
  }

  getNegPref_(): string {
    return this._negPref.ToString();
  }

  getNegSuff_(): string {
    return this._negSuff.ToString();
  }

  getMask(): string {
    return NString.FromChars(this._msk);
  }

  getFormat(): string {
    return NString.FromChars(this._format);
  }

  getAttr(): StorageAttribute {
    return this._picAttr;
  }

  getImeMode(): number {
    return this._imeMode;
  }

  /// <summary>
  ///   Parse the picture format by the attribute
  /// </summary>
  private prs_all(compIdx: number): void {
    if (!this._needLength) {
      this._msk = new Array<string>(this._mskLen);
      for (let _ai: number = 0; _ai < this._msk.length; ++_ai)
        this._msk[_ai] = '\0';
    }
    switch (this._picAttr) {
      case StorageAttribute.ALPHA:
      case StorageAttribute.UNICODE:
        this.alpha_prs();
        break;

      case StorageAttribute.NUMERIC:
        this.num_prs();
        break;

      case StorageAttribute.DATE:
        this.date_prs(compIdx);
        break;

      case StorageAttribute.TIME:
        this.time_prs();
        break;

      case StorageAttribute.BOOLEAN:
        this.bool_prs();
        break;

      case StorageAttribute.BLOB:
      // do nothing
      case StorageAttribute.BLOB_VECTOR:
        break;
    }
  }

  /// <summary>
  ///   Parse an alpha picture format
  /// </summary>
  private alpha_prs(): void {
    let currChr: string;
    let drv: number;
    let count: number;

    while (this._formatIdx < this._format.length) {
      currChr = this._format[this._formatIdx];
      switch (currChr) {
        case 'H':
          this._formatIdx++;
          this.setHebrew();
          break;

        case 'A':
          this._autoSkip_ = true;
          this._formatIdx++;
          break;

        case '#':
        case 'L':
        case 'U':
        case 'X':
          drv = 0;
          switch (currChr) {
            case '#':
              drv = PICInterface.PIC_N;
              break;

            case 'L':
              drv = PICInterface.PIC_L;
              break;

            case 'U':
              drv = PICInterface.PIC_U;
              break;

            case 'X':
              drv = PICInterface.PIC_X;
              break;
          }
          this._formatIdx++;
          count = this.pik_count();
          this.pik_drv_fill(drv, count);
          break;

        default:
          if (UtilStrByteMode.isLocaleDefLangDBCS()) // JPN: DBCS support
          {
            // JPN: IME support
            let useImeJpn: boolean = UtilStrByteMode.isLocaleDefLangJPN();
            if (currChr === 'K' && useImeJpn) {
              if (this.pic_kanji())
                break;
            }

            if (PIC._environment.GetLocalAs400Set()) {
              drv = 0;

              if (currChr === 'J')
                drv = PICInterface.PIC_J;
              else if (currChr === 'T')
                drv = PICInterface.PIC_T;
              else if (currChr === 'G')
                drv = PICInterface.PIC_G;
              else if (currChr === 'S')
                drv = PICInterface.PIC_S;

              if (drv !== 0) {
                // JPN: IME support
                // calculate IME mode from AS/400 pictures if Kanji parameter isn't specified.
                if (this._imeMode === -1 && useImeJpn) {
                  if (drv === PICInterface.PIC_J || drv === PICInterface.PIC_G)
                    this._imeMode = UtilImeJpn.IME_ZEN_HIRAGANA_ROMAN;
                  else if (drv === PICInterface.PIC_S)
                    this._imeMode = UtilImeJpn.IME_FORCE_OFF;
                }
                this._formatIdx++;
                count = this.pik_count();
                this.pik_drv_fill(drv, count);
                break;
              }
            }
          }

          if (UtilStrByteMode.isDigit(currChr)) {
            count = this.pik_count();
            this.pik_drv_fill(PICInterface.PIC_X, count);
          }
          else
            this.pik_mask();
          break;
      }
    }

    // In case that no picture is specified, assume all is Xs
    if (this._maskSize === 0)
      this.pik_drv_fill(PICInterface.PIC_X, this._mskLen);

    // Compute mask size without the mask characters
    this._size = this._maskSize;
    if (!this._embeded)
      this._size -= this._maskChars;
  }

  /// <summary>
  ///   Parse a numeric picture format
  /// </summary>
  private num_prs(): void {
    let i: number;
    let j: number;
    let currChr: string;
    let count: number;
    let tmp: number;
    let tmps: number;
    let tmp_c: number = 0;
    let first: boolean = true;


    this._zero = ' '/*' '*/;
    this._pad = ' '/*' '*/;
    this._negPref.Append('-')/*'-'*/;

    for (i = 0; i < this._format.length; i = i + 1) {
      if (this._format[i] === '+' /*'+'*/ || this._format[i] === '-'/*'-'*/) {
        break;
      }
      if (this._format[i] === '\\' /*'\'*/ || this._format[i] === 'P'/*'P'*/) {
        i = i + 1;
      }
      if (this._format[i] === 'C'/*'C'*/) {
        this._comma = true;
      }
    }

    while (this._formatIdx < this._format.length) {
      currChr = this._format[this._formatIdx];
      switch (currChr) {
        case 'N':
          this._formatIdx++;
          this._negative = true;
          break;

        case 'C':
          this._formatIdx++;
          this._comma = true;
          break;

        case 'L':
          this._formatIdx++;
          this._left = true;
          break;

        case 'P':
          this._formatIdx++;
          this._padFill = true;
          if (this._formatIdx < this._format.length)
            this._pad = this._format[this._formatIdx++];
          break;

        case 'Z':
          this._formatIdx++;
          this._zeroFill = true;
          if (this._formatIdx < this._format.length)
            this._zero = this._format[this._formatIdx++];
          break;

        case 'A':
          this._formatIdx++;
          this._autoSkip_ = true;
          break;

        case '.':
          this._formatIdx++;
          if (this._needLength)
            this._maskLength++;
          this._decimal = true;
          if (this._maskSize < this._mskLen)
            this._msk[this._maskSize] =  String.fromCharCode(PICInterface.PIC_N);
          // --------------------------------------------------------------
          // 26/11/97 Shay Z. Bug #770526 - Mark that
          // Decimal Point is in First Position:
          // --------------------------------------------------------------
          if (this._maskSize === 0)
            this._decPointIsFirst = true;
          this._maskSize++;
          break;

        case '+':
        case '-':
          this.pik_sign();
          break;

        default:
          if (UtilStrByteMode.isDigit(currChr) || currChr === '#') {
            tmp = this._formatIdx;
            if (currChr === '#')
              this._formatIdx++;
            count = this.pik_count();
            this.pik_drv_fill(PICInterface.PIC_N, count);
            if (this._format[tmp] === '#') {
              if (count === 1) {
                tmps = this._formatIdx;
                this._formatIdx = tmp;
                tmp_c = this.pik_dup();
                this._formatIdx = tmps;
              }
              if (first && (tmp_c > 0 || count > 1)) {
                if (count > 1)
                  tmp_c = count;
                // add commas befor places
                if (this._comma && !this._decimal)
                  this.pik_drv_fill(PICInterface.PIC_N, Math.floor((tmp_c - 1) / 3));
                first = false;
              }
            }
            // add commas befor places
            else if (this._comma && !this._decimal)
              this.pik_drv_fill(PICInterface.PIC_N, Math.floor((count - 1) / 3));

            if (this._decimal)
              this._decimalDigits += count;
            else
              this._whole += count;
          }
          else
            this.pik_mask();
          break;
      }
    }

// Store the maximal length of sign prefix and suffix between negative and positive
    this._prefLen = this._posPref.Length;
    this._suffLen = this._posSuff.Length;
    if (this._negative) {
      if (this._negPref.Length > this._prefLen) {
        this._prefLen = this._negPref.Length;
      }
      if (this._negSuff.Length > this._suffLen) {
        this._suffLen = this._negSuff.Length;
      }
    }

    // Check for a format without digits
    if (this._whole === 0 && this._decimalDigits === 0) {
      count = PICInterface.PIC_MAX_MSK_LEN - this._prefLen - this._suffLen;
      if (this._maskSize < count) {
        this._whole = count - this._maskSize;
        if (this._comma)
          this._whole -= Math.floor(this._whole / 4);
        this.pik_drv_fill(PICInterface.PIC_N, this._whole);
      }
    }

    // add extra for pref/suff and commas
    if (this._comma) {
      count = Math.floor((this._whole - 1) / 3);
      this.pik_drv_fill(PICInterface.PIC_N, count);
      // remove commas places
      this._maskSize -= count;
    }

    i = this._prefLen;
    if (i > 0 && this._msk != null) {
      if ((this._maskSize + i) <= this._mskLen) {
        for (j = this._maskSize - 1;
             j >= 0;
             j--)
          this._msk[j + i] = this._msk[j];
        // memset (this->msk, PIC_N, i); // Original Line
        for (j = 0;
             j < i;
             j++)
          if (this._msk != null && j < this._msk.length)
            this._msk[j] = String.fromCharCode(PICInterface.PIC_N);
      }
      this._maskSize += i;
    }
    i = this._suffLen;
    if (i > 0 && this._msk != null) {
      if (this._maskSize + this._suffLen <= this._mskLen)
      // memset (&Msk[this->pic->mask_size], PIC_N, this->pic->suff_len); // Original Line
        for (j = 0;
             j < this._suffLen;
             j++)
          this._msk[this._maskSize + j] = String.fromCharCode(PICInterface.PIC_N);
      this._maskSize += i;
    }
  }

  /// <summary>
  ///   Parse a date picture format
  /// </summary>
  private date_prs(compIdx: number) {
    // -----------------------------------------------------------------------
    // Original vars
    // -----------------------------------------------------------------------
    let i: number;
    let ocr: number;
    let count: number;
    let drv: number = 0;
    let SwitchAndExpandDate: boolean = false;
    let SWExpandDateChecked: boolean = false;

    // -----------------------------------------------------------------------
    // Added vars
    // -----------------------------------------------------------------------
    let currChr: string;
    let isJpnEraYear: boolean = false; // JPN: Japanese date picture support
    this._zero = ' ';
    ocr = 0;

    if (this._format.length === 0 || this._format[0] === '\0')
      this._format = NString.ToCharArray(PIC.getDefaultDateMask(PIC._environment.GetDateMode(compIdx)));

    for (let j = 0; j < this._format.length; j++)
      if (this._format[j] === 'H')
        this.setHebrew();

    while (this._formatIdx < this._format.length) {
      currChr = this._format[this._formatIdx];
      switch (currChr) {
        case 'H':
          this._formatIdx++;
          break;

        case 'Z':
          this._formatIdx++;
          this._zeroFill = true;
          if (this._formatIdx < this._format.length)
            this._zero = this._format[this._formatIdx++];
          break;

        case 'T':
          this._formatIdx++;
          this._trim = true;
          break;

        case 'A':
          this._formatIdx++;
          this._autoSkip_ = true;
          break;

        case 'L':
          if (this.hebrew) {
            this._formatIdx++;
            this.pik_drv_fill(PICInterface.PIC_HL, 1);
          }
          else
            this.pik_mask();
          break;

        case 'Y':
          count = this.pik_dup();
          drv = 0;
          i = count;
          switch (count) {
            case 1:
              break;

            case 2:
              if (!this.hebrew)
                drv = PICInterface.PIC_YY;
              break;

            case 4:
              if (!this.hebrew)
                drv = PICInterface.PIC_YYYY;
              else
                drv = PICInterface.PIC_HYYYYY;
              break;

            case 5:
            case 6:
              if (this.hebrew)
                drv = PICInterface.PIC_HYYYYY;
              break;
          }
          if (drv !== 0) {
            this._formatIdx += count;
            this.pik_drv_fill(drv, i);
          }
          else
            this.pik_mask();
          break;

        case 'M':
          count = this.pik_dup();
          drv = 0;
          if (count === 2)
            drv = PICInterface.PIC_MMD;
          else if (count > 2) {
            drv = PICInterface.PIC_MMM;
            if (count > 10)
              drv = 0;
          }
          if (drv !== 0) {
            this._formatIdx += count;
            this.pik_drv_fill(drv, count);
          }
          else
            this.pik_mask();
          break;

        case 'D':
          count = this.pik_dup();
          drv = 0;
          switch (count) {
            case 2:
              if (!this.hebrew) {
                drv = PICInterface.PIC_DD;
                break;
              }
            /*  falls through */
            case 3:
              if (!this.hebrew)
                drv = PICInterface.PIC_DDD;
              else
                drv = PICInterface.PIC_HDD;
              break;

            case 4:
              if (!this.hebrew)
                drv = PICInterface.PIC_DDDD;
              else
                this.pik_mask();
              break;

            default:
              this.pik_mask();
              break;
          }
          if (drv !== 0) {
            this.pik_drv_fill(drv, count);
            this._formatIdx += count;
          }
          break;

        case '#':
          count = this.pik_dup();
          if (count === 2) {
            drv = 0;
            ocr++;
            if (!this.hebrew)
              switch (PIC._environment.GetDateMode(compIdx)) {
                case 'B':
                case 'E':
                  switch (ocr) {
                    case 1:
                      drv = PICInterface.PIC_DD;
                      break;

                    case 2:
                      drv = PICInterface.PIC_MMD;
                      break;

                    case 3:
                      drv = PICInterface.PIC_YY;
                      break;
                  }
                  break;

                case 'A':
                  switch (ocr) {
                    case 1:
                      drv = PICInterface.PIC_MMD;
                      break;

                    case 2:
                      drv = PICInterface.PIC_DD;
                      break;

                    case 3:
                      drv = PICInterface.PIC_YY;
                      break;
                  }
                  break;

                case 'J':
                case 'S':
                  switch (ocr) {
                    case 1:
                      if (!SWExpandDateChecked) {
                        // Check if format_ contains "####"
                        SwitchAndExpandDate = NString.FromChars(this._format).indexOf("####") > -1;
                        SWExpandDateChecked = true;
                      }
                      if (SwitchAndExpandDate)
                        this.pik_drv_fill(PICInterface.PIC_YYYY, 4);
                      else
                        drv = PICInterface.PIC_YY;
                      break;

                    case 2:
                      drv = PICInterface.PIC_MMD;
                      break;

                    case 3:
                      drv = PICInterface.PIC_DD;
                      break;
                  }
                  break;
              }
            if (drv !== 0)
              this.pik_drv_fill(drv, 2);
          }
          else if (count === 4) {
            drv = 0;
            ocr++;
            if (!this.hebrew)
              switch (PIC._environment.GetDateMode(compIdx)) {
                case 'B':
                case 'E':
                case 'A':
                  if (ocr === 3)
                    drv = PICInterface.PIC_YYYY;
                  break;

                case 'J':
                case 'S':
                  if (ocr === 1)
                    drv = PICInterface.PIC_YYYY;
                  else {
                    if (!SWExpandDateChecked) {
                      // Check if format_ contains "####"
                      SwitchAndExpandDate =  NString.FromChars(this._format).indexOf("####") > -1;
                      SWExpandDateChecked = true;
                    }
                    if (SwitchAndExpandDate && ocr === 3)
                      this.pik_drv_fill(PICInterface.PIC_DD, 2);
                  }

                  break;
              }

            if (drv !== 0)
              this.pik_drv_fill(drv, 4);
          }

          this._formatIdx += count;
          break;


        case 'W':
          count = this.pik_dup();
          i = count;
          if (count === 1)
            drv = PICInterface.PIC_W;
          else if (this.hebrew)
            if (count === 5)
              drv = PICInterface.PIC_WWW;
            else
              i = 0;
          else if (count > 2 && count <= 10)
            drv = PICInterface.PIC_WWW;
          else
            i = 0;
          this._formatIdx += count;
          this.pik_drv_fill(drv, i);
          break;

        case '/':
          this._formatIdx++;
          this.pik_drv_fill(PIC._environment.GetDate().charCodeAt(0), 1);
          break;

        case 'S': // JPN: Japanese date picture support

          if (UtilStrByteMode.isLocaleDefLangJPN()) {
            count = this.pik_dup();
            i = count;

            if (count !== 2 && count !== 4 && count !== 6)
              i = 0;

            drv = PICInterface.PIC_BB;
            this._formatIdx += count;
            this.pik_drv_fill(drv, i);
          }
          else {
            this.pik_mask();
          }
          break;

        case 'J': // JPN: Japanese date picture support

          if (UtilStrByteMode.isLocaleDefLangJPN()) {
            count = this.pik_dup();
            i = count;
            isJpnEraYear = true;

            switch (count) {
              case 1:
                drv = PICInterface.PIC_JY1;
                break;

              case 2:
                drv = PICInterface.PIC_JY2;
                break;

              case 4:
                drv = PICInterface.PIC_JY4;
                break;

              default:
                i = 0;
                isJpnEraYear = false;
                break;
            }

            this._formatIdx += count;
            this.pik_drv_fill(drv, i);
          }
          else {
            this.pik_mask();
          }
          break;


        default:
          this.pik_mask();
          break;
      }
    }

    if (!this._needLength && isJpnEraYear)
// JPN: Japanese date picture support
    {
      for (i = 0;
           i < this._msk.length;
           i++) {
        if (this._msk[i].charCodeAt(0) === PICInterface.PIC_YY)
          this._msk[i] = String.fromCharCode( PICInterface.PIC_YJ);
        else if (this._msk[i].charCodeAt(0) === PICInterface.PIC_YYYY)
          this._msk[i] = 'Y';
      }
    }
  }

  /// <summary>
  ///   Parse a numeric picture format
  /// </summary>
  private time_prs(): void {
    // -----------------------------------------------------------------------
    // Original vars
    // -----------------------------------------------------------------------
    let drv: number;
    let NoFormat: string;
    // -----------------------------------------------------------------------
    // Added vars
    // -----------------------------------------------------------------------
    let currChr: string;

    this._zero = ' ';

    // -----------------------------------------------------------------------
    // Use a default format, if one is not specified
    // -----------------------------------------------------------------------
    if (this._format.length === 0 || this._format[0].charCodeAt(0) === 0) {
      NoFormat = "HH:MM:SS";
      if (this._mskLen < 8)
        NoFormat = NoFormat.substr(0, this._mskLen); // NoFormat[this->msk_len] = 0; // Original Line
      this._format = NString.ToCharArray(NoFormat);
    }

    while (this._formatIdx < this._format.length) {
      currChr = this._format[this._formatIdx];

      let maskLength: number;
      switch (currChr) {
        case 'H':
        case 'M':
        case 'S':
          maskLength = 2;
          /* we parse 'H/M/S' only if it has one similar character after it (i.e. 'HH'/'MM'/'SS') */
          if (this._formatIdx + 1 < this._format.length && this._format[this._formatIdx] === this._format[this._formatIdx + 1]) {
            switch (currChr) {
              case 'H':
                drv = PICInterface.PIC_HH;
                break;

              case 'M':
                drv = PICInterface.PIC_MMT;
                break;

              case 'S':
                drv = PICInterface.PIC_SS;
                break;

              default:
                drv = PICInterface.NULL_CHAR;
                break;
            }
            this._formatIdx += maskLength;
            this.pik_drv_fill(drv, maskLength);
          }
          else
            this.pik_mask();
          break;

        case 'm':
          maskLength = 3;
          /* we parse 'm' only if it has 2 similar characters after it (i.e. 'mmm') */
          if (this._formatIdx + 2 < this._format.length &&
            (this._format[this._formatIdx] === this._format[this._formatIdx + 1] &&
              this._format[this._formatIdx + 1] === this._format[this._formatIdx + 2])) {
            drv = PICInterface.PIC_MS;
            this._formatIdx += maskLength;
            this.pik_drv_fill(drv, maskLength);
          }
          else
            this.pik_mask();
          break;

        case ':':
          this._formatIdx++;
          this.pik_drv_fill(PIC._environment.GetTime().charCodeAt(0), 1);
          break;

        case 'Z':
          this._formatIdx++;
          this._zeroFill = true;
          if (this._formatIdx < this._format.length)
            this._zero = this._format[this._formatIdx++];
          break;

        case 'A':
          this._formatIdx++;
          this._autoSkip_ = true;
          break;

        case 'P':
          if (this._format[this._formatIdx + 1] === 'M')
          // changed from format_[1] -> format_[formatIdx_+1]
          {
            this._formatIdx += 2;
            this.pik_drv_fill(PICInterface.PIC_PM, 2);
          }
          else
            this.pik_mask();
          break;

        default:
          this.pik_mask();
          break;
      }
    }
  }


  /// <summary>
  ///   Build Picture for the variable of the 'type' with 'value'
  /// </summary>
  /// <param name = "type">of the picture</param>
  /// <param name = "value">is needed to be evaluated with the picture</param>
  /// <returns> PICture of the needed 'type'</returns>
  public static buildPicture(type: StorageAttribute, val: string, compIdx: number, useDecimal: boolean): PIC {
    let pic: PIC = null;
    let mask: StringBuilder = new StringBuilder(10);
    let decimalSeparator: string;
    let thousands: string;
    let currChar: string;
    let counter: number;
    let length: number;
    let beforeDec: number;
    let afterDec: number;
    let decimalDelimFound: boolean;
    let isThousandsDelim: boolean;
    let isNegative: boolean;

    switch (type) {
      case StorageAttribute.NUMERIC:
        decimalSeparator = PIC._environment.GetDecimal();
        thousands = PIC._environment.GetThousands();
        beforeDec = afterDec = 0;
        decimalDelimFound = false;
        isThousandsDelim = false;
        isNegative = false;

        if (val === null || val.length === 0)
          beforeDec = afterDec = 1;
        else {
          length = val.length;
          counter = 0;

          while (counter < length) {
            currChar = val[counter];
            switch (currChar) {
              case '+':
              case '-':
                isNegative = true;
                break;


              default:
                if (useDecimal && currChar === decimalSeparator)
                  decimalDelimFound = true;
                else if (currChar === thousands)
                  isThousandsDelim = true;
                else if (decimalDelimFound)
                  afterDec++;
                else
                  beforeDec++;
                break;
            }
            counter++;
          } // end of while for looking in the value

          mask.Append("" + beforeDec + decimalSeparator + afterDec);
          if (isNegative)
            mask.Append('N');
          if (isThousandsDelim)
            mask.Append('C');
        }
        break;


      case StorageAttribute.DATE:
        mask.Append(this.getDefaultDateMask(PIC._environment.GetDateMode(compIdx)));
        break;


      case StorageAttribute.TIME:
        mask.Append("HH" + PIC._environment.GetTime() + "MM" + PIC._environment.GetTime() + "SS");

        break;


      default:
        Events.WriteDevToLog("Event.buildPicture() there is no PICTURE building for type :" + type +
          " and value :" + val);
        return pic; // null, the PIC didn't build
    }

    pic = new PIC(mask.ToString(), type, compIdx);
    return pic;
  }

/// <summary>
///   set Hebrew to true
/// </summary>
  setHebrew(): void {
    // Defect 116258. Set hebrew flag only for hebrew mgconst.
    if (Manager.Environment.Language === 'H')
      this.hebrew = true;
  }

/// <summary>
///   get default mask for Date type
/// </summary>
/// <param name = "dataMode">- data mode (J,S,B,E,A)</param>
/// <returns> mask of default date</returns>
  protected static getDefaultDateMask(dataMode: string) {
    let frmt: string;
    switch (dataMode) {
      case 'J':
      case 'S':
        frmt = "####/##/##";
        break;

      case 'B':
      case 'E':
      case 'A':
      default:
        frmt = "##/##/####";
        break;
    }
    return frmt;
  }

/// <summary>
///   Parse a numeric picture format
/// </summary>
  private bool_prs(): void {
    // -----------------------------------------------------------------------
    // Original vars
    // -----------------------------------------------------------------------
    let count: number; // Count of direvtive or mask character
    // -----------------------------------------------------------------------
    // Added vars
    // -----------------------------------------------------------------------
    let currChr: string;

    while (this._formatIdx < this._format.length) {
      currChr = this._format[this._formatIdx];
      switch (currChr) {
        case 'H':
          this._formatIdx++;
          this.setHebrew();
          break;


        case 'A':
          this._formatIdx++;
          this._autoSkip_ = true;
          break;


        case 'X':
          this._formatIdx++;
          count = this.pik_count();
          this.pik_drv_fill(PICInterface.PIC_X, count);
          break;


        default:
          if (UtilStrByteMode.isDigit(currChr)) {
            count = this.pik_count();
            this.pik_drv_fill(PICInterface.PIC_X, count);
          }
          else
            this.pik_mask();
          break;
      }
    }

    // -----------------------------------------------------------------------
    // Fill in an empty format
    // -----------------------------------------------------------------------
    if (this._maskSize === 0)
      this.pik_drv_fill(PICInterface.PIC_X, this._mskLen);
  }

/// <summary>
///   Parse the sign prefix/suffix from the format
/// </summary>
  private pik_sign(): void {
    let posSign: boolean;
    let signStr: StringBuilder;
    let currChr: string;

    posSign = this._format[this._formatIdx] === '+'
      ? true
      : false;
    this._formatIdx++;

    if (posSign)
      signStr = this._posPref;
    else {
      this._negPref.Remove(0, this._negPref.Length);
      signStr = this._negPref;
    }

    while (this._formatIdx < this._format.length) {
      currChr = this._format[this._formatIdx];
      switch (currChr) {
        case ';':
          this._formatIdx++;
          return;


        case ',':
          this._formatIdx++;
          if (posSign)
            signStr = this._posSuff;
          else
            signStr = this._negSuff;
          break;


        case '\\':
          this._formatIdx++;
          if (this._formatIdx >= this._format.length)
            return;
          currChr = this._format[this._formatIdx];
        /* falls through */
        default:
          signStr.Append(currChr);
          this._formatIdx++;
          break;
      }
    }
  }

/// <summary>
///   Parse a number which is a counter of specific char in the format
/// </summary>
  private pik_count(): number {
    let val: number;

    val = 0;

    while (this._formatIdx < this._format.length && UtilStrByteMode.isDigit(this._format[this._formatIdx])) {
      val *= 10;
      val += this._format[this._formatIdx].charCodeAt(0) - '0'.charCodeAt(0);
      this._formatIdx++;
    }

    if (val > 32000)
      val = 32000;
    else if (val <= 0)
      val = 1;

    if (val > Int32.MaxValue)
      throw new ApplicationException(Events.GetMessageString(MsgInterface.STR_ERR_MAX_VAR_SIZE));

    return (val);
  }

/// <summary>
///   Fill a specific mask character in the mask string
/// </summary>
/// <param name = "drv">    The mask character to fill</param>
/// <param name = "count">  Number of times for the mask character to apear</param>
  private pik_drv_fill(drv: number, count: number): void {

    let MskZ: number;
    let i: number = 0;


    if (this._needLength) {
      this._maskLength += count;
      return;
    }

    MskZ = this._maskSize;
    this._maskSize += count;

    if (MskZ + count > this._mskLen)
      count = this._mskLen - MskZ;

    if (count > 0) {
      // memset (&this->msk[this.MskZ], (Uchar) drv, count); // Original Line
      for (i = 0;
           i < count;
           i++)
        this._msk[MskZ + i] = String.fromCharCode(drv);
      return;
    }
  }

/// <summary>
///   Parse a general mask character
/// </summary>
  private pik_mask(): void {
    let currChr: string;
    let count: number;

    if (this._format[this._formatIdx] === '\\')
      this._formatIdx++;
    if (this._formatIdx < this._format.length) {
      currChr = this._format[this._formatIdx];
      this._formatIdx++;
      count = this.pik_count();
      this.pik_drv_fill(currChr.charCodeAt(0), count);
      this._maskChars += count;
    }
  }

/// <summary>
///   Count continues occurrences of a mask character in the format string
/// </summary>
  private pik_dup(): number {

    let dupCount = 1;

    let c: string;

    let tmpIdx = this._formatIdx;

    c = this._format[tmpIdx];
    tmpIdx++;
    while (tmpIdx < this._format.length && c === this._format[tmpIdx]) {
      dupCount++;
      tmpIdx++;
    }

    return dupCount;
  }

/// <summary>
///   set IME mode depends on K picture (K0 - K9)
///   (JPN: IME support)
/// </summary>
  private pic_kanji(): boolean {
    let count;

    if (this._formatIdx + 1 >= this._format.length)
      return false;

    if (!UtilStrByteMode.isDigit(this._format[this._formatIdx + 1]))
      return false;

    this._formatIdx++;

    if (this._format[this._formatIdx] === '0')  // K0
    {
      this._imeMode = UtilImeJpn.IME_FORCE_OFF;
      this._formatIdx++;
    }
    else {
      count = this.pik_count();
      if (1 <= count && count <= 9) // K1 - K9
        this._imeMode = count;
    }
    return true;
  }

/// <summary>
///   Find length of the picture after parsing the picture
/// </summary>
/// <returns> length of the picture</returns>
  private getMaskLen(compIdx: number) {
    this._needLength = true;
    this._maskLength = 0;
    this._formatIdx = 0;

    this.prs_all(compIdx);

    // add prefix and suffix length to the mask
    if (this._picAttr === StorageAttribute.NUMERIC && (this._prefLen > 0 || this._suffLen > 0))
      this._maskLength += (this._prefLen + this._suffLen);

    this._needLength = false;
    // init for next running :
    this._formatIdx = this._maskChars = this._whole = this._decimalDigits = this._size = this._maskSize = this._prefLen = this._suffLen = 0;
    this._pad = this._zero = String.fromCharCode(0);
    this.hebrew = this._mixed = this._embeded = this._negative = this._comma = this._left = this._padFill = this._zeroFill = this._trim = this._autoSkip_ = this._decimal = this._termFlag = this._decPointIsFirst = false;
    this._posPref.Remove(0, this._posPref.Length);
    this._posSuff.Remove(0, this._posSuff.Length);
    this._negPref.Remove(0, this._negPref.Length);
    this._negSuff.Remove(0, this._negSuff.Length);
    return this._maskLength;
  }

/// <summary>
///   returns true if there is an embeded char in the mask in a givven position.
/// </summary>
/// <param name = "pos"></param>
/// <returns> true if pic is mask</returns>
  public picIsMask(pos: number): boolean {
    if (pos < 0 || pos >= this._maskLength)
      pos = 0;
    return this._msk[pos].charCodeAt(0) > PICInterface.PIC_MAX_OP;
  }

/// <summary>
///   returns the number of chars till the end of the sequence.
/// </summary>
/// <param name = "mskPos"></param>
/// <param name = "bufPos"></param>
/// <param name = "buf"></param>
/// <returns></returns>
  getDirectiveLen(pos: number): number;
  getDirectiveLen(mskPos: number, bufPos: number, buf: string): number;
  getDirectiveLen(posOrMskPos: number, bufPos?: number, buf?: string): number {
    if (arguments.length === 1)
      return this.getDirectiveLen_0(posOrMskPos);
    else
      return this.getDirectiveLen_1(posOrMskPos, bufPos, buf);
  }

  /// <summary>
  ///   returns the number of chars till the end of the sequence.
  /// </summary>
  /// <param name = "pos"></param>
  /// <returns> number of chars till the end of the sequence</returns>
  private getDirectiveLen_0(pos: number): number {
    let c: string = this._msk[pos];
    let num: number = pos;
    while (num < this._maskSize && c === this._msk[num]) {
      num = num + 1;
    }
    return num - pos;
  }

  /// <summary>
  ///   returns the number of chars till the end of the sequence.
  /// </summary>
  /// <param name = "mskPos"></param>
  /// <param name = "bufPos"></param>
  /// <param name = "buf"></param>
  /// <returns></returns>
  private getDirectiveLen_1(mskPos: number, bufPos: number, buf: string): number {
    let drv: string = this._msk[mskPos];
    let currMskPos: number = mskPos;
    let currBufPos: number = bufPos;

    // till the end of the mask, if mask[pos] has same directive as ours, this is the same sequence.
    while (currMskPos < this._maskSize && drv === this._msk[currMskPos]) {
      // Ignore the change of sequence if it is in-between a DBCS char.
      // If the current char is a Full Width char, then the next mask bit
      // is actually not used. So, ignore that bit and move on.
      if (currBufPos < buf.length && UtilStrByteMode.isLocaleDefLangDBCS() && this.isAttrAlphaOrDate()) {
        if (!UtilStrByteMode.isHalfWidth(buf[currBufPos++]))
          currMskPos++;
      }

      currMskPos++;
    }

    // return only how many chars to the end, including our pos.
    return (currMskPos - mskPos);
  }

/// <summary>
///   check if char is valid in the given mask position
/// </summary>
/// <param name = "charToValidate">
/// </param>
/// <param name = "pos">of directive mask to check
///   The returned char might be different then the char that was checked.
///   The reason is that 'U' and 'L' directive might change it, and in numeric,
///   decimal separator and thousand separator might be changed as well while typing.
/// </param>
/// <returns> 0 if not valid or a char if valid.</returns>
  public validateChar(charToValidate: string, pos: number) {
    let charReturned = charToValidate;
    if (pos >= this.getMaskSize())
      return charReturned;

    // we need to skip any characters which are embeded into the picture
    while (this.picIsMask(pos))
      pos++;

    switch (this._msk[pos].charCodeAt(0)) {
      case PICInterface.PIC_U:
        charReturned = charToValidate.toUpperCase();
        break;

      case PICInterface.PIC_L:
        charReturned = charToValidate.toLowerCase();
      /* falls through */

      default:
        if (!UtilStrByteMode.isDigit(charToValidate))
          for (let i = 0; i < PICInterface.NumDirective.length; i++)
            if (this._msk[pos].charCodeAt(0) === PICInterface.NumDirective[i]) {
              charReturned = this.isValidInNum(charToValidate);
              break;
            }
        break;
    }
    return charReturned;
  }

/// <summary>
///   Checks whether a non digit character is valid in a numeric mask
/// </summary>
/// <param name = "letter:">a character to be checked.</param>
/// <returns> 0 if not valid. char if valid. char might be different then letter.</returns>
  isValidInNum(letter: string): string {
    let charRet = '\0';
    let decimalChar: string = PIC._environment.GetDecimal();

    /***********************************************************************/
    /*  replace '.' with a different char for numeric seperator only if
    *  SpecialModifiedDecimalSeparator = Y*/
    // for numeric, if '.' was entered, change it to the env seperator.
    // #931784: If SpecialModifiedDecimalSeparator = Y then replace '.' by decimal separator.
    if (PIC._environment.CanReplaceDecimalSeparator() && this.isAttrNumeric())
      if (letter === '.')
        letter = decimalChar;

    switch (letter) {
      case ' ':
      case '-':
      case '*':
      case '+':
      case '/':
        charRet = letter;
        break;

      default:
        // the env decimal seperator and thousands seperator are also valid
        if (letter === decimalChar || letter === PIC._environment.GetThousands())
          charRet = letter;
        break;
    }

    return charRet;
  }

/// <summary>
///   check if the attribute is logical
/// </summary>
/// <returns></returns>
  public isAttrLogical(): boolean {
    return (this._picAttr === StorageAttribute.BOOLEAN);
  }

/// <summary>
///   check if the attribute is numeric
/// </summary>
/// <returns></returns>
  public isAttrNumeric(): boolean {
    return (this._picAttr === StorageAttribute.NUMERIC);
  }

/// <summary>
///   check if the attribute is alpha
/// </summary>
/// <returns></returns>
  public isAttrAlpha(): boolean {
    return (this._picAttr === StorageAttribute.ALPHA);
  }

/// <summary>
///   check if the attribute is unicode
/// </summary>
/// <returns></returns>
  public isAttrUnicode(): boolean {
    return (this._picAttr === StorageAttribute.UNICODE);
  }

/// <summary>
///   check if the attribute is alpha or date
/// </summary>
/// <returns></returns>
  public isAttrAlphaOrDate(): boolean {
    return (this._picAttr === StorageAttribute.ALPHA || this._picAttr === StorageAttribute.DATE);
  }

/// <summary>
///   check if the attribute is time or date
/// </summary>
/// <returns></returns>
  public isAttrDateOrTime(): boolean {
    return (this._picAttr === StorageAttribute.TIME || this._picAttr === StorageAttribute.DATE);
  }

/// <summary>
///   check if the attribute is blob
/// </summary>
/// <returns></returns>
  public isAttrBlob(): boolean {
    return (this._picAttr === StorageAttribute.BLOB ||
      this._picAttr === StorageAttribute.BLOB_VECTOR);
  }

/// <summary>
///   check if the mask at a given position is numeric
/// </summary>
/// <param name = "pos"></param>
/// <returns></returns>
  public isNumeric(pos: number): boolean {
    return this._msk [pos] === String.fromCharCode(PICInterface.PIC_N);
  }

/// <summary>
///   check if the mask is all X
/// </summary>
/// <returns></returns>
  public isAllX(): boolean {
    return (this._msk[0] === String.fromCharCode(PICInterface.PIC_X) && this.getDirectiveLen(0) === this._maskSize);
  }

/// <summary>
///   check is mask at position pos is same as parameter maskPic
/// </summary>
/// <param name = "pos"></param>
/// <param name = "maskPic"></param>
/// <returns></returns>
  public isMaskPicEq(pos: number, maskPic: number): boolean {
    return this._msk[pos] === String.fromCharCode(maskPic);
  }

/// <summary>
///   check if the input char is valid for local AS400 (system i) pictures.
///   (DBCS Support)
/// </summary>
/// <param name = "charToValidate"></param>
/// <param name = "firstChar"></param>
/// <param name = "pos"></param>
/// <returns> 0 if not valid or a char if valid.</returns>
  public isValidChar_as400(charToValidate: string, firstChar: string, pos: number): boolean {
    let ret = true;

    switch (this._msk[pos].charCodeAt(0)) {
      case PICInterface.PIC_J:
      // only full-width characters are allowed
      case PICInterface.PIC_G:
        ret = !UtilStrByteMode.isHalfWidth(charToValidate);
        break;

      case (PICInterface.PIC_T): // mixture of full-width and half-width is not allowed
        if (firstChar === '\x0000')
          ret = true;
        else if (UtilStrByteMode.isHalfWidth(firstChar))
          ret = UtilStrByteMode.isHalfWidth(charToValidate);
        else
          ret = !UtilStrByteMode.isHalfWidth(charToValidate);
        break;

      case (PICInterface.PIC_S): // only half-width characters are allowed
        ret = UtilStrByteMode.isHalfWidth(charToValidate);
        break;

      default:
        break;
    }
    return ret;
  }

/// <summary>
///   returns the minimum value length
/// </summary>
  getMinimumValueLength(): number {
    let minLength = this.getMaskLength();

    // traverse from right till a valid mask char is encountered
    while (minLength > 0 && !this.picIsMask(minLength - 1))
      minLength--;

    return minLength;
  }

  public toString(): string {
    return "{Picture: " + this._format + "}";
  }
}
