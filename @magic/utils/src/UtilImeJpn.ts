/// <summary>JPN: IME support
/// Utility Class for Input Method Editor
/// </summary>
/// <author>  Toshiro Nakayoshi (MSJ)
/// </author>


export class UtilImeJpn {
  private static IME_CMODE_ALPHANUMERIC: number = 0;
  private static IME_CMODE_NATIVE: number = 1;
  private static IME_CMODE_KATAKANA: number = 2;
  private static IME_CMODE_FULLSHAPE: number = 8;
  private static IME_CMODE_ROMAN: number = 16;
  private static IME_CMODE_NOCONVERSION: number = 256;
  private static IME_NOT_INITIALIZED: number = -1;
  static IME_ZEN_HIRAGANA_ROMAN: number = 1;
  static IME_FORCE_OFF: number = 15; // if (ImeMode property == 0 and (picture has K0 or PIC_S)) or
  // (attribute is not alpha, unicode, nor blob), set IME_FORCE_OFF.
  static IME_DISABLE: number = 10;   // to completely disable IME (even not allowing to change the mode)
  ImeAutoOff: boolean = false;
  StrImeRead: string = null;

  /// <summary> check if the IME mode is within valid range
  /// </summary>
  /// <param name="imeMode">(IME mode in Magic)
  /// </param>
  /// <returns> bool
  /// </returns>
  isValid(imeMode: number): boolean {
    return (0 <= imeMode && imeMode <= 9) || imeMode === 15 || imeMode === 10;
  }

  /// <summary> convert the input method editor mode
  /// </summary>
  /// <param name="imeMode">(IME mode in Magic)
  /// </param>
  /// <returns> imeConvMode (IME conversion mode in imm32.lib)
  /// </returns>
  private static imeMode2imeConvMode(imeMode: number): number {
    let result: number;
    switch (imeMode) {
      // IME_ZEN_HIRAGANA_ROMAN
      case 1:
        result = 25;
        break;

      // IME_ZEN_HIRAGANA
      case 2:
        result = 9;
        break;

      // IME_ZEN_KATAKANA_ROMAN
      case 3:
        result = 27;
        break;

      // IME_ZEN_KATAKANA
      case 4:
        result = 11;
        break;

      // IME_HAN_KATAKANA_ROMAN
      case 5:
        result = 19;
        break;

      // IME_HAN_KATAKANA
      case 6:
        result = 3;
        break;

      // IME_ZEN_ALPHANUMERIC
      case 7:
        result = 8;
        break;

      // IME_HAN_ALPHANUMERIC
      case 8:
      case 9:
        result = 0;
        break;

      // case 0:
      // case IME_DISABLE:
      // case IME_FORCE_OFF:
      default:
        result = 256;
        break;
    }
    return result;
  }

  constructor() {

  }
}
