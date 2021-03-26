import { History } from "../history";
import { log } from "../notebook";
import { Checkpoint } from "./checkpoint";
import { NodeyNotebook } from "../nodey";

const DEBUG = false;

export class HistoryCheckpoints {
  readonly history: History;
  private checkpointList: (Checkpoint | null)[];
  private timeTable: { [key: number]: number };

  constructor(history: History) {
    this.history = history;
    this.checkpointList = [];
    this.timeTable = {};
  }

  public all(): (Checkpoint | null)[] {
    return this.checkpointList;
  }

  public get(timestamp?: number): Checkpoint | null {
    if (timestamp !== undefined) {
      let index = this.timeTable[timestamp];
      return this.checkpointList[index];
    }
    return null;
  }

  public getForNotebook(notebook: NodeyNotebook): Checkpoint[] {
    let checkpoints = [];
    let created = notebook.created;
    let index = this.timeTable[created];

    while (this.checkpointList[index]?.notebook === notebook?.version) {
      checkpoints.push(this.checkpointList[index]);
      index++;
    }

    return checkpoints;
  }

  public add(checkpoint: Checkpoint) {
    // don't permit multiple checkpoints with the same timestamp
    if (!this.timeTable[checkpoint.timestamp]) {
      let index = this.checkpointList.push(checkpoint) - 1;
      this.timeTable[checkpoint.timestamp] = index;
    }
  }

  public generateCheckpoint(): Checkpoint {
    let timestamp = Date.now();

    // check if checkpoint already exists
    if (this.timeTable[timestamp])
      return this.checkpointList[this.timeTable[timestamp]];

    let checkpoint = new Checkpoint({
      timestamp: timestamp,
      targetCells: [],
      notebookId: undefined,
    });

    return checkpoint;
  }

  public fromJSON(data: Checkpoint.SERIALIZE[]) {
    if (DEBUG) log("CHECKPOINTS FROM JSON", data);
    this.checkpointList = data.map(
      (item: Checkpoint.SERIALIZE, index: number) => {
        let checkpoint = Checkpoint.fromJSON(item);
        this.timeTable[checkpoint.timestamp] = index;
        return checkpoint;
      }
    );
    if (DEBUG) log("CHECKPOINTS LOADED", this.checkpointList);
  }

  public toJSON(): Checkpoint.SERIALIZE[] {
    return this.checkpointList.map((item) => {
      return item.toJSON();
    });
  }

  public slice(fromTime: number, toTime: number): Checkpoint[] {
    let slice: Checkpoint[] = [];
    let i = this.timeTable[fromTime];
    let j = this.timeTable[toTime];
    if (i !== undefined && j !== undefined) {
      slice = this.checkpointList.slice(i, j) || [];
    }
    return slice;
  }
}
