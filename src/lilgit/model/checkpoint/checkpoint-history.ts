import { NodeyCell, NodeyCode, NodeyNotebook } from "../nodey";
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

  private handleNotebookLoaded(
    saveId: number,
    newCells: CellRunData[],
    notebook: number
  ) {
    newCells.forEach((item) =>
      this.checkpointList[saveId].targetCells.push(item)
    );
    this.checkpointList[saveId].notebook = notebook;
  }

  private handleNotebookSaved(
    saveId: number,
    newCells: NodeyCell[],
    notebook: number
  ) {
    newCells.forEach((cell) => {
      let newOutput: string[] = [];
      if (cell instanceof NodeyCode) {
        let output = this.history.store.get(cell.output);
        if (output.created === saveId) newOutput.push(output.name);
      }

      let cellSaved = {
        node: cell.name,
        changeType: ChangeType.CHANGED,
        run: true,
        newOutput: newOutput,
      } as CellRunData;

      this.checkpointList[saveId].targetCells.push(cellSaved);
    });
    this.checkpointList[saveId].notebook = notebook;
  }

  private handleCellAdded(id: number, cell: NodeyCell, notebook: number) {
    let cellDat = {
      node: cell.name,
      changeType: ChangeType.ADDED,
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
      index: index,
    } as CellRunData;
    this.checkpointList[id].targetCells.push(cellDat);
    this.checkpointList[id].notebook = notebook;
  }

  private handleCellMoved(id: number, cell: NodeyCell, notebook: number) {
    let cellDat = {
      node: cell.name,
      changeType: ChangeType.MOVED,
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
    let newOutput: string[] = [];
    if (cellRun instanceof NodeyCode) {
      let output = this.history.store.get(cellRun.output);
      if (output.created === runID) newOutput.push(output.name);
    }

    let cellChange; // "changed" marker if there is edited text or new output
    if (cellSame && newOutput.length < 1) cellChange = ChangeType.SAME;
    else cellChange = ChangeType.CHANGED;

    let runCell = {
      node: cellRun.name,
      changeType: cellChange,
      run: true,
      newOutput: newOutput,
    } as CellRunData;

    this.checkpointList[runID].targetCells.push(runCell);
    this.checkpointList[runID].notebook = notebook;
  }
}
