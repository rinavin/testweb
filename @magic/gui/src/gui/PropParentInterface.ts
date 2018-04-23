import {Property} from "../management/gui/Property";
import {MgFormBase} from "../management/gui/MgFormBase";
import {StorageAttribute} from "@magic/utils";
import {RefParam} from "@magic/mscorelib";

export interface PropParentInterface {
  getCompIdx(): number;

  getProp(propId: number): Property;

  checkIfExistProp(propId: number): boolean;

  getForm(): MgFormBase;

  /// <summary>
  ///   return true if this is first refresh
  /// </summary>
  /// <returns></returns>
  IsFirstRefreshOfProps(): boolean;

  EvaluateExpression(expId: number, resType: StorageAttribute, length: number, contentTypeUnicode: boolean, resCellType: StorageAttribute, alwaysEvaluate: boolean, wasEvaluated: RefParam<boolean>): string;
}
