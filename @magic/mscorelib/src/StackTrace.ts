import {StackFrame} from "./StackFrame";
import {NotImplementedException} from "./NotImplementedException";
import * as JSStackTrace from 'stacktrace-js';
import JSStackFrame = JSStackTrace.StackFrame;

// This uses StackTrace utility using stacktrace-js utility from npm. Use this in package.json
// https://www.npmjs.com/package/stacktrace-js
export class StackTrace {
  GetFrames(): JSStackFrame[] {
    // Using getSync() method, it returns references of callstack ethod from the javascript files bindled and not typeScript file from sources.
    // However, if aSync method would have used, it overcomes above problems but the call to log would have been async and we would not have
    // received synchronous logs which would be confusing.
    return JSStackTrace.getSync();
  }
}
