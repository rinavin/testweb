import {Int32} from "@magic/mscorelib";

//This class contains all the constants which are used in MgxpaRIA.exe as well as in MgGui.dll.
export class Constants {
  /// <summary> Null Arithmetic values</summary>
  static readonly NULL_ARITH_NULLIFY: string = 'N';
  static readonly NULL_ARITH_USE_DEF: string = 'U';

  /// <summary> select program : select mode property</summary>
  static readonly SELPRG_MODE_BEFORE: string = 'B';
  static readonly SELPRG_MODE_AFTER: string = 'A';
  static readonly SELPRG_MODE_PROMPT: string = 'P';

  /// <summary> move in View</summary>
  static readonly MOVE_UNIT_TABLE: string = 'T';
  static readonly MOVE_UNIT_PAGE: string = 'P';
  static readonly MOVE_UNIT_ROW: string = 'R';
  static readonly MOVE_UNIT_TREE_NODE: string = 'E';

  static readonly MOVE_DIRECTION_NONE: string = ' ';
  static readonly MOVE_DIRECTION_BEGIN: string = 'B';
  static readonly MOVE_DIRECTION_PREV: string = 'P';
  static readonly MOVE_DIRECTION_NEXT: string = 'N';
  static readonly MOVE_DIRECTION_END: string = 'E';
  static readonly MOVE_DIRECTION_PARENT: string = 'A';
  static readonly MOVE_DIRECTION_FIRST_SON: string = 'F';
  static readonly MOVE_DIRECTION_NEXT_SIBLING: string = 'X';
  static readonly MOVE_DIRECTION_PREV_SIBLING: string = 'V';

  /// <summary> refresh types for a task form</summary>
  static readonly TASK_REFRESH_FORM: string = 'F';
  static readonly TASK_REFRESH_TABLE: string = 'T';
  static readonly TASK_REFRESH_TREE_AND_FORM: string = 'R';
  static readonly TASK_REFRESH_CURR_REC: string = 'C';
  static readonly TASK_REFRESH_NONE: string = 'N';

  static readonly TASK_MODE_QUERY: string = 'E';
  static readonly TASK_MODE_MODIFY: string = 'M';
  static readonly TASK_MODE_CREATE: string = 'C';
  static readonly TASK_MODE_DELETE: string = 'D';
  static readonly TASK_MODE_NONE = ' ';

  /// <summary> task level</summary>
  static readonly TASK_LEVEL_NONE: string = ' ';
  static readonly TASK_LEVEL_TASK: string = 'T';
  static readonly TASK_LEVEL_RECORD: string = 'R';
  static readonly TASK_LEVEL_CONTROL: string = 'C';

  /// <summary> special records constants</summary>
  static readonly MG_DATAVIEW_FIRST_RECORD: number = Int32.MinValue;
  static readonly MG_DATAVIEW_LAST_RECORD: number = Int32.MaxValue;

  /// <summary> action states for keyboard mapping</summary>
  static readonly ACT_STT_TBL_SCREEN_MODE: number = 0x0001;
  static readonly ACT_STT_TBL_LEFT_TO_RIGHT: number = 0x0002;
  static readonly ACT_STT_TBL_SCREEN_TOP: number = 0x0004;
  static readonly ACT_STT_TBL_SCREEN_END: number = 0x0008;
  static readonly ACT_STT_TBL_ROW_START: number = 0x0010;
  static readonly ACT_STT_TBL_ROW_END: number = 0x0020;
  static readonly ACT_STT_EDT_LEFT_TO_RIGHT: number = 0x0040;
  static readonly ACT_STT_EDT_FORM_TOP: number = 0x0080;
  static readonly ACT_STT_EDT_FORM_END: number = 0x0100;
  static readonly ACT_STT_EDT_LINE_START: number = 0x0200;
  static readonly ACT_STT_EDT_LINE_END: number = 0x0400;
  static readonly ACT_STT_EDT_EDITING: number = 0x0800;
  static readonly ACT_STT_TREE_PARK: number = 0x1000;
  static readonly ACT_STT_TREE_EDITING: number = 0x2000;

  static readonly ForwardSlashWebUsage: string = "web"; // refer to a forward slash as a relative web url.
  static readonly HTTP_PROTOCOL: string = "http://";
  static readonly HTTPS_PROTOCOL: string = "https://";
  static readonly FILE_PROTOCOL: string = "file://";

  /// <summary>threads constants</summary>
  static readonly MG_GUI_THREAD: string = "MG_GUI_THREAD";
  static readonly MG_WORK_THREAD: string = "MG_WORK_THREAD";
  static readonly MG_TIMER_THREAD: string = "MG_TIMER_THREAD";

  /// <summary>
  /// property name for the runtime designer
  /// </summary>
  static readonly ConfigurationFilePropertyName: string = "Configuration file";
  static readonly WinPropLeft: string = "Left";
  static readonly WinPropTop: string = "Top";
  static readonly WinPropWidth: string = "Width";
  static readonly WinPropHeight: string = "Height";
  static readonly WinPropBackColor: string = "BackColor";
  static readonly WinPropForeColor: string = "ForeColor";
  static readonly WinPropFont: string = "Font";
  static readonly WinPropText: string = "Text";
  static readonly WinPropLayer: string = "Layer";
  static readonly WinPropX1: string = "X1";
  static readonly WinPropX2: string = "X2";
  static readonly WinPropY1: string = "Y1";
  static readonly WinPropY2: string = "Y2";
  static readonly WinPropIsTransparent: string = "IsTransparent";
  static readonly WinPropName: string = "Name";
  static readonly WinPropVisible: string = "Visible";
  static readonly WinPropGradientStyle: string = "GradientStyle";
  static readonly WinPropVisibleLayerList: string = "VisibleLayerList";
  static readonly TabOrderPropertyTermination: string = "ForTabOrder";

  static readonly SByteMaxValue = 127;

  constructor() {

  }
}
