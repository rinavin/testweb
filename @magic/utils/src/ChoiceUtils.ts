import {NString, StringBuilder} from "@magic/mscorelib";
import {SEQ_2_STR, StrUtil} from "./StrUtil";

export class ChoiceUtils {

  /// <summary>
  ///   init the display Value from string
  /// </summary>
  /// <param name = "choiceDispStr">the all substring separated with comma.
  ///   The behavior:
  ///   a. when have "\" before char a-z need to ignore the \ put the a-z char
  ///   b. when "\," -> ","
  ///   c. when "\-" -> "-"
  ///   d. when "\\" -> "\"
  ///   e. when "\\\\" -> "\\"
  ///   the display can be all string. and we don't need to check validation according to the dataType(as we do in Link
  /// </param>
  static GetDisplayListFromString(choiceDispStr: string, removeAccelerators: boolean, shouldMakePrintable: boolean, shouldTrimOptions: boolean): string[] {
    let fromHelp = new Array("\\\\", "\\-", "\\,");
    let toHelp = new Array("XX", "XX", "XX");
    choiceDispStr = NString.TrimEnd(choiceDispStr);
    let helpStrDisp: string = StrUtil.searchAndReplace(choiceDispStr, fromHelp, toHelp);
    let sTok: String[] = StrUtil.tokenize(helpStrDisp, ",");
    let size: number = (helpStrDisp !== "" ? sTok.length : 0);
    let tokenBuffer: StringBuilder;
    let helpTokenDisp: string, token: string;
    let currPosDisp: number = 0, nextPosDisp = 0, tokenPosDisp, i = 0;
    let choiceDisp = new Array(size);
    for (; i < size; i++) {
      nextPosDisp = currPosDisp;
      nextPosDisp = helpStrDisp.indexOf(',', nextPosDisp);
      if (nextPosDisp === currPosDisp)
        token = helpTokenDisp = "";
      else if (nextPosDisp === -1) {
        token = choiceDispStr.substr(currPosDisp);
        helpTokenDisp = helpStrDisp.substr(currPosDisp);
      }
      else {
        token = choiceDispStr.substr(currPosDisp, (nextPosDisp) - (currPosDisp));
        helpTokenDisp = helpStrDisp.substr(currPosDisp, (nextPosDisp) - (currPosDisp));
      }
      currPosDisp = nextPosDisp + 1;
      if (token != null) {
        token = StrUtil.ltrim(token);
        if (removeAccelerators)
          token = ChoiceUtils.RemoveAcclCharFromOptions(new StringBuilder(token));
        helpTokenDisp = StrUtil.ltrim(helpTokenDisp);
        if (removeAccelerators)
          helpTokenDisp = ChoiceUtils.RemoveAcclCharFromOptions(new StringBuilder(helpTokenDisp));
      }
      if (helpTokenDisp.indexOf('\\') >= 0) {
        tokenBuffer = new StringBuilder();
        for (; tokenPosDisp < helpTokenDisp.length; tokenPosDisp++)
          if (helpTokenDisp[tokenPosDisp] !== '\\')
            tokenBuffer.Append(token[tokenPosDisp]);
          else if (tokenPosDisp === helpTokenDisp.length - 1)
            tokenBuffer.Append(' ');
        token = tokenBuffer.ToString();
      }
      if (shouldMakePrintable) {
        token = StrUtil.makePrintableTokens(token, SEQ_2_STR);
        if (shouldTrimOptions) {
          let temp: string = NString.TrimEnd(token);
          if (temp.length === 0)
            choiceDisp[i] = " ";
          else choiceDisp[i] = NString.TrimEnd(token);
        }
        else choiceDisp[i] = token;
      }
      else choiceDisp[i] = token;
    }
    return choiceDisp;
  }

  static RemoveAcclCharFromOptions(OptionStr: StringBuilder): string {
    let i: number = 0;
    if (OptionStr != null) {
      for (; i < OptionStr.Length;) {
        if (OptionStr.get_Item(i) === '&') {
          if (i < OptionStr.Length - 1 && OptionStr.get_Item(i + 1) === ('&'))
            i++;
          OptionStr = OptionStr.Remove(i, 1);
        }
        else i++;
      }
    }
    return (OptionStr != null ? OptionStr.ToString() : null);
  }
}
