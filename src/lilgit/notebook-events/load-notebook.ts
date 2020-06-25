import { NotebookEvent } from ".";
import { Cell } from "@jupyterlab/cells";
import { CellRunData, CheckpointType } from "../checkpoint";
import { VerCell } from "../cell";
import { VerNotebook, log } from "../notebook";
import { NodeyNotebook } from "../nodey/";
import { Star } from "../history/";
import { NodeyCell } from "../nodey/";

export class LoadNotebook extends NotebookEvent {
  matchPrior: boolean;
  changedCells: CellRunData[];

  constructor(notebook: VerNotebook, matchPrior: boolean) {
    super(notebook);
    this.matchPrior = matchPrior;
  }

  createCheckpoint() {
    this.checkpoint = this.history.checkpoints.generateCheckpoint(
      CheckpointType.LOAD
    );
  }

  async modelUpdate(): Promise<NodeyCell[]> {
    let newNotebook: NodeyNotebook | Star<NodeyNotebook>;
    let changedCells: CellRunData[];
    if (this.matchPrior) {
      [newNotebook, changedCells] = await this.notebook.ast.hotStartNotebook(
        this.notebook.model,
        this.notebook.view.notebook,
        this.checkpoint
      );
    } else
      [newNotebook, changedCells] = await this.notebook.ast.coldStartNotebook(
        this.notebook.view.notebook,
        this.checkpoint
      );

    let notebook: NodeyNotebook;
    this.changedCells = changedCells;

    if (newNotebook instanceof Star) {
      this.notebook.cells.forEach((cell) => {
        let cellNode = cell.model;
        if (cellNode instanceof Star) {
          cell.commit(this.checkpoint);
        }
      });

      // commit the notebook if the cell has changed
      notebook = this.history.stage.commit(
        this.checkpoint,
        this.notebook.model
      ) as NodeyNotebook;
    } else notebook = newNotebook;

    // commit the cell if it has changed
    this.notebook.view.notebook.widgets.forEach((item, index) => {
      if (item instanceof Cell) {
        let name = notebook.cells[index];
        let cell: VerCell = new VerCell(this.notebook, item, name);
        this.notebook.cells.push(cell);
      }
    });
    log("cell names", this.notebook.cells);

    return [];
  }

  recordCheckpoint(_: NodeyCell[]) {
    this.history.checkpoints.resolveCheckpoint(
      this.checkpoint.id,
      this.changedCells
    );
  }
}
