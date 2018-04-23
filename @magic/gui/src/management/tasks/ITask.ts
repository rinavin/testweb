/// <summary>
/// functionality required by the GUI namespace from the TaskBase class.
/// </summary>
export interface ITask {
  /// <summary>
  ///   return the component idx
  /// </summary>
  getCompIdx(): number;

  /// <summary>
  ///   get task id
  /// </summary>
  getTaskTag(): string;


  /// <summary>
  ///   returns scheme for null arithmetic
  /// </summary>
  getNullArithmetic(): string;

  /// <summary>
  ///   get the task mode
  /// </summary>
  getMode(): string;
}
