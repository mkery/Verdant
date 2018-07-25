import { NodeyCell, NodeyCode } from "./nodey";
import { Signal } from "@phosphor/signaling";
import { HistoryModel } from "./history";
import { serialized_Run } from "../file-manager";

/*
*
*/
export class RunModel {
  private _runList: Run[];
  private _historyModel: HistoryModel;
  private _newRun = new Signal<this, Run>(this);
  private _dateList: RunDateList[];

  constructor(historyModel: HistoryModel) {
    this._runList = [];
    this._dateList = [];
    this._historyModel = historyModel;
  }

  public getRun(id: number): Run {
    return this._runList[id];
  }

  get runList() {
    return this._runList;
  }

  get runDateList() {
    return this._dateList;
  }

  get newRun(): Signal<RunModel, Run> {
    return this._newRun;
  }

  public async cellRun(nodey: NodeyCell) {
    console.log("Cell run!", nodey);
    let runID = this._runList.length;
    let timestamp = Date.now();
    this._historyModel.commitChanges(nodey, runID);
    //this._historyModel.dump();
    var run = await this.recordRun(
      runID,
      timestamp,
      this._historyModel.getNodeyCell(nodey.id)
    );
    console.log("Run committed ", run);
    this._newRun.emit(run);
  }

  private async recordRun(runId: number, timestamp: number, nodey: NodeyCell) {
    var cellDat: CellRunData[] = [];
    this._historyModel.cellList.forEach(cell => {
      var dat = {
        node: cell.name,
        changeType: cell.cell.status
      } as CellRunData;
      if (cell.id === nodey.id) {
        dat["run"] = true;
        console.log("cell is", cell);
        if (cell instanceof NodeyCode) {
          var out = cell.getOutput(runId);
          console.log("cell is", cell, "found output", out);
          if (out) dat["newOutput"] = out;
        }
      }
      cellDat.push(dat);
      this._historyModel.clearCellStatus(cell);
    });

    var run = new Run(timestamp, cellDat, runId);
    this._runList[runId] = run;
    this.categorizeRun(run);
    this._historyModel.fileManager.writeToFile(
      this._historyModel.notebook,
      this._historyModel
    );
    return run;
  }

  private categorizeRun(run: Run) {
    let runDate = new Date(run.timestamp);
    let matchDate: RunDateList;

    for (let i = this._dateList.length - 1; i > -1; i--) {
      let dateList = this._dateList[i];
      if (Run.sameDay(dateList.date, runDate)) {
        matchDate = dateList;
        break;
      }
      if (Run.beforeDay(dateList.date, runDate)) break;
    }

    if (!matchDate) {
      matchDate = new RunDateList(runDate, [], this);
      this._dateList.push(matchDate);
    }

    matchDate.addRun(run);
  }

  public fromJSON(data: serialized_Run[]) {
    data.map((run: serialized_Run) => {
      var r = new Run(run.timestamp, run.cells, run.run);
      if (run.star) r.star = run.star;
      if (run.note) r.note = run.note;
      this._runList[r.id] = r;
      this.categorizeRun(r);
      this._newRun.emit(r);
    });
    console.log("RUNS FROM JSON", this._dateList);
  }

  public toJSON(): serialized_Run[] {
    return this._runList.map(run => {
      let jsn: serialized_Run = {
        run: run.id,
        timestamp: run.timestamp,
        cells: run.cells
      };
      if (run.star > -1) jsn.star = run.star;
      if (run.note > -1) jsn["note"] = run.note;
      return jsn;
    });
  }
}

export namespace ChangeType {
  export const CHANGED = 2;
  export const REMOVED = 1.5;
  export const ADDED = 1;
  export const SAME = 0;
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
  note: number = -1;
  star: number = -1;

  constructor(
    timestamp: number,
    cells: CellRunData[],
    id: number,
    type: string = CheckpointType.RUN
  ) {
    this.timestamp = timestamp;
    this.cells = cells;
    this.id = id;
    this.checkpointType = type;
  }

  public hasEdits() {
    return this.cells.find(cell => cell.changeType > ChangeType.SAME);
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

  export function beforeDay(d1: Date, d2: Date) {
    return (
      !this.sameDay(d1, d2) &&
      d1.getFullYear() <= d2.getFullYear() &&
      d1.getMonth() <= d2.getMonth() &&
      d1.getDate() <= d2.getDate()
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

  export function dateNow(): Date {
    var d = new Date();
    d.setHours(12, 0, 0); // set to default time since we only want the day
    return d;
  }
}
