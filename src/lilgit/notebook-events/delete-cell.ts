import { NotebookEvent } from ".";
import { ChangeType, CellRunData, CheckpointType } from "../checkpoint";
import { VerNotebook, log } from "../notebook";
import { NodeyCell } from "../nodey/";

export class DeleteCell extends NotebookEvent {
  cell_index: number;

  constructor(notebook: VerNotebook, cell_index: number) {
    super(notebook);
    this.cell_index = cell_index;
  }

  createCheckpoint() {
    this.checkpoint = this.history.checkpoints.generateCheckpoint(
      CheckpointType.DELETE
    );
  }

  async modelUpdate(): Promise<NodeyCell[]> {
    let oldCell = this.notebook.cells.splice(this.cell_index, 1)[0];

    this.history.stage.markCellAsDeleted(oldCell.model);
    let notebook = this.history.stage.commit(this.checkpoint);
    log("notebook commited", notebook, this.notebook.model);

    return [oldCell.model as NodeyCell];
  }

  recordCheckpoint(changedCells: NodeyCell[]) {
    let cell = changedCells[0];
    let cellDat = {
      node: cell.name,
      changeType: ChangeType.REMOVED,
      index: this.cell_index,
    } as CellRunData;
    this.history.checkpoints.resolveCheckpoint(this.checkpoint.id, [cellDat]);
  }
}
