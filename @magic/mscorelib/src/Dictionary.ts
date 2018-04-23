import {RefParam} from "./RefParam";
import {Exception} from "./Exception";

export class Dictionary<V> {
  private values: Array<V> = new Array();

  get_Item(key: string): V {
    if (this.values.hasOwnProperty(key))
      return this.values[key];
    else
      return null;
  }

  set_Item(key: string, value: V) {
    this.values[key] = value;
  }

  Add(key: string, value: V) {
    if (this.values.hasOwnProperty(key))
      throw new Exception("An item with the same key has already been added");
    else
      this.values[key] = value;
  }

  ContainsKey(key: string): boolean {
    return this.values.hasOwnProperty(key);
  }

  TryGetValue(key: string, pvalue: RefParam<V>): boolean {
    if (this.values.hasOwnProperty(key)) {
      pvalue.value = this.values[key];
      return true;
    }
    else {
      pvalue.value = null;
      return false;
    }
  }

  Remove(key: string): void {
    delete this.values[key];
  }

  get Keys(): string[] {
    return Object.keys(this.values);
  }
}
