import { NotebookEvent } from ".";
import { Cell } from "@jupyterlab/cells";
import { VerNotebook } from "../notebook";

export class SwitchCellType extends NotebookEvent {
  cell: Cell;
  cell_index: number;

  constructor(notebook: VerNotebook, cell: Cell, cell_index: number) {
    super(notebook);
    this.cell = cell;
    this.cell_index = cell_index;
  }

  async modelUpdate() {
    // this is going to create and store the new nodey
    let newNodey = await this.notebook.ast.create.fromCell(
      this.cell,
      this.checkpoint
    );
    let verCell = this.notebook.cells[this.cell_index];

    // make pointer in history from old type to new type
    let oldNodey = verCell?.model;
    this.history.store.linkBackHistories(newNodey, oldNodey);
    if (newNodey.name) verCell?.setModel(newNodey.name);
    verCell.view = this.cell;

    // make sure cell is added to notebook model
    this.checkpoint = this.history.stage.commitCellTypeChanged(
      oldNodey,
      newNodey,
      this.checkpoint
    );
  }
}
