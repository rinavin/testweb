import {StorageAttribute} from "./enums";

/// <summary>
/// type checking for enum 'StorageAttribute'
/// </summary>
export class StorageAttributeCheck {
  /// <summary>
  /// is the both types belong to the same inner data types
  /// </summary>
  /// <param name = "type1">data type</param>
  /// <param name = "type2">data type</param>
  static isTheSameType(type1: StorageAttribute, type2: StorageAttribute): boolean {
    return type1 === type2 || (StorageAttributeCheck.isTypeNumeric(type1) && StorageAttributeCheck.isTypeNumeric(type2)) || (StorageAttributeCheck.isTypeLogical(type1) && StorageAttributeCheck.isTypeLogical(type2)) || (StorageAttributeCheck.IsTypeAlphaOrUnicode(type1) && StorageAttributeCheck.IsTypeAlphaOrUnicode(type2)) || (StorageAttributeCheck.isTypeBlob(type1) && StorageAttributeCheck.isTypeBlob(type2)) || (StorageAttributeCheck.isTypeDotNet(type1) && StorageAttributeCheck.isTypeDotNet(type2));
  }

  static isTypeBlob(type: StorageAttribute): boolean {
    return type === StorageAttribute.BLOB || type === StorageAttribute.BLOB_VECTOR;
  }

  static isTypeAlpha(type: StorageAttribute): boolean {
    return type === StorageAttribute.ALPHA || type === StorageAttribute.MEMO;
  }

  /// <summary>
  /// is the both types belong to the NUMERIC inner type
  /// </summary>
  static isTypeNumeric(type: StorageAttribute): boolean {
    return type === StorageAttribute.DATE || type === StorageAttribute.TIME || type === StorageAttribute.NUMERIC;
  }

  /// <summary>
  /// is the both types belong to the LOGICAL inner type
  /// </summary>
  static isTypeLogical(type: StorageAttribute): boolean {
    return type === StorageAttribute.BOOLEAN;
  }

  /// <summary>
  /// is the type is DOTNET
  /// </summary>
  static isTypeDotNet(type: StorageAttribute): boolean {
    return type === StorageAttribute.DOTNET;
  }

  /// <summary>
  /// is the type ALPHA or UNICODE
  /// </summary>
  /// <param name = "type">data type</param>
  static IsTypeAlphaOrUnicode(type: StorageAttribute): boolean {
    return type === StorageAttribute.ALPHA || type === StorageAttribute.UNICODE;
  }

  /// <summary>
  /// is the inner type ALPHA or UNICODE
  /// </summary>
  /// <param name = "type1">data type</param>
  /// <param name = "type2">data type</param>
  static StorageFldAlphaOrUnicode(type1: StorageAttribute, type2: StorageAttribute): boolean {
    return StorageAttributeCheck.IsTypeAlphaOrUnicode(type1) && StorageAttributeCheck.IsTypeAlphaOrUnicode(type2);
  }

  static StorageFldAlphaUnicodeOrBlob(type1: StorageAttribute, type2: StorageAttribute): boolean {
    let type1AlphaOrUnicode: boolean = StorageAttributeCheck.IsTypeAlphaOrUnicode(type1);
    let type2AlphaOrUnicode: boolean = StorageAttributeCheck.IsTypeAlphaOrUnicode(type2);

    if (type1AlphaOrUnicode && type2AlphaOrUnicode) {
      return true;
    }
    else {
      let type1Blob: boolean = type1 === StorageAttribute.BLOB;
      let type2Blob: boolean = type2 === StorageAttribute.BLOB;
      return ((type1AlphaOrUnicode && type2Blob) || (type2AlphaOrUnicode && type1Blob));
    }

  }

  /// <summary>
  /// Check if types are compatible or not.
  /// </summary>
  /// <param name="sourceAttribute"></param>
  /// <param name="destinationAttribute"></param>
  /// <returns></returns>
  static IsTypeCompatibile(sourceAttribute: StorageAttribute, destinationAttribute: StorageAttribute): boolean {
    let isTypeCompatible: boolean = false;

    switch (sourceAttribute) {
      case StorageAttribute.ALPHA:
      case StorageAttribute.UNICODE:
        if (destinationAttribute === StorageAttribute.ALPHA || destinationAttribute === StorageAttribute.UNICODE ||
          destinationAttribute === StorageAttribute.DATE || destinationAttribute === StorageAttribute.TIME ||
          destinationAttribute === StorageAttribute.NUMERIC) {
          isTypeCompatible = true;
        }
        break;

      case StorageAttribute.NUMERIC:
        if (destinationAttribute === StorageAttribute.NUMERIC || destinationAttribute === StorageAttribute.ALPHA ||
          destinationAttribute === StorageAttribute.UNICODE || destinationAttribute === StorageAttribute.BOOLEAN ||
          destinationAttribute === StorageAttribute.DATE || destinationAttribute === StorageAttribute.TIME) {
          isTypeCompatible = true;
        }
        break;

      case StorageAttribute.BOOLEAN: {
        if (destinationAttribute === StorageAttribute.BOOLEAN || destinationAttribute === StorageAttribute.ALPHA ||
          destinationAttribute === StorageAttribute.UNICODE || destinationAttribute === StorageAttribute.NUMERIC) {
          isTypeCompatible = true;
        }
      }
        break;
      case StorageAttribute.DATE:
      case StorageAttribute.TIME:
        if (destinationAttribute === StorageAttribute.ALPHA || destinationAttribute === StorageAttribute.UNICODE ||
          destinationAttribute === StorageAttribute.NUMERIC || destinationAttribute === StorageAttribute.BOOLEAN ||
          destinationAttribute === StorageAttribute.DATE || destinationAttribute === StorageAttribute.TIME) {
          isTypeCompatible = true;
        }
        break;
      case StorageAttribute.BLOB:
        if (destinationAttribute === StorageAttribute.BLOB) {
          isTypeCompatible = true;
        }
        break;
    }
    return isTypeCompatible;
  }

  constructor() {
  }
}
