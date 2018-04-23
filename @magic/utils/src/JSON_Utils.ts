import { parseString } from 'xml2js';

export class JSON_Utils {
  static JSONFromXML (xml: string, onComplete) {
    parseString (xml, onComplete);
  }
}
