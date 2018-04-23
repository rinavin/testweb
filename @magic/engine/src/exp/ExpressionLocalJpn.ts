import {StringBuilder} from "@magic/mscorelib";
import {StrUtil, UtilImeJpn, StorageAttribute, UtilDateJpn} from "@magic/utils";
import {ExpVal, Manager, NUM_TYPE, DisplayConvertor} from "@magic/gui";
import {ExpressionEvaluator} from "./ExpressionEvaluator";

/// <summary>
///   JPN: Class for Japanese extended functions
/// </summary>
/// <author>  Toshiro Nakayoshi (MSJ)
/// </author>
export class ExpressionLocalJpn {
  static tableZen2Han: string[][] =
    [
      [String.fromCharCode(0xff9e), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff9f), String.fromCharCode(0x0000)],
      [String.fromCharCode(0x309d), String.fromCharCode(0x0000)],
      [String.fromCharCode(0x309e), String.fromCharCode(0x0000)],
      [String.fromCharCode(0x309f), String.fromCharCode(0x0000)],
      [String.fromCharCode(0x30a0), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff67), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff71), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff68), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff72), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff69), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff73), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff6a), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff74), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff6b), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff75), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff76), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff76), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff77), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff77), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff78), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff78), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff79), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff79), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff7a), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff7a), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff7b), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff7b), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff7c), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff7c), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff7d), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff7d), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff7e), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff7e), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff7f), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff7f), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff80), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff80), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff81), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff81), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff6f), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff82), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff82), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff83), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff83), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff84), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff84), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff85), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff86), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff87), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff88), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff89), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff8a), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff8a), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff8a), String.fromCharCode(0xff9f)],
      [String.fromCharCode(0xff8b), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff8b), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff8b), String.fromCharCode(0xff9f)],
      [String.fromCharCode(0xff8c), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff8c), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff8c), String.fromCharCode(0xff9f)],
      [String.fromCharCode(0xff8d), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff8d), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff8d), String.fromCharCode(0xff9f)],
      [String.fromCharCode(0xff8e), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff8e), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff8e), String.fromCharCode(0xff9f)],
      [String.fromCharCode(0xff8f), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff90), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff91), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff92), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff93), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff6c), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff94), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff6d), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff95), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff6e), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff96), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff97), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff98), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff99), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff9a), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff9b), String.fromCharCode(0x0000)],
      [String.fromCharCode(0x30ee), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff9c), String.fromCharCode(0x0000)],
      [String.fromCharCode(0x30f0), String.fromCharCode(0x0000)],
      [String.fromCharCode(0x30f1), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff66), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff9d), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff73), String.fromCharCode(0xff9e)],
      [String.fromCharCode(0xff76), String.fromCharCode(0x0000)],
      [String.fromCharCode(0xff79), String.fromCharCode(0x0000)]
    ];


  /// <summary>
  ///   mapping table of Japanese characters #2
  ///   convert from zenkaku (exceptional) to hankaku
  ///
  ///   row index: no special meaning
  ///   column #1: zenkaku(full-width) code
  ///   column #2: hankaku(half-width) code
  /// </summary>
  static tableExceptZen2Han: string[][] =
    [
      [String.fromCharCode(0x2018), String.fromCharCode(0x0060)],
      [String.fromCharCode(0x2019), String.fromCharCode(0x0027)],
      [String.fromCharCode(0x201D), String.fromCharCode(0x0022)],
      [String.fromCharCode(0x3000), String.fromCharCode(0x0020)],
      [String.fromCharCode(0x3001), String.fromCharCode(0xFF64)],
      [String.fromCharCode(0x3002), String.fromCharCode(0xFF61)],
      [String.fromCharCode(0x300C), String.fromCharCode(0xFF62)],
      [String.fromCharCode(0x300D), String.fromCharCode(0xFF63)],
      [String.fromCharCode(0x30FB), String.fromCharCode(0xFF65)],
      [String.fromCharCode(0x30FC), String.fromCharCode(0xFF70)],
      [String.fromCharCode(0xFFE5), String.fromCharCode(0x005C)]
    ];


  /// <summary>
  ///   mapping table of Japanese characters #3
  ///   convert from hankaku (0xff61 ~ 0xff9f) to zenkaku
  ///
  ///   row index: hankaku(half-width) code -(minus) 0xff61
  ///   column:    zenkaku(full-width) code
  /// </summary>
  static tableHan2Zen: string[] =
    [
      String.fromCharCode(0x3002), String.fromCharCode(0x300c), String.fromCharCode(0x300d),
      String.fromCharCode(0x3001), String.fromCharCode(0x30fb), String.fromCharCode(0x30f2),
      String.fromCharCode(0x30a1), String.fromCharCode(0x30a3), String.fromCharCode(0x30a5),
      String.fromCharCode(0x30a7), String.fromCharCode(0x30a9), String.fromCharCode(0x30e3),
      String.fromCharCode(0x30e5), String.fromCharCode(0x30e7), String.fromCharCode(0x30c3),
      String.fromCharCode(0x30fc), String.fromCharCode(0x30a2), String.fromCharCode(0x30a4),
      String.fromCharCode(0x30a6), String.fromCharCode(0x30a8), String.fromCharCode(0x30aa),
      String.fromCharCode(0x30ab), String.fromCharCode(0x30ad), String.fromCharCode(0x30af),
      String.fromCharCode(0x30b1), String.fromCharCode(0x30b3), String.fromCharCode(0x30b5),
      String.fromCharCode(0x30b7), String.fromCharCode(0x30b9), String.fromCharCode(0x30bb),
      String.fromCharCode(0x30bd), String.fromCharCode(0x30bf), String.fromCharCode(0x30c1),
      String.fromCharCode(0x30c4), String.fromCharCode(0x30c6), String.fromCharCode(0x30c8),
      String.fromCharCode(0x30ca), String.fromCharCode(0x30cb), String.fromCharCode(0x30cc),
      String.fromCharCode(0x30cd), String.fromCharCode(0x30ce), String.fromCharCode(0x30cf),
      String.fromCharCode(0x30d2), String.fromCharCode(0x30d5), String.fromCharCode(0x30d8),
      String.fromCharCode(0x30db), String.fromCharCode(0x30de), String.fromCharCode(0x30df),
      String.fromCharCode(0x30e0), String.fromCharCode(0x30e1), String.fromCharCode(0x30e2),
      String.fromCharCode(0x30e4), String.fromCharCode(0x30e6), String.fromCharCode(0x30e8),
      String.fromCharCode(0x30e9), String.fromCharCode(0x30ea), String.fromCharCode(0x30eb),
      String.fromCharCode(0x30ec), String.fromCharCode(0x30ed), String.fromCharCode(0x30ef),
      String.fromCharCode(0x30f3), String.fromCharCode(0x309b), String.fromCharCode(0x309c)
    ];


  private _expressionEvaluator: ExpressionEvaluator = null;

  constructor(expressionEvaluator: ExpressionEvaluator) {
    this._expressionEvaluator = expressionEvaluator;
  }

  /// <summary>
  ///   HAN: Convert a string from zenkaku(full-width) to hankaku(half-width)
  /// </summary>
  /// <param name = "strVal:">zenkaku string
  /// </param>
  /// <returns> hanakaku string
  /// </returns>
  eval_op_han(strVal: string): string {
    let strbufZenkaku: StringBuilder = new StringBuilder(StrUtil.rtrim(strVal));
    let strbufHankaku: StringBuilder = new StringBuilder(0);
    let strRet: string = null;

    for (let i: number = 0; i < strbufZenkaku.Length; i = i + 1) {
      let cLetter: string = strbufZenkaku.get_Item(i);

      // digit, alphabet and etc.
      if (0xff01 <= cLetter.charCodeAt(0) && cLetter.charCodeAt(0) <= 0xff5e && cLetter.charCodeAt(0) !== 0xff3c && cLetter.charCodeAt(0) !== 0xff40) {
        strbufHankaku.Append(String.fromCharCode(cLetter.charCodeAt(0) - 0xfee0));
      }
      // katakana
      else if (0x309b <= cLetter.charCodeAt(0) && cLetter.charCodeAt(0) <= 0x30f6) {
        strbufHankaku.Append(ExpressionLocalJpn.tableZen2Han[cLetter.charCodeAt(0) - 0x309b][0]);

        if (ExpressionLocalJpn.tableZen2Han[cLetter.charCodeAt(0) - 0x309b][1].charCodeAt(0) > 0x0000) {
          strbufHankaku.Append(ExpressionLocalJpn.tableZen2Han[cLetter.charCodeAt(0) - 0x309b][1]);
        }
      }
      // others
      else {
        let j: number;
        for (j = 0; j < ExpressionLocalJpn.tableExceptZen2Han.length; j++) {
          if (cLetter === ExpressionLocalJpn.tableExceptZen2Han[j][0]) {
            strbufHankaku.Append(ExpressionLocalJpn.tableExceptZen2Han[j][1]);
            break;
          }
        }
        if (j === ExpressionLocalJpn.tableExceptZen2Han.length)
          strbufHankaku.Append(cLetter);
      }
    }

    strRet = strbufHankaku.ToString();

    strbufZenkaku = null;
    strbufHankaku = null;

    return strRet;
  }

  /// <summary>
  ///   ZEN/ZENS: Convert a string from hankaku(half-width) to zenkaku(full-width)
  /// </summary>
  /// <param name = "strVal:">hankaku string
  /// </param>
  /// <param name = "mode:">specify how to convert a hankaku space
  ///   0 = to hankaku space x 1
  ///   1 = to zenkaku space x 1
  ///   2 = to hankaku space x 2
  /// </param>
  /// <returns> zenkaku string
  /// </returns>
  eval_op_zens(strVal: string, mode: number): string {
    let strbufHankaku: StringBuilder = new StringBuilder(StrUtil.rtrim(strVal));
    let strbufZenkaku: StringBuilder = new StringBuilder(0);
    let strRet: string = null;

    for (let i: number = 0; i < strbufHankaku.Length; i = i + 1) {
      let cLetter: string = strbufHankaku.get_Item(i);

      // space, digit, alphabet and etc.
      if (0x0020 <= cLetter.charCodeAt(0) && cLetter.charCodeAt(0) <= 0x007e) {

        switch (cLetter) {
          case String.fromCharCode(0x0020): // space
            if (mode === 1) {
              strbufZenkaku.Append(String.fromCharCode(0x3000)); // zenkaku space x 1/BrowserClient/
            }
            else if (mode === 2) {
              strbufZenkaku.Append(String.fromCharCode(0x0020)); // hankaku space x 2
              strbufZenkaku.Append(String.fromCharCode(0x0020));
            }
            /* mode == 0 */
            else {
              strbufZenkaku.Append(String.fromCharCode(0x0020)); // hankaku space x 1
            }
            break;


          case String.fromCharCode(0x0022): // "
            strbufZenkaku.Append(String.fromCharCode(0x201d));
            break;


          case String.fromCharCode(0x0027): // '
            strbufZenkaku.Append(String.fromCharCode(0x2019));
            break;


          case String.fromCharCode(0x005c): // \
            strbufZenkaku.Append(String.fromCharCode(0xffe5));
            break;


          case String.fromCharCode(0x0060): // `
            strbufZenkaku.Append(String.fromCharCode(0x2018));
            break;


          default:
            strbufZenkaku.Append(String.fromCharCode(cLetter.charCodeAt(0) + 0xfee0));
            break;
        }
      }
      // kutouten, katakana and etc.
      else if (0xff61 <= cLetter.charCodeAt(0) && cLetter.charCodeAt(0) <= 0xff9f) {
        let cCombine: string = String.fromCharCode(0x0000); // flag of dakuon or han-dakuon

        if ((i + 1) < strbufHankaku.Length) {
          // check the next letter
          cCombine = strbufHankaku.get_Item(i + 1);
          if (cCombine.charCodeAt(0) !== 0xff9e && cCombine.charCodeAt(0) !== 0xff9f)
            cCombine = String.fromCharCode(0x0000);
        }

        if (cCombine.charCodeAt(0) === 0xff9e)
        // symbol of dakuon
        {
          if (0xff76 <= cLetter.charCodeAt(0) && cLetter.charCodeAt(0) <= 0xff84 || 0xff8a <= cLetter.charCodeAt(0) && cLetter.charCodeAt(0) <= 0xff8e)
            strbufZenkaku.Append((ExpressionLocalJpn.tableHan2Zen[cLetter.charCodeAt(0) - 0xff61] + 0x001));
          else if (cLetter.charCodeAt(0) === 0xff73)
            strbufZenkaku.Append(String.fromCharCode(0x30f4));
          else
            cCombine = String.fromCharCode(0x0000); // the symbol is independent
        }
        else if (cCombine.charCodeAt(0) === 0xff9f)
        // symbol of han-dakuon
        {
          if (0xff8a <= cLetter.charCodeAt(0) && cLetter.charCodeAt(0) <= 0xff8e)
            strbufZenkaku.Append((ExpressionLocalJpn.tableHan2Zen[cLetter.charCodeAt(0) - 0xff61] + 0x002));
          else
            cCombine = String.fromCharCode(0x0000); // the symbol is independent
        }

        if (cCombine.charCodeAt(0) !== 0x0000)
          i++;
        else
          strbufZenkaku.Append(ExpressionLocalJpn.tableHan2Zen[cLetter.charCodeAt(0) - 0xff61]);
      }
      // others
      else {
        strbufZenkaku.Append(cLetter);
      }
    }

    strRet = strbufZenkaku.ToString();

    strbufHankaku = null;
    strbufZenkaku = null;

    return strRet;
  }

  /// <summary>
  ///   ZIMERead: return composition string in IME
  /// </summary>
  eval_op_zimeread(dummy: number): string {
    let strRet: string = null;
    let utilImeJpn: UtilImeJpn = Manager.UtilImeJpn;

    if (utilImeJpn !== null)
      strRet = utilImeJpn.StrImeRead;

    return strRet;
  }

  /// <summary>
  ///   ZKANA: Convert a string from hiragana to katakana (and vice versa)
  /// </summary>
  /// <param name = "strVal:">hankaku(or katakana) string
  /// </param>
  /// <param name = "mode:">specify the direction of conversion
  ///   0 = from hiragana to katakana
  ///   1 = from katakana to hiragana
  /// </param>
  /// <returns> katakana(or hiragana) string
  /// </returns>
  eval_op_zkana(strVal: string, mode: number): string {
    let strbufConverted: StringBuilder = new StringBuilder(StrUtil.rtrim(strVal));
    let strRet: string = null;

    for (let i: number = 0; i < strbufConverted.Length; i = i + 1) {
      let cLetter: string = strbufConverted.get_Item(i);

      if (mode === 0) {
        // hiragana --> katakana
        if (0x3041 <= cLetter.charCodeAt(0) && cLetter.charCodeAt(0) <= 0x3093)
          strbufConverted.set_Item(i, String.fromCharCode(cLetter.charCodeAt(0) + 0x0060));
      }
      // katakana --> hiragana
      else {
        if (0x30A1 <= cLetter.charCodeAt(0) && cLetter.charCodeAt(0) <= 0x30f3)
          strbufConverted.set_Item(i, String.fromCharCode(cLetter.charCodeAt(0) - 0x0060));
      }
    }
    strRet = strbufConverted.ToString();
    strbufConverted = null;

    return strRet;
  }

  /// <summary>
  ///   JCDOW: Japanese version of CDOW
  /// </summary>
  eval_op_jcdow(resVal: ExpVal, val1: NUM_TYPE, displayConvertor: DisplayConvertor): void {
    this._expressionEvaluator.eval_op_date_str(resVal, val1, "SSSSSST", displayConvertor);
  }

  /// <summary>
  ///   JMONTH: Japanese version of NMONTH
  /// </summary>
  eval_op_jmonth(resVal: ExpVal, val1: ExpVal): void {
    if (val1.MgNumVal === null) {
      this._expressionEvaluator.SetNULL(resVal, StorageAttribute.ALPHA);
      return;
    }

    val1.MgNumVal = this._expressionEvaluator.mul_add(val1.MgNumVal, 31, -30);
    this._expressionEvaluator.eval_op_month(resVal, val1);
    let month: number = resVal.MgNumVal.NUM_2_LONG();

    resVal.Attr = StorageAttribute.ALPHA;
    resVal.StrVal = UtilDateJpn.convertStrMonth(month);
  }

  /// <summary>
  ///   JNDOW: Japanese version of NDOW
  /// </summary>
  eval_op_jndow(resVal: ExpVal, val1: ExpVal, displayConvertor: DisplayConvertor): void {
    if (val1.MgNumVal === null) {
      this._expressionEvaluator.SetNULL(resVal, StorageAttribute.ALPHA);
      return;
    }

    val1.MgNumVal = this._expressionEvaluator.mul_add(val1.MgNumVal, 0, 6);
    this.eval_op_jcdow(resVal, val1.MgNumVal, displayConvertor);
  }

  /// <summary>
  ///   JYEAR: Return Japanese year of an era
  /// </summary>
  eval_op_jyear(resVal: ExpVal, val1: ExpVal): void {
    this._expressionEvaluator.eval_op_date_brk(resVal, val1.MgNumVal, 4);
  }

  /// <summary>
  ///   JGENGO: Return Japanese gengo (the name of an era)
  /// </summary>
  eval_op_jgengo(resVal: ExpVal, val1: NUM_TYPE, val2: NUM_TYPE, displayConvertor: DisplayConvertor): void {
    let strFormat: string;

    resVal.Attr = StorageAttribute.ALPHA;

    if (val1 === null || val2 === null) {
      this._expressionEvaluator.SetNULL(resVal, StorageAttribute.ALPHA);
      return;
    }

    let intType: number = val2.NUM_2_LONG();

    if (intType >= 4)
      strFormat = "JJJJ";
    else if (intType >= 2)
      strFormat = "JJ";
    else if (intType >= 1)
      strFormat = "J";
    else {
      resVal.StrVal = "";
      return;
    }

    this._expressionEvaluator.eval_op_date_str(resVal, val1, strFormat, displayConvertor);
  }
}
