export class Debug {
  static WriteLine(text: string): void {
    console.log(text);
  }

  static Assert(assertCondtion: boolean, message?: string, detailedMessage?: string): void {
    if (!assertCondtion)
      alert(message);
  }
}
