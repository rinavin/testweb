import {Encoding, Exception, ApplicationException, ISO_8859_1_Encoding} from "@magic/mscorelib";
import {Misc, StrUtil} from "../index";

export class Base64{
  private static _base64EncMap: Uint8Array = Base64.initializeEncMap();
  private static _base64DecMap: Uint8Array = Base64.initializeDecMap();


  static encode(str: string, encoding: Encoding): string;
  static encode(str: string, isUseEnvCharset: boolean, encoding: Encoding): string;
  static encode(data: Uint8Array): Uint8Array;
  static encode(strOrData: any, encodingOrIsUseEnvCharset?: any, encoding?: Encoding): any {
    if (arguments.length === 2)
      return Base64.encode_0(strOrData, encodingOrIsUseEnvCharset);

    else if (arguments.length === 3)
      return Base64.encode_1(strOrData, encodingOrIsUseEnvCharset, encoding);

    else
      return Base64.encode_2(strOrData);
  }

  /// <summary> This method encodes the given string using the base64-encoding
  /// specified in RFC-2045 (Section 6.8). It's used for example in the
  /// "Basic" authorization scheme.
  /// </summary>
  /// <param name="str">the string </param>
  /// <param name="encoding"> Environment.Encoding </param>
  /// <returns> the base64-encoded str </returns>
  private static encode_0(str: string, encoding: Encoding): string {
    return Base64.encode(str, false, encoding);
  }

  /// <summary> Encodes string using the base64-encoding.
  /// If isUseEnvCharset is true, use the specific charset when converting
  /// string to byte array. (DBCS support)
  /// </summary>
  /// <param name="str">the string </param>
  /// <param name="isUseEnvCharset"> </param>
  /// <param name="encoding"> Environment.Encoding </param>
  /// <returns> the base64-encoded str </returns>
  private static encode_1(str: string, isUseEnvCharset: boolean, encoding: Encoding): string {
    let result: string;
    if (str === null) {
      result = null;
    }
    else {
      if (str === "") {
        result = str;
      }
      else {
        try {
          let instance: Encoding = ISO_8859_1_Encoding.ISO_8859_1;
          let encoding2: Encoding = isUseEnvCharset ? encoding : instance;
          let ba: Uint8Array = Base64.encode(encoding2.GetBytes(str));
          result = instance.GetString(ba, 0, ba.length);
        }
        catch (ex) {
          throw new ApplicationException(ex.Message);
        }
      }
    }
    return result;
  }

  /// <summary> This method encodes the given byte[] using the base64-encoding
  /// specified in RFC-2045 (Section 6.8).
  /// </summary>
  /// <param name="data">the data </param>
  /// <returns> the base64-encoded data </returns>
  private static encode_2(data: Uint8Array): Uint8Array {

    if (data === null)
      return null;

    let dest: Uint8Array = new Uint8Array(Math.floor((data.length + 2) / 3) * 4);
    let sidx: number = 0;
    let didx: number = 0;

    // 3-byte to 4-byte conversion + 0-63 to ASCII printable conversion
    while (sidx < data.length - 2) {
      dest[didx++] = Base64._base64EncMap[Misc.URShift(<number>data[sidx], 2) & 63];
      dest[didx++] = Base64._base64EncMap[(Misc.URShift(<number>data[sidx + 1], 4) & 15) | (<number>data[sidx] << 4 & 63)];
      dest[didx++] = Base64._base64EncMap[(Misc.URShift(<number>data[sidx + 2], 6) & 3) | (<number>data[sidx + 1] << 2 & 63)];
      dest[didx++] = Base64._base64EncMap[<number>(data[sidx + 2] & 63)];
      sidx = sidx + 3;
    }

    if (sidx < data.length) {
      dest[didx++] = Base64._base64EncMap[Misc.URShift(<number>data[sidx], 2) & 63];
      if (sidx < data.length - 1) {
        dest[didx++] = Base64._base64EncMap[(Misc.URShift(<number>data[sidx + 1], 4) & 15) | (<number>data[sidx] << 4 & 63)];
        dest[didx++] = Base64._base64EncMap[<number>data[sidx + 1] << 2 & 63];
      }
      else {
        dest[didx++] = Base64._base64EncMap[<number>data[sidx] << 4 & 63];
      }
    }

    // add padding
    while (didx < dest.length) {
      dest[didx] = 61;
      didx = didx + 1;
    }

    return dest;
  }

  static decode(str: string): string;
  static decode(str: string, encoding: Encoding): string;
  static decode(data: Uint8Array): Uint8Array;
  static decode(strOrData: any, encoding?: Encoding): any {
    if (arguments.length === 1 && (strOrData === null || strOrData.constructor === String))
      return Base64.decode_0(strOrData);

    else if (arguments.length === 2)
      return Base64.decode_1(strOrData, encoding);

    else
      return Base64.decode_2(strOrData);
  }

  /// <summary> This method decodes the given string using the base64-encoding
  /// specified in RFC-2045 (Section 6.8).
  /// </summary>
  /// <param name="str">the base64-encoded string. </param>
  /// <returns> the decoded str.</returns>
  private static decode_0(str: string): string {
    return Base64.decode(str, null);
  }

  /// <summary> This method decodes the given string using the base64-encoding
  /// specified in RFC-2045 (Section 6.8).
  /// </summary>
  /// <param name="str">the base64-encoded string. </param>
  /// <param name="encoding">Environment.Encoding or null.</param>
  /// <returns> the decoded str.</returns>
  private static decode_1(str: string, encoding: Encoding): string {

    let result: string;
    if (str === null) {
      result = null;
    }
    else {
      if (str === "") {
        result = str;
      }
      else {
        try {
          let instance: ISO_8859_1_Encoding = ISO_8859_1_Encoding.ISO_8859_1;
          let array: Uint8Array = Base64.decode(instance.GetBytes(str));
          let encoding2: Encoding = (encoding !== null) ? encoding : instance;
          result = encoding2.GetString(array, 0, array.length);
        }
        catch (ex) {
          throw new ApplicationException(ex.Message);
        }
      }
    }
    return result;
  }

  /// <summary> This method decodes the given byte[] using the base64-encoding
  /// specified in RFC-2045 (Section 6.8).
  /// </summary>
  /// <param name="data">the base64-encoded data.</param>
  /// <returns> the decoded <var>data</va
  private static decode_2(data: Uint8Array): Uint8Array {
    if (data === null)
      return null;

    let tail: number = data.length;
    while (data[tail - 1] === '='.charCodeAt(0)) {
      tail = tail - 1;
    }
    let dest: Uint8Array = new Uint8Array(tail - Math.floor(data.length / 4));

    // ASCII printable to 0-63 conversion
    for (let idx: number = 0; idx < data.length; idx = idx + 1) {
      data[idx] = Base64._base64DecMap[data[idx]];
    }

    // 4-byte to 3-byte conversion
    let sidx: number = 0;
    let didx: number;
    for (didx = 0; didx < dest.length - 2; didx = didx + 3) {
      dest[didx] = (((data[sidx] << 2) & 255) | (Misc.URShift(data[sidx + 1], 4) & 3));
      dest[didx + 1] = (((data[sidx + 1] << 4) & 255) | (Misc.URShift(data[sidx + 2], 2) & 15));
      dest[didx + 2] = (((data[sidx + 2] << 6) & 255) | (data[sidx + 3] & 63));
      sidx = sidx + 4;
    }

    if (didx < dest.length)
      dest[didx] = (((data[sidx] << 2) & 255) | (Misc.URShift(data[sidx + 1], 4) & 3));
    if ((didx = didx + 1) < dest.length)
      dest[didx] = (((data[sidx + 1] << 4) & 255) | (Misc.URShift(data[sidx + 2], 2) & 15));

    return dest;
  }

  /// <summary> decoded and return an hex representation of the data</summary>
  static decodeToHex(str: string): string {
    if (str === null)
      return null;
    if (str === "")
      return str;

    return StrUtil.stringToHexaDump(Base64.decode(str), 2);
  }

  /// <summary> decodes a string to byte array</summary>
  static decodeToByte(str: string): Uint8Array {
    if (str === null)
      return null;

    // QCR 740918 if we have and empty expression it is sent from the server as empty string
    // and changed locally to a string with one blank either way they are not valid base64 encoded
    // string and should not be decoded.
    if (str === "" || str === " ")
      return new Uint8Array(0);

    try {
      let instance: Encoding = ISO_8859_1_Encoding.ISO_8859_1;
      return Base64.decode(instance.GetBytes(str));
    }
    catch (ex) {
      throw new ApplicationException(ex.Message);
    }
  }

  private static initializeEncMap() {
    return new Uint8Array([
      65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83,
      84, 85, 86, 87, 88, 89, 90, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
      110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 48, 49, 50, 51, 52, 53, 54,
      55, 56, 57, 43, 47
    ]);

  }

  private static initializeDecMap() {
    let decMap: Uint8Array = new Uint8Array(128);

    for (let i: number = 0; i < Base64._base64EncMap.length; i = i + 1) {
      decMap[Base64._base64EncMap[i]] = i;
    }

    return decMap;
  }
}
