import { RefParam, Debug, NString } from "@magic/mscorelib";
import { StorageAttribute, ListboxSelectionMode, MgControlType, TransMode } from "@magic/utils";
import { PropParentInterface } from "../../gui/PropParentInterface";
import { PIC } from "./PIC";
import { DisplayConvertor } from "./DisplayConvertor";
import { BlobType } from "../data/BlobType";
import { PropInterface } from "./PropInterface";
import { MgControlBase } from "./MgControlBase";
import { GuiConstants } from "../../GuiConstants";
import { Property } from "./Property";

/// <summary>
///   PropDefaults manages the default values of properties according to the model they belong to
/// </summary>
export class PropDefaults {
  /// <summary>
  ///   returns a numeric value in its magic internal format
  /// </summary>
  /// <param name = "propParent"></param>
  /// <param name = "Value"></param>
  /// <returns></returns>
  private static getNumericMgValue(propParent: PropParentInterface, Value: string): string {
    let pic: PIC = new PIC("3", StorageAttribute.NUMERIC, propParent.getCompIdx());
    return DisplayConvertor.Instance.disp2mg(Value, "", pic, propParent.getCompIdx(), BlobType.CONTENT_TYPE_UNKNOWN);
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="propId"></param>
  /// <returns></returns>
  private static getDefaultValueForTask(propId: number, handled: RefParam<boolean>): string {
    let val: string = null;
    handled.value = true;

    switch (propId) {
      // for task properties
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_ALLOW_EVENTS:
      case PropInterface.PROP_TYPE_ALLOW_LOCATE_IN_QUERY:
      case PropInterface.PROP_TYPE_PRINT_DATA:
      case PropInterface.PROP_TYPE_ALLOW_RANGE:
      case PropInterface.PROP_TYPE_ALLOW_LOCATE:
      case PropInterface.PROP_TYPE_ALLOW_SORT:
      case PropInterface.PROP_TYPE_PRELOAD_VIEW:
      case PropInterface.PROP_TYPE_TASK_PROPERTIES_ALLOW_INDEX:
        val = "1"; // yes boolean
        break;

      // for task properties
      case PropInterface.PROP_TYPE_CLOSE_TASKS_BY_MDI_MENU:
        val = "0"; // yes boolean
        break;

      default:
        handled.value = false;
        break;
    }

    return val;
  }

  /// <summary>
  ///   getDefaultValue returns the default value of a property
  /// </summary>
  /// <param name = "propId">The property id</param>
  /// <param name = "parentType">PARENT_TYPE_CONTROL, PARENT_TYPE_FORM, PARENT_TYPE_TASK</param>
  /// <param name = "propParent"></param>
  /// <returns> The property default value String representation</returns>
  static getDefaultValue(propId: number, parentType: string, propParent: PropParentInterface): string {
    let val: string = null;
    let control: MgControlBase = null;

    if (parentType === GuiConstants.PARENT_TYPE_TASK) {
      let handled: RefParam<boolean> = new RefParam<boolean>(false);

      val = this.getDefaultValueForTask(propId, handled);

      if (handled.value)
        return val;
    }

    switch (propId) {
      case PropInterface.PROP_TYPE_COLOR:
        val = this.getNumericMgValue(propParent, "1");
        if (parentType === GuiConstants.PARENT_TYPE_CONTROL) {
          control = <MgControlBase>propParent;
          if (control.Type === MgControlType.CTRL_TYPE_BUTTON && control.IsImageButton())
            val = this.getNumericMgValue(propParent, "0");
        }
        break;

      case PropInterface.PROP_TYPE_BORDER:
        val = "0"; // no boolean
        if (parentType === GuiConstants.PARENT_TYPE_CONTROL) {
          control = <MgControlBase>propParent;
          switch (control.Type) {
            case MgControlType.CTRL_TYPE_SUBFORM:
              // only for subform that is son of frame set don't create border.
              // Sub form that is not frame, n
              if (control.getForm().IsFrameSet) {
                let parent: Object = control.getParent();
                if (parent instanceof MgControlBase) {
                  let mgControl: MgControlBase = <MgControlBase>parent;
                  if (mgControl.Type === MgControlType.CTRL_TYPE_FRAME_SET)
                    return val;
                }
              }
              // fixed bug #777633, the default value of subform control is No and not Yes
              val = "0"; // no boolean
              break;

            case MgControlType.CTRL_TYPE_TEXT:
            case MgControlType.CTRL_TYPE_TABLE:
            case MgControlType.CTRL_TYPE_LIST:
            case MgControlType.CTRL_TYPE_BROWSER:
              val = "1"; // yes boolean
              break;
          }
        }
        break;

      case PropInterface.PROP_TYPE_MAXBOX:
      case PropInterface.PROP_TYPE_MINBOX:
      case PropInterface.PROP_TYPE_MUST_INPUT:
      case PropInterface.PROP_TYPE_MULTILINE:
      case PropInterface.PROP_TYPE_PASSWORD:
      case PropInterface.PROP_TYPE_HEBREW:
      case PropInterface.PROP_TYPE_MULTILINE_VERTICAL_SCROLL:
      case PropInterface.PROP_TYPE_MULTILINE_ALLOW_CR:
      case PropInterface.PROP_TYPE_IS_CACHED:
      case PropInterface.PROP_TYPE_MODIFY_IN_QUERY:
      case PropInterface.PROP_TYPE_SHOW_FULL_ROW:
      case PropInterface.PROP_TYPE_TRACK_SELECTION:
      case PropInterface.PROP_TYPE_COLUMN_DIVIDER:
      case PropInterface.PROP_TYPE_LINE_DIVIDER:
      case PropInterface.PROP_TYPE_THREE_STATES:
      case PropInterface.PROP_TYPE_REFRESH_WHEN_HIDDEN:
      case PropInterface.PROP_TYPE_RETAIN_FOCUS:
      case PropInterface.PROP_TYPE_ROW_PLACEMENT:
      case PropInterface.PROP_TYPE_SHOW_IN_WINDOW_MENU:
      case PropInterface.PROP_TYPE_DATAVIEWCONTROL:
      case PropInterface.PROP_TYPE_SORT_COLUMN:
      case PropInterface.PROP_TYPE_BEFORE_900_VERSION:
      case PropInterface.PROP_TYPE_FILL_WIDTH:
      case PropInterface.PROP_TYPE_MULTI_COLUMN_DISPLAY:
        val = "0"; // no boolean
        break;

      case PropInterface.PROP_TYPE_SYSTEM_MENU:
      case PropInterface.PROP_TYPE_TITLE_BAR:
      case PropInterface.PROP_TYPE_ENABLED:
      case PropInterface.PROP_TYPE_VISIBLE:
      case PropInterface.PROP_TYPE_ALLOW_PARKING:
      case PropInterface.PROP_TYPE_TAB_IN:
      case PropInterface.PROP_TYPE_MODIFIABLE:
      case PropInterface.PROP_TYPE_HIGHLIGHTING:
      case PropInterface.PROP_TYPE_AUTO_REFRESH:
      case PropInterface.PROP_TYPE_PARK_ON_CLICK:
      case PropInterface.PROP_TYPE_DISPLAY_MENU:
      case PropInterface.PROP_TYPE_DISPLAY_TOOLBAR:
      case PropInterface.PROP_TYPE_SHOW_BUTTONS:
      case PropInterface.PROP_TYPE_LINES_AT_ROOT:
      case PropInterface.PROP_TYPE_SCROLL_BAR:
      case PropInterface.PROP_TYPE_SHOW_LINES:
      case PropInterface.PROP_TYPE_ALLOW_QUERY:
      case PropInterface.PROP_TYPE_RIGHT_BORDER:
      case PropInterface.PROP_TYPE_TOP_BORDER:
      case PropInterface.PROP_TYPE_TOP_BORDER_MARGIN:
      case PropInterface.PROP_TYPE_SHOW_ELLIPISIS:
        val = "1"; // yes boolean
        break;

      // all those properties need not create a default
      case PropInterface.PROP_TYPE_TRIGGER:
      case PropInterface.PROP_TYPE_PROMPT:
      case PropInterface.PROP_TYPE_DISPLAY_LIST:
      case PropInterface.PROP_TYPE_DATA:
      case PropInterface.PROP_TYPE_IMAGE_FILENAME:
      case PropInterface.PROP_TYPE_LABEL:
      case PropInterface.PROP_TYPE_PLACEMENT:
      case PropInterface.PROP_TYPE_PULLDOWN_MENU:
      case PropInterface.PROP_TYPE_CONTEXT_MENU:
      case PropInterface.PROP_TYPE_NODE_ID:
      case PropInterface.PROP_TYPE_NODE_PARENTID:
      case PropInterface.PROP_TYPE_SELECT_PROGRAM:
      case PropInterface.PROP_TYPE_VISIBLE_LAYERS_LIST:
      case PropInterface.PROP_TYPE_EXPANDED_IMAGEIDX:
      case PropInterface.PROP_TYPE_COLLAPSED_IMAGEIDX:
      case PropInterface.PROP_TYPE_OBJECT_TYPE:
      case PropInterface.PROP_TYPE_TAB_ORDER:
      case PropInterface.PROP_TYPE_LOAD_IMAGE_FROM:
      case PropInterface.PROP_TYPE_FORM_NAME:
      case PropInterface.PROP_TYPE_COLUMN_TITLE:
      case PropInterface.PROP_TYPE_HEIGHT:
      case PropInterface.PROP_TYPE_WIDTH:
      case PropInterface.PROP_TYPE_ROW_HIGHLIGHT_COLOR:
      case PropInterface.PROP_TYPE_PRGTSK_NUM:
        break;

      case PropInterface.PROP_TYPE_MULTILINE_WORDWRAP_SCROLL:
      // 2- HORIZONTAL_SCROLL_NO
      case PropInterface.PROP_TYPE_BORDER_STYLE: // BORDER_TYPE_THICK
        val = this.getNumericMgValue(propParent, "2");
        break;
      case PropInterface.PROP_TYPE_WINDOW_TYPE:
        val = this.getNumericMgValue(propParent, "6");
        break;
      case PropInterface.PROP_TYPE_ROW_HIGHLIGHT_STYLE:
        val = this.getNumericMgValue(propParent, "4");
        break;

      case PropInterface.PROP_TYPE_GRADIENT_STYLE:
      case PropInterface.PROP_TYPE_TABBING_ORDER:
      case PropInterface.PROP_TYPE_STARTUP_MODE:
      // 1.DEFAULT
      case PropInterface.PROP_TYPE_CHOICE_COLUMNS:
      // 1
      case PropInterface.PROP_TYPE_HORIZONTAL_ALIGNMENT:
      // 1 ALIGNMENT_TYPE_HORI_LEFT
      case PropInterface.PROP_TYPE_FONT:
      // 1
      case PropInterface.PROP_TYPE_WALLPAPER_STYLE:
      // CTRL_IMAGE_STYLE_TILED
      case PropInterface.PROP_TYPE_CHECKBOX_MAIN_STYLE:
      // CHECKBOX_MAIN_STYLE_BOX
      case PropInterface.PROP_TYPE_TAB_CONTROL_SIDE:
      // SIDE_TYPE_TOP:
      case PropInterface.PROP_TYPE_RAISE_AT:
      case PropInterface.PROP_TYPE_ALLOWED_DIRECTION:
      case PropInterface.PROP_TYPE_SUBFORM_TYPE:
      case PropInterface.PROP_TYPE_UOM:
      case PropInterface.PROP_TYPE_BOTTOM_POSITION_INTERVAL:
        val = this.getNumericMgValue(propParent, "1");
        break;

      case PropInterface.PROP_TYPE_TASK_PROPERTIES_TRANSACTION_MODE:
        val = TransMode.Physical;
        break;

      case PropInterface.PROP_TYPE_PARKED_COLLAPSED_IMAGEIDX:
      case PropInterface.PROP_TYPE_PARKED_IMAGEIDX:
      case PropInterface.PROP_TYPE_MINIMUM_HEIGHT:
      case PropInterface.PROP_TYPE_TOP:
      case PropInterface.PROP_TYPE_LEFT:
      case PropInterface.PROP_TYPE_TITLE_HEIGHT:
      case PropInterface.PROP_TYPE_LAYER:
      case PropInterface.PROP_TYPE_VISIBLE_LINES:
      case PropInterface.PROP_TYPE_FRAMESET_STYLE:
      case PropInterface.PROP_TYPE_TRANSLATOR:
      case PropInterface.PROP_TYPE_HOR_FAC:
      case PropInterface.PROP_TYPE_VER_FAC:
      case PropInterface.PROP_TYPE_FOCUS_COLOR:
        val = this.getNumericMgValue(propParent, "0");
        break;

      case PropInterface.PROP_TYPE_STYLE_3D:
        if (parentType === GuiConstants.PARENT_TYPE_CONTROL) {
          control = <MgControlBase>propParent;
          switch (control.Type) {
            case MgControlType.CTRL_TYPE_COMBO:
              val = this.getNumericMgValue(propParent, "2"); // CTRL_DIM_3D
              break;
            case MgControlType.CTRL_TYPE_RADIO:
            case MgControlType.CTRL_TYPE_CHECKBOX:
              val = this.getNumericMgValue(propParent, "3"); // CTRL_DIM_3D_SUNKEN
              break;
          }
        }
        break;
      case PropInterface.PROP_TYPE_DEFAULT_BUTTON:
      case PropInterface.PROP_TYPE_IMAGE_LIST_INDEXES:
      case PropInterface.PROP_TYPE_WALLPAPER:
      case PropInterface.PROP_TYPE_TEXT:
      case PropInterface.PROP_TYPE_TOOLTIP:
      case PropInterface.PROP_TYPE_FORMAT:
        val = NString.Empty;
        break;

      case PropInterface.PROP_TYPE_IMAGE_STYLE:
        val = this.getNumericMgValue(propParent, "2"); // CTRL_IMAGE_STYLE_COPIED
        break;

      case PropInterface.PROP_TYPE_SELECTION_MODE:
        val = this.getNumericMgValue(propParent, String(ListboxSelectionMode.Single));
        break;

      case PropInterface.PROP_TYPE_INDEX:
      case PropInterface.PROP_TYPE_LINK_FIELD:
      case PropInterface.PROP_TYPE_DISPLAY_FIELD:
      case PropInterface.PROP_TYPE_PERSISTENT_FORM_STATE_VERSION:
        val = this.getNumericMgValue(propParent, "0");
        break;
      default:
        Debug.Assert(false, "Undefined default value",
                    NString.Format("No default value was defined for property {0} ({1}).", Property.GetPropertyName(propId), propId));
        break;
    }
    return val;
  }

  /// <summary>
  ///   getDefaultProp() returns a property that has a system default value.
  /// </summary>
  /// <param name = "propId">The property id</param>
  /// <param name = "parentType">PARENT_TYPE_CONTROL, PARENT_TYPE_FORM, PARENT_TYPE_TASK</param>
  /// <param name = "propParent"></param>
  /// <returns> Property that has a system default value</returns>
  static getDefaultProp(propId: number, parentType: string, propParent: PropParentInterface): Property {
    let prop: Property = null;
    let mgVal: string = PropDefaults.getDefaultValue(propId, parentType, propParent);

    if (mgVal !== null)
      prop = new Property(propId, propParent, parentType, mgVal);

    return prop;
  }
}
