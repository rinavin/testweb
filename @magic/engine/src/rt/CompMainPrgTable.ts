import {Logger, StrUtil, XMLConstants, XmlParser} from "@magic/utils";
import {ClientManager} from "../ClientManager";
import {Int32, List, NString, NNumber} from "@magic/mscorelib";
import {ConstInterface} from "../ConstInterface";

export class CompMainPrgTable {
  private _ctlIdxTab: string[] = null;

  public fillData(): void {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;
    let endContext: number = parser.getXMLdata().indexOf(XMLConstants.TAG_TERM, parser.getCurrIndex());
    if (endContext !== -1 && endContext < parser.getXMLdata().length) {
      let tag: String = parser.getXMLsubstring(endContext);
      parser.add2CurrIndex(tag.indexOf(ConstInterface.MG_TAG_COMPMAINPRG) + ConstInterface.MG_TAG_COMPMAINPRG.length);
      let tokensVector: List<string> = XmlParser.getTokens(parser.getXMLsubstring(endContext),
                                                           XMLConstants.XML_ATTR_DELIM);
      Logger.Instance.WriteDevToLog("in CompMainPrg.FillData: " + tokensVector.toString());
      this.initElements(tokensVector);
      parser.setCurrIndex(endContext + XMLConstants.TAG_TERM.length);
      return;
    }
    Logger.Instance.WriteExceptionToLogWithMsg("in CompMainPrg.FillData() out of string bounds");
  }

  private initElements(tokensVector: List<string>): void {
    for (let j: number = 0; j < tokensVector.length; j += 2) {
      let attribute: string = (tokensVector.get_Item(j));
      let valueStr: string = (tokensVector.get_Item(j + 1));
      if (attribute === XMLConstants.MG_ATTR_VALUE) {
        valueStr = StrUtil.DeleteStringsFromEnds(valueStr, "\"");
        this.initCtlIdxTab(valueStr);
      }
      else Logger.Instance.WriteExceptionToLogWithMsg(NString.Format("There is no such index in CompMainPrg. Add case to CompMainPrg.initElements for {0}",
                                                              attribute));
    }
    Logger.Instance.WriteDevToLog("End CompMainPrg ");
  }

  private initCtlIdxTab(val: string): void {
    if (NString.IsNullOrEmpty(val))
      return;
    if (val.indexOf(",") !== -1)
      this._ctlIdxTab = StrUtil.tokenize(val, ",");
    else {
      this._ctlIdxTab = new Array(1);
      this._ctlIdxTab[0] = val;
    }
  }

  getCtlIdx(idx: number): number {
    if (idx >= 0 && idx < this.getSize()) {
      let s: string = this._ctlIdxTab[idx];
      return NNumber.Parse(s);
    }
    return -1;
  }

  public getIndexOf(ctlIdx: number): number {
    let i: number;
    for (i = 0; i < this.getSize(); i++) {
      if (ctlIdx === this.getCtlIdx(i))
        return i;
    }
    return -1;
  }

  getSize(): number {
    if (this._ctlIdxTab === null)
      return 0;
    return this._ctlIdxTab.length;
  }
}
