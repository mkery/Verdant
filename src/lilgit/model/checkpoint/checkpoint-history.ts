import { NodeyNotebook } from "../nodey";
import { History } from "../history";
import { log } from "../../components/notebook";
import {
  CheckpointType,
  CellRunData,
  CONVERT_ChangeType,
  ChangeType,
} from "./constants";
import { Checkpoint } from "./checkpoint";

const DEBUG = false;

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

  public getByNotebook(version: number): Checkpoint[] {
    let events: Checkpoint[] = [];
    for (var i = 0; i < this.checkpointList.length; i++) {
      let item = this.checkpointList[i];
      if (item.notebook === version) events.push(item);
      if (item.notebook > version) break;
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
    this.checkpointList[id] = checkpoint;
    return checkpoint;
  }

  public resolveCheckpoint(id: number, cellRunDat: CellRunData[]) {
    // update checkpoint with new cell change data
    cellRunDat.forEach((cell) =>
      this.checkpointList[id].targetCells.push(cell)
    );

    // set notebook ID for event if notebook is not yet set
    if (this.checkpointList[id].notebook === undefined) {
      let targetCells = this.checkpointList[id].targetCells;
      for (let i = 0; i < targetCells.length; i++) {
        let cell = targetCells[i];
        if (
          cell.changeType !== ChangeType.SAME &&
          cell.changeType !== ChangeType.NONE
        ) {
          let node = this.history.store.get(cell.node);
          let notebook = this.history.store.get(node.parent);
          this.checkpointList[id].notebook = notebook.version;
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

  public getCellMap(checkpointList: Checkpoint | Checkpoint[]): CellRunData[] {
    let cellMap: CellRunData[] = [];
    if (!Array.isArray(checkpointList)) checkpointList = [checkpointList];

    checkpointList.forEach((checkpoint) => {
      let notebook = this.history.store.getNotebook(
        checkpoint.notebook
      ) as NodeyNotebook;
      if (DEBUG) log("MAKING CELL MAP: notebook found", notebook, checkpoint);
      let targets = checkpoint.targetCells;
      if (notebook) {
        notebook.cells.forEach((name, index) => {
          let match = targets.find((item) => item.node === name);
          // all other cells
          if (match) {
            cellMap[index] = match;
            // convert for older log format
            if (typeof cellMap[index].changeType === "number")
              cellMap[index].changeType = CONVERT_ChangeType(
                cellMap[index].changeType
              );
          } else if (!cellMap[index])
            cellMap[index] = { node: name, changeType: ChangeType.NONE };
        });

        // for deleted cells
        targets.forEach((t) => {
          if (t.changeType === ChangeType.REMOVED)
            cellMap.splice(t.index, 0, t);
        });
      }
    });

    if (DEBUG) log("CELL MAP", cellMap);
    return cellMap;
  }

  public fromJSON(data: Checkpoint.SERIALIZE[]) {
    if (DEBUG) log("CHECKPOINTS FROM JSON", data);
    this.checkpointList = data.map(
      (item: Checkpoint.SERIALIZE, index: number) => {
        return Checkpoint.fromJSON(item, index);
      }
    );
    if (DEBUG) log("CHECKPOINTS LOADED", this.checkpointList);
  }

  public toJSON(): Checkpoint.SERIALIZE[] {
    return this.checkpointList.map((item) => {
      return item.toJSON();
    });
  }
}
