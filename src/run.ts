import { RunModel } from "./run-model";

export namespace ChangeType {
  export const CELL_CHANGED = 2;
  export const CELL_REMOVED = 1.5;
  export const CELL_ADDED = 1;
  export const CELL_SAME = 0;
}

export interface CellRunData {
  node: string;
  changeType: number;
  run?: boolean;
  newOutput?: string[];
}

export namespace CheckpointType {
  export const RUN = "run";
  export const SAVE = "save";
}

export class Run {
  readonly timestamp: number;
  readonly id: number;
  readonly cells: CellRunData[];
  readonly checkpointType: string;
  note: string = "";

  constructor(
    timestamp: number,
    cells: CellRunData[],
    id: number,
    note: string = "",
    type: string = CheckpointType.RUN
  ) {
    this.timestamp = timestamp;
    this.cells = cells;
    this.id = id;
    this.checkpointType = type;
    this.note = note;
  }

  public hasEdits() {
    return this.cells.find(cell => cell.changeType > ChangeType.CELL_SAME);
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

export namespace Run {
  export function formatTime(date: Date): string {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return hours + ":" + (minutes < 10 ? "0" + minutes : minutes) + ampm;
  }

  export function formatDate(date: Date): string {
    var monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];

    var today = new Date();
    var yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    var dateDesc = "";

    if (sameDay(today, date)) dateDesc = "today ";
    else if (sameDay(yesterday, date)) dateDesc = "yesterday ";

    dateDesc +=
      monthNames[date.getMonth()] +
      " " +
      date.getDate() +
      " " +
      date.getFullYear();
    return dateDesc;
  }

  export function sameDay(d1: Date, d2: Date) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  export function sameMinute(d1: Date, d2: Date) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate() &&
      d1.getHours() === d2.getHours() &&
      d1.getMinutes() === d2.getMinutes()
    );
  }
}
