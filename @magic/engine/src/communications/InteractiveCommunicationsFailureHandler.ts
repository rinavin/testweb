import {OSEnvironment} from "@magic/utils";
import {Exception} from "@magic/mscorelib";
import {Commands, Styles} from "@magic/gui";
import {ICommunicationsFailureHandler} from "../http/client/ICommunicationsFailureHandler";

/// <summary>
/// This is the handler for communications that will be used in most cases. This
/// implementation shows a dialog that asks the user whether to retry the last
/// communications attempt or not and sets the ShouldRetryLastRequest accordingly.
/// </summary>
export class InteractiveCommunicationsFailureHandler implements ICommunicationsFailureHandler {
  ShouldRetryLastRequest: boolean = false;

  get ShowCommunicationErrors(): boolean {
    return true;
  }

  public CommunicationFailed(url: string, ex: Exception): void {

    let exceptionCaption: string = "";
    // TODO : Find out how to get caption
    // let exceptionCaption: string = NString.Format("{0} {1}",
    //                                              DateTimeUtils.ToString(DateTime.Now,
    //                                                                     XMLConstants.HTTP_ERROR_TIME_FORMAT),
    //                                              (ex.InnerException != null ? ex.InnerException.GetType() : ex.GetType()).Name);


    let exceptionMessage: string = url.split('?')[0] + OSEnvironment.EolSeq + OSEnvironment.EolSeq + ex.Message + OSEnvironment.EolSeq + OSEnvironment.EolSeq;

    this.ShouldRetryLastRequest = (Commands.messageBox(null, exceptionCaption,
      exceptionMessage + "Do you wish to retry connecting?",
      Styles.MSGBOX_BUTTON_YES_NO | Styles.MSGBOX_DEFAULT_BUTTON_2) === Styles.MSGBOX_RESULT_YES);
  }

}
