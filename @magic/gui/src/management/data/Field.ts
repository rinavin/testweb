import {FieldDef} from "./FieldDef";
import {ControlTable} from "../gui/ControlTable";
import {DataViewBase} from "./DataViewBase";
import {MgControlBase} from "../gui/MgControlBase";
import {ITask} from "../tasks/ITask";
import {List, NString} from "@magic/mscorelib";
import {Manager} from "../../Manager";
import {GuiConstants} from "../../GuiConstants";

export abstract class Field extends FieldDef {
  ControlToFocus: MgControlBase = null;
  protected _controls: ControlTable = null;
  protected _dataview: DataViewBase = null; // reference to the dataview in order to access record data (updating, etc...)

  /// <summary>
  /// CTOR
  /// </summary>
  /// <param name="id"> idx in FieldsTable </param>
  constructor(id: number) {
    super(id);
  }

  /// <summary>
  /// get the task which the field belongs to
  /// </summary>
  getTask(): ITask {
    return this._dataview.getTask();
  }

  /// <summary>
  ///   update the display
  /// </summary>
  updateDisplay(displayValue: string, isNull: boolean, calledFromEditSet: boolean): void {
    let ctrl: MgControlBase = null;
    let ctrlValue: MgControlBase = null;
    let defaultValue: string = GuiConstants.DEFAULT_VALUE_INT.toString();
    let savedValue: string = null;
    let savePrevValue: string = null;

    let savedIsNull: boolean = false;
    let savePrevIsNull: boolean = false;

    if (this._controls !== null) {
      let firstControlValue: MgControlBase = null;
      let foundControlValue: boolean = false;
      let savedControlToFocus: MgControlBase = this.ControlToFocus;
      for (let i: number = 0; i < this._controls.getSize(); i = i + 1) {
        ctrl = this._controls.getCtrl(i);
        if (calledFromEditSet) {
          savedValue = ctrl.Value;
          savePrevValue = ctrl.getPrevValueInArray(ctrl.getDisplayLine(true));
          savedIsNull = ctrl.IsNull;
          savePrevIsNull = ctrl.getPrevIsNullsInArray();
        }
        if (!ctrl.getForm().inRefreshDisplay()) {
          ctrl.resetPrevVal(); // force update of the display
          ctrl.SetAndRefreshDisplayValue(displayValue, isNull, false);

          // Even if the control that contains the correct value is found we don't break the loop because:
          // (1) we need to refresh all the controls
          // (2) the last control that was focus with the correct value is the one that should be checked
          if (!ctrl.isRadio())
            if (ctrlValue === null || ctrl.Value !== null && !(ctrl.Value === defaultValue) && ctrl === savedControlToFocus)
              ctrlValue = ctrl;
          else {
            // Fixed bug#:780359, for radio control select the correct control
            // if not found any ctrlvalue(the control that was in focuse)
            // select the first control with the correct value if not exist select the first control.

            // a. save the first control (with or without the correct value)
            if (firstControlValue === null)
              firstControlValue = ctrl;
            if (ctrl.Value !== null && !(ctrl.Value === defaultValue)) {
              // b. save the first control with the correct value
              if (!foundControlValue) {
                firstControlValue = ctrl;
                foundControlValue = true;
              }
              // c.save the control that belong to the focus control
              if (ctrl === savedControlToFocus)
                ctrlValue = ctrl;
              else if (ctrlValue === null)
                ctrlValue = firstControlValue;
            }
          }
        }
        if (calledFromEditSet)
          ctrl.setValueForEditSet(savedValue, savePrevValue, savedIsNull, savePrevIsNull);
      }

      // if there was a control that had the correct value and this field is linked to more than one
      // control then it means that the control that contained the correct value might have been reset by
      // one of its siblings so there is a need to refresh its value again.
      if (ctrlValue !== null) {
        if (calledFromEditSet) {
          savedValue = ctrlValue.Value;
          savePrevValue = ctrlValue.getPrevValueInArray(ctrlValue.getDisplayLine(true));
          savedIsNull = ctrlValue.IsNull;
          savePrevIsNull = ctrlValue.getPrevIsNullsInArray();
        }

        // save the control that belong to the value on the field.
        this.ControlToFocus = ctrlValue;
        if (this._controls.getSize() > 1) {
          ctrlValue.resetPrevVal(); // force update of the display
          ctrlValue.SetAndRefreshDisplayValue(displayValue, isNull, false);
        }

        if (calledFromEditSet) {
          ctrlValue.setValueForEditSet(savedValue, savePrevValue, savedIsNull, savePrevIsNull);
          ctrlValue.getForm().getTask().setLastParkedCtrl(ctrlValue);
          Manager.SetFocus(ctrlValue, -1);
        }

        // Fixed bug#:465616, when the control is the current focus control then refresh his focus control
        if (ctrlValue.isRadio() && ctrlValue === ctrlValue.getForm().getTask().getLastParkedCtrl())
          Manager.SetFocus(ctrlValue, -1);
      }
    }
  }

  /// <summary>
  /// set a reference to a control attached to this field
  /// </summary>
  /// <param name = "ctrl">the control which is attached to this field</param>
  SetControl(ctrl: MgControlBase): void {
    if (this._controls === null)
      this._controls = new ControlTable();
    if (!this._controls.contains(ctrl)) {
      this._controls.addControl(ctrl);

      // save the first ctrl
      if (this._controls.getSize() === 1)
        this.ControlToFocus = ctrl;
    }
  }

  /// <summary>
  /// removes a reference to a control attached to this field
  /// </summary>
  /// <param name = "ctrl">the control which is attached to this field</param>
  RemoveControl(ctrl: MgControlBase): void {
    this._controls.Remove(ctrl);
  }

  /// <summary>
  /// Returns the list of radio controls which are attached to the same field and resides on the same task.
  /// </summary>
  GetRadioCtrls(): List<MgControlBase> {
    let list: List<MgControlBase> = new List<MgControlBase>();

    if (this._controls !== null) {
      for (let i: number = 0; i < this._controls.getSize(); i = i + 1) {
        let ctrl: MgControlBase = this._controls.getCtrl(i);

        if (ctrl.isRadio())
          list.push(ctrl);
      }
    }
    return list;
  }

  toString(): string {
    return NString.Format("(Field {0}-{1}) in task {2}", this._id, this._varName, this.getTask());
  }
}
