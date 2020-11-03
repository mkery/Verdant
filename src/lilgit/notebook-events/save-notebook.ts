import { NotebookEvent } from ".";
import { CheckpointType } from "../checkpoint";

export class SaveNotebook extends NotebookEvent {
  createCheckpoint() {
    this.checkpoint = this.history.checkpoints.generateCheckpoint(
      CheckpointType.SAVE
    );
  }

  async modelUpdate() {
    // look through cells for potentail unsaved changes
    this.notebook.cells.forEach((cell) => {
      if (cell.model) {
        this.history.stage.markAsPossiblyEdited(cell.model, this.checkpoint);
      }
    });
    this.history.stage.commit(this.checkpoint);
  }

  endEvent() {
    this.notebook.saveToFile();
  }
}
