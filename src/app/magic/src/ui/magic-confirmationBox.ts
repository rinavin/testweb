/**
 * Created by rinat on 15/03/2018.
 */
import {Styles} from "@magic/gui";

export class confirmationBox {


  private static  isConfirmBox(style : Styles): Boolean{

    // button format mask is in first nibble from right
    let buttonMode = <number>style & 0x0F;

    var isConfirm = (buttonMode === Styles.MSGBOX_BUTTON_OK_CANCEL) ||
      (buttonMode === Styles.MSGBOX_BUTTON_ABORT_RETRY_IGNORE) ||
      (buttonMode === Styles.MSGBOX_BUTTON_YES_NO_CANCEL) ||
      (buttonMode === Styles.MSGBOX_BUTTON_YES_NO) ||
      (buttonMode === Styles.MSGBOX_BUTTON_RETRY_CANCEL);

    return (isConfirm);
  }

  private static convertToExcpectedResultBox (style: Styles, okWasPressed: Boolean ): Styles{

    // button format mask is in first nibble from right
    let buttonMode = <number>style & 0x0F;

    let retValue =  Styles.MSGBOX_RESULT_OK;

    if (buttonMode ===  Styles.MSGBOX_BUTTON_OK)
      retValue = Styles.MSGBOX_RESULT_OK;
    else if (buttonMode === Styles.MSGBOX_BUTTON_OK_CANCEL)
      retValue = okWasPressed ? Styles.MSGBOX_RESULT_OK : Styles.MSGBOX_RESULT_CANCEL;
    else if (buttonMode === Styles.MSGBOX_BUTTON_ABORT_RETRY_IGNORE)
      retValue = okWasPressed ? Styles.MSGBOX_RESULT_ABORT : Styles.MSGBOX_RESULT_RETRY;
    else if (buttonMode ===  Styles.MSGBOX_BUTTON_YES_NO_CANCEL)
      retValue = okWasPressed ? Styles.MSGBOX_RESULT_YES : Styles.MSGBOX_RESULT_NO;
    else if (buttonMode === Styles.MSGBOX_BUTTON_YES_NO)
      retValue = okWasPressed ? Styles.MSGBOX_RESULT_YES : Styles.MSGBOX_RESULT_NO;
    else if (buttonMode === Styles.MSGBOX_BUTTON_RETRY_CANCEL)
      retValue = okWasPressed ? Styles.MSGBOX_RESULT_RETRY : Styles.MSGBOX_RESULT_CANCEL;

    return retValue;
  }


  // title   : Title of the message box
  // message : Message that will be display in the message box
  // style   : Style that include buttons \ Icons
  public static showConfirmationBox(title: string, message: string, style: Styles): number {

    let okWasPressed   = false;

    let retValue =  <number>Styles.MSGBOX_RESULT_OK;

    // check if it is confirmation box
    let isConfirm  = this.isConfirmBox(style);

    // the title will be added to the string and we will add new line after the title
    let titleAndString = title + '\n'+ '\n' + message;

    if (isConfirm)
      okWasPressed = confirm(titleAndString);
    else {
      alert(titleAndString);
      okWasPressed = true;
    }

    // return the result from the user
    return <number>this.convertToExcpectedResultBox(style, okWasPressed);
  }
}
