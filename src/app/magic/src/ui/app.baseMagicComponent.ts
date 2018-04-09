import {ChangeDetectorRef, Component, Input, OnDestroy, OnInit, QueryList, ViewChildren} from '@angular/core';
import {FormGroup} from '@angular/forms';
import {GuiCommand, CommandType, GuiInteractive} from "@magic/gui";
import {GuiEvent} from "@magic/engine";
import {TaskMagicService} from "../services/task.magics.service";
import {isNullOrUndefined, isUndefined} from "util";
import {ControlMetadata, HtmlProperties} from "../controls.metadata.model";
import {Subject} from "rxjs/Subject";
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/filter';
import {StorageAttribute} from "@magic/utils";
import {NString} from "@magic/mscorelib";
import { MagicProperties } from "@magic/utils";


import {ComponentListBase} from '../../../ComponentListBase';
import {GuiInteractiveExecutor} from './GuiInteractiveExecutor';

import {TextEditDialogComponent} from "./TextEditDialog/textedit.dialog";

import {Router} from '@angular/router';

@Component({
  selector: 'task-magic',
  providers: [TaskMagicService]
})

export abstract class BaseTaskMagicComponent implements OnInit, OnDestroy {

  @Input() myTaskId: string;
  @Input() taskDescription: string;
  subformsDict: { [x: string]: SubformDefinition } = {};
  emptyComp: Component;
  oldPageSize = 0;
  lastFocused = null;
  private _controlProperties: any;
  magicProperties = MagicProperties;

  static routeInfo: SubformDefinition = null;

  protected executeInteractiveCommand(guiIntactiveCommand: GuiInteractive)
  {
    let executor = new GuiInteractiveExecutor();
    executor.task = this.task;
    executor.command = guiIntactiveCommand;
    executor.component = this;
    executor.Run();

  }

  constructor(protected ref: ChangeDetectorRef,
              protected task: TaskMagicService,
              protected router: Router,
              //protected magic:MagicEngine

  ) {
    this.task.Records.createFirst();

    // debugger;
  }

  get controlProperties(): any {
    return this._controlProperties;
  }

  set controlProperties(value: any) {
    this._controlProperties = value;
  }

  get table() {
    return this.task.rows;
  }

  get record() {
    return this.task.ScreenModeControls;
  }

  get taskId() {
    return this.task.taskId;
  }

  get screenFormGroup(): FormGroup {
    return this.record;
  }

  ngOnDestroy(): void {
    this.task.refreshDom.complete();
    this.task.interactiveCommands.complete();
  }
  public static componentListBase:ComponentListBase;

  mgGetComp(subformName: string): Component {
    if (subformName in this.subformsDict) {
      let formName: string = this.subformsDict[subformName].formName;
      return BaseTaskMagicComponent.componentListBase.getComponents(formName);
    }
    else
      return this.emptyComp;
  }

  mgGetParameters(subformName: string): any {
    if (subformName in this.subformsDict) {
      return this.subformsDict[subformName].parameters;
    }
    else
      return ""
  }

  addSubformComp(subformControlName: string, formName: string, taskId: string, taskDescription: any, routerPath: string, inDefaultOutlet: boolean) {
    if (isNullOrUndefined(routerPath)) {
      this.subformsDict[subformControlName] = {
        formName,
        parameters: {myTaskId: taskId, taskDescription: taskDescription}
      };
      this.ref.detectChanges();
    }
    else {
      BaseTaskMagicComponent.routeInfo = {
        formName,
        parameters: {myTaskId: taskId, taskDescription: taskDescription}
      };

      if (inDefaultOutlet)
        this.router.navigate([routerPath]);
      else
        this.router.navigate([{ outlets: { [subformControlName]: [routerPath] }}]);
    }
  }


  ngOnInit() {
    if (this.task.IsStub()) {
      this.loadData();
    }
    else {
      this.task.taskId = this.myTaskId;
      this.task.settemplate(this.taskDescription);
    }
    this.task.buildScreenModeControls();
    this.task.initTask();
    this.regUpdatesUI();
  }

  mgGetFormGroupByRow(id: string): FormGroup {
    return this.task.rows[id];
  }

  mgIfRowCreated(id: string): boolean {
    let result = this.mgGetFormGroupByRow(id);
    return !isNullOrUndefined(result);
  }
  refreshDataSource():void {}

  getPageSize(): number
  {
    return 10;
  }

  resize(pageSize: number): void {
    let guiEvent: GuiEvent = new GuiEvent("resize", "table", 0);
    guiEvent.PageSize = pageSize;
    this.task.insertEvent(guiEvent);
  }


  getRowsIfNeed(pageIndex: number, pageSize: number): void {
    if (this.oldPageSize !== pageSize) {
      this.resize(pageSize);
      this.oldPageSize = pageSize;
    }
    if (!this.task.Records.includesLast) {
      let guiEvent: GuiEvent = new GuiEvent("getRows", "table", 0);
      for (let i = pageIndex * pageSize ; i < pageSize  * ( pageIndex + 1)  ; i++) {
        if (!this.task.Records.isRowCreated(i)) {
          guiEvent.Line = i;
          this.task.insertEvent(guiEvent);
          break;
        }
      }
    }
  }
  onScrollDown() {
    if (!this.task.Records.includesLast){
      let guiEvent: GuiEvent = new GuiEvent("getRows", "table", 0)
      guiEvent.Line = this.task.rows.length;
      this.task.insertEvent(guiEvent);
    }
  }

  ConvertValToNative(controlId: string, rowId: number, val: any): any {

    let properties: ControlMetadata;
    properties = this.task.Records.list[0].getControlMetadata(controlId);

    switch (properties.dataType) {

      case StorageAttribute.BOOLEAN: {
        let val1: boolean;
        if (typeof val === 'string')
          return NString.Equals(val, 'true', true) ? true : false;
        else
          return val;
      }

      default:
        return val;
    }
  }

  executeCommand(command: GuiCommand): void {
    let rowId: string = (command.line || 0).toString();
    let controlId = command.CtrlName;


    switch (command.CommandType) {
      case CommandType.REFRESH_TASK:

        this.task.ScreenModeControls.patchValue(this.task.ScreenControlsData.Values);
        this.refreshDataSource();
        this.ref.detectChanges();
        break;
      case CommandType.SET_TABLE_ITEMS_COUNT:
        if (!isUndefined(command.number))
          this.task.updateTableSize(command.number);
        //this.ref.detectChanges();
        break;

      case CommandType.CREATE_TABLE_ROW:
        this.task.markRowAsCreated(command.number);
        break;

      case CommandType.UNDO_CREATE_TABLE_ROW:
        this.task.markrowAsNotCreated(command.number);
        break;


      case CommandType.SET_TABLE_INCLUDES_FIRST:
        this.task.setIncludesFirst(command.Bool1);
        break;
      case CommandType.SET_TABLE_INCLUDES_LAST:
        this.task.setIncludesLast(command.Bool1);
        break;


      case CommandType.SET_PROPERTY:
        let properties: ControlMetadata;
        properties = this.task.Records.list[rowId].getControlMetadata(controlId);
        properties.properties[command.Operation] = command.obj1;
        if (command.Operation === HtmlProperties.SelectedRow)
          this.selectRow(command.obj1); //template method that allow overwite
        break;
      case CommandType.SET_CLASS:
        properties = this.task.Records.list[rowId].getControlMetadata(controlId);
        properties.setClass(command.Operation, command.obj1);
        break;

      case CommandType.SET_STYLE:
        properties = this.task.Records.list[rowId].getControlMetadata(controlId);
        properties.setStyle(command.Operation, command.obj1);
        break;

      case CommandType.SET_ATTRIBUTE:
        properties = this.task.Records.list[rowId].getControlMetadata(controlId);
        properties.dataType = String.fromCharCode(command.number);
        break;

      case  CommandType.SET_VALUE:
        this.task.Records.list[rowId].values[controlId] = command.value;
        let c = this.task.getFormControl(rowId, controlId);
        if (!isNullOrUndefined(c))
          c.setValue(command.value);

        break;
    }
  }

  regUpdatesUI() {
    this.task
      .refreshDom
      .filter(updates => updates.TaskTag === this.taskId)
      .subscribe(command => {
        this.executeCommand(command)
      });
    this.task
      .interactiveCommands
      .filter(updates => updates.TaskTag === this.taskId)
      .subscribe(command => {
        this.executeInteractiveCommand(command)
      });
  }

  selectRow(rowId: string): void {
  }
  mgGetText(controlId, rowId?) {
    return this.task.getProperty(controlId, HtmlProperties.Text, rowId);
  }

  mgGetTabpageText(controlId, layer) {
    const items = this.task.getProperty(controlId, HtmlProperties.ItemsList);
    if(typeof items !== "string")
      return items[layer-1].realString;
    return items;
  }

  mgGetImage(controlId, rowId?) {
    let result = this.task.getProperty(controlId, HtmlProperties.Image, rowId);
    return result;

  }

  mgIsImageExists(controlId, rowId?): boolean {
    let result = this.task.getProperty(controlId, HtmlProperties.Image, rowId);
    return !isNullOrUndefined(result);

  }

  mgGetClasses(controlId, rowId?) {
    return this.task.getClasses(controlId, rowId);
  }

  mgGetStyle(controlId: string, styleName:string, rowId?) {
    let style = this.task.getStyle(controlId, styleName, rowId)
    return style;
  }

  mgGetVisible(controlId, rowId?) {
    let vis: Boolean = this.getProperty(controlId, HtmlProperties.Visible, rowId);
    return vis ? 'visible' : 'hidden';
  }

  mgGetMustInput(controlId, rowId?) {
    let vis: Boolean = this.getProperty(controlId, HtmlProperties.MustInput, rowId);
    return vis ? 'true' : 'false';
  }
  /*getEnable(controlId, rowId?) {
    return this.getProperty(controlId, HtmlProperties.Enabled, rowId);
  }*/

  isRowSelected(controlId, rowId?) {
    const selectedRow = this.getProperty(controlId, HtmlProperties.SelectedRow, "0") ;
    return selectedRow == rowId;
  }

  mgIsDisabled(controlId, rowId?) {
    let result = this.getProperty(controlId, HtmlProperties.Enabled, rowId);
    return result === true ? null : true;
  }

  getProperty(controlId: string, prop: HtmlProperties, rowId?: string) {
    return this.task.getProperty(controlId, prop, rowId);
  }

  mgGetTitle(controlId, rowId?) {
    return this.task.getProperty(controlId, HtmlProperties.Tooltip, rowId);
  }

  mgGetSelectedValue(controlId, rowId?) {
    return this.task.getProperty(controlId, HtmlProperties.SelectedValue, rowId);
  }


  mgGetPlaceholder(controlId, rowId?) {
    return this.task.getProperty(controlId, HtmlProperties.PlaceHolder, rowId);
  }

  mgGetType(controlId, rowId?) {
    let result =  this.task.getProperty(controlId, HtmlProperties.Password, rowId) ;
    return result ? "password" : "text"
  }

  mgGetTabIndex(controlId, rowId?) {
    return this.task.getProperty(controlId, HtmlProperties.TabIndex, rowId);
  }

  mgGetValue(controlId, rowId?) {
    let val = this.task.getValue(controlId, rowId);
    return val;
  }

  mgGetItemListValues(id) {
    return this.getProperty(id, HtmlProperties.ItemsList);
  }

  public mgOnSelectionChanged(event: Event, idx: string) {
    let guiEvent: GuiEvent = new GuiEvent("selectionchanged", idx, 0);

    if(!isNullOrUndefined(event.target)) {
      let indexes: number[] = new Array<number>((<any>event.target).selectedOptions.length);
      for (let i = 0; i < (<any>event.target).selectedOptions.length; i++) {
        indexes[i] = (<HTMLOptionElement>(<any>event.target).selectedOptions[i]).index;
      }
      guiEvent.Value = indexes.join(',');
    }
    else
      guiEvent.Value = (<any>event).value;

    this.task.insertEvent(guiEvent);
  }

  public mgOnListBoxSelectionChanged(event: Event, idx: string) {
    let guiEvent: GuiEvent = new GuiEvent("selectionchanged", idx, 0);

    let selectedOptions;
    if (!isNullOrUndefined(event.target))
      selectedOptions = (<any>event.target).selectedOptions;
    else
      selectedOptions = (<any>event).source.selectedOptions.selected;

    let length = selectedOptions.length;
    let indexes: number[] = new Array<number>(length);

    for (let i = 0; i < length; i++) {
      if (!isNullOrUndefined(event.target))
        indexes[i] = (selectedOptions[i]).index;
      else
        indexes[i] = (selectedOptions[i]).value;
    }
    guiEvent.Value = indexes;
    this.task.insertEvent(guiEvent);
  }

  public mgOnTabSelectionChanged(idx:string, layer: number) {
    let guiEvent: GuiEvent = new GuiEvent("selectionchanged", idx, 0);
    guiEvent.Value = (layer-1).toString();
    this.task.insertEvent(guiEvent);
  }

  public mgIsTabPageSelected(controlId:string, layer: number) {
    let val = this.task.getProperty(controlId, HtmlProperties.SelectedValue);
    return val == (layer-1); // comparing string to number!
  }

  mgOnCheckChanged(event: Event, idx: string, rowId: number) {
    if(typeof rowId === "undefined")
      rowId = 0;
    let guiEvent: GuiEvent = new GuiEvent("selectionchanged", idx, rowId);
    if(typeof event.target === "undefined")
      guiEvent.Value = (<any>(event)).checked;
    else
      guiEvent.Value = (<any>(event.target)).checked;
    this.task.insertEvent(guiEvent);
  }


  mgOnRadioSelectionChanged(event: Event, idx: string) {
    let result = this.task.getFormControl('0', idx);
    let guiEvent: GuiEvent = new GuiEvent("selectionchanged", idx, 0);
    guiEvent.Value = result.value;
    this.task.insertEvent(guiEvent);
  }
  mgOnPaginateChange(e)
  {
    this.getRowsIfNeed(e.pageIndex, e.pageSize) ;
  }

  sortData(e){
    let direction: number = 0;
    if (e.direction === 'asc')
      direction = 0;
    else if (e.direction === 'desc')
      direction = 1;

    let guiEvent: GuiEvent = new GuiEvent("columnSort", e.active, direction);
    this.task.insertEvent(guiEvent);
  }

  jsonData :string
  public createData()
  {

    this.task.createData();

  }

  public loadData()
  {
    alert('Please, overwrite method loadData');
  }

  public loadStubData(stubData: any)
  {

    this.task.Records = stubData.records;
    this.task.settemplate(stubData.template);
    this.task.taskId = "1";
    for (let i = 0; i < this.task.Records.list.length; i++)
      this.task.buildTableRowControls(i);
  }

  public close() {
    this.task.insertEvent(new GuiEvent("close", null, 0));
  }

  openEditDialog(id: string, rowId: string, dim: any): void {
    const dialog = this.GetDialog();
    if (!this.task.getProperty(id, HtmlProperties.ReadOnly, rowId)) {
      if (dialog != null && this.task.isTableControl(id)) {
        let dataType: StorageAttribute ;
        dataType = this.task.Records.list[0].getControlMetadata(id).dataType;



          let v = this.task.getValue(id, rowId);
        const dialogRef = dialog.open(TextEditDialogComponent, {
          width: dim.width + 'px',
          height: dim.height + 'px',
          data: {text: v, type: dataType},
        });

        dialogRef.updatePosition({top: dim.y - 15 + "px", left: dim.x + "px"});
        dialogRef.afterClosed().subscribe(result => {
           if (result != null) {
            this.task.setValue(id, rowId, result);
            const fc = this.task.getFormControl(rowId, id);
            if (!isNullOrUndefined(result)) {
              fc.setValue(result);
            }
          }
        });
      }
    }
  }

  GetDialog(): any  {
    return null;
  }

}

interface SubformDefinition {
  formName: string;
  parameters: any;
}
