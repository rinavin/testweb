import {NString} from "@magic/mscorelib";

export class ConstUtils {

  /// <summary> Return the selected option string from a comma separated options string
  ///
  /// </summary>
  /// <param name="strOptions">the strings of the options separated by comma, e.g.: "Error,Warning"
  /// </param>
  /// <param name="options">the value of the options, e.g.: "XY"
  /// </param>
  /// <param name="selectedOption">The option, e.g.: 'Y'
  /// </param>
  /// <returns> the selected option from strOptions
  /// </returns>
  static getStringOfOption(strOptions: string, options: string, selectedOption: string): string {
    let strOption: string = "";
    let indexOpt: number = options.indexOf(selectedOption);
    /**
     * return the string from the strOptions
     */
    if (indexOpt > -1) {
      let tokens: string[] = strOptions.split(','/*','*/);
      if (indexOpt < tokens.length) {
        strOption = tokens[indexOpt];
      }
    }
    return strOption;
  }
}
