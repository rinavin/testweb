import {
  ApplicationException,
  Debug,
  Exception,
  List,
  NNumber,
  NString,
  RefParam,
  StringBuilder
} from "@magic/mscorelib";
import {GuiMgControl} from "../../gui/GuiMgControl";
import {PropParentInterface} from "../../gui/PropParentInterface";
import {Field} from "../data/Field";
import {
  AutoFit,
  ChoiceUtils,
  Constants,
  FramesetStyle,
  InternalInterface,
  ListboxSelectionMode,
  MagicProperties,
  MgControlType,
  Misc,
  SEQ_2_STR,
  StorageAttribute,
  StorageAttributeCheck,
  StrUtil,
  TableBehaviour,
  UtilStrByteMode,
  XMLConstants,
  XmlParser
} from "@magic/utils";
import {MgFormBase} from "./MgFormBase";
import {PIC} from "./PIC";
import {PropTable} from "./PropTable";
import {ValidationDetails} from "./ValidationDetails";
import {FieldDef} from "../data/FieldDef";
import {Property} from "./Property";
import {PropDefaults} from "./PropDefaults";
import {TaskBase} from "../tasks/TaskBase";
import {PromptpHelp} from "./Helps";
import {Manager} from "../../Manager";
import {CommandType, MgCheckState} from "../../GuiEnums";
import {Commands} from "../../Commands";
import {MgRectangle} from "../../util/MgRectangle";
import {NUM_TYPE} from "../data/NUM_TYPE";
import {PropInterface} from "./PropInterface";
import {Events} from "../../Events";
import {DcValues, EMPTY_DCREF} from "../data/DcValues";
import {DataViewBase} from "../data/DataViewBase";
import {DisplayConvertor} from "./DisplayConvertor";
import {BlobType} from "../data/BlobType";
import {VectorType} from "../data/VectorType";
import {ObjectReference} from "../../util/ObjectReference";
import {GuiCommandQueue} from "../../gui/low/GuiCommandQueue";
import {Styles} from "../../gui/low/Style";
import {GuiConstants} from "../../GuiConstants";
import {isNullOrUndefined} from "util";
import {isArray} from "rxjs/util/isArray";


/// <summary>
///   data for <control> ...</control> tag
/// </summary>
export abstract class MgControlBase extends GuiMgControl implements PropParentInterface {

  // fixed defect #:81498, while RT is set default value we need to refresh the control
  // to the value will set to the control

  _ditIdx: number = 0;
  private _linkedControls: List<MgControlBase> = null; // array of controls that are linked to this control
  _field: Field = null; // reference to the field of the control
  _nodeIdField: Field = null; // reference to the field of the node id
  _nodeParentIdField: Field = null; // reference to the field of the parent node id
  private _picStr: string = null;
  _siblingVec: List<MgControlBase> = null; // array of controls that are sibling to
  _choiceDisps: List<string[]> = null; // for SELECT controls, holds the
  _choiceLayerList: List<string[]> = null; // the order on which tabs to be displayed
  _choiceLinks: List<string[]> = null; // for SELECT controls, holds the
  _choiceNums: List<NUM_TYPE[]> = null;  // for SELECT controls, with numeric
  private _containerDitIdx: number = -1;
  _currReadOnly: List<boolean> = null; // a history array for readonly param
  private _dataCtrl: boolean = false; // The data control flag states that this
  _dcTableRefs: List<number> = null; // references to dcVals for each line of a control is a data control
  private _firstRefreshProperties: boolean = true;
  private _form: MgFormBase = null;
  private _hasValidItmAndDispVal: boolean = false;
  private _id: number = -1; // ControlIsn of the control (for subform)
  private _controlIsn: number = -1; // for current isn
  private _horAligmentIsInherited: boolean = false;
  private _isMultiline: boolean = false;
  private _linkedParentDitIdx: number = -1; // not trigger any event handler, while parking in this control
  _orgChoiceDisps: List<string[]> = null; // for TAB Control save the org option (with the &)
  _parentTable: MgControlBase = null; // reference to parent Magic Table for
  _pic: PIC = null;
  private _picExpExists: boolean = false;
  _prevIsNulls: List<boolean> = null; // for NULL
  private _prevPicExpResult: string = null;
  _prevValues: List<string> = null; // references to previous values of the
  _propTab: PropTable = null;
  private _range: string = null;
  private _rangeChanged: boolean = false; // for SELECT controls, true if their range
  private _rtfVal: string = NString.Empty; // field to store the rtf text of rich edit control
  _valExpId: number = 0; // reference to the value expression
  private _vd: ValidationDetails = null;
  private _dcValId: number = -2;
  private prevValueList: string[] = null;
  private prevDispList: string[] = null;
  refreshTableCommandCount: number = 0;
  parent: number = 0;
  veeIndx: number = 0;
  InSetToDefaultValue: boolean = false;
  DNObjectReferenceField: FieldDef = null;
  SourceTableReference: ObjectReference = null;
  ClipBoardDataExists: boolean = false;
  DataType: StorageAttribute = StorageAttribute.NONE;
  KeyStrokeOn: boolean = false; // true if the user pressed a key
  ModifiedByUser: boolean = false;
  Value: any = null;
  IsNull: boolean = false;

  protected set Form(value: MgFormBase) {
    this._form = value;
    this.GuiMgForm = value;
  }

  protected get Form(): MgFormBase {
    return this._form;
  }

  get Id(): number {
    return this._id;
  }

  get ControlIsn(): number {
    return this._controlIsn;
  }

  get HorAligmentIsInherited(): boolean {
    return this._horAligmentIsInherited;
  }

  RefreshOnVisible: boolean = false; // true, if the subform must be refreshed on become visible
  TmpEditorIsShow: boolean = false; // for control, is temporary editor is show ?
  InControl: boolean = false;
  PromptHelp: string = null;

  // the prompt help text assigned to control

  constructor();
  constructor(type: MgControlType, parentMgForm: MgFormBase, parentControl: number);
  constructor(type?: MgControlType, parentMgForm?: MgFormBase, parentControl?: number) {
    super();
    if (arguments.length === 0) {
      this.constructor_0();
      return;
    }
    this.constructor_1(type, parentMgForm, parentControl);
  }

  private constructor_0(): void {
    this._linkedControls = new List<MgControlBase>();
    this.DataType = StorageAttribute.NONE;
  }

  private constructor_1(type: MgControlType, parentMgForm: MgFormBase, parentControl: number): void {
    this.constructor_0();
    this.initReferences(parentMgForm);
    this.Type = type;
    this._containerDitIdx = parentControl;
    this._linkedParentDitIdx = parentControl;
    this._propTab = new PropTable(this);
    this.createArrays(false);
  }

  get UniqueName(): string
  {
    return this.Name;
  }

  get TaskTag(): string
  {
    return this.Form.getTask().getTaskTag();
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="propId"></param>
  /// <returns></returns>
  checkIfExistProp(propId: number): boolean {
    let exist: boolean = false;
    if (this._propTab !== null) {
      let propById: Property = this._propTab.getPropById(propId);
      exist = (propById !== null);
    }
    return exist;
  }

  /// <summary>
  /// return true if this subform is under frame form
  /// </summary>
  /// <returns></returns>
  IsSubformUnderFrameForm(): boolean {
    let isSubFrmUnderFrameForm: boolean = false;
    let parentControl: MgControlBase = ((this.getParent() instanceof MgControlBase) ? <MgControlBase>this.getParent() : null);
    if (parentControl !== null && parentControl.isContainerControl()) {
      isSubFrmUnderFrameForm = true;
    }
    return isSubFrmUnderFrameForm;
  }



  /// <summary>
  /// return true if the control is frame
  /// </summary>
  /// <returns></returns>
  IsFrame(): boolean {
    let isFrame: boolean = false;
    // fixed defect #132963, check if this subform is under frame form
    if (this.Type === MgControlType.CTRL_TYPE_SUBFORM && this.getForm().IsFrameSet && !this.IsSubformUnderFrameForm()) {
      isFrame = true;
    }
    return isFrame;
  }

  /// <summary>
  ///   get a property of the control
  /// </summary>
  /// <param name = "propId">the Id of the property</param>
  getProp(propId: number): Property {
    let prop: Property = null;

    if (this._propTab !== null) {
      prop = this._propTab.getPropById(propId);
      if (prop === null) {
        prop = PropDefaults.getDefaultProp(propId, 'C', this);

        // if the property doesn't exist then create a new property and give it the default value
        // in addition add this property to the properties table
        if (prop !== null) {
          this._propTab.addPropWithCheckExistence(prop, false);
        }
      }
    }
    return prop;
  }

  /// <summary>
  ///   returns the form of the control
  /// </summary>
  getForm(): MgFormBase {
    return this.Form;
  }

  /// <summary>
  ///
  /// </summary>
  /// <returns></returns>
  getCompIdx(): number {
    return this.getForm().getTask().getCompIdx();
  }

  /// <summary>
  ///   return true if this is first refresh
  /// </summary>
  /// <returns></returns>
  IsFirstRefreshOfProps(): boolean {
    return this._firstRefreshProperties;
  }


  /// <summary>
  ///
  /// </summary>
  /// <param name="expId"></param>
  /// <param name="resType"></param>
  /// <param name="length"></param>
  /// <param name="contentTypeUnicode"></param>
  /// <param name="resCellType"></param>
  /// <param name="alwaysEvaluate"></param>
  /// <param name="wasEvaluated"></param>
  /// <returns></returns>
  EvaluateExpression(expId: number, resType: StorageAttribute, length: number, contentTypeUnicode: boolean, resCellType: StorageAttribute, alwaysEvaluate: boolean, wasEvaluated: RefParam<boolean>): string {
      return this.getForm().getTask().EvaluateExpression(expId, resType, length, contentTypeUnicode, resCellType, alwaysEvaluate, wasEvaluated);
  }

  /// <summary>
  /// get a property of the control that already was computed
  /// This method does not create a property if it isn't exist.
  /// May we need to create a property and use its default value.
  /// In Phase 2 in RefreshProperties method we'll create and compute properties,
  /// perhaps we need create all properties not only those that are different from default.
  /// </summary>
  /// <param name = "propId">the Id of the property</param>
  GetComputedProperty(propId: number): Property {
    let prop: Property = null;

  if (this._propTab !== null)
      prop = this._propTab.getPropById(propId);
    return prop;
  }

  /// <summary>
  /// Get the index of the help attached to the control.
  /// </summary>
  /// <returns>Help index</returns>
  getHelpIndex(): number {
    let hlpIndex: number = -1;

    if (this._propTab !== null) {

      let prop: Property = this._propTab.getPropById(54);

      if (prop !== null)
          hlpIndex = NNumber.Parse(prop.getValue());

    }
    return hlpIndex;
  }

  /// <summary>
  ///   Initializing of inner reference to the task of the control
  /// </summary>
  /// <param name = "taskRef">reference to the task of the control</param>
  private initReferences(mgForm: MgFormBase): void {
    this.Form = mgForm;
  }

  /// <summary>
  ///   in the first time that we refresh the control need to create arrays
  /// </summary>
  /// <param name = "forceCreateArrays">create arrays in any case</param>
  createArrays(forceCreateArrays: boolean): void {
    if (this._firstRefreshProperties || forceCreateArrays) {

      // for SELECT controls, always initialize DC table since we use it to merge choices from the
      // prop list with choices from the DATA CONTROL.
      if (this.SupportsDataSource()) {
        this._dcTableRefs = new List();
      }
      this._prevValues = new List();

      // The property PROP_SET_READ_ONLY is set only if it is different from its previous value. By default
      // this property is false, so we do not set it.
      // But for the phantom task if this property was true, and we exit the phantom and again enter into
      // this phantom the property becomes false.
      // So we need to save the previous _currReadOnly value for the phantom task.
      if (!forceCreateArrays) {
        this._currReadOnly = new List();
      }
      this._choiceDisps = new List();
      this._orgChoiceDisps = new List();
      this._choiceLinks = new List();
      this._choiceNums = new List();
      this._prevIsNulls = new List();
      this._choiceLayerList = new List();
      if (!this.IsRepeatable && !super.isTableControl()) {
        this.updateArrays(1);
      }
    }
  }
  /// <summary>
  /// Evaluates the promptHelp assigned to control and sets it to 'PromptHelp' property
  /// </summary>
  private EvaluatePromptHelp(): void {
    if (NString.IsNullOrEmpty(this.PromptHelp)) {
      let task: TaskBase = this.getForm().getTask();
      let promptProp: Property = this.getProp(PropInterface.PROP_TYPE_PROMPT);
      if (promptProp !== null) {
        let idx: number = NNumber.Parse(promptProp.getValue());
        let prompt: string = (<PromptpHelp>task.getHelpItem(idx)).PromptHelpText;
        this.PromptHelp = prompt;
      }
    }
  }

  /// <summary>
  /// Sets the focus on the control and refreshes prompt.
  /// </summary>
  /// <param name="ctrl">Control to have focus</param>
  /// <param name="line">line number</param>
  /// <param name="refreshPrompt"></param>
  /// <param name="activateForm">whether to activate a form after setfocus or not</param>
  SetFocus(ctrl: MgControlBase, line: number, refreshPrompt: boolean, activateForm: boolean): void {

    this.EvaluatePromptHelp();

    if (refreshPrompt)
      ctrl.refreshPrompt();

    Manager.SetFocus(ctrl.getForm().getTask(), ctrl, line, activateForm);
  }

  /// <summary>
  ///   update array's size according to the newSize
  /// </summary>
  /// <param name = "newSize"></param>
  updateArrays(newSize: number): void {
    this._prevValues.SetSize(newSize);
    this._prevIsNulls.SetSize(newSize);
    this._currReadOnly.SetSize(newSize);
    this._choiceDisps.SetSize(newSize);
    this._orgChoiceDisps.SetSize(newSize);
    this._choiceLinks.SetSize(newSize);
    this._choiceLayerList.SetSize(newSize);
    this._choiceNums.SetSize(newSize);
    if (this.SupportsDataSource()) {
      this._dcTableRefs.SetSize(newSize);
    }
    this._propTab.updatePrevValueArray(newSize);
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="newSize"></param>
  updatePrevValArrays(newSize: number): void {
    this._propTab.updatePrevValueArray(newSize);
  }

  /// <summary>
  ///
  /// </summary>
  ResetTablePrevValArray(): void {
    let propById: Property = this._propTab.getPropById(PropInterface.PROP_TYPE_ROW_BG_COLOR);
    propById.ResetPrevValueArray();
  }

  /// <summary>
  ///   To parse input string and fill inner data
  /// </summary>
  /// <param name = "taskRef">to parent task</param>
  /// <param name = "ditidx">number of the Control in Control Table</param>
  fillData(mgForm: MgFormBase, ditIdx: number): void {
    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;
    if (this.Form === null) {
      this.initReferences(mgForm);
    }
    this._ditIdx = ditIdx;
    while (this.initInnerObjects(parser.getNextTag())) {
    }
    this.HeaderControlUpdateRepeatable();

    // If the datatype is BLOB, its picture would be blank. But after version #97
    // of AppSerializer.cs (changed for #485722), blank picture is not serialized.
    // So, we need to explicitly set it to blank here.
    if (this.DataType === StorageAttribute.BLOB && this._picStr === null) {
      this._picStr = "";
    }
    if (this._picStr !== null && typeof this.DataType !== "undefined") {
      this.setPIC(this._picStr);
    }
    else {


      switch (this.Type)
      {
        case MgControlType.CTRL_TYPE_IMAGE:
        case MgControlType.CTRL_TYPE_BROWSER:
        case MgControlType.CTRL_TYPE_BUTTON:
          if (this.DataType  === StorageAttribute.NONE)
            this.DataType = StorageAttribute.ALPHA;
          break;
        case MgControlType.CTRL_TYPE_TABLE:
        case MgControlType.CTRL_TYPE_COLUMN:
        case MgControlType.CTRL_TYPE_SUBFORM:
        case MgControlType.CTRL_TYPE_GROUP:
        case MgControlType.CTRL_TYPE_FRAME_SET:
        case MgControlType.CTRL_TYPE_FRAME_FORM:
        case MgControlType.CTRL_TYPE_CONTAINER:
        case MgControlType.CTRL_TYPE_LINE:
          break;
        default:
          Events.WriteExceptionToLog(NString.Format("in Control.fillData(): missing datatype or picture string for control: {0}", this.Name));
          break;
      }
    }

    if (super.isTableControl()) {
      this.Form.setTableCtrl(this);
    }
    this.createArrays(false);

    if (super.isContainerControl()) {
      this.getForm().setContainerCtrl(this);
    }
    if (super.isFrameFormControl()) {
      this.getForm().setFrameFormCtrl(this);
    }
  }

  /// <summary>
  ///   To allocate and fill inner objects of the class
  /// </summary>
  /// <param name = "foundTagName">name of tag, of object, which need be allocated</param>
  /// <returns> boolean if next tag is inner tag</returns>
  initInnerObjects(foundTagName: string): boolean {
    let result: boolean;
    if (foundTagName === null)
      return false;


    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;
    if (foundTagName === XMLConstants.MG_TAG_PROP) {
      if (this._propTab === null)
        this._propTab = new PropTable(this);

      this._propTab.fillData(this, 'C')/*'C'*/;
      // since multiline property is not recomputed, we can save its value.
      let prop: Property = this.getProp(PropInterface.PROP_TYPE_MULTILINE);
      if (prop !== null)
        this._isMultiline = prop.getValueBoolean();
    }
    else if (foundTagName === XMLConstants.MG_TAG_CONTROL)
      this.parseAttributes();
    else if (foundTagName === "SourceTable")
      this.ParseSourceTable();
    else if (foundTagName === "/" + XMLConstants.MG_TAG_CONTROL) {
      parser.setCurrIndex2EndOfTag();
      return false;
    }
    else {
      Events.WriteExceptionToLog(NString.Format("There is no such tag in Control. Insert else if to Control.initInnerObjects for {0}", foundTagName));
      return false;
    }

    return true;
  }

  private ParseSourceTable(): void {
    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;
    parser.setCurrIndex2EndOfTag();
    let objRefStr: string = parser.ReadToEndOfCurrentElement();
    let sourceTableReference: ObjectReference = ObjectReference.FromXML(objRefStr.trim());

    this.SourceTableReference = sourceTableReference;
    // Skip the closing </prop> tag
    parser.setCurrIndex2EndOfTag();
  }

  /// <summary>
  ///   get the attributes of the control from the XML
  /// </summary>
  private parseAttributes(): void {
    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;
    let endContext: number = parser.getXMLdata().indexOf(">", parser.getCurrIndex());

    if (endContext !== -1 && endContext < parser.getXMLdata().length) {

      // last position of its tag
      let tag: string = parser.getXMLsubstring(endContext);
      parser.add2CurrIndex(tag.indexOf( XMLConstants.MG_TAG_CONTROL) + XMLConstants.MG_TAG_CONTROL.length);

      let tokens: List<string> = XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM)/*'"'*/;

      for (let i: number = 0; i < tokens.length; i = i + 2) {
        let attribute: string = tokens.get_Item(i);
        let valueStr: string = tokens.get_Item(i + 1);

        this.SetAttribute(attribute, valueStr);
      }
      parser.setCurrIndex(endContext + 1); // to delete ">" too
    }
    else {
      Events.WriteExceptionToLog("in Control.FillName() out of string bounds");
    }
  }

  /// <summary>
  /// set the control attributes in parsing
  /// </summary>
  SetAttribute(attribute: string, valueStr: string): boolean {
    let isTagProcessed: boolean = true;

    switch (attribute) {
      case XMLConstants.MG_ATTR_TYPE:
        this.Type = valueStr[0] as MgControlType;
        break;
      case XMLConstants.MG_ATTR_DATA_CTRL:
        this._dataCtrl = XmlParser.getBoolean(valueStr);
        break;
      case XMLConstants.MG_ATTR_LINKED_PARENT:
        this.setLinkedParentIdx(XmlParser.getInt(valueStr));
        break;
      case XMLConstants.MG_ATTR_CONTAINER:
        this.setContainer(XmlParser.getInt(valueStr));
        break;
      case XMLConstants.MG_ATTR_ID:
        this._id = XmlParser.getInt(valueStr);
        break;
      case XMLConstants.MG_ATTR_CONTROL_ISN:
        this._controlIsn = XmlParser.getInt(valueStr);
        break;
      case XMLConstants.MG_ATTR_CONTROL_Z_ORDER:
        this.ControlZOrder = XmlParser.getInt(valueStr);
        break;
      case XMLConstants.MG_HOR_ALIGMENT_IS_INHERITED:
        this._horAligmentIsInherited = XmlParser.getInt(valueStr) === 1 ?  true : false;
        break;
      default:
        isTagProcessed = false;
        break;
    }

    return isTagProcessed;

  }

  /// <summary> set the image on the control </summary>
  /// <param name="fileName"></param>
  setImage(): void {
    let newVal: string = this.Value;
    if (newVal === null || this.IsNull) {
      newVal = "";
    }
    let prop: Property = this.getProp(PropInterface.PROP_TYPE_IMAGE_STYLE);
    if (this.DataType === StorageAttribute.BLOB) {
      // TODO - check if should be supported .
      // Commands.addAsync(CommandType.PROP_SET_IMAGE_DATA, this, this.getDisplayLine(false), BlobType.getBytes(newVal), prop.getValueInt());
    }
    else {
      this.setImageWithFileName(newVal);
    }
  }

  setImageWithFileName(fileName: string): void {
    if (fileName === null) {
      fileName = "";
    }
    fileName = Events.TranslateLogicalName(fileName);

    let imageStyleProp: Property =  this.getProp(PropInterface.PROP_TYPE_IMAGE_STYLE);
    // Commands.addAsync(CommandType.PROP_SET_IMAGE_FILE_NAME, this, this.getDisplayLine(false), fileName, await imageStyleProp.getValueInt());
    if (!Misc.IsWebUrl(fileName))
      fileName = "/assets/images/" + fileName;

    if (this.IsImageButton()) {
      Commands.addOperationWithLine(CommandType.SET_STYLE, this, 0, MagicProperties.ImageFile, fileName);
    }
    else {
      Commands.addOperationWithLine(CommandType.SET_PROPERTY, this, this.getDisplayLine(false), "image", fileName);
      Commands.addValueWithLine(CommandType.SET_VALUE, this, this.getDisplayLine(false), fileName);
    }

    // We need to execute the layout only if the radio is not on table. for table, it is done
    // from LgRadioContainer.setSpecificControlProperties().

    if (super.isRadio() && !this.IsRepeatable) {
      Commands.addAsync(CommandType.EXECUTE_LAYOUT, this, this.getDisplayLine(false), false);
    }
  }

  /// <summary>
  ///   set container
  /// </summary>
  /// <param name = "containerIdx"></param>
  private setContainer(containerIdx: number): void {
    this._containerDitIdx = containerIdx;
    let container: MgControlBase = null;
    if (this._containerDitIdx !== -1) {
      container = this.Form.getCtrl(this._containerDitIdx);
    }

    if (container !== null && container.Type === MgControlType.CTRL_TYPE_TABLE) {
      this._parentTable = container;
    }
    this.IsRepeatable = (this._parentTable !== null && !super.isColumnControl());
  }

  /// <summary>
  ///   get the name of the Control
  /// </summary>
  getName(): string {
    // if (this.isRepeatable()) {
    //   return super.getName(this.Form.DisplayLine);
    // }

    return this.Name;
  }

  /// <summary>
  ///
  /// </summary>
  /// <returns></returns>
  getLinkedControls(): List<MgControlBase> {
    return this._linkedControls;
  }

  /// <summary>
  ///   The control is repeatable control
  /// </summary>
  /// <returns></returns>
  isRepeatable(): boolean {
    return this.IsRepeatable;
  }

  /// <summary> returns current display line of control</summary>
  /// <param name="useLineForItems">if true, use current line for tree</param>
  getDisplayLine(useLineForItems: boolean): number {
    let line: number = 0;
    if (this.IsRepeatable || (useLineForItems && super.isTableControl())) {
      line = this.Form.DisplayLine;
    }
    return line;
  }

  /// <summary>
  ///   checks visibility considering parent visibility
  /// </summary>
  /// <returns></returns>
  isVisible(): boolean {
    let result: boolean = this.GetComputedBooleanProperty(PropInterface.PROP_TYPE_VISIBLE, true);
    if (result)
    {
      result = this.isParentPropValue(PropInterface.PROP_TYPE_VISIBLE);
    }
    return result;
  }

  /// <summary>
  ///   checks enabled considering parent enabled
  /// </summary>
  /// <returns></returns>
  isEnabled(): boolean {
    let result: boolean = this.GetComputedBooleanProperty(PropInterface.PROP_TYPE_ENABLED, true);
    if (result) {
      result = this.isParentPropValue(PropInterface.PROP_TYPE_ENABLED);
    }
    return result;
  }

  /// <summary> Returns if Paste is allowed on the Control. </summary>
  /// <returns></returns>
  IsPasteAllowed(): boolean {
    let isPasteAllowed: boolean = false;
    if (super.isTextControl() && this.isModifiable()) {
      if (!this.ClipBoardDataExists && Manager.ClipboardRead() !== null) {
        this.ClipBoardDataExists = true;
      }
      let clipBoardDataExists: boolean = this.ClipBoardDataExists;
      if (clipBoardDataExists) {
        isPasteAllowed = true;
      }
    }
    return isPasteAllowed;
  }

  /// <summary>
  ///   returns true if the control is modifiable and the task mode is not query
  /// </summary>
  isModifiable(): boolean {

    let modifiable: boolean = this.GetComputedBooleanProperty(PropInterface.PROP_TYPE_MODIFIABLE, true);
    let taskInQuery: boolean = this.getForm().getTask().getMode() === Constants.TASK_MODE_QUERY;
    let modifyInQuery: boolean = this.GetComputedBooleanProperty(PropInterface.PROP_TYPE_MODIFY_IN_QUERY, false);

    let result: boolean = modifiable && (modifyInQuery || !taskInQuery);
    if (result && this._field != null) {
      result = (this._field.DbModifiable || this.getForm().getTask().getMode() ===  Constants.TASK_MODE_CREATE);
    }
    return result;
  }

  /// <summary>
  ///   return true if the ctrl is multiline.
  /// </summary>
  /// <returns></returns>
  isMultiline(): boolean {
    return this._isMultiline;
  }

    /// <summary>
    ///   returns the current dc values of this data control from the current record
    /// </summary>
    getDcVals(): DcValues {
    let dataView: DataViewBase = this.getForm().getTask().DataView;
    let dcv: DcValues = null;
    if (this._dcValId === EMPTY_DCREF) {
      dcv = ((this.DataType === StorageAttribute.BLOB_VECTOR) ? dataView.getEmptyChoiceForVectors() : dataView.getEmptyChoice());
    }
    else {
      if (this._dcValId > -1) {
        dcv = dataView.getDcValues(this._dcValId);
      }
    }
    return dcv;
  }

  /// <summary>
  ///   return the current isNull according to the control's current line number
  /// </summary>
  /// <returns> the PrevIsNull value</returns>
  getPrevIsNull(): boolean {
    let line: number = this.getDisplayLine(true);
    let currObj: any = this._prevIsNulls.get_Item(line);
    let curr: boolean;
    if (currObj === null) {
      curr = false;
      this._prevIsNulls.set_Item(line, curr);
    }
    else {
      curr = <boolean>currObj;
    }
    return curr;
  }

  /// <summary>
  ///   sets the prevIsNull value of the prevIsNull array
  ///   the newValue can be NULL or bool
  /// </summary>
  /// <param name = "newValue">the new value to be set</param>
  setPrevIsNull(newValue: boolean): void {
    this._prevIsNulls.set_Item(this.getDisplayLine(true), newValue);
  }

  /// <param name = "picStr"></param>
  setPIC(picStr: string): void {

    // for push button, translate the format.
    if (super.isButton()) {
      this._picStr = (super.IsImageButton() ? "" + XMLConstants.FILE_NAME_SIZE.toString() : Events.Translate(picStr));
    }
    else {
      this._picStr = picStr;
    }
    this._pic = new PIC(this._picStr, this.DataType, this.getForm().getTask().getCompIdx());

    if (this._dataCtrl && this._picStr.indexOf('H') > -1) {
      this._pic.setHebrew();
    }
  }

  /// <summary>
  ///   get the picture of the control
  /// </summary>
  /// <returns> PIC reference</returns>
  getPIC(): PIC {
    return this._pic;
  }

  /// <summary>
  ///
  /// </summary>
  /// <returns></returns>
  getNodeIdField(): Field {
    return this._nodeIdField;
  }

  /// <returns> the parent of the control can be Table\Tab\Choice control\Form</returns>
  getParent(): any {
    let retParent: any = this.Form;
    if (this._containerDitIdx !== -1) {
      retParent = this.Form.getCtrl(this._containerDitIdx);
    }
    else {
      if (this.Form.isSubForm()) {
        retParent = this.Form.getSubFormCtrl();
      }
    }
    return retParent;
  }

  /// <summary>
  ///   returns the field attached to the control
  /// </summary>
  getField(): Field {
    return this._field;
  }

  /// <summary>
  ///   Set the field of the control by the field object
  /// </summary>
  /// <param name = "field"></param>
  setField(fieldStrID: Field | string): void;
  setField(fieldOrFieldStrID: any): void {
    if (arguments.length === 1 && (fieldOrFieldStrID === null || fieldOrFieldStrID instanceof Field)) {
      this.setField_0(fieldOrFieldStrID);
      return;
    }
    this.setField_1(fieldOrFieldStrID);
  }


  private setField_0(field: Field): void {
    this._field = field;
    if (field !== null) {
      this._field.SetControl(this);
    }
  }

  /// <summary>
  ///   Set the field of the control by a string field identifier
  /// </summary>
  /// <param name = "valueStr">the field identifier: "parentId,fieldIdx"/param>
  private setField_1(fieldStrID: string): void {
    let returnField: Field = this.getFieldByValueStr(fieldStrID);
    if (returnField !== null) {
      this._field = returnField;
      this._field.SetControl(this);
      return;
    }
    throw new ApplicationException("in Control.setField(): illegal field identifier: " + fieldStrID);
  }

  /// <summary>
  ///  Set the DN object ref field of the control by a string field identifier
  /// </summary>
  /// <param name="fieldStrID"></param>
  SetDNObjectReferenceField(fieldStrID: string): void {
    this.DNObjectReferenceField = this.getFieldByValueStr(fieldStrID);


    Debug.Assert(this.DNObjectReferenceField !== null, NString.Format("In MgControlBase.SetDNObjectReferenceField(): illegal field identifier: {0}", fieldStrID));
  }

  /// <summary>
  ///   set the picture of the control
  /// </summary>
  /// <param name = "format">the format string</param>
  /// <param name = "expId">an expression of the format</param>
  setPicStr(format: string, expId: number): void {
    this._picStr = format;
    if (expId > 0) {
      this._picExpExists = true;
    }
  }

  /// <summary>
  ///   sets the range of the control and clears the mask
  /// </summary>
  /// <param name = "newRange">is the new range</param>
  setRange(newRange: string): void {
    this._range = newRange;
    this._vd = null;
  }

  /// <summary>
  ///   set the value expression
  /// </summary>
  /// <param name = "expId">a reference to the expression</param>
  setValExp(expId: number): void {
    this._valExpId = expId;
  }

  /// <returns> the a default value for the type of the field of the control
  ///   this value can be used in order to create an empty display value with the mask.
  /// </returns>
  getDefaultValueForEdit(): string {
    return FieldDef.getMagicDefaultValue(this.DataType);
  }

  /// <summary>
  ///   get copy of validation details with new & old value without changing real validation details
  /// </summary>
  /// <param name = "oldVal">value of the control</param>
  /// <param name = "newVal">value of the control</param>
  buildCopyPicture(oldVal: string, newVal: string): ValidationDetails {
    if (super.isTableControl() || super.isColumnControl()) {
      return null;
    }
    else {
      let copyVD: ValidationDetails = this.getCopyOfVD();
      copyVD.setValue(newVal);
      copyVD.setOldValue(oldVal);
      return copyVD;
    }
  }

  /// <summary>
  ///   build copy of validation details, without influence to the real validation details
  /// </summary>
  private getCopyOfVD(): ValidationDetails {
    let result: ValidationDetails;
    if (this._vd === null) {
      result = new ValidationDetails(this.Value, this.Value, this._range, this._pic, this);
    }
    else {
      result = new ValidationDetails(this._vd);
    }
    return result;
  }

  /// <summary>
  ///   get ranges
  /// </summary>
  getRanges(): string {
    return this._range;
  }

  /// <summary>
  ///   get ranged value for input value
  /// </summary>
  getRangedValue(newVal: any): string {

    let vd: ValidationDetails;
    vd = this.buildCopyPicture(this.Value, newVal);
    vd.evaluate();

    // the validation of the fields value was wrong
    return (vd.getDispValue());
  }

  /// <summary>
  ///   validate user input
  /// </summary>
  validate(newVal: any): string {

    let vd: ValidationDetails;
    vd = this.buildCopyPicture(this.Value, newVal);
    vd.evaluate();

    // the validation of the fields value was wrong
    if (vd.ValidationFailed)
      return vd.ErrorMessage;
    else
      return null;
  }


  /// <param name = "valueStr"></param>
  /// <returns></returns>
  private getFieldByValueStr(valueStr: string): Field {

    let refParent: RefParam<number> = new RefParam<number>(this.parent);
    let refVeeIndx: RefParam<number> = new RefParam<number>(this.veeIndx);
    let ret: Field = <Field>this.getForm().getTask().getFieldByValueStr(valueStr, refParent, refVeeIndx);
    this.parent = refParent.value;
    this.veeIndx = refVeeIndx.value;
    return ret;
  }

  /// <summary>
  ///   returns true if has container
  /// </summary>
  /// <returns></returns>
  hasContainer(): boolean {
    return this._containerDitIdx !== -1;
  }

  /// <summary>
  ///   gets layer of control
  /// </summary>
  /// <returns></returns>
  getLayer(): number {
    return this.Layer;
  }

  /// <summary>
  ///   computes the pic using the result of the format expression
  /// </summary>
  /// <param name = "picExpResult">the result of the format expression</param>
  /// <returns> PIC reference </returns>
  computePIC(picExpResult: string): PIC {
    // for push button, translate the format.
    let picResult: string = (picExpResult !== null && super.isButton()) ? Events.Translate(picExpResult) : picExpResult;

    // construct a new picture only if the expression result is different than the previous result
    if (this._prevPicExpResult === null || !(this._prevPicExpResult === picResult)) {
      this._pic = new PIC(picResult, this.DataType, this.getForm().getTask().getCompIdx());
      this._prevPicExpResult = picResult;
    }
    return this._pic;
  }

  /// <summary>
  /// gets the index of the current choice in the choice control
  /// </summary>
  /// <returns>index of the current choice</returns>
  getCurrentIndexOfChoice(): number[] {
    let selectedIndice: number[] = [-1];

    let val: string = this.Value;

    if (!NString.IsNullOrEmpty(val)) {
      let array2: string[] = val.split(','/*','*/);
      selectedIndice = new Array<number>(array2.length);
      for (let iCtr: number = 0; iCtr < array2.length; iCtr = iCtr + 1) {
        let num: number = NNumber.Parse(array2[iCtr]);
        selectedIndice[iCtr] = ((num >= 0) ? num : -1);
      }
    }
    return selectedIndice;
  }

  /// <summary>
  /// Returns true is multi selection list box else false.
  /// </summary>
  /// <returns></returns>
  IsMultipleSelectionListBox(): boolean {
    let isMultiSelectListBox: boolean = false;
    if (super.isListBox()) {
      let prop: Property = this.getProp(PropInterface.PROP_TYPE_SELECTION_MODE);
      if ( prop !== null) {
        isMultiSelectListBox = (prop.getValueInt() === ListboxSelectionMode.Multiple);
      }
    }
    return isMultiSelectListBox;
  }

  /// <summary>
  /// Returns true if control picture is date or time
  /// </summary>
  /// <returns></returns>
  IsDateTimePicture(): boolean {
    return this._pic.getAttr() === StorageAttribute.DATE || this._pic.getAttr() === StorageAttribute.TIME;
  }

  /// <summary>
  ///   this control support data source
  /// </summary>
  /// <returns></returns>
  SupportsDataSource(): boolean {
    return super.isSelectionCtrl() || super.isTabControl() || super.isRadio();
  }

  /// <summary>
  /// Returns the array of indice which corresponds to a specific link value
  /// </summary>
  /// <param name = "mgVal">the requested value</param>
  /// <param name="line"></param>
  /// <param name = "isNull">true if mgVal represents a null value</param>
  /// <returns> array of indice</returns>
  getIndexOfChoice(mgVal: string, line: number, isNull: boolean): number[] {

    // if the control is listbox with single selection mode, and the value is comma separated, then we should not split value on comma.
    let splitCommaSeperatedVals: boolean = this.IsMultipleSelectionListBox();

    this.computeChoice(line);

    let isVectorValue: boolean = this.getField() !== null && this.getField().getType() === StorageAttribute.BLOB_VECTOR;
    return this.getDcVals().getIndexOf(mgVal, isVectorValue, isNull, this._choiceLinks.get_Item(line), this._choiceNums.get_Item(line), splitCommaSeperatedVals);
  }

  /// <returns> true if this is a SELECT control which has a PROP_TYPE_DISPLAY_LIST property containing valid
  ///   values.
  /// </returns>
  hasDispVals(line: number): boolean {
    let dispVals: string[] = this.getDispVals(line, false);
    return this.getProp(PropInterface.PROP_TYPE_DISPLAY_LIST) !== null && dispVals !== null && dispVals.length > 0;
  }

  /// <returns> parsed content of PROP_TYPE_DISPLAY_LIST</returns>
  getDispVals(line: number, execComputeChoice: boolean): string[] {
    if (execComputeChoice) {
      this.computeChoice(line);
    }
    if (super.isTabControl()) {
      return this._orgChoiceDisps.get_Item(line);
    }
    else {
      return  this._choiceDisps.get_Item(line);
    }

  }

  /// <summary>
  /// Get max count of display items for choice ctrl.
  /// </summary>
  /// <returns>returns display count</returns>
  getMaxDisplayItems(): number {
    let maxLayer: number = this._choiceLayerList.get_Item(0).length;

    if (maxLayer === 0) {
      let dispValsSrcData: string[] = this.getDcVals().getDispVals();

      maxLayer = this._choiceDisps.get_Item(0).length;
      if (dispValsSrcData !== null) {
        maxLayer = maxLayer + dispValsSrcData.length;
      }
    }
    return maxLayer;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="line"></param>
  /// <returns></returns>
  private emptyChoice(line: number): void {
    let value: string[] = new Array<string>(0);
    this._choiceDisps.set_Item(line, value);
    this._orgChoiceDisps.set_Item(line, value);
    this._choiceLinks.set_Item(line, value);
    this._choiceLayerList.set_Item(line, value);
  }

  /// <summary>
  ///   computes the choices of a SELECT control that originate from the control's properties (in contrast to
  ///   the ones originating from the underlaying table of a data control)
  /// </summary>
  private computeChoice(line: number): void {
    let fromHelp: string[] = [
      "\\\\", "\\-", "\\,"
    ];
    let toHelp: string[] = [
      "XX", "XX", "XX"
    ];
    let task: TaskBase = this.getForm().getTask();
    let dataView: DataViewBase = task.DataView;
    let dcv: DcValues = dataView.getDcValues(this._dcValId);
    let currDcId: number = this.getDcRef();
    let choiceDispStr: string = null;
    let choiceLinkStr: string = "";
    let optionsValid: boolean = true;
    let trimToLength: number = -1;
    let dataType: StorageAttribute = this.DataType;
    let isItemsListTreatedAsDisplayList: boolean = false;

    try {

      // re-compute values only if they are not valid or the DC was changed (due toHelp recompute)
      if (this._choiceLinks.get_Item(line) === null || (this.isDataCtrl() && currDcId !== this._dcValId)) {
        if (dataType === StorageAttribute.BLOB_VECTOR) {
          dataType = this.getField().getCellsType();
        }
        let dispVals: string[] = dcv.getDispVals();
        let dispProp: Property = this.getProp(PropInterface.PROP_TYPE_DISPLAY_LIST);
        let linkProp: Property = this.getProp(PropInterface.PROP_TYPE_LABEL);
        if (dispProp !== null) {
          choiceDispStr = dispProp.getValue();
        }
        if (linkProp !== null) {
          choiceLinkStr = linkProp.getValue();
        }
        if (choiceLinkStr === null || StrUtil.rtrim(choiceLinkStr).length === 0) {
          choiceLinkStr = "";
        }
        if (choiceDispStr === null || StrUtil.rtrim(choiceDispStr).length === 0) {
          if (!this.isDataCtrl() || dispVals === null || dispVals.length === 0) {
            choiceDispStr = choiceLinkStr;
          }
          else {
            choiceDispStr = (choiceLinkStr = "");
          }
          isItemsListTreatedAsDisplayList = true;
        }
        choiceDispStr = Events.Translate(choiceDispStr);
        if (dataType === StorageAttribute.NUMERIC) {
          choiceLinkStr = StrUtil.searchAndReplace(choiceLinkStr, "\\-", "-");
        }
        let helpStr: string = StrUtil.searchAndReplace(choiceLinkStr, fromHelp, toHelp);
        let sTok: string[] = StrUtil.tokenize(helpStr, ",");
        let linkSize: number = (helpStr !== "") ? sTok.length : 0;
        let helpStrDisp: string = StrUtil.searchAndReplace(choiceDispStr, fromHelp, toHelp);
        sTok = StrUtil.tokenize(helpStrDisp, ",");
        let displaySize: number = (helpStrDisp !== "") ? sTok.length : 0;

        if (linkSize !== displaySize && displaySize > 0) {
          choiceDispStr = choiceLinkStr;
          isItemsListTreatedAsDisplayList = true;
        }
        let size: number = linkSize;
        let choiceLink: string[] = new Array<string>(size);
        this._choiceLinks.set_Item(line, choiceLink);
        if (dataType === StorageAttribute.NUMERIC || dataType === StorageAttribute.DATE || dataType === StorageAttribute.TIME) {
          this._choiceNums.set_Item(line, new Array<NUM_TYPE>(size));
        }

        // Add display values
        let orgChoiceDisp: string[] = ChoiceUtils.GetDisplayListFromString(choiceDispStr, false, true, !isItemsListTreatedAsDisplayList);
        this._orgChoiceDisps.set_Item(line, orgChoiceDisp);
        let choiceDisp: string[] = ChoiceUtils.GetDisplayListFromString(choiceDispStr, super.isSelectionCtrl() || super.isTabControl(), true, !isItemsListTreatedAsDisplayList);
        this._choiceDisps.set_Item(line, choiceDisp);
        if (this.getField() !== null) {
          trimToLength = this.getField().getSize();
        }


        let token: string = null;
        let helpToken: string = null;
        let tokenBuffer: StringBuilder;
        // Add link values.
        for (let i: number = 0, currPos: number = 0, nextPos = 0; i < size && optionsValid; i++)
        {
          nextPos = currPos;
          nextPos = helpStr.indexOf(',', nextPos);

          if (nextPos === currPos)
            token = helpToken = "";
          else if (nextPos === -1)
          {
            token = choiceLinkStr.substr(currPos);
            helpToken = helpStr.substr(currPos);
          }
          else
          {
            token = choiceLinkStr.substr(currPos, (nextPos) - (currPos));
            helpToken = helpStr.substr(currPos, (nextPos) - (currPos));
          }

          currPos = nextPos + 1;

          switch (dataType)
          {
            case StorageAttribute.ALPHA:
            case StorageAttribute.MEMO:
            case StorageAttribute.UNICODE:
            case StorageAttribute.BLOB_VECTOR:
              token = StrUtil.ltrim(token);
              helpToken = StrUtil.ltrim(helpToken);
              if (helpToken.indexOf('\\') >= 0)
              {
                tokenBuffer = new StringBuilder();
                for (let tokenPos: number = 0; tokenPos < helpToken.length; tokenPos++)
                  if (helpToken[tokenPos] !== '\\')
                    tokenBuffer.Append(token[tokenPos]);
                  else if (tokenPos === helpToken.length - 1)
                    tokenBuffer.Append(' ');

                token = tokenBuffer.ToString();
              }
              token = StrUtil.makePrintableTokens(token, SEQ_2_STR);
              if (this.isSelectionCtrl() || this.isTabControl())
                token = ChoiceUtils.RemoveAcclCharFromOptions(new StringBuilder(token));

              // choiceLink size cannot be greater than size of the field, so trim it.
              if (UtilStrByteMode.isLocaleDefLangDBCS() && dataType === StorageAttribute.ALPHA)
              {
                if (trimToLength !== -1 && UtilStrByteMode.lenB(token) > trimToLength)
                  token = UtilStrByteMode.leftB(token, trimToLength);
              }
              else
              {
                if (trimToLength !== -1 && token.length > trimToLength)
                  token = token.substr(0, trimToLength);
              }

              choiceLink[i] = token;
              break;

            case StorageAttribute.NUMERIC:
            case StorageAttribute.DATE:
            case StorageAttribute.TIME:
              let picture: PIC = PIC.buildPicture(dataType, token, task.getCompIdx(), false);
              optionsValid = this.optionIsValid(token);
              choiceLink[i] = DisplayConvertor.Instance.disp2mg(token.trim(), choiceLinkStr, picture,
                task.getCompIdx(),
                BlobType.CONTENT_TYPE_UNKNOWN);
              ((this._choiceNums.get_Item(line)))[i] = new NUM_TYPE(choiceLink[i]);
              break;

            case StorageAttribute.BOOLEAN:
              choiceLink[i] = (1 - i).toString();
              break;

            default:
              break;
          }
        }

        if (!optionsValid)
          this.emptyChoice(line);
      }
    } catch (ex) {
      if (ex instanceof Exception) {
        optionsValid = false;
        this.emptyChoice(line);
        Events.WriteExceptionToLog(NString.Format("{0} : {1}", ex.GetType(), ex.Message));
      }
      else
        throw ex;
    }
    this._hasValidItmAndDispVal = optionsValid;




  }

  /// <summary>
  ///   return the topmost form of the subform
  /// </summary>
  /// <returns></returns>
  getTopMostForm(): MgFormBase {
    return this.getForm().getTopMostForm();
  }

  /// <summary>
  ///   replace the url on browser control
  /// </summary>
  private setUrl(): void {
    Commands.addAsync(CommandType.PROP_SET_URL, this, 0, this.Value, 0);
    Commands.addValueWithLine(CommandType.SET_VALUE, this, 0, this.Value);
  }

  /// <summary>
  /// process opening of combo box's dropdown list.
  /// </summary>
  /// <param name = "line">table control's row</param>
  /// <returns></returns>
  processComboDroppingdown(line: number): void {
    if (this.isParkable(true, false) && this.getDisplayLine(true) === line && this.isModifiable()) {
      Commands.addAsync(CommandType.COMBO_DROP_DOWN, this, line, false);
      Commands.beginInvoke();
    }
  }

  /// <summary>
  ///   returns the value in internal representation without changing the control value
  /// </summary>
  /// <param name = "dispVal">the displayed value with the masking characters</param>
  getMgValue(dispVal: any): string {
    let mgVal: string = null;

    if (super.isCheckBox()) {
      mgVal = dispVal ? "1":"0" ;
    }
    else {
      if (super.isSelectionCtrl() || super.isTabControl() || super.isRadio()) {

        let line: number = this.getDisplayLine(true);

        if (line < 0)
          line = 0;

        if (typeof dispVal === "number")
            dispVal = dispVal.toString();

        if (isArray(dispVal))
            dispVal = dispVal.join(',').toString();


        if (dispVal === "") {
          mgVal = dispVal;
        }
        else {
          mgVal = this.getLinkValue(dispVal, line);
        }
        if (mgVal === null) {
          let isNull: boolean = false;
          // The data control will never return an illegal value as a result of a user selection
          // but as a result of an init expression, update operation or values of data in
          // the record. Therefore, the same illegal value should be taken from its source,
          // which is a field or an expression. (Ehud 19-jun-2001)
          let refMgVal: RefParam<string> = new RefParam<string> (mgVal);
          let refIsNull: RefParam<boolean> = new RefParam<boolean> (isNull);

          if (this._field !== null) {
              let _r = (<TaskBase>this._field.getTask()).getFieldValue(this._field, refMgVal, refIsNull);
              mgVal = refMgVal.value;
              isNull = refIsNull.value;
          }
          else {
            if (this._valExpId > 0) {
              let wasEvaluated = false;
              let refWasEvaluated: RefParam<boolean> = new RefParam<boolean>(wasEvaluated);
                let _r = this.EvaluateExpression(this._valExpId, this.DataType, this._pic.getSize(), true, StorageAttribute.SKIP, false, refWasEvaluated);
            }
          }
        }
      }
      else {
        let blobContentType: string = (this._field !== null) ? this._field.getContentType() : BlobType.CONTENT_TYPE_UNKNOWN;
        mgVal = DisplayConvertor.Instance.disp2mg(dispVal, this._range, this._pic, this.getForm().getTask().getCompIdx(), blobContentType);
      }
    }
    return mgVal;
  }

  /// <summary>
  /// Returns comma separated values for indice passed.
  /// </summary>
  /// <param name="selectedIndice">comma separated values</param>
  /// <param name="line"></param>
  /// <returns>comma separated values</returns>
  getLinkValue(selectedIndice: string, line: number): string {
    let size: number = 0;
    let result: string = NString.Empty;
    let temp: List<string> = new List<string>();

    this.computeChoice(line);

    let choiceLink: string[] = this._choiceLinks.get_Item(line);

    if (choiceLink !== null) {
      // compute size of displayed values array
      size = choiceLink.length;
    }
    let linkIndice: number[] = this.getLinkIdxFromLayer(Misc.GetIntArray(selectedIndice));

    let array2: number[] = linkIndice;
    for (let i: number = 0; i < array2.length; i = i + 1)
    {
      let idx: number = array2[i];
      if (idx >= size) {
        let dcVals: DcValues = this.getDcVals();
        temp.push(dcVals.getLinkValue(idx - size));
      }
      else {
        if (idx >= 0 && idx < choiceLink.length) {
          temp.push(choiceLink[idx]);
        }
        else {
          temp.push(null);
        }
      }
    }

    if (this.DataType === StorageAttribute.BLOB_VECTOR) {
      let vectorType: VectorType = new VectorType(this.getField());
      for (let indx: number = 0; indx < temp.length; indx = indx + 1) {
        vectorType.setVecCell(indx + 1, temp.get_Item(indx), temp.get_Item(indx) === null);
      }
      result = vectorType.toString();
    }
    else {
      if (temp.length > 1) {
        result = temp.join(",");
      }
      else {
        result = temp.get_Item(0);
      }
    }
    return result;
  }

  /// <summary>
  ///   set text on the control
  /// </summary>
  private setText(): void {
    let displayLine: number = this.getDisplayLine(true);
    let mlsTranslatedValue: any = this.Value;
    if (super.isButton()) {
      mlsTranslatedValue = Events.Translate(this.Value);
    }
    if (this.isTextControl() || this.isButton())
      Commands.addValueWithLine(CommandType.SET_VALUE, this, displayLine, mlsTranslatedValue);
    else
      Commands.addOperationWithLine(CommandType.SET_PROPERTY, this, displayLine, /*"innerHTML"*/ "text", mlsTranslatedValue);

    // Commands.addAsync(CommandType.PROP_SET_TEXT, this, displayLine, mlsTranslatedValue, 0);
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="newRtfVal"></param>
  private setRtfval(newRtfVal: string): void {
    this._rtfVal = newRtfVal;
  }

  /// <summary>
  ///   set the radio button checked
  /// </summary>
  /// <param name = "radioLine">is the line of the radio that need to be Set</param>
  private setRadioChecked(radioLine: number): void {
    if (this._siblingVec !== null && radioLine >= 0) {
      for (let i: number = 0; i < this._siblingVec.length; i = i + 1) {
        let mgControlBase: MgControlBase = this._siblingVec.get_Item(i);
        mgControlBase.setChecked(-1, "0");
      }
    }
    this.setChecked(radioLine, "1");
    Commands.addValueWithLine(CommandType.SET_VALUE, this, radioLine, this.Value);

    // set control to focus
    if (radioLine !== GuiConstants.DEFAULT_VALUE_INT) {
      this.setControlToFocus();
    }
  }

  /// <summary>
  ///   Sets the t\f to the check box control
  /// </summary>
  /// <param name="lineInRadio">index of a radio button inside the radio panel</param>
  /// <param name="mgVal"></param>
  /// <returns></returns>
  private setChecked(lineInRadio: number, mgVal: string): void {
    Commands.addAsync(CommandType.PROP_SET_CHECKED, this, this.getDisplayLine(false), lineInRadio, DisplayConvertor.toBoolean(mgVal));
    Commands.beginInvoke();
  }

  /// <summary>
  /// </summary>
  setControlToFocus(): void {
    if (this.getField() !== null) {
      this.getField().ControlToFocus = this;
    }
  }

  /// <summary>
  ///   set CheckBox Value to the check box control
  /// </summary>
  /// <param name="line"></param>
  /// <param name="mgVal"></param>
  /// <returns></returns>
  private setCheckBoxValue(line: number, mgVal: string): void {
    let checkState: MgCheckState;
    if (this.checkProp(PropInterface.PROP_TYPE_THREE_STATES, false) && this.IsNull) {
      checkState = MgCheckState.INDETERMINATE;
    }
    else {
      checkState = (DisplayConvertor.toBoolean(mgVal) ? MgCheckState.CHECKED : MgCheckState.UNCHECKED);
    }
    Commands.addAsync(CommandType.PROP_SET_CHECK_BOX_CHECKED, this, line, checkState);
    Commands.beginInvoke();

    Commands.addValueWithLine(CommandType.SET_VALUE, this, line, this.Value == "0" ? false : true);
  }

  /// <summary>
  /// </summary>
  /// <param name = "line"></param>
  /// <param name = "valueChanged"></param>
  /// <returns></returns>
  private refreshAndSetItemListByDataSource(line: number, valueChanged: boolean): boolean {
    if (this.SupportsDataSource()) {
      let currDcId: number = this.getDcRef();

      // If the range was changed we have to recalculate the correct choice option
      if (this._rangeChanged) {
        valueChanged = true;
      }
      this._rangeChanged = false;
      if (this.isDataCtrl() && currDcId !== this._dcValId) {

        // Performance improvement: server writes optionList to the HTML. No need to apply
        // them
        // for the first time.
        // force update of the value whenever the set of options is replaced
        // if (form.formRefreshed() || forceRefresh)

        valueChanged = true;
        this.refreshAndSetItemsList(line, true);
        this.setDcRef(this._dcValId);
      }
    }
    return valueChanged;
  }

  /// <summary>
  ///   set the dcref for the current table line
  /// </summary>
  /// <param name = "dcId">the new reference to the dcvals</param>
  setDcRef(dcId: number): void {
    this._dcTableRefs.set_Item(this.getDcLineNum(), dcId);
  }

  /// <summary>
  ///   replace the image list of an button control with the image at the given URL
  /// </summary>
  setImageList(url: string): void {
    if (url === null) {
      url = "";
    }
    url = Events.TranslateLogicalName(url);
    Commands.addAsync(CommandType.PROP_SET_IMAGE_LIST, this, this.getDisplayLine(false), url, this.Form.PBImagesNumber);
  }

  /// <summary>
  ///   Update boolean property(ex:visible\enable) of control and it's children
  /// </summary>
  /// <param name = "propId">property id </param>
  /// <param name = "commandType">command type that belong to the prop id</param>
  /// <param name = "val"></param>
  /// <param name = "updateThis"></param>
  updatePropertyLogicNesting(propId: number, commandType: CommandType, val: boolean, updateThis: boolean): void {
    // if (val && this.haveToCheckParentValue()) {
    //  val = this.isParentPropValue(propId);
    // }
    if (updateThis) {
      Commands.addAsync(commandType, this, this.getDisplayLine(false), val, !this.IsFirstRefreshOfProps());
      Commands.addOperationWithLine(CommandType.SET_PROPERTY, this, this.getDisplayLine(false),
        commandType === CommandType.PROP_SET_VISIBLE ? "visible" : "enabled", val);

    }
    // todo: should go over only linked controls - not children controls, need to check with PM this behavior
    // this.updateChildrenPropValue(propId, commandType, val);
  }

  SetEnabled(val: boolean): void {
      Commands.addOperationWithLine(CommandType.SET_PROPERTY, this, this.getDisplayLine(false), "enabled", val);
    //
    // Commands.addAsync(CommandType.PROP_SET_ENABLE, this, this.getDisplayLine(false), val, !this.IsFirstRefreshOfProps());
  }

  /// <summary>
  ///   Updates visibility of controls linked to the control
  /// </summary>
  /// <param name = "propId"></param>
  /// <param name = "commandType"></param>
  /// <param name = "val"></param>
  updateChildrenPropValue(propId: number, commandType: CommandType, val: boolean): void {

    if (!super.isTableControl()) {
      // in table all children are contained,
      // table's visibility\enable will affect them

      for (let i: number = 0; i < this._linkedControls.length; i = i + 1) {

        let child: MgControlBase = this._linkedControls.get_Item(i);
        // Defect 117294. Do not continue for the first time. It affects on the placement.
        if (child.IsFirstRefreshOfProps())
          continue;

        let childValue: boolean = (child.GetComputedBooleanProperty(propId, true));

        childValue = childValue && val;

        let childOnCurrentLayer: boolean = this.isChildOnCurrentLayer(child);

        if (commandType === CommandType.PROP_SET_VISIBLE) {

          if (childValue) {
            childValue = childOnCurrentLayer;
          }
          Commands.addAsync(commandType, child, this.getDisplayLine(false), childValue);
          child.updateChildrenPropValue(propId, commandType, childValue);
        }
      }
      if (super.isSubform()) {
        this.updateSubformChildrenPropValue(propId, commandType, val);
      }
    }
  }

  /// <summary>
  ///   return true if this control is descendant of specified control
  /// </summary>
  /// <returns></returns>
  isDescendentOfControl(control: MgControlBase): boolean {
    let isContained: boolean = false;

    if (control !== null) {
      let parent: any = this.getParent();
      if (parent instanceof MgControlBase) {
        if (parent === control) {
          isContained = true;
        }
        else {
          // If current control belongs to table, then it is also a descendant of the column control to
          // which it belongs. According to our hierarchy, the control is direct descendant of table
          // control; hence, we need to handle column control

          let parentControl: MgControlBase = ((parent instanceof MgControlBase) ? <MgControlBase>parent : null);
          if (control.Type === MgControlType.CTRL_TYPE_COLUMN && parentControl !== null && parentControl.Type === MgControlType.CTRL_TYPE_TABLE && control.Layer === this.Layer)
            isContained = true;
          else
            isContained = ((<MgControlBase>parent).isDescendentOfControl(control));
        }
      }
    }
    return isContained;
  }

  /// <summary>
  ///   Updates visibility or enable property of subform controls
  /// </summary>
  /// <param name = "propId">Id of visibility or enable property</param>
  /// <param name = "commandType">type of the GUI command</param>
  /// <param name = "val">value for the property</param>
  updateSubformChildrenPropValue(propId: number, commandType: CommandType, val: boolean): void {
  }

  /// <summary>
  ///   checks child's layer is equal to current layer of the parent, relavant for tab control for all other
  ///   controls returns true
  /// </summary>
  /// <param name = "child"></param>
  /// <returns> true if parent is not tab control or parent is tab control with same layer</returns>
  isChildOnCurrentLayer(child: MgControlBase): boolean {
    let ret: boolean = true;
    // check that the control has same layer that is currently set on it's parent tab control
    if (super.isChoiceControl()) {
      let parentLayer: number = 0;
      if (this.Value !== null) {
        parentLayer = this.getCurrentLinkIdx() + 1;
      }
      let layer: number = child.getLayer();
      if (parentLayer !== layer && layer > 0) {
        // sons of layer 0 displayed always
        ret = false;
      }
    }
    return ret;
  }

  /// <summary>
  ///   Return current link Idx of choice controls, or zero for others
  /// </summary>
  /// <returns></returns>
  getCurrentLinkIdx(): number {
    let currLinkIdx: number = 0;

    if (super.isChoiceControl()) {
      let currentLayers: number[] = this.getCurrentIndexOfChoice();
      let currLinkIndice: number[] = this.getLinkIdxFromLayer(currentLayers);
      currLinkIdx = currLinkIndice[0];
    }
    return currLinkIdx;
  }

  /// <summary>
  /// gets layer from the selected indice passed.
  /// </summary>
  /// <param name="linkIdx"></param>
  /// <returns>array of layer values.</returns>
  getLayerFromLinkIdx(indice: number[]): number[] {
    let layers: number[] = new Array<number>(indice.length);

    for (let iCtr: number = 0; iCtr < indice.length; iCtr = iCtr + 1) {
      let idx: number = indice[iCtr];
      // By default, layer = linkIdx unless it is a Tab control

      layers[iCtr] = idx;

      if (super.isTabControl() && idx >= 0) {
        let line: number = this.getDisplayLine(false);
        if (line < 0) {
          line = 0;
        }
        let layerList: string[] = this._choiceLayerList.get_Item(line);
        if (layerList !== null && layerList.length > 0) {
          layers[iCtr] = layerList.indexOf((idx + 1).toString());
        }
      }
    }
    return layers;
  }

  /// <summary>
  /// Gets the selected indice for selected values.
  /// </summary>
  /// <param name="layers">an array of current layers tab controls. It can be array because of multiple selection.</param>
  /// <returns>array of indice</returns>
  private getLinkIdxFromLayer(layers: number[]): number[] {
    let linkIndice: number[] = new Array<number>(layers.length);
    for (let iCtr: number = 0; iCtr < layers.length; iCtr = iCtr + 1) {
      let layer: number = layers[iCtr];
      linkIndice[iCtr] = layer;
      if (super.isTabControl()) {
        if (layer < 0) {
          linkIndice[iCtr] = 0;
        }
        else {
          let line: number = this.getDisplayLine(false);
          if ( line < 0) {
            line = 0;
          }
          let layerList: string[] = this._choiceLayerList[line];
          if (layerList !== null && typeof layerList !== "undefined" && layerList.length !== 0 && layer < layerList.length) {
            linkIndice[iCtr] = NNumber.Parse(layerList[layer]) - 1;
          }
        }
      }
    }
    return linkIndice;
  }

  /// <summary>
  ///   recursive method, checks if parent of the child is visible\enable, ultil there is no parent or found
  ///   parent that is hidden
  /// </summary>
  /// <param name = "propId"></param>
  /// <returns></returns>
  isParentPropValue(propId: number): boolean {
    let column: MgControlBase = this.Form.getControlColumn(this);
    let parent: MgControlBase = this.getLinkedParent(true);

    let result: boolean;

    if (parent === null) {
      // no more parents
      result = true;
    }
    else {
      // parent is hidden
      if (!parent.GetComputedBooleanProperty(propId, true)) {
        result = false;
      }
      else {
        if (!parent.isChildOnCurrentLayer(this)) {
          // parent is tab control with current layer
          // different from child's layer
          result = false;
        }
        else {
          // for table children check if column visible
          result = (!(column !== null && !column.GetComputedBooleanProperty(propId, true)) && parent.isParentPropValue(propId));
        }
      }
    }
    return result;
  }

  /// <summary>
  ///   Get control to which this control is linked
  /// </summary>
  /// <param name = "checkSubformFather">if true check for Subform control</param>
  /// <returns></returns>
  getLinkedParent(checkSubformFather: boolean): MgControlBase {

    if (this._linkedParentDitIdx !== -1) {
      return this.Form.getCtrl(this._linkedParentDitIdx);
    }
    else {
      if (checkSubformFather && this.Form.isSubForm()) {
        return this.Form.getSubFormCtrl();
      }
      else {
        return null;
      }
    }
  }
  /// <summary>
  ///   sets the current line value of the readOnly history array
  /// </summary>
  /// <param name = "newVal">the new value to be set</param>
  SetCurrReadOnly(newVal: boolean): void {
    this._currReadOnly.set_Item(this.getDisplayLine(true), newVal);
  }

  /// <summary>
  ///   return the current readOnly value according to the control's current line number
  /// </summary>
  /// <returns> the readOnly value</returns>
  GetCurrReadOnly(): boolean {
    let line: number = super.isTableControl() ? 0 : this.getDisplayLine(true);
    let currObj: any = this._currReadOnly.get_Item(line);
    let curr: boolean;
    if (currObj === null) {
      curr = false;
      this._currReadOnly.set_Item(line, curr);
    }
    else {
      curr = <boolean>currObj;
    }
    return curr;
  }

  /// <summary>
  ///   returns true if this control is a Data Control
  /// </summary>
  isDataCtrl(): boolean {
    return this._dataCtrl;
  }

  /// <summary>
  ///   return the dcref according to the current line number
  /// </summary>
  /// <returns> the dcId</returns>
  getDcRef(): number {
    let line: number = this.getDcLineNum();
    let obj: any = this._dcTableRefs.get_Item(this.getDcLineNum());
    let dcId: number;
    if (obj === null) {
      dcId = -2;
      this._dcTableRefs.set_Item(line, dcId);
    }
    else {
      dcId = <number>obj;
    }
    return dcId;
  }

  /// <summary>
  ///   returns the current line number for a data control
  /// </summary>
  private getDcLineNum(): number {
    return this.IsRepeatable ? this.Form.DisplayLine : 0;
  }

  /// <summary>
  ///   check if the one choice option from items list is valid. The check is only for items list and not for the
  ///   data source options, (FYI: for the option from the DataCtrl, we are not calling this
  ///   method, NO CHECK IS DONE) in online :ci_check_range_str
  /// </summary>
  /// <param name = "option:">one option from the items list</param>
  /// <returns></returns>
  private optionIsValid(option: string): boolean {
    let isValid: boolean = true;

    if (this.DataType === StorageAttribute.NUMERIC && option.length > 0 && option.indexOf('0') === -1) {
      let convertNum: NUM_TYPE = new NUM_TYPE();
      convertNum.num_4_a_std(option);
      if (convertNum.num_is_zero()) {
        isValid = false;
      }
    }
    return isValid;
  }

  /// <summary>
  ///   prepares and returns the ordered list based on layers in layerList
  /// </summary>
  /// <param name = "choiceDispList">unordered list</param>
  /// <returns></returns>
  private getOrderedDispList(choiceDispList: string[], line: number): string[] {

    let choiceLayerStr: string = "";
    let dispArryList: List<string> = new List<string>();
    let layerArryList: List<string> = new List<string>();
    let layerProp: Property = this.getProp(PropInterface.PROP_TYPE_VISIBLE_LAYERS_LIST);

    if (layerProp !== null) {
      choiceLayerStr = layerProp.getValue();
    }

    if (choiceLayerStr === null || StrUtil.rtrim(choiceLayerStr).length === 0) {
      choiceLayerStr = "";
    }
    if (choiceLayerStr.length > 0 && choiceDispList.length > 0) {
      let layerList: string[] = choiceLayerStr.split(",");
      let posCopyIndex: number = -1;
      for (let index: number = 0; index < layerList.length; index = index + 1) {
        let currLayerListVal: string = layerList[index].trim();
        if (!(layerArryList.indexOf(currLayerListVal) !== -1)) {
            let refPosCopyIndex: RefParam<number> = new RefParam<number>(posCopyIndex);
            let isNumber: boolean = NNumber.TryParse(currLayerListVal, refPosCopyIndex);
            posCopyIndex = refPosCopyIndex.value;

          // posCopyIndex is 1Based, so must not be zero. Also, it must not be
          // greater than no of elements in the DiplayList.

          if (isNumber && posCopyIndex > 0 && posCopyIndex <= choiceDispList.length) {
            dispArryList.push((choiceDispList[posCopyIndex - 1]).trim());
            layerArryList.push(currLayerListVal);
          }
        }
      }
    }

    let result: string[];
    if (dispArryList.length === 0) {
      result = choiceDispList;
      this._choiceLayerList.set_Item(line, new Array<string>(0));
    }
    else {
      result = new Array<string>(dispArryList.length);
      for (let _ai: number = 0; _ai < result.length; ++_ai)
        result[_ai] = null;

      result = dispArryList.ToArray();
      this._choiceLayerList.set_Item(line, layerArryList.ToArray());
    }
    return result;
  }

  /// <summary>
  ///   Create style from the properties on the form use by :
  ///   PROP_TYPE_HEBREW, PROP_TYPE_FRAMESET_STYLE
  /// </summary>
  properties2Style(): number {
    let style: number = 0;

    if (super.isTableControl()) {
      if ((this.getProp(PropInterface.PROP_TYPE_FRAMESET_STYLE)).getValueBoolean()) {
        style = (style || Styles.PROP_STYLE_RIGHT_TO_LEFT);
      }
    }
    if (super.isFrameSet()) {
      let frameSetStyle = (this.getProp(PropInterface.PROP_TYPE_FRAMESET_STYLE)).getValueInt();
      switch (frameSetStyle) {
        case FramesetStyle.None:
          Debug.Assert(false);
          break;
        case FramesetStyle.Vertical:
          style = (style || Styles.PROP_STYLE_VERTICAL);
          break;
        case FramesetStyle.Horizontal:
          style = (style || Styles.PROP_STYLE_HORIZONTAL);
          break;
      }
    }
    return style;
  }

  /// <summary>
  ///   reset the previous value
  /// </summary>
  resetPrevVal(): void {
    let line: number = this.getDisplayLine(true);
    if (line < 0) {
      line = 0;
    }
    this._prevValues.set_Item(line, null);
    this.setPrevIsNull_ToNull();
  }

  /// <summary>
  /// reset _dcValId to the empty value
  /// </summary>
  ResetDcValueId(): void {
    this._dcValId = EMPTY_DCREF;
  }

  /// <summary>
  ///   sets the prevIsNull value of the prevIsNull array
  ///   the newValue can be NULL or bool
  /// </summary>
  setPrevIsNull_ToNull(): void {
    this._prevIsNulls.set_Item(this.getDisplayLine(true), null);
  }

  /// <summary>
  ///
  /// </summary>
  /// <returns>true if an expression was set as the data</returns>
  expressionSetAsData(): boolean {
    return this._valExpId > 0;
  }

  /// <summary>
  ///   called whenever the choice list of a SELECT control has changed
  /// </summary>
  clearRange(line: number): void {
    this._orgChoiceDisps.set_Item(line, null);
    this._choiceDisps.set_Item(line, null);
    this._choiceLinks.set_Item(line, null);
    this._choiceLayerList.set_Item(line, null);
  }

  /// <summary>
  ///   have to check parent visibility\enable
  /// </summary>
  /// <returns>true, if the control is connected to a container or the task is a subfom</returns>
  haveToCheckParentValue(): boolean {
    let ret: boolean = false;
    if (this._linkedParentDitIdx !== -1) {

      if (!this.isContainedInLinkedParent()) {
        ret = true;
      }
      // contained tab children of all layers are on the same window,
      // so we must handle there visibility\enable

      else {
        if (this.Form.getCtrl(this._linkedParentDitIdx).isTabControl() || this.Form.getCtrl(this._linkedParentDitIdx).isGroup()) {
          ret = true;
        }
      }
    }
    else {
      if (this.Form.isSubForm()) {
        ret = true;
      }
    }
    return ret;
  }

  /// <summary>
  ///   returns true if control is contain in its linked parent
  /// </summary>
  /// <returns></returns>
  isContainedInLinkedParent(): boolean {
    return this._containerDitIdx !== -1 && this._containerDitIdx === this._linkedParentDitIdx;
  }

  /// <summary>
  ///   Combine two strings array into one. Each of the original arrays may be null.
  /// </summary>
  /// <param name = "firstStrings">the first strings array that will always occupy the first array cells</param>
  /// <param name = "lastStrings">the last strings array that will always occupy the last array cells</param>
  /// <returns> combined Strings array</returns>
  private static combineStringArrays(firstStrings: string[], lastStrings: string[]): string[] {
    let result: string[] = new Array<string>();

    if (firstStrings !== null)
      result = result.concat(firstStrings);

    if (lastStrings !== null)
      result = result.concat(lastStrings);

    return result;
  }

  /// <summary>
  ///   This method returns the control's immediate parent. Made specifically for cases in which
  ///   the parent is a column, in which case the control's linked parent will be the table
  /// </summary>
  /// <returns> the control's parent</returns>
  getImmediateParent(): MgControlBase {
    let parent: MgControlBase = this.getLinkedParent(false);
    if (parent !== null && parent.isTableControl() && !super.isColumnControl()) {
      let parentColumn: MgControlBase = this.Form.getControlColumn(this);
      if (parentColumn !== null) {
        parent = parentColumn;
      }
    }
    return parent;
  }

  GetComputedBooleanProperty(propId: number, defaultRetVal: boolean, line?: number): boolean {
    if (arguments.length === 2 && (propId === null || propId.constructor === Number) && (defaultRetVal === null || defaultRetVal.constructor === Boolean)) {
      return this.GetComputedBooleanProperty_0(propId, defaultRetVal);
    }
    return this.GetComputedBooleanProperty_1(propId, defaultRetVal, line);
  }

  /// <summary>
  /// return the boolean computed value of a property of the control
  /// </summary>
  /// <param name = "propId">the id of the property</param>
  /// <param name = "defaultRetVal">the default return value (when the property does not exist)</param>
  private GetComputedBooleanProperty_0(propId: number, defaultRetVal: boolean): boolean {
    let result: boolean = defaultRetVal;
    let prop: Property = this.GetComputedProperty(propId);
    if (prop !== null) {
      result = prop.GetComputedValueBoolean();
    }
    return result;
  }
  /// <summary>
  /// return the boolean value of a property of the control - if the control is repeatable and the line is
  /// different than the forms current line then return the previous value of the control property at that line
  /// </summary>
  /// <param name = "propId">the id of the property</param>
  /// <param name = "defaultRetVal">the default return value (when the property does not exist)</param>
  /// <param name = "line">the line number in table in which the control is located</param>
  private GetComputedBooleanProperty_1(propId: number, defaultRetVal: boolean, line: number): boolean {
    let result: boolean = defaultRetVal;

    if (this.isPropertyRepeatable(propId) && this.Form.DisplayLine !== line) {
      let prop: Property = this.GetComputedProperty(propId);
      if (prop !== null) {
        let val: string = prop.getPrevValue(line);
        if (val !== null) {
          result = DisplayConvertor.toBoolean(val);
        }
      }
    }
    else {
      result = this.GetComputedBooleanProperty(propId, defaultRetVal);
    }
    return result;
  }

  /// <summary>
  ///   return the boolean value of a property of the control - if the control is repeatable and the line is
  ///   different than the forms current line then return the previous value of the control property at that
  ///   line
  /// </summary>
  /// <param name = "propId">the id of the property</param>
  /// <param name = "defaultRetVal">the default return value (when the property does not exist)</param>
  /// <param name = "line">the line number in table in which the control is located</param>
  checkPropWithLine(propId: number, defaultRetVal: boolean, line: number): boolean {
    let result: boolean = defaultRetVal;

    if (this.isPropertyRepeatable(propId) && this.Form.DisplayLine !== line) {
      let prop: Property = this.getProp(propId);
      if (prop !== null) {
        let val: string = prop.getPrevValue(line);
        if (val !== null) {
          result = DisplayConvertor.toBoolean(val);
        }
      }
    }
    else {
      result = this.checkProp(propId, defaultRetVal);
    }
    return result;
  }

  /// <summary>
  ///   return the boolean value of a property of the control
  /// </summary>
  /// <param name = "propId">the id of the property</param>
  /// <param name = "defaultRetVal">the default return value (when the property does not exist)</param>
  checkProp(propId: number, defaultRetVal: boolean): boolean {
    let result: boolean = defaultRetVal;
    let prop: Property = this.getProp(propId);
    if (prop !== null) {
      result = prop.getValueBoolean();
    }
    return result;
  }

  /// <summary></summary>
  /// <returns></returns>
  getPrevIsNullsInArray(): boolean {
    return this.getPrevIsNull();
  }

  /// <summary>
  ///   returns true if propId property is repeatable for this control
  /// </summary>
  /// <param name = "propId"></param>
  /// <returns></returns>
  isPropertyRepeatable(propId: number): boolean {
    let isRepeatable: boolean = this.IsRepeatable;
    if (isRepeatable) {
      return true;
    }
    else {
      return super.isTableControl() && Property.isRepeatableInTable(propId);
    }
  }

  /// <summary>
  /// </summary>
  /// <param name = "line"></param>
  /// <returns></returns>
  getPrevValueInArray(line: number): string {
    return this._prevValues.get_Item(line);
  }

  /// <summary> copy the value of one control to the other without modifying the prevValues</summary>
  /// <param name="fromControl">the source control</param>
  copyValFrom(fromControl: MgControlBase): void {
    let line: number = this.getDisplayLine(true);
    let savedVal: string = this.Value;
    let savePrevValue: string = this._prevValues.get_Item(line);
    let savedIsNull: boolean = this.IsNull;
    let savePrevIsNull: boolean = this.getPrevIsNull();

    let dispVal: string = Manager.GetCtrlVal(fromControl);
    let mgValue: string = fromControl.getMgValue(dispVal);

    this.resetPrevVal(); // force update of the display
    this.SetAndRefreshDisplayValue(mgValue, this.isNullValue(mgValue), true);

    this.setValueForEditSet(savedVal, savePrevValue, savedIsNull, savePrevIsNull);
  }

  /// <summary>
  ///   return the value of the control
  /// </summary>
  setValueForEditSet(savedValue: string, savePrevValue: string, savedIsNull: boolean, savePrevIsNull: boolean): void {

    // set value changes the value, we need to restore previous value so CTRL suffix will know that value is changed
    this.Value = savedValue;
    this._prevValues.set_Item(this.getDisplayLine(true), savePrevValue);

    this.IsNull = savedIsNull;
    this.setPrevIsNull(savePrevIsNull);
  }
  /// <summary>
  /// set the value of the control and update the display
  /// </summary>
  /// <param name = "mgVal">the value of the control in magic internal format to be displayed</param>
  /// <param name="isNull"></param>
  /// <param name="fromEditSet"></param>
  SetAndRefreshDisplayValue(mgVal: string, isNull: boolean, fromEditSet: boolean): void {
    let dcRangeIsEmpty: boolean = true;

    if (mgVal === null) {
      this.Value = "";
      // QCR 308475 - controls that are Initialized with null should be given magic default value.
      if (isNull) {
        mgVal = (FieldDef.getMagicDefaultNullDisplayValue(this.DataType) || FieldDef.getMagicDefaultValue(this.DataType));
      }
      else {
        mgVal = FieldDef.getMagicDefaultValue(this.DataType);
      }

      // If we still cannot get mgVal...this is a problem
      if ( mgVal === null) {
        Debug.Assert(false);
        return;
      }
    }
    else {
      if (super.isChoiceControl()) {
        let line: number = this.getDisplayLine(true);
        if ( line < 0) {
          line = 0;
        }
        let layers: number[] = this.getLayerFromLinkIdx(this.getIndexOfChoice(mgVal, line, isNull));

        // We do not allow no selection for a tab control.
        // So, if there is no Tab to be selected, select the first Tab and
        // also update the field's value accordingly.

        if (layers[0] < 0 && super.isTabControl()) {
          layers[0] = 0;
          mgVal = this.getLinkValue(layers[0].toString(), line);
          isNull = false;
          if (this._field !== null && mgVal !== null) {
            (<TaskBase>this._field.getTask()).UpdateFieldValueAndStartRecompute(this._field, mgVal, isNull);
          }
        }
        this.Value = Misc.GetCommaSeperatedString(layers);
        dcRangeIsEmpty = false;
      }
    }

    // QCR #450248: an empty range in the data control caused deleting the value
    // of the control when leaving it. Now, the range of the control is used when
    // the data control range is empty.
    if (dcRangeIsEmpty) {
      if (!super.isCheckBox() && (this._field === null || !isNull || !this._field.hasNullDisplayValue() || fromEditSet)) {
        try {
          if ((super.isImageControl() && this.DataType === StorageAttribute.BLOB) || super.IsImageButton()) {
            this.Value = mgVal;
          }
          else {
            if ((this._field === null && isNull) && (this.DataType === StorageAttribute.NUMERIC || this.DataType === StorageAttribute.DATE || this.DataType === StorageAttribute.TIME || this.DataType === StorageAttribute.BOOLEAN)) {
              this.Value = mgVal;
            }
            else {
              let inControl: boolean = this.InControl;
              this.Value = DisplayConvertor.Instance.mg2disp(mgVal, this._range, this._pic, true, super.isSelectionCtrl(), this.getForm().getTask().getCompIdx(), inControl);
            }
          }
          // Defect # 138803 : Fix to provide backwards compatibility for uniPaaS. Do not call rtrimValue() when refreshing the display if the data type
          // is not numeric or left justify property is No.
          if (typeof this.Value === 'string' && (!this._pic.isAttrNumeric() || this._pic.isLeft())) {
            this.rtrimValue();
          }
        } catch (innerException) {
          if (innerException instanceof ApplicationException) {
            Events.WriteExceptionToLog(new ApplicationException(NString.Format("Control: '{0}', mgval: {1}", this.Name, mgVal), innerException));
            this.Value = "";
            mgVal = FieldDef.getMagicDefaultValue(this.DataType);
          }
          else
            throw innerException;
        }
      }
      else {

        // truncate the "null display value" by the length of the mask
        // blobs have pic the size == 0. no truncation.
        if (isNull && !this._pic.isAttrBlob() && mgVal.length > this._pic.getMaskLength()) {
          mgVal = mgVal.substr(0, this._pic.getMaskLength());
        }
        if (this.isCheckBox())
          this.Value = DisplayConvertor.toBoolean(mgVal);
        else
          this.Value = mgVal;
      }
    }
    // Translate logical name for image control.
    if ((super.isImageControl() && this.DataType !== StorageAttribute.BLOB) || super.IsImageButton()) {
      mgVal = Events.TranslateLogicalName(mgVal);
    }
    this.IsNull = isNull;
    this.RefreshDisplayValue(mgVal);
  }

  /// <summary> Checks if the control's value is modified and if so, updates the ModifiedByUser </summary>
  /// <param name="newValue"></param>
  UpdateModifiedByUser(newValue: string): void {

    // For image control and image button, the value would not be changed by the user. But, if it has
    // a logical name, it is replaced. Or if it is fileServer get, the value is replaced by a server url.
    // In both these cases, we should not mark it as modified.
    if (!(super.isButton() || super.isImageControl())) {
      let ctrlCurrIsNull: boolean = this.IsNull;
      let valChanged: boolean = (this.isDifferentValue(newValue, false, false));

      // if the value didn't change then let's check if the nullity have changed
      if (!valChanged) {
        if (this.CanGetNullFromControlValue()) {
          valChanged = (ctrlCurrIsNull !== this.isNullValue(newValue));
        }
      }
      if (valChanged || this.KeyStrokeOn) {
        this.ModifiedByUser = true;
      }
    }
  }

  /// <summary>
  ///   RTrims the control value
  /// </summary>
  private rtrimValue(): void {
    if ((super.isImageControl() && this.DataType === StorageAttribute.BLOB) || super.IsImageButton()) {
      this.Value = NString.TrimEnd(this.Value);
    }
    else {
      let minimumValueLength: number = this.getMinimumValueLength();
      // RTrim the value beyond this index
      if (this.Value.length > minimumValueLength) {
        let str: string = this.Value.substr(minimumValueLength);

        // copy the minimum length value as is
        this.Value = this.Value.substr(0, minimumValueLength);
        // rtrim the value beyond minimum length
        this.Value = this.Value + StrUtil.rtrimWithNull(str, true);
      }

      // always trim the numeric value.
      if (super.isTextControl() && this.DataType === StorageAttribute.NUMERIC) {
        this.Value = NString.TrimEnd(this.Value);
      }
    }
  }

  /// <summary>
  ///   returns the minimum value length
  /// </summary>
  private getMinimumValueLength(): number {
    let minLength: number = this._pic.getMaskLength();

    // traverse from right till a valid mask char is encountered
    while (minLength > 0 && !this._pic.picIsMask(minLength - 1)) {
      minLength = minLength - 1;
    }
    return minLength;
  }

  /// <summary>
  /// </summary>
  /// <returns></returns>
  isNullValue(str: string): boolean {
    let retIsNullControl: boolean = false;
    if (this.CanGetNullFromControlValue() && str === "") {
      retIsNullControl = true;
    }
    return retIsNullControl;
  }

  /// <summary>
  ///   this control can get null value from the control himself
  /// </summary>
  /// <returns></returns>
  CanGetNullFromControlValue(): boolean {
    let canGetNullFromControlValue: boolean = false;
    if (super.isCheckBox()) {
      if (this._field === null || this._field.NullAllowed) {
        canGetNullFromControlValue = this.checkProp(PropInterface.PROP_TYPE_THREE_STATES, false);
      }
    }
    return canGetNullFromControlValue;
  }

  /// <summary>
  ///   returns true if a specific index corresponds to a null value.
  /// </summary>
  isChoiceNull(idx: number): boolean {
    let result: boolean;
    if (idx >= 0) {
      let dcVals: DcValues = this.getDcVals();
      return dcVals.isNull(idx);
    }
    else {
      return result;
    }
  }

  /// <summary>
  ///   sets the property
  /// </summary>
  /// <param name = "propId"></param>
  /// <param name = "val"></param>
   setProp(propId: number, val: string): void {
    if (this._propTab === null) {
      this._propTab = new PropTable(this);
    }
    this._propTab.setProp(propId, val, this, GuiConstants.PARENT_TYPE_CONTROL)/*'C'*/;
  }

  /// <summary>
  ///   refresh the prompt of the control
  /// </summary>
  refreshPrompt(): void {
    this.EvaluatePromptHelp();
    if (!NString.IsNullOrEmpty(this.PromptHelp)) {
      Manager.WriteToMessagePane(this.getForm().getTask(), this.PromptHelp, false);
    }
  }

  /// <summary> Computes the control's value either from expression or field and refreshes the GUI </summary>
  /// <param name="forceRefresh"></param>
  ComputeAndRefreshDisplayValue(forceRefresh: boolean): void {
    if (forceRefresh) {
      this.resetPrevVal();
    }

    if (this._valExpId > 0) {
      let wasEvaluated: boolean;
      let refWasEvaluated: RefParam<boolean> = new RefParam<boolean>(wasEvaluated);

      let retExp: string =
        this.EvaluateExpression(this._valExpId, this.DataType, this._pic.getSize(), true, StorageAttribute.SKIP, false, refWasEvaluated);
        wasEvaluated = refWasEvaluated.value;
      if (wasEvaluated) {
        this.SetAndRefreshDisplayValue(retExp, retExp === null, false);
      }
    }
    else {
      if (this._field !== null) {
        let value: string = NString.Empty;
        let isNull: boolean = false;
        let refValue: RefParam<string> = new RefParam<string>(value);
        let refIsNull: RefParam<boolean> = new RefParam<boolean>(isNull);
        (<TaskBase>this._field.getTask()).getFieldDisplayValue(this._field, refValue, refIsNull);
        value = refValue.value;
        isNull = refIsNull.value;
        this.SetAndRefreshDisplayValue(value, isNull, false);
      }
      else {
        if (!super.isTableControl() && !super.isColumnControl() && !super.isFrameSet()) {
          this.RefreshDisplayValue(this.Value);
        }
      }
    }
  }
  /// <summary>
  /// Decides if the control should be refreshed while entering a control. Values for some data types
  /// are displayed differently while parked on the control.
  /// </summary>
  /// <returns></returns>
  ShouldRefreshOnControlEnter(): boolean {
    return this.Type === MgControlType.CTRL_TYPE_TEXT && this.getField() !== null && (this.getField().getType() === StorageAttribute.DATE ||
      this.getField().getType() === StorageAttribute.TIME || this.getField().getType() === StorageAttribute.NUMERIC);
  }

  /// <summary>
  ///   refresh the displayed value only (without the other properties of the control)
  /// </summary>
  /// <param name = "mgVal">is the magic internal value of the presentation value</param>
  RefreshDisplayValue(mgVal: string): void {
    let line: number = this.getDisplayLine(true);
    let valueChanged: boolean = true;
    let saveValueChanged: boolean = valueChanged;

    if (line < 0) {
      line = 0;
    }
    // ATTENTION:
    // the use of the function getName() instead of using the name member variable
    // is to enhance the use of controls which are contained in a table
    // update the display

    // When emptyDataview is on - the tree control has no rows - this is different from any other control
    // which always has at least one row


    if (this.getForm().getTask().DataView.isEmptyDataview())
      return;

    try {

      let prevValue: string = this._prevValues.get_Item(line);
      let prevNull: boolean = this.getPrevIsNull();

      if (StorageAttributeCheck.IsTypeAlphaOrUnicode(this.DataType)) {
        if (StrUtil.rtrim(mgVal) === StrUtil.rtrim(prevValue) ||
          (mgVal !== null && StrUtil.rtrim(mgVal) === StrUtil.rtrim(prevValue))) {
          valueChanged = false;
        }

        if (prevNull !== this.IsNull) {
          valueChanged = true;
        }
      }
      else {
        if (mgVal === prevValue || (mgVal !== null && mgVal === prevValue))
          valueChanged = false;

        if (prevNull !== this.IsNull)
          valueChanged = true;

      }
      this._prevValues.set_Item(line, mgVal);
      this.setPrevIsNull(this.IsNull);

      switch (this.Type) {
        case MgControlType.CTRL_TYPE_TABLE:
        case MgControlType.CTRL_TYPE_COLUMN:
        case MgControlType.CTRL_TYPE_LABEL:
        case MgControlType.CTRL_TYPE_SUBFORM:
        case MgControlType.CTRL_TYPE_GROUP:
        case MgControlType.CTRL_TYPE_STATUS_BAR:
        case MgControlType.CTRL_TYPE_FRAME_SET:
        case MgControlType.CTRL_TYPE_CONTAINER:
        case MgControlType.CTRL_TYPE_FRAME_FORM:
        case MgControlType.CTRL_TYPE_SB_LABEL:
        case MgControlType.CTRL_TYPE_LINE:
          return;

        case MgControlType.CTRL_TYPE_BROWSER:
          if (valueChanged && this.Value != null)
            this.setUrl();
          return;

        case MgControlType.CTRL_TYPE_IMAGE:
        case MgControlType.CTRL_TYPE_SB_IMAGE:
          if (valueChanged && this.Value != null)
              this.setImage();
            return;

        case MgControlType.CTRL_TYPE_CHECKBOX:
          if (valueChanged)
            this.setCheckBoxValue(line, mgVal);
          return;

        case MgControlType.CTRL_TYPE_TAB:
        case MgControlType.CTRL_TYPE_COMBO:
        case MgControlType.CTRL_TYPE_LIST:
            saveValueChanged = valueChanged;
            valueChanged = this.refreshAndSetItemListByDataSource(line, valueChanged);
            if (valueChanged) {
              // fixed bug#:776215, 800763,941841, the prevValue is save as mgval need to convert to layer
              let prevDisplayValue: number[] = null;

            // Fix bug#:784391
            // If ItemList was update refreshAndSetItemListByDataSource then the value must be set

              if (saveValueChanged === valueChanged) {
                if (prevValue !== null) {
                  prevDisplayValue = this.getLayerFromLinkIdx(this.getIndexOfChoice(prevValue, line, prevNull));
                  for (let i: number = 0; i < prevDisplayValue.length; i = i + 1) {
                    if (prevDisplayValue[i] === GuiConstants.DEFAULT_VALUE_INT) {
                      prevDisplayValue[i] = GuiConstants.DEFAULT_LIST_VALUE;
                    }
                  }
                }
              }
              let indice = Misc.GetIntArray(this.Value);

              if (this.isTabControl())
                Commands.addOperationWithLine(CommandType.SET_PROPERTY, this, line, "selectedvalue", indice[0].toString());

              GuiCommandQueue.getInstance().add(CommandType.PROP_SET_SELECTION, this, line, this.Value, prevDisplayValue, this.InSetToDefaultValue);

              if (this.IsMultipleSelectionListBox()) {
                Commands.addValueWithLine(CommandType.SET_VALUE, this, line, indice);
              }
              else
                Commands.addValueWithLine(CommandType.SET_VALUE, this, line, +this.Value);
            }
            break;

        case MgControlType.CTRL_TYPE_BUTTON:
        case MgControlType.CTRL_TYPE_TEXT:
          if (valueChanged) {
            // if (form.formRefreshed() || forceRefresh || valExp != null &&
            // valExp.computedByClientOnly())
            if (this.IsImageButton()) {
              this.setImageWithFileName(this.Value);
            }
            else
              this.setText();
          }
          else
            return;
          break;

          case MgControlType.CTRL_TYPE_RADIO:
            valueChanged = this.refreshAndSetItemListByDataSource(line, valueChanged);
            if (!valueChanged)
              return;
            this.setRadioChecked(NNumber.Parse(this.Value));
            // setRadioChecked(value .length() == 0 ? DEFAULT_VALUE_INT : Integer.parseInt(value));
            // if (!task.startProcess())
            // guiManager.setFocus(this);
            break;

        default:
          Events.WriteExceptionToLog(NString.Format("in Control.RefreshDisplayValue() unknown type: {0}", this.Type));
          return;
      }

        if (super.isChoiceControl() && valueChanged)
          this.updatePropertyLogicNesting(PropInterface.PROP_TYPE_VISIBLE, CommandType.PROP_SET_VISIBLE, this.checkProp(PropInterface.PROP_TYPE_VISIBLE, true), false);
      } catch (ex_360) {
            if (ex_360 instanceof Exception) {
              Events.WriteExceptionToLog(NString.Format("in Control.RefreshDisplayValue() for control: {0}", this.Name));
            }
            else
              throw ex_360;
          }
  }

  RefreshDisplay(onlyRepeatableProps?: boolean): void {
    if (isNullOrUndefined(onlyRepeatableProps))
      this.RefreshDisplay_1(false);
    this.RefreshDisplay_1(onlyRepeatableProps);
  }

  /// <summary>
  ///   updates the display of the control including its value and its properties
  /// </summary>
  /// <param name = "onlyRepeatableProps">if control tree - refreshes only repeatable tree properties</param>
  private RefreshDisplay_1(onlyRepeatableProps: boolean): void {

    // #422250. Skip the refresh display of the parent's subform control if the form inside it is still in its RefreshDisplay.
    if (!(super.isSubform() && this.GetSubformMgForm() !== null && this.GetSubformMgForm().inRefreshDisplay())) {

      // update the properties
      this.refreshProperties(onlyRepeatableProps);

      // compute and display the value.
      if (this.ShouldComputeAndRefreshOnClosedForm()) {
        this.ComputeAndRefreshDisplayValue(false);
      }

      // executes the readonly command only if needed
      let isParkableCtrl: boolean = !(this.isParkable(false, false)) || !this.isModifiable();

      if (this.GetCurrReadOnly() !== isParkableCtrl) {
        this.SetCurrReadOnly(isParkableCtrl);
        Manager.SetReadOnlyControl(this, isParkableCtrl);
      }

      let mustInputProperty: Property = this.GetComputedProperty(PropInterface.PROP_TYPE_MUST_INPUT);
      // need to compute and refresh the display if the control's data is an expression
      // or the format is expression. When the format is changed, the display val may change as well.
      if (mustInputProperty != null && mustInputProperty.isExpression()) {

        if (this.checkProp(PropInterface.PROP_TYPE_MUST_INPUT, false) && this.isModifiable())
          Commands.addOperationWithLine(CommandType.SET_PROPERTY, this, this.getDisplayLine(false), "mustInput", true);
      }

      if (!this.GetComputedBooleanProperty(PropInterface.PROP_TYPE_TAB_IN, true))
        Commands.addOperationWithLine(CommandType.SET_PROPERTY, this, this.getDisplayLine(false), "tabindex", -1);

    }
  }

  /// <summary>
  /// For Rich Client compute and refresh the value of the control always, also if the form is not yet opened.
  /// For Online only for opened forms.
  /// </summary>
  /// <returns></returns>
  ShouldComputeAndRefreshOnClosedForm(): boolean {
    return true;
  }

  /// <summary> Refreshes the properties of the control. </summary>
  /// <param name="onlyRepeatableProps"></param>
  refreshProperties(onlyRepeatableProps: boolean): void {

    if (this._field !== null && this.DataType !== StorageAttribute.NONE && this._firstRefreshProperties)
      Commands.addWithNumber(CommandType.SET_ATTRIBUTE, this, this.DataType.charCodeAt(0));

    if (this._propTab !== null) {
      try {

        if (this._firstRefreshProperties) {
          this.createDefaultProps();
        }
        this.RefreshPriorityProperties();
        if (!(this._propTab.RefreshDisplay(false, onlyRepeatableProps))) {
          Events.WriteExceptionToLog(NString.Format("Control '{0}': Not all properties could be set", this.getName()));
        }

        if (this._firstRefreshProperties) {
          if (super.isContainer() || super.isFrameSet()) {
            this.createLayout();
          }
          if ( !onlyRepeatableProps) {
            this._firstRefreshProperties = false;
          }
        }
      } catch (ex) {
        if (ex instanceof Exception) {
          let msg: StringBuilder = new StringBuilder(NString.Format("Control '{0}': {1}", this.getName(), ex.Message));
          Events.WriteExceptionToLog(msg.ToString());
        }
        else
          throw ex;
      }
    }
  }

  /// <summary>
  /// Set properties that should be before some properties
  /// </summary>
  private RefreshPriorityProperties(): void {

    // In case of combobox, style should be set before height
    if (super.isComboBox()) {
      let prop: Property = this.getProp(PropInterface.PROP_TYPE_STYLE_3D);
      prop.RefreshDisplay(true);
    }
    // In case of table control, multi column display should be set before row height
    if (super.isTableControl()) {
      let prop2: Property = this.getProp(PropInterface.PROP_TYPE_MULTI_COLUMN_DISPLAY);
      prop2.RefreshDisplay(true);
    }
  }

  /// <summary>
  /// </summary>
  refreshTabForLayerList(line: number): void {
    let currentLinkValue: string = null;

    // If the form has already opened, get the current link value before
    // changing the layer list i.e. before calling refreshAndSetItemsList().
    // And then, after changing the layer list, select the TAB corresponding
    // to the current link value.
    if (this.getForm().Opened) {
      let indice: number[] = this.getCurrentIndexOfChoice();
      let currentLayer: number = indice[0];
      currentLinkValue = this.getLinkValue(currentLayer.toString(), line);
    }
    this.refreshAndSetItemsList(line, false);
    if ( this.getForm().Opened) {
      this.SetAndRefreshDisplayValue(currentLinkValue, this.IsNull, false);
    }
  }

  /// <summary>
  ///   refresh the item list of radio button
  /// </summary>
  /// <param name="line">Display line</param>
  /// <param name="execComputeChoice"></param>
  refreshAndSetItemsListForRadioButton(line: number, execComputeChoice: boolean): void {

    // 1. create the button for each items list
    let displayList: string[] = this.refreshDispRange(execComputeChoice);

    let options = displayList.map((realString, counter, arr)=>
      {
        let index: string = counter.toString();
        return {index, realString}
      });
    // creates new radio buttons from display list.
    //Commands.addAsync(CommandType.PROP_SET_ITEMS_LIST, this, line, displayList, this.InSetToDefaultValue);
    Commands.addOperationWithLine(CommandType.SET_PROPERTY, this, line, "itemslist", options);

    // Optimization : We need to set properties only for screen mode program.
    // For a line mode program, properties are set by LgRadioContainer.
    if (!this.IsRepeatable) {
      // 3. after add the new radio buttons controls, need to refresh some property on them.
      // each time we remove the controls we must refresh the all properties that effect the buttons.
      // we get to this method also onLable() \ onDisplayList() \ onVisibleLayerList()
      let imageFileNameProperty: Property = this.getProp(PropInterface.PROP_TYPE_IMAGE_FILENAME);

      if (imageFileNameProperty !== null)
        imageFileNameProperty.RefreshDisplay(true);

      // 3. after add the radio button need to set the layout so the controls will be resize automatically
      Commands.addAsync(CommandType.RESUME_LAYOUT, this, line, false);
      Commands.addAsync(CommandType.EXECUTE_LAYOUT, this, line, false);
    }
  }


  /// <summary>
  ///   refresh the item list and set it into the gui control if it is combo box , refresh also the visible
  ///   lines
  /// </summary>
  refreshAndSetItemsList(line: number, execComputeChoice: boolean): void {
    if (execComputeChoice) {
      this.clearRange(line);
    }
    let optionsStrings: string[] = this.refreshDispRange(execComputeChoice);
    if (super.isSelectionCtrl() || super.isTabControl()) {
     // Commands.addAsync(CommandType.PROP_SET_ITEMS_LIST, this, line, optionsStrings, this.InSetToDefaultValue);
      let options = optionsStrings.map((realString, index, arr)=>{ return {index, realString}});

        Commands.addOperationWithLine(CommandType.SET_PROPERTY, this, line, "itemslist", options);

    }
    else {
      if (super.isRadio()) {
        this.refreshAndSetItemsListForRadioButton(line, execComputeChoice);
      }
    }
    if (this.Type === MgControlType.CTRL_TYPE_COMBO) {
      (this.getProp(PropInterface.PROP_TYPE_VISIBLE_LINES)).RefreshDisplay(true);
    }
    else {
      if (super.isTabControl()) {
        (this.getProp(PropInterface.PROP_TYPE_IMAGE_LIST_INDEXES)).RefreshDisplay(true);
      }
    }
  }

  /// <summary>
  ///   refresh the choice list of a SELECT control
  /// </summary>
  refreshDispRange(execComputeChoice: boolean): string[] {
    let selectCmd: string[] = new Array<string>(0);
    let line: number = this.getDisplayLine(true);

    if (line < 0) {
      line = 0;
    }
    if (this.SupportsDataSource()) {
      let dataView: DataViewBase = this.getForm().getTask().DataView;
      let dcv: DcValues = dataView.getDcValues(this._dcValId);
      let dispVals: string[] = this.getDispVals(line, execComputeChoice);

      if ( this._hasValidItmAndDispVal) {
        selectCmd = MgControlBase.combineStringArrays(dispVals, dcv.getDispVals());
      }
    }
    else {
      selectCmd = this.getDispVals(line, execComputeChoice);
    }
    this._rangeChanged = true;
    return this.getOrderedDispList(selectCmd, line);
  }

  /// <summary>
  /// refresh the items list of the selection control.
  /// </summary>
  /// <param name="execComputeChoice"></param>
  /// <returns></returns>
  refreshItmRange(execComputeChoice: boolean): string[] {

    // This function should be called only for selection control.
    Debug.Assert(this.SupportsDataSource());
    let orderedItmList: string[] = new Array<string>(0);
    let line: number = this.getDisplayLine(false);
    if (line < 0) {
      line = 0;
    }
    if (execComputeChoice) {
      this.computeChoice(line);
    }
    let linkVals: string[] = this._choiceLinks[line];
    let dataView: DataViewBase = this.getForm().getTask().DataView;
    let dcv: DcValues = dataView.getDcValues(this._dcValId);
    if (this._hasValidItmAndDispVal) {
      orderedItmList = MgControlBase.combineStringArrays(linkVals, dcv.GetLinkVals());
    }

    return this.getOrderedDispList(orderedItmList, line);
  }

  /// <summary>
  /// Get the items values from data source & item list property.
  /// </summary>
  /// <returns></returns>
  GetItemsRange(): string[] {
    return this.refreshItmRange(false);
  }
  /// <summary>
  /// Get the display values from data source & display list property.
  /// </summary>
  /// <returns></returns>
  GetDisplayRange(): string[] {
    return this.refreshDispRange(false);
  }
  /// <summary>
  ///
  /// </summary>
  /// <returns></returns>
  private createDefaultProps(): void {
    this.getProp(PropInterface.PROP_TYPE_VISIBLE);

    // Fixed bug#:781741
    // in 1.9 -->
    // when ask about any property(PROP_TYPE_ENABLED) we was created the default property with the default value(true).
    // and when get to RefreshProps of the property "PROP_TYPE_ENABLED" we was add command to the queue in gui thread
    // the command was was update the TagData.Enable to be "true"
    // in 2.0 -->
    // we useing a new method GetComputedBooleanProperty() that not created any default property and no get to refreshProp
    // on the property and the value on the Control.Enable was wrong
    this.getProp(PropInterface.PROP_TYPE_ENABLED);

    // fixed bug#:988383 when color = 0 for image Button we need to to SystemColor.Control
    if (super.IsImageButton()) {
      this.getProp(PropInterface.PROP_TYPE_COLOR);
    }
    if (super.isTableControl()) {
      this.getProp(PropInterface.PROP_TYPE_SCROLL_BAR);
    }
    if (super.isTextControl()) {
      this.getProp(PropInterface.PROP_TYPE_FOCUS_COLOR);
    }
  }
  /// <summary>
  ///   creates layout for container controls
  /// </summary>
  createLayout(): void {

    let rect: MgRectangle;
    if (super.isFrameSet()) {
      Commands.addAsync(CommandType.RESUME_LAYOUT, this);
    }
    else {
      if (this.isContainerControl()) {
        let frameForm: MgControlBase = this.getLinkedParent(false);
        Debug.Assert(frameForm.isFrameFormControl());
        let autoFit: number = (frameForm.getProp(PropInterface.PROP_TYPE_AUTO_FIT)).getValueInt();
        if (autoFit === AutoFit.None)
        // if we replace frame with AUTO_FIT_NONE we do placement
        // relatively to frame size
        // if regular case it will just prevent placement
          rect = frameForm.getRect();
        else
          rect = Property.getOrgRect(this);
      }
      else {
        rect = Property.getOrgRect(this);
      }

      // get coordinates that were defined on the controls originally,
      // i.e. before expression executed
      Commands.addAsync(CommandType.CREATE_PLACEMENT_LAYOUT, this, 0, rect.x, rect.y, rect.width, rect.height,
        false, false);
    }
  }

  /// <summary>
  ///   set Linked Parent Idx
  /// </summary>
  /// <param name="linkedParentDitIdx"></param>
  private setLinkedParentIdx(linkedParentDitIdx: number): void {
    this._linkedParentDitIdx = linkedParentDitIdx;
  }

  getNodeParentIdField(): FieldDef {
    return this._nodeParentIdField;
  }

  /// <summary>
  ///   get the validation details of the control
  /// </summary>
  /// <param name="oldVal"></param>
  /// <param name="val"></param>
  /// <returns></returns>
  buildPicture(oldVal: any, val: any): ValidationDetails {

    if (super.isTableControl() || super.isColumnControl())
      return null;

    if (this._picExpExists) {
      this._vd = null;
    }
    if ( this._vd === null) {
      this._vd = new ValidationDetails(oldVal, val, this._range, this._pic, this);
    }
    else {
      this._vd.setValue(val);
      this._vd.setOldValue(oldVal);
    }

    return this._vd;
  }

  /// <summary>
  ///   Checks if the sent value is different than the control's existing value.
  /// </summary>
  /// <param name = "NewValue"></param>
  /// <param name="isNull"></param>
  /// <param name="checkNullValue"></param>
  /// <returns></returns>
  isDifferentValue(newValue: any, isNull: boolean, checkNullValue: boolean): boolean {

    let ctrlCurrValue: any = this.Value;
    let valChanged: boolean = false;

    if (newValue instanceof Date) {
      if (this.DataType === StorageAttribute.DATE)
        valChanged = !this.CompareDate(newValue, ctrlCurrValue);
      else
        valChanged = !this.CompareTime(newValue, ctrlCurrValue);
    }
    if (typeof newValue === 'boolean' || typeof newValue === 'number')
      valChanged = (newValue !== ctrlCurrValue) ;
    else
    {
      let ctrlCurrIsNull: boolean = this.IsNull;
      valChanged = !(StrUtil.rtrim(newValue) === StrUtil.rtrim(ctrlCurrValue));
      if (!valChanged && checkNullValue) {
        valChanged = (isNull !== ctrlCurrIsNull);
      }
    }
    return valChanged;
  }

  CompareDate (d1: Date, d2: Date): boolean
  {
    return (d1.getFullYear() === d2.getFullYear()
      && d1.getDate() === d2.getDate()
      && d1.getMonth() === d2.getMonth());
  }

  CompareTime (d1: Date, d2: Date): boolean
  {
    return (d1.getHours() === d2.getHours()
      && d1.getMinutes() === d2.getMinutes()
      && d1.getSeconds() === d2.getSeconds());
  }

  /// <summary>
  ///   returns true if column's sortable property is set to true
  /// </summary>
  /// <returns></returns>
  isColumnSortable(): boolean {
    let isSortable: boolean = false;

    if (this.Type === MgControlType.CTRL_TYPE_COLUMN && this._propTab.propExists(PropInterface.PROP_TYPE_SORT_COLUMN)) {
      isSortable = this._propTab.getPropById(PropInterface.PROP_TYPE_SORT_COLUMN).getValueBoolean();
    }
    return isSortable;
  }

  /// <summary>
  ///   returns first child MgControl of column i.e. field attached to column
  /// </summary>
  /// <returns></returns>

  getColumnChildControl(): MgControlBase {
    if (this.Type !== MgControlType.CTRL_TYPE_COLUMN)
      return null;

    let linkedControls: List<MgControlBase> = this._parentTable.getLinkedControls();

    return linkedControls.find((control: MgControlBase) => (control.getLayer() === this.getLayer() && control.Type !== MgControlType.CTRL_TYPE_COLUMN && !control.IsTableHeaderChild));
  }

  /// <summary>
  ///   Get control name for handler search propose.
  ///   The control itself, may not have a name for handler search (like column control, in which we need to use
  ///   the child control name for handlers search)
  /// </summary>
  /// <returns></returns>
  getControlNameForHandlerSearch(): string {
    let childControl: MgControlBase = this.getColumnChildControl();
    let name: string;
    if (childControl !== null) {
      return childControl.Name;
    }
    else
      return this.Name;
  }

  /// <summary>
  ///   set the sibling vec on the control
  /// </summary>
  /// <param name = "siblingVec"></param>
  setSiblingVec(siblingVec: List<MgControlBase>): void {
    this._siblingVec = siblingVec;
  }

  /// <summary>
  ///   add a control to the list of linked controls
  /// </summary>
  /// <returns></returns>
  linkCtrl(ctrl: MgControlBase): void {
    this._linkedControls.push(ctrl);
  }

  /// <summary>
  ///   get control's rectangle
  /// </summary>
  /// <returns></returns>
  getRect(): MgRectangle {
    let mgRectangle: MgRectangle = new MgRectangle();
    mgRectangle.x = NNumber.Parse((this.getProp(PropInterface.PROP_TYPE_LEFT)).getValue());
    mgRectangle.y = NNumber.Parse((this.getProp(PropInterface.PROP_TYPE_TOP)).getValue());
    mgRectangle.width = NNumber.Parse((this.getProp(PropInterface.PROP_TYPE_WIDTH)).getValue());
    mgRectangle.height = NNumber.Parse((this.getProp(PropInterface.PROP_TYPE_HEIGHT)).getValue());
    return this.Form.uom2pixRect(mgRectangle);
  }

  /// <summary>
  /// Update IsRepeatable for controls on table header. It should be set to false
  /// </summary>
  HeaderControlUpdateRepeatable(): void {

    if (!super.isColumnControl() && this._parentTable !== null && this.Layer > 0) {
      let controlY: number = NNumber.Parse((this.getProp(PropInterface.PROP_TYPE_TOP)).getOrgValue());
      let tableTitleY: number = NNumber.Parse((this._parentTable.getProp(PropInterface.PROP_TYPE_TOP)).getOrgValue());
      let titleHeight: number = NNumber.Parse((this._parentTable.getProp(PropInterface.PROP_TYPE_TITLE_HEIGHT)).getOrgValue());
      if (super.isLineControl()) {
        let y2: number = NNumber.Parse((this.getProp(PropInterface.PROP_TYPE_HEIGHT)).getOrgValue());
        controlY = Math.min(controlY, y2);
      }
      this.IsRepeatable = (controlY - tableTitleY >= titleHeight);
    }
  }

  /// <summary>
  ///   return original column width
  /// </summary>
  /// <returns></returns>
  getRtfVal(): string {
    return this._rtfVal;
  }

  /// <summary>
  ///   removes the reference to this control from the field
  /// </summary>
  removeRefFromField(): void {
    if (this._field !== null) {
      this._field.RemoveControl(this);
    }
  }

  /// <summary>
  ///   returns the dit index of the control
  /// </summary>
  getDitIdx(): number {
    return this._ditIdx;
  }

  /// <summary>
  /// sets dcValId
  /// </summary>
  /// <param name="dcValId"></param>
  setDcValId(dcValId: number): void {
    this._dcValId = dcValId;
  }

  /// <summary>
  ///   if the picture define as hebrew then set the lang to hebrew, otherwise restore the lang
  ///   The same we doing for online :edt_edit.cpp : SetKeyboardLanguage()
  /// </summary>
  /// <param name = "restoreLang"></param>
  SetKeyboardLanguage(restoreLang: boolean): void {
    let ctrlPic: PIC = this.getPIC();
    let setKeyBordLan: boolean = ctrlPic.isHebrew();

    if (super.isChoiceControl()) {
      setKeyBordLan = (this.getProp(PropInterface.PROP_TYPE_HEBREW)).getValueBoolean();
    }
    if (setKeyBordLan) {
      Commands.addAsync(CommandType.SET_ACTIVETE_KEYBOARD_LAYOUT, null, 0, setKeyBordLan, restoreLang);
    }
    Commands.beginInvoke();
  }

  /// <summary>
  /// Initialize control properties for derived class
  /// </summary>
  Init(): void {
  }

  /// <summary>
  /// get the behavior for the table control
  /// </summary>
  /// <returns></returns>
  GetTableBehaviour(): TableBehaviour {
    Debug.Assert (false);
    return TableBehaviour.UnlimitedItems;
  }

  /// <summary>(internal)
  /// checks if control is parkable
  /// </summary>
  /// <param name="moveByTab">check parkability for TAB forward/backward operations</param>
  /// <returns></returns>
  IsParkable(moveByTab: boolean): boolean {
    return this.isParkable(true, moveByTab);
  }

  /// <summary>
  ///   returns true if the control is parkable
  /// </summary>
  /// <param name = "checkEnabledAndVisible">check enabled and visible properties too</param>
  /// <param name = "moveByTab">check parkability for TAB forward/backward operations</param>
  isParkable(checkEnabledAndVisible: boolean, moveByTab: boolean): boolean {

    let result: boolean;
    result = !super.isTableControl() && !super.isColumnControl() && !super.isFrameSet();

    let task: TaskBase = this.getForm().getTask();
    // non interactive -> not parkable.
    if (result) {
      result = task.IsInteractive;
    }

    if (result && task.DataView.isEmptyDataview() && this._field !== null && this._field.PartOfDataview) {
      result = false;
    }
    if (moveByTab) {
      result = (result && this.GetComputedBooleanProperty(PropInterface.PROP_TYPE_TAB_IN, true));
    }
    if (result) {
      result = this.GetComputedBooleanProperty(PropInterface.PROP_TYPE_ALLOW_PARKING, true);
      if (result) {
        // QCR #441177. When we check the subform park ability, we need to check also it's visibility and enable properties.
        if (!super.isSubform()) {
          result = ((this._field !== null && this._field.getTask() === task) || super.isBrowserControl());
        }
        if (result && checkEnabledAndVisible) {
          result = (this.isEnabled() && this.isVisible());
        }

        if ((result && this._parentTable !== null) && checkEnabledAndVisible) {
          result = (this._parentTable.GetComputedBooleanProperty(PropInterface.PROP_TYPE_ENABLED, true) && this._parentTable.GetComputedBooleanProperty(PropInterface.PROP_TYPE_VISIBLE, true));
        }
      }
    }
    return result;
  }


  /// <summary>
  ///   when access to control need to refresh the default button,
  ///   The definition: each form\subform is defain his default button.
  ///   if we on control the default button on the same control is the default button on the form.
  ///   if we on subform:
  ///   1.there is default button on the subform, this button is the default button on the form
  ///   2.there is NO default button on the subform , no button will define as default button on the form
  /// </summary>
  refreshDefaultButton(): void {
    let prop: Property = this.Form.getProp(PropInterface.PROP_TYPE_DEFAULT_BUTTON);
    prop.RefreshDisplay(true);
  }

  /// <summary>
  /// Raise ACT_CTRL_HIT on left mouse click if it meets following condition.
  /// </summary>
  /// <returns></returns>
  RaiseControlHitOnLeftClickOfMouseDown(): boolean {
    let raiseCtrlHit: boolean = false;
    if (!super.IsHyperTextButton() && !super.isRadio() && !super.isTabControl()) {
      raiseCtrlHit = true;
    }
    return raiseCtrlHit;
  }

  GetVarIndex(): number {
    return 0;
  }


  /// <summary>
  /// Returns true if the 'Control Hit' event should be raised on mouse down.
  /// The method was extracted from processMouseDown, since we might have different
  /// behaviors for different types of tree controls.
  /// </summary>
  /// <param name="leftClickWasPressed"></param>
  /// <returns></returns>
  RaiseControlHitOnMouseDown(leftClickWasPressed: boolean): boolean {
    let raiseCtrlHit: boolean = false;
    if (leftClickWasPressed) {
      if (this.RaiseControlHitOnLeftClickOfMouseDown()) {
        raiseCtrlHit = true;
      }
    }
    return raiseCtrlHit;
  }

  /// <summary>
  /// Handle MG_ACT_HIT on the subform control
  /// </summary>
  OnSubformClick(): void {
    Manager.EventsManager.addGuiTriggeredEventWithTaskAndCode(this.getForm().getTask(), InternalInterface.MG_ACT_HIT);
  }

  /// <summary>
  /// returns MgForm of the subform control task
  /// </summary>
  GetSubformMgForm(): MgFormBase {
    return null;
  }

  /// <summary>
  /// Refreshes the subform of the control. (only for Online, not relevant for RC)
  /// </summary>
  RefreshSubform(): void {
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="id"></param>
  /// <returns></returns>
  PropertyExists(id: number): boolean {
    return this._propTab.propExists(id);
  }

  toString(): string {
    return "{" + this.constructor.name + ": " + MgControlType[this.Type] + "}";
  }

  /// <summary> Checks if new date is 0</summary>
  /// <param name="value"> The value to check</param>
  isDateZero(val: Date)
  {
    let zeroDate: boolean = false;
    if (val.getMonth() === 0 && val.getFullYear() === 0 && val.getDay() === 0)
      zeroDate = true;

    return zeroDate;
  }

  /// <summary> Checks if all non mask chars are blanks (online PIC_CTX::is_all_blank)</summary>
  /// <param name="value">- The value to check</param>
  isAllBlanks(val: string): boolean {
    let allBlanks: boolean = true;
    let lenTocheck: number = Math.min(this._pic.getMaskSize(), val.length);
    for (let i: number = 0; i < lenTocheck; i = i + 1) {
      if (!this._pic.picIsMask(i) && val.charAt(i) !== ' ') {
        allBlanks = false;
        break;
      }
    }
    return allBlanks;
  }

  IsDefaultRouterOutlet(): boolean {
    return (this.Type === MgControlType.CTRL_TYPE_SUBFORM && this.GetComputedBooleanProperty_0(PropInterface.PROP_TYPE_DEFAULT_OUTLET, false));
  }
}
