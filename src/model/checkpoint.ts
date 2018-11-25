import { NodeyCell, NodeyCode, NodeyNotebook } from "./nodey";
import { History } from "./history";
import { serialized_Run } from "../file-manager";

export enum ChangeType {
  CHANGED = 2,
  REMOVED = 1.5,
  ADDED = 1,
  SAME = 0
}

export enum CheckpointType {
  RUN = "r",
  SAVE = "s",
  ADD = "a",
  DELETE = "d"
}

export type CellRunData = {
  node: string;
  changeType: number;
  newOutput?: string[];
};

// NOTE temporary type to allow flexibility
type jsn = { [id: string]: any };

/*
* NOTE: Checkpoints (for now) are
* - cell is run
* - save
* - load
* - cell is added
* - cell is deleted
* NOTE: signal new events so views update
*/

export class HistoryCheckpoints {
  readonly history: History;
  private checkpointList: Checkpoint[];

  constructor(history: History) {
    this.history = history;
    this.checkpointList = [];
  }

  public get(id: number): Checkpoint {
    return this.checkpointList[id];
  }

  private generateId(): number {
    let id = this.checkpointList.push(null) - 1;
    return id;
  }

  private generateCheckpoint(
    kind: CheckpointType,
    notebookVer?: number
  ): Checkpoint {
    let id = this.generateId();
    let timestamp = Date.now();
    let checkpoint = new Checkpoint({
      id: id,
      timestamp: timestamp,
      targetCells: [],
      checkpointType: kind,
      notebookId: notebookVer
    });
    this.checkpointList[id] = checkpoint;
    return checkpoint;
  }

  public getCellMap(checkpoint: Checkpoint): CellRunData[] {
    let notebook = this.history.store.get(checkpoint.notebook) as NodeyNotebook;
    let targets = checkpoint.targetCells;
    return notebook.cells.map(name => {
      let match = targets.find(item => item.node === name);
      if (match) return match;
      return { node: name, changeType: ChangeType.SAME };
    });
  }

  public notebookSaved(): [
    Checkpoint,
    (newCells: NodeyCell[], notebook: string) => void
  ] {
    let checkpoint = this.generateCheckpoint(CheckpointType.SAVE);
    return [checkpoint, this.handleNotebookSaved.bind(this, checkpoint.id)];
  }

  public cellAdded() {
    let checkpoint = this.generateCheckpoint(CheckpointType.ADD);
    return [checkpoint, this.handleCellAdded.bind(this, checkpoint.id)];
  }

  public cellDeleted() {
    let checkpoint = this.generateCheckpoint(CheckpointType.DELETE);
    return [checkpoint, this.handleCellDeleted.bind(this, checkpoint.id)];
  }

  public cellRun(): [
    Checkpoint,
    (cellRun: NodeyCell, cellSame: boolean, notebookName: string) => void
  ] {
    let checkpoint = this.generateCheckpoint(CheckpointType.RUN);
    return [checkpoint, this.handleCellRun.bind(this, checkpoint.id)];
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

  private handleNotebookSaved(
    saveId: number,
    newCells: NodeyCell[],
    notebook: string
  ) {
    newCells.forEach(cell => {
      let newOutput: string[] = [];
      if (cell instanceof NodeyCode) {
        let out = cell.getOutput();
        for (let i = out.length - 1; i > -1; i--) {
          let output = this.history.store.get(out[i]);
          if (output.created === saveId) newOutput.push(output.name);
          else break;
        }
      }

      let cellSaved = {
        node: cell.name,
        changeType: ChangeType.CHANGED,
        run: true,
        newOutput: newOutput
      } as CellRunData;

      this.checkpointList[saveId].targetCells.push(cellSaved);
      this.checkpointList[saveId].notebook = notebook;
    });
  }

  private handleCellAdded(id: number, cell: NodeyCell) {
    let cellDat = {
      node: cell.name,
      changeType: ChangeType.ADDED
    } as CellRunData;
    this.checkpointList[id].targetCells.push(cellDat);
  }

  private handleCellDeleted(id: number, cell: NodeyCell) {
    let cellDat = {
      node: cell.name,
      changeType: ChangeType.REMOVED
    } as CellRunData;
    this.checkpointList[id].targetCells.push(cellDat);
  }

  private handleCellRun(
    runID: number,
    cellRun: NodeyCell,
    cellSame: boolean,
    notebook: string
  ) {
    let cellChange;
    if (cellSame) cellChange = ChangeType.SAME;
    else cellChange = ChangeType.CHANGED;

    let newOutput: string[] = [];
    if (cellRun instanceof NodeyCode) {
      let out = cellRun.getOutput();
      for (let i = out.length - 1; i > -1; i--) {
        let output = this.history.store.get(out[i]);
        if (output.created === runID) newOutput.push(output.name);
        else break;
      }
    }

    let runCell = {
      node: cellRun.name,
      changeType: cellChange,
      run: true,
      newOutput: newOutput
    } as CellRunData;

    this.checkpointList[runID].targetCells.push(runCell);
    this.checkpointList[runID].notebook = notebook;
    console.log("RUN recorded", this.checkpointList[runID]);
  }
}

export class Checkpoint {
  readonly timestamp: number;
  readonly id: number;
  notebook: string;
  readonly targetCells: CellRunData[];
  readonly checkpointType: CheckpointType;

  //runID, timestamp, notebook, runCells, output
  constructor(options: { [key: string]: any }) {
    this.timestamp = options.timestamp;
    this.id = options.id;
    this.notebook = options.notebook;
    this.targetCells = options.targetCells;
    this.checkpointType = options.checkpointType;
  }

  public get name() {
    return this.id + "";
  }

  public toJSON(): serialized_Run {
    //TODO
    return null;
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
