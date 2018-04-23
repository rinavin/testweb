import {Commands, CommandType, DisplayConvertor, IEnvironment, Manager} from "@magic/gui";
import {Debug, Encoding, Hashtable, List, NotImplementedException, NString} from "@magic/mscorelib";
import {Constants, Logger, OSEnvironment, UtilDateJpn, UtilImeJpn, XMLConstants, XmlParser, UtilStrByteMode} from "@magic/utils";
import {ClientManager} from "../ClientManager";
import {CommandsProcessorManager} from "../CommandsProcessorManager";
import {EnvParamsTable} from "./EnvVariablesTable";
import {ConstInterface} from "../ConstInterface";

/// <summary>
///   This class holds some of the Magic environment parameters which the client needs
/// </summary>
export class Environment implements IEnvironment {
  private _environments: Hashtable<number, EnvironmentDetails> = new Hashtable<number, EnvironmentDetails>();
  private _contextInactivityTimeout: number = 0;
  private _toolitipTimeout: number = 0;
  private _contextUnloadTimeout: number = 0;
  private _accessTest: boolean = false; // property that enables the code for test tools
  private _canReplaceDecimalSeparator: boolean = false;
  private _closeTasksOnParentActivate: boolean = false;
  private _codePage: number = 0;
  private _dateSeparator: string = '\0'; // date separator
  private _decimalSeparator: string = '\0'; // decimal separator
  private _thousandsSeparator: string = '\0'; // thousands separator
  private _timeSeparator: string = '\0'; // time separator
  private _defaultColor: number = 0; // should we exit 'current' control when a non-parkable control is clicked
  private _defaultFocusColor: number = 0; // default focus color
  private _guid: string = null; // guid of the application
  private _controlsPersistencyPath: string = null;
  private _imeAutoOff: boolean = false; // JPN: IME support
  private _language: string = '\0';
  private _localAs400Set: boolean = false;
  private _localExtraGengo: string = null;
  private _localFlags: string = null;
  private _lowHigh: boolean = true; // what is the order of bytes in expressions (LOW_HIGH or HIGH_LOW)
  private _owner: string = null; // owner
  private _debugMode: number = 0;
  private _significantNumSize: number = 0;
  private _specialAnsiExpression: boolean = false;
  private _specialShowStatusBarPanes: boolean = false;
  private _specialEditLeftAlign: boolean = false;
  private _specialSwfControlName: boolean = false;
  private _specialExitCtrl: boolean = false;
  private _specialTextSizeFactoring: boolean = false;
  private _specialFlatEditOnClassicTheme: boolean = false;
  private _system: string = null;
  private _terminal: number = 0;
  private _userId: string = null;
  private _userInfo: string = null;
  private _forwardSlash: string = Constants.ForwardSlashWebUsage; // refer to a forward slash as a relative web url.
  private _dropUserFormats: string = null;

  get Language(): string {
    return this._language;
  }

  /// <summary>
  /// save special zorder
  /// </summary>
  SpecialOldZorder: boolean = false;

  /// <summary>
  /// This flag is only relevant for Online. Hence, return true in case of RC as it is the default value
  /// </summary>
  set SpecialNumpadPlusChar(value: boolean) {
  }

  get SpecialNumpadPlusChar(): boolean {
    return true;
  }

  IgnoreReplaceDecimalSeparator: boolean = false;

  set SpecialRestoreMaximizedForm(value: boolean) {
  }

  get SpecialRestoreMaximizedForm(): boolean {
    return false;
  }

  set SpecialIgnoreBGinModify(value: boolean) {
  }

  /// <summary>
  ///
  /// </summary>

  get SpecialIgnoreBGinModify(): boolean {
    return false;
  }

  /// <summary>instructs how to refer a forward slash - either as a relative web url, or as a file in the file system..</summary>
  set ForwardSlashUsage(value: string) {
    this._forwardSlash = value;
  }

  get ForwardSlashUsage(): string {
    return this._forwardSlash;
  }

  fillData(): void;
  fillData(tokensVector: List<string>): void;
  fillData(tokensVector?: List<string>): void {
    if (arguments.length === 0) {
      this.fillData_0();
      return;
    }
    this.fillData_1(tokensVector);
  }

  /// <summary>
  ///   Need part input String to relevant for the class data. end <env ...> tag
  /// </summary>
  public fillData_0(): void {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;
    let endContext: number = parser.getXMLdata().indexOf(XMLConstants.TAG_TERM, parser.getCurrIndex());
    if (endContext !== -1 && endContext < parser.getXMLdata().length) {
      // last position of its tag
      let tag: String = parser.getXMLsubstring(endContext);
      parser.add2CurrIndex(tag.indexOf(ConstInterface.MG_TAG_ENV) + ConstInterface.MG_TAG_ENV.length);
      let tokensVector: List<string> = XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);
      this.fillData(tokensVector);
      parser.setCurrIndex(endContext + XMLConstants.TAG_TERM.length);
    }
    else Logger.Instance.WriteExceptionToLogWithMsg("in Environment.FillData() out of string bounds");
  }

  /// <summary>
  ///   Make initialization of private elements by found tokens
  /// </summary>
  /// <param name = "tokensVector">found tokens, which consist attribute/value of every found element</param>
  private fillData_1(tokensVector: List<string>): void {
    let attribute: string;
    let valueStr: string;
    let hashKey: number;
    let env: EnvironmentDetails;
    let utilImeJpn: UtilImeJpn = Manager.UtilImeJpn;

    env = new EnvironmentDetails();

    for (let j: number = 0; j < tokensVector.length; j += 2) {
      attribute = (tokensVector.get_Item(j));
      valueStr = (tokensVector.get_Item(j + 1));
      valueStr = XmlParser.unescape(valueStr);
      switch (attribute) {
        case ConstInterface.MG_ATTR_THOUSANDS:
          this._thousandsSeparator = valueStr[0];
          break;
        case ConstInterface.MG_ATTR_DECIMAL_SEPARATOR:
          this._decimalSeparator = valueStr[0];
          break;
        case ConstInterface.MG_ATTR_DATE:
          this._dateSeparator = valueStr[0];
          DisplayConvertor.Instance.setDateChar(this._dateSeparator.charCodeAt(0));
          break;
        case ConstInterface.MG_ATTR_TIME:
          this._timeSeparator = valueStr[0];
          break;
        case ConstInterface.MG_ATTR_OWNER:
          this._owner = valueStr;
          break;
        case ConstInterface.MG_ATTR_SIGNIFICANT_NUM_SIZE:
          this._significantNumSize = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_DEBUG_MODE:
          this._debugMode = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_POINT_TRANSLATION:
          this._canReplaceDecimalSeparator = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_SPECIAL_EXITCTRL:
          this._specialExitCtrl = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_LOWHIGH:
          this._lowHigh = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_ACCESS_TEST:
          this._accessTest = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_SPECIAL_TEXT_SIZE_FACTORING:
          this._specialTextSizeFactoring = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_SPECIAL_FLAT_EDIT_ON_CLASSIC_THEME:
          this._specialFlatEditOnClassicTheme = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_ENCODING:
          if (valueStr !== " ") {
            this._codePage = XmlParser.getInt(valueStr);
            UtilStrByteMode.Encoding = this.GetEncoding();
          }
          break;
        case ConstInterface.MG_ATTR_SYSTEM:
          this._system = XmlParser.unescape(valueStr);
          break;
        case ConstInterface.MG_ATTR_COMPONENT:
          env.CompIdx = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_DATEMODE:
          env.DateMode = valueStr[0];
          break;
        case ConstInterface.MG_ATTR_CENTURY:
          env.Century = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_IDLETIME:
          env.IdleTime = XmlParser.getInt(valueStr);
          // handle the default idle time value
          if (env.IdleTime === 0)
            env.IdleTime = 1;
          break;
        case ConstInterface.MG_ATTR_UPD_IN_QUERY:
          env.UpdateInQueryMode = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_CRE_IN_MODIFY:
          env.CreateInModifyMode = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_DEFAULT_COLOR:
          this._defaultColor = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_DEFAULT_FOCUS_COLOR:
          this._defaultFocusColor = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_CONTEXT_INACTIVITY_TIMEOUT:
          this._contextInactivityTimeout = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_TOOLTIP_TIMEOUT:
          this._toolitipTimeout = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_CONTEXT_UNLOAD_TIMEOUT:
          this._contextUnloadTimeout = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_IME_AUTO_OFF:
          this._imeAutoOff = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_LOCAL_AS400SET:
          this._localAs400Set = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_LOCAL_EXTRA_GENGO:
          this._localExtraGengo = valueStr;
          UtilDateJpn.getInstance().addExtraGengo(this._localExtraGengo);
          break;
        case ConstInterface.MG_ATTR_LOCAL_FLAGS:
          this._localFlags = valueStr;
          break;
        case ConstInterface.MG_ATTR_SPEACIAL_ANSI_EXP:
          this._specialAnsiExpression = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_SPECIAL_SHOW_STATUSBAR_PANES:
          this._specialShowStatusBarPanes = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_SPECIAL_SPECIAL_EDIT_LEFT_ALIGN:
          this._specialEditLeftAlign = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_SPEACIAL_SWF_CONTROL_NAME:
          this._specialSwfControlName = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_LANGUAGE:
          this._language = valueStr[0];
          break;
        case ConstInterface.MG_ATTR_USERID:
          this._userId = valueStr;
          break;
        case ConstInterface.MG_TAG_USERNAME:
          ClientManager.Instance.setUsername(valueStr);
          break;
        case ConstInterface.MG_ATTR_TERMINAL:
          this._terminal = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_USERINFO:
          this._userInfo = valueStr;
          break;
        case ConstInterface.MG_ATTR_GUID:
          this._guid = valueStr;
          break;
        case ConstInterface.MG_ATTR_CONTROLS_PERSISTENCY_PATH:
          this._controlsPersistencyPath = valueStr;
          break;
        case ConstInterface.MG_ATTR_PROJDIR:
          env.ProjDir = valueStr;
          break;
        case ConstInterface.MG_ATTR_CLOSE_TASKS_ON_PARENT_ACTIVATE:
          this._closeTasksOnParentActivate = XmlParser.getBoolean(valueStr);
          break;
        case ConstInterface.MG_ATTR_DROP_USERFORMATS:
          this._dropUserFormats = valueStr;
          break;
        default:
          Logger.Instance.WriteExceptionToLogWithMsg("in Environment.fillData(): unknown attribute: " + attribute);
          break;
      }
    }
    hashKey = env.CompIdx;
    this._environments.set_Item(hashKey, env);

    if (this._accessTest)
      Commands.addAsync(CommandType.SET_ENV_ACCESS_TEST, null, 0, this._accessTest);

    // TODO: somehow addAsync throws some exception for SET_ENV_TOOLTIP_TIMEOUT. Evaluate and fix it, if possible
    // if (this._toolitipTimeout > 0)
    //   Commands.addAsync(CommandType.SET_ENV_TOOLTIP_TIMEOUT, <Object>null, <Object>this._toolitipTimeout);

    if (this._specialTextSizeFactoring)
      Commands.addAsync(CommandType.SET_ENV_SPECIAL_TEXT_SIZE_FACTORING, null, 0, this._specialTextSizeFactoring);

    if (this._specialFlatEditOnClassicTheme)
      Commands.addAsync(CommandType.SET_ENV_SPECIAL_FLAT_EDIT_ON_CLASSIC_THEME, null, 0, this._specialFlatEditOnClassicTheme);

    if (this._language !== ' ')
      Commands.addAsync(CommandType.SET_ENV_LAMGUAGE, null, 0, this._language.charCodeAt(0));
  }

  /// <summary>
  ///   fill the file mapping when passed through the cache: placed into the cache by the runtime-engine, passed
  ///   as '<fileurl val = "/..."'
  /// </summary>
  /// <param name = "TAG_URL"></param>
  fillFromUrl(tagName: string): void {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;
    let XMLdata: string = parser.getXMLdata();

    let endContext: number = parser.getXMLdata().indexOf(XMLConstants.TAG_TERM, parser.getCurrIndex());
    if (endContext !== -1 && endContext < XMLdata.length) {

      // find last position of its tag
      let tagAndAttributes: string = parser.getXMLsubstring(endContext);
      parser.add2CurrIndex(tagAndAttributes.indexOf(tagName) + tagName.length);

      let tokensVector: List<string> = XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);
      Debug.Assert(tokensVector.get_Item(0) === XMLConstants.MG_ATTR_VALUE);

      let cachedFileUrl: string = (tokensVector.get_Item(1));
      if (cachedFileUrl.trim() === "")
      // might happen in case the xpa server failed to write to its cache folder
      // (e.g. the cache folder is invalid, due to a configuration mistake,
      // in which case the current error message will be matched with an error in the xpa server's log file (GeneralErrorLog=)).
        Logger.Instance.WriteErrorToLog(NString.Format("Empty cached file URL: '{0}'", tagAndAttributes.trim()));
      else {
        let Content: string = CommandsProcessorManager.GetContent(cachedFileUrl);
        try {
          switch (tagName) {
            case ConstInterface.MG_TAG_KBDMAP_URL:
              ClientManager.Instance.getKbdMap().fillKbdMapTable(Content);
              break;
            case ConstInterface.MG_TAG_ENV_PARAM_URL:
              let innerXmlParser: XmlParser = new XmlParser(Content);
              while (ClientManager.Instance.getEnvParamsTable().mirrorFromXML(innerXmlParser.getNextTag(), innerXmlParser)) {

              }
              break;
          }
        }
        catch (ex) {
          switch (tagName) {
            case ConstInterface.MG_TAG_KBDMAP_URL:
              Logger.Instance.WriteExceptionToLogWithMsg(NString.Format("Keyboard Mapping: '{0}'{1}{2}", cachedFileUrl, OSEnvironment.EolSeq, ex.Message));
              break;
            case ConstInterface.MG_TAG_ENV_PARAM_URL:
              Logger.Instance.WriteExceptionToLogWithMsg(NString.Format("Env Params Table: '{0}'{1}{2}", cachedFileUrl, OSEnvironment.EolSeq, ex.Message));
          }
        }

      }
      endContext = XMLdata.indexOf(XMLConstants.TAG_OPEN, endContext);
      if (endContext !== -1)
        parser.setCurrIndex(endContext);
    }
  }

  /// <summary>
  ///   get EnvironmentDetails with the corresponding compIdx
  /// </summary>
  /// <param name = "compIdx">of the task</param>
  /// <returns> reference to the current EnvironmentDetails</returns>
  private getEnvDet(compIdx: number): EnvironmentDetails {
    let environmentDetails: EnvironmentDetails = <EnvironmentDetails>this._environments.get_Item(compIdx);

    if (environmentDetails === null)
      Logger.Instance.WriteExceptionToLogWithMsg("in Environment.getEnvDet() there is no env");
    return environmentDetails;
  }

  /// <summary>
  ///   return the date mode
  /// </summary>
  /// <param name = "compIdx">of the task</param>
  /// <returns> DateMode</returns>
  GetDateMode(compIdx: number): string {
    return this.getEnvDet(compIdx).DateMode;
  }

  /// <summary>
  ///   return the Thousands
  /// </summary>
  /// <returns> Thousands</returns>
  GetThousands(): string {
    return this._thousandsSeparator;
  }

  /// <summary>
  ///   return the Decimal
  /// </summary>
  /// <returns> Decimal</returns>
  GetDecimal(): string {
    return this._decimalSeparator;
  }

  /// <summary>
  ///   sets the Decimal
  /// </summary>
  setDecimalSeparator(value: string): void {
    this._decimalSeparator = value;
  }

  setDateSeparator(value: string): void {
    this._dateSeparator = value;
  }

  setTimeSeparator(value: string): void {
    this._timeSeparator = value;
  }

  /// <summary>
  ///   return the Date Separator
  /// </summary>
  /// <returns> Date Separator</returns>
  GetDate(): string {
    return this._dateSeparator;
  }

  /// <summary>
  ///   return the IdleTime
  /// </summary>
  /// <param name = "compIdx">of the task</param>
  /// <returns> IdleTime</returns>
  getIdleTime(compIdx: number): number {
    return this.getEnvDet(compIdx).IdleTime;
  }

  /// <summary>
  ///   return the owner
  /// </summary>
  /// <returns> owner</returns>
  getOwner(): string {
    return this._owner;
  }

  /// <summary>
  ///   return the time separator
  /// </summary>
  /// <returns> time seperator</returns>
  GetTime(): string {
    return this._timeSeparator;
  }

  /// <summary>
  ///   return the century
  /// </summary>
  /// <param name = "compIdx">of the task</param>
  /// <returns>century</returns>
  GetCentury(compIdx: number): number {
    return this.getEnvDet(compIdx).Century;
  }

  /// <summary>
  ///   return TRUE if update is allowed in query mode
  /// </summary>
  /// <param name = "compIdx">of the task</param>
  /// <returns> UpdateInQueryMode</returns>
  allowUpdateInQueryMode(compIdx: number): boolean {
    return this.getEnvDet(compIdx).allowUpdateInQueryMode();
  }

  /// <summary>
  ///   return TRUE if create is allowed in modify mode
  /// </summary>
  /// <param name = "compIdx">of the task</param>
  /// <returns> allowCreateInModifyMode</returns>
  allowCreateInModifyMode(compIdx: number): boolean {
    return this.getEnvDet(compIdx).allowCreateInModifyMode();
  }

  /// <summary>
  ///   return the significant num size
  /// </summary>
  /// <returns> the significant num size</returns>
  GetSignificantNumSize(): number {
    return this._significantNumSize;
  }

  /// <summary>
  ///   set the significant num size
  /// </summary>
  /// <returns></returns>
  setSignificantNumSize(newSize: number): void {
    this._significantNumSize = newSize;
  }

  /// <summary>
  ///   return the code page
  /// </summary>
  /// <returns> the code page
  /// </returns>
  getCodePage(): number {
    return this._codePage;
  }

  /// <summary>
  ///   get charset of the current document
  /// </summary>
  GetEncoding(): Encoding {
    let encoding: Encoding;
    try {
      encoding = Encoding.GetEncoding(this._codePage);
    }
    catch (exception) {
      encoding = null;
    }
    return encoding;
  }


  /// <summary>
  ///   return the system name
  /// </summary>
  /// <returns> the system name
  /// </returns>
  getSystem(): string {
    return this._system;
  }

  /// <summary>
  ///   returns the debug level
  /// </summary>
  /// <returns> 0 no debug 1 debug 2 debug and data transfers in hex ( not in base64)
  /// </returns>
  GetDebugLevel(): number {
    return this._debugMode;
  }

  /// <summary>
  ///   returns if '.' should be changed to the decimal separator
  /// </summary>
  CanReplaceDecimalSeparator(): boolean {
    return !this.IgnoreReplaceDecimalSeparator && this._canReplaceDecimalSeparator;
  }

  /// <summary>
  ///   return the ContextInactivityTimeout
  /// </summary>
  /// <returns> the ContextInactivityTimeout</returns>
  getContextInactivityTimeout(): number {
    return this._contextInactivityTimeout;
  }

  /// <summary>
  ///   return the ContextUnloadTimeout
  /// </summary>
  getContextUnloadTimeout(): number {
    return this._contextUnloadTimeout;
  }

  /// <summary>
  ///   return the tooltip timeout
  /// </summary>
  /// <returns> the tooltipTimeout</returns>
  GetTooltipTimeout(): number {
    return this._toolitipTimeout;
  }

  /// <summary>
  /// return the SpecialEditLeftAlign
  /// </summary>
  /// <returns></returns>
  GetSpecialEditLeftAlign(): boolean {
    return this._specialEditLeftAlign;
  }

  /// <summary>
  ///   returns TRUE if the bytes sequence for numbers in expressions is from low to high
  /// </summary>
  getLowHigh(): boolean {
    return this._lowHigh;
  }

  /// <summary>
  ///   get default color
  /// </summary>
  /// <returns></returns>
  GetDefaultColor(): number {
    return this._defaultColor;
  }

  /// <summary>
  /// Get default focus color
  /// </summary>
  /// <returns></returns>
  GetDefaultFocusColor(): number {
    return this._defaultFocusColor;
  }

  /// <summary>
  ///   returns if we should exit 'current' control when a non-parkable control is clicked
  /// </summary>
  getSpecialExitCtrl(): boolean {
    return this._specialExitCtrl;
  }

  /// <summary>
  ///   return true if IMEAutoOff = Y
  ///   (JPN: IME support)
  /// </summary>
  GetImeAutoOff(): boolean {
    return this._imeAutoOff;
  }

  /// <summary>
  ///   return true if As400Set flag = Y
  ///   (DBCS Support)
  /// </summary>
  GetLocalAs400Set(): boolean {
    return this._localAs400Set;
  }

  /// <summary>Function returning additional Gengo value.
  /// </summary>
  getLocalExtraGengo(): string {
    return this._localExtraGengo;
  }

  /// <summary>Function to check whether flag f is in the local flags.
  /// </summary>
  GetLocalFlag(f: string): boolean {
    return this._localFlags !== null && this._localFlags.indexOf(f) >= 0;
  }

  /// <summary>
  /// </summary>
  /// <returns> true if SpecialAnsiExpression flag = Y</returns>
  getSpecialAnsiExpression(): boolean {
    return this._specialAnsiExpression;
  }

  getSpecialShowStatusBarPanes(): boolean {
    return this._specialShowStatusBarPanes;
  }

  /// <summary>
  ///   Function returns the terminal number.
  /// </summary>
  /// <returns>terminal number.</returns>
  getTerminal(): number {
    return this._terminal;
  }

  /// <summary>
  ///   Function returns user ID of currently logged in user.
  /// </summary>
  /// <returns>user id.</returns>
  getUserID(): string {
    return this._userId;
  }

  /// <summary>
  ///   Function returning user info of currently logged in user.
  /// </summary>
  /// <returns>user info</returns>
  getUserInfo(): string {
    return this._userInfo;
  }

  /// <summary>gets gui Id of the application</summary>
  /// <returns></returns>
  GetGUID(): string {
    return this._guid;
  }

  /// <summary>
  /// Get ControlsPersistencyPath
  /// </summary>
  /// <returns></returns>
  GetControlsPersistencyPath(): string {
    return this._controlsPersistencyPath;
  }

  /// <summary>
  ///   return the project's dir
  /// </summary>
  /// <param name="compIdx">component index.</param>
  /// <returns></returns>
  getProjDir(compIdx: number): string {
    return this.getEnvDet(compIdx).ProjDir;
  }

  /// <summary>
  /// flag SpecialENGLogon is not available for RC so return false.
  /// </summary>
  /// <returns></returns>
  GetSpecialEngLogon(): boolean {
    return false;
  }

  /// <summary>
  /// flag SpecialENGLogon is not available for RC so return false.
  /// </summary>
  /// <returns></returns>
  GetSpecialIgnoreButtonFormat(): boolean {
    return false;
  }


  /// <summary>
  /// returns value of SpecialSWFControlNameProperty.
  /// </summary>
  /// <returns></returns>
  GetSpecialSwfControlNameProperty(): boolean {
    return this._specialSwfControlName;
  }

  /// <summary>
  /// returns value of SpecialLogInternalExceptions.
  /// </summary>
  /// <returns></returns>
  GetSpecialLogInternalExceptions(): boolean {
    return true;
  }

  /// <summary>
  ///   sets the closeTasksOnParentActivate flag value.
  /// </summary>
  /// <returns></returns>
  setCloseTasksOnParentActivate(val: boolean): void {
    this._closeTasksOnParentActivate = val;
  }

  /// <summary>
  ///   return the closeTasksOnParentActivate flag value.
  /// </summary>
  /// <returns></returns>
  CloseTasksOnParentActivate(): boolean {
    return this._closeTasksOnParentActivate;
  }

  /// <summary>
  ///   Set the owner
  /// </summary>
  /// <param name = "val"></param>
  setOwner(val: string): void {
    this._owner = val;
  }

  /// <summary>
  ///   Set the date mode in the component's environment
  /// </summary>
  /// <param name = "compIdx"></param>
  /// <param name = "val"></param>
  setDateMode(compIdx: number, val: string): void {
    this.getEnvDet(compIdx).DateMode = val;
  }

  /// <summary>
  ///   Set the century in the component's environment
  /// </summary>
  /// <param name = "compIdx"></param>
  /// <param name = "val"></param>
  setCentury(compIdx: number, val: number): void {
    this.getEnvDet(compIdx).Century = val;
  }

  /// <summary>
  ///   Set the idle time in the component's environment
  /// </summary>
  /// <param name = "compIdx"></param>
  /// <param name = "val"></param>
  setIdleTime(compIdx: number, val: number): void {
    this.getEnvDet(compIdx).IdleTime = val;
  }

  /// <summary>
  ///   Set the allow-update-in-qury-mode flag in the component's environment
  /// </summary>
  /// <param name = "compIdx"></param>
  /// <param name = "val"></param>
  setAllowUpdateInQueryMode(compIdx: number, val: boolean): void {
    this.getEnvDet(compIdx).UpdateInQueryMode = val;
  }

  /// <summary>
  ///   Set the allow-create-in-modify-mode flag in the component's environment
  /// </summary>
  /// <param name = "compIdx"></param>
  /// <param name = "val"></param>
  setAllowCreateInModifyMode(compIdx: number, val: boolean): void {
    this.getEnvDet(compIdx).CreateInModifyMode = val;
  }

  /// <summary>
  ///   set the context timeout
  /// </summary>
  /// <param name = "val"></param>
  setContextInactivityTimeout(val: number): void {
    this._contextInactivityTimeout = val;
  }

  /// <summary>
  ///   set the context unload timeout
  /// </summary>
  /// <param name = "val"></param>
  setContextUnloadTimeout(val: number): void {
    this._contextUnloadTimeout = val;
  }

  /// <summary>
  ///   set the terminal number
  /// </summary>
  /// <param name = "val"></param>
  setTerminal(val: number): void {
    this._terminal = val;
  }

  /// <summary>
  ///  Get the UserFormats for Drag & Drop Operation.
  /// </summary>
  /// <returns></returns>
  GetDropUserFormats(): string {
    return this._dropUserFormats;
  }

  /// <summary>
  /// get GetSpecialTextSizeFactoring flag
  /// </summary>
  /// <returns></returns>
  GetSpecialTextSizeFactoring(): boolean {
    return this._specialTextSizeFactoring;
  }

  /// <summary>
  /// get GetSpecialFlatEditOnClassicTheme flag
  /// </summary>
  /// <returns></returns>
  GetSpecialFlatEditOnClassicTheme(): boolean {
    return this._specialFlatEditOnClassicTheme;
  }

  /// <summary>
  /// return special zorder
  /// </summary>
  /// <returns></returns>
  GetSpecialOldZorder(): boolean {
    return false;
  }

  GetSpecialDisableMouseWheel(): boolean {
    throw new NotImplementedException();
  }
}

/// <summary>
///   This class holds details for single Environment (per Component)
/// </summary>
export class EnvironmentDetails {
  private _createInModifyMode: boolean = false; // allow create in modify mode ?
  private _updateInQueryMode: boolean = false; // allow update in query mode ?

  CompIdx: number = 0;
  DateMode: string = '\0';
  Century: number = 0;
  IdleTime: number = 0;

  set UpdateInQueryMode(value: boolean) {
    this._updateInQueryMode = value;
  }

  set CreateInModifyMode(value: boolean) {
    this._createInModifyMode = value;
  }

  ProjDir: string = null;

  /// <summary>
  ///   constructor
  /// </summary>
  constructor() {
    this.CompIdx = 0;
  }

  /// <summary>
  ///   return TRUE if update is allowed in query mode
  /// </summary>
  allowUpdateInQueryMode(): boolean {
    return this._updateInQueryMode;
  }

  /// <summary>
  ///   return TRUE if update is allowed in query mode
  /// </summary>
  allowCreateInModifyMode(): boolean {
    return this._createInModifyMode;
  }
}
