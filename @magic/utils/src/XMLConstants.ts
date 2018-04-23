export class XMLConstants {
  static readonly MG_TAG_XML: string = "xml";
  static readonly MG_TAG_XML_END: string = "/xml";

  static readonly TAG_TERM: string = "/>";
  static readonly TAG_OPEN: string = "<";
  static readonly TAG_CLOSE: string = ">";
  static readonly XML_ATTR_DELIM: string = "\"";
  static readonly START_TAG: string = "\n   <";
  static readonly END_TAG: string = "</";
  static readonly XML_TAB: string = "   ";

  static readonly MG_ATTR_ID: string = "id";

  static readonly MG_TAG_XML_END_TAGGED: string = XMLConstants.END_TAG + XMLConstants.MG_TAG_XML + XMLConstants.TAG_CLOSE;
  static readonly MG_TAG_OPEN: string = XMLConstants.TAG_OPEN + XMLConstants.MG_TAG_XML + " " + XMLConstants.MG_ATTR_ID + "=\"MGDATA\">";
  static readonly MG_TAG_TASK: string = "task";
  static readonly MG_TAG_TASK_END: string = "/task";
  static readonly MG_TAG_RECOMPUTE: string = "recompute";

  //TODO: this class contains the constants which are used for XML parsing.
  //Check if we can move it to Util.dll
  static readonly MG_ATTR_VB_VIEW_ROWIDX: string = "db_view_rowidx";
  static readonly MG_ATTR_CONTROL_ISN: string = "controlIsn";
  static readonly MG_HOR_ALIGMENT_IS_INHERITED: string = "horAligmentIsInherited";

  // MainHeaders
  static readonly MAX_PATH: number = 260;
  static readonly FILE_NAME_SIZE: number = XMLConstants.MAX_PATH + 1;

  static readonly CDATA_START: string = "<![CDATA[";
  static readonly CDATA_END: string = "]]>";

  static readonly MG_ATTR_VALUE: string = "val";
  static readonly MG_ATTR_STUDIO_VALUE: string = "studioValue";
  static readonly MG_ATTR_NAME: string = "name";
  static readonly MG_ATTR_TYPE: string = "type";
  static readonly MG_ATTR_SIZE: string = "size";
  static readonly MG_ATTR_VAR_NAME: string = "var_name";
  static readonly MG_ATTR_VAR_DISP_NAME: string = "var_disp_name";
  static readonly MG_ATTR_VEC_CELLS_SIZE: string = "vecCellsSize";
  static readonly MG_ATTR_VEC_CELLS_ATTR: string = "vec_cells_attr";
  static readonly MG_ATTR_VEC_CELLS_CONTENT: string = "CellContentType";
  static readonly MG_ATTR_NULLVALUE: string = "nullvalue";
  static readonly MG_ATTR_NULLDISPLAY: string = "nulldisplay";
  static readonly MG_ATTR_NULLDEFAULT: string = "nulldefault";
  static readonly MG_ATTR_DB_MODIFIABLE: string = "db_modifiable";
  static readonly MG_ATTR_DEFAULTVALUE: string = "defaultvalue";
  static readonly MG_ATTR_NULLALLOWED: string = "nullallowed";
  static readonly MG_ATTR_BLOB_CONTENT: string = "ContentType";
  static readonly MG_ATTR_PART_OF_DATAVIEW: string = "partOfDataview";
  static readonly MG_ATTR_DATA_TYPE: string = "dataType";
  static readonly MG_ATTR_DATA_CTRL: string = "data_ctrl";
  static readonly MG_ATTR_LINKED_PARENT: string = "linked_parent";
  static readonly MG_ATTR_CONTAINER: string = "container";
  static readonly MG_ATTR_IS_FRAMESET: string = "isFrameSet";
  static readonly MG_ATTR_IS_LIGAL_RC_FORM: string = "isLegalRcForm";
  static readonly MG_ATTR_USERSTATE_ID: string = "userStateId";
  static readonly MG_ATTR_PB_IMAGES_NUMBER: string = "PBImagesNumber";
  static readonly MG_ATTR_FORM_ISN: string = "formIsn";
  static readonly MG_ATTR_TASKID: string = "taskid";
  static readonly MG_ATTR_TASK_IS_SERIALIZATION_PARTIAL: string = "isSerializationPartial";
  static readonly MG_ATTR_XML_TRUE: string = "1";
  static readonly MG_ATTR_XML_FALSE: string = "0";
  static readonly MG_ATTR_TOOLKIT_PARENT_TASK: string = "toolkit_parent_task";
  static readonly MG_ATTR_CTL_IDX: string = "ctl_idx";
  static readonly MG_ATTR_MAINPRG: string = "mainprg";
  static readonly MG_ATTR_NULL_ARITHMETIC: string = "nullArithmetic";
  static readonly MG_ATTR_INTERACTIVE: string = "interactive";
  static readonly MG_ATTR_IS_OFFLINE: string = "IsOffline";
  static readonly MG_ATTR_RETURN_VALUE_EXP: string = "returnValueExp";
  static readonly MG_ATTR_PARALLEL: string = "ParallelExecution";
  static readonly MG_ATTR_OPEN_WIN: string = "OpenWin";
  static readonly MG_ATTR_ALLOW_EVENTS: string = "AllowEvents";
  static readonly MG_ATTR_ISPRG: string = "isPrg";
  static readonly MG_ATTR_APPL_GUID: string = "applicationGuid";
  static readonly MG_ATTR_PROGRAM_ISN: string = "programIsn";
  static readonly MG_ATTR_TASK_ISN: string = "taskIsn";
  static readonly MG_ATTR_ROUTER_PATH: string = "RouterPath";
  static readonly MG_ATTR_IN_DEFAULT_ROUTER_OUTLET: string = "InDefaultRouterOutlet";
  static readonly MG_ATTR_EXPAND: string = "expand";
  static readonly MG_ATTR_EXP: string = "exp";
  static readonly MG_ATTR_IS_GENERIC: string = "isGeneric";
  static readonly MG_ATTR_HASHCODE: string = "hashCode";
  static readonly MG_ATTR_PICTURE: string = "picture";
  static readonly MG_ATTR_STORAGE: string = "storage";
  static readonly MG_ATTR_DITIDX: string = "ditidx";
  static readonly MG_ATTR_ICON_FILE_NAME: string = "iconFileName";
  static readonly MG_ATTR_SYS_CONTEXT_MENU: string = "systemContextMenu";
  static readonly MG_TAG_FLDH: string = "fldh";
  static readonly MG_TAG_DVHEADER: string = "dvheader";
  static readonly MG_ATTR_MENUS_FILE_NAME: string = "menusFileName";
  static readonly MG_ATTR_MENU_CONTENT: string = "MenusContent";
  static readonly MG_ATTR_SORT_BY_RECENTLY_USED: string = "SortWindowListByRecentlyUsed";

  static readonly MG_ATTR_CONTROL_Z_ORDER: string = "zorder";

  static readonly MG_TAG_PROP: string = "prop";
  static readonly MG_TAG_CONTROL: string = "control";
  static readonly MG_TAG_FORM: string = "form";
  static readonly MG_TAG_FORM_PROPERTIES: string = "propertiesForm";
  static readonly MG_TAG_FORMS: string = "forms";
  static readonly MG_TAG_TREE: string = "tree";
  static readonly MG_TAG_NODE: string = "node";
  static readonly MG_TAG_FLD: string = "fld";
  static readonly MG_ATTR_CHILDREN_RETRIEVED: string = "children_retrieved";

  static readonly MG_TAG_HELPTABLE: string = "helptable";
  static readonly MG_TAG_HELPITEM: string = "helpitem";

  static readonly MG_TAG_ASSEMBLIES: string = "assemblies";
  static readonly MG_TAG_ASSEMBLY: string = "assembly";
  static readonly MG_ATTR_ASSEMBLY_PATH: string = "path";
  static readonly MG_ATTR_ASSEMBLY_CONTENT: string = "Content";
  static readonly MG_ATTR_FULLNAME: string = "fullname";
  static readonly MG_ATTR_ISSPECIFIC: string = "isSpecific";
  static readonly MG_ATTR_IS_GUI_THREAD_EXECUTION: string = "isGuiThreadExecution";

  static readonly MG_TAG_TASKDEFINITIONID_ENTRY: string = "taskDefinitionId";
  static readonly MG_TAG_OBJECT_REFERENCE: string = "objectRef";

  //Help types
  static readonly MG_ATTR_HLP_TYP_TOOLTIP: string = "T";
  static readonly MG_ATTR_HLP_TYP_PROMPT: string = "P";
  static readonly MG_ATTR_HLP_TYP_URL: string = "U";
  static readonly MG_ATTR_HLP_TYP_INTERNAL: string = "I";
  static readonly MG_ATTR_HLP_TYP_WINDOWS: string = "W";

  //Internal help attributes.
  static readonly MG_ATTR_INTERNAL_HELP_TYPE: string = "type";
  static readonly MG_ATTR_INTERNAL_HELP_NAME: string = "name";

  static readonly MG_ATTR_INTERNAL_HELP_FRAMEX: string = "framex";
  static readonly MG_ATTR_INTERNAL_HELP_FRAMEY: string = "framey";

  static readonly MG_ATTR_INTERNAL_HELP_FRAMEDX: string = "famedx";
  static readonly MG_ATTR_INTERNAL_HELP_FRAMEDY: string = "framedy";

  static readonly MG_ATTR_INTERNAL_HELP_SIZEDX: string = "sizedx";
  static readonly MG_ATTR_INTERNAL_HELP_SIZEDY: string = "sizedy";

  static readonly MG_ATTR_INTERNAL_HELP_FACTORX: string = "factorx";
  static readonly MG_ATTR_INTERNAL_HELP_FACTORY: string = "factory";

  static readonly MG_ATTR_INTERNAL_HELP_BORDERSTYLE: string = "borderstyle";
  static readonly MG_ATTR_INTERNAL_TITLE_BAR: string = "titlebar";
  static readonly MG_ATTR_INTERNAL_HELP_SYSTEM_MENU: string = "sysmenu";

  static readonly MG_ATTR_INTERNAL_HELP_FONT_TABLE_INDEX: string = "fonttableindex";

  //Windows help attributes.
  static readonly MG_ATTR_WINDOWS_HELP_FILE: string = "file";
  static readonly MG_ATTR_WINDOWS_HELP_COMMAND: string = "command";
  static readonly MG_ATTR_WINDOWS_HELP_KEY: string = "key";

  //Print data attributes.
  static readonly MG_TAG_PRINT_DATA: string = "Print_data";
  static readonly MG_TAG_PRINT_DATA_END: string = "/Print_data";
  static readonly MG_TAG_RECORD: string = "Record";
  static readonly MG_TAG_RECORD_END: string = "/Record";

  // date/time formats for DateTimeUtils
  //TODO: isolate to a different file?
  static readonly ERROR_LOG_TIME_FORMAT: string = "HH:mm:ss.S";
  static readonly ERROR_LOG_DATE_FORMAT: string = "DD/MM/YYYY";
  static readonly HTTP_ERROR_TIME_FORMAT: string = "HH:mm:ss";
  static readonly CACHED_DATE_TIME_FORMAT: string = "DD/MM/YYYY HH:mm:ss";

  //webs constants
  static readonly MG_TAG_WS_READ_REQUEST: string = "Read";
  static readonly MG_TAG_WS_CREATE_REQUEST: string = "Create";
  static readonly MG_TAG_WS_CREATE_REQUEST_END: string = "/Create";
  static readonly MG_TAG_WS_UPDATE_REQUEST: string = "Update";
  static readonly MG_TAG_WS_UPDATE_REQUEST_END: string = "/Update";
  static readonly MG_TAG_WS_DELETE_REQUEST: string = "Delete";
  static readonly MG_TAG_WS_DELETE_REQUEST_END: string = "/Delete";
  static readonly MG_TAG_WS_MANIPULATE_REQUEST: string = "Manipulate";
  static readonly MG_TAG_WS_MANIPULATE_REQUEST_END: string = "/Manipulate";

  static readonly MG_TAG_WS_DATABASE: string = "Database";
  static readonly MG_TAG_WS_DATASOURCE: string = "Datasource";
  static readonly MG_TAG_WS_COLUMNS: string = "Columns";
  static readonly MG_TAG_WS_COLUMN: string = "string";
  static readonly MG_TAG_WS_RANGES: string = "Ranges";
  static readonly MG_TAG_WS_RANGES_END: string = "/Ranges";
  static readonly MG_TAG_WS_MIN: string = "Min";
  static readonly MG_TAG_WS_MAX: string = "Max";
  static readonly MG_TAG_WS_RECORD: string = "Row";
  static readonly MG_TAG_WS_RECORD_END: string = "/Row";
  static readonly MG_TAG_WS_WHERE: string = "Where";
  static readonly MG_TAG_WS_WHERE_END: string = "/Where";

  static readonly MG_TAG_WS_RESPONSE: string = "Response";
  static readonly MG_TAG_WS_ERROR: string = "Error";
  static readonly MG_TAG_WS_ERROR_CODE: string = "errorCode";
  static readonly MG_TAG_WS_DESCRIPTION: string = "description";

  static readonly MG_TAG_MENUS_OPEN: string = "Menus";
  static readonly MG_TAG_MENUS_CLOSE: string = "/Menus";
  static readonly MG_TAG_MENU: string = "Menu";

  constructor() {

  }
}
