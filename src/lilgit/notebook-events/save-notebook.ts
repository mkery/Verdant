import { NotebookEvent } from ".";
import { ChangeType, CellRunData, CheckpointType } from "../checkpoint";
import { Star } from "../history/";
import { log } from "../notebook";
import { NodeyCell, NodeyCode } from "../nodey/";

export class SaveNotebook extends NotebookEvent {
  createCheckpoint() {
    this.checkpoint = this.history.checkpoints.generateCheckpoint(
      CheckpointType.SAVE
    );
  }

  async modelUpdate(): Promise<NodeyCell[]> {
    // now see if there are any unsaved changes
    let currentNotebook = this.notebook.model;
    if (currentNotebook instanceof Star) {
      // look through cells for unsaved changes
      let cellCommits: Promise<[NodeyCell, boolean]>[] = [];
      this.notebook.cells.forEach((cell) => {
        let cellNode = cell.model;
        if (cellNode instanceof Star) {
          cellCommits.push(cell.repairAndCommit(this.checkpoint));
        }
      });

      Promise.all(cellCommits).then((cellsDone) => {
        // check which cells are verified to have changed
        let changedCells: NodeyCell[] = [];
        cellsDone.forEach((item) => {
          let [newNodey, same] = item;
          if (!same) changedCells.push(newNodey);
        });

        // commit the notebook if the cell has changed
        let notebook = this.history.stage.commit(
          this.checkpoint,
          this.notebook.model
        );
        log("notebook commited", notebook, this.notebook.model);

        return [[changedCells], notebook];
      });
    } else return [];
  }

  recordCheckpoint(changedCells: NodeyCell[]) {
    let cellDat = changedCells.map((cell) => {
      let newOutput: string[] = [];
      if (cell instanceof NodeyCode) {
        let output = this.history.store.getOutput(cell);
        if (output) {
          let latestOut = output.lastSaved;
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
