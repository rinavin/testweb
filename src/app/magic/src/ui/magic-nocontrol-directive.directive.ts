import {Directive, ElementRef, Input, Renderer2, ViewContainerRef} from '@angular/core';
import {FormControl} from "@angular/forms";
import {CommandType, GuiCommand} from "@magic/gui";
import {GuiEvent} from "@magic/engine";
import {ControlMetadata, HtmlProperties} from "../controls.metadata.model";
import {MagicDirectiveBase} from "./magic-directive-base.directive";
import {TaskMagicService} from "../services/task.magics.service";
import {StylesMapManager} from "../services/StylesMapManager";

@Directive({
  selector: '[magicnc]'
})

// magic directive for no-control
export class MagicNoControlDirective extends MagicDirectiveBase {

  @Input('magicnc') set magic(val) {this.id = val; this.selector = 'magicnc';};

  // CTOR
  constructor(element: ElementRef,
              renderer: Renderer2,
              _task: TaskMagicService,
              vcRef: ViewContainerRef) {
    super(element, renderer, _task, vcRef);
  }

  regEvents() {
  super.regEvents()

    if (this.htmlElement instanceof HTMLSelectElement) {
      this.htmlElement.addEventListener('change', (e) => {
        let guiEvent: GuiEvent = new GuiEvent("selectionchanged", this.id, 0);
        guiEvent.Value = (<any>(event.target)).selectedIndex.toString()
        this.task.insertEvent(guiEvent);
      });
    }

    if (this.isRadio()) {
      this.htmlElement.addEventListener('change', (e) => {
        let result = this.task.getFormControl('0', this.id);
        let guiEvent: GuiEvent = new GuiEvent("selectionchanged", this.id, 0);
        guiEvent.Value = (<any>(e.target)).value;
        this.task.insertEvent(guiEvent);
      });
    }

    if(this.isTabControl()) {
        const tabControl = this.htmlElement.children[0];
        let guiEvent: GuiEvent = new GuiEvent("selectionchanged", this.id, 0);
        for (var i = 0; i < tabControl.children.length; i++) {
          tabControl.children[i].addEventListener('click', (e) => {
            guiEvent.Value = ((<number><any>(<Element>e.currentTarget).getAttribute('layer'))-1).toString();
            this.task.insertEvent(guiEvent);
          });
        }
    }
  }

  // is the div a tab control
  isTabControl() {
    return this.htmlElement instanceof HTMLDivElement &&
      this.htmlElement.children[0].getAttribute('magicMark')=== "magicTabControl";
  }

  // is the div a radio buttons wrapper
  isRadio() {
    return this.htmlElement instanceof HTMLDivElement &&
      this.htmlElement.children[0].getAttribute('magicMark') === "magicRadio";
  }

  handleCommand(command: GuiCommand) {
    super.handleCommand(command);

    switch (command.CommandType) {
      case CommandType.SET_CLASS:
        //remove the class which was replaced by this new one, as registered in the ControlMetadata
        const controlMetadata:ControlMetadata = this._task.Records.list[0].getControlMetadata(this.id);
        if(controlMetadata.removedClass != '') {
          this.htmlElement.classList.remove(controlMetadata.removedClass);
          controlMetadata.removedClass = '';
        }
        this.htmlElement.classList.add(command.obj1);
        break;

      case  CommandType.SET_VALUE:
        if (this.htmlElement instanceof HTMLLabelElement)
          (<HTMLLabelElement>this.htmlElement).innerText = command.value;

        if (this.htmlElement instanceof HTMLSelectElement)
          (<HTMLSelectElement>this.htmlElement).value = command.value;

        if (this.htmlElement instanceof HTMLAnchorElement) //hyper-text button
          (<HTMLAnchorElement>this.htmlElement).text = command.value;

        if (this.htmlElement instanceof HTMLInputElement)
        {
          if((<HTMLInputElement>this.htmlElement).type === "checkbox") {
            (<HTMLInputElement>this.htmlElement).checked = command.value;
          }
          else {
            (<HTMLInputElement>this.htmlElement).value = command.value;
          }
        }

        if (this.htmlElement instanceof HTMLButtonElement)
        {
          (<HTMLButtonElement>this.htmlElement).innerHTML = command.value;
        }

        break;

      case CommandType.SET_PROPERTY:
        this.handleSetProperty(command);
        break;

      case CommandType.SET_STYLE:
        let value: string = StylesMapManager.magicValueGetStyle(command.Operation, command.obj1);
        let attribute: string = StylesMapManager.MagicPropertyToHtmlAttributeMap.get(command.Operation);
        this.htmlElement.setAttribute("style", attribute + ":" + value);
        break;
    }
  }


  // handle set-property commands
  handleSetProperty(command: GuiCommand) {
    super.handleSetProperty(command);
    switch (command.Operation) {
      case HtmlProperties.Text:
        if (this.htmlElement instanceof HTMLLabelElement)
          (<HTMLLabelElement>this.htmlElement).innerText = command.obj1;

        break;

      case HtmlProperties.Image:
        if (this.htmlElement instanceof HTMLImageElement)
          (<HTMLImageElement>this.htmlElement).src = command.obj1;
        else
          this.htmlElement.setAttribute("src", command.obj1);

        break;

      case HtmlProperties.ItemsList:
        if (this.htmlElement instanceof HTMLSelectElement) {

          // clear the list
          var len = this.htmlElement.length;
          for (var i = len - 1; i >= 0; i--) {
            this.htmlElement.remove(i);
          }

          for (let s of command.obj1) {
            let elem = document.createElement("option");
            elem.text = s.realString;
            elem.value = s.index;
            (<HTMLSelectElement>this.htmlElement).add(elem);
          }
        }
        else if(this.isTabControl() && this.htmlElement.children.length > 0) {
          const tabControl = this.htmlElement.children[0];

          for (var i = 0; i < tabControl.children.length; i++) {
            if(tabControl.children[i] instanceof HTMLButtonElement) {
              (<HTMLElement>tabControl.children[i]).innerText = command.obj1[i].realString;
            }
          }
        }
        break;

      case HtmlProperties.Visible:
        this.htmlElement.setAttribute('style', 'visibility:' + (command.obj1 ? 'visible' : 'hidden'));
        break;

      case HtmlProperties.Enabled:
        if (command.obj1 === false)
          this.htmlElement.setAttribute("disabled", "true");
        else
          this.htmlElement.removeAttribute("disabled");
        break;

      case HtmlProperties.TabIndex:
        this.htmlElement.setAttribute(command.Operation, command.obj1);
        break;

      case HtmlProperties.SelectedValue:
        if (this.htmlElement instanceof HTMLSelectElement)
          (<HTMLSelectElement>this.htmlElement).value = command.obj1;
        else if(this.isTabControl()  && this.htmlElement.children.length > 0){
          const tabControl = this.htmlElement.children[0];

          for (var i = 0; i < tabControl.children.length; i++) {
            let child = tabControl.children[i];
            const layer = (<number><any>child.getAttribute('layer'))-1;

            if(child instanceof HTMLButtonElement) {
              // set button style
              if ( layer == command.obj1) { // compare int to string
                child.classList.add('tab_button_active');
              }
              else {
                child.classList.remove('tab_button_active');
              }
            } else {
              // not a buton - hide unselected tabpages
              let style = (layer == command.obj1) ? 'display: inline' : 'display: none';
              child.setAttribute('style',  style);
            }
          }
        }
        break;

      case HtmlProperties.PlaceHolder:
        this.htmlElement.setAttribute("placeholder", command.obj1);
        break;

      case HtmlProperties.Tooltip:
        this.htmlElement.setAttribute("title", command.obj1);
        break;

      case HtmlProperties.Password:
        if (command.obj1 === false)
          this.htmlElement.setAttribute("type", "text");
        else
          this.htmlElement.setAttribute("type", "password");
        break;
    }
  }
}
