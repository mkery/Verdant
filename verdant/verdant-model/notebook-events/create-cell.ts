import { NotebookEvent } from ".";
import { Cell } from "@jupyterlab/cells";
import { VerCell } from "../cell";
import { VerNotebook, log } from "../notebook";

export class CreateCell extends NotebookEvent {
  cell: Cell;
  cell_index: number;
  match: boolean;

  constructor(
    notebook: VerNotebook,
    cell: Cell,
    cell_index: number,
    match: boolean
  ) {
    super(notebook);
    this.cell = cell;
    this.cell_index = cell_index;
    this.match = match;
  }

  async modelUpdate() {
    // create the representation of the new cell
    let nodey = await this.notebook.ast.create.fromCell(
      this.cell,
      this.checkpoint
    );
    let newCell = new VerCell(this.notebook, this.cell, nodey.name);
    this.notebook.cells.splice(this.cell_index, 0, newCell);

    // update the notebook nodey
    this.checkpoint = this.history.stage.commitCellAdded(
      nodey,
      this.cell_index,
      this.checkpoint
    );
    log("CELL CREATED", newCell, this.notebook.cells);
  }
}
