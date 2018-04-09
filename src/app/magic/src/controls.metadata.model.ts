import {StorageAttribute} from "@magic/utils";

export class ControlMetadata {
  controlType: string;
  dataType: StorageAttribute;
  properties: Map<HtmlProperties, any> = new Map();
  classesMap: Map<HtmlClasses, any> = new Map();
  stylesMap: Map<HtmlClasses, any> = new Map();
  removedClass: string;
  classes: string  ;

  setClass(key, value) {
    // for no-control - hold the name of the class to be removed later
    if(this.classesMap[key] != '') {
      this.removedClass = this.classesMap[key];
    }

    this.classesMap[key] = value;
    let result = '';

    for (let key in this.classesMap) {
      result+= this.classesMap[key] + ' ';
    }
    this.classes = result;

  }
  setStyle(key, value) {

    this.stylesMap[key] = value;
    let result = '{';
    for (let key in this.stylesMap) {
      result += key + ":" + this.stylesMap[key];
    }

  }

}

export class ControlsMetadata {

  //values of control
  values: Map<string, string> = new Map();
  // dictionary of controls with there properties
  ControlsProperties: Map<string, ControlMetadata> = new Map();

  rowId: string;
  isCreated = false;

  get Values(){
    return this.values;
  }

  getControlMetadata(controlId: string) {
    if (!(controlId in this.ControlsProperties))
      this.ControlsProperties[controlId] = new ControlMetadata();
    return this.ControlsProperties[controlId];
  }



  update(obj:any) {
    //should we keep the values here ?
    //this.values = obj.ControlsValues;
    let props: { [id: string]: { [id: string]: string; } } = obj.ControlsMetaData;
    for (let controlName in props) {
      if (this.ControlsProperties[controlName] == null)
        this.ControlsProperties[controlName] = new ControlMetadata();
      let controlMetaData: ControlMetadata = this.ControlsProperties[controlName];
      for (let property in obj.ControlsMetaData[controlName].Properties)
        controlMetaData[property] = obj.ControlsMetaData[controlName].Properties[property];
      controlMetaData.controlType = obj.ControlsMetaData[controlName].Type;
    }
    for (let controlName in obj.ControlsValues) {
      this.setValue(controlName, obj.ControlsValues[controlName]);
    }
  }

  setValue(controlName: string, value: any): void  {
    this.values[controlName] = value;
  }

  getProperty(controlId: string, prop: HtmlProperties) {
    if ( controlId in this.ControlsProperties) {
      if (prop in this.ControlsProperties[controlId].properties) {
        return this.ControlsProperties[controlId].properties[prop];
      }
    }
    return "";
  }


  getValue(controlName: string){
    return this.values[controlName];
  }


}

export class Records {
  data: Map<string, ControlsMetadata> = new Map();
  list:ControlsMetadata[]=[] ; //used for sequential access in table
  includesFirst:boolean;
  includesLast:boolean;


  markRowAsCreated(row:number): void
  {
    if (row < this.list.length)
      this.data[row].isCreated = true;
  }

  markRowAsNotCreated(row:number): void
  {
    if (row < this.list.length)
      this.data[row].isCreated = false;
  }

  isRowCreated(row:number): boolean
  {
    if (row < this.list.length)
      return this.data[row].isCreated;
    //!!!!
    return true;
  }


  update(obj) {

    if (obj.fullRefresh && obj.rows.length != this.list.length ) {
      this.data = new Map();
      this.list = new Array<ControlsMetadata>();
    }
    for (let rowId in obj.rows) {
      if (this.data[rowId] == null)
        this.data[rowId] = new ControlsMetadata();
      let controlsData: ControlsMetadata = this.data[rowId];
      controlsData.update(obj.rows[rowId]);
      controlsData.rowId = rowId;
    }
    for (var key in this.data) {
      this.list[key] = this.data[key];
      // Use `key` and `value`
    }

  }
  updateSize(len:number) {
    if (this.list.length != len) {
      if (len < this.list.length) {
        //remove rows
        for (let i = len; i < this.list.length; i++) {
          this.data.delete(i.toString());
        }
        this.list.length = len;
      }
      else {
        //addRows
        for (let i = this.list.length; i < len; i++) {
          this.addRow(i.toString());
        }
      }
    }
  }

  addRow(rowId: string ) {
    this.data[rowId] = new ControlsMetadata();
    this.data[rowId].rowId = rowId;
    this.list[rowId] = this.data[rowId];
  }
  createFirst()
  {
    this.addRow("0");
  }

  fromJson(data: string) {
    var obj = JSON.parse(data);
    this.update(obj);
  }

}

export enum HtmlProperties {
  Visible = "visible",
  Enabled = "enabled",
  Text = "text",
  ItemsList ="itemslist",
  Image = "image",
  Tooltip = "tooltip",
  SelectedValue = "selectedvalue",
  ShowBorder="showborder",
  PlaceHolder="placeholder",
  Password="password",
  TabIndex="tabindex",
  SelectedRow="selectedRow",
  ReadOnly="readOnly",
  MustInput="mustInput"
}

export enum HtmlClasses {
  Color = "color",
  font = "font",
  FocusColor="focuscolor",
  HintColor="hintcolor",
}
