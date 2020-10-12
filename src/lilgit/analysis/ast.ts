import { Notebook } from "@jupyterlab/notebook";
import { History } from "../history/";
import { Cell } from "@jupyterlab/cells";
import { Checkpoint, ChangeType, CellRunData } from "../checkpoint";
import { NodeyNotebook } from "../nodey/";
import { ASTRepair } from "./ast-repair";
import { ASTCreate } from "./ast-create";

export class AST {
  readonly history: History;

  //Properties
  public readonly repair: ASTRepair;
  public readonly create: ASTCreate;

  constructor(history: History) {
    this.history = history;
    this.repair = new ASTRepair(history);
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

    return notebook;
  }

  public async hotStartNotebook(
    notebook: NodeyNotebook,
    notebook_view: Notebook,
    checkpoint: Checkpoint
  ): Promise<NodeyNotebook> {
    // TODO
    /*
    // get cells for the purpose of matching
    let newCells = notebook_view.widgets.map((item) => {
      if (item instanceof Cell) {
        let kind = "raw";
        let text = item.model.value.text;
        if (item instanceof CodeCell) kind = "code";
        else if (item instanceof MarkdownCell) kind = "markdown";
        return { kind, text };
      }
    });*/

    console.log(notebook_view, notebook, checkpoint);

    // TODO TODO TODO

    // update checkpoint
    checkpoint.notebook = notebook.version;

    return notebook;
  }
}
