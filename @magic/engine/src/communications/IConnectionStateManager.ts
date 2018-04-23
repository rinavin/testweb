/// <summary>
/// Interface of a class that has knowledge of the current
/// connection state.<br/>
/// The specifics of detecting disconnection is left to the implementing
/// class.
/// </summary>
export interface IConnectionStateManager {
  ConnectionEstablished(): void;

  ConnectionDropped(): void;
}
