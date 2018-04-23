import {List} from "@magic/mscorelib";
import {MgForm} from "./MgForm";

/// <summary>
/// wrapper class for interactions with vector of created MgForms
/// </summary>
export class CreatedFormVector {
  private _createdFormVec: List<MgForm> = null;

  constructor() {
    this._createdFormVec = new List<MgForm>();
  }

  /// <summary>
  /// add form into vector
  /// </summary>
  /// <param name="mgForm"></param>
  add(mgForm: MgForm): void {
    this._createdFormVec.push(mgForm);
  }

  /// <summary>
  /// remove form from vector
  /// </summary>
  /// <param name="mgForm"></param>
  remove(mgForm: MgForm): void {
    this._createdFormVec.Remove(mgForm);
  }

  /// <summary>
  /// return count of elements in vector
  /// </summary>
  /// <returns></returns>
  Count(): number {
    return this._createdFormVec.length;
  }

  /// <summary>
  /// clears the vector
  /// </summary>
  Clear(): void {
    this._createdFormVec.Clear();
  }

  /// <summary>
  /// gets the element at 'index'
  /// </summary>
  /// <param name="index"></param>
  /// <returns></returns>
  get(index: number): MgForm {
    return this._createdFormVec.get_Item(index);
  }
}
