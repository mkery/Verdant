import { NotebookEvent } from ".";
import { Cell } from "@jupyterlab/cells";
import { ChangeType, CellRunData, CheckpointType } from "../checkpoint";
import { VerCell } from "../cell";
import { VerNotebook, log } from "../notebook";
import { NodeyCell } from "../nodey/";

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

  createCheckpoint() {
    this.checkpoint = this.history.checkpoints.generateCheckpoint(
      CheckpointType.ADD
    );
  }

  async modelUpdate(): Promise<NodeyCell[]> {
    // create the representation of the new cell
    let nodey = await this.notebook.ast.create.fromCell(
      this.cell,
      this.checkpoint
    );
    let newCell = new VerCell(this.notebook, this.cell, nodey.name);
    this.notebook.cells.splice(this.cell_index, 0, newCell);

    // update the notebook nodey
    this.history.stage.markCellAsAdded(nodey, this.cell_index);
    log("CELL CREATED", newCell, this.notebook.cells);

    // commit the notebook
    let updatedNotebook = this.history.stage.commit(this.checkpoint);
    log("notebook commited", updatedNotebook, this.notebook.model);

    return [newCell.model as NodeyCell];
  }

  recordCheckpoint(changedCells: NodeyCell[]) {
    let cellDat = {
      node: changedCells[0].name,
      changeType: ChangeType.ADDED,
    } as CellRunData;
    this.history.checkpoints.resolveCheckpoint(this.checkpoint.id, [cellDat]);
  }
}
