/// <summary>
/// functionality required by the GUI namespace from the FlowMonitorQueue class.
/// </summary>
export interface IFlowMonitorQueue {
  addTaskCngMode(contextID: number, newTaskMode: string): void;
}
