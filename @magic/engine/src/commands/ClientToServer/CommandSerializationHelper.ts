import {Int32, StringBuilder, List} from "@magic/mscorelib";
import {StorageAttribute, ViewRefreshMode, XMLConstants} from "@magic/utils";
import {MGDataCollection} from "../../tasks/MGDataCollection";
import {ConstInterface} from "../../ConstInterface";
import {RecordUtils} from "@magic/gui";
import {Operation} from "../../rt/Operation";


/// <summary>
/// helper class - supplies methods for serialization of commands data.
/// </summary>
export class CommandSerializationHelper {
  private message: StringBuilder = new StringBuilder();

  GetString(): string {
    return this.message.ToString();
  }

  SerializeTaskTag(taskTag: string): void {
    // QCR #980454 - the task id may change during the task's lifetime, so taskId might
    // be holding the old one - find the task and re-fetch its current ID.
    let id: string = MGDataCollection.Instance.getTaskIdById(taskTag);

    this.SerializeAttribute(XMLConstants.MG_ATTR_TASKID, id);
  }

  SerializeFldId(fldId: number): void {
    this.SerializeAttribute(ConstInterface.MG_ATTR_FIELDID, fldId);
  }

  SerializeDitIdx(ditIdx: number): void {
    if (ditIdx > Int32.MinValue) {
      this.SerializeAttribute(XMLConstants.MG_ATTR_DITIDX, ditIdx);
    }
  }

  SerializeRouteParams(operation: Operation): void {

    let routeParams: List<any> = operation.getRouteParams();
    let routeValStr: string = '';
      for (let i = 0; i < routeParams.length; i++) {
        routeValStr = routeValStr.concat(RecordUtils.serializeItemVal(routeParams[i], StorageAttribute.UNICODE, StorageAttribute.SKIP, true));
      }
    this.SerializeAttribute(ConstInterface.MG_ATTR_ROUTE_PARAMS, routeValStr);
  }


  SerializeRefreshMode(refreshMode: ViewRefreshMode): void {
    if (refreshMode !== ViewRefreshMode.None) {
      this.SerializeAttribute(ConstInterface.MG_ATTR_REALREFRESH, refreshMode);
    }
  }

  SerializeMagicEvent(magicEvent: number): void {
    this.SerializeAttribute(ConstInterface.MG_ATTR_MAGICEVENT, magicEvent);
  }

  SerializeCloseSubformOnly(closeSubformOnly: boolean): void {
    if (closeSubformOnly)
      this.SerializeAttribute(ConstInterface.MG_ATTR_CLOSE_SUBFORM_ONLY, "1");
  }

  SerializeKeyIndex(keyIndex: number): void {
    this.SerializeAttribute(ConstInterface.MG_ATTR_KEY, keyIndex);
  }

  SerializeAttribute(attribute: string, value: string): void;
  SerializeAttribute(attribute: string, value: number): void;
  SerializeAttribute(attribute: string, value: string): void;
  SerializeAttribute(attribute: string, value: any): void {
    if (arguments.length === 2 && (attribute === null || attribute.constructor === String) && (value === null || value.constructor === String)) {
      this.SerializeAttribute_0(attribute, value);
      return;
    }
    if (arguments.length === 2 && (attribute === null || attribute.constructor === String) && (value === null || value.constructor === Number)) {
      this.SerializeAttribute_1(attribute, value);
      return;
    }
    this.SerializeAttribute_2(attribute, value);
  }

  private SerializeAttribute_0(attribute: string, value: string): void {
    this.message.Append(" " + attribute + "=\"" + value + "\"");
  }

  private SerializeAttribute_1(attribute: string, value: number): void {
    this.message.Append(" " + attribute + "=\"" + value + "\"");
  }

  private SerializeAttribute_2(attribute: string, value: string): void {
    this.message.Append(" " + attribute + "=\"" + value + "\"");
  }
}
