import {NString} from "@magic/mscorelib";

export class TaskDefinitionId {

  CtlIndex: number = 0;
  ProgramIsn: number = 0;
  TaskIsn: number = 0;
  IsProgram: boolean = false;

  /// <summary>
  /// CTOR
  /// </summary>
  /// <param name="ctlIndex"></param>
  /// <param name="programIsn"></param>
  /// <param name="taskIsn"></param>
  /// <param name="isProgram"></para
  constructor(ctlIndex: number, programIsn: number, taskIsn: number, isProgram: boolean);
  constructor();
  constructor(ctlIndex?: number, programIsn?: number, taskIsn?: number, isProgram?: boolean) {
    if (arguments.length === 4)
      this.constructor_0(ctlIndex, programIsn, taskIsn, isProgram);
    else
      this.constructor_1();
  }

  private constructor_0(ctlIndex: number, programIsn: number, taskIsn: number, isProgram: boolean): void {
    this.CtlIndex = ctlIndex;
    this.ProgramIsn = programIsn;
    this.IsProgram = isProgram;
    this.TaskIsn = (isProgram ? 0 : taskIsn);


  }

  private constructor_1(): void {
  }

  /// <summary>
  /// return true if this task definition id define main program
  /// </summary>
  /// <returns></returns>
  IsMainProgram(): boolean {
    return this.IsProgram && this.ProgramIsn === 1;
  }

  /// <summary>
  ///
  /// </summary>
  /// <param name="obj"></param>
  /// <returns></returns>
  Equals(obj: any): boolean {
    if (obj === null || !(obj instanceof TaskDefinitionId))
      return false;
    return this.GetHashCode() === obj.GetHashCode();
  }

  /// <summary>
  ///
  /// </summary>
  /// <returns></returns>
  GetHashCode(): number {
    let strHashCode: string = this.HashCodeString();
    return NString.GetHashCode(strHashCode);
  }

  /// <summary>
  ///
  /// </summary>
  /// <returns></returns>
  private HashCodeString(): string {
    let strHashCode: string = this.CtlIndex + "." + this.IsProgram + "." + this.ProgramIsn + "." + this.TaskIsn;
    return strHashCode;
  }

  toString(): string {
    return NString.Format("{{Task ID: {0} ctl {1}/prg {2}{3} (hash: {4})}}", [
      this.IsProgram ? "Program" : "Task",
      this.CtlIndex,
      this.ProgramIsn,
      this.IsProgram ? "" : NString.Format(" Task {0}", this.TaskIsn),
      this.HashCodeString()
    ]);
  }
}
