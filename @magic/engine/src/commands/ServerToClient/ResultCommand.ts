import {ClientTargetedCommandBase} from "./ClientTargetedCommandBase";
import {StorageAttribute, XMLConstants, XmlParser} from "@magic/utils";
import {IResultValue} from "../../rt/IResultValue";
import {ConstInterface} from "../../ConstInterface";

export class ResultCommand extends ClientTargetedCommandBase {
  private _isNull: boolean = false;
  private _attr: StorageAttribute = StorageAttribute.NONE;
  private _val: string = null;

  /// <summary>
  ///
  /// </summary>
  /// <param name="exp"></param>
  public Execute(res: IResultValue): void {
    // set value to 'global' Expression variable
    if (this._isNull)
      res.SetResultValue(null, StorageAttribute.NONE);
    else {
      if (this._val == null)
        this._val = "";
      res.SetResultValue(this._val, this._attr);
    }
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="attribute"></param>
  /// <param name="value"></param>
  public HandleAttribute(attribute: string, value: string): void {
    switch (attribute) {
      case ConstInterface.MG_ATTR_NULL:
        this._isNull = (XmlParser.getInt(value) === 1);
        break;

      case ConstInterface.MG_ATTR_PAR_ATTRS:
        this._attr = <StorageAttribute>value[0];
        break;

      case XMLConstants.MG_ATTR_VALUE:
        this._val = XmlParser.unescape(value);
        break;

      default:
        super.HandleAttribute(attribute, value);
        break;
    }
  }

  constructor() {
    super();
  }
}
