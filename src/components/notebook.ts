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

/*
* Notebook holds a list of cells
*/
export class VerNotebook {
  private kernUtil: KernelListen;
  readonly view: NotebookListen;
  readonly history: History;
  readonly ast: AST;
  cells: VerCell[];

  constructor(notebookPanel: NotebookPanel, history: History, ast: AST) {
    this.history = history;
    this.ast = ast;
    this.view = new NotebookListen(notebookPanel, this);
    this.cells = [];
    this.init();
  }

  public get ready(): Promise<void> {
    return this._ready.promise;
  }

  private async init() {
    await this.view.ready;

    this.kernUtil = new KernelListen(this.view.panel.session);
    this.ast.setKernUtil(this.kernUtil);
    //load in prior data if exists
    var prior = await this.history.init(this);
    await this.ast.ready;

    this.initNotebook(prior);

    var cellsReady: Promise<void>[] = [];
    this.view.notebook.widgets.forEach((item, index) => {
      if (item instanceof Cell) {
        let cell: VerCell = new VerCell(this, item, index, prior);
        this.cells.push(cell);
        cellsReady.push(cell.ready);
      }
    });
    await Promise.all(cellsReady);
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
    let nodey = cell.model;
    let newNodey = await cell.repairAndCommit(checkpoint);

    // commit the notebook if the cell has changed
    let notebook = this.history.stage.commit(checkpoint, this.model);
    console.log("notebook commited", notebook, this.model);

    // finish the checkpoint with info from this run
    let same = newNodey.name === nodey.name;
    resolve(newNodey, same, notebook.name);

    // save the data to file
    //this.history.store.writeToFile(this, this.history);
    console.log("commited cell", newNodey);
  }

  public async save() {
    //  start a checkpoint for this run
    let [checkpoint, resolve] = this.history.checkpoints.notebookSaved();

    // now see if there are any unsaved changes
    let nodey = this.model;
    if (nodey instanceof Star) {
      // look through cells for unsaved changes
      let cellCommits: Promise<NodeyCell>[] = [];
      this.cells.forEach(cell => {
        let cellNode = cell.model;
        if (cellNode instanceof Star)
          cellCommits.push(cell.repairAndCommit(checkpoint));
      });

      Promise.all(cellCommits).then(cellsDone => {
        // commit the notebook if the cell has changed
        let notebook = this.history.stage.commit(checkpoint, this.model);
        console.log("notebook commited", notebook, this.model);

        // finish the checkpoint with info from this run
        resolve(cellsDone, nodey.name);
      });
    } else {
      resolve([], nodey.name);
    }
  }

  public getCell(cell: ICellModel): VerCell {
    return this.cells.find(item => item.view.model.id === cell.id);
  }

  public getCellByNode(cell: NodeyCell): VerCell {
    return this.cells.find(item => item.model === cell);
  }

  public createCell(cell: Cell, index: number, match: boolean): VerCell {
    let newCell = new VerCell(this, cell, index, match);
    this.cells.splice(index, 0, newCell);
    return newCell;
  }

  public moveCell(cell: VerCell, newPos: number) {
    //TODO
    console.error("TODO MOVE CELL NOT IMPLIMENTED", cell, newPos);
  }

  public dump(): void {
    return this.history.dump();
  }

  private _ready = new PromiseDelegate<void>();
}
