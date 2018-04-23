import {BlobType} from "./BlobType";
import {FldStorage, StorageAttribute, StrUtil, XmlParser, Base64, XMLConstants} from "@magic/utils";
import {List, NNumber, NString, Int32} from "@magic/mscorelib";
import {Events} from "../../Events";
import {Manager} from "../../Manager";
import {DisplayConvertor} from "../gui/DisplayConvertor";
import {VectorType} from "./VectorType";

export class FieldDef {
  DefaultValue: string = null;
  NullAllowed: boolean = false;
  protected _nullDefault: boolean = false;
  protected _nullValue: string = null;
  protected _nullDisplay: string = null;

  // true, if field is modifiable on field level
  set DbModifiable(value: boolean) {
    this._dbModifiable = value;
  }
  get DbModifiable(): boolean {
    return this._dbModifiable;
  }
  private _dbModifiable: boolean = true;

  private _partOfDataview: boolean = true;
  protected _picture: string = null;
  protected _size: number = 0;
  protected _varName: string = null;

  // Only for BLOB field. Does it contain a unicode or ANSI data?
  private _contentType: string = BlobType.CONTENT_TYPE_UNKNOWN;
  protected _vecCellsContentType: string = BlobType.CONTENT_TYPE_UNKNOWN;
  protected _vecCellsSize: number = 0;
  protected _vecCellsType: StorageAttribute = StorageAttribute.NONE;
  protected _type: StorageAttribute = StorageAttribute.NONE;
  Storage: FldStorage = 0;
  VarDisplayName: string = null;

  protected static _default_date: string = null;
  protected readonly _id: number = 0;
  protected _spaces: string[] = null;

  /// <summary>
  /// CTOR
  /// </summary>
  /// <param name="id_"> idx in FieldsTable </param>
  constructor(id: number) {
    this._id = id;
    this.VarDisplayName = NString.Empty;
  }

  get PartOfDataview(): boolean {
    return this._partOfDataview;
  }

  /// <summary>
  /// returns the id of the field
  /// </summary>
  getId(): number {
    return this._id;
  }

  /// <summary>
  /// size type of current Field: A, N, L, D, T
  /// </summary>
  /// <returns> size member of current Field
  /// </returns>
  getType(): StorageAttribute {
    return this._type;
  }

  /// <summary>
  /// return the magic default null display value according to the type
  /// </summary>
  /// <param name = "type">of the data</param>
  static getMagicDefaultNullDisplayValue(type: StorageAttribute): string {
    let val: string;

    switch (type) {
      case StorageAttribute.ALPHA:
      case StorageAttribute.UNICODE:
      case StorageAttribute.BOOLEAN:
        val = "";
        break;

      case StorageAttribute.NUMERIC:
      case StorageAttribute.DATE:
      case StorageAttribute.TIME:
        // zero
        val = "";
        break;
    }
    return val;
  }

  /// <summary>
  /// return the magic default value according to the type
  /// </summary>
  /// <param name = "type">of the data</param>
  static getMagicDefaultValue(type: StorageAttribute): string {
    let val: string = null;
    switch (type) {
      case StorageAttribute.ALPHA:
      case StorageAttribute.UNICODE:
        val = "";
        break;
      case StorageAttribute.BLOB:
      case StorageAttribute.BLOB_VECTOR:
        val = BlobType.getEmptyBlobPrefix('\0') + ";";
        break;
      case StorageAttribute.NUMERIC:
      case StorageAttribute.TIME:
        val = "FF00000000000000000000000000000000000000";
        break;
      case StorageAttribute.DATE:
        val = FieldDef._default_date;
        break;
      case StorageAttribute.BOOLEAN:
        val = "0";
        break;
    }
    return val;
  }

  /// <summary>
  /// returns the default value of this field
  /// </summary>
  getDefaultValue(): string {
    let val: string = null;
    if (this._type !== StorageAttribute.BLOB_VECTOR) {
      if (this._nullDefault && this._nullValue !== null)
        val = this._nullValue;
      else if (this.DefaultValue !== null)
        val = this.DefaultValue;
      else
        val = this.getMagicDefaultValue();
    }
     else
       val = this.getMagicDefaultValue();

    return val;
  }

  /// <summary>
  /// returns the vectors cells default value
  /// if the field is not a vector returns field default value
  /// </summary>
  getCellDefualtValue(): string {
    let val: string;
    if (this._type === StorageAttribute.BLOB_VECTOR) {
      if (this._nullDefault && this._nullValue !== null)
        val = this._nullValue;
      else if (this.DefaultValue !== null)
          val = this.DefaultValue;
      else {
        val = FieldDef.getMagicDefaultValue(this._vecCellsType);
        if (this._vecCellsType === StorageAttribute.BLOB)
          val = BlobType.setContentType(val, this._vecCellsContentType);
      }
    }
    else
      val = this.getDefaultValue();
    return val;
  }

  /// <summary>
  /// return the magic default value according to the type
  /// </summary>
  getMagicDefaultValue(): string {
    let val: string = FieldDef.getMagicDefaultValue(this._type);
    if (this._type === StorageAttribute.BLOB)
      val = BlobType.setContentType(val, this._contentType);
    else {
      if (this._type === StorageAttribute.BLOB_VECTOR) {
        val = BlobType.SetVecCellAttr(val, this._vecCellsType);
        if (this._vecCellsType === StorageAttribute.BLOB)
          val = BlobType.setContentType(val, this._vecCellsContentType);
      }
    }
    return val;
  }

  /// <summary>
  /// </summary>
  /// <returns> the contentType </returns>
  getContentType(): string {
    return this._contentType;
  }

  /// <summary>
  ///   returns true if the nullDisplay has a value
  /// </summary>
  hasNullDisplayValue(): boolean {
    return this._nullDisplay !== null;
  }

  /// <summary>
  ///   size member of current Field
  /// </summary>
  /// <returns> size member of current Field </returns>
  getSize(): number {
    return this._size;
  }

  /// <summary>
  ///   returns the vector cells size
  /// </summary>
  getVecCellsSize(): number {
    return (this._type === StorageAttribute.BLOB_VECTOR) ? this._vecCellsSize : this._size;
  }

  setLengths(type: StorageAttribute, vecCells: boolean): void {
    let res: number = this._size;

    switch (type) {
      case StorageAttribute.ALPHA:
      case StorageAttribute.MEMO:
      case StorageAttribute.UNICODE:
        if (vecCells) {
          res = this._vecCellsSize;
          this._spaces = new Array<string>(this._vecCellsSize);
        }
        else
          this._spaces = new Array<string>(this._size);

        for (let i: number = 0; i < this._size; i = i + 1) {
          this._spaces[i] = ' ';
        }
        break;

      case StorageAttribute.NUMERIC:
      case StorageAttribute.DATE:
      case StorageAttribute.TIME:
        res = Manager.Environment.GetSignificantNumSize() * 2;
        break;

      case StorageAttribute.BOOLEAN:
        res = (!vecCells ? 1 : 4);
        break;

      case StorageAttribute.BLOB:
        // QCR 758913 FOR VECTORS INTERNAL USE ONLY THE SIZE OF BLOBS AND VECTOR
        // IS THE SIZE OF THIER STRUCTS IN THE MAGIC ENGIN
        res = (!vecCells ? Int32.MaxValue : VectorType.BLOB_TYPE_STRUCT_SIZE);
        break;

      case StorageAttribute.BLOB_VECTOR:
        res = Int32.MaxValue;
        if (!vecCells)
          this.setLengths(this._vecCellsType, true);
        else
          res = VectorType.BLOB_TYPE_STRUCT_SIZE;
        break;
    }

    if (vecCells)
      this._vecCellsSize = res;
    else
      this._size = res;
  }

  /// <summary>
  ///   returns the cells type of vectors elese returns the field type
  /// </summary>
  getCellsType(): StorageAttribute {
    return (this._type === StorageAttribute.BLOB_VECTOR) ? this._vecCellsType : this._type;
  }

  /// <summary>
  ///   returns the cell content type of vector field
  /// </summary>
  /// <returns>vector's cell content type</returns>
  getVecCellsContentType(): string {
    return this._vecCellsContentType;
  }

  /// <summary>
  ///   returns Null Value value of this field
  /// </summary>
  getNullValue(): string {
    return this._nullValue;
  }

  /// <summary>
  ///   returns true if the field is a Null Default
  /// </summary>
  isNullDefault(): boolean {
    return this._nullDefault;
  }

  /// <summary>
  ///   returns Null Display value of this field
  /// </summary>
  getNullDisplay(): string {
    return Events.Translate(this._nullDisplay);
  }

  /// <summary>
  ///   For BLOB fields, check if they contain UNICODE or ANSI chars.
  /// </summary>
  /// <returns>TRUE if content is UNICODE. False otherwise</returns>
  IsContentUnicode(): boolean {
    if (this._type === StorageAttribute.BLOB && this._contentType !== BlobType.CONTENT_TYPE_UNICODE)
      return false;

    return true;
  }

  GetPicture(): string {
    return this._picture;
  }

  /// <summary>
  /// set the field attribute in parsing
  /// </summary>
 protected setAttribute(attribute: string, valueStr: string): boolean {
    let isTagProcessed: boolean = true;

    switch (attribute) {
      case XMLConstants.MG_ATTR_TYPE:
        this._type = <StorageAttribute>valueStr.charAt(0);
        break;
      case XMLConstants.MG_ATTR_SIZE:
        this._size = XmlParser.getInt(valueStr);
        if (this._size <= 0)
          Events.WriteExceptionToLog("in Field.initElements(): size must be greater than zero");
        break;
      case XMLConstants.MG_ATTR_VAR_NAME:
        this._varName = XmlParser.unescape(valueStr).toString();
        break;
      case XMLConstants.MG_ATTR_VAR_DISP_NAME:
        this.VarDisplayName = XmlParser.unescape(valueStr).toString();
        break;
      case XMLConstants.MG_ATTR_PICTURE:
        this._picture = XmlParser.unescape(valueStr).toString();
        break;
      case XMLConstants.MG_ATTR_VEC_CELLS_SIZE:
        this._vecCellsSize = NNumber.Parse(valueStr);
        break;
      case XMLConstants.MG_ATTR_VEC_CELLS_ATTR:
        this._vecCellsType = <StorageAttribute>valueStr.charAt(0);
        break;
      case XMLConstants.MG_ATTR_VEC_CELLS_CONTENT:
        this._vecCellsContentType = valueStr.charAt(0);
        break;
      case XMLConstants.MG_ATTR_NULLVALUE:
        if (this._type === StorageAttribute.NUMERIC || this._type === StorageAttribute.DATE || this._type === StorageAttribute.TIME) {
          if (Manager.Environment.GetDebugLevel() > 1)
            this._nullValue = XmlParser.unescape(valueStr).toString();
          else
            this._nullValue = Base64.decodeToHex(valueStr);
        }
        else
          this._nullValue = XmlParser.unescape(valueStr).toString();
        break;
      case XMLConstants.MG_ATTR_NULLDISPLAY:
        this._nullDisplay = XmlParser.unescape(valueStr).toString();
        break;
      case XMLConstants.MG_ATTR_NULLDEFAULT:
        this._nullDefault = DisplayConvertor.toBoolean(valueStr);
        break;
      case XMLConstants.MG_ATTR_DB_MODIFIABLE:
        this.DbModifiable = DisplayConvertor.toBoolean(valueStr);
        break;
      case XMLConstants.MG_ATTR_DEFAULTVALUE:
        this.DefaultValue = valueStr;
        if (this._type === StorageAttribute.ALPHA || this._type === StorageAttribute.UNICODE) {
          this.DefaultValue = XmlParser.unescape(valueStr).toString();
          this.DefaultValue = StrUtil.padStr(this.DefaultValue, this._size);
        }
        else if (this._type !== StorageAttribute.BLOB && this._type !== StorageAttribute.BOOLEAN) {
          // working in hex or base64
          if ((this._type === StorageAttribute.BLOB_VECTOR &&
            (this._vecCellsType === StorageAttribute.NUMERIC || this._vecCellsType === StorageAttribute.DATE || this._vecCellsType === StorageAttribute.TIME)) ||
            (this._type === StorageAttribute.NUMERIC || this._type === StorageAttribute.DATE || this._type === StorageAttribute.TIME)) {
            if (Manager.Environment.GetDebugLevel() < 1)
              this.DefaultValue = Base64.decodeToHex(valueStr);
          }
        }
        else if (this.DefaultValue.length === 0 && this._type !== StorageAttribute.BLOB)
          this.DefaultValue = null;
        else if (this._type === StorageAttribute.BLOB)
          this.DefaultValue = BlobType.createFromString(this.DefaultValue, this._contentType);
        break;
      case XMLConstants.MG_ATTR_NULLALLOWED:
        this.NullAllowed = DisplayConvertor.toBoolean(valueStr);
        break;
      case XMLConstants.MG_ATTR_BLOB_CONTENT:
        this._contentType = valueStr.charAt(0);
        break;
      case XMLConstants.MG_ATTR_PART_OF_DATAVIEW:
        this._partOfDataview = DisplayConvertor.toBoolean(valueStr);
        break;
      case XMLConstants.MG_ATTR_STORAGE:
        this.Storage = <FldStorage>XmlParser.getInt(valueStr);
        break;
      default:
        isTagProcessed = false;
        break;
    }

    return isTagProcessed;
  }

  /// <summary>
  ///   Need part input String to relevant for the Field class data
  /// </summary>
  fillData(): void {
    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;
    let text: string = parser.ReadToEndOfCurrentElement();
    text = text.substr(text.indexOf(XMLConstants.MG_TAG_FLDH) + XMLConstants.MG_TAG_FLDH.length);
    let tokens: List<string> = XmlParser.getTokens(text, XMLConstants.XML_ATTR_DELIM);
    this.initElements(tokens);
  }

  /// <summary>
  ///   Make initialization of private elements by found tokens
  /// </summary>
  /// <param name = "tokensVector">found tokens, which consist attribute/value of every foundelement</param>
  /// <param name = "expTab">reference to relevant exp. table</param>
  initElements(tokensVector: List<string>): void {
    for (let i: number = 0; i < tokensVector.length; i = i + 2) {
      let attribute: string = tokensVector.get_Item(i);
      let valueStr: string = tokensVector.get_Item(i + 1);

      // the parsing is finished here
      this.setAttribute(attribute, valueStr);
    }
    this.SetAfterParsing();
  }

  /// <summary>
  /// some properties are needed to be set after parsing
  /// </summary>
  SetAfterParsing(): void {
    this.setLengths(this._type, false);
    if (this.NullAllowed && this._nullDisplay === null)
      this._nullDisplay = "";
  }

  /// <summary>
  ///   get name of variable
  /// </summary>
  getVarName(): string {
    return this._varName || "";
  }

  /// <summary>
  ///   for get VARNAME function use
  ///   A string containing the table name where the variable originates,
  ///   concatenated with '.' and the variable description of the variable in that table.
  ///   If the variable is a virtual one, then the table name would indicate 'Virtual'.
  /// </summary>
  getName(): string {
    return this.getVarName();
  }
}
