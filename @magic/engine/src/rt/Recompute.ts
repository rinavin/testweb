import {PropInterface, PropTable} from "@magic/gui";
import {Field} from "../data/Field";
import {List} from "@magic/mscorelib";
import {Task} from "../tasks/Task";
import {CommandsProcessorBase_SendingInstruction} from "../CommandsProcessorBase";
import {Constants, InternalInterface, Logger, XMLConstants, XmlParser} from "@magic/utils";
import {ClientManager} from "../ClientManager";
import {Record} from "../data/Record";
import {CommandsTable} from "../CommandsTable";
import {IClientCommand} from "../commands/IClientCommand";
import {CommandFactory} from "../commands/ClientToServer/CommandFactory";
import {DataviewHeaderBase, RemoteCommandsProcessor} from "../../index";
import {FlowMonitorQueue} from "../util/FlowMonitorQueue";
import {FieldsTable} from "../data/FieldsTable";
import {TasksTable} from "../tasks/TasksTable";
import {MgControl} from "../gui/MgControl";
import {ConstInterface} from "../ConstInterface";
import {DataView} from "../data/DataView";

export enum Recompute_RcmpBy {
  CLIENT = 'C',
  SERVER_ON_CHANGE = 'O'
}

export class Recompute {
  private _ctrlProps: PropTable = null; // affected control properties
  private _formProps: PropTable = null; // affected form properties
  private _isOwnerFld: boolean = true; // denotes if the current parsed field tag is the owner field
  OwnerFld: Field = null; // the field that owns this recompute structure

  private _rcmpOrder: List<Field | DataviewHeaderBase> = null; // affected fields and links. Can't use List<T> - holds both fields and links
  private _subForms: List<Task> = null; // subforms (tasks) affected by this recompute
  private _subFormsOnlyRecomp: boolean = false;
  private _hasServerLinksRecomputes: boolean = false; // true, if the field has any link recomputes and it is a server recompute
  RcmpMode: Recompute_RcmpBy = null;  // Who (and when) performs rcmp (by client,

  Task: Task = null; // a reference to the task of this Recompute

  /// <summary>
  ///   to fill all relevant data for <fld ...> ...</fld> tag
  /// </summary>
  /// <param name = "dataView">reference to all DataView object, which consist relevant fields </param>
  /// <param name = "taskRef">to parent task, which need be initialized in ControlTable.Control.task </param>
  /// <returns> index of the end of current <fld ...>=> </fld> </returns>
  fillData(dataView: DataView, taskRef: Task): void {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;

    this.Task = taskRef;
    this._isOwnerFld = true; // start of new <fld> tag
    while (this.initInnerObjects(parser, parser.getNextTag(), dataView)) {
    }
  }

  /// <summary>
  ///   Fill inner members and needed links for the current 'fld'
  /// </summary>
  /// <param name = "((DataView)dataView)">reference to all DataView object, which consist relevant fields </param>
  private initInnerObjects(parser: XmlParser, foundTagName: string, dataView: DataView): boolean {
    switch (foundTagName) {
      case XMLConstants.MG_TAG_FLD:
        // init <fld id = recompute_by=> first time, init reference by id
        if (this._isOwnerFld) {
          this.fillFldField(parser, dataView);
          this._isOwnerFld = false; // must to be after FillFldField
        }
        else
          this.fillFldField(parser, dataView); // it's not need ((DataView)dataView), it's not first <fld >
        break;

      case ConstInterface.MG_TAG_LINK:
        this.fillLink(parser, dataView);
        break;

      case XMLConstants.MG_TAG_CONTROL:
        if (this._ctrlProps == null)
          this._ctrlProps = new PropTable();

        // fill the prop table using the existing properties
        this._ctrlProps.fillDataByExists(this.Task);

        // if virtual field causes recompute of repeatable control
        if (this._ctrlProps.getCtrlRef() != null && this._ctrlProps.getCtrlRef().IsRepeatable && this.OwnerFld.IsVirtual &&
          !(this.OwnerFld.hasInitExp()))
          this.OwnerFld.causeTableInvalidation(true);
        break;

      case XMLConstants.MG_TAG_FORM_PROPERTIES:
        if (this._formProps == null)
          this._formProps = new PropTable();

        // fill the prop table using the existing properties
        this._formProps.fillDataByExists(this.Task);
        break;

      case ConstInterface.MG_TAG_FLD_END:
        parser.setCurrIndex2EndOfTag();
        return false;

      default:
        Logger.Instance.WriteExceptionToLogWithMsg("There is no such tag in Recompute. Insert else if to Recompute.initInnerObjects for " + foundTagName);
        return false;
    }
    return true;
  }

  private AddRecomputeItem(item: Field | DataviewHeaderBase): void {
    if (this._rcmpOrder === null)
      this._rcmpOrder = new List();
    this._rcmpOrder.push(item);
  }

  /// <summary>
  ///   fill the recomputed link data (only id)
  /// </summary>
  private fillLink(parser: XmlParser, dataView: DataView): void {
    let endContext: number = parser.getXMLdata().indexOf(XMLConstants.TAG_TERM, parser.getCurrIndex());
    if (endContext !== -1 && endContext < parser.getXMLdata().length) {
      // last position of its tag
      let tag: String = parser.getXMLsubstring(endContext);
      parser.add2CurrIndex(tag.indexOf(ConstInterface.MG_TAG_LINK) + ConstInterface.MG_TAG_LINK.length);

      let tokensVector: List<string> = XmlParser.getTokens(parser.getXMLsubstring(endContext), XMLConstants.XML_ATTR_DELIM);

      for (let j: number = 0; j < tokensVector.length; j += 2) {
        let attribute: string = (tokensVector.get_Item(j));
        let valueStr: string = (tokensVector.get_Item(j + 1));

        if (attribute === XMLConstants.MG_ATTR_ID)
          this.AddRecomputeItem((dataView.getTask()).getDataviewHeaders().getDataviewHeaderById(XmlParser.getInt(valueStr)));

        else Logger.Instance.WriteExceptionToLogWithMsg("There is no such tag in Recompute class. Insert case to Recompute.fillLink for " + attribute);
      }
      parser.setCurrIndex(endContext + XMLConstants.TAG_TERM.length); // to delete "/>" too
      return;
    }
    else
      Logger.Instance.WriteExceptionToLogWithMsg("in Recompute.fillLink() out of bounds");
  }

  /// <summary>
  ///   Init RecomputeBy member and init reference from the Field to the Recompute object
  /// </summary>
  /// <param name = "xmlParser.getXMLdata()">, input string full XML.innerText </param>
  /// <param name = "xmlParser.getCurrIndex()">, index of start first <fld ...> tag </param>
  /// <param name = "((DataView)dataView)">reference to all DataView object, which consist relevant fields </param>
  /// <returns> index of end of <fld ...> tag </returns>
  private fillFldField(parser: XmlParser, dataView: DataView): void {
    let endContext: number = parser.getXMLdata().indexOf(this._isOwnerFld
      ? XMLConstants.TAG_CLOSE
      : XMLConstants.TAG_TERM, parser.getCurrIndex());

    if (endContext !== -1 && endContext < parser.getXMLdata().length) {

      // last position of its tag
      let tag: String = parser.getXMLsubstring(endContext);
      parser.add2CurrIndex(tag.indexOf(XMLConstants.MG_TAG_FLD) + XMLConstants.MG_TAG_FLD.length);

      let tokensVector: List<string> = XmlParser.getTokens(parser.getXMLsubstring(endContext),
        XMLConstants.XML_ATTR_DELIM);
      this.initElements(tokensVector, dataView);
      if (this._isOwnerFld) {
        parser.setCurrIndex(++endContext);
        return;
      }
      parser.setCurrIndex(endContext + XMLConstants.TAG_TERM.length);
      return;
    }
    Logger.Instance.WriteExceptionToLogWithMsg("in Command.FillData() out of bounds");
  }

  /// <summary>
  ///   Make initialization of private elements by found tokens
  /// </summary>
  /// <param name = "tokensVector">found tokens, which consist attribute/value of every found element </param>
  /// <param name = "((DataView)dataView)">reference to field objects, for <fld id = ...>
  ///                                                            if ((DataView)dataView)==null=> it's first found field, need to init reference
  ///                                                            from the Field
  ///                                                            if ((DataView)dataView)!=null=> add the data to currient Record, it's not first <fld>
  /// </param>
  private initElements(tokensVector: List<string>, dataView: DataView): void {
    for (let j: number = 0; j < tokensVector.length; j += 2) {
      let attribute: string = (tokensVector.get_Item(j));
      let valueStr: string = (tokensVector.get_Item(j + 1));

      switch (attribute) {
        case XMLConstants.MG_ATTR_ID: {
          let fldId: number = XmlParser.getInt(valueStr);
          let fld = <Field>dataView.getField(fldId);
          if (this._isOwnerFld) {
            this.OwnerFld = fld;
            this.OwnerFld.setRecompute(this);
          }
          else {
            fld.setRecomputed();
            this.AddRecomputeItem(fld);
          }
          break;
        }
        case ConstInterface.MG_ATTR_RECOMPUTEBY:
          this.RcmpMode = <Recompute_RcmpBy>valueStr[0];
          break;

        case ConstInterface.MG_ATTR_SUB_FORM_RCMP:
          this._subFormsOnlyRecomp = true;
          break;

        case ConstInterface.MG_ATTR_HAS_LINK_RECOMPUTES:
          this._hasServerLinksRecomputes = true;
          break;

        case XMLConstants.MG_ATTR_NAME:
          /* ignore the name */
          break;

        default:
          Logger.Instance.WriteExceptionToLogWithMsg("There is no such tag in Recompute class. Insert case to Recompute.initElements for " + attribute);
          break;
      }
    }
  }

  /// <summary>
  ///   execute recompute
  /// </summary>
  /// <param name = "rec">the record on which the recompute is executed</param>
  public execute(rec: Record): void {
    let i: number;
    let fld: Field;
    let cmdsToServer: CommandsTable = this.Task.getMGData().CmdsToServer;
    let cmd: IClientCommand;

    try {
      rec.setInRecompute(true);

      let allowServerRecompute: boolean = this._hasServerLinksRecomputes ||
        (this.Task.getForm().AllowedSubformRecompute && this.checkRefreshSubForms());

      // SERVER
      if (this.RcmpMode !== Recompute_RcmpBy.CLIENT && allowServerRecompute) {
        let inClient: boolean = this._subFormsOnlyRecomp;
        this.Task.ExecuteClientSubformRefresh = false;

        // if the recompute is not only due to sub-forms go to server
        if (inClient) {
          inClient = this.Task.prepareCache(true);
          // if all sub-form are not update
          if (inClient)
            inClient = this.Task.testAndSet(true); // try to take dataviews from cache
        }
        if (!inClient) {
          (<FieldsTable>this.Task.DataView.GetFieldsTab()).setServerRcmp(true);
          cmd = CommandFactory.CreateRecomputeCommand(this.Task.getTaskTag(), this.OwnerFld.getId(), !this.Task.getForm().AllowedSubformRecompute);
          cmdsToServer.Add(cmd);
          RemoteCommandsProcessor.GetInstance().Execute(CommandsProcessorBase_SendingInstruction.TASKS_AND_COMMANDS);
        }
        if (this.Task.ExecuteClientSubformRefresh)
          this.RefreshSubforms();
        else {
          if (this.recPrefixSubForms())
            this.recSuffixSubForms();
          this.Task.CleanDoSubformPrefixSuffix();
        }
      }
      // CLIENT
      else {
        try {
          FlowMonitorQueue.Instance.addRecompute(this.OwnerFld.getVarName());

          // FORM PROPERTIES
          if (this._formProps != null)
            this._formProps.RefreshDisplay(false, false);

          // CTRL PROPERTIES
          if (this._ctrlProps != null)
            this._ctrlProps.RefreshDisplay(false, false);

          // re-cumpute client side fields and links
          if (this._rcmpOrder != null) {
            for (i = 0; i < this._rcmpOrder.length; i++) {
              if (this._rcmpOrder.get_Item(i) instanceof Field) {
                fld = <Field>this._rcmpOrder.get_Item(i);
                this.fldRcmp(fld, true);
              }
              else if (this._rcmpOrder.get_Item(i) instanceof DataviewHeaderBase) {
                let curLnk = <DataviewHeaderBase>this._rcmpOrder.get_Item(i);
                curLnk.getLinkedRecord(rec);

                // if we have recomputed a link we should also start the recompute process on all of its fields
                let linkFields: List<Field> = (<FieldsTable>this.Task.DataView.GetFieldsTab()).getLinkFields(curLnk.Id);
                rec.setInCompute(true);
                let saveInForceUpdate: boolean = rec.InForceUpdate;
                rec.InForceUpdate = false;

                for (let j: number = 0; j < linkFields.length; j++) {
                  this.fldRcmp(linkFields.get_Item(j), false);
                  rec.clearFlag((linkFields.get_Item(j)).getId(), Record.FLAG_UPDATED);
                  rec.clearFlag((linkFields.get_Item(j)).getId(), Record.FLAG_MODIFIED);
                  rec.clearFlag((linkFields.get_Item(j)).getId(), Record.FLAG_CRSR_MODIFIED);
                  rec.clearHistoryFlag((linkFields.get_Item(j)).getId());
                }
                rec.InForceUpdate = saveInForceUpdate;

                // start recompute process on the ret val of the link
                let retFld: Field = curLnk.ReturnField;
                if (retFld != null)
                  this.fldRcmp(retFld, false);

                rec.setInCompute(false);
                rec.setForceSaveOrg(true);
              }
            }
          }
          this.RefreshSubforms();
        }
        catch (e) {
          Logger.Instance.WriteExceptionToLogWithMsg("in Recompute.execute(): " + e.Message);
        }

      }  // END CLIENT BLOCK
    }

    finally {
      rec.buildLinksPosStr();
      rec.setInRecompute(false);
    }
  }

  /// <summary>
  // Subforms recompute
  /// </summary>
  private RefreshSubforms(): void {
    if (this.Task.getForm().AllowedSubformRecompute) {
      let subformsToRefresh: List<Task> = this.GetSubformsToRefresh();

      for (let i: number = 0; i < subformsToRefresh.length; i++) {
        let subformTask: Task = subformsToRefresh.get_Item(i);
        this.Task.SubformRefresh(subformTask, true);
      }

    }
  }

  /// <summary>
  ///   a helper function to recompute fields
  /// </summary>
  /// <param name = "fld">- the fiedl to recompute</param>
  private fldRcmp(fld: Field, computeField: boolean): void {
    if (fld.IsVirtual
      || ((this.Task.getMode() !== Constants.TASK_MODE_QUERY ||
        ClientManager.Instance.getEnvironment().allowUpdateInQueryMode(this.Task.getCompIdx())))) {
      if (!fld.isInEvalProcess()) {
        if (computeField)
          fld.compute(true);
        else
          fld.setValueAndStartRecompute(fld.getValue(false), fld.isNull(), true, false, false);
        fld.updateDisplay();
      }
    }
  }


  /// <summary></summary>
  private buildSubFormList(): void {
    if (this._subForms === null) {
      this._subForms = new List<Task>();
      let subTasksTab: TasksTable = this.Task.getSubTasks();

      if (subTasksTab !== null) {
        for (let i: number = 0; i < subTasksTab.getSize(); i = i + 1) {
          let subForm: Task = subTasksTab.getTask(i);
          // QCR #299153. Add only subforms (not subtasks).
          if (subForm.getForm().getSubFormCtrl() !== null && subForm.refreshesOn(this.OwnerFld.getId())) {
            this._subForms.push(subForm);
          }
        }
      }
    }
  }

  /// <summary>
  /// Removes the specific task from subforms list
  /// </summary>
  /// <param name="subformTask"></param>
  RemoveSubform(subformTask: Task): void {
    this._subForms.Remove(subformTask);
  }

  /// <summary>
  /// Inserts the specific subform task into the subform list
  /// </summary>
  /// <param name="subformTask"></param>
  AddSubform(subformTask: Task): void {
    if (this._subForms === null)
      this._subForms = new List<Task>();
    if (!this._subForms.Contains(subformTask))
      this._subForms.push(subformTask);
  }

  /// <summary>
  ///   execute record suffix for the affected subforms if Refresh is needed
  ///   returns true if finished successfully and it is needed to refresh
  /// </summary>
  private recSuffixSubForms(): boolean {
    let i: number;
    let subForm: Task;
    let successful: boolean = true;
    let subformCtrl: MgControl;

    // build the subforms list and save it for future use
    this.buildSubFormList();

    // execute "record suffix" for the subforms
    for (i = 0; successful && i < this._subForms.length; i++) {
      subForm = this._subForms.get_Item(i);
      subformCtrl = <MgControl>subForm.getForm().getSubFormCtrl();
      if (subForm.isStarted() && !subformCtrl.RefreshOnVisible &&
        subformCtrl.checkProp(PropInterface.PROP_TYPE_AUTO_REFRESH, true) && !subForm.InSelect
        && subForm.DoSubformPrefixSuffix) {
        ClientManager.Instance.EventsManager.handleInternalEventWithTask(subForm, InternalInterface.MG_ACT_REC_SUFFIX);
        successful = !ClientManager.Instance.EventsManager.GetStopExecutionFlag();
      }
    }
    (<DataView>this.Task.DataView).setPrevCurrRec();
    return (successful);
  }

  // check if do refresh for any subform that the field affects
  private checkRefreshSubForms(): boolean {
    let refresh: boolean = !this._subFormsOnlyRecomp;

    let subformsToRefresh: List<Task> = this.GetSubformsToRefresh();
    if (subformsToRefresh.length > 0)
      refresh = true;
    return refresh;
  }

  /// <summary>
  /// Gets a list of those subforms that must be refreshed.
  /// </summary>
  /// <returns>list of subforms to refresh</returns>
  private GetSubformsToRefresh(): List<Task> {
    let subTasks: List<Task> = new List<Task>();
    let subformCtrl: MgControl;

    // build the subforms list and save it for future use
    this.buildSubFormList();

    this._subForms.forEach(function (subTask) {
      subformCtrl = <MgControl>subTask.getForm().getSubFormCtrl();
      if (subTask.isStarted() && subformCtrl.checkProp(PropInterface.PROP_TYPE_AUTO_REFRESH, true) &&
        !subTask.InSelect && !subTask.InEndTask) {

        // compute the visibility property for the subform control before use it in isVisible() method
        subformCtrl.checkProp(PropInterface.PROP_TYPE_VISIBLE, true);
        if (!subformCtrl.isVisible() && !subformCtrl.checkProp(PropInterface.PROP_TYPE_REFRESH_WHEN_HIDDEN, false))
          subformCtrl.RefreshOnVisible = true;
        else subTasks.push(subTask);
      }
    });
    return subTasks;
  }

  /// <summary>
  ///   execute record prefix for the affected subforms if Refresh is needed
  ///   returns true if finished successfully and it is needed to refresh
  /// </summary>
  private recPrefixSubForms(): boolean {
    let i: number;
    let subForm: Task;
    let successful: boolean = true;
    let subformCtrl: MgControl;

    // build the subforms list and save it for future use
    this.buildSubFormList();

    // execute "record prefix" for the subforms
    for (i = 0; successful && i < this._subForms.length; i++) {
      subForm = this._subForms.get_Item(i);
      subformCtrl = <MgControl>subForm.getForm().getSubFormCtrl();
      if (subForm.isStarted() && !subformCtrl.RefreshOnVisible
        && subformCtrl.checkProp(PropInterface.PROP_TYPE_AUTO_REFRESH, true)
        && !subForm.InSelect && subForm.DoSubformPrefixSuffix) {
        ClientManager.Instance.EventsManager.handleInternalEventWithTaskAndSubformRefresh(subForm, InternalInterface.MG_ACT_REC_PREFIX, true);
        successful = !ClientManager.Instance.EventsManager.GetStopExecutionFlag();
      }
    }
    return successful;
  }

  notifyServerOnChange(): boolean {
    return this.RcmpMode === Recompute_RcmpBy.SERVER_ON_CHANGE;
  }

  /// <returns> true if the client doesn't know to recompute this field</returns>
  isServerRcmp(): boolean {
    return this.RcmpMode !== Recompute_RcmpBy.CLIENT;
  }

}
