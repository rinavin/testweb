import {DataModificationTypes} from "../../GuiEnums";

export interface IRecord {
  getId(): number;
  setOldRec(): void;
  SetFieldValue(idx: number, isNull: boolean, value: string): void;
  GetFieldValue(idx: number): string;
  IsNull(idx: number): boolean;
  isFldModified(fldIdx: number): boolean;
  IsFldModifiedAtLeastOnce(fldIdx: number): boolean;
  getMode(): DataModificationTypes;
  AddDcValuesReference(controlId: number, dcValuesId: number): void;
}
