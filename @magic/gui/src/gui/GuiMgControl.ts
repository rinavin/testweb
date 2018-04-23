
import {CheckboxMainStyle, CtrlButtonTypeGui, MgControlType, RbAppearance} from "@magic/utils";
import {Debug, Int32} from "@magic/mscorelib";
import {GuiMgForm} from "./GuiMgForm";
import {ControlBase} from "./ControlBase";


export abstract class GuiMgControl extends ControlBase {
  private _type: MgControlType = MgControlType.CTRL_TYPE_NONE;
  ForceRefreshPropertyWidth: boolean = false;
  ForceRefreshPropertyHight: boolean = false;

  set Type(value: MgControlType) {
    if (this._type === MgControlType.CTRL_TYPE_NONE) {
      this._type = value;
    }
    else {
      Debug.Assert(false);
    }
  }


  get Type(): MgControlType {
    return this._type;
  }

  ButtonStyle: CtrlButtonTypeGui = CtrlButtonTypeGui.None;
  IsRepeatable: boolean = false;

  get IsTableChild(): boolean {
    let parent: GuiMgControl = ((this.getParent() instanceof GuiMgControl) ? <GuiMgControl>this.getParent() : null);
    let parentIsTable: boolean = parent !== null && parent.isTableControl();
    return parentIsTable && !this.isColumnControl();
  }

  /// <summary>
  /// Saves control z order
  /// </summary>
  ControlZOrder: number = 0;

  get IsTableHeaderChild(): boolean {
    return !this.IsRepeatable && this.IsTableChild;
  }

  Layer: number = 0;
  CheckBoxMainStyle: CheckboxMainStyle = CheckboxMainStyle.None;
  RadioButtonAppearance: RbAppearance = RbAppearance.None;
  Name: string = null;
  GuiMgForm: GuiMgForm = null;

  /// <summary>
  /// return true if this control is a direct child of frame set
  /// </summary>
  /// <returns></returns>
  get IsDirectFrameChild(): boolean {
    let isFrameChild: boolean = false;
    if (this.isSubform()) {
      isFrameChild = (this.getParent() !== null && this.getParent() instanceof GuiMgControl && (<GuiMgControl>this.getParent()).isFrameSet());
    }
    if (this.isFrameFormControl() || isFrameChild) {
      isFrameChild = true;
    }
    return isFrameChild;
  }

  /// <summary>
  ///   get the name of the Control with the line number for repeatable controls
  /// </summary>
  getName(line: number): string {
    let result: string;
    if (this.IsRepeatable) {
      if (line > Int32.MinValue) {
        result = this.Name + "_" + line;
      }
      else {
        // else there is no current row, yet (parsing time for example). Try first row.
        result = this.Name + "_0";
      }
    }
    else {
      result = this.Name;
    }
    return result;
  }

  abstract getParent(): any;

  abstract get TaskTag(): string;

  get UniqueName(): string {
    return this.Name;
  }

  /// <summary>
  ///   return true if it is container control
  /// </summary>
  /// <returns>
  /// </returns>
  isContainerControl(): boolean {
    return this._type === MgControlType.CTRL_TYPE_CONTAINER;
  }

  /// <summary>
  ///   returns true if this control is a static control
  /// </summary>
  isStatic(): boolean {
    return this._type === MgControlType.CTRL_TYPE_LABEL || this._type === MgControlType.CTRL_TYPE_GROUP || this._type === MgControlType.CTRL_TYPE_TABLE ||
      this._type === MgControlType.CTRL_TYPE_COLUMN || this._type === MgControlType.CTRL_TYPE_STATUS_BAR || this._type === MgControlType.CTRL_TYPE_SB_IMAGE ||
      this._type === MgControlType.CTRL_TYPE_SB_LABEL || this._type === MgControlType.CTRL_TYPE_LINE;
  }

  /// <summary>
  ///   return true if it is frame form control
  /// </summary>
  /// <returns>
  /// </returns>
  isFrameFormControl(): boolean {
    return this._type === MgControlType.CTRL_TYPE_FRAME_FORM;
  }

  /// <summary>
  ///   return true for table control
  /// </summary>
  /// <returns>
  /// </returns>
  isTableControl(): boolean {
    return this._type === MgControlType.CTRL_TYPE_TABLE;
  }

  /// <summary>
  ///   return true for tab control
  /// </summary>
  /// <returns>
  /// </returns>
  isTabControl(): boolean {
    return this._type === MgControlType.CTRL_TYPE_TAB;
  }

  /// <summary>
  ///   return true for line control
  /// </summary>
  /// <returns>
  /// </returns>
  isLineControl(): boolean {
    return this._type === MgControlType.CTRL_TYPE_LINE;
  }

  /// <summary>
  ///   return text control
  /// </summary>
  /// <returns>
  /// </returns>
  isTextControl(): boolean {
    return this._type === MgControlType.CTRL_TYPE_TEXT;
  }

  /// <summary>
  ///   return true for image control
  /// </summary>
  /// <returns></returns>
  isImageControl(): boolean {
    return this._type === MgControlType.CTRL_TYPE_IMAGE;
  }

  /// <summary>
  ///   returns true if this control is a sub form control
  /// </summary>
  isSubform(): boolean {
    return this._type === MgControlType.CTRL_TYPE_SUBFORM;
  }

  /// <summary>
  ///   returns true if this control is a sub form control
  /// </summary>
  isRadio(): boolean {
    return this._type === MgControlType.CTRL_TYPE_RADIO;
  }

  /// <summary>
  ///   returns true if this control is a ComboBox control
  /// </summary>
  isComboBox(): boolean {
    return this._type === MgControlType.CTRL_TYPE_COMBO;
  }

  /// <summary>
  ///   returns true if this control is a ListBox control
  /// </summary>
  isListBox(): boolean {
    return this._type === MgControlType.CTRL_TYPE_LIST;
  }

  /// <summary>
  ///   returns true if this control is a isButton control
  /// </summary>
  isButton(): boolean {
    return this._type === MgControlType.CTRL_TYPE_BUTTON;
  }

  /// <summary>
  ///   returns true if this control is a label control
  /// </summary>
  isLabel(): boolean {
    return this._type === MgControlType.CTRL_TYPE_LABEL;
  }

  /// <summary>
  ///   returns true if this control is a Group control
  /// </summary>
  isGroup(): boolean {
    return this._type === MgControlType.CTRL_TYPE_GROUP;
  }

  /// <summary>
  ///   returns true if this control is a frame control
  /// </summary>
  isFrameSet(): boolean {
    return this._type === MgControlType.CTRL_TYPE_FRAME_SET;
  }

  /// <summary>
  ///   returns true if the control is either combo or list
  /// </summary>
  /// <returns>
  /// </returns>
  isSelectionCtrl(): boolean {
    return this._type === MgControlType.CTRL_TYPE_COMBO || this._type === MgControlType.CTRL_TYPE_LIST;
  }

  /// <summary>
  ///   return true for browser control
  /// </summary>
  /// <returns></returns>
  isBrowserControl(): boolean {
    return this._type === MgControlType.CTRL_TYPE_BROWSER;
  }

  isCheckBox(): boolean {
    return this._type === MgControlType.CTRL_TYPE_CHECKBOX;
  }

  isColumnControl(): boolean {
    return this._type === MgControlType.CTRL_TYPE_COLUMN;
  }

  /// <summary>
  ///   Returns true if the control is a choice control: CTRL_TYPE_TAB, CTRL_TYPE_COMBO, CTRL_TYPE_LIST,
  ///   CTRL_TYPE_RADIO
  /// </summary>
  /// <returns></returns>
  isChoiceControl(): boolean {
    let val: boolean = false;
    switch (this._type) {
      case MgControlType.CTRL_TYPE_TAB:
      case MgControlType.CTRL_TYPE_COMBO:
      case MgControlType.CTRL_TYPE_LIST:
      case MgControlType.CTRL_TYPE_RADIO:
        val = true;
        break;
    }
    return val;
  }

  isContainer(): boolean {
    switch (this._type) {
      case MgControlType.CTRL_TYPE_TAB:
      case MgControlType.CTRL_TYPE_TABLE:
      case MgControlType.CTRL_TYPE_GROUP:
      case MgControlType.CTRL_TYPE_CONTAINER:
        return true;
      default:
        return false;
    }
  }

  /// <summary>
  ///   returns true if this control is support gradient
  /// </summary>
  SupportGradient(): boolean {
    return this.isButton() || this.isLabel() || this.isTabControl() || this.isGroup() || this.IsCheckBoxMainStyleButton() || this.IsRadioAppearanceButton();
  }

  /// <summary>
  ///   return TRUE if the control is button and his style is text on image
  /// </summary>
  /// <returns></returns>
  IsImageButton(): boolean {
    let result: boolean = false;
    if (this.isButton()) {
      result = (this.ButtonStyle === CtrlButtonTypeGui.Image);
    }
    return result;
  }

  /// <summary>
  ///   return TRUE if the control is button and his style is  push button
  /// </summary>
  /// <returns></returns>
  IsButtonPushButton(): boolean {
    let result: boolean = false;
    if (this.isButton()) {
      result = (this.ButtonStyle === CtrlButtonTypeGui.Push);
    }
    return result;
  }

  /// <summary>
  ///   return TRUE if the control is button and his style is Hyper Text
  /// </summary>
  /// <returns></returns>
  IsHyperTextButton(): boolean {
    let result: boolean = false;
    if (this.isButton()) {
      result = (this.ButtonStyle === CtrlButtonTypeGui.Hypertext);
    }
    return result;
  }

  /// <summary>
  ///   returns TRUE if the  main style of a check box is Button
  /// </summary>
  /// <returns></returns>
  IsCheckBoxMainStyleButton(): boolean {
    let result: boolean = false;
    if (this.isCheckBox()) {
      result = (this.CheckBoxMainStyle === CheckboxMainStyle.Button);
    }
    return result;
  }

  /// <summary>
  ///   reurn TRUE if the  Appearance of a radio button is Button
  /// </summary>
  /// <returns></returns>
  IsRadioAppearanceButton(): boolean {
    let result: boolean = false;
    if (this.isRadio()) {
      result = (this.RadioButtonAppearance === RbAppearance.Button);
    }
    return result;
  }

  /// <summary>
  ///   Function returns the controltype name when control type character is passed to it.
  /// </summary>
  /// <returns> Control type name</returns>
  getControlTypeName(): string {
    let result: string = null;
    switch (this._type) {
      case MgControlType.CTRL_TYPE_STATUS_BAR:
        result = "Status bar";
        break;
      case MgControlType.CTRL_TYPE_SB_LABEL:
        result = "Status bar label";
        break;
      case MgControlType.CTRL_TYPE_SB_IMAGE:
        result = "Status bar image";
        break;
      case MgControlType.CTRL_TYPE_TABLE:
        result = "Table";
        break;
      case MgControlType.CTRL_TYPE_BUTTON:
        result = "Button";
        break;
      case MgControlType.CTRL_TYPE_CHECKBOX:
        result = "Checkbox";
        break;
      case MgControlType.CTRL_TYPE_COMBO:
        result = "Combo";
        break;
      case MgControlType.CTRL_TYPE_LIST:
        result = "List";
        break;
      case MgControlType.CTRL_TYPE_SUBFORM:
        result = "Subform";
        break;
      case MgControlType.CTRL_TYPE_GROUP:
        result = "Groupbox";
        break;
      case MgControlType.CTRL_TYPE_IMAGE:
        result = "Image";
        break;
      case MgControlType.CTRL_TYPE_TAB:
        result = "Tab";
        break;
      case MgControlType.CTRL_TYPE_COLUMN:
        result = "Column";
        break;
      case MgControlType.CTRL_TYPE_LABEL:
        result = "Label";
        break;
      case MgControlType.CTRL_TYPE_FRAME_SET:
        result = "Frame set";
        break;
      case MgControlType.CTRL_TYPE_CONTAINER:
        result = "Container";
        break;
      case MgControlType.CTRL_TYPE_RADIO:
        result = "Radio";
        break;
      case MgControlType.CTRL_TYPE_TEXT:
        result = "Text";
        break;
      case MgControlType.CTRL_TYPE_FRAME_FORM:
        result = "Frame form";
        break;
      case MgControlType.CTRL_TYPE_BROWSER:
        result = "Browser";
        break;
      case MgControlType.CTRL_TYPE_LINE:
        result = "Line";
        break;
    }
    return result;
  }
}

