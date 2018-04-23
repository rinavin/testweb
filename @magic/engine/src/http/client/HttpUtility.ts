import {Encoding, NString} from "@magic/mscorelib";
import {Logger} from "@magic/utils";

/// <summary>Provides methods for encoding URLs when processing Web requests.
///   This class cannot be inherited.
/// </summary>
export class HttpUtility {
  static EncodingEnabled: boolean = true;

  /// <summary>Decodes all the bytes in the specified byte array into a string.</summary>
  /// <remarks>Replace the method "System.Text.Encoding.ASCII.GetString(byte[] bytes);" in .Net Framework.</remarks>
  /// <param name = "bytes">The byte array containing the sequence of bytes to decode.</param>
  /// <returns>A String containing the results of decoding the specified sequence of bytes.</returns>
  private static ASCIIGetString(bytes: Uint8Array): string {
    return Encoding.ASCII.GetString(bytes, 0, bytes.length);
  }

  private static IntToHexCharCode(n: number): number {
    if (n <= 9)
      return n + 0x30;

    return (n - 10) + 0X61;
  }

  private static IsSafe(ch: string): boolean {
    if ((ch >= 'a' && ch <= 'z') ||
        (ch >= 'A' && ch <= 'Z') ||
        (ch >= '0' && ch <= '9'))
      return true;

    switch (ch) {
      case '\'':
      case '(':
      case ')':
      case '*':
      case '-':
      case '.':
      case '_':
      case '!':
        return true;
    }

    return false;
  }

  /// <summary>Encodes a URL string using the specified encoding object.</summary>
  /// <returns>An encoded string.</returns>
  /// <param name = "e">The <see cref = "T:System.Text.Encoding"></see> object that specifies the encoding scheme. </param>
  /// <param name = "str">The text to encode. </param>
  static UrlEncode(str: string, e: Encoding): string {
    let encodedStr: string = null;

    if (str !== null) {
      encodedStr = HttpUtility.ASCIIGetString(HttpUtility.UrlEncodeToBytes(str, e));
      Logger.Instance.WriteServerMessagesToLog(NString.Format("\nString: {0}\nUrlEncoded by: {1}\nTo: {2}", str, e, encodedStr));
    }

    return encodedStr;
  }

  /// <summary>Converts a string into a URL-encoded array of bytes using the specified encoding object.</summary>
  /// <returns>An encoded array of bytes.</returns>
  /// <param name = "e">The <see cref = "T:System.Text.Encoding"></see> that specifies the encoding scheme. </param>
  /// <param name = "str">The string to encode </param>
  private static UrlEncodeToBytes(str: string, e: Encoding): Uint8Array {
    if (str === null) {
      return null;
    }

    let bytes: Uint8Array = e.GetBytes(str);
    return HttpUtility.UrlEncodeBytesToBytesInternal(bytes, 0, bytes.length);
  }

  private static UrlEncodeBytesToBytesInternal(bytes: Uint8Array, offset: number, count: number): Uint8Array {
    if (!HttpUtility.EncodingEnabled) {
      return bytes;
    }

    let num: number = 0;
    let num2: number = 0;
    for (let i: number = 0; i < count; i++) {
      let ch: string = String.fromCharCode(bytes[offset + i]);
      if (ch === ' ') {
        num = num++;
      }
      else if (!HttpUtility.IsSafe(ch)) {
        num2 = num2 + 1;
      }
    }
    if (num === 0 && num2 === 0) {
      return bytes;
    }

    let buffer: Uint8Array = new Uint8Array(count + num2 * 2);
    let num4: number = 0;
    for (let j: number = 0; j < count; j++) {
      let num6: number = bytes[offset + j];
      // TODO: Consider sending number instead of creating a new string for each byte.
      let ch: string = String.fromCharCode(num6);
      if (HttpUtility.IsSafe(ch)) {
        buffer[num4++] = num6;
      }
      else if (ch === ' ') {
          buffer[num4++] = 0X2b;
      }
      else {
        buffer[num4++] = 0X25;
        buffer[num4++] = HttpUtility.IntToHexCharCode(num6 >> 4 & 15);
        buffer[num4++] = HttpUtility.IntToHexCharCode(num6 & 15);
      }
    }

    return buffer;
  }
}
