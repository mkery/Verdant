import { NotebookEvent } from ".";

export class SaveNotebook extends NotebookEvent {
  async modelUpdate() {
    // look through cells for potentail unsaved changes
    this.notebook.cells.forEach((cell) => {
      if (cell.model) {
        this.history.stage.markAsPossiblyEdited(cell.model, this.checkpoint);
      }
    });
    await this.history.stage.commit(this.checkpoint);
  }

  endEvent() {
    this.notebook.saveToFile();
  }
}
