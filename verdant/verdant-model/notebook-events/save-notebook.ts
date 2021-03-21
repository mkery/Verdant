import { NotebookEvent } from ".";

export class SaveNotebook extends NotebookEvent {
  async modelUpdate() {
    // look through cells for potential unsaved changes
    this.notebook.cells.forEach((cell) => {
      if (cell.model) {
        this.history.stage.markAsPossiblyEdited(cell.model, this.checkpoint);
      }
    });

    // !!! HACK: avoiding saving duplicate images assuming if it hasn't been
    // run it can't be a new output
    this.checkpoint = await this.history.stage.commit(this.checkpoint, {
      ignore_output: true,
    });
  }

  endEvent() {
    this.notebook.saveToFile();
  }
}
