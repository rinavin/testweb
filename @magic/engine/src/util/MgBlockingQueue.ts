export interface MgBlockingQueue {
  offer(o: any): boolean;

  put(o: any): void;

  waitForElement(): void;
}
