import {DcValues} from "./DcValues";
import {List, StringBuilder, NNumber, NumberStyles} from "@magic/mscorelib";
import {StorageAttribute, Base64} from "@magic/utils";
import {Manager} from "../../Manager";
import {RecordUtils} from "./RecordUtils";

/// <summary>
/// Base class for DcValues builder. The class is abstract and, thus, must be inherited.
/// The inheriting class, which will usually be in another package, will not be able to modify
/// a DcValues object directly, since all its setter methods are 'internal'. This class will
/// provide the setter methods for the inheriting builder.
/// <para>Here's a usage example:
/// <example>
/// class MyConcreteBuilder : DcValuesBuilderBase
/// {
///   public override DcValues Build()
///   {
///      var dcValues = base.CreateDcValues(false);
///      SetId(newId);
///      SetType(theType);
///      SetDisplayValues(theDisplayValues);
///      ...
///      return dcValues;
///   }
/// }
/// </example>
/// </summary>
export abstract class DcValuesBuilderBase {

  abstract Build(): DcValues;

  CreateDcValues(isVector: boolean): DcValues {
    return new DcValues(false, isVector);
  }

  SetId(dcValues: DcValues, newId: number): void {
    dcValues.SetID(newId);
  }

  SetType(dcValues: DcValues, type: StorageAttribute): void {
    dcValues.setType(type);
  }

  SetDisplayValues(dcValues: DcValues, displayValues: string[]): void {
    dcValues.SetDisplayValues(displayValues);
  }

  SetLinkValues(dcValues: DcValues, linkValues: string[]): void {
    dcValues.SetLinkValues(linkValues);
  }

  SetNullFlags(dcValues: DcValues, nullFlagsString: string): void;
  SetNullFlags(dcValues: DcValues, nullFlags: boolean[]): void;
  SetNullFlags(dcValues: DcValues, nullFlagsStringOrNullFlags: any): void {
    if (arguments.length === 2 && (dcValues === null || dcValues instanceof DcValues) && (nullFlagsStringOrNullFlags === null || nullFlagsStringOrNullFlags.constructor === String)) {
      this.SetNullFlags_0(dcValues, nullFlagsStringOrNullFlags);
      return;
    }
    this.SetNullFlags_1(dcValues, nullFlagsStringOrNullFlags);
  }

  private SetNullFlags_0(dcValues: DcValues, nullFlagsString: string): void {
    let nullFlags: boolean[] = this.ParseNullFlags(nullFlagsString);
    dcValues.setNullFlags(nullFlags);
  }

  private SetNullFlags_1(dcValues: DcValues, nullFlags: boolean[]): void {
    dcValues.setNullFlags(nullFlags);
  }

  /// <summary>
  /// Parse a serialized values string as an array of values.
  /// </summary>
  /// <param name="valueStr">This is string of the concatenated values, with each value preceded with a hex number denoting its length.</param>
  /// <param name="dataType">The data type of the values.</param>
  /// <param name="useHex"></param>
  protected ParseValues(valueStr: string, dataType: StorageAttribute, useHex: boolean): string[] {

    let snumber: string;
    let tmpValue: string = null;
    let buffer: List<string> = new List<string>();
    let array: string[];
    let len: number;
    let nextIdx: number;
    let endIdx: number;
    let suffixBuf: StringBuilder = null;

    switch (dataType) {
      case StorageAttribute.NUMERIC:
      case StorageAttribute.DATE:
      case StorageAttribute.TIME:
        if (useHex)
          len = Manager.Environment.GetSignificantNumSize() * 2;
        else
          len = Math.floor((Manager.Environment.GetSignificantNumSize() + 2) / 3) * 4;
        break;

      case StorageAttribute.BOOLEAN:
        len = 1;
        break;

      default:
        len = 0;
        break;
    }

    nextIdx = 0;
    while (nextIdx < valueStr.length) {
      // compute the length of an alpha data
      if (dataType === StorageAttribute.ALPHA || dataType === StorageAttribute.UNICODE ||
        dataType === StorageAttribute.BLOB || dataType === StorageAttribute.BLOB_VECTOR) {
        snumber = valueStr.substr(nextIdx, 4);
        len = NNumber.Parse(snumber, NumberStyles.HexNumber);
        nextIdx += 4;
      }

      // check if the data is spanned
      if (len >= 0x8000) {
        suffixBuf = new StringBuilder();
        len -= 0x8000;
        // next segment may also be spanned
        nextIdx += RecordUtils.getSpannedField(valueStr, len, nextIdx, dataType, suffixBuf, useHex);
        buffer.push(suffixBuf.ToString());
      }
      else {
        endIdx = nextIdx + len;
        if (useHex)
          tmpValue = valueStr.substr(nextIdx, (endIdx) - (nextIdx));
        else
          tmpValue = Base64.decodeToHex(valueStr.substr(nextIdx, (endIdx) - (nextIdx)));
        // the following two lines are redundant since the makePrintable() is called
        // in the guiManager when building the options
        /*if (dataType == DATA_TYPE_ALPHA)
             tmpValue = guiManager.makePrintable(tmpValue);*/
        buffer.push(tmpValue);
        nextIdx = endIdx;
      }
    }

    // vector to array
    return buffer.ToArray();
  }

  ParseNullFlags(nullFlagsString: string): boolean[] {
    let array: boolean[] = new Array<boolean>(nullFlagsString.length);
    for (let i: number = 0; i < nullFlagsString.length; i = i + 1) {
      array[i] = (nullFlagsString.charAt(i) !== '0'/*'0'*/);
    }
    return array;
  }

  constructor() {
  }
}
