import { NodeyCell, NodeyCode, NodeyNotebook } from "./nodey";
import { History } from "./history";

export enum ChangeType {
  CHANGED = 2,
  REMOVED = 1.5,
  ADDED = 1,
  SAME = 0,
  MOVED = 3,
  NONE = 4
}

export enum CheckpointType {
  RUN = "r",
  SAVE = "s",
  LOAD = "l",
  ADD = "a",
  DELETE = "d",
  MOVED = "m"
}

export type CellRunData = {
  node: string;
  changeType: number;
  newOutput?: string[];
  index?: number;
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
* - cell is moved
* NOTE: signal new events so views update
*/

export class HistoryCheckpoints {
  readonly history: History;
  private checkpointList: Checkpoint[];

  constructor(history: History) {
    this.history = history;
    this.checkpointList = [];
  }

  public all(): Checkpoint[] {
    return this.checkpointList;
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
    let notebook = this.history.store.getNotebook(
      checkpoint.notebook
    ) as NodeyNotebook;
    let targets = checkpoint.targetCells;
    let cellMap: CellRunData[] = [];
    if (notebook) {
      notebook.cells.forEach((name, index) => {
        let match = targets.find(item => item.node === name);
        let indexMatch = targets.find(item => item.index === index);
        // for deleted cells
        if (indexMatch) cellMap.push(indexMatch);

        // all other cells
        if (match) cellMap.push(match);
        else cellMap.push({ node: name, changeType: ChangeType.NONE });
      });
    }
    return cellMap;
  }

  public notebookSaved(): [
    Checkpoint,
    (newCells: NodeyCell[], notebook: number) => void
  ] {
    let checkpoint = this.generateCheckpoint(CheckpointType.SAVE);
    return [checkpoint, this.handleNotebookSaved.bind(this, checkpoint.id)];
  }

  public notebookLoad(): [
    Checkpoint,
    (newCells: CellRunData[], notebook: number) => void
  ] {
    let checkpoint = this.generateCheckpoint(CheckpointType.LOAD);
    // process is the same for save, so we'll just reuse that function for now
    return [checkpoint, this.handleNotebookLoaded.bind(this, checkpoint.id)];
  }

  public cellAdded() {
    let checkpoint = this.generateCheckpoint(CheckpointType.ADD);
    return [checkpoint, this.handleCellAdded.bind(this, checkpoint.id)];
  }

  public cellDeleted() {
    let checkpoint = this.generateCheckpoint(CheckpointType.DELETE);
    return [checkpoint, this.handleCellDeleted.bind(this, checkpoint.id)];
  }

  public cellMoved() {
    let checkpoint = this.generateCheckpoint(CheckpointType.MOVED);
    return [checkpoint, this.handleCellMoved.bind(this, checkpoint.id)];
  }

  public cellRun(): [
    Checkpoint,
    (cellRun: NodeyCell, cellSame: boolean, notebookName: number) => void
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

  public toJSON(): jsn[] {
    return this.checkpointList.map(item => {
      return item.toJSON();
    });
  }

  private handleNotebookLoaded(
    saveId: number,
    newCells: CellRunData[],
    notebook: number
  ) {
    newCells.forEach(item =>
      this.checkpointList[saveId].targetCells.push(item)
    );
    this.checkpointList[saveId].notebook = notebook;
  }

  private handleNotebookSaved(
    saveId: number,
    newCells: NodeyCell[],
    notebook: number
  ) {
    newCells.forEach(cell => {
      let newOutput: string[] = [];
      if (cell instanceof NodeyCode) {
        let output = this.history.store.get(cell.output);
        if (output.created === saveId) newOutput.push(output.name);
      }

      let cellSaved = {
        node: cell.name,
        changeType: ChangeType.CHANGED,
        run: true,
        newOutput: newOutput
      } as CellRunData;

      this.checkpointList[saveId].targetCells.push(cellSaved);
    });
    this.checkpointList[saveId].notebook = notebook;
  }

  private handleCellAdded(id: number, cell: NodeyCell, notebook: number) {
    let cellDat = {
      node: cell.name,
      changeType: ChangeType.ADDED
    } as CellRunData;
    this.checkpointList[id].targetCells.push(cellDat);
    this.checkpointList[id].notebook = notebook;
  }

  private handleCellDeleted(
    id: number,
    cell: NodeyCell,
    notebook: number,
    index: number
  ) {
    let cellDat = {
      node: cell.name,
      changeType: ChangeType.REMOVED,
      index: index
    } as CellRunData;
    this.checkpointList[id].targetCells.push(cellDat);
    this.checkpointList[id].notebook = notebook;
  }

  private handleCellMoved(id: number, cell: NodeyCell, notebook: number) {
    let cellDat = {
      node: cell.name,
      changeType: ChangeType.MOVED
    } as CellRunData;
    this.checkpointList[id].targetCells.push(cellDat);
    this.checkpointList[id].notebook = notebook;
  }

  private handleCellRun(
    runID: number,
    cellRun: NodeyCell,
    cellSame: boolean,
    notebook: number
  ) {
    let cellChange;
    if (cellSame) cellChange = ChangeType.SAME;
    else cellChange = ChangeType.CHANGED;

    let newOutput: string[] = [];
    if (cellRun instanceof NodeyCode) {
      let output = this.history.store.get(cellRun.output);
      if (output.created === runID) newOutput.push(output.name);
    }

    let runCell = {
      node: cellRun.name,
      changeType: cellChange,
      run: true,
      newOutput: newOutput
    } as CellRunData;

    this.checkpointList[runID].targetCells.push(runCell);
    this.checkpointList[runID].notebook = notebook;
  }
}

export class Checkpoint {
  readonly timestamp: number;
  readonly id: number;
  notebook: number;
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

  public toJSON(): jsn {
    return {
      checkpointType: this.checkpointType,
      timestamp: this.timestamp,
      notebook: this.notebook,
      targetCells: this.targetCells
    };
  }
}

export namespace Checkpoint {
  export function fromJSON(dat: jsn, id: number): Checkpoint {
    return new Checkpoint({
      id: id,
      checkpointType: dat.checkpointType,
      timestamp: dat.timestamp,
      notebook: dat.notebook,
      targetCells: dat.targetCells
    });
  }

  export function formatTime(date: Date | number): string {
    if (typeof date == "number") date = new Date(date);
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return hours + ":" + (minutes < 10 ? "0" + minutes : minutes) + ampm;
  }

  export function formatDate(date: Date | number): string {
    if (typeof date == "number") date = new Date(date);
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

  export function sameDay(d1: Date | number, d2: Date | number) {
    if (typeof d1 == "number") d1 = new Date(d1);
    if (typeof d2 == "number") d2 = new Date(d2);
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
