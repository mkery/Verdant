import { NotebookPanel, Notebook } from "@jupyterlab/notebook";

import { Cell, CodeCell } from "@jupyterlab/cells";

import { PromiseDelegate } from "@phosphor/coreutils";

import { Signal } from "@phosphor/signaling";

import { ASTGenerate } from "./ast-generate";

import { CellListen } from "./cell-listen";

import { KernelListen } from "./kernel-listen";

import { Model } from "./model";

export class NotebookListen {
  private _notebook: Notebook; //the currently active notebook Verdant is working on
  private _notebookPanel: NotebookPanel;
  private _activeCellChanged = new Signal<this, CellListen>(this);
  kernUtil: KernelListen;
  astUtils: ASTGenerate;
  cells: Map<Cell, CellListen>;
  activeCell: Cell;
  historyModel: Model;

  constructor(
    notebookPanel: NotebookPanel,
    astUtils: ASTGenerate,
    historyModel: Model
  ) {
    this._notebookPanel = notebookPanel;
    this.astUtils = astUtils;
    this.historyModel = historyModel;
    this.cells = new Map<Cell, CellListen>();
    this.init();
  }

  get ready(): Promise<void> {
    return this._ready.promise;
  }

  get nodey(): string[] {
    var arr: string[] = [];
    this.cells.forEach((value, key) => {
      arr.push(value.nodeyName);
    });
    return arr;
  }

  get activeCellChanged(): Signal<this, CellListen> {
    return this._activeCellChanged;
  }

  get path(): string {
    return this.kernUtil.path;
  }

  private async init() {
    await this._notebookPanel.ready;
    this._notebook = this._notebookPanel.notebook;
    this.kernUtil = new KernelListen(this._notebookPanel.session);
    this.astUtils.setKernUtil(this.kernUtil);
    await this.astUtils.ready;

    var cellsReady: Promise<void>[] = [];
    this._notebook.widgets.forEach((item, index) => {
      if (item instanceof Cell) {
        var cell = new CellListen(item, this.astUtils, this.historyModel);
        this.cells.set(item, cell);
        cellsReady.push(cell.ready);
      }
    });
    await Promise.all(cellsReady);
    console.log("Loaded Notebook", this._notebook, this.nodey);
    this.historyModel.notebook = this;
    //console.log("TO JSON", this.toJSON())
    this.historyModel.dump();
    this.historyModel.loadFromFile();
    this.historyModel.writeToFile();
    this.focusCell(this._notebook.activeCell);
    this.listen();
    this._ready.resolve(undefined);
  }

  toJSON(): { runs: any[]; cells: any[]; nodey: any[] } {
    var runList = <any>[]; //TODO
    var cells = this.nodey;
    var nodey = this.historyModel.toJSON();
    return { runs: runList, cells: cells, nodey: nodey };
  }

  focusCell(cell: Cell): void {
    if (cell instanceof CodeCell) {
      this._activeCellChanged.emit(this.cells.get(cell)); //TODO markdown
      this.cells.get(cell).focus();
    }
    if (this.activeCell && this.activeCell instanceof CodeCell)
      this.cells.get(this.activeCell).blur();
    this.activeCell = cell;
  }

  private listen() {
    this._notebook.activeCellChanged.connect((sender: any, cell: Cell) => {
      this.focusCell(cell);
    });
  }

  private _ready = new PromiseDelegate<void>();
}
