import {RefParam} from "./RefParam";
import {NotImplementedException} from "./NotImplementedException";

export enum NumberStyles {
  HexNumber
}

export class NNumber {

  /// <summary>
  ///  convert a string to number
  /// for blank string , it will return 0
  ///  for incorrect format it will return NaN
  /// <summary>
  static Parse(text: string, style?: NumberStyles): number {
    if (arguments.length === 2) {
      if (style === NumberStyles.HexNumber)
        return parseInt(text, 16);
      else
        throw new NotImplementedException();
    }
    return +text; // use unary + operator to convert string  to number.
  }


  /// <summary>
  ///  convert a string to number
  ///  return true if string is correctly parsed i.e pvalue.value is number
  ///  for incorrect format it will return false
  /// <summary>
  static TryParse(str: string, pvalue: RefParam<number>): boolean {
    pvalue.value = +str;
    return !isNaN(pvalue.value);
  }

  /// <summary>
  ///  convert a number to string with specified format
  /// <summary>
  static ToString(num: number, format: string): string {
    if (format === 'X2') {
      let res: string = num.toString(16);
      return res.length === 1 ? '0' + res : res;
    }
    throw new NotImplementedException();
  }
}
