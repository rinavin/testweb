import {
  ApplicationException,
  Debug,
  Encoding, ISO_8859_1_Encoding,
  NNumber,
  NString,
  NumberStyles,
  RefParam,
  StringBuilder
} from "@magic/mscorelib";
import {Base64, FldStorage, Misc, StorageAttribute, StrUtil, UtilStrByteMode} from "@magic/utils";
import {Manager} from "../../Manager";
import {NUM_TYPE} from "./NUM_TYPE";
import {VectorType} from "./VectorType";
import {BlobType} from "./BlobType";

export class RecordUtils {
  static byteStreamToString(stream: StringBuilder): string;
  static byteStreamToString(stream: string): string;
  static byteStreamToString(stream: any): string {
    if (arguments.length === 1 && (stream === null || stream instanceof StringBuilder)) {
      return RecordUtils.byteStreamToString_0(stream);
    }
    return RecordUtils.byteStreamToString_1(stream);
  }

  /// <summary>
  ///   translate byte stream to String
  /// </summary>
  /// <param name = "result">of the translation</param>
  /// <param name = "stream">(in StringBuffer form) to translate from</param>
  private static byteStreamToString_0(stream: StringBuilder): string {
    let currStr: string;
    let currChar: string;
    let result: StringBuilder = new StringBuilder(Math.floor(stream.Length / 2));

    for (let indx: number = 0; indx < stream.Length; indx = indx + 2) {
      currStr = stream.get_Item(indx) + stream.get_Item(indx + 1);
      currChar = String.fromCharCode(NNumber.Parse(currStr, NumberStyles.HexNumber));
      result.Append(currChar);
    }
    return result.ToString();
  }

  /// <summary>
  ///   translate byte stream to String
  /// </summary>
  private static byteStreamToString_1(stream: string): string {
    return RecordUtils.byteStreamToString(new StringBuilder(stream));
  }

  static serializeItemVal(itemVal: string, itemAttr: StorageAttribute): Uint8Array;
  static serializeItemVal(itemVal: string, itemAttr: StorageAttribute, cellAttr: StorageAttribute, toBase64: boolean): string;
  static serializeItemVal(itemVal: string, itemAttr: StorageAttribute, cellAttr?: StorageAttribute, toBase64?: boolean): any {
    if (arguments.length === 2)
      return RecordUtils.serializeItemVal_0(itemVal, itemAttr);
    else
      return RecordUtils.serializeItemVal_1(itemVal, itemAttr, cellAttr, toBase64);
  }

  private static serializeItemVal_0(itemVal: string, itemAttr: StorageAttribute): Uint8Array {
    Debug.Assert(itemVal !== null);

    let valueSize: string;
    let tmpBufLen: string = NString.Empty;
    let tmpBuf: Uint8Array = null;
    let contentWithLength: Uint8Array = null;
    let pos: number = 0;
    let fldValLen: number = 0;
    let tempItemVal: string = NString.Empty;
    let noOfPackets: number = 0;
    let tmpNoOfPackets: Uint8Array = null;
    let tmpStrNoOfPackets: string = NString.Empty;

    switch (itemAttr) {
      case StorageAttribute.NUMERIC:
      case StorageAttribute.DATE:
      case StorageAttribute.TIME:
        let numType: NUM_TYPE = new NUM_TYPE(itemVal);
        tmpBuf = Misc.ToByteArray(numType.Data);
        break;

      case StorageAttribute.BOOLEAN:
        tmpBuf = Manager.Environment.GetEncoding().GetBytes(itemVal);
        break;

      case StorageAttribute.ALPHA:
        itemVal = StrUtil.rtrim(itemVal);
        valueSize = UtilStrByteMode.lenB(itemVal).toString(16).toUpperCase();

        // add leading zeros (if needed)
        for (let j: number = 0; j < 4 - valueSize.length; j++)
          tmpBufLen += "0";
        tmpBufLen += valueSize;

        tmpBuf = new Uint8Array(Manager.Environment.GetEncoding().GetBytes(tmpBufLen).length + Manager.Environment.GetEncoding().GetBytes(itemVal).length);
        tmpBuf.set(Manager.Environment.GetEncoding().GetBytes(tmpBufLen), 0);
        tmpBuf.set(Manager.Environment.GetEncoding().GetBytes(itemVal), Manager.Environment.GetEncoding().GetBytes(tmpBufLen).length);
        break;

      case StorageAttribute.UNICODE:
        itemVal = StrUtil.rtrim(itemVal);
        valueSize = (itemVal.length.toString(16)).toUpperCase();

        // add leading zeros (if needed)
        for (let j: number = 0; j < 4 - valueSize.length; j++)
          tmpBufLen += "0";
        tmpBufLen += valueSize;

        tmpBuf = new Uint8Array(Manager.Environment.GetEncoding().GetBytes(tmpBufLen).length + Manager.Environment.GetEncoding().GetBytes(itemVal).length);
        tmpBuf.set(Manager.Environment.GetEncoding().GetBytes(tmpBufLen), 0);
        tmpBuf.set(Manager.Environment.GetEncoding().GetBytes(itemVal), Manager.Environment.GetEncoding().GetBytes(tmpBufLen).length);
        break;

      case StorageAttribute.BLOB:
        pos = 0;
        // blob will be serialized in packet of size 0xFFFF.
        // So format of serialized buffer for blob is
        // no. of packets (n) + length1 + data1 + length2 + data2 + ......length n + datan
        fldValLen = ISO_8859_1_Encoding.ISO_8859_1.GetByteCount(itemVal);

        noOfPackets = Math.floor(fldValLen / 0xFFFF);

        tmpBufLen = "FFFF";
        tmpNoOfPackets = Manager.Environment.GetEncoding().GetBytes(tmpBufLen);

        for (let i: number = 0; i < noOfPackets; i++) {
          tempItemVal = itemVal.substr(pos, 0xFFFF);
          pos += 0xFFFF;

          let tempItemValBytes: Uint8Array = ISO_8859_1_Encoding.ISO_8859_1.GetBytes(tempItemVal);
          contentWithLength = new Uint8Array(tmpNoOfPackets.length + tempItemValBytes.length);
          contentWithLength.set(tmpNoOfPackets);
          contentWithLength.set(tempItemValBytes, tmpNoOfPackets.length);
        }

        let lastPacketSize: number = fldValLen % 0xFFFF;

        if (lastPacketSize > 0) {
          tempItemVal = itemVal.substr(pos, (fldValLen) - (pos));
          let tempItemValBytes: Uint8Array = ISO_8859_1_Encoding.ISO_8859_1.GetBytes(tempItemVal);

          tmpBufLen = NString.Format(String.fromCharCode(tempItemValBytes.length), "X4");

          let tempContentWithLength: Uint8Array = new Uint8Array (contentWithLength.length +
                                                                Manager.Environment.GetEncoding().GetBytes(tmpBufLen).length +
            ISO_8859_1_Encoding.ISO_8859_1.GetBytes(tempItemVal).length);
          tempContentWithLength.set(contentWithLength);
          tempContentWithLength.set(Manager.Environment.GetEncoding().GetBytes(tmpBufLen), contentWithLength.length);
          tempContentWithLength.set(ISO_8859_1_Encoding.ISO_8859_1.GetBytes(tempItemVal), contentWithLength.length + Manager.Environment.GetEncoding().GetBytes(tmpBufLen).length);
          contentWithLength = tempContentWithLength;
          noOfPackets++;
        }

        tmpStrNoOfPackets = NString.Format(String.fromCharCode(noOfPackets), "D4");
        tmpNoOfPackets = Manager.Environment.GetEncoding().GetBytes(tmpStrNoOfPackets);

        tmpBuf = new Uint8Array (contentWithLength.length + tmpNoOfPackets.length);
        tmpBuf.set(tmpNoOfPackets);
        tmpBuf.set(contentWithLength, tmpNoOfPackets.length);
        break;
    } // end of the type case block

    return tmpBuf;
  }

  /// <summary>
  ///   serialize an item (field/global param/...) to an XML format (applicable to be passed to the server).
  /// </summary>
  /// <param name = "itemVal">item's value</param>
  /// <param name = "itemAttr">item's attribute</param>
  /// <param name = "cellAttr">cell's attribute - relevant only if 'itemAttr' is vector</param>
  /// <param name = "toBase64">decide Base64 encoding is to be done</param>
  /// <returns>serialized buffer</returns>
  private static serializeItemVal_1(itemVal: string, itemAttr: StorageAttribute, cellAttr: StorageAttribute, toBase64: boolean): string {
    Debug.Assert(itemVal != null);

    let significantNumSize: number = Manager.Environment.GetSignificantNumSize() * 2;

    let valueSize: string;
    let j: number;
    let tmpBuf = new StringBuilder();

    // for alpha type add the length of the value as hex number of 4 digits
    switch (itemAttr) {
      case StorageAttribute.NUMERIC:
      case StorageAttribute.DATE:
      case StorageAttribute.TIME:
        itemVal = !toBase64
          ? itemVal.substr(0, significantNumSize)
          : Base64.encode(this.byteStreamToString(itemVal.substr(0, significantNumSize)), Manager.Environment.GetEncoding());
        break;

      case StorageAttribute.ALPHA:
      case StorageAttribute.UNICODE:
        itemVal = StrUtil.rtrim(itemVal);
        let pos: number = 0;
        let fldValLen: number = itemVal.length;

        do {
          let nullChrPos: number = itemVal.indexOf(String.fromCharCode(0), pos);
          if (nullChrPos === -1) {
            valueSize = (fldValLen - pos).toString(16).toUpperCase();
            // add leading zeros (if needed)
            for (j = 0; j < 4 - valueSize.length; j++)
              tmpBuf.Append('0');
            tmpBuf.Append(valueSize);

            if (pos > 0)
              itemVal = itemVal.substr(pos, (fldValLen) - (pos));

            pos = fldValLen;
          }
          else {
            // If NULL chars exist in the middle of the value - create a spanned record
            // Turn on the high most bit in the length (to indicate a segment)
            valueSize = (nullChrPos - pos + 0x8000).toString (16).toUpperCase();
            tmpBuf.Append(valueSize);
            tmpBuf.Append(itemVal.substr(pos, (nullChrPos) - (pos)));

            // Count number of consecutive NULL chars, and add their count to XML
            for (j = 1; j < fldValLen - nullChrPos && itemVal.charCodeAt(nullChrPos + j) === 0; j++) {
            }
            // add leading zeros (if needed)
            valueSize = "0000" + (j.toString(16)).toUpperCase();
            tmpBuf.Append(valueSize.substr(valueSize.length - 4));

            // Append a hex dump of special chars
            for (pos = nullChrPos; j > 0; j--, pos++) {
              let tmpStr: string = "0" + itemVal.charCodeAt(nullChrPos).toString(16);
              tmpBuf.Append(tmpStr.substr(tmpStr.length - 2));
            }

            // If special chars were last, add the length of the last segment (zero)
            if (pos >= fldValLen) {
              tmpBuf.Append("0000");
              itemVal = "";
              break;
            }
          }
        } while (pos < fldValLen);
        break;

      case StorageAttribute.BLOB:
      case StorageAttribute.BLOB_VECTOR:
      case StorageAttribute.DOTNET:
        pos = 0;

        fldValLen = itemVal.length;

        if (UtilStrByteMode.isLocaleDefLangDBCS() && itemAttr === StorageAttribute.BLOB_VECTOR) {
          if (cellAttr === StorageAttribute.ALPHA || cellAttr === StorageAttribute.MEMO) {
            itemVal = VectorType.adjustAlphaStringsInFlatData(itemVal);

            // The flat data will be divided by 0x3FFF characters.
            // Each segment will be size in 0x3FFF ~ 0x7FFF bytes.
            // The size depends on the number of DBCS characters, not fixed in 0x7FFF.
            do {
              if (itemVal.length < pos + 0x3FFF)
              // (0x8000 - 1) / 2 = 0x3FFF
              {
                if (pos > 0)
                  itemVal = itemVal.substr(pos);

                valueSize = (UtilStrByteMode.lenB(itemVal).toString(16)).toUpperCase();
                // add leading zeros (if needed)
                for (j = 0; j < 4 - valueSize.length; j++)
                  tmpBuf.Append('0');
                tmpBuf.Append(valueSize);

                // hex encoding
                itemVal = !toBase64
                  ? StrUtil.stringToHexaDump(itemVal, 4)
                  : Base64.encode(itemVal, true, Manager.Environment.GetEncoding());

                pos = fldValLen;
              }
              else {
                let strSub: string = itemVal.substr(pos, 0x3FFF);
                // + 0x8000 ... to indicate not the last segment
                valueSize = ((UtilStrByteMode.lenB(strSub) + 0x8000).toString(16)).toUpperCase();
                tmpBuf.Append(valueSize);

                // hex or base64 encoding
                tmpBuf.Append(!toBase64
                  ? StrUtil.stringToHexaDump(strSub, 4)
                  : Base64.encode(strSub, true, Manager.Environment.GetEncoding()));

                tmpBuf.Append("0000");
                pos += 0x3FFF;
              }
            } while (pos < fldValLen) ;

            break;
          }
        }

        do {
          if (fldValLen < pos + 0x7FFF)
          // 0x8000 -1 = 0x7FFF
          {
            valueSize = ((fldValLen - pos).toString(16)).toUpperCase();
            // add leading zeros (if needed)
            for (j = 0; j < 4 - valueSize.length; j++)
              tmpBuf.Append('0');
            tmpBuf.Append(valueSize);

            if (pos > 0)
              itemVal = itemVal.substr(pos, (fldValLen) - (pos));

            // hex encoding
            itemVal = !toBase64
              ? StrUtil.stringToHexaDump(itemVal, 4)
              : Base64.encode(itemVal, Manager.Environment.GetEncoding());

            pos = fldValLen;
          }
          else {
            // to indicate the full segment
            valueSize = "FFFF"; // (Integer.toHexString (0xFFFF)).toUpperCase()
            tmpBuf.Append(valueSize);

            // hex or base64 encoding
            if (!toBase64)
              tmpBuf.Append(StrUtil.stringToHexaDump(itemVal.substr(pos, 0x7FFF), 4));
            else
              tmpBuf.Append(Base64.encode(itemVal.substr(pos, 0x7FFF), Manager.Environment.GetEncoding()));

            tmpBuf.Append("0000");
            pos += 0x7FFF;
          }
        } while (pos < fldValLen);
        break;
    } // end of the type case block
    tmpBuf.Append(itemVal);
    return tmpBuf.ToString();
  }

  /// <summary> Deserializes an item's (field/global param/...) value </summary>
  /// <param name="itemVal">item's value</param>
  /// <param name="itemAttr">item's attribute</param>
  /// <param name="itemLen">item's length</param>
  /// <param name="useHex">indicates whether the itemVal is in Hex or Base64</param>
  /// <param name="cellAttr">cell's attribute - relevant only if 'itemAttr' is vector</param>
  /// <param name="parsedLen">out parameter. Returns the length of itemVal parsed</param>
  /// <returns></returns>
  static deSerializeItemVal(itemVal: string, itemAttr: StorageAttribute, itemLen: number, useHex: boolean, cellAttr: StorageAttribute, parsedLen: RefParam<number>): string {
    let val: string = null;
    let idx: number = 0;
    let len: number, endIdx: number;
    let suffixBuf: StringBuilder = null;
    let tmp: string = null;

    if (itemAttr === StorageAttribute.ALPHA
      || itemAttr === StorageAttribute.UNICODE
      || itemAttr === StorageAttribute.BLOB
      || itemAttr === StorageAttribute.BLOB_VECTOR
      || itemAttr === StorageAttribute.DOTNET
    ) {
      // first 4 characters are the length of the string (hex number)
      endIdx = idx + 4;
      tmp = itemVal.substr(idx, (endIdx) - (idx));
      len = NNumber.Parse(tmp, NumberStyles.HexNumber);
      idx = endIdx;
    }
    else if (itemAttr === StorageAttribute.BOOLEAN)
      len = 1;
    else {
      let significantNumSize: number = Manager.Environment.GetSignificantNumSize();
      if (useHex)
        len = significantNumSize * 2;
      else
      // if working in base64
        len = (Math.floor((significantNumSize + 2) / 3) * 4);
    }
    // Oops, did we bumped into a spanned record (We identify it when the high-most bit is on)?
    if ((len & 0x8000) > 0) {
      suffixBuf = new StringBuilder();
      len = (len & 0x7FFF);

      if (itemAttr === StorageAttribute.BLOB || itemAttr === StorageAttribute.BLOB_VECTOR
        || itemAttr === StorageAttribute.DOTNET)
        if (useHex)
          len *= 2;
        else
          len = (Math.floor((len + 2) / 3) * 4);

      parsedLen.value = this.getSpannedField(itemVal, len, idx, itemAttr, suffixBuf, useHex);
      val = suffixBuf.ToString();
      endIdx = idx + parsedLen.value;
    }
    else {
      if (itemAttr === StorageAttribute.BLOB
        || itemAttr === StorageAttribute.BLOB_VECTOR
        || itemAttr === StorageAttribute.DOTNET
      )
        if (useHex)
          len *= 2;
        else
          len = (Math.floor((len + 2) / 3) * 4);

      endIdx = idx + len;
      if (endIdx > itemVal.length)
        throw new ApplicationException("in Record.fillFieldsData() data string too short:\n" + itemVal);

      if (UtilStrByteMode.isLocaleDefLangDBCS() && itemAttr === StorageAttribute.BLOB_VECTOR)
        val = this.getString(itemVal.substr(idx, (endIdx) - (idx)), itemAttr, useHex, (cellAttr === StorageAttribute.ALPHA));
      else
        val = this.getString(itemVal.substr(idx, (endIdx) - (idx)), itemAttr, useHex);
    }

    idx = endIdx;

    if (itemAttr === StorageAttribute.ALPHA || itemAttr === StorageAttribute.UNICODE) {
      len = itemLen;
      val = StrUtil.padStr(val, len);

      if (itemAttr === StorageAttribute.ALPHA && UtilStrByteMode.isLocaleDefLangDBCS())
        val = UtilStrByteMode.leftB(val, len);
    }

    parsedLen.value = endIdx;
    return val;
  }

  static getString(str: string, type: StorageAttribute, useHex: boolean): string;
  static getString(str: string, type: StorageAttribute, useHex: boolean, useEnvCharset: boolean): string;
  static getString(str: string, type: StorageAttribute, useHex: boolean, useEnvCharset?: boolean): string {
    if (arguments.length === 3)
      return RecordUtils.getString_0(str, type, useHex);

    return RecordUtils.getString_1(str, type, useHex, useEnvCharset);
  }

  /// <returns> right string in confidence with the type</returns>
  private static getString_0(str: string, type: StorageAttribute, useHex: boolean): string {
    return RecordUtils.getString(str, type, useHex, false);
  }

  /// <returns> right string in confidence with the type</returns>
  private static getString_1(str: string, type: StorageAttribute, useHex: boolean, useEnvCharset: boolean): string {
    let result: string;
    if (useHex) {
      if (type === StorageAttribute.BLOB || type === StorageAttribute.BLOB_VECTOR
        || type === StorageAttribute.DOTNET)
        result = RecordUtils.byteStreamToString(str);
      else
        result = str;
    }
    else {
      if (type === StorageAttribute.BLOB || type === StorageAttribute.BLOB_VECTOR
        || type === StorageAttribute.DOTNET)
        result = Base64.decode(str, useEnvCharset ? Manager.Environment.GetEncoding() : null);
      else
        result = Base64.decodeToHex(str);
    }
    return result;
  }

  static getSpannedField(fldsVal: string, firstSegLen: number, idx: number, type: StorageAttribute, result: StringBuilder, useHex: boolean): number;
  static getSpannedField(fldsVal: Uint8Array, firstSegLen: number, idx: number, type: StorageAttribute, result: StringBuilder, useHex: boolean, noOfPackets: number): number;
  static getSpannedField(fldsVal: any, firstSegLen: number, idx: number, type: StorageAttribute, result: StringBuilder, useHex: boolean, noOfPackets?: number): number {
    if (arguments.length === 6)
      return RecordUtils.getSpannedField_0(fldsVal, firstSegLen, idx, type, result, useHex);

    return RecordUtils.getSpannedField_1(fldsVal, firstSegLen, idx, type, result, useHex, noOfPackets);
  }

  /// <summary>
  ///   Translate XML -> field value for a spanned ALPHA field, and return the actual
  ///   field's length. A spanned field may be accepted from the server when an
  ///   ALPHA includes special chars such as NULL which cannot be escaped using a '\' (like,
  ///   for example, '\"').
  /// </summary>
  /// <param name = "fldsVal">string for parsing</param>
  /// <param name = "firstSegLen">length (in chars) of first segment.</param>
  /// <param name = "idx">index in string, from which the first segments data starts.</param>
  /// <param name = "type">of variable is looking for</param>
  /// <param name = "result">the result string, which will contain the parsed field content.</param>
  private static getSpannedField_0(fldsVal: string, firstSegLen: number, idx: number, type: StorageAttribute, result: StringBuilder, useHex: boolean): number {
    let endIdx: number = idx + firstSegLen;
    let len: number;
    let begin: number = idx;
    let asciiCode: string;
    let tmp: string;
    let suffixBuf: StringBuilder = null;
    let parsedLen: number;

    if (endIdx > fldsVal.length) {
      throw new ApplicationException("in Record.getSpannedField() data string too short:\n" + fldsVal);
    }

    // append first segment
    result.Remove(0, result.Length);
    result.Append(RecordUtils.getString(fldsVal.substr(idx, endIdx - idx), type, useHex));

    idx = idx + firstSegLen;

    // next 4 characters are the length of the string (hex number) of special bytes.
    endIdx = idx + 4;
    tmp = fldsVal.substr(idx, endIdx - idx);
    len = NNumber.Parse(tmp, NumberStyles.HexNumber);
    idx = endIdx;

    // if working in hex
    if (useHex)
      endIdx = idx + len * 2;
    else
      endIdx = idx + Math.floor((len + 2) / 3 ) * 4;

    if (endIdx > fldsVal.length)
      throw new ApplicationException("in Record.getSpannedField() data string too short:\n" + fldsVal);

    // append special chars, one by one
    while (idx < endIdx) {
      tmp = fldsVal.substr(idx, 2);
      asciiCode = String.fromCharCode(NNumber.Parse(tmp, NumberStyles.HexNumber));
      result.Append(asciiCode);
      idx = idx + 2;
    }

    // next 4 chars are the length of next segment
    endIdx = idx + 4;
    tmp = fldsVal.substr(idx, endIdx - idx);
    len = NNumber.Parse(tmp, NumberStyles.HexNumber);
    idx = endIdx;

    if ((len & 0x8000) > 0) {
      // Oops, next segment may also be spanned
      suffixBuf = new StringBuilder();
      len = (len & 0x7FFF);

      if (type === StorageAttribute.BLOB || type === StorageAttribute.BLOB_VECTOR)
        if (useHex)
          len = len * 2;
        // working in base64
        else
          len = Math.floor((len + 2) / 3) * 4;

      parsedLen = RecordUtils.getSpannedField(fldsVal, len, idx, type, suffixBuf, useHex);
      // after using recursive function teh suffixBuf is in the right transformed form
      result.Append(suffixBuf.ToString());

      idx = idx + parsedLen;
    }
    else {
      if (type === StorageAttribute.BLOB || type === StorageAttribute.BLOB_VECTOR)
        if (useHex)
          len = len * 2;
        else
          len = Math.floor((len + 2) / 3) * 4;

      // next segment isn't spanned. It must be the last one.
      endIdx = idx + len;
      if (endIdx > fldsVal.length)
        throw new ApplicationException("in Record.fillFieldsData() data string too short:\n" + fldsVal);

      result.Append(RecordUtils.getString(fldsVal.substr(idx, endIdx - idx), type, useHex));
      idx = endIdx;
    }

    return idx - begin;
  }

  /// <summary>
  /// Translate value of the spanned field to actual value. Field value will be in the format of length and data
  /// [ (Length | data) ((Length | data)).....]
  /// This function will read length and data of each packet and return actual value.
  /// </summary>
  /// <param name="fldsVal"></param>
  /// <param name="firstSegLen"></param>
  /// <param name="idx"></param>
  /// <param name="type"></param>
  /// <param name="result"></param>
  /// <param name="useHex"></param>
  /// <param name="noOfPackets"> Total number of packets sent from the server</param>
  /// <returns></returns>
  private static getSpannedField_1(fldsVal: Uint8Array, firstSegLen: number, idx: number, type: StorageAttribute, result: StringBuilder, useHex: boolean, noOfPackets: number): number {
    let endIdx: number = idx + firstSegLen;
    let len: number;
    let begin: number = idx;
    let tmp: string;
    let suffixBuf: StringBuilder = null;
    let parsedLen: number;
    let tmpEnc: Encoding;
    if (UtilStrByteMode.isLocaleDefLangDBCS())
      tmpEnc = ISO_8859_1_Encoding.ISO_8859_1;
    else
      tmpEnc = Manager.Environment.GetEncoding();

    if (endIdx > fldsVal.length)
      throw new ApplicationException("in Record.getSpannedField() data string too short:\n" + fldsVal);

    // append first segment
    result.Remove(0, result.Length);
    result.Append(tmpEnc.GetString(fldsVal, idx, firstSegLen));
    noOfPackets = noOfPackets - 1;

    if (noOfPackets <= 0)
      return 0;

    idx = idx + firstSegLen;

    // next 4 characters are the length of the string (hex number) of special bytes.
    endIdx = idx + 4;
    tmp = tmpEnc.GetString(fldsVal, idx, 4);
    len = NNumber.Parse(tmp, NumberStyles.HexNumber);
    idx = endIdx;

    if (endIdx > fldsVal.length)
      throw new ApplicationException("in Record.getSpannedField() data string too short:\n" + fldsVal);

    // next 4 chars are the length of next segment
    endIdx = idx + 4;
    tmp = tmpEnc.GetString(fldsVal, idx, 4);
    len = NNumber.Parse(tmp, NumberStyles.HexNumber);
    idx = endIdx;

    if ((len & 0x8000) > 0) {
      // Oops, next segment may also be spanned
      suffixBuf = new StringBuilder();

      parsedLen = RecordUtils.getSpannedField(fldsVal, len, idx, type, suffixBuf, useHex, noOfPackets);
      // after using recursive function teh suffixBuf is in the right transformed form
      result.Append(suffixBuf.ToString());
      idx = idx + parsedLen;
    }
    else {
      // next segment isn't spanned. It must be the last one.
      endIdx = idx + len;
      if (endIdx > fldsVal.length)
        throw new ApplicationException("in Record.fillFieldsData() data string too short:\n" + fldsVal);

      result.Append(tmpEnc.GetString(fldsVal, idx, len));
      idx = endIdx;
    }

    return idx - begin;
  }
}
