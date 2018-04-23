import {IClientCommand} from "../IClientCommand";
import {Logger, XMLConstants, XmlParser} from "@magic/utils";
import {ApplicationException, Debug, List} from "@magic/mscorelib";
import {ClientManager} from "../../ClientManager";
import {IClientTargetedCommand} from "../IClientTargetedCommand";
import {OpenURLCommand} from "./OpenURLCommand";
import {ClientTargetedCommandType} from "../../enums";
import {AbortCommand} from "./AbortCommand";
import {ClientRefreshCommand} from "./ClientRefreshCommand";
import {EnhancedVerifyCommand} from "./EnhancedVerifyCommand";
import {ResetRangeCommand} from "./ResetRangeCommand";
import {AddLocateCommand} from "./AddLocateCommand";
import {ResetLocateCommand} from "./ResetLocateCommand";
import {AddRangeCommand} from "./AddRangeCommand";
import {ResultCommand} from "./ResultCommand";
import {AddSortCommand} from "./AddSortCommand";
import {ResetSortCommand} from "./ResetSortCommand";
import {VerifyCommand} from "./VerifyCommand";
import {ConstInterface} from "../../ConstInterface";

export class XMLBasedCommandBuilder {
  private newTaskXML: string = null;

  /// <summary>
  ///   Need part input String to relevant for the class data
  /// </summary>
  public fillData(): IClientCommand {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;

    let endContext: number = parser.getXMLdata().indexOf(XMLConstants.TAG_TERM, parser.getCurrIndex());

    if (endContext !== -1 && endContext < parser.getXMLdata().length) {
      // last position of its tag
      let tag: String = parser.getXMLsubstring(endContext);
      parser.add2CurrIndex(tag.indexOf(ConstInterface.MG_TAG_COMMAND) + ConstInterface.MG_TAG_COMMAND.length);

      let tokensVector: List<string> = XmlParser.getTokens(parser.getXMLsubstring(endContext),
                                                           XMLConstants.XML_ATTR_DELIM);
      let command: IClientTargetedCommand = this.initElements(tokensVector);
      parser.setCurrIndex(endContext + XMLConstants.TAG_TERM.length); // to delete ">" too

      let openUrlCommand = command instanceof OpenURLCommand ? <OpenURLCommand> command : null;
      if (openUrlCommand != null) {
        this.getTaskXML(parser);
        openUrlCommand.NewTaskXML = this.newTaskXML;
      }
      return command;
    }
    Logger.Instance.WriteDevToLog("in Command.FillData() out of string bounds");
    return null;
  }

  /// <summary>
  ///   parse elements
  /// </summary>
  /// <param name = "tokensVector">the tokens vector</param>
  private initElements(tokensVector: List<string>): IClientTargetedCommand {
    Debug.Assert(tokensVector.get_Item(0) === XMLConstants.MG_ATTR_TYPE, "The first attribute of a <command> element must be the command type.");

    let commandType: ClientTargetedCommandType = this.getType(tokensVector.get_Item(1).toLowerCase());
    let clientTargetedCommand: IClientTargetedCommand = this.CreateCommand(commandType);

    for (let i: number = 2; i < tokensVector.length; i = i + 2) {
      let attribute: string = tokensVector.get_Item(i);
      let value: string = tokensVector.get_Item(i + 1);
      clientTargetedCommand.HandleAttribute(attribute, value);
    }
    return clientTargetedCommand;
  }

  private CreateCommand(commandType: ClientTargetedCommandType): IClientTargetedCommand {
    switch (commandType) {
      case ClientTargetedCommandType.Abort:
        return new AbortCommand();

      case ClientTargetedCommandType.Verify:
        return new VerifyCommand();

      case ClientTargetedCommandType.EnhancedVerify:
        return new EnhancedVerifyCommand();

      case ClientTargetedCommandType.OpenURL:
        return new OpenURLCommand();

      case ClientTargetedCommandType.Result:
        return new ResultCommand();

      case ClientTargetedCommandType.AddRange:
        return new AddRangeCommand();

      case ClientTargetedCommandType.AddLocate:
        return new AddLocateCommand();

      case ClientTargetedCommandType.AddSort:
        return new AddSortCommand();

      case ClientTargetedCommandType.ResetRange:
        return new ResetRangeCommand();

      case ClientTargetedCommandType.ResetLocate:
        return new ResetLocateCommand();

      case ClientTargetedCommandType.ResetSort:
        return new ResetSortCommand();

      case ClientTargetedCommandType.ClientRefresh:
        return new ClientRefreshCommand();

      default:
        throw new ApplicationException("Unknown client targeted command type " + commandType);
    }
  }

  /// <summary>
  ///   Get XML for if new task
  /// </summary>
  /// <param name = "foundTagName">XML tag</param>
  private getTaskXML(parser: XmlParser): void {
    if (parser.getNextTag() !== ConstInterface.MG_TAG_TASK_XML)
      throw new ApplicationException("Task's XML is missing");
    this.newTaskXML = parser.ReadContentOfCurrentElement();
  }

  /// <summary>
  ///   get type of command by value of 'type' attribute
  ///   ONLY Server to Client commands
  /// </summary>
  private getType(valueAttr: String): ClientTargetedCommandType {
    let type: ClientTargetedCommandType;

    switch (valueAttr) {
      case ConstInterface.MG_ATTR_VAL_ABORT:
        type = ClientTargetedCommandType.Abort;
        break;

      case ConstInterface.MG_ATTR_VAL_VERIFY:
        type = ClientTargetedCommandType.Verify;
        break;

      case ConstInterface.MG_ATTR_VAL_ENHANCED_VERIFY:
        type = ClientTargetedCommandType.EnhancedVerify;
        break;

      case ConstInterface.MG_ATTR_VAL_RESULT:
        type = ClientTargetedCommandType.Result;
        break;

      case ConstInterface.MG_ATTR_VAL_OPENURL:
        type = ClientTargetedCommandType.OpenURL;
        break;

      case ConstInterface.MG_ATTR_VAL_ADD_RANGE:
        type = ClientTargetedCommandType.AddRange;
        break;

      case ConstInterface.MG_ATTR_VAL_ADD_LOCATE:
        type = ClientTargetedCommandType.AddLocate;
        break;

      case ConstInterface.MG_ATTR_VAL_ADD_SORT:
        type = ClientTargetedCommandType.AddSort;
        break;

      case ConstInterface.MG_ATTR_VAL_RESET_RANGE:
        type = ClientTargetedCommandType.ResetRange;
        break;

      case ConstInterface.MG_ATTR_VAL_RESET_LOCATE:
        type = ClientTargetedCommandType.ResetLocate;
        break;

      case ConstInterface.MG_ATTR_VAL_RESET_SORT:
        type = ClientTargetedCommandType.ResetSort;
        break;

      case ConstInterface.MG_ATTR_VAL_CLIENT_REFRESH:
        type = ClientTargetedCommandType.ClientRefresh;
        break;

      default:
        type = <ClientTargetedCommandType>valueAttr[0];
        Logger.Instance.WriteExceptionToLogWithMsg("Command.getType there is no such SERVER to CLIENT command : " + valueAttr);
        break;
    }
    return type;
  }
}
