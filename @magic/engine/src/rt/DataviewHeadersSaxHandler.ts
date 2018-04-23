import {Hashtable, Dictionary} from "@magic/mscorelib";
import {JSON_Utils} from "@magic/utils";
import {DataviewHeaderFactory} from "./DataviewHeaderFactory";
import {ConstInterface} from "../ConstInterface";
import {isNullOrUndefined} from "util";
import {DataviewHeaderBase} from "./DataviewHeaderBase";
import {Task} from "../tasks/Task";

/// <summary>
/// sax parser for parsing link collection
/// </summary>
export class DataviewHeadersSaxHandler {
  private _dataviewHeaders: Hashtable<number, DataviewHeaderBase> = null;
  private _task: Task = null;
  private _dataviewHeadersFactory: DataviewHeaderFactory = null;

  /// <summary>
  /// CTOR - create and activate the parsing process
  /// </summary>
  /// <param name="task"></param>
  /// <param name="dataviewHeaders"></param>
  /// <param name="xmlData"></param>
  constructor(task: Task, dataviewHeaders: Hashtable<number, DataviewHeaderBase>, xmlData: string) {
    this._dataviewHeaders = dataviewHeaders;
    this._task = task;
    this._dataviewHeadersFactory = new DataviewHeaderFactory();

    JSON_Utils.JSONFromXML(xmlData, this.FillFromJSON.bind(this));
  }

  private FillFromJSON (error, result): void {
    // If there was an error in parsing the XML.
    if (error != null) {
      throw error;
    }

    let links = result[ConstInterface.MG_TAG_LINKS][ConstInterface.MG_TAG_LINK];

    if (!isNullOrUndefined(links) && links.constructor === Array) {
      for (let i = 0; i < links.length; i++) {
        let link = links[i]['$'];

        if (!isNullOrUndefined(link[ConstInterface.MG_ATTR_TABLE_INDEX])) {
          let tableIndex: number = +link[ConstInterface.MG_ATTR_TABLE_INDEX];
          let dataviewHeader: DataviewHeaderBase = this._dataviewHeadersFactory.CreateDataviewHeaders(this._task, tableIndex);

          let attributes: Dictionary<string> = new Dictionary();

          for (let key in link) {
            if (key !== ConstInterface.MG_ATTR_TABLE_INDEX) {
              attributes.Add(key, link[key]);
            }
          }

          dataviewHeader.SetAttributes(attributes);
          this._dataviewHeaders.set_Item(dataviewHeader.Id, dataviewHeader);
        }
      }
    }
  }
}
