import { RunModel } from "./run-model";

export namespace ChangeType {
  export const CELL_CHANGED = 2;
  export const CELL_REMOVED = -1;
  export const CELL_ADDED = 1;
  export const CELL_SAME = 0;
}

export interface CellRunData {
  node: string;
  changeType: number;
  run?: boolean;
  newOutput?: string[];
}

export class Run {
  readonly timestamp: number;
  readonly id: number;
  readonly cells: CellRunData[];

  constructor(timestamp: number, cells: CellRunData[], id: number) {
    this.timestamp = timestamp;
    this.cells = cells;
    this.id = id;
  }
}

export class RunDateList {
  private _date: Date;
  private _runs: number[];
  private _runModel: RunModel;

  constructor(date: Date, runList: number[], runModel: RunModel) {
    this._runs = runList;
    this._date = date;
    this._runModel = runModel;
  }

  get date() {
    return this._date;
  }

  get runList() {
    return this._runs.map(num => this._runModel.getRun(num));
  }

  public addRun(r: Run) {
    this._runs.push(r.id);
  }
}
