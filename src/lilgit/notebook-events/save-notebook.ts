import { NotebookEvent } from ".";
import { ChangeType, CellRunData, CheckpointType } from "../checkpoint";
import { log } from "../notebook";
import { NodeyCell, NodeyCode } from "../nodey/";

export class SaveNotebook extends NotebookEvent {
  createCheckpoint() {
    this.checkpoint = this.history.checkpoints.generateCheckpoint(
      CheckpointType.SAVE
    );
  }

  async modelUpdate(): Promise<NodeyCell[]> {
    // look through cells for potentail unsaved changes
    this.notebook.cells.forEach((cell) =>
      this.history.stage.markAsEdited(cell.model)
    );
    let changedCells = this.history.stage.commit(this.checkpoint);

    log("notebook commited", changedCells, this.notebook.model);

    return changedCells;
  }

  recordCheckpoint(changedCells: NodeyCell[]) {
    let cellDat = changedCells.map((cell) => {
      let newOutput: string[] = [];
      if (cell instanceof NodeyCode) {
        let output = this.history.store.getOutput(cell);
        if (output) {
          let latestOut = output.latest;
          if (latestOut.created === this.checkpoint.id)
            newOutput.push(latestOut.name);
        }
      }
      let cellSaved = {
        node: cell.name,
        changeType: ChangeType.CHANGED,
        run: true,
        newOutput: newOutput,
      } as CellRunData;

      return cellSaved;
    });

    this.history.checkpoints.resolveCheckpoint(this.checkpoint.id, cellDat);
  }

  endEvent() {
    this.notebook.saveToFile();
  }
}
