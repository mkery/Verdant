import { NotebookEvent } from ".";
import { CheckpointType } from "../checkpoint";
import { VerNotebook } from "../notebook";

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

  async modelUpdate() {
    let oldCell = this.notebook.cells.splice(this.cell_index, 1)[0];
    if (oldCell.model)
      this.history.stage.commitCellDeleted(oldCell.model, this.checkpoint);
  }
}
