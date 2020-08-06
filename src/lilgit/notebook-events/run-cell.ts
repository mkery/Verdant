import { ICellModel } from "@jupyterlab/cells";
import { NotebookEvent } from ".";
import { ChangeType, CellRunData, CheckpointType } from "../checkpoint";
import { VerNotebook } from "../notebook";
import { log } from "../notebook";
import { NodeyCell, NodeyCode } from "../nodey/";

export class RunCell extends NotebookEvent {
  cellModel: ICellModel;
  cellSame: boolean;

  constructor(notebook: VerNotebook, cellModel: ICellModel) {
    super(notebook);
    this.cellModel = cellModel;
  }

  createCheckpoint() {
    this.checkpoint = this.history.checkpoints.generateCheckpoint(
      CheckpointType.RUN
    );
  }

  async modelUpdate(): Promise<NodeyCell[]> {
    // now repair the cell against the prior version
    let cell = this.notebook.getCell(this.cellModel);
    log("LOOKING FOR CELL", this.cellModel, this.notebook.cells);
    let [newNodey, same] = await cell.repairAndCommit(this.checkpoint);
    log("SAME?", same);
    this.cellSame = same;

    // commit the notebook if the cell has changed
    let notebook = this.history.stage.commit(
      this.checkpoint,
      this.notebook.model
    );
    log("notebook commited", notebook, this.notebook.model);

    return [newNodey];
  }

  recordCheckpoint(changedCells: NodeyCell[]) {
    let cellRun = changedCells[0];
    let newOutput: string[] = [];
    if (cellRun instanceof NodeyCode) {
      let output = this.history.store.getOutput(cellRun);
      if (output) {
        let latestOut = output.lastSaved;
        if (latestOut.created === this.checkpoint.id)
          newOutput.push(latestOut.name);
      }
    }

    let cellChange; // "changed" marker if there is edited text or new output
    if (this.cellSame && newOutput.length < 1) cellChange = ChangeType.SAME;
    else cellChange = ChangeType.CHANGED;

    let runCell = {
      node: cellRun.name,
      changeType: cellChange,
      run: true,
      newOutput: newOutput,
    } as CellRunData;

    this.history.checkpoints.resolveCheckpoint(this.checkpoint.id, [runCell]);
  }

  endEvent() {
    this.notebook.saveToFile();
  }
}
