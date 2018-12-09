import { NodeyNotebook } from "../model/nodey";
import { PathExt } from "@jupyterlab/coreutils";
import { PromiseDelegate } from "@phosphor/coreutils";
import { NotebookPanel } from "@jupyterlab/notebook";
import { NotebookListen } from "../jupyter-hooks/notebook-listen";
import { Cell, ICellModel } from "@jupyterlab/cells";
import { History } from "../model/history";
import { Star } from "../model/history-stage";
import { AST } from "../analysis/ast";
import { KernelListen } from "../jupyter-hooks/kernel-listen";
import { VerCell } from "./cell";
import { NodeyCell } from "../model/nodey";
import { VerdantPanel } from "../panel/verdant-panel";
//import { Summary } from "../panel/summary";

/*
* Notebook holds a list of cells
*/
export class VerNotebook {
  private kernUtil: KernelListen;
  private panel: VerdantPanel;
  readonly view: NotebookListen;
  readonly history: History;
  readonly ast: AST;
  cells: VerCell[];

  constructor(
    notebookPanel: NotebookPanel,
    history: History,
    ast: AST,
    panel: VerdantPanel
  ) {
    this.history = history;
    this.ast = ast;
    this.panel = panel;
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

    // set up how we will run python code
    this.kernUtil = new KernelListen(this.view.panel.session);
    this.ast.setKernUtil(this.kernUtil);

    //load in prior data if exists
    var prior = await this.history.init(this);
    await this.ast.ready;

    // load in the notebook model from data
    this.initNotebook(prior);

    // start initializing all the cells
    var cellsReady: Promise<void>[] = [];
    this.view.notebook.widgets.forEach((item, index) => {
      if (item instanceof Cell) {
        let cell: VerCell = new VerCell(this, item, index, prior);
        this.cells.push(cell);
        cellsReady.push(cell.ready);
      }
    });
    await Promise.all(cellsReady);

    // Now that the cells are loaded, set the notebook nodey's cells
    let model: NodeyNotebook;
    if (this.model instanceof Star) model = this.model.value;
    else model = this.model;
    model.cells = this.cells.map(cell => {
      cell.model.parent = model.name;
      return cell.model.name;
    });

    // finish initialization
    this.view.focusCell();
    console.log("Loaded Notebook", this.view.notebook, this.model);
    this.dump();
    this._ready.resolve(undefined);
  }

  private initNotebook(matchPrior: boolean) {
    if (!matchPrior) {
      var n = new NodeyNotebook();
      this.history.store.store(n);
    } //TODO got to check match prior if we need a new notebook
  }

  get model(): NodeyNotebook | Star<NodeyNotebook> {
    return this.history.store.currentNotebook;
  }

  get path(): string {
    return this.kernUtil.path;
  }

  get name(): string {
    return PathExt.basename(this.path);
  }

  get metadata() {
    return this.view.metadata;
  }

  public async run(cellModel: ICellModel) {
    // first start a checkpoint for this run
    let [checkpoint, resolve] = this.history.checkpoints.cellRun();

    // now repair the cell against the prior version
    let cell = this.getCell(cellModel);
    let [newNodey, same] = await cell.repairAndCommit(checkpoint);

    // commit the notebook if the cell has changed
    let notebook = this.history.stage.commit(checkpoint, this.model);
    console.log("notebook commited", notebook, this.model);

    // finish the checkpoint with info from this run
    resolve(newNodey, same, notebook.version);

    // save the data to file
    //this.history.store.writeToFile(this, this.history);
    console.log("commited cell", newNodey);
    this.panel.eventMap.addEvent(checkpoint);
  }

  public async save() {
    console.log("SAVE EVENT DETECTED");
    //  start a checkpoint for this run
    let [checkpoint, resolve] = this.history.checkpoints.notebookSaved();
    console.log(checkpoint);
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

        this.panel.eventMap.addEvent(checkpoint);
        /*changedCells.forEach(n => {
          //let index = this.cells.findIndex(item => item.model.name === n.name);
          // this.panel.updateCell(this.cells[index], index);
        });

        // this.panel.updateNotebook(this);*/
      });
    } else {
      resolve([], nodey.version);
      this.panel.eventMap.addEvent(checkpoint);
    }
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
  ): Promise<VerCell> {
    let newCell = new VerCell(this, cell, index, match);
    this.cells.splice(index, 0, newCell);
    let [checkpoint, resolve] = this.history.checkpoints.cellAdded();

    // make sure cell is added to model
    let model = this.history.stage.markAsEdited(this.model) as Star<
      NodeyNotebook
    >;
    await newCell.ready;
    model.value.cells.splice(index, 0, newCell.model.name);

    // commit the notebook
    let notebook = this.history.stage.commit(checkpoint, model);
    console.log("notebook commited", notebook, this.model);

    // finish up
    resolve(newCell.model, notebook.version);
    this.panel.eventMap.addEvent(checkpoint);
    return newCell;
  }

  public deleteCell(index: number) {
    let oldCell = this.cells.splice(index, 1);
    oldCell[0].deleted();
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
    resolve(oldCell[0].model, notebook.version);
    this.panel.eventMap.addEvent(checkpoint);
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
    this.panel.eventMap.addEvent(checkpoint);
  }

  public focusCell(cell: VerCell) {
    //let index = this.indexOf(cell);
    // this.panel.highlightCell(index);
  }

  public dump(): void {
    return this.history.dump();
  }

  private _ready = new PromiseDelegate<void>();
}
