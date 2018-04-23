import {Exception} from "@magic/mscorelib";

export interface ICommunicationsFailureHandler {
  /// <summary>
  /// Gets a value determining whether the caller should retry executing the
  /// communications request, which was sent when the failure occurred.
  /// </summary>
  ShouldRetryLastRequest: boolean;

  /// <summary>
  /// Gets a value determining whether the caller should show the
  /// communications errors.
  /// </summary>
  ShowCommunicationErrors: boolean;

  /// <summary>
  /// This method is used to notify the implementing class that the connection failed.
  /// The specific method implementation is now free to do whatever is needed at this
  /// point, such as displaying a notification message to the user, or determining
  /// next actions automatically.
  /// </summary>
  /// <param name="url">The failing URL.</param>
  /// <param name="failureException">The exception raised when the failure was detected.</param>
  CommunicationFailed(url: string, failureException: Exception): void;
}
