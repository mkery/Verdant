import { NotebookPanel, Notebook, NotebookActions } from "@jupyterlab/notebook";

import { PathExt } from "@jupyterlab/coreutils";

import { ChangeType } from "../model/run";

import { IObservableJSON } from "@jupyterlab/observables";

import { Cell, CodeCell, MarkdownCell, ICellModel } from "@jupyterlab/cells";

import { PromiseDelegate } from "@phosphor/coreutils";

import { Signal } from "@phosphor/signaling";

import { ASTGenerate } from "../analysis/ast-generate";

import { IObservableList } from "@jupyterlab/observables";

import { CellListen, CodeCellListen, MarkdownCellListen } from "./cell-listen";

import { KernelListen } from "./kernel-listen";

import { HistoryModel } from "../model/history";

export class NotebookListen {
  private _notebook: Notebook; //the currently active notebook Verdant is working on
  private _notebookPanel: NotebookPanel;
  private _activeCellChanged = new Signal<this, CellListen>(this);
  private _cellStructureChanged = new Signal<this, [number, CellListen]>(this);
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
    this.cells.forEach(value => {
      arr.push(value.nodeyName);
    });
    return arr;
  }

  get activeCellChanged(): Signal<this, CellListen> {
    return this._activeCellChanged;
  }

  get cellStructureChanged(): Signal<this, [number, CellListen]> {
    return this._cellStructureChanged;
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
    await this._notebookPanel.revealed;
    this._notebook = this._notebookPanel.content;
    this.historyModel.notebook = this;
    this.kernUtil = new KernelListen(this._notebookPanel.session);
    this.astGen.setKernUtil(this.kernUtil);
    //load in prior data if exists
    var prior = await this.historyModel.init();
    await this.astGen.ready;

    var cellsReady: Promise<void>[] = [];
    this._notebook.widgets.forEach((item, index) => {
      if (item instanceof Cell) {
        var cell: CellListen = this.createCellListen(item, index, prior);
        cellsReady.push(cell.ready);
      }
    });
    await Promise.all(cellsReady);
    console.log("Loaded Notebook", this._notebook, this.nodey);
    this.historyModel.dump();
    this.focusCell(this._notebook.activeCell);
    this.listen();
    this._ready.resolve(undefined);
  }

  getNodeForCell(cell: Cell) {
    let cellListen = this.cells.get(cell.model.id);
    return cellListen.nodey;
  }

  async focusCell(cell: Cell): Promise<void> {
    if (cell instanceof CodeCell || cell instanceof MarkdownCell) {
      let cellListen = this.cells.get(cell.model.id);
      if (cellListen) {
        await cellListen.ready;
        this._activeCellChanged.emit(cellListen);
        cellListen.focus();
      }
    }
    if (this.activeCell && this.activeCell.model) {
      //verify cell hasn't been deleted
      this.cells.get(this.activeCell.model.id).blur();
    }
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
          case "set":
            this._cellTypeChanged(oldIndex, newIndex, oldValues, newValues);
          default:
            console.log("cell list changed!!!!", sender, data);
            break;
        }
      }
    );

    this._notebook.activeCellChanged.connect((_: any, cell: Cell) => {
      this.focusCell(cell);
    });

    NotebookActions.executed.connect((_, args) => {
      const { notebook, cell } = args;

      console.log("Executed cell:", cell);
      console.log("Parent notebook:", notebook);
      let cellListen = this.cells.get(cell.model.id);
      cellListen.cellRun();
    });
  }

  private createCellListen(cell: Cell, index: number, matchPrior: boolean) {
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

  private async _addNewCells(newIndex: number, newValues: ICellModel[]) {
    newValues.forEach(async (_, index) => {
      var cell: Cell = this._notebook.widgets[newIndex + index];
      var cellListen = this.createCellListen(cell, newIndex, false);
      cellListen.status = ChangeType.ADDED;
      await cellListen.ready;
      console.log("adding a new cell!", cell, cellListen, cellListen.nodey);
      this._cellStructureChanged.emit([index, cellListen]);
      cellListen.cellRun();
    });
  }

  private _removeCells(oldIndex: number, oldValues: ICellModel[]) {
    console.log("removing cells", oldIndex, oldValues);
    oldValues.forEach(removed => {
      var cellListen: CellListen = this.cells.get(removed.id);
      cellListen.status = ChangeType.REMOVED;
      this._cellStructureChanged.emit([oldIndex, cellListen]);
      cellListen.cellRun();
    });
  }

  private _cellsMoved(
    oldIndex: number,
    newIndex: number,
    newValues: ICellModel[]
  ) {
    newValues.forEach(async item => {
      var cellListen: CellListen = this.cells.get(item.id);
      cellListen.status = ChangeType.CHANGED;
      console.log("moving cell", oldIndex, newIndex, newValues);
      this.historyModel.moveCell(oldIndex, newIndex);
      this._cellStructureChanged.emit([newIndex, cellListen]);
      cellListen.cellRun();
    });
  }

  private async _cellTypeChanged(
    oldIndex: number,
    newIndex: number,
    oldValues: ICellModel[],
    newValues: ICellModel[]
  ) {
    newValues.forEach(async (item, index) => {
      let cell: Cell = this._notebook.widgets[newIndex + index];
      let newCellListen = this.createCellListen(cell, newIndex, true);
      await newCellListen.ready;
      newCellListen.status = ChangeType.CHANGED;
      this.cells.set(cell.model.id, newCellListen);
      console.log("changed cell type!", oldIndex, newIndex, oldValues, item);
      this._cellStructureChanged.emit([oldIndex, newCellListen]);
      newCellListen.cellRun();
    });
  }

  private _ready = new PromiseDelegate<void>();
}
