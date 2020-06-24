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

  public generateCheckpoint(
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
      notebookId: notebookVer,
    });
    this.checkpointList[id] = checkpoint;
    return checkpoint;
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

  public resolveCheckpoint(
    id: number,
    cellRunDat: CellRunData[],
    notebook: number
  ) {
    cellRunDat.forEach((cell) =>
      this.checkpointList[id].targetCells.push(cell)
    );
    if (notebook) {
      this.checkpointList[id].notebook = notebook;
    } else {
      console.error(
        "ERROR Missing notebook for event!!! ",
        this.checkpointList[id]
      );
      this.checkpointList[
        id
      ].notebook = this.history.store.lastSavedNotebook.id;
    }
  }
}
