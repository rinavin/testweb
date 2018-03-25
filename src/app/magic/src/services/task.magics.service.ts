import {Injectable} from "@angular/core";
import {MagicEngine} from "./magic.engine";
import {AbstractControl, FormControl, FormGroup} from "@angular/forms";
import {HtmlProperties, Records} from "../controls.metadata.model";
import {isNullOrUndefined} from "util";
import {Subject} from "rxjs/Subject";
import { GuiCommand, GuiInteractive} from "@magic/gui";
import {GuiEvent} from "@magic/engine";

@Injectable()
export class TaskMagicService {

  Records: any = new Records();
  rows: Array<FormGroup> = [];
  ScreenModeControls: FormGroup;
  refreshDom: Subject<GuiCommand> = new Subject();
  interactiveCommands: Subject<GuiInteractive> = new Subject();
  protected template: { [id: string]: string; };

  constructor(protected magic: MagicEngine) {

  }

  _taskId: string;

  get taskId() {
    return this._taskId;
  }

  set taskId(value) {
    // debugger;
    this._taskId = value;
  }

  get ScreenControlsData() {
    return this.Records.list["0"];
  }


  settemplate(value: any) {
    this.template = value;
  }

  setStubValue(row: number, fc: FormControl, name:string){
    if (this.IsStub())
    {
      try {
        let val = this.Records.list[row].values[name];
        fc.setValue(val);
      }
      catch (e){}
    }
  }
  buildScreenModeControls() {
    const group: FormGroup = new FormGroup({});
    for (const key in this.template) {

      if (this.template[key] == '0') {
        let fc = new FormControl('')
        this.setStubValue(0, fc, key);
        group.addControl(key, fc);
      }
    }

    this.ScreenModeControls = group;
  }

  isTableControl(id: string): boolean {
    return this.template[id] == '1';
  }

  getFormControl(rowId: string, id: string): AbstractControl {
    let c: AbstractControl;
    let group: FormGroup = this.isTableControl(id) ? this.rows[rowId] : this.ScreenModeControls;
    if (group.contains(id))
      c = group.controls[id];
    return c;
  }


  buildTableRowControls(row: number) {
    const group: FormGroup = new FormGroup({});

    for (const key in this.template) {

      if (this.template[key] == '1') {
        let fc = new FormControl('');
        this.setStubValue(row, fc, key);
        group.addControl(key, fc);
      }
    }

    this.rows.push(group);
  }

  updateTableSize(size: number) {

    if (size == 0) //never remove row 0 for now
      size = 1;
    if (size < this.rows.length)
      this.rows.length = size;
    else {
      for (let i = this.rows.length; i < size; i++)
        this.buildTableRowControls(i);
    }

    this.Records.updateSize(size);
  }


  setIncludesFirst(value: boolean): void {
    this.Records.includesFirst = value;
  }

  setIncludesLast(value: boolean): void {
    this.Records.includesLast = value;
  }

  markRowAsCreated(row: number): void {
    this.Records.markRowAsCreated(row);
  }


  markrowAsNotCreated(row: number): void {
    this.Records.markRowAsNotCreated(row);
  }


  initTask() {
    this.magic.refreshDom
      .filter(command => command.TaskTag === this.taskId)
      .subscribe(command => {
        // console.log("Task " + command.TaskTag + "command " + command.CommandType);
        this.refreshDom.next(command);
      });
    this.magic.interactiveCommands
      .filter(command => command.TaskTag === this.taskId)
      .subscribe(command => {
        // console.log("Task " + command.TaskTag + "command " + command.CommandType);
        this.interactiveCommands.next(command);
      });

  }

  insertEvent(guiEvent: GuiEvent) {
    guiEvent.TaskID = this.taskId;
    this.magic.insertEvent(guiEvent);
  }



  getProperty(controlId: string, prop: HtmlProperties, rowId?: string) {
    if (isNullOrUndefined(rowId))
      rowId = "0";
    if (this.IsStub())
      return this.getPropertyStub(this.Records.list[rowId], controlId, prop);
    else {
      let rec = this.Records.list[rowId];
      if (isNullOrUndefined(rec))
        debugger;
      else
        return this.Records.list[rowId].getProperty(controlId, prop);

    }
  }

  getPropertyStub(ControlsProperties: any, controlId, prop) {
    ControlsProperties = ControlsProperties.ControlsProperties;
    if ( controlId in ControlsProperties) {
      if (prop in ControlsProperties[controlId].properties) {
        return ControlsProperties[controlId].properties[prop];
      }
    }
    return "";
  }

  getStyleStub(ControlsProperties: any, controlId, styleName:string) {
    ControlsProperties = ControlsProperties.ControlsProperties;
    return ControlsProperties[controlId].stylesMap[styleName];
  }

  getClasses(controlId: string, rowId?: string): string {
    if (isNullOrUndefined(rowId))
      rowId = "0";
    return this.Records.list[rowId].getControlMetadata(controlId).classes;

  }

  getStyle(controlId: string, styleName:string, rowId?: string): string {
    if (isNullOrUndefined(rowId))
      rowId = "0";
    if (this.IsStub())
      return this.getStyleStub(this.Records.list[rowId], controlId, styleName);
    else
      return this.Records.list[rowId].getControlMetadata(controlId).stylesMap[styleName];

  }

  getValue(controlId: string, rowId?: string) {
    if (isNullOrUndefined(rowId))
      rowId = '0';

    return this.Records.list[rowId].values[controlId];
    // return this.Records.list[rowId].getValue(controlId);
  }

  setValue(controlId: string, rowId: string, value: any): void {
    return this.Records.list[rowId].setValue(controlId, value);
    // return this.Records.list[rowId].getValue(controlId);
  }

  saveData(data:string)
  {
    this.magic.saveData(data);
  }

  IsStub():boolean
  {
    return this.magic.isStub;

  }
  public createData()
  {
    let myData = {
      records: this.Records,
      template: this.template,
    };
    let text:string = "loadData():any   {\n" +
      "    let stubData = " + JSON.stringify(myData) +";\n" +
      "    this.loadStubData(stubData);}" ;
    console.log(text);
    this.saveData(text);

  }

}

