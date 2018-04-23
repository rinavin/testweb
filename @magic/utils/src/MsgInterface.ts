export class DefaultMsgDetails {
  MsgID: string = null;
  MsgString: string = null;

  constructor(ID: string, MsgStr: string) {
    this.MsgID = ID;
    this.MsgString = MsgStr;
  }
}

export class MsgInterface {
  static readonly STR_ERR_NUM: string = "STR_ERR_NUM";
  static readonly STR_ERR_DATE: string = "STR_ERR_DATE";
  static readonly STR_ERR_TIME: string = "STR_ERR_TIME";
  static readonly MONTHS_PTR: string = "MONTHS_PTR";
  static readonly DAYS_PTR: string = "DAYS_PTR";
  static readonly STR_ERR_NEGETIVE: string = "STR_ERR_NEGETIVE";
  static readonly STR_RNG_TXT: string = "STR_RNG_TXT";
  static readonly EDT_ERR_STR_1: string = "EDT_ERR_STR_1";
  static readonly STR_ERR_PIPE_CONNECTION: string = "STR_ERR_PIPE_CONNECTION";
  static readonly FMERROR_STR_BAD_NAME: string = "FMERROR_STR_BAD_NAME";
  static readonly FMERROR_STR_BAD_DAMAGED: string = "FMERROR_STR_BAD_DAMAGED";
  static readonly FMERROR_STR_BAD_BADCREATE: string = "FMERROR_STR_BAD_BADCREATE";
  static readonly FMERROR_STR_FILE_LOCKED: string = "FMERROR_STR_FILE_LOCKED";
  static readonly FMERROR_STR_BAD_UNEXPECTED: string = "FMERROR_STR_BAD_UNEXPECTED";
  static readonly FMERROR_STR_BAD_SERVER_NOTFOUND: string = "FMERROR_STR_BAD_SERVER_NOTFOUND";
  static readonly FMERROR_STR_BAD_SERVER_INIT_FAILED: string = "FMERROR_STR_BAD_SERVER_INIT_FAILED";
  static readonly FMERROR_STR_UNLOCKED: string = "FMERROR_STR_UNLOCKED";
  static readonly FMERROR_STR_BAD_DB_INIT_FAILED: string = "FMERROR_STR_BAD_DB_INIT_FAILED";
  static readonly FMERROR_STR_BAD_LOCK_OPEN: string = "FMERROR_STR_BAD_LOCK_OPEN";
  static readonly FMERROR_STR_BAD_BADOPEN: string = "FMERROR_STR_BAD_BADOPEN";
  static readonly FMERROR_STR_BAD_BADDEF: string = "FMERROR_STR_BAD_BADDEF";
  static readonly FMERROR_STR_DUP_KEY: string = "FMERROR_STR_DUP_KEY";
  static readonly FMERROR_STR_COMM_LOADED: string = "FMERROR_STR_COMM_LOADED";
  static readonly FMERROR_STR_COMM_CONNECT: string = "FMERROR_STR_COMM_CONNECT";
  static readonly FMERROR_STR_READONLY: string = "FMERROR_STR_READONLY";
  static readonly FMERROR_STR_BAD_BADCLOSE: string = "FMERROR_STR_BAD_BADCLOSE";
  static readonly FMERROR_STR_REC_LOCKED: string = "FMERROR_STR_REC_LOCKED";
  static readonly FMERROR_STR_TRANS_OPEN: string = "FMERROR_STR_TRANS_OPEN";
  static readonly FMERROR_STR_COMMIT: string = "FMERROR_STR_COMMIT";
  static readonly FMERROR_STR_ABORT: string = "FMERROR_STR_ABORT";
  static readonly FMERROR_STR_RSRC_LOCKED: string = "FMERROR_STR_RSRC_LOCKED";
  static readonly FMERROR_STR_NODEF: string = "FMERROR_STR_NODEF";
  static readonly FMERROR_STR_DEADLOCK: string = "FMERROR_STR_DEADLOCK";
  static readonly FMERROR_STR_DB_PROT: string = "FMERROR_STR_DB_PROT";
  static readonly FMERROR_STR_OWNR_ALRDY_SET: string = "FMERROR_STR_OWNR_ALRDY_SET";
  static readonly FMERROR_STR_INVALID_OWNR: string = "FMERROR_STR_INVALID_OWNR";
  static readonly FMERROR_STR_CLR_OWNR_FAIL: string = "FMERROR_STR_CLR_OWNR_FAIL";
  static readonly FMERROR_STR_NO_DATABASE: string = "FMERROR_STR_NO_DATABASE";
  static readonly FMERROR_STR_DBMS_ALTER_FAIL: string = "FMERROR_STR_DBMS_ALTER_FAIL";
  static readonly FMERROR_STR_TRANS_LOCK: string = "FMERROR_STR_TRANS_LOCK";
  static readonly FMERROR_STR_EXTUSE_MULU_CNFLCT: string = "FMERROR_STR_EXTUSE_MULU_CNFLCT";
  static readonly FMERROR_STR_DB_GW_VERSION_CNFLCT: string = "FMERROR_STR_DB_GW_VERSION_CNFLCT";
  static readonly FMERROR_STR_DB_CANOT_REMOVE: string = "FMERROR_STR_DB_CANOT_REMOVE";
  static readonly FMERROR_STR_DB_CANOT_RENAME: string = "FMERROR_STR_DB_CANOT_RENAME";
  static readonly FMERROR_STR_DB_BAD_SQL_CMD: string = "FMERROR_STR_DB_BAD_SQL_CMD";
  static readonly FMERROR_STR_REC_LOCKED_NOBUF: string = "FMERROR_STR_REC_LOCKED_NOBUF";
  static readonly FMERROR_STR_REOPEN: string = "FMERROR_STR_REOPEN";
  static readonly FMERROR_STR_REC_LOCKED_NOW: string = "FMERROR_STR_REC_LOCKED_NOW";
  static readonly FMERROR_STR_DBMS_SORT_FAIL: string = "FMERROR_STR_DBMS_SORT_FAIL";
  static readonly FMERROR_STR_NO_OLD_DATABASE_DBMS: string = "FMERROR_STR_NO_OLD_DATABASE_DBMS";
  static readonly FMERROR_STR_BAD_LOGIN: string = "FMERROR_STR_BAD_LOGIN";
  static readonly FMERROR_STR_ERR_EXEC_SQL: string = "FMERROR_STR_ERR_EXEC_SQL";
  static readonly FMERROR_STR_ERR_UPDATE_FAIL: string = "FMERROR_STR_ERR_UPDATE_FAIL";
  static readonly FMERROR_STR_ERR_INSERT_FAIL: string = "FMERROR_STR_ERR_INSERT_FAIL";
  static readonly FMERROR_STR_ERR_DELETE_FAIL: string = "FMERROR_STR_ERR_DELETE_FAIL";
  static readonly FMERROR_STR_PRINTER: string = "FMERROR_STR_PRINTER";
  static readonly FMERROR_STR_FIL_NOT_EXIST: string = "FMERROR_STR_FIL_NOT_EXIST";
  static readonly FMERROR_STR_COMM_GWY_COMPTABILITY: string = "FMERROR_STR_COMM_GWY_COMPTABILITY";
  static readonly FMERROR_STR_CACHE_TOO_BIG: string = "FMERROR_STR_CACHE_TOO_BIG";
  static readonly FMERROR_STR_NO_ROWS_AFFECTED: string = "FMERROR_STR_NO_ROWS_AFFECTED";
  static readonly FMERROR_STR_TARGET_FILE_EXIST: string = "FMERROR_STR_TARGET_FILE_EXIST";
  static readonly FMERROR_STR_FILE_IS_VIEW: string = "FMERROR_STR_FILE_IS_VIEW";
  static readonly FMERROR_STR_DB_CANOT_COPY: string = "FMERROR_STR_DB_CANOT_COPY";
  static readonly FMERROR_STR_HLP_NOT_EXIST: string = "FMERROR_STR_HLP_NOT_EXIST";
  static readonly FMERROR_STR_UNUSABLE_FILE: string = "FMERROR_STR_UNUSABLE_FILE";
  static readonly FMERROR_STR_DB_BAD_QUERY: string = "FMERROR_STR_DB_BAD_QUERY";
  static readonly FMERROR_STR_NO_HDLS: string = "FMERROR_STR_NO_HDLS";
  static readonly FMERROR_STR_MAX_CONNS_REACHED: string = "FMERROR_STR_MAX_CONNS_REACHED";
  static readonly FMERROR_STR_CONSTRAINT_FAIL: string = "FMERROR_STR_CONSTRAINT_FAIL";
  static readonly FMERROR_STR_TRIGGER_FAIL: string = "FMERROR_STR_TRIGGER_FAIL";
  static readonly FMERROR_STR_MODIFY_WITHIN_TRANS: string = "FMERROR_STR_MODIFY_WITHIN_TRANS";
  static readonly EXPTAB_TSK_MODE_RT: string = "EXPTAB_TSK_MODE_RT";
  static readonly EXPTAB_ERR_CALL_MAIN_PRG_1: string = "EXPTAB_ERR_CALL_MAIN_PRG_1";
  static readonly LOCATE_STR_ERR_EOF: string = "LOCATE_STR_ERR_EOF";
  static readonly RT_STR_REC_NOTFOUND: string = "RT_STR_REC_NOTFOUND";
  static readonly RT_STR_PRG_NOTFOUND: string = "RT_STR_PRG_NOTFOUND";
  static readonly RT_STR_NO_RECS_IN_RNG: string = "RT_STR_NO_RECS_IN_RNG";
  static readonly RT_STR_FLD_MUST_UPDATED: string = "RT_STR_FLD_MUST_UPDATED";
  static readonly RT_STR_TSK_NO_SCREEN: string = "RT_STR_TSK_NO_SCREEN";
  static readonly RT_STR_CRSR_CANT_PARK: string = "RT_STR_CRSR_CANT_PARK";
  static readonly RT_STR_MODE_NOTALLOWED: string = "RT_STR_MODE_NOTALLOWED";
  static readonly RT_STR_NON_MODIFIABLE: string = "RT_STR_NON_MODIFIABLE";
  static readonly RT_STR_UPDATE_IN_QUERY: string = "RT_STR_UPDATE_IN_QUERY";
  static readonly RT_STR_LOAD_RES_FAIL: string = "RT_STR_LOAD_RES_FAIL";
  static readonly RT_STR_NO_CREATE_ON_TREE: string = "RT_STR_NO_CREATE_ON_TREE";
  static readonly TSKR_ERR_NOTEXIST_COMP: string = "TSKR_ERR_NOTEXIST_COMP";
  static readonly TSK_ERR_BCSUBFORM_WRONG_EXP: string = "TSK_ERR_BCSUBFORM_WRONG_EXP";
  static readonly TSK_ERR_NESTED_BCSUBFORM: string = "TSK_ERR_NESTED_BCSUBFORM";
  static readonly TSK_ERR_CHANGE_CACHED_NESTED_BCSUBFORM: string = "TSK_ERR_CHANGE_CACHED_NESTED_BCSUBFORM";
  static readonly TSK_ERR_SUBFORM_DSQL: string = "TSK_ERR_SUBFORM_DSQL";
  static readonly TSK_ERR_DSQL_SELECT_ONLY: string = "TSK_ERR_DSQL_SELECT_ONLY";
  static readonly CSTIO_STR_ERR2: string = "CSTIO_STR_ERR2";
  static readonly CONFIRM_STR_DELETE: string = "CONFIRM_STR_DELETE";
  static readonly CONFIRM_STR_CANCEL: string = "CONFIRM_STR_CANCEL";
  static readonly CONFIRM_STR_WINDOW_TITLE: string = "CONFIRM_STR_WINDOW_TITLE";
  static readonly WARNING_STR_WINDOW_TITLE: string = "WARNING_STR_WINDOW_TITLE";
  static readonly BRKTAB_STR_ERROR: string = "BRKTAB_STR_ERROR";
  static readonly USRINP_STR_BADPASSW: string = "USRINP_STR_BADPASSW";
  static readonly USRINP_STR_BADPASSW_WEBSERVER: string = "USRINP_STR_BADPASSW_WEBSERVER";
  static readonly USRINP_STR_BADPASSW_PROXYSERVER: string = "USRINP_STR_BADPASSW_PROXYSERVER";
  static readonly CRF_STR_CONF_UPD: string = "CRF_STR_CONF_UPD";
  static readonly MENU_STR_ERROR_ENABLE: string = "MENU_STR_ERROR_ENABLE";
  static readonly GUI_OK_BUTTON: string = "GUI_OK_BUTTON";
  static readonly GUI_CANCEL_BUTTON: string = "GUI_CANCEL_BUTTON";
  static readonly BRKTAB_STOP_MODE_TITLE: string = "BRKTAB_STOP_MODE_TITLE";
  static readonly BRKTAB_STR_ERR_FORM: string = "BRKTAB_STR_ERR_FORM";
  static readonly BROWSER_OPT_INFO_SERVER_STR: string = "BROWSER_OPT_INFO_SERVER_STR";
  static readonly STR_ERR_PIC_J: string = "STR_ERR_PIC_J";
  static readonly STR_ERR_PIC_S: string = "STR_ERR_PIC_S";
  static readonly STR_ERR_PIC_T: string = "STR_ERR_PIC_T";
  static readonly TASKRULE_STR_APPLICATION: string = "TASKRULE_STR_APPLICATION";
  static readonly DITDEF_STR_ERR_WINDOW_TYPE: string = "DITDEF_STR_ERR_WINDOW_TYPE";
  static readonly DITDEF_STR_ERR_SUBFORM_PROG_PARALLEL: string = "DITDEF_STR_ERR_SUBFORM_PROG_PARALLEL";
  static readonly DATEHEB_MONTH_STR: string = "DATEHEB_MONTH_STR";
  static readonly DATEHEB_DOW_STR: string = "DATEHEB_DOW_STR";
  static readonly CHK_ERR_CALL_FROM_RICH_CLIENT: string = "CHK_ERR_CALL_FROM_RICH_CLIENT";
  static readonly RC_STR_F7_UNEXPECTED_ERR: string = "RC_STR_F7_UNEXPECTED_ERR";
  static readonly STR_ERR_MAX_VAR_SIZE: string = "STR_ERR_MAX_VAR_SIZE";
  static readonly STR_RC_RECENT_ACTIVITY_TOOLTIP_HDR: string = "STR_RC_RECENT_ACTIVITY_TOOLTIP_HDR";
  static readonly STR_RC_RECENT_ACTIVITY_TIME_LBL: string = "STR_RC_RECENT_ACTIVITY_TIME_LBL";
  static readonly STR_RC_RECENT_ACTIVITY_DATA_UNIT: string = "STR_RC_RECENT_ACTIVITY_DATA_UNIT";
  static readonly STR_RC_RECENT_ACTIVITY_TIME_UNIT: string = "STR_RC_RECENT_ACTIVITY_TIME_UNIT";
  static readonly STR_PAGE_LOADING_IN_PROGRESS: string = "STR_PAGE_LOADING_IN_PROGRESS";
  static readonly STR_CANNOT_PARK: string = "STR_CANNOT_PARK";
  static readonly STR_RESTART_SESSION: string = "STR_RESTART_SESSION";
  static readonly STR_ERR_INACCESSIBLE_URL: string = "STR_ERR_INACCESSIBLE_URL";
  static readonly STR_ERR_SESSION_CLOSED: string = "STR_ERR_SESSION_CLOSED";
  static readonly STR_ERR_SESSION_CLOSED_INACTIVITY: string = "STR_ERR_SESSION_CLOSED_INACTIVITY";
  static readonly STR_MINUTES: string = "STR_MINUTES";
  static readonly STR_HOURS: string = "STR_HOURS";
  static readonly STR_ERR_AUTHORIZATION_FAILURE: string = "STR_ERR_AUTHORIZATION_FAILURE";
  static readonly STR_WARN_UNLOAD_TIMEOUT: string = "STR_WARN_UNLOAD_TIMEOUT";
  static readonly STR_WARN_PARALLEL_NOT_SUPPORTED: string = "STR_WARN_PARALLEL_NOT_SUPPORTED";
  static readonly DN_ERR_MDI_FRAME_ISNOT_OPENED: string = "DN_ERR_MDI_FRAME_ISNOT_OPENED";
  static readonly ERR_CANNOT_HANDLE_RC_REQUEST: string = "ERR_CANNOT_HANDLE_RC_REQUEST";
  static readonly STR_MDI_FRAME_MISMATCH: string = "STR_MDI_FRAME_MISMATCH";
  static readonly CHK_ERR_OFFLINE_NOT_SUPPORT_FRAME_INTERFACE: string = "CHK_ERR_OFFLINE_NOT_SUPPORT_FRAME_INTERFACE";
  static readonly STR_USER_ID: string = "STR_USER_ID";
  static readonly STR_PASSWORD: string = "STR_PASSWORD";
  static readonly STR_LOGON_PARAMETERS: string = "STR_LOGON_PARAMETERS";
  static readonly STR_LOGON_CAPTION: string = "STR_LOGON_CAPTION";
  static readonly STR_LOGON_INSTRUCTION: string = "STR_LOGON_INSTRUCTION";
  static readonly STR_GENERIC_ERROR_MESSAGE: string = "STR_GENERIC_ERROR_MESSAGE";
  static readonly STR_GENERIC_ERROR_CONNECTION_PROBLEM_TITLE: string = "STR_GENERIC_ERROR_CONNECTION_PROBLEM_TITLE";
  static readonly STR_GENERIC_ERROR_CONNECTION_PROBLEM_MESSAGE: string = "STR_GENERIC_ERROR_CONNECTION_PROBLEM_MESSAGE";
  static readonly FMERROR_STR_TRANS_OPEN_FAILED: string = "FMERROR_STR_TRANS_OPEN_FAILED";
  static readonly STR_ERR_CANNOT_CALL_OFFLINE_BYNAME_OR_BYEXP: string = "STR_ERR_CANNOT_CALL_OFFLINE_BYNAME_OR_BYEXP";
  static readonly RT_STR_DELETE_MODE_WITHOUT_MAINSOURCE_NOTALLOWED: string = "RT_STR_DELETE_MODE_WITHOUT_MAINSOURCE_NOTALLOWED";
  static readonly RC_ERROR_INCOMPATIBLE_DATASOURCES: string = "RC_ERROR_INCOMPATIBLE_DATASOURCES";
  static readonly RC_ERROR_INVALID_SOURCES: string = "RC_ERROR_INVALID_SOURCES";
  static readonly RC_ERROR_OFFLINE_NEXT_EXECUTION_INVALID_SOURCES: string = "RC_ERROR_OFFLINE_NEXT_EXECUTION_INVALID_SOURCES";
  static readonly RC_ERR_ANDROID_LOAD_FROM_URL: string = "RC_ERR_ANDROID_LOAD_FROM_URL";
  static readonly STR_CLIENT_DB_DEL_OPERATION_FAILED: string = "STR_CLIENT_DB_DEL_OPERATION_FAILED";
  static readonly STR_DATAVIEW_TO_DATASOURCE_OPERATION_FAILED: string = "STR_DATAVIEW_TO_DATASOURCE_OPERATION_FAILED";
  static readonly STR_CLIENT_DB_DISCONNECT_DATASOURCE_OPEN: string = "STR_CLIENT_DB_DISCONNECT_DATASOURCE_OPEN";
  static readonly STR_CLIENT_DB_DISCONNECT_DATASOURCE_NOT_EXIST: string = "STR_CLIENT_DB_DISCONNECT_DATASOURCE_NOT_EXIST";
  static readonly FMERROR_STR_INVALID_PASSWORD: string = "FMERROR_STR_INVALID_PASSWORD";
  static readonly STR_MOBILE_TAB_CONTROL_CANNOT_BE_USED: string = "STR_MOBILE_TAB_CONTROL_CANNOT_BE_USED";
  static readonly STR_MOBILE_CONTROLS_CANNOT_BE_OUTSIDE_TAB: string = "STR_MOBILE_CONTROLS_CANNOT_BE_OUTSIDE_TAB";
  static readonly STR_MOBILE_TAB_CONTROL_LAYER_0: string = "STR_MOBILE_TAB_CONTROL_LAYER_0";
  static readonly STR_MOBILE_TAB_DISPLAY_LIST_ERROR: string = "STR_MOBILE_TAB_DISPLAY_LIST_ERROR";
  static readonly RC_ERROR_ARG_TYPE_STRING_NUMBER_MISMATCH: string = "RC_ERROR_ARG_TYPE_STRING_NUMBER_MISMATCH";
  static readonly RC_ERROR_ILLEGAL_ARG_ATTR_TYPE: string = "RC_ERROR_ILLEGAL_ARG_ATTR_TYPE";
  static readonly RC_ERROR_ILLEGAL_RETURN_VAL_ATTR_TYPE: string = "RC_ERROR_ILLEGAL_RETURN_VAL_ATTR_TYPE";

  static readonly DefaultMessages: DefaultMsgDetails[] = [
    new DefaultMsgDetails("STR_ERR_NUM", "Invalid number"), new DefaultMsgDetails("STR_ERR_DATE", "Invalid date"), new DefaultMsgDetails("STR_ERR_TIME", "Invalid time"), new DefaultMsgDetails("MONTHS_PTR", "January   February  March     April     May       June      July      August    September October   November  December"), new DefaultMsgDetails("DAYS_PTR", "Sunday    Monday    Tuesday   Wednesday Thursday  Friday    Saturday"), new DefaultMsgDetails("STR_ERR_NEGETIVE", "Control value must be non-negative"), new DefaultMsgDetails("STR_RNG_TXT", "Valid control input range is:"), new DefaultMsgDetails("EDT_ERR_STR_1", "Numeric format is limited to %d.%d digits"), new DefaultMsgDetails("STR_ERR_PIPE_CONNECTION", "The connection to the runtime engine was lost. Process ID "), new DefaultMsgDetails("FMERROR_STR_BAD_NAME", "Invalid data source name:"), new DefaultMsgDetails("FMERROR_STR_BAD_DAMAGED", "Damaged data source:"), new DefaultMsgDetails("FMERROR_STR_BAD_BADCREATE", "Create error:"), new DefaultMsgDetails("FMERROR_STR_FILE_LOCKED", "Unable to lock the data source:"), new DefaultMsgDetails("FMERROR_STR_BAD_UNEXPECTED", "Unexpected error, data source:"), new DefaultMsgDetails("FMERROR_STR_BAD_SERVER_NOTFOUND", "Server not found, data source:"), new DefaultMsgDetails("FMERROR_STR_BAD_SERVER_INIT_FAILED", "Server initialization failed, data source:"), new DefaultMsgDetails("FMERROR_STR_UNLOCKED", "Releasing failed, data source:"), new DefaultMsgDetails("FMERROR_STR_BAD_DB_INIT_FAILED", "Database initialization error, data source:"), new DefaultMsgDetails("FMERROR_STR_BAD_LOCK_OPEN", "Failed to open lock file, data source:"),
    new DefaultMsgDetails("FMERROR_STR_BAD_BADOPEN", "Failed to open, data source:"), new DefaultMsgDetails("FMERROR_STR_BAD_BADDEF", "Definition mismatch, data source:"), new DefaultMsgDetails("FMERROR_STR_DUP_KEY", "Duplicate index, data source:"), new DefaultMsgDetails("FMERROR_STR_COMM_LOADED", "Communication Gateway not loaded, data source:"), new DefaultMsgDetails("FMERROR_STR_COMM_CONNECT", "Failed to connect to server, data source:"), new DefaultMsgDetails("FMERROR_STR_READONLY", "Cannot modify Read Only, data source:"), new DefaultMsgDetails("FMERROR_STR_BAD_BADCLOSE", "Failed to close, data source:"), new DefaultMsgDetails("FMERROR_STR_REC_LOCKED", "Waiting for locked row, data source:"), new DefaultMsgDetails("FMERROR_STR_TRANS_OPEN", "Failed to open transaction, data source:"), new DefaultMsgDetails("FMERROR_STR_COMMIT", "Failed to commit transaction"), new DefaultMsgDetails("FMERROR_STR_ABORT", "Failed to abort transaction"), new DefaultMsgDetails("FMERROR_STR_RSRC_LOCKED", "Waiting for lock in database:"), new DefaultMsgDetails("FMERROR_STR_NODEF", "Database definition cannot be loaded, data source:"), new DefaultMsgDetails("FMERROR_STR_DEADLOCK", "Deadlock error, data source:"), new DefaultMsgDetails("FMERROR_STR_DB_PROT", "Exceeded database protection limits, data source:"), new DefaultMsgDetails("FMERROR_STR_OWNR_ALRDY_SET", "Access Key already set, data source:"), new DefaultMsgDetails("FMERROR_STR_INVALID_OWNR", "Invalid Access Key, data source:"), new DefaultMsgDetails("FMERROR_STR_CLR_OWNR_FAIL", "Failed to clear Access Key, data source:"), new DefaultMsgDetails("FMERROR_STR_NO_DATABASE", "Unknown database, data source:"), new DefaultMsgDetails("FMERROR_STR_DBMS_ALTER_FAIL", "Warning - Database failed to alter, data source:"),
    new DefaultMsgDetails("FMERROR_STR_TRANS_LOCK", "Waiting to open transaction"), new DefaultMsgDetails("FMERROR_STR_EXTUSE_MULU_CNFLCT", "Access External Use Database when MultiUser flag is No, data source:"), new DefaultMsgDetails("FMERROR_STR_DB_GW_VERSION_CNFLCT", "Database gateway version mismatch, data source:"), new DefaultMsgDetails("FMERROR_STR_DB_CANOT_REMOVE", "Failed to delete, data source:"), new DefaultMsgDetails("FMERROR_STR_DB_CANOT_RENAME", "Failed to rename, data source:"), new DefaultMsgDetails("FMERROR_STR_DB_BAD_SQL_CMD", "Invalid SQL command, database:"), new DefaultMsgDetails("FMERROR_STR_REC_LOCKED_NOBUF", "Waiting to fetch locked row, data source:"), new DefaultMsgDetails("FMERROR_STR_REOPEN", "Failed to reopen, data source:"), new DefaultMsgDetails("FMERROR_STR_REC_LOCKED_NOW", "Row locked in data source:"), new DefaultMsgDetails("FMERROR_STR_DBMS_SORT_FAIL", "Warning - Database failed to sort, data source:"), new DefaultMsgDetails("FMERROR_STR_NO_OLD_DATABASE_DBMS", "Warning - Previous DBMS or database unknown, data source:"), new DefaultMsgDetails("FMERROR_STR_BAD_LOGIN", "Server login failed. Invalid user/password, data source:"), new DefaultMsgDetails("FMERROR_STR_ERR_EXEC_SQL", "Error in executing SQL command:"), new DefaultMsgDetails("FMERROR_STR_ERR_UPDATE_FAIL", "Update operation failed, data source:"), new DefaultMsgDetails("FMERROR_STR_ERR_INSERT_FAIL", "Insert operation failed, data source:"), new DefaultMsgDetails("FMERROR_STR_ERR_DELETE_FAIL", "Delete operation failed, data source:"), new DefaultMsgDetails("FMERROR_STR_PRINTER", "Incorrect printer setup"), new DefaultMsgDetails("FMERROR_STR_FIL_NOT_EXIST", "Data source does not exist:"), new DefaultMsgDetails("FMERROR_STR_COMM_GWY_COMPTABILITY", "Communication gateways are not compatible:"), new DefaultMsgDetails("FMERROR_STR_CACHE_TOO_BIG", "Not enough memory - Cache not started, data source:"),
    new DefaultMsgDetails("FMERROR_STR_NO_ROWS_AFFECTED", "Operation failed. Record has been changed by another user or process, data source:"), new DefaultMsgDetails("FMERROR_STR_TARGET_FILE_EXIST", "Target data source exists. Create failed for data source:"), new DefaultMsgDetails("FMERROR_STR_FILE_IS_VIEW", "Cannot create/drop/copy a view, view:"), new DefaultMsgDetails("FMERROR_STR_DB_CANOT_COPY", "Failed to copy, data source:"), new DefaultMsgDetails("FMERROR_STR_HLP_NOT_EXIST", "Failed to open, file:"), new DefaultMsgDetails("FMERROR_STR_UNUSABLE_FILE", "Team Development: Data source inaccessible due to maintenance:"), new DefaultMsgDetails("FMERROR_STR_DB_BAD_QUERY", "Bad Open Query Selection Expression:"), new DefaultMsgDetails("FMERROR_STR_NO_HDLS", "Reached maximum Magic xpa file handlers. No available handlers left."), new DefaultMsgDetails("FMERROR_STR_MAX_CONNS_REACHED", "Unable to connect to Server: Maximum connections reached."), new DefaultMsgDetails("FMERROR_STR_CONSTRAINT_FAIL", "Constraint failure, data source:"), new DefaultMsgDetails("FMERROR_STR_TRIGGER_FAIL", "Trigger failure, data source:"), new DefaultMsgDetails("FMERROR_STR_MODIFY_WITHIN_TRANS", "Data source can be modified only from within a transaction, data source:"), new DefaultMsgDetails("EXPTAB_TSK_MODE_RT", "&Modify,&Create,&Delete,&Query,As &Parent,&Locate,&Range,&Key,&Sort,&Files,&Options,By &Exp "), new DefaultMsgDetails("EXPTAB_ERR_CALL_MAIN_PRG_1", "Cannot call Main Program"), new DefaultMsgDetails("LOCATE_STR_ERR_EOF", "Record not found - positioned at beginning"), new DefaultMsgDetails("RT_STR_REC_NOTFOUND", "Row not found in data source:"), new DefaultMsgDetails("RT_STR_PRG_NOTFOUND", "Program not found"), new DefaultMsgDetails("RT_STR_NO_RECS_IN_RNG", "No records within defined range"), new DefaultMsgDetails("RT_STR_FLD_MUST_UPDATED", "Control must be updated"), new DefaultMsgDetails("RT_STR_TSK_NO_SCREEN", "Task without screen"),
    new DefaultMsgDetails("RT_STR_CRSR_CANT_PARK", "Cursor cannot park on any control"), new DefaultMsgDetails("RT_STR_MODE_NOTALLOWED", "Initial Task mode not allowed"), new DefaultMsgDetails("RT_STR_NON_MODIFIABLE", "Non-modifiable control"), new DefaultMsgDetails("RT_STR_UPDATE_IN_QUERY", "Warning - Modify operation canceled due to task Query mode"), new DefaultMsgDetails("RT_STR_LOAD_RES_FAIL", "Failed to load resident data source, data source:"), new DefaultMsgDetails("RT_STR_NO_CREATE_ON_TREE", "Cannot open a task having a tree control with no data to display."), new DefaultMsgDetails("TSKR_ERR_NOTEXIST_COMP", "Component used by the task does not exist or could not be opened"), new DefaultMsgDetails("TSK_ERR_BCSUBFORM_WRONG_EXP", "a cached sub-form has server side expression in Range/Locate/SqlWhere"), new DefaultMsgDetails("TSK_ERR_NESTED_BCSUBFORM", "A cached sub-form can not have a non-cached nested sub-form"), new DefaultMsgDetails("TSK_ERR_CHANGE_CACHED_NESTED_BCSUBFORM", "A cached sub-form can not have a non-cached nested sub-form. The nested subform cache was changed since it uses server side range expression"), new DefaultMsgDetails("TSK_ERR_SUBFORM_DSQL", "DSQL task is not supported as a sub-form"), new DefaultMsgDetails("TSK_ERR_DSQL_SELECT_ONLY", "Only statements that retrieve data are allowed in a DSQL deferred transaction task"), new DefaultMsgDetails("CSTIO_STR_ERR2", "User not authorized for this operation"), new DefaultMsgDetails("CONFIRM_STR_DELETE", "Confirm Delete operation"), new DefaultMsgDetails("CONFIRM_STR_CANCEL", "Confirm Cancel operation"), new DefaultMsgDetails("CONFIRM_STR_WINDOW_TITLE", "Confirmation"), new DefaultMsgDetails("WARNING_STR_WINDOW_TITLE", "Warning"), new DefaultMsgDetails("BRKTAB_STR_ERROR", "Error"), new DefaultMsgDetails("USRINP_STR_BADPASSW", "The application could not log you on. Make sure your user ID and password are correct"), new DefaultMsgDetails("USRINP_STR_BADPASSW_WEBSERVER", "The Web Server could not log you on. Make sure your user ID and password are correct"),
    new DefaultMsgDetails("USRINP_STR_BADPASSW_PROXYSERVER", "The Proxy Server could not log you on. Make sure your user ID and password are correct"), new DefaultMsgDetails("CRF_STR_CONF_UPD", "Confirm update"), new DefaultMsgDetails("MENU_STR_ERROR_ENABLE", "Enable/Disable of system action is not allowed"), new DefaultMsgDetails("GUI_OK_BUTTON", "&OK"), new DefaultMsgDetails("GUI_CANCEL_BUTTON", "&Cancel"), new DefaultMsgDetails("BRKTAB_STOP_MODE_TITLE", "Error,Warning"), new DefaultMsgDetails("BRKTAB_STR_ERR_FORM", "Invalid form"), new DefaultMsgDetails("BROWSER_OPT_INFO_SERVER_STR", "Server"), new DefaultMsgDetails("STR_ERR_PIC_J", "Single byte characters are not allowed"), new DefaultMsgDetails("STR_ERR_PIC_S", "Double byte characters are not allowed"), new DefaultMsgDetails("STR_ERR_PIC_T", "Mixed data of double byte and single byte are not allowed"), new DefaultMsgDetails("TASKRULE_STR_APPLICATION", "Application"), new DefaultMsgDetails("DITDEF_STR_ERR_WINDOW_TYPE", "Invalid Window Type."), new DefaultMsgDetails("DITDEF_STR_ERR_SUBFORM_PROG_PARALLEL", "A parallel program cannot be used as subform or frame program."), new DefaultMsgDetails("DATEHEB_MONTH_STR", "תשרי חשון כסלו טבת  שבט  אדר  ניסן אייר סיון תמוז אב   אלול אדר באדר א"), new DefaultMsgDetails("DATEHEB_DOW_STR", "ראשוןשני  שלישירביעיחמישישישי שבת  "), new DefaultMsgDetails("CHK_ERR_CALL_FROM_RICH_CLIENT", "Rich Client task/program can only call a Rich Client or batch task/program"), new DefaultMsgDetails("RC_STR_F7_UNEXPECTED_ERR", "Unexpected error, Rich client could not be started"), new DefaultMsgDetails("STR_ERR_MAX_VAR_SIZE", "Rich client task supports up to 2147483647 bytes variables"), new DefaultMsgDetails("STR_RC_RECENT_ACTIVITY_TOOLTIP_HDR", "Recent Network Activities:"),
    new DefaultMsgDetails("STR_RC_RECENT_ACTIVITY_TIME_LBL", "At"), new DefaultMsgDetails("STR_RC_RECENT_ACTIVITY_DATA_UNIT", "KB."), new DefaultMsgDetails("STR_RC_RECENT_ACTIVITY_TIME_UNIT", "ms."), new DefaultMsgDetails("STR_PAGE_LOADING_IN_PROGRESS", "The loading of the page is still in progress. Press OK to wait for its completion or Cancel to abort."), new DefaultMsgDetails("STR_CANNOT_PARK", "Cannot park on control:"), new DefaultMsgDetails("STR_RESTART_SESSION", "Would you like to start a new session?"), new DefaultMsgDetails("STR_ERR_INACCESSIBLE_URL", "Inaccessible URL: "), new DefaultMsgDetails("STR_ERR_SESSION_CLOSED", "This session was closed by the server"), new DefaultMsgDetails("STR_ERR_SESSION_CLOSED_INACTIVITY", "This session was closed due to inactivity timeout"), new DefaultMsgDetails("STR_MINUTES", "minutes"), new DefaultMsgDetails("STR_HOURS", "hours"), new DefaultMsgDetails("STR_ERR_AUTHORIZATION_FAILURE", "You do not have access rights to the application. Please contact your system administrator."), new DefaultMsgDetails("STR_WARN_UNLOAD_TIMEOUT", "This session was closed due to unload timeout"), new DefaultMsgDetails("STR_WARN_PARALLEL_NOT_SUPPORTED", "Parallel program is not supported on mobile. Property ignored"), new DefaultMsgDetails("DN_ERR_MDI_FRAME_ISNOT_OPENED", "MDI frame is not opened"), new DefaultMsgDetails("ERR_CANNOT_HANDLE_RC_REQUEST", "Rich client requests cannot be handled when the online MDI is open"), new DefaultMsgDetails("STR_MDI_FRAME_MISMATCH", "The selected MDI Frame form cannot be used for the current task"), new DefaultMsgDetails("CHK_ERR_OFFLINE_NOT_SUPPORT_FRAME_INTERFACE", "Frames interface is not supported in an offline task"), new DefaultMsgDetails("STR_USER_ID", "User ID:"), new DefaultMsgDetails("STR_PASSWORD", "Password:"),
    new DefaultMsgDetails("STR_LOGON_PARAMETERS", "Logon Parameters"), new DefaultMsgDetails("STR_LOGON_CAPTION", "Logon"), new DefaultMsgDetails("STR_LOGON_INSTRUCTION", "Please enter your user ID and password."), new DefaultMsgDetails("STR_GENERIC_ERROR_MESSAGE", "An error occurred (%d). Please contact your system administrator."), new DefaultMsgDetails("STR_GENERIC_ERROR_CONNECTION_PROBLEM_TITLE", "Connection problem:"), new DefaultMsgDetails("STR_GENERIC_ERROR_CONNECTION_PROBLEM_MESSAGE", "Try to reconnect?"), new DefaultMsgDetails("FMERROR_STR_TRANS_OPEN_FAILED", "The transaction was already opened by another task"), new DefaultMsgDetails("STR_ERR_CANNOT_CALL_OFFLINE_BYNAME_OR_BYEXP", "Offline programs cannot be called using the Call By Name or Call By Expression operations"), new DefaultMsgDetails("RT_STR_DELETE_MODE_WITHOUT_MAINSOURCE_NOTALLOWED", "Deleted task mode is not allowed without main source"), new DefaultMsgDetails("RC_ERROR_INCOMPATIBLE_DATASOURCES", "Failed to update the local data. Please clear the application cache or reinstall the application."), new DefaultMsgDetails("RC_ERROR_INVALID_SOURCES", "Failed to update the application."), new DefaultMsgDetails("RC_ERROR_OFFLINE_NEXT_EXECUTION_INVALID_SOURCES", "Failed to start the application. Please restart while the application is connected to the server."), new DefaultMsgDetails("RC_ERR_ANDROID_LOAD_FROM_URL", "Cannot access the server."), new DefaultMsgDetails("STR_CLIENT_DB_DEL_OPERATION_FAILED", "ClientDbDel opeartion failed."), new DefaultMsgDetails("STR_DATAVIEW_TO_DATASOURCE_OPERATION_FAILED", "DataViewToDataSource operation failed."), new DefaultMsgDetails("STR_CLIENT_DB_DISCONNECT_DATASOURCE_OPEN", "Failed to disconnect, data source is open."), new DefaultMsgDetails("STR_CLIENT_DB_DISCONNECT_DATASOURCE_NOT_EXIST", "Failed to disconnect, database does not exist."), new DefaultMsgDetails("FMERROR_STR_INVALID_PASSWORD", "Invalid Password, data source:"), new DefaultMsgDetails("STR_MOBILE_TAB_CONTROL_CANNOT_BE_USED", "Tab control cannot be used in a container control."), new DefaultMsgDetails("STR_MOBILE_CONTROLS_CANNOT_BE_OUTSIDE_TAB", "Controls cannot be placed outside a tab control."),
    new DefaultMsgDetails("STR_MOBILE_TAB_CONTROL_LAYER_0", "Controls cannot be linked to layer 0 of the tab control."), new DefaultMsgDetails("STR_MOBILE_TAB_DISPLAY_LIST_ERROR", "The number of entries in the Display List property must be zero or match the number of entries in the Items List property."), new DefaultMsgDetails("RC_ERROR_ARG_TYPE_STRING_NUMBER_MISMATCH", "The number of characters in the argument type string does not match the number of total arguments"), new DefaultMsgDetails("RC_ERROR_ILLEGAL_ARG_ATTR_TYPE", "Illegal argument attribute type"), new DefaultMsgDetails("RC_ERROR_ILLEGAL_RETURN_VAL_ATTR_TYPE", "Illegal return value attribute type")
  ];

  constructor() {
  }
}
