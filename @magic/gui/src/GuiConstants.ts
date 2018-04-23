import {Int32} from "@magic/mscorelib";

export class GuiConstants {
  static DEFAULT_LIST_VALUE: number = -1;
  static DEFAULT_VALUE_INT: number = -999999;
  static ALL_LINES: number = -1;
  static NO_ROW_SELECTED: number = Int32.MinValue; // no row selected - for empty dataview

  /// <summary>RC mobile unsupported controls message string</summary>
  static RIA_MOBILE_UNSUPPORTED_CONTROL_ERROR: string = "control is not supported for mobile RIA deployment";
  static RIA_MOBILE_UNSUPPORTED_CONTROL_ERROR_WINDOW_6: string = "control is not supported for mobile RIA deployment on Window 6 standard";
  static TOOL_HEIGHT: number = 17;
  static TOOL_WIDTH: number = 16;

  /// <summary>Data Binding constants</summary>
  static STR_DISPLAY_MEMBER: string = "DisplayMember";
  static STR_VALUE_MEMBER: string = "ValueMember";

  /// <summary>parent type</summary>
  static PARENT_TYPE_TASK: string = 'T';
  static PARENT_TYPE_FORM: string = 'F';
  static PARENT_TYPE_CONTROL: string = 'C';

  /// <summary>properties</summary>
  static PROP_DEF_HYPER_TEXT_COLOR: number = 39;
  static PROP_DEF_VISITED_COLOR: number = 40;
  static PROP_DEF_HOVERING_COLOR: number = 41;
  static GENERIC_PROPERTY_BASE_ID: number = 10000;

  /// <summary>tabbing cycle</summary>
  static TABBING_CYCLE_REMAIN_IN_CURRENT_RECORD: string = 'R';
  static TABBING_CYCLE_MOVE_TO_NEXT_RECORD: string = 'N';
  static TABBING_CYCLE_MOVE_TO_PARENT_TASK: string = 'P';

  /// <summary>blobs</summary>
  static BLOB_PREFIX_ELEMENTS_COUNT: number = 5;

  /// <summary>key codes</summary>
  static KEY_DOWN: number = 40;
  static KEY_RIGHT: number = 39;
  static KEY_UP: number = 38;
  static KEY_LEFT: number = 37;
  static KEY_HOME: number = 36;
  static KEY_END: number = 35;
  static KEY_PG_DOWN: number = 34;
  static KEY_PG_UP: number = 33;
  static KEY_SPACE: number = 32;
  static KEY_F12: number = 123;
  static KEY_F1: number = 112;
  static KEY_9: number = 57;
  static KEY_0: number = 48;
  static KEY_Z: number = 90;
  static KEY_A: number = 65;
  static KEY_DELETE: number = 46;
  static KEY_INSERT: number = 45;
  static KEY_BACKSPACE: number = 8;
  static KEY_TAB: number = 9;
  static KEY_RETURN: number = 13;
  static KEY_ESC: number = 27;
  static KEY_CAPS_LOCK: number = 20;
  static KEY_POINT1: number = 190;
  static KEY_POINT2: number = 110;
  static KEY_COMMA: number = 188;

  // authentication
  static LOGON_CAPTION: string = "Logon - ";
  static ENTER_UID_TTL: string = "Please enter your user ID and password.";

  static GROUP_BOX_TITLE_MAX_SIZE: number = 62;
  static MSG_CAPTION_MAX_SIZE: number = 56;
  static LABEL_CAPTION_MAX_SIZE: number = 9;
  static PASSWORD_CAPTION_MAX_SIZE: number = 19;

  static REPLACE_ALL_TEXT: number = -1;

  // execution property names used for customizing logon screen
  static STR_LOGON_RTL: string = "LogonRTL";
  static STR_LOGO_WIN_ICON_URL: string = "LogonWindowIconURL";
  static STR_LOGON_IMAGE_URL: string = "LogonImageURL";
  static STR_LOGON_WIN_TITLE: string = "LogonWindowTitle";
  static STR_LOGON_GROUP_TITLE: string = "LogonGroupTitle";
  static STR_LOGON_MSG_CAPTION: string = "LogonMessageCaption";
  static STR_LOGON_USER_ID_CAPTION: string = "LogonUserIDCaption";
  static STR_LOGON_PASS_CAPTION: string = "LogonPasswordCaption";
  static STR_LOGON_OK_CAPTION: string = "LogonOKCaption";
  static STR_LOGON_CANCEL_CAPTION: string = "LogonCancelCaption";

  constructor() {
  }
}
