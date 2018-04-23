export class FlowMonitorInterface {
  static FLWMTR_START: number = 0;
  static FLWMTR_END: number = 1;
  static FLWMTR_PROPAGATE: number = 2;
  static FLWMTR_USE_COMP: number = 3;

  static FLWMTR_EVENT: number = 7;
  static FLWMTR_CHNG_MODE: number = 8;

  static FLWMTR_PREFIX: number = 15;
  static FLWMTR_SUFFIX: number = 16;

  static FLWMTR_CTRL_PREFIX: number = 18;
  static FLWMTR_CTRL_SUFFIX: number = 19;
  static FLWMTR_TSK_HANDLER: number = 20;
  static FLWMTR_CTRL_VERIFY: number = 21;

  /* View level messages */
  static FLWMTR_SORT: number = 22;
  static FLWMTR_LOCATE: number = 23;
  static FLWMTR_RANGE: number = 24;
  static FLWMTR_KEY_CHANGE: number = 25;
  static FLWMTR_TRANS: number = 26;
  static FLWMTR_LOADREC: number = 27;
  static FLWMTR_UPDATE: number = 28;
  static FLWMTR_DELETE: number = 29;
  static FLWMTR_INSERT: number = 30;

  /* Recompute messages */
  static FLWMTR_RECOMP: number = 31;
  /* Operations messages */
  static FLWMTR_DATA_OPER: number = 41;
  /* LOG messages */
  static FLWMTR_LOG_MSG: number = 51;
  /* free messages (not filtered) */
  static FLWMTR_USER_MSG: number = 96;
  static FLWMTR_ERROR_MSG: number = 97;
  static FLWMTR_FREE_MSG: number = 98;
  static FLWMTR_DEBUG_MSG: number = 99;
  static FLWMTR_WARN_MSG: number = 100;
  static FLWMTR_VARCHG_VALUE: number = 119;
  static FLWMTR_VARCHG_REASON: number = 120;
  static FLWMTR_EVENT_KBD: number = 1;
  static FLWMTR_EVENT_ACT: number = 2;
  static FLWMTR_EVENT_TIME: number = 4;
  static FLWMTR_EVENT_EXP: number = 8;
}
