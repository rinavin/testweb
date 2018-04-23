export enum EventSubType {
  // InternalInterface.MG_ACT_CANCEL in runtime event
  Normal,
  CancelWithNoRollback,
  CancelIsQuit,
  // InternalInterface.MG_ACT_RT_REFRESH_VIEW in runtime event
  RtRefreshViewUseCurrentRow,
  // InternalInterface.MG_ACT_EXIT in runtime event
  ExitDueToError
}


export enum ClientTargetedCommandType {
  Abort = 'A',
  OpenURL = 'P',
  Verify = 'V',
  EnhancedVerify = 'E',
  Result = 'S',
  AddRange = 'R',
  ClientRefresh = 'C',
  AddLocate = 'L',
  AddSort = 'T',
  ResetRange = 'G',
  ResetLocate = 'O',
  ResetSort = 'U'
}
