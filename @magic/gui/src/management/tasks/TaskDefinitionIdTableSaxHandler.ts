import { JSON_Utils, XMLConstants } from "@magic/utils";
import { TaskDefinitionId } from "./TaskDefinitionId";
import { Events } from "../../Events";
import { isNullOrUndefined } from "util";

/// <summary>
/// Handler for parsing XML serialized TaskDefinitionId (TDID) table. The parser will parse all
/// TDID entries, invoking an assigned delegate for each one it parses.
/// </summary>
export class TaskDefinitionIdTableSaxHandler {
  /// <summary>
  /// Handler to be invoked after parsing each TDID entry.
  /// </summary>
  private readonly _newTaskDefinitionIdHandler: (taskDefinitionId: TaskDefinitionId) => void = null;

  constructor(newTaskDefintionIdHandler: (taskDefinitionId: TaskDefinitionId) => void) {
    this._newTaskDefinitionIdHandler = newTaskDefintionIdHandler;
  }

  /// <summary>
  /// parse the supplied buffer using the previously supplied handler
  /// </summary>
  /// <param name="xmlSerializedTaskDefinitionsTable"></param>
  parse (xmlSerializedTaskDefinitionsTable: string): void {
    try {
      if (xmlSerializedTaskDefinitionsTable !== null) {
        JSON_Utils.JSONFromXML(xmlSerializedTaskDefinitionsTable, this.ParseJSON.bind(this));
      }
    }
    catch (ex) {
      Events.WriteExceptionToLog(ex);
    }
  }

  private ParseJSON (error, result): void {

    // If there was an error in parsing the XML,
    if (error != null) {
      throw error;
    }

    let ctlIndex: number = 0;
    let isPrg: boolean = false;
    let prgIsn: number = 0;
    let taskIsn: number = 0;

    let taskDefId = result['taskDefinitionId']['$'];

    if (!isNullOrUndefined(taskDefId[XMLConstants.MG_ATTR_CTL_IDX]))
      ctlIndex = +taskDefId[XMLConstants.MG_ATTR_CTL_IDX];

    if (!isNullOrUndefined(taskDefId[XMLConstants.MG_ATTR_PROGRAM_ISN]))
      prgIsn = +taskDefId[XMLConstants.MG_ATTR_PROGRAM_ISN];

    if (!isNullOrUndefined(taskDefId[XMLConstants.MG_ATTR_TASK_ISN]))
      taskIsn = +taskDefId[XMLConstants.MG_ATTR_TASK_ISN];

    if (!isNullOrUndefined(taskDefId[XMLConstants.MG_ATTR_ISPRG]))
      isPrg = taskDefId[XMLConstants.MG_ATTR_ISPRG] === '1';

    let taskDefinitionId: TaskDefinitionId = new TaskDefinitionId(ctlIndex, prgIsn, taskIsn, isPrg);
    this._newTaskDefinitionIdHandler(taskDefinitionId);
  }
}
