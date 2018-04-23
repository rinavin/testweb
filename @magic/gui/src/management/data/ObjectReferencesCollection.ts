import {ObjectReferenceBase} from "./ObjectReferenceBase";
import {List} from "@magic/mscorelib";

export class ObjectReferencesCollection {
  private _refs: List<ObjectReferenceBase> = new List();

  get_Item(i: number): ObjectReferenceBase {
    return this._refs.get_Item(i);
  }

  Add(objRef: ObjectReferenceBase): void {
    this._refs.push(objRef);
  }

  Dispose(): void {
    for (let i: number = 0; i < this._refs.length; i = i + 1) {
      (this._refs.get_Item(i)).Dispose();
    }
  }

  Clone(): ObjectReferencesCollection {
    let objectReferencesCollection: ObjectReferencesCollection = new ObjectReferencesCollection();
    for (let i: number = 0; i < this._refs.length; i = i + 1) {
      let objRef: ObjectReferenceBase = this.get_Item(i).Clone();
      objectReferencesCollection.Add(objRef);
    }
    return objectReferencesCollection;
  }

  // for iteration purpose
  get Refs() {
    return this._refs;
  }
}
