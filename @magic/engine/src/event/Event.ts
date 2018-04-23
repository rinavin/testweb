import {
  ApplicationException,
  Char,
  Exception,
  HashUtils,
  Int32,
  List,
  NNumber,
  NString,
  NumberStyles,
  RefParam,
  StringBuilder
} from "@magic/mscorelib";
import {
  Base64,
  CallOsShow,
  ForceExit,
  InternalInterface,
  Logger,
  Misc,
  StorageAttribute,
  StrUtil,
  XMLConstants,
  XmlParser
} from "@magic/utils";
import {
  BlobType,
  DisplayConvertor,
  GuiMenuEntry_MenuType,
  KeyboardItem,
  MenuEntryEvent,
  MenuEntryOSCommand,
  Modifiers,
  PIC,
  RecordUtils,
  TaskDefinitionId,
  TaskDefinitionIdTableSaxHandler
} from "@magic/gui";
import {Expression} from "../exp/Expression";
import {ClientManager} from "../ClientManager";
import {ConstInterface} from "../ConstInterface";
import {Field} from "../data/Field";
import {Task} from "../tasks/Task";
import {MGDataCollection} from "../tasks/MGDataCollection";

/// <summary>
///   this class represent the event entity
/// </summary>
export class Event {
  // ATTENTION !
  // any change to the member variables must be followed by a change to the CTOR that
  // gets one argument of the type 'Event'.
  private static _lastTimestamp: number = 0; // last timestamp
  Exp: Expression = null; // for expression events - the expression number
  _forceExit: ForceExit = ForceExit.None; // The “force exit?is one of: Record, Control, None. This attribute is relevant only for events in the “user events?table.
  kbdItm: KeyboardItem = null; // for system events
  private _osCommandShow: CallOsShow = 0;
  private _osCommandText: string = null;
  private _osCommandWait: boolean = false;
  _paramAttrs: string = null;
  _paramNulls: string = null;
  _paramVals: string[] = null;
  _parameters: number = 0;
  private _returnExp: number = 0;
  /* expression number to specify the Function's return value */
  _seconds: number = Int32.MinValue; // for timer events
  _timestamp: number = 0;
  _type: string = Char.MinValue; // System|Internal|Timer|Expression|User|None
  private _userDefinedFuncName: string = null;
  private _userDefinedFuncNameHashCode: number = 0;
  private _userEvtDesc: string = "";
  _userEvtIdx: number = Int32.MinValue; // the index of the user event in the tasks user events table

  private ownerTaskDefinitionId: TaskDefinitionId = null;
  InternalEvent: number = 0; // internal event code
  PrgDescription: string = null;
  PublicName: string = null;
  UserEvt: Event = null;
  UserEvtTaskTag: string = null;

  constructor();
  constructor(evt: Event);
  constructor(menuEntryEvent: MenuEntryEvent, ctlIdx: number);
  constructor(osCommand: MenuEntryOSCommand);
  constructor(aType: string);
  constructor(evtOrMenuEntryEventOrOsCommandOrAType?: any, ctlIdx?: number) {
    if (arguments.length === 0)
      this.constructor_0();
    else if (arguments.length === 1 && (evtOrMenuEntryEventOrOsCommandOrAType === null || evtOrMenuEntryEventOrOsCommandOrAType instanceof Event))
      this.constructor_1(evtOrMenuEntryEventOrOsCommandOrAType);
    else if (arguments.length === 1 && (evtOrMenuEntryEventOrOsCommandOrAType === null || evtOrMenuEntryEventOrOsCommandOrAType instanceof MenuEntryOSCommand))
      this.constructor_3(evtOrMenuEntryEventOrOsCommandOrAType);
    else if (arguments.length === 2)
      this.constructor_2(evtOrMenuEntryEventOrOsCommandOrAType, ctlIdx);
    else
      this.constructor_4(evtOrMenuEntryEventOrOsCommandOrAType);
  }

  /// <summary>
  ///   CTOR
  /// </summary>
  private constructor_0(): void {
    this.InternalEvent = Int32.MinValue;
    this.setTimestamp();
  }

  /// <summary>
  ///   copy CTOR
  /// </summary>
  private constructor_1(evt: Event): void {
    this._type = evt._type;
    this.kbdItm = evt.kbdItm;
    this.InternalEvent = evt.InternalEvent;
    this._seconds = evt._seconds;
    this.Exp = evt.Exp;
    this._forceExit = evt._forceExit;
    this.UserEvt = evt.UserEvt;
    this.UserEvtTaskTag = evt.UserEvtTaskTag;
    this._userEvtIdx = evt._userEvtIdx;
  }

  /// <summary>
  ///   This constructor creates a matching event object for the passed menuEntryEvent
  /// </summary>
  /// <param name = "menuEntryEvent"> event menu entry for which we create this event </param>
  /// <param name = "ctlIdx"> current ctl idx </param>
  private constructor_2(menuEntryEvent: MenuEntryEvent, ctlIdx: number): void {
    this.constructor_0();
    // set the event type according to menu type
    if (menuEntryEvent.menuType() === GuiMenuEntry_MenuType.INTERNAL_EVENT) {
      this.setType(ConstInterface.EVENT_TYPE_INTERNAL);
      this.setInternal(menuEntryEvent.InternalEvent);
    }
    else if (menuEntryEvent.menuType() === GuiMenuEntry_MenuType.SYSTEM_EVENT) {
      this.setType(ConstInterface.EVENT_TYPE_SYSTEM);
      this.setKeyboardItem(menuEntryEvent.KbdEvent);
    }
    else {
      // menuEntryEvent.menuType() == MenuType.MENU_TYPE_USER_EVENT
      let mainProgTask: Task = MGDataCollection.Instance.GetMainProgByCtlIdx(ctlIdx);
      this.UserEvt = mainProgTask.getUserEvent(this._userEvtIdx);
      this.setType(ConstInterface.EVENT_TYPE_USER);
      this.UserEvtTaskTag = mainProgTask.getTaskTag();
      this._userEvtIdx = menuEntryEvent.UserEvtIdx - 1;
    }
  }

  /// <summary>
  ///   Create an Event for the passed os menu entry
  /// </summary>
  /// <param name = "osCommand">- the selected os command menu entry </param>
  private constructor_3(osCommand: MenuEntryOSCommand): void {
    this.constructor_0();
    this.setType(ConstInterface.EVENT_TYPE_MENU_OS);
    this.setOsCommandText(osCommand.OsCommand);
    this.setOsCommandWait(osCommand.Wait);
    this.setOsCommandShow(osCommand.Show);
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="aType"></param>
  private constructor_4(aType: string): void {
    this.setType(aType);
  }

  get ForceExit(): ForceExit {
    return this._forceExit;
  }

  /// <summary>
  ///   Need part input String to relevant for the class data.
  ///   index of end <event ...> tag
  /// </summary>
  /// <param name = "xmlParser"></param>
  /// <param name = "taskRef"></param>
  fillData(xmlParser: XmlParser, taskRef: Task): void {
    let userValue: string
    let endContext: number = xmlParser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, xmlParser.getCurrIndex());
    if (endContext !== -1 && endContext < xmlParser.getXMLdata().length) {
      // last position of its tag
      let tag: string = xmlParser.getXMLsubstring(endContext);
      xmlParser.add2CurrIndex(tag.indexOf(ConstInterface.MG_TAG_EVENT) + ConstInterface.MG_TAG_EVENT.length);

      let tokensVector: List<string> = XmlParser.getTokens(xmlParser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);

      let refUserValue: RefParam<string> = new RefParam(userValue);

      this.initElements(tokensVector, taskRef, refUserValue);
      userValue = refUserValue.value;

      xmlParser.setCurrIndex(endContext + XMLConstants.TAG_CLOSE.length); // to delete ">" too

      this.InitInnerObjects(xmlParser);

      if (userValue !== null)
        this.InitUserData(taskRef, userValue);
    }
    else
      Logger.Instance.WriteExceptionToLogWithMsg("in Event.FillData() out of string bounds");
  }

  private InitInnerObjects(xmlParser: XmlParser): void {
    let nextTag: string = xmlParser.getNextTag();
    switch (nextTag) {
      case XMLConstants.MG_TAG_TASKDEFINITIONID_ENTRY:
        let xmlBuffer: string = xmlParser.ReadToEndOfCurrentElement();
        this.InitTaskDefinitionId(xmlBuffer);

        let endContext: number = xmlParser.getXMLdata().indexOf(ConstInterface.MG_TAG_EVENT + XMLConstants.TAG_CLOSE, xmlParser.getCurrIndex());
        xmlParser.setCurrIndex(endContext + (ConstInterface.MG_TAG_EVENT + XMLConstants.TAG_CLOSE).length);
        break;
      default:
        break;
    }
  }

  /// <summary>
  ///   Make initialization of private elements by found tokens
  /// </summary>
  /// <param name = "tokensVector">found tokens, which consist attribute/value of every foundelement</param>
  /// <param name = "taskRef"></param>
  private initElements(tokensVector: List<string>, taskRef: Task, refUserValue: RefParam<string>): void {
    let modifier: Modifiers = Modifiers.MODIFIER_NONE;
    let keyCode: number = -1;
    refUserValue.value = null;
    for (let j: number = 0; j < tokensVector.length; j += 2) {
      let attribute: string = (tokensVector.get_Item(j));
      let valueStr: string = (tokensVector.get_Item(j + 1));

      switch (attribute) {
        case ConstInterface.MG_ATTR_EVENTTYPE:
          this._type = valueStr[0];
          break;
        // System|Internal|User|Timer|Expression|Recompute
        case ConstInterface.MG_ATTR_MODIFIER:
          modifier = <Modifiers>valueStr[0];
          break;
        // Alt|Ctrl|Shift|None
        case ConstInterface.MG_ATTR_INTERNALEVENT:
          this.InternalEvent = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_KEYCODE:
          keyCode = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_SECONDS:
          this._seconds = XmlParser.getInt(valueStr);
          break;
        case XMLConstants.MG_ATTR_EXP:
          // for expression events - the expression number
          this.Exp = taskRef.getExpById(XmlParser.getInt(valueStr));
          break;
        case ConstInterface.MG_ATTR_FORCE_EXIT:
          this._forceExit = <ForceExit>valueStr[0];
          break;
        case ConstInterface.MG_ATTR_DESC:
          this._userEvtDesc = XmlParser.unescape(valueStr);
          break;
        case ConstInterface.MG_ATTR_PUBLIC:
          this.PublicName = XmlParser.unescape(valueStr);
          break;
        case ConstInterface.MG_ATTR_PARAMS:
          this._parameters = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_ATTR_PAR_ATTRS:
          this._paramAttrs = valueStr;
          break;
        case XMLConstants.MG_ATTR_VALUE:
          let paramStr: string = XmlParser.unescape(valueStr);
          this._paramVals = new Array(this._parameters);
          // put the paramVals in place
          this.parseParamVal(paramStr);
          break;
        case ConstInterface.MG_ATTR_NULLS:
          this._paramNulls = valueStr;
          break;
        case ConstInterface.MG_ATTR_USER:
          refUserValue.value = valueStr;
          break;
        // USER event
        case XMLConstants.MG_ATTR_NAME:
          this.setUserDefinedFuncName(valueStr);
          break;
        case ConstInterface.MG_TAG_USR_DEF_FUC_RET_EXP_ID:
          this._returnExp = XmlParser.getInt(valueStr);
          break;
        case ConstInterface.MG_TAG_USR_DEF_FUC_RET_EXP_ATTR:
          break;
        default:
          Logger.Instance.WriteExceptionToLogWithMsg(NString.Format("There is no such tag in Event class. Insert case to Event.initElements for {0}", attribute));
          break;
      }
    }
    if (this._type === ConstInterface.EVENT_TYPE_SYSTEM)
      this.kbdItm = new KeyboardItem(keyCode, modifier);
  }

  /// <summary>
  /// Perform the initialization code from the "user" attribute string
  /// </summary>
  /// <param name="valueStr"></param>
  /// <param name="taskRef"></param>
  private InitUserData(taskRef: Task, userValue: string): void {
    let comma: number = userValue.indexOf(",");
    if (comma > -1) {
      let ueTaskId: string = userValue.substr(0, comma);
      if (taskRef !== null)
        ueTaskId = taskRef.TaskService.GetEventTaskId(taskRef, ueTaskId, this);

      let ueTask: Task = <Task>MGDataCollection.Instance.GetTaskByID(ueTaskId);

      let ueIdx: number = XmlParser.getInt(userValue.substr(comma + 1));

      if (ueTask !== null) {
        this.UserEvt = ueTask.getUserEvent(ueIdx);
        if (this.UserEvt === null) {
          throw new ApplicationException("in Event.fillData(): user event not found. task id = " + ueTaskId +
            ", user event index = " + ueIdx);
        }
        this.UserEvtTaskTag = ueTaskId;
        this._userEvtIdx = ueIdx;
      }
      // the task hasn't been found, it not parsed, yet
      else {
        this.UserEvtTaskTag = ueTaskId;
        this._userEvtIdx = ueIdx;
        this.UserEvt = null; // can not be initialized on this step
      }
    }
  }

  private InitTaskDefinitionId(xmlBuffer: string): void {
    let handler: TaskDefinitionIdTableSaxHandler = new TaskDefinitionIdTableSaxHandler(this.SetTaskDefinitionId);
    handler.parse(xmlBuffer);
  }

  /// <summary>
  /// callback for the sax parser
  /// </summary>
  /// <param name="taskDefinitionId"></param>
  /// <param name="xmlId"></param>
  /// <param name="defaultTagList"></param>
  private SetTaskDefinitionId(taskDefinitionId: TaskDefinitionId): void {
    this.ownerTaskDefinitionId = taskDefinitionId;
  }

  /// <summary>
  ///   find task for User Event if it was not found during parsing
  /// </summary>
  findUserEvent(): void {
    if (this._type === ConstInterface.EVENT_TYPE_USER && this.UserEvt === null) {
      let ueTask: Task = <Task>MGDataCollection.Instance.GetTaskByID(this.UserEvtTaskTag);
      if (ueTask !== null)
        this.UserEvt = ueTask.getUserEvent(this._userEvtIdx);

      if (this.UserEvt === null)
        throw new ApplicationException(NString.Format("in Event.findUserEvent(): user event not found. task id = {0} doesn't exist", this.UserEvtTaskTag));

    }
  }

  /// <summary>
  ///   compare this event to another - returns true if and only if the events are identical
  /// </summary>
  equals(evt: Event): boolean {
    let bEqual: boolean = false;

    // compare references
    if (this === evt)
      bEqual = true;
    // do shallow comparision
    else if (this._type === evt._type) {
      switch (this._type) {
        case ConstInterface.EVENT_TYPE_SYSTEM:
          bEqual = this.kbdItm.equals(evt.kbdItm);
          break;

        case ConstInterface.EVENT_TYPE_INTERNAL:
          bEqual = (this.InternalEvent === evt.InternalEvent);
          break;

        case ConstInterface.EVENT_TYPE_TIMER:
          bEqual = (this._seconds === evt._seconds);
          break;

        case ConstInterface.EVENT_TYPE_EXPRESSION:
        case ConstInterface.EVENT_TYPE_PUBLIC:
          bEqual = (this.Exp === evt.Exp);
          break;

        case ConstInterface.EVENT_TYPE_USER:
          bEqual = (this.UserEvt === evt.UserEvt);
          break;

        case ConstInterface.EVENT_TYPE_USER_FUNC:
          if (this._userDefinedFuncNameHashCode === evt.getUserDefinedFuncNameHashCode()) {
            if (NString.Equals(evt.getUserDefinedFuncName(), this._userDefinedFuncName, true))
              bEqual = true;
          }
          break;

        default:
          bEqual = false;
          break;
      }
    }

    // For internal events, compare the internal names
    if (this._type === ConstInterface.EVENT_TYPE_PUBLIC || evt._type === ConstInterface.EVENT_TYPE_PUBLIC) {
      let name1: String = null;
      let name2: String = null;
      if (this._type !== ConstInterface.EVENT_TYPE_USER && evt._type !== ConstInterface.EVENT_TYPE_USER)
        bEqual = false;
      else if (this._type === ConstInterface.EVENT_TYPE_PUBLIC) {
        name1 = this.PublicName;
        name2 = evt.getUserEvent().PublicName;
      }
      else {
        name1 = evt.PublicName;
        name2 = this.getUserEvent().PublicName;
      }
      if (name1 === null || name2 === null)
        bEqual = false;
      else
        bEqual = (name1 === name2);
    }
    else if (this._type === ConstInterface.EVENT_TYPE_INTERNAL && evt._type === ConstInterface.EVENT_TYPE_SYSTEM) {
      if (ClientManager.Instance.getCurrTask() !== null && (ClientManager.Instance.EventsManager.getMatchingAction(ClientManager.Instance.getCurrTask(), evt.getKbdItm(), false)) === this.getInternalCode())
        bEqual = true;
    }
    else if (this._type === ConstInterface.EVENT_TYPE_USER && evt._type !== ConstInterface.EVENT_TYPE_USER) {
      // before using the user event, check that it is valid
      this.findUserEvent();

      // if one event of the two is a user event and the other isn't then
      // compare the trigger of the user event to the non-user event
      bEqual = this.UserEvt.equals(evt);
    }
    return bEqual;
  }

  /// <summary>
  ///   set the internal name
  /// </summary>
  setPublicName(): void {
    // For a runtime internal event - calculate the internal name.
    if (this._type === ConstInterface.EVENT_TYPE_PUBLIC && this.Exp !== null) {
      this.PublicName = (this.Exp.evaluateWithResLength(255)).mgVal;
      if (this.PublicName !== null)
        this.PublicName = StrUtil.rtrim(this.PublicName);
    }
  }

  /// <summary>
  ///   set an Internal event
  /// </summary>
  /// <param name = "code">the code of the internal event </param>
  setInternal(code: number): void {
    this._type = ConstInterface.EVENT_TYPE_INTERNAL;
    this.InternalEvent = code;

    // MG_ACT_HIT/MG_ACT_CTRL_HIT are caused by mouse click. In this case
    // time of last user action for IDLE function should be re-evaluated.
    if (code === InternalInterface.MG_ACT_HIT || code === InternalInterface.MG_ACT_CTRL_HIT)
      ClientManager.Instance.LastActionTime = Misc.getSystemMilliseconds();
  }

  /// <summary>
  ///   set an Expression event
  /// </summary>
  /// <param name = "expRef">a reference to the expression object </param>
  setExpression(expRef: Expression): void {
    this._type = ConstInterface.EVENT_TYPE_EXPRESSION;
    this.Exp = expRef;
  }

  /// <summary>
  ///   get Expression of the event
  /// </summary>
  getExpression(): Expression {
    return this.Exp;
  }

  /// <summary>
  ///   get UserEvent description
  /// </summary>
  private getUsrEvntDesc(): string {
    return (this.UserEvt !== null) ? this.UserEvt._userEvtDesc : this._userEvtDesc;
  }

  /// <summary>
  ///   set a System event
  /// </summary>
  /// <param name = "keyboardItem">the keyboard item object </param>
  setSystem(keyboardItem: KeyboardItem): void {
    this._type = ConstInterface.EVENT_TYPE_SYSTEM;
    this.kbdItm = keyboardItem;
  }

  /// <summary>
  ///   set a System event
  /// </summary>
  /// <param name = "keyboardItem">the keyboard item object </param>
  setKeyboardItem(keyboardItem: KeyboardItem): void {
    this.kbdItm = keyboardItem;
  }

  /// <summary>
  ///   get type returns System|Internal|User|Timer|Expression|Recompute
  /// </summary>
  getType(): string {
    return this._type;
  }

  /// <summary>
  ///   set type receives System|Internal|User|Timer|Expression|Recompute
  /// </summary>
  setType(aType: string): void {
    this._type = aType;
  }

  /// <summary>
  ///   get internal event code
  /// </summary>
  /// <returns> int is the internal event code </returns>
  getInternalCode(): number {
    if (this._type === ConstInterface.EVENT_TYPE_INTERNAL)
      return this.InternalEvent;
    return Int32.MinValue;
  }

  /// <summary>
  ///   get the keyboard item
  /// </summary>
  getKbdItm(): KeyboardItem {
    if (this._type === ConstInterface.EVENT_TYPE_SYSTEM)
      return this.kbdItm;
    return null;
  }

  /// <summary>
  ///   get the keyboard item
  /// </summary>
  getKbdItmAlways(): KeyboardItem {
    return this.kbdItm;
  }

  /// <summary>
  ///   returns true for non data events or data events which their expression
  ///   evaluates to true
  /// </summary>
  dataEventIsTrue(): boolean {

    if (this._type !== ConstInterface.EVENT_TYPE_EXPRESSION &&
      !(this._type === ConstInterface.EVENT_TYPE_USER && this.getUserEventType() === ConstInterface.EVENT_TYPE_EXPRESSION))
      return true;
    if (this._type !== ConstInterface.EVENT_TYPE_USER)
      return DisplayConvertor.toBoolean(this.Exp.evaluateWithResultTypeAndLength(StorageAttribute.BOOLEAN, 0));
    return DisplayConvertor.toBoolean(this.UserEvt.getExpression().evaluateWithResultTypeAndLength(StorageAttribute.BOOLEAN, 0));
  }


  /// <summary>
  ///   get number of seconds (for timer events)
  /// </summary>
  getSeconds(): number {
    return this._seconds;
  }

  getBrkLevel(): string;
  getBrkLevel(flowMonitor: boolean): string;
  getBrkLevel(flowMonitor?: boolean): string {
    if (arguments.length === 0) {
      return this.getBrkLevel_0();
    }
    return this.getBrkLevel_1(flowMonitor);
  }

  /// <summary>
  ///   get the break level of Event not for Flow Monitoring
  /// </summary>
  private getBrkLevel_0(): string {
    return this.getBrkLevel(false);
  }

  /// <summary>
  ///   get the break level of Event
  /// </summary>
  /// <param name = "flowMonitor">is it needed for Flow Monitoring usage </param>
  private getBrkLevel_1(flowMonitor: boolean): string {
    let level: string = "";
    switch (this._type) {
      case ConstInterface.EVENT_TYPE_INTERNAL:
        switch (this.InternalEvent) {
          case InternalInterface.MG_ACT_TASK_PREFIX:
            level = flowMonitor ? ConstInterface.BRK_LEVEL_TASK_PREFIX_FM : ConstInterface.BRK_LEVEL_TASK_PREFIX;
            break;

          case InternalInterface.MG_ACT_TASK_SUFFIX:
            level = flowMonitor ? ConstInterface.BRK_LEVEL_TASK_SUFFIX_FM : ConstInterface.BRK_LEVEL_TASK_SUFFIX;
            break;

          case InternalInterface.MG_ACT_REC_PREFIX:
            level = flowMonitor ? ConstInterface.BRK_LEVEL_REC_PREFIX_FM : ConstInterface.BRK_LEVEL_REC_PREFIX;
            break;

          case InternalInterface.MG_ACT_REC_SUFFIX:
            level = flowMonitor ? ConstInterface.BRK_LEVEL_REC_SUFFIX_FM : ConstInterface.BRK_LEVEL_REC_SUFFIX;
            break;

          case InternalInterface.MG_ACT_CTRL_PREFIX:
            level = flowMonitor ? ConstInterface.BRK_LEVEL_CTRL_PREFIX_FM : ConstInterface.BRK_LEVEL_CTRL_PREFIX + '_';
            break;

          case InternalInterface.MG_ACT_CTRL_SUFFIX:
            level = flowMonitor ? ConstInterface.BRK_LEVEL_CTRL_SUFFIX_FM : ConstInterface.BRK_LEVEL_CTRL_SUFFIX + '_';
            break;

          case InternalInterface.MG_ACT_CTRL_VERIFICATION:
            level = flowMonitor ? ConstInterface.BRK_LEVEL_CTRL_VERIFICATION_FM : ConstInterface.BRK_LEVEL_CTRL_VERIFICATION + '_';
            break;

          case InternalInterface.MG_ACT_VARIABLE:
            level = flowMonitor ? ConstInterface.BRK_LEVEL_VARIABLE_FM : ConstInterface.BRK_LEVEL_VARIABLE + '_';
            break;

          default:
            level = flowMonitor ? ConstInterface.BRK_LEVEL_HANDLER_INTERNAL_FM : ConstInterface.BRK_LEVEL_HANDLER_INTERNAL + '_';
            break;
        }
        level += this.getInternalEvtDescription();
        break;

      case ConstInterface.EVENT_TYPE_SYSTEM:
        level = flowMonitor ? ConstInterface.BRK_LEVEL_HANDLER_SYSTEM_FM : ConstInterface.BRK_LEVEL_HANDLER_SYSTEM + '_';
        level += this.getKeyboardItemString();
        break;

      case ConstInterface.EVENT_TYPE_TIMER:
        level = flowMonitor ? ConstInterface.BRK_LEVEL_HANDLER_TIMER_FM + ' ' + this.seconds2String() : ConstInterface.BRK_LEVEL_HANDLER_TIMER + '_' + this.seconds2String();
        break;

      case ConstInterface.EVENT_TYPE_EXPRESSION:
        level = flowMonitor ? ConstInterface.BRK_LEVEL_HANDLER_EXPRESSION_FM : ConstInterface.BRK_LEVEL_HANDLER_EXPRESSION + '_' + this.Exp.getId();
        break;

      case ConstInterface.EVENT_TYPE_USER:
        level = (flowMonitor ? (ConstInterface.BRK_LEVEL_HANDLER_USER_FM + ": ") : (ConstInterface.BRK_LEVEL_HANDLER_USER + '_')) + (this.UserEvt != null ? this.UserEvt._userEvtDesc : this._userEvtDesc);
        break;

      case ConstInterface.EVENT_TYPE_USER_FUNC:
        level = (flowMonitor ? (ConstInterface.BRK_LEVEL_USER_FUNCTION_FM + ':') : (ConstInterface.BRK_LEVEL_USER_FUNCTION + '_')) + this._userDefinedFuncName;
        break;
    }

    return level;
  }

  /// <summary>
  ///   get description of the internal event
  /// </summary>
  /// <returns> description of the event </returns>
  private getInternalEvtDescription(): string {
    let description: string;
    switch (this.InternalEvent) {
      case InternalInterface.MG_ACT_ABOUT:
        description = "About Magic";
        break;

      case InternalInterface.MG_ACT_ACTION_LIST:
        description = "Action List";
        break;

      case InternalInterface.MG_ACT_ADD_HYPERLINK:
        description = "";
        break;

      case InternalInterface.MG_ACT_ALIGN_LEFT:
        description = "Left";
        break;

      case InternalInterface.MG_ACT_ALIGN_RIGHT:
        description = "Right";
        break;

      case InternalInterface.MG_ACT_APPL_PROPERTIES:
        description = "";
        break;

      case InternalInterface.MG_ACT_APPLICATIONS:
        description = "Applications";
        break;

      case InternalInterface.MG_ACT_APPLICATIONS_LIST:
        description = "Applications List";
        break;

      case InternalInterface.MG_ACT_ATTACH_TO_TABLE:
        description = "Attach to Table";
        break;

      case InternalInterface.MG_ACT_AUTHORIZE:
        description = "Authorize";
        break;

      case InternalInterface.MG_ACT_EDT_BEGFLD:
        description = "Begin Field";
        break;

      case InternalInterface.MG_ACT_EDT_BEGFORM:
        description = "Begin Form";
        break;

      case InternalInterface.MG_ACT_EDT_BEGLINE:
        description = "Begin Line";
        break;

      case InternalInterface.MG_ACT_EDT_BEGNXTLINE:
        description = "Begin Next Line";
        break;

      case InternalInterface.MG_ACT_EDT_BEGPAGE:
        description = "Begin Page";
        break;

      case InternalInterface.MG_ACT_TBL_BEGLINE:
        description = "Begin Row";
        break;

      case InternalInterface.MG_ACT_TBL_BEGPAGE:
        description = "Begin Screen";
        break;

      case InternalInterface.MG_ACT_TBL_BEGTBL:
        description = "Begin table";
        break;

      case InternalInterface.MG_ACT_BOTTOM:
        description = "Bottom";
        break;

      case InternalInterface.MG_ACT_BULLET:
        description = "Bullet";
        break;

      case InternalInterface.MG_ACT_BUTTON:
        description = "Button Press";
        break;

      case InternalInterface.MG_ACT_CANCEL:
        description = "Cancel";
        break;

      case InternalInterface.MG_ACT_RT_QUIT:
        description = "Quit";
        break;

      case InternalInterface.MG_ACT_CENTER:
        description = "Center";
        break;

      case InternalInterface.MG_ACT_CHANGE_COLOR:
        description = "";
        break;

      case InternalInterface.MG_ACT_CHANGE_FONT:
        description = "Change Font";
        break;

      case InternalInterface.MG_ACT_CHECK_SYNTAX:
        description = "Check Syntax";
        break;

      case InternalInterface.MG_ACT_CHECK_TO_END:
        description = "Check to End";
        break;

      case InternalInterface.MG_ACT_CLEAR_TEMPLATE:
        description = "Clear Template";
        break;

      case InternalInterface.MG_ACT_CLEAR_VALUE:
        description = "Clear Value";
        break;

      case InternalInterface.MG_ACT_CLOSE:
        description = "Close";
        break;

      case InternalInterface.MG_ACT_ACT_CLOSE_APPL:
        description = "Close Application";
        break;

      case InternalInterface.MG_ACT_COLORS:
        description = "Colors";
        break;

      case InternalInterface.MG_ACT_COMMUNICATIONS:
        description = "Communications";
        break;

      case InternalInterface.MG_ACT_COMPONENTS:
        description = "Components";
        break;

      case InternalInterface.MG_ACT_CTRL_HIT:
        description = "Control Hit";
        break;

      case InternalInterface.MG_ACT_CONTROL_NAME_LIST:
        description = "Control Name List";
        break;

      case InternalInterface.MG_ACT_CLIP_COPY:
        description = "Copy";
        break;

      case InternalInterface.MG_ACT_COPY_LAYOUT:
        description = "Copy Layout";
        break;

      case InternalInterface.MG_ACT_COPY_SUBTREE:
        description = "Copy Subtree";
        break;

      case InternalInterface.MG_ACT_CRELINE:
        description = "Create Line";
        break;

      case InternalInterface.MG_ACT_CREATE_PARENT:
        description = "Create Parent";
        break;

      case InternalInterface.MG_ACT_RTO_CREATE:
        description = "Create Records";
        break;

      case InternalInterface.MG_ACT_CREATE_SUBTASK:
        description = "Create Subtask";
        break;

      case InternalInterface.MG_ACT_CROSS_REFERENCE:
        description = "Cross Reference";
        break;

      case InternalInterface.MG_ACT_CUT:
        description = "Cut";
        break;

      case InternalInterface.MG_ACT_DB_TABLES:
        description = "";
        break;

      case InternalInterface.MG_ACT_DBMS:
        description = "DBMS";
        break;

      case InternalInterface.MG_ACT_DDF_MAKE:
        description = "DDF Make";
        break;

      case InternalInterface.MG_ACT_DATABASES:
        description = "Databases";
        break;

      case InternalInterface.MG_ACT_DEFAULT_LAYOUT:
        description = "Default Layout";
        break;

      case InternalInterface.MG_ACT_DEFINE_EXPRESSION:
        description = "Define Expression";
        break;

      case InternalInterface.MG_ACT_EDT_DELCURCH:
        description = "Current Char";
        break;

      case InternalInterface.MG_ACT_EDT_DELPRVCH:
        description = "Previous Char";
        break;

      case InternalInterface.MG_ACT_DELETE_HYPERLINK:
        description = "Delete Hyperlink";
        break;

      case InternalInterface.MG_ACT_DELLINE:
        description = "Delete Line";
        break;

      case InternalInterface.MG_ACT_DELETE_SUBTREE:
        description = "Delete Subtree";
        break;

      case InternalInterface.MG_ACT_RT_COPYFLD:
        description = "Ditto";
        break;

      case InternalInterface.MG_ACT_DISPLAY_REFRESH:
        description = "Display Refresh";
        break;

      case InternalInterface.MG_ACT_EDIT_MAIN_FORM:
        description = "Edit Main Form";
        break;

      case InternalInterface.MG_ACT_EDT_ENDFLD:
        description = "End Field";
        break;

      case InternalInterface.MG_ACT_EDT_ENDFORM:
        description = "End Form";
        break;

      case InternalInterface.MG_ACT_EDT_ENDLINE:
        description = "End Line";
        break;

      case InternalInterface.MG_ACT_EDT_ENDPAGE:
        description = "End Page";
        break;

      case InternalInterface.MG_ACT_TBL_ENDLINE:
        description = "End Row";
        break;

      case InternalInterface.MG_ACT_TBL_ENDPAGE:
        description = "End Screen";
        break;

      case InternalInterface.MG_ACT_TBL_ENDTBL:
        description = "End Table";
        break;

      case InternalInterface.MG_ACT_ENVIRONMENT:
        description = "Environment";
        break;

      case InternalInterface.MG_ACT_EXECUTE_PROGRAM:
        description = "Execute Program";
        break;

      case InternalInterface.MG_ACT_EXECUTE_REPORT:
        description = "Execute Report";
        break;

      case InternalInterface.MG_ACT_EXIT:
        description = "Exit";
        break;

      case InternalInterface.MG_ACT_EXIT_SYSTEM:
        description = "Exit System";
        break;

      case InternalInterface.MG_ACT_EXPORT_IMPORT:
        description = "Export/Import";
        break;

      case InternalInterface.MG_ACT_EXPRESSION_RULES:
        description = "Expression rules";
        break;

      case InternalInterface.MG_ACT_EXTERNAL_EDITOR:
        description = "External Editor";
        break;

      case InternalInterface.MG_ACT_FONTS:
        description = "";
        break;

      case InternalInterface.MG_ACT_EXT_EVENT:
        description = "External Event";
        break;

      case InternalInterface.MG_ACT_FORMS:
        description = "Forms";
        break;

      case InternalInterface.MG_ACT_FROM_VALUE:
        description = "From Value";
        break;

      case InternalInterface.MG_ACT_FUNCTION_LIST:
        description = "Function List";
        break;

      case InternalInterface.MG_ACT_GENERATE_FORM:
        description = "Generate Form";
        break;

      case InternalInterface.MG_ACT_GENERATE_PROGRAM:
        description = "Generate Program";
        break;

      case InternalInterface.MG_ACT_GO_TO_TOP:
        description = "Go to Top";
        break;

      case InternalInterface.MG_ACT_H_CENTER_OF_FORM:
        description = "";
        break;

      case InternalInterface.MG_ACT_HTML_STYLES:
        description = "HTML Styles";
        break;

      case InternalInterface.MG_ACT_HELP:
        description = "Help";
        break;

      case InternalInterface.MG_ACT_HELP_SCREENS:
        description = "Help Screens";
        break;

      case InternalInterface.MG_ACT_HORIZ_CENTER:
        description = "Horiz. Center";
        break;

      case InternalInterface.MG_ACT_I_O_FILES:
        description = "Tables";
        break;

      case InternalInterface.MG_ACT_INDENT:
        description = "Indent";
        break;

      case InternalInterface.MG_ACT_INSERT_OBJECT:
        description = "Insert Object";
        break;

      case InternalInterface.MG_ACT_JUMP_TO_ROW:
        description = "Jump to Row";
        break;

      case InternalInterface.MG_ACT_KEYBOARD_LIST:
        description = "Keyboard List";
        break;

      case InternalInterface.MG_ACT_KEYBOARD_MAPPING:
        description = "Keyboard Mapping";
        break;

      case InternalInterface.MG_ACT_LANGUAGES:
        description = "languages";
        break;

      case InternalInterface.MG_ACT_RTO_SEARCH:
        description = "Locate Next";
        break;

      case InternalInterface.MG_ACT_RTO_LOCATE:
        description = "Locate a Record";
        break;

      case InternalInterface.MG_ACT_LOGICALPNAMES:
        description = "";
        break;

      case InternalInterface.MG_ACT_LOGON:
        description = "Logon";
        break;

      case InternalInterface.MG_ACT_USING_HELP:
        description = "Help Topics";
        break;

      case InternalInterface.MG_ACT_EDT_MARKNXTCH:
        description = "Mark Next Char";
        break;

      case InternalInterface.MG_ACT_MARK_NEXT_LINE:
        description = "Mark Next Line MLE";
        break;

      case InternalInterface.MG_ACT_EDT_MARKPRVCH:
        description = "Mark Previous Char";
        break;

      case InternalInterface.MG_ACT_EDT_MARKPRVLINE:
        description = "Mark Previous Line MLE";
        break;

      case InternalInterface.MG_ACT_MARK_SUBTREE:
        description = "";
        break;

      case InternalInterface.MG_ACT_EDT_MARKTOBEG:
        description = "Mark To Beginning";
        break;

      case InternalInterface.MG_ACT_EDT_MARKTOEND:
        description = "Mark To End";
        break;

      case InternalInterface.MG_ACT_MAXIMUM_HEIGHT:
        description = "Maximum Height";
        break;

      case InternalInterface.MG_ACT_MAXIMUM_WIDTH:
        description = "Maximum Width";
        break;

      case InternalInterface.MG_ACT_MENU_BAR:
        description = "Menu Bar";
        break;

      case InternalInterface.MG_ACT_MENUS:
        description = "";
        break;

      case InternalInterface.MG_ACT_MINIMUM_HEIGHT:
        description = "Minimum Height";
        break;

      case InternalInterface.MG_ACT_MINIMUM_WIDTH:
        description = "Minimum Width";
        break;

      case InternalInterface.MG_ACT_RTO_MODIFY:
        description = "Modify Records";
        break;

      case InternalInterface.MG_ACT_MONITOR_DEBUGGER:
        description = "Monitor/Debugger";
        break;

      case InternalInterface.MG_ACT_MOVE_ENTRY:
        description = "Move Entry";
        break;

      case InternalInterface.MG_ACT_MOVE_SUBTREE:
        description = "Move Subtree";
        break;

      case InternalInterface.MG_ACT_NULL_SETTINGS:
        description = "NULL Settings";
        break;

      case InternalInterface.MG_ACT_EDT_NXTCHAR:
        description = "Next Char";
        break;

      case InternalInterface.MG_ACT_TBL_NXTFLD:
        description = "Next Field";
        break;

      case InternalInterface.MG_ACT_EDT_NXTLINE:
        description = "Next Line";
        break;

      case InternalInterface.MG_ACT_EDT_NXTPAGE:
        description = "Next Page";
        break;

      case InternalInterface.MG_ACT_TBL_NXTLINE:
        description = "Next Row";
        break;

      case InternalInterface.MG_ACT_TBL_NXTPAGE:
        description = "Next Screen";
        break;

      case InternalInterface.MG_ACT_EDT_NXTTAB:
        description = "Next Tab";
        break;

      case InternalInterface.MG_ACT_EDT_NXTWORD:
        description = "Next Word";
        break;

      case InternalInterface.MG_ACT_NORMAL:
        description = "Normal";
        break;

      case InternalInterface.MG_ACT_OK:
        description = "OK";
        break;

      case InternalInterface.MG_ACT_OLE2:
        description = "OLE2";
        break;

      case InternalInterface.MG_ACT_OPEN_APPLICATION:
        description = "Open Application";
        break;

      case InternalInterface.MG_ACT_OVERWRITE_ENTRY:
        description = "Overwrite Entry";
        break;

      case InternalInterface.MG_ACT_OVERWRITE_SUBTREE:
        description = "Overwrite Subtree";
        break;

      case InternalInterface.MG_ACT_PPD:
        description = "PPD";
        break;

      case InternalInterface.MG_ACT_PAGE_FOOTER:
        description = "Page Footer";
        break;

      case InternalInterface.MG_ACT_PAGE_HEADER:
        description = "Page Header";
        break;

      case InternalInterface.MG_ACT_CLIP_PASTE:
        description = "Paste";
        break;

      case InternalInterface.MG_ACT_PASTE_LINK:
        description = "Paste Link";
        break;

      case InternalInterface.MG_ACT_PASTE_SUBTREE:
        description = "Paste Subtree";
        break;

      case InternalInterface.MG_ACT_EDT_PRVCHAR:
        description = "Previous Char";
        break;

      case InternalInterface.MG_ACT_TBL_PRVFLD:
        description = "Previous Field";
        break;

      case InternalInterface.MG_ACT_EDT_PRVLINE:
        description = "Previous Line";
        break;

      case InternalInterface.MG_ACT_EDT_PRVPAGE:
        description = "Previous Page";
        break;

      case InternalInterface.MG_ACT_TBL_PRVLINE:
        description = "Previous Row";
        break;

      case InternalInterface.MG_ACT_TBL_PRVPAGE:
        description = "Previous Screen";
        break;

      case InternalInterface.MG_ACT_EDT_PRVTAB:
        description = "Previous Tab";
        break;

      case InternalInterface.MG_ACT_EDT_PRVWORD:
        description = "Previous Word";
        break;

      case InternalInterface.MG_ACT_PRINT_ATTRIBUTES:
        description = "Print Attributes";
        break;

      case InternalInterface.MG_ACT_PRINTER_SETUP:
        description = "Printer Setup";
        break;

      case InternalInterface.MG_ACT_PRINTERS:
        description = "Printers";
        break;

      case InternalInterface.MG_ACT_PROGRAMS:
        description = "Programs";
        break;

      case InternalInterface.MG_ACT_PROPERTIES:
        description = "Properties";
        break;

      case InternalInterface.MG_ACT_RTO_QUERY:
        description = "Query Records";
        break;

      case InternalInterface.MG_ACT_RTO_RANGE:
        description = "Range of Records";
        break;

      case InternalInterface.MG_ACT_RT_REFRESH_RECORD:
        description = "Record Flush";
        break;

      case InternalInterface.MG_ACT_REDIRECT_FILES:
        description = "Redirect Files";
        break;

      case InternalInterface.MG_ACT_REDRAW_LAYOUT:
        description = "";
        break;

      case InternalInterface.MG_ACT_REPEAT_ENTRY:
        description = "Repeat Entry";
        break;

      case InternalInterface.MG_ACT_REPEAT_SUBTREE:
        description = "Repeat Subtree";
        break;

      case InternalInterface.MG_ACT_REPORT_GENERATOR:
        description = "";
        break;

      case InternalInterface.MG_ACT_RESTORE_DEFAULTS:
        description = "Restore Defaults";
        break;

      case InternalInterface.MG_ACT_RETURN_TO_TREE:
        description = "";
        break;

      case InternalInterface.MG_ACT_RIGHT:
        description = "Right";
        break;

      case InternalInterface.MG_ACT_RIGHTS:
        description = "";
        break;

      case InternalInterface.MG_ACT_RIGHTS_LIST:
        description = "Rights List";
        break;

      case InternalInterface.MG_ACT_SQL_ASSIST:
        description = "SQL Assist";
        break;

      case InternalInterface.MG_ACT_SQL_COLUMNS:
        description = "SQL Columns";
        break;

      case InternalInterface.MG_ACT_SQL_COMMAND:
        description = "SQL Command";
        break;

      case InternalInterface.MG_ACT_SQL_FLIP_DESC:
        description = "SQL Flip Desc.";
        break;

      case InternalInterface.MG_ACT_SQL_KEYWORDS:
        description = "SQL Keywords";
        break;

      case InternalInterface.MG_ACT_SQL_OPERATORS:
        description = "SQL Operators";
        break;

      case InternalInterface.MG_ACT_SQL_TABLES:
        description = "SQL Tables";
        break;

      case InternalInterface.MG_ACT_SQL_WHERE_CLAUSE:
        description = "";
        break;

      case InternalInterface.MG_ACT_RT_REFRESH_SCREEN:
        description = "Screen Refresh";
        break;

      case InternalInterface.MG_ACT_SECRET_NAMES:
        description = "Secret Names";
        break;

      case InternalInterface.MG_ACT_SELECT:
        description = "Select";
        break;

      case InternalInterface.MG_ACT_EDT_MARKALL:
        description = "Select All";
        break;

      case InternalInterface.MG_ACT_SERVERS:
        description = "";
        break;

      case InternalInterface.MG_ACT_SERVICES:
        description = "";
        break;

      case InternalInterface.MG_ACT_RT_EDT_NULL:
        description = "Set to NULL";
        break;

      case InternalInterface.MG_ACT_SHELL_TO_OS:
        description = "Shell to OS";
        break;

      case InternalInterface.MG_ACT_SHOW_EXPRESSION:
        description = "Show Expression";
        break;

      case InternalInterface.MG_ACT_SHOW_FULL_LAYOUT:
        description = "";
        break;

      case InternalInterface.MG_ACT_SHRINK_TREE:
        description = "";
        break;

      case InternalInterface.MG_ACT_SORT:
        description = "Sort";
        break;

      case InternalInterface.MG_ACT_SORT_RECORDS:
        description = "Sort Records";
        break;

      case InternalInterface.MG_ACT_TABLE_LOCATE:
        description = "Table Locate";
        break;

      case InternalInterface.MG_ACT_TABLE_LOCATE_NEXT:
        description = "Table Locate Next";
        break;

      case InternalInterface.MG_ACT_TABLES:
        description = "";
        break;

      case InternalInterface.MG_ACT_TASK_CONTROL:
        description = "";
        break;

      case InternalInterface.MG_ACT_TASK_EVENTS:
        description = "";
        break;

      case InternalInterface.MG_ACT_TO_VALUE:
        description = "To Value";
        break;

      case InternalInterface.MG_ACT_TOOLKIT_RUNTIME:
        description = "Toolkit/Runtime";
        break;

      case InternalInterface.MG_ACT_TOP:
        description = "Top";
        break;

      case InternalInterface.MG_ACT_TYPES:
        description = "";
        break;

      case InternalInterface.MG_ACT_EDT_UNDO:
        description = "Undo Editing";
        break;

      case InternalInterface.MG_ACT_UNINDENT:
        description = "Unindent";
        break;

      case InternalInterface.MG_ACT_UPDATE_LINK:
        description = "";
        break;

      case InternalInterface.MG_ACT_USER_ACTION_1:
      case InternalInterface.MG_ACT_USER_ACTION_2:
      case InternalInterface.MG_ACT_USER_ACTION_3:
      case InternalInterface.MG_ACT_USER_ACTION_4:
      case InternalInterface.MG_ACT_USER_ACTION_5:
      case InternalInterface.MG_ACT_USER_ACTION_6:
      case InternalInterface.MG_ACT_USER_ACTION_7:
      case InternalInterface.MG_ACT_USER_ACTION_8:
      case InternalInterface.MG_ACT_USER_ACTION_9:
      case InternalInterface.MG_ACT_USER_ACTION_10:
      case InternalInterface.MG_ACT_USER_ACTION_11:
      case InternalInterface.MG_ACT_USER_ACTION_12:
      case InternalInterface.MG_ACT_USER_ACTION_13:
      case InternalInterface.MG_ACT_USER_ACTION_14:
      case InternalInterface.MG_ACT_USER_ACTION_15:
      case InternalInterface.MG_ACT_USER_ACTION_16:
      case InternalInterface.MG_ACT_USER_ACTION_17:
      case InternalInterface.MG_ACT_USER_ACTION_18:
      case InternalInterface.MG_ACT_USER_ACTION_19:
      case InternalInterface.MG_ACT_USER_ACTION_20:
        description = "User Action " + (this.InternalEvent - InternalInterface.MG_ACT_USER_ACTION_1 + 1);
        break;

      case InternalInterface.MG_ACT_USER_GROUPS:
        description = "";
        break;

      case InternalInterface.MG_ACT_USER_IDS:
        description = "User IDs";
        break;

      case InternalInterface.MG_ACT_V_CENTER_OF_FORM:
        description = "Center of Form";
        break;

      case InternalInterface.MG_ACT_VERTICAL_CENTER:
        description = "Vertical Center";
        break;

      case InternalInterface.MG_ACT_VIEW_BY_KEY:
        description = "View by Key";
        break;

      case InternalInterface.MG_ACT_RT_REFRESH_VIEW:
        description = "View Refresh";
        break;

      case InternalInterface.MG_ACT_VIRTUAL_VARIABLES:
        description = "Variables";
        break;

      case InternalInterface.MG_ACT_VISUAL_CONNECTION:
        description = "Visual Connection";
        break;

      case InternalInterface.MG_ACT_HIT:
        description = "Window Hit";
        break;

      case InternalInterface.MG_ACT_WINMOVE:
        description = "Window Reposition";
        break;

      case InternalInterface.MG_ACT_WINSIZE:
        description = "Window Resize";
        break;

      case InternalInterface.MG_ACT_ZOOM:
        description = "Zoom";
        break;

      case InternalInterface.MG_ACT_LOCKING_DETAILS:
        description = "Locking Details";
        break;

      case InternalInterface.MG_ACT_LOCKING_ABORT:
        description = "Locking Abort";
        break;

      case InternalInterface.MG_ACT_LOCKING_RETRY:
        description = "Locking Retry";
        break;

      case InternalInterface.MG_ACT_CHECK_OBJECT_LIST:
        description = "Check Object List";
        break;

      case InternalInterface.MG_ACT_USERS_LIST:
        description = "Users List";
        break;

      case InternalInterface.MG_ACT_MODELS:
        description = "Models";
        break;

      case InternalInterface.MG_ACT_WEB_CLICK:
        description = "Click";
        break;

      case InternalInterface.MG_ACT_WEB_ON_DBLICK:
        description = "DblClick";
        break;

      case InternalInterface.MG_ACT_WEB_MOUSE_OVER:
        description = "Mouse Over";
        break;

      case InternalInterface.MG_ACT_WEB_MOUSE_OUT:
        description = "Mouse Out";
        break;

      case InternalInterface.MG_ACT_BROWSER_ESC:
        description = "Esc";
        break;

      case InternalInterface.MG_ACT_ROLLBACK:
        description = "Rollback";
        break;

      case InternalInterface.MG_ACT_EMPTY_DATAVIEW:
        description = "Empty Dataview";
        break;

      case InternalInterface.MG_ACT_CTRL_MODIFY:
        description = "Control Modify";
        break;

      case InternalInterface.MG_ACT_PRINT_DATA:
        description = "Print Data";
        break;

      case InternalInterface.MG_ACT_POST_REFRESH_BY_PARENT:
        description = "Post Refresh by Parent";
        break;

      case InternalInterface.MG_ACT_SWITCH_TO_OFFLINE:
        description = "Switch To Offline";
        break;

      case InternalInterface.MG_ACT_UNAVAILABLE_SERVER:
        description = "Unavailable Server";
        break;

      case InternalInterface.MG_ACT_CONTEXT_MENU:
        description = "Context Menu";
        break;

      default:
        description = "";
        break;

    }

    return description;
  }

  /// <summary>
  ///   get type of User Event
  /// </summary>
  /// <returns> type of user event </returns>
  getUserEventType(): string {
    if (this.UserEvt === null)
      return ConstInterface.EVENT_TYPE_NOTINITED;

    return this.UserEvt.getType();
  }

  /// <summary>
  ///   get seconds of the user event
  /// </summary>
  getSecondsOfUserEvent(): number {
    return this.UserEvt.getSeconds();
  }

  /// <summary>
  ///   get the user event object
  /// </summary>
  /// <returns> the user event object </returns>
  getUserEvent(): Event {
    return this.UserEvt;
  }

  /// <summary>
  ///   get keyboard item ( for system event ) in form of string
  ///   for system events ONLY
  /// </summary>
  private getKeyboardItemString(): string {
    let kbi: KeyboardItem = this.getKbdItm();
    if (kbi === null)
      return "";
    return kbi.ToString();
  }

  /// <summary>
  ///   insert the seconds to the picture "HH:MM:SS" for STORAGE_ATTR_TIME
  /// </summary>
  /// <returns> formated string of seconds
  /// </returns>
  private seconds2String(): string {
    let time: number[] = new Array<number>(3);
    let buffer: string = "";
    time[0] = Math.floor(this._seconds / 3600);
    time[1] = Math.floor((this._seconds - time[0] * 3600) / 60);
    time[2] = this._seconds % 60;
    for (let i: number = 0; i < time.length; i++) {
      if (time[i] === 0)
        buffer += "00";
      else if (time[i] < 10)
        buffer += ("0" + time[i]);
      else
        buffer += time[i];
      // don't insert delimiter after the last case
      if (i < time.length - 1)
        buffer += ":";
    }
    return buffer;
  }

  /// <summary>
  ///   Get the value of the parameter
  /// </summary>
  /// <param name = "idx">- the index of the parameter ( 0 = first param) </param>
  /// <returns> the value in a string </returns>
  getParamVal(idx: number): string {
    return this._paramVals[idx];
  }

  /// <summary>
  ///   parse the parameters values from the value string
  /// </summary>
  /// <param name = "valueStr">index of the param </param>
  /// <returns> the parameter value </returns>
  private parseParamVal(valueStr: string): number {
    let startOfs: number = 0, endOfs = 0, nLen, j;
    let sLen: string, sValue = null;

    // find the value location
    for (j = 0; j < this._parameters; j++) {
      switch (<StorageAttribute>this._paramAttrs[j]) {
        case StorageAttribute.SKIP:
          sValue = "";
          break;

        case StorageAttribute.ALPHA:
        case StorageAttribute.BLOB_VECTOR:
        case StorageAttribute.BLOB:
        case StorageAttribute.MEMO:
        case StorageAttribute.UNICODE:
          endOfs = startOfs + 4;
          sLen = valueStr.substr(startOfs, (endOfs) - (startOfs));
          nLen = NNumber.Parse(sLen, NumberStyles.HexNumber);
          startOfs = endOfs;

          // QCR 1699 decode the parameter from base64 if needed
          if (ClientManager.Instance.getEnvironment().GetDebugLevel() > 1 || (<StorageAttribute>this._paramAttrs[j]) === StorageAttribute.ALPHA || (<StorageAttribute>this._paramAttrs[j]) === StorageAttribute.UNICODE || (<StorageAttribute>this._paramAttrs[j]) === StorageAttribute.MEMO) {
            if ((nLen & 0x8000) > 0)
            // parse spanned record encoded to Hex
            {
              // compute the len of the parameter data
              nLen = (nLen & 0x7FFF);
              nLen *= 2;

              // parse the String
              let res: StringBuilder = new StringBuilder();
              endOfs += RecordUtils.getSpannedField(valueStr, nLen, startOfs, <StorageAttribute>this._paramAttrs[j], res, true);
              valueStr = res.ToString();
            }
            // non spanned params
            else {
              endOfs = startOfs + nLen;
              sValue = valueStr.substr(startOfs, (endOfs) - (startOfs));
            }
          }
          else {
            if ((nLen & 0x8000) > 0)
            // parse spanned record encoded to Hex
            {
              // compute the len of the parameter data
              nLen = (nLen & 0x7FFF);
              nLen = Math.floor((nLen + 2) / 3) * 4;

              // parse the String
              let res: StringBuilder = new StringBuilder();
              endOfs += RecordUtils.getSpannedField(valueStr, nLen, startOfs, <StorageAttribute>this._paramAttrs[j], res, false);
              sValue = res.ToString();
            }
            else {
              endOfs = startOfs + Math.floor((nLen + 2) / 3) * 4;
              sValue = Base64.decode(valueStr.substr(startOfs, (endOfs) - (startOfs)));
            }
          }

          break;

        case StorageAttribute.NUMERIC:
        case StorageAttribute.DATE:
        case StorageAttribute.TIME:
          // QCR 1699 decode the parameter from base64 if needed
          if (ClientManager.Instance.getEnvironment().GetDebugLevel() > 1) {
            endOfs = startOfs + ClientManager.Instance.getEnvironment().GetSignificantNumSize() * 2;
            sValue = valueStr.substr(startOfs, (endOfs) - (startOfs));
          }
          else {
            endOfs = startOfs + (Math.floor((ClientManager.Instance.getEnvironment().GetSignificantNumSize() + 2) / 3) * 4);
            sValue = Base64.decodeToHex(valueStr.substr(startOfs, (endOfs) - (startOfs)));
          }
          break;

        case StorageAttribute.BOOLEAN:
          endOfs = startOfs + 1;
          sValue = valueStr.substr(startOfs, (endOfs) - (startOfs));
          break;
      }
      this._paramVals[j] = sValue;
      startOfs = endOfs;
    }
    return endOfs;
  }

  /// <summary>
  ///   set Argument Values , without setting of the paramAttrs
  /// </summary>
  setParamVals(paramVals_: string[]): void {
    this._paramVals = paramVals_;
    this._paramAttrs = this._paramNulls = "";
    this._parameters = 0;

    if (this._paramVals !== null) {
      this._parameters = this._paramVals.length;
      for (let i: number = 0; i < this._parameters; i++) {
        this._paramAttrs += StorageAttribute.ALPHA; // temporary type of the data
        this._paramNulls += "0";
      }
    }
  }

  /// <summary>
  ///   Try to evaluate value to the same type as the field type
  /// </summary>
  /// <param name = "paramNum">number of the parameter </param>
  /// <param name = "fld">- field with it's type, to enforce its type to the parameter value </param>
  /// <returns> true - if setting of the type has over without problems and now the parameter and the fields have the same type,
  ///   false - the setting impossible.
  /// </returns>
  protected setParamType(paramNum: number, fld: Field): boolean {
    let currType: StorageAttribute;
    let currValue: string;
    let newType: StorageAttribute = fld.getType();
    let pic: PIC = null;
    let sameType: boolean = false;

    if (this._paramVals != null && this.getParamNum() >= paramNum) {
      currType = <StorageAttribute>this._paramAttrs[paramNum];

      sameType = (currType === newType);
      if (!sameType) {
        // try to set the new type to the parameter
        let charArr: string[] = null;
        currValue = this._paramVals[paramNum];

        switch (newType) {
          case StorageAttribute.ALPHA:
          case StorageAttribute.BLOB:
          case StorageAttribute.BLOB_VECTOR:
          case StorageAttribute.MEMO:
          case StorageAttribute.UNICODE:
            break;

          case StorageAttribute.NUMERIC:
          case StorageAttribute.DATE:
          case StorageAttribute.TIME:
            if (currType === StorageAttribute.ALPHA) {
              // from alpha to numeric
              try {
                pic = PIC.buildPicture(newType, currValue, fld.getTask().getCompIdx(), true);
                this._paramVals[paramNum] = DisplayConvertor.Instance.disp2mg(currValue, "", pic,
                  fld.getTask().getCompIdx(),
                  BlobType.CONTENT_TYPE_UNKNOWN);
                sameType = true;
              }
              catch (exception) {
                if (exception instanceof Exception) {
                  // canNotEvaluateAsNumeric
                  sameType = false;
                  Logger.Instance.WriteExceptionToLogWithMsg(NString.Format("Event.setParamType() cannot transfer {0} to Numeric with picture {1}", currValue, (pic != null ? pic.getFormat() : "null")));
                }
                else
                  throw exception;
              }
            }
            break;

          case StorageAttribute.BOOLEAN:
            if (currType === StorageAttribute.ALPHA) {
              // from alpha to logical
              currValue = currValue.trim();
              if (currValue === "1" || currValue.toLowerCase() === "true")
                this._paramVals[paramNum] = "1";
              else
                this._paramVals[paramNum] = "0";
              sameType = true;
            }
            break;
        }

        if (sameType) {
          charArr = NString.ToCharArray(this._paramAttrs);
          charArr[paramNum] = <string>newType;
          this._paramAttrs = NString.FromChars(charArr);
        }
      } // not the same type
    }// there is no such parameter

    return sameType;
  }

  /// <summary>
  ///   Get the number of params
  /// </summary>
  /// <returns> number of params </returns>
  getParamNum(): number {
    return this._parameters;
  }

  /// <summary>
  ///   Get the null flag of the param
  /// </summary>
  /// <param name = "idx">the param index </param>
  /// <returns> null flag </returns>
  getParamNull(idx: number): boolean {
    if ('0' === this._paramNulls.charAt(idx))
      return false;
    else
      return true;
  }

  /// <summary>
  ///   Get the attribute of the param
  /// </summary>
  /// <param name = "idx">the param index </param>
  /// <returns> attribute char </returns>
  getParamAttr(idx: number): string {
    return this._paramAttrs.charAt(idx);
  }

  /// <summary>
  ///   Appends the event's description to the given StringBuilder.
  /// </summary>
  /// <param name = "buffer">The buffer to which the description should be appended.</param>
  public AppendDescription(buffer: StringBuilder): void {
    switch (this._type) {
      case ConstInterface.EVENT_TYPE_INTERNAL:
        buffer.Append(this.getInternalEvtDescription());
        break;

      case ConstInterface.EVENT_TYPE_SYSTEM:
        buffer.Append(this.getKeyboardItemString());
        break;

      case ConstInterface.EVENT_TYPE_USER:
        buffer.Append(this.getUsrEvntDesc());
        break;

      case ConstInterface.EVENT_TYPE_USER_FUNC:
        buffer.Append(this._userDefinedFuncName);
        break;

      default:
        buffer.Append("unknown event type ");
        break;
    }
  }

  /// <summary>
  ///   returns the user defined function's name
  /// </summary>
  setUserDefinedFuncName(name: string): void {
    this._userDefinedFuncName = name;
    let functionNameUpper: string = this._userDefinedFuncName.toUpperCase();
    this._userDefinedFuncNameHashCode = HashUtils.GetHashCode(functionNameUpper);
  }

  /// <summary>
  ///   returns the user defined function's name
  /// </summary>
  getUserDefinedFuncName(): string {
    return this._userDefinedFuncName;
  }

  /// <summary>
  ///   returns the user defined function's name's hash value
  /// </summary>
  getUserDefinedFuncNameHashCode(): number {
    return this._userDefinedFuncNameHashCode;
  }

  /// <summary>
  ///   returns the user defined function's return expression
  /// </summary>
  getUserDefinedFuncRetExp(): number {
    return this._returnExp;
  }

  getOsCommandText(): string {
    return this._osCommandText;
  }

  setOsCommandText(osCommandText: string): void {
    this._osCommandText = osCommandText;
  }

  getOsCommandWait(): boolean {
    return this._osCommandWait;
  }

  private setOsCommandWait(wait: boolean): void {
    this._osCommandWait = wait;
  }

  getOsCommandShow(): CallOsShow {
    return this._osCommandShow;
  }

  private setOsCommandShow(osShow: CallOsShow): void {
    this._osCommandShow = osShow;
  }

  /// <summary>
  ///
  /// </summary>
  /// <returns></returns>
  setTimestamp(): void {
    this._timestamp = Event._lastTimestamp++;
  }

  getTimestamp(): number {
    return this._timestamp;
  }

  toString(): string {
    return NString.Format("{{Event: {0}}}", this.getBrkLevel());
  }
}
