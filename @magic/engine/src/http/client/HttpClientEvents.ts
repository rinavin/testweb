export class HttpClientEvents {
  static GetHttpCommunicationTimeout_Event: () => number = null;
  static GetExecutionProperty_Event: (propertyName: string) => string = null;
  static GetGlobalUniqueSessionID_Event: () => string = null;
  static ShouldDisplayGenericError_Event: () => boolean = null;
  static GetRuntimeCtxID_Event: () => string = null;
  static GetSessionCounter_Event: () => number = null;
  static CheckAndSetSessionCounter_Event: (value: number) => void = null;

  static GetHttpCommunicationTimeout(): number {
    return (HttpClientEvents.GetHttpCommunicationTimeout_Event !== null) ? HttpClientEvents.GetHttpCommunicationTimeout_Event() : 5000;
  }

  static GetExecutionProperty(propertyName: string): string {
    return (HttpClientEvents.GetExecutionProperty_Event !== null) ? HttpClientEvents.GetExecutionProperty_Event(propertyName) : null;
  }

  static GetGlobalUniqueSessionID(): string {
    return (HttpClientEvents.GetGlobalUniqueSessionID_Event !== null) ? HttpClientEvents.GetGlobalUniqueSessionID_Event() : null;
  }

  static ShouldDisplayGenericError(): boolean {
    return HttpClientEvents.ShouldDisplayGenericError_Event === null || HttpClientEvents.ShouldDisplayGenericError_Event();
  }

  static GetRuntimeCtxID(): string {
    return (HttpClientEvents.GetRuntimeCtxID_Event !== null) ? HttpClientEvents.GetRuntimeCtxID_Event() : "";
  }

  static GetSessionCounter(): number {
    return (HttpClientEvents.GetSessionCounter_Event !== null) ? HttpClientEvents.GetSessionCounter_Event() : 0;
  }

  static CheckAndSetSessionCounter(value: number): void {
    let flag: boolean = HttpClientEvents.CheckAndSetSessionCounter_Event !== null;
    if (flag) {
      HttpClientEvents.CheckAndSetSessionCounter_Event(value);
    }
  }
}
