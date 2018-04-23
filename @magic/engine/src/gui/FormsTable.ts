import {List} from "@magic/mscorelib";
import {XmlParser, XMLConstants} from "@magic/utils";
import {Manager, MgFormBase, TaskBase} from "@magic/gui";
import {Task} from "../tasks/Task";
import {ClientManager} from "../ClientManager";
import {RemoteTaskService} from "../tasks/RemoteTaskService";

/// <summary>
/// save all forms on task
/// </summary>
export class FormsTable {
  private _task: Task = null;
  private _parentForm: MgFormBase = null;
  _formsStringXml: List<string> = null;

  /// <summary>
  /// count of forms
  /// </summary>
  get Count(): number {
    return this._formsStringXml.length;
  }

  /// <summary>
  /// return the form by send the display index
  /// </summary>
  /// <param name="formDisplayIndex"></param>
  /// <returns></returns>
  get_Item(formDisplayIndex: number): string {
    if (formDisplayIndex > 0 && formDisplayIndex <= this._formsStringXml.length)
      return this._formsStringXml.get_Item(formDisplayIndex - 1);

    return null;
  }

  constructor(task: TaskBase, parentForm: MgFormBase) {
    this._task = <Task>task;
    this._parentForm = parentForm;
  }

  /// <summary>
  ///   parse the form structure
  /// </summary>
  /// <param name = "taskRef">reference to the ownerTask of this form</param>
  fillData(): void {
    this._formsStringXml = new List();

    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;

    while (this.initInnerObjects(parser.getNextTag())) {
    }
  }

  /// <summary>
  /// init the form of the task
  /// </summary>
  /// <param name="formDisplayIndex"></param>
  InitFormFromXmlString(formDisplayIndex: number): void {
    // while the form isn't exist the first form will be open. (it is the same in non offline task)
    let formStrXml: string = this.get_Item(1);

    if (formDisplayIndex > 0 && formDisplayIndex <= this._formsStringXml.length)
      formStrXml = this.get_Item(formDisplayIndex);

    if (formStrXml !== null) {
      ClientManager.Instance.RuntimeCtx.Parser.push(); // allow recursive parsing
      ClientManager.Instance.RuntimeCtx.Parser.PrepareFormReadString(formStrXml);

      this._task.FormInitData(this._parentForm);
      ClientManager.Instance.RuntimeCtx.Parser.pop();
    }
  }

  /// <summary>
  ///   To allocate and fill inner objects of the class
  /// </summary>
  /// <param name="foundTagName"></param>
  /// <returns></returns>
  private initInnerObjects(foundTagName: string): boolean {
    if (foundTagName === null)
      return false;

    let parser: XmlParser = Manager.GetCurrentRuntimeContext().Parser;
    if (foundTagName === XMLConstants.MG_TAG_FORMS) {
      parser.setCurrIndex(parser.getXMLdata().indexOf(XMLConstants.TAG_CLOSE, parser.getCurrIndex()) + 1); // move Index to end of <dvheader> +1 for '>'
    }
    else if (foundTagName === XMLConstants.MG_TAG_FORM) {
      let formStringXml: string = ClientManager.Instance.RuntimeCtx.Parser.ReadToEndOfCurrentElement();
      this._formsStringXml.push(formStringXml);
      return true;
    }
    else if (foundTagName === ('/' + XMLConstants.MG_TAG_FORM)) {
      parser.setCurrIndex2EndOfTag();
      return true;
    }
    else if (foundTagName === ('/' + XMLConstants.MG_TAG_FORMS)) {
      this.PrepareMainDisplayForConnectedTask();

      parser.setCurrIndex2EndOfTag();
      return false;
    }
    return true;
  }

  /// <summary>
  /// for remote task we have all the information that we need to calculate the form display
  /// </summary>
  private PrepareMainDisplayForConnectedTask(): void {
    if (this._task.TaskService instanceof RemoteTaskService)
      this._task.PrepareTaskForm();
  }
}
