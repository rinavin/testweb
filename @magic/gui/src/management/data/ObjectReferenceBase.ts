import {Debug, StackTrace} from "@magic/mscorelib";
import {IReferencedObject} from "./IReferencedObject";
import {Logger, Logger_LogLevels} from "@magic/utils";

export abstract class ObjectReferenceBase {
  private static LastId: number = 0;
  public Referent: IReferencedObject = null;
  private isDisposed: boolean = false;
  private id: number = 0;

  _instantiationTrace: StackTrace = null;

  constructor(referent: IReferencedObject) {
    this.id = (ObjectReferenceBase.LastId = ObjectReferenceBase.LastId + 1);
    this.isDisposed = false;
    this.Referent = referent;
    if (Logger.Instance.LogLevel >= Logger_LogLevels.Development) {
      Logger.Instance.WriteDevToLog("Creating " + this.toString());
      this._instantiationTrace = new StackTrace();
    }
    referent.AddReference();
  }

  // TODO : Implement destructor
// ~ObjectReferenceBase() {
//     Logger.Instance.WriteDevToLog("Finalizing " + this);
//     this.Dispose(false);
//   }

  Dispose(): void;
  Dispose(isDisposing: boolean): void;
  Dispose(isDisposing?: boolean): void {
    if (arguments.length === 0) {
      this.Dispose_0();
      return;
    }
    this.Dispose_1(isDisposing);
  }

  private Dispose_0(): void {
    Logger.Instance.WriteDevToLog("Disposing " + this);

    // TODO
    // GC.SuppressFinalize(this);
    this.Dispose(true);
  }

  private Dispose_1(isDisposing: boolean): void {
    if (!this.isDisposed) {
      if (!this.Referent.HasReferences) {
        if (Logger.Instance.LogLevel >= Logger_LogLevels.Development) {
          Logger.Instance.WriteSupportToLog("Referent does not have any more references: " + this.Referent, false);
          Logger.Instance.WriteStackTrace(this._instantiationTrace, 15, "Instantiation trace:");
        }
        Debug.Assert(false, "Referent does not have any more references. See DEV level log.");
      }
      else
        this.Referent.RemoveReference();
    }
    this.isDisposed = true;
  }

  abstract Clone(): ObjectReferenceBase;

  toString(): string {
    return "{Reference " + this.id + " to: " + this.Referent + "}";
  }
}
