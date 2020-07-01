import { NotebookEvent } from ".";
import { Cell } from "@jupyterlab/cells";
import { ChangeType, CellRunData, CheckpointType } from "../checkpoint";
import { VerNotebook } from "../notebook";
import { NodeyNotebook } from "../nodey/";
import { Star } from "../history/";
import { log } from "../notebook";
import { NodeyCell } from "../nodey/";

export class SwitchCellType extends NotebookEvent {
  cell: Cell;
  cell_index: number;
  match: boolean;

  constructor(notebook: VerNotebook, cell: Cell, cell_index: number) {
    super(notebook);
    this.cell = cell;
    this.cell_index = cell_index;
  }

  createCheckpoint() {
    this.checkpoint = this.history.checkpoints.generateCheckpoint(
      CheckpointType.SWITCH_CELL_TYPE
    );
  }

  async modelUpdate(): Promise<NodeyCell[]> {
    // this is going to create and store the new nodey
    let newNodey = await this.notebook.ast.create.fromCell(
      this.cell,
      this.checkpoint
    );
    let verCell = this.notebook.cells[this.cell_index];

    // make pointer in history from old type to new type
    let oldNodey = verCell.lastSavedModel;
    this.history.store.linkBackHistories(newNodey, oldNodey);
    verCell.setModel(newNodey.name);
    verCell.view = this.cell;

    // make sure cell is added to notebook model
    let model = this.history.stage.markAsEdited(this.notebook.model) as Star<
      NodeyNotebook
    >;
    model.value.cells.splice(this.cell_index, 1, newNodey.name);
    newNodey.parent = this.notebook.model.name;

    // commit the notebook
    let notebook = this.history.stage.commit(
      this.checkpoint,
      this.notebook.model
    );
    log("notebook commited", notebook, this.notebook.model, verCell);

    return [newNodey];
  }

  recordCheckpoint(changedCells: NodeyCell[]) {
    let cellDat = {
      node: changedCells[0].name,
      changeType: ChangeType.TYPE_CHANGED,
    } as CellRunData;

    this.history.checkpoints.resolveCheckpoint(this.checkpoint.id, [cellDat]);
  }
}
