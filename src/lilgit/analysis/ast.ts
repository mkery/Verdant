import { Notebook } from "@jupyterlab/notebook";
import { Star } from "../model/history-stage";
import { Cell, CodeCell, MarkdownCell } from "@jupyterlab/cells";
import { Checkpoint, ChangeType, CellRunData } from "../model/checkpoint";
import { NodeyNotebook, NodeyCode } from "../model/nodey";
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
          return this.create.fromCell(item, checkpoint).then((nodey) => {
            if (!nodey) console.log("CREATED NO NODEY???", nodey, item);
            if (notebook instanceof Star)
              notebook.value.cells[index] = nodey.name;
            else notebook.cells[index] = nodey.name;
            nodey.parent = notebook.name;
            changedCells.push({
              node: nodey.name,
              changeType: ChangeType.ADDED,
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
    // get cells for the purpose of matching
    let newCells = notebook_view.widgets.map((item) => {
      if (item instanceof Cell) {
        let kind = "raw";
        let text = item.model.value.text;
        if (item instanceof CodeCell) kind = "code";
        else if (item instanceof MarkdownCell) kind = "markdown";
        return { kind, text };
      }
    });

    // compare notebook history with newCells
    let histNotebook;
    if (notebook instanceof NodeyNotebook) histNotebook = notebook;
    else histNotebook = notebook.value;

    // !!!Goal: compare with old cells from history and figure out if there are new cells
    // !!!TODO need ast comparison working to really do that
    if (newCells.length != histNotebook.cells.length) {
      log(
        "WARNING: Notebook loaded with " +
          (newCells.length - histNotebook.cells.length) +
          " different cells"
      );

      // Set up notebook to update
      let updatedNotebook = this.history.stage.markAsEdited(
        histNotebook
      ) as Star<NodeyNotebook>;
      updatedNotebook.value.cells = [];
      let changedCells: CellRunData[] = [];

      // OK so until we have the functionality to match cells,
      // let's pretend all cells are brand new
      await Promise.all(
        notebook_view.widgets.map(async (c) => {
          if (c instanceof Cell) {
            let nodey = await this.create.fromCell(c, checkpoint);
            updatedNotebook.value.cells.push(nodey.name);
            let newOutput;
            if (nodey instanceof NodeyCode) newOutput = [nodey.output];
            changedCells.push({
              node: nodey.name,
              changeType: ChangeType.ADDED,
              newOutput,
            });
          }
        })
      );
      return [updatedNotebook, changedCells];
    }

    // case where nothing has changed
    return [notebook, []];
  }
}
