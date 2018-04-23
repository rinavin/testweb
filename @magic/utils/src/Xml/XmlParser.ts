import {NString, List, ApplicationException, StringBuilder, Dictionary, NChar, NNumber} from "@magic/mscorelib";
import {XMLConstants} from "../XMLConstants";

/// <summary> a helper class for the parsing of the XML</summary>
export class XmlParser {
  private static endOfNameChar: string[] = [' ', '>'];

  private _currIndex: number = 0;
  private _xmLdata: string = "";
  private _history: List<number | string> = new List(); // In order to allow recursive parsing we save prev data

  /// <summary>
  ///
  /// </summary>
  /// <param name="data"></param>
  constructor(data: string = NString.Empty) {
    this.setXMLdata(data);
    this.setCurrIndex(0);
  }

  /// <summary> parse a string according to a set of delimiters and return the result in a vector</summary>
  /// <param name="str">the String which need be parted </param>
  /// <param name="delimiter">the delimiter which part different parts of str </param>
  /// <param name="isMagicXML">is needed tokenizer working on Magic XML, so the "=" sign will be delited in the end of every first token </param>
  /// <returns> tmpVector dynamically array, which consist tokens in every element, every token is String </returns>
  static getTokens(str: string, delimiter: string, isMagicXML: boolean = true): List<string> {
    let tokensVec: List<string> = new List<string>();
    let token: string = null;

    if (isMagicXML) {
      str = str.trim();
    }

    let strTok: string[] = str.split(delimiter.charAt(0));

    for (let i: number = 0; i < strTok.length; i = i + 1) {
      // Split in C# creates a last empty string token if the source string ends with
      // the delimiter or if the string is empty (as opposed to Java that will ignore it)
      // therefore we have to break this loop if such case occurs.
      if (isMagicXML && i === strTok.length - 1 && strTok.length % 2 === 1) {
        break;
      }

      token = strTok[i];
      if (isMagicXML) {
        // the 1st token in the pair comes with "=", remove it.
        if (i % 2 === 0) {
          token = token.trim();
          if (token.endsWith("=")) {
            token = token.substr(0, token.length - 1);
          }
        }
        // 2nd token in the pair can be an empty string, in that case set it to " ".
        else if (token === "")
          token = " ";
      }

      if (token === null)
        throw new ApplicationException("in ClientManager.Instance.XMLParser.getTokens() null token value");

      tokensVec.push(token);
    }

    return tokensVec;
  }

  /// <summary>unscape from:
  /// {"&amp;",\\, \q, \o, \l, \g, \e, \\r, \\n}, to:
  /// {"&",     \,  ",  ',  <,  >,  =,  \r,  \n}
  /// <param name="str">String to be converted</param>
  /// <returns>unescaped string</returns>
  public static unescape(str: string): string
  {
    let unescapedString: StringBuilder = new StringBuilder(str.length);

    for (let i: number = 0; i < str.length; i++) {
      if (str[i] !== '\\') {
        unescapedString.Append(str[i]);
        continue;
      }

      switch (str[++i]) {
        case 'q':
          unescapedString.Append('\"');
          break;
        case 'o':
          unescapedString.Append('\'');
          break;
        case 'l':
          unescapedString.Append('<');
          break;
        case 'g':
          unescapedString.Append('>');
          break;
        case 'e':
          unescapedString.Append('=');
          break;
        case 'r':
          unescapedString.Append('\r');
          break;
        case 'n':
          unescapedString.Append('\n');
          break;
        default:
          unescapedString.Append(str[i]);
          break;
      }
    }
    return (unescapedString.ToString());
  }

  /// <summary>escape from:
  /// {\,  ",  ',  <,   >,  =,  \r,  \n}, to:
  /// {\\, \q, \0, \l,  \g, \e, \\r, \\n}
  /// <param name="str">String to be converted</param>
  /// <returns>escaped string</returns>
  public static escape(str: string): string
  {
    let escapedString: StringBuilder = new StringBuilder(str.length * 2);

    for (let i: number = 0; i < str.length; i++) {
      switch (str[i]) {
        case '\\':
          escapedString.Append("\\\\");
          break;
        case '"':
          escapedString.Append("\\q");
          break;
        case '\'':
          escapedString.Append("\\o");
          break;
        case '<':
          escapedString.Append("\\l");
          break;
        case '>':
          escapedString.Append("\\g");
          break;
        case '=':
          escapedString.Append("\\e");
          break;
        case '\r':
          escapedString.Append("\r");
          break;
        case '\n':
          escapedString.Append("\n");
          break;
        default:
          escapedString.Append(str[i]);
          break;
      }
    }

    return (escapedString.ToString());
  }

  /// <summary>
  /// here we only need to take care of "&" so that Sax parser will be able to handle url
  /// </summary>
  /// <param name="str"></param>
  /// <returns></returns>
  static escapeUrl(str: string): string {
    return NString.Replace(str, "&", "&amp;");
  }

  /// <summary>get next tag name from current index in XML string</summary>
  /// <returns> next tag name </returns>
  getNextTag(): string {
    if (this._xmLdata.length - this._currIndex <= 1) {
      return null;  // end of XML string
    }

    for (let tmpIndx: number = this._currIndex + 1; tmpIndx < this._xmLdata.length; tmpIndx++) {
      let tmpChar: string = this._xmLdata[tmpIndx];

      // a letter starts an element and ends with " ". "/" starts an element closing and ends with '>'.
      if (NChar.IsLetter(tmpChar) || tmpChar === '/') {
        let endOfTag: number = NString.IndexOfAny(this._xmLdata, XmlParser.endOfNameChar, tmpIndx, this._xmLdata.length - tmpIndx);

        if (endOfTag === -1)
          return null;
        else
          return this._xmLdata.substr(tmpIndx, endOfTag - tmpIndx);
      }
    }

    return null;
  }

  /// <summary>Substring of XMLstring</summary>
  /// <returns> substring of XML string -from currIndex to endContext </returns>
  getXMLsubstring(endContext: number): string {
    return this._xmLdata.substr(this._currIndex, endContext - this._currIndex);
  }

  /// <summary>get current element value</summary>
  /// <returns> element's value </returns>
  GetCurrentElementValue(): string {
    this.setCurrIndex2EndOfTag();
    let endContext: number = this.getXMLdata().indexOf(XMLConstants.TAG_OPEN, this.getCurrIndex());
    // read value of xml element
    let value: string = this.getXMLsubstring(endContext);
    this.setCurrIndex2EndOfTag();
    return value;
  }

  /// <summary>set current index (on parsing time) to the end of current tag</summary>
  setCurrIndex2EndOfTag(): void {
    this._currIndex = this._xmLdata.indexOf(XMLConstants.TAG_CLOSE, this._currIndex) + 1;
  }

  /// <summary>get int from string at parsing time</summary>
  static getInt(valueStr: string): number {
    return NNumber.Parse(valueStr.trim());
  }

  /// <summary>get boolean from string at parsing time</summary>
  static getBoolean(valueStr: string): boolean {
    return valueStr[0] === '1';
  }

  /// <summary>get/set functions 4 XMLstring & currIndex, for parser</summary>
  getCurrIndex(): number {
    return this._currIndex;
  }

  getXMLdata(): string {
    return this._xmLdata;
  }

  add2CurrIndex(add: number): void {
    this._currIndex = this._currIndex + add;
  }

  setCurrIndex(index: number): void {
    this._currIndex = index;
  }

  setXMLdata(data: string): void {
    if (data !== null)
      this._xmLdata = data.trim();
    else {
      this._xmLdata = null;
      this.setCurrIndex(0);
    }
  }

  /// <summary>
  /// prepare the parser to read from the newXmlString
  /// </summary>
  /// <param name="newXmlString"></param>
  PrepareFormReadString(newXmlString: string): void {
    this.setXMLdata(newXmlString);
    this.setCurrIndex(0);
  }

  /// <summary> push the current parsing information into the history stack</summary>
  push(): void {
    this._history.push(this._currIndex);
    this._history.push(this._xmLdata);
  }

  /// <summary> restore the previous parsing information from the history stack</summary>
  pop(): void {
    let count: number = this._history.length;

    this._xmLdata = <string>this._history.get_Item(count - 1);
    this._currIndex = <number>this._history.get_Item(count - 2);

    this._history.SetSize(count - 2);
  }

  /// <summary>gets a table cache xml and set the xmlparser data and index accordingly</summary>
  loadTableCacheData(data: string): void {
    this.setXMLdata(data);
    this.setCurrIndex(0);
  }

  /// <summary>
  /// Reads the XML from the element at the current position until the end of
  /// the element, returning the contents as a string. This allows deferring the
  /// processing of an element until the time is right to do so.<br/>
  /// The returned string contains the element tag itself. For example:<br/>
  /// - Assuming that the current element is 'element1', with 2 'innerElement' elements, the
  /// resulting string will look like this:<br/>
  /// <element1>
  ///   <innerelement/>
  ///   <innerelement/>
  /// </element1>
  ///
  /// This makes the result valid for processing by this XML parser.
  /// </summary>
  /// <returns></returns>
  ReadToEndOfCurrentElement(): string {
    // Get the current tag according to the value of _currIndex.
    let currentTag: string = this.getNextTag();
    let currentTagIndex: number = this._xmLdata.indexOf(XMLConstants.TAG_OPEN + currentTag, this.getCurrIndex());

    // Find the end of the element's block in the XML.
    // find next open tag
    let nextOpenTagIndex: number = this._xmLdata.indexOf(XMLConstants.TAG_OPEN, currentTagIndex + 1);
    if (nextOpenTagIndex === -1)
      nextOpenTagIndex = this._xmLdata.length;

    // find a close tag BEFORE the next open tag
    let elementEndIndex: number = NString.IndexOf(this._xmLdata, XMLConstants.TAG_TERM, this.getCurrIndex(), nextOpenTagIndex - this.getCurrIndex());
    if (elementEndIndex === -1)
    // close tag was not found in range - we have inner elements, look for the full close tag
      elementEndIndex = this._xmLdata.indexOf("/" + currentTag, this.getCurrIndex()) + currentTag.length + XMLConstants.TAG_TERM.length;
    else
      elementEndIndex = elementEndIndex + XMLConstants.TAG_TERM.length;

    // Copy the element data so it can be returned.
    let elementBlock: string = this.getXMLsubstring(elementEndIndex);

    // Move the parser to the end of the element block.
    this.setCurrIndex(elementEndIndex);

    return elementBlock;
  }

  ReadContentOfCurrentElement(): string {
    // Get the current tag according to the value of _currIndex.
    let currentTag: string = this.getNextTag();

    // Find the end of the element's block in the XML.
    let elementEndIndex: number = this._xmLdata.indexOf("</" + currentTag + ">", this.getCurrIndex());

    if (elementEndIndex === -1)
      // Can't find the end of the current element - either XML is faulty or the element is empty.
      return NString.Empty;

    // Move to the end of the opening tag
    this.setCurrIndex2EndOfTag();

    // Copy the content of the element (from the end of the opening tag to the beginning of the closing tag).
    let elementBlock: string = this.getXMLsubstring(elementEndIndex);

    // Move the parser to the end of the element block.
    this.setCurrIndex(elementEndIndex);
    this.setCurrIndex2EndOfTag();

    return elementBlock;
  }

  /// <summary>
  /// Generates a string that visualizes the XML parser state (e.g. for debug watch list.)<br/>
  /// The method will show the XML data, trimming it to 20 characters before the
  /// current position (_currIndex) and up to 50 characters after the current position.
  /// The current position itself will be marked with a marker that looks like:
  /// |-{current index}-| <br/>
  /// The marker will be placed immediately before _xmlData[_currIndex].
  /// </summary>
  /// <param name="headCharCount">Number of characters to show before the current position marker.</param>
  /// <param name="tailCharCount">Number of characters to show after the current position marker.</param>
  /// <returns></returns>
  toString(): string;
  toString(headCharCount: number, tailCharCount: number): string;
  toString(headCharCount?: number, tailCharCount?: number): string {
    if (arguments.length === 0) {
      return this.ToString_0();
    }
    return this.ToString_1(headCharCount, tailCharCount);
  }

  /// <summary>
  /// Generates a string that visualizes the XML parser state (e.g. for debug watch list.)<br/>
  /// The method will show the XML data, trimming it to 20 characters before the
  /// current position (_currIndex) and up to 50 characters after the current position.
  /// The current position itself will be marked with a marker that looks like:
  /// |-{current index}-| <br/>
  /// The marker will be placed immediately before _xmlData[_currIndex].
  /// </summary>
  /// <returns></returns>
  private ToString_0(): string {
    return this.toString(20, 50);
  }

  /// <summary>
  /// Generates a string that visualizes the XML parser state (e.g. for debug watch list.)<br/>
  /// The method will show the XML data, trimming it to headCharCount characters before the
  /// current position (_currIndex) and up to tailCharCount characters after the current position.
  /// The current position itself will be marked with a marker that looks like:
  /// |-{current index}-| <br/>
  /// The marker will be placed immediately before _xmlData[_currIndex].
  /// </summary>
  /// <param name="headCharCount">Number of characters to show before the current position marker.</param>
  /// <param name="tailCharCount">Number of characters to show after the current position marker.</param>
  /// <returns></returns>
  private ToString_1(headCharCount: number, tailCharCount: number): string {
    let markerPosition: number = Math.min(this._currIndex, this._xmLdata.length);
    let segmentStartIndex: number = Math.max(0, markerPosition - headCharCount);
    let segmentEndIndex: number = Math.min(this._xmLdata.length, markerPosition + tailCharCount);

    let headLength: number = markerPosition - segmentStartIndex;
    let tailLength: number = segmentEndIndex - markerPosition;

    let segment: StringBuilder = new StringBuilder();
    if (segmentStartIndex > 0)
      segment.Append("...");

    if (headLength > 0)
      segment.Append(this._xmLdata, segmentStartIndex, headLength);

    segment.Append("|-{").Append(this._currIndex).Append("}-|");

    if (tailLength > 0)
      segment.Append(this._xmLdata, this._currIndex, tailLength);

    if (segmentEndIndex < this._xmLdata.length)
      segment.Append("...");

    return segment.ToString();
  }

  SkipXMLElement(): void {
    let endContext: number = this.getXMLdata().indexOf(XMLConstants.TAG_TERM, this.getCurrIndex());
    if (endContext !== -1 && endContext < this.getXMLdata().length) {
      this.setCurrIndex2EndOfTag();
    }
  }
}
