import { NotebookEvent } from ".";
import { ChangeType, CellRunData, CheckpointType } from "../checkpoint";
import { VerCell } from "../cell";
import { VerNotebook } from "../notebook";
import { log } from "../notebook";
import { NodeyCell } from "../nodey/";

export class MoveCell extends NotebookEvent {
  cell: VerCell;
  oldPos: number;
  newPos: number;

  constructor(
    notebook: VerNotebook,
    cell: VerCell,
    oldPos: number,
    newPos: number
  ) {
    super(notebook);
    this.cell = cell;
    this.oldPos = oldPos;
    this.newPos = newPos;
  }

  createCheckpoint() {
    this.checkpoint = this.history.checkpoints.generateCheckpoint(
      CheckpointType.MOVED
    );
  }

  async modelUpdate(): Promise<NodeyCell[]> {
    this.notebook.cells.splice(this.oldPos, 1);
    this.notebook.cells.splice(this.newPos, 0, this.cell);

    // make sure cell is moved in the model
    this.history.stage.markCellAsMoved(this.cell.model, this.newPos);
    // commit the notebook
    let notebook = this.history.stage.commit(this.checkpoint);
    log("notebook commited", notebook, this.notebook.model);

    return [this.cell.model as NodeyCell];
  }

  recordCheckpoint(changedCells: NodeyCell[]) {
    let cellDat = {
      node: changedCells[0].name,
      changeType: ChangeType.MOVED,
    } as CellRunData;
    this.history.checkpoints.resolveCheckpoint(this.checkpoint.id, [cellDat]);
  }
}
