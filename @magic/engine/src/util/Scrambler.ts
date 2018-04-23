import {NChar, NString, StringBuilder} from "@magic/mscorelib";

export class Scrambler {
  static ScramblingEnabled: boolean = true; // Disable scrambling
  private static XML_MIN_RANDOM: number = -48;
  private static XML_MAX_RANDOM: number = 47;
  private static XML_ILLEGAL_RANDOM: number = -21;

  /// <summary>scramble string</summary>
  /// <param name="inVal">string to scramble</param>
  /// <returns> scrambled string</returns>
  static Scramble(inVal: string): string {
    if (!this.ScramblingEnabled)
      return inVal;

    let curr: number = 0;
    let currChr: string;
    let length: number = inVal.length;
    let random: number = Scrambler.RandomScramble(length);
    let key: number = Math.floor(Math.sqrt(length)) + random;
    let outVal: StringBuilder = new StringBuilder(length + 1);

    // The first char in the scrambled string is a random modifier to the default key
    outVal.Append(String.fromCharCode(random + 81));

    for (let i: number = 0; i < key; i++) {
      curr = i;

      while (curr < length) {
        currChr = inVal[curr];
        outVal.Append(currChr);
        curr += key;
      }
    }

    // The last char in the scrambled string is a padding readable char.
    outVal.Append('_')/*'_'*/;
    return outVal.ToString();
  }

  /// <summary>delete first character of scrambled text and makes left trim to the string</summary>
  private static LocateScramble(inVal: string, from: number): number {
    let i: number = from;
    while (i < inVal.length && NChar.IsWhiteSpace(inVal.charAt(i))) {
      i = i + 1;
    }
    return i + 1;
  }

  /// <summary> Choose a random modifier to the key on which we base the scrambling process.
  /// The random factor cannot be just any number we choose. Since the scramble key
  /// determines the amount of 'jumps' we perform on the text to be scrambled, then
  /// the random number we add to it must not be too big, nor too small. As a rule,
  /// the random modifier can range from SQRT(len)/2' to '-SQRT(len)/2', and since we
  /// pass the selected number as a character within the XML, the whole range cannot
  /// exceed the number of the printable characters (95), thus the range is limited
  /// between (-48) to (47), so we cap the allowed range according to these limits.
  /// Last, the value XML_ILLEGAL_RANDOM, since it will result in adding the char '<'
  /// to the beginning of the XML. This will make the client confused, since it will
  /// think the XML is not scrambled.
  /// </summary>
  /// <param name="len">of outgoing String</param>
  /// <returns> random modifier</returns>
  private static RandomScramble(len: number): number {
    let delta: number;
    let sqrt: number = Math.sqrt(len);
    let low: number = Scrambler.XML_MIN_RANDOM;
    let high: number = Scrambler.XML_MAX_RANDOM;

    if (low < (((-1) * sqrt) / 2))
      low = Math.floor(((-1) * sqrt) / 2);

    if (high > (sqrt / 2))
      high = Math.floor(sqrt / 2);

    delta = (Math.random() * (high - low)) + low;
    if (delta === Scrambler.XML_ILLEGAL_RANDOM)
      delta++;

    return Math.floor(delta);
  }

  /// <summary>make unscrambling to string inside upper and down border</summary>
  /// <param name="inVal">scrambled string to build unscrambled string from it</param>
  /// <param name="beginOffSet">offset where the scrambled string begins</param>
  /// <param name="endOffSet">offset of the last char in the scrambled string.</param>
  /// <returns> unscrambled string</returns>
  static UnScramble(inVal: string, beginOffSet: number, endOffSet: number): string {
    if (!Scrambler.ScramblingEnabled) {
      let outVal: string = inVal.substr(beginOffSet, endOffSet - beginOffSet + 1);
      return outVal;
    }
    else {
      let currOut: number, currIn: number, i: number;
      let length: number;
      let key: number;
      let outVal: string[];
      let currBlk: number;
      let blockSize: number;
      let reminder: number;
      let start: number;
      let randomChr: string;

      // ignore the last char in the input, it's just a padding character.
      endOffSet = endOffSet - 1;

      // skip over the first char in the input, it only contains a random modifier to the key.
      // it is not part of the data.
      start = this.LocateScramble(inVal, beginOffSet);
      randomChr = inVal[start - 1];

      length = endOffSet - start + 1;
      key = (randomChr.charCodeAt(0) - 81) + Math.floor(Math.sqrt(length));
      outVal = new Array(length);
      blockSize = Math.floor(length / key);
      reminder = length % key;

      for (i = currOut = 0; currOut < length; i++) {
        currIn = i;
        currBlk = 1;

        while (currIn < length && currOut < length) {
          outVal[currOut] = inVal[currIn + start];
          currIn += blockSize;
          if (currBlk <= reminder)
            currIn++;
          currOut++;
          currBlk++;
        }
      }

      return NString.FromChars(outVal);
    }
  }
}
