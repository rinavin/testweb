import {List, NString} from "@magic/mscorelib";
import {FieldDef} from "./FieldDef";
import {DataViewBase} from "./DataViewBase";
import {XmlParser, XMLConstants} from "@magic/utils";
import {Manager} from "../../Manager";
import {Events} from "../../Events";

export abstract class FieldsTable {
  protected _fields: List<FieldDef> = null;

  /// <summary>
  /// Ctor
  /// </summary>
  constructor() {
    this._fields = new List<FieldDef>();
  }

  getField(idx: number): FieldDef;
  getField(fldName: string): FieldDef;
  getField(idxOrFldName: any): FieldDef {
    if ((idxOrFldName === null || idxOrFldName.constructor === Number)) {
      return this.getField_0(idxOrFldName);
    }
    return this.getField_1(idxOrFldName);
  }

  /// <summary>
  ///   get a Field by its index
  /// </summary>
  /// <param name = "idx">the index of the requested field</param>
  /// <returns> a reference to the field</returns>
  private getField_0(idx: number): FieldDef {
    let fld: FieldDef = null;

    if (idx >= 0 && idx < this._fields.length)
      fld = this._fields.get_Item(idx);

    return fld;
  }

  /// <summary>
  ///   return the number of fields in the table
  /// </summary>
  /// <returns> number of fields in the table</returns>
  getSize(): number {
    return this._fields.length;
  }

  /// <summary>
  /// To parse input string and fill inner data: Vector of commands
  /// </summary>
  /// <param name = "dataview">to the parent</param>
  fillData(dataview: DataViewBase): void {
    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;
    while (this.initInnerObjects(parser.getNextTag(), dataview)) {
    }
  }

  /// <summary>
  /// To allocate and fill inner objects of the class
  /// </summary>
  /// <param name = "foundTagName">name of tag, of object, which need be allocated</param>
  /// <param name = "dataview">to data view</param>
  initInnerObjects(foundTagName: string, dataview: DataViewBase): boolean {
    if (foundTagName === null)
      return false;

    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;
    if (foundTagName === XMLConstants.MG_TAG_FLDH) {
      let field: FieldDef = this.initField(dataview);
      this._fields.push(field);
    }
    else if (foundTagName === XMLConstants.MG_TAG_DVHEADER)
      parser.setCurrIndex(parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex()) +
        1); // move Index to end of <dvheader> +1 for '>'
    else if (foundTagName === "/" + XMLConstants.MG_TAG_DVHEADER) {
      parser.setCurrIndex2EndOfTag();
      return false;
    }
    else {
      Events.WriteExceptionToLog("There is no such tag in FieldsTable. Insert else if to FieldsTable.initInnerObjects for " + foundTagName);
      return false;
    }

    return true;
  }

  /// <summary>
  /// create a field and fill it by data
  /// this function must be virtual because it is used in RichClient but is not used in MgxpaRuntime
  /// </summary>
  /// <param name = "dataview"> Dataview </param>
  /// <returns> the created filled field </returns>
  protected abstract initField(dataview: DataViewBase): FieldDef;

  /// <summary>
  ///   get a Field by its index
  /// </summary>
  /// <param name = "fldName">is the name of the requested field</param>
  /// <returns> a reference to the field</returns>
  private getField_1(fldName: string): FieldDef {
    return this._fields.find((field: FieldDef) => (field.getVarName() === fldName));
  }
}
