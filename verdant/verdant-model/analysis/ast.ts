import { Notebook } from "@jupyterlab/notebook";
import { History } from "../history";
import { Cell, CodeCell, MarkdownCell, RawCell } from "@jupyterlab/cells";
import { Checkpoint, ChangeType, CellRunData } from "../checkpoint";
import {
  NodeyCodeCell,
  NodeyNotebook,
  NodeyMarkdown,
  NodeyRawCell,
  Nodey,
} from "../nodey";
import { ASTCreate } from "./ast-create";
import { log } from "../notebook";

export class AST {
  readonly history: History;

  //Properties
  public readonly create: ASTCreate;

  constructor(history: History) {
    this.history = history;
    this.create = new ASTCreate(history);
  }

  /*
   * Should send a series of
   */
  public async coldStartNotebook(
    notebook_view: Notebook,
    checkpoint: Checkpoint
  ): Promise<NodeyNotebook> {
    let changedCells: CellRunData[] = [];
    // create a new notebook
    let notebook = this.create.createNotebook({
      created: checkpoint.id,
      cells: [],
    });

    // create new cells
    await Promise.all(
      notebook_view.widgets.map(async (item, index) => {
        if (item instanceof Cell)
          return this.create.fromCell(item, checkpoint).then((nodey) => {
            if (!nodey) console.log("CREATED NO NODEY???", nodey, item);
            notebook.cells[index] = nodey.name;
            nodey.parent = notebook.name;
            changedCells.push({
              cell: nodey.name,
              changeType: ChangeType.ADDED,
            });
          });
      })
    );

    // update checkpoint
    checkpoint.notebook = notebook.version;
    checkpoint.targetCells.push(...changedCells);
    this.history.checkpoints.add(checkpoint);

    return notebook;
  }

  public async hotStartNotebook(
    notebook_history: NodeyNotebook,
    notebook_view: Notebook,
    checkpoint: Checkpoint
  ): Promise<NodeyNotebook> {
    // just match up exact matches
    let toMatch = [];
    let matchCount = 0;
    notebook_history.cells.forEach((name: string) => {
      let nodey = this.history.store.get(name);
      let oldText = this.getText(nodey);

      let match = notebook_view.widgets.findIndex((cell, index) => {
        let newText = this.getText(cell);
        return oldText === newText && !toMatch[index];
      });
      if (match > -1 && !toMatch[match]) {
        toMatch[match] = nodey;
        matchCount++;
      } else {
        log("Could not match old cell", nodey);
      }
    });

    // other cells exist
    if (matchCount !== notebook_view.widgets.length) {
      let changedCells: CellRunData[] = [];
      let newNotebook = this.createNotebookVersion(checkpoint);

      // create all other cells
      for (let i = 0; i < notebook_view.widgets.length; i++) {
        let nodey = toMatch[i];
        if (!nodey) {
          // create new cell for unknown cell
          nodey = await this.create.fromCell(
            notebook_view.widgets[i],
            checkpoint
          );
          changedCells.push({
            cell: nodey.name,
            changeType: ChangeType.ADDED,
          });
        }
        newNotebook.cells[i] = nodey.name;
        nodey.parent = newNotebook.name;
      }

      // return updated notebook
      checkpoint.targetCells.push(...changedCells);
      this.history.checkpoints.add(checkpoint);
      return newNotebook;
    } else {
      // everything is exactly the same
      return notebook_history;
    }
  }

  private createNotebookVersion(checkpoint) {
    let oldNotebook = this.history.store.currentNotebook;
    let newNotebook = new NodeyNotebook({
      id: oldNotebook?.id,
      created: checkpoint.id,
      cells: oldNotebook?.cells.slice(0) || [],
    });
    let notebookHist = this.history.store.getHistoryOf(oldNotebook);
    notebookHist?.addVersion(newNotebook);
    checkpoint.notebook = newNotebook?.version;
    return newNotebook;
  }

  private getText(n: Nodey | Cell) {
    if (n instanceof NodeyCodeCell) return n.literal || "";
    if (n instanceof NodeyMarkdown) return n.markdown || "";
    if (n instanceof NodeyRawCell) return n.literal || "";

    if (n instanceof CodeCell || n instanceof RawCell)
      return n.editor.model.value.text || "";
    if (n instanceof MarkdownCell) return n.model.value.text || "";
    return "";
  }
}
