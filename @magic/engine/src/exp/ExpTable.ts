import {List, NString} from "@magic/mscorelib";
import {XmlParser, Logger} from "@magic/utils";
import {Expression} from "./Expression";
import {ClientManager} from "../ClientManager";
import {Task} from "../tasks/Task";
import {ConstInterface} from "../ConstInterface";

export class ExpTable {
  private _exps: List<Expression> = new List<Expression>();

  /// <summary>
  ///   All data inside <exptable> ...</exptable>
  ///   Function for filling own fields, allocate memory for inner objescts.
  ///   Parsing the input String.
  /// </summary>
  /// <param name = "task">to parent task</param>
  fillData(task: Task): void {
    let parser: XmlParser = ClientManager.Instance.RuntimeCtx.Parser;
    while (this.initInnerObjects(parser, parser.getNextTag(), task)) {
    }
  }

  /// <summary>
  ///   To allocate and fill inner objects of the class
  /// </summary>
  /// <param name = "foundTagName">possible  tag name, name of object, which need be allocated</param>
  /// <param name = "task">to parent Task</param>
  private initInnerObjects(parser: XmlParser, foundTagName: string, task: Task): boolean {
    if (foundTagName === null)
      return false;

    if (foundTagName === ConstInterface.MG_TAG_EXP) {
      let expression: Expression = new Expression();
      expression.fillData(task);
      this._exps.push(expression);
    }
    else if (foundTagName === ConstInterface.MG_TAG_EXPTABLE) {
      parser.setCurrIndex(parser.getXMLdata().indexOf(">", parser.getCurrIndex()) + 1); // end of outer tad and its ">"
    }
    else if (foundTagName === ('/' + ConstInterface.MG_TAG_EXPTABLE)) {
      parser.setCurrIndex2EndOfTag();
      return false;
    }
    else {
      Logger.Instance.WriteExceptionToLogWithMsg("There is no such tag in ExpTable.initInnerObjects(): " + foundTagName);
      return false;
    }

    return true;
  }

  /// <summary>
  ///   get Expression by its ID
  /// </summary>
  /// <param name = "id">the id of the expression </param>
  /// <returns> reference to Expression with id=ID </returns>
  getExpById(id: number): Expression {
    let exp: Expression;
    if (id < 0)
      return null;

    for (let i: number = 0; i < this._exps.length; i++) {
      exp = this._exps.get_Item(i);
      if (exp.getId() === id)
        return exp;

      exp = null;
    }
    return exp;
  }

  /// <summary>
  ///   get a Expression by its index
  /// </summary>
  /// <param name = "idx">is the id of the requested field </param>
  /// <returns> a reference to the field </returns>
  getExp(idx: number): Expression {
    let exp: Expression = null;
    if (idx >= 0 && idx < this._exps.length)
      exp = this._exps.get_Item(idx);

    return exp;
  }

  /// <summary>
  ///   return the number of Expressions in the table
  /// </summary>
  /// <returns> number of fields in the table </returns>
  getSize(): number {
    let count: number = 0;

    if (this._exps !== null)
      count = this._exps.length;

    return count;
  }
}
