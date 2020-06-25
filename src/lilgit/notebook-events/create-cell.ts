import { NotebookEvent } from ".";
import { Cell } from "@jupyterlab/cells";
import { ChangeType, CellRunData, CheckpointType } from "../model/checkpoint";
import { VerCell } from "../components/cell";
import { VerNotebook } from "../components/notebook";
import { NodeyNotebook } from "../model/nodey";
import { Star } from "../model/history-stage";
import { log } from "../components/notebook";
import { NodeyCell } from "../model/nodey";

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
    let model = this.history.stage.markAsEdited(this.notebook.model) as Star<
      NodeyNotebook
    >;
    model.value.cells.splice(this.cell_index, 0, newCell.model.name);
    newCell.model.parent = this.notebook.model.name;
    log("CELL CREATED", model, newCell, this.notebook.cells);

    // commit the notebook
    let updatedNotebook = this.history.stage.commit(this.checkpoint, model);
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
