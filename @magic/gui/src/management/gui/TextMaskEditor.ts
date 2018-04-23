import {Hashtable, NString, StringBuilder, RefParam} from "@magic/mscorelib";
import {ClipFormats, EditReturnCode} from "../../GuiEnums";
import {MgControlBase} from "./MgControlBase";
import {MgPoint} from "../../util/MgPoint";
import {Manager} from "../../Manager";
import {Commands} from "../../Commands";
import {GuiInteractive} from "../../gui/low/GuiInteractive";
import {PIC} from "./PIC";
import {
  MsgInterface,
  StrUtil,
  StorageAttribute,
  OSEnvironment,
  UtilStrByteMode,
  Priority,
  InternalInterface
} from "@magic/utils";
import {TaskBase} from "../tasks/TaskBase";
import {Field} from "../data/Field";
import {ValidationDetails} from "./ValidationDetails";
import {DisplayConvertor} from "./DisplayConvertor";
import {GuiConstants} from "../../GuiConstants";


/// <summary>
///   TextMaskEditor will be responsible for actions concerning editing.
/// </summary>
export class TextMaskEditor {

  private _actionKeysMap: Hashtable<number, string> = null;

  /// <summary>
  ///   CTOR
  /// </summary>
  constructor() {
    this._actionKeysMap = new Hashtable<number, string>();
    this.createKeyBindings();
  }

  /// <summary>
  ///   add a new binding to the key binding hash table
  /// </summary>
  /// <param name = "action"></param>
  /// <param name = "keys"></param>
  private setKeyBinding(action: number, keys: string): void {
    this._actionKeysMap.set_Item(action, keys);
  }

  /// <summary>
  ///   get the magic action and return the matching keys
  /// </summary>
  /// <param name = "action"></param>
  /// <returns></returns>
  private getKeyFromAct(action: number): string {
    return <string>this._actionKeysMap.get_Item(action);
  }

  /// <summary>
  ///   Add all the actions that will be handled by the post event
  /// </summary>
  private createKeyBindings(): void {

    this.setKeyBinding(InternalInterface.MG_ACT_EDT_NXTCHAR, "{RIGHT}");
    this.setKeyBinding(InternalInterface.MG_ACT_EDT_PRVCHAR, "{LEFT}");
    this.setKeyBinding(InternalInterface.MG_ACT_EDT_PRVLINE, "{UP}");
    this.setKeyBinding(InternalInterface.MG_ACT_EDT_NXTLINE, "{DOWN}");
    this.setKeyBinding(InternalInterface.MG_ACT_EDT_DELCURCH, "{DELETE}");
    this.setKeyBinding(InternalInterface.MG_ACT_EDT_DELPRVCH, "{BACKSPACE}");
    this.setKeyBinding(InternalInterface.MG_ACT_EDT_PRVPAGE, "{PGUP}");
    this.setKeyBinding(InternalInterface.MG_ACT_EDT_NXTPAGE, "{PGDN}");
    this.setKeyBinding(InternalInterface.MG_ACT_EDT_BEGNXTLINE, "{ENTER}");
    this.setKeyBinding(InternalInterface.MG_ACT_CLIP_COPY, "^(C)");
    this.setKeyBinding(InternalInterface.MG_ACT_CLIP_PASTE, "^(V)");
    this.setKeyBinding(InternalInterface.MG_ACT_EDT_PRVWORD, "^{LEFT}");
    this.setKeyBinding(InternalInterface.MG_ACT_EDT_NXTWORD, "^{RIGHT}");
    this.setKeyBinding(InternalInterface.MG_ACT_EDT_BEGLINE, "{HOME}");
    this.setKeyBinding(InternalInterface.MG_ACT_EDT_ENDLINE, "{END}");
  }

  /// <summary>
  ///   action : Main method to call all the actions.
  /// </summary>
  /// <param name="ctrl"></param>
  /// <param name="internalEventCode"></param>
  /// <param name="value"></param>
  /// <param name="imeParam"></param>
  /// <returns></returns>
  ProcessAction_0(ctrl: MgControlBase, internalEventCode: number, value: string): EditReturnCode {
    return this.ProcessAction_1(ctrl, internalEventCode, value, -1, -1);
  }

  ProcessAction_1(ctrl: MgControlBase, internalEventCode: number, value: string, start: number, end: number): EditReturnCode {
    let ret: EditReturnCode = EditReturnCode.EDIT_CONTINUE;
    let editParams: EditParams;
    if (ctrl !== null) {
      // when a Korean char is entered via ACT_CHAR, use the start/end caret pos that were sent at the time
      // of key press. The reason is that a click somewhere on the text may change the caret position before
      // the ACT_CHAR is handled. If that happens, the position on which the char is written will be wrong.
      if (internalEventCode === InternalInterface.MG_ACT_CHAR && UtilStrByteMode.isLocaleDefLangKOR() &&
        start >= 0 && end >= 0 &&
        !NString.IsNullOrEmpty(value) &&
        UtilStrByteMode.isKoreanCharacter(value.charCodeAt(0))) {
        editParams = new EditParams(start, end, internalEventCode);
      }
      else {
        // ctrl to do the action on is not always the same ctrl as the ctrl on which the event occured
        // example : when parked on ctrl A, a button (B) was pushed and raised 'next char' event.
        // the event was raised on B while parking on A.
        // also, when the action came from raise event, there is not control on the evt.
        let point: MgPoint = Manager.SelectionGet(ctrl);
        editParams = new EditParams(point.x, point.y, internalEventCode);
      }

      // first, clean the message pane in case there is any msg on them.
      Manager.CleanMessagePane(ctrl.getForm().getTask());
      ctrl.refreshPrompt();
    }
    else
      editParams = new EditParams(0, 0, internalEventCode);

    switch (internalEventCode) {
      case InternalInterface.MG_ACT_CHAR: {
        ret = this.actionChar(ctrl, editParams, value);
      }
        break;

      case InternalInterface.MG_ACT_EDT_NXTCHAR:
        ret = (ctrl.isMultiline() || ctrl.getPIC().isHebrew())
          ? this.postAction(ctrl, internalEventCode)
          : this.actionNextChar(ctrl, editParams);
        break;

      case InternalInterface.MG_ACT_EDT_PRVCHAR:
        ret = (ctrl.isMultiline() || ctrl.getPIC().isHebrew())
          ? this.postAction(ctrl, internalEventCode)
          : this.actionPrevChar(ctrl, editParams);
        break;

      case InternalInterface.MG_ACT_EDT_DELCURCH: {
        // if cannot modifiy, do nothing
        if (!ctrl.isModifiable())
          return EditReturnCode.EDIT_CONTINUE;

        ret = ctrl.isMultiline()
          ? this.postAction(ctrl, internalEventCode)
          : this.actionDelChar(ctrl, editParams, true);
      }
        break;

      case InternalInterface.MG_ACT_EDT_DELPRVCH: {
        if (!ctrl.isModifiable())
          return EditReturnCode.EDIT_CONTINUE;

        ret = ctrl.isMultiline()
          ? this.postAction(ctrl, internalEventCode)
          : this.actionDelChar(ctrl, editParams, false);
      }
        break;

      case InternalInterface.MG_ACT_CLIP_COPY:
        ret = this.actionCopy(ctrl);
        break;

      case InternalInterface.MG_ACT_CUT:
        ret = this.actionCut(ctrl, editParams);
        break;

      case InternalInterface.MG_ACT_CLIP_PASTE:
        ret = this.actionPaste(ctrl, editParams);
        break;

      case InternalInterface.MG_ACT_BEGIN_DROP:
        ret = this.actionDrop(ctrl, editParams);
        break;

      case InternalInterface.MG_ACT_EDT_BEGNXTLINE:
        ret = this.actBegNextLine(ctrl, editParams);
        break;

      case InternalInterface.MG_ACT_EDT_BEGFLD:
      case InternalInterface.MG_ACT_EDT_BEGFORM:
        ret = this.actionBeginField(ctrl);
        break;

      case InternalInterface.MG_ACT_EDT_ENDFLD:
      case InternalInterface.MG_ACT_EDT_ENDFORM:
        ret = this.actionEndField(ctrl);
        break;

      case InternalInterface.MG_ACT_EDT_PRVLINE:
      case InternalInterface.MG_ACT_EDT_NXTLINE:
      case InternalInterface.MG_ACT_EDT_PRVWORD:
      case InternalInterface.MG_ACT_EDT_NXTWORD:
      case InternalInterface.MG_ACT_EDT_BEGLINE:
      case InternalInterface.MG_ACT_EDT_ENDLINE:

        ret = this.postAction(ctrl, internalEventCode);
        break;

      case InternalInterface.MG_ACT_EDT_MARKALL:
        ret = this.actionMarkAll(ctrl);
        break;

      case InternalInterface.MG_ACT_EDT_PRVPAGE:
      case InternalInterface.MG_ACT_EDT_NXTPAGE:
        if (ctrl.isMultiline())
          ret = this.postAction(ctrl, internalEventCode);
        break;

      case InternalInterface.MG_ACT_EDT_MARKTOBEG:
        ret = this.actionMarkText(ctrl, 0, editParams.EndPos);
        break;

      case InternalInterface.MG_ACT_EDT_MARKTOEND:
        ret = this.actionMarkText(ctrl, editParams.StartPos, -1);
        break;

      case InternalInterface.MG_ACT_EDT_MARKPRVCH:
        ret = this.actionMarkText(ctrl, editParams.StartPos, editParams.EndPos - 1);
        break;

      case InternalInterface.MG_ACT_EDT_MARKNXTCH:
        ret = this.actionMarkText(ctrl, editParams.StartPos, editParams.EndPos + 1);
        break;

    }
    return ret;
  }

  /// <summary>
  /// Post char in case of KBPUT()
  /// </summary>
  /// <param name="ctrl"></param>
  /// <param name="keys"></param>
  /// <returns></returns>
  PostChar(ctrl: MgControlBase, keys: string): EditReturnCode {
    if (ctrl.isModifiable()) {
      let guiInteractive: GuiInteractive = new GuiInteractive();
      if (keys !== null) {
        guiInteractive.postKeyEvent(ctrl, ctrl.getDisplayLine(true), keys, true, false);
        ctrl.ModifiedByUser = true;
      }
    }
    return EditReturnCode.EDIT_CONTINUE;
  }

  /// <summary>
  ///   Post an action To save us the time and trouble of implementing an action, we simply post that action to
  ///   the operating system, letting it to take care of it. We need to call postKeyEvent with the proper keys
  ///   combination that represent that action. for example : MG_ACT_EDT_NXTLINE is done by pressing
  ///   SWT.ARROW_DOWN.
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "editParams"></param>
  /// <returns></returns>
  private postAction(ctrl: MgControlBase, internalEventCode: number): EditReturnCode {
    let keys: string = this.getKeyFromAct(internalEventCode);
    let isDeleteOrBackspaceKey: boolean = internalEventCode === InternalInterface.MG_ACT_EDT_DELCURCH ||
      internalEventCode === InternalInterface.MG_ACT_EDT_DELPRVCH;
    if (keys !== null)
      Commands.postKeyEvent(ctrl, ctrl.getDisplayLine(true), keys, false, isDeleteOrBackspaceKey);

    return EditReturnCode.EDIT_CONTINUE;
  }

  /// <summary>
  ///   guiSetText : Call Gui to set the new text on the control we have this method in order to set the
  ///   modified by user as well.
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "text"></param>
  private guiSetText(ctrl: MgControlBase, text: string): void {
    Manager.SetEditText(ctrl, text);
    ctrl.ModifiedByUser = true; // any mod to the ctrl by the user should set this flag.
    ctrl.KeyStrokeOn = true;
    ctrl.IsNull = false;
  }

  /// <summary>
  /// Call gui to insert text to the text control in the given position
  /// </summary>
  /// <param name="ctrl"></param>
  /// <param name="text"></param>
  /// <param name="startPosition"></param>
  /// <param name="textToInsert"></param>
  private guiInsertText(ctrl: MgControlBase, startPosition: number, textToInsert: string): void {
    Manager.InsertEditText(ctrl, startPosition, textToInsert);
    ctrl.ModifiedByUser = true; // any mod to the ctrl by the user should set this flag.
    ctrl.KeyStrokeOn = true;
    ctrl.IsNull = false;
  }

  /// <summary>
  ///   advancePos : Check if the caret is positioned in front of an embeded char. if so, move it forward untill
  ///   a non embeded position is found. * The method will not advance the pos if its already on a legal
  ///   position.
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "pic"></param>
  /// <param name = "pos"></param>
  private advancePos(ctrl: MgControlBase, pic: PIC, pos: number): void {
    let newPos: number = pos;

    if (pic.isAttrBlob()) {
      // no mask in blob
      Manager.SetSelection(ctrl, pos, pos, pos);
    }
    else {
      newPos = this.convPosBufToMsk(ctrl, pos);

      while (newPos < pic.getMaskSize() && pic.picIsMask(newPos)) {
        newPos++;
      }
      newPos = this.convPosMskToBuf(ctrl, newPos);
      Manager.SetSelection(ctrl, newPos, newPos, newPos);
    }
  }

  /// <summary>
  ///   retreatPos : same as advancePos, but instead of moving the caret forward, we move it backward. if the
  ///   beginning of the mask is reached and still, pos is not allowed for parking, move forward.
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "pic"></param>
  /// <param name = "pos"></param>
  private retreatPos(ctrl: MgControlBase, pic: PIC, pos: number): void {
    let newPos: number = pos;

    if (pic.isAttrBlob()) {
      // no mask in blob
      Manager.SetSelection(ctrl, newPos, newPos, newPos);
    }
    else {
      newPos = this.convPosBufToMsk(ctrl, newPos);

      while (newPos >= 0 && pic.picIsMask(newPos))
        newPos--;

      // no pos to park on was found, advance.
      if (newPos < 0)
        this.advancePos(ctrl, pic, pos);
      else {
        newPos = this.convPosMskToBuf(ctrl, newPos);
        Manager.SetSelection(ctrl, newPos, newPos, newPos);
      }
    }
  }

  /// <summary>
  ///   Handle MG_ACT_EDT_NXTCHAR
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "editParams"></param>
  /// <returns></returns>
  private actionNextChar(ctrl: MgControlBase, editParams: EditParams): EditReturnCode {
    // get the new position after advancing
    this.advancePos(ctrl, ctrl.getPIC(), editParams.EndPos + 1);
    return EditReturnCode.EDIT_CONTINUE;
  }

  /// <summary>
  ///   Handle MG_ACT_EDT_PRVCHAR
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "editParams"></param>
  /// <returns></returns>
  private actionPrevChar(ctrl: MgControlBase, editParams: EditParams): EditReturnCode {
    // get the new position after advancing
    this.retreatPos(ctrl, ctrl.getPIC(), Math.max(0, editParams.EndPos - 1));
    return EditReturnCode.EDIT_CONTINUE;
  }

  /// <summary>
  ///   Handle MG_ACT_CHAR
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "editParams"></param>
  /// <param name = "value"></param>
  /// <returns></returns>
  private actionChar(ctrl: MgControlBase, editParams: EditParams, value: string): EditReturnCode {
    let pic: PIC = ctrl.getPIC();
    let rc: EditReturnCode = EditReturnCode.EDIT_CONTINUE;

    // In very rare cases. ACT_CHAR may arrive from the server (#77117) without any input info. do nothing.
    if (value === null)
      return rc;

    // ignore surrogate pair characters
    //    if (Manager.Environment.GetLocalFlag('i') && value.Length > 0 && (0xD800 <= (int)value[0] && (int)value[0] <= 0xDFFF))
    //       return rc;

    // if cannot modifiy, do nothing

    if (!ctrl.isModifiable())
      return rc;

    // check for null display overriding
    // after checkNullDisplayOverride, ctrlText might already contain the text to work on.
    if (!this.checkNullDisplayOverride(editParams, ctrl))
      return rc;

    // do nothing if trying to type after the end of the field
    if (this.convPosBufToMsk(ctrl, editParams.StartPos) < pic.getMaskSize() || pic.isAttrBlob()) {
      // get the existing text to work on
      if (editParams.CtrlText === null)
        editParams.CtrlText = new StringBuilder(this.getCtrlText(ctrl));

      // if somehow, the gui ctrl text is different than what we thought is was.
      if (editParams.CtrlText.Length === 0 && (editParams.StartPos > 0 || editParams.EndPos > 0)) {
        editParams.StartPos = 0;
        editParams.EndPos = 0;
      }

      // if this is overwrite mode and there are no selected chars
      // we will 'select' the next char in order to overwrite it.
      if (editParams.StartPos === editParams.EndPos && !Manager.GetCurrentRuntimeContext().IsInsertMode()) {
        if (editParams.EndPos < editParams.CtrlText.Length)
          editParams.EndPos++;

        // when overwritting and in multiline, overwriting the '\r' should also overwrite the '\n'
        // we simply include it in the endPos.
        if (ctrl.isMultiline() && editParams.EndPos < editParams.CtrlText.Length &&
          editParams.CtrlText.get_Item(editParams.EndPos) === '\n')
          editParams.EndPos++;
      }

      // if the char is overwriting an existing text, clear it first
      // overwrite will return false if nothing was deleted, if that is the case there is no
      // point to do insert coz there is no room for the char.

      if (editParams.StartPos === editParams.EndPos || this.overWriteChar(value.charAt(0), ctrl, editParams, true)) {
        if (this.charInsert(value.charAt(0), ctrl, editParams))
        // see that caret is positioned correctly
          this.advancePos(ctrl, pic, editParams.StartPos);
      }

      // Check if auto skip will be done.
      if (pic.autoSkip())
        rc = this.checkAutoSkip(editParams, ctrl);
    }

    return rc;
  }

  /// <summary>
  ///   overWriteChar : Clear the selected area in text. - Does not delete embeded chars - return false if there
  ///   is nothing to delete - check that entered char is valid : this is more usefull for 'paste' then for
  ///   'action char' - work with directive sequences : 1. If selected chars in last sequence, string is shorten
  ///   2. If not in last sequence, only chars in that sequence move and the others become ' '. - set the text
  ///   after deletion to the control. we do it now because inset/paste might not succeed but the deletion
  ///   should take effect anyway. - set the caret to the first location that was deleted (not necessarily the
  ///   1st selected (if embeded)). - advance or retreat the caret from the location it should park after the
  ///   deletion.
  /// </summary>
  /// <param name = "charToWrite">- the char that is to be written in the cleared area</param>
  /// <param name = "ctrl"></param>
  /// <param name = "editParams"></param>
  /// <param name = "advance">after the clearing, should we move farward or back if the pos is on mask char.</param>
  /// <returns></returns>
  private overWriteChar(charToWrite: string, ctrl: MgControlBase, editParams: EditParams, advance: boolean): boolean {

    let pic: PIC = ctrl.getPIC();
    let charsToEndOfSeq: number;
    let endOfSeq: number;
    let startPos: number = editParams.StartPos;
    let endPos: number = editParams.EndPos;

    let isFullWidth = false;

    if (pic.isAttrBlob())
    // for blob. just delete the selected area
    {
      editParams.CtrlText.Remove(startPos, endPos - startPos);
    }
    else {
      startPos = this.convPosBufToMsk(ctrl, editParams, startPos);
      endPos = this.convPosBufToMsk(ctrl, editParams, endPos);

      // set pos to first position where a char can be written.
      while (startPos < endPos && pic.picIsMask(startPos))
        startPos++;

      // check if there is nothing to delete
      if (startPos >= endPos || startPos > this.convPosBufToMsk(ctrl, editParams, editParams.CtrlText.Length)) {
        // if we have selected only mask chars , then we should be able write, ahead if there is scope
        if (startPos === endPos && pic.getMaskChars() === endPos && pic.getMaskLength() > pic.getMaskChars())
          return true;
        else
          return false;
      }

      // check that the char, if entered, is valid
      if (charToWrite > '\0'/*' '*/) {
        charToWrite = pic.validateChar(charToWrite, startPos);
        if (charToWrite === '\0'/*' '*/) {
          Manager.WriteToMessagePanebyMsgId(ctrl.getForm().getTask(), MsgInterface.STR_ERR_NUM, true);
          ctrl.getForm().ErrorOccured = true;
          return false;
        }
        if (UtilStrByteMode.isLocaleDefLangJPN() || UtilStrByteMode.isLocaleDefLangKOR()) {
          if (!this.isValidChar_as400(ctrl, editParams, charToWrite, startPos))
            return false;
        }


        startPos = this.convPosMskToBuf(ctrl, editParams, startPos);
        endPos = this.convPosMskToBuf(ctrl, editParams, endPos);

        // loop on the selected chars (they will be deleted)
        while (startPos < endPos) {

          let maskPos: number = this.convPosBufToMsk(ctrl, editParams, startPos);

          // skip mask chars
          if (pic.picIsMask(maskPos)) {
            startPos++;
            continue;
          }

          /* Check if there is a room to insert the character */
          charsToEndOfSeq = pic.getDirectiveLen(maskPos, startPos, editParams.CtrlText.ToString());
          endOfSeq = maskPos + charsToEndOfSeq;

          startPos = this.convPosMskToBuf(ctrl, editParams, maskPos);
          endOfSeq = this.convPosMskToBuf(ctrl, editParams, endOfSeq);

          // when selected text goes beyond the current sequence, that part of the sequence
          // is replaced with blanks. No chars are moved.
          if (endPos >= endOfSeq) {
            // fill existing text with ' ' until endOfSeq (charsToEndOfSeq)
            // advance pos to check to after the current sequence;
            while (startPos < endOfSeq) {
              if (UtilStrByteMode.isLocaleDefLangDBCS() && pic.isAttrAlphaOrDate())
                isFullWidth = !UtilStrByteMode.isHalfWidth(editParams.CtrlText.get_Item(startPos));

              editParams.CtrlText.set_Item(startPos, ' ')/*' '*/;

              if (isFullWidth) {
                editParams.CtrlText.Insert(startPos, ' '/*' '*/);
                startPos++;
                endPos++;
                endOfSeq++;
              }
              startPos++;
            }
          }

          // selected chars are within a sequence
          else {
            // is the pos within the last sequence ? string is getting shorter.
            if (endOfSeq >= editParams.CtrlText.Length) {
              // cut out len chars from existing text (remaining chars will move left)
              editParams.CtrlText.Remove(startPos, endPos - startPos);
            }
            else {
              // selected end is within a seq, but not the last one.
              // move the end of the seq only. The end of this seq will fill with blanks The following seq
              // will not move.
              let len: number = endOfSeq - endPos;

              if (len > 0) {
                if (UtilStrByteMode.isLocaleDefLangDBCS() && pic.isAttrAlphaOrDate())
                  isFullWidth = !UtilStrByteMode.isHalfWidth(editParams.CtrlText.get_Item(startPos));

                for (; startPos < endOfSeq; startPos++, endPos++) {
                  // move chars within seq
                  if (endPos < endOfSeq)
                    editParams.CtrlText.set_Item(startPos, editParams.CtrlText.get_Item(endPos));
                  else {
                    editParams.CtrlText.set_Item(startPos, ' ');

                    if (isFullWidth)
                      editParams.CtrlText.Insert(startPos, ' '/*' '*/);
                  }
                }
              }
            }
            break;
          }
        }

        // Trim the right of the string. but a blank mask char will not be deleted.
        // Do not trim beyond startPos, otherwise del prev might delete extra blanks from text.
        let idx: number = editParams.CtrlText.Length - 1;
        while (idx >= editParams.StartPos && editParams.CtrlText.get_Item(idx) === ' ' /*' '*/ &&
        !pic.picIsMask(this.convPosBufToMsk(ctrl, editParams, idx))) {
          editParams.CtrlText.Remove(idx, 1);
          idx--;
        }
      }

      // we call to update the display after the deletion
      // This is done anyway, even if the insert that will come after will not work.
      this.guiSetText(ctrl, editParams.CtrlText.ToString());

      // Try to set the caret at the begining of the selected text.
      if (advance)
        this.advancePos(ctrl, ctrl.getPIC(), editParams.StartPos);
      else
        this.retreatPos(ctrl, ctrl.getPIC(), editParams.StartPos);

      editParams.EndPos = editParams.StartPos;
      return true;
    }
  }

  /// <summary>
  ///   charInsert : Insert 1 char at a given location.
  ///   validate the char
  ///   check for empty room for the char to be insert to
  ///   insert the char (and move the following chars in the same sequence if needed).
  /// </summary>
  /// <param name = "charToWrite"></param>
  /// <param name = "ctrl"></param>
  /// <param name = "editParams"></param>
  /// <returns></returns>
  private charInsert(charToWrite: string, ctrl: MgControlBase, editParams: EditParams): boolean {

    let charsToEndOfSeq: number;
    let endOfSeq: number;
    let pic: PIC = ctrl.getPIC();
    let enlarge: boolean = false;
    let isFullWidth: boolean = false;
    let maskPos: number = 0;
    let maskSize: number = 0;
    let textLenBeforeChange: number = editParams.CtrlText.Length;


    if (pic.isAttrBlob())
      editParams.CtrlText.Insert(editParams.StartPos, charToWrite);
    else {
      isFullWidth = pic.isAttrAlphaOrDate() && !UtilStrByteMode.isHalfWidth(charToWrite);
      maskPos = this.convPosBufToMsk(ctrl, editParams.StartPos);
      maskSize = pic.getMaskSize();

      // focus on the first char to update
      while (pic.picIsMask(maskPos)) {
        maskPos++;
        if (maskPos >= maskSize)
          return false;
      }

      // validate the char. charToWrite might change according to pic.
      charToWrite = pic.validateChar(charToWrite, maskPos);

      // if char was not valid, return
      if (charToWrite === '\0') {
        Manager.WriteToMessagePanebyMsgId(ctrl.getForm().getTask(), MsgInterface.STR_ERR_NUM, true);
        ctrl.getForm().ErrorOccured = true;
        return false;
      }

      if (UtilStrByteMode.isLocaleDefLangJPN() || UtilStrByteMode.isLocaleDefLangKOR()) {
        if (!this.isValidChar_as400(ctrl, editParams, charToWrite, maskPos))
          return false;
      }

      if (UtilStrByteMode.isLocaleDefLangJPN() && pic.isAttrNumeric() &&
        UtilStrByteMode.isDigit(charToWrite) && this.IsFilledNumericDigits(editParams, pic, maskPos))
        return false;

      editParams.StartPos = this.convPosMskToBuf(ctrl, maskPos);

      // char is added at the end of existing text
      if (editParams.StartPos === editParams.CtrlText.Length) {
        /* Check the room to set the character. */
        if ((maskPos + (isFullWidth
            ? 2
            : 1)) > pic.getMaskSize())
          return (false);

        editParams.CtrlText.Append(charToWrite);
      }
      // char is inserted before the end of existing text
      else {
        maskPos = this.convPosBufToMsk(ctrl, editParams.StartPos);
        charsToEndOfSeq = pic.getDirectiveLen(maskPos, editParams.StartPos, editParams.CtrlText.ToString());
        endOfSeq = this.convPosMskToBuf(ctrl, maskPos + charsToEndOfSeq);

        // The sequence we are working on is all in the existing text.
        // Check if there is a blank at the end of the sequence, since our insert will
        // need to expand the existing text in the sequence.
        // example: mask XXX### existing str is 'AB 4'
        // and we are trying to type something after 'A', meaning pushing B on the blank at the end of the seq.
        if (endOfSeq <= editParams.CtrlText.Length) {
          /* Check the rooms (space) in mask for insert character. */
          if (!isFullWidth) {
            if (editParams.CtrlText.get_Item(endOfSeq - 1) !== ' ' || charsToEndOfSeq < 1)
              return false;
          }
          else {
            if (charsToEndOfSeq < 2 || editParams.CtrlText.get_Item(endOfSeq - 1) !== ' ' ||
              editParams.CtrlText.get_Item(endOfSeq - 2) !== ' ')
              return false;
          }
        }
        // we are beyond the existing data of the control
        // XXX### 'ABC345' : trying to type before 4, length cannot exceed mask len - cannot insert
        // 'ABC34' : mask len was not reached yet, text in last seq has room to expand.
        else {
          if (this.convPosBufToMsk(ctrl, editParams.CtrlText.Length) + (isFullWidth
              ? 2
              : 1) > pic.getMaskSize())
            return false;

          enlarge = true;
        }

        if (!isFullWidth) {
          if (charsToEndOfSeq > 1) {
            if (enlarge) {
              // Create a enough space if in between mask chars exists.
              if (editParams.StartPos > editParams.CtrlText.Length)
                editParams.CtrlText.Append(' ', (editParams.StartPos - editParams.CtrlText.Length));
              // add charIn in pos (text string will get bigger)
              editParams.CtrlText.Insert(editParams.StartPos, charToWrite);

            }
            else {
              // add charIn in pos, within its sequence.
              // remove blank from end of sequence.
              editParams.CtrlText.Remove(endOfSeq - 1, 1);
              editParams.CtrlText.Insert(editParams.StartPos, charToWrite);
            }
          }
          // writing on the last blank in seq, nothing is deleted, only blank is replaced.
          else {
            // Create a enough space if in between mask chars exists.
            if (editParams.StartPos > editParams.CtrlText.Length)
              editParams.CtrlText.Append(' ', (editParams.StartPos - editParams.CtrlText.Length) + 1);

            editParams.CtrlText.set_Item(editParams.StartPos, charToWrite);
          }
        }
        else {
          if (charsToEndOfSeq > 2) {
            if (enlarge)
            // add charIn in pos (text string will get bigger)
              editParams.CtrlText.Insert(editParams.StartPos, charToWrite);
            else {
              // add charIn in pos, within its sequence.
              // remove blank from end of sequence.

              // if (UtilStrByteMode.isHalfWidth(editParams.ctrlText.charAt(endOfSeq - 1)))
              //   editParams.ctrlText.deleteCharAt(endOfSeq - 1);

              editParams.CtrlText.Remove(endOfSeq - 1, 1);
              editParams.CtrlText.Remove(endOfSeq - 2, 1);
              editParams.CtrlText.Insert(editParams.StartPos, charToWrite);
            }
          }
          else {
            // writing on the last blank in seq, nothing is deleted, only blank is replaced.
            editParams.CtrlText.Remove(endOfSeq - 1, 1);
            editParams.CtrlText.set_Item(editParams.StartPos, charToWrite);
          }
        }
      }

    }

    // for multiline only, we will use the gui to insert the char instead of overwriting the whole text.
    // The reason is that in large multi line , when the text is overwritten we have a problem of caret and text bouncing and text flickering.
    // As a per-caution do it when the text adds 1 char in order not to interfere with the DBCS
    if (ctrl.isMultiline() && editParams.CtrlText.Length - textLenBeforeChange === 1)
      this.guiInsertText(ctrl, editParams.StartPos, charToWrite.toString());
    else
    // call GuiInteractive with ctrlTextl to set the new text
    // set the new position as well (only to the parameter thought)
      this.guiSetText(ctrl, editParams.CtrlText.ToString());

    editParams.StartPos++;
    editParams.EndPos = editParams.StartPos;

    return true;

  }


  /// <summary>
  ///   actionDelChar : MG_ACT_EDT_DELCURCH / MG_ACT_EDT_DELPRVCH
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "editParams"></param>
  /// <param name = "del"></param>
  /// <returns></returns>
  private actionDelChar(ctrl: MgControlBase, editParams: EditParams, del: boolean): EditReturnCode {
    let newPos: number = 0;

    // if cannot modifiy, do nothing
    if (!ctrl.isModifiable())
      return EditReturnCode.EDIT_CONTINUE;

    // check for null display overriding
    if (!this.checkNullDisplayOverride(editParams, ctrl))
      return EditReturnCode.EDIT_CONTINUE;

    if (editParams.CtrlText == null)
      editParams.CtrlText = new StringBuilder(this.getCtrlText(ctrl));
    // the checkNullDisplayOverride changed the displayed string to an empty string.
    // in that case we'll display it here, since nothing else will be done later.
    else if (editParams.CtrlText.Length === 0)
      this.guiSetText(ctrl, editParams.CtrlText.ToString());

    // if there was a selected area , nothing is done here, simply perform the overwrite.
    if (editParams.StartPos === editParams.EndPos) {
      // del : delete char to the right of caret
      if (del) {
        if (editParams.StartPos < editParams.CtrlText.Length)
        // select the char on the right of caret and overwite it.
          editParams.EndPos = editParams.StartPos + 1;
      }
      // !del : delete prev char, delete cha left of caret.
      else if (editParams.StartPos > 0) {
        newPos = this.convPosBufToMsk(ctrl, editParams.StartPos - 1);

        while (newPos >= 0 && ctrl.getPIC().picIsMask(newPos))
          newPos--;

        editParams.StartPos = this.convPosMskToBuf(ctrl, newPos);
        editParams.EndPos = editParams.StartPos + 1;
      }
    }

    // if there was a selected area , just clean it, nothing more will be deleted.
    if (editParams.StartPos !== editParams.EndPos)
      this.overWriteChar('\0', ctrl, editParams, del);

    return EditReturnCode.EDIT_CONTINUE;
  }

  /// <summary>
  ///   MG_ACT_CLIP_COPY : copy to clip board.
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <returns></returns>
  private actionCopy(ctrl: MgControlBase): EditReturnCode {
    let retCode: EditReturnCode = EditReturnCode.EDIT_CONTINUE;

    Manager.ClipboardWrite(ctrl, null);

    return retCode;
  }

  /// <summary>
  ///   MG_ACT_CUT : copy to clipboard and delete.
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "editParams"></param>
  /// <returns></returns>
  private actionCut(ctrl: MgControlBase, editParams: EditParams): EditReturnCode {
    // first copy to the clipboard
    this.actionCopy(ctrl);

    // if there is a selection, pland a delete char event.
    if (editParams.StartPos !== editParams.EndPos)
      Manager.EventsManager.addInternalEventWithCtrlAndCodeAndPriority(ctrl, InternalInterface.MG_ACT_EDT_DELCURCH, Priority.HIGH);

    return EditReturnCode.EDIT_CONTINUE;
  }

  /// <summary>
  ///   set the data to the control, according to mask
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "editParams"></param>
  /// <param name = "content"></param>
  /// <returns></returns>
  private setMaskedText(ctrl: MgControlBase, editParams: EditParams, content: string): EditReturnCode {

    let pic: PIC;
    // if cannot modify, do nothing
    if (!ctrl.isModifiable())
      return EditReturnCode.EDIT_CONTINUE;


    // QCR#998049: If control is not multiline edit, we should not allow pasting of "\r" and "\n".
    // so remove these characters from clipboardcontent.
    if (!ctrl.isMultiline()) {
      let from: string[] = [
        "\n", "\r"
      ];
      let to: string[] = [
        "", ""
      ];
      content = StrUtil.searchAndReplace(content, from, to);
    }

    // check for null display overriding
    if (!this.checkNullDisplayOverride(editParams, ctrl))
      return EditReturnCode.EDIT_CONTINUE;

    if (editParams.CtrlText == null)
      editParams.CtrlText = new StringBuilder(this.getCtrlText(ctrl));

    pic = ctrl.getPIC();

    // can we just paste it ? nothing to check, no mask and all chars are legal.
    // do we need to check if clipboard string contains control chars ???
    if (pic.isAttrBlob() || ((pic.isAttrAlpha() || pic.isAttrUnicode()) && pic.isAllX())) {
      let sizeLimit: number = pic.getMaskSize();
      let currTextLen: number = editParams.CtrlText.Length;
      let lenToPaste: number;

      if (pic.isAttrBlob())
      // for blob, copywhatever in the clipboard
        lenToPaste = content.length;
      else if (UtilStrByteMode.isLocaleDefLangDBCS() && pic.isAttrAlpha()) {
        let strCtrlText: string = editParams.CtrlText.ToString();
        let clipContentLenB: number = UtilStrByteMode.lenB(content);

        lenToPaste = sizeLimit -
          (UtilStrByteMode.lenB(strCtrlText) -
            (UtilStrByteMode.lenB(strCtrlText) - UtilStrByteMode.lenB(strCtrlText.substr(editParams.StartPos,
              editParams.EndPos - editParams.StartPos))));
        if (lenToPaste > clipContentLenB)
          lenToPaste = clipContentLenB;
      }
      else {
        // after cutting out the selected text, how much free space will we have ?
        lenToPaste = sizeLimit - (currTextLen - (editParams.EndPos - editParams.StartPos));
        if (lenToPaste > content.length)
          lenToPaste = content.length;
      }

      // paste only if we have room
      if (lenToPaste > 0) {
        let newPos: number = 0;
        let removeChars: string[] = [
          ' '
        ]/*' '*/;

        if (UtilStrByteMode.isLocaleDefLangDBCS() && pic.isAttrAlpha()) {
          let strPasteText: string = UtilStrByteMode.leftB(content, lenToPaste);
          newPos = editParams.StartPos + strPasteText.length;
          this.guiSetText(ctrl,
                    editParams.CtrlText.ToString(0, editParams.StartPos) + strPasteText +
            editParams.CtrlText.ToString(editParams.EndPos, editParams.CtrlText.Length - editParams.EndPos).trim());
        }
        else {
          // no mask so simply replace the selected text with the clipboard text.
          newPos = editParams.StartPos + lenToPaste;

          this.guiSetText(ctrl,
                    editParams.CtrlText.ToString(0, editParams.StartPos) + content.substr(0, lenToPaste) +
            editParams.CtrlText.ToString(editParams.EndPos, editParams.CtrlText.Length - editParams.EndPos).trim());
        }

        Manager.SetSelection(ctrl, newPos, newPos, newPos);
      }
    }
    // paste into the control considering the mask.
    else
      this.editPasteWithMask(ctrl, editParams, content);

    return EditReturnCode.EDIT_CONTINUE;
  }

  /// <summary>
  ///   get the data from the clipboard and set it to the control
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "editParams"></param>
  /// <returns></returns>
  private actionPaste(ctrl: MgControlBase, editParams: EditParams): EditReturnCode {

    let clipContent: string = Manager.ClipboardRead();

    if (clipContent === null || clipContent.length === 0) {
      return EditReturnCode.EDIT_CONTINUE;
    }

    Manager.Environment.IgnoreReplaceDecimalSeparator = true;
    let retCode: EditReturnCode = this.setMaskedText(ctrl, editParams, clipContent);
    Manager.Environment.IgnoreReplaceDecimalSeparator = false;
    return retCode;
  }

  /// <summary> set the dropped data to the control
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "editParams"></param>
  /// <returns></returns>
  private actionDrop(ctrl: MgControlBase, editParams: EditParams): EditReturnCode {

    let editReturnCode: EditReturnCode = EditReturnCode.EDIT_CONTINUE;


    // if cannot modify, do nothing
    if (ctrl != null && ctrl.isTextControl() &&
      ctrl.isParkable(false, false) && ctrl.isModifiable()) {
      let strData: string = null;
      let selectionStart: RefParam<number> = new RefParam<number>(0);
      let selectionLength: RefParam<number> = new RefParam<number>(0);

      // First try to get the unicode text format,
      // if not available try to get text format,
      // if not available then try for drop files format.
      strData = (ctrl.DataType === StorageAttribute.UNICODE
        ? Commands.GetDroppedData(ClipFormats.FORMAT_UNICODE_TEXT, null)
        : Commands.GetDroppedData(ClipFormats.FORMAT_TEXT, null));
      if (strData == null)
        strData = Commands.GetDroppedData(ClipFormats.FORMAT_DROP_FILES, null);


      // Get the Selection for Dropped control.
      Commands.GetSelectionForDroppedControl(selectionStart, selectionLength);
      if (selectionLength.value === GuiConstants.REPLACE_ALL_TEXT)
        selectionLength.value = this.getCtrlText(ctrl).length;

      editParams.StartPos = selectionStart.value;
      editParams.EndPos = selectionLength.value;

      if (!NString.IsNullOrEmpty(strData))
        editReturnCode = this.setMaskedText(ctrl, editParams, strData);
    }

    return editReturnCode;
  }

  /// <summary>
  ///   paste into the control considering the mask. skip the mask chars clean the selected area insert 1 char
  ///   at a time into the control, skipping the masked chars.
  ///
  ///   if the pasteStr contain chars that matches the mask chars at the same location, they will not be
  ///   inserted. (till we find the first mismatch).
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "editParams"></param>
  /// <param name="pasteStr"></param>
  /// <returns>success/fail</returns>
  private editPasteWithMask(ctrl: MgControlBase, editParams: EditParams, pasteStr: string): boolean {
    let checkMask: boolean = true;  // are we skipping masked chars ?
    let pic: PIC = ctrl.getPIC();
    let iSkip: number = 0;
    let posOnPasteStr: number = 0;
    let pasteStrText: StringBuilder = new StringBuilder(pasteStr);
    let pasteSuccess: boolean = true;
    let pasteStrLen: number = pasteStr.length;
    let maskPos: number = this.convPosBufToMsk(ctrl, editParams.StartPos);

    // does the pasted str start with masked chars ? if so, skip them.
    if (pic.picIsMask(maskPos)) {
      // check for masked char matching.
      iSkip = this.edtPasteSkipMaskCheck(pic, maskPos, pasteStrText, 0);
      // matching found, skip masked chars both in control and in paste str.
      if (iSkip > 0) {
        posOnPasteStr += iSkip;
        editParams.StartPos += iSkip;
      }
      // masked chars exist but do not match. skipping is no longer checked nore done.
      else
        checkMask = false;
    }

    // if there is a selected text, clean it.
    if (pasteStrText !== null && pasteStrText.Length > 0 && editParams.StartPos !== editParams.EndPos)
      if (!this.overWriteChar(pasteStrText.get_Item(posOnPasteStr), ctrl, editParams, true))
        pasteSuccess = false;

    if (pasteSuccess) {
      let insertChar: string;
      let maskLen: number = pic.getMaskLength();

      maskPos = this.convPosBufToMsk(ctrl, editParams.StartPos);

      // while in paste str and control's boundaries.
      while (posOnPasteStr < pasteStrLen && maskPos < maskLen) {
        // In a non multiline control , skip control chars (like CR, LF) if there are any in the paste str.
        if (!ctrl.isMultiline() /*&& NChar.IsControl(pasteStrText[posOnPasteStr])*/) // TODO - handle this
        {
          posOnPasteStr++;
          continue;
        }

        // if we are checking masks, see if we have matching mask chars to skip.
        if (checkMask && pic.picIsMask(maskPos)) {
          iSkip = this.edtPasteSkipMaskCheck(pic, maskPos, pasteStrText, posOnPasteStr);
          /* if the character is same as mask, skip */
          if (iSkip > 0) {
            posOnPasteStr += iSkip;
            maskPos += iSkip;
            continue;
          }
          // don't check for matching masked chars anymore
          else
            checkMask = false;
        }

        // char in paste str is not a mask, we need to insert it.

        // first, skip any masked chars
        //   editParams.startPos++;
        while (maskPos < maskLen && pic.picIsMask(maskPos))
          maskPos++;

        // cannot insert beyond mask size (we check here again since the startPos might have moved due to
        // mask)
        if (maskPos < maskLen) {
          /* Set chars to buffer to call char_insert(). */
          insertChar = pasteStrText.get_Item(posOnPasteStr);
          posOnPasteStr++;

          editParams.StartPos = this.convPosMskToBuf(ctrl, maskPos);

          // insert the char
          pasteSuccess = this.charInsert(insertChar, ctrl, editParams);

          maskPos = this.convPosBufToMsk(ctrl, editParams.StartPos);
        }

        if (!pasteSuccess)
          break;
      }

      editParams.StartPos = this.convPosMskToBuf(ctrl, maskPos);

      // after pasting startPos will contain the last inserted position on the control.
      this.advancePos(ctrl, pic, editParams.StartPos);
    }

    return pasteSuccess;
  }

  /// <summary>
  ///   Check if both Mask and paste str have a matching sequence of masked chars. The check will start from
  ///   given positions on both strings. When sequence if broken, the whole check fails.
  /// </summary>
  /// <param name = "pic"></param>
  /// <param name = "pos"></param>
  /// <param name = "pasteStrText"></param>
  /// <param name = "posOnPasteStr"></param>
  /// <returns></returns>
  private edtPasteSkipMaskCheck(pic: PIC, pos: number, pasteStrText: StringBuilder, posOnPasteStr: number): number {
    let iSkip: number = 0;

    // loop on both mask and paste str. if the mask has a masked picture then we
    // check if the paste str has the same char as well. (Unicode STR ???)
    for (iSkip = 0; pos < pic.getMaskLength() && (posOnPasteStr + iSkip) < pasteStrText.Length; iSkip++, pos++) {
      // if pic in mask is not embeded, then mask sequence has ended, skip what we found so far
      if (!pic.picIsMask(pos))
        break;
      // masked pic are equal, continue counting
      if (pic.isMaskPicEq(pos, pasteStrText.get_Item(posOnPasteStr + iSkip).charCodeAt(0)))
        continue;
      // masked pic do not match, cannot skip the sequence
      iSkip = 0;
      break;
    }
    return iSkip;
  }

  /// <summary>
  ///   MG_ACT_EDT_BEGNXTLINE - add CR, LF to current position if there is a selected text, clear it first.
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "editParams"></param>
  /// <returns></returns>
  private actBegNextLine(ctrl: MgControlBase, editParams: EditParams): EditReturnCode {

    if (!ctrl.isModifiable())
      return EditReturnCode.EDIT_CONTINUE;

    // check for null display overriding
    if (!this.checkNullDisplayOverride(editParams, ctrl))
      return EditReturnCode.EDIT_CONTINUE;


    if (editParams.CtrlText === null)
      editParams.CtrlText = new StringBuilder(this.getCtrlText(ctrl));

    if (editParams.StartPos !== editParams.EndPos)
      this.overWriteChar('\0', /*' '*/ctrl, editParams, true);

    // check if adding the eol chars will exceed the mask len.
    if (ctrl.DataType === StorageAttribute.BLOB ||
      ctrl.getPIC().getMaskLength() >= this.convPosBufToMsk(ctrl, editParams, editParams.CtrlText.Length) + 2) {
      editParams.CtrlText.Insert(editParams.StartPos, OSEnvironment.EolSeq);
      this.guiSetText(ctrl, editParams.CtrlText.ToString());
      this.advancePos(ctrl, ctrl.getPIC(), editParams.StartPos + 2);
    }
    return EditReturnCode.EDIT_CONTINUE;
  }

  /// <summary>
  ///   checkNullDisplayOverride : check if the text in the control is the null display if so, it can only be
  ///   overridden if it is all selected when overriding it, the null display is first being replaced by a
  ///   different display that has the mask. for example..date with mask 'dd/mm/yyyy' and null disp as
  ///   'nullnull' when overriding it the display will be changed to '01/01/1901' .. the actions that will come
  ///   after will clear all none mask chars and regular work is done.
  /// </summary>
  /// <param name = "editParams"></param>
  /// <param name = "ctrl"></param>
  /// <returns></returns>
  private checkNullDisplayOverride(editParams: EditParams, ctrl: MgControlBase): boolean {

    let field: Field = ctrl.getField();
    let continueAction: boolean = true;

    if (ctrl.ModifiedByUser)
      continueAction = true;
    else {

      // can check the null display only if the field is null and has a null display
      if (field !== null && field.NullAllowed && (<TaskBase>field.getTask()).IsFieldNull(field) && field.getNullDisplay() !== null) {
        // does the null display matches the the text that is on the control ?
        if (this.getCtrlText(ctrl) === ctrl.getField().getNullDisplay())
        // if the null display is on the control, all of it MUST be selected.
        // if not, the user cannot touch it (same as online).
          if (editParams.StartPos > 0 || editParams.EndPos !== ctrl.getField().getNullDisplay().length)
            continueAction = false;
          else {
            // null display is on and selected. it will be replaced by the mask holding some default
            // value
            // nullVal is a masked value. we need it in order to have a valid value to work on, since
            // the null display
            // might not look like out mask at all.
            let pic: PIC = ctrl.getPIC();
            let nullVal: string = DisplayConvertor.Instance.mg2disp(ctrl.getDefaultValueForEdit(), null,
              pic, false,
              ctrl.getForm().getTask().getCompIdx(), false);

            editParams.CtrlText = new StringBuilder(nullVal);
            editParams.EndPos = editParams.CtrlText.Length;
            editParams.StartPos = 0;
            // we have a new select area. 1st char that can be written till end of text.
            while (editParams.StartPos < editParams.EndPos && pic.picIsMask(editParams.StartPos))
              editParams.StartPos++;
          }
      }
    }
    return continueAction;
  }

  /// <summary>
  ///   Is the field value null and is he showing the null display value ?
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <returns></returns>
  private nullDisplayIsShown(ctrl: MgControlBase): boolean {
    let field: Field = ctrl.getField();
    let nullDispIsShown: boolean = false;

    // if ctrl was modified by user, there is no way null display is on the control
    // can check the null display only if the field is null and has a null display
    if (!ctrl.ModifiedByUser &&
      (field !== null && field.NullAllowed && (<TaskBase>field.getTask()).IsFieldNull(field)) && field.getNullDisplay() !== null)
    // does the null display matches the the text that is on the control ?
      if (this.getCtrlText(ctrl) === ctrl.getField().getNullDisplay())
        nullDispIsShown = true;

    return nullDispIsShown;
  }

  /// <summary>
  ///   checkAutoSkip : check if autoskip is needed now - end of mask was reached - end of writable positoin in
  ///   mask reached ('XXX--' , autoskip after writing 3rd char). - for logical, check if existing text can be
  ///   converted to one of the range values. if logical value cannot be computed from existing text, restart
  ///   the value to the ctrl's last value (like in online). - for decimal, autoskip only if there is a decimal
  ///   point in mask and only if the text had reached the limit of the decimal chars after the decimal point.
  /// </summary>
  /// <param name = "editParams"></param>
  /// <param name = "ctrl"></param>
  /// <returns> EDIT_CONTINUE : no skip , EDIT_AUTOSKIP : skip, EDIT_RESTART : reset to prev value.</returns>
  private checkAutoSkip(editParams: EditParams, ctrl: MgControlBase): EditReturnCode {
    let rc: EditReturnCode;
    let pic: PIC = ctrl.getPIC();
    let maskPos: number = this.convPosBufToMsk(ctrl, editParams.StartPos);

    // we are parked after the last position of the mask.
    if (maskPos >= pic.getMaskSize())
      rc = EditReturnCode.EDIT_AUTOSKIP;
    else {
      // last char that the user can enter, if all the rest are embeded, we need to skip now.
      rc = EditReturnCode.EDIT_AUTOSKIP;

      // For Alpha/Unicode, we should check if the input chars have reached the size of field, if so return with Autoskip.
      // This is needed in case if  field size < ctrl’s format, it should not allow to enter chars > field size even though ctrl's format allows it.
      // For numeric, we should check dec. And for logical, we check actual val, which is checked separately here.

      if (pic.isAttrAlpha() || pic.isAttrUnicode()) {
        if (maskPos - this.maskCount(0, maskPos, editParams, ctrl) < ctrl.getField().getSize()) {
          rc = EditReturnCode.EDIT_CONTINUE;
        }
      }
      else {
        let nextPos: number;
        // in this point, startPos is already after advancing. its the next pos to write on.
        // that is why we will start from startPos and not startPos+1
        for (nextPos = maskPos;
             nextPos < pic.getMaskSize() && rc === EditReturnCode.EDIT_AUTOSKIP;
             nextPos++) {
          if (!pic.picIsMask(nextPos))
            rc = EditReturnCode.EDIT_CONTINUE;
        }
      }

      if (rc !== EditReturnCode.EDIT_AUTOSKIP) {
        // check auto skip on logical
        if (pic.isAttrLogical()) {
          // check if existing text can be translated to one of the range values.
          let validationDetails: ValidationDetails = ctrl.buildCopyPicture(null, editParams.CtrlText.ToString());
          validationDetails.evaluate();

          if (validationDetails.ValidationFailed)
            rc = EditReturnCode.EDIT_RESTART;
          else
            rc = EditReturnCode.EDIT_AUTOSKIP;
        }
        // chck autoskip on numeric.
        // skip, if there is a decimal point and we are now typing the last digit according to the
        // pic (or even more digits then the pic permits, but only after the decimal point).
        else if (pic.isAttrNumeric() && pic.withDecimal()) {
          let dummyWhole: RefParam<number> = new RefParam<number>(0);
          let dummyDecPos = new RefParam<number>(0);
          let dec = this.edtCountNumericDec(editParams.CtrlText, pic, editParams.StartPos, dummyWhole, dummyDecPos);

          if (dec > 0 && dec >= pic.getDec())
            rc = EditReturnCode.EDIT_AUTOSKIP;
        }
      }
    }
    return rc;
  }

  /// <summary>
  ///   count total no. of mask chars exists between startPos and endPos
  /// </summary>
  /// <param name = "startPos"></param>
  /// <param name = "endPos"></param>
  /// <param name = "editParams"></param>
  /// <param name = "ctrl"></param>
  /// <returns> count.</returns>
  private maskCount(startPos: number, endPos: number, editParams: EditParams, ctrl: MgControlBase): number {
    let count: number = 0;
    let pic: PIC = ctrl.getPIC();

    if (endPos > pic.getMaskSize())
      endPos = pic.getMaskSize();

    startPos = this.convPosBufToMsk(ctrl, startPos);
    endPos = this.convPosBufToMsk(ctrl, endPos);

    while (startPos < endPos) {

      if (pic.picIsMask(startPos))
        count++;

      startPos = startPos + 1;
    }
    return count;
  }

  /// <summary>
  ///   edtCountNumericDec : count the numeric digits before and after the decimal point
  /// </summary>
  /// <param name = "ctrlText"></param>
  /// <param name = "pic"></param>
  /// <param name = "Len"></param>
  /// <param name = "Whole"></param>
  /// <param name = "DecPos"></param>
  /// <returns> 0 if no decimal point or >0 as the number of digits after the decimal point.</returns>
  private edtCountNumericDec(ctrlText: StringBuilder, pic: PIC, Len: number, Whole: RefParam<number>, DecPos: RefParam<number>): number {

    let decimalChar: string = Manager.Environment.GetDecimal();
    // Count number of digits and position of decimal point
    let Dec: number = 0;
    Whole.value = 0;
    DecPos.value = -1;

    for (let i: number = 0; i < Len; i = i + 1) {
      if (pic.isNumeric(i)) {
        if (UtilStrByteMode.isDigit(ctrlText.get_Item(i).toString())) {
          if (DecPos.value >= 0) {
            Dec = Dec + 1;
          }
          else {
            Whole.value = Whole.value + 1;
          }
        }
        else if (ctrlText.get_Item(i).toString() === decimalChar) {
          DecPos.value = i;
        }
      }
    }
    return Dec;
  }

  /// <summary>
  ///   IsFilledNumericDigits: Check whether the digits (whole and decimals) of the numeric data are
  ///   filled or not, in order to prevent overflow.
  /// </summary>
  /// <param name = "editParams"></param>
  /// <param name = "pic"></param>
  /// <param name = "Pos"></param>
  /// <returns> 0 if no decimal point or >0 as the number of digits after the decimal point.</returns>
  private IsFilledNumericDigits(editParams: EditParams, pic: PIC, Pos: number): boolean {
    let isFilled: boolean = false;
    let Dec: number = 0;

    let Whole = new RefParam<number>(0);
    let DecPos = new RefParam<number>(0);

    if (pic.isNumeric(Pos))
      return false;

    // Count number of digits and position of decimal point
    Dec = this.edtCountNumericDec(editParams.CtrlText, pic, editParams.CtrlText.Length, Whole, DecPos);

// Check for overflow
    if (DecPos.value >= 0) {
      if (Pos > DecPos.value) {
        if (Dec >= pic.getDec())
          isFilled = true;
      }
      else if (Whole.value >= pic.getWholes())
        isFilled = true;
    }
    else if (Whole.value >= pic.getWholes())
      isFilled = true;

    return (isFilled);
  }

/// <summary>
///   actionBeginField - set caret to the begining of the field's data
///   When null display is showing, the caret should be on 0.
///   Otherwise, caret should be on the first pos that data can be written on.
///   for example : '--XXX--' mask, the caret will be pos on the 1st X.
/// </summary>
/// <param name = "ctrl"></param>
/// <returns></returns>
  private actionBeginField(ctrl: MgControlBase): EditReturnCode {
    // check for null is displayed
    if (this.nullDisplayIsShown(ctrl)) {
      // set caret to position 0. no mask is considered.
      Manager.SetSelection(ctrl, 0, 0, 0);
      // try to position on 0 considering the mask
    }
    else
      this.advancePos(ctrl, ctrl.getPIC(), 0);

    return EditReturnCode.EDIT_CONTINUE;
  }

/// <summary>
///   actionEndField - set the caret at the end of the text, regardless of the mask.
/// </summary>
/// <param name = "ctrl"></param>
/// <returns></returns>
  private actionEndField(ctrl: MgControlBase): EditReturnCode {
    let ctrlTextLen: number = this.getCtrlText(ctrl).length;
    Manager.SetSelection(ctrl, ctrlTextLen, ctrlTextLen, ctrlTextLen);
    return EditReturnCode.EDIT_CONTINUE;
  }

/// <summary>
///   Marl all the text in the control.
/// </summary>
/// <param name = "ctrl"></param>
/// <returns></returns>
  private actionMarkAll(ctrl: MgControlBase): EditReturnCode {
    Manager.SetSelection(ctrl, 0, -1, -1);
    return EditReturnCode.EDIT_CONTINUE;
  }

/// <summary>
///   Mark specified the text in the control.
/// </summary>
/// <param name = "ctrl">identifies control</param>
/// <param name = "start">start pos</param>
/// <param name = "end">end pos</param>
/// <returns></returns>
  private actionMarkText(ctrl: MgControlBase, start: number, end: number): EditReturnCode {
    Manager.SetSelection(ctrl, start, end, -1);
    return EditReturnCode.EDIT_CONTINUE;
  }

  private convPosBufToMsk(ctrl: MgControlBase, pos: number): number;

  private convPosBufToMsk(ctrl: MgControlBase, editParams: EditParams, pos: number): number;

  private convPosBufToMsk(ctrl: MgControlBase, posOrEditParams: any, pos ?: number): number {
    if (arguments.length === 2)
      return this.convPosBufToMsk_0(ctrl, posOrEditParams);
    else
      return this.convPosBufToMsk_1(ctrl, posOrEditParams, pos);
  }

  /// <summary>
  ///   Convert the position of Prm->Buf into the position of Prm->Msk.
  ///   (DBCS Support)
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "pos"></param>
  /// <returns>
  ///   Example:
  ///   ConvPosBufToMsk(Prm, 4) returns 5 under the follwing circumstances.
  ///   - Attr is Alpha or Date
  ///   - Prm->Msk is "XXXXXXX"
  ///   - Prm->Buf is "abcYZ"
  ///   ('a', 'b' and 'c' are SBCS, and 'Y' and 'Z' are DBCS)
  /// </returns>
  private convPosBufToMsk_0(ctrl: MgControlBase, pos: number): number {
    if (pos <= 0 || !UtilStrByteMode.isLocaleDefLangDBCS())
      return pos;

    let pic: PIC = ctrl.getPIC();
    return pic.isAttrAlphaOrDate()
      ? UtilStrByteMode.convPos(this.getCtrlText(ctrl), pic.getMask(), pos, false)
      : pos;
  }

  private convPosBufToMsk_1(ctrl: MgControlBase, editParams: EditParams, pos: number): number {
    if (pos <= 0 || !UtilStrByteMode.isLocaleDefLangDBCS())
      return pos;

    let pic: PIC = ctrl.getPIC();
    return pic.isAttrAlphaOrDate() && editParams.CtrlText != null
      ? UtilStrByteMode.convPos(editParams.CtrlText.ToString(), pic.getMask(),
        pos,
        false)
      : pos;
  }

  private convPosMskToBuf(ctrl: MgControlBase, pos: number): number;

  private convPosMskToBuf(ctrl: MgControlBase, editParams: EditParams, pos: number): number;

  private convPosMskToBuf(ctrl: MgControlBase, posOrEditParams: any, pos ?: number): number {
    if (arguments.length === 2)
      return this.convPosMskToBuf_0(ctrl, posOrEditParams);
    else
      return this.convPosMskToBuf_1(ctrl, posOrEditParams, pos);
  }

  /// <summary>
  ///   Convert the position of Prm->Msk into the position of Prm->Buf.
  ///   (DBCS Support)
  /// </summary>
  /// <param name = "ctrl"></param>
  /// <param name = "pos"></param>
  /// <returns>
  ///   Example:
  ///   ConvPosMskToBuf(Prm, 5) returns 4 under the follwing circumstances.
  ///   - Attr is Alpha or Date
  ///   - Prm->Msk is "XXXXXXX"
  ///   - Prm->Buf is "abcYZ"
  ///   ('a', 'b' and 'c' are SBCS, and 'Y' and 'Z' are DBCS)
  /// </returns>

  private convPosMskToBuf_0(ctrl: MgControlBase, pos: number): number {
    if (pos <= 0 || !UtilStrByteMode.isLocaleDefLangDBCS())
      return pos;

    let pic: PIC = ctrl.getPIC();
    return pic.isAttrAlphaOrDate() ?
      UtilStrByteMode.convPos(pic.getMask(), this.getCtrlText(ctrl), pos, false) :
      pos;
  }

  private convPosMskToBuf_1(ctrl: MgControlBase, editParams: EditParams, pos: number): number {

    if (pos <= 0 || !UtilStrByteMode.isLocaleDefLangDBCS())
      return pos;

    let pic: PIC = ctrl.getPIC();

    if (pic.isAttrAlphaOrDate() && editParams.CtrlText !== null)
      return UtilStrByteMode.convPos(pic.getMask(), editParams.CtrlText.ToString(), pos,
                           false);

    else
      return pos;
  }

/// <summary>
///   check if the input char is valid for local AS400 (system i) pictures.
///   (DBCS Support)
/// </summary>
/// <param name = "ctrl"></param>
/// <param name = "editParams"></param>
/// <param name = "charToValidate"></param>
/// <param name = "pos"></param>
/// <returns></returns>
  private isValidChar_as400(ctrl: MgControlBase, editParams: EditParams, charToValidate: string, pos: number): boolean {
    // check the dbMAGIC_ENV flag (As400Set = N)
    if (!Manager.Environment.GetLocalAs400Set())
      return true;

    let pic: PIC = ctrl.getPIC();
    let firstPos: number = 0;
    let txtLen: number = editParams.CtrlText.Length;
    let firstChar: string = '\0';

    if (txtLen > 0) {

      while (pic.picIsMask(firstPos))
        firstPos++;

      firstPos = this.convPosBufToMsk(ctrl, editParams, firstPos);

      if (txtLen > firstPos) {
        firstChar = editParams.CtrlText.get_Item(firstPos);
      }
    }
    return pic.isValidChar_as400(charToValidate, firstChar, pos);
  }

/// <summary>
///   Get the text from the ctrl.
/// </summary>
/// <returns></returns>
  private getCtrlText(control: MgControlBase): string {
    let CtrlVal: string = Manager.GetCtrlVal(control);

    return CtrlVal;
  }

/// <summary>(public)
/// replace the content of a marked text within an edit control
/// </summary>
/// <param name="control">the control to operate upon</param>
/// <param name="text">text to replace</param>
/// <returns>success/fail</returns>
  MarkedTextSet(ctrl: MgControlBase, text: string): boolean {
    let successful: boolean = false;
    let mgPoint: MgPoint = Manager.SelectionGet(ctrl);
    let editParams: EditParams = new EditParams(mgPoint.x, mgPoint.y, 0);

    editParams.CtrlText = new StringBuilder(this.getCtrlText(ctrl));
    successful = this.editPasteWithMask(ctrl, editParams, text);
    return successful;
  }
}

/// <summary>
///   inner class to pass and update edit parameters between the methods in the class.
/// </summary>
class EditParams {
  InternalEventCode: number = 0;
  CtrlText: StringBuilder = null;
  EndPos: number = 0;
  StartPos: number = 0;

  /// <summary>
  ///   CTOR
  /// </summary>
  /// <param name = "startPos"></param>
  /// <param name = "endPos"></param>
  constructor(startPos: number, endPos: number, internalEventCode: number) {
    this.StartPos = startPos;
    this.EndPos = endPos;
    this.InternalEventCode = internalEventCode;
    this.CtrlText = null;
  }
}
