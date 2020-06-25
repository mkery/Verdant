import { NotebookEvent } from ".";
import { ChangeType, CellRunData, CheckpointType } from "../model/checkpoint";
import { VerCell } from "../components/cell";
import { VerNotebook } from "../components/notebook";
import { NodeyNotebook } from "../model/nodey";
import { Star } from "../model/history-stage";
import { log } from "../components/notebook";
import { NodeyCell } from "../model/nodey";

export class MoveCell extends NotebookEvent {
  cell: VerCell;
  oldPos: number;
  newPos: number;

  constructor(
    notebook: VerNotebook,
    cell: VerCell,
    oldPos: number,
    newPos: number
  ) {
    super(notebook);
    this.cell = cell;
    this.oldPos = oldPos;
    this.newPos = newPos;
  }

  createCheckpoint() {
    this.checkpoint = this.history.checkpoints.generateCheckpoint(
      CheckpointType.MOVED
    );
  }

  async modelUpdate(): Promise<NodeyCell[]> {
    this.notebook.cells.splice(this.oldPos, 1);
    this.notebook.cells.splice(this.newPos, 0, this.cell);

    // make sure cell is moved in the model
    let model = this.history.stage.markAsEdited(this.notebook.model) as Star<
      NodeyNotebook
    >;
    model.value.cells.splice(this.oldPos, 1);
    model.value.cells.splice(this.newPos, 0, this.cell.model.name);

    // commit the notebook
    let notebook = this.history.stage.commit(
      this.checkpoint,
      this.notebook.model
    );
    log("notebook commited", notebook, this.notebook.model);

    return [this.cell.model as NodeyCell];
  }

  recordCheckpoint(changedCells: NodeyCell[]) {
    let cellDat = {
      node: changedCells[0].name,
      changeType: ChangeType.MOVED,
    } as CellRunData;
    this.history.checkpoints.resolveCheckpoint(this.checkpoint.id, [cellDat]);
  }
}
