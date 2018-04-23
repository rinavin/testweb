import {IReferencedObject} from "./IReferencedObject";
import {GuiConstants} from "../../GuiConstants";
import {StorageAttribute, StrUtil} from "@magic/utils";
import {NUM_TYPE} from "./NUM_TYPE";
import {ApplicationException, NString} from "@magic/mscorelib";
import {VectorType} from "./VectorType";


export const EMPTY_DCREF: number = -2;
export const NOT_FOUND: number = GuiConstants.DEFAULT_VALUE_INT;


export class DcValues implements IReferencedObject {


  private _id: number = 0;
  private _type: StorageAttribute = StorageAttribute.NONE; // Alpha | Numeric | Date | Time | Logical
  private _refCount: number = 0; // references counter
  private _nullFlags: boolean[] = null; // linked null value flags
  private _isNumericType: boolean = false; // true if the type is one of: numeric, date, time
  private _numVals: NUM_TYPE[] = null; // numeric linked values
  private _linkVals: string[] = null; // linked values
  private _dispVals: string[] = null; // display values

  get HasReferences(): boolean {
    return this._refCount > 0;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="empty"></param>
  /// <param name="isVector"></param>
  constructor(empty: boolean, isVector: boolean) {
    if (empty) {
      this._id = EMPTY_DCREF;
    }
    this._isNumericType = false;
  }

  /// <summary>
  /// Returns the attr of DcValues
  /// </summary>
  GetAttr(): StorageAttribute {
    return this._type;
  }

  setType(type: StorageAttribute): void {
    this._type = type;
    if (this._type === StorageAttribute.MEMO)
      this._type = StorageAttribute.ALPHA;
    if (this._type === StorageAttribute.NUMERIC || this._type === StorageAttribute.DATE ||
      this._type === StorageAttribute.TIME) {
      this._isNumericType = true;
    }
  }

  SetID(newId: number): void {
    this._id = newId;
  }

  SetDisplayValues(displayValues: string[]): void {
    if (displayValues !== null)
      this._dispVals = displayValues.slice();
    else
      this._dispVals = null;
  }

  SetLinkValues(linkValues: string[]): void {
    if (linkValues !== null)
      this._linkVals = linkValues.slice();
    else
      this._linkVals = null;

    this.setNumericVals();
  }

  setNullFlags(nullFlags: boolean[]): void {
    if (nullFlags !== null)
      this._nullFlags = nullFlags.slice();

    else
      this._nullFlags = null;
  }

  private setNumericVals(): void {
    if (this._isNumericType && this._linkVals !== null) {
      this._numVals = new Array<NUM_TYPE>(this._linkVals.length);
      for (let i: number = 0; i < this._linkVals.length; i = i + 1) {
        this._numVals[i] = new NUM_TYPE(this._linkVals[i]);
      }
    }
    else {
      this._numVals = null;
    }
  }

  /// <summary>
  ///   returns the id of this dcVals object
  /// </summary>
  getId(): number {
    return this._id;
  }

  /// <summary>
  ///   return the display values
  /// </summary>
  getDispVals(): string[] {
    return this._dispVals;
  }

  /// <summary>
  /// return Link field values.
  /// </summary>
  GetLinkVals(): string[] {
    return this._linkVals;
  }

  /// <summary>
  ///   returns the array of indice for an item in the list by comparing the mgVal to the linked value or (-1) if none was
  ///   found
  /// </summary>
  /// <param name = "mgVal">the internal value to look for </param>
  /// <param name = "isVectorValue">Denotes whether the value in mgVal should be treated as a vector (true) or not (false).</param>
  /// <param name = "isNull">true if the value to look for is null </param>
  /// <param name = "extraVals">Additional values, prepended to the searched values.</param>
  /// <param name="extraNums">Additional numeric values to be prepended to the searched values.</param>
  /// <param name = "splitCommaSeperatedVals">to split the val on comma or not </param>
  getIndexOf(mgVal: string, isVectorValue: boolean, isNull: boolean, extraVals: string[], extraNums: NUM_TYPE[], splitCommaSeperatedVals: boolean): number[] {
    let result: number = NOT_FOUND;

    let tmpMgVal: string;
    let ctrlNumVal: NUM_TYPE;
    let trimmedVal: string;
    let vals: string[] = null;
    let nums: NUM_TYPE[] = null;
    let offset: number = 0;
    let firstFitMatchIdx;
    let firstFitMatchLength: number = -1;
    let minLength: number = -1;
    let compStr: string = "";
    let indice: number[] = null;
    let values: string[] = null;

    if (isNull) {
      let i: number = 0;
      indice = [
        NOT_FOUND
      ];
      for (i = 0; this._nullFlags !== null && i < this._nullFlags.length; i++) {
        if (this._nullFlags[i]) {
          indice[0] = i;
          break;
        }
      }

      return indice;
    }
    if (!isVectorValue) {
      // split the comma separated values;
      if (splitCommaSeperatedVals) {
        values = mgVal.split(',');
      }
      else {
        values = [
          mgVal
        ];
      }
    }
    else {
      let vectorType: VectorType = new VectorType(mgVal);
      values = vectorType.GetCellValues();
    }
    indice = new Array<number>(values.length);

    for (let iCtr: number = 0; iCtr < values.length; iCtr = iCtr + 1) {
      result = NOT_FOUND;
      firstFitMatchIdx = NOT_FOUND;

      tmpMgVal = values[iCtr];

      if (this._isNumericType || extraNums !== null) {
          ctrlNumVal = new NUM_TYPE(tmpMgVal);
        trimmedVal = tmpMgVal;
      }
      else {
        ctrlNumVal = null;
        trimmedVal = StrUtil.rtrim(tmpMgVal);
      }

      // Run two passes. First one on extra values, second one on values belonging to this object
      for (let i = 0; i < 2 && result === NOT_FOUND; i++) {
        switch (i) {
          case 0:
            vals = extraVals;
            nums = extraNums;
            offset = 0;
            break;

          case 1:
          default:
            if (this._isNumericType || nums != null)
              offset = (nums == null ? 0 : nums.length);
            else
              offset = (vals == null ? 0 : vals.length);
            vals = this._linkVals;
            nums = this._numVals;
            break;
        }

        if (vals != null) {
          for (let j = 0; j < vals.length && result === NOT_FOUND; j++) {
            if (this._isNumericType || nums != null) {
              if (NUM_TYPE.num_cmp(ctrlNumVal, nums[j]) === 0 || tmpMgVal === vals[j] ||
                tmpMgVal === vals[j]) {
                // the numeric type is found exactly
                result = j + offset;
                break;
              }
            }
            else {
              if (vals[j] === tmpMgVal || trimmedVal.length > 0 && StrUtil.rtrim(vals[j]) === trimmedVal) {
                result = j + offset;
                break;
              }

              // If Magic sent us a blank value, and such a value exists in the "non DC range" select it.
              // QCR # 751037 - search for blank values even in the linked values array of the data control
              if (trimmedVal.length === 0 && StrUtil.rtrim(vals[j]).length === 0) {
                result = j + offset;
                break;
              }

              // save the first fitting result
              // fixed bug#: 935015, the comparison will be according to the min length of the data & the options
              if (result === NOT_FOUND && trimmedVal.length > 0) {
                minLength = Math.min(trimmedVal.length, vals[j].length);
                compStr = trimmedVal.substr(0, minLength);
                if (compStr.length > 0 && vals[j].startsWith(compStr)) {
                  // if there is a min length match, check if it is the first fit match.
                  // eg: if list has a,aaa,aaaaa and field value is 'aa' then first fit match is 'aaa'.
                  // if list is a,aaaaa,aaa and field value is 'aa' then first fit match is 'aaaaa'.
                  // if first fit not found, then closest match is used (eg- if field value is
                  // 'aaaaaaaaa' in both the above list, closest match would be 'aaaaa').
                  if (minLength > firstFitMatchLength) {
                    firstFitMatchIdx = j + offset;
                    firstFitMatchLength = minLength;
                  }
                }
              }
            }
          }
        }
      }

      if (result === NOT_FOUND)
        result = firstFitMatchIdx;

      // store indice found in integer array.
      indice[iCtr] = result;
    }

    return indice;
  }

/// <summary>
  ///   gets the value of a specific link item
  /// </summary>
  /// <param name = "idx">the index of the link value (0 = first item) </param>
  /// <returns> Magic value of the item </returns>
  getLinkValue(idx: number): string {
    let lnkVal: string = null;

    if (this._linkVals !== null) {
      lnkVal = this._linkVals[idx];
    }

    return lnkVal;
  }

  /// <summary>
  ///   returns true, if value at index idx is null
  /// </summary>
  /// <param name = "the">index of an item in the list </param>
  isNull(idx: number): boolean {
    if (this._nullFlags == null)
    // happens for non-DC choice controls
      return false;

    return this._nullFlags[idx];
  }

  /// <summary>
  ///   increase the references count by 1
  /// </summary>
  AddReference(): void {
    this._refCount++;
  }

  /// <summary>
  ///   decrease the references count by 1
  /// </summary>
  RemoveReference(): void {
    this._refCount--;
    if (this._refCount < 0) {
      throw new ApplicationException("in dcVals.decrease() references count is less than zero");
    }
  }

  /// <summary>
  ///   returns true if the references count is zero
  /// </summary>
  ToString(): string {
    return NString.Format("{{DCValues 0x{0:X8}, {1} refs}}", this._id, this._refCount);
  }
}
