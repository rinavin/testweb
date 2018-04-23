import {Hashtable, NString} from "@magic/mscorelib";
import {XmlParser, XMLConstants, Logger, MsgInterface, JSON_Utils, Misc} from "@magic/utils";
import {ApplicationMenus, Manager} from "@magic/gui";
import {ClientManager} from "../ClientManager";
import {ConstInterface} from "../ConstInterface";
import {CommandsProcessorManager} from "../CommandsProcessorManager";
import {MGDataCollection} from "../tasks/MGDataCollection";
import {Task} from "../tasks/Task";
import {isUndefined} from "util";

const MLS_EOF_CHARS_TO_READ: number = 10;
const START_TAG: string = "<ErrorCodes>";
const END_TAG: string = "</ErrorCodes>";

export class LanguageData {
  private _constMessages: Hashtable<string, string> = null;
  private _constMessagesContent: string = null;
  private _constMessagesUrl: string = null;
  private _mlsContent: string = null;
  private _mlsFileUrl: string = null;
  private _mlsStrings: Hashtable<string, string> = null;

  /// <summary>
  ///   To retrieve the content of the 'language' element <language>.....</language>
  /// </summary>
  fillData(): void {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;

    while (this.initInnerObjects(parser, parser.getNextTag())) {
    }

    this.InitConstMessagesTable();
  }

  /// <summary>
  ///   To extract the url of the const messages from the xml from <language><constmessages>***</constmessages></language>
  /// </summary>
  /// <param name = "foundTagName">possible tag name, name of object, which need be allocated</param>
  private initInnerObjects(parser: XmlParser, foundTagName: String): boolean {
    if (foundTagName == null)
      return false;

    switch (foundTagName) {
      case ConstInterface.MG_TAG_LANGUAGE:
        parser.setCurrIndex(parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex()) + 1);
        break;

      case ConstInterface.MG_TAG_CONSTMESSAGES: {
        let endUrlValue: number;

        parser.setCurrIndex(parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex()) + 1);
        endUrlValue = parser.getXMLdata().indexOf(XMLConstants.TAG_OPEN, parser.getCurrIndex());
        this._constMessagesUrl = parser.getXMLsubstring(endUrlValue);
        parser.setCurrIndex(endUrlValue);

        break;
      }

      case ConstInterface.MG_TAG_CONSTMESSAGESCONTENT: {
        let endUrlValue: number;

        parser.setCurrIndex(parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex()) + 1);
        endUrlValue = parser.getXMLdata().indexOf(ConstInterface.MG_TAG_CONSTMESSAGESCONTENT, parser.getCurrIndex()) - 2;
        this._constMessagesContent = parser.getXMLsubstring(endUrlValue);
        parser.setCurrIndex(endUrlValue);

        break;
      }

      case ConstInterface.MG_TAG_MLS_CONTENT: {
        let endUrlValue: number;

        parser.setCurrIndex(parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex()) + 1);
        endUrlValue = parser.getXMLdata().indexOf(ConstInterface.MG_TAG_MLS_CONTENT, parser.getCurrIndex()) - 2;
        this._mlsContent = parser.getXMLsubstring(endUrlValue);
        parser.setCurrIndex(endUrlValue);

        // A new MLS has arrived, if mlsStrings has values, clean it.
        if (!NString.IsNullOrEmpty(this._mlsContent)) {
          // clear the existing mls (if it exists)
          if (this._mlsStrings != null) {
            this._mlsStrings.Clear();
            this._mlsStrings = null;
          }
          // we got a new content. refresh the menus.
          this.RefreshMenusText();
        }

        // If new MLS is an empty string, clean the MLS data
        if (NString.IsNullOrEmpty(this._mlsContent) && this._mlsContent != null) {
          this._mlsContent = null;
          if (this._mlsStrings != null) {
            this._mlsStrings.Clear();
            this._mlsStrings = null;
            this.RefreshMenusText();
          }
        }

        break;
      }

      case ConstInterface.MG_TAG_MLS_FILE_URL: {
        let endUrlValue: number;

        parser.setCurrIndex(parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex()) + 1);
        endUrlValue = parser.getXMLdata().indexOf(XMLConstants.TAG_OPEN, parser.getCurrIndex());
        this._mlsFileUrl = parser.getXMLsubstring(endUrlValue).trim();

        // A new MLS has arrived, if mlsStrings has values, clean it.
        if (!NString.IsNullOrEmpty(this._mlsFileUrl)) {
          // clear the existing mls (if it exists)
          if (this._mlsStrings != null) {
            this._mlsStrings.Clear();
            this._mlsStrings = null;
          }
          // we got a new file. refresh the menus.
          this.RefreshMenusText();
        }
        // If new MLS is an empty string, clean the MLS data
        else if (NString.IsNullOrEmpty(this._mlsFileUrl) && this._mlsFileUrl != null) {
          this._mlsFileUrl = null;
          if (this._mlsStrings != null) {
            this._mlsStrings.Clear();
            this._mlsStrings = null;
            this.RefreshMenusText();
          }
        }

        parser.setCurrIndex(endUrlValue);
        break;
      }

      case ConstInterface.MG_TAG_CONSTMESSAGES_END:
      case ConstInterface.MG_TAG_MLS_FILE_URL_END:
      case ConstInterface.MG_TAG_CONSTMESSAGESCONTENT_END:
      case ConstInterface.MG_TAG_MLS_CONTENT_END:
        parser.setCurrIndex2EndOfTag();
        break;

      case ConstInterface.MG_TAG_LANGUAGE_END:
        parser.setCurrIndex2EndOfTag();
        return false;

      default:
        Logger.Instance.WriteExceptionToLogWithMsg("There is no such tag in LanguageData.initInnerObjects(): " + foundTagName);
        return false;
    }

    return true;
  }

  /// <summary> Returns the const msg by msgId. </summary>
  /// <param name="msgId"></param>
  /// <returns></returns>
  getConstMessage(msgId: string): string {
    // Map default message ID to corresponding message string.
    if (this._constMessages === null) {
      this._constMessages = new Hashtable<string, string>();
      for (let i: number = 0; i <= MsgInterface.DefaultMessages.length - 1; i = i + 1) {
        this._constMessages.set_Item(MsgInterface.DefaultMessages[i].MsgID, MsgInterface.DefaultMessages[i].MsgString);
      }
    }

    return <string>this._constMessages.get_Item(msgId);
  }

  /// <summary> Initialize the const msg table from either the URL or the XML contents. </summary>
  private InitConstMessagesTable(): void {
    try {
      let msgsInCommentString: String = null;
      if (this._constMessagesUrl != null || this._constMessagesContent != null) {
        if (this._constMessagesUrl != null) {
          try {
            // get the content from the server
            msgsInCommentString = CommandsProcessorManager.GetContent(this._constMessagesUrl);
          }
          catch (err) {
            Logger.Instance.WriteExceptionToLogWithMsg(NString.Format("Unknown message file: \"{0}\"", this._constMessagesUrl));
          }
        }
        else {
          // No cache - we have all the data here
          msgsInCommentString = this._constMessagesContent;
        }

        if (msgsInCommentString != null) {
          // ignore the comment wrapper
          let startData: number = msgsInCommentString.indexOf(START_TAG);
          let endData: number = msgsInCommentString.indexOf(END_TAG) + END_TAG.length;
          let retrievedConstMessages: string = msgsInCommentString.substr(startData, (endData) - (startData));

          // parse 'constMessages' into 'languageMessages'
          this.fillConstMessagesTable(retrievedConstMessages);
        }
      }
      else {
        Logger.Instance.WriteDevToLog("'constMessagesUrl' and 'constMessagesContent' were not initialized.");
      }
    }
    catch (ex) {
      Logger.Instance.WriteExceptionToLog(ex);
    }
  }

  /// <summary>
  ///   Read the const msgs from the xml and fill the const msg table.
  /// </summary>
  /// <param name = "constMessages"></param>
  private fillConstMessagesTable(constMessages: string): void {
    try {
      if (constMessages !== null) {
        this._constMessages = new Hashtable();
        JSON_Utils.JSONFromXML(constMessages, this.FillConstMessagesFromJSON.bind(this));
      }
    }
    catch (ex) {
        Logger.Instance.WriteExceptionToLog(ex);
    }
  }

  private FillConstMessagesFromJSON(error, result): void {

    // If there was an error in parsing the XML,
    if (error != null) {
      throw error;
    }

    let errorMessages = result['ErrorCodes']['ErrorMessage'];

    for (let i = 0; i < errorMessages.length; i++) {
      let errorId = errorMessages[i]['$']['id'];
      let errorMessage = errorMessages[i]['_'];

      this._constMessages.set_Item(errorId, (isUndefined(errorMessage) ? "" : errorMessage.trim()));
    }
  }

  /// <summary>
  ///   Return the translation on the fromString. If the mlsStrings_ table is empty, read it from the file a and fill it.
  /// </summary>
  /// <param name = "fromString"></param>
  translate(fromString: string): string {
    let toString: string = null;

    if (this._mlsFileUrl == null && this._mlsContent == null)
      return fromString;

    try {
      if (this._mlsStrings == null) {
        this.fillMlsMessagesTable();
      }

      if (this._mlsStrings != null)
        toString = this._mlsStrings.get_Item(fromString);

      if (toString == null)
        toString = fromString;
    }
    catch (e) {
      console.log(e);
    }

    return toString;
  }

  /// <summary>
  ///   Fill the mlsStrings_ table. Get the file, read the number of translation from its location at the last
  ///   line of the file. Then loop on the file from the beginning and fill the table.
  /// </summary>
  fillMlsMessagesTable(): void {
    // TODO : implement this method. Skipped it temporarily because it contains Stream manipulation.
    // try {
    //   if (this._mlsContent != null) {
    //     if (this._mlsContent.length > 0) {
    //       var contentLen: number = this._mlsContent.length;
    //       var linePairs: number = 0;
    //       var srcLine: String = this._mlsContent + 3;
    //       this._mlsStrings = new Hashtable();
    //       var linesStr: String = this._mlsContent.Substring(LanguageData.MLS_EOF_CHARS_TO_READ);
    //       linePairs = Convert.ToInt32(linesStr, 16);
    //       var tokens: String[] = StrUtil.tokenize(srcLine, "\n");
    //       for (var line: number = 0; line < linePairs * 2; line += 2)
    //         this._mlsStrings[tokens[line]] = tokens[line + 1];
    //     }
    //   }
    //   else {
    //     var contentStr: string = CommandsProcessorManager.GetContent(this._mlsFileUrl);
    //     var content: number[] = System.Text.Encoding.Unicode.GetBytes(contentStr);
    //     var stream: Stream = new MemoryStream(content);
    //     if (stream != null && stream.Length > 0) {
    //       var br: StreamReader = new StreamReader(stream, Encoding.Unicode);
    //       var contentLen: number = stream.Length;
    //       var linePairs: number = 0;
    //       var srcLine: String;
    //       var transLine: String;
    //       this._mlsStrings = new Hashtable();
    //       br.BaseStream.Seek(contentLen - (LanguageData.MLS_EOF_CHARS_TO_READ * 2), SeekOrigin.Begin);
    //       var linesStr: String = br.ReadLine();
    //       linePairs = Convert.ToInt32(linesStr, 16);
    //       br.BaseStream.Seek(2, SeekOrigin.Begin);
    //       for (var pairNum: number = 0; pairNum < linePairs; pairNum++) {
    //         srcLine = br.ReadLine();
    //         transLine = br.ReadLine();
    //         this._mlsStrings[srcLine] = transLine;
    //       }
    //     }
    //   }
    // }
    // catch (e) {
    //   Misc.WriteStackTrace(e, Console.Error);
    // }
  }

  /// <summary>
  ///   The menu texts needs to be refreshed due to a change in the language.
  /// </summary>
  private RefreshMenusText(): void {
    let ctlIdx: number = 0;
    let mainProg: Task = MGDataCollection.Instance.GetMainProgByCtlIdx(ctlIdx);

    while (mainProg != null) {
      let menus: ApplicationMenus = Manager.MenuManager.getApplicationMenus(mainProg);

      if (menus != null)
        menus.refreshMenuesTextMls();

      ctlIdx = mainProg.getCtlIdx();
      mainProg = <Task>mainProg.getMGData().getNextMainProg(ctlIdx);
    }
  }
}
