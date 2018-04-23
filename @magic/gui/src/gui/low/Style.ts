export class  Styles
{
  // styles that call from style2style
  // -------------------------------------
   static  PROP_STYLE_BUTTON_PUSH: number = 0x00000001;
  static  PROP_STYLE_BUTTON_IMAGE: number = 0x00000002;
  static  PROP_STYLE_BUTTON_HYPERTEXT: number = 0x00000004;
  static  PROP_STYLE_BUTTON_TEXT_ON_IMAGE: number = 0x00000008;

  static  PROP_STYLE_HOR_RIGHT: number = 0x00000010;
  static  PROP_STYLE_RIGHT_TO_LEFT: number = 0x00000020;
  static  PROP_STYLE_HORIZONTAL_SCROLL: number = 0x00000040;
  static  PROP_STYLE_VERTICAL_SCROLL: number = 0x00000080;
  static  PROP_STYLE_TITLE: number = 0x00000100;
  static  PROP_STYLE_CLOSE: number = 0x00000200;
  static  PROP_STYLE_MIN: number = 0x00000400;
  static  PROP_STYLE_MAX: number = 0x00000800;
  static  PROP_STYLE_BORDER: number = 0x00001000;
  static  PROP_STYLE_BORDER_STYLE_THIN: number = 0x00002000;
  static  PROP_STYLE_BORDER_STYLE_THICK: number = 0x00004000;
  static  PROP_STYLE_READ_ONLY: number = 0x00008000;
  static  PROP_STYLE_APPEARANCE_CHECK: number = 0x00010000;
  static  PROP_STYLE_APPEARANCE_BUTTON: number = 0x00020000;
  static  PROP_STYLE_WORD_WRAP: number = 0x00040000;
  static  PROP_STYLE_STYLE_FLAT: number = 0x00080000;
  static  PROP_STYLE_TAB_SIDE_TOP: number = 0x04000000;
  static  PROP_STYLE_TAB_SIDE_BOTTOM: number = 0x08000000;
  static  PROP_STYLE_NO_BACKGROUND: number = 0x10000000;
  static  PROP_STYLE_SHOW_LINES: number = 0x20000000;
  static  PROP_STYLE_HORIZONTAL: number = 0x40000000;
  static  PROP_STYLE_VERTICAL: number = 0x80000000;

  // -------------------------------------
  // confirmation box
  static  MSGBOX_BUTTON_OK: number = 0x00000000;
  static  MSGBOX_BUTTON_OK_CANCEL: number = 0x00000001;
  static  MSGBOX_BUTTON_ABORT_RETRY_IGNORE: number = 0x00000002;
  static  MSGBOX_BUTTON_YES_NO_CANCEL: number = 0x00000003;
  static  MSGBOX_BUTTON_YES_NO: number = 0x00000004;
  static  MSGBOX_BUTTON_RETRY_CANCEL: number = 0x00000005;

  static  MSGBOX_ICON_ERROR: number = 0x00000010;
  static  MSGBOX_ICON_QUESTION: number = 0x00000020;
  static  MSGBOX_ICON_EXCLAMATION: number = 0x00000030;
  static  MSGBOX_ICON_INFORMATION: number = 0x00000040;
  static MSGBOX_ICON_WARNING: number = Styles.MSGBOX_ICON_EXCLAMATION;


  // message box result
  static MSGBOX_RESULT_OK = 1;
  static MSGBOX_RESULT_CANCEL = 2;
  static MSGBOX_RESULT_ABORT = 3;
  static MSGBOX_RESULT_RETRY = 4;
  static MSGBOX_RESULT_IGNORE = 5;
  static MSGBOX_RESULT_YES = 6;
  static MSGBOX_RESULT_NO = 7;

  static MSGBOX_DEFAULT_BUTTON_1: number = 0x00000000;
  static MSGBOX_DEFAULT_BUTTON_2: number = 0x00000100;
  static MSGBOX_DEFAULT_BUTTON_3: number = 0x00000200;
}
