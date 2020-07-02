import { NotebookEvent } from ".";
import { ChangeType, CellRunData, CheckpointType } from "../checkpoint";
import { VerNotebook, log } from "../notebook";
import { NodeyNotebook } from "../nodey/";
import { Star } from "../history/";
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

    // commit the final version of this cell
    await oldCell.repair();
    let nodeyCellEdit = this.history.stage.markAsEdited(oldCell.model);
    log("MARKED", oldCell, nodeyCellEdit);
    this.history.stage.commitDeletedCell(this.checkpoint, nodeyCellEdit);

    // make sure cell is removed from model
    let model = this.history.stage.markAsEdited(this.notebook.model) as Star<
      NodeyNotebook
    >;
    model.value.cells.splice(this.cell_index, 1);

    // commit the notebook if the cell has changed
    let notebook = this.history.stage.commit(
      this.checkpoint,
      this.notebook.model
    );
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
