import { NodeyNotebook } from "../model/nodey";
import { PathExt } from "@jupyterlab/coreutils";
import { PromiseDelegate } from "@phosphor/coreutils";
import { NotebookPanel } from "@jupyterlab/notebook";
import { NotebookListen } from "../jupyter-hooks/notebook-listen";
import { Checkpoint } from "../model/checkpoint";
import { Cell, ICellModel } from "@jupyterlab/cells";
import { History } from "../model/history";
import { Star } from "../model/history-stage";
import { AST } from "../analysis/ast";
import { VerCell } from "./cell";
import { NodeyCell } from "../model/nodey";

/*
* Notebook holds a list of cells
*/
export class VerNotebook {
  readonly view: NotebookListen;
  readonly history: History;
  readonly ast: AST;
  cells: VerCell[];

  constructor(history: History, ast: AST, notebookPanel: NotebookPanel) {
    this.history = history;
    this.ast = ast;
    this.view = new NotebookListen(notebookPanel, this);
    this.cells = [];
    this.init();
  }

  public get ready(): Promise<void> {
    return this._ready.promise;
  }

  /* also a load event */
  private async init() {
    await this.view.ready;

    //load in prior data if exists
    var prior = await this.history.init(this);

    // load in the notebook model from data
    await this.load(prior);

    // finish initialization
    console.log("Loaded Notebook", this.view.notebook, this.model);
    this.dump();
    this._ready.resolve(undefined);

    // update views to show notebook is loaded
    this.view.focusCell();
  }

  private async load(matchPrior: boolean) {
    // first start a checkpoint for this load event
    let [checkpoint, resolve] = this.history.checkpoints.notebookLoad();

    let model;
    if (matchPrior) {
      model = this.model;
    }
    let [newNotebook, changedCells] = await this.ast.repairNotebook(
      model,
      this.view.notebook,
      checkpoint
    );
    let notebook: NodeyNotebook;

    if (newNotebook instanceof Star) {
      this.cells.forEach(cell => {
        let cellNode = cell.model;
        if (cellNode instanceof Star) {
          cell.commit(checkpoint);
        }
      });

      // commit the notebook if the cell has changed
      notebook = this.history.stage.commit(
        checkpoint,
        this.model
      ) as NodeyNotebook;
    } else notebook = newNotebook;

    // commit the cell if it has changed
    this.view.notebook.widgets.forEach((item, index) => {
      if (item instanceof Cell) {
        let name = notebook.cells[index];
        let cell: VerCell = new VerCell(this, item, name);
        this.cells.push(cell);
      }
    });
    console.log("cell names", this.cells);

    // finish the checkpoint with info from this run
    resolve(changedCells, notebook.version);
  }

  get model(): NodeyNotebook | Star<NodeyNotebook> {
    return this.history.store.currentNotebook;
  }

  get path(): string {
    return this.view.panel.session.path;
  }

  get name(): string {
    return PathExt.basename(this.path);
  }

  get metadata() {
    return this.view.metadata;
  }

  public async run(cellModel: ICellModel): Promise<[NodeyCell, Checkpoint]> {
    // first start a checkpoint for this run
    let [checkpoint, resolve] = this.history.checkpoints.cellRun();

    // now repair the cell against the prior version
    let cell = this.getCell(cellModel);
    console.log("LOOKING FOR CELL", cellModel, this.cells);
    let [newNodey, same] = await cell.repairAndCommit(checkpoint);
    console.log("SAME?", same);

    // commit the notebook if the cell has changed
    let notebook = this.history.stage.commit(checkpoint, this.model);
    console.log("notebook commited", notebook, this.model);

    // finish the checkpoint with info from this run
    resolve(newNodey, same, notebook.version);

    console.log("commited cell", newNodey);

    this.saveToFile();

    return [newNodey, checkpoint];
  }

  private saveToFile() {
    // save the data to file
    this.history.store.writeToFile(this, this.history);
  }

  public async save(): Promise<[NodeyCell[], Checkpoint]> {
    return new Promise<[NodeyCell[], Checkpoint]>((accept, reject) => {
      //  start a checkpoint for this run
      let [checkpoint, resolve] = this.history.checkpoints.notebookSaved();
      // now see if there are any unsaved changes
      let nodey = this.model;
      if (nodey instanceof Star) {
        // look through cells for unsaved changes
        let cellCommits: Promise<[NodeyCell, boolean]>[] = [];
        this.cells.forEach(cell => {
          let cellNode = cell.model;
          if (cellNode instanceof Star) {
            cellCommits.push(cell.repairAndCommit(checkpoint));
          }
        });

        Promise.all(cellCommits).then(cellsDone => {
          // check which cells are verified to have changed
          let changedCells: NodeyCell[] = [];
          cellsDone.forEach(item => {
            let [newNodey, same] = item;
            if (!same) changedCells.push(newNodey);
          });

          // commit the notebook if the cell has changed
          let notebook = this.history.stage.commit(checkpoint, this.model);
          console.log("notebook commited", notebook, this.model);

          // finish the checkpoint with info from this run
          resolve(changedCells, notebook.version);
          accept([changedCells, checkpoint]);
        });
      } else {
        resolve([], nodey.version);
        accept([[], checkpoint]);
      }
      this.saveToFile();
    });
  }

  public getCell(cell: ICellModel): VerCell {
    return this.cells.find(item => item.view.model.id === cell.id);
  }

  public getCellByNode(cell: NodeyCell | Star<NodeyCell>): VerCell {
    return this.cells.find(item => cell.name === item.model.name);
  }

  public async createCell(
    cell: Cell,
    index: number,
    match: boolean
  ): Promise<[VerCell, Checkpoint]> {
    console.log("CELL ADDED");
    let [checkpoint, resolve] = this.history.checkpoints.cellAdded();
    let nodey = await this.ast.createCellNodey(cell, checkpoint);
    let newCell = new VerCell(this, cell, nodey.name);
    this.cells.splice(index, 0, newCell);

    // make sure cell is added to model
    let model = this.history.stage.markAsEdited(this.model) as Star<
      NodeyNotebook
    >;
    model.value.cells.splice(index, 0, newCell.model.name);
    newCell.model.parent = this.model.name;
    console.log("CELL CREATED", newCell, this.cells);

    // commit the notebook
    let notebook = this.history.stage.commit(checkpoint, model);
    console.log("notebook commited", notebook, this.model);

    // finish up
    resolve(newCell.model, notebook.version);
    return [newCell, checkpoint];
  }

  public deleteCell(index: number) {
    let oldCell = this.cells.splice(index, 1);
    let [checkpoint, resolve] = this.history.checkpoints.cellDeleted();

    // make sure cell is removed from model
    let model = this.history.stage.markAsEdited(this.model) as Star<
      NodeyNotebook
    >;
    model.value.cells.splice(index, 1);

    // commit the notebook if the cell has changed
    let notebook = this.history.stage.commit(checkpoint, this.model);
    console.log("notebook commited", notebook, this.model);

    // finish up
    resolve(oldCell[0].model, notebook.version, index);
    return [oldCell[0], checkpoint];
  }

  public moveCell(cell: VerCell, oldPos: number, newPos: number) {
    this.cells.splice(oldPos, 1);
    this.cells.splice(newPos, 0, cell);

    //get checkpoint
    let [checkpoint, resolve] = this.history.checkpoints.cellMoved();

    // make sure cell is moved in the model
    let model = this.history.stage.markAsEdited(this.model) as Star<
      NodeyNotebook
    >;
    model.value.cells.splice(oldPos, 1);
    model.value.cells.splice(newPos, 0, cell.model.name);

    // commit the notebook
    let notebook = this.history.stage.commit(checkpoint, this.model);
    console.log("notebook commited", notebook, this.model);

    // finish up
    resolve(cell.model, notebook.version);
    return checkpoint;
  }

  public async switchCellType(
    index: number,
    newCell: Cell
  ): Promise<[VerCell, Checkpoint]> {
    // first start a checkpoint for this run
    let [checkpoint, resolve] = this.history.checkpoints.cellRun();

    let newNodey = await this.ast.createCellNodey(newCell, checkpoint);
    let verCell = this.cells[index];
    // TODO make pointer in history from old type to new type
    //let oldNodey = verCell.model;
    verCell.setModel(newNodey.name);
    verCell.view = newCell;

    // make sure cell is added to notebook model
    let model = this.history.stage.markAsEdited(this.model) as Star<
      NodeyNotebook
    >;
    model.value.cells.splice(index, 1, newNodey.name);
    newNodey.parent = this.model.name;

    // commit the notebook
    let notebook = this.history.stage.commit(checkpoint, this.model);
    console.log("notebook commited", notebook, this.model, verCell);

    // finish the checkpoint with info from this run
    resolve(newNodey, false, model.value.version);

    return [verCell, checkpoint];
  }

  public focusCell(cell: VerCell) {}

  public dump(): void {
    return this.history.dump();
  }

  private _ready = new PromiseDelegate<void>();
}
