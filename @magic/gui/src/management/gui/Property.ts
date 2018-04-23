import {
  Int32, NString, NNumber, ApplicationException, Debug, List, StringBuilder,
  RefParam
} from "@magic/mscorelib";
import {
  StorageAttribute,
  XmlParser,
  XMLConstants,
  AutoFit,
  CheckboxMainStyle,
  CtrlButtonTypeGui,
  Logger_LogLevels,
  RbAppearance,
  Misc,
  MgControlType,
  StrUtil,
  BorderType,
  UtilImeJpn,
  AlignmentTypeVert,
  CtrlLineDirection,
  Constants,
  UtilStrByteMode,
  MagicProperties
} from "@magic/utils";
import {TaskDefinitionIdTableSaxHandler} from "../tasks/TaskDefinitionIdTableSaxHandler";
import {PropParentInterface} from "../../gui/PropParentInterface";
import {PIC} from "./PIC";
import {TaskDefinitionId} from "../tasks/TaskDefinitionId";
import {Manager} from "../../Manager";
import {Events} from "../../Events";
import {GuiConstants} from "../../GuiConstants";
import {PropInterface} from "./PropInterface";
import {MgControlBase} from "./MgControlBase";
import {DisplayConvertor} from "./DisplayConvertor";
import {MgFormBase} from "./MgFormBase";
import {MgRectangle} from "../../util/MgRectangle";
import {Commands} from "../../Commands";
import {CommandType, MenuStyle} from "../../GuiEnums";
import {TaskBase} from "../tasks/TaskBase";
import {PropDefaults} from "./PropDefaults";
import {BlobType} from "../data/BlobType";
import {ToolTipHelp} from "./Helps";
import {MgMenu} from "./MgMenu";
import {NUM_TYPE} from "../data/NUM_TYPE";

/// <summary>
///   this class represents a Property object of control, form or task.
/// </summary>
export class Property {
  private _id: number = Int32.MinValue;
  private _dataType: StorageAttribute = StorageAttribute.NONE;
  private _val: string = null;
  private _pic: PIC = null;
  private _expId: number = 0;
  private _parentObj: PropParentInterface = null; // a reference to the parent object (Control, Form, TaskBase)
  private _parentType: string = null; // Control|Form|TaskBase
  private _prevValues: List<string> = null; // reverence to property values in a table
  private _orgValue: string = null; // reverence to property values in a table
  private static _numericPropertyPic: PIC = null;
  private _taskDefinitionId: TaskDefinitionId = null; // task definition associated with the property.
  // studioValue for offline state
  // ToDo: comment says that it is for "Offline state". So, do we need it inWebClient?
  StudioValue: string = null;
  private _expAlreadyComputedOnce: boolean = false; // the expression is already computed once

  // for web client :
  // save the user properties that define by the user 
  private userProperties: Map<string, number> = new Map();

  // task definition associated with the property.
  get TaskDefinitionId(): TaskDefinitionId {
    return this._taskDefinitionId;
  }

  constructor();
  constructor(cId: number, cParentObj: PropParentInterface, parType: string);
  constructor(cId: number, cParentObj: PropParentInterface, parType: string, val: string);
  constructor(cId?: number, cParentObj?: PropParentInterface, parType?: string, val?: string) {
    if (arguments.length === 0)
      this.constructor_0();

    else if (arguments.length === 3)
      this.constructor_1(cId, cParentObj, parType);
    else
      this.constructor_2(cId, cParentObj, parType, val);
  }

  private constructor_0(): void {
    this._prevValues = new List();
  }

  private constructor_1(cId: number, cParentObj: PropParentInterface, parType: string): void {
    this.constructor_0();
    this.setId(cId);
    this._parentObj = cParentObj;
    this._parentType = parType;
    this.setDataType();
  }

  private constructor_2(cId: number, cParentObj: PropParentInterface, parType: string, val: string): void {
    this.constructor_1(cId, cParentObj, parType);
    this.setValue(val);
    this.setOrgValue();
  }

  /// <summary>
  ///   set the id of this property
  /// </summary>
  private setId(cId: number): void {
    this._id = cId;
  }

  /// <summary>
  ///   Need part input String to relevant for the class data
  /// </summary>
  /// <param name = "parentRef">reference to parent </param>
  /// <param name="parType"></param>
  /// <param name="task"></param>
  fillData(parentRef: PropParentInterface, parType: string): void {
    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;
    let endContext: number = parser.getXMLdata().indexOf( ">", parser.getCurrIndex());

    if (this._parentObj === null && parentRef !== null) {
      this._parentObj = parentRef;
      this._parentType = parType;
    }

    if (endContext !== -1 && endContext < parser.getXMLdata().length) {
      // last position of its tag
      let tag: string = parser.getXMLsubstring(endContext);
      parser.add2CurrIndex(tag.indexOf(XMLConstants.MG_TAG_PROP) + XMLConstants.MG_TAG_PROP.length);

      let tokensVector: List<string> = XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);
      if (Events.ShouldLog(Logger_LogLevels.Development)) {
        Events.WriteDevToLog(NString.Format("In Prop.FillData(): {0}", tokensVector.toString()));
      }

      this.initElements(tokensVector);

      parser.setCurrIndex(endContext + XMLConstants.TAG_CLOSE.length);

      // deal with internal tags
      this.InitInnerObjects(parser);

      // for the properties of this types need set parameters to the parent - CONTROL (in this case)
      if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
        this.setControlAttributes();
      else if (this._parentType === GuiConstants.PARENT_TYPE_FORM)
        this._prevValues.SetSize(1);
    }
    else
      Events.WriteExceptionToLog("In Property.FillData(): Out of string bounds");
  }

  private InitInnerObjects(xmlParser: XmlParser): void {
    let nextTag: string = xmlParser.getNextTag();

    if (nextTag === XMLConstants.MG_TAG_TASKDEFINITIONID_ENTRY) {
      let xmlBuffer: string = xmlParser.ReadToEndOfCurrentElement();
      this.InitTaskDefinitionId(xmlBuffer);

      let endContext: number = xmlParser.getXMLdata().indexOf(XMLConstants.MG_TAG_PROP + XMLConstants.TAG_CLOSE, xmlParser.getCurrIndex());
      xmlParser.setCurrIndex(endContext + (XMLConstants.MG_TAG_PROP + XMLConstants.TAG_CLOSE).length);
    }
  }

  /// <summary>
  ///   Make initialization of private elements by found tokens
  /// </summary>
  /// <param name = "tokensVector">found tokens, which consist attribute/value of every found element </param>
  private initElements(tokensVector: List<string>): void {
    for (let j: number = 0; j < tokensVector.length; j += 2) {
      let attribute: string = (tokensVector.get_Item(j));
      let valueStr: string = (tokensVector.get_Item(j + 1));

      switch (attribute) {
        case XMLConstants.MG_ATTR_ID:
          this.setId(XmlParser.getInt(valueStr));
          this.setDataType(); // The 'name' member must be found in this point
          break;
        case XMLConstants.MG_ATTR_STUDIO_VALUE:
          this.StudioValue = XmlParser.unescape(valueStr);
          break;
        case XMLConstants.MG_ATTR_VALUE:
          if (this._id === PropInterface.PROP_TYPE_USER_PROPERTIES) {
            this.InitUserProperties(XmlParser.unescape(valueStr));
          }
          else {
            this._val = XmlParser.unescape(valueStr);
            this._orgValue = this._val;
          }
          break;
        case XMLConstants.MG_ATTR_EXP:
          this._expId = XmlParser.getInt(valueStr);
          if (this._expId > 0 && this._id === PropInterface.PROP_TYPE_TOOLTIP)
            this.setDataType();
          break;
        case XMLConstants.MG_ATTR_CTL_IDX:
          this._taskDefinitionId.CtlIndex = XmlParser.getInt(valueStr);
          break;
        case XMLConstants.MG_ATTR_PROGRAM_ISN:
          this._taskDefinitionId.ProgramIsn = XmlParser.getInt(valueStr);
          break;
        default:
          Events.WriteExceptionToLog(NString.Format("There is no such tag in Property class. Insert case to Property.initElements for {0}",
            attribute));
          break;
      }

      // if the property is already compute in the server , then set _expAlreadyComputedOnce
      if (this.IsComputedOnceOnServer())
        this._expAlreadyComputedOnce = true;
    }
  }


  private InitUserProperties(userProprtiesStr: string): void {
    this.userProperties = <Map<string, number>>JSON.parse(userProprtiesStr);
  }

  /// <summary>
  /// reset _expAlreadyComputedOnce flag
  /// </summary>
  ResetComputedOnceFlag(): void {
    this._expAlreadyComputedOnce = false;
  }

  private InitTaskDefinitionId(xmlBuffer: string): void {
    let taskDefinitionIdTableSaxHandler: TaskDefinitionIdTableSaxHandler = new TaskDefinitionIdTableSaxHandler(this.SetTaskDefinitionId);
    taskDefinitionIdTableSaxHandler.parse(xmlBuffer);
  }

  // callback for TaskDefinitionIdTableSaxHandler
  SetTaskDefinitionId(taskDefinitionId: TaskDefinitionId): void {
    this._taskDefinitionId = taskDefinitionId;
  }

  private setDataType(): void {
    let compIdx: number = this._parentObj.getCompIdx();

    this._pic = null;

    if (this._id === Int32.MinValue) {
      Events.WriteExceptionToLog(NString.Format("To fill dataType member in Property.FillDataType must id!={0}", Int32.MinValue));
      return;
    }

    switch (this._id) {
      case PropInterface.PROP_TYPE_TITLE_BAR:
      case PropInterface.PROP_TYPE_BORDER:
      case PropInterface.PROP_TYPE_DISPLAY_MENU:
      case PropInterface.PROP_TYPE_DISPLAY_TOOLBAR:
      case PropInterface.PROP_TYPE_HEBREW:
      case PropInterface.PROP_TYPE_MODIFY_IN_QUERY:
      case PropInterface.PROP_TYPE_MAXBOX:
      case PropInterface.PROP_TYPE_MINBOX:
      case PropInterface.PROP_TYPE_SYSTEM_MENU:
      case PropInterface.PROP_TYPE_END_CONDITION:
      case PropInterface.PROP_TYPE_SELECTION:
      case PropInterface.PROP_TYPE_ALLOW_MODIFY:
      case PropInterface.PROP_TYPE_ALLOW_CREATE:
      case PropInterface.PROP_TYPE_ALLOW_DELETE:
      case PropInterface.PROP_TYPE_ALLOW_QUERY:
      case PropInterface.PROP_TYPE_ALLOW_RANGE:
      case PropInterface.PROP_TYPE_ALLOW_LOCATE:
      case PropInterface.PROP_TYPE_ALLOW_SORT:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_ALLOW_INDEX:
      case PropInterface.PROP_TYPE_ALLOW_LOCATE_IN_QUERY:
      case PropInterface.PROP_TYPE_CONFIRM_UPDATE:
      case PropInterface.PROP_TYPE_FORCE_SUFFIX:
      case PropInterface.PROP_TYPE_FORCE_DELETE:
      case PropInterface.PROP_TYPE_MUST_INPUT:
      case PropInterface.PROP_TYPE_MODIFIABLE:
      case PropInterface.PROP_TYPE_VISIBLE:
      case PropInterface.PROP_TYPE_ENABLED:
      case PropInterface.PROP_TYPE_ALLOW_PARKING:
      case PropInterface.PROP_TYPE_CONFIRM_CANCEL:
      case PropInterface.PROP_TYPE_REPEATABLE:
      case PropInterface.PROP_TYPE_HIGHLIGHTING:
      case PropInterface.PROP_TYPE_PASSWORD:
      case PropInterface.PROP_TYPE_MULTILINE:
      case PropInterface.PROP_TYPE_TAB_IN:
      case PropInterface.PROP_TYPE_IS_CACHED:
      case PropInterface.PROP_TYPE_PRELOAD_VIEW:
      case PropInterface.PROP_TYPE_MULTILINE_VERTICAL_SCROLL:
      case PropInterface.PROP_TYPE_MULTILINE_ALLOW_CR:
      case PropInterface.PROP_TYPE_ALLOW_COL_RESIZE:
      case PropInterface.PROP_TYPE_ALLOW_REORDER:
      case PropInterface.PROP_TYPE_SHOW_LINES:
      case PropInterface.PROP_TYPE_SORT_COLUMN:
      case PropInterface.PROP_TYPE_COL_ALLOW_FILTERING:
      case PropInterface.PROP_TYPE_DISPLAY_STATUS_BAR:
      case PropInterface.PROP_TYPE_AUTO_REFRESH:
      case PropInterface.PROP_TYPE_COLUMN_PLACEMENT:
      case PropInterface.PROP_TYPE_PARK_ON_CLICK:
      case PropInterface.PROP_TYPE_HORIZONTAL_PLACEMENT:
      case PropInterface.PROP_TYPE_VERTICAL_PLACEMENT:
      case PropInterface.PROP_TYPE_SHOW_FULL_ROW:
      case PropInterface.PROP_TYPE_TRACK_SELECTION:
      case PropInterface.PROP_TYPE_HOT_TRACK:
      case PropInterface.PROP_TYPE_SHOW_BUTTONS:
      case PropInterface.PROP_TYPE_LINES_AT_ROOT:
      case PropInterface.PROP_TYPE_ALLOW_EMPTY_DATAVIEW:
      case PropInterface.PROP_TYPE_SCROLL_BAR:
      case PropInterface.PROP_TYPE_COLUMN_DIVIDER:
      case PropInterface.PROP_TYPE_LINE_DIVIDER:
      case PropInterface.PROP_TYPE_THREE_STATES:
      case PropInterface.PROP_TYPE_REFRESH_WHEN_HIDDEN:
      case PropInterface.PROP_TYPE_ALLOW_OPTION:
      case PropInterface.PROP_TYPE_RETAIN_FOCUS:
      case PropInterface.PROP_TYPE_PRINT_DATA:
      case PropInterface.PROP_TYPE_CLOSE_TASKS_BY_MDI_MENU:
      case PropInterface.PROP_TYPE_ALLOW_DRAGGING:
      case PropInterface.PROP_TYPE_ALLOW_DROPPING:
      case PropInterface.PROP_TYPE_ROW_PLACEMENT:
      case PropInterface.PROP_TYPE_DATAVIEWCONTROL:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_OPEN_TASK_WINDOW:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_ALLOW_EVENTS:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_INDEX_OPTIMIZATION:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_RANGE:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_LOCATE:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_POSITION:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_SQL_RANGE:
      case PropInterface.PROP_TYPE_TOP_BORDER:
      case PropInterface.PROP_TYPE_RIGHT_BORDER:
      case PropInterface.PROP_TYPE_BEFORE_900_VERSION:
      case PropInterface.PROP_TYPE_TOP_BORDER_MARGIN:
      case PropInterface.PROP_TYPE_FILL_WIDTH:
      case PropInterface.PROP_TYPE_MULTI_COLUMN_DISPLAY:
      case PropInterface.PROP_TYPE_SHOW_ELLIPISIS:
      case PropInterface.PROP_TYPE_IS_ROUTER_OUTLET:
      case PropInterface.PROP_TYPE_DEFAULT_OUTLET:
        this._dataType = StorageAttribute.BOOLEAN;
        break;

      case PropInterface.PROP_TYPE_DEFAULT_BUTTON:
      case PropInterface.PROP_TYPE_IMAGE_FILENAME:
      case PropInterface.PROP_TYPE_EVAL_END_CONDITION:
      case PropInterface.PROP_TYPE_FRAME_NAME:
      case PropInterface.PROP_TYPE_NAME:
      case PropInterface.PROP_TYPE_TRASACTION_BEGIN:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_TRANSACTION_MODE:
      case PropInterface.PROP_TYPE_WALLPAPER:
      case PropInterface.PROP_TYPE_ATTRIBUTE:
      case PropInterface.PROP_TYPE_TRIGGER:
      case PropInterface.PROP_TYPE_SELECT_MODE:
      case PropInterface.PROP_TYPE_TASK_ID:
      case PropInterface.PROP_TYPE_PLACEMENT:
      case PropInterface.PROP_TYPE_TABBING_CYCLE:
      case PropInterface.PROP_TYPE_PARAMETERS:
      case PropInterface.PROP_TYPE_LINE_WIDTH:
      case PropInterface.PROP_TYPE_IMAGE_LIST_INDEXES:
      case PropInterface.PROP_TYPE_VISIBLE_LAYERS_LIST:
      case PropInterface.PROP_TYPE_OBJECT_TYPE:
      case PropInterface.PROP_TYPE_REAL_OBJECT_TYPE:
      case PropInterface.PROP_TYPE_DATAVIEWCONTROL_FIELDS:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_RANGE_ORDER:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_LOCATE_ORDER:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_POSITION_USAGE:
      case PropInterface.PROP_TYPE_TASK_MODE:
        this._dataType = StorageAttribute.ALPHA;
        break;

      case PropInterface.PROP_TYPE_COLUMN_TITLE:
      case PropInterface.PROP_TYPE_DISPLAY_LIST:
      case PropInterface.PROP_TYPE_LABEL:
      case PropInterface.PROP_TYPE_FORMAT:
      case PropInterface.PROP_TYPE_RANGE:
      case PropInterface.PROP_TYPE_FORM_NAME:
      case PropInterface.PROP_TYPE_ADDITIONAL_INFORMATION:
      case PropInterface.PROP_TYPE_TEXT:
      case PropInterface.PROP_TYPE_HINT:
        this._dataType = StorageAttribute.UNICODE;
        break;

      case PropInterface.PROP_TYPE_UOM:
      case PropInterface.PROP_TYPE_HOR_FAC:
      case PropInterface.PROP_TYPE_VER_FAC:
      case PropInterface.PROP_TYPE_TAB_ORDER:
      case PropInterface.PROP_TYPE_WALLPAPER_STYLE:
      case PropInterface.PROP_TYPE_INDEX:
      case PropInterface.PROP_TYPE_LINK_FIELD:
      case PropInterface.PROP_TYPE_DISPLAY_FIELD:
      case PropInterface.PROP_TYPE_PULLDOWN_MENU:
      case PropInterface.PROP_TYPE_CONTEXT_MENU:
      case PropInterface.PROP_TYPE_MINIMUM_HEIGHT:
      case PropInterface.PROP_TYPE_MINIMUM_WIDTH:
      case PropInterface.PROP_TYPE_CHECKBOX_MAIN_STYLE:
      case PropInterface.PROP_TYPE_TAB_CONTROL_SIDE:
      case PropInterface.PROP_TYPE_TAB_CONTROL_TABS_WIDTH:
      case PropInterface.PROP_TYPE_WINDOW_TYPE:
      case PropInterface.PROP_TYPE_IMAGE_STYLE:
      case PropInterface.PROP_TYPE_AUTO_FIT:
      case PropInterface.PROP_TYPE_RAISE_AT:
      case PropInterface.PROP_TYPE_EXPAND_WINDOW:
      case PropInterface.PROP_TYPE_VISIBLE_LINES:
      case PropInterface.PROP_TYPE_CHOICE_COLUMNS:
      case PropInterface.PROP_TYPE_BORDER_STYLE:
      case PropInterface.PROP_TYPE_STYLE_3D:
      case PropInterface.PROP_TYPE_FONT:
      case PropInterface.PROP_TYPE_LAYER:
      case PropInterface.PROP_TYPE_WIDTH:
      case PropInterface.PROP_TYPE_HEIGHT:
      case PropInterface.PROP_TYPE_TITLE_HEIGHT:
      case PropInterface.PROP_TYPE_COLOR:
      case PropInterface.PROP_TYPE_BORDER_COLOR:
      case PropInterface.PROP_TYPE_FOCUS_COLOR:
      case PropInterface.PROP_TYPE_VISITED_COLOR:
      case PropInterface.PROP_TYPE_HOVERING_COLOR:
      case PropInterface.PROP_TYPE_ROW_HIGHLIGHT_COLOR:
      case PropInterface.PROP_TYPE_INACTIVE_ROW_HIGHLIGHT_COLOR:
      case PropInterface.PROP_TYPE_LEFT:
      case PropInterface.PROP_TYPE_TOP:
      case PropInterface.PROP_TYPE_PROMPT:
      case PropInterface.PROP_TYPE_TOOLTIP:
      case PropInterface.PROP_TYPE_HELP_SCR:
      case PropInterface.PROP_TYPE_LINES_IN_TABLE:
      case PropInterface.PROP_TYPE_SELECTION_ROWS:
      case PropInterface.PROP_TYPE_HORIZONTAL_ALIGNMENT:
      case PropInterface.PROP_TYPE_MULTILINE_WORDWRAP_SCROLL:
      case PropInterface.PROP_TYPE_ROW_HEIGHT:
      case PropInterface.PROP_TYPE_SET_COLOR_BY:
      case PropInterface.PROP_TYPE_ALTERNATING_BG_COLOR:
      case PropInterface.PROP_TYPE_WINDOW_WIDTH:
      case PropInterface.PROP_TYPE_MAIN_DISPLAY:
      case PropInterface.PROP_TYPE_EXPANDED_IMAGEIDX:
      case PropInterface.PROP_TYPE_COLLAPSED_IMAGEIDX:
      case PropInterface.PROP_TYPE_PARKED_COLLAPSED_IMAGEIDX:
      case PropInterface.PROP_TYPE_PARKED_IMAGEIDX:
      case PropInterface.PROP_TYPE_TRANSLATOR:
      case PropInterface.PROP_TYPE_FRAMESET_STYLE:
      case PropInterface.PROP_TYPE_FRAME_TYPE:
      case PropInterface.PROP_TYPE_SELECT_PROGRAM:
      case PropInterface.PROP_TYPE_ALLOWED_DIRECTION:
      case PropInterface.PROP_TYPE_ROW_HIGHLIGHT_STYLE:
      case PropInterface.PROP_TYPE_VERTICAL_ALIGNMENT:
      case PropInterface.PROP_TYPE_TABBING_ORDER:
      case PropInterface.PROP_TYPE_RADIO_BUTTON_APPEARANCE:
      case PropInterface.PROP_TYPE_LINE_STYLE:
      case PropInterface.PROP_TYPE_STATIC_TYPE:
      case PropInterface.PROP_TYPE_BUTTON_STYLE:
      case PropInterface.PROP_TYPE_GRADIENT_STYLE:
      case PropInterface.PROP_TYPE_GRADIENT_COLOR:
      case PropInterface.PROP_TYPE_LOAD_IMAGE_FROM:
      case PropInterface.PROP_TYPE_SUBFORM_TYPE:
      case PropInterface.PROP_TYPE_BOTTOM_POSITION_INTERVAL:
      case PropInterface.PROP_TYPE_SELECTION_MODE:
      case PropInterface.PROP_TYPE_ASSEMBLY_ID:
      case PropInterface.PROP_TYPE_PRGTSK_NUM:
      case PropInterface.PROP_TYPE_TITLE_COLOR:
      case PropInterface.PROP_TYPE_DIVIDER_COLOR:
      case PropInterface.PROP_TYPE_HOT_TRACK_COLOR:
      case PropInterface.PROP_TYPE_SELECTED_TAB_COLOR:
      case PropInterface.PROP_TYPE_TITLE_PADDING:
      case PropInterface.PROP_TYPE_HINT_COLOR:
      case PropInterface.PROP_TYPE_PERSISTENT_FORM_STATE_VERSION:
      case PropInterface.PROP_TYPE_ROW_BG_COLOR:
        if (this._id === PropInterface.PROP_TYPE_TOOLTIP && this._expId > 0)
          this._dataType = StorageAttribute.UNICODE;
        // pic will be set according to exp length
        else {
          this._dataType = StorageAttribute.NUMERIC;
          if (Property._numericPropertyPic == null)
            Property._numericPropertyPic = new PIC("N6", StorageAttribute.NUMERIC, compIdx);
          this._pic = Property._numericPropertyPic;
        }
        break;
      case PropInterface.PROP_TYPE_RETURN_ACTION:
        this._dataType = StorageAttribute.NONE;
        break;
      case PropInterface.PROP_TYPE_DATA:
        this._dataType = (<MgControlBase>this._parentObj).DataType;
        break;
      case PropInterface.PROP_TYPE_POP_UP:
      case PropInterface.PROP_TYPE_ORIENTATION_LOCK:
      case PropInterface.PROP_TYPE_ENTER_ANIMATION:
      case PropInterface.PROP_TYPE_EXIT_ANIMATION:
      case PropInterface.PROP_TYPE_NAVIGATION_DRAWER_MENU:
      case PropInterface.PROP_TYPE_ACTION_BAR_MENU:
      case PropInterface.PROP_TYPE_TITLE_BAR_COLOR:
      case PropInterface.PROP_TYPE_MOBILE_BORDER_WIDTH:
      case PropInterface.PROP_TYPE_BORDER_FOCUS_WIDTH:
      case PropInterface.PROP_TYPE_BORDER_FOCUS_COLOR:
      case PropInterface.PROP_TYPE_CORNER_RADIUS:
      case PropInterface.PROP_TYPE_OPEN_PICKER:
      case PropInterface.PROP_TYPE_OPEN_EDIT_DIALOG:
      case PropInterface.PROP_TYPE_DEFAULT_ALIGNMENT:
      case PropInterface.PROP_TYPE_KEYBOARD_TYPE:
      case PropInterface.PROP_TYPE_KEYBOARD_RETURN_KEY:
      case PropInterface.PROP_TYPE_ALLOW_SUGGESTIONS:
      case PropInterface.PROP_TYPE_MOBILE_IMAGE_LIST_FILE_NAME:
      case PropInterface.PROP_TYPE_SWIPE_REFRESH:
        // No handling is needed here as the properties are valid for mobile as for now.
        break;
      default:
        Events.WriteExceptionToLog(NString.Format("in Property.setDataType() no case for: {0}", this._id));
        break;
    }
  }

  /// <summary>
  ///   set attributes of a the parent control
  /// </summary>
  private setControlAttributes(): void {
    if (this._parentObj == null || this._parentType !== GuiConstants.PARENT_TYPE_CONTROL) {
      Events.WriteExceptionToLog("in Property.setControlAttributes() there is no parent or the parent is not a control");
      return;
    }

    let parentControl = <MgControlBase>this._parentObj;
    switch (this._id) {
      case PropInterface.PROP_TYPE_FRAME_NAME:
      case PropInterface.PROP_TYPE_NAME:
      case PropInterface.PROP_TYPE_COLUMN_TITLE:
        parentControl.Name = this._val;
        break;

      case PropInterface.PROP_TYPE_ATTRIBUTE:
        parentControl.DataType = <StorageAttribute>this._val[0];
        break;

      case PropInterface.PROP_TYPE_FORMAT:
        parentControl.setPicStr(this._val, this._expId);
        break;

      case PropInterface.PROP_TYPE_RANGE:
        parentControl.setRange(this.getValue());
        break;

      case PropInterface.PROP_TYPE_DATA:
        if (this._expId > 0)
          parentControl.setValExp(this._expId);
        else if (this._val != null)
          parentControl.setField(this.getValue());
        break;

      case PropInterface.PROP_TYPE_BUTTON_STYLE:
        if (this._val != null)
          parentControl.ButtonStyle = <CtrlButtonTypeGui>this.getValueInt();
        break;

      case PropInterface.PROP_TYPE_LAYER:
        if (this._val != null)
          parentControl.Layer = this.getValueInt();
        break;

      case PropInterface.PROP_TYPE_CHECKBOX_MAIN_STYLE:
        if (this._val != null)
          parentControl.CheckBoxMainStyle = <CheckboxMainStyle>this.getValueInt();
        break;

      case PropInterface.PROP_TYPE_RADIO_BUTTON_APPEARANCE:
        if (this._val != null)
          parentControl.RadioButtonAppearance = <RbAppearance>this.getValueInt();
        break;

      default:
        break;
    }
  }

  /// <summary>
  ///   returns a reference to the parent object of this property
  /// </summary>
  getParentObj(): any {
    return this._parentObj;
  }

  /// <summary>
  ///   returns the type of the parent object
  /// </summary>
  getParentType(): string {
    return this._parentType;
  }

  /// <summary>
  ///   returns the id of the property
  /// </summary>
  getID(): number {
    return this._id;
  }

  /// <summary>
  ///   set the value of the property and take care of the presentation the value must be in a magic internal
  ///   format
  /// </summary>
  /// <param name = "mgVal">the new value</param>
  setValue(mgVal: string): void {
    let compIdx: number = this._parentObj.getCompIdx();

    if (this._id === PropInterface.PROP_TYPE_DATA || this._id === PropInterface.PROP_TYPE_NODE_ID || this._id === PropInterface.PROP_TYPE_NODE_PARENTID)
      return;

    if (this._dataType === StorageAttribute.NONE)
      this.setDataType();

    switch (this._dataType) {
      case StorageAttribute.NUMERIC:
        if (mgVal == null)
          mgVal = "FF00000000000000000000000000000000000000";
        this._val = DisplayConvertor.Instance.mg2disp(mgVal, "", this._pic,false,  compIdx, false).trim();
        break;

      case StorageAttribute.ALPHA:
      case StorageAttribute.BLOB:
      case StorageAttribute.BLOB_VECTOR:
      case StorageAttribute.BOOLEAN:
      case StorageAttribute.UNICODE:
        this._val = mgVal;
        break;

      default:
        throw new ApplicationException("in Property.setValue() illegal data type: " + this._dataType);
    }
  }

  /// <summary>
  /// set an int value directly, as is done when initializing the property
  /// </summary>
  /// <param name="val"></param>
  SetValue(val: number): void {
    this._val = String(val);
  }

  /// <summary>
  ///   set the value of the property and take care of the presentation the value must be in a magic internal format
  /// </summary>
  setOrgValue(): void {
    this._orgValue = this._val;
  }

  /// <summary>
  ///
  /// </summary>
  SetStudioValueAsOrgValue(): void {
    this._orgValue = this.StudioValue;
  }

  /// <summary>
  ///   Calculates the height of a control or a form using the same algorithm applied in an Online
  ///   program. It is important to use the same algorithm in order to ensure that what we see in
  ///   the form editor is the same in RT.
  /// </summary>
  /// <returns></returns>
  private static calcHeight(propInterface: PropParentInterface, calcOrgValue: boolean): number {
    let height: number = 0;

    let propHeight: Property = propInterface.getProp(PropInterface.PROP_TYPE_HEIGHT);

    if (calcOrgValue) {
      if (propHeight !== null && propHeight.getOrgValue() !== null) {
        height = +propHeight.getOrgValue();
      }
    }
    else {
      height = propHeight.getValueInt();
    }

    return height;
  }

  /// <summary>
  ///   get original rectangle
  /// </summary>
  /// <returns></returns>
  static getOrgRect(propInterface: PropParentInterface): MgRectangle {
    let rect: MgRectangle = new MgRectangle();

    if ((propInterface.getProp(PropInterface.PROP_TYPE_LEFT)).getOrgValue() !== null)
      rect.x = NNumber.Parse((propInterface.getProp(PropInterface.PROP_TYPE_LEFT)).getOrgValue());
    if ((propInterface.getProp(PropInterface.PROP_TYPE_TOP)).getOrgValue() !== null)
      rect.y = NNumber.Parse((propInterface.getProp(PropInterface.PROP_TYPE_TOP)).getOrgValue());

    if ((propInterface.getProp(PropInterface.PROP_TYPE_WIDTH)).getOrgValue() !== null)
      rect.width = Property.calcWidth(propInterface, true);
    if ((propInterface.getProp(PropInterface.PROP_TYPE_HEIGHT)).getOrgValue() !== null)
      rect.height = Property.calcHeight(propInterface, true);

    return rect;
  }

  /// <summary>
  ///   Calculates the width of a control or a form using the same algorithm applied in an Online
  ///   program. It is important to use the same algorithm in order to ensure that what we see in
  ///   the form editor is the same in RT.
  /// </summary>
  /// <returns></returns>
  private static calcWidth(propInterface: PropParentInterface, calcOrgValue: boolean): number {
    let width: number = 0;

    let control: MgControlBase = null;
    if (propInterface instanceof MgControlBase)
      control = <MgControlBase>propInterface;

    let propWidth: Property = propInterface.getProp(PropInterface.PROP_TYPE_WIDTH);

    if (control !== null && control.Type === MgControlType.CTRL_TYPE_TABLE && !propWidth.isExpression()) {
      // for table without expression width is set by WindowWidth property
      let propWindowWidth: Property = propInterface.getProp(PropInterface.PROP_TYPE_WINDOW_WIDTH);
      if (calcOrgValue) {
        if (propWindowWidth !== null && propWindowWidth.getOrgValue() !== null) {
          width = +propWindowWidth.getOrgValue();
        }
      }
      else {
        width = propWindowWidth.getValueInt();
      }
    }
    else {
      if (calcOrgValue) {
        if (propWidth !== null && propWidth.getOrgValue() !== null) {
          width = +propWidth.getOrgValue();
        }
      }
      else {
        width = propWidth.getValueInt();
      }
    }

    return width;
  }

  /// <summary>
  ///   change the bounds of the object
  /// </summary>
  private onBounds(id: number): void {
    let form: MgFormBase = this.getForm();
    let control: MgControlBase = null;
    let addBorderPlace: boolean = false;
    let x: number;
    let y: number;
    let width: number;
    let height: number;

    x = y = width = height = GuiConstants.DEFAULT_VALUE_INT;

    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      control = <MgControlBase>this._parentObj;

    if (this._parentType === GuiConstants.PARENT_TYPE_FORM && form.isSubForm()) {
      // if subform control has border and it has AUTO_FIT_AS_CALLED_FORM property
      // we must enlarge it, to add to its width and height enough room for the borders
      let autoFit: AutoFit = <AutoFit>(form.getSubFormCtrl().getProp(PropInterface.PROP_TYPE_AUTO_FIT)).getValueInt();
      let border: boolean = (form.getSubFormCtrl().getProp(PropInterface.PROP_TYPE_BORDER)).getValueBoolean();
      if (autoFit === AutoFit.AsCalledForm && border)
        addBorderPlace = true;
    }

    switch (id) {
      case PropInterface.PROP_TYPE_LEFT:
        x = this.CalcLeftValue(control);
        break;
      case PropInterface.PROP_TYPE_TOP:
        y = this.CalcTopValue(control);
        break;
      case PropInterface.PROP_TYPE_WIDTH:
        width = this.CalcWidthValue(control);
        break;
      case PropInterface.PROP_TYPE_HEIGHT: {
        height = this.CalcHeightValue(control);
        break;
      }
      default:
        Debug.Assert(false);
        break;
    }

    Commands.addAsync(CommandType.PROP_SET_BOUNDS, this.getObjectByParentObj(), this.getLine(), x, y, width, height, addBorderPlace, !this._parentObj.IsFirstRefreshOfProps());
  }

  /// <summary>
  /// calculate the height in pixels
  /// </summary>
  /// <param name="control"></param>
  /// <param name="GetValueCallback"></param>
  /// <returns></returns>
  CalcHeightValue(control: MgControlBase): number {
    let height: number;

    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL && control.isLineControl()) {
      // for line control 'height' is actually the Y coordinate of the second point.
      // It should not be treated as height and calcHeight() should not be called.
      height = this.getValueInt();
      // If the line is inside a container and no expression is attached to it, then the value is
      // relative to the form. So, make it relative to its parent.
      if (control.hasContainer() && this._expId === 0) {
        let parentControl: MgControlBase = <MgControlBase>control.getParent();
        let parentY: number = (parentControl.getProp(PropInterface.PROP_TYPE_TOP)).getValueInt();
        height = height - parentY;
      }
    }
    else {
      height = Property.calcHeight(this._parentObj, false);
    }

    return height;
  }

  /// <summary>
  /// calculate the width in pixels
  /// </summary>
  /// <param name="control"></param>
  /// <param name="GetValueCallback"></param>
  /// <returns></returns>
  CalcWidthValue(control: MgControlBase): number {
    let width: number;

    if (control !== null && control.Type === MgControlType.CTRL_TYPE_COLUMN)
      width = control.getForm().computeColumnWidth(control.getLayer());
    else if (control !== null && control.isLineControl()) {
      // for line control 'width' is actually the X coordinate of the second point.
      // It should not be treated as width and calcWidth() should not be called.
      width = this.getValueInt();

      // If the line is inside a container and no expression is attached to it, then the value is
      // relative to the form. So, make it relative to its parent.
      if (control.hasContainer() && this._expId === 0) {
        let parentControl: MgControlBase = <MgControlBase>control.getParent();
        let parentX: number = (parentControl.getProp(PropInterface.PROP_TYPE_LEFT)).getValueInt();
        width = width - parentX;
      }
    }
    else {
      width = Property.calcWidth(this._parentObj, false);
    }

    return width;
  }

  /// <summary>
  /// calculate the Y coordinate in pixels
  /// </summary>
  /// <param name="control"></param>
  /// <param name="GetValueCallback"></param>
  /// <returns></returns>
  CalcTopValue(control: MgControlBase): number {
    let y: number;

    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL && control.hasContainer() && this._expId === 0) {
      let parentControl: MgControlBase = <MgControlBase>control.getParent();
      let parentY: number = +(parentControl.getProp(PropInterface.PROP_TYPE_TOP)).getOrgValue();
      y = this.getValueInt();
      y = y - parentY;
    }
    else {
      y = this.getValueInt();
    }

    return y;
  }

  /// <summary>
  /// calculate the X coordinate in pixels
  /// </summary>
  /// <param name="control"></param>
  /// <param name="GetValueCallback"></param>
  /// <returns></returns>
  CalcLeftValue(control: MgControlBase): number {
    let x: number;

    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL && control.hasContainer() && this._expId === 0) {
      let parentControl: MgControlBase = <MgControlBase>control.getParent();
      let parentX: number = +(parentControl.getProp(PropInterface.PROP_TYPE_LEFT)).getOrgValue();
      x = this.getValueInt();
      x = x - parentX;
    }
    else {
      x = this.getValueInt();
    }

    return x;
  }

  /// <summary>
  ///   Returns the form related to this property. If the property's parent is the form then return it,
  ///   otherwise, if the property's parent is a control then return the form to which this control belongs.
  /// </summary>
  /// <returns> MgForm</returns>
  private getForm(): MgFormBase {
    let form: MgFormBase = null;

    if (this._parentType === GuiConstants.PARENT_TYPE_FORM)
      form = <MgFormBase>this._parentObj;
    else if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      form = (<MgControlBase>this._parentObj).getForm();

    return form;
  }

  /// <summary>
  /// </summary>
  /// <returns> the task by the parent object</returns>
  GetTaskByParentObject(): TaskBase {
    let task: TaskBase = null;

    if (this._parentType === GuiConstants.PARENT_TYPE_FORM)
      task = (<MgFormBase>this._parentObj).getTask();
    else if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      task = (<MgControlBase>this._parentObj).getForm().getTask();
    else if (this._parentType === GuiConstants.PARENT_TYPE_TASK)
      task = <TaskBase>this._parentObj;

    return task;
  }

  /// <summary>
  ///   refresh the display for control properties and form properties only
  /// </summary>
  /// <param name = "forceRefresh">if true then refresh is forced regardless of the previous value</param>
  RefreshDisplay(forceRefresh: boolean): void {
    this.RefreshDisplayWithCurrentLine(forceRefresh, Int32.MinValue);
  }

  /// <summary>
  ///   return TRUE if the property need to be skip from the refresh properties. for a control
  /// </summary>
  /// <returns></returns>
  private ShouldSkipRefreshControl(): boolean {
    let skip: boolean = false;
    let mgControl: MgControlBase = <MgControlBase>this._parentObj;

    switch (this._id) {
      case PropInterface.PROP_TYPE_HEBREW:
        if (mgControl.isTableControl())
          skip = true;
        break;
      case PropInterface.PROP_TYPE_NODE_ID:
      case PropInterface.PROP_TYPE_NODE_PARENTID:
      case PropInterface.PROP_TYPE_DATA:
      case PropInterface.PROP_TYPE_HIGHLIGHTING:
      case PropInterface.PROP_TYPE_MUST_INPUT:
      case PropInterface.PROP_TYPE_PROMPT:
      case PropInterface.PROP_TYPE_HELP_SCR:
      case PropInterface.PROP_TYPE_SELECT_PROGRAM:
      case PropInterface.PROP_TYPE_SELECT_MODE:
      case PropInterface.PROP_TYPE_ALLOWED_DIRECTION:
      case PropInterface.PROP_TYPE_RETURN_ACTION:
      case PropInterface.PROP_TYPE_ATTRIBUTE:
      case PropInterface.PROP_TYPE_REPEATABLE:
      case PropInterface.PROP_TYPE_FRAME_NAME:
      case PropInterface.PROP_TYPE_TRIGGER:
      case PropInterface.PROP_TYPE_TAB_ORDER:
      // case PropInterface.PROP_TYPE_CHECKBOX_MAIN_STYLE:
      // case PropInterface.PROP_TYPE_TAB_CONTROL_SIDE:
      // case PropInterface.PROP_TYPE_MULTILINE:
      // case PropInterface.PROP_TYPE_BORDER:
      // case PropInterface.PROP_TYPE_PASSWORD:
      // case PropInterface.PROP_TYPE_HORIZONTAL_ALIGNMENT:
      // case PropInterface.PROP_TYPE_STYLE_3D:
      case PropInterface.PROP_TYPE_IMAGE_STYLE:
      case PropInterface.PROP_TYPE_IS_CACHED:
      case PropInterface.PROP_TYPE_LAYER:
      case PropInterface.PROP_TYPE_AUTO_FIT:
      // case PropInterface.PROP_TYPE_MULTILINE_VERTICAL_SCROLL:
      // case PropInterface.PROP_TYPE_MULTILINE_WORDWRAP_SCROLL:
      case PropInterface.PROP_TYPE_RAISE_AT:
      case PropInterface.PROP_TYPE_FRAMESET_STYLE:
      case PropInterface.PROP_TYPE_FRAME_TYPE:
      case PropInterface.PROP_TYPE_RANGE:
      case PropInterface.PROP_TYPE_WINDOW_WIDTH:
      case PropInterface.PROP_TYPE_WALLPAPER_STYLE:
      case PropInterface.PROP_TYPE_TABBING_ORDER:
      case PropInterface.PROP_TYPE_AUTO_REFRESH:
      case PropInterface.PROP_TYPE_PARAMETERS:
      case PropInterface.PROP_TYPE_OBJECT_TYPE:
      case PropInterface.PROP_TYPE_RETAIN_FOCUS:
      case PropInterface.PROP_TYPE_SUBFORM_TYPE:
      case PropInterface.PROP_TYPE_REAL_OBJECT_TYPE:
      case PropInterface.PROP_TYPE_ASSEMBLY_ID:
      case PropInterface.PROP_TYPE_ADDITIONAL_INFORMATION:
      case PropInterface.PROP_TYPE_ROW_PLACEMENT:
      case PropInterface.PROP_TYPE_DATAVIEWCONTROL:
      case PropInterface.PROP_TYPE_DATAVIEWCONTROL_FIELDS:
      case PropInterface.PROP_TYPE_PRGTSK_NUM:
      case PropInterface.PROP_TYPE_INDEX:
      case PropInterface.PROP_TYPE_DISPLAY_FIELD:
      case PropInterface.PROP_TYPE_LINK_FIELD:
      case PropInterface.PROP_TYPE_BEFORE_900_VERSION:
        skip = true;
        break;

      case PropInterface.PROP_TYPE_BUTTON_STYLE:
        if (!(<MgControlBase>this._parentObj).isRadio())
          skip = true;
        break;

      case PropInterface.PROP_TYPE_TITLE_PADDING:
        if (!this._parentObj.IsFirstRefreshOfProps())
          skip = true;
        break;

      case PropInterface.PROP_TYPE_HEIGHT:
        // Ignore the height set by the developer for 3D combobox
        if ((<MgControlBase>this._parentObj).isComboBox())
          skip = true;
        break;

      case PropInterface.PROP_TYPE_BORDER_COLOR:
        if (!(<MgControlBase>this._parentObj).isGroup())
          skip = true;
        break;

      default:
        break;
    }

    if (!skip) {
      if (mgControl.isFrameSet()) {
        // for frame set control refresh the only needs properties
        skip = true;

        switch (this._id) {
          case PropInterface.PROP_TYPE_WIDTH:
          case PropInterface.PROP_TYPE_HEIGHT:
          case PropInterface.PROP_TYPE_HORIZONTAL_PLACEMENT:
          case PropInterface.PROP_TYPE_VERTICAL_PLACEMENT:
          case PropInterface.PROP_TYPE_VISIBLE:
            skip = false;
            break;
        }
      }
      else if (mgControl.isContainerControl()) {
        switch (this._id) {
          case PropInterface.PROP_TYPE_WIDTH:
          case PropInterface.PROP_TYPE_HEIGHT:
          case PropInterface.PROP_TYPE_LEFT:
          case PropInterface.PROP_TYPE_TOP:
            skip = true;
            break;
        }
      }
    }

    return skip;
  }

  /// <summary>
  ///   return TRUE if the property need to be skip from the refresh properties. for a form
  /// </summary>
  /// <returns></returns>
  private ShouldSkipRefreshForm(): boolean {
    Debug.Assert(this._parentType === GuiConstants.PARENT_TYPE_FORM);

    let skip: boolean = false;
    let mgFormBase: MgFormBase = <MgFormBase>this._parentObj;

    // Compute properties: all those properties will be refresh only one time
    switch (this._id) {
      case PropInterface.PROP_TYPE_PULLDOWN_MENU:
      case PropInterface.PROP_TYPE_SYSTEM_MENU:
      case PropInterface.PROP_TYPE_MINBOX:
      case PropInterface.PROP_TYPE_MAXBOX:
      case PropInterface.PROP_TYPE_WINDOW_TYPE:
        if (!this._parentObj.IsFirstRefreshOfProps())
          skip = true;
        break;

      case PropInterface.PROP_TYPE_UOM:
      case PropInterface.PROP_TYPE_HOR_FAC:
      case PropInterface.PROP_TYPE_VER_FAC:
      case PropInterface.PROP_TYPE_BORDER_STYLE:
      case PropInterface.PROP_TYPE_WALLPAPER_STYLE:
      case PropInterface.PROP_TYPE_LINES_IN_TABLE:
      case PropInterface.PROP_TYPE_HELP_SCR:
      case PropInterface.PROP_TYPE_DISPLAY_MENU:
      case PropInterface.PROP_TYPE_DISPLAY_TOOLBAR:
      case PropInterface.PROP_TYPE_TABBING_ORDER:
      case PropInterface.PROP_TYPE_ADDITIONAL_INFORMATION:
      case PropInterface.PROP_TYPE_PERSISTENT_FORM_STATE_VERSION:
        skip = true;
        break;

      default:
        break;
    }

    // refresh only the relevant subform properties (color, font, etc.)
    if (!skip && mgFormBase.isSubForm()) {
      skip = true;
      switch (this._id) {
        case PropInterface.PROP_TYPE_LEFT:
        case PropInterface.PROP_TYPE_TOP:
        case PropInterface.PROP_TYPE_WIDTH:
        case PropInterface.PROP_TYPE_HEIGHT:
          // FOR NOW, WEBCLIENT DOES NOT SUPPORT THE AUTOFIT PROPERTY
          //let mgControl: MgControlBase = mgFormBase.getSubFormCtrl();
          //let autoFit = <AutoFit>mgControl.GetComputedProperty(PropInterface.PROP_TYPE_AUTO_FIT).GetComputedValueInteger();
          //switch (autoFit) {
          //  case AutoFit.None:
          //  case AutoFit.AsControl:
          skip = true;
          break;
            //case AutoFit.AsCalledForm:
              // need to set the bounds as the called form only for the width and height
            //  skip = false;
            //  if (this._id === PropInterface.PROP_TYPE_LEFT || this._id === PropInterface.PROP_TYPE_TOP)
            //    skip = true;
            //  break;
          //}
          // break;

        case PropInterface.PROP_TYPE_FONT:
        case PropInterface.PROP_TYPE_COLOR:
        case PropInterface.PROP_TYPE_GRADIENT_COLOR:
        case PropInterface.PROP_TYPE_GRADIENT_STYLE:
        case PropInterface.PROP_TYPE_WALLPAPER:
        case PropInterface.PROP_TYPE_DEFAULT_BUTTON:
        case PropInterface.PROP_TYPE_CONTEXT_MENU:
        case PropInterface.PROP_TYPE_HORIZONTAL_PLACEMENT:
        case PropInterface.PROP_TYPE_VERTICAL_PLACEMENT:
        case PropInterface.PROP_TYPE_ALLOW_DROPPING:
          skip = false;
          break;
      }
    }

    return skip;
  }

  /// <summary>
  ///   return TRUE if the property need to be skip from the refresh properties. for a task
  /// </summary>
  /// <returns></returns>
  private ShouldSkipRefreshTask(): boolean {
    let skip: boolean = false;

    switch (this._id) {
      case PropInterface.PROP_TYPE_ALLOW_CREATE:
      case PropInterface.PROP_TYPE_ALLOW_DELETE:
      case PropInterface.PROP_TYPE_ALLOW_MODIFY:
      case PropInterface.PROP_TYPE_ALLOW_QUERY:
      case PropInterface.PROP_TYPE_ALLOW_RANGE:
      case PropInterface.PROP_TYPE_ALLOW_LOCATE:
      case PropInterface.PROP_TYPE_ALLOW_SORT:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_ALLOW_INDEX:
      case PropInterface.PROP_TYPE_TABBING_CYCLE:
      case PropInterface.PROP_TYPE_CONFIRM_CANCEL:
      case PropInterface.PROP_TYPE_CONFIRM_UPDATE:
      case PropInterface.PROP_TYPE_END_CONDITION:
      case PropInterface.PROP_TYPE_EVAL_END_CONDITION:
      case PropInterface.PROP_TYPE_FORCE_SUFFIX:
      case PropInterface.PROP_TYPE_FORCE_DELETE:
      case PropInterface.PROP_TYPE_TASK_MODE:
      case PropInterface.PROP_TYPE_SELECTION:
      case PropInterface.PROP_TYPE_TRASACTION_BEGIN:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_TRANSACTION_MODE:
      case PropInterface.PROP_TYPE_PRINT_DATA:
      case PropInterface.PROP_TYPE_CLOSE_TASKS_BY_MDI_MENU:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_OPEN_TASK_WINDOW:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_ALLOW_EVENTS:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_CHUNK_SIZE:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_INDEX_OPTIMIZATION:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_RANGE:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_RANGE_ORDER:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_LOCATE:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_LOCATE_ORDER:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_POSITION:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_POSITION_USAGE:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_SQL_RANGE:
        skip = true;
        break;

      default:
        break;
    }

    return skip;
  }

  /// <summary>
  ///   check if the property should be ignored by RefreshDisplay() skip properties which has nothing to do with
  ///   the display
  /// </summary>
  /// <returns> true if the property should be ignored</returns>
  private ShouldSkipRefresh(): boolean {
    let skip: boolean = false;
    switch (this._parentType) {
      case GuiConstants.PARENT_TYPE_CONTROL:
        skip = this.ShouldSkipRefreshControl();
        break;
      case GuiConstants.PARENT_TYPE_FORM:
        skip = this.ShouldSkipRefreshForm();
        break;
      case GuiConstants.PARENT_TYPE_TASK:
        skip = this.ShouldSkipRefreshTask();
        break;
      default:
        break;
    }

    switch (this._id) {
      case PropInterface.PROP_TYPE_POP_UP:
      case PropInterface.PROP_TYPE_ORIENTATION_LOCK:
      case PropInterface.PROP_TYPE_ENTER_ANIMATION:
      case PropInterface.PROP_TYPE_EXIT_ANIMATION:
      case PropInterface.PROP_TYPE_NAVIGATION_DRAWER_MENU:
      case PropInterface.PROP_TYPE_ACTION_BAR_MENU:
      case PropInterface.PROP_TYPE_TITLE_BAR_COLOR:
      case PropInterface.PROP_TYPE_MOBILE_BORDER_WIDTH:
      case PropInterface.PROP_TYPE_BORDER_FOCUS_WIDTH:
      case PropInterface.PROP_TYPE_BORDER_FOCUS_COLOR:
      case PropInterface.PROP_TYPE_CORNER_RADIUS:
      case PropInterface.PROP_TYPE_OPEN_PICKER:
      case PropInterface.PROP_TYPE_OPEN_EDIT_DIALOG:
      case PropInterface.PROP_TYPE_DEFAULT_ALIGNMENT:
      case PropInterface.PROP_TYPE_KEYBOARD_TYPE:
      case PropInterface.PROP_TYPE_KEYBOARD_RETURN_KEY:
      case PropInterface.PROP_TYPE_ALLOW_SUGGESTIONS:
      case PropInterface.PROP_TYPE_MOBILE_IMAGE_LIST_FILE_NAME:
        skip = true;
        break;
    }
    return skip;
  }

  /// <summary>
  ///   refresh the display for control properties and form properties only
  /// </summary>
  /// <param name = "forceRefresh">if true then refresh is forced regardless of the previous value</param>
  /// <param name = "currLine">line number in table when refreshing a column if the current line is refreshed set to
  ///   (Integer.MIN_VALUE)
  /// </param>
  private RefreshDisplayWithCurrentLine(forceRefresh: boolean, currLine: number): void {
    this.RefreshDisplayWithCurrLineAndCheckSkipRefresh(forceRefresh, currLine, true);
  }

  // This method checks if we must refresh the property even if it has expression
  // For now it returns true for properties with text for multilingual support

  // todo Need to add here check if user wants multilingual support at all
  SkipWhenNoExpression(): boolean {
    let skipWhenNoExpression = true;

    let ctrl = ((this._parentObj instanceof MgControlBase) ? <MgControlBase>this._parentObj : null);
    if ((ctrl != null && ctrl.isButton() && this._id === PropInterface.PROP_TYPE_FORMAT) ||
      (ctrl != null && ctrl.isComboBox() && this._id === PropInterface.PROP_TYPE_LABEL) ||
      (ctrl != null && ctrl.isListBox() && this._id === PropInterface.PROP_TYPE_LABEL) ||
      (ctrl != null && ctrl.isRadio() && this._id === PropInterface.PROP_TYPE_LABEL) ||
      (ctrl != null && ctrl.isCheckBox() && this._id === PropInterface.PROP_TYPE_LABEL) ||
      (ctrl != null && ctrl.isTabControl() && this._id === PropInterface.PROP_TYPE_LABEL) ||
      (ctrl != null && ctrl.isImageControl() && this._id === PropInterface.PROP_TYPE_IMAGE_FILENAME) ||
      (ctrl != null && ctrl.IsImageButton() && this._id === PropInterface.PROP_TYPE_IMAGE_FILENAME) ||
      (this._id === PropInterface.PROP_TYPE_DISPLAY_LIST) ||
      (this._id === PropInterface.PROP_TYPE_WALLPAPER) ||
      (this._id === PropInterface.PROP_TYPE_TEXT) ||
      (this._id === PropInterface.PROP_TYPE_TOOLTIP) ||
      (this._id === PropInterface.PROP_TYPE_HINT) ||
      (this._id === PropInterface.PROP_TYPE_BORDER) ||
      (this._id === PropInterface.PROP_TYPE_PASSWORD) ||
      (this._id === PropInterface.PROP_TYPE_USER_PROPERTIES)
      )
      skipWhenNoExpression = false;
    return skipWhenNoExpression;
  }
  /// <summary>
  /// Reevaluate the property value (if it has an expression) and
  /// refresh the display for control properties and form properties only
  ///
  /// This method was (as its name implies) relevant only for GUI properties, i.e. properties that affect on the display.
  /// Non-GUI properties (such as PROP_TYPE_TAB_IN) were skipped and not reevaluated.
  /// The distinction between GUI properties and non-GUI properties is done by the method �ShouldSkipRefresh�E
  /// Now we have non-GUI properties that are reevaluated in this function:
  /// PROP_TYPE_MODIFY_IN_QUERY, PROP_TYPE_CONTEXT_MENU, PROP_TYPE_TAB_IN, PROP_TYPE_PARK_ON_CLICK.
  /// For these properties we do not execute explicitly their expressions (it was done in 1.9 by CheckProp function),
  /// we only use their values by GetComputedBooleanProperty function. It is done for do not execute the property expression
  /// in GUI thread. In GUI thread we only use the property value. So it is needed to reevaluate the property value.
  /// </summary>
  /// <param name = "forceRefresh">if true then refresh is forced regardless of the previous value</param>
  /// <param name = "currLine">line number in table when refreshing a column if the current line is refreshed set to
  ///   (Integer.MIN_VALUE)
  /// </param>
  RefreshDisplayWithCurrLineAndCheckSkipRefresh(forceRefresh: boolean, currLine: number, checkSkipRefresh: boolean): void {
    let ctrl: MgControlBase = null;
    let line: number = 0;
    let prevValue: string;
    let valChanged: boolean = true;

    if (this._id !== PropInterface.PROP_TYPE_USER_PROPERTIES)
    {
      if (this._val === null && this._expId === 0) {
        Events.WriteExceptionToLog("in Property.RefreshDisplay() null value and expression");
        return;
      }
    }

    if (checkSkipRefresh && this.ShouldSkipRefresh())
      return;

    if (this._expId === 0 && this.SkipWhenNoExpression())
      return;

    if (this._prevValues.length === 0)
      this.setPrevArraySize();

    this.ComputeValue();

    // before update the property need to prepare data
    switch (this._parentType) {
        case GuiConstants.PARENT_TYPE_CONTROL:
            if (this._id === PropInterface.PROP_TYPE_USER_PROPERTIES)
                break;

        ctrl = <MgControlBase>this._parentObj;
        // recompute the PIC for format properties
        if (this._id === PropInterface.PROP_TYPE_FORMAT && this._expId > 0)
          ctrl.computePIC(this._val);

        if (ctrl.IsRepeatable && !ctrl.getForm().isRefreshRepeatableAllowed())
          return;

        if (currLine === Int32.MinValue)
          line = this.getLine();
        else
          line = currLine;

        // check if the value of the property was changed to prevent sending redundant
        // javascript commands to the browser
        prevValue = this._prevValues.get_Item(line);

        // Fixed bug #:160305 & 427851 while control is child of frame set force refresh for w\h
        if (ctrl.IsDirectFrameChild) {
          if (ctrl.ForceRefreshPropertyWidth && this._id === PropInterface.PROP_TYPE_WIDTH) {
            ctrl.ForceRefreshPropertyWidth = false;
            forceRefresh = true;
          }
          else if (ctrl.ForceRefreshPropertyHight && this._id === PropInterface.PROP_TYPE_HEIGHT) {
            ctrl.ForceRefreshPropertyHight = false;
            forceRefresh = true;
          }
        }

        if (!forceRefresh && (this._val === prevValue)
          && this._id !== PropInterface.PROP_TYPE_MODIFIABLE
          && this._id !== PropInterface.PROP_TYPE_ALLOW_PARKING
          && this._id !== PropInterface.PROP_TYPE_VISIBLE
          && this._id !== PropInterface.PROP_TYPE_ENABLED)
          return;

        // to prevent recursion while updating column visibility
        if (ctrl.Type === MgControlType.CTRL_TYPE_COLUMN
          && this._id === PropInterface.PROP_TYPE_VISIBLE
          && this._val === prevValue)
          return;

        if (this._val === prevValue)
          valChanged = false;

        this._prevValues.set_Item(line, this._val);
        break;

      case GuiConstants.PARENT_TYPE_FORM:
        // check if the value of the property was changed to prevent sending redundant
        // javascript commands to the browser
        prevValue = this._prevValues.get_Item(0);
        if (this._id === PropInterface.PROP_TYPE_USER_PROPERTIES)
          break;
        if (!forceRefresh && (this._val === prevValue))
          return;
        this._prevValues.set_Item(0, this._val);
        break;

      case GuiConstants.PARENT_TYPE_TASK: // TASK PROPERTIES
        Events.WriteExceptionToLog(
          NString.Format("Property.RefreshDisplay(): task property {0} wasn't handled", this._id));
        return;

      default:
        Events.WriteExceptionToLog(
          NString.Format("Property.RefreshDisplay(): parentType unknown, property {0} wasn't handled", this._id));
        return;
    }

    switch (this._id) {
      case PropInterface.PROP_TYPE_LEFT:
      case PropInterface.PROP_TYPE_TOP:
      case PropInterface.PROP_TYPE_WIDTH:
      case PropInterface.PROP_TYPE_HEIGHT:
        this.onBounds(this._id);
        break;

      case PropInterface.PROP_TYPE_WALLPAPER:
        this.onWallpaper();
        break;

      case PropInterface.PROP_TYPE_IMAGE_FILENAME:
        this.onImageFileName();
        break;

      case PropInterface.PROP_TYPE_IMAGE_LIST_INDEXES:
        this.onImageIdxList();
        break;

      case PropInterface.PROP_TYPE_COLOR:
        this.onColor();
        break;

      case PropInterface.PROP_TYPE_BORDER_COLOR:
        this.onBorderColor();
        break;

      case PropInterface.PROP_TYPE_GRADIENT_COLOR:
        this.onGradientColor();
        break;

      case PropInterface.PROP_TYPE_GRADIENT_STYLE:
        this.onGradientStyle();
        break;

      case PropInterface.PROP_TYPE_VISITED_COLOR:
        this.onVisitedColor();
        break;

      case PropInterface.PROP_TYPE_FOCUS_COLOR:
        this.onFocuseColor();
        break;

      case PropInterface.PROP_TYPE_HOVERING_COLOR:
        this.onHoveringColor();
        break;

      case PropInterface.PROP_TYPE_ALTERNATING_BG_COLOR:
        this.onAlternatingColor();
        break;

      case PropInterface.PROP_TYPE_TITLE_COLOR:
        this.onTitleColor();
        break;

      case PropInterface.PROP_TYPE_HOT_TRACK_COLOR:
        this.onHotTrackColor();
        break;

      case PropInterface.PROP_TYPE_SELECTED_TAB_COLOR:
        this.onSelectedTabColor();
        break;

      case PropInterface.PROP_TYPE_DIVIDER_COLOR:
        this.onDividerColor();
        break;

      case PropInterface.PROP_TYPE_SET_COLOR_BY:
        this.onColorBy();
        break;

      case PropInterface.PROP_TYPE_FONT:
        this.onFont();
        break;

      case PropInterface.PROP_TYPE_ENABLED:
        this.onEnable(valChanged);
        break;

      case PropInterface.PROP_TYPE_VISIBLE:
        this.onVisible(valChanged);
        break;

      case PropInterface.PROP_TYPE_HORIZONTAL_PLACEMENT:
        this.onHorizontalPlacement();
        break;

      case PropInterface.PROP_TYPE_VERTICAL_PLACEMENT:
        this.onVerticalPlacement();
        break;

      case PropInterface.PROP_TYPE_NAME:
        this.OnControlName();
        break;

      case PropInterface.PROP_TYPE_FORM_NAME:
        this.onFormName();
        break;

      case PropInterface.PROP_TYPE_COLUMN_TITLE:
        this.onText(0);
        break;

      case PropInterface.PROP_TYPE_TEXT:
        this.onText(line);
        break;

      case PropInterface.PROP_TYPE_HINT:
        this.onHint();
        break;

      case PropInterface.PROP_TYPE_HINT_COLOR:
        this.onHintColor();
        break;

      case PropInterface.PROP_TYPE_ALLOW_PARKING:
      case PropInterface.PROP_TYPE_MODIFIABLE:
        this.onNavigation(valChanged);
        break;

      case PropInterface.PROP_TYPE_TOOLTIP:
        this.onTooltip();
        break;

      case PropInterface.PROP_TYPE_DISPLAY_LIST:
        this.onDisplayList(line);
        break;

      case PropInterface.PROP_TYPE_VISIBLE_LAYERS_LIST:
        this.onVisibleLayerList(line);
        break;

      case PropInterface.PROP_TYPE_FORMAT:
        this.onFormat();
        break;

      case PropInterface.PROP_TYPE_LABEL:
        this.onLabel(line);
        break;

      case PropInterface.PROP_TYPE_MINIMUM_HEIGHT:
        this.onMinimumHeight();
        break;

      case PropInterface.PROP_TYPE_MINIMUM_WIDTH:
        this.onMinimumWidth();
        break;

      case PropInterface.PROP_TYPE_DEFAULT_BUTTON:
        this.onDefaultButton();
        break;

      case PropInterface.PROP_TYPE_VISIBLE_LINES:
        this.onVisibleLines();
        break;

      case PropInterface.PROP_TYPE_CHOICE_COLUMNS:
        this.onChoiceColumn(line);
        break;

      case PropInterface.PROP_TYPE_PLACEMENT:
        this.onPlacement();
        break;

      case PropInterface.PROP_TYPE_ALLOW_COL_RESIZE:
        this.onAllowColumnResiz();
        break;

      case PropInterface.PROP_TYPE_ROW_HEIGHT:
        this.onRowHeight();
        break;

      case PropInterface.PROP_TYPE_TITLE_HEIGHT:
        this.onTitleHeight();
        break;

      case PropInterface.PROP_TYPE_ALLOW_REORDER:
        this.onAllowReOrder();
        break;

      case PropInterface.PROP_TYPE_SORT_COLUMN:
        this.onColumnSortable();
        break;

      case PropInterface.PROP_TYPE_COL_ALLOW_FILTERING:
        this.onColumnFilterable();
        break;

      case PropInterface.PROP_TYPE_COLUMN_PLACEMENT:
        this.onColumnPlacement();
        break;

      case PropInterface.PROP_TYPE_ROW_HIGHLIGHT_COLOR:
        this.onRowHighlightColor();
        break;

      case PropInterface.PROP_TYPE_INACTIVE_ROW_HIGHLIGHT_COLOR:
        this.onIncactiveRowHighlightColor();
        break;

      case PropInterface.PROP_TYPE_PULLDOWN_MENU:
        this.refreshPulldownMenu();
        break;

      case PropInterface.PROP_TYPE_TRANSLATOR:
        this.onTranslator(); // JPN: IME support
        break;

      case PropInterface.PROP_TYPE_HORIZONTAL_ALIGNMENT:
        this.onHorizantalAlignment();
        break;

      case PropInterface.PROP_TYPE_VERTICAL_ALIGNMENT:
        this.onVerticalAlignment();
        break;

      case PropInterface.PROP_TYPE_RADIO_BUTTON_APPEARANCE:
        this.onRadioButtonAppearance();
        break;

      case PropInterface.PROP_TYPE_MULTILINE:
        this.onMultiline();
        break;

      case PropInterface.PROP_TYPE_THREE_STATES:
        this.onThreeStates();
        break;

      case PropInterface.PROP_TYPE_PASSWORD:
        this.onPassword();
        break;

      case PropInterface.PROP_TYPE_MULTILINE_WORDWRAP_SCROLL:
        this.onMultilineWordWrapScroll();
        break;

      case PropInterface.PROP_TYPE_MULTILINE_VERTICAL_SCROLL:
        this.onMultilineVerticalScroll();
        break;

      case PropInterface.PROP_TYPE_MULTILINE_ALLOW_CR:
        this.onMuliLineAllowCR();
        break;

      case PropInterface.PROP_TYPE_BORDER_STYLE:
        this.onBorderStyle();
        break;

      case PropInterface.PROP_TYPE_STYLE_3D:
        this.onStyle3D();
        break;

      case PropInterface.PROP_TYPE_CHECKBOX_MAIN_STYLE:
        this.onCheckBoxMainStyle();
        break;

      case PropInterface.PROP_TYPE_BORDER:
        this.onBorder();
        break;

      case PropInterface.PROP_TYPE_MINBOX:
        this.onMinBox();
        break;

      case PropInterface.PROP_TYPE_MAXBOX:
        this.onMaxBox();
        break;

      case PropInterface.PROP_TYPE_SYSTEM_MENU:
        this.onSystemMenu();
        break;

      case PropInterface.PROP_TYPE_TITLE_BAR:
        this.onTitleBar();
        break;

      case PropInterface.PROP_TYPE_WINDOW_TYPE:
        this.onWindowType();
        break;

      case PropInterface.PROP_TYPE_HEBREW:
        this.onRightToLeft();
        break;

      case PropInterface.PROP_TYPE_SHOW_FULL_ROW:
        this.onShowFullRow();
        break;

      case PropInterface.PROP_TYPE_SHOW_BUTTONS:
        this.onShowButtons();
        break;

      case PropInterface.PROP_TYPE_LINES_AT_ROOT:
        this.onLinesAsRoot();
        break;

      case PropInterface.PROP_TYPE_TRACK_SELECTION:
      case PropInterface.PROP_TYPE_HOT_TRACK:
        this.onHotTrack();
        break;

      case PropInterface.PROP_TYPE_TOP_BORDER:
        this.onTopBorder();
        break;

      case PropInterface.PROP_TYPE_RIGHT_BORDER:
        this.onRightBorder();
        break;

      case PropInterface.PROP_TYPE_SCROLL_BAR:
        this.onShowScrollbar();
        break;

      case PropInterface.PROP_TYPE_COLUMN_DIVIDER:
        this.onColumnDivider();
        break;

      case PropInterface.PROP_TYPE_LINE_DIVIDER:
        this.onLineDivider();
        break;

      case PropInterface.PROP_TYPE_ROW_HIGHLIGHT_STYLE:
        this.onRowHighLightType();
        break;

      case PropInterface.PROP_TYPE_LINE_STYLE:
        this.onLineStyle();
        break;

      case PropInterface.PROP_TYPE_LINE_WIDTH:
        this.onLineWidth();
        break;

      case PropInterface.PROP_TYPE_TAB_CONTROL_SIDE:
        this.onTabControlSide();
        break;

      case PropInterface.PROP_TYPE_TAB_CONTROL_TABS_WIDTH:
        this.onTabControlTabsWidth();
        break;

      case PropInterface.PROP_TYPE_STATIC_TYPE:
        this.onStaticType();
        break;

      case PropInterface.PROP_TYPE_ALLOW_DRAGGING:
        this.onAllowDrag();
        break;

      case PropInterface.PROP_TYPE_ALLOW_DROPPING:
        this.onAllowDrop();
        break;

      case PropInterface.PROP_TYPE_SELECTION_MODE:
        this.onSelectionMode();
        break;

      case PropInterface.PROP_TYPE_REFRESH_WHEN_HIDDEN:
        this.onRefreshWhenHidden();
        break;

      case PropInterface.PROP_TYPE_MODIFY_IN_QUERY:
      case PropInterface.PROP_TYPE_CONTEXT_MENU:
      case PropInterface.PROP_TYPE_TAB_IN:
      case PropInterface.PROP_TYPE_PARK_ON_CLICK:
      case PropInterface.PROP_TYPE_LOAD_IMAGE_FROM: // this property is used for identifying loading of image (Server/Client).
        // So no handling needed in RefreshDisplay
        break;

      case PropInterface.PROP_TYPE_TOP_BORDER_MARGIN:
        this.onTopBorderMargin();
        break;

      case PropInterface.PROP_TYPE_FILL_WIDTH:
        this.onFillWidth();
        break;

      case PropInterface.PROP_TYPE_MULTI_COLUMN_DISPLAY:
        this.onMultiColumnDisplay();
        break;

      case PropInterface.PROP_TYPE_SHOW_ELLIPISIS:
        this.onShowEllipsis();
        break;

      case PropInterface.PROP_TYPE_TITLE_PADDING:
        this.onTitlePadding();
        break;

      case PropInterface.PROP_TYPE_ROW_BG_COLOR:
        this.onRowBGColor(line);
        break;

      case PropInterface.PROP_TYPE_USER_PROPERTIES:
        this.onUserProperties();
        break;

      default:
        Events.WriteExceptionToLog(
          NString.Format("Property.RefreshDisplay(): Property {0} wasn't handled", this._id));
        break;
    }
  }

  /// <summary>
  /// the following properties need to calculate once only
  /// </summary>
  /// <returns></returns>
  private ShouldBeComputedOnce(): boolean {
    if (this._parentType === GuiConstants.PARENT_TYPE_TASK) {
      switch (this._id) {
        case PropInterface.PROP_TYPE_TASK_MODE:
        case PropInterface.PROP_TYPE_TABBING_CYCLE:
        case PropInterface.PROP_TYPE_TASK_PROPERTIES_OPEN_TASK_WINDOW:
        case PropInterface.PROP_TYPE_TASK_PROPERTIES_ALLOW_EVENTS:
        case PropInterface.PROP_TYPE_ALLOW_LOCATE_IN_QUERY:
        case PropInterface.PROP_TYPE_PRINT_DATA:
        case PropInterface.PROP_TYPE_ALLOW_RANGE:
        case PropInterface.PROP_TYPE_ALLOW_LOCATE:
        case PropInterface.PROP_TYPE_ALLOW_SORT:
        case PropInterface.PROP_TYPE_TASK_PROPERTIES_ALLOW_INDEX:
        case PropInterface.PROP_TYPE_MAIN_DISPLAY:
          return true;
      }
    }
    else if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      if (this._id === PropInterface.PROP_TYPE_IS_CACHED || this._id === PropInterface.PROP_TYPE_MULTILINE)
        return true;
    }

    return false;
  }

  /// <summary>
  /// if the value is computed in the server
  /// </summary>
  /// <returns></returns>
  private IsComputedOnceOnServer(): boolean {
    if (this.ShouldBeComputedOnce()) {
      let task: TaskBase = this.GetTaskByParentObject();
      if (task != null)
        return !task.ShouldEvaluatePropertyLocally(this._id);
    }
    return false;
  }

  /// <summary>
  ///   computes the value of the property and does not affect the display
  /// </summary>
  private ComputeValue(): void {
    let result: string = null;
    let len: number = 255;
    let wasEvaluated: RefParam<boolean> = new RefParam(false);

    if (this._expId > 0) {
      // for offline : compute once the properties that was compute on the server
      if (this.ShouldBeComputedOnce() && this._expAlreadyComputedOnce)
        return;

      this._expAlreadyComputedOnce = true;

      // for following control properties always evaluate expressions
      let alwaysEvaluate: boolean = false;
      if (this._id === PropInterface.PROP_TYPE_ROW_PLACEMENT)
        alwaysEvaluate = true;
      else if (this._parentType === GuiConstants.PARENT_TYPE_TASK)
        alwaysEvaluate = true;

      if (this._id === PropInterface.PROP_TYPE_FORMAT) {
        len = 65535;
        result = StrUtil.rtrim(this._parentObj.EvaluateExpression(this._expId, this._dataType, len, true,
          StorageAttribute.SKIP, alwaysEvaluate, wasEvaluated));
      }
      else {
        try {
          result = this._parentObj.EvaluateExpression(this._expId, this._dataType, len, true, StorageAttribute.SKIP, alwaysEvaluate, wasEvaluated);
        }
        catch (e) {
          let warningMsg = new StringBuilder("Exception: " + e.Message);
          if (this._parentObj instanceof MgControlBase)
            warningMsg.Append(" Control: " + (<MgControlBase>this._parentObj).Name);
          Events.WriteWarningToLog(warningMsg.ToString());
        }

      }

      if (wasEvaluated.value) {
        result = this.updateResult(result);
        this.setValue(result);
      }
      else if (this._val == null && this._parentType !== GuiConstants.PARENT_TYPE_CONTROL) {
        result = PropDefaults.getDefaultValue(this._id, this._parentType, this._parentObj);
        this.setValue(result);
      }
    }
  }

  /// <summary>
  ///   updates results of expression for some properties
  /// </summary>
  /// <param name = "result"> </param>
  /// <returns> </returns>
  private updateResult(result: string): string {
    switch (this._id) {
      case PropInterface.PROP_TYPE_LEFT:
      case PropInterface.PROP_TYPE_WIDTH:
      case PropInterface.PROP_TYPE_TOP:
      case PropInterface.PROP_TYPE_HEIGHT:
      case PropInterface.PROP_TYPE_MINIMUM_WIDTH:
      case PropInterface.PROP_TYPE_MINIMUM_HEIGHT:
        result = this.updateNavigatorResult(result);
        break;

      case PropInterface.PROP_TYPE_FORMAT:
        if (result == null)
          result = NString.Empty;
        break;

      case PropInterface.PROP_TYPE_TASK_MODE:
        result = Property.updateTaskModeResult(result);
        break;

      default:
        return result;
    }

    return result;
  }

  /// <summary>
  /// do the same as we doing for c++ Uchar RT::tsk_mode_exp (long exp, Uchar mode)
  /// </summary>
  /// <param name="result"></param>
  /// <returns></returns>
  private static updateTaskModeResult(result: string): string {
    let code: string = ' ';
    if (!NString.IsNullOrEmpty(result)) {
      code = result[0].toUpperCase();
      switch (code) {
        case 'Q':
          code = 'E';
          break;
        case 'F':
          code = 'O';
          break;
        case 'O':
          code = 'N';
          break;
      }
    }

    return code;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="result"></param>
  /// <returns></returns>
  private updateNavigatorResult(result: string): string {
    // convert the xml number to be number
    let tempPic = new PIC("N6.2", StorageAttribute.NUMERIC, this._parentObj.getCompIdx());
    let dispVal: string = DisplayConvertor.Instance.mg2disp(result, "", tempPic, false,  this._parentObj.getCompIdx(), false);
    result = dispVal.trim();

    let form: MgFormBase = null;
    if (this._parentType === GuiConstants.PARENT_TYPE_FORM)
      form = <MgFormBase>this._parentObj;
    else if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      form = (<MgControlBase>this._parentObj).getForm();

    let val: number = new NUM_TYPE(result, tempPic, this._parentObj.getCompIdx()).to_double();

    // for coordinates result of expressions should be multiplied by factor
    switch (this._id) {
      case PropInterface.PROP_TYPE_MINIMUM_WIDTH:
      case PropInterface.PROP_TYPE_LEFT:
      case PropInterface.PROP_TYPE_WIDTH:
        val *= form.getHorizontalFactor();
        break;

      case PropInterface.PROP_TYPE_TOP:
      case PropInterface.PROP_TYPE_HEIGHT:
      case PropInterface.PROP_TYPE_MINIMUM_HEIGHT:
        val *= form.getVerticalFactor();
        break;

      default:
        Debug.Assert(false);
        break;
    }

    // convert float to integer and to string
    dispVal = val.toString();

    // convert the number to xml number
    result = DisplayConvertor.Instance.disp2mg(dispVal, "", tempPic, this._parentObj.getCompIdx(), BlobType.CONTENT_TYPE_UNKNOWN);

    return result;
  }

  /// <summary>
  ///   get the value of the property
  /// </summary>
  getValue(): string {
    this.ComputeValue();
    return this._val;
  }

  /// <summary>
  ///   returns the integer value of this property
  /// </summary>
  /// <returns> int value of this property</returns>
  getValueInt(): number {
    let result: number = 0;

    this.ComputeValue();

    if (this._val !== null)
      result = NNumber.Parse(this._val);

    return result;
  }

  /// <summary>
  /// returns the integer value of this property without execute its expression
  /// </summary>
  /// <returns> int value of this property</returns>
  GetComputedValueInteger(): number {
    return NNumber.Parse(this._val);
  }

  /// <summary>
  ///   get rectangle value
  /// </summary>
  /// <returns></returns>
  getValueRect(): MgRectangle {
    if (this._val === null)
      return null;

    return DisplayConvertor.toRect(this._val);
  }

  /// <summary>
  ///   returns a boolean value of the property valid only for logical type properties
  /// </summary>
  getValueBoolean(): boolean {
    if (this._dataType === StorageAttribute.BOOLEAN) {
      this.getValue();
      return DisplayConvertor.toBoolean(this._val);
    }
    else {
      Events.WriteExceptionToLog(NString.Format("Property.getValueBoolean() was called for non boolean type property: {0}", this._id));
    }
  }

  /// <summary>
  /// Get the computed value.
  /// </summary>
  /// <returns></returns>
  GetComputedValue(): string {
    return this._val;
  }

  /// <summary>
  /// get the computed boolean value of the property without execute its expression
  /// </summary>
  GetComputedValueBoolean(): boolean {
    if (this._dataType === StorageAttribute.BOOLEAN) {
      return DisplayConvertor.toBoolean(this._val);
    }
    else {
      Events.WriteExceptionToLog(NString.Format("Property.getValueBoolean() was called for non boolean type property: {0}", this._id));
    }
  }

  ///   returns the previous value of the property in the specified line of the table
  /// </summary>
  /// <param name = "line">the requested line number</param>
  getPrevValue(line: number): string {
    if (line < this._prevValues.length)
      return this._prevValues.get_Item(line);
    return null;
  }

  /// <summary>
  ///   returns true if this property has an expression
  /// </summary>
  isExpression(): boolean {
    return this._expId > 0;
  }

  /// <summary>
  ///
  /// </summary>
  /// <returns></returns>
  GetExpressionId(): number {
    return this._expId;
  }

  /// <summary>
  ///   change the color of a window
  /// </summary>
  private onColor(): void {
    // set the background color
    // if (this._parentType === GuiConstants.PARENT_TYPE_FORM || this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
    //   this.onBGColor();
    // // set the foreground color
    // if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
    //   this.onFGColor();

    let colorIndex = this.getValueInt();
    if (colorIndex > 0)
    {
      Commands.addOperationWithLine(CommandType.SET_CLASS, this.getObjectByParentObj(), this.getLine(), "color", "mgColor" + colorIndex);
  }
  }

  /// <summary>
  /// Change the Border color of the control
  /// </summary>
  private onBorderColor(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let colorIndex: number = this.GetComputedValueInteger();

      if (colorIndex > 0) {
        Commands.addOperationWithLine(CommandType.SET_CLASS, this.getObjectByParentObj(), this.getLine(), "borderColor", "mgBorderColor" + colorIndex);
    }
    else
      throw new ApplicationException("in Property.onBorderColor()");
  }
  }

  /// <summary>
  ///   change the gradient color of a window
  /// </summary>
  private onGradientColor(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL || this._parentType === GuiConstants.PARENT_TYPE_FORM) {
      // let gradientFromColor: MgColor = Manager.GetColorsTable().getFGColor(this.getValueInt());
      // let gradientToColor: MgColor = Manager.GetColorsTable().getBGColor(this.getValueInt());
      // Commands.addAsync(CommandType.PROP_SET_GRADIENT_COLOR, this.getObjectByParentObj(), this.getLine(),
      //   gradientFromColor, gradientToColor);
    }
    else
      throw new ApplicationException("in Property.onGradientColor()");
  }

  /// <summary>
  ///   change the gradient style of a window
  /// </summary>
  private onGradientStyle(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL || this._parentType === GuiConstants.PARENT_TYPE_FORM)
      Commands.addAsync(CommandType.PROP_SET_GRADIENT_STYLE, this.getObjectByParentObj(), this.getLine(), this.GetComputedValueInteger());
    else
      throw new ApplicationException("in Property.onGradientStyle()");
  }

  /// <summary>
  ///   change the color of the row highlight of the table
  /// </summary>
  private onRowHighlightColor(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      // let mgColor: MgColor = Manager.GetColorsTable().getBGColor(this.getValueInt());
      // Commands.addAsync(CommandType.PROP_SET_ROW_HIGHLIGHT_BGCOLOR, this.getObjectByParentObj(), 0, mgColor);
      //
      // mgColor = Manager.GetColorsTable().getFGColor(this.getValueInt());
      // Commands.addAsync(CommandType.PROP_SET_ROW_HIGHLIGHT_FGCOLOR, this.getObjectByParentObj(), 0, mgColor);
    }
    else
      throw new ApplicationException("in Property.onRowHighlightColor()");
  }

  private onIncactiveRowHighlightColor(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      // let mgColor: MgColor = Manager.GetColorsTable().getBGColor(this.getValueInt());
      // Commands.addAsync(CommandType.PROP_SET_INACTIVE_ROW_HIGHLIGHT_BGCOLOR, this.getObjectByParentObj(), 0, mgColor);
      //
      // mgColor = Manager.GetColorsTable().getFGColor(this.getValueInt());
      // Commands.addAsync(CommandType.PROP_SET_INACTIVE_ROW_HIGHLIGHT_FGCOLOR, this.getObjectByParentObj(), 0, mgColor);
    }
    else
      throw new ApplicationException("in Property.onIncactiveRowHighlightColor()");
  }

  /// <summary>
  ///   change t the alternating color of the table
  /// </summary>
  private onAlternatingColor(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      // let mgColor: MgColor = Manager.GetColorsTable().getBGColor(this.GetComputedValueInteger());
      // Commands.addAsync(CommandType.PROP_SET_ALTENATING_COLOR, this.getObjectByParentObj(), 0, mgColor);
    }
    else
      throw new ApplicationException("in Property.onAlternatingColor()");
  }

  /// <summary>
  ///   change t the alternating color of the table
  /// </summary>
  private onTitleColor(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let colorIndex: number = this.getValueInt();
      // let bgColor: MgColor = null;
      // let fgColor: MgColor = null;
      //
      // if (colorIndex > 0) {
      //   bgColor = Manager.GetColorsTable().getBGColor(this.getValueInt());
      //   fgColor = Manager.GetColorsTable().getFGColor(this.getValueInt());
      // }
      //
      // let addTitleColorCommand: boolean = true;
      //
      // let ctrl = <MgControlBase>this._parentObj;
      //
      // if (addTitleColorCommand)
      //   Commands.addAsync(CommandType.PROP_SET_TITLE_COLOR, this.getObjectByParentObj(), 0, bgColor);
      //
      // if (ctrl.isTabControl())
      //   Commands.addAsync(CommandType.PROP_SET_TITLE_FGCOLOR, this.getObjectByParentObj(), 0, fgColor);
    }
    else
      throw new ApplicationException("in Property.onTitleColor()");
  }

  /// <summary>
  /// set hot track color of Tab control
  /// </summary>
  private onHotTrackColor(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let ctrl = <MgControlBase>this._parentObj;
      if (ctrl.isTabControl()) {
        // let colorIndex: number = this.getValueInt();
        // let bgColor: MgColor = null;
        // let fgColor: MgColor = null;
        //
        // if (colorIndex > 0) {
        //   bgColor = Manager.GetColorsTable().getBGColor(this.getValueInt());
        //   fgColor = Manager.GetColorsTable().getFGColor(this.getValueInt());
        // }
        //
        // Commands.addAsync(CommandType.PROP_SET_HOT_TRACK_COLOR, this.getObjectByParentObj(), 0, bgColor);
        // Commands.addAsync(CommandType.PROP_SET_HOT_TRACK_FGCOLOR, this.getObjectByParentObj(), 0, fgColor);
      }
    }
    else
      throw new ApplicationException("in Property.onHotTrackColor()");
  }

  /// <summary>
  /// set selected tab color for tab control
  /// </summary>
  private onSelectedTabColor(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let ctrl = <MgControlBase>this._parentObj;
      if (ctrl.isTabControl()) {
        let colorIndex: number = this.getValueInt();
        // let bgColor: MgColor = null;
        // let fgColor: MgColor = null;
        //
        // if (colorIndex > 0) {
        //   bgColor = Manager.GetColorsTable().getBGColor(this.getValueInt());
        //   fgColor = Manager.GetColorsTable().getFGColor(this.getValueInt());
        // }
        //
        // Commands.addAsync(CommandType.PROP_SET_SELECTED_TAB_COLOR, this.getObjectByParentObj(), 0, bgColor);
        // Commands.addAsync(CommandType.PROP_SET_SELECTED_TAB_FGCOLOR, this.getObjectByParentObj(), 0, fgColor);
      }
    }
    else
      throw new ApplicationException("in Property.onSelectedTabColor()");
  }

  /// <summary>
  /// Change table divider color
  /// </summary>
  private onDividerColor(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      // let mgColor: MgColor = null;
      // let colorIndex: number = this.getValueInt();
      //
      // if (colorIndex > 0)
      //   Manager.GetColorsTable().getFGColor(this.getValueInt());
      //
      // Commands.addAsync(CommandType.PROP_SET_DIVIDER_COLOR, this.getObjectByParentObj(), 0, mgColor);
    }
    else
      throw new ApplicationException("inProperty.onDividerColor()");
  }

  /// <summary>
  ///   change property setColorBy
  /// </summary>
  private onColorBy(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_SET_COLOR_BY, this.getObjectByParentObj(), 0, this.GetComputedValueInteger());
    else
      throw new ApplicationException("in Property.onColorBy()");
  }

  /// <summary>
  ///   change the font on the control
  /// </summary>
  private onFont(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_FORM || this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let fontIndex: number = this.getValueInt();
      // let mgFont: MgFont = Manager.GetFontsTable().getFont(fontIndex);
      // Commands.addAsync(CommandType.PROP_SET_FONT, this.getObjectByParentObj(), this.getLine(), mgFont, fontIndex);
      if (fontIndex > 0) {
        Commands.addOperationWithLine(CommandType.SET_CLASS, this.getObjectByParentObj(), this.getLine(), "font", "mgFont" + fontIndex);
      }
    }
    else
      throw new ApplicationException("in Property.onFont()");
  }

  /// <summary>
  /// </summary>
  private onFocuseColor(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let mgControlBase: MgControlBase = <MgControlBase>this._parentObj;
      if (mgControlBase.isTextControl()) {
        let colorIndex: number = this.getValueInt();
        if (colorIndex > 0) {
          Commands.addOperationWithLine(CommandType.SET_CLASS, this.getObjectByParentObj(), this.getLine(), "focuscolor", "mgFocusColor" + colorIndex);
        }
      }
    }
  }

  /// <summary>
  /// </summary>
  private onHoveringColor(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let mgControlBase: MgControlBase = <MgControlBase>this._parentObj;
      if (mgControlBase.IsHyperTextButton()) {
        let colorIndex: number = this.getValueInt();
        // let mgFGColor: MgColor = Manager.GetColorsTable().getFGColor(colorIndex);
        // let mgBGColor: MgColor = Manager.GetColorsTable().getBGColor(colorIndex);
        // Commands.addAsync(CommandType.PROP_SET_HOVERING_COLOR, this.getObjectByParentObj(), this.getLine(), mgFGColor, mgBGColor, colorIndex);
      }
    }
  }

  /// <summary>
  /// </summary>
  private onVisitedColor(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let mgControlBase: MgControlBase = <MgControlBase>this._parentObj;
      if (mgControlBase.IsHyperTextButton()) {
        let colorIndex: number = this.getValueInt();
        // let mgFGColor: MgColor = Manager.GetColorsTable().getFGColor(colorIndex);
        // let mgBGColor: MgColor = Manager.GetColorsTable().getBGColor(colorIndex);
        // Commands.addAsync(CommandType.PROP_SET_VISITED_COLOR, this.getObjectByParentObj(), this.getLine(), mgFGColor, mgBGColor, colorIndex);
      }
    }
  }

  /// <summary>
  /// </summary>
  private onWallpaper(): void {
    // Get the of the property
    if (this._parentType === GuiConstants.PARENT_TYPE_FORM || this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      // let wallpapaerStyleProp: Property = this._parentObj.getProp(PropInterface.PROP_TYPE_WALLPAPER_STYLE);
      let wallpaper: string = this.getValue();
      if (wallpaper != null)
        wallpaper = wallpaper.trim();

      wallpaper = Events.TranslateLogicalName(wallpaper);

      if (!Misc.IsWebUrl(wallpaper))
        wallpaper = "/assets/images/" + wallpaper;

      Commands.addOperationWithLine(CommandType.SET_STYLE, this.getObjectByParentObj(), 0, MagicProperties.Wallpaper, wallpaper);

    }
    else
      throw new ApplicationException("in Property.onWallpaper()");
  }

  /// <summary>
  /// </summary>
  private onImageFileName(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let mgControlBase: MgControlBase = <MgControlBase>this._parentObj;
      if (mgControlBase.isTabControl()) {
        mgControlBase.setImageList(this.getValue());
      }
      else if (mgControlBase.isImageControl() || mgControlBase.isRadio() || mgControlBase.isCheckBox() || mgControlBase.IsImageButton()) {
        mgControlBase.setImageWithFileName(this.getValue());
      }
    }
    else
      throw new ApplicationException("in onImageFileName.onEnable()");
  }

  /// <summary>
  /// </summary>
  private onImageIdxList(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let value: string = this.getValue();
      if (value !== null) {
        // translate comma delimited string into int array
        let intArray: number[] = Misc.GetIntArray(value);
        Commands.addAsync(CommandType.PROP_SET_IMAGE_LIST_INDEXES, this.getObjectByParentObj(), this.getLine(), intArray);
      }
      return;
    }
    throw new ApplicationException("in onImageIdxList.onEnable()");
  }

  /// <summary>
  /// </summary>
  private onEnable(valChanged: boolean): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let ctrl: MgControlBase = <MgControlBase>this._parentObj;
      let currentEditingControl: MgControlBase = ctrl.getForm().getTask().CurrentEditingControl;

      // ACT_TBL_NXTFLD is added in queue, whenever current control is hidden or disabled to set the focus to next control for both RC & OL
      // which is correct behavior. But once current ctrl is already disabled/hidden , we should not put the same action
      // in queue again when same ctrl is disabled/hidden multiple times.
      if (this._val !== null && this._val === "0" && valChanged && currentEditingControl !== null &&
        (ctrl === currentEditingControl || currentEditingControl.isDescendentOfControl(ctrl) || ctrl === currentEditingControl.getLinkedParent(false))) {
        let parkedControl: MgControlBase = ctrl.getForm().getTask().getLastParkedCtrl();
        if (parkedControl !== null && parkedControl.InControl && (ctrl === parkedControl || parkedControl.isDescendentOfControl(ctrl))) {
          Events.OnNonParkableLastParkedCtrl(ctrl);
          ctrl.getForm().getTask().CurrentEditingControl = null;
        }
      }
      ctrl.SetEnabled(this.getValueBoolean());
    }
    else
      throw new ApplicationException("in Property.onEnable()");
  }

  /// <summary>
  /// </summary>
  private onVisible(valChanged: boolean): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let ctrl: MgControlBase = <MgControlBase>this._parentObj;
      let currentEditingControl: MgControlBase = ctrl.getForm().getTask().CurrentEditingControl;
      if (this._val !== null && this._val === "0" && valChanged && currentEditingControl !== null &&
        (ctrl === currentEditingControl || currentEditingControl.isDescendentOfControl(ctrl) || ctrl === currentEditingControl.getLinkedParent(false))) {
        let parkedControl: MgControlBase = ctrl.getForm().getTask().getLastParkedCtrl();
        if (parkedControl !== null && parkedControl.InControl && (ctrl === parkedControl || parkedControl.isDescendentOfControl(ctrl))) {
          Events.OnNonParkableLastParkedCtrl(ctrl);
          ctrl.getForm().getTask().CurrentEditingControl = null;
        }
      }
      ctrl.updatePropertyLogicNesting(PropInterface.PROP_TYPE_VISIBLE, CommandType.PROP_SET_VISIBLE, this.getValueBoolean(), true);

      // Defect # 137523 : In case of AllowTesting = N, if visibility of text control is set to false, logical control drawn for it,
      // is hidden and actual text control attached to it is moved to control to whom focus is set. But in defect scenario, If visibility
      // set to false for text control on re-compute and focus is moved to some other form instead of  some other control on the same form.
      // The control is still is  visible. The reason is : The logical control is hidden , but the text control attached to it is at same position
      // & is not hidden. So, control remains visible (in defect scenario it is orphan form). So to fix this problem,
      // add command REFRESH_TMP_EDITOR to refresh it.
      // if (this._val !== null && this._val === "0" && valChanged && ctrl.isTextControl()) {
      //   Commands.addAsync(CommandType.REFRESH_TMP_EDITOR, ctrl.getForm(), true);
      // }
    }
  }

  /// <summary>
  /// </summary>
  private onHorizontalPlacement(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      Commands.addAsync(CommandType.PROP_HORIZONTAL_PLACEMENT, this.getObjectByParentObj(), this.getLine(), this.getValueBoolean());
    }
  }

  /// <summary>
  /// </summary>
  private onVerticalPlacement(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      Commands.addAsync(CommandType.PROP_VERTICAL_PLACEMENT, this.getObjectByParentObj(), this.getLine(), this.getValueBoolean());
    }
  }

  /// <summary>
  /// </summary>
  private OnControlName(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      if (Manager.Environment.GetSpecialSwfControlNameProperty()) {
        Commands.addAsync(CommandType.PROP_SET_CONTROL_NAME, this._parentObj, this.getLine(), this.GetComputedValue(), 0);
      }
    }
    else
      throw new ApplicationException("in Property.OnControlName()");
  }

  /// <summary>
  /// set hint for edit control property
  /// </summary>
  private onHint(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let control: MgControlBase = <MgControlBase>this.getObjectByParentObj();
      let translatedString: string = Events.Translate(this.getValue());

      if (!control.IsDateTimePicture() && (!control.IsTableChild || control.IsTableHeaderChild)) {
        Commands.addOperationWithLine(CommandType.SET_PROPERTY, this.getObjectByParentObj(), this.getLine(), "placeholder", translatedString);
      }
    }
    else
      throw new ApplicationException("inProperty.onHint()");
  }

  private onHintColor(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let control: MgControlBase = <MgControlBase>this.getObjectByParentObj();

      if (!control.IsDateTimePicture() && !control.IsTableChild) {
        let colorIndex: number = this.getValueInt();

        if (colorIndex > 0)
          Commands.addOperationWithLine(CommandType.SET_CLASS, this.getObjectByParentObj(), this.getLine(), "hintcolor", "mgHintColor" + colorIndex);

      }
    }
    else
      throw new ApplicationException("inProperty.onHintColor()");
  }

  /// <summary>
  /// </summary>
  private onFormName(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_FORM)
      this.addCommandTypeText(0);
    else
      throw new ApplicationException("in Property.onFormName()");
  }

  /// <summary>
  /// </summary>
  private addCommandTypeText(line: number): void {
    let mlsTransValue: string = Events.Translate(this.getValue());

    // Fixed bug#:733480 SystemBox = false and title is empty-> .NET hide the title.
    // we will set it to ' '
    if (this._parentType === GuiConstants.PARENT_TYPE_FORM ||
      (this._parentType === GuiConstants.PARENT_TYPE_CONTROL && (<MgControlBase>this._parentObj).isColumnControl())) {
      // #737488: When variable attached to form's text property, spaces are appended
      // after actual value, equal to picture of variable. Before setting text remove these extra
      // spaces at the end.
      mlsTransValue = StrUtil.rtrim(mlsTransValue);
      if (this._parentType === GuiConstants.PARENT_TYPE_FORM && mlsTransValue === NString.Empty) {
        mlsTransValue = " ";
      }
    }
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL && ((<MgControlBase>this._parentObj).isTextControl()
        || ((<MgControlBase>this._parentObj).isButton()))) // need to check for hypertext or other types of button
      Commands.addValueWithLine(CommandType.SET_VALUE, this._parentObj, line, mlsTransValue);
    else
      Commands.addOperationWithLine(CommandType.SET_PROPERTY, this._parentObj, line, "text", mlsTransValue);


  }

  /// <summary>
  /// </summary>
  private onText(line: number): void {
    this.addCommandTypeText(line);
  }

  /// <summary>
  /// </summary>
  private onNavigation(valChanged: boolean): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let ctrl: MgControlBase = <MgControlBase>this._parentObj;
      let currentEditingControl: MgControlBase = ctrl.getForm().getTask().CurrentEditingControl;

      if (ctrl.isTextControl()) {
        let task: TaskBase = this.GetTaskByParentObject();

        // get the other property
        let otherProp: Property;
        if (this._id === PropInterface.PROP_TYPE_ALLOW_PARKING)
          otherProp = ctrl.getProp(PropInterface.PROP_TYPE_MODIFIABLE);
        else
          otherProp = ctrl.getProp(PropInterface.PROP_TYPE_ALLOW_PARKING);

        let readOnlyValue: boolean = !this.getValueBoolean();

        // if the value of the this property is true and the other property
        // exists then the other property's value determines the value of this
        // property
        if (!readOnlyValue && otherProp !== null)
          readOnlyValue = !otherProp.GetComputedValueBoolean();

        if ((readOnlyValue || task.getMode() !== Constants.TASK_MODE_QUERY) && ctrl.GetCurrReadOnly() !== readOnlyValue) {
          ctrl.SetCurrReadOnly(readOnlyValue);

          // JPN: IME support (enable IME in query mode)
          if (UtilStrByteMode.isLocaleDefLangDBCS() && !ctrl.isMultiline()) {
            if (ctrl.getForm().getTask().checkProp(PropInterface.PROP_TYPE_ALLOW_LOCATE_IN_QUERY, false)) {
              return;
            }
          }

          if (this._id === PropInterface.PROP_TYPE_ALLOW_PARKING && valChanged && this._val === "0" && currentEditingControl !== null &&
            (ctrl === currentEditingControl || currentEditingControl.isDescendentOfControl(ctrl) || ctrl === currentEditingControl.getLinkedParent(false))) {
            let parkedControl: MgControlBase = ctrl.getForm().getTask().getLastParkedCtrl();
            if (parkedControl !== null && parkedControl.InControl && (ctrl === parkedControl || parkedControl.isDescendentOfControl(ctrl))) {
              Events.OnNonParkableLastParkedCtrl(ctrl);
              ctrl.getForm().getTask().CurrentEditingControl = null;
            }
          }

          Commands.addOperationWithLine(CommandType.SET_PROPERTY, this.getObjectByParentObj(), this.getLine(), "readOnly",readOnlyValue);

        }
      }
    }
    else
      throw new ApplicationException("in Property.onNavigation()");
  }

  /// <summary>
  /// </summary>
  private onTooltip(): void {
    let toolTip: string;

    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let mgControlBase: MgControlBase = <MgControlBase>this._parentObj;

      // Tooltip expression returns string
      if (this._expId === 0)
        toolTip = (<ToolTipHelp>mgControlBase.getForm().getTask().getHelpItem(NNumber.Parse(this._val))).tooltipHelpText;
      else
        toolTip = this._val;

      // #929889: Remove extra white spaces at the end of tooltip text.
      toolTip = StrUtil.rtrim(toolTip);
      Commands.addOperationWithLine(CommandType.SET_PROPERTY, mgControlBase, this.getLine(), "tooltip", toolTip);
    }
    else
      throw new ApplicationException("in Property.onTooltip()");
  }

  private onPlacement(): void {
    let valueRect: MgRectangle = this.getValueRect();
    if (valueRect !== null) {
      Commands.addAsync(CommandType.PROP_SET_PLACEMENT, this._parentObj, this.getLine(), valueRect.x, valueRect.y, valueRect.width, valueRect.height, false, false);
    }
  }

  /// <summary>
  /// </summary>
  private onDisplayList(currLine: number): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let ctrl: MgControlBase = <MgControlBase>this._parentObj;

      if (ctrl.isSelectionCtrl() || ctrl.isTabControl() || ctrl.isRadio()) {
        let line: number = (currLine === Int32.MinValue) ? ctrl.getDisplayLine(false) : currLine;
        ctrl.refreshAndSetItemsList(line, true);
      }
    }
    else
      throw new ApplicationException("in Property.onDisplayList()");
  }

  /// <summary>
  /// </summary>
  /// <param name = "currLine"></param>
  private onVisibleLayerList(currLine: number): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let ctrl: MgControlBase = <MgControlBase>this._parentObj;
      let line: number = 0;

      if (currLine === Int32.MinValue)
        line = ctrl.getDisplayLine(false);
      else
        line = currLine;

      // Always layering should be performed on Displaylist. But,
      // DisplayList and itemList should not be refreshed.
      ctrl.refreshTabForLayerList(line);
    }
    else
      throw new ApplicationException("in Property.onVisibleLayerList()");
  }

  /// <summary>
  /// </summary>
  private onFormat(): void {
    let ctrl: MgControlBase = null;
    let ctrlPic: PIC;

    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      ctrl = <MgControlBase>this._parentObj;
      ctrlPic = ctrl.getPIC();
      ctrl.resetPrevVal();

      switch (ctrl.Type) {
        case MgControlType.CTRL_TYPE_BUTTON:
          // if the button doesn't have field we need to set the format as the text of the control,
          // otherwise, the field value will set the text on the control
          // in addition we need to set the text for image button
          // Also, do not override the text with the format if the control has an expression.
          // QCR# 938933. When the control is refreshed for the first time, we should show the text as it
          // is in the Format property - irrespective of whether field or expression is attached to it or not.
          // The fix is confined to ControlTypes.CTRL_TYPE_BUTTON because only in case of Button we display the value of the Format property.
          if (ctrl.getField() == null && !ctrl.expressionSetAsData() || ctrl.IsImageButton() || (this._parentObj.IsFirstRefreshOfProps() && !Manager.Environment.GetSpecialIgnoreButtonFormat()))
            this.addCommandTypeText(this.getLine());
          break;

        case MgControlType.CTRL_TYPE_LABEL:
          if (ctrlPic.getAttr() !== StorageAttribute.NUMERIC) {
            if (Manager.Environment.Language === 'H')
              Commands.addAsync(CommandType.PROP_SET_RIGHT_TO_LEFT, this.getObjectByParentObj(),
                ctrl.getDisplayLine(false), true);
          }
          break;

        case MgControlType.CTRL_TYPE_TEXT:
          if (ctrlPic.getAttr() !== StorageAttribute.BLOB && ctrlPic.getAttr() !== StorageAttribute.BLOB_VECTOR) {
            Commands.addAsync(CommandType.PROP_SET_TEXT_SIZE_LIMIT, this.getObjectByParentObj(), this.getLine(), ctrlPic.getMaskLength());
          }

          if (ctrl.Type === MgControlType.CTRL_TYPE_TEXT) {
            if (ctrlPic.getAttr() !== StorageAttribute.NUMERIC) {
              if (Manager.Environment.Language === 'H') {
                Commands.addAsync(CommandType.PROP_SET_RIGHT_TO_LEFT, this.getObjectByParentObj(), ctrl.getDisplayLine(false), ctrlPic.isHebrew());
              }
            }

            // JPN: IME support
            let utilImeJpn: UtilImeJpn = Manager.UtilImeJpn;
            if (utilImeJpn != null) {
              let imeMode: number = UtilImeJpn.IME_FORCE_OFF;

              if (ctrlPic.isAttrAlpha() || ctrlPic.isAttrUnicode() || ctrlPic.isAttrBlob()) {
                // if TRANSLATOR property is 0, calculate IME mode from the Kanji parameter & AS/400 pictures.
                let prop: Property = ctrl.getProp(PropInterface.PROP_TYPE_TRANSLATOR);
                imeMode = prop.getValueInt();
                if (imeMode === 0) {
                  // -- if exp is evaluated to 0, it means IME off.
                  if (prop.isExpression())
                    imeMode = UtilImeJpn.IME_FORCE_OFF;
                  else {
                    let picImeMode: number = ctrlPic.getImeMode();
                    if (picImeMode !== -1)
                      imeMode = picImeMode;
                  }
                }
              }
              if (utilImeJpn.isValid(imeMode))
                Commands.addAsync(CommandType.PROP_SET_TRANSLATOR, this.getObjectByParentObj(), this.getLine(), imeMode);
            }
          }
          break;
      }
    }
    else
      throw new ApplicationException("in Property.onFormat()");
  }

  /// <summary>
  /// </summary>
  private onLabel(currLine: number): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      // SELECT control. Note we do not support dynamic change of radio buttons range!
      // data control ranges are updated when we set values to them in Control.refreshDispVal()
      let ctrl: MgControlBase = <MgControlBase>this._parentObj;
      let line: number;

      if (currLine === Int32.MinValue)
        line = ctrl.getDisplayLine(false);
      else
        line = currLine;

      // on combo box compfor check box the label is the item list property
      if (ctrl.Type === MgControlType.CTRL_TYPE_CHECKBOX)
        this.addCommandTypeText(line);
      else if (ctrl.isSelectionCtrl() || ctrl.isTabControl() || ctrl.isRadio()) {
        ctrl.setRange(this.getValue());
        ctrl.clearRange(line);
        ctrl.refreshAndSetItemsList(line, true);

        // If ItemList has an expression And it may be modified again, refresh the display value of control.
        // Because it may be possible that display value will change.
        if (this._expId > 0)
          ctrl.ComputeAndRefreshDisplayValue(false);
      }
      else
        throw new ApplicationException("Property.onLabel(), not support control");
    }
    else
      throw new ApplicationException("in Property.onLabel()");
  }

  /// <summary>
  ///   set the minimum size for the height of the form
  /// </summary>
  private onMinimumHeight(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_FORM || this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_SET_MIN_HEIGHT, this._parentObj, 0, this.getValueInt());
    else
      throw new ApplicationException("in Property.onMinimumHeight()");
  }

  /// <summary>
  ///   set the minimum size for the width of the form
  /// </summary>
  private onMinimumWidth(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_FORM || this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_SET_MIN_WIDTH, this._parentObj, 0, this.getValueInt());
    else
      throw new ApplicationException("in Property.onMinimumWidth()");
  }

  /// <summary>
  ///   set the default button on the form
  /// </summary>
  private onDefaultButton(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_FORM || this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let form: MgFormBase = this._parentObj.getForm();
      let defaultButton: MgControlBase = form.getCtrlByName(this.getValue(), MgControlType.CTRL_TYPE_BUTTON);
      let line: number = (defaultButton === null) ? 0 : defaultButton.getDisplayLine(false);

      Commands.addAsync(CommandType.PROP_SET_DEFAULT_BUTTON, this.getObjectByParentObj(), defaultButton, 0, line, 0);
    }
    else
      throw new ApplicationException("in Property.onDefaultButton()");
  }

  /// <summary>
  ///   for combo box, visible line in the combo box
  /// </summary>
  private onVisibleLines(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let visibleLines: number = this.getValueInt();

      if (visibleLines === 0) {
        let ctrl: MgControlBase = <MgControlBase>this._parentObj;
        let itemsList: string[] = ctrl.refreshDispRange(true);
        if (itemsList !== null)
          visibleLines = itemsList.length;
      }

      Commands.addAsync(CommandType.PROP_SET_VISIBLE_LINES, this.getObjectByParentObj(), this.getLine(), visibleLines);
    }
    else
      throw new ApplicationException("in Property.onVisibleLines()");
  }

  /// <summary>
  ///   for the radio button the number of the choice column on the control
  /// </summary>
  /// <param name="line">Display line</param>
  private onChoiceColumn(line: number): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_SET_LAYOUT_NUM_COLUMN, this.getObjectByParentObj(), line, this.GetComputedValueInteger());
    else
      throw new ApplicationException("in Property.onChoiceColumn()");
  }

  /// <summary>
  ///   all the properties that support in subform, must call this method
  /// </summary>
  /// <returns></returns>
  private getObjectByParentObj(): any {
    let result: any = this._parentObj;

    if (this._parentType === GuiConstants.PARENT_TYPE_FORM) {
      let form: MgFormBase = <MgFormBase>this._parentObj;
      if (form.isSubForm())
        result = form.getSubFormCtrl();
    }

    return result;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="propId"></param>
  /// <returns></returns>
  static isRepeatableInTable(propId: number): boolean {
    return propId === PropInterface.PROP_TYPE_ROW_BG_COLOR;
  }

  /// <summary>
  ///   get current line
  /// </summary>
  /// <returns></returns>
  private getLine(): number {
    let line: number = 0;
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let ctrl: MgControlBase = <MgControlBase>this._parentObj;
      let displayLineForTreeOrTable: boolean = ctrl.isPropertyRepeatable(this._id);

      line = ctrl.getDisplayLine(displayLineForTreeOrTable);
    }

    return line;
  }

  /// <summary>
  ///   return original value of property that was computed before execution of expression
  /// </summary>
  /// <returns></returns>
  getOrgValue(): string {
    return this._orgValue;
  }

  /// <summary>
  ///   set for all columns controls in the table resizable need to set the resizable for each column
  /// </summary>
  private onAllowColumnResiz(): void {
    let mgControlBase: MgControlBase = <MgControlBase>this._parentObj;
    if (mgControlBase.isTableControl())
      Commands.addAsync(CommandType.PROP_SET_RESIZABLE, mgControlBase, 0, this.GetComputedValueBoolean());
    else
      throw new ApplicationException("in Property.onAllowColumnResiz() the control isn't Table control");
  }

  /// <summary>
  ///   set the row height of the table
  /// </summary>
  private onRowHeight(): void {
    let mgControlBase: MgControlBase = <MgControlBase>this._parentObj;

    if (mgControlBase.isTableControl())
      Commands.addAsync(CommandType.PROP_SET_ROW_HEIGHT, mgControlBase, 0, this.GetComputedValueInteger());
    else
      throw new ApplicationException("in Property.onRowHeight() the control isn't Table control");
  }

  /// <summary>
  ///   set the row height of the table
  /// </summary>
  private onTitleHeight(): void {
    let mgControlBase: MgControlBase = <MgControlBase>this._parentObj;

    if (mgControlBase.isTableControl())
      Commands.addAsync(CommandType.PROP_SET_TITLE_HEIGHT, mgControlBase, 0, this.GetComputedValueInteger());
    else
      throw new ApplicationException("in Property.onRowHeight() the control isn't Table control");
  }

  /// <summary>
  ///   set for all columns controls in the table movable need to set the movable for each column
  /// </summary>
  private onAllowReOrder(): void {
    let mgControlBase: MgControlBase = <MgControlBase>this._parentObj;

    if (mgControlBase.isTableControl()) {
      Commands.addAsync(CommandType.PROP_SET_ALLOW_REORDER, mgControlBase, 0, this.GetComputedValueBoolean());
    }
    else
      throw new ApplicationException("in Property.onAllowReOrder() the control isn't Table control");
  }

  /// <summary>
  ///   set the sortable for a column
  /// </summary>
  private onColumnSortable(): void {
    let mgControlBase: MgControlBase = <MgControlBase>this._parentObj;

    if (mgControlBase.isColumnControl()) {
      let propValue: boolean = this.getValueBoolean();
      // no sortable for non interactive.
      if (propValue && !this.GetTaskByParentObject().IsInteractive) {
        propValue = false;
      }

      Commands.addAsync(CommandType.PROP_SET_SORTABLE_COLUMN, mgControlBase, 0, propValue);
    }
    else
      throw new ApplicationException("in Property.onColumnSortable() the control isn't Column control");
  }

  private onColumnFilterable(): void {
    let mgControlBase: MgControlBase = <MgControlBase>this._parentObj;

    if (mgControlBase.isColumnControl()) {
      let propValue: boolean = this.getValueBoolean();
      // no filterable for non interactive.
      if (propValue && !this.GetTaskByParentObject().IsInteractive) {
        propValue = false;
      }

      Commands.addAsync(CommandType.PROP_SET_COLUMN_FILTER, mgControlBase, 0, propValue);
    }
    else
      throw new ApplicationException("in Property.onColumnFilterable() the control isn't Column control");
  }

  /// <summary>
  ///   set the sortable for a column
  /// </summary>
  private onColumnPlacement(): void {
    let mgControlBase: MgControlBase = <MgControlBase>this._parentObj;

    if (mgControlBase.isColumnControl()) {
      Commands.addAsync(CommandType.PROP_SET_COLUMN_PLACMENT, mgControlBase, 0, this.getValueBoolean());
    }
    else
      throw new ApplicationException("in Property.onColumnPlacement() the control isn't Column control");
  }

  /// <summary>
  ///   update size of prevvalues array
  /// </summary>
  /// <param name = "newSize"></param>
  updatePrevValueArray(newSize: number): void {
    if (!this.ShouldSkipRefresh())
      this._prevValues.SetSize(newSize);
  }

  /// <summary>
  /// clear _prevValues array
  /// </summary>
  /// <param name = "newSize"></param>
  clearPrevValueArray(): void {
    this._prevValues.Clear();
  }

  /// <summary>
  /// </summary>
  ResetPrevValueArray(): void {
    let count: number = this._prevValues.length;
    this._prevValues.Clear();
    this._prevValues.SetSize(count);
  }

  /// <summary>
  ///   compute and set arrays size
  /// </summary>
  private setPrevArraySize(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_FORM || this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let size: number = 1;

      if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
        let mgControlBase: MgControlBase = <MgControlBase>this._parentObj;
        if (mgControlBase.IsRepeatable)
          size = mgControlBase.getForm().getTableItemsCount();
        else if (mgControlBase.isTableControl() && Property.isRepeatableInTable(this._id))
          size = mgControlBase.getForm().getTableItemsCount();
      }

      this._prevValues.SetSize(size);
    }
  }

  /// <summary>
  ///   Updates the object's menu property, according to the passed property id pulldown menu.
  /// </summary>
  refreshPulldownMenu(): void {
    let parentTypeForm: boolean = (this._parentType === GuiConstants.PARENT_TYPE_FORM);
    let pulldownOnSubForm: boolean = (<MgFormBase>this._parentObj).isSubForm();
    let form: MgFormBase = (this._parentObj instanceof MgFormBase) ? (<MgFormBase>this._parentObj) : (<MgControlBase>this._parentObj).getForm();
    let setPulldownMenu: boolean = form.IsMDIOrSDIFrame;

    if (setPulldownMenu && !pulldownOnSubForm) {
      let pulldownMenuNumber: number = (<MgFormBase>this._parentObj).getPulldownMenuNumber();

      // get the matching MenuEntry object. The MenuManager will make sure it already exists.
      let task: TaskBase = this.GetTaskByParentObject();
      let mgMenu: MgMenu = Manager.GetMenu(task.ContextID, task.getCtlIdx(), pulldownMenuNumber, MenuStyle.MENU_STYLE_PULLDOWN, form, true);

      if (mgMenu !== null) {
        // create the matching gui command with the object and menuEntry
        Commands.addAsync(CommandType.PROP_SET_MENU, this._parentObj, form, MenuStyle.MENU_STYLE_PULLDOWN, mgMenu, parentTypeForm);
      }
      else {
        Commands.addAsync(CommandType.PROP_RESET_MENU, this._parentObj, form, MenuStyle.MENU_STYLE_PULLDOWN, null, parentTypeForm);
      }

      Commands.addAsync(CommandType.UPDATE_MENU_VISIBILITY, form);
    }
  }

  /// <summary>
  ///   translator property (JPN: IME support)
  /// </summary>
  private onTranslator(): void {
    let ctrl = <MgControlBase>this._parentObj;
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL && ctrl.Type === MgControlType.CTRL_TYPE_TEXT) {
      let utilImeJpn: UtilImeJpn = Manager.UtilImeJpn;
      if (utilImeJpn == null)
        return;

      let ctrlPic: PIC = ctrl.getPIC();
      let imeMode: number;

      if (ctrlPic.isAttrAlpha() || ctrlPic.isAttrUnicode() || ctrlPic.isAttrBlob()) {
        imeMode = this.getValueInt();
        if (imeMode === 0) {
          if (this.isExpression())
            imeMode = UtilImeJpn.IME_FORCE_OFF;
          else {
            let picImeMode: number = ctrlPic.getImeMode();
            if (picImeMode !== -1)
              imeMode = picImeMode;
          }
        }
      }
      else
        imeMode = UtilImeJpn.IME_FORCE_OFF;

      if (utilImeJpn.isValid(imeMode))
        Commands.addAsync(CommandType.PROP_SET_TRANSLATOR, this.getObjectByParentObj(), this.getLine(), imeMode);
    }
  }

  /// <summary>
  ///   Horizontal Alignment property
  /// </summary>
  private onHorizantalAlignment(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_SET_HORIZANTAL_ALIGNMENT, this.getObjectByParentObj(), this.getLine(), this.getValueInt());
    else
      throw new ApplicationException("in Property.onHorizantalAlignment()");
  }

  /// <summary>
  ///   Vertical Alignment property
  /// </summary>
  private onVerticalAlignment(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let mgControlBase: MgControlBase = <MgControlBase>this._parentObj;
      let verAligment: number = this.GetComputedValueInteger();

      if (mgControlBase.isLabel() && mgControlBase.isMultiline())
        verAligment = AlignmentTypeVert.Top;

      Commands.addAsync(CommandType.PROP_SET_VERTICAL_ALIGNMENT, this.getObjectByParentObj(), this.getLine(), verAligment);
    }
    else
      throw new ApplicationException("in Property.onHorizantalAlignment()");
  }

  /// <summary>
  ///   Radio Button Appearance property
  /// </summary>
  private onRadioButtonAppearance(): void {
    let failed: boolean = true;

    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let ctrlType: MgControlType = (<MgControlBase>this._parentObj).Type;
      if (ctrlType === MgControlType.CTRL_TYPE_RADIO) {
        failed = false;
        Commands.addAsync(CommandType.PROP_SET_RADIO_BUTTON_APPEARANCE, this.getObjectByParentObj(), this.getLine(), this.GetComputedValueInteger());
      }
    }

    if (failed) {
      throw new ApplicationException("in Property.onRadioButtonAppearance()");
    }
  }

  /// <summary>
  ///   Multiline property
  /// </summary>
  private onMultiline(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_SET_MULTILINE, this.getObjectByParentObj(), this.getLine(), this.getValueBoolean());
    else
      throw new ApplicationException("in Property.onMultiline()");
  }

  /// <summary>
  ///   ThreeStates property
  /// </summary>
  private onThreeStates(): void {
    let failed: boolean = true;

    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let type: MgControlType = (<MgControlBase>this._parentObj).Type;

      if (type === MgControlType.CTRL_TYPE_CHECKBOX) {
        failed = false;
        Commands.addAsync(CommandType.PROP_SET_THREE_STATE, this.getObjectByParentObj(), this.getLine(), this.getValueBoolean());
      }
    }

    if (failed) {
      throw new ApplicationException("in Property.onThreeStates()");
    }
  }

  /// <summary>
  ///   Password property
  /// </summary>
  private onPassword(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addOperationWithLine(CommandType.SET_PROPERTY, this.getObjectByParentObj(), this.getLine(), "password", this.getValueBoolean());
    else
      throw new ApplicationException("in Property.onPassword()");
  }

  /// <summary>
  ///   Set Multiline WordWrap Scroll
  /// </summary>
  private onMultilineWordWrapScroll(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_SET_MULTILINE_WORDWRAP_SCROLL, this.getObjectByParentObj(), this.getLine(), this.GetComputedValueInteger());
    else
      throw new ApplicationException("in Property.onMultilineWordWrapScroll()");
  }

  /// <summary>
  ///   Set Multiline Vertical Scroll
  /// </summary>
  private onMultilineVerticalScroll(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_SET_MULTILINE_VERTICAL_SCROLL, this.getObjectByParentObj(), this.getLine(), this.getValueBoolean());
    else
      throw new ApplicationException("in Property.onMultilineVerticalScroll()");
  }

  /// <summary>
  ///   Sets AllowCR property of MultiLine Edit Box
  /// </summary>
  private onMuliLineAllowCR(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_SET_MULTILINE_ALLOW_CR, this.getObjectByParentObj(), this.getLine(), this.getValueBoolean());
    else
      throw new ApplicationException("in Property.onMuliLineAllowCR()");
  }

  private onBorderStyle(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let ctrlType: MgControlType = (<MgControlBase>this._parentObj).Type;

      if (ctrlType === MgControlType.CTRL_TYPE_CHECKBOX || ctrlType === MgControlType.CTRL_TYPE_RADIO)
        Commands.addAsync(CommandType.PROP_SET_BORDER_STYLE, this.getObjectByParentObj(), this.getLine(), this.GetComputedValueInteger());
    }
  }

  /// <summary>
  ///   style definition: Radio list: 2D & 3D Raised, Check box : 2D & 3D Sunken, ComboBox : 2D & 3D Sunken
  /// </summary>
  private onStyle3D(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let ctrlType: MgControlType = (<MgControlBase>this._parentObj).Type;
      switch (ctrlType) {
        case MgControlType.CTRL_TYPE_CHECKBOX:
        case MgControlType.CTRL_TYPE_RADIO:
        case MgControlType.CTRL_TYPE_COMBO:
        case MgControlType.CTRL_TYPE_LINE:
        case MgControlType.CTRL_TYPE_LABEL:
        case MgControlType.CTRL_TYPE_IMAGE:
        case MgControlType.CTRL_TYPE_GROUP:
          Commands.addAsync(CommandType.PROP_SET_STYLE_3D, this.getObjectByParentObj(), this.getLine(), this.getValueInt());
          break;

        default:
          // all other controls we are not suppoted;
          break;
      }
    }
    else
      throw new ApplicationException("in Property.onStyle3D()");
  }

  /// <summary>
  ///   Set Checkbox main style
  /// </summary>
  private onCheckBoxMainStyle(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_SET_CHECKBOX_MAIN_STYLE, this.getObjectByParentObj(), this.getLine(), this.GetComputedValueInteger());
    else
      throw new ApplicationException("in Property.onMultilineVerticalScroll()");
  }

  /// <summary>
  ///   Set the Border
  ///   Border definition: the border is enable only for Edit, Table,SubForm,ListBox, Tree
  /// </summary>
  private onBorder(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let ctrl = <MgControlBase>this._parentObj;
      let ctrlType: MgControlType = ctrl.Type;

      switch (ctrlType) {
        case MgControlType.CTRL_TYPE_TEXT:
        case MgControlType.CTRL_TYPE_TABLE:
        case MgControlType.CTRL_TYPE_SUBFORM:
        case MgControlType.CTRL_TYPE_LIST:
        case MgControlType.CTRL_TYPE_LABEL:
        case MgControlType.CTRL_TYPE_IMAGE:
        case MgControlType.CTRL_TYPE_BROWSER:
        case MgControlType.CTRL_TYPE_SB_LABEL:
          Commands.addOperationWithLine(CommandType.SET_CLASS, this.getObjectByParentObj(), ctrl.getDisplayLine(false), "showborder", this.getValueBoolean() ? "" : "hidden_border");
          break;

        default:
          throw new ApplicationException("in Property.onBorder()");
      }
    }
  }

  /// <summary>
  ///   onMinBox
  /// </summary>
  private onMinBox(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_FORM)
      Commands.addAsync(CommandType.PROP_SET_MINBOX, this.getObjectByParentObj(), this.GetComputedValueBoolean());
    else
      throw new ApplicationException("in Property.onMinBox()");
  }

  /// <summary>
  ///   onMaxBox
  /// </summary>
  private onMaxBox(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_FORM)
      Commands.addAsync(CommandType.PROP_SET_MAXBOX, this.getObjectByParentObj(), this.GetComputedValueBoolean());
    else
      throw new ApplicationException("in Property.onMaxBox()");
  }

  /// <summary>
  ///   onSystemMenu
  /// </summary>
  private onSystemMenu(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_FORM)
      Commands.addAsync(CommandType.PROP_SET_SYSTEM_MENU, this.getObjectByParentObj(), this.GetComputedValueBoolean());
    else
      throw new ApplicationException("in Property.onSystemMenu()");
  }

  /// <summary>
  ///   onTitleBar
  /// </summary>
  private onTitleBar(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_FORM)
      Commands.addAsync(CommandType.PROP_SET_TITLE_BAR, this.getObjectByParentObj(), this.getValueBoolean());
    else
      throw new ApplicationException("in Property.onTitleBar()");
  }

  /// <summary>
  ///   onShowFullRow
  /// </summary>
  private onShowFullRow(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_SHOW_FULL_ROW, this.getObjectByParentObj(), this.GetComputedValueBoolean());
    else
      throw new ApplicationException("in Property.onShowFullRow()");
  }

  /// <summary>
  ///   onTopBorder
  /// </summary>
  private onTopBorder(): void {
    let mgControlBase: MgControlBase = <MgControlBase>this._parentObj;

    if (mgControlBase.isColumnControl())
      Commands.addAsync(CommandType.PROP_SET_TOP_BORDER, mgControlBase, 0, this.getValueBoolean());
    else
      throw new ApplicationException("in Property.onColumnSortable() the control isn't Column control");
  }

  /// <summary>
  ///   onRightBorder
  /// </summary>
  private onRightBorder(): void {
    let mgControlBase: MgControlBase = <MgControlBase>this._parentObj;

    if (mgControlBase.isColumnControl())
      Commands.addAsync(CommandType.PROP_SET_RIGHT_BORDER, mgControlBase, 0, this.getValueBoolean());
    else
      throw new ApplicationException("in Property.onColumnSortable() the control isn't Column control");
  }

  /// <summary>
  ///   onShowScrollbar
  /// </summary>
  private onShowScrollbar(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_SHOW_SCROLLBAR, this.getObjectByParentObj(), this.getValueBoolean());
    else
      throw new ApplicationException("in Property.onShowScrollbar()");
  }

  /// <summary>
  ///   onColumnDivider
  /// </summary>
  private onColumnDivider(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_COLUMN_DIVIDER, this.getObjectByParentObj(), this.getValueBoolean());
    else
      throw new ApplicationException("in Property.onColumnDivider()");
  }

  /// <summary>
  ///   onLineDivider
  /// </summary>
  private onLineDivider(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      Commands.addOperationWithLine(CommandType.SET_STYLE, this.getObjectByParentObj(), 0, MagicProperties.LineDivider, this.getValueBoolean());
    }
    else
      throw new ApplicationException("in Property.onLineDivider()");
  }

  /// <summary>
  ///   onRowHighLightType
  /// </summary>
  private onRowHighLightType(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_ROW_HIGHLITING_STYLE, this.getObjectByParentObj(), 0, this.GetComputedValueInteger());
    else
      throw new ApplicationException("in Property.onRowHighLightType()");
  }

  /// <summary>
  ///   onLineWidth
  /// </summary>
  private onLineWidth(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      // this property is char
      let str: string = this.getValue();
      if (str !== null) {
        Commands.addAsync(CommandType.PROP_SET_LINE_WIDTH, this.getObjectByParentObj(), this.getLine(), str[0]);
      }
      return;
    }
    throw new ApplicationException("in Property.onLineWidth()");
  }

  /// <summary>
  ///   onLineStyle
  /// </summary>
  private onLineStyle(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_SET_LINE_STYLE, this.getObjectByParentObj(), this.getLine(), this.getValueInt());
    else
      throw new ApplicationException("in Property.onLineStyle()");
  }

  /// <summary>
  ///   onStaticType
  /// </summary>
  private onStaticType(): void {
    const CTRL_STATIC_TYPE_NESW_LINE: number = 0x0010;
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let ctrl: MgControlBase = <MgControlBase>this._parentObj;

      if (ctrl.isLineControl()) {
        let val: number = this.GetComputedValueInteger();
        let dir: CtrlLineDirection;

        if ((val & CTRL_STATIC_TYPE_NESW_LINE) !== 0)
          dir = CtrlLineDirection.Asc;
        else
          dir = CtrlLineDirection.Des;

        Commands.addAsync(CommandType.PROP_SET_LINE_DIRECTION, this.getObjectByParentObj(), this.getLine(), dir);
      }
    }
    else
      throw new ApplicationException("in Property.onStaticType()");
  }

  /// <summary>
  /// on Selection mode. This will set the selction mode of list box to single or multiple.
  /// </summary>
  private onSelectionMode(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_SET_SELECTION_MODE, this.getObjectByParentObj(), this.getLine(), this.GetComputedValueInteger());
    else
      throw new ApplicationException("in Property.onSelectionMode()");
  }

  /// <summary>
  /// on Refresh when Hidden. If this property is changed to 'true' refresh the subform if it is invisible.
  /// </summary>
  private onRefreshWhenHidden(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      if (DisplayConvertor.toBoolean(this._val)) {
        let mgControlBase: MgControlBase = <MgControlBase>this._parentObj;
        Debug.Assert(mgControlBase.isSubform() || mgControlBase.isFrameFormControl());
        if (!mgControlBase.isVisible())
          mgControlBase.RefreshSubform();
      }
    }
    else
      throw new ApplicationException("in Property.onRefreshWhenHidden()");
  }

  /// <summary>
  ///   onTrackSelection
  /// </summary>
  private onHotTrack(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_HOT_TRACK, this.getObjectByParentObj(), this.getValueBoolean());
    else
      throw new ApplicationException("in Property.onTrackSelection()");
  }

  /// <summary>
  ///   onShowButtons
  /// </summary>
  private onShowButtons(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_SHOW_BUTTONS, this.getObjectByParentObj(), this.GetComputedValueBoolean());
    else
      throw new ApplicationException("in Property.onShowButtons()");
  }

  /// <summary>
  ///   onLinesAsRoot
  /// </summary>
  private onLinesAsRoot(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_LINES_AT_ROOT, this.getObjectByParentObj(), this.GetComputedValueBoolean());
    else
      throw new ApplicationException("in Property.onLinesAsRoot()");
  }

  /// <summary>
  ///   onWindowType
  /// </summary>
  private onWindowType(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_FORM) {
      let form: MgFormBase = this.getForm();

      // when it is subform the form border style will be None
      if (!form.isSubForm()) {
        let borderStyle: BorderType = <BorderType>(this._parentObj.getProp(PropInterface.PROP_TYPE_BORDER_STYLE)).getValueInt();
        Commands.addAsync(CommandType.PROP_SET_FORM_BORDER_STYLE, this.getObjectByParentObj(), 0, borderStyle);
      }
    }
    else
      throw new ApplicationException("in Property.onWindowType()");
  }

  /// <summary>
  /// </summary>
  private onRightToLeft(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL) {
      let ctrl = <MgControlBase>this._parentObj;
      let ctrlType: MgControlType = ctrl.Type;

      switch (ctrlType) {
        case MgControlType.CTRL_TYPE_TABLE:
          // the right to left property on Table is handle as a style
          break;

        case MgControlType.CTRL_TYPE_BUTTON:
        case MgControlType.CTRL_TYPE_COMBO:
        case MgControlType.CTRL_TYPE_LIST:
        case MgControlType.CTRL_TYPE_RADIO:
        case MgControlType.CTRL_TYPE_CHECKBOX:
        case MgControlType.CTRL_TYPE_GROUP:
        case MgControlType.CTRL_TYPE_TAB:
        case MgControlType.CTRL_TYPE_TEXT:
        case MgControlType.CTRL_TYPE_LABEL:
          if (!(ctrl.Type === MgControlType.CTRL_TYPE_TEXT && (ctrl.getPIC().getAttr() === StorageAttribute.NUMERIC)))
            Commands.addAsync(CommandType.PROP_SET_RIGHT_TO_LEFT, this.getObjectByParentObj(), this.getLine(), this.getValueBoolean());
          break;

        default:
          throw new ApplicationException("in Property.onRighToLeft()");
      }
    }
    else if (this._parentType === GuiConstants.PARENT_TYPE_FORM)
      Commands.addAsync(CommandType.PROP_SET_RIGHT_TO_LEFT, this.getObjectByParentObj(), 0, this.getValueBoolean());
  }

  /// <summary>
  /// </summary>
  private onTabControlSide(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_TAB_CONTROL_SIDE, this.getObjectByParentObj(), 0, this.GetComputedValueInteger());
    else
      throw new ApplicationException("in Property.onTabControlSide()");
  }

  /// <summary>
  ///
  /// </summary>
  private onTabControlTabsWidth(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_SET_TAB_SIZE_MODE, this.getObjectByParentObj(), 0, this.GetComputedValueInteger());
    else
      throw new ApplicationException("in Property.onTabControlTabsWidth()");
  }

  /// <summary>
  /// Set TopBorderMargin property
  /// </summary>
  private onTopBorderMargin(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL && (<MgControlBase>this._parentObj).isGroup())
      Commands.addAsync(CommandType.PROP_SET_TOP_BORDER_MARGIN, this.getObjectByParentObj(), 0, this.GetComputedValueBoolean());
  }

  /// <summary>
  /// Set FillWidth property
  /// </summary>
  private onFillWidth(): void {
    Debug.Assert(this._parentType === GuiConstants.PARENT_TYPE_CONTROL && (<MgControlBase>this._parentObj).isTableControl());
    Commands.addAsync(CommandType.PROP_SET_FILL_WIDTH, this.getObjectByParentObj(), this.GetComputedValueBoolean());
  }

  /// <summary>
  /// Set MultiColumnDisplay property
  /// </summary>
  private onMultiColumnDisplay(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_SET_MULTI_COLUMN_DISPLAY, this.getObjectByParentObj(), this.GetComputedValueBoolean());
    else
      throw new ApplicationException("in Property.onMultiColumnDisplay()");
  }

  /// <summary>
  /// Set Show Ellipsis property
  /// </summary>
  private onShowEllipsis(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_SET_SHOW_ELLIPSIS, this.getObjectByParentObj(), this.GetComputedValueBoolean());
    else
      throw new ApplicationException("in Property.onMultiColumnDisplay()");
  }

  /// <summary>
  /// Set TitlePadding property
  /// </summary>
  private onTitlePadding(): void {
    Debug.Assert(this._parentType === GuiConstants.PARENT_TYPE_CONTROL && (<MgControlBase>this._parentObj).isTabControl());
    Commands.addAsync(CommandType.PROP_SET_TITLE_PADDING, this.getObjectByParentObj(), 0, this.GetComputedValueInteger());
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="line"></param>
  private onRowBGColor(line: number): void {
    let colorIndex: number = this.getValueInt();
    if (colorIndex > 0) {
      // let bgColor: MgColor = Manager.GetColorsTable().getBGColor(colorIndex);
      // Commands.addAsync(CommandType.PROP_SET_ROW_BG_COLOR, this.getObjectByParentObj(), line, bgColor);
    }
  }

  /// <summary>
  /// Set user property TitlePadding property
  /// </summary>
  private onUserProperties(): void {
     for (let userProperty in this.userProperties)
    {
      let len: number = 255;
      let wasEvaluated: RefParam<boolean> = new RefParam(false);
      let expression = this.userProperties[userProperty];
      let retExpressionValue = this._parentObj.EvaluateExpression(expression, this._dataType, len, true, StorageAttribute.SKIP, false, wasEvaluated);

      Commands.addOperationWithLine(CommandType.PROP_SET_USER_PROPERTY, this.getObjectByParentObj(), this.getLine(), userProperty, retExpressionValue);
    }
  }

  ///<summary>
  ///</summary>
  private onAllowDrop(): void {
    Commands.addAsync(CommandType.PROP_SET_ALLOW_DROP, this.getObjectByParentObj(), this.getLine(), this.getValueBoolean());
  }

  /// <summary>
  /// </summary>
  private onAllowDrag(): void {
    if (this._parentType === GuiConstants.PARENT_TYPE_CONTROL)
      Commands.addAsync(CommandType.PROP_SET_ALLOW_DRAG, this.getObjectByParentObj(), this.getLine(), this.getValueBoolean());
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="idx"></param>
  RemovePrevValIndexAt(idx: number): void {
    if (this._prevValues.length > idx) {
      this._prevValues.RemoveAt(idx);
    }
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="idx"></param>
  InsertPrevValAt(idx: number): void {
    this._prevValues.Insert(idx, null);
  }

  static GetPropertyName(propTypeId: number): string {
    return "{Field ID " + propTypeId + "}";
  }

  toString(): string {
    return NString.Format("{0} = {1} (exp={2}, studio value={3})", [
      Property.GetPropertyName(this._id), (this._val === null) ? "is null" : this._val, this._expId, this.StudioValue
    ]);
  }
}
