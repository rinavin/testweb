/// <summary>
/// Interface that should be implemented by objects which
/// will be referenced by <see cref="ObjectReference"/> objects.
/// The implementing class will be notified of having a new reference or
/// when a referenced is no longer referencing it with the 'AddReference' and
/// 'RemoveReference', respectively.
/// </summary>

export interface IReferencedObject {
  /// <summary>
  /// Gets whether the object has object still referencing it or not.
  /// </summary>
  HasReferences: boolean;

  /// <summary>
  /// This method will be invoked when a new reference to the object
  /// is created (see ObjectReference).
  /// </summary>
  AddReference(): void;

  /// <summary>
  /// This method will be invoked when an existing reference to the
  /// object is no longer referencing it.
  /// </summary>
  RemoveReference(): void;
}
