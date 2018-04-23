import {Encoding, Hashtable, NChar, NNumber, Stack, StringBuilder} from "@magic/mscorelib";
import {UtilStrByteMode} from "./UtilStrByteMode";

//@dynamic
export class Rtf_SYMBOL {
  szKeyword: string = null;
  /* RTF keyword */
  kwd: Rtf_KWD = null;
  /* base action to take */
  idxInRgprop: any = null;
  /* index into property table if kwd == kwdProp */

  /* index into destination table if kwd == kwdDest  */

  /* character to print if kwd == kwdChar            */
  constructor(keyWord: string, kwd: Rtf_KWD, idxInRgprop: any) {
    this.szKeyword = keyWord;
    this.kwd = kwd;
    this.idxInRgprop = idxInRgprop;
  }
}
// @dynamic
export class Rtf_PROP {
  actn: Rtf_ACTN = null;
  /* size of value */
  prop: Rtf_PROPTYPE = null;

  /* structure containing value */

  constructor(actn: Rtf_ACTN, prop: Rtf_PROPTYPE) {
    this.actn = actn;
    this.prop = prop;
  }
}

class Rtf_StackSave {
  rds: Rtf_RDS = null;
  ris: Rtf_RIS = null;
}

export enum Rtf_KWD {
  CHAR,
  DEST,
  PROP,
  SPEC
}

export enum Rtf_PROPTYPE {
  CHP,
  PAP,
  SEP,
  DOP
}

export enum Rtf_ACTN {
  SPEC,
  BYTE,
  WORD
}

export enum Rtf_IPFN {
  BIN,
  HEX,
  SKIP_DEST,
  BREAK,
  NEW,
  FONT,
  CHARSET,
  UNICODE
}

export enum Rtf_IDEST {
  PICT,
  COLOR,
  SKIP
}

/* types of properties */
export enum Rtf_IPROP {
  BOLD = 0,
  ITALIC,
  UNDERLINE,
  FONT,
  SIZE,
  COLOR,
  RED,
  GREEN,
  BLUE,
  LEFT_IND,
  RIGHT_IND,
  FIRST_IND,
  COLS,
  PGN_X,
  PGN_Y,
  XA_PAGE,
  YA_PAGE,
  XA_LEFT,
  XA_RIGHT,
  YA_TOP,
  YA_BOTTOM,
  PGN_START,
  SBK,
  PGN_FORMAT,
  FACING_P,
  LANDSCAPE,
  JUST,
  PARD,
  PLAIN,
  SECTD,
  BULLET,
  XA_BULLET,
  MAX
}

/* Rtf Destination State */
export enum Rtf_RDS {
  NORM,
  COLOR,
  SKIP,
  NEW
}

export enum Rtf_ErrorRtf {
  OK,
  STACK_UNDERFLOW,
  STACK_OVERFLOW,
  UNMATCHED_BRACE,
  INVALID_HEX,
  BAD_TABLE,
  ASSERTION,
  END_OF_FILE,
  BUFFER_TOO_SMALL
}

// TODO :
// Rtf_RtfChar should actually be enum.
// But computed string values are not allowed to be defined in enum.
// So, we cannot have String.fromCharCode(XXX).
// We have 2 options:
// 1. Convert this enum into a class with all static readonly items.
// 2. Keep it as enum with numeric values (char codes).
// Going with #1 now, since @2 makes the code ugly.
// Will evalaute later if required.
export class Rtf_RtfChar {
  static readonly CR = String.fromCharCode(0x0d);
  static readonly LF = String.fromCharCode(0x0A);
  static readonly TAB = String.fromCharCode(0x09);
  static readonly BULLET = String.fromCharCode(0x95);
  static readonly TILDA = String.fromCharCode(0xA0);
  static readonly DASH = String.fromCharCode(0xAD);
  static readonly DASH_CHAR = '-';
  static readonly QUOTE = '\'';
  static readonly DBLQUOTE = '"';
  static readonly OPENINGBRACE = '{';
  static readonly CLOSINGBRACE = '}';
  static readonly BACKSLASH = '\\';
}

export enum Rtf_RIS {
  NORM,
  BIN,
  HEX,
  UNICODE
}

export class Rtf {
  private _group: number = 0;
  private _cbBin: number = 0;
  private _lParam: number = 0;
  private _skipDestIfUnk: boolean = false;
  private _outputOnce: boolean = false;
  private _processCrlfSpecial: boolean = false;
  private _destState: Rtf_RDS = null;
  private _internalState: Rtf_RIS = null;
  private _stack: Stack<Rtf_StackSave> = null;
  private _index: number = 0;
  private _fontNum: number = 0;
  private readonly _charsetTable: Hashtable<number, number> = new Hashtable<number, number>();
  private readonly _codePageTable: Hashtable<number, number> = new Hashtable<number, number>();
  private static readonly RTF_PREFIX: string = "{\\rtf";
  private static readonly CHAR_PAR: string = "par";

  /* Property descriptions */
  private static readonly rgprop: Rtf_PROP[] = [
    new Rtf_PROP(Rtf_ACTN.BYTE, Rtf_PROPTYPE.CHP), new Rtf_PROP(Rtf_ACTN.BYTE, Rtf_PROPTYPE.CHP),
    new Rtf_PROP(Rtf_ACTN.BYTE, Rtf_PROPTYPE.CHP), new Rtf_PROP(Rtf_ACTN.BYTE, Rtf_PROPTYPE.CHP),
    new Rtf_PROP(Rtf_ACTN.BYTE, Rtf_PROPTYPE.CHP), new Rtf_PROP(Rtf_ACTN.BYTE, Rtf_PROPTYPE.CHP),
    new Rtf_PROP(Rtf_ACTN.BYTE, Rtf_PROPTYPE.CHP), new Rtf_PROP(Rtf_ACTN.BYTE, Rtf_PROPTYPE.CHP),
    new Rtf_PROP(Rtf_ACTN.BYTE, Rtf_PROPTYPE.CHP), new Rtf_PROP(Rtf_ACTN.WORD, Rtf_PROPTYPE.PAP),
    new Rtf_PROP(Rtf_ACTN.WORD, Rtf_PROPTYPE.PAP), new Rtf_PROP(Rtf_ACTN.WORD, Rtf_PROPTYPE.PAP),
    new Rtf_PROP(Rtf_ACTN.WORD, Rtf_PROPTYPE.SEP), new Rtf_PROP(Rtf_ACTN.WORD, Rtf_PROPTYPE.SEP),
    new Rtf_PROP(Rtf_ACTN.WORD, Rtf_PROPTYPE.SEP), new Rtf_PROP(Rtf_ACTN.WORD, Rtf_PROPTYPE.DOP),
    new Rtf_PROP(Rtf_ACTN.WORD, Rtf_PROPTYPE.DOP), new Rtf_PROP(Rtf_ACTN.WORD, Rtf_PROPTYPE.DOP),
    new Rtf_PROP(Rtf_ACTN.WORD, Rtf_PROPTYPE.DOP), new Rtf_PROP(Rtf_ACTN.WORD, Rtf_PROPTYPE.DOP),
    new Rtf_PROP(Rtf_ACTN.WORD, Rtf_PROPTYPE.DOP), new Rtf_PROP(Rtf_ACTN.WORD, Rtf_PROPTYPE.DOP),
    new Rtf_PROP(Rtf_ACTN.BYTE, Rtf_PROPTYPE.SEP), new Rtf_PROP(Rtf_ACTN.BYTE, Rtf_PROPTYPE.SEP),
    new Rtf_PROP(Rtf_ACTN.BYTE, Rtf_PROPTYPE.DOP), new Rtf_PROP(Rtf_ACTN.BYTE, Rtf_PROPTYPE.DOP),
    new Rtf_PROP(Rtf_ACTN.BYTE, Rtf_PROPTYPE.PAP), new Rtf_PROP(Rtf_ACTN.SPEC, Rtf_PROPTYPE.PAP),
    new Rtf_PROP(Rtf_ACTN.SPEC, Rtf_PROPTYPE.CHP), new Rtf_PROP(Rtf_ACTN.SPEC, Rtf_PROPTYPE.SEP)
  ];

  /* Keyword descriptions */
  private static readonly rgsymRtf: Rtf_SYMBOL[] = [
    new Rtf_SYMBOL("b", Rtf_KWD.PROP, Rtf_IPROP.BOLD), new Rtf_SYMBOL("ul", Rtf_KWD.PROP, Rtf_IPROP.UNDERLINE),
    new Rtf_SYMBOL("i", Rtf_KWD.PROP, Rtf_IPROP.ITALIC), new Rtf_SYMBOL("li", Rtf_KWD.PROP, Rtf_IPROP.LEFT_IND),
    new Rtf_SYMBOL("ri", Rtf_KWD.PROP, Rtf_IPROP.RIGHT_IND), new Rtf_SYMBOL("fi", Rtf_KWD.PROP, Rtf_IPROP.FIRST_IND),
    new Rtf_SYMBOL("cols", Rtf_KWD.PROP, Rtf_IPROP.COLS), new Rtf_SYMBOL("sbknone", Rtf_KWD.PROP, Rtf_IPROP.SBK),
    new Rtf_SYMBOL("sbkcol", Rtf_KWD.PROP, Rtf_IPROP.SBK), new Rtf_SYMBOL("sbkeven", Rtf_KWD.PROP, Rtf_IPROP.SBK),
    new Rtf_SYMBOL("sbkodd", Rtf_KWD.PROP, Rtf_IPROP.SBK), new Rtf_SYMBOL("sbkpage", Rtf_KWD.PROP, Rtf_IPROP.SBK),
    new Rtf_SYMBOL("pgnx", Rtf_KWD.PROP, Rtf_IPROP.PGN_X), new Rtf_SYMBOL("pgny", Rtf_KWD.PROP, Rtf_IPROP.PGN_Y),
    new Rtf_SYMBOL("pgndec", Rtf_KWD.PROP, Rtf_IPROP.PGN_FORMAT), new Rtf_SYMBOL("pgnucrm", Rtf_KWD.PROP, Rtf_IPROP.PGN_FORMAT),
    new Rtf_SYMBOL("pgnlcrm", Rtf_KWD.PROP, Rtf_IPROP.PGN_FORMAT), new Rtf_SYMBOL("pgnucltr", Rtf_KWD.PROP, Rtf_IPROP.PGN_FORMAT),
    new Rtf_SYMBOL("pgnlcltr", Rtf_KWD.PROP, Rtf_IPROP.PGN_FORMAT), new Rtf_SYMBOL("qc", Rtf_KWD.PROP, Rtf_IPROP.JUST),
    new Rtf_SYMBOL("ql", Rtf_KWD.PROP, Rtf_IPROP.JUST), new Rtf_SYMBOL("qr", Rtf_KWD.PROP, Rtf_IPROP.JUST),
    new Rtf_SYMBOL("qj", Rtf_KWD.PROP, Rtf_IPROP.JUST), new Rtf_SYMBOL("paperw", Rtf_KWD.PROP, Rtf_IPROP.XA_PAGE),
    new Rtf_SYMBOL("paperh", Rtf_KWD.PROP, Rtf_IPROP.YA_PAGE), new Rtf_SYMBOL("margl", Rtf_KWD.PROP, Rtf_IPROP.XA_LEFT),
    new Rtf_SYMBOL("margr", Rtf_KWD.PROP, Rtf_IPROP.XA_RIGHT), new Rtf_SYMBOL("margt", Rtf_KWD.PROP, Rtf_IPROP.YA_TOP),
    new Rtf_SYMBOL("margb", Rtf_KWD.PROP, Rtf_IPROP.YA_BOTTOM), new Rtf_SYMBOL("pgnstart", Rtf_KWD.PROP, Rtf_IPROP.PGN_START),
    new Rtf_SYMBOL("facingp", Rtf_KWD.PROP, Rtf_IPROP.FACING_P), new Rtf_SYMBOL("landscape", Rtf_KWD.PROP, Rtf_IPROP.LANDSCAPE),
    new Rtf_SYMBOL("par", Rtf_KWD.CHAR, Rtf_RtfChar.LF), new Rtf_SYMBOL("\0x0a", Rtf_KWD.CHAR, Rtf_RtfChar.LF),
    new Rtf_SYMBOL("\0x0d", Rtf_KWD.CHAR, Rtf_RtfChar.LF), new Rtf_SYMBOL("tab", Rtf_KWD.CHAR, Rtf_RtfChar.TAB),
    new Rtf_SYMBOL("ldblquote", Rtf_KWD.CHAR, Rtf_RtfChar.DBLQUOTE), new Rtf_SYMBOL("rdblquote", Rtf_KWD.CHAR, Rtf_RtfChar.DBLQUOTE),
    new Rtf_SYMBOL("lquote", Rtf_KWD.CHAR, Rtf_RtfChar.QUOTE), new Rtf_SYMBOL("rquote", Rtf_KWD.CHAR, Rtf_RtfChar.QUOTE),
    new Rtf_SYMBOL("bullet", Rtf_KWD.CHAR, Rtf_RtfChar.BULLET), new Rtf_SYMBOL("endash", Rtf_KWD.CHAR, Rtf_RtfChar.DASH_CHAR),
    new Rtf_SYMBOL("emdash", Rtf_KWD.CHAR, Rtf_RtfChar.DASH_CHAR), new Rtf_SYMBOL("~", Rtf_KWD.CHAR, Rtf_RtfChar.TILDA),
    new Rtf_SYMBOL("-", Rtf_KWD.CHAR, Rtf_RtfChar.DASH), new Rtf_SYMBOL("{", Rtf_KWD.CHAR, Rtf_RtfChar.OPENINGBRACE),
    new Rtf_SYMBOL("}", Rtf_KWD.CHAR, Rtf_RtfChar.CLOSINGBRACE), new Rtf_SYMBOL("\\", Rtf_KWD.CHAR, Rtf_RtfChar.BACKSLASH),
    new Rtf_SYMBOL("bin", Rtf_KWD.SPEC, Rtf_IPFN.BIN), new Rtf_SYMBOL("*", Rtf_KWD.SPEC, Rtf_IPFN.SKIP_DEST),
    new Rtf_SYMBOL("'", Rtf_KWD.SPEC, Rtf_IPFN.HEX), new Rtf_SYMBOL("f", Rtf_KWD.SPEC, Rtf_IPFN.FONT),
    new Rtf_SYMBOL("fcharset", Rtf_KWD.SPEC, Rtf_IPFN.CHARSET), new Rtf_SYMBOL("u", Rtf_KWD.SPEC, Rtf_IPFN.UNICODE),
    new Rtf_SYMBOL("author", Rtf_KWD.DEST, Rtf_IDEST.SKIP), new Rtf_SYMBOL("buptim", Rtf_KWD.DEST, Rtf_IDEST.SKIP),
    new Rtf_SYMBOL("colortbl", Rtf_KWD.DEST, Rtf_IDEST.SKIP), new Rtf_SYMBOL("comment", Rtf_KWD.DEST, Rtf_IDEST.SKIP),
    new Rtf_SYMBOL("creatim", Rtf_KWD.DEST, Rtf_IDEST.SKIP), new Rtf_SYMBOL("doccomm", Rtf_KWD.DEST, Rtf_IDEST.SKIP),
    new Rtf_SYMBOL("fonttbl", Rtf_KWD.DEST, Rtf_IDEST.SKIP), new Rtf_SYMBOL("footer", Rtf_KWD.DEST, Rtf_IDEST.SKIP),
    new Rtf_SYMBOL("footerf", Rtf_KWD.DEST, Rtf_IDEST.SKIP), new Rtf_SYMBOL("footerl", Rtf_KWD.DEST, Rtf_IDEST.SKIP),
    new Rtf_SYMBOL("footerr", Rtf_KWD.DEST, Rtf_IDEST.SKIP), new Rtf_SYMBOL("footnote", Rtf_KWD.DEST, Rtf_IDEST.SKIP),
    new Rtf_SYMBOL("ftncn", Rtf_KWD.DEST, Rtf_IDEST.SKIP), new Rtf_SYMBOL("ftnsep", Rtf_KWD.DEST, Rtf_IDEST.SKIP),
    new Rtf_SYMBOL("ftnsepc", Rtf_KWD.DEST, Rtf_IDEST.SKIP), new Rtf_SYMBOL("header", Rtf_KWD.DEST, Rtf_IDEST.SKIP),
    new Rtf_SYMBOL("headerf", Rtf_KWD.DEST, Rtf_IDEST.SKIP), new Rtf_SYMBOL("headerl", Rtf_KWD.DEST, Rtf_IDEST.SKIP),
    new Rtf_SYMBOL("headerr", Rtf_KWD.DEST, Rtf_IDEST.SKIP), new Rtf_SYMBOL("info", Rtf_KWD.DEST, Rtf_IDEST.SKIP),
    new Rtf_SYMBOL("keywords", Rtf_KWD.DEST, Rtf_IDEST.SKIP), new Rtf_SYMBOL("operator", Rtf_KWD.DEST, Rtf_IDEST.SKIP),
    new Rtf_SYMBOL("pict", Rtf_KWD.DEST, Rtf_IDEST.SKIP), new Rtf_SYMBOL("printim", Rtf_KWD.DEST, Rtf_IDEST.SKIP),
    new Rtf_SYMBOL("private1", Rtf_KWD.DEST, Rtf_IDEST.SKIP), new Rtf_SYMBOL("revtim", Rtf_KWD.DEST, Rtf_IDEST.SKIP),
    new Rtf_SYMBOL("rxe", Rtf_KWD.DEST, Rtf_IDEST.SKIP), new Rtf_SYMBOL("stylesheet", Rtf_KWD.DEST, Rtf_IDEST.SKIP),
    new Rtf_SYMBOL("subject", Rtf_KWD.DEST, Rtf_IDEST.SKIP), new Rtf_SYMBOL("tc", Rtf_KWD.DEST, Rtf_IDEST.SKIP),
    new Rtf_SYMBOL("title", Rtf_KWD.DEST, Rtf_IDEST.SKIP), new Rtf_SYMBOL("txe", Rtf_KWD.DEST, Rtf_IDEST.SKIP),
    new Rtf_SYMBOL("xe", Rtf_KWD.DEST, Rtf_IDEST.SKIP)
  ];

  /// <summary> Constructor
  /// </summary>
  constructor() {
    this._stack = new Stack<Rtf_StackSave>();
    this._group = 0;
    this._cbBin = 0;
    this._lParam = 0;
    this._outputOnce = false;
    this._skipDestIfUnk = false;
    this._processCrlfSpecial = false;
    this._destState = Rtf_RDS.NORM;
    this._internalState = Rtf_RIS.NORM;
    this._fontNum = 0;
    if (UtilStrByteMode.isLocaleDefLangDBCS()) {
      this.setCodePageTable();
    }
  }

  /// <summary> Checks if the blob has a Rtf data or not
  ///
  /// </summary>
  /// <param name="str">
  /// </param>
  /// <returns>
  /// </returns>
  static isRtf(str: string): boolean {
    let isRtf: boolean = false;
    if (str !== null && str.startsWith(this.RTF_PREFIX)) {
      isRtf = true;
    }
    return isRtf;
  }

  /// <summary> Converts Rtf Text to Plain Text
  /// Step 1: Isolate RTF keywords and send them to ParseKeyword; Push and pop state at the start and end of
  /// RTF groups Send text to ParseChar for further processing.
  ///
  /// </summary>
  /// <param name="rtfTxt">
  /// </param>
  /// <param name="outputTxt">
  /// </param>
  /// <returns>
  /// </returns>
  public toTxt(rtfTxt: string, outputTxt: StringBuilder): Rtf_ErrorRtf {
    let cNibble: number = 2;
    let b: number = 0;
    let currPos: number = 0;
    let skipNewline: boolean = false;
    let blobStrLen: number;
    let blobChar: string;
    let ec: Rtf_ErrorRtf;
    let dbcsBytes: Uint8Array = new Uint8Array(2);
    let skipParseChar: boolean = false;
    let charset: number = 0;
    let codePage: number = 0;

    this._outputOnce = false;
    this._processCrlfSpecial = false;
    blobStrLen = rtfTxt.length;
    this._index = 0;
    this._destState = Rtf_RDS.NORM;
    if (rtfTxt === null || blobStrLen === 0 || !Rtf.isRtf(rtfTxt)) {
      return Rtf_ErrorRtf.OK;
    }

    while (this._index < blobStrLen) {
      blobChar = rtfTxt[this._index];
      this._index++;

      if (this._group < 0)
        return Rtf_ErrorRtf.STACK_UNDERFLOW;

      /* if we're parsing binary data, handle it directly */
      if (this._internalState === Rtf_RIS.BIN) {
        if ((ec = this.ParseChar(blobChar, outputTxt)) !== Rtf_ErrorRtf.OK)
          return ec;
      }
      else {
        switch (blobChar) {
          case Rtf_RtfChar.OPENINGBRACE:
            skipNewline = false;
            if ((ec = this.PushState()) !== Rtf_ErrorRtf.OK)
              return ec;
            break;

          case Rtf_RtfChar.CLOSINGBRACE:
            skipNewline = true;
            if ((ec = this.PopState()) !== Rtf_ErrorRtf.OK)
              return ec;
            break;

          case Rtf_RtfChar.BACKSLASH:
            skipNewline = false;
            if ((ec = this.ParseKeyword(rtfTxt, outputTxt)) !== Rtf_ErrorRtf.OK)
              return ec;
            break;

          case Rtf_RtfChar.LF:
          case Rtf_RtfChar.CR:  /* cr and lf are noise characters... */
            if (this._processCrlfSpecial) {
              /* Once we reach the 0x0a while ProcessCRLFSpecial_, reset the ProcessCRLFSpecial_ */
              if (blobChar === Rtf_RtfChar.LF) {
                this._processCrlfSpecial = false;
              }
            }
            else {
              /*---------------------------------------------------------------*/
              /* skip new lines coming only from the RTF header 1/1/98 - #2390 */
              /*---------------------------------------------------------------*/
              /* Skip the LF (0x0a) if we are not in the ProcessCRLFSpecial_ */
              if (blobChar === Rtf_RtfChar.LF || (blobChar === Rtf_RtfChar.CR && skipNewline && !this._outputOnce))
                break;
            }
          /* falls through */

          default:
            if (blobChar !== Rtf_RtfChar.CR)
              skipNewline = false;
            if (this._internalState === Rtf_RIS.NORM) {
              if ((ec = this.ParseChar(blobChar, outputTxt)) !== Rtf_ErrorRtf.OK)
                return ec;
            }
            else if (this._internalState === Rtf_RIS.UNICODE) {
              if ((ec = this.ParseChar(String.fromCharCode(this._lParam), outputTxt)) !== Rtf_ErrorRtf.OK)
                return ec;
              this._internalState = Rtf_RIS.NORM;
            }
            else {
              /* parsing hex data */
              if (this._internalState !== Rtf_RIS.HEX)
                return Rtf_ErrorRtf.ASSERTION;
              b = b << 4;
              if (NChar.IsDigit(blobChar))
                b += blobChar.charCodeAt(0) - '0'.charCodeAt(0);
              else {
                if (NChar.IsLower(blobChar)) {
                  if (blobChar < 'a' || blobChar > 'f')
                    return Rtf_ErrorRtf.INVALID_HEX;
                  b += 10 + blobChar.charCodeAt(0) - 'a'.charCodeAt(0);
                }
                else {
                  if (blobChar < 'A' || blobChar > 'F')
                    return Rtf_ErrorRtf.INVALID_HEX;
                  b += 10 + blobChar.charCodeAt(0) - 'A'.charCodeAt(0);
                }
              }
              cNibble--;
              if (cNibble === 0) {
                if (UtilStrByteMode.isLocaleDefLangDBCS()) {
                  charset = this.getCharset(this._fontNum);

                  // leading byte of a double-byte character
                  if (!skipParseChar && Rtf.is1stByte(b, charset)) {
                    dbcsBytes[0] = b;
                    dbcsBytes[1] = 0;
                    skipParseChar = true;
                  }
                  else {
                    // trailing byte of a double-byte character
                    if (skipParseChar && Rtf.is2ndByte(b, charset))
                      dbcsBytes[1] = b;
                    // single-byte character
                    else {
                      dbcsBytes[0] = b;
                      dbcsBytes[1] = 0;
                    }

                    // convert DBCS to Unicode
                    codePage = this.getCodePage(charset);
                    let workStr: string = Encoding.GetEncoding(codePage).GetString(dbcsBytes, 0, 2);
                    b = workStr.charCodeAt(0);
                    skipParseChar = false;
                  }
                }
                if (!skipParseChar) {
                  if ((ec = this.ParseChar(String.fromCharCode(b), outputTxt)) !== Rtf_ErrorRtf.OK)
                    return ec;
                }
                cNibble = 2;
                b = 0;
                this._internalState = Rtf_RIS.NORM;
              }
            }
            /* end else (ris != risNorm) */
            break;
        }
        /* switch */
      }
      /* else (ris != risBin) */
    }
    /* while */

    if (this._group < 0)
      return Rtf_ErrorRtf.STACK_UNDERFLOW;
    if (this._group > 0)
      return Rtf_ErrorRtf.UNMATCHED_BRACE;

    /*-------------------------------------------------------------------*/
    /* Eliminate suffix of carrige return + line feed                    */
    /* (Check last characters - just in case format is not the expected) */
    /*-------------------------------------------------------------------*/
    currPos = outputTxt.Length;
    if (currPos >= 3 && (outputTxt.get_Item(currPos - 3) === Rtf_RtfChar.CR && outputTxt.get_Item(currPos - 2) === Rtf_RtfChar.LF && outputTxt.get_Item(currPos - 1) === Rtf_RtfChar.CR || outputTxt.get_Item(currPos - 3) === Rtf_RtfChar.LF && outputTxt.get_Item(currPos - 2) === Rtf_RtfChar.CR && outputTxt.get_Item(currPos - 1) === Rtf_RtfChar.CR))
      outputTxt.Remove(currPos - 3, 3);

    return Rtf_ErrorRtf.OK;
  }

  /// <summary> Route the character to the appropriate destination stream.
  ///
  /// </summary>
  /// <param name="ch">
  /// </param>
  /// <param name="outputTxt">
  /// </param>
  /// <returns>
  /// </returns>
  private ParseChar(ch: string, outputTxt: StringBuilder): Rtf_ErrorRtf {
    let ret: Rtf_ErrorRtf = Rtf_ErrorRtf.OK;

    if (this._internalState === Rtf_RIS.BIN && --this._cbBin <= 0) {
      this._internalState = Rtf_RIS.NORM;
    }

    if (this._destState === Rtf_RDS.SKIP) {
    }
    /* Toss this character. */
    else if (this._destState === Rtf_RDS.NORM) {
      /* Output a character. Properties are valid at this point. */
      ret = this.PrintChar(ch, outputTxt);
    }
    else {
      /* handle other destinations.... */
    }
    return ret;
  }

  /// <summary> Send a character to the output file.
  ///
  /// </summary>
  /// <param name="ch">
  /// </param>
  /// <param name="outputTxt">
  /// </param>
  /// <returns>
  /// </returns>
  private PrintChar(ch: string, outputTxt: StringBuilder): Rtf_ErrorRtf {
    /* Allow carrige return + line feed in text, but remove bullet sign */
    /*------------------------------------------------------------------*/
    if ((ch >= ' ' || ch === Rtf_RtfChar.CR || ch === Rtf_RtfChar.LF) && ch !== String.fromCharCode(183)) {
      outputTxt.Append(ch);
    }

    if (ch >= ' ') {
      this._outputOnce = true;
    }

    return Rtf_ErrorRtf.OK;
  }

  /// <summary> Save relevant info on a linked list of SAVE structures.
  ///
  /// </summary>
  /// <returns>
  /// </returns>
  private PushState(): Rtf_ErrorRtf {
    let stackSave: Rtf_StackSave = new Rtf_StackSave();

    if (stackSave === null) {
      return Rtf_ErrorRtf.STACK_OVERFLOW;
    }

    stackSave.rds = this._destState;
    stackSave.ris = this._internalState;
    this._internalState = Rtf_RIS.NORM;

    this._stack.push(stackSave);
    this._group++;

    return Rtf_ErrorRtf.OK;
  }

  /// <summary> Always restore relevant info from the top of the SAVE list.
  ///
  /// </summary>
  /// <returns>
  /// </returns>
  private PopState(): Rtf_ErrorRtf {
    let savedPop: Rtf_StackSave = this._stack.pop();

    if (savedPop === null) {
      return Rtf_ErrorRtf.STACK_UNDERFLOW;
    }

    this._destState = savedPop.rds;
    this._internalState = savedPop.ris;

    this._group--;

    return Rtf_ErrorRtf.OK;
  }

  /// <summary> Step 2: get a control word (and its associated value) and call TranslateKeyword to dispatch the control.
  ///
  /// </summary>
  /// <param name="rtfTxt">
  /// </param>
  /// <param name="outputTxt">
  /// </param>
  /// <returns>
  /// </returns>
  private ParseKeyword(rtfTxt: string, outputTxt: StringBuilder): Rtf_ErrorRtf {
    let ch: string;
    let fNeg: boolean = false;
    let szKeyword: string = "";
    let szParameter: string = "";

    if ((ch = rtfTxt[this._index++]) === String.fromCharCode(0)) {
      return Rtf_ErrorRtf.END_OF_FILE;
    }

    /* a control symbol; no delimiter. */
    if (!NChar.IsLetter(ch)) {
      szKeyword = szKeyword + ch;
      return this.TranslateKeyword(szKeyword, outputTxt);
    }

    for (; NChar.IsLetter(ch); ch = rtfTxt[this._index++])
      szKeyword = szKeyword + ch;

    if (ch === '-') {
      fNeg = true;
      if ((ch = rtfTxt[this._index++]) === String.fromCharCode(0))
        return Rtf_ErrorRtf.END_OF_FILE;
    }

    if (NChar.IsDigit(ch)) {
      for (; NChar.IsDigit(ch); ch = rtfTxt[this._index++])
        szParameter = szParameter + ch;

      this._lParam = NNumber.Parse(szParameter);

      if (fNeg)
        this._lParam = -this._lParam;
    }
    if (ch !== ' ')
      this._index--;

    if (szKeyword ===  Rtf.CHAR_PAR) {
      /* if we get a RTF sequence of \par[0xd][0xa], ie a \par kwd followed   */
      /* immidiately by the CR and LF, then ignore the \par kwd. otherwise    */
      /* we will translate the \par - which translates to a LF (0xa) and also */
      /* the following 0x0d is translated to 0x0a, thus resulting in TWO LF's */
      /* being inserted instead of just one LF. So by skipping [\par] and     */
      /* translating only the [0xd 0xa] will result in only one LF appearing  */
      /* - which is the desired behaviour                                     */
      if (rtfTxt[this._index] === Rtf_RtfChar.CR && rtfTxt[this._index + 1] === Rtf_RtfChar.LF)
        this._processCrlfSpecial = true;
    }

    if (this._processCrlfSpecial) {
      return Rtf_ErrorRtf.OK;
    }
    else {
      return this.TranslateKeyword(szKeyword, outputTxt);
    }
  }

  /// <summary> Step 3. Search rgsymRtf for szKeyword and evaluate it appropriately.
  ///
  /// </summary>
  /// <param name="szKeyword">
  /// </param>
  /// <param name="outputTxt">
  /// </param>
  /// <returns>
  /// </returns>
  private TranslateKeyword(szKeyword: string, outputTxt: StringBuilder): Rtf_ErrorRtf {
    let result: Rtf_ErrorRtf = Rtf_ErrorRtf.OK;
    let isym: number;

    /* search for szKeyword in rgsymRtf */
    for (isym = 0; isym < Rtf.rgsymRtf.length; isym++) {
      if (szKeyword === Rtf.rgsymRtf[isym].szKeyword) {
        break;
      }
    }

    /* control word not found */
    if (isym === Rtf.rgsymRtf.length) {
      if (this._skipDestIfUnk) {
        /* if this is a new destination */
        this._destState = Rtf_RDS.SKIP;
        /* skip the destination */
      }

      /* else just discard it */
      this._skipDestIfUnk = false;
    }
    else {
      result = Rtf_ErrorRtf.BAD_TABLE;

      /* found it! use kwd and idxInRgprop to determine what to do with it. */
      this._skipDestIfUnk = false;

      if (Rtf.rgsymRtf[isym].kwd === Rtf_KWD.PROP) {
        result = this.validateProp(<Rtf_IPROP>Rtf.rgsymRtf[isym].idxInRgprop);
      }
      else if (Rtf.rgsymRtf[isym].kwd === Rtf_KWD.CHAR) {
        result = this.ParseChar((Rtf.rgsymRtf[isym].idxInRgprop), outputTxt);
      }
      else if (Rtf.rgsymRtf[isym].kwd === Rtf_KWD.DEST) {
        result = this.changeDestState();
      }
      else if (Rtf.rgsymRtf[isym].kwd === Rtf_KWD.SPEC) {
        result = this.ParseSpecialKeyword(<Rtf_IPFN>Rtf.rgsymRtf[isym].idxInRgprop);
      }
    }

    return result;
  }

  /// <summary> Validate the property identified by _iprop_ to the value _val_.
  /// previously called Applypropchange
  /// </summary>
  /// <param name="iprop">
  /// </param>
  /// <returns>
  /// </returns>
  private validateProp(iprop: Rtf_IPROP): Rtf_ErrorRtf {
    let ret: Rtf_ErrorRtf = Rtf_ErrorRtf.OK;

    if (this._destState === Rtf_RDS.SKIP) {
      /* If we're skipping text, */
      return ret;
      /* don't do anything. */
    }

    /* validate prop */
    if (Rtf.rgprop[iprop].prop !== Rtf_PROPTYPE.DOP && Rtf.rgprop[iprop].prop !== Rtf_PROPTYPE.SEP &&
      Rtf.rgprop[iprop].prop !== Rtf_PROPTYPE.PAP && Rtf.rgprop[iprop].prop !== Rtf_PROPTYPE.CHP &&
      Rtf.rgprop[iprop].actn !== Rtf_ACTN.SPEC) {
      ret = Rtf_ErrorRtf.BAD_TABLE;
    }

    if (Rtf.rgprop[iprop].actn !== Rtf_ACTN.BYTE && Rtf.rgprop[iprop].actn !== Rtf_ACTN.WORD && Rtf.rgprop[iprop].actn !== Rtf_ACTN.SPEC) {
      ret = Rtf_ErrorRtf.BAD_TABLE;
    }

    return ret;
  }

  /// <summary> Change to the destination state.
  /// previously called ChangeDest
  /// </summary>
  /// <returns>
  /// </returns>
  private changeDestState(): Rtf_ErrorRtf {
    if (this._destState === Rtf_RDS.SKIP) {
      /* if we're skipping text, */
      return Rtf_ErrorRtf.OK;
      /* don't do anything */
    }

    this._destState = Rtf_RDS.SKIP;
    /* when in doubt, skip it... */

    return Rtf_ErrorRtf.OK;
  }

  /// <summary> Evaluate an RTF control that needs special processing.
  ///
  /// </summary>
  /// <param name="ipfn">
  /// </param>
  /// <returns>
  /// </returns>
  private ParseSpecialKeyword(ipfn: Rtf_IPFN): Rtf_ErrorRtf {
    let ret: Rtf_ErrorRtf = Rtf_ErrorRtf.OK;

    if (!UtilStrByteMode.isLocaleDefLangDBCS()) {
      if (this._destState === Rtf_RDS.SKIP && ipfn !== Rtf_IPFN.BIN) {
        /* if we're skipping, and it's not */
        return ret;
        /* the \bin keyword, ignore it. */
      }

      if (ipfn === Rtf_IPFN.FONT || ipfn === Rtf_IPFN.CHARSET || ipfn === Rtf_IPFN.UNICODE) {
        return ret;
      }
    }
    else {
      if (this._destState === Rtf_RDS.SKIP && ipfn !== Rtf_IPFN.BIN && ipfn !== Rtf_IPFN.FONT &&
        ipfn !== Rtf_IPFN.CHARSET && ipfn !== Rtf_IPFN.UNICODE) {
        return ret;
      }
    }

    if (ipfn === Rtf_IPFN.BIN) {
      this._internalState = Rtf_RIS.BIN;
      this._cbBin = this._lParam;
    }
    else if (ipfn === Rtf_IPFN.SKIP_DEST) {
      this._skipDestIfUnk = true;
    }
    else if (ipfn === Rtf_IPFN.HEX) {
      this._internalState = Rtf_RIS.HEX;
    }
    else if (ipfn === Rtf_IPFN.FONT) {
      this._fontNum = <number>this._lParam;
    }
    else if (ipfn === Rtf_IPFN.CHARSET) {
      this._charsetTable.set_Item(this._fontNum, <number>this._lParam);
    }
    else if (ipfn === Rtf_IPFN.UNICODE) {
      this._internalState = Rtf_RIS.UNICODE;
    }
    else {
      ret = Rtf_ErrorRtf.BAD_TABLE;
    }

    return ret;
  }

  private static is1stByte(dbcsBytes: number, charset: number): boolean {
    let ret: boolean = false;

    if (dbcsBytes > 255)
      return ret;

    switch (charset) {
      case 128:
        ret = (129 <= dbcsBytes && dbcsBytes <= 159) || (224 <= dbcsBytes && dbcsBytes <= 254);
        break;
      case 129:
      case 134:
      case 136:
        ret = (129 <= dbcsBytes);
        break;
      default:
        break;
    }
    return ret;
  }

  /// <summary> Checks if the byte is within the trailing byte range.
  ///
  /// </summary>
  /// <param name="dbcsBytes">
  /// </param>
  /// <param name="charset">
  /// </param>
  /// <returns>
  /// </returns>
  private static is2ndByte(dbcsBytes: number, charset: number): boolean {
    let ret: boolean = false;
    if (dbcsBytes > 255)
      return ret;

    switch (charset) {
      case 128:
        ret = (dbcsBytes !== 127) && (64 <= dbcsBytes && dbcsBytes <= 252);
        break;
      case 129:
      case 134:
      case 136:
        ret = (64 <= dbcsBytes);
        break;
      default:
        break;
    }
    return ret;
  }

  /// <summary> Create a hashtable of codepage associated with charset.
  ///
  /// </summary>
  /// <param>
  /// <returns>
  /// </returns>
  private setCodePageTable(): void {
    // add elements with key (charset) and value (codepage) into the table.
    this._codePageTable.set_Item(0, 1252);    // ANSI_CHARSET
    this._codePageTable.set_Item(128, 932);   // SHIFTJIS_CHARSET
    this._codePageTable.set_Item(129, 949);   // HANGUL_CHARSET
    this._codePageTable.set_Item(134, 936);   // GB2312_CHARSET
    this._codePageTable.set_Item(136, 950);   // CHINESEBIG5_CHARSET
    this._codePageTable.set_Item(161, 1253);  // GREEK_CHARSET
    this._codePageTable.set_Item(162, 1254);  // TURKISH_CHARSET
    this._codePageTable.set_Item(177, 1255);  // HEBREW_CHARSET
    this._codePageTable.set_Item(178, 1256);  // ARABIC _CHARSET
    this._codePageTable.set_Item(186, 1257);  // BALTIC_CHARSET
    this._codePageTable.set_Item(204, 1251);  // RUSSIAN_CHARSET
    this._codePageTable.set_Item(222, 874);   // THAI_CHARSET
    this._codePageTable.set_Item(238, 1250);  // EASTEUROPE_CHARSET
  }

  /// <summary> Get codepage corresponding to the specified charset.
  ///
  /// </summary>
  /// <param name="charset">
  /// </param>
  /// <returns>
  /// </returns>
  private getCodePage(charset: number): number {
    let codePage: number = 0;

    if (this._codePageTable.ContainsKey(charset)) {
      codePage = this._codePageTable.get_Item(charset);
    }

    return codePage;
  }

  /// <summary> Get charset corresponding to the specified font index.
  ///
  /// </summary>
  /// <param name="font">
  /// </param>
  /// <returns>
  /// </returns>
  private getCharset(font: number): number {
    let charset: number = 0;

    if (this._charsetTable.ContainsKey(font)) {
      charset = this._charsetTable.get_Item(font);
    }
    return charset;
  }
}
