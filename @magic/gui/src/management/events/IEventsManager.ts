import {MgControlBase} from "../gui/MgControlBase";
import {Priority} from "@magic/utils";
import {MgFormBase} from "../gui/MgFormBase";
import {Modifiers, RaisedBy} from "../../GuiEnums";
import {ITask} from "../tasks/ITask";

/// <summary>
/// functionality required by the GUI namespace from the EventsManager class.
/// </summary>
export interface IEventsManager {
  /// <summary></summary>
  /// <param name="ctrl"></param>
  /// <param name="DisplayLine"></param>
  /// <param name="code"></param>
  addInternalEventWithCtrlAndDisplayLineAndCode(ctrl: MgControlBase, DisplayLine: number, code: number): void;

  /// <summary></summary>
  /// <param name="ctrl"></param>
  /// <param name="code"></param>
  /// <param name="priority"></param>
  addInternalEventWithCtrlAndCodeAndPriority(ctrl: MgControlBase, code: number, priority: Priority): void;

  /// <summary></summary>
  /// <param name="form"></param>
  /// <param name="ctrl"></param>
  /// <param name="modifier"></param>
  /// <param name="keyCode"></param>
  /// <param name="start"></param>
  /// <param name="end"></param>
  /// <param name="text"></param>
  /// <param name="im"></param>
  /// <param name="isActChar"></param>
  /// <param name="suggestedValue"></param>
  /// <param name="code"></param>
  AddKeyboardEvent(form: MgFormBase, ctrl: MgControlBase, modifier: Modifiers, keyCode: number, start: number, end: number, text: string, isActChar: boolean, suggestedValue: string, code: number): void;

  /// <summary> Add internal event that was triggered by GUI queue to the queue </summary>
  /// <param name="ctrl"></param>
  /// <param name="code"></param>
  /// <param name="line"></param>
  addGuiTriggeredEventWithCtrlAndCodeAndLine(ctrl: MgControlBase, code: number, line: number): void;

  /// <summary> Add internal event that was triggered by GUI queue to the queue </summary>
  /// <param name="ctrl"></param>
  /// <param name="code"></param>
  /// <param name="line"></param>
  addGuiTriggeredEventWithCtrlAndCodeAndLineAndModifier(ctrl: MgControlBase, code: number, line: number, modifier: Modifiers): void;


  /// <summary> Add internal event that was triggered by GUI queue to the queue </summary>
  /// <param name="task"></param>
  /// <param name="code"></param>
  addGuiTriggeredEventWithTaskAndCode(task: ITask, code: number): void;

  /// <summary>
  /// Add internal event that was triggered by GUI queue to the queue
  /// </summary>
  /// <param name="task"></param>
  /// <param name="code"></param>
  /// <param name="onMultiMark"> true if mutimark continues</param>
  addGuiTriggeredEventWithTaskAndCodeAndOnMultiMark(task: ITask, code: number, onMultiMark: boolean): void;

  /// <summary> Add internal event that was triggered by GUI queue to the queue </summary>
  /// <param name="task"></param>
  /// <param name="code"></param>
  /// <param name="raisedBy"></param>
  addGuiTriggeredEventTaskAndCodeAndRaisedBy(task: ITask, code: number, raisedBy: RaisedBy): void;

  /// <summary> handle Column Click event on Column </summary>
  /// <param name="columnCtrl"></param>
  /// <param name="direction"></param>
  /// <param name="columnHeader"></param>
  AddColumnClickEvent(columnCtrl: MgControlBase, direction: number, columnHeader: string): void;

  /// <summary>
  /// handle column filter event on column
  /// </summary>
  /// <param name="columnCtrl"></param>
  /// <param name="columnHeader"></param>
  /// <param name="index"></param>
  /// <param name="x"></param>
  /// <param name="y"></param>
  AddColumnFilterEvent(columnCtrl: MgControlBase, columnHeader: string, x: number, y: number, width: number, height: number): void;
}
