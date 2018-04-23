import {Logger} from "@magic/utils";
import {CommandsProcessorBase} from "./CommandsProcessorBase";
import {RemoteCommandsProcessor} from "./remote/RemoteCommandsProcessor";
import {HttpManager} from "./http/HttpManager";
import {InteractiveCommunicationsFailureHandler} from "./communications/InteractiveCommunicationsFailureHandler";

// TODO: Consider removing this class and using RemoteCommandsProcessor directly.
export class CommandsProcessorManager {
  /// <summary>
  /// get the commands processor
  /// </summary>
  /// <returns></returns>
  static GetCommandsProcessor(): CommandsProcessorBase {
    return RemoteCommandsProcessor.GetInstance();
  }

  /// <summary>
  /// get the URL content according to the active commands processor
  /// </summary>
  /// <param name="requestedURL"></param>
  /// <returns></returns>
  static GetContent(requestedURL: string): string {
    return CommandsProcessorManager.GetCommandsProcessor().GetContent(requestedURL);
  }

  /// <summary>
  /// Start session
  /// </summary>
  /// <returns></returns>
   static StartSession(): boolean {
    let succeeded: boolean = false;
    try {
      HttpManager.GetInstance().SetCommunicationsFailureHandler(new InteractiveCommunicationsFailureHandler());

      // access the Server
      succeeded = RemoteCommandsProcessor.GetInstance().StartSession();
    }
    catch (ex) {
      Logger.Instance.WriteServerToLog("Failed connecting to the server: " + ex.Message);
      throw ex;
    }

    return succeeded;
  }
}
