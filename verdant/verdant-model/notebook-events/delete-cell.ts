import { NotebookEvent } from ".";
import { VerNotebook } from "../notebook";

export class DeleteCell extends NotebookEvent {
  cell_index: number;

  constructor(notebook: VerNotebook, cell_index: number) {
    super(notebook);
    this.cell_index = cell_index;
  }

  async modelUpdate() {
    let oldCell = this.notebook.cells.splice(this.cell_index, 1)[0];
    if (oldCell.model)
      this.checkpoint = this.history.stage.commitCellDeleted(
        oldCell.model,
        this.checkpoint
      );
  }
}
