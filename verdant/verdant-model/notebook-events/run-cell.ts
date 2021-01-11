import { ICellModel } from "@jupyterlab/cells";
import { NotebookEvent } from ".";
import { VerNotebook } from "../notebook";

export class RunCell extends NotebookEvent {
  cellModel: ICellModel;

  constructor(notebook: VerNotebook, cellModel: ICellModel) {
    super(notebook);
    this.cellModel = cellModel;
  }

  async modelUpdate() {
    // now repair the cell against the prior version
    let cell = this.notebook.getCell(this.cellModel);

    if (cell && cell.model) {
      // commit the notebook if the cell has changed
      this.history.stage.markAsPossiblyEdited(cell.model, this.checkpoint);
      await this.history.stage.commit(this.checkpoint);
    }
  }
}