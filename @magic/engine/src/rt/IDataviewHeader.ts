import {IDataSourceViewDefinition} from "./IDataSourceViewDefinition";
import {LnkEval_Cond, LnkMode} from "@magic/utils";

/// <summary>
/// Describes the data that corresponds to a header line in a task's data view.
/// The information in this interface supplements the data source information provided
/// by the IDataSourceViewDefinition interface.
/// </summary>
export interface IDataviewHeader extends IDataSourceViewDefinition {

  /// <summary>
  /// Gets the header's identifier within the task to which it belongs.
  /// </summary>
  Id: number;

  /// <summary>
  /// Gets a value denoting whether this header is the main task's source, as
  /// defined in the task's data view.
  /// </summary>
  IsMainSource: boolean;

  /// <summary>
  /// Gets the view's link mode (query, create, write, inner/outer join)
  /// </summary>
  Mode: LnkMode;

  /// <summary>
  /// Gets the field index, after which the link starts. This property applies
  /// only when IsMainSource == false.
  /// </summary>
  LinkStartAfterField: number;

  /// <summary>
  /// Gets the condition that determines whether the link should be evaluated or not.
  /// This property applies only when IsMainSource == false.
  /// </summary>
  LinkEvaluateCondition: LnkEval_Cond;

  /// <summary>
  /// Implementing classes should evaluate the Link condition.
  /// </summary>
  /// <returns></returns>
  EvaluateLinkCondition(): boolean;
}
