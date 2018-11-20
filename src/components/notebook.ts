import { NodeyNotebook } from "../model/nodey";
import { PathExt } from "@jupyterlab/coreutils";
import { PromiseDelegate } from "@phosphor/coreutils";
import { NotebookPanel } from "@jupyterlab/notebook";
import { NotebookListen } from "../jupyter-hooks/notebook-listen";
import { Cell, ICellModel } from "@jupyterlab/cells";
import { History } from "../model/history";
import { AST } from "../analysis/ast";
import { KernelListen } from "../jupyter-hooks/kernel-listen";
import { VerCell } from "./cell";

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

    var cellsReady: Promise<void>[] = [];
    this.view.notebook.widgets.forEach((item, index) => {
      if (item instanceof Cell) {
        let cell: VerCell = new VerCell(this, item, index, prior);
        this.cells.push(cell);
        cellsReady.push(cell.ready);
      }
    });
    await Promise.all(cellsReady);
    console.log("Loaded Notebook", this.view.notebook, this.model);
    this.dump();
    this._ready.resolve(undefined);
  }

  get model(): NodeyNotebook {
    return this.history.getNotebook();
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

  public getCell(cell: ICellModel): VerCell {
    return this.cells.find(item => item.view.cell.model.id === cell.id);
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
