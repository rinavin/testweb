import {MgControlType, XMLConstants, XmlParser} from "@magic/utils";
import {MgFormBase} from "./MgFormBase";
import {Manager} from "../../Manager";
import {MgControlBase} from "./MgControlBase";
import {NString, List} from "@magic/mscorelib";

export class ControlTable {
  private _controls: List<MgControlBase> = null;
  private _mgForm: MgFormBase = null;

  /// <summary>CTOR</summary>
  constructor() {
    this._controls = new List();
  }

  /// <summary>parse input string and fill inner data</summary>
  fillData(mgForm: MgFormBase): void {
    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;
    this._mgForm = mgForm;
    while (this.initInnerObjects(parser.getNextTag())) {
    }
  }

  /// <summary>To allocate and fill inner objects of the class</summary>
  /// <param name = "foundTagName">name of tag, of object, which need be allocated</param>
  /// <returns> boolean if inner tags finished</returns>
  private initInnerObjects(foundTagName: string): boolean {
    if (foundTagName === null)
      return false;

    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;
    if (foundTagName === XMLConstants.MG_TAG_CONTROL) {
      let control: MgControlBase = this._mgForm.ConstructMgControl();
      control.fillData(this._mgForm, this._controls.length);
      this._controls.push(control);
    }
    else if (foundTagName === ("/" + XMLConstants.MG_TAG_CONTROL)) {
        parser.setCurrIndex2EndOfTag();
        return false;
    }
    else
      return false;

    return true;
  }

  /// <summary>get the size of the table</summary>
  /// <returns> the size of the table</returns>
  getSize(): number {
    return this._controls.length;
  }

  getCtrl(idx: number): MgControlBase;
  getCtrl(ctrlName: string): MgControlBase;
  getCtrl(idxOrCtrlName: any): MgControlBase {
    if (arguments.length === 1 && (idxOrCtrlName === null || idxOrCtrlName.constructor === Number)) {
      return this.getCtrl_0(idxOrCtrlName);
    }
    return this.getCtrl_1(idxOrCtrlName);
  }

  /// <summary>get control by its index</summary>
  /// <param name = "idx">is the index of the control in the table</param>
  /// <returns> the requested control object</returns>
  private getCtrl_0(idx: number): MgControlBase {
    if (idx < this.getSize())
      return this._controls.get_Item(idx);

    return null;
  }


  /// <summary>get control by its name</summary>
  /// <param name = "ctrlName">is the requested controls name</param>
  /// <returns> the requested control object</returns>
  private getCtrl_1(ctrlName: string): MgControlBase {
    if (!NString.IsNullOrEmpty(ctrlName)) {

      return this._controls.find(ctrl => {
        return (NString.Equals(ctrlName, ctrl.getName(), true) ||
          NString.Equals(ctrlName, ctrl.Name, true));
      });
    }

    return null;
  }

  /// <summary>get control (which is not the frame form) by its name</summary>
  /// <param name = "ctrlName">is the requested controls name</param>
  /// <param name="ctrlType"></param>
  /// <returns> the requested control object</returns>
  getCtrlByName(ctrlName: string, ctrlType: MgControlType): MgControlBase {
    if (!NString.IsNullOrEmpty(ctrlName)) {
      return this._controls.find(ctrl => {
        return ((ctrl.Type === ctrlType) && NString.Equals(ctrlName, ctrl.getName(), true) ||
          NString.Equals(ctrlName, ctrl.Name, true))
      });
    }
    return null;
  }

  /// <summary>
  /// get a control by its ISN
  /// </summary>
  /// <param name="isn"></param>
  /// <returns></returns>
  GetControlByIsn(isn: number): MgControlBase {
    let ctrlByIsn: MgControlBase = null;
    ctrlByIsn = this._controls.find(ctrl => {
      return (ctrl.ControlIsn === isn)
    });

    return ctrlByIsn;
  }

  /// <summary>
  /// get a control mathching the predicate
  /// </summary>
  /// <param name="predicate"></param>
  /// <returns></returns>
  GetControl(predicate: (value: MgControlBase) => boolean): MgControlBase {
    return this._controls.find(predicate);
  }

  public filter(callackFuntion: (item, index, array) => boolean): any {
    return this._controls.filter(callackFuntion);

  }

  /// <summary>returns true if this table contains the given control</summary>
  /// <param name = "ctrl">the control to look for</param>
  contains(ctrl: MgControlBase): boolean {
    let contains: boolean = false;
    if (ctrl !== null)
      contains = this._controls.Contains(ctrl);
    return contains;
  }

  /// <summary>add a control to the table</summary>
  /// <param name = "ctrl">is the control to be added</param>
  addControl(ctrl: MgControlBase): void {
    this._controls.push(ctrl);
  }

  /// <summary>set a control to a cell in the table</summary>
  /// <param name = "ctrl">is the control to be added</param>
  /// <param name = "index">where to set the control</param>
  setControlAt(ctrl: MgControlBase, index: number): void {
    if (this._controls.length <= index)
      this._controls.SetSize(index + 1);
    this._controls.set_Item(index, ctrl);
  }

  /// <summary>replace a control in the control table with null</summary>
  /// <param name = "index">of control to be deleted</param>
  deleteControlAt(index: number): void {
    this._controls.set_Item(index, null);
  }

  Remove(ctrl: MgControlBase): boolean;
  Remove(idx: number);
  Remove(ctrlOrIdx: any): boolean {
    if (arguments.length === 1 && (ctrlOrIdx === null || ctrlOrIdx instanceof MgControlBase)) {
      return this.Remove_0(ctrlOrIdx);
    }
    this.Remove_1(ctrlOrIdx);
  }

  /// <summary>removes a control from the table and returns true on success</summary>
  /// <param name = "ctrl">the control to remove</param>
  private Remove_0(ctrl: MgControlBase): boolean {
    this._controls.Remove(ctrl);
    return this._controls.Contains(ctrl);
  }

  /// <summary>removes a control from the table by index.</summary>
  /// <param name = "idx">the idx of the control to be removed</param>
  private Remove_1(idx: number): void {
    this._controls.RemoveAt(idx);
  }

  /// <param name = "inCtrl">the control whose index we need</param>
  /// <param name="includeSubs"></param>
  /// <returns> idx of a control in the table, excluding subforms control</returns>
  getControlIdx(inCtrl: MgControlBase, includeSubs: boolean): number {
    let counter: number = 0;
    for (let i: number = 0; i < this._controls.length; i++) {
      let ctrl: MgControlBase = this._controls.get_Item(i);
      if (inCtrl === ctrl)
        return counter;
      else if (includeSubs || !ctrl.isSubform())
        counter++;
    }
    return -1;
  }

  /// <summary>
  /// An implementation of a predicate to select controls which are data controls, to be
  /// used as parameter for the 'GetControls' method.
  /// </summary>
  /// <param name="control">The control passed as parameter by the GetControl method.</param>
  /// <returns>The method returns true if the control is a data control. Otherwise it returns false.</returns>
  static SelectDataControlPredicate(control: MgControlBase): boolean {
    return control.isDataCtrl();
  }
}
