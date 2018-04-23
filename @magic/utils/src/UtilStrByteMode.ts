/// <summary>JPN: DBCS support
/// Utility Class for String
/// In this class, considering DBCS, strings are counted by the number
/// of bytes, not the number of characters.
/// </summary>
/// <author>  Toshiro Nakayoshi (MSJ) </author>
import {NString, Encoding, StringBuilder} from "@magic/mscorelib";

export class UtilStrByteMode  {
  public static Encoding: Encoding = Encoding.UTF8;
    // TODO : need to check what to do with CultureInfo
  static twoLetterISOLanguageName: string = " ";
  private static _bLocaleDefLangJPN: boolean = (UtilStrByteMode.twoLetterISOLanguageName === "ja");
  private static _bLocaleDefLangCHN: boolean = (UtilStrByteMode.twoLetterISOLanguageName === "zh");
  private static _bLocaleDefLangKOR: boolean = (UtilStrByteMode.twoLetterISOLanguageName === "ko");

  /// <summary> Checks the environment whether it is running on DBCS environment
  /// Returns true if the language code for the current default Locale is
  /// DBCS language (in non-Unicode encoding).
  ///
  /// </summary>
  /// <returns> true if DBCS, or false if SBCS
  /// </returns>
  static isLocaleDefLangDBCS(): boolean {
    return UtilStrByteMode._bLocaleDefLangJPN || UtilStrByteMode._bLocaleDefLangCHN || UtilStrByteMode._bLocaleDefLangKOR;
  }

  /// <summary> Checks whether the language code for the current default Locale
  /// is JAPANESE.
  ///
  /// </summary>
  /// <returns> true if JAPANESE, or false if not
  /// </returns>
  static isLocaleDefLangJPN(): boolean {
    return UtilStrByteMode._bLocaleDefLangJPN;
  }

  /// <summary> Checks whether the language code for the current default Locale
  /// is KOREAN.
  ///
  /// </summary>
  /// <returns> true if KOREAN, or false if not
  /// </returns>
  static isLocaleDefLangKOR(): boolean {
    return UtilStrByteMode._bLocaleDefLangKOR;
  }

  static isKoreanCharacter(c: number): boolean {
    return (44032 <= /*'가'*/c && c <= 55203/*'힣'*/) || (4352 <= /*'ᄀ'*/c && c <= 4607/*'ᇿ'*/) || (12592 <= /*'㄰'*/c && c <= 12687/*'㆏'*/) || (43360 <= /*'ꥠ'*/c && c <= 43391/*'꥿'*/) || (55216 <= /*'ힰ'*/c && c <= 55295/*'퟿'*/);
  }

  /// <summary> Length of String
  /// Returns the number of bytes (in default encoding).
  ///
  /// </summary>
  /// <param name="strVal:">string (in Unicode)
  /// </param>
  /// <returns> the number of bytes (in default encoding)
  ///
  /// Example: lenB("abXYc")
  /// Where 'a', 'b' and  'c' are SBCS, and 'X' and 'Y' are DBCS, it returns
  /// 7.
  /// </returns>
  static lenB(strVal: string): number {
    // convert to byte[] by default-encoding
    return UtilStrByteMode.Encoding.GetByteCount(strVal);
  }

  /// <summary> Substring of String
  /// Extracts a specified number of characters (a substring) from a string.
  /// If a DBCS character is divided in two, it will be replace to a space.
  ///
  /// </summary>
  /// <param name="strVal:">string (in Unicode)
  /// </param>
  /// <param name="ofs:">starting position (byte) of the substring
  /// </param>
  /// <param name="len:">number of bytes to be extracted (i.e. bytes of substring)
  /// </param>
  /// <returns> substring
  ///
  /// Example: midB("abXYc", 2, 4)
  /// Where 'a', 'b' and  'c' are SBCS, and 'X' and 'Y' are DBCS, it returns
  /// "bX ".
  /// </returns>
  static midB(strVal: string, ofs: number, len: number): string {
    let intValidMaxIndex: number = -1; // param #1 of substring
    let intValidMinIndex: number = -1; // param #2 of substring
    let bHeadSpace: boolean = false;   // flag: need to add space
    let bEndSpace: boolean = false;    // flag: need to add space

    let strRet: string;

    // check and modify ofs & len
    if (len <= 0)
      return "";

    if (ofs <= 0) {
      ofs = 0;
      intValidMinIndex = 0;
      bHeadSpace = false;
    }

    let intByteLength: number = UtilStrByteMode.lenB(strVal);

    if (intByteLength < ofs)
      return "";

    let LenMax: number = intByteLength - ofs;
    if (LenMax < len)
      len = LenMax;

    // set MinIndex and MaxIndex for substring
    intByteLength = 0;

    for (let intIndex: number = 0; intIndex < strVal.length; intIndex = intIndex + 1) {
      let s: string = strVal.substr(intIndex, 1);
      intByteLength = intByteLength + UtilStrByteMode.Encoding.GetByteCount(s);

      if (intValidMinIndex === -1) {
        if (intByteLength === ofs) {
          intValidMinIndex = intIndex + 1;
          bHeadSpace = false;
        }
        else if (intByteLength > ofs) {
          intValidMinIndex = intIndex + 1;
          bHeadSpace = true;
        }
      }

      if (intValidMaxIndex === -1) {
        if (intByteLength === ofs + len) {
          intValidMaxIndex = intIndex;
          bEndSpace = false;
          break;
        }
        else if (intByteLength > ofs + len) {
          intValidMaxIndex = intIndex - 1;
          bEndSpace = true;
          break;
        }
      }
    }

    // prepare for substring
    let strbufAddingBuf: StringBuilder = new StringBuilder(len);

    // execute Mid
    if (bHeadSpace) {
      strbufAddingBuf.Append(' ');
    }

    if (intValidMinIndex <= intValidMaxIndex) {
      strbufAddingBuf.Append(strVal.substr(intValidMinIndex, intValidMaxIndex + 1 - intValidMinIndex));
    }

    if (bEndSpace) {
      strbufAddingBuf.Append(' ');
    }

    strRet = strbufAddingBuf.ToString();
    strbufAddingBuf = null;

    return strRet;
  }

  /// <summary> Get Characters from Left of String
  /// Returns a specified number of bytes from the left side of a string.
  /// If a DBCS character is divided in two, it will be replace to a space.
  ///
  /// </summary>
  /// <param name="strVal:">string (in Unicode)
  /// </param>
  /// <param name="len:">number of bytes to be retured
  /// </param>
  /// <returns> output string
  ///
  /// Example: leftB("abXYc", 4)
  /// Where 'a', 'b' and  'c' are SBCS, and 'X' and 'Y' are DBCS, it returns
  /// "abX".
  /// </returns>
  static leftB(strVal: string, len: number): string {
    return UtilStrByteMode.midB(strVal, 0, len);
  }

  /// <summary> Get Characters from Right of String
  /// Returns a specified number of bytes from the right side of a string.
  /// If a DBCS character is divided in two, it will be replace to a space.
  ///
  /// </summary>
  /// <param name="strVal:">string (in Unicode)
  /// </param>
  /// <param name="len:">number of bytes to be retured
  /// </param>
  /// <returns> output string
  ///
  /// Example: rightB("abXYc", 4)
  /// Where 'a', 'b' and  'c' are SBCS, and 'X' and 'Y' are DBCS, it returns
  /// " Yc".
  /// </returns>
  static rightB(strVal: string, len: number): string {
    let byteFldsValLen: number = UtilStrByteMode.lenB(strVal);

    if (len < 0) {
      len = 0;
    }
    let ofs: number = byteFldsValLen - len;
    if (ofs < 0) {
      ofs = 0;
    }
    return UtilStrByteMode.midB(strVal, ofs, len);
  }

  /// <summary> Insert String
  /// Inserts one string into another.
  /// If a DBCS character is divided in two, it will be replace to a space.
  ///
  /// </summary>
  /// <param name="strTarget:">A string that represents the target string.
  /// </param>
  /// <param name="strSource:">A string that represents the source string.
  /// </param>
  /// <param name="ofs:">A number that represents the starting position (byte) in
  /// the target.
  /// </param>
  /// <param name="len:">A number that represents the number of bytes from the
  /// source that will be inserted into the target.
  /// </param>
  /// <returns> output string
  ///
  /// Example: insB("abXYc", "de", 4, 1)
  /// Where 'a', 'b', 'c', 'd' and 'e' are SBCS, and 'X' and 'Y' are DBCS,
  /// it returns "ab d Yc".
  /// </returns>
  static insB(strTarget: string, strSource: string, ofs: number, len: number): string {

    if (ofs < 0) {
      ofs = 0;
    }
    else {
      if (ofs >= 1) {
        ofs = ofs - 1;
      }
    }

    if (len < 0) {
      len = 0;
    }
    let intTargetLenB: number = UtilStrByteMode.lenB(strTarget);
    let intSourceLenB: number = UtilStrByteMode.lenB(strSource);
    let strbufRetVal: StringBuilder = new StringBuilder(ofs + len);

    strbufRetVal.Append(UtilStrByteMode.leftB(strTarget, ofs));
    for (let intAddSpaceLen: number = ofs - intTargetLenB; intAddSpaceLen > 0; intAddSpaceLen = intAddSpaceLen - 1) {
      strbufRetVal.Append(' ');
    }
    strbufRetVal.Append(UtilStrByteMode.leftB(strSource, len));
    for (let i: number = len - intSourceLenB; i > 0; i = i - 1) {
      strbufRetVal.Append(' ');
    }
    strbufRetVal.Append(UtilStrByteMode.rightB(strTarget, intTargetLenB - ofs));
    return strbufRetVal.ToString();
  }

  /// <summary> Delete Characters
  /// Delete characters from a string.
  /// If a DBCS character is divided in two, it will be replace to a space.
  ///
  /// </summary>
  /// <param name="strVal:">string (in Unicode)
  /// </param>
  /// <param name="ofs:">The position (byte) of the first character to be deleted.
  /// </param>
  /// <param name="len:">The number of characters to be deleted, beginning with
  /// position start and proceeding rightward.
  /// </param>
  /// <returns> output string
  ///
  /// Example: delB("abXYc", 2, 4)
  /// Where 'a', 'b' and  'c' are SBCS, and 'X' and 'Y' are DBCS, it returns
  /// "a c".
  /// </returns>
  static delB(strVal: string, ofs: number, len: number): string {

    if (ofs < 0) {
      ofs = 0;
    }
    else {
      if ( ofs >= 1) {
        ofs = ofs - 1;
      }
    }
    let intValLenB: number = UtilStrByteMode.lenB(strVal);
    if (ofs + len > intValLenB) {
      len = intValLenB - ofs;
    }
    let strRet: string;
    if (len <= 0) {
      strRet = strVal;
    }
    else {
      let intRightSideLenB: number = intValLenB - ofs - len;
      if (intRightSideLenB < 0) {
        strRet = strVal;
      }
      else {
        let strbufRetVal: StringBuilder = new StringBuilder(ofs + intRightSideLenB);
        strbufRetVal.Append(UtilStrByteMode.leftB(strVal, ofs));
        strbufRetVal.Append(UtilStrByteMode.rightB(strVal, intRightSideLenB));
        strRet = strbufRetVal.ToString();
      }
    }
    return strRet;
  }

  /// <summary> In-String Search
  /// Returns a number that represents the first position (byte) of a
  /// substring within a string.
  ///
  /// </summary>
  /// <param name="strTarget:">string (in Unicode)
  /// </param>
  /// <param name="strSearch:">string which will be the search argument in string
  /// </param>
  /// <returns> number, 0 if not found
  ///
  /// Example: instrB("abXYc", "Y")
  /// Where 'a', 'b' and  'c' are SBCS, and 'X' and 'Y' are DBCS, it returns
  /// 5.
  /// </returns>
  static instrB(strTarget: string, strSearch: string): number {

    if (strSearch.length === 0) {
      // nothing to look for
      return 0;
    }

    let ofs: number = strTarget.indexOf(strSearch);

    if (ofs < 0) {
      // not found
        return 0;
      }

    return UtilStrByteMode.lenB(strTarget.substr(0, ofs)) + 1;
  }

  /// <summary> Replace Substring Within a String (Byte Mode)
  /// Replaces a substring within a string with another substring.
  /// If a DBCS character is divided in two, it will be replace to a space.
  ///
  /// </summary>
  /// <param name="strTarget:">target string where the replacement will take place.
  /// </param>
  /// <param name="strOrigin:">string that provides the substring to be copied to
  /// target.
  /// </param>
  /// <param name="ofs:">the first position (byte) in the target string that will
  /// receive the substring from origin.
  /// </param>
  /// <param name="len:">the number of bytes that will be moved from origin to
  /// target, starting from the leftmost character of origin.
  /// </param>
  /// <returns> string containing modified target string
  ///
  /// Example: repB("abXYc", "de", 4, 2)
  /// Where 'a', 'b', 'c', 'd' and 'e' are SBCS, and 'X' and 'Y' are DBCS,
  /// it returns "ab de c".
  /// </returns>
  static repB(strTarget: string, strOrigin: string, ofs: number, len: number): string {
    let strbufAddingBuf: StringBuilder = new StringBuilder();

    if (ofs < 0) {
      ofs = 0;
    }
    else {
      if (ofs >= 1) {
        ofs = ofs - 1;
      }
    }
    if (len < 0) {
      len = 0;
    }
    strbufAddingBuf.Append(UtilStrByteMode.leftB(strTarget, ofs));

    let intAddSpaceLen: number = ofs - UtilStrByteMode.lenB(strTarget);
    for (; intAddSpaceLen > 0; intAddSpaceLen--)
      strbufAddingBuf.Append(' ');


    strbufAddingBuf.Append(UtilStrByteMode.leftB(strOrigin, len));

    let intRightLen: number = UtilStrByteMode.lenB(strTarget) - (ofs + len);
    if (intRightLen > 0) {
      strbufAddingBuf.Append(UtilStrByteMode.rightB(strTarget, intRightLen));
    }

    // add blanks to the end
    intAddSpaceLen = len - UtilStrByteMode.lenB(strOrigin);
    for (; intAddSpaceLen > 0; intAddSpaceLen--) {
      strbufAddingBuf.Append(' ');
    }

    return strbufAddingBuf.ToString();
  }

  /// <summary> Replace Substring Within a String (Character Mode)
  /// Replaces a substring within a string with another substring.
  ///
  /// </summary>
  /// <param name="strTarget:">target string where the replacement will take place.
  /// </param>
  /// <param name="strOrigin:">string that provides the substring to be copied to
  /// target.
  /// </param>
  /// <param name="ofs:">the first position (character) in the target string that
  /// will receive the substring from origin.
  /// </param>
  /// <param name="len:">the number of characters that will be moved from origin
  /// to target, starting from the leftmost character of origin.
  /// </param>
  /// <returns> string containing modified target string
  ///
  /// Example: repB("abXYc", "de", 4, 2)
  /// Whether each character is SBCS or DBCS, it returns "abXde".
  /// </returns>
  static repC(strTarget: string, strOrigin: string, ofs: number, len: number): string {
    let strbufAddingBuf: StringBuilder = new StringBuilder();
    if (ofs < 0) {
      ofs = 0;
    }
    else {
      if (ofs >= 1) {
        ofs = ofs - 1;
      }
    }
    if (len < 0) {
      len = 0;
    }
    strbufAddingBuf.Append(strTarget.substr(0, ofs));

    // add blanks between strTarget and strOrigin
    let intAddSpaceLen: number = ofs - strTarget.length;
    for (; intAddSpaceLen > 0; intAddSpaceLen--)
      strbufAddingBuf.Append(' ');

    strbufAddingBuf.Append(strOrigin.substr(0, len));

    let intRightLen: number = strTarget.length - (ofs + len);

    if (intRightLen > 0) {
      strbufAddingBuf.Append(strTarget.substr(ofs + len));
    }
    for (let i: number = len - strOrigin.length; i > 0; i = i - 1) {
      strbufAddingBuf.Append(' ');
    }
    return strbufAddingBuf.ToString();
  }

  /// <summary> Checks whether a character is 1 byte (halfwidth) or not (fullwidth)
  /// Returns true if the character is represented by 1 byte in non-Unicode
  /// encoding.
  /// </summary>
  /// <param name="letter:">a character to be checked.
  /// </param>
  /// <returns> true if the character is halfwidth (SBCS), or false if it is
  /// fullwidth (DBCS).
  /// </returns>
  static isHalfWidth(str: string): boolean {

    let letter: number = str.charCodeAt(0);
    if (32 <= /*' '*/letter && letter <= 126/*'~'*/) {
      return true
    }
    else {
      let len: number = UtilStrByteMode.lenB(str);
      if (len === 1)
        return true;
    }
    return false;
  }

  /// <summary> Checks whether a character is halfwidth digit letter
  /// Do not use "Character.isDigit" which cannot distinguish between
  /// halfwidth digit letter(SBCS) and fullwidth difit letter(DBCS).
  /// </summary>
  /// <param name="letter:">a character to be checked.
  /// </param>
  /// <returns> true if the character is halfwidth digit letter, or
  /// false if it is DBCS or not digit letter.
  /// </returns>
  static isDigit(letter: string): boolean {
    return 48 <= /*'0'*/letter.charCodeAt(0) && letter.charCodeAt(0) <= 57/*'9'*/;
  }

  /// <summary>Checks whether a character is one of those supported for # Alpha Mask</summary>
  /// <param name="letter:">a character to be checked.
  /// </param>
  /// <returns> true if the character is halfwidth digit letter, or
  /// false if it is DBCS or not digit letter.
  /// </returns>
  static asNumeric(letter: string): boolean {
    let result: boolean;
    switch (letter.charCodeAt(0)) {
      case 42:/*'*'*/
      case 43:/*'+'*/
      case 44:/*','*/
      case 45:/*'-'*/
      case 46:/*'.'*/
      case 47:/*'/'*/
        result = true;
        break;
      default:
        result = false;
        break;
    }
    return result;
  }

  /// <summary> Converts a position for the 1st string (Source) to a position for
  /// the 2nd string (Dest).
  /// If a double byte character exists in the strings, the position for the
  /// Source could be different from the position for the Dest.
  /// (DBCS Support)
  ///
  /// </summary>
  /// <param name="strSource:">Source string
  /// </param>
  /// <param name="strDest:">Dest string
  /// </param>
  /// <param name="pos:">position in the Source string
  /// </param>
  /// <param name="isAdvance:">advance or retreat the ret pos if a DBCS char is split
  /// </param>
  /// <returns> position in the Dest string
  ///
  /// Example: convPos("abcYZ", "YZabc", 4)
  /// It returns 4, if the all characters in the strings are SBCS.
  ///
  /// If 'a', 'b' and 'c' are SBCS, and 'Y' and 'Z' are DBCS, it
  /// returns 3.
  /// pos
  /// Unicode index  0 1 2  3  [4]
  /// +-------------+
  /// Source string |a|b|c| Y | Z |
  /// +-------------+
  /// ANSI index     0 1 2 3 4[5]6
  /// +-------------+
  /// Dest string   | Y | Z |a|b|c|
  /// +-------------+
  /// Unicode index   0   1  2[3]4
  /// ret
  /// </returns>
  static convPos(strSource: string, strDest: string, pos: number, isAdvance: boolean): number {
    let retPos: number;
    if (pos < 0)
      return 0;

    if (pos > strSource.length)
      pos = strSource.length;

      // add blanks to the Dest string if it is shorter than the Src string
      let diffLen: number = UtilStrByteMode.lenB(strSource) - UtilStrByteMode.lenB(strDest);
      if (diffLen > 0) {
        let stringBuilder: StringBuilder = new StringBuilder(strDest);
        for (; diffLen > 0; diffLen--)
          stringBuilder.Append(' ');

        strDest = stringBuilder.ToString();
      }

      let byteSource: Uint8Array = UtilStrByteMode.Encoding.GetBytes(strSource.substr(0, pos));
      let strLeftB: string = UtilStrByteMode.leftB(strDest, byteSource.length);
      retPos = strLeftB.length;
      if (!isAdvance && retPos > 0 && strLeftB.charCodeAt(retPos - 1) === 32/*' '*/ && strDest.charCodeAt(retPos - 1) !== 32/*' '*/) {
        retPos = retPos - 1;
      }

    return retPos;
  }
  /// <summary> return the number of characters of picture which corresponds to
  /// given string.
  /// </summary>
  /// <param name="str:">given string
  /// </param>
  /// <param name="picture:">picture
  /// </param>
  /// <returns> minimal length of picture
  /// Example: getMinLenPicture("ZZ20/11/", "JJJJYY/MM/DD") [ZZ is DBCS]
  /// It returns 10.
  /// </returns>
  /// (DBCS Support)
  static getMinLenPicture(str: string, picture: string): number {
    let len: number = 0;

    if (UtilStrByteMode.lenB(picture) - UtilStrByteMode.lenB(str) > 0) {
      len = UtilStrByteMode.convPos(str, picture, str.length, false);
    }
    else
      len = picture.length;

    return len;
  }

  /// <summary>
  /// </summary> Compares two specified strings in the DBCS sort order and returns an integer
  /// that indicates their relative position.
  /// <param name="str1:">The first string to compare.
  /// </param>
  /// <param name="str2:">The second string to compare.
  /// </param>
  /// <returns>an integer that indicates the lexical relationship between the two strings.
  ///  -1: str1 is less than str2.
  ///   0: str1 equals str2.
  ///   1: str1 is greater than str2.
  /// </returns>
  static strcmp(str1: string, str2: string): number {
    let array1: Uint8Array = UtilStrByteMode.Encoding.GetBytes(str1);
    let array2: Uint8Array = UtilStrByteMode.Encoding.GetBytes(str2);

    for (let i: number = 0; i < array1.length && i < array2.length; i++) {
      if (array1[i] > array2[i]) {
        return 1;
      }
      else if (array1[i] < array2[i]) {
          return -1;
        }
      }

    if (array1.length > array2.length)
      return 1;

    if (array1.length < array2.length)
      return -1;
    else
      return 0;
  }
}
