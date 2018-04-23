import {ApplicationException, Encoding, List, NNumber, NString, StringBuilder, ISO_8859_1_Encoding} from "@magic/mscorelib";
import {FieldDef} from "./FieldDef";
import {Manager} from "../../Manager";
import {BlobType} from "./BlobType";
import {StorageAttribute, StorageAttributeCheck, StrUtil, UtilStrByteMode} from "@magic/utils";
import {DisplayConvertor} from "../gui/DisplayConvertor";
import {RecordUtils} from "./RecordUtils";
import {GuiConstants} from "../../GuiConstants";

/// <summary>
///   represents the magic vector type
/// </summary>
export class VectorType {
  // NOTE: the BLOB_TABLE_STR was deliberately set to lower case (while the server uses upper case
  // this is a patch to distinguish between "FLAT DATA" built by the client (therefore are already unicode)
  // and between flat data accepted from the server (therefore are not unicode).
  // global variables
  static BLOB_TABLE_STR: string = "mgbt";
  static BLOB_TABLE_STR_LEN: number = 4;
  static VECTOR_STR: string = "MGVEC";
  static VECTOR_STR_LEN: number = 5;
  static VERSION: number = 5; // version no 5 includes the content field
  static EMPTY_BLOB_PREFIX_LEN: number = 7;

  // FOR EXPLANATIONS REGARDING THIS NUMBER PLEAS SEE DOCUMENTATION INSIDE init METHOD
  static BLOB_TYPE_STRUCT_SIZE: number = 28;

  private _cells: List<CellElement> = null; // a vector containing CellElements
  private _encoding: Encoding = null; // to be used only with alpha or memo
  private _allowNull: boolean = false;
  private _cellContentType: string = null;
  private _cellSize: number = 0;
  private _cellsAttr: StorageAttribute = null; // all cells in the vector must be of the same type
  private _cellsDefaultVal: string = null; // all cells in the magic vector has the same default value
  private _cellsIsNullDefault: boolean = false; // null default definition for all cells in the magic vector

  // data buffers that we change Dynamically to facilitate
  // the creation of a string representation of the vector
  private _dataBuf: StringBuilder = null;
  private _initialized: boolean = false; // marks whether the vector was initialized if it was not that it is an invalid vector
  private _nullBuf: StringBuilder = null;
  private _originalflatData: string = null;

  constructor(cellsType: StorageAttribute, contentType: string, defualt: string, isDefNull: boolean, nullAlowed: boolean, length: number);
  constructor(blobString: string);
  constructor(fld: FieldDef);
  constructor(cellsTypeOrBlobStringOrFld: any, contentType?: string, defualt?: string, isDefNull?: boolean, nullAlowed?: boolean, length?: number) {
    if (arguments.length === 6)
      this.constructor_0(cellsTypeOrBlobStringOrFld, contentType, defualt, isDefNull, nullAlowed, length);

    else if (arguments.length === 1 && (cellsTypeOrBlobStringOrFld === null || cellsTypeOrBlobStringOrFld.constructor === String))
      this.constructor_1(cellsTypeOrBlobStringOrFld);

    else
      this.constructor_2(cellsTypeOrBlobStringOrFld);
  }

  /// <summary>
  ///   construct the object but does not fill it with data in order to initialize the Vector we must invoke on
  ///   it the its init method a VectorType which was not initialized is an unvalid vector.
  /// </summary>
  private constructor_0(cellsType: StorageAttribute, contentType: string, defualt: string, isDefNull: boolean, nullAlowed: boolean, length: number): void {
    this._cells = new List<CellElement>();
    this._cellsAttr = cellsType;
    this._cellContentType = contentType;
    this._cellsDefaultVal = defualt;
    this._cellsIsNullDefault = isDefNull;
    this._cellSize = ((this._cellsAttr === StorageAttribute.UNICODE) ? (length * 2) : length);
    this._initialized = true;
    this._allowNull = nullAlowed;
    this._nullBuf = new StringBuilder();
    this._dataBuf = new StringBuilder();
    this._originalflatData = this.toString();
    this._encoding = Manager.Environment.GetEncoding();
  }

  /// <summary>
  ///   construct the object but does not fill it with data in order to initialize the Vector we must invoke on
  ///   it the its init method a VectorType which was not initialized is an invalid vector.
  /// </summary>
  /// <param name = "blobString">a string representation of the blob's data bytes</param>
  private constructor_1(blobString: string): void {
    this._cells = new List<CellElement>();
    this._initialized = false;
    this._originalflatData = blobString;
    this._encoding = Manager.Environment.GetEncoding();
  }

  /// <summary>
  ///   construct the object with a field
  /// </summary>
  /// <param name = "fld"></param>
  /// <param name = "chars"></param>
  private constructor_2(fld: FieldDef): void {
    this._cells = new List<CellElement>();
    this._cellsAttr = fld.getCellsType();
    this._cellContentType = fld.getVecCellsContentType();
    this._cellsDefaultVal = fld.getCellDefualtValue();
    this._cellsIsNullDefault = fld.isNullDefault();
    this._cellSize = <number>((this._cellsAttr === StorageAttribute.UNICODE) ? (fld.getVecCellsSize() * 2) : fld.getVecCellsSize());
    this._initialized = true;
    this._allowNull = fld.NullAllowed;
    this._nullBuf = new StringBuilder();
    this._dataBuf = new StringBuilder();
    this._originalflatData = this.toString();
    this._encoding = Manager.Environment.GetEncoding();
  }

  /// <summary>
  ///   builds a VectorType from its flattened blob representation
  /// </summary>
  /// <param name = "blobString">a string representation of the blob's data bytes</param>
  /// <returns> false is the given blob is not a vector (the flatten format is wrong)</returns>
  private init(): void {
    let tokens: string[] = null;
    let tokenIdx: number = 0;
    let currentToken: string = null; // the current token we are paring
    let isFlatDataTranslated: boolean = this.isUnicode(this._originalflatData);
    let isDbcsAlpha: boolean = false; // JPN: DBCS support

    // pos is position in the originalflatData string
    let pos: number = BlobType.blobPrefixLength(this._originalflatData);
    // blob
    tokens = StrUtil.tokenize(this._originalflatData.substr(pos), ",");
    let vecSize: number = 0;

    if (!this._initialized) {
      if (VectorType.validateBlobContents(this._originalflatData)) {
        let blobPrefix: string = BlobType.getPrefix(this._originalflatData);
        this._cellContentType = BlobType.getContentType(blobPrefix);

        // skip the the headers of the table and the vector and the first ',';
        pos = <number>(<number>pos + 4 + 5 + 1);
        tokenIdx++;

        // skip the version
        tokenIdx++;
        currentToken = tokens[tokenIdx];
        pos = pos + (currentToken.length + 1);

        // skip the ColumnsCount_ in vectors always contain value of 1
        tokenIdx++;
        currentToken = tokens[tokenIdx];
        pos = pos + (currentToken.length + 1);

        // parse the cell attribute in vector there is only one attribute fo the entire vector
        tokenIdx++;
        currentToken = tokens[tokenIdx];
        this._cellsAttr = <StorageAttribute>currentToken.charAt(0);
        pos = pos + 2;

        // parse the ColumnsLen_ that contains the number of cells in the vector
        // since there is only one column we increase pos by currentToken.length()
        // this number is same as the ColumnsTotalLen_ for vectors
        tokenIdx++;
        currentToken = tokens[tokenIdx];
        this._cellSize = <number>NNumber.Parse(currentToken);
        pos = pos + (currentToken.length + 1);

        // parse the cell default value is it is numeric it is sent as NUM_TYPE
        // since the default value may contain as value charcters as the delimeter
        // we can not use the StringTokenizer.
        if (this._cellsAttr === StorageAttribute.NUMERIC || this._cellsAttr === StorageAttribute.DATE || this._cellsAttr === StorageAttribute.TIME)
          this._cellsDefaultVal = StrUtil.stringToHexaDump(this._originalflatData.substr(pos, <number>this._cellSize), 2);
        else if (this._cellsAttr === StorageAttribute.ALPHA || this._cellsAttr === StorageAttribute.MEMO) {
          // QCR 429445 since the vector is encoded to base64/hex when it is recived from the server
          // we must use the correct char-set when reciving vector of alpha or memo from the server
          // in vectors we must concider the char set since when we got it from the server it was encoded
          if (UtilStrByteMode.isLocaleDefLangDBCS()) {
            isDbcsAlpha = true;
            isFlatDataTranslated = true;
            this._cellsDefaultVal = UtilStrByteMode.leftB(this._originalflatData.substr(pos), <number>this._cellSize);
          }
          else
            this._cellsDefaultVal = this._originalflatData.substr(pos, <number>this._cellSize);
          if (this._encoding !== null && !isFlatDataTranslated) {
            try {
              let ba: Uint8Array = ISO_8859_1_Encoding.ISO_8859_1.GetBytes(this._cellsDefaultVal);
              this._cellsDefaultVal = this._encoding.GetString(ba, 0, ba.length);
            }
            catch (Exception) {
            }
          }
        }
        else if (this._cellsAttr === StorageAttribute.UNICODE) {
          this._cellsDefaultVal = this._originalflatData.substr(pos, <number>this._cellSize);

          try {
            let ba: Uint8Array = ISO_8859_1_Encoding.ISO_8859_1.GetBytes(this._cellsDefaultVal);
            this._cellsDefaultVal = Encoding.Unicode.GetString(ba, 0, ba.length);
          }
          catch (Exception) {
          }
        }
        else
          this._cellsDefaultVal = this._originalflatData.substr(pos, <number>this._cellSize);
        if (isDbcsAlpha)
          pos = pos + this._cellsDefaultVal.length + 1;
        else
          pos = <number>(<number>pos + this._cellSize + 1); // sikp the ending ','

        // inrorder to continue using the tokenizer for the rest of the headers parsing
        // reinit it
        tokens = StrUtil.tokenize(this._originalflatData.substr(pos), ",");
        tokenIdx = 0;

        // parse the cells null default flag
        tokenIdx++;
        currentToken = tokens[tokenIdx];
        this._cellsIsNullDefault = DisplayConvertor.toBoolean(currentToken);
        pos = pos + (currentToken.length + 1);

        // parse the cells null allowed flag
        tokenIdx++;
        currentToken = tokens[tokenIdx];
        this._allowNull = DisplayConvertor.toBoolean(currentToken);
        pos = pos + (currentToken.length + 1);

        // skip the parsing of ColumnsTotalLen_
        tokenIdx++;
        currentToken = tokens[tokenIdx];
        pos = pos + (currentToken.length + 1);

        // parse the size of the vector ( RecordsCount_)
        tokenIdx++;
        currentToken = tokens[tokenIdx];
        vecSize = <number>NNumber.Parse(currentToken);
        pos = pos + (currentToken.length + 1);

        // the blobs_ will always contain value of 1 sine we have in vectors only one colmn
        tokenIdx++;
        currentToken = tokens[tokenIdx];
        pos = pos + (currentToken.length + 1);

        // blobs offset table in the vector case will alway contain only one value equals to 0
        // since there is only one colms in the vector
        if (this._cellsAttr === StorageAttribute.BLOB || this._cellsAttr === StorageAttribute.BLOB_VECTOR) {
          tokenIdx++;
          currentToken = tokens[tokenIdx];
          pos = pos + (currentToken.length + 1);
        }

        // parse the data array
        let data: string;
        if (isDbcsAlpha) {
          data = UtilStrByteMode.leftB(this._originalflatData.substr(pos), <number>(vecSize * this._cellSize));
          pos = pos + data.length + 1;
        }
        else {
          data = this._originalflatData.substr(pos, <number>(vecSize * this._cellSize));
          pos = <number>(<number>pos + vecSize * this._cellSize + 1);
        }

        // allocate the dataBuf
        this._dataBuf = new StringBuilder(data.length);

        if (this._cellsAttr !== StorageAttribute.ALPHA && this._cellsAttr !== StorageAttribute.MEMO && this._cellsAttr !== StorageAttribute.UNICODE)
          this._dataBuf.Append(data);

        // parse the null buf
        let nullBuf: string = this._originalflatData.substr(pos, <number>vecSize);
        pos = <number>(<number>pos + vecSize + 1);

        // save the nullBuf
        this._nullBuf = new StringBuilder(nullBuf);

        // check the type of the cells
        if (this._cellsAttr !== StorageAttribute.BLOB && this._cellsAttr !== StorageAttribute.BLOB_VECTOR) {
          for (let i: number = 0; i < vecSize; i++) {
            let isNull: boolean = nullBuf.charAt(i) > '\0';
            // numeric type are sent as NUM_TYPE so we translate them to hex
            if (this._cellsAttr === StorageAttribute.NUMERIC || this._cellsAttr === StorageAttribute.DATE || this._cellsAttr === StorageAttribute.TIME)
              this._cells.push(new CellElement(StrUtil.stringToHexaDump(data.substr(<number>(<number>i * this._cellSize), <number>this._cellSize), 2), isNull));
            else if (this._cellsAttr === StorageAttribute.ALPHA || this._cellsAttr === StorageAttribute.MEMO) {
              // QCR 429445 since the vector is encoded to base64/hex when it is recived from the
              // server we must use the correct char-set when reciving vector of alpha or memo from the server
              let cellData: string;
              if (isDbcsAlpha)
                cellData = UtilStrByteMode.midB(data, <number>(<number>i * this._cellSize), <number>this._cellSize);
              else
                cellData = data.substr(<number>(<number>i * this._cellSize), <number>this._cellSize);

              if (this._encoding !== null && !isFlatDataTranslated) {
                try {
                  let ba: Uint8Array = ISO_8859_1_Encoding.ISO_8859_1.GetBytes(cellData);
                  cellData = this._encoding.GetString(ba, 0, ba.length);
                }
                catch (SystemException) {
                }
              }
              this._dataBuf.Append(cellData);
              this._cells.push(new CellElement(cellData, isNull));
            }
            else if (this._cellsAttr === StorageAttribute.UNICODE) {
              let cellData: string = data.substr(<number>(<number>i * this._cellSize), <number>this._cellSize);
              try {
                let ba: Uint8Array = ISO_8859_1_Encoding.ISO_8859_1.GetBytes(cellData);
                cellData = Encoding.Unicode.GetString(ba, 0, ba.length);
              }
              catch (SystemException) {
              }
              this._dataBuf.Append(cellData);
              this._cells.push(new CellElement(cellData, isNull));
            }
            else
              this._cells.push(new CellElement(data.substr(<number>(<number>i * this._cellSize), <number>this._cellSize), isNull));
          }
        }
        else {
          // in case of vectors orf vectors or vectors of blobs we need to treat them differentlly
          // each blob or vector is "flattened in the end of the null buff
          // as a string in the following format:
          // Blob_Size,ObjHandle,VariantIdx,Type,VecCellAttr,....data....;next_blob;
          // we need to remember that er a blob come to the client noy via vector its format is:
          // ObjHandle,VariantIdx,Type,VecCellAttr;data there for we need to make the adjustments
          // in the parsing process and in vecGet and in toString
          for (let i: number = 0; i < vecSize; i++) {
            tokens = StrUtil.tokenize(this._originalflatData.substr(pos), ",");
            tokenIdx = 0;

            // parse blob size
            tokenIdx++;
            currentToken = tokens[tokenIdx];
            let size: number = <number>NNumber.Parse(currentToken);
            pos = pos + (currentToken.length + 1);

            // parse the rest of the blob header
            let blobHeader: string = "";
            for (let j: number = 0; j < GuiConstants.BLOB_PREFIX_ELEMENTS_COUNT; j++) {
              tokenIdx++;
              currentToken = tokens[tokenIdx];
              blobHeader = blobHeader + currentToken;
              pos = pos + (currentToken.length + 1);

              if (j !== GuiConstants.BLOB_PREFIX_ELEMENTS_COUNT - 1) {
                blobHeader = blobHeader + ",";
              }
            }

            let cellData: string = this._originalflatData.substr(pos, <number>size);

            // add the cell to the vec
            let isNull: boolean = nullBuf.charAt(i) > '\0';
            this._cells.push(new CellElement(cellData, isNull, blobHeader));
            pos = <number>(<number>pos + size + 1);
          }
        }
        // If dataBuf was not built during "cells growth" - allocate it right now, in one-shot.
        if (this._dataBuf.Length === 0)
          this._dataBuf = new StringBuilder(data.length);

        this._initialized = true;
      }
      else
        throw new ApplicationException("in VectorType.init wrong vector format");
    }
  }

  /// <summary>
  ///   return a flatten blob string representation we assume here that all changes are dynamically save into the
  ///   buffs each time the vector changes
  /// </summary>
  toString(): string {
    let res: string = ""; // take

    // lazy evaluation if the vector was not initialized it wasn't changed so return the original
    if (this._initialized) {
      // build the headers
      res = res + 0 + "," + 0 + "," + "0" + "," + <string>this._cellsAttr + "," + this._cellContentType + ";";
      // the blob header of this blob
      res = res + this.buildHeadersString();
      // + dataBuf.toString() + "," + nullBuf.toString() + ",";

      if (this._cellsAttr === StorageAttribute.UNICODE) {
        let dataBufCharArry: string[] = new Array<string>(this._dataBuf.Length * 2);

        for (let i: number = 0; i < this._dataBuf.Length; i = i + 1) {
          dataBufCharArry[i * 2] = String.fromCharCode((this._dataBuf.get_Item(i).charCodeAt(0)) % 256);
          dataBufCharArry[i * 2 + 1] = String.fromCharCode((this._dataBuf.get_Item(i).charCodeAt(0)) / 256);
        }
        res = res + NString.FromChars(dataBufCharArry) + ",";
      }
      else
        res = res + this._dataBuf + ",";

      res = res + this._nullBuf + ",";

      // in blobs and vector we do not update
      if (this._cellsAttr === StorageAttribute.BLOB || this._cellsAttr === StorageAttribute.BLOB_VECTOR)
        res = res + this.getBlobsBuf();

      res = res + VectorType.BLOB_TABLE_STR;
    }
    else
      res = this._originalflatData;

    return res;
  }

  /// <summary>
  ///   returns the cells attribute ( the sane for all cells in the vector)
  /// </summary>
  getCellsAttr(): StorageAttribute {
    if (!this._initialized)
      return VectorType.getCellsAttr(this._originalflatData);
    else
      return this._cellsAttr;
  }

  /// <summary>
  ///   returns the cells size ( same size for all cells)
  /// </summary>
  getCellSize(): number {
    let retVal: number;

    if (!this._initialized)
      retVal = VectorType.getCellSize(this._originalflatData);
    else
      retVal = this._cellSize;

    // unicode cell size is saved internally as byte length since that is the way the server save it
    if (this.getCellsAttr() === StorageAttribute.UNICODE)
      retVal = Math.floor(retVal / 2);

    return retVal;
  }

  /// <summary>
  ///   returns the vector size
  /// </summary>
  getVecSize(): number {
    if (!this._initialized)
      return VectorType.getVecSize(this._originalflatData);
    else
      return <number>this._cells.length;
  }

  /// <summary>
  ///   returns the value of a give cell cells indexes start from 1 wrong indexes or indexes the does not exist
  ///   will return default value
  /// </summary>
  /// <param name = "idx">the cell index</param>
  /// <returns> a string representation of the cell value TODO: yariv check with rina what we should do with
  ///   blobs extra fields
  /// </returns>
  getVecCell(idx: number): string {
    let retVal: string = null;
    if (idx > 0) {
      this.init();
      if (<number>idx <= this.getVecSize()) {
        retVal = this._cells.get_Item(idx - 1).data;

        if (this._cellsAttr === StorageAttribute.BLOB || this._cellsAttr === StorageAttribute.BLOB_VECTOR)
          retVal = this._cells.get_Item(idx - 1).blobFieldPrefix + ";" + retVal;

        // QCR 503691 the value of true or false in the server are the numeric values of 1 and 0
        if (StorageAttributeCheck.isTypeLogical(this._cellsAttr))
          retVal = ((retVal.charAt(0) === '\0') ? "0" : "1");

        if (this._cells.get_Item(idx - 1).isNull)
          retVal = null;
      }
      else if (!this._cellsIsNullDefault)
        retVal = this._cellsDefaultVal;
    }
    return retVal;
  }

  /// <summary>
  /// Returns the cell values of a vector in string array.
  /// </summary>
  /// <returns></returns>
  GetCellValues(): string[] {
    let retVal: string = null;
    let cellValues: string[] = null;

    this.init();

    if (this.getVecSize() > 0)
    {
      cellValues = new Array<string>(this.getVecSize());

      // Get the vector value
      for (let idx: number = 0; idx < this.getVecSize(); idx++)
      {
        retVal = this._cells.get_Item(idx).data;

        if (this._cellsAttr === StorageAttribute.BLOB || this._cellsAttr === StorageAttribute.BLOB_VECTOR)
          retVal = this._cells.get_Item(idx).blobFieldPrefix + ";" + retVal;

        // QCR 503691 the value of true or false in the server are the numeric values of 1 and 0
        if (StorageAttributeCheck.isTypeLogical(this._cellsAttr))
          retVal = ((retVal.charAt(0) === '\0') ? "0" : "1");

        if (this._cells.get_Item(idx).isNull)
          retVal = null;

        cellValues[idx] = retVal;
      }
    }
    else if (!this._cellsIsNullDefault)
    {
        cellValues = [
          this._cellsDefaultVal
        ];
    }

    return cellValues;
  }

  /// <summary>
  ///   inserts or changes a cells value
  /// </summary>
  /// <param name = "idx">the cell index if the index is not sequential creats empty cell till the index</param>
  /// <param name = "newValue">the new value ( if it is a blob type or vector it contains the prefix of the control data</param>
  /// <retuns>  false if the index is wrong or the vector illformed </retuns>
  setVecCell(idx: number, newValue: string, isNull: boolean): boolean {
    let res: boolean = false;
    let createBufferValForNumType: boolean = true;
    try {
      if (idx > 0) {
          this.init();
          let localCellSize: number = (this._cellsAttr === StorageAttribute.UNICODE) ? Math.floor(this._cellSize / 2) : this._cellSize;
        // trying to set null value when not allowed
        if (isNull && !this._allowNull) {
          isNull = false;
          newValue = this._cellsDefaultVal;
        }

        if (idx <= this._cells.length) {
          let curr: CellElement = this._cells.get_Item(idx - 1);
          // if the value passed is not null
          if (!isNull) {
            // special treatment for blobs and vectors
            if (this._cellsAttr === StorageAttribute.BLOB || this._cellsAttr === StorageAttribute.BLOB_VECTOR) {
              // set the data in the cell
              let blobPrefixLength: number = BlobType.blobPrefixLength(newValue);
              curr.blobFieldPrefix = newValue.substr(0, blobPrefixLength - 1);

              // treat empty blob
              if (newValue.length > blobPrefixLength)
                curr.data = newValue.substr(blobPrefixLength);
              else
                curr.data = "";
            }
            // simple type
            else {
              // QCR 503691 the value of true or false in the server are the numeric values of 1 and 0
              if (StorageAttributeCheck.isTypeLogical(this._cellsAttr)) {
                curr.data = (DisplayConvertor.toBoolean(newValue) ? new StringBuilder().Append(1).ToString() : new StringBuilder().Append('\0').ToString());
                newValue = curr.data;
              }
              else
                curr.data = newValue;

              // numeric types are represented in the data buf as num type so we
              // translate them before inserting them to the buf
              let dataBufVal: string = newValue;
              if (this._cellsAttr === StorageAttribute.NUMERIC || this._cellsAttr === StorageAttribute.DATE || this._cellsAttr === StorageAttribute.TIME)
                dataBufVal = RecordUtils.byteStreamToString(dataBufVal);

              if (UtilStrByteMode.isLocaleDefLangDBCS() && (this._cellsAttr === StorageAttribute.ALPHA || this._cellsAttr === StorageAttribute.MEMO)) {
                let baDataBuf: Uint8Array = this._encoding.GetBytes(this._dataBuf.ToString());
                let baDataBufVal: Uint8Array = this._encoding.GetBytes(dataBufVal);

                // update data buf
                for (let i: number = 0; i < baDataBufVal.length && <number>i < localCellSize; i++)
                  baDataBuf[<number>(<number>(idx - 1) * localCellSize) + i] = baDataBufVal[i];

                // we do not keep the whole size of the alpha
                for (let i: number = baDataBufVal.length; <number>i < localCellSize; i++)
                  baDataBuf[<number>(<number>(idx - 1) * localCellSize) + i] = ((this._cellsAttr === StorageAttribute.ALPHA) ? 32 : 0);

                this._dataBuf = new StringBuilder(this._encoding.GetString(baDataBuf, 0, baDataBuf.length));
                curr.data = this._encoding.GetString(baDataBuf, <number>(<number>(idx - 1) * localCellSize), <number>localCellSize);
              }
              else {
                // update data buf
                // QCR 987943 trim the value if it is longer the the cell length
                for (let i: number = 0; i < dataBufVal.length && <number>i < localCellSize; i++)
                  this._dataBuf.set_Item(<number>(<number>(idx - 1) * localCellSize) + i, dataBufVal.charAt(i));

                // in alpha and num type we do not keep the whole size of the alpha/NUM_TYPE
                for (let i: number = dataBufVal.length; <number>i < localCellSize; i++)
                  this._dataBuf.set_Item(<number>(<number>(idx - 1) * localCellSize) + i, (this._cellsAttr === StorageAttribute.ALPHA || this._cellsAttr === StorageAttribute.UNICODE) ? ' ' : '\0');

                // QCR 987943 trim the value if it is longer the the cell length
                if (this._cellsAttr === StorageAttribute.ALPHA || this._cellsAttr === StorageAttribute.UNICODE || this._cellsAttr === StorageAttribute.MEMO)
                  curr.data = this._dataBuf.ToString().substr(<number>(<number>(idx - 1) * localCellSize), <number>localCellSize);
              }
            }
            // update the null buf
            this._nullBuf.set_Item(idx - 1, '\0');
            curr.isNull = false;
          }
          // if the value passed is null
          else {
            curr.data = null;

            // set the prefix flag that indicates whether the blob is vector or not
            if (this._cellsAttr === StorageAttribute.BLOB_VECTOR)
              curr.blobFieldPrefix = BlobType.getEmptyBlobPrefix('\u0001');
            else
              curr.blobFieldPrefix = BlobType.getEmptyBlobPrefix('\0');
            curr.isNull = true;
            this._nullBuf.set_Item(idx - 1, '\u0001');

            // relevant only for none blobs
            for (let i: number = 0; <number>i < localCellSize; i++)
              this._dataBuf.set_Item(<number>(<number>(idx - 1) * localCellSize) + i, '\0');

            // update the null buf
            this._nullBuf.set_Item(idx - 1, '\u0001');
          }
          res = true;
        }
        // new record
        else {
          let insertVal: string;
          // chooses the value inserted to the skipped cells
          if (this._cellsAttr === StorageAttribute.BLOB || this._cellsAttr === StorageAttribute.BLOB_VECTOR) {
            // append the is vector flag
            if (this._cellsAttr === StorageAttribute.BLOB_VECTOR)
              insertVal = BlobType.getEmptyBlobPrefix('\u0001');
            else
              insertVal = BlobType.getEmptyBlobPrefix('\0');

            if (!this._cellsIsNullDefault)
              insertVal = insertVal + this._cellsDefaultVal; // concat regolar blob cntrol data
          }
          else if (this._cellsIsNullDefault)
            insertVal = null;
          // simple null value
          else
            insertVal = this._cellsDefaultVal; // default simple value

          // QCR 503691 the value of true or false in the server are the numeric values of 1 and 0
          if (insertVal !== null && StorageAttributeCheck.isTypeLogical(this._cellsAttr))
            insertVal = (DisplayConvertor.toBoolean(insertVal) ? new StringBuilder().Append('\u0001').ToString() : new StringBuilder().Append('\0').ToString());

          // create skipped records
          // when a vector cell is set , if the cell is beyond the existing vector.
          // we will fill the cells between vector size and set cell with default value.
          // for example : if vector size is 0, and we do vecset (vec[5]). cell 5 needs to be set
          // with the value. cells 1 to 4 will be created and set with the default value.
          let dataBufVal: string = insertVal;

          while (this._cells.length < idx) {
            if (this._cellsAttr === StorageAttribute.BLOB || this._cellsAttr === StorageAttribute.BLOB_VECTOR) {
              this._cells.push(new CellElement(insertVal.substr(VectorType.EMPTY_BLOB_PREFIX_LEN), this._cellsIsNullDefault, insertVal.substr(0, VectorType.EMPTY_BLOB_PREFIX_LEN)));
              this._dataBuf.Append(this.getNullString(VectorType.BLOB_TYPE_STRUCT_SIZE));
            }
            else {
              this._cells.push(new CellElement(insertVal, this._cellsIsNullDefault));

              // update the data buf
              if (insertVal !== null) {
                // numeric types are represented in the data buf as num type so we
                // translate them before inserting them to the buf
                if (this._cellsAttr === StorageAttribute.NUMERIC || this._cellsAttr === StorageAttribute.DATE || this._cellsAttr === StorageAttribute.TIME) {
                  if (createBufferValForNumType) {
                    // create a buffer value for num type only once, and use it
                    // over and over again for all the cells to be initialized.
                    // do the translation only once to improve performance.
                    createBufferValForNumType = false;
                    dataBufVal = RecordUtils.byteStreamToString(insertVal);
                  }
                }

                // dataBufVal either contains original insertVal, or a string of
                // byteStream for num types.
                this._dataBuf.Append(dataBufVal);

                // since we don't alway keep the whole alpha
                let valLen: number;
                if (UtilStrByteMode.isLocaleDefLangDBCS() && (this._cellsAttr === StorageAttribute.ALPHA || this._cellsAttr === StorageAttribute.MEMO))
                  valLen = UtilStrByteMode.lenB(dataBufVal);
                else
                  valLen = dataBufVal.length;

                for (let i: number = valLen; <number>i < localCellSize; i++)
                  this._dataBuf.Append((this._cellsAttr === StorageAttribute.ALPHA || this._cellsAttr === StorageAttribute.UNICODE) ? ' ' : '\0');
              }
              else
                this._dataBuf.Append(this.getNullString(localCellSize));
            }

            // update the null buf
            this._nullBuf.Insert(this._cells.length - 1,
              this._cellsIsNullDefault ? '\u0001' : '\0'
            );
          }

          // vector has been filled till the requested idx.
          // now its time to set the requested cell.
          res = this.setVecCell(idx, newValue, isNull);
        }
      }
    }
    catch (ApplicationException) {
      res = false;
    }
    return res;
  }

  /// <summary>
  ///   change the vector to fit the definitions of a different vector field
  /// </summary>
  /// <param name="field">the new field</param>
  adjustToFit(field: FieldDef): void {
    if (field.getType() === StorageAttribute.BLOB_VECTOR) {
      let srcAttr: StorageAttribute = this.getCellsAttr();
      let dstAttr: StorageAttribute = field.getCellsType();

      if (StorageAttributeCheck.isTheSameType(srcAttr, dstAttr)) {
        this.init();

        // trim data if needed ( only for alpha or memo)
        if (StorageAttributeCheck.IsTypeAlphaOrUnicode(srcAttr) && StorageAttributeCheck.IsTypeAlphaOrUnicode(dstAttr)) {
            let dstSizeInChars: number = field.getVecCellsSize();
            let srcSizeInChars: number = ((this._cellsAttr === StorageAttribute.UNICODE) ? Math.floor(this._cellSize / 2) : this._cellSize);
          let isByteMode: boolean = UtilStrByteMode.isLocaleDefLangDBCS() && StorageAttributeCheck.isTypeAlpha(dstAttr);

          if (srcSizeInChars !== dstSizeInChars) {
            let adjData: StringBuilder = new StringBuilder();

            // goes over all cells in the vector
            for (let i: number = 0; i < dstSizeInChars; i = i + 1) {
              let curr: CellElement = this._cells.get_Item(i);
              // trim is needed
              if (!curr.isNull) { // unicode cell size are saved internally as byte length while the field returns char
                // length
                if (srcSizeInChars > dstSizeInChars) {
                  if (isByteMode)
                    curr.data = UtilStrByteMode.leftB(curr.data, dstSizeInChars);
                  else
                    curr.data = curr.data.substr(0, dstSizeInChars);
                  adjData.Append(curr.data);
                }
                // padding is needed
                else {
                  let tmpData: StringBuilder = new StringBuilder();
                  tmpData.Append(curr.data);
                  let dataLen: number = isByteMode ? UtilStrByteMode.lenB(curr.data) : curr.data.length;

                  // pad with blanks
                  for (let j: number = dataLen; j < dstSizeInChars; j = j + 1)
                    tmpData.Append(' ');
                  adjData.Append(tmpData.ToString());

                  // update the data in the vector cell
                  curr.data = tmpData.ToString();
                }
              }
              else {
                let tmpData: StringBuilder = new StringBuilder();
                for (let j: number = 0; j < dstSizeInChars; j = j + 1)
                  tmpData.Append('\0');
                adjData.Append(tmpData.ToString());

                // update the data in the vector cell
                curr.data = tmpData.ToString();
              }
            }// end loop
            this._dataBuf = adjData;
          }
        }

        // QCR 747801 in the filed the size of numeric/date/time is thier hex size
        // whereas here it is their NUM_TYPE size
        let newSize: number = field.getVecCellsSize();

        // change the headers data such as cell type and cells size
        this._cellsAttr = field.getCellsType();
        this._cellSize = <number>((this._cellsAttr === StorageAttribute.UNICODE) ? (newSize * 2) : newSize);
        this._cellsDefaultVal = field.getCellDefualtValue();
        this._cellsIsNullDefault = field.isNullDefault();
        this._allowNull = field.NullAllowed;
        this._originalflatData = this.toString();
        return;
      }
      else
        throw new ApplicationException("in VectorType.adjustToFit vector basic types does not agree");
    }
    else
      throw new ApplicationException("in  VectorType.adjustToFit " + field.getName() + " is not of type vector");
  }

  /// <summary>
  ///   update the vec size in the headers buf
  /// </summary>
  /// <param name = "idx">the new size</param>
  private buildHeadersString(): string {
    let res: string = VectorType.BLOB_TABLE_STR + VectorType.VECTOR_STR + "," + VectorType.VERSION + "," + 1 + "," + <string>this._cellsAttr + ",";
    res = res + this._cellSize + ",";

    // append the default value
    let def: string = "";
    if (this._cellsDefaultVal !== null)
      if (this._cellsAttr === StorageAttribute.NUMERIC || this._cellsAttr === StorageAttribute.DATE || this._cellsAttr === StorageAttribute.TIME)
        def = RecordUtils.byteStreamToString(this._cellsDefaultVal);
      else
        def = this._cellsDefaultVal;

    // in string we do not keep the full length of the string in brwoser client
    if (UtilStrByteMode.isLocaleDefLangDBCS() && (this._cellsAttr === StorageAttribute.ALPHA || this._cellsAttr === StorageAttribute.MEMO))
      def = def + this.getEmptyString(this._cellSize - <number>UtilStrByteMode.lenB(def));
    else
      def = def + this.getEmptyString(this._cellSize - <number>def.length);

    // continue building the headers
    res = res + def + "," + (this._cellsIsNullDefault ? "1" : "0") + ",";
    res = res + (this._allowNull ? "1" : "0") + "," + this._cellSize + "," + this._cells.length + ",";
    res = res + ((this._cellsAttr === StorageAttribute.BLOB || this._cellsAttr === StorageAttribute.BLOB_VECTOR) ? "1" : "0") + ",";

    if (this._cellsAttr === StorageAttribute.BLOB || this._cellsAttr === StorageAttribute.BLOB_VECTOR)
      res = res + "0,";

    return res;
  }

  // returns a string with size null charecters
  private getNullString(size: number): string {
    let res: StringBuilder = new StringBuilder();
    for (let i: number = 0; i < size; i = i + 1)
      res.Append('\0');
    return res.ToString();
  }

  // returns a string with size blank charecters
  private getEmptyString(size: number): string {
    let res: StringBuilder = new StringBuilder();
    for (let i: number = 0; i < size; i = i + 1)
      res.Append(' ');
    return res.ToString();
  }

  /// <summary>
  ///   goes over the cells of the vectors and builds the data buf of blobs since it is the only thing not
  ///   updated dynamically
  /// </summary>
  private getBlobsBuf(): string {
    let res: StringBuilder = new StringBuilder();
    for (let i: number = 0; i < this._cells.length; i = i + 1) {
      let data: string = "";
      let blobSize: number = 0;
      let curr: CellElement = this._cells.get_Item(i);

      if (curr.data !== null) {
        data = curr.data;
        blobSize = data.length;
      }

      res.Append(blobSize);
      res.Append("," + curr.blobFieldPrefix + "," + data + ";");
    }
    return (res + ",");
  }

  /*-------------------------------------------------------------------------------------*/
  /*                                                                                     */
  /* static utility methods */
  /*                                                                                     */
  /*-------------------------------------------------------------------------------------*/

  /// <summary>
  ///   this method checks if contents of a blob indicate that it is a valid verctor i.e. if the blob is in
  ///   vector's flatten format
  /// </summary>
  /// <param name = "blob">the string representation of contents of the blob</param>
  /// <returns> true if valid vector</returns>
  static validateBlobContents(blob: string): boolean {
    let valid: boolean = false;

    if (!NString.IsNullOrEmpty(blob)) {
      let start: number = BlobType.blobPrefixLength(blob);
      valid = (NString.Compare(blob, (VectorType.BLOB_TABLE_STR + VectorType.VECTOR_STR), true, start, 0, (VectorType.BLOB_TABLE_STR_LEN + VectorType.VECTOR_STR_LEN)) === 0);
    }
    return valid;
  }

  /// <summary>
  ///   parses the cell attribute of the vector
  /// </summary>
  /// <param name = "blob">a vector in a flattened format</param>
  /// <returns> att the the vector's cells attribute</returns>
  static getCellsAttr(blob: string): StorageAttribute {
    if (VectorType.validateBlobContents(blob)) {
      let tokens: string[] = StrUtil.tokenize(blob.substr(BlobType.blobPrefixLength(blob)), ",");

      // skip the MGBTMGVEC

      // skip the version

      // skip the ColumnsCount_

      // the next token is the cells attribute
      return <StorageAttribute>tokens[3].charAt(0);
    }
    else
      throw new ApplicationException("in static getCellsAttr the blob is in the wrong format");
  }

  /// <summary>
  ///   parses the size of each cell in the vector all cell has the same size except when the vector cells are
  ///   of type blob or vector
  /// </summary>
  /// <param name = "blob">a vector in a flattened format</param>
  /// <returns> the cells size or -1 if there is encoding problem</returns>
  static getCellSize(blob: string): number {
    let cellsType: StorageAttribute = VectorType.getCellsAttr(blob);
    if (cellsType !== StorageAttribute.BLOB && cellsType !== StorageAttribute.BLOB_VECTOR) {
      let tokens: string[] = StrUtil.tokenize(blob.substr(BlobType.blobPrefixLength(blob)), ",");

      // skip the MGBTMGVEC

      // skip the version

      // skip the ColumnsCount_

      // skip the cells type

      // the next element is the cells size
      return NNumber.Parse(tokens[4]);
    }
    else { // =============================>
      return 2147483647;
    }
  }

  /// <summary>
  ///   parses the size of the vector
  /// </summary>
  /// <param name = "blob">a vector in a flattened format</param>
  /// <returns> the size of the vector</returns>
  static getVecSize(blob: string): number {

    if (VectorType.validateBlobContents(blob)) {
      let pos: number = BlobType.blobPrefixLength(blob);
      let tokens: string[] = StrUtil.tokenize(blob.substr(pos), ",");

      // skip the MGBTMGVEC
      pos = pos + (tokens[0].length + 1);

      // skip the version
      pos = pos + (tokens[1].length + 1);

      // skip the ColumnsCount_
      pos = pos + (tokens[2].length + 1);

      // skip the cells type
      pos = pos + (tokens[3].length + 1);

      // skip the cells size
      let cellsSize: string = tokens[4];
      pos = pos + (cellsSize.length + 1);

      // skip the cell default value and re-init the tokenizer
      // since the default value may contain the delimeter charecter as data
      pos = pos + (NNumber.Parse(cellsSize) + 1);
      tokens = StrUtil.tokenize(blob.substr(pos), ",");

      // skip is cell null default

      // skip is null allowed

      // skip columns total length

      // the next element is the vector size
      return NNumber.Parse(tokens[3]);
    }
    throw new ApplicationException("in static getVecSize the blob is in the wrong format");
  }

  /// <summary>
  ///   Trim cell strings in the vector if the cells are alpha or memo.
  ///   Their length should be adjusted in the number of bytes, not the number of characters.
  ///   (DBCS support)
  /// </summary>
  /// <param name = "srcBlob">a vector in a flattened format</param>
  /// <returns> String</returns>
  static adjustAlphaStringsInFlatData(srcBlob: string): string {
    let result: string;
    if (VectorType.validateBlobContents(srcBlob)) {
      let destBuf: StringBuilder = new StringBuilder();

      // copy Blob prefix
      let pos: number = BlobType.blobPrefixLength(srcBlob);
      let strToken: string = srcBlob.substr(0, pos);
      destBuf.Append(strToken);

      let tokens: string[] = StrUtil.tokenize(srcBlob.substr(pos), ",");
      let tokenIdx: number = 0;

      // copy the MGBTMGVEC
      tokenIdx++;
      strToken = tokens[tokenIdx];
      destBuf.Append(strToken + ",");
      pos = pos + (strToken.length + 1);

      // copy the version
      tokenIdx++;
      strToken = tokens[tokenIdx];
      destBuf.Append(strToken + ",");
      pos = pos + (strToken.length + 1);

      // copy the ColumnsCount_
      tokenIdx++;
      strToken = tokens[tokenIdx];
      destBuf.Append(strToken + ",");
      pos = pos + (strToken.length + 1);

      // check the cells type
      tokenIdx++;
      strToken = tokens[tokenIdx];
      if (strToken.charAt(0) !== StorageAttribute.ALPHA && strToken.charAt(0) !== StorageAttribute.MEMO)
        return srcBlob;

      // copy the cells type
      destBuf.Append(strToken + ",");
      pos = pos + (strToken.length + 1);

      // copy the cells size
      tokenIdx++;
      strToken = tokens[tokenIdx];
      let len: number = NNumber.Parse(strToken);
      destBuf.Append(strToken + ",");
      pos = pos + (strToken.length + 1);

      // copy the default value
      // note: the default value may contain the delimiter character as data
      strToken = UtilStrByteMode.leftB(srcBlob.substr(pos), len);
      destBuf.Append(strToken + ",");
      pos = pos + (strToken.length + 1);

      tokens = StrUtil.tokenize(srcBlob.substr(pos), ",");
      tokenIdx = 0;

      // copy the cells null default flag
      tokenIdx++;
      strToken = tokens[tokenIdx];
      destBuf.Append(strToken + ",");
      pos = pos + (strToken.length + 1);

      // copy the cells null allowed flag
      tokenIdx++;
      strToken = tokens[tokenIdx];
      destBuf.Append(strToken + ",");
      pos = pos + (strToken.length + 1);

      // copy the column's total length
      tokenIdx++;
      strToken = tokens[tokenIdx];
      destBuf.Append(strToken + ",");
      pos = pos + (strToken.length + 1);

      // copy the vector size
      tokenIdx++;
      strToken = tokens[tokenIdx];
      let vecSize: number = NNumber.Parse(strToken);
      destBuf.Append(strToken + ",");
      pos = pos + (strToken.length + 1);

      // copy blobs_
      tokenIdx++;
      strToken = tokens[tokenIdx++];
      destBuf.Append(strToken + ",");
      pos = pos + (strToken.length + 1);

      // copy each vector
      for (let i: number = 0; i < vecSize; i = i + 1) {
        // note: the default value may contain the delimiter character as data
        strToken = UtilStrByteMode.leftB(srcBlob.substr(pos), len);
        destBuf.Append(strToken);
        pos = pos + strToken.length;
      }

      // copy the rest
      strToken = srcBlob.substr(pos);
      destBuf.Append(strToken);

      let destBlob: string = destBuf.ToString();
      return destBlob;
    }
    else
      return srcBlob;
  }

  /// <summary>
  ///   check if flatData content was translated to unicode or not. flatData contains the vector's cells in flat
  ///   (non-array) format. This is how the server sends us the data. However the server does not send it to us
  ///   in a UNICODE format. Thus we translate it to unicode during the first time we "de-serialize" the
  ///   flat-data into a vector. During the de-serialization operation during the first time we "de-serialize"
  ///   the flat-data into a vector. During the de-serialization operation we modify the BLOB-TABLe eye catcher
  ///   from upper case to lower case, this way we know if a translation was done or is needed.
  /// </summary>
  /// <param name = "name">flatData The vector's flat data</param>
  /// <returns> TRUE if the flat data is already in unicode format</returns>
  isUnicode(flatData: string): boolean {
    let start: number = BlobType.blobPrefixLength(flatData);
    let catcher: string = flatData.substr(start, VectorType.BLOB_TABLE_STR_LEN);
    return (catcher === VectorType.BLOB_TABLE_STR);
  }
}

/// <summary>
///   this inner class represents a cell in the magic vector each data that the magic vector keeps per cell
///   will be kept in the CellElement
/// </summary>
export class CellElement {
  blobFieldPrefix: string = null;
  data: string = null;
  isNull: boolean = false;

  // all this variables are used only if the vector cell is of type vector or blob

  constructor(val: string, is_null: boolean);
  constructor(val: string, is_null: boolean, ctrlData: string);
  constructor(val: string, is_null: boolean, ctrlData?: string) {
    if (arguments.length === 2)
      this.constructor_0(val, is_null);
    this.constructor_1(val, is_null, ctrlData);
  }

  // constructs a new cell element for vectors whos cells are not of type blob or vector
  private constructor_0(val: string, is_null: boolean): void {
    this.data = val;
    this.isNull = is_null;
  }

  // constructs a new cell element for vectors whos cells are of type blob or vector
  private constructor_1(val: string, is_null: boolean, ctrlData: string): void {
    this.data = val;
    this.isNull = is_null;
    this.blobFieldPrefix = ctrlData;
  }
}
