import {ElementRef, Input, OnInit, Renderer2, ViewContainerRef} from '@angular/core';
import {TaskMagicService} from "../services/task.magics.service";
import {GuiCommand, CommandType} from "@magic/gui";
import {GuiEvent} from "@magic/engine";
import {BaseTaskMagicComponent} from "./app.baseMagicComponent";
import {isNullOrUndefined} from "util";
import {HtmlProperties} from '../controls.metadata.model';
import {utils} from './utils';

// base class for magic directive
export class MagicDirectiveBase implements OnInit {
  @Input() rowId: string;
  @Input() events: any[] = [];

  protected htmlElement: HTMLElement;
  private component: BaseTaskMagicComponent;
  private eventHandlers: { [key: string]: () => void; } = {};
  protected id: string;
  protected selector: string;

  // CTOR
  constructor(private element: ElementRef,
              private renderer: Renderer2,
              protected _task: TaskMagicService,
              private vcRef: ViewContainerRef,) {

    this.htmlElement = this.element.nativeElement;
    this.component = (<any>this.vcRef)._view.component as BaseTaskMagicComponent;
  }

  get task() {
    return this._task;
  }

  // event registering
  protected regEvents() {
    // Handle events for which event handler may be removed and restored
    this.eventHandlers['focus'] = this.OnFocus.bind(this);

    Object.keys(this.eventHandlers).forEach((key) => {
      this.htmlElement.addEventListener(key, this.eventHandlers[key]);
    });


    // Handle events with anonymous  event handlers
    let events: string[] = ['click', 'dblclick',];// 'mouseenter', 'mouseleave','resize', 'load', 'unload',
    events.forEach(event => {
      this.htmlElement.addEventListener(event, (e) => {
        let child = utils.lookForClosestMagicControlOnLine(e, this.selector);
        if(typeof child === "undefined") {
          this.task.insertEvent(new GuiEvent(event, this.id, +this.rowId));
        } else {
          this.task.insertEvent(new GuiEvent(event, child.attributes[this.selector].value, child.attributes["ng-reflect-row-id"].value));
        }
        e.cancelBubble = true;
        if (this.component.lastFocused === this.htmlElement)
          this.component.openEditDialog(this.id, this.rowId, utils.getDimentions(this.htmlElement));

      });
    });
  }

  private OnFocus() {
    this.task.insertEvent(new GuiEvent('focus', this.id, +this.rowId));
  }

  private IsSameElement(command) {
    return (command.CtrlName === this.id &&
      command.line == this.rowId ||
      (command.line === 0 && isNullOrUndefined(this.rowId)));
  }
  private regUpdatesUI() {
    this.task
      .refreshDom
      .filter(c => this.IsSameElement(c))
      .subscribe(a => {
          let command: GuiCommand = a;
          if (isNullOrUndefined(this.rowId))
            this.rowId = '0';
          try {
            this.handleCommand(command);
          }
          catch (ex) {
            console.dir(ex);
          }
        }
      );

  }

  ngOnInit(): void {
    this.regEvents();
    this.regUpdatesUI();
  }

  protected handleCommand(command: GuiCommand) {
    switch (command.CommandType) {

      case CommandType.SET_PROPERTY:
        this.handleSetProperty(command);
        break;

      case CommandType.CREATE_SUB_FORM:
        this.component.addSubformComp(command.CtrlName, command.userDropFormat.toString(), command.str, command.fileName);
        break;

      case CommandType.SET_FOCUS:
        this.component.lastFocused = this.htmlElement;
        this.htmlElement.removeEventListener('focus', this.eventHandlers['focus']);
        this.htmlElement.focus();
        this.htmlElement.addEventListener('focus', this.eventHandlers['focus']);
        break;
    }
  }

  handleSetProperty(command: GuiCommand) {
    switch (command.Operation) {
      case HtmlProperties.ReadOnly:
        if (command.obj1 != true)
          this.renderer.removeAttribute(this.htmlElement, command.Operation);
        else
          this.renderer.setAttribute(this.htmlElement, command.Operation, command.str);

        break;
    }
  }
}
