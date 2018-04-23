/// <summary> This interface is used to define some global constants.
/// Rules:
/// 1. Any class that need one or more of these constants must implement this interface
///    or access the constant directly using the interface name as its prefix.
/// 2. Please define the constants using UPPERCASE letters to make them stand out clearly.</summary>
import {XMLConstants} from "@magic/utils";

export class ConstInterface {
  static EXECUTION_PROPERTIES_FILE_NAME: string = "execution.properties";
  static FORMS_USER_STATE_FILE_NAME: string = "FormsUserStateRIA";

  static NAMES_SEPARATOR: string = "#+%";

  /// <summary> Tags and Attributes of the XML protocol</summary>
  static MG_TAG_CONTEXT: string = "context";
  static MG_TAG_PROTOCOL: string = "protocol";
  static MG_TAG_ENV: string = "env";
  static MG_TAG_COMMAND: string = "command";
  static MG_TAG_LANGUAGE: string = "language";
  static MG_TAG_LANGUAGE_END: string = "/language";
  static MG_TAG_CONSTMESSAGES: string = "ConstMessages";
  static MG_TAG_CONSTMESSAGES_END: string = "/ConstMessages";
  static MG_TAG_CONSTMESSAGESCONTENT: string = "ConstLangFileContent";
  static MG_TAG_CONSTMESSAGESCONTENT_END: string = "/ConstLangFileContent";
  static MG_TAG_MLS_FILE_URL: string = "MlsFileUrl";
  static MG_TAG_MLS_FILE_URL_END: string = "/MlsFileUrl";
  static MG_TAG_MLS_CONTENT: string = "MlsContent";
  static MG_TAG_MLS_CONTENT_END: string = "/MlsContent";
  static MG_TAG_COMPMAINPRG: string = "compmainprg";
  static MG_TAG_STARTUP_PROGRAM: string = "StartupProgram";
  static MG_TAG_CONTEXT_ID: string = "ContextID";
  static MG_TAG_HTTP_COMMUNICATION_TIMEOUT: string = "HttpTimeout"; // communication-level timeout (i.e. the access to the web server, NOT the entire request/response round-trip), in seconds.
  static MG_TAG_UNSYNCRONIZED_METADATA: string = "UnsynchronizedMetadata";

  // task definition ids
  // ---------------------------------------------------------------
  static MG_TAG_TASKDEFINITION_IDS_URL: string = "taskDefinitionIdsUrl";
  static MG_TAG_OFFLINE_SNIPPETS_URL: string = "offlineSnippetsUrl";
  static MG_TAG_DEFAULT_TAG_LIST: string = "defaultTagList";
  static MG_TAG_TASK_INFO: string = "taskinfo";
  static MG_TAG_EXECUTION_RIGHT: string = "executionRightIdx";

  // ---------------------------------------------------------------
  static MG_TAG_ASSEMBLIES: string = "assemblies";
  static MG_TAG_ASSEMBLY: string = "assembly";
  static MG_ATTR_ISSPECIFIC: string = "isSpecific";
  static MG_ATTR_IS_GUI_THREAD_EXECUTION: string = "isGuiThreadExecution";
  static MG_ATTR_ASSEMBLY_PATH: string = "path";
  static MG_ATTR_ASSEMBLY_CONTENT: string = "Content";
  static MG_ATTR_FULLNAME: string = "fullname";
  static MG_ATTR_PUBLIC_NAME: string = "publicName";
  static MG_TAG_TASKURL: string = "taskURL";
  static MG_TAG_TASK_IS_OFFLINE: string = "IsOffline";
  static MG_TAG_EXPTABLE: string = "exptable";
  static MG_TAG_EXP: string = "exp";
  static MG_TAG_DATAVIEW: string = "dataview";
  static MG_TAG_COMPLETE_DV: string = "CompleteDataView";
  static MG_TAG_REC: string = "rec";
  static MG_TAG_FLD_END: string = "/fld";
  static MG_TAG_HANDLER: string = "handler";
  static MG_TAG_EVENTHANDLERS: string = "eventhandlers";
  static MG_TAG_EVENT: string = "event";
  static MG_TAG_OPER: string = "oper";
  static MG_TAG_KBDMAP_URL: string = "kbdmapurl";
  static MG_TAG_KBDMAP: string = "kbdmap";
  static MG_TAG_KBDITM: string = "kbditm";
  static MG_TAG_USER_EVENTS: string = "userevents";
  static MG_TAG_USER_EVENTS_END: string = "/userevents";
  static MG_TAG_EVENTS_QUEUE: string = "eventsqueue";
  static MG_TAG_DC_VALS: string = "dc_vals";
  static MG_TAG_FLWMTR_CONFIG: string = "flwmtr_config";
  static MG_TAG_FLWMTR_MSG: string = "flwmtr_msg";
  static MG_TAG_FLWMTR_ACT: string = "act";
  static MG_TAG_DEL_LIST: string = "cacheDelList";
  static MG_TAG_LINKS: string = "links";
  static MG_TAG_LINKS_END: string = "/links";
  static MG_TAG_LINK: string = "link";
  static MG_TAG_TASK_TABLES: string = "taskTables";
  static MG_TAG_TASK_TABLES_END: string = "/taskTables";
  static MG_TAG_TASK_TABLE: string = "taskTable";
  static MG_TAG_COLUMN: string = "column";
  static MG_TAG_SORT: string = "sort";
  static MG_TAG_SORTS: string = "sorts";
  static MG_TAG_SORTS_END: string = "/sorts";
  static MG_TAG_CACHED_TABLE: string = "cachedTable";
  static MG_TAG_CACHED_TABLE_END: string = "/cachedTable";
  static MG_TAG_RECORDS: string = "records";
  static MG_TAG_RECORDS_END: string = "/records";
  static MG_TAG_TASK_XML: string = "taskxml";
  static MG_TAG_EXEC_STACK_ENTRY: string = "execstackentry";
  static MG_TAG_DBH_REAL_IDXS: string = "dbhRealIdxs";
  static MG_SSL_STORE_ARG_PREFIX: string = "STORE:";

  static MG_ATTR_VALUE_TAGGED: string = XMLConstants.TAG_OPEN + XMLConstants.MG_ATTR_VALUE + XMLConstants.TAG_CLOSE;
  static MG_ATTR_VALUE_END_TAGGED: string = XMLConstants.END_TAG + XMLConstants.MG_ATTR_VALUE + XMLConstants.TAG_CLOSE;
  static MG_ATTR_HANDLER: string = "handler";
  static MG_ATTR_OBJECT: string = "object";
  static MG_ATTR_RECOMPUTE: string = "recompute";
  static MG_ATTR_MESSAGE: string = "message";
  static MG_ATTR_HTML: string = "html";
  static MG_ATTR_ARGLIST: string = "arglist";
  static MG_ATTR_EXTRA: string = "extra";
  static MG_ATTR_FIRSTPOS: string = "firstpos";
  static MG_ATTR_LASTPOS: string = "lastpos";
  static MG_ATTR_VIRTUAL: string = "virtual";
  static MG_ATTR_SUBFORM_TASK: string = "subform_task";
  static MG_ATTR_PARAM: string = "param";
  static MG_ATTR_PARAMS: string = "params";
  static MG_ATTR_ROUTE_PARAMS: string = "routeParams";
  static MG_ATTR_EXPOSED_ROUTE_PARAMS: string = "exposedRouteParam";
  static MG_ATTR_PAR_ATTRS: string = "attr";
  static MG_ATTR_PAR_ATTRS_TAGGED: string = XMLConstants.TAG_OPEN + ConstInterface.MG_ATTR_PAR_ATTRS + XMLConstants.TAG_CLOSE;
  static MG_ATTR_PAR_ATTRS_END_TAGGED: string = XMLConstants.END_TAG + ConstInterface.MG_ATTR_PAR_ATTRS + XMLConstants.TAG_CLOSE;
  static MG_ATTR_VIR_AS_REAL: string = "vir_as_real";
  static MG_ATTR_LNK_CREATE: string = "link_create";
  static MG_ATTR_LENGTH: string = "length";
  static MG_ATTR_RANGE: string = "range";
  static MG_ATTR_NULLVALUE: string = "nullvalue";
  static MG_ATTR_INIT: string = "init";
  static MG_ATTR_CURRPOS: string = "currpos";
  static MG_ATTR_POS: string = "pos";
  static MG_ATTR_OLDPOS: string = "oldpos";
  static MG_ATTR_MODE: string = "mode";
  static MG_ATTR_RECOMPUTEBY: string = "recompute_by";
  static MG_ATTR_NAME_TAGGED: string = XMLConstants.TAG_OPEN + XMLConstants.MG_ATTR_NAME + XMLConstants.TAG_CLOSE;
  static MG_ATTR_NAME_END_TAGGED: string = XMLConstants.END_TAG + XMLConstants.MG_ATTR_NAME + XMLConstants.TAG_CLOSE;
  static MG_ATTR_TRANS: string = "trans";
  static MG_ATTR_HANDLEDBY: string = "handledby";
  static MG_ATTR_LEVEL: string = "level";
  static MG_ATTR_DESTINATION_DATASOURCE_NAME: string = "destDataSourceName";
  static MG_ATTR_DESTINATION_COLUMNLIST: string = "destColumnList";
  static MG_ATTR_SOURCE_DATAVIEW: string = "sourceDataView";
  static MG_ATTR_SECONDS: string = "seconds";
  static MG_ATTR_SCOPE: string = "scope";
  static MG_ATTR_RETURN: string = "return";
  static MG_ATTR_PROPAGATE: string = "propagate";
  static MG_ATTR_ENABLED: string = "enabled";
  static MG_ATTR_FLD: string = "fld";
  static MG_ATTR_FIELDID: string = "fieldid";
  static MG_ATTR_IGNORE_SUBFORM_RECOMPUTE: string = "ignoreSubformRecompute";
  static MG_ATTR_MAGICEVENT: string = "magicevent";
  static MG_ATTR_EXIT_BY_MENU: string = "exitByMenu";
  static MG_ATTR_FOCUSLIST: string = "focuslist";
  static MG_ATTR_FOCUSTASK: string = "currFocusedTask";
  static MG_ATTR_TEXT: string = "text";
  static MG_ATTR_TITLE: string = "title";
  static MG_ATTR_TITLE_EXP: string = "titleExp";
  static MG_ATTR_IMAGE: string = "image";
  static MG_ATTR_BUTTONS: string = "buttons";
  static MG_ATTR_DEFAULT_BUTTON: string = "defaultButton";
  static MG_ATTR_DEFAULT_BUTTON_EXP: string = "defaultButtonExp";
  static MG_ATTR_RETURN_VAL: string = "returnVal";
  static MG_ATTR_ERR_LOG_APPEND: string = "errorLogAppend";
  static MG_ATTR_EVENTVALUE: string = "eventvalue";
  static MG_ATTR_EVENTTYPE: string = "eventtype";
  static MG_ATTR_HOW: string = "how";
  static MG_ATTR_UNDO: string = "undo";
  static MG_ATTR_CND: string = "cnd";
  static MG_ATTR_ACTIONID: string = "actionid";
  static MG_ATTR_KEYCODE: string = "keycode";
  static MG_ATTR_MODIFIER: string = "modifier";
  static MG_ATTR_STATES: string = "states";
  static MG_ATTR_CURR_REC: string = "curr_rec";
  static MG_ATTR_LAST_REC_ID: string = "lastRecIdx";
  static MG_ATTR_OLD_FIRST_REC_ID: string = "oldFirstRecIdx";
  static MG_ATTR_CURR_REC_POS_IN_FORM: string = "currRecPosInForm";
  static MG_ATTR_REPEATABLE: string = "repeatable";
  static MG_ATTR_FIELD: string = "field";
  static MG_ATTR_IDX: string = "idx";
  static MG_ATTR_URL: string = "url";
  static MG_ATTR_DATEMODE: string = "datemode";
  static MG_ATTR_THOUSANDS: string = "thousands";
  static MG_ATTR_DECIMAL_SEPARATOR: string = "decimalseparator";
  static MG_ATTR_DATE: string = "date";
  static MG_ATTR_TIME: string = "time";
  static MG_ATTR_LANGUAGE: string = "language";
  static MG_ATTR_MODAL: string = "modal";
  static MG_ATTR_IS_ROUTE: string = "is_route";
  static MG_ATTR_TASK: string = "task";
  static MG_ATTR_INTERNALEVENT: string = "internalevent";
  static MG_ATTR_VARIABLE: string = "variable";
  static MG_ATTR_HANDLERID: string = "handlerid";
  static MG_ATTR_ROLLBACK_TYPE: string = "rollbackType";

  static MG_ATTR_CENTURY: string = "century";
  static MG_ATTR_DATATYPE: string = "datatype";
  static MG_ATTR_INCLUDE_FIRST: string = "include_first";
  static MG_ATTR_INCLUDE_LAST: string = "include_last";
  static MG_ATTR_IS_ONEWAY_KEY: string = "isonewaykey";
  static MG_ATTR_INSERT_AT: string = "insert_at";
  static MG_ATTR_DBVIEWSIZE: string = "dbviewsize";
  static MG_ATTR_FRAME_EXP: string = "frameexp";
  static MG_ATTR_PICLEN: string = "piclen";
  static MG_ATTR_SRCTASK: string = "srctask";
  static MG_ATTR_INVALIDATE: string = "invalidate";
  static MG_ATTR_RMPOS: string = "rmpos";
  static MG_ATTR_DISPLAY: string = "display";
  static MG_ATTR_SUBTYPE: string = "subtype";
  static MG_ATTR_ADD_AFTER: string = "add_after";
  static MG_ATTR_TOP_REC_ID: string = "top_rec_id";
  static MG_ATTR_LOW_ID: string = "low_id";
  static MG_ATTR_OWNER: string = "owner";
  static MG_ATTR_UPD_IN_QUERY: string = "updateInQuery";
  static MG_ATTR_UPD_IN_QUERY_LOWER: string = "updateinquery";
  static MG_ATTR_CRE_IN_MODIFY: string = "createInModify";
  static MG_ATTR_CRE_IN_MODIFY_LOWER: string = "createinmodify";
  static MG_ATTR_IDLETIME: string = "idletime";
  static MG_ATTR_VER: string = "ver";
  static MG_ATTR_SUBVER: string = "subver";
  static MG_ATTR_WAIT: string = "wait";
  static MG_ATTR_RETAIN_FOCUS: string = "retainFocus";
  static MG_ATTR_SYNC_DATA: string = "syncData";
  static MG_ATTR_SHOW: string = "show";
  static MG_ATTR_COMPONENT: string = "component";
  static MG_ATTR_PATH_PARENT_TASK: string = "path_parent_task";
  static MG_ATTR_USER: string = "user";
  static MG_ATTR_FORCE_EXIT: string = "force_exit";
  static MG_ATTR_PUBLIC: string = "public_name";
  static MG_ATTR_PRG_DESCRIPTION: string = "prgDescription";
  static MG_ATTR_MENU_CONTENTEND: string = "MenusContentEnd";
  static MG_ATTR_OBJECT_TYPE: string = "object_type";
  static MG_ATTR_TABLE_NAME: string = "table_name";
  static MG_ATTR_INDEX_IN_TABLE: string = "index_in_table";
  static MG_ATTR_CALLINGTASK: string = "callingtask";
  static MG_ATTR_FLAGS: string = "flags";
  static MG_ATTR_LNKEXP: string = "link_exp";
  static MG_ATTR_MODIFIED: string = "modi";
  static MG_ATTR_OPER: string = "oper";
  static MG_ATTR_REFRESHON: string = "refreshon";
  static MG_ATTR_TASKMODE: string = "taskmode";
  static MG_ATTR_EMPTY_DATAVIEW: string = "EmptyDataview";
  static MG_ATTR_TASKLEVEL: string = "tasklevel";
  static MG_ATTR_TRANS_CLEARED: string = "trans_cleared";
  static MG_ATTR_TRANS_STAT: string = "trans_stat";
  static MG_ATTR_SUBFORM_VISIBLE: string = "visible";
  static MG_ATTR_ACK: string = "ack";
  static MG_ATTR_COMPUTE_BY: string = "compute_by";
  static MG_ATTR_CHUNK_SIZE: string = "chunk_size";
  static MG_ATTR_CHUNK_SIZE_EXPRESSION: string = "chunk_size_expression";
  static MG_ATTR_HAS_MAIN_TBL: string = "has_main_tbl";
  static MG_ATTR_SERVER_ID: string = "serverid";
  static MG_ATTR_SUBFORM_CTRL: string = "subformCtrl";
  static MG_ATTR_CHECK_BY_SERVER: string = "checkByServer";
  static MG_ATTR_OPER_IDX: string = "operidx";
  static MG_ATTR_EXP_IDX: string = "expidx";
  static MG_ATTR_EXP_TYPE: string = "exptype";
  static MG_ATTR_NULL: string = "null";
  static MG_ATTR_NULLS: string = "nulls";
  static MG_ATTR_DC_REFS: string = "dc_refs";
  static MG_ATTR_LINKED: string = "linked";
  static MG_ATTR_DISP: string = "disp";
  static MG_ATTR_REMOVE: string = "remove";
  static MG_ATTR_DVPOS: string = "dvpos";
  static MG_ATTR_SIGNIFICANT_NUM_SIZE: string = "significant_num_size";
  static MG_ATTR_DEBUG_MODE: string = "debug";
  static MG_ATTR_POINT_TRANSLATION: string = "changePoint";
  static MG_ATTR_SPECIAL_EXITCTRL: string = "specialExitCtrl";
  static MG_ATTR_DEFAULT_COLOR: string = "defaultColor";
  static MG_ATTR_DEFAULT_FOCUS_COLOR: string = "defaultFocusColor";
  static MG_ATTR_CONTEXT_INACTIVITY_TIMEOUT: string = "ContextInactivityTimeout";
  static MG_ATTR_CONTEXT_INACTIVITY_TIMEOUT_LOWER: string = "contextinactivitytimeout";
  static MG_ATTR_CONTEXT_UNLOAD_TIMEOUT: string = "ContextUnloadTimeout";
  static MG_ATTR_CONTEXT_UNLOAD_TIMEOUT_LOWER: string = "contextunloadtimeout";
  static MG_ATTR_TOOLTIP_TIMEOUT: string = "TooltipTimeout";
  static MG_ATTR_LOWHIGH: string = "lowhigh";
  static MG_ATTR_ACCESS_TEST: string = "AccessTest";
  static MG_ATTR_SPECIAL_TEXT_SIZE_FACTORING: string = "SpecialTextSizeFactoring";
  static MG_ATTR_SPECIAL_FLAT_EDIT_ON_CLASSIC_THEME: string = "SpecialFlatEditOnClassicTheme";
  static MG_ATTR_ENCODING: string = "encoding";
  static MG_ATTR_SYSTEM: string = "system";
  static MG_ATTR_RECOVERY: string = "recovery";
  static MG_ATTR_REVERSIBLE: string = "reversible";
  static MG_ATTR_OLDID: string = "oldid";
  static MG_ATTR_NEWID: string = "newid";
  static MG_ATTR_MPRG_SOURCE: string = "mprg_source";
  static MG_ATTR_INVOKER_ID: string = "invokerid";
  static MG_ATTR_TRANS_LEVEL: string = "level";
  static MG_ATTR_TOP: string = "top";
  static MG_ATTR_LEFT: string = "left";
  static MG_ATTR_HEIGHT: string = "height";
  static MG_ATTR_WIDTH: string = "width";
  static MG_ATTR_LEN: string = "len";
  static MG_ATTR_SCAN: string = "scan";
  static MG_ATTR_STANDALONE: string = "standalone";
  static MG_ATTR_DESC: string = "desc"; // description
  static MG_ATTR_MNUUID: string = "mnuuid";
  static MG_ATTR_MNUCOMP: string = "mnucomp";
  static MG_ATTR_MNUPATH: string = "mnupath";
  static MG_ATTR_CLOSE_SUBFORM_ONLY: string = "closeSubformOnly";
  static MG_ATTR_CHECK_ONLY: string = "checkOnly";
  static MG_ATTR_EXEC_ON_SERVER: string = "execOnServer";
  static MG_ATTR_USER_SORT: string = "userSort";
  static MG_TAG_USERNAME: string = "userName";
  static MG_TAG_PASSWORD: string = "password";
  static MG_ATTR_USERID: string = "userId";
  static MG_ATTR_USERINFO: string = "userInfo";
  static MG_ATTR_CPY_GLB_PRMS: string = "copy_global_params";
  static MG_TAG_GLOBALPARAMS: string = "globalparams";
  static MG_TAG_GLOBALPARAMSCHANGES: string = "globalParamChanges";
  static MG_TAG_GLOBALPARAMSCHANGES_TAGGED: string = XMLConstants.TAG_OPEN + ConstInterface.MG_TAG_GLOBALPARAMSCHANGES + XMLConstants.TAG_CLOSE;
  static MG_TAG_GLOBALPARAMSCHANGES_END_TAGGED: string = XMLConstants.END_TAG + ConstInterface.MG_TAG_GLOBALPARAMSCHANGES + XMLConstants.TAG_CLOSE;
  static MG_TAG_PARAM: string = "param";
  static MG_TAG_PARAM_TAGGED: string = XMLConstants.TAG_OPEN + ConstInterface.MG_TAG_PARAM + XMLConstants.TAG_CLOSE;
  static MG_TAG_PARAM_END_TAGGED: string = XMLConstants.END_TAG + ConstInterface.MG_TAG_PARAM + XMLConstants.TAG_CLOSE;
  static MG_ATTR_IME_AUTO_OFF: string = "imeAutoOff";
  static MG_ATTR_LOCAL_AS400SET: string = "local_as400set";
  static MG_ATTR_LOCAL_EXTRA_GENGO: string = "local_extraGengo";
  static MG_ATTR_LOCAL_FLAGS: string = "local_flags";
  static MG_ATTR_SPEACIAL_ANSI_EXP: string = "SpecialAnsiExpression";
  static MG_ATTR_SPECIAL_SHOW_STATUSBAR_PANES: string = "SpecialShowStatusBarPanes";
  static MG_ATTR_SPECIAL_SPECIAL_EDIT_LEFT_ALIGN: string = "SpecialEditLeftAlign";
  static MG_ATTR_SPECIAL_IGNORE_BUTTON_FORMAT: string = "SpecialIgnoreButtonFormat";
  static MG_ATTR_SPEACIAL_SWF_CONTROL_NAME: string = "SpecialSwfControlNameProperty";
  static MG_ATTR_FRAMESET_STYLE: string = "frameSetStyle";
  static MG_ATTR_OPER_DIRECTION: string = "operDir";
  static MG_ATTR_OPER_FLOWMODE: string = "operFlowMode";
  static MG_ATTR_OPER_CALLMODE: string = "operCallMode";
  static MG_ATTR_TASK_FLOW_DIRECTION: string = "taskFlowDir";
  static MG_ATTR_TASK_MAINLEVEL: string = "mainlevel";
  static MG_ATTR_OPER_METHODNAME: string = "method_name";
  static MG_ATTR_OPER_ASMURL: string = "asm_url";
  static MG_ATTR_OPER_ASMFILE: string = "asm_file";
  static MG_ATTR_OPER_ASMNAME: string = "asm_name";
  static MG_ATTR_OPER_ASMCONTENT: string = "asm_content";
  static MG_ATTR_GUID: string = "GUID";
  static MG_ATTR_CONTROLS_PERSISTENCY_PATH: string = "ControlsPersistencyPath";
  static MG_ATTR_PROJDIR: string = "projdir";
  static MG_ATTR_TERMINAL: string = "terminal";
  static MG_TAG_ENV_PARAM_URL: string = "envparamurl";
  static MG_TAG_ENV_PARAM: string = "environment";
  static MG_ATTR_CLOSE_TASKS_ON_PARENT_ACTIVATE: string = "closeTasksOnParentActivate";
  static MG_ATTR_HANDLER_ONFORM: string = "HandlerOnForm";
  static MG_ATTR_DROP_USERFORMATS: string = "dropuserformats";
  static MG_ATTR_CACHED_FILES: string = "cachedFiles";
  static MG_ATTR_CONTROL_NAME: string = "ControlName";
  static MG_TAG_HIDDEN_CONTOLS: string = "HiddenControls";
  static MG_ATTR_ISNS: string = "Isns";

  // for env var table
  static MG_ATTR_TEMP_DATABASE: string = "tempdatabase";
  static MG_ATTR_TIME_SEPARATOR: string = "timeseparator";
  static MG_ATTR_IOTIMING: string = "iotiming";
  static MG_ATTR_HTTP_TIMEOUT: string = "httptimeout";
  static MG_ATTR_USE_SIGNED_BROWSER_CLIENT: string = "usesignedbrowserclient";
  static MG_ATTR_CLOSE_PRINTED_TABLES_IN_SUBTASKS: string = "closeprintedtablesinsubtasks";
  static MG_ATTR_GENERIC_TEXT_PRINTING: string = "generictextprinting";
  static MG_ATTR_HIGH_RESOLUTION_PRINT: string = "highresolutionprint";
  static MG_ATTR_MERGE_TRIM: string = "mergetrim";
  static MG_ATTR_ORIGINAL_IMAGE_LOAD: string = "originalimageload";
  static MG_ATTR_PRINT_DATA_TRIM: string = "printdatatrim";
  static MG_ATTR_PSCRIPT_PRINT_NT: string = "pscriptprintnt";
  static MG_ATTR_THOUSAND_SEPARATOR: string = "thousandseparator";
  static MG_ATTR_RTF_BUFFER_SIZE: string = "rtfbuffersize";
  static MG_ATTR_SPECIAL_CONV_ADD_SLASH: string = "specialconvaddslash";
  static MG_ATTR_SPECIAL_FULL_EXPAND_PRINT: string = "specialfullexpandprint";
  static MG_ATTR_SPECIAL_FULL_TEXT: string = "specialfulltext";
  static MG_ATTR_SPECIAL_LAST_LINE_PRINT: string = "speciallastlineprint";
  static MG_ATTR_SPECIAL_PRINTER_OEM: string = "specialprinteroem";
  static MG_ATTR_RANGE_POP_TIME: string = "rangepoptime";
  static MG_ATTR_TEMP_POP_TIME: string = "temppoptime";
  static MG_ATTR_EMBED_FONTS: string = "embedfonts";
  static MG_ATTR_BATCH_PAINT_TIME: string = "batchpainttime";
  static MG_ATTR_ISAM_TRANSACTION: string = "isamtransaction";
  static MG_ATTR_CENTER_SCREEN_IN_ONLINE: string = "centerscreeninonline";
  static MG_ATTR_REPOSITION_AFTER_MODIFY: string = "repositionaftermodify";

  // for user event
  static MG_ATTR_OVERLAY: string = "overlayid";
  static MG_ATTR_TASKFLW: string = "taskflw";
  static MG_ATTR_DATAVIEW: string = "dataview";
  static MG_ATTR_RECOMP: string = "recomp";
  static MG_ATTR_FLWOP: string = "flwop";
  static MG_ATTR_START: string = "start";
  static MG_ATTR_END: string = "end";
  static MG_ATTR_INFO: string = "info";

  static MG_ATTR_KEY: string = "key";
  static MG_ATTR_KEY_EXP: string = "key_exp";
  static MG_ATTR_NULL_FLAGS: string = "nullFlags";
  static MG_ATTR_NEXTOPERIDX: string = "nextOperIdx";
  static MG_ATTR_DVPOS_VALUE: string = "dvPosValue";
  static MG_ATTR_DVPOS_DEC: string = "DvPosDec";
  static MG_ATTR_TRANS_ID: string = "transId";
  static MG_ATTR_REALREFRESH: string = "realRefresh";
  static MG_ATTR_SUB_FORM_RCMP: string = "sub_form_recomp";
  static MG_ATTR_HAS_LINK_RECOMPUTES: string = "has_link_recomputes";
  static MG_ATTR_LOCATE_FIRST_ID: string = "locateFirstRec";
  static MG_ATTR_OFFSET: string = "offset";
  static MG_ATTR_HAS_LOCATE: string = "hasLocate";
  static MG_ATTR_AS_PARENT: string = "AsParent";
  static MG_ATTR_TASK_UNIQUE_SORT: string = "TaskUniqueSort";
  static MG_ATTR_TRANS_OWNER: string = "newTransOwner";
  static MG_ATTR_CLOSE: string = "close";
  static MG_ATTR_TASK_COUNTER: string = "task_counter";
  static MG_ATTR_LOOP_COUNTER: string = "loop_counter";
  static MG_ATTR_CHACHED_FLD_ID: string = "cachedFldId";
  static MG_ATTR_LOCATE: string = "locate";
  static MG_ATTR_LINK: string = "link";
  static MG_ATTR_IS_LINK_FIELD: string = "isLinkFld";
  static MG_ATTR_CACHED_TABLE: string = "cached_table";
  static MG_ATTR_TABLE_INDEX: string = "tableIndex";
  static MG_ATTR_LINK_EVAL_CONDITION: string = "evalCondition";
  static MG_ATTR_LINK_MODE: string = "linkmode";
  static MG_ATTR_LINK_START: string = "linkBeginAfterField";
  static MG_ATTR_IDENT: string = "tid";
  static MG_ATTR_DIR: string = "dir";
  static MG_ATTR_COND: string = "cndExp";
  static MG_ATTR_COND_RES: string = "tskCndRes";
  static MG_ATTR_RET_VAL: string = "retVal";
  static MG_ATTR_DBPOS: string = "db_pos";
  static MG_TAG_USR_DEF_FUC_RET_EXP_ID: string = "returnexp";
  static MG_TAG_USR_DEF_FUC_RET_EXP_ATTR: string = "returnexpattr";
  static MG_TAG_PROPERTIES: string = "properties";
  static MG_TAG_PROPERTY: string = "property";
  static MG_ATTR_IS_VECTOR: string = "is_vector";
  static MG_ATTR_DIRECTION: string = "direction";
  static MG_ATTR_KEEP_USER_SORT: string = "keepUserSort";
  static MG_ATTR_SEARCH_STR: string = "searchStr";
  static MG_ATTR_RESET_SEARCH: string = "resetSearch";

  // for dbh
  static MG_TAG_DBHS: string = "DBHS";
  static MG_TAG_DBHS_END: string = "/DBHS";
  static MG_TAG_DBH_DATA_IDS_URL: string = "dbhDataIdsUrl";
  static MG_TAG_DBH_DATA_ID: string = "dbhDataId";
  static MG_TAG_DBH: string = "DBH";
  static MG_TAG_DBH_END: string = "/DBH";
  static MG_TAG_FLDS: string = "FLDS";
  static MG_TAG_FLDS_END: string = "/FLDS";
  static MG_TAG_FLD: string = "FLD";
  static MG_TAG_KEYS: string = "KEYS";
  static MG_TAG_KEYS_END: string = "/KEYS";
  static MG_TAG_KEY: string = "KEY";
  static MG_TAG_KEY_END: string = "/KEY";
  static MG_TAG_SEGS: string = "SEGS";
  static MG_TAG_SEGS_END: string = "/SEGS";
  static MG_TAG_SEG: string = "SEG";
  static MG_ATTR_ISN: string = "isn";
  static MG_ATTR_ATTR: string = "Attr";
  static MG_ATTR_ALLOW_NULL: string = "AllowNull";
  static MG_ATTR_DEFAULT_NULL: string = "DefaultNull";
  static MG_ATTR_STORAGE: string = "Storage";
  static MG_ATTR_DATASOURCE_DEFINITION: string = "DataSourceDefinition";
  static MG_ATTR_DIFF_UPDATE: string = "DiffUpdate";
  static MG_ATTR_DEC: string = "Dec";
  static MG_ATTR_WHOLE: string = "Whole";
  static MG_ATTR_PART_OF_DATETIME: string = "PartOfDateTime";
  static MG_ATTR_DEFAULT_STORAGE: string = "DefaultStorage";
  static MG_ATTR_CONTENT: string = "Content";
  static MG_ATTR_PICTURE: string = "Picture";
  static MG_ATTR_DB_DEFAULT_VALUE: string = "DbDefaultValue";
  static MG_ATTR_FLD_DB_INFO: string = "DbInfo";
  static MG_ATTR_DB_NAME: string = "DbName";
  static MG_ATTR_DB_TYPE: string = "DbType";
  static MG_ATTR_USER_TYPE: string = "UserType";
  static MG_ATTR_NULL_DISPLAY: string = "NullDisplay";
  static MG_ATTR_FIELD_NAME: string = "Name";
  static MG_ATTR_FLD_ISN: string = "fld_isn";
  static MG_TAG_KEY_SEGMENTS: string = "KeySegs";
  static MG_TAG_SEGMENT: string = "segment";
  static MG_ATTR_KEY_DB_NAME: string = "KeyDBName";
  static MG_ATTR_NAME: string = "name";
  static MG_ATTR_DBASE_NAME: string = "dbase_name";
  static MG_ATTR_POSITION_ISN: string = "position_isn";
  static MG_ATTR_ARRAY_SIZE: string = "array_size";
  static MG_ATTR_ROW_IDENTIFIER: string = "row_identifier";
  static MG_ATTR_CHECK_EXIST: string = "check_exist";
  static MG_ATTR_DEL_UPD_MODE: string = "del_upd_mode";
  static MG_ATTR_DBH_DATA_URL: string = "dbhDataURL";
  static MG_ATTR_FIELD_INDEX: string = "fieldindex";
  static MG_ATTR_MIN_VALUE: string = "min";
  static MG_ATTR_MAX_VALUE: string = "max";
  static MG_ATTR_NULL_MIN_VALUE: string = "null_min";
  static MG_ATTR_NULL_MAX_VALUE: string = "null_max";

  // for task table
  static MG_ATTR_TASK_TABLE_NAME_EXP: string = "tableNameExp";
  static MG_ATTR_TASK_TABLE_ACCESS: string = "access";
  static MG_ATTR_TASK_TABLE_IDENTIFIER: string = "dataSourceIdentifier";

  // for databases
  static MG_TAG_DATABASES_HEADER: string = "Databases";
  static MG_TAG_DATABASES_END: string = "/Databases";
  static MG_TAG_DATABASE_INFO: string = "database";
  static MG_TAG_DATABASE_URL: string = "databaseUrl";
  static MG_ATTR_DATABASE_NAME: string = "name";
  static MG_ATTR_DATABASE_LOCATION: string = "location";
  static MG_ATTR_DATABASE_TYPE: string = "dbtype";
  static MG_ATTR_DATABASE_USER_PASSWORD: string = "userPassword";

  static BYTES_IN_CHAR: number = 2;

  /// <summary> magic operation codes</summary>
  static MG_OPER_VERIFY: number = 2;
  static MG_OPER_BLOCK: number = 5;
  static MG_OPER_LOOP: number = 97;
  static MG_OPER_ELSE: number = 98;
  static MG_OPER_ENDBLOCK: number = 6;
  static MG_OPER_CALL: number = 7;
  static MG_OPER_EVALUATE: number = 8;
  static MG_OPER_UPDATE: number = 9;
  static MG_OPER_USR_EXIT: number = 13;
  static MG_OPER_RAISE_EVENT: number = 14;
  static MG_OPER_SERVER: number = 99;

  static TRANS_BEGIN: string = 'B';
  static TRANS_COMMIT: string = 'C';
  static TRANS_ABORT: string = 'A';

  /// <summary> frame style</summary>
  static FRAME_SET_STYLE_HOR: string = 'H';
  static FRAME_SET_STYLE_VER: string = 'V';

  /// <summary> event types</summary>
  static EVENT_TYPE_SYSTEM: string = 'S';
  static EVENT_TYPE_INTERNAL: string = 'I';
  static EVENT_TYPE_TIMER: string = 'T';
  static EVENT_TYPE_EXPRESSION: string = 'E';
  static EVENT_TYPE_USER: string = 'U';
  static EVENT_TYPE_PUBLIC: string = 'P';
  static EVENT_TYPE_NONE: string = 'N';
  static EVENT_TYPE_NOTINITED: string = 'X'; // internal
  static EVENT_TYPE_MENU_PROGRAM: string = 'M';
  static EVENT_TYPE_MENU_OS: string = 'O';

  // temporary type
  static EVENT_TYPE_USER_FUNC: string = 'F';

  /// <summary> break levels - used for display purposes</summary>
  static BRK_LEVEL_TASK_PREFIX: string = "TP";
  static BRK_LEVEL_TASK_SUFFIX: string = "TS";
  static BRK_LEVEL_REC_PREFIX: string = "RP";
  static BRK_LEVEL_REC_MAIN: string = "RM";
  static BRK_LEVEL_REC_SUFFIX: string = "RS";
  static BRK_LEVEL_CTRL_PREFIX: string = "CP";
  static BRK_LEVEL_CTRL_SUFFIX: string = "CS";
  static BRK_LEVEL_CTRL_VERIFICATION: string = "CV";
  static BRK_LEVEL_HANDLER_INTERNAL: string = "HI";
  static BRK_LEVEL_HANDLER_SYSTEM: string = "HS";
  static BRK_LEVEL_HANDLER_TIMER: string = "HT";
  static BRK_LEVEL_HANDLER_EXPRESSION: string = "HE";
  static BRK_LEVEL_HANDLER_ERROR: string = "HR";
  static BRK_LEVEL_HANDLER_USER: string = "HU";
  static BRK_LEVEL_HANDLER_DOTNET: string = "HD";
  static BRK_LEVEL_USER_FUNCTION: string = "UF";
  static BRK_LEVEL_VARIABLE: string = "VC";
  static BRK_LEVEL_MAIN_PROG: string = "MP";
  static BRK_LEVEL_SUBFORM: string = "SUBFORM";
  static BRK_LEVEL_FRAME: string = "FRAME";

  /// <summary> break levels - used for flow monitor purposes</summary>
  static BRK_LEVEL_TASK_PREFIX_FM: string = "Task Prefix ";
  static BRK_LEVEL_TASK_SUFFIX_FM: string = "Task Suffix ";
  static BRK_LEVEL_REC_PREFIX_FM: string = "Record Prefix ";
  static BRK_LEVEL_REC_SUFFIX_FM: string = "Record Suffix ";
  static BRK_LEVEL_CTRL_PREFIX_FM: string = "Control Prefix ";
  static BRK_LEVEL_CTRL_SUFFIX_FM: string = "Control Suffix ";
  static BRK_LEVEL_VARIABLE_FM: string = "Variable Change ";
  static BRK_LEVEL_CTRL_VERIFICATION_FM: string = "Control Verification ";
  static BRK_LEVEL_HANDLER_INTERNAL_FM: string = "Internal: ";
  static BRK_LEVEL_HANDLER_SYSTEM_FM: string = "System: ";
  static BRK_LEVEL_HANDLER_TIMER_FM: string = "Timer:";
  static BRK_LEVEL_HANDLER_EXPRESSION_FM: string = "Expression: ";
  static BRK_LEVEL_HANDLER_ERROR_FM: string = "Handler Error ";
  static BRK_LEVEL_HANDLER_USER_FM: string = "User";
  static BRK_LEVEL_HANDLER_DOTNET_FM: string = "Dotnet: ";
  static BRK_LEVEL_USER_FUNCTION_FM: string = "User Defined Function";
  static HANDLER_LEVEL_VARIABLE: string = "V";

  /// <summary> transactions</summary>
  static TRANS_NONE: string = 'O';
  static TRANS_RECORD_PREFIX: string = 'P';
  static TRANS_TASK_PREFIX: string = 'T';
  static TRANS_IGNORE: string = 'I';
  static TRANS_FORCE_OPEN: string = 'F';

  // recovery type (accepted from the server)
  static RECOVERY_NONE: string = '\0';
  static RECOVERY_ROLLBACK: string = 'R';
  static RECOVERY_RETRY: string = 'T';

  /// <summary> Verify Operation Constants</summary>
  static FLW_VERIFY_MODE_ERROR: string = 'E';
  static FLW_VERIFY_MODE_WARNING: string = 'W';
  static FLW_VERIFY_MODE_REVERT: string = 'R';
  static IMAGE_EXCLAMATION: string = 'E';
  static IMAGE_CRITICAL: string = 'C';
  static IMAGE_QUESTION: string = 'Q';
  static IMAGE_INFORMATION: string = 'I';
  static IMAGE_NONE: string = 'N';
  static BUTTONS_OK: string = 'O';
  static BUTTONS_OK_CANCEL: string = 'K';
  static BUTTONS_ABORT_RETRY_IGNORE: string = 'A';
  static BUTTONS_YES_NO_CANCEL: string = 'Y';
  static BUTTONS_YES_NO: string = 'N';
  static BUTTONS_RETRY_CANCEL: string = 'R';
  static DISPLAY_BOX: string = 'B';
  static DISPLAY_STATUS: string = 'S';

  /// <summary> END TASK EVALUATION</summary>
  static END_COND_EVAL_BEFORE: string = "B";
  static END_COND_EVAL_AFTER: string = "A";
  static END_COND_EVAL_IMMIDIATE: string = "I";

  /// <summary> GUI MANAGER OPEN WINDOW PROCESS STATUSES</summary>
  static OPENWIN_STATE_NONE: string = 'N';
  static OPENWIN_STATE_INPROCESS: string = 'I';
  static OPENWIN_STATE_OVER: string = 'O';

  /// <summary> argument constants</summary>
  static ARG_TYPE_FIELD: string = 'F';
  static ARG_TYPE_EXP: string = 'E';
  static ARG_TYPE_VALUE: string = 'V';
  static ARG_TYPE_SKIP: string = 'X';

  /// <summary> general use consts</summary>
  static TOP_LEVEL_CONTAINER: number = 0;

  // eye catcher for Marshaling arguments passed on a hyper link
  static MG_HYPER_ARGS: string = "MG_HYPER_ARGS";

  /// <summary> Requester parameters tags</summary>
  static REQ_ARG_ALPHA: string = "-A";
  static REQ_ARG_UNICODE: string = "-C";
  static REQ_ARG_NUMERIC: string = "-N";
  static REQ_ARG_DOUBLE: string = "-D";
  static REQ_ARG_LOGICAL: string = "-L";
  static REQ_ARG_NULL: string = "-U";
  static REQ_ARG_SEPARATOR: string = "&";
  static REQ_ARG_START: string = "?";
  static REQ_ARG_COMMA: string = ",";
  static REQ_APP_NAME: string = "appname";
  static REQ_PRG_NAME: string = "prgname";
  static REQ_PRG_DESCRIPTION: string = "prgdescription";
  static REQ_ARGS: string = "arguments";

  // if true, the RC accepting this property should not display an authentication dialog,
  // even if required according to other conditions (InputPassword/SystemLogin),
  // and perform a silent authentication using the USERNAME & PASSWORD execution properties.
  static REQ_SKIP_AUTHENTICATION: string = "SkipAuthentication";
  static RC_INDICATION_INITIAL: string = "WEBCLIENT=INITIAL&"; // first request of the handshake
  static RC_INDICATION_SCRAMBLED: string = "SCRAMBLED&";
  static RC_INDICATION: string = "WEBCLIENT=Y&";
  static UTF8TRANS: string = "UTF8TRANS=Y&";
  static DEBUG_CLIENT_NETWORK_RECOVERY: string = "&DEBUGCLIENTNETWORKRECOVERY=Y";
  static RC_TOKEN_CTX_ID: string = "CTX=";
  static RC_TOKEN_CTX_GROUP: string = "CTXGROUP=";
  static RC_TOKEN_SESSION_COUNT: string = "SESSION=";
  static RC_TOKEN_DATA: string = "DATA=";
  static RC_TOKEN_TARGET_FILE: string = "TARGETFILE=";  // path of the file on the server after uploading
  static CACHED_ASSEMBLY_EXTENSION: string = ".dll";
  static OFFLINE_RC_INITIAL_REQUEST: string = "OFFLINERCINITIALREQUEST=Y";
  static RC_AUTHENTICATION_REQUEST: string = "RCAUTHENTICATIONREQUEST=Y";
  static V24_RIA_ERROR_PREFIX: string = "<RIA_ERROR_RESPONSE>";

  // session count -1 serves as an indication from the client to close the context.
  static SESSION_COUNTER_CLOSE_CTX_INDICATION: number = -1;

  // execution properties
  static SERVER: string = "server";
  static REQUESTER: string = "requester";
  static LOCALID: string = "localid";
  static DEBUGCLIENT: string = "debugclient";
  static ENVVARS: string = "envvars";
  static INTERNAL_LOG_LEVEL: string = "InternalLogLevel";
  static INTERNAL_LOG_SYNC: string = "InternalLogSync";
  static LOG_CLIENTSEQUENCE_FOR_ACTIVITY_MONITOR: string = "LogClientSequenceForActivityMonitor";
  static CTX_GROUP: string = "CtxGroup";
  static PARALLEL_EXECUTION: string = "ParallelExecution"; // Current process spawned for parallel execution
  static DISPLAY_GENERIC_ERROR: string = "DisplayGenericError";
  static FIRST_HTTP_REQUEST_TIMEOUT: string = "FirstHTTPRequestTimeout";

  // execution properties for customizing change password screen (not documented)
  static MG_TAG_CHNG_PASS_CAPTION: string = "LogonChangePasswordCaption";
  static MG_TAG_CHNG_PASS_WIN_TITLE: string = "ChangePasswordWindowTitle";
  static MG_TAG_CHNG_PASS_OLD_PASS_CAPTION: string = "ChangePasswordOldPasswordCaption";
  static MG_TAG_CHNG_PASS_NEW_PASS_CAPTION: string = "ChangePasswordNewPasswordCaption";
  static MG_TAG_CHNG_PASS_CONFIRM_PASS_CAPTION: string = "ChangePasswordConfirmPasswordCaption";
  static MG_TAG_CHNG_PASS_MISMATCH_MSG: string = "ChangePasswordMismatchMessage";

  /// <summary>ClickOnce</summary>
  static DEPLOYMENT_MANIFEST: string = "APPLICATION";
  static PUBLISH_HTML: string = "publish.html";
  static PROPS_START_TAG: string = "<properties>";
  static PROPS_END_TAG: string = "</properties>";

  /// <summary>Authentication dialog</summary>
  static APPL_LOGON_SUB_CAPTION: string = "Logon Parameters";

  /// <summary>Authentication Process</summary>
  static DEFAULT_ERROR_LOGON_FAILED: string = "Error during authentication process";
  static DEFAULT_ERROR_WRONG_PASSWORD: string = "Incorrect password";
  static ERROR_STRING: string = "Error";
  static INFORMATION_STRING: string = "Information";

  /// <summary>Password change process</summary>
  static DEFAULT_MSG_PASSWORD_CHANGE: string = "Password was changed successfully";
  static PASSWORD_MISMATCH: string = "New password and confirm password not same";

  // setData() keys: all keys moved to TagData class
  //          keys for table\tree
  static ROW_CONTROLS_KEY: string = "ROW_CONTROLS_KEY";
  static ROW_INVALIDATED_KEY: string = "ROW_INVALIDATED_KEY";
  static IS_EDITOR_KEY: string = "IS_EDITOR_KEY";
  static TMP_EDITOR: string = "TMP_EDITOR";

  //          keys saved control
  static LAST_FOCUSED_WIDGET: string = "LAST_FOCUSED_WIDGET";
  static LAST_CURSOR: string = "LAST_CURSOR";

  // need to be check if we need those keys
  static KEYDOWN_IGNORE_KEY: string = "KEYDOWN_IGNORE_key"; // need to be check if needed
  static STATUS_BAR_WIDGET_KEY: string = "STATUS_BAR_WIDGET_KEY";
  static MGBROWSER_KEY: string = "MGBROWSER_Key";
  static POPUP_WAS_OPENED: string = "COMBO_BOX_WAS_OPENED";
  static POPUP_WAS_CLOSED_COUNT: string = "COMBO_BOX_WAS_CLOSED_COUNT";
  static IGNORE_SELECTION_KEY: string = "IGNORE_SELECTION_KEY";

  // MainHeaders
  static CP_ISO_8859_ANSI: string = "8859_1";
  static CP_UNICODE: string = "UTF-16LE";
  // order, during regular rcmp.
  // private Shell shell = null; // the window created by this form

  static INCREMENTAL_LOCATE_TIMEOUT: number = 500;

  static USER_RANGES: string = "ranges";
  static USER_LOCATES: string = "locates";
  static SORT: string = "srt";
  static MIN_RNG: string = "min";
  static MAX_RNG: string = "max";
  static NULL_MIN_RNG: string = "isNullMin";
  static NULL_MAX_RNG: string = "isNullMax";
  static CLEAR_RANGE: string = "rangeReset";
  static CLEAR_LOCATES: string = "locateReset";
  static CLEAR_SORTS: string = "sortReset";
  static USER_RNG: string = "rng";

  static TASK_MODE_QUERY_STR: string = "Query";
  static TASK_MODE_MODIFY_STR: string = "Modify";
  static TASK_MODE_CREATE_STR: string = "Create";
  static TASK_MODE_DELETE_STR: string = "Delete";

  static MG_ZOOM: string = "ZOOM";
  static MG_NORMAL: string = "NORMAL";
  static MG_INSERT: string = "INS";
  static MG_OVERWRITE: string = "OVR";

  // environment mirroring
  static MG_TAG_ENV_CHANGES: string = "changes";
  static MG_ATTR_ENV_VALUE: string = "value";
  static MG_ATTR_ENV_WRITEINI: string = "writeToINI";
  static MG_ATTR_ENV_RESERVED: string = "reserved";

  // .INI environment sections
  static MG_ATTR_ENV_REMOVED: string = "removed";
  static INI_SECTION_MAGIC_ENV_BRACKETS: string = "[MAGIC_ENV]";
  static INI_SECTION_LOGICAL_NAMES_BRACKETS: string = "[MAGIC_LOGICAL_NAMES]";
  static INI_SECTION_MAGIC_ENV: string = "MAGIC_ENV";
  static INI_SECTION_MAGIC_SYSTEMS: string = "MAGIC_SYSTEMS";
  static INI_SECTION_MAGIC_DBMS: string = "MAGIC_DBMS";
  static INI_SECTION_MAGIC_SERVERS: string = "MAGIC_SERVERS";
  static INI_SECTION_MAGIC_COMMS: string = "MAGIC_COMMS";
  static INI_SECTION_MAGIC_PRINTERS: string = "MAGIC_PRINTERS";
  static INI_SECTION_MAGIC_SYSTEM_MENU: string = "MAGIC_SYSTEM_MENU";
  static INI_SECTION_MAGIC_DATABASES: string = "MAGIC_DATABASES";
  static INI_SECTION_MAGIC_LANGUAGE: string = "MAGIC_LANGUAGE";
  static INI_SECTION_MAGIC_SERVICES: string = "MAGIC_SERVICES";
  static INI_SECTION_TOOLS_MENU: string = "TOOLS_MENU";

  static MENU_PROGRAM_FLOW_ONLINE: string = 'O';
  static MENU_PROGRAM_FLOW_BATCH: string = 'B';
  static MENU_PROGRAM_FLOW_BROWSER: string = 'R';
  static MENU_PROGRAM_FLOW_RC: string = 'C';

  // RC specific pane constants.
  static SB_IMG_PANE_LAYER: number = 1;
  // Width of the pane (in pixels) shown in status bar.
  static SB_IMG_PANE_WIDTH: number = 33;

  static GUI_COMMAND_EXEC_WAIT_TIME: number = 100;
  static STARTUP_IMAGE_FILENAME: string = "Resources\\startup.png";
  static V2L_DLL: string = "v2l32.dll";
  static SQLITE_DLL_NAME: string = "MgRIASqliteGateway.dll";

  static INITIAL_OFFLINE_TASK_TAG: number = 1000000000;
  static ENABLE_COMMUNICATION_DIALOGS: string = "EnableCommunicationDialogs";

  static MG_ATTR_VAL_ABORT: string = "abort";
  static MG_ATTR_VAL_ENHANCED_VERIFY: string = "enhancedverify";

  static MG_ATTR_VAL_OPENURL: string = "openurl";
  static MG_ATTR_VAL_RESULT: string = "result";
  static MG_ATTR_VAL_VERIFY: string = "verify";
  static MG_ATTR_VAL_ADD_RANGE: string = "addrange";
  static MG_ATTR_VAL_ADD_LOCATE: string = "addlocate";
  static MG_ATTR_VAL_ADD_SORT: string = "addsort";
  static MG_ATTR_VAL_RESET_RANGE: string = "resetrange";
  static MG_ATTR_VAL_RESET_LOCATE: string = "resetlocate";
  static MG_ATTR_VAL_RESET_SORT: string = "resetsort";
  static MG_ATTR_VAL_CLIENT_REFRESH: string = "clientrefresh";
  static MG_ATTR_VAL_EVAL: string = "evaluate";
  static MG_ATTR_VAL_EVENT: string = "event";
  static MG_ATTR_VAL_EXEC_OPER: string = "execoper";
  static MG_ATTR_VAL_EXPAND: string = "expand";
  static MG_ATTR_VAL_MENU: string = "execmenu";
  static MG_ATTR_VAL_QUERY: string = "query";
  static MG_ATTR_VAL_QUERY_GLOBAL_PARAMS: string = "globalparams";
  static MG_ATTR_VAL_QUERY_TYPE: string = "query_type";
  static MG_ATTR_VAL_RECOMP: string = "recompute";
  static MG_ATTR_VAL_TRANS: string = "trans";
  static MG_ATTR_VAL_UNLOAD: string = "unload";
  static MG_ATTR_VAL_INIPUT_FORCE_WRITE: string = "iniputForceWrite";
  static MG_ATTR_VAL_INIPUT_PARAM: string = "iniputParam";
  static MG_ATTR_ERROR_MESSAGE: string = "errorMessage";
  static MG_ATTR_VAL_TOTAL_RECORDS_COUNT: string = "totalRecordsCount";
  static MG_ATTR_VAL_RECORDS_BEFORE_CURRENT_VIEW: string = "recordsBeforeCurrentView";

}
