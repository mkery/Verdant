import { NodeyCell, NodeyOutput, NodeyCodeCell } from "../model/nodey";
import { OutputArea } from "@jupyterlab/outputarea";
import { VerNotebook } from "./notebook";
import { Checkpoint } from "../model/checkpoint";
import { Cell, CodeCell } from "@jupyterlab/cells";
import { Star } from "../model/history-stage";

/**
 * Verdant's cell component VerCell acts as an intermediary between
 * Jupyter's representation and our model's representation of a cell.
 */
export class VerCell {
  /**
   * Jupyter's representation of the cell
   */
  public view: Cell;

  /**
   * Reference for our model's Nodey representation of the cell
   */
  private modelName: string;

  /**
   * Parent VerNotebook of this cell
   */
  private readonly notebook: VerNotebook;

  /**
   * Constructs a cell
   */
  constructor(notebook: VerNotebook, cell: Cell, modelName: string) {
    this.notebook = notebook;
    this.view = cell;
    this.modelName = modelName;
    this.listen();
  }

  /**
   * Gets the Nodey representation of this cell
   */
  public get model(): NodeyCell | Star<NodeyCell> {
    return this.notebook.history.store.getLatestOf(this.modelName);
  }

  /**
   * Updates the reference name for this cell
   * @hidden
   */
  public setModel(name: string) {
    this.modelName = name;
  }

  /**
   * Gets the latest saved Nodey representation of this cell, but never
   * returns a Star, which is a still unsaved version of this cell
   */
  public get lastSavedModel(): NodeyCell {
    return this.notebook.history.store.getHistoryOf(this.modelName).lastSaved;
  }

  /**
   * Gets the cell's current order in the notebook's list of cells,
   * based on the order the cells appear on screen
   */
  public get currentIndex(): number {
    return this.notebook.cells.findIndex(item => item === this);
  }

  /**
   * Ges output if the cell has it
   */
  public get output(): NodeyOutput {
    var output = (this.model as NodeyCodeCell).output;
    if (output) return this.notebook.history.store.get(output) as NodeyOutput;
  }

  /**
   * Gets output area if the cell has it
   */
  public get outputArea(): OutputArea {
    if (this.view instanceof CodeCell)
      return (this.view as CodeCell).outputArea;
  }

  /**
   * Takes current on-screen text of the cell and starts the
   * AST module creating a match between the last recorded version
   * of this cell to this current text.
   */
  public async repair() {
    let text: string = "";
    // check cell wasn't just deleted
    if (this.view.inputArea) {
      text = this.view.editor.model.value.text;
    }
    await this.notebook.ast.repairFullAST(this.model, text);
  }

  /**
   * Repair then commit this cell
   */
  public async repairAndCommit(
    checkpoint: Checkpoint
  ): Promise<[NodeyCell, boolean]> {
    // repair the cell against the prior version
    await this.repair();
    return this.commit(checkpoint);
  }

  /**
   * Commit this cell, permanently recording it to history. Each
   * commit requires a checkpoint that caused this commit to be
   * triggered.
   */
  public commit(checkpoint: Checkpoint): [NodeyCell, boolean] {
    let nodey = this.model;
    let history = this.notebook.history.store.getHistoryOf(nodey.name);
    let version = history.versions.length - 1;

    // commit the cell if it has changed
    let newNodey = this.notebook.history.stage.commit(checkpoint, nodey);

    let same = newNodey.version === version;
    console.log("SAME NAME?", newNodey.name, version);

    return [newNodey, same];
  }

  /**
   * Listen to events emitted by Jupyter Cell
   */
  private listen() {
    this.view.model.contentChanged.connect(() => {
      /*
       * set model of this cell to star state, although we
       * don't know for sure yet, because of possible undo,
       * if anything has truly changed yet
       */
      this.notebook.history.stage.markAsEdited(this.model);
    });
  }
}
