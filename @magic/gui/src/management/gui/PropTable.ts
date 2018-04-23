import {Hashtable, List, NNumber, NString, ApplicationException} from "@magic/mscorelib";
import {Property} from "./Property";
import {PropParentInterface} from "../../gui/PropParentInterface";
import {XmlParser, XMLConstants} from "@magic/utils";
import {Manager} from "../../Manager";
import {TaskBase} from "../tasks/TaskBase";
import {MgFormBase} from "./MgFormBase";
import {MgControlBase} from "./MgControlBase";
import {Events} from "../../Events";
import {PropInterface} from "./PropInterface";

/// <summary>
///   properties table
/// </summary>
export class PropTable {

  private _hashTab: Hashtable<number, Property> = null; // for fast access to properties
  private _props: List<Property> = null;
  private _parent: PropParentInterface = null;


  /// <summary>
  ///   CTOR
  /// </summary>
  constructor();
  constructor(parent_: PropParentInterface);
  constructor(parent_?: PropParentInterface) {

    if (arguments.length === 0) {
      this.constructor_0();
      return;
    }
    this.constructor_1(parent_);
  }

  private constructor_0(): void {
    this._props = new List<Property>();
    this._hashTab = new Hashtable<number, Property>(20);
  }

  private constructor_1(parent_: PropParentInterface): void {
    this.constructor_0();
    this._parent = parent_;
  }

  /// <summary>
  ///   parse the properties
  /// </summary>
  /// <param name = "parentObj">reference to parent object(TaskBase)</param>
  fillData(parentObj: PropParentInterface, parType: string): void {
    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;
    while (this.initInnerObjects(parser.getNextTag(), parentObj, parType)) {
    }
  }

  /// <summary>
  ///   For recompute: Parse the existing properties and create references to them
  /// </summary>
  /// <param name = "task">reference to the parent TaskBase</param>
  fillDataByExists(task: TaskBase): void {
    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;
    while (this.fillExistInnerObjects(parser.getNextTag(), task)) {
    }
  }

  /// <summary>
  ///   fill the inner objects of the class
  /// </summary>
  /// <param name = "foundTagName">name of tag, of object, which need be allocated</param>
  /// <param name = "parentObj">reference to the parent object, need be added to every Property</param>
  /// <returns> Manager.XmlParser.getCurrIndex(), the found object tag and ALL its subtags finish</returns>
  private initInnerObjects(foundTagName: string, parentObj: PropParentInterface, parType: string): boolean {
    if (foundTagName !== null && foundTagName === XMLConstants.MG_TAG_PROP) {
      let property: Property = new Property();
      property.fillData(parentObj, parType);
      this.addPropWithCheckExistence(property, true);
    }
    else
      return false;
    return true;
  }

  /// <summary>
  ///   if the property doesn't exist in the table then add it, otherwise change it
  /// </summary>
  /// <param name = "prop">the property to add</param>
  /// <param name = "checkExistence">if true then the property will be added if it is not already exists if false then no existence is checked and the property will not be
  ///   added to the hashtable (use it when many instances of the same property are allowed)
  /// </param>
  addPropWithCheckExistence(prop: Property, checkExistence: boolean): void {
    if (checkExistence) {
      let existingProp: Property = <Property>this._hashTab.get_Item(prop.getID());
      if (existingProp === null)
        this.addPropWithKey(prop, prop.getID());
      else {
        existingProp.setValue(prop.getValue());
      }
    }
    else
      this.addPropWithKey(prop, prop.getID());
  }

  /// <summary>
  ///   adding property by key
  /// </summary>
  /// <param name = "prop"></param>
  /// <param name = "key"></param>
  addPropWithKey(prop: Property, key: number): void {
    this._hashTab.set_Item(key, prop);
    this._props.push(prop);
  }

  /// <param name = "id"></param>
  delPropById(id: number): void {
    if (this._props === null)
      return;

    let existingProp: Property = <Property>this._hashTab.get_Item(id);
    if (existingProp !== null) {
      this._props.Remove(existingProp);
      this._hashTab.Remove(id);

    }
  }

  /// <summary>
  ///   For Recompute: Fill PropTable with reference to existing PropTable
  /// </summary>
  /// <param name = "task">reference to parent TaskBase</param>
  private fillExistInnerObjects(nameOfFound: string, task: TaskBase): boolean {

    let tokensVector: List<string> = new List<string>();
    let endContext: number = -1;
    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;

    if (nameOfFound == null)
      return false;

    if (nameOfFound === XMLConstants.MG_TAG_CONTROL)
      endContext = parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex());
    else if (nameOfFound === XMLConstants.MG_TAG_PROP)
      endContext = parser.getXMLdata().indexOf(XMLConstants.TAG_TERM, parser.getCurrIndex());
    else if (nameOfFound === ('/' + XMLConstants.MG_TAG_CONTROL) ||
      MgFormBase.IsEndFormTag(nameOfFound)) {
      parser.setCurrIndex2EndOfTag();
      return false;
    }

    if (endContext !== -1 && endContext < parser.getXMLdata().length) {
      // last position of its tag
      let tag: string = parser.getXMLsubstring(endContext);
      parser.add2CurrIndex(tag.indexOf(nameOfFound) + nameOfFound.length);
      tokensVector = XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);
      if (nameOfFound === XMLConstants.MG_TAG_CONTROL) {
        // ditidx of Exists Control
        this._parent = task.getCtrl(NNumber.Parse(this.fillName(tokensVector)));
        parser.setCurrIndex(++endContext); // to delete ">"
        return true;
      }
      else if (nameOfFound === XMLConstants.MG_TAG_PROP) {
        if (this._parent != null) {
          let strPropId: string = this.fillName(tokensVector);
          let propId: number = NNumber.Parse(strPropId);
          let prop: Property = null;

          if (this._parent != null)
            prop = this._parent.getProp(propId);

          if (prop == null)
            Events.WriteExceptionToLog(NString.Format("in PropTable.fillExistInnerObjects() no property with id={0}", strPropId));
          else
            this.addPropWithCheckExistence(prop, false);
          parser.setCurrIndex(endContext + XMLConstants.TAG_TERM.length);
          return true;
        }
        else
          Events.WriteExceptionToLog("in PropTable.fillExistInnerObjects() missing control");
      }
      else {
        Events.WriteExceptionToLog(NString.Format("in PropTable.fillExistInnerObjects() illegal tag name: {0}", nameOfFound));
        parser.setCurrIndex(++endContext);
        return true;
      }
    }

    if (nameOfFound === XMLConstants.MG_TAG_CONTROL) {
      parser.setCurrIndex(++endContext);
      return true;
    }
    else if (MgFormBase.IsFormTag(nameOfFound)) {
      this._parent = task.getForm();
      (<MgFormBase>this._parent).fillName(nameOfFound);

      return true;
    }
    else if (nameOfFound === ('/' + XMLConstants.MG_TAG_FLD))
      return false;

    parser.setCurrIndex(endContext + XMLConstants.TAG_TERM.length); // exit of bounds
    return true;


  }

  /// <summary>
  ///   Find the name of an existing Control, or of an existing Property
  /// </summary>
  /// <returns> Name of control</returns>
  private fillName(tokensVector: List<string>): string {
    let attribute: string = null;
    let valueStr: string;

    for (let j: number = 0; j < tokensVector.length; j = j + 2) {
      attribute = tokensVector.get_Item(j);
      valueStr = tokensVector.get_Item(j + 1);

      if (attribute === XMLConstants.MG_ATTR_DITIDX || attribute === XMLConstants.MG_ATTR_ID)
        return valueStr;
    }
    Events.WriteExceptionToLog(NString.Format("Unrecognized attribute: '{0}'", attribute));
    return null;
  }

  /// <summary>
  ///   get size of the vector props
  /// </summary>
  /// <returns> size of the props member</returns>
  getSize(): number {
    return this._props.length;
  }

  /// <summary>
  ///   get a Property by its index in the table
  /// </summary>
  /// <param name = "idx">the index of the property</param>
  /// <returns> reference to the required Property</returns>
  getProp(idx: number): Property {
    if (idx < 0 || idx >= this._props.length)
      return null;
    return this._props.get_Item(idx);
  }

  /// <summary>
  ///   get a Property by its id
  /// </summary>
  /// <param name = "id">of the property</param>
  getPropById(id: number): Property {
    return <Property>this._hashTab.get_Item(id);
  }

  propExists(id: number): boolean {
    return this.getPropById(id) !== null;
  }

  /// <summary>
  ///   set a property value. in case the table doesn't contain such property, creates a new Property object and add it to the table.
  /// </summary>
  /// <param name = "propId">the id of the property</param>
  /// <param name = "val">the value of the property</param>
  /// <param name = "parent">a reference to the parent object</param>
  /// <param name = "parentType">the type of the parent object</param>
  setProp(propId: number, val: string, parent: PropParentInterface, parentType: string): void {

    let prop: Property = this.getPropById(propId);
    if (prop === null) {
      prop = new Property(propId, parent, parentType);
      this.addPropWithCheckExistence(prop, true);
    }
    prop.setValue(val);
    prop.setOrgValue();
  }

  /// <summary>
  ///   refresh display of the properties in the Table
  /// </summary>
  /// <param name = "forceRefresh">if true, refresh is forced regardless of the previous value</param>
  /// <param name = "onlyRepeatableProps">if true, refreshes only repeatable tree properties</param>
  RefreshDisplay(forceRefresh: boolean, onlyRepeatableProps: boolean): boolean {

    let allPropsRefreshed: boolean = true;
    let prop: Property;
    let i: number = 0;
    let form: MgFormBase = null;
    let visibleProps: List<Property> = new List();


    if (this._parent != null && this._parent instanceof MgControlBase)
      form = (<MgControlBase>this._parent).getForm();

    if (form != null)
      form.checkAndCreateRow(form.DisplayLine);


    for (i = 0; i < this.getSize(); i++) {
      prop = this.getProp(i);
      try {
        // if this property is not repeatable in tree or table, and onlyRepeatableProps turned on
        // do not refresh this property
        if (onlyRepeatableProps && !Property.isRepeatableInTable(prop.getID()))
          continue;

        // Refresh Visible prop only after refreshing the navigation props like X, Y.
        // Otherwise, the control is shown on its default location first and
        // then moved somewhere else. And this is clearly visible.
        if (prop.getID() === PropInterface.PROP_TYPE_VISIBLE)
          visibleProps.push(prop);
        else
          prop.RefreshDisplay(forceRefresh);
      }
      catch (ex) {
        if (ex instanceof ApplicationException) {
          Events.WriteExceptionToLog(ex);
          allPropsRefreshed = false;
        }
        else
          throw  ex;

      }
    }

    if (form != null)
      form.validateRow(form.DisplayLine);

    visibleProps.forEach(visibleProp => {
      visibleProp.RefreshDisplay(forceRefresh);
    });
    return allPropsRefreshed;
  }

  /// <summary>
  ///   update all properties array size
  /// </summary>
  /// <param name = "newSize"></param>
  updatePrevValueArray(newSize: number): void {
    for (let i: number = 0; i < this._props.length; i = i + 1) {
      let property: Property = this._props.get_Item(i);
      property.updatePrevValueArray(newSize);
    }
  }

  /// <summary>
  /// clear prevValue array of Label property if exists
  /// </summary>
  clearLabelPrevValueArray(): void {
    let labelProperty: Property = this.getPropById(45);
    if (labelProperty !== null)
      labelProperty.clearPrevValueArray();
  }

  /// <summary>
  ///   returns control
  /// </summary>
  /// <returns></returns>
  getCtrlRef(): MgControlBase {
    return ((this._parent instanceof MgControlBase) ? <MgControlBase>this._parent : null);
  }
}
