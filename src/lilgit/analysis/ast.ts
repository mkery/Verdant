import { Notebook } from "@jupyterlab/notebook";
import { Star } from "../model/history-stage";
import { Cell, CodeCell, MarkdownCell } from "@jupyterlab/cells";
import { Checkpoint, ChangeType, CellRunData } from "../model/checkpoint";
import { NodeyNotebook } from "../model/nodey";
import { ASTRepair } from "./ast-repair";
import { ASTCreate } from "./ast-create";
import { History } from "../model/history";
import { log } from "../components/notebook";

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
  ): Promise<[NodeyNotebook, CellRunData[]]> {
    let changedCells: CellRunData[] = [];
    // create a new notebook
    let notebook = this.create.createNotebook({ created: checkpoint.id });

    // create new cells
    await Promise.all(
      notebook_view.widgets.map(async (item, index) => {
        if (item instanceof Cell)
          return this.create.fromCell(item, checkpoint).then(nodey => {
            if (notebook instanceof Star)
              notebook.value.cells[index] = nodey.name;
            else notebook.cells[index] = nodey.name;
            nodey.parent = notebook.name;
            changedCells.push({
              node: nodey.name,
              changeType: ChangeType.ADDED
            });
          });
      })
    );

    return [notebook, changedCells];
  }

  public async hotStartNotebook(
    notebook: NodeyNotebook | Star<NodeyNotebook>,
    notebook_view: Notebook,
    checkpoint: Checkpoint
  ): Promise<[NodeyNotebook | Star<NodeyNotebook>, CellRunData[]]> {
    // check cells
    let newCells = notebook_view.widgets.map(item => {
      if (item instanceof Cell) {
        let kind = "raw";
        let text = item.model.value.text;
        if (item instanceof CodeCell) kind = "code";
        else if (item instanceof MarkdownCell) kind = "markdown";
        return { kind, text };
      }
    });

    log("cells are", newCells, checkpoint);

    return [notebook, []];
  }
}
