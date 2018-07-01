import { NotebookPanel, Notebook } from "@jupyterlab/notebook";

import { PathExt } from "@jupyterlab/coreutils";

import { ChangeType } from "../run";

import { IObservableJSON } from "@jupyterlab/observables";

import { Cell, CodeCell, MarkdownCell, ICellModel } from "@jupyterlab/cells";

import { PromiseDelegate } from "@phosphor/coreutils";

import { Signal } from "@phosphor/signaling";

import { ASTGenerate } from "../analysis/ast-generate";

import { IObservableList } from "@jupyterlab/observables";

import { CellListen, CodeCellListen, MarkdownCellListen } from "./cell-listen";

import { KernelListen } from "./kernel-listen";

import { HistoryModel } from "../history-model";

export class NotebookListen {
  private _notebook: Notebook; //the currently active notebook Verdant is working on
  private _notebookPanel: NotebookPanel;
  private _activeCellChanged = new Signal<this, CellListen>(this);
  kernUtil: KernelListen;
  astGen: ASTGenerate;
  cells: Map<string, CellListen>;
  activeCell: Cell;
  historyModel: HistoryModel;

  constructor(
    notebookPanel: NotebookPanel,
    astGen: ASTGenerate,
    historyModel: HistoryModel
  ) {
    this._notebookPanel = notebookPanel;
    this.astGen = astGen;
    this.historyModel = historyModel;
    this.cells = new Map<string, CellListen>();
    this.init();
  }

  get elem(): HTMLElement {
    return this._notebook.node;
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

  get name(): string {
    return PathExt.basename(this.path);
  }

  get metadata(): IObservableJSON {
    return this._notebook.model.metadata;
  }

  get nbformatMinor(): number {
    return this._notebook.model.nbformatMinor;
  }

  get nbformat(): number {
    return this._notebook.model.nbformat;
  }

  private async init() {
    await this._notebookPanel.ready;
    this._notebook = this._notebookPanel.notebook;
    this.historyModel.notebook = this;
    this.kernUtil = new KernelListen(this._notebookPanel.session);
    this.astGen.setKernUtil(this.kernUtil);
    //load in prior data if exists
    var prior = await this.historyModel.init(this.astGen);
    await this.astGen.ready;

    var cellsReady: Promise<void>[] = [];
    this._notebook.widgets.forEach((item, index) => {
      if (item instanceof Cell) {
        var cell: CellListen = this.createCodeCellListen(item, index, prior);
        cellsReady.push(cell.ready);
      }
    });
    await Promise.all(cellsReady);
    console.log("Loaded Notebook", this._notebook, this.nodey);
    this.focusCell(this._notebook.activeCell);
    this.listen();
    this._ready.resolve(undefined);
  }

  focusCell(cell: Cell): void {
    if (cell instanceof CodeCell || cell instanceof MarkdownCell) {
      this._activeCellChanged.emit(this.cells.get(cell.model.id));
      this.cells.get(cell.model.id).focus();
    }
    if (this.activeCell) this.cells.get(this.activeCell.model.id).blur();
    this.activeCell = cell;
  }

  private listen() {
    this._notebook.model.cells.changed.connect(
      (sender: any, data: IObservableList.IChangedArgs<ICellModel>) => {
        var newIndex = data.newIndex;
        var newValues = data.newValues;
        var oldIndex = data.oldIndex;
        var oldValues = data.oldValues;
        switch (data.type) {
          case "add":
            this._addNewCells(newIndex, newValues);
            break;
          case "remove":
            this._removeCells(oldIndex, oldValues);
            break;
          case "move":
            this._cellsMoved(oldIndex, newIndex, newValues);
            break;
          default:
            console.log("cell list changed!!!!", sender, data);
            break;
        }
      }
    );

    this._notebook.activeCellChanged.connect((sender: any, cell: Cell) => {
      this.focusCell(cell);
    });

    var runButton = this._notebookPanel.toolbar.node.getElementsByClassName(
      "p-Widget jp-mod-styled jp-Toolbar-button jp-RunIcon jp-Toolbar-item"
    )[0];
    runButton.addEventListener("mousedown", ev => {
      if (this.activeCell) this.cells.get(this.activeCell.model.id).cellRun();
    });
  }

  private createCodeCellListen(cell: Cell, index: number, matchPrior: boolean) {
    var cellListen: CellListen;
    if (cell instanceof CodeCell)
      cellListen = new CodeCellListen(
        cell,
        this.astGen,
        this.historyModel,
        index,
        matchPrior
      );
    else if (cell instanceof MarkdownCell)
      cellListen = new MarkdownCellListen(
        cell,
        this.astGen,
        this.historyModel,
        index,
        matchPrior
      );
    this.cells.set(cell.model.id, cellListen);
    return cellListen;
  }

  private _addNewCells(newIndex: number, newValues: ICellModel[]) {
    newValues.forEach((added, index) => {
      var cell: Cell = this._notebook.widgets[newIndex + index];
      console.log("adding a new cell!", cell, newIndex, newValues);
      var cellListen = this.createCodeCellListen(cell, newIndex, false);
      cellListen.status = ChangeType.CELL_ADDED;
    });
  }

  private _removeCells(oldIndex: number, oldValues: ICellModel[]) {
    console.log("removing cells", oldIndex, oldValues);
    oldValues.forEach((removed, item) => {
      var cellListen: CellListen = this.cells.get(removed.id);
      cellListen.status = ChangeType.CELL_REMOVED;
    });
  }

  private _cellsMoved(
    oldIndex: number,
    newIndex: number,
    newValues: ICellModel[]
  ) {
    console.log("moving cell", oldIndex, newIndex, newValues);
    //TODO
  }

  private _ready = new PromiseDelegate<void>();
}
