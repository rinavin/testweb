export enum Logger_MessageDirection {
  MessageLeaving,
  MessageEntering
}

export enum Logger_LogLevels {
  None,
  Server,
  ServerMessages,
  Support,
  Gui,
  Development,
  Basic
}

export enum Priority {
  LOWEST = 1,
  LOW,
  HIGH
}

export enum TableBehaviour {
  LimitedItems = 1,
  UnlimitedItems
}

export enum HttpStatusCode {
  Unused
}
export enum MgControlType {
  CTRL_TYPE_NONE = '0',
  CTRL_TYPE_BUTTON = 'B',
  CTRL_TYPE_CHECKBOX = 'C',
  CTRL_TYPE_RADIO = 'R',
  CTRL_TYPE_COMBO = 'D',
  CTRL_TYPE_LIST = 'E',
  CTRL_TYPE_TEXT = 'T',
  CTRL_TYPE_GROUP = 'G',
  CTRL_TYPE_TAB = 'J',
  CTRL_TYPE_TABLE = 'A',
  CTRL_TYPE_COLUMN = 'K',
  CTRL_TYPE_LABEL = 'L',
  CTRL_TYPE_IMAGE = 'I',
  CTRL_TYPE_SUBFORM = 'F',
  CTRL_TYPE_BROWSER = 'W',
  CTRL_TYPE_STATUS_BAR = '1',
  CTRL_TYPE_SB_LABEL = '2',
  CTRL_TYPE_SB_IMAGE = '3',
  CTRL_TYPE_FRAME_SET = 'P',
  CTRL_TYPE_CONTAINER = 'Q',
  CTRL_TYPE_FRAME_FORM = 'U',
  CTRL_TYPE_LINE = 'X'
}

export enum DitType {
  None = 1,
  Edit,
  Button,
  Combobox,
  Listbox,
  Radiobox,
  Tab,
  Checkbox,
  Image,
  Static,
  Line,
  Group,
  Table,
  Slider,
  Ole,
  Hotspot,
  StaticTable,
  Sound,
  Html,
  Java,
  Activex,
  Frame,
  Subform,
  Hypertext,
  Browser,
  Opaque
}

export enum BorderType {
  Thin = 1,
  Thick,
  NoBorder
}

export enum GradientStyle {
  None = 1,
  Horizontal,
  HorizontalSymmetric,
  HorizontalWide,
  Vertical,
  VerticalSymmetric,
  VerticalWide,
  DiagonalLeft,
  DiagonalLeftSymmetric,
  DiagonalRight,
  DiagonalRightSymmetric,
  CornerTopLeft,
  CornerTopRight,
  CornerBottomLeft,
  CornerBottomRight,
  Center
}

export enum AlignmentTypeHori {
  Left = 1,
  Center,
  Right
}

export enum TabbingOrderType {
  Automatically = 1,
  Manual
}

export enum AllowedDirectionType {
  Both = 1,
  Foreword,
  Backward
}

export enum AlignmentTypeVert {
  Top = 1,
  Center,
  Bottom
}

export enum HtmlAlignmentType {
  TextVertTop = 1,
  TextVertCenter,
  TextVertBottom,
  TextHoriLeft,
  TextHoriRight
}

export enum SideType {
  Top = 1,
  Right,
  Bottom,
  Left
}

export enum SelprgMode {
  Before = 'B',
  After = 'A',
  Prompt = 'P'
}

export enum WinCptn {
  Half = 1,
  On,
  Off
}

export enum WinHtmlType {
  Get = 1,
  Post,
  Link
}

export enum WinUom {
  Dlg = 1,
  Mm,
  Inch,
  Pix
}

export enum ControlStyle {
  TwoD = 1,
  ThreeD,
  ThreeDSunken,
  Windows3d,
  Windows,
  Emboss,
  NoBorder
}

export enum CtrlLineType {
  Normal = 1,
  Dash,
  Dot,
  Dashdot,
  Dashdotdot
}

export enum CtrlTextType {
  Default = 1,
  Bullet,
  Number
}

export enum CtrlLineDirection {
  Asc = 1,
  Des
}

export enum CtrlOleDisplayType {
  Icon = 1,
  Content,
  Any
}

export enum CtrlOleStoreType {
  Link = 1,
  Embeded,
  Any
}

export enum CtrlButtonType {
  Submit = 1,
  Clear,
  Default
}

export enum CtrlImageStyle {
  Tiled = 1,
  Copied,
  ScaleFit,
  ScaleFill,
  Distorted
}

export enum TabControlTabsWidth {
  FitToText = 1,
  Fixed,
  FillToRight,
  FixedInLine
}

export enum CheckboxMainStyle {
  None = 0,
  Box = 1,
  Button,
  Switch
}

export enum RbAppearance {
  None = 0,
  Radio = 1,
  Button
}

export enum HelpCommand {
  Context = 1,
  Contents,
  Setcontents,
  Contextpopup,
  Key,
  Command,
  Forcefile,
  Helponhelp,
  Quit
}

export enum FormExpandType {
  None = 1,
  OnePage,
  MultiPage
}

export enum DitAttribute {
  Alpha = 1,
  Unicode,
  Numeric,
  Boolean,
  Date,
  Time,
  Memo,
  Blob
}

export enum DspInterface {
  Text = 1,
  Gui,
  Html,
  Java,
  Frame,
  Merge,
  Webonline,
  Browser
}

export enum PrgExecPlace {
  Before = 1,
  After,
  Prompt
}

export enum SliderType {
  Vertical = 1,
  Horizontal
}

export enum CtrlButtonTypeGui {
  None = 0,
  Push = 1,
  Image,
  Hypertext,
  TextOnImage
}

export enum ImageEffects {
  Normal = 1,
  WipeDown,
  WipeUp,
  WipeRight,
  WipeLeft,
  Pixel,
  SmallBox,
  MediumBox,
  LargeBox,
  Hline,
  Vline,
  Vmiddle,
  Hmiddle,
  Hinterlace,
  Vinterlace,
  OutToIn,
  InToOut,
  OtiInterlace1,
  ItoInterlace2,
  SpiralIn3,
  SpiralOut4
}

export enum CtrlHotspotType {
  Square = 1,
  Circle
}

export enum SubformType {
  Program = 1,
  Subtask,
  Form,
  None
}

export enum DatabaseDefinitionType {
  String = 1,
  Normal
}

export enum DatabaseOperations {
  Insert = 1,
  Update,
  Delete,
  Where,
  None
}

export enum DataTranslation {
  Ansi = 1,
  Oem,
  Unicode
}

export enum WindowPosition {
  Customized = 1,
  DefaultBounds,
  CenteredToParent,
  CenteredToMagic,
  CenteredToDesktop,
  DefaultLocation,
  CenteredToWindow
}

export enum FldStyle {
  None = 1,
  Activex,
  Ole,
  Vector,
  Dotnet
}

export enum FieldComType {
  Obj = 1,
  Ref
}

export enum ListboxSelectionMode {
  Single = 1,
  Multiple
}

export enum SplitWindowType {
  None = 1,
  Vertical,
  Horizontal
}

export enum SplitPrimaryDisplay {
  Default = 1,
  Left,
  Right,
  Top,
  Bottom
}

export enum AutoFit {
  None = 1,
  AsControl,
  AsCalledForm
}

export enum WindowType {
  Default = 1,
  Sdi,
  ChildWindow,
  SplitterChildWindow,
  Floating,
  Modal,
  ApplicationModal,
  Tool,
  FitToMdi,
  MdiChild,
  MdiFrame,
  LogonApplicationWindow = 'a',
  TkDockChild = 'b'
}

export enum StartupMode {
  Default = 1,
  Maximize,
  Minimize
}

export enum ColumnUpdateStyle {
  Absolute = 1,
  Differential,
  AsTable
}

export enum CallUdpConvention {
  C = 'C',
  Standard = 'S',
  Fast = 'F'
}

export enum CallUDPType {
  Background = 'B',
  GUI = 'G'
}

export enum VerifyMode {
  Error = 'E',
  Warning = 'W',
  Revert = 'R'
}

export enum VerifyDisplay {
  Box = 'B',
  Status = 'S',
  None = 'N'
}

export enum VerifyImage {
  Exclamation = 'E',
  Critical = 'C',
  Question = 'Q',
  Information = 'I',
  None = 'N'
}

export enum VerifyButtons {
  Ok = 'O',
  OkCancel = 'K',
  AbortRetryIgnore = 'A',
  YesNoCancel = 'Y',
  YesNo = 'N',
  RetryCancel = 'R'
}

export enum CallComOption {
  Method = 1,
  GetProp,
  SetProp
}

export enum CallWsStyle {
  Rpc = 1,
  Document
}

export enum CallOsShow {
  Hide = 1,
  Normal,
  Maximize,
  Minimize
}

export enum LogicUnit {
  Remark = 1,
  Task,
  Group,
  Record,
  Variable,
  Control,
  Event,
  Function,
  SeqFlow
}

export enum LogicLevel {
  Prefix = 'P',
  Suffix = 'S',
  Verification = 'V',
  Change = 'C'
}

export enum BrkScope {
  Task = 'T',
  Subtree = 'S',
  Global = 'G'
}

export enum LDir {
  Default = 'A',
  Reversed = 'D'
}

export enum Order {
  Ascending = 'A',
  Descending = 'D'
}

export enum LnkEval_Cond {
  Record = 'R',
  Task = 'T'
}

export enum Access {
  NoAccess = ' ',
  Read = 'R',
  Write = 'W'
}

export enum DbShare {
  NoShare = ' ',
  Write = 'W',
  Read = 'R',
  None = 'N'
}

export enum DbOpen {
  Normal = 'N',
  Fast = 'F',
  Damaged = 'D',
  Reindex = 'R'
}

export enum DbDelUpdMode {
  Position = 'P',
  PositionAndSelectedFields = 'S',
  PositionAndUpdatedFields = 'U',
  AsTable = 'T',
  None = 'N'
}

export enum RaiseAt {
  Container = 1,
  TaskInFocus
}

export enum EngineDirect {
  None = ' ',
  AbortTask = 'A',
  Rollback = 'B',
  AutoRetry = 'R',
  UserRetry = 'U',
  Ignore = 'I',
  AsStrategy = 'S',
  Continue = 'C'
}

export enum FlowDirection {
  Forward = 'F',
  Backward = 'B',
  Combined = 'C'
}

export enum FlwMode {
  Fast = 'F',
  Step = 'S',
  Combine = 'B',
  Before = 'J',
  After = 'Z'
}

export enum RowHighlightType {
  None = 1,
  Frame,
  Background,
  BackgroundControls
}

export enum SplitterStyle {
  TwoD = 1,
  ThreeD
}

export enum BottomPositionInterval {
  NoneRowHeight = 1,
  RowHeight
}

export enum TableColorBy {
  Column = 1,
  Table,
  Row
}

export enum ExecOn {
  None,
  Optimized,
  Client,
  Server
}

export enum MultilineHorizontalScrollBar {
  Unknown,
  Yes,
  No,
  WordWrap
}

export enum FramesetStyle {
  None,
  Vertical,
  Horizontal
}

export enum FrameType {
  FrameSet,
  Subform,
  Form
}

export enum Storage {
  AlphaString = 1,
  AlphaLstring,
  AlphaZtring,
  NumericSigned,
  NumericUnsigned,
  NumericFloat,
  NumericFloatMs,
  NumericFloatDec,
  NumericPackedDec,
  NumericNumeric,
  NumericCharDec,
  NumericString,
  NumericMagic,
  NumericCisam,
  BooleanInteger,
  BooleanDbase,
  DateInteger,
  DateInteger1901,
  DateString,
  DateYymd,
  DateMagic,
  DateMagic1901,
  TimeInteger,
  TimeString,
  TimeHmsh,
  TimeMagic,
  MemoString,
  MemoMagic,
  Blob,
  NumericExtFloat,
  UnicodeString,
  UnicodeZstring,
  AnsiBlob,
  UnicodeBlob
}

export enum StorageAttributeType {
  Alpha = 'A',
  Numeric = 'N',
  Boolean = 'B',
  Date = 'D',
  Time = 'T',
  Blob = 'O',
  Unicode = 'U',
  String = 'S',
  BlobOle = 'L',
  BlobActiveX = 'X',
  BlobVector = 'V',
  BlobDotNet = 'E',
  BlobJava = 'J',
  None = ' '
}

export enum BrkLevel {
  Task = 'T',
  Group = 'G',
  All = 'A',
  Record = 'R',
  Control = 'C',
  Handler = 'H',
  MainProgram = 'M',
  Variable = 'V',
  Function = 'F',
  Remark = 'K',
  RM_Compat = 'M',
  SubForm = 'U',
  Event = 'E',
  OPStatOnChange = 'O'
}

export enum MediaOrientation {
  Portrait = 'P',
  Landscape = 'L'
}

export enum MediaFormat {
  Page = 'P',
  Line = 'L',
  None = 'N'
}

export enum CharacterSet {
  Ansi,
  Oem,
  Unicode = 3,
  Utf8
}

export enum MediaAccess {
  Read = 'R',
  Write = 'W',
  Append = 'A',
  Direct = 'D',
  AppendFlush = 'F',
  Create = 'C'
}

export enum PaperSize {
  Default = 'D',
  Letter = 'L',
  A4 = 'A',
  Folio = 'F',
  Quarto = 'Q',
  Tabloid = 'T',
  Ledger = 'R',
  Legal_8_14 = 'G',
  Statement = 'S',
  Executive_7_10 = 'X',
  A3 = '3',
  A5 = '5',
  Note = 'N',
  Envelope_3_8 = 'E',
  B4 = 'B',
  B5_v = 'V',
  UserDefined = 'U',
  B5 = 'W',
  C5 = 'C',
  Legal = 'g',
  Multipurpose = 'M',
  Executive = 'x',
  EnvelopeB4 = 'v',
  EnvelopeB5 = 'p',
  EnvelopeC6 = '6',
  EnvelopeDL = 'o',
  EnvelopeMonarch = 'h',
  Envelope9 = '9',
  Envelope10 = '0',
  Envelope11 = '1'
}

export enum PaperSizePdfDisabled {
  Default = 'D',
  Letter = 'L',
  A4 = 'A',
  Folio = 'F',
  Quarto = 'Q',
  Tabloid = 'T',
  Ledger = 'R',
  Legal_8_14 = 'G',
  Statement = 'S',
  Executive_7_10 = 'X',
  A3 = '3',
  A5 = '5',
  Note = 'N',
  Envelope_3_8 = 'E',
  B4 = 'B',
  B5_v = 'V'
}

export enum PaperSizePdfEnabled {
  Default = 'D',
  UserDefined = 'U',
  Letter = 'L',
  A4 = 'A',
  A3 = '3',
  Legal = 'g',
  B5 = 'B',
  C5 = 'C',
  Multipurpose = 'M',
  B4 = '4',
  A5 = '5',
  Folio = 'F',
  Executive = 'x',
  EnvelopeB4 = 'v',
  EnvelopeB5 = 'p',
  EnvelopeC6 = '6',
  EnvelopeDL = 'o',
  EnvelopeMonarch = 'h',
  Envelope9 = '9',
  Envelope10 = '0',
  Envelope11 = '1'
}

export enum Area {
  Detail = 'N',
  Header = 'H',
  Footer = 'F',
  PageHeader = 'P',
  PageFooter = 'G'
}

export enum DisplayTextType {
  Edit,
  Query
}

export enum LogicHeaderType {
  None = ' ',
  Remark = 'K',
  Task = 'T',
  Function = 'F',
  Handler = 'H',
  Record = 'R',
  Variable = 'V',
  Control = 'C',
  Group = 'G',
  All = 'A',
  MainProgram = 'P',
  RecordCompat = 'M',
  SubForm = 'U',
  Event = 'E'
}

export enum LogicOperationType {
  None = 'x',
  Remark = ' ',
  Update = 'U',
  Call = 'C',
  Invoke = 'I',
  RaiseEvent = 'R',
  Evaluate = 'A',
  Block = 'B',
  Verify = 'E',
  Form = 'F',
  Variable = 'V'
}

export enum Opr {
  Remark,
  SelFld,
  Stop,
  BeginLink,
  EndLink,
  BeginBlock,
  EndBlock,
  Call,
  EvaluateExpression,
  UpdateFld,
  WriteFile,
  ReadFile,
  DataviewSrc,
  UserExit,
  RaiseEvent
}

export enum DataViewHeaderType {
  None = ' ',
  Remark = 'R',
  Declare = 'D',
  MainSource = 'M',
  DirectSQL = 'Q',
  LinkQuery = 'L',
  LinkWrite = 'W',
  LinkCreate = 'C',
  LinkIJoin = 'I',
  LinkOJoin = 'O',
  EndLink = 'E'
}

export enum DataViewOperationType {
  Remark = ' ',
  Column = 'C',
  Virtual = 'V',
  Parameter = 'P',
  LinkedColumn = 'L'
}

export enum LoadedValues {
  None,
  HeaderOnly,
  Failed,
  Full
}

export enum YesNoValues {
  Yes = 1,
  No = 0
}

export enum TrueFalseValues {
  True = 1,
  False = 0
}

export enum HelpType {
  Internal = 'I',
  Prompt = 'P',
  Windows = 'W',
  Tooltip = 'T',
  URL = 'U'
}

export enum NullArithmetic {
  Nullify,
  UseDefault
}

export enum ModelClass {
  Help = 'A',
  Field = 'B',
  Browser = 'C',
  GUI0 = 'D',
  GUI1 = 'E',
  TextBased = 'F',
  Frameset = 'G',
  Merge = 'H',
  RCDisplay = 'I',
  RCFrame = 'J',
  GuiFrame = 'K'
}

export enum CompTypes {
  Magicxpa = 'U',
  DotNet = 'D'
}

export enum TaskFlow {
  Undefined = 'U',
  Online = 'O',
  Batch = 'B',
  Browser = 'R',
  RichClient = 'C'
}

export enum RemarkType {
  RegularOperation,
  Dataviewheader,
  TaskLogic
}

export enum VeeMode {
  None = ' ',
  Parameter = 'P',
  Virtual = 'V',
  Real = 'R',
  Column = 'C',
  LinkCol = 'L'
}

export enum VeeDiffUpdate {
  AsTable = 'T',
  Absolute = 'N',
  Differential = 'Y',
  None = 0
}

export enum VeePartOfDataview {
  Undefined = 'U'
}

export enum DataviewType {
  MainTable = 'M',
  DSQL = 'Q',
  Declaration = 'D'
}

export enum TabbingCycleType {
  RemainInCurrentRecord = 'R',
  MoveToNextRecord = 'N',
  MoveToParentTask = 'P'
}

export enum LockingStrategy {
  Immediate = 'I',
  OnModify = 'O',
  AfterModify = 'A',
  BeforeUpdate = 'B',
  Minimum = 'M'
}

export enum TransBegin {
  Update = 'U',
  Prefix = 'P',
  Suffix = 'S',
  OnLock = 'L',
  None = 'N',
  BeforeTask = 'T',
  Group = 'G'
}

export enum ErrStrategy {
  Recover = 'R',
  Abort = 'A'
}

export enum CacheStrategy {
  Pos = 'P',
  PosData = 'D',
  None = 'N',
  AsTable = 'T'
}

export enum ExeState {
  Prefix = 'P',
  Suffix = 'S',
  Update = 'U',
  Main = 'M',
  Before = 'B',
  AfterOnChange = 'O',
  Verify = 'V',
  Change = 'C'
}

export enum TransMode {
  Deferred = 'D',
  NestedDeffered = 'N',
  Physical = 'P',
  WithinActiveTrans = 'W',
  None = 'O'
}

export enum PositionUsage {
  RangeOn = 'O',
  RangeFrom = 'F',
  Locate = 'L'
}

export enum LnkMode {
  Query = 'R',
  Write = 'W',
  Create = 'A',
  IJoin = 'J',
  OJoin = 'O'
}

export enum InitialMode {
  Modify = 'M',
  Create = 'C',
  Delete = 'D',
  Query = 'E',
  AsParent = 'P',
  Locate = 'L',
  Range = 'R',
  Key = 'K',
  Sort = 'S',
  Files = 'O',
  Options = 'N',
  ByExp = 'B'
}

export enum KeyMode {
  Normal = 'N',
  Insert = 'I',
  Append = 'A'
}

export enum BoxDir {
  Vertical = 'V',
  Horizontal = 'H'
}

export enum EndMode {
  Before = 'B',
  After = 'A',
  Immediate = 'I'
}

export enum UniqueTskSort {
  AccordingToIndex = 'A',
  Unique = 'U'
}

export enum BrkType {
  Prefix = 'P',
  Suffix = 'S',
  Main = 'M',
  User = 'U',
  Error = 'E',
  Verify = 'V',
  ChoiceChange = 'C'
}

export enum ErrorClassific {
  Any,
  RecLocked,
  DupKey,
  ConstrFail,
  TriggerFail,
  RecUpdated,
  RowsAffected,
  UpdateFail,
  Unmapped,
  ExecSql,
  BadSqlCmd,
  BadIni,
  BaName,
  Damaged,
  Unlocked,
  BadOpen,
  BadClose,
  RsrcLocked,
  RecLockedNoBuf,
  NoDef,
  RecLockedNow,
  WrnRetry,
  RecLockedMagic,
  ReadOnly,
  WrnCreated,
  Capacity,
  TransCommit,
  TransOpen,
  TransAbort,
  BadDef,
  InvalidOwnr,
  ClrOwnrFail,
  AlterTbl,
  SortTbl,
  CanotRemove,
  CanotRename,
  WrnLogActive,
  TargetFileExist,
  FileIsView,
  CanotCopy,
  Stop,
  StrBadName,
  InsertIntoAll,
  BadQry,
  FilterAfterInsert,
  GetUserPwdDst,
  WrnCacheTooBig,
  LostRec,
  FileLocked,
  MaxConnEx,
  Deadlock,
  BadCreate,
  FilNotExist,
  Unused,
  IdxCreateFail,
  ConnectFail,
  Fatal,
  InsertFail,
  DeleteFail,
  InErrorZone,
  NoRec,
  NotExist,
  GetUserPwd,
  WrnCancel,
  NotSupportedFunc,
  ModifyWithinTrans,
  LoginPwd,
  None
}

export enum ComponentItemType {
  Models,
  DataSources,
  Programs,
  Helps,
  Rights,
  Events,
  Functions
}

export enum FieldComAlloc {
  Auto = 1,
  None
}

export enum BlobContent {
  Unknown = '0',
  Ansi = '1',
  Unicode = '2',
  Binary = '3'
}

export enum DBHRowIdentifier {
  RowId = 'R',
  Default = 'D',
  UniqueKey = 'U'
}

export enum UseSQLCursor {
  Yes = 'Y',
  No = 'N',
  Default = 'D'
}

export enum DBHCache {
  Pos = 'P',
  PosData = 'D',
  None = 'N',
  AsTable = 'T'
}

export enum Resident {
  No = 'N',
  Immediate = 'I',
  OnDemand = 'D',
  ImmediateAndClient = 'C',
  ImmediateAndBrowser = 'B'
}

export enum CheckExist {
  CheckYes = 'Y',
  CheckNo = 'N',
  CheckDB = 'D'
}

export enum ValType {
  ZString = 1,
  MagicNum,
  Boolean,
  UString
}

export enum FldStorage {
  AlphaString = 1,
  AlphaLString,
  AlphaZString,
  NumericSigned,
  NumericUnsigned,
  NumericFloat,
  NumericFloatMS,
  NumericFloatDec,
  NumericPackedDec,
  NumericNumeric,
  NumericCharDec,
  NumericString,
  NumericMagic,
  NumericCisam,
  NumericExtFloat = 30,
  BooleanInteger = 15,
  BooleanDBase,
  DateInteger,
  DateInteger1901,
  DateString,
  DateYYMD,
  DateMagic,
  DateMagic1901,
  TimeInteger,
  TimeString,
  TimeHMSH,
  TimeMagic,
  MemoString,
  MemoMagic,
  Blob,
  UnicodeString = 31,
  UnicodeZString,
  AnsiBlob,
  UnicodeBlob
}

export enum DriverDB {
  Btrv,
  Prevesive2000,
  RMS,
  MySQL,
  DBase,
  Cache,
  DB2AS400,
  FoxBase,
  Clipper,
  SyBase,
  Cics = 12,
  Oracle,
  Informix,
  Ingres,
  AS400,
  DB2 = 18,
  Odbc,
  MS6,
  Memory,
  RMCOB
}

export enum ExportType {
  EntireProject = 'A',
  Models = 'E',
  DataSources = 'F',
  Programs = 'P',
  Helps = 'H',
  Rights = 'R',
  Menus = 'M',
  CompositeResources = 'O',
  ApplicationProperties = 'C'
}

export enum TriggerType {
  System = 'S',
  Timer = 'T',
  Expression = 'E',
  Internal = 'I',
  None = 'N',
  Component = 'C',
  User = 'U',
  Error = 'R',
  ComEvent = 'X',
  DotNetEvent = 'D',
  PublicUserEvent = 'P',
  UserFunc = 'F'
}

export enum ItemMasks {
  Undefined = 0,
  ActiveInClient = 1,
  MagicSqlFunc = 4,
  CacheAlways = 8,
  CacheSometimes = 16,
  RtSearchExecAllowed = ' ',
  ArgAttrAsResult = '@',
  CalcResAttr = 128,
  PossibleReentrance = 256,
  ForceClientExecBrowserClient = 512,
  ForceServerExecBrowserClient = 1024,
  FuncNotSupportedBrowserClient = 2048,
  ForceClientExecRichClient = 4096,
  ForceServerExecRichClient = 8192,
  FuncNotSupportedRichClient = 16384,
  FuncNotSupportedOnlineBatch = 32768,
  ForceMixExecRichClient = 65536,
  ForceUnknownExecRichClient = 131072
}

export enum UpdateMode {
  Incremental = 'I',
  Normal = 'N'
}

export enum BlockTypes {
  If = 'I',
  Else = 'E',
  EndBlock = 'N',
  Loop = 'L'
}

export enum FormOperationType {
  Input = 'I',
  Output = 'O'
}

export enum FormPage {
  Skip = 'S',
  Auto = 'A',
  Top = 'T'
}

export enum FormDelimiter {
  Column = 'C',
  Single = 'S',
  Double = 'D'
}

export enum CallOperationMode {
  Program = 'P',
  SubTask = 'T',
  ByExp = 'E',
  ByName = 'B',
  Remote = 'R',
  Com = 'C',
  OsCommand = 'O',
  UDP = 'U',
  WebS = 'W',
  WebSLite = 'L',
  DotNet = 46
}

export enum RowType {
  Header = 1,
  Operation
}

export enum ForceExit {
  None = 'N',
  Control = 'C',
  PreRecordUpdate = 'R',
  PostRecordUpdate = 'P',
  Ignore = 'I',
  Editing = 'E'
}

export enum MediaType {
  None = 'N',
  GraphicalPrinter = 'G',
  Printer = 'P',
  Console = 'C',
  File = 'F',
  Requester = 'R',
  XMLDirect = 'D',
  Variable = 'V'
}

export enum OSType {
  Android = 'A',
  IOS = 'I'
}

export enum APGMode {
  Execute = 'E',
  Generate = 'G'
}

export enum APGOption {
  Browse = 'B',
  Export = 'E',
  Import = 'I',
  Print = 'P',
  Browser = 'R',
  RichClient = 'H'
}

export enum APGDisplayMode {
  Line = 'L',
  Screen = 'S',
  None = 'N'
}

export enum APGFormSize {
  AsModel = 'M',
  AsContent = 'C',
  AsContentWithinMDI = 'D'
}

export enum APGType {
  Single = 'S',
  Multiple = 'M',
  Program = 'P'
}

export enum APGInvokedFrom {
  TablesRepository = 1,
  ProgramsRepository
}

export enum MgModelType {
  Model = 'M',
  Var = 'V'
}

export enum CallbackType {
  ProgressBar,
  Import,
  FormEditor,
  CollectionChanges
}

export enum Axis {
  X,
  Y
}

export enum ModelAttrHelp {
  Internal = 'A',
  Windows = 'B'
}

export enum ModelAttrField {
  Alpha = 'A',
  Numeric = 'C',
  Unicode = 'B',
  Logical = 'D',
  Date = 'E',
  Time = 'F',
  Blob = 'G',
  OLE = 'H',
  ActiveX = 'I',
  Vector = 'J',
  DotNet = 'K'
}

export enum ModelAttrGui0 {
  Form = 'A',
  Edit = 'B',
  Static = 'C',
  Button = 'D',
  Check = 'E',
  Radio = 'F',
  Tab = 'G',
  List = 'H',
  Combo = 'I',
  Line = 'J',
  Slider = 'K',
  Table = 'L',
  Column = 'M',
  Image = 'N',
  Ole = 'O',
  Redit = 'P',
  Activex = 'R',
  Subform = 'S',
  Browser = 'O'
}

export enum ModelAttrGui1 {
  Form = 'A',
  Edit = 'B',
  Static = 'C',
  Line = 'D',
  Table = 'E',
  Column = 'F',
  Image = 'G',
  Redit = 'H'
}

export enum ModelAttrText {
  Form = 'A',
  Edit = 'B',
  Static = 'C',
  Line = 'D'
}

export enum ModelAttrRichClient {
  Form = 'A',
  Edit = 'B',
  Label = 'C',
  Button = 'D',
  Check = 'E',
  Radio = 'F',
  Tab = 'G',
  List = 'H',
  Combo = 'I',
  Group = 'J',
  Table = 'K',
  Column = 'L',
  Image = 'M',
  Subform = 'N',
  Browser = 'O',
  Line = 'Q'
}

export enum ModelAttrFramesetForm {
  Form = 'A',
  Frame = 'B'
}

export enum ModelAttRichClientFrameSet {
  Form = 'A',
  Frame = 'B'
}

export enum ModelAttrBrowser {
  Form = 'A',
  Edit = 'B',
  Static = 'C',
  Button = 'D',
  Check = 'E',
  Radio = 'F',
  List = 'G',
  Combo = 'H',
  Table = 'I',
  Image = 'J',
  Subform = 'K',
  Iframe = 'L',
  Opaque = 'M'
}

export enum ModelAttGuiFrame {
  Form = 'A',
  Frame = 'B'
}

export enum ModelAttMerge {
  Form = 'A'
}

export enum DbhKeyMode {
  Unique = 'S',
  NonUnique = 'N'
}

export enum DbhKeyDirection {
  OneWay = 'A',
  TwoWay = 'B'
}

export enum DbhKeyRangeMode {
  Quick = 'Q',
  Full = 'F'
}

export enum DbhKeyIndexType {
  Real = 'R',
  Virtual = 'V'
}

export enum DbhSegmentDirection {
  Ascending = 'A',
  Descending = 'D'
}

export enum ChoiceControlStyle {
  ListBox = 1,
  ComboBox,
  Tab,
  RadioButton
}

export enum Recursion {
  None,
  First,
  Second,
  FirstOpen
}

export enum ViewSelectType {
  IncludeInView,
  ExcludeFromView
}

export enum RangeMode {
  From = 'F',
  To = 'T',
  Equal = 'E'
}

export enum TableType {
  Table = 'T',
  View = 'V',
  Undefined = 'U'
}

export enum DatabaseDataType {
  XmlDataSource = 'X',
  DatabaseDataSource = 'D'
}

export enum LogicHeaderAction {
  None,
  CreateVariableChangeParameters,
  DeleteVariableChangeParameters,
  ReplaceVariableChangeParameters,
  CreateEventParameters
}

export enum DatabaseFilters {
  EnvironmentDatabaseAll = 'A',
  EnvironmentDatabaseSql = 'S',
  EnvironmentDatabaseCanLoadDefinition = 'D',
  EnvironmentDatabaseIsam = 'I',
  EnvironmentDatabaseXmlOnly = 'X',
  EnvironmentDatabaseOnly = 'O',
  EnvironmentDatabaseCanLoadDefinitionAndXml = 'G'
}

export enum FieldViewModelType {
  DataSource,
  DataView,
  Logic
}

export enum SourceContextType {
  CurrentContext = 'C',
  MainContext = 'M'
}

export enum ViewRefreshMode {
  None,
  CurrentLocation,
  UseTaskLocate,
  FirstRecord
}

export enum LineManipulationType {
  None,
  RepeatEntries,
  MoveEntries,
  OverwriteCurrent
}

export enum DataViewOutputType {
  Xml = 'X',
  ClientFile = 'C'
}

export enum UndoRedoAction {
  Undo,
  Redo
}

export enum OrientationLock {
  No = 1,
  Portrait,
  Landscape
}

export enum EnterAnimation {
  Default = 1,
  Left,
  Right,
  Top,
  Bottom,
  Flip,
  Fade,
  None
}

export enum ExitAnimation {
  Default = 1,
  Left,
  Right,
  Top,
  Bottom,
  Flip,
  Fade,
  None
}

export enum KeyboardTypes {
  Default = 1,
  Numeric,
  URL,
  NumberPad,
  PhonePad,
  NamePhonePad,
  Email
}

export enum KeyboardReturnKeys {
  Default = 1,
  Go,
  Next,
  Previous,
  Search,
  Done
}

export enum OpenEditDialog {
  Default = 1,
  Yes,
  No
}

export enum FrameLayoutTypes {
  TwoFramesHorizontal = 7901,
  TwoFramesVertical = 7902,
  ThreeFramesBottom = 7903,
  ThreeFramesRight = 7904,
  ThreeFramesTop = 7905,
  ThreeFramesLeft = 7906
}

export enum LineDirection {
  Horizontal,
  Vertical,
  NESW,
  NWSE
}

export enum ScrollBarThumbType {
  Incremental = 1,
  Absolute
}

export enum StorageAttribute {
  NONE = ' ',
  ALPHA = 'A',
  NUMERIC = 'N',
  DATE = 'D',
  TIME = 'T',
  BOOLEAN = 'B',
  MEMO = 'M',
  BLOB = 'O',
  BLOB_VECTOR = 'V',
  UNICODE = 'U',
  SKIP = '0',
  DOTNET = 'E'
}

export enum NotifyCollectionChangedAction {
  Add,
  Remove,
  Replace,
  Move,
  Reset
}
