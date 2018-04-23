import {Order} from "@magic/utils";

/// <summary>
/// Definition of a view on a data source. This information is used
/// when creating the actual view.
/// </summary>

export interface IDataSourceViewDefinition {
  /// <summary>
  /// Gets the order of retrieving records from the database.
  /// </summary>
  RecordsOrder: Order;

  /// <summary>
  /// Gets a value denoting whether the view will be able to insert new
  /// records to the database.
  /// </summary>
  CanInsert: boolean;

  /// <summary>
  /// Gets a value denoting whether the view will be able to delete records
  /// from the database.
  /// </summary>
  CanDelete: boolean;

}
