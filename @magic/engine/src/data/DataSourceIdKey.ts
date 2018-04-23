export class DataSourceIdKey {
  private taskCtlIdx: number = 0;
  private realIdx: number = 0;

  private static PRIME_NUMBER: number = 37;
  private static SEED: number = 23;

  constructor(taskCtlIdx: number, realIdx: number) {
    this.taskCtlIdx = taskCtlIdx;
    this.realIdx = realIdx;
  }
}
