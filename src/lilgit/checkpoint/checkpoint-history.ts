import { History } from "../history/";
import { log } from "../notebook";
import { CheckpointType, ChangeType } from "./constants";
import { Checkpoint } from "./checkpoint";

const DEBUG = false;

export class HistoryCheckpoints {
  readonly history: History;
  private checkpointList: (Checkpoint | null)[];

  constructor(history: History) {
    this.history = history;
    this.checkpointList = [];
  }

  public all(): (Checkpoint | null)[] {
    return this.checkpointList;
  }

  public get(id?: number): Checkpoint | null {
    if (id !== undefined) return this.checkpointList[id];
    return null;
  }

  public set(id: number, checkpoint: Checkpoint) {
    this.checkpointList[id] = checkpoint;
  }

  public getByNotebook(version: number): Checkpoint[] {
    let events: Checkpoint[] = [];
    for (var i = 0; i < this.checkpointList.length; i++) {
      let item = this.checkpointList[i];
      if (item?.notebook === version) events.push(item);
      if ((item?.notebook || -1) > version) break;
    }
    return events;
  }

  private generateId(): number {
    let id = this.checkpointList.push(null) - 1;
    return id;
  }

  public generateCheckpoint(kind: CheckpointType): Checkpoint {
    let id = this.generateId();
    let timestamp = Date.now();
    let checkpoint = new Checkpoint({
      id: id,
      timestamp: timestamp,
      targetCells: [],
      checkpointType: kind,
      notebookId: undefined,
    });
    return checkpoint;
  }

  findCheckpointNotebook(id: number) {
    if (this.checkpointList[id]) {
      // set notebook ID for event if notebook is not yet set
      let targetCells = this.checkpointList[id].targetCells;
      for (let i = 0; i < targetCells.length; i++) {
        let cell = targetCells[i];
        if (cell?.changeType !== ChangeType.SAME) {
          let node = this.history.store.get(cell?.cell);
          let notebook = this.history.store.get(node?.parent);
          this.checkpointList[id].notebook = notebook?.version;
          break;
        }
      }

      // if nothing happened in this checkpoint,
      // give it same notebook as the previous checkpoint
      if (this.checkpointList[id].notebook === undefined) {
        let prev = this.checkpointList[id - 1];
        if (prev) this.checkpointList[id].notebook = prev.notebook;
        else this.checkpointList[id].notebook = 0;
      }
    }
  }

  public fromJSON(data: Checkpoint.SERIALIZE[]) {
    if (DEBUG) log("CHECKPOINTS FROM JSON", data);
    let fixList = [];
    this.checkpointList = data.map(
      (item: Checkpoint.SERIALIZE, index: number) => {
        let checkpoint = Checkpoint.fromJSON(item, index);
        if (checkpoint.notebook === undefined) fixList.push(index);
        return checkpoint;
      }
    );
    // fix for old logs for bug where checkpoint notebook is not set
    fixList.forEach((id) => this.findCheckpointNotebook(id));
    if (DEBUG) log("CHECKPOINTS LOADED", this.checkpointList);
  }

  public toJSON(): Checkpoint.SERIALIZE[] {
    return this.checkpointList
      .filter((item) => item !== null)
      .map((item) => {
        return item.toJSON();
      });
  }
}
