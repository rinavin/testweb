import {Hashtable, List} from "@magic/mscorelib";
import {KeyboardItem, Modifiers} from "@magic/gui";
import {JSON_Utils} from "@magic/utils";
import {ConstInterface} from "../ConstInterface";

/// <summary>
///   data for <kdbmap>...</kdbmap>
/// </summary>
export class KeyboardMappingTable {
  private _kbdMap: Hashtable<number, List<KeyboardItem>> = null; // of KeyboardItem

  /// <summary>
  ///   CTOR
  /// </summary>
  constructor() {
    this._kbdMap = new Hashtable<number, List<KeyboardItem>>();
  }

  /// <summary>
  ///   computes the hashcode of a keyboard item
  /// </summary>
  /// <param name = "kbdKey">the keybord key identifier </param>
  /// <param name = "modifier">CTRL / ALT / SHIFT </param>
  /// <returns> hash code </returns>
  private getKeyboardItemHashCode(kbdKey: number, modifier: Modifiers): number {
    return (kbdKey * 1000) + modifier.charCodeAt(0);
  }

  /// <param name = "kbdKey">   keyboard </param>
  /// <param name = "modifier"> </param>
  /// <returns> action array for the corresponding hash code key of keyboard + modifier </returns>
  getActionArrayByKeyboard(kbdKey: number, modifier: Modifiers): List<KeyboardItem> {
    return <List<KeyboardItem>>this._kbdMap.get_Item(this.getKeyboardItemHashCode(kbdKey, modifier));
  }

  /// <summary>
  /// </summary>
  /// <param name="keyMapXml"></param>
  fillKbdMapTable(keyMapXml: string): void {
    if (keyMapXml !== null) {
      JSON_Utils.JSONFromXML(keyMapXml, this.FillFromJSON.bind(this));
    }
  }

  private FillFromJSON(error, result): void {

    // If there was an error in parsing the XML,
    if (error != null) {
      throw error;
    }

    let kbdItemArray: List<KeyboardItem> = null;
    let arrayKey: number;
    let actionId: number = 0;
    let keyCode: number = 0;
    let modifier: Modifiers = Modifiers.MODIFIER_NONE;
    let states: number = 0;

    let kbdItems = result[ConstInterface.MG_TAG_KBDMAP][ConstInterface.MG_TAG_KBDITM];

    for (let i = 0; i < kbdItems.length; i++) {
      let kbdItem: { actionid: string, keycode: string, modifier: string, states: string } = kbdItems[i]['$'];

      actionId = +kbdItem.actionid;
      keyCode = +kbdItem.keycode;
      modifier = <Modifiers>kbdItem.modifier;
      states = +kbdItem.states;
    }

    let kbdItm: KeyboardItem = new KeyboardItem(actionId, keyCode, modifier, states);
    arrayKey = this.getKeyboardItemHashCode(kbdItm.getKeyCode(), kbdItm.getModifier());

    kbdItemArray = <List<KeyboardItem>> this._kbdMap.get_Item(arrayKey);
    if (kbdItemArray == null) {
      kbdItemArray = new List<KeyboardItem>();
      this._kbdMap.set_Item(arrayKey, kbdItemArray);
    }

    kbdItemArray.push(kbdItm);
  }
}
