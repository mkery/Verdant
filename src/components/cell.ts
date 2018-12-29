import { NodeyCell, NodeyOutput, NodeyCodeCell } from "../model/nodey";
import { OutputArea } from "@jupyterlab/outputarea";
import { VerNotebook } from "./notebook";
import { Checkpoint } from "../model/checkpoint";
import { Cell, CodeCell } from "@jupyterlab/cells";
import { Star } from "../model/history-stage";

export class VerCell {
  readonly view: Cell;
  private readonly modelName: string;
  private readonly notebook: VerNotebook;

  constructor(notebook: VerNotebook, cell: Cell, modelName: string) {
    this.notebook = notebook;
    this.view = cell;
    this.modelName = modelName;
    this.listen();
  }

  public get model(): NodeyCell | Star<NodeyCell> {
    return this.notebook.history.store.getLatestOf(this.modelName);
  }

  public get lastSavedModel(): NodeyCell {
    return this.notebook.history.store.getHistoryOf(this.modelName).lastSaved;
  }

  public get currentIndex(): number {
    return this.notebook.cells.findIndex(item => item === this);
  }

  public get output(): NodeyOutput {
    var output = (this.model as NodeyCodeCell).output;
    if (output) return this.notebook.history.store.get(output) as NodeyOutput;
  }

  public get outputArea(): OutputArea {
    if (this.view instanceof CodeCell)
      return (this.view as CodeCell).outputArea;
  }

  public async repair() {
    let text: string = "";
    // check cell wasn't just deleted
    if (this.view.inputArea) {
      text = this.view.editor.model.value.text;
    }
    await this.notebook.ast.repairFullAST(this.model, text);
  }

  public async repairAndCommit(
    checkpoint: Checkpoint
  ): Promise<[NodeyCell, boolean]> {
    // repair the cell against the prior version
    await this.repair();
    return this.commit(checkpoint);
  }

  public commit(checkpoint: Checkpoint): [NodeyCell, boolean] {
    let nodey = this.model;

    // commit the cell if it has changed
    let newNodey = this.notebook.history.stage.commit(checkpoint, nodey);

    let same = newNodey.name === nodey.name;

    return [newNodey, same];
  }

  private listen() {
    this.view.model.contentChanged.connect(() => {
      /* set model of this cell to star state, although we
       * don't know for sure yet, because of possible undo,
       * if anything has truly changed yet
       */
      this.notebook.history.stage.markAsEdited(this.model);
    });
  }
}
