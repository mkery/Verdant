import { NodeyCell, NodeyCode } from "./nodey";
import { HistoryStage } from "./history-stage";
import { HistoryStore } from "./history-store";
import { serialized_Run } from "../file-manager";
import { Star } from "./history-stage";

/*
* NOTE: Checkpoints (for now) are
* - cell is run
* - save
* - cell is added
* - cell is deleted
* NOTE: signal new events so views update
*/

type jsn = { [id: string]: any };

export enum ChangeType {
  CHANGED = 2,
  REMOVED = 1.5,
  ADDED = 1,
  SAME = 0
}

export enum CheckpointType {
  RUN = "a",
  SAVE = "b",
  ADD = "c",
  DELETE = "d"
}

export class RunModel {
  readonly stage: HistoryStage;
  readonly store: HistoryStore;
  private checkpointList: Checkpoint[];

  constructor(historyStage: HistoryStage, historyStore: HistoryStore) {
    this.stage = historyStage;
    this.store = historyStore;
    this.checkpointList = [];
  }

  public get(id: number): Checkpoint {
    return this.checkpointList[id];
  }

  public notebookSaved();

  public cellAdded(cell: NodeyCell);

  public cellDeleted(cell: NodeyCell);

  public async cellRun(
    cellRun: Star<NodeyCell> | NodeyCell,
    notebookRun: number
  ) {
    console.log("Cell run!", cellRun);
    let runID = this.checkpointList.length;
    let timestamp = Date.now();
    let changeType;

    let newNodey;
    if (cellRun instanceof Star) {
      newNodey = this.stage.commitCell(cellRun, runID);
      changeType = ChangeType.CHANGED;
    } else {
      newNodey = cellRun;
      changeType = ChangeType.SAME;
    }

    let newOutput: string[] = [];
    if (newNodey instanceof NodeyCode) {
      let out = newNodey.getOutput();
      for (let i = out.length - 1; i > -1; i--) {
        let output = this.store.get(out[i]);
        if (output.created === runID) newOutput.push(output.name);
        else break;
      }
    }

    let runCell = {
      node: newNodey.name,
      changeType: changeType,
      run: true,
      newOutput: newOutput
    } as CellRunData;

    let checkpoint = new Checkpoint({
      id: runID,
      timestamp,
      notebookRun,
      runCell,
      newOutput
    });
    this.checkpointList.push(checkpoint);

    console.log("Run committed ", checkpoint, newNodey);
    this.store.writeToFile();
  }

  public fromJSON(data: jsn) {
    this.checkpointList = data.map((item: jsn, index: number) => {
      return Checkpoint.fromJSON(item, index);
    });
    console.log("RUNS FROM JSON", this.checkpointList);
  }

  public toJSON(): serialized_Run[] {
    return this.checkpointList.map(item => {
      return item.toJSON();
    });
  }
}

export interface CellRunData {
  node: string;
  changeType: number;
  newOutput?: string[];
}

export class Checkpoint {
  readonly timestamp: number;
  readonly id: number;
  readonly notebookId: number;
  readonly targetCells: CellRunData[];
  readonly checkpointType: CheckpointType;

  //runID, timestamp, notebook, runCells, output
  constructor(options: { [key: string]: any }) {
    this.timestamp = options.timestamp;
    this.id = options.id;
    this.notebookId = options.notebookId;
    this.targetCells = options.targetCells;
    this.checkpointType = options.checkpointType;
  }

  public get name() {
    return this.id + "";
  }

  public toJSON(): serialized_Run {
    let meta: (string | number | CellRunData | string[])[] = [
      this.checkpointType,
      this.timestamp,
      this.cluster,
      this.newOutput
    ];
    this.notebook.forEach(name => {
      if (name === this.runCell.node) meta.push(this.runCell);
      else meta.push(name);
    });
    return meta;
  }
}

export namespace Checkpoint {
  export function fromJSON(run: jsn, id: number): Checkpoint {
    let checkpointType = run[0] as string;
    let timestamp = run[1] as number;
    let cluster = run[2] as number;
    let newOutput = run[3] as string[];
    let runCell: CellRunData = null;
    //console.log("data", data);
    let notebook = run.slice(4).map((name: string | CellRunData) => {
      if (name instanceof String || typeof name === "string") return name;
      else {
        runCell = name;
        return runCell.node;
      }
    });
    return new Checkpoint({
      id: id,
      checkpointType: checkpointType,
      timestamp: timestamp,
      cluster: cluster,
      notebook: notebook,
      runCell: runCell,
      newOutput: newOutput
    });
  }

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

    var dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ];

    var today = new Date();
    var yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    var dateDesc = "";

    if (sameDay(today, date)) dateDesc = "today ";
    else if (sameDay(yesterday, date)) dateDesc = "yesterday ";
    else dateDesc = dayNames[date.getDay()] + " ";

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
