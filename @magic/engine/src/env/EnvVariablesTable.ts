import {IMirrorXML} from "../util/IMirrorXML";
import {XmlParser} from "@magic/utils";
import {CommandsProcessorBase_SendingInstruction} from "../CommandsProcessorBase";
import {MirrorPrmMap, ParamParseResult} from "../util/PrmMap";
import {Debug, NNumber, NString, StringBuilder} from "@magic/mscorelib";

import {DisplayConvertor} from "@magic/gui";
import {ClientManager} from "../ClientManager";
import {ConstInterface} from "../ConstInterface";
import {IClientCommand} from "../commands/IClientCommand";
import {CommandFactory} from "../commands/ClientToServer/CommandFactory";
import {MGDataCollection} from "../tasks/MGDataCollection";
import {RemoteCommandsProcessor} from "../remote/RemoteCommandsProcessor";

// mirroring a single environment variable.
// (Since "String" is a sealed class, it is a member and not the base class)
export class MirrorString implements IMirrorXML {
  private _reserved: boolean = false; // Is this variable reserved - can not be changed by the user
  private _value: string = null;

  constructor();
  constructor(s: string);
  constructor(s?: string) {
    if (arguments.length === 0) {
      this.constructor_0();
      return;
    }
    this.constructor_1(s);
  }

  /// <summary>
  ///   CTOR
  /// </summary>
  private constructor_0(): void {
    this._reserved = false;
  }

  /// <summary>
  ///   CTOR
  /// </summary>
  private constructor_1(s: string): void {
    this._value = s;
    this._reserved = false;
  }

  /// <summary>
  ///   returns the string representation of the variable, for the XML
  /// </summary>
  mirrorToXML(): string {
    return ConstInterface.MG_ATTR_ENV_VALUE + "=\"" + XmlParser.escape(this._value) + "\" " +
      ConstInterface.MG_ATTR_ENV_WRITEINI + "=F";
  }

  /// <summary>
  ///   initialize the object from the XML attributes of a single param. The expected
  ///   format is: "value="..." reserved="."/>
  /// </summary>
  /// <param name = "xmlParser"></param>
  public init(name: String, xmlParser: XmlParser): ParamParseResult {
    let valueStart: number, valueEnd, reserveStart, paramEnd;
    let xmlData: string = xmlParser.getXMLdata();
    let valueAttr: string = ConstInterface.MG_ATTR_ENV_VALUE + "=\"";

    paramEnd = xmlData.indexOf("/>", xmlParser.getCurrIndex());

    // get the offsets into the XML data: start of value, end of value, location of reserved char
    valueStart = NString.IndexOf(xmlData, valueAttr, xmlParser.getCurrIndex(), paramEnd - xmlParser.getCurrIndex());
    if (valueStart !== -1) {
      valueStart += valueAttr.length;
      reserveStart = NString.IndexOf(xmlData, ConstInterface.MG_ATTR_ENV_RESERVED + "=\"", xmlParser.getCurrIndex(),
        paramEnd - xmlParser.getCurrIndex());

      valueEnd = reserveStart !== -1
        ? xmlData.indexOf(ConstInterface.MG_ATTR_ENV_RESERVED + "=\"", valueStart) - 2
        : paramEnd - 1;

      // fill the object's data
      this._value = xmlData.substr(valueStart, valueEnd - valueStart).trim();
      if (reserveStart !== -1) {
        reserveStart += ConstInterface.MG_ATTR_ENV_RESERVED.length + 2; // skip ='
        this._reserved = (xmlData[reserveStart] === 'Y');
      }
      else
        this._reserved = false;

      xmlParser.setCurrIndex(valueEnd);

      // Logical names are case sensitive. others variables should be changed to upper case
      if (name.startsWith(ConstInterface.INI_SECTION_LOGICAL_NAMES_BRACKETS))
        return ParamParseResult.OK;
      else
        return ParamParseResult.TOUPPER;
    }
    else if (NString.IndexOf(xmlData, ConstInterface.MG_ATTR_ENV_REMOVED, xmlParser.getCurrIndex(), paramEnd - xmlParser.getCurrIndex()) !== -1) {

      // remove this variable from the table
      return ParamParseResult.DELETE;
    }
    else {
      Debug.Assert(false, "bad XML parsing");
      return ParamParseResult.FAILED;
    }
  }

  /// <summary>
  ///   return the string
  /// </summary>
  /// <returns></returns>
  ToString(): string {
    return this._value;
  }

  /// <summary>
  ///   is the variable reserved?
  /// </summary>
  /// <returns></returns>
  isReserved(): boolean {
    return this._reserved;
  }
}

/// <summary>
///   manager of environment variables
/// </summary>
export class EnvParamsTable extends MirrorPrmMap<MirrorString> {

  /// <summary>
  ///   CTOR
  /// </summary>
  constructor() {
    super(MirrorString);
    this.mirroredID = ConstInterface.MG_TAG_ENV_PARAM;
  }

  // Check if the value should be returned from the environment.
  // Verify the section name exists before getting the value from the base class.
  // Return null if the value does not exist.
  get(s: string): string {
    let valName: string = null;
    let ret: string = null;

    // If section is not defined, add the default section
    if (s.charAt(0) !== '[') {
      valName = s;
      s = NString.Insert(s, 0, ConstInterface.INI_SECTION_MAGIC_ENV_BRACKETS);
    }

    // if we do have the section name,aand it is MAGIC_ENV, we need the variable's name
    else if (s.startsWith(ConstInterface.INI_SECTION_MAGIC_ENV_BRACKETS))
      valName = s.substr(ConstInterface.INI_SECTION_MAGIC_ENV_BRACKETS.length);

    // if it is not a logical name, it is case insensitive
    if (!s.startsWith(ConstInterface.INI_SECTION_LOGICAL_NAMES_BRACKETS))
      s = s.toUpperCase();
    // check the value's name to see if we need to get it from the runtime environment
    if (valName !== null)
      ret = this.getFromEnvironment(valName);

    if (ret !== null)
      return ret;

    // value not in runtime environment - get it from the table
    try {
      let resultObject: MirrorString = super.getvalue(s);

      if (resultObject !== null) {
        ret = resultObject.ToString();

        // If it may be a variable that belongs to the server's context/component, process it
        if (valName !== null) {
          ret = this.getProcessedValue(valName, ret);
        }
      }
    }
    catch (ex_BE) {
      // if string not in dictionary
    }
    return ret;
  }

  /// <summary>
  ///   return the environment variable in place "number" in section "section"
  /// </summary>
  /// <param name = "section"></param>
  /// <param name = "number"></param>
  /// <returns></returns>
  getln(section: string, number: number): string {
    section = section.toUpperCase().trim();
    let sectionFound: boolean = false;

    let keys: string[] = this.values.Keys;

    // Loop over keys, find those that start with our section name
    for (let i = 0; i < keys.length; i++) {
      let key: string = keys[i];

      if (key.startsWith(section)) {
        sectionFound = true;

        if (number > 1)
          number--;
        else
        // found what we needed, build the "name=value" string
          return key.substr(section.length) + "=" + this.values.get_Item(key);
      }
      // If we got to the right section and passed it, no need to continue looking
      else if (sectionFound)
        break;
    }

    return null;
  }

  /// <summary>
  ///   try and get the env variable's value from the runtime environment
  /// </summary>
  /// <param name = "valName"></param>
  /// <returns></returns>
  private getFromEnvironment(valName: string): string {
    switch (valName.toLowerCase()) {
      case ConstInterface.MG_ATTR_DECIMAL_SEPARATOR:
        return ClientManager.Instance.getEnvironment().GetDecimal();
      case ConstInterface.MG_ATTR_DATE:
        return DisplayConvertor.Instance.getDateChar().toString();
      case ConstInterface.MG_ATTR_TIME:
        return ClientManager.Instance.getEnvironment().GetTime();
      case ConstInterface.MG_ATTR_OWNER:
        return ClientManager.Instance.getEnvironment().getOwner();
      case ConstInterface.MG_ATTR_DATEMODE:
        return ClientManager.Instance.getEnvironment().GetDateMode(ClientManager.Instance.getCurrTask().getCompIdx());
      case ConstInterface.MG_ATTR_CENTURY:
        return ClientManager.Instance.getEnvironment().GetCentury(ClientManager.Instance.getCurrTask().getCompIdx()).toString();
      case ConstInterface.MG_ATTR_IDLETIME:
        return ClientManager.Instance.getEnvironment().getIdleTime(ClientManager.Instance.getCurrTask().getCompIdx()).toString();
      case ConstInterface.MG_ATTR_UPD_IN_QUERY:
        return ClientManager.Instance.getEnvironment().allowUpdateInQueryMode(ClientManager.Instance.getCurrTask().getCompIdx()).toString();
      case ConstInterface.MG_ATTR_CRE_IN_MODIFY:
        return ClientManager.Instance.getEnvironment().allowCreateInModifyMode(ClientManager.Instance.getCurrTask().getCompIdx()).toString();
      case ConstInterface.MG_ATTR_CONTEXT_INACTIVITY_TIMEOUT:
        return ClientManager.Instance.getEnvironment().getContextInactivityTimeout().toString();
      case ConstInterface.MG_ATTR_CONTEXT_UNLOAD_TIMEOUT:
        return ClientManager.Instance.getEnvironment().getContextUnloadTimeout().toString();
      case ConstInterface.MG_ATTR_TERMINAL:
        return ClientManager.Instance.getEnvironment().getTerminal().toString();
      case ConstInterface.MG_ATTR_CLOSE_TASKS_ON_PARENT_ACTIVATE:
        return ClientManager.Instance.getEnvironment().CloseTasksOnParentActivate().toString();
    }
    return null;
  }

  /// <summary>
  ///   The function processes the environment variable's value, to return it in the right
  ///   format for context/component values that are not used by the client.
  /// </summary>
  /// <param name = "valName"></param>
  /// <returns></returns>
  private getProcessedValue(valName: string, val: string): string {

    // The list of variables is similar to that in the server, in env_comp.cpp, ENV::env_val_to_str
    switch (valName.toLowerCase()) {

      // variable is integer
      case ConstInterface.MG_ATTR_HTTP_TIMEOUT:
      case ConstInterface.MG_ATTR_RTF_BUFFER_SIZE:
      case ConstInterface.MG_ATTR_RANGE_POP_TIME:
      case ConstInterface.MG_ATTR_TEMP_POP_TIME:
      case ConstInterface.MG_ATTR_BATCH_PAINT_TIME:
        return NNumber.Parse(val).toString();

      // variable is boolean
      case ConstInterface.MG_ATTR_USE_SIGNED_BROWSER_CLIENT:
      case ConstInterface.MG_ATTR_CLOSE_PRINTED_TABLES_IN_SUBTASKS:
      case ConstInterface.MG_ATTR_GENERIC_TEXT_PRINTING:
      case ConstInterface.MG_ATTR_HIGH_RESOLUTION_PRINT:
      case ConstInterface.MG_ATTR_MERGE_TRIM:
      case ConstInterface.MG_ATTR_ORIGINAL_IMAGE_LOAD:
      case ConstInterface.MG_ATTR_PRINT_DATA_TRIM:
      case ConstInterface.MG_ATTR_PSCRIPT_PRINT_NT:
      case ConstInterface.MG_ATTR_SPECIAL_CONV_ADD_SLASH:
      case ConstInterface.MG_ATTR_SPECIAL_FULL_EXPAND_PRINT:
      case ConstInterface.MG_ATTR_SPECIAL_FULL_TEXT:
      case ConstInterface.MG_ATTR_SPECIAL_LAST_LINE_PRINT:
      case ConstInterface.MG_ATTR_SPECIAL_PRINTER_OEM:
      case ConstInterface.MG_ATTR_EMBED_FONTS:
      case ConstInterface.MG_ATTR_CENTER_SCREEN_IN_ONLINE:
      case ConstInterface.MG_ATTR_REPOSITION_AFTER_MODIFY:
      case ConstInterface.MG_ATTR_ISAM_TRANSACTION:
        return (val[0] === 'Y' || val[0] === '1') ? "Y" : "N";

      // variable is a character
      case ConstInterface.MG_ATTR_TIME_SEPARATOR:
      case ConstInterface.MG_ATTR_IOTIMING:
      case ConstInterface.MG_ATTR_THOUSAND_SEPARATOR:
        return val[0].toString();
      default:
        return val;
    }
  }

  /// <summary>
  ///   Set the variable:
  ///   1. parse the string
  ///   2. create the param/value couples
  ///   3. for each couple:
  ///   3a. verify the section name exists
  ///   3b. verify the variable is not unmodifieable
  ///   3c. set the variable in the base class
  ///   3d. check and change the environment data if needed
  ///   4. If required, send the data to the server
  /// </summary>
  /// <param name = "s"></param>
  /// <param name = "updateIni"></param>
  /// <returns></returns>
  public set(s: string, updateIni: boolean): boolean {
    let allOK: boolean = true;
    let sendToServer: boolean = false;
    let name: string, val;
    let i: number;
    let serverVal: string = s;

    // String parsing: every number in 'offsets' shows the offset to the beginning of a name or value
    // 1st offset is always 0
    let offsets: number[] = new Array(s.length + 1);
    let offsetsChars: string[] = new Array(s.length + 1);

    offsets[0] = 0;
    offsetsChars[0] = 's';
    let nextOffset: number = 1;

    // Loop over string, find all the '=', ',' and '*' that are not preceeded by a '\'.
    for (i = 1; i < s.length; i++) {
      if ((s[i] === '=' || s[i] === ',') && s[i - 1] !== '\\') {
        offsets[nextOffset] = i + 1;
        offsetsChars[nextOffset] = s[i];
        nextOffset++;
      }
      if (s[i] === '*') {
        s = NString.Remove(s, i, 1);
        break;
      }
      if (s[i] === '\\') {
        s = NString.Remove(s, i, 1);
      }
    }

    // add the final offset for the end of the string
    offsets[nextOffset] = s.length + 1;
    offsetsChars[nextOffset] = '\0';
    nextOffset++;

    // go over the calculated offsets. the last one is the end of the string, so it is ignored
    for (i = 0; i < nextOffset - 1; i++) {
      // get the variable name
      name = s.substr(offsets[i], offsets[i + 1] - offsets[i] - 1);

      // is there a value, or is it an empty variable?
      if (s[offsets[i + 1] - 1] === '=') {
        i++;
        let valInit: number = i;
        let allowedSeparators: number = this.getAllowedSeparators(name);
        for (let sep: number = 0; sep < allowedSeparators; sep++) {
          if (offsetsChars[i + 1] === ',')
            i++;
          else
            break;
        }
        // get the value
        val = s.substr(offsets[valInit], offsets[i + 1] - offsets[valInit] - 1);
      }
      else
        val = null;

      // is it a reserved variable?
      if (this.isReservedLogicalName(name)) {
        allOK = false;
        continue;
      }

      // if there's no section name, add the default one
      if (name[0] !== '[')
        name = NString.Insert(name, 0, ConstInterface.INI_SECTION_MAGIC_ENV_BRACKETS);

      // If it's not a logical name, it is case insensitive
      if (!name.startsWith(ConstInterface.INI_SECTION_LOGICAL_NAMES_BRACKETS))
        name = name.toUpperCase();
      name = name.trim();
      val = val.Trim();
      sendToServer = true;
      if (!NString.IsNullOrEmpty(val) ||
        name.startsWith(ConstInterface.INI_SECTION_LOGICAL_NAMES_BRACKETS)) {
        // If we're going to send it to the server NOW, we don't need it in the changes list
        super.setValue(name, new MirrorString(val), !updateIni);
        this.checkSetInEnvironment(name, val);
      }
      else
        super.remove(name);
    }

    // if should update the ini file, and we have modified variables, update the server.
    if (updateIni && sendToServer) {
      let cmd: IClientCommand = CommandFactory.CreateIniputForceWriteCommand(serverVal);
      MGDataCollection.Instance.getMGData(0).CmdsToServer.Add(cmd);

      // execute client to server commands
      RemoteCommandsProcessor.GetInstance().Execute(CommandsProcessorBase_SendingInstruction.ONLY_COMMANDS);
    }
    return allOK;
  }

  /// <summary>
  ///   Checks if the variable is a reserved logical name
  /// </summary>
  /// <param name = "name"> env variable name </param>
  /// <returns> true if it is reserved </returns>
  private isReservedLogicalName(name: string): boolean {

    // Reserved logical names may be accessed without a section name, but are stored as logical names,
    // so if we don't have a section name, insert the logical section and search the table
    if (!name.startsWith("[")) {
      name = NString.Insert(name, 0, ConstInterface.INI_SECTION_LOGICAL_NAMES_BRACKETS);
      if (this.values.ContainsKey(name) && this.values.get_Item(name).isReserved())
        return true;
    }
    return false;
  }

  /// <summary>
  ///   returns the number of seperators allowed for entries of this section. number are based on
  ///   data in env_kern.cpp: env_def_parse
  /// </summary>
  /// <param name = "name"></param>
  /// <returns></returns>
  private getAllowedSeparators(name: string): number {
    if (name.charAt(0) !== '[')
      return 0;

    let section: string = name.substr(1, name.indexOf(']') /*']'*/ - 1);
    let param: string = name.substr(name.indexOf(']') /*']'*/ + 1);

    switch (section.toUpperCase()) {
      case ConstInterface.INI_SECTION_MAGIC_ENV:
        if (param.toUpperCase() === ConstInterface.MG_ATTR_LANGUAGE.toUpperCase())
          return 999;
        else
          return 0;
      case ConstInterface.INI_SECTION_MAGIC_SYSTEMS:
        return 8;
      case ConstInterface.INI_SECTION_MAGIC_DBMS:
        return 13;
      case ConstInterface.INI_SECTION_MAGIC_SERVERS:
        return 6;
      case ConstInterface.INI_SECTION_MAGIC_COMMS:
        return 2;
      case ConstInterface.INI_SECTION_MAGIC_PRINTERS:
        return 3;
      case ConstInterface.INI_SECTION_MAGIC_SYSTEM_MENU:
        return 11;
      case ConstInterface.INI_SECTION_MAGIC_DATABASES:
        return 21;
      case ConstInterface.INI_SECTION_MAGIC_LANGUAGE:
        return 1;
      case ConstInterface.INI_SECTION_MAGIC_SERVICES:
        return 8;
      case ConstInterface.INI_SECTION_TOOLS_MENU:
        return 7;
      default:
        return 0;
    }
  }

  /// <summary>
  ///   Check if the environment variable change affects the environment values,
  ///   and change the environment data accordingly
  /// </summary>
  /// <param name = "name"></param>
  /// <param name = "val"></param>
  private checkSetInEnvironment(name: string, val: string): void {
    if (name.startsWith(ConstInterface.INI_SECTION_MAGIC_ENV_BRACKETS)) {
      name = name.substr(ConstInterface.INI_SECTION_MAGIC_ENV_BRACKETS.length);

      switch (name.toLowerCase()) {
        case ConstInterface.MG_ATTR_DECIMAL_SEPARATOR:
          ClientManager.Instance.getEnvironment().setDecimalSeparator(val[0]);
          break;
        case ConstInterface.MG_ATTR_DATE:
          DisplayConvertor.Instance.setDateChar(val[0].charCodeAt(0));
          break;
        case ConstInterface.MG_ATTR_TIME:
          ClientManager.Instance.getEnvironment().setTimeSeparator(val[0]);
          break;
        case ConstInterface.MG_ATTR_OWNER:
          ClientManager.Instance.getEnvironment().setOwner(val);
          break;
        case ConstInterface.MG_ATTR_DATEMODE:
          ClientManager.Instance.getEnvironment().setDateMode(ClientManager.Instance.getCurrTask().getCompIdx(), val[0]);
          break;
        case ConstInterface.MG_ATTR_CENTURY:
          ClientManager.Instance.getEnvironment().setCentury(ClientManager.Instance.getCurrTask().getCompIdx(), NNumber.Parse(val));
          break;
        case ConstInterface.MG_ATTR_IDLETIME:
          ClientManager.Instance.getEnvironment().setIdleTime(ClientManager.Instance.getCurrTask().getCompIdx(), NNumber.Parse(val));
          break;
        case ConstInterface.MG_ATTR_UPD_IN_QUERY_LOWER:
          ClientManager.Instance.getEnvironment().setAllowUpdateInQueryMode(ClientManager.Instance.getCurrTask().getCompIdx(),
            val[0] === '1');
          break;
        case ConstInterface.MG_ATTR_CRE_IN_MODIFY_LOWER:
          ClientManager.Instance.getEnvironment().setAllowCreateInModifyMode(ClientManager.Instance.getCurrTask().getCompIdx(),
            val[0] === '1');
          break;
        case ConstInterface.MG_ATTR_CONTEXT_INACTIVITY_TIMEOUT_LOWER:
          ClientManager.Instance.getEnvironment().setContextInactivityTimeout(NNumber.Parse(val));
          break;
        case ConstInterface.MG_ATTR_CONTEXT_UNLOAD_TIMEOUT_LOWER:
          ClientManager.Instance.getEnvironment().setContextUnloadTimeout(NNumber.Parse(val));
          break;
        case ConstInterface.MG_ATTR_TERMINAL:
          ClientManager.Instance.getEnvironment().setTerminal(NNumber.Parse(val));
          break;
        case ConstInterface.MG_ATTR_CLOSE_TASKS_ON_PARENT_ACTIVATE:
          ClientManager.Instance.getEnvironment().setCloseTasksOnParentActivate(val[0] === '1');
          break;
      }
    }
  }

  /// <summary>
  ///   translate logical name
  /// </summary>
  /// <param name = "idx">index of the logical name</param>
  translate(logicalName: string): string {
    let stringBuilder: StringBuilder = new StringBuilder(logicalName);
    this.log(stringBuilder);
    return stringBuilder.ToString();
  }

  /// <summary></summary>
  /// <param name = "stringBldr"></param>
  private log(stringBldr: StringBuilder): void {
    let finished: boolean;
    do {
      let offset: number = 0;
      finished = true;
      while (offset < stringBldr.Length && stringBldr.get_Item(offset) > '\0'/*' '*/) {

        // '$' was define the logical name, not used any more
        if (stringBldr.get_Item(offset) === '%') {
          let oldLength: number = stringBldr.Length;
          offset = this.log_trans(stringBldr, offset);
          if (oldLength !== stringBldr.Length)
            finished = false;
        }
        else
          offset = offset + 1;
      }
    }
    while (!finished);
  }

  /// <summary></summary>
  /// <param name = "stringBldr"></param>
  /// <param name = "offset"></param>
  private log_trans(stringBldr: StringBuilder, offset: number): number {
    let ignoreTrans: boolean = false;
    let startSym: number = offset;
    let endSym: number = offset + 1;

    // find the end of the symbol
    while (endSym < stringBldr.Length) {
      if (stringBldr.get_Item(endSym) === '%')
        break;
      endSym++;
    }

    // add 1 to the len to get to the end of the symbol or if no end symbol was found add
    if (endSym >= stringBldr.Length) {
      offset = endSym;
      ignoreTrans = true;
    }
    else if (stringBldr.get_Item(endSym) !== '%')
      offset++;

    if (!ignoreTrans) {
      let sym: string = ConstInterface.INI_SECTION_LOGICAL_NAMES_BRACKETS +
        stringBldr.ToString(startSym + 1, endSym - startSym - 1);
      let trans: string = this.get(sym);

      // set the offset to the next char after the ending % of the name
      if (trans === null) {
        stringBldr.Replace(stringBldr.ToString(offset, endSym + 1 - offset), "", offset, endSym + 1 - offset);
        offset += 1;
      }
      else {
        stringBldr.Replace(stringBldr.ToString(startSym, endSym + 1 - startSym), trans, startSym,
          endSym + 1 - startSym);
      }
    }
    return offset;
  }
}
