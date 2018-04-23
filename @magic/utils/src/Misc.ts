// In order to convert some functionality to Visual C#, the Java Language Conversion Assistant
// creates "support classes" that duplicate the original functionality.
//
// Support classes replicate the functionality of the original code, but in some cases they are
// substantially different architecturally. Although every effort is made to preserve the
// original architecture of the application in the converted project, the user should be aware that
// the primary goal of these support classes is to replicate functionality, and that at times
// the architecture of the resulting solution may differ somewhat.


import {
  Exception, StringBuilder,
  NString, NNumber,
  DateTime, RefParam
} from "@magic/mscorelib";



/// <summary>
/// Contains conversion support elements such as classes, interfaces and static methods.
/// </summary>
export class Misc {

  /// <summary>
  /// Writes the exception stack trace to the received stream
  /// </summary>
  /// <param name="throwable">Exception to obtain information from</param>
  /// <param name="stream">Output sream used to write to</param>
  static WriteStackTrace(throwable: Exception): void {
    console.log(throwable.Message);
    console.log(throwable.StackTrace);
  }

  /// <summary>
  /// Receives a byte array and returns it transformed in an byte array
  /// </summary>
  /// <param name="byteArray">Byte array to process</param>
  /// <returns>The transformed array</returns>
  static ToSByteArray(byteArray: Uint8Array): Int8Array {
    let sbyteArray: Int8Array = null;
    if (byteArray !== null) {
      sbyteArray = new Int8Array(byteArray.length);
      for (let i: number = 0; i < byteArray.length; i = i + 1) {
        sbyteArray[i] = <number>byteArray[i];
      }
    }
    return sbyteArray;
  }

  /// <summary>
  /// Receives sbyte array and returns it transformed in a byte array
  /// </summary>
  /// <param name="sbyteArray">sbyte array to process</param>
  /// <returns>The transformed array</returns>
  static ToByteArray(sbyteArray: Int8Array): Uint8Array {
    let byteArray: Uint8Array = null;
    if (sbyteArray !== null) {
      byteArray = new Uint8Array(sbyteArray.length);
      for (let i: number = 0; i < sbyteArray.length; i = i + 1) {
        byteArray[i] = <number>sbyteArray[i];
      }
    }
    return byteArray;
  }

  /// <summary> Compares number of bytes in two byte arrays</summary>
  /// <param name="source"></param>
  /// <param name="destination"></param>
  /// <param name="numberOfBytes"></param>
  /// <returns> boolen true if equal</returns>
  static CompareByteArray(source: Uint8Array, destination: Uint8Array, numberOfBytes: number): boolean {
    if (source.length >= numberOfBytes && destination.length >= numberOfBytes) {
      for (let len: number = 0; len < numberOfBytes; len++) {
        if (source[len] !== destination[len])
          return false;
      }
    }
    else
      return false;

    return true;
  }

  /// <summary>
  /// Performs an unsigned bitwise right shift with the specified number
  /// </summary>
  /// <param name="number">Number to operate on</param>
  /// <param name="bits">Ammount of bits to shift</param>
  /// <returns>The resulting number from the shift operation</returns>
  // TODO: instead of calling URShift(number, bits), we can use((uint)number) >> bits.
  static URShift(number: number, bits: number): number {
    let result: number;
    if (number >= 0) {
      result = number >> bits;
    }
    else {
      result = (number >> bits) + (2 << ~bits);
    }
    return result;
  }

  /// <summary>
  /// get system's time in milliseconds
  /// </summary>
  /// <returns></returns>
  static getSystemMilliseconds(): number {
    // TODO - check if we need this adjustment
    return Math.floor((DateTime.Now.Ticks - 621355968000000000) / 10000);
  }

  /// <summary>
  /// Compares 2 int arrays
  /// </summary>
  /// <param name="arrayOne"></param>
  /// <param name="arrayTwo"></param>
  /// <returns>true if arrays are equal else false</returns>
  static CompareIntArrays(arrayOne: number[], arrayTwo: number[]): boolean {
    let areEqual: boolean = false;
    if (arrayOne === arrayTwo) {
      areEqual = true;
    }
    else {
      if (arrayOne !== null && arrayTwo !== null) {
        if (arrayOne.length === arrayTwo.length) {
          for (let i: number = 0; i < arrayOne.length; i = i + 1) {
            if (arrayOne[i] !== arrayTwo[i]) {
              break;
            }
            areEqual = true;
          }
        }
      }
    }
    return areEqual;
  }

  /// <summary>
  /// Returns the comma separated string for the values passed in int array.
  /// </summary>
  /// <param name="values">Integer array</param>
  /// <returns>comma separated string</returns>
  static GetCommaSeperatedString(intArray: number[]): string {
    let temp: StringBuilder = new StringBuilder();
    for (let val: number = 0; val < intArray.length; val = val + 1) {
      let value: number = intArray[val];
      if (temp.Length > 0) {
        temp.Append(",");
      }
      temp.Append(value);
    }
    return temp.ToString();
  }

  /// <summary>
  /// Returns int array out of comma separated string
  /// </summary>
  /// <param name="value">comma separated string</param>
  /// <returns>Integer array</returns>
  static GetIntArray(commaSeparatedValue: string): number[] {
    let intArray: number[] = new Array<number>(0);

    if (!NString.IsNullOrEmpty(commaSeparatedValue)) {
      let vals: string[] = commaSeparatedValue.split(',');
      intArray = new Array<number>(vals.length);

      let outInt: RefParam<number> = new RefParam(0);
      for (let iCtr: number = 0; iCtr < vals.length; iCtr = iCtr + 1) {
        let _r = NNumber.TryParse(vals[iCtr], outInt);
        intArray[iCtr] = outInt.value;
      }
    }

    return intArray;
  }

  static IsWebUrl(fileName: string): boolean {
    return fileName.toLowerCase().startsWith("http");
  }
}
