
import {isNullOrUndefined} from "util";


// @dynamic
export class NString {
    static Empty = "";

    static IndexOf(str: string, searchStr: any, startIndex: number, count: number): number {
        let index: number = str.substr(startIndex, count).indexOf(searchStr);
        return index > -1 ? startIndex + index : index;
    }

    static IndexOfAny(str: string, subs: string[], startIndex: number, count: number): number {
        for (let i = 0; i < count; ++i) {
            let c = str.charAt(startIndex + i);
            for (let j = 0; j < subs.length; ++j) {
                if (c === subs[j])
                    return (startIndex + i);
            }
        }
        return -1;
    }

    static CopyTo(source: string, sourceIndex: number, destination: string[], destinationIndex: number, count: number) {
        for (let i = sourceIndex; i < count; i++) {
            destination[destinationIndex] = source[i];
        }
    }

    static Compare(strA: string, strB: string, ignoreCase: boolean): number
    static Compare(strA: string, strB: string, ignoreCase: boolean, indexA: number, indexB: number, length: number): number
    static Compare(strA: string, strB: string, ignoreCase: boolean, indexA?: number, indexB?: number, length?: number): number {
        if (arguments.length = 6) {
            strA = strA.substr(indexA, length);
            strB = strB.substr(indexB, length);
        }
        if (ignoreCase) {
            strA = strA.toLowerCase();
            strB = strB.toLowerCase();
        }
        return strA.localeCompare(strB);
    }


  static Equals(strA: string, strB: string, ignoreCase: boolean): boolean {
    if (!NString.IsNullOrEmpty(strA) && !NString.IsNullOrEmpty(strB)) {
      if (ignoreCase) {
        strA = strA.toLowerCase();
        strB = strB.toLowerCase();
      }
      return strA === strB;
    }
    return false;
  }

    static GetHashCode(str: string): number {
        var hash = 0, i, l, ch;
        if (str.length === 0) return hash;
        for (i = 0, l = str.length; i < l; i++) {
            ch = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + ch;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }


    static Remove(str: string, startIndex: number, length: number): string {
        return str.substr(0, startIndex - 1) + str.substr(startIndex + length - 1);
    }

    static TrimStart(str: string): string {
        return str.replace(/^\s\s*/, '')
    }

    static TrimEnd(string: string, trimChars?: string[]): string {
        if (arguments.length === 1)
            return string.replace(/\s\s*$/, '');

        for (let j = 0; j < trimChars.length; j++) {
            let trimChar = trimChars[j];
            let i = string.length - 1;
            while (!isNullOrUndefined(string[i]) && string[i].endsWith(trimChar)) {
                string = NString.Remove(string, string.length, 1);
                i--;
            }
        }
        return string;
    }

    static Format(format: string, arg0: any, arg1?: any, arg2?: any, arg3?: any, arg4?: any, arg5?: any): string {
        if (!isNullOrUndefined(arg0) && arg0.constructor === Array) {
            var s = format,
                i = arg0.length;
            while (i--) {
                s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arg0[i]);
            }
            return s;
        }
        else {
            var args = [arg0, arg1, arg2, arg3, arg4, arg5];
            return NString.Format(format, args);
        }
    }

    static IsNullOrEmpty(str1: string | NString): boolean {
        return !str1;
    }

    static FromChars(chOrChars: string[])
    static FromChars(chOrChars: string[], startIndex: number, len: number)
    static FromChars(chOrChars: string[], startIndex?: number, len?: number) {
        let str: string = chOrChars.join('');
        if (arguments.length === 3)
            return str.substr(startIndex, len);
        return str;
    }

    static FromChar(ch: string, count): string {
        return (new Array<string>(count).fill(<string>ch)).join('');
    }

    static ToCharArray(str: string): string[] {
        return Array.from(str);
    }

    static CompareOrdinal(strA: string, strB: string): number {
        let lenA = strA.length;
        let lenB = strB.length;

        let len = Math.min(lenA, lenB);

        // compare character by character
        for (let i = 0; i < len; i++) {
            if (strA[i].charCodeAt(0) !== strB[i].charCodeAt(0)) {
                return strA[i].charCodeAt(0) - strB[i].charCodeAt(0);
            }
        }

        // if all characters are same , but length is different return the difference of length
        if (lenA !== lenB) {
            return lenA - lenB;
        }

        // all chars are same , so strings are equal
        return 0;
    }

    static PadRight(source: string, maxLength: number, fillString?: string): string {
        if (source.length >= maxLength)
            return source;

        let fillLen = maxLength - source.length;
        let timesToRepeat = Math.ceil(fillLen / fillString.length);
        let truncatedStringFiller = fillString.repeat(timesToRepeat).slice(0, fillLen);
        return source + truncatedStringFiller;
    }

    static Insert(str: string, index: number, ch: string): string {
        return str.substr(0, index) + ch + str.substr(index, str.length - index);
    }

    static Replace(str:string, orgSubStr: string, newSubStr: string): string {
        let resultStr:string = '';
        resultStr = str.replace(new RegExp(orgSubStr,'g'), newSubStr);
        return resultStr;
    }
}
