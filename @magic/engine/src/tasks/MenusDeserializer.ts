import {Debug} from "@magic/mscorelib";
import {Logger, XMLConstants, XmlParser, JSON_Utils} from "@magic/utils";
import {ClientManager} from "../ClientManager";
import {Task} from "./Task";
import {MGDataCollection} from "./MGDataCollection";

// @dynamic
export class MenusDeserializer {
  private static _instance: MenusDeserializer;
  public static get Instance(): MenusDeserializer {
    if (MenusDeserializer._instance == null)
      MenusDeserializer._instance = new MenusDeserializer();

    return MenusDeserializer._instance;
  }

  private constructor() {
  }

  public loadFromXML(XMLdata: string): void {

    try {
      if (XMLdata !== null)
        JSON_Utils.JSONFromXML(XMLdata, this.FillFromJSON.bind(this));
      ClientManager.Instance.RefreshMenus();
    }
    catch (ex) {
      Logger.Instance.WriteExceptionToLog(ex);
    }

  }

  private FillFromJSON (error, result): void {

    // If there was an error in parsing the XML,
    if (error != null) {
      throw error;
    }

    let ctlIdx: number = 0;
    let menuURL: string = null;

    let menuElements = result[XMLConstants.MG_TAG_MENUS_OPEN][XMLConstants.MG_TAG_MENU];

    for (let i = 0; i < menuElements.length; i++) {
      let menuElement: {ctl_idx: string, MenuURL: string} = menuElements[i]['$'];

      ctlIdx = +menuElement.ctl_idx;
      menuURL = XmlParser.unescape(menuElement.MenuURL);

      let mainPrg: Task = MGDataCollection.Instance.GetMainProgByCtlIdx(ctlIdx);
      Debug.Assert(mainPrg != null);
      mainPrg.setMenusFileURL(menuURL);
    }
  }
}
