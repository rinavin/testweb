import {Record} from './Record';

export interface IRecordsTable {
  GetSize(): number;

  GetRecByIdx(idx: number): Record;

  RemoveAll(): void;
}
