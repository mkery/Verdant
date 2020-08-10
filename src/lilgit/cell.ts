import { NodeyCell, NodeyOutput, NodeyCodeCell } from "./nodey";
import { VerNotebook } from "./notebook";
import { Cell, CodeCell } from "@jupyterlab/cells";
import { OutputArea } from "@jupyterlab/outputarea";

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
   * last seen text for when the cell is deleted
   */
  private lastSeenText: string;

  /**
   * Constructs a cell
   */
  constructor(notebook: VerNotebook, cell: Cell, modelName: string) {
    this.notebook = notebook;
    this.view = cell;
    this.modelName = modelName;
    this.lastSeenText = "";
    this.listen();
  }

  /**
   * Gets the Nodey representation of this cell
   */
  public get model(): NodeyCell {
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
   * Gets the cell's current order in the notebook's list of cells,
   * based on the order the cells appear on screen
   */
  public get currentIndex(): number {
    return this.notebook.cells.findIndex((item) => item === this);
  }

  /**
   * Ges output if the cell has it
   */
  public get output(): NodeyOutput {
    if (this.model instanceof NodeyCodeCell) {
      let output = this.notebook.history.store.getOutput(this.model);
      if (output) return output.latest as NodeyOutput;
    }
  }

  /**
   * Gets output area if the cell has it
   */
  public get outputArea(): OutputArea {
    if (this.view instanceof CodeCell)
      return (this.view as CodeCell).outputArea;
  }

  public getText(): string {
    let text: string = this.lastSeenText;

    // check cell wasn't just deleted
    if (this.view.inputArea) {
      text = this.view.editor.model.value.text;
    }
    return text;
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
      if (this.view.inputArea) {
        this.lastSeenText = this.view.editor.model.value.text;
      }
      this.notebook.history.stage.markAsEdited(this.model);
    });
  }
}
