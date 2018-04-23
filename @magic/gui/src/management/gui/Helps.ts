import {HelpCommand, HelpType, XMLConstants, XmlParser} from "@magic/utils";
import {NNumber, List, NString} from "@magic/mscorelib";
import {Manager} from "../../Manager";
import {Events} from "../../Events";

/// <summary>
/// Base class for all the help types supported in magic.
/// </summary>
export abstract class MagicHelp {
  abstract GetHelpType(): HelpType;
}

/// <summary>
/// This class will contain the details required to draw the internal help window.
/// </summary>
export class InternalHelp extends MagicHelp {
  val: string = null;
  Name: string = null;
  FrameX: number = 0;
  FrameY: number = 0;
  FrameDx: number = 0;
  FrameDy: number = 0;
  SizedX: number = 0;
  SizedY: number = 0;
  FactorX: number = 0;
  FactorY: number = 0;
  Borderstyle: number = 0;
  TitleBar: number = 0;
  SystemMenu: number = 0;
  FontTableIndex: number = 0;

  GetHelpType(): HelpType {
    return HelpType.Internal;
  }

  constructor() {
    super();
  }
}

/// <summary>
/// This class will contain the details required to show prompt help.
/// </summary>
export class PromptpHelp extends MagicHelp {
  PromptHelpText: string = null;

  GetHelpType(): HelpType {
    return HelpType.Prompt;
  }

  constructor() {
    super();
  }
}

/// <summary>
/// This class will contain the details required to show tool tip help.
/// </summary>
export class ToolTipHelp extends MagicHelp {
  tooltipHelpText: string = null;

  GetHelpType(): HelpType {
    return HelpType.Tooltip;
  }

  constructor() {
    super();
  }
}

/// <summary>
/// This class will contain the details required to show URL help.
/// </summary>
export class URLHelp extends MagicHelp {
  urlHelpText: string = null;

  GetHelpType(): HelpType {
    return HelpType.URL;
  }

  constructor() {
    super();
  }
}

/// <summary>
/// This class will contain the details required to show windows help.
/// </summary>
export class WindowsHelp extends MagicHelp {
  FilePath: string = null;
  HelpCommand: HelpCommand = 0;
  HelpKey: string = null;

  GetHelpType(): HelpType {
    return HelpType.Windows;
  }

  constructor() {
    super();
  }
}

/// <summary>
/// data for <helptable> <helpitem value = "string"> ... </helptable>
/// </summary>
export class Helps {
  private _helps: List<MagicHelp> = null;

  /// <summary>
  /// CTOR
  /// </summary>
  constructor() {
    this._helps = new List<MagicHelp>();
  }

  /// <summary>
  /// To parse the input string and fill data field (helps) in the class.
  /// </summary>
  fillData(): void {
    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;
    while (this.initInnerObjects(parser.getNextTag())) {
    }
  }

  /// <summary>
  /// To initial inner object
  /// </summary>
  /// <param name = "foundTagName">of found/current tag</param>
  private initInnerObjects(foundTagName: string): boolean {
    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;

    if (foundTagName === null)
      return false;

    if (foundTagName === XMLConstants.MG_TAG_HELPTABLE)
      parser.setCurrIndex(parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex()) +
        1); //end of outer tad and its ">"
    // end of outer tad and its ">"
    else if (foundTagName === XMLConstants.MG_TAG_HELPITEM) {
      let endContext = parser.getXMLdata().indexOf(XMLConstants.TAG_TERM, parser.getCurrIndex());
      if (endContext !== -1 && endContext < parser.getXMLdata().length) {
        // last position of its tag
        let tag: string = parser.getXMLsubstring(endContext);
        parser.add2CurrIndex(tag.indexOf(XMLConstants.MG_TAG_HELPITEM) +
          XMLConstants.MG_TAG_HELPITEM.length);
        let tokensVector: List<string> = XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);
        this.fillHelpItem(tokensVector);
        parser.setCurrIndex(endContext + XMLConstants.TAG_TERM.length);
        return true;
      }
    }
    else if (foundTagName === "/" + XMLConstants.MG_TAG_HELPTABLE) {
      parser.setCurrIndex2EndOfTag();
      return false;
    }
    else {
      Events.WriteExceptionToLog("in Command.FillData() out of string bounds");
      return false;
    }
    return true;
  }

  /// <summary>
  /// Fill member element helps by <helpitem> tag
  /// </summary>
  /// <param name = "tokensVector">attribute/value/...attribute/value/ vector</param>
  private fillHelpItem(tokensVector: List<string>): void {
    // Since the first attribute is type of help. Extract this attribute to check type.
    let j: number = 0;
    let attribute: string = tokensVector.get_Item(j);
    let valueStr: string = tokensVector.get_Item(j + 1);
    let hlpType: string = XmlParser.unescape(valueStr).toString();

    switch (hlpType) {
      case XMLConstants.MG_ATTR_HLP_TYP_TOOLTIP:
        let toolTipHelp: ToolTipHelp = new ToolTipHelp();
        for (j = 2; j < tokensVector.length; j = j + 2) {
          attribute = tokensVector.get_Item(j);
          valueStr = tokensVector.get_Item(j + 1);
          if (attribute === XMLConstants.MG_ATTR_VALUE) {
            // #932086: Special characters in helps text are escaped while serializing,
            // so unescape the escaped characters.
            toolTipHelp.tooltipHelpText = XmlParser.unescape(valueStr).toString();
          }
          else
            Events.WriteExceptionToLog(NString.Format("There is no such tag in <helptable><helpitem ..>.Insert case to HelpTable.FillHelpItem for {0}", attribute));
        }
        this._helps.push(toolTipHelp);
        break;

      case XMLConstants.MG_ATTR_HLP_TYP_PROMPT:
        let promptpHelp: PromptpHelp = new PromptpHelp();
        for (j = 2; j < tokensVector.length; j = j + 2) {
          attribute = tokensVector.get_Item(j);
          valueStr = tokensVector.get_Item(j + 1);
          if (attribute === XMLConstants.MG_ATTR_VALUE) {
            // #932086: Special characters in helps text are escaped while serializing,
            // so unescape the escaped characters.
            promptpHelp.PromptHelpText = XmlParser.unescape(valueStr).toString();
          }
          else
            Events.WriteExceptionToLog(NString.Format("There is no such tag in <helptable><helpitem ..>.Insert case to HelpTable.FillHelpItem for {0}", attribute));
        }
        this._helps.push(promptpHelp);
        break;

      case XMLConstants.MG_ATTR_HLP_TYP_URL:
        let urlHelp: URLHelp = new URLHelp();
        for (j = 2; j < tokensVector.length; j = j + 2) {
          attribute = tokensVector.get_Item(j);
          valueStr = tokensVector.get_Item(j + 1);
          if (attribute === XMLConstants.MG_ATTR_VALUE)
            urlHelp.urlHelpText = valueStr;
          else
            Events.WriteExceptionToLog(NString.Format("There is no such tag in <helptable><helpitem ..>.Insert case to HelpTable.FillHelpItem for {0}", attribute));
        }
        this._helps.push(urlHelp);
        break;

      case XMLConstants.MG_ATTR_HLP_TYP_INTERNAL:
        let internalHelpWindowDetails: InternalHelp = new InternalHelp();
        // Init Internal Help Window Details.
        for (j = 2; j < tokensVector.length; j += 2) {
          attribute = tokensVector.get_Item(j);
          valueStr = tokensVector.get_Item(j + 1);

          if (attribute === XMLConstants.MG_ATTR_VALUE) {
            internalHelpWindowDetails.val = XmlParser.unescape(valueStr).toString();
          }
          else if (attribute === XMLConstants.MG_ATTR_INTERNAL_HELP_NAME) {
            internalHelpWindowDetails.Name = XmlParser.unescape(valueStr).toString();
          }
          else if (attribute === XMLConstants.MG_ATTR_INTERNAL_HELP_FRAMEX) {
            internalHelpWindowDetails.FrameX = NNumber.Parse(XmlParser.unescape(valueStr));
          }
          else if (attribute === XMLConstants.MG_ATTR_INTERNAL_HELP_FRAMEY) {
            internalHelpWindowDetails.FrameY = NNumber.Parse(XmlParser.unescape(valueStr));
          }
          else if (attribute === XMLConstants.MG_ATTR_INTERNAL_HELP_FRAMEDX) {
            internalHelpWindowDetails.FrameDx = NNumber.Parse(XmlParser.unescape(valueStr));
          }
          else if (attribute === XMLConstants.MG_ATTR_INTERNAL_HELP_FRAMEDY) {
            internalHelpWindowDetails.FrameDy = NNumber.Parse(XmlParser.unescape(valueStr));
          }
          else if (attribute === XMLConstants.MG_ATTR_INTERNAL_HELP_SIZEDX) {
            internalHelpWindowDetails.SizedX = NNumber.Parse(XmlParser.unescape(valueStr));
          }
          else if (attribute === XMLConstants.MG_ATTR_INTERNAL_HELP_SIZEDY) {
            internalHelpWindowDetails.SizedY = NNumber.Parse(XmlParser.unescape(valueStr));
          }
          else if (attribute === XMLConstants.MG_ATTR_INTERNAL_HELP_FACTORX) {
            internalHelpWindowDetails.FactorX = NNumber.Parse(XmlParser.unescape(valueStr));
          }
          else if (attribute === XMLConstants.MG_ATTR_INTERNAL_HELP_FACTORY) {
            internalHelpWindowDetails.FactorY = NNumber.Parse(XmlParser.unescape(valueStr));
          }
          else if (attribute === XMLConstants.MG_ATTR_INTERNAL_HELP_BORDERSTYLE) {
            internalHelpWindowDetails.Borderstyle = NNumber.Parse(XmlParser.unescape(valueStr));
          }
          else if (attribute === XMLConstants.MG_ATTR_INTERNAL_TITLE_BAR) {
            internalHelpWindowDetails.TitleBar = NNumber.Parse(XmlParser.unescape(valueStr));
          }
          else if (attribute === XMLConstants.MG_ATTR_INTERNAL_HELP_SYSTEM_MENU) {
            internalHelpWindowDetails.SystemMenu = NNumber.Parse(XmlParser.unescape(valueStr));
          }
          else if (attribute === XMLConstants.MG_ATTR_INTERNAL_HELP_FONT_TABLE_INDEX) {
            internalHelpWindowDetails.FontTableIndex = NNumber.Parse(XmlParser.unescape(valueStr));
          }
          else
            Events.WriteExceptionToLog(NString.Format("There is no such tag in <helptable><helpitem ..>.Insert case to HelpTable.FillHelpItem for {0}", attribute));
        }

        // Add help object to collection.
        this._helps.push(internalHelpWindowDetails);
        break;

      case XMLConstants.MG_ATTR_HLP_TYP_WINDOWS:
        let wndHelpDetails: WindowsHelp = new WindowsHelp();

        // Init Windows Help Details.
        for (j = 2; j < tokensVector.length; j = j + 2) {
          attribute = tokensVector.get_Item(j);
          valueStr = tokensVector.get_Item(j + 1);
          if (attribute === XMLConstants.MG_ATTR_WINDOWS_HELP_FILE) {
            wndHelpDetails.FilePath = valueStr;
          }
          else if (attribute === XMLConstants.MG_ATTR_WINDOWS_HELP_COMMAND) {
              wndHelpDetails.HelpCommand = <HelpCommand>NNumber.Parse(valueStr);
          }
          else if (attribute === XMLConstants.MG_ATTR_WINDOWS_HELP_KEY) {
            wndHelpDetails.HelpKey = XmlParser.unescape(valueStr).toString();
          }
          else
            Events.WriteExceptionToLog(NString.Format("There is no such tag in <helptable><helpitem ..>.Insert case to HelpTable.FillHelpItem for {0}", attribute));
        }
        // Add help object to collection.
        this._helps.push(wndHelpDetails);
        break;
    }
  }

  getHelp(idx: number): MagicHelp {
    let flag: boolean = idx < 0 || idx >= this._helps.length;
    let result: MagicHelp;
    if (flag) {
      result = null;
    }
    else {
      result = this._helps.get_Item(idx);
    }
    return result;
  }
}
