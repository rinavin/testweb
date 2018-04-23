import {DateTime, Exception, List, NChar, NNumber, NString, NumberFormatInfo, StringBuilder} from "@magic/mscorelib";
import {ValidationDetails} from "./ValidationDetails";
import {Manager} from "../../Manager";
import {IEnvironment} from "../../env/IEnvironment";
import {MgControlBase} from "./MgControlBase";
import {Field} from "../data/Field";
import {DateBreakParams, DisplayConvertor} from "./DisplayConvertor";
import {
  DateUtil,
  HTML_2_STR,
  MgControlType,
  MsgInterface,
  PICInterface,
  StorageAttribute,
  StrUtil,
  UtilDateJpn,
  UtilStrByteMode
} from "@magic/utils";
import {Events} from "../../Events";
import {WrongFormatException} from "./WrongFormatException";
import {PIC} from "./PIC";
import {DateElement} from "../../GuiEnums";
import {NUM_TYPE} from "../data/NUM_TYPE";
import {HebrewDate} from "./HebrewDate";
import {PropInterface} from "./PropInterface";
import {BlobType} from "../data/BlobType";


export class FieldValidator {
  private _newvalue: any = null;
  private _oldvalue: any = null;
  private _pictureReal: string = null;
  private _pictureEnable: string = null;
  private _valDet: ValidationDetails = null;
  private _isPm: boolean = false;
  private _picture: string = null;
  private hebrew: boolean = false;
  private _decimal: string = null;
  private _environment: IEnvironment = null;

  constructor() {
    this._environment = Manager.Environment;
    this._decimal = (this._environment.GetDecimal() || "");
  }

  /// <summary> the main method of this class</summary>
  /// <param name="valDet">a ValidationDetails object to use when validating</param>
  checkVal(valDet: ValidationDetails): ValidationDetails {
    this._newvalue = (this._oldvalue = (this._pictureReal = (this._pictureEnable = null)));
    this.init(valDet);
    valDet.setValidationFailed(false);
    let ctrl: MgControlBase = valDet.getControl();
    let modInQueuy: boolean = ctrl.checkPropWithLine(PropInterface.PROP_TYPE_MODIFY_IN_QUERY, false, ctrl.getDisplayLine(false));
    let useNative: boolean = ctrl.isModifiable();

    if (ctrl.getForm().getTask().getMode() === 'E' && !modInQueuy) {
      valDet.setValue(this._oldvalue);
      return valDet;
    }

    if (ctrl.Type === MgControlType.CTRL_TYPE_RADIO || ctrl.Type === MgControlType.CTRL_TYPE_CHECKBOX || ctrl.Type === MgControlType.CTRL_TYPE_TAB || ctrl.isSelectionCtrl()) {
      try {
        if (ctrl.Type === MgControlType.CTRL_TYPE_CHECKBOX) {
          valDet.setNull(ctrl.isNullValue(this._newvalue));
        }
        if (this._newvalue !== null && ctrl.isSelectionCtrl()) {
          let idx: number = NNumber.Parse(this._newvalue);
          if (ctrl.isChoiceNull(idx)) {
            valDet.setNull(true);
          }
        }
      }
      catch (ex_111) {
        if (ex_111 instanceof Exception) {
        }
        else
          throw ex_111;
      }
      valDet.setValue(this._newvalue);
      return valDet;
    }

    // space|nothing was inserted  -> use default value
    if (ctrl.DataType !== StorageAttribute.ALPHA && ctrl.DataType !== StorageAttribute.UNICODE && ctrl.DataType !== StorageAttribute.BLOB) {
          if ((typeof this._newvalue === 'string' && this._newvalue.trim().length === 0) || (ctrl.DataType === StorageAttribute.DATE && (ctrl.isDateZero(this._newvalue) || this.isNullDisplayVal()))) {
            let field: Field = ctrl.getField();
            let defaultValue: string = field.getDefaultValue();
            let text: string = null;
            if (field.isNullDefault()) {
              valDet.setNull(true);
              text = field.getNullDisplay();
              if (NString.IsNullOrEmpty(text) && ctrl.DataType === StorageAttribute.DATE) {
                text = DisplayConvertor.Instance.mg2disp(defaultValue, valDet.getRange(), valDet.getPIC(), useNative, field.getTask().getCompIdx(), false);
              }
            }
            if (text === null) {
              text = DisplayConvertor.Instance.mg2disp(defaultValue, valDet.getRange(), valDet.getPIC(), useNative, field.getTask().getCompIdx(), false);
            }
            if ((!field.isNullDefault() && (this._valDet.getContinuousRangeValues() !== null || this._valDet.getDiscreteRangeValues() !== null)))
              this._newvalue = text;
            else
            {
              valDet.setValue(text);
              return valDet;
            }
          }
     }


    if ((typeof this._newvalue === 'string' && !(StrUtil.rtrim(this._newvalue) === StrUtil.rtrim(this._oldvalue))) || ctrl.ModifiedByUser)
    {
      try
      {
        switch (valDet.getType())
        {

          case StorageAttribute.ALPHA:
          case StorageAttribute.UNICODE:
            valDet.setValue(this.checkAlphaField());
            break;

          case StorageAttribute.NUMERIC:
            this._pictureReal = valDet.getPictureReal(); // only numeric type need another picture format
            this._pictureEnable = valDet.getPictureEnable();
            this.checkNumericPicture();
            valDet.setValue(this.checkNumericField());
            break;

          case StorageAttribute.BOOLEAN:
            valDet.setValue(this.checkLogicalField());
            break;

          case StorageAttribute.DATE:
            valDet.setValue(this.checkDateField());
            break;

          case StorageAttribute.TIME:
            valDet.setValue(this.checkTimeField());
            break;

          case StorageAttribute.BLOB:
          // there is no real picture to BLOB, do nothing
          case StorageAttribute.BLOB_VECTOR:
            valDet.setValue(this._newvalue);
            break;

          case StorageAttribute.NONE:
          default:
            Events.WriteExceptionToLog("FieldValidator.checkVal: Type of the field " + valDet.getType());
            break;
        }
      }
      catch (goBack) {
        if (goBack instanceof WrongFormatException) {
          // need change to old value, set focus back and write Error Message
          valDet.setValue(this._oldvalue);
          this.setValidationFailed(true);
          if (goBack.getType() !== MsgInterface.STR_RNG_TXT) {
            this.printMessage(goBack.getType(), false);
            this.setValidationFailed(true);
          }
          else
            this.printMessage(MsgInterface.STR_RNG_TXT, true);
        }
      }
    }
    return valDet;

  }

  /// <summary>Check & validate Alpha field by his old/new value and 2 pictures:
  /// Real and Enable
  /// 1.check if newvalue complete with pictures, otherwise return oldvalue
  /// 2.check if newvalue complete with range
  /// 2.1 complete value, if possible, otherwise  return oldvalue
  /// </summary>
  /// <returns> String - new value of validated field</returns>
  private checkAlphaField(): string {

    let control: MgControlBase = this._valDet.getControl();

    let IsAttrAlpha: boolean = this._valDet.getType() === StorageAttribute.ALPHA;

    if (this._newvalue.length === 0 && this._valDet.getContinuousRangeValues() === null && this._valDet.getDiscreteRangeValues() === null) {
      this.setValidationFailed(false);
      return this._newvalue;
    }

    if (IsAttrAlpha && UtilStrByteMode.isLocaleDefLangDBCS()) {
      let picLenB: number = UtilStrByteMode.lenB(this._picture);
      if (UtilStrByteMode.lenB(this._newvalue) > picLenB) {
        this._newvalue = UtilStrByteMode.leftB(this._newvalue, picLenB);
      }
    }
    else {
      if (this._newvalue.length > this._picture.length) {
        this._newvalue = this._newvalue.substr(0, this._picture.length);
      }
    }
    let stringBuilder: StringBuilder = new StringBuilder();
    let currPicture: number;
    let i: number = currPicture = 0;

    for (currPicture = i = 0; i < this._newvalue.length && currPicture < this._picture.length; ) {
      if (!FieldValidator.isAlphaPositionalDirective(this._picture.charAt(currPicture)) && this._newvalue.charAt(i) === this._picture.charAt(currPicture)) {
        stringBuilder.Append(this._picture.charAt(currPicture));
        i = i + 1;
        currPicture = currPicture + 1;
      }
      else {
        if (!FieldValidator.isAlphaPositionalDirective(this._picture.charAt(currPicture)) && this._newvalue.charAt(i) !== this._picture.charAt(currPicture)) {
          stringBuilder.Append(this._picture.charAt(currPicture));
          currPicture = currPicture + 1;
        }
        else {
          if (FieldValidator.isAlphaPositionalDirective(this._picture.charAt(currPicture)) && this.isPossibleAlphaLetter(i, currPicture)) {
            if (UtilStrByteMode.isLocaleDefLangDBCS()) {
              let strVal: string = this._newvalue.substr(i, 1);
              if (UtilStrByteMode.lenB(strVal) === 2) {
                if (IsAttrAlpha) {
                  if (currPicture + 1 < this._picture.length) {
                    if (FieldValidator.isAlphaPositionalDirective(this._picture.charAt(currPicture + 1)) && this.isPossibleAlphaLetter(i, currPicture + 1)) {
                      stringBuilder.Append(this._newvalue.charAt(i));
                      i = i + 1;
                      currPicture = currPicture + 2;
                    }
                    else {
                      stringBuilder.Append(' ')/*' '*/;
                      currPicture = currPicture + 1;
                    }
                  }
                  else {
                    stringBuilder.Append(' ')/*' '*/;
                    currPicture = currPicture + 1;
                  }
                }
                else {
                  stringBuilder.Append(this._newvalue.charAt(i));
                  i = i + 1;
                  currPicture = currPicture + 1;
                }
              }
              else {
                stringBuilder.Append(this._newvalue.charAt(i));
                i = i + 1;
                currPicture = currPicture + 1;
              }
            }
            else {
              stringBuilder.Append(this._newvalue.charAt(i));
              i = i + 1;
              currPicture = currPicture + 1;
            }
          }
          else {
            stringBuilder.Append(' ')/*' '*/;
            currPicture = currPicture + 1;
            if (this._valDet.getControl() !== null) {
              let type: MgControlType = control.Type;
              if (type !== MgControlType.CTRL_TYPE_BUTTON) {
                this.printMessage(MsgInterface.STR_ERR_NUM, false);
              }
            }
          }
        }
      }
    }
    this._newvalue = stringBuilder.ToString();
    if (this._valDet.getContinuousRangeValues() !== null || this._valDet.getDiscreteRangeValues() !== null) {
      this._newvalue = this.fillAlphaByRange(this._valDet.getContinuousRangeValues(), this._valDet.getDiscreteRangeValues());
    }
    return  this._newvalue;
  }

  /// <summary>check if char in Alpha compleate with Directive Character for the letter</summary>
  /// <param name="index">of directive in string to check</param>
  /// <returns> true if complete, false otherwise</returns>
  private isPossibleAlphaLetter(indexInput: number, indexPicture: number): boolean {
    let result: boolean;
    switch (this._picture.charCodeAt(indexPicture)) {
      case PICInterface.PIC_X:
      case PICInterface.PIC_J:
      case PICInterface.PIC_G:
      case PICInterface.PIC_S:
      case PICInterface.PIC_T:
        return true;

      case PICInterface.PIC_U:
        let upper: string = this._newvalue[indexInput].toUpperCase();
        if (upper !== this._newvalue[indexInput])
          this.changeStringInside("" + upper, indexInput);
        return true;

      case PICInterface.PIC_L:
        let lower: string = this._newvalue[indexInput].toLowerCase();
        if (lower !== this._newvalue[indexInput])
          this.changeStringInside("" + lower, indexInput);
        return true;

      case PICInterface.PIC_N:
        let number1: string = this._newvalue[indexInput];
        if (UtilStrByteMode.isDigit(number1) || NChar.IsWhiteSpace(number1) || UtilStrByteMode.asNumeric(number1))
          return true;
        else
        {
          Events.WriteErrorToLog("Bad Alpha value. Should be number only on place Num. " + indexInput);
          return false;
        }

      default:
        Events.WriteErrorToLog("FieldValidator.isPossibleAlphaLetter: illegal Char Directive: " + this._picture.indexOf(String.fromCharCode(indexPicture)) + " for " + this._newvalue[indexInput]);
        return false;
    }
  }

  /// <summary>if new value wasn't finished and stay unwritable peaces of the Real picture - add it
  /// to the end of the newvalue
  /// </summary>
  private fillAllAlpha(): string {
    let stringBuilder: StringBuilder = new StringBuilder(this._picture.length);
    stringBuilder.Append(this._newvalue);

    if (UtilStrByteMode.isLocaleDefLangDBCS() && this._valDet.getType() === StorageAttribute.ALPHA) {
      let intNewvalueLenB: number = UtilStrByteMode.lenB(this._newvalue);
      let strBuiedPicture: string = UtilStrByteMode.leftB(this._picture, intNewvalueLenB);
      for (let i: number = strBuiedPicture.length; i < this._picture.length; i = i + 1) {
        if (FieldValidator.isAlphaPositionalDirective(this._picture.charAt(i))) {
          stringBuilder.Append(' ');
        }
        else {
          stringBuilder.Append(this._picture.charAt(i));
        }
      }
    }
    else {
      for (let i: number = this._newvalue.length - 1; i < this._picture.length && i >= 0; i++) {
        if (FieldValidator.isAlphaPositionalDirective(this._picture.charAt(i))) {
          stringBuilder.Append(' ')/*' '*/;
        }
        else {
          stringBuilder.Append(this._picture.charAt(i));
        }
        i = i + 1;
      }
    }
    return stringBuilder.ToString();
  }

  /// <summary>Comparative newvalue with possible Range in ContinuousRangeValues/DiscreteRangeValues</summary>
  /// <returns> newvalue if it possible, oldvalue otherwise</returns>
  private fillAlphaByRange(ContinuousRangeValues: List<string>, DiscreteRangeValues: List<string>): string {

    let tmpBuffer: string = DisplayConvertor.Instance.fillAlphaByDiscreteRangeValues(DiscreteRangeValues, this._newvalue);
    if (tmpBuffer !== null) {
      return tmpBuffer;
    }

    tmpBuffer = DisplayConvertor.Instance.fillAlphaByContinuousRangeValues(ContinuousRangeValues, this._newvalue);
    if (tmpBuffer !== null)
      return tmpBuffer;

      if (DiscreteRangeValues !== null)
        return this.CompleteAlphaByRange(DiscreteRangeValues);


    this.printMessage(MsgInterface.STR_RNG_TXT, true);
    return this._oldvalue;
  }

  /// <summary>Try to complete the newvalue by Range</summary>
  /// <returns> completed value if it possible, otherwise oldvalue</returns>
  private CompleteAlphaByRange(DiscreteRangeValues: List<string>): string {
    let tmpNewValue: string = DisplayConvertor.Instance.completeAlphaByRange(DiscreteRangeValues, this._newvalue);
    if (tmpNewValue !== null) {
      return tmpNewValue;
    }

    // focus back
    this.printMessage(MsgInterface.STR_RNG_TXT, true);
    return this._oldvalue;

  }

  /// <summary>check & validate Logical field by his old/new value and 2 pictures:
  /// Real and Enable
  /// 1.check if newvalue complete with pictures, otherwise return oldvalue
  /// 2.check if newvalue complete with range
  /// 2.1 complete value, if possible, otherwise  return oldvalue
  /// </summary>
  /// <returns> String - new value of validated field</returns>
  private checkLogicalField(): boolean {

    if (this._newvalue.length === 0 && this._valDet.getContinuousRangeValues() === null && this._valDet.getDiscreteRangeValues() === null) {
      throw new WrongFormatException(MsgInterface.STR_RNG_TXT);
    }

    if (this._valDet.getContinuousRangeValues() !== null || this._valDet.getDiscreteRangeValues() !== null) {
      this._newvalue = this.fillAlphaByRange(this._valDet.getContinuousRangeValues(), this._valDet.getDiscreteRangeValues());
    }

    this.setValidationFailed(false);

  // todo : need to check what is to handle for checking ranges
    return this._newvalue;
  }

  /// <summary>**************************Numeric*********************************</summary>

  /// <summary>check & validate Numeric field by his old/new value and 2 pictures:
  /// Real and Enable
  /// 1.check if newvalue complete with pictures, otherwise return oldvalue
  /// 2.check if newvalue complete with range
  /// 2.1 complete value, if possible, otherwise  return oldvalue
  /// </summary>
  /// <returns> String - new value of validated field</returns>
  private checkNumericField(): any {

    let evaluated: any;
    if (typeof this._newvalue === 'string') {
      if (this._newvalue.length === 0) {
        this._newvalue = "0";
      }

      let delimeterRealIndex: number = this._newvalue.indexOf(this._decimal);
      let delimeterPictIndex: number = this._pictureReal.indexOf(this._decimal);

      evaluated = "";
      let evaluatedLeft: string;
      let evaluatedRight: string;


      this.setValidationFailed(false);

      // check if the format of newvalue matches the numeric mask.
      if (!this.checkNumericInDecFormat())
        throw new WrongFormatException(MsgInterface.EDT_ERR_STR_1);

      if (delimeterPictIndex !== -1 && delimeterRealIndex !== -1) {
        evaluatedLeft = this.checkNumericLeft(delimeterPictIndex, delimeterRealIndex);
        evaluatedRight = this.checkNumericRight(delimeterPictIndex, delimeterRealIndex);
        evaluated = evaluatedLeft + this._decimal + evaluatedRight;
      }
      else {
        if (delimeterPictIndex !== -1 && delimeterRealIndex === -1) {
          evaluatedLeft = this.checkNumericLeft(delimeterPictIndex, Math.min(delimeterPictIndex, this._newvalue.length));
          evaluatedRight = this.checkNumericRight(delimeterPictIndex, delimeterPictIndex - 1);
          evaluated = evaluatedLeft + this._decimal + evaluatedRight;
        }
        else { // delimeterPictIndex == -1 && delimeterRealIndex != -1
          if (delimeterPictIndex === -1 && delimeterRealIndex === -1) {
            evaluated = this.checkNumericRight(-1, -1);
            evaluatedLeft = evaluated;
          }
          else {
            if (delimeterRealIndex > 0) {
              this._newvalue = this._newvalue.substr(0, delimeterRealIndex);
            }
            else {
              this._newvalue = "0";
            }
            evaluated = this.checkNumericRight(-1, -1);
            evaluatedLeft = evaluated;
          }
        }
      }

      if ((evaluatedRight.length === 0 && evaluatedLeft.length === 0) || (evaluated.length === 0 && this._newvalue.length > 0)) {
        // space|nothing was inserted  -> use default value
        let ctrl: MgControlBase;
        ctrl = this._valDet.getControl();

        let field: Field = ctrl.getField();
        let defValue: string = field.getDefaultValue(); // inner value inserted
        let dispDefValue: string = null;

        if (field.isNullDefault()) {
          this._valDet.setNull(true);
          dispDefValue = field.getNullDisplay();
        }
        if (dispDefValue == null)
          dispDefValue = DisplayConvertor.Instance.mg2disp(defValue, this._valDet.getRange(), this._valDet.getPIC(), true, field.getTask().getCompIdx(), false);

      }

      // check if the digit before the delimiter do not exceed the pic wholes.
      let wholeDigitdiff: number = this.digitsBeforeDelimeter(evaluated, 0, this._decimal) - this._valDet.getPIC().getWholes();
      // if they do, check if the exceeding chars are the pad chars. if so, there is no error.
      if (wholeDigitdiff > 0) {
        let padCharOnly: boolean = false;
        // is there a pad, check it. no pad is a certain error.
        if (this._valDet.getIsPadFill()) {
          padCharOnly = true;
          for (let i: number = 0; i < wholeDigitdiff && padCharOnly; i++)
            // if the char is not the pad, then this is an error.
            if (evaluated[i] !== this._valDet.getPadFillChar())
              padCharOnly = false;
        }

        if (!padCharOnly)
          throw new WrongFormatException(MsgInterface.EDT_ERR_STR_1);
      }


      if (this._valDet.getIsNegative() && (this._newvalue.trim().startsWith("-") || (this._valDet.getNegativeSignPref().length !== 0 && this._newvalue.trim().startsWith(this._valDet.getNegativeSignPref())))) {
        evaluated = "-" + evaluated;
      }

      // from this point have evaluated string - the value (without mask) of the control
      // needed to be inserted to the picture
      evaluated = DisplayConvertor.Instance.disp2mg(this._newvalue, "", this._valDet.getPIC(), this._valDet.getControl().getForm().getTask().getCompIdx(), BlobType.CONTENT_TYPE_UNKNOWN);
      evaluated = DisplayConvertor.Instance.mg2disp(evaluated, "", this._valDet.getPIC(), true, this._valDet.getControl().getForm().getTask().getCompIdx(), true);

      // in order check if user has entered a blank value , trim and then check it's length.
      let tempDispVal: string = StrUtil.ltrim(evaluated);
      if (tempDispVal.length === 0 && this._valDet.getPIC().zeroFill() && this._valDet.getPIC().getZeroPad() === ' ')
        evaluated = "0";
    }
    else {

      // from this point have evaluated string - the value (without mask) of the control
      // needed to be inserted to the picture
      evaluated = DisplayConvertor.Instance.disp2mg(this._newvalue, "", this._valDet.getPIC(), this._valDet.getControl().getForm().getTask().getCompIdx(), BlobType.CONTENT_TYPE_UNKNOWN);
      evaluated = DisplayConvertor.Instance.mg2disp(evaluated, "", this._valDet.getPIC(), true, this._valDet.getControl().getForm().getTask().getCompIdx(), true);

    }
    // Insert the number to range
    if (this._valDet.getContinuousRangeValues() != null || this._valDet.getDiscreteRangeValues() != null)
    {
      this._newvalue = evaluated;
      evaluated = this.fillNumericByRange();
    }
    return evaluated;
  }

  /// <summary>Check validity of numerical picture from found 'delimeter' to left.
  /// <-.
  /// </summary>
  /// <param name="delimeterPictIndex">found delimeter in the picture</param>
  /// <param name="delimeterRealIndex">found delimeter in the inserted by user new value</param>
  private checkNumericLeft(delimeterPictIndex: number, delimeterRealIndex: number): string {
    let buffer: StringBuilder = new StringBuilder();
    let RealIndex: number = delimeterRealIndex - 1;
    let PictIndex: number;
    let isFound: boolean;

    for (PictIndex = delimeterPictIndex - 1; PictIndex >= 0 && RealIndex >= 0; PictIndex--)
    {
      if (this._pictureEnable[PictIndex] === '1')
      {
        let tmpstorage: number = RealIndex;
        isFound = false;

        for (; RealIndex >= 0; RealIndex--)
        {
          if (this._pictureReal[PictIndex] === this._newvalue[RealIndex])
          {
            isFound = true;
            RealIndex--;
            break;
          }
        }

        if (!isFound)
          RealIndex = tmpstorage;

        buffer.Append(this._pictureReal[PictIndex]);
      }
      // can insert only number
      else
      {
        for (; RealIndex >= 0; RealIndex--)
        {
          if (UtilStrByteMode.isDigit(this._newvalue[RealIndex]))
          {
            buffer.Append(this._newvalue[RealIndex]);
            RealIndex--;
            break;
          }
        }
      }
    }

    if (RealIndex < 0 && PictIndex >= 0)
    // try to add unwritable
      for (; PictIndex >= 0; PictIndex--)
      {
        if (this._pictureEnable[PictIndex] === '1')
          buffer.Append(this._pictureReal[PictIndex]);
        else
        {
          // only from left need PadFill
          if (this._valDet.getIsPadFill())
            buffer.Append(this._valDet.getPadFillChar());
        }
      }

    return StrUtil.ReverseString(buffer).ToString();
  }

  /// <summary>Check validity of numerical picture from found 'delimeter' to right.
  /// .->
  /// </summary>
  /// <param name="delimeterPictIndex">found delimeter in the picture</param>
  /// <param name="delimeterRealIndex">found delimeter in the inserted by user new value</param>
  private checkNumericRight(delimeterPictIndex: number, delimeterRealIndex: number): string {
    let buffer: StringBuilder = new StringBuilder();
    let RealIndex: number = delimeterRealIndex + 1;
    let PictIndex: number;
    let pic: PIC = this._valDet.getPIC();

    for (PictIndex = delimeterPictIndex + 1; PictIndex < this._pictureEnable.length && RealIndex < this._newvalue.length; PictIndex++)
    {
      if (this._pictureEnable[PictIndex] === '1')
      {
        if (RealIndex < PictIndex)
          RealIndex = PictIndex;

        buffer.Append(this._pictureReal[PictIndex]);
      }
      // can insert only number
      else
      {
        for (; RealIndex < this._newvalue.length; RealIndex++)
        {
          // Append the digit of actual input data. If it is mask char, skip it.
          if (UtilStrByteMode.isDigit(this._newvalue[RealIndex]) && !pic.picIsMask(RealIndex))
          {
            buffer.Append(this._newvalue[RealIndex]);
            RealIndex++;
            break;
          }
        }
      }
    }

    // if right part has any input data, then only append unwritable chars
    if (buffer.Length > 0)
    {
      if (RealIndex >= this._newvalue.length && PictIndex < this._pictureReal.length)
      // try to add unwritable
        for (; PictIndex < this._pictureReal.length; PictIndex++)
        {
          if (this._pictureEnable[PictIndex] === '1')
            buffer.Append(this._pictureReal[PictIndex]);
          // else Do nothing
        }
    }
    return buffer.ToString();
  }

  /// <summary>BUG: 442788
  /// Changing decimal separator in thew pictureReal to value got from Environment
  /// </summary>
  private checkNumericPicture(): void {
    let indexOfDec: number;
    let lastDec: number;
    let maxLength: number;
    let currIndx: number;
    let POINT_DEC: string = "."; // used in PICTURE for decimal separator

    let pic: PIC = this._valDet.getPIC();

    if (this._pictureReal == null || this._pictureEnable == null || pic.getAttr() !== StorageAttribute.NUMERIC || !pic.withDecimal())
      return;

    lastDec = this._pictureReal.lastIndexOf(POINT_DEC);
    maxLength = this._pictureEnable.length;
    currIndx = 0;
    while (currIndx < lastDec)
    {
      indexOfDec = this._pictureEnable.indexOf("1", currIndx);

      if (indexOfDec === -1)
      // not found
        return;
      else
      {
        if (indexOfDec === this._pictureReal.indexOf( POINT_DEC, currIndx))
        // it's real decimal point and not \. into the picture
        {
          let first: string;
          let second: string;

          first = second = "";
          if (indexOfDec === 0)
          // the point on the first place .###
          {
            if (indexOfDec + 1 < maxLength)
            // only 1 .
              second = this._pictureReal.substr(indexOfDec + 1);
          }
          else if (indexOfDec === maxLength)
          // the point on the last place ###.
          {
            first = this._pictureReal.substr(0 , indexOfDec);
          }
          else
          {
            first = this._pictureReal.substr(0 , indexOfDec);
            second = this._pictureReal.substr(indexOfDec + 1);
          }
          this._pictureReal = first + this._decimal + second;
          break;
        }
        else
        {
          currIndx = ++indexOfDec;
        }
      }
    }
  }

  /// <summary> Compare newvalue with the range</summary>
  /// <returns> newvalue if it's in the range, oldvalue otherwise</returns>
  private fillNumericByRange(): string {
    let controlPic: PIC = this._valDet.getControl().getPIC();
    let continuousRangeValues: List<string> = this._valDet.getContinuousRangeValues();
    let discreteRangeValues: List<string> = this._valDet.getDiscreteRangeValues();
    this.setValidationFailed(false);

    let checkedStr: string = this.setNumericValueWithoutPicture(this._newvalue.toString());


    if (checkedStr.length === 0) {
      this.printMessage(MsgInterface.STR_RNG_TXT, true);
      return this._oldvalue;
    }


      let checkedNum: NUM_TYPE = new NUM_TYPE(this._newvalue.toString(), this._valDet.getControl().getPIC(), 0);

      if (discreteRangeValues !== null) {
        for (let i: number = 0; i < discreteRangeValues.length; i = i + 1) {
          let rangeItemValue1: NUM_TYPE = new NUM_TYPE(discreteRangeValues.get_Item(i), controlPic, 0);

          try {
            if (NUM_TYPE.num_cmp(checkedNum, rangeItemValue1) === 0) {
              return this._newvalue;
            }
          }
          catch (ex_CC) {
            // skip non-numeric range values
          }
        }
      }

      if (continuousRangeValues !== null) {
        for (let i: number = 0; i < continuousRangeValues.length; i = i + 1) {

          let rangeItemValue1: NUM_TYPE = new NUM_TYPE();
          let rangeItemValue2: NUM_TYPE = new NUM_TYPE();

          rangeItemValue1.num_4_a_std(continuousRangeValues.get_Item(i++));
          rangeItemValue2.num_4_a_std(continuousRangeValues.get_Item(i));

          try {
            if (NUM_TYPE.num_cmp(checkedNum, rangeItemValue1) !== -1 && NUM_TYPE.num_cmp(rangeItemValue2, checkedNum) !== -1) {
              return this._newvalue;
            }
          }
          catch (ex_15B) {
            // skip non-numeric range values
          }
        }
      }
      throw new WrongFormatException();
  }

  /// <summary> returns a numeric value extracted from the beginning of a string
  /// on failure returns NEGATIVE_INFINITY
  /// </summary>
  /// <param name="val">the string to parse</param>
  private getDoubleVal(val: string): number {

    let dotFound: boolean = false;
    let minusFound: boolean = false;
    let digitFound: boolean = false;
    let endOfNum: boolean = false;
    let i: number = 0;

    // find the delemeting non numeric character
    for (i = 0; i < val.length && !endOfNum; i++)
    {
      let c: string = val[i];
      if (c >= '0' && c <= '9')
        digitFound = true;
      else
      {
        switch (c)
        {
          case '-':
            if (digitFound || dotFound || minusFound)
              endOfNum = true;
            minusFound = true;
            break;

          case '.':
            if (dotFound || minusFound && !digitFound)
              endOfNum = true;
            dotFound = true;
            break;

          case ' ':
            if (digitFound || dotFound || minusFound)
              endOfNum = true;
            break;

          default:
            endOfNum = true;
            break;
        }
      }
    }

    if (endOfNum) {
      i = i - 1;
    }

    if (i > 0) {
      return NNumber.Parse(val.substr(0, i));
    }

    return -Infinity;
  }

  /// <summary>set Numeric value Without Picture, filter input from user</summary>
  /// <returns> the pure number, without picture mask</returns>
  private setNumericValueWithoutPicture(val: string): string {
    let checkedStr: StringBuilder = new StringBuilder(val.length);
    let isFirstDecimal: boolean = false;
    let currChar: string;

    for (let i: number = 0; i < this._pictureReal.length && i < val.length; i++)
    {
      currChar = val[i];
      if (UtilStrByteMode.isDigit(currChar))
        checkedStr.Append(currChar);
      else if (currChar === this._environment.GetDecimal() && !isFirstDecimal)
      {
        checkedStr.Append(NString.ToCharArray(NumberFormatInfo.NumberDecimalSeparator).toString());
        isFirstDecimal = true;
      }
      else if (currChar === '-' && this._valDet.getIsNegative())
        checkedStr.Append(NString.ToCharArray(NumberFormatInfo.NegativeSign).toString());
    }
    if (checkedStr.ToString().length === 0)
    {
      this.printMessage(MsgInterface.STR_ERR_NUM, false);
      this.setValidationFailed(true);
    }
    return checkedStr.ToString();
  }

  /// <summary> check if newvalue format matches the numeric pic format.</summary>
  /// <returns></returns>
  private checkNumericInDecFormat(): boolean {


    let pic: PIC = this._valDet.getPIC();
    let i: number;
    let Dec: number;
    let Whole: number;
    let DecPos: number;
    let decimalChar: string = this._environment.GetDecimal();

    // Count number of digits and position of decimal point

    Dec = 0;
    Whole = 0;
    DecPos = -1;

    for (i = 0; i < this._newvalue.length; i++)
      if (pic.isNumeric(i))
        if (UtilStrByteMode.isDigit(this._newvalue[i]))
        // when dec pos not found, count wholes, if found, count dec.
          if (DecPos >= 0)
            Dec++;
          else
            Whole++;
        else if (this._newvalue[i] === decimalChar)
          DecPos = i;

    // did we exceed the mask ?
    if (pic.getWholes() < Whole || pic.getDec() < Dec)
      return false;
    else
      return true;
  }

  /// <summary>check & validate Date field by his old/new value and 2 pictures:
  /// Real and Enable
  /// 1.check if newvalue complete with pictures, otherwise return oldvalue
  /// 2.check if newvalue complete with range
  /// 2.1 complete value, if possible, otherwise  return oldvalue
  /// </summary>
  /// <returns> new value of validated field</returns>
  private checkDateField(): Date {

    let newDate: Date = new Date(this._newvalue);
     this.setValidationFailed(false);

    if (this._valDet.getControl().isDateZero(this._newvalue)) {
      // get default value of the field
      let defaultMgValue: string = this._valDet.getControl().getField().getDefaultValue();

      newDate = DisplayConvertor.Instance.mg2disp(defaultMgValue, "", this._valDet.getPIC(), true, this._valDet.getControl().getForm().getTask().getCompIdx(), false);
    }
    else
    {
      // range date
      if (this._valDet.getContinuousRangeValues() != null || this._valDet.getDiscreteRangeValues() != null)
        newDate = this.fillDateByRange(this._valDet.getContinuousRangeValues(), this._valDet.getDiscreteRangeValues(), this._newvalue);
    }
    return newDate;

  }

  /// <summary>Add found in newvalue numbers(2 or 3 letters) to buffer and return
  /// last found number index
  /// </summary>
  /// <param name="currValue">in newvalue</param>
  /// <param name="buffer"></param>
  /// <param name="type">- which type of positional directive, for checking validity</param>
  /// <returns> currValue in newvalue</returns>
  private add2Date(currValue: number, buffer: StringBuilder, type: number): number {
    let start: number = currValue;
    let currAdd: StringBuilder = new StringBuilder(this._newvalue.length);
    let letters: number = 0;

    switch (type)
    {
      case PICInterface.PIC_DD:
      case PICInterface.PIC_DDDD:
      case PICInterface.PIC_MMD:
      case PICInterface.PIC_YY:
        letters = 2;
        break;

      case PICInterface.PIC_DDD:
        letters = 3;
        break;

      case PICInterface.PIC_YYYY:
        letters = 4;
        break;

      case PICInterface.PIC_W:
        letters = 1;
        break;

      case PICInterface.PIC_YJ:  // JPN: Japanese date picture support
        letters = 2;
        type = PICInterface.PIC_YY; // PIC_YJ will be handled as PIC_YY in this method.
        break;
    }

    while (start < this._newvalue.length && !UtilStrByteMode.isDigit(this._newvalue.charAt(start)))
      start++; // find first digit


    if (start === this._newvalue.length && (this._newvalue.length === 0 || this._newvalue === "0")) {
      for (let nul: number = 0; nul < letters; nul = nul + 1) {
        buffer.Append('0')/*'0'*/;
      }
      return currValue;
    }
    else if (start === this._newvalue.length) {
      this._newvalue = this._newvalue + "0";
    }

    let i: number;
    for (i = start; i < start + letters && i < this._newvalue.length; i++) {
      if (UtilStrByteMode.isDigit(this._newvalue.charAt(i)))
        currAdd.Append(this._newvalue.charAt(i));
      else
        break;
    }

    if (currAdd.Length === 0) {
      currAdd.Append('0');
    }

    let add: number = NNumber.Parse(currAdd.ToString());

    // boundary conditions cases:
    if ((add < 1 && type !== PICInterface.PIC_YYYY && type !== PICInterface.PIC_YY) ||
       (add > 31 && (type === PICInterface.PIC_DD || type ===  PICInterface.PIC_DDDD)) ||
      (add > 12 && type === PICInterface.PIC_MMD) || (add > 7 && type === PICInterface.PIC_W)) {
      throw new WrongFormatException(MsgInterface.STR_ERR_DATE);
    }

    // than picture is YYYY and inserted 0-2 numbers, use CENTURE value, otherwise add zeros before the year
    if (type === PICInterface.PIC_YYYY && this._environment.GetCentury(this._valDet.getControl().getForm().getTask().getCompIdx()) > 999 && currAdd.Length < 3)
      currAdd = this.checkCentury(add);

    for (let j: number = 0; j < letters - currAdd.Length; j = j + 1) {
      buffer.Append('0')/*'0'*/;
    }
    buffer.Append(currAdd.ToString());
    return  i;
  }

  /// <summary>Add found in newvalue letters to buffer and return
  /// last found number index
  /// </summary>
  /// <param name="currValue">in newvalue</param>
  /// <param name="letters">amount of letters to insert to buffer</param>
  /// <param name="buffer"></param>
  /// <returns> currValue in newvalue</returns>
  private addM2Date(currValue: number, letters: number, buffer: StringBuilder, type: number): number {
    let array: string[];
    let result: number;

    if (type === PICInterface.PIC_MMM || type === PICInterface.PIC_MMD) {
      if (this.hebrew) {
        array = HebrewDate.GetLocalMonths();
      }
      else {
        let messageString: string = Events.GetMessageString(MsgInterface.MONTHS_PTR);
        array = DateUtil.getLocalMonths(messageString);
      }
    }
    else {
      if (type === PICInterface.PIC_WWW || type === PICInterface.PIC_W) {
        if (this.hebrew) {
          array = HebrewDate.GetLocalDows();
        }
        else {
          let dayStr: string = Events.GetMessageString(MsgInterface.DAYS_PTR);
          array = DateUtil.getLocalDays(dayStr);
        }
      }
      else {
        if (type === PICInterface.PIC_BB) { // JPN: Japanese date picture support
          array = UtilDateJpn.getArrayDow();
        }
        else {
          if (type === PICInterface.PIC_JY1 || type === PICInterface.PIC_JY2 || type === PICInterface.PIC_JY4)
          {
            if (this._newvalue.length < currValue + letters) {
              throw new WrongFormatException(MsgInterface.STR_ERR_DATE);
            }
            let text: string = this._newvalue.substr(currValue, letters);
            buffer.Append(text);
            return currValue + text.length;
          }
          else
          {
            return currValue + letters;
          }
        }
      }
    }

    if (this._newvalue.length < currValue) {
      currValue = this._newvalue.length;
    }
    let max: number = this.getMonthOrWeek(this._newvalue.substr(currValue), letters, type);

    if (array[max].trim().length >= letters) {
      buffer.Append(array[max].trim().substr(0, letters));
    }
    else {
      buffer.Append(array[max].trim());
      for (let i: number = letters - array[max].trim().length; i > 0; i = i - 1) {
        buffer.Append(' ')/*' '*/;
      }
    }
    return currValue + letters;
  }

  /// <summary>get end index of every numeric block in the mask from mask[currValue]</summary>
  /// <returns> end of numeric block in newValue</returns>
  private getEndOfNumericBlock(currValue: number): number {
    while (currValue < this._newvalue.length && !UtilStrByteMode.isDigit(this._newvalue.charAt(currValue))) {
      currValue = currValue + 1;
    }
    return currValue;
  }

  /// <summary>added suffix to relevant number of the day</summary>
  private addDateSuffix(last: string): string {
    let thenumber: number = NNumber.Parse(last);
    if (thenumber === 1 || thenumber === 21 || thenumber === 31)
      return "st";
    else if (thenumber === 2 || thenumber === 22)
      return "nd";
    else if (thenumber === 3 || thenumber === 23)
      return "rd";
    return "th";
  }

  /// <summary>get size of block letters of type 'type', which start at 'start'</summary>
  private getSizeOfBlock(start: number, type: number): number {
    let letters: number = start + 1;
    while (letters < this._picture.length && this._picture.charCodeAt(letters) === type)
    letters++;
    return letters - start;
  }

  /// <summary>get String part/full name of month/day of week</summary>
  /// <param name="month">part/full name of month/day of week</param>
  /// <param name="max">of possible letters in month/day of week, size of block in picture of the control</param>
  /// <param name="type:">PIC_  week|month</param>
  /// <returns> number of month 1-12, or day of week 1-7</returns>
  private getMonthOrWeek(month_str: string, letters: number, type: number): number {
    let array: string[];

    if (type === PICInterface.PIC_MMM || type === PICInterface.PIC_MMD) {
      // Month
        if (this.hebrew)
          array = HebrewDate.GetLocalMonths();
        else
        {
          let monthStr: String = Events.GetMessageString(MsgInterface.MONTHS_PTR);
          array = DateUtil.getLocalMonths(monthStr.toString());
        }
      }
    else if (type === PICInterface.PIC_WWW || type === PICInterface.PIC_W)
      // Week
      {
        if (this.hebrew)
          array = HebrewDate.GetLocalDows();
        else
        {
          let dayStr: String = Events.GetMessageString(MsgInterface.DAYS_PTR);
          array = DateUtil.getLocalDays(dayStr.toString());
        }
      }
      else if (type === PICInterface.PIC_BB)
      // JPN: Japanese date picture support
      {
        array = UtilDateJpn.getArrayDow();
      }
      else
      {
        return 1; // only week or month possible -> diffault 1.
      }

    if (letters > month_str.length)
    // cut letter if it's  end of string
      letters = month_str.length;

    if (this.hebrew)
    {
      let hstr: string = NString.TrimStart(month_str).substr(0, letters).trim();

      for (let i: number = 1; i < array.length; i++)
      // start checking from 1st member, because 0 = ""
      {
        if (array[i].trim() === hstr)
        {
          if (i === 14)
            i = 6;
          return i;
        }
      }
      return 0;
    }

    try {
        // the number inserted and not string -> find mounth/day of week by number 1-12|1-7

        let str: string = month_str.substr(0, letters).trim();
        let numBuffer: StringBuilder = new StringBuilder(str.length);

        for (let i: number = 0; i < str.length; i++)
        {
          if (UtilStrByteMode.isDigit(str[i]))
            numBuffer.Append(str[i]);
          else
            break;
        }

        let theNumber: number = NNumber.Parse(numBuffer.ToString());
        if (theNumber < 1)
          return 1;
        if (type === PICInterface.PIC_MMM || type === PICInterface.PIC_MMD)
        {
          if (theNumber > 12)
            return 12;
        }
        else if (type === PICInterface.PIC_WWW || type === PICInterface.PIC_W || type === PICInterface.PIC_BB)
        {
          // JPN: Japanese date picture support
          if (theNumber > 7)
            return 7;
        }
        return theNumber;
        }
    catch (ex_21A) {
          // doNothing_StringInserted
      }

    // inserted string - name of month|day of week ->try identyfy it
    let found: number[] = new Array<number>(array.length);
    let from: number;
    let max: number = -1; // number of found month/day of week


    for (let tmp: number = 1; tmp < array.length; tmp++)
    // start checking from 1st member, because 0 = ""
    {
      found[tmp] = 0;
      from = 0;
      for (let i: number = 0; i < array[tmp].length && from < month_str.length && i < letters; i++, from++)
      {
        if (array[tmp].toLowerCase()[i] === month_str.toLowerCase()[from])
          found[tmp]++;
        else
          break;
      }

      if (from === letters || from === array[tmp].length)
      // all letters found
      {
        max = tmp;
        break;
      }
    }

    if (max === -1)
      max = this.findMax(found);
    return max;

  }

  /// <summary>is numeric data allowed in date
  /// return true if it is allowed, otherwise false</summary>
  private isNumberAllowedInDate(): boolean {
    for (let i: number = 0; i < this._picture.length; i++)
    {
      if (this.isDatePositionalNumericDirective(this._picture[i]))
        return true;
    }
    return false;
  }

  /// <summary>find if all numbers of the new user inserted value are 0
  /// return true if all numbers in the input are 0, otherwise true</summary>
  private isAllNumbers0(): boolean {
    let currChr: string;
    for (let i: number = 0; i < this._newvalue.length; i++)
    {
      currChr = this._newvalue[i];

      if (UtilStrByteMode.isDigit(currChr) && currChr !== '0')
        return false;
    }

    return true;
  }

  /// <summary>check validity of Year for YYYY part of the mask</summary>
  /// <param name="yearIn">inserted by user</param>
  /// <returns> calculated by environment.century right value</returns>
  private checkCentury(yearIn: number): StringBuilder {
    let outVal: number;
    let start_century: number = this._environment.GetCentury(this._valDet.getControl().getForm().getTask().getCompIdx());
    let century: number = Math.floor(start_century / 100);
    let years: number = start_century % 100;
    if (yearIn >= years && yearIn !== 0)
      outVal = (century * 100 + yearIn);
    else
      outVal = ((++century) * 100 + yearIn);

    return new StringBuilder(outVal.toString());
  }

  /// <summary>check if the date legal for picture range, used for validation date 0</summary>
  /// <param name="ContinuousRange"></param>
  /// <param name="DiscreteRange"></param>
  /// <param name="date">integer - magic date number of days from 01.01.0000</param>
  private isDateLegal4Range(ContinuousRange: List<string>, DiscreteRange: List<string>, currDate: number): boolean {

    let pic: PIC = this._valDet.getPIC();
    let i: number;
    let downDate: number;
    let topDate: number;

    if (ContinuousRange != null)
    {
      for (i = 0; i < ContinuousRange.length - 1; i++)
      {
        downDate = DisplayConvertor.Instance.a_2_date_pic(ContinuousRange.get_Item(i), pic, pic.getMask(), this._valDet.getControl().getForm().getTask().getCompIdx());
        topDate = DisplayConvertor.Instance.a_2_date_pic(ContinuousRange.get_Item(++i), pic, pic.getMask(), this._valDet.getControl().getForm().getTask().getCompIdx());
        if (currDate >= downDate && currDate <= topDate)
          return true;
      }
    }

    if (DiscreteRange != null)
    {
      for (i = 0; i < DiscreteRange.length; i++)
      {
        if (currDate === DisplayConvertor.Instance.a_2_date_pic(DiscreteRange.get_Item(i), pic, pic.getMask(), this._valDet.getControl().getForm().getTask().getCompIdx()))
          return true;
      }
    }
    // the date is not in the range
    // return false;
    throw new WrongFormatException();
  }

  /// <summary>check and fill DATE type by range</summary>
  private fillDateByRange(ContinuousRange: List<string>, DiscreteRange: List<string>, buffer: Date): Date {
    let pic: PIC = this._valDet.getPIC();
    let i: number;
    let downDate: number;
    let topDate: number;

    let currDate = DisplayConvertor.Instance.fromNativeDateToMgDateNumber(buffer, pic, this._valDet.getControl().getForm().getTask().getCompIdx());

    this.setValidationFailed(false);
    if (ContinuousRange != null) {
      for (i = 0; i < ContinuousRange.length - 1; i++) {
        downDate = DisplayConvertor.Instance.a_2_date_pic(ContinuousRange.get_Item(i), pic, pic.getMask(), this._valDet.getControl().getForm().getTask().getCompIdx());
        topDate = DisplayConvertor.Instance.a_2_date_pic(ContinuousRange.get_Item(++i), pic, pic.getMask(), this._valDet.getControl().getForm().getTask().getCompIdx());
        if (currDate >= downDate && currDate <= topDate)
          return new Date(buffer);
      }
    }

    if (DiscreteRange != null) {
      for (i = 0; i < DiscreteRange.length; i++) {
        if (currDate === DisplayConvertor.Instance.a_2_date_pic(DiscreteRange.get_Item(i), pic, pic.getMask(), this._valDet.getControl().getForm().getTask().getCompIdx())) {
          return new Date(buffer);
        }
      }
    }
    // the date is not in the range
    throw new WrongFormatException();

  }

  /// <summary>check if day suitable (not bigger than max) for Year and Month</summary>
  /// <param name="date">user inserted string</param>
  /// <param name="isDoy">is picture of needed day is DDD - day of year</param>
  private checkDay(date: string, isDoy: boolean): StringBuilder {

    let day: number = this.getDateElement(date, DateElement.DAY);
    if (day < 29 && !isDoy)
      return new StringBuilder(date);

    let year: number = this.getDateElement(date, DateElement.YEAR);

    if (!isDoy)
    {
      if (year.toString().length < 3)
        year = NNumber.Parse(this.checkCentury(year).ToString());

      if (this._environment.GetDateMode(this._valDet.getControl().getForm().getTask().getCompIdx()) === 'B')
        year -= PICInterface.DATE_BUDDHIST_GAP;

      let month: number = this.getDateElement(date, DateElement.MONTH);

      // if day not consistained to year & month - change day
      let dayMax: number = this.getMaxDayInMonth(year, month);
      if (day > dayMax)
      {
        throw new WrongFormatException(MsgInterface.STR_ERR_DATE);
      }
    }
    else
    {
      // if month not consistained to day(DDD) - change month
      let monthReal: number = this.getMonthByDay(year, day);

      if (monthReal < 1 || monthReal > 12)
        throw new WrongFormatException(MsgInterface.STR_ERR_DATE);
    }

    return new StringBuilder(date);
  }

  /// <summary>check if day of week suitable (right) for Year, Month and Day</summary>
  /// <param name="date">user inserted string</param>
  private checkWeek(date: string): StringBuilder {

    let dow: number = this.getDateElement(date, DateElement.DOW);

    let breakParams: DateBreakParams = DisplayConvertor.Instance.getNewDateBreakParams();

    let dateMagic: number = DisplayConvertor.Instance.a_2_date(date, this._picture, this._valDet.getControl().getForm().getTask().getCompIdx());

    DisplayConvertor.Instance.date_break_datemode(breakParams, dateMagic, true, this._valDet.getControl().getForm().getTask().getCompIdx());

    let dowReal: number = breakParams.dow;
    if (dowReal !== dowReal)
      date = this.changeDow(date, dowReal);

    return new StringBuilder(date);
  }


  // JPN: Japanese date picture support
  /// <summary>check if the combination of Japanese era and year is valid.</summary>
  /// <param name="strDate">user inserted string</param>
  /// <returns> date string of properly Japanese era</returns>
  private checkJpnEraYear(strDate: string): StringBuilder {

    let breakParams: DateBreakParams = DisplayConvertor.Instance.getNewDateBreakParams();
    let dateMagic: number = DisplayConvertor.Instance.a_2_date(strDate, this._picture, this._valDet.getControl().getForm().getTask().getCompIdx());

    DisplayConvertor.Instance.date_break_datemode(breakParams, dateMagic, true, this._valDet.getControl().getForm().getTask().getCompIdx());

    let intYearAD: number = breakParams.year;
    let intDoy: number = breakParams.doy;

    // get the name and a year of the era
    let strEraAlpha: string;
    let strEraKanji: string;

    strEraAlpha = UtilDateJpn.getInstance().date_jpn_yr_2_a(intYearAD, intDoy, false);
    strEraKanji = UtilDateJpn.getInstance().date_jpn_yr_2_a(intYearAD, intDoy, true);

    let strYearJpnEra: StringBuilder = new StringBuilder();
    let num: number = UtilDateJpn.getInstance().date_jpn_year_ofs(intYearAD, intDoy);
    if (num <= 0) {
      throw new WrongFormatException(MsgInterface.STR_ERR_DATE);
    }
    if (num <= 9) {
      strYearJpnEra.Append("0");
    }
    strYearJpnEra.Append(num.toString());

    // build a properly year of the era

    // A DBCS character in "str" consumes two characters in "mask".
    // If "str" contains DBCS, the position of "mask" has to skip next index.
    // This variable indicates the number of skipped indexes.
    let intPicIdxOfs: number = 0;
    for (let intCnt: number = 0; intCnt + intPicIdxOfs < this._picture.length; intCnt++)
    {
      switch (this._picture.charCodeAt(intCnt + intPicIdxOfs))
      {
        case (PICInterface.PIC_JY1):
          strDate = UtilStrByteMode.repC(strDate, strEraAlpha, intCnt + 1, 1);
          break;

        case (PICInterface.PIC_JY2):
          strDate = UtilStrByteMode.repC(strDate, strEraKanji, intCnt + 1, 1);
          intPicIdxOfs++; // PIC_JY2 consumes 2 characters of picture (1 more than strDate)
          break;

        case (PICInterface.PIC_JY4):
          strDate = UtilStrByteMode.repC(strDate, strEraKanji, intCnt + 1, 2);
          intCnt++; // PIC_JY4 consumes 2 characters of strDate
          intPicIdxOfs += 2; // PIC_JY4 consumes 4 characters of picture (2 more than strDate)
          break;

        case (PICInterface.PIC_YJ):
          strDate = UtilStrByteMode.repC(strDate, strYearJpnEra.toString(), intCnt + 1, 2);
          intCnt++; // PIC_YJ consumes 2 characters of strDate
          break;

        default:
          if (intCnt < strDate.length)
          {
            // if "strDate" contains DBCS, the next index of "picture" has to be skipped.
            if (UtilStrByteMode.isHalfWidth(strDate[intCnt]) === false && UtilStrByteMode.isHalfWidth(this._picture[intCnt + intPicIdxOfs]) === true)
              intPicIdxOfs++;
          }
          break;

      }
    }
    return new StringBuilder(strDate);
  }

  /// <summary>get max number of day in month</summary>
  /// <param name="year"></param>
  /// <param name="month"></param>
  /// <returns> max days [28-31] number</returns>
  private getMaxDayInMonth(year: number, month: number): number {
    let array: number[] = [
      0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31
    ];
    let leapyear: boolean = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

    if (leapyear && month === 2)
      return array[month] + 1;

     return array[month];
  }

  /// <summary>get month for day, than day have mask DDD</summary>
  /// <param name="year"></param>
  /// <param name="day">[0-365]</param>
  /// <returns> number of month</returns>
  private getMonthByDay(year: number, day: number): number {
    let i: number;
    let LeapYear: boolean;

    LeapYear = (year % 4 === 0) && ((year % 100 !== 0) || (year % 400 === 0));

    for (i = 0; i < PICInterface.date_day_tab.length; i++)
    {
      if (!LeapYear)
      {
        if (PICInterface.date_day_tab[i] >= day)
          return i;
      }
      // is Leap Year
      else
      {
        if (i < 3)
        {
          if (PICInterface.date_day_tab[i] >= day)
            return i;
        }
        // add 1 day after second month
        else
        {
          if (PICInterface.date_day_tab[i] + 1 >= day)
            return i;
        }
      }
    } // for loop
    return i; // the function cann't came to the statement anytime
  }

  /// </summary>get Year|Month|Day|Dow of date
  /// <param name="date">date</param>
  /// <param name="element">required date element (year/month/day/dow) </param>
  /// <returns>Year|Month|Day|Dow of date</returns>
  private getDateElement(date: string, element: DateElement): number {
    let buffer: String = null;
    let letters: number = 0;
    let exitLoop: boolean = false;
    let picWeekType: number = PICInterface.PIC_WWW; // JPN: Japanese date picture support
    let isJpnEraYear: boolean = false; // JPN: Japanese date picture support
    let era_year: number = 0;

    // A DBCS character in "date" consumes two characters in "picture".
    // If "date" contains DBCS, the position of "picture" has to skip next index.
    // This variable indicates the number of skipped indexes.
    let intPicIdxOfs: number = 0; // JPN: Japanese date picture support

    let minLen: number = 0;

    if (UtilStrByteMode.isLocaleDefLangJPN())
      minLen = UtilStrByteMode.getMinLenPicture(date, this._picture);
    else
      minLen = Math.min(date.length, this._picture.length);

    for (let i: number = 0; i + intPicIdxOfs < minLen && !exitLoop; i++)
    {
      if (this.isDataPositionalDirective(this._picture[i + intPicIdxOfs]))
      {
        switch (this._picture.charCodeAt(i + intPicIdxOfs))
        {

        case PICInterface.PIC_DD:
          if (element === DateElement.DAY)
          {
            buffer = date.substr(i, 2);
            exitLoop = true;
            break;
          }
          i++;
          break;

        case PICInterface.PIC_DDD:
          if (element === DateElement.DAY)
          {
            buffer = date.substr(i, 3);
            exitLoop = true;
            break;
          }
          i += 2;
          break;

        case PICInterface.PIC_DDDD:
          if (element === DateElement.DAY)
          {
            buffer = date.substr(i, 2); // not +4 need not suffix of 'nd', 'rd', 'st'
            exitLoop = true;
          }
          i += 3;
          break;

        case PICInterface.PIC_MMD:
          if (element === DateElement.MONTH)
          {
            buffer = date.substr(i, 2);
            exitLoop = true;
          }
          i++;
          break;

        case PICInterface.PIC_MMM:
          // get size of PIC_MMM block
          letters = this.getSizeOfBlock(i + intPicIdxOfs, PICInterface.PIC_MMM);
          if (element === DateElement.MONTH)
          {
            buffer = date.substr(i, letters);
            exitLoop = true;
            break;
          }
          i += letters - 1;
          letters = 0;
          break;

        case PICInterface.PIC_YY:
          if (element === DateElement.YEAR)
          {
            buffer = date.substr(i, 2);
            exitLoop = true;
          }
          i++;
          break;

        case PICInterface.PIC_YYYY:
          if (element === DateElement.YEAR)
          {
            buffer = date.substr(i, 4);
            exitLoop = true;
          }
          i += 3;
          break;

        case PICInterface.PIC_W:
          if (element === DateElement.DOW)
          {
            buffer = date.substr(i, 1);
            exitLoop = true;
          }
          break;

        case PICInterface.PIC_WWW:
          letters = this.getSizeOfBlock(i + intPicIdxOfs, PICInterface.PIC_WWW);
          if (element === DateElement.DOW)
          {
            buffer = date.substr(i, letters);
            exitLoop = true;
            break;
          }
          i += letters - 1;
          letters = 0;
          break;

        case PICInterface.PIC_HYYYYY:
        case PICInterface.PIC_HL:
        case PICInterface.PIC_HDD:
          // not implemented for hebrew yet
          break;

        case PICInterface.PIC_BB:  // JPN: Japanese date picture support
          letters = this.getSizeOfBlock(i + intPicIdxOfs, PICInterface.PIC_BB);

          if (i + Math.floor(letters / 2) < date.length)
          {
            buffer = date.substr(i, Math.floor(letters / 2));
            // if date contains DBCS, some indexes of picture have to be skipped.
            intPicIdxOfs += letters - buffer.length;
          }

          if (element === DateElement.DOW)
          {
            exitLoop = true;
            picWeekType = PICInterface.PIC_BB;
          }
          else
          {
            buffer = null;
          }

          i += letters - 1;
          break;

        case PICInterface.PIC_JY1:  // JPN: Japanese date picture support
          isJpnEraYear = true;
          break;

        case PICInterface.PIC_JY2:  // JPN: Japanese date picture support
          isJpnEraYear = true;
          intPicIdxOfs++;
          break;

        case PICInterface.PIC_JY4:  // JPN: Japanese date picture support
          isJpnEraYear = true;
          intPicIdxOfs += 2;
          i++;
          break;

        case PICInterface.PIC_YJ:  // JPN: Japanese date picture support
          if (element === DateElement.YEAR)
          {
            buffer = date.substr(i, 2);
            exitLoop = true;
          }
          i++;
          break;
        } // switch of positional directives
        } // if of positional directives
    } // for loop in picture

    if (buffer == null)
    {
      if (element === DateElement.YEAR)
        return DateTime.Now.Year;
      else
        return 1;
    }

    buffer = buffer.trim();

    if (letters > 0)
    // it's PIC_WWW or PIC_MMM
    {
      if (element === DateElement.MONTH)
        letters = this.getMonthOrWeek(buffer.toString(), letters, PICInterface.PIC_MMM);
      else if (element === DateElement.DOW)
        letters = this.getMonthOrWeek(buffer.toString(), letters, picWeekType);
    }
    else
    {
      while (buffer.toString().startsWith("0") || buffer.toString().startsWith(" "))
        buffer = buffer.toString().substr(1);
      if (buffer.length === 0)
        letters = 0;
      else
        letters = NNumber.Parse(buffer.toString());
    }

    if (element === DateElement.YEAR && isJpnEraYear)
    {
      // get the start year of the era
      era_year = UtilDateJpn.getInstance().getStartYearOfEra(date, this._picture);
      if (era_year === 0)
        return 0;
      letters += era_year - 1;
    }

    return letters;
  }

  /// <summary>change day number in date field to dayMax</summary>
  /// <param name="date">to change day into</param>
  /// <param name="dayMax">the new day value</param>
  private changeDow(date: string, dow: number): string {
    let isDate: boolean = false;
    let letters: number;
    let startPart: string;
    let finishPart: string;
    let number1: string;

    number1 = "" + dow; // " "

    // A DBCS character in "date" consumes two characters in "picture".
    // If "date" contains DBCS, the position of "picture" has to skip next index.
    // This variable indicates the number of skipped indexes. (JPN: DBCS support)
    let intPicIdxOfs: number = 0;

    for (let i: number = 0; i + intPicIdxOfs < this._picture.length && !isDate; i++)
    {
      if (this.isDataPositionalDirective(this._picture[i + intPicIdxOfs]))
      {
        switch (this._picture.charCodeAt(i + intPicIdxOfs))
        {

        case PICInterface.PIC_W:
          startPart = date.substr(0, i);
          finishPart = date.substr(i + 1);
          date = startPart + number1 + finishPart;
          isDate = true;
          break;

        case PICInterface.PIC_WWW:
          letters = this.getSizeOfBlock(i + intPicIdxOfs, PICInterface.PIC_WWW);
          startPart = date.substr(0, i);
          finishPart = date.substr(i + letters);
          let dayStr: string = Events.GetMessageString(MsgInterface.DAYS_PTR);
          let dayNames: string[] = DateUtil.getLocalDays(dayStr);
          number1 = dayNames[dow];

          if (number1.length > letters)
            number1 = number1.substr(0, letters);
          else if (number1.length < letters)
            while (number1.length < letters)
              number1 = number1 + ' ';
          date = startPart + number1 + finishPart;
          isDate = true;
          break;

        case PICInterface.PIC_BB:  // JPN: Japanese date picture support
          letters = this.getSizeOfBlock(i + intPicIdxOfs, PICInterface.PIC_BB);
          // "letters" means a number of characters in "picture"

          startPart = date.substr(0, i);
          finishPart = date.substr(i + Math.floor(letters / 2));
          // "letters / 2" means a number of characters in "date"

          number1 = UtilDateJpn.getStrDow(dow);

          if (UtilStrByteMode.lenB(number1) > letters)
            number1 = UtilStrByteMode.leftB(number1, letters);
          else if (UtilStrByteMode.lenB(number1) < letters)
            while (UtilStrByteMode.lenB(number1) < letters)
              number1 = number1 + ' ';
          date = startPart + number1 + finishPart;
          isDate = true;
          break;

        default:
          if (UtilStrByteMode.isLocaleDefLangDBCS())
          // JPN: DBCS support
          {
            if (i < date.length)
            {
              // if "date" contains DBCS, the next index of "picture" has to be skipped.
              if (UtilStrByteMode.isHalfWidth(date[i]) === false && UtilStrByteMode.isHalfWidth(this._picture[i + intPicIdxOfs]) === true)
                intPicIdxOfs++;
            }
          }
          break;

        } // switch
        } // if of positional directives
    }
    return date;
  }

  /// <summary>check & validate Time field by his old/new value and 2 pictures:
  /// Real and Enable
  /// 1.check if newvalue complete with pictures, otherwise return oldvalue
  /// 2.check if newvalue complete with range
  /// 2.1 complete value, if possible, otherwise  return oldvalue
  /// </summary>
  /// <returns> String - new value of validated field</returns>
  private checkTimeField(): Date {
    let newTime: Date = new Date (this._newvalue);


    this.setValidationFailed(false);

    if (this._valDet.getControl().isDateZero(this._newvalue)) {
      // get default value of the field
      let defaultMgValue: string = this._valDet.getControl().getField().getDefaultValue();
      newTime = DisplayConvertor.Instance.mg2disp(defaultMgValue, "", this._valDet.getPIC(), true, this._valDet.getControl().getForm().getTask().getCompIdx(), false);
    }
    else {

      // range of the time
      if (this._valDet.getContinuousRangeValues() != null || this._valDet.getDiscreteRangeValues() != null)
        newTime = this.fillTimeByRange(this._valDet.getContinuousRangeValues(), this._valDet.getDiscreteRangeValues(), this._newvalue);
    }
    return newTime;
  }

  /// <summary>Add found in newvalue numbers(2(or 1) letters) to buffer and return
  /// last found number index
  /// </summary>
  /// <param name="currValue">in newvalue</param>
  /// <param name="buffer">/// </param>
  /// <param name="type">which type of positional directive, for checking validity</param>
  /// <returns> currValue in newvalue</returns>
  private add2Time(currValue: number, buffer: StringBuilder, type: number): number {
    let start: number = currValue;
    let i: number;
    let STR_00: String = "00";
    let  currAdd: StringBuilder = new StringBuilder();

    while (start < this._newvalue.length && !UtilStrByteMode.isDigit(this._newvalue[start]))
    {
      start++; // find first digit
      // non-digits were found in input string
      // we do not throw STR_ERR_TIME exception to prevent input digits lost
      // on non-digits place STR_00 will be added
      // Since Mask Editing . This error is irrelevant. Time now, always contains non digits like : and might contain ' ' for unfilled chars.
      // This is a valid case and we do not want an error popping about it.
      //  guiManager.writeToMessagePane(valDet.getControl().getForm().getTask(), ClientManager.Instance.getMessageString(STR_ERR_TIME), StatusBarMessageType.SB_RUNTIME_MSG);
      //  setValidationFailed(true);
    }

    if (start === this._newvalue.length)
    // not found more digits
    {
      buffer.Append(STR_00.toString());
      return currValue;
    }

    for (i = start; i < start + 2 && i < this._newvalue.length; i++)
    {
      if (UtilStrByteMode.isDigit(this._newvalue[i]))
        currAdd.Append(this._newvalue[i]);
      else
      {
        currAdd.Insert(0, '0'); // only 1 digit found
        break;
      }
    }

    if (i === this._newvalue.length && i === start + 1)
      currAdd.Insert(0, '0');
    // only 1 digit found
    else if (i === this._newvalue.length && i === start)
      currAdd.Append(STR_00.toString());

    let add: number = NNumber.Parse(currAdd.ToString());

    /*if (add < 0)
    currAdd=new StringBuffer("00");
    else if (add > 59 && type==PIC_MMT)
    currAdd=new StringBuffer("59");
    else if (add > 59 && type==PIC_SS)
    currAdd=new StringBuffer("59");*/
    if (add < 0 || (add > 59 && type === PICInterface.PIC_MMT) || (add > 59 && type === PICInterface.PIC_SS))
      throw new WrongFormatException(MsgInterface.STR_ERR_TIME);
    else if (type === PICInterface.PIC_HH)
    {
      let PM: boolean = this.getIsPM();
      let newStr: String = null;
      let dif: number;

      if ((add >= 12 || add === 0) && PM)
      {
        let addTmp: number = add % 24;

        this._isPm = (addTmp >= 12 && addTmp < 24);

        if (addTmp > 12)
          dif = addTmp - 12;
        else if (addTmp === 0)
          dif = 12;
        else
          dif = addTmp;

        newStr = ((dif > 9 ? "" : "0") + dif);
      }
      else if (add > 99 && !PM)
        newStr = "99";

      if (newStr != null)
      {
        currAdd.Remove(0, currAdd.Length);
        currAdd.Append(newStr.toString());
      }
    }

    buffer.Append(currAdd.ToString());
    return i;
  }

  /// <summary>Append PM or AM to time</summary>
  private addPM2Time(currValue: number, buffer: StringBuilder): number {
    let i: number;

    if ((i = this._newvalue.toUpperCase().indexOf("AM", currValue)) !== -1)
    {
      buffer.Append("am");
      return i + 2;
    }
    else
    {
      if ((i = this._newvalue.toUpperCase().indexOf("PM", currValue)) !== -1)
      {
        buffer.Append("pm");
        return i + 2;
      }
      else if (this._isPm)
      {
        buffer.Append("pm");
        return currValue;
      }
      else
        buffer.Append("am");
    }
    return currValue;
  }

  /// <summary>Check if where is 'PM' positional directive in the Time Picture</summary>
  /// <returns> true - there is PM, else false</returns>
  private getIsPM(): boolean {

    for (let curr: number = 0; curr < this._picture.length; curr++)
    {
      if (this._picture.charCodeAt(curr) === PICInterface.PIC_PM)
      return true;
    }
    return false;
  }

  private fillTimeByRange(ContinuousRange: List<string>, DiscreteRange: List<string>, buffer: Date): Date {
    let  pic: PIC = this._valDet.getPIC();
    let  currTime: number = DisplayConvertor.Instance.fromNativeTimeToMgTimeNumber(buffer, pic);
    let downTime: number, topTime: number;
    let i: number;

    this.setValidationFailed(false);
    if (ContinuousRange != null)
    {
      for (i = 0; i < ContinuousRange.length - 1; i++)
      {
        downTime = DisplayConvertor.Instance.a_2_time(ContinuousRange.get_Item(i), pic, false);
        topTime = DisplayConvertor.Instance.a_2_time(ContinuousRange.get_Item(++i), pic, false);
        if (currTime >= downTime && currTime <= topTime)
          return new Date(buffer);
      }
    }

    if (DiscreteRange != null)
    {
      for (i = 0; i < DiscreteRange.length; i++)
      {
        if (currTime === DisplayConvertor.Instance.a_2_time(DiscreteRange.get_Item(i), pic, false))
          return new Date(buffer);
      }
    }
    // the time is not in the range
    throw new WrongFormatException();
  }

  /// <summary>*************************************************************
  /// SERVICE functions
  /// ***************************************************************
  /// </summary>

  /// <summary> print ERROR prompt message about range to status bar</summary>
  /// <param name="msgId">of error Message</param>
  /// <param name="setValidationFaild">validation failed</param>
  private printMessage(msgId: string, setValidationFaild: boolean): void {
    let message: StringBuilder = new StringBuilder("");
    let ctrlType: MgControlType;

    if (msgId === MsgInterface.EDT_ERR_STR_1)
    {
      let pic: PIC = this._valDet.getPIC();
      let token: string = "%d";
      let messageString: string = Events.GetMessageString(msgId);
      messageString = StrUtil.replaceStringTokens(messageString, token, 1, pic.getWholes().toString());
      messageString = StrUtil.replaceStringTokens(messageString, token, 1, pic.getDec().toString());
      message.Append(messageString);
    }
    else
    {
      message.Append(Events.GetMessageString(msgId));
      if (msgId === MsgInterface.STR_RNG_TXT && this._valDet.getRange() != null)
        message.Append(StrUtil.makePrintableTokens(this._valDet.getRange(), HTML_2_STR));
    }

    if (this._valDet.getControl() != null)
    {
      ctrlType = this._valDet.getControl().Type;
      if (ctrlType !== MgControlType.CTRL_TYPE_BUTTON && ctrlType !== MgControlType.CTRL_TYPE_RADIO && !this._valDet.getControl().isSelectionCtrl())
      {
        let msgString: string = message.ToString();
        Manager.WriteToMessagePane(this._valDet.getControl().getForm().getTask(), StrUtil.makePrintable2(msgString), true);
        this._valDet.getControl().getForm().ErrorOccured = !NString.IsNullOrEmpty(msgString);
        this._valDet.ErrorMessage = message.ToString();
      }
    }
    if (setValidationFaild)
    // from this point the focus send back to control and setValidationFailed(true) can not set it to true
      this.setValidationFailed(true);
  }

  /// <summary>Change inside 'newvalue' substring on position 'index' to string 'to'</summary>
  /// <param name="newvalue">to change inside</param>
  /// <param name="to">string to change by him</param>
  /// <param name="index">the substring to change on the position</param>
  private changeStringInside(to: string, index: number): void {
    this._newvalue = this._newvalue.substr(0, index) + to +  this._newvalue.substr(index + to.length);
  }

  private init(validationDetails: ValidationDetails): void {
    this._valDet = validationDetails;
    this._valDet.setNull(false);
    this._isPm = false;
    let pIC: PIC = this._valDet.getPIC();
    this._oldvalue = this._valDet.getOldValue();
    this._newvalue = this._valDet.getDispValue();

    if (this._newvalue === null) {
      this._newvalue = "";
    }

    if (this._oldvalue === null) {
      this._oldvalue = "";
    }

    if (!(pIC === null || pIC.getAttr() === StorageAttribute.BLOB || pIC.getAttr() === StorageAttribute.BLOB_VECTOR)) {
      this._picture = pIC.getMask();
      this.hebrew = pIC.isHebrew();
      this._picture = this._picture.substr(0, pIC.getMaskSize());
    }
  }

  /// <summary>Return index of Max member in array</summary>
  private findMax(array: number[]): number {
    let index: number = 0;
    let max: number = array[index];
    for (let i: number = 1; i < array.length; i++)
    {
      if (array[i] > max)
      {
        max = array[i];
        index = i;
      }
    }
    return index;
  }

  /// <summary>is checked char Alpha Positional Directive</summary>
  static isAlphaPositionalDirective(toCheck: string): boolean {
    let ascii: number = toCheck.charCodeAt(0);
    return (ascii === PICInterface.PIC_X || ascii === PICInterface.PIC_U || ascii === PICInterface.PIC_L ||
      ascii === PICInterface.PIC_N || ascii === PICInterface.PIC_J || ascii === PICInterface.PIC_G || ascii === PICInterface.PIC_S || ascii === PICInterface.PIC_T);

  }

  /// <summary>is checked char Data Positional Directive</summary>
  private isDataPositionalDirective(toCheck: string): boolean {
    let ascii: number = toCheck.charCodeAt(0);
    return (ascii === PICInterface.PIC_YY || ascii === PICInterface.PIC_YYYY || ascii === PICInterface.PIC_MMD || ascii === PICInterface.PIC_MMM
      || ascii === PICInterface.PIC_DD || ascii === PICInterface.PIC_DDD || ascii === PICInterface.PIC_DDDD || ascii === PICInterface.PIC_W
      || ascii === PICInterface.PIC_WWW || ascii === PICInterface.PIC_HYYYYY || ascii === PICInterface.PIC_HL || ascii === PICInterface.PIC_HDD || ascii === PICInterface.PIC_YJ
      || ascii === PICInterface.PIC_JY1 || ascii === PICInterface.PIC_JY2 || ascii === PICInterface.PIC_JY4 || ascii === PICInterface.PIC_BB); // JPN: Japanese date picture support

  }

  /// <summary>check if Numeric Data Positional Directive exists</summary>
  private isDatePositionalNumericDirective(toCheck: string): boolean {
    let ascii: number = toCheck.charCodeAt(0);
    return (ascii === PICInterface.PIC_YY || ascii === PICInterface.PIC_YYYY || ascii === PICInterface.PIC_MMD || ascii === PICInterface.PIC_DD
      || ascii === PICInterface.PIC_DDD || ascii === PICInterface.PIC_DDDD || ascii === PICInterface.PIC_W || ascii === PICInterface.PIC_HYYYYY
      || ascii === PICInterface.PIC_HL || ascii === PICInterface.PIC_HDD || ascii === PICInterface.PIC_YJ || ascii === PICInterface.PIC_JY1
      || ascii === PICInterface.PIC_JY2 || ascii === PICInterface.PIC_JY4 || ascii === PICInterface.PIC_BB); // JPN: Japanese date picture support

  }

  /// <summary>is checked char Numeric Positional Directive</summary>
  private isNumericPositionalDirective(toCheck: string): boolean {
    let ascii: number = toCheck.charCodeAt(0);
    return (ascii === PICInterface.PIC_N);

  }

  /// <summary>is checked char Logic Positional Directive</summary>
  private isLogicPositionalDirective(toCheck: string): boolean {
    let ascii: number = toCheck.charCodeAt(0);
    return (ascii === PICInterface.PIC_X);

  }

  /// <summary>Find if the letter at index is Positional Date Directive</summary>
  /// <param name="char">to check in picture</param>
  /// <returns> true if Positional Date Directive; false otherwise</returns>
  private isTimePositionalDirective(toCheck: string): boolean {
    let ascii: number = toCheck.charCodeAt(0);
    return (ascii === PICInterface.PIC_HH || ascii === PICInterface.PIC_MMT || ascii === PICInterface.PIC_SS || ascii === PICInterface.PIC_PM || ascii === PICInterface.PIC_MS);

  }

  /// <summary>is checked string Positional Directive of any type</summary>
  /// <param name="full/part">of picture
  /// </param>
  /// <returns> index of directive position or -1 if not found</returns>
  private indexOfPositionalNonDirective(str: string): number {
    let tmp: string;

    for (let i: number = 0; i < str.length; i++)
    {
      tmp = str[i];
      if (FieldValidator.isAlphaPositionalDirective(tmp) || this.isDataPositionalDirective(tmp) || this.isNumericPositionalDirective(tmp)
        || this.isLogicPositionalDirective(tmp) || this.isTimePositionalDirective(tmp))
        continue;
      return i;
    }
    return -1;
  }

  /// <summary> set the "validation failed" flag</summary>
  /// <param name="val">value to use</param>
  private setValidationFailed(val: boolean): void {
    if (this._valDet.ValidationFailed)
      return;
    else
      this._valDet.setValidationFailed(val);
  }

  /// <summary> Count digits in string before delimeter</summary>
  /// <param name="inputString">- string to look into for delimeter</param>
  /// <param name="searchStart">- initial index position for search in inputString</param>
  /// <param name="delimeter">we are looking for</param>
  private digitsBeforeDelimeter(inputString: string, searchStart: number, delimeter: string): number {
    let counter: number = 0;
    let searchEndPos: number = inputString.indexOf(delimeter, searchStart);

    if (searchEndPos < 0)
      searchEndPos = inputString.length;

    for (let i: number = searchStart; i < searchEndPos; i++)
    if (NChar.IsDigit(inputString[i]))
      counter++;

    return counter;
  }

  /// <summary> by Ctrl+U (Set to Null), null display value is set to ctrl. In this case we need following checking , in order to set field to null.</summary>
  /// <param name="val">- entered value to value to check</param>
  private isNullDisplayVal(): boolean {
    let isNullDisplayVal: boolean = false;
    let field: Field = this._valDet.getControl().getField();

    if (field.NullAllowed && field.hasNullDisplayValue())
    {
      let dispDefValue: String = field.getNullDisplay();
      isNullDisplayVal = (dispDefValue.toString() === this._newvalue);
    }

    return isNullDisplayVal;
  }
}
