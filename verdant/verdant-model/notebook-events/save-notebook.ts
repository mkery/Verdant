import { NotebookEvent } from ".";

export class SaveNotebook extends NotebookEvent {
  async modelUpdate() {
    // don't do anything. checking for new versions on auto save seems to be collecting
    // junk versions which don't add anything. If it is possible to decern an intentional
    // user save, that would be appropriate to update the model then.
  }

  endEvent() {
    this.notebook.saveToFile();
  }
}
