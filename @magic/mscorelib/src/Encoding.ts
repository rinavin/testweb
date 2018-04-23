import {TextEncoder, TextDecoder} from "text-encoding";
import {Hashtable} from "./HashTable";
import {ISO_8859_1_Encoding} from "./ISO_8859_1_Encoding";

export class Encoding {
  static readonly ASCII: Encoding = new Encoding("ascii");
  static readonly UTF8: Encoding = new Encoding("utf-8");
  static readonly Unicode: Encoding = new Encoding("utf-16le");

  static readonly CodePageToEncodingMap: Hashtable<number, string> = Encoding.PopulateCodePageToEncodingMap();

  private readonly textEncoder: TextEncoder = null;
  private readonly textDecoder: TextDecoder = null;
   constructor(label: string) {
    this.textEncoder = new TextEncoder(label, {NONSTANDARD_allowLegacyEncoding: true});
    this.textDecoder = new TextDecoder(label, {NONSTANDARD_allowLegacyEncoding: true});
  }

  GetBytes(str: string): Uint8Array {

    if (str === null)
      throw new Error("Argument is null");

    let bytes: Uint8Array = null;

    try {
      bytes = this.textEncoder.encode(str);
    }
    catch (ex) {
      // In C#, if any character is not within the range of specified charset, it is replaced by '?'.
      // TextEncoder.encode() throws an error in such a case.
      // We can modify the implementation of TextEncoder.encode() to put '?' instead of throwing error.
      // But, it can be problematic if we change the library version.
      // So, we will catch this error and handle the encoding ourselves.
      bytes = new Uint8Array(str.length * 3);
      let bytesCount: number = 0;
      let tmpBytes: Uint8Array;

      for (let i = 0; i < str.length; i++)
      {
        try {
          tmpBytes = this.textEncoder.encode(str[i]);
          bytes.set(tmpBytes, bytesCount);
          bytesCount += tmpBytes.length;
        }
        catch (ex) {
          bytes[bytesCount++] = "?".charCodeAt(0);
        }
      }

      bytes = bytes.slice(0, bytesCount);
    }

    return bytes;
  }

  GetByteCount(str: string): number {
    // TODO: this is not the best way.
    return this.GetBytes(str).length;
  }

  GetString(bytes: Uint8Array, index: number, count: number): string {
    let str: string = null;

    if (bytes === null)
      throw new Error("Argument is null");

    if (index < 0 || count < 0 || (index + count) > bytes.length)
      throw new Error("Argument out of range");

    bytes = bytes.slice(index, count);

    try {
      str = this.textDecoder.decode(bytes);
    }
    catch (ex) {
    }

    return str;
  }

  static GetEncoding(codepage: number): Encoding {
    let label: string = Encoding.CodePageToEncodingMap.get_Item(codepage);

    if (label == null)
      throw new Error("Invalid codepage.");

    return new Encoding(label);
  }

  private static PopulateCodePageToEncodingMap(): Hashtable<number, string> {

    let hashTable: Hashtable<number, string> = new Hashtable();

    // These map is similar to enc_map_table of exp_xml.cpp
    hashTable.Add(20106, "DIN_66003");                    // IA5 (German)
    hashTable.Add(20108, "NS_4551-1");                    // IA5 (Norwegian)
    hashTable.Add(20107, "SEN_850200_B");                 // IA5 (Swedish)
    hashTable.Add(50932, "_autodetect");                  // Japanese (Auto Select)
    hashTable.Add(50949, "_autodetect_kr");               // Korean (Auto Select)
    hashTable.Add(950, "big5");                           // Chinese Traditional (Big5)
    hashTable.Add(50221, "csISO2022JP");                  // Japanese (JIS-Allow 1 byte Kana)
    hashTable.Add(51949, "euc-kr");                       // Korean (EUC)
    hashTable.Add(936, "gb2312");                         // Chinese Simplified (GB2312)
    hashTable.Add(52936, "hz-gb-2312");                   // Chinese Simplified (HZ)
    hashTable.Add(852, "ibm852");                         // Central European (DOS)
    hashTable.Add(866, "ibm866");                         // Cyrillic Alphabet (DOS)
    hashTable.Add(20105, "irv");                          // IA5 (IRV)
    hashTable.Add(50220, "iso-2022-jp");                  // Japanese (JIS)
    hashTable.Add(50222, "iso-2022-jp");                  // Japanese (JIS-Allow 1 byte Kana)
    hashTable.Add(50225, "iso-2022-kr");                  // Korean (ISO)
    hashTable.Add(28591, "iso-8859-1");                   // Western Alphabet (ISO)
    hashTable.Add(28592, "iso-8859-2");                   // Central European Alphabet (ISO)
    hashTable.Add(28593, "iso-8859-3");                   // Latin 3 Alphabet (ISO)
    hashTable.Add(28594, "iso-8859-4");                   // Baltic Alphabet (ISO)
    hashTable.Add(28595, "iso-8859-5");                   // Cyrillic Alphabet (ISO)
    hashTable.Add(28596, "iso-8859-6");                   // Arabic Alphabet (ISO)
    hashTable.Add(28597, "iso-8859-7");                   // Greek Alphabet (ISO)
    hashTable.Add(28598, "iso-8859-8");                   // Hebrew Alphabet (ISO)
    hashTable.Add(20866, "koi8-r");                       // Cyrillic Alphabet (KOI8-R)
    hashTable.Add(949, "ks_c_5601");                      // Korean
    hashTable.Add(932, "shift-jis");                      // Japanese (Shift-JIS)
    hashTable.Add(1200, "unicode");                       // Universal Alphabet
    hashTable.Add(1201, "unicodeFEFF");                   // Universal Alphabet (Big-Endian)
    hashTable.Add(65000, "utf-7");                        // Universal Alphabet (UTF-7)
    hashTable.Add(65001, "utf-8");                        // Universal Alphabet (UTF-8)
    hashTable.Add(1250, "windows-1250");                  // Central European Alphabet (Windows)
    hashTable.Add(1251, "windows-1251");                  // Cyrillic Alphabet (Windows)
    hashTable.Add(1252, "windows-1252");                  // Western Alphabet (Windows)
    hashTable.Add(1253, "windows-1253");                  // Greek Alphabet (Windows)
    hashTable.Add(1254, "windows-1254");                  // Turkish Alphabet
    hashTable.Add(1255, "windows-1255");                  // Hebrew Alphabet (Windows)
    hashTable.Add(1256, "windows-1256");                  // Arabic Alphabet (Windows)
    hashTable.Add(1257, "windows-1257");                  // Baltic Alphabet (Windows)
    hashTable.Add(1258, "windows-1258");                  // Vietnamese Alphabet (Windows)
    hashTable.Add(874, "windows-874");                    // Thai (Windows)
    hashTable.Add(20127, "US-ASCII");                     // us-ascii
    hashTable.Add(51932, "x-euc");                        // Japanese (EUC)

    return hashTable;
  }
}
