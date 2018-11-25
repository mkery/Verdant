import { NotebookPanel, Notebook, NotebookActions } from "@jupyterlab/notebook";

import { IObservableJSON } from "@jupyterlab/observables";

import { Cell, CodeCell, MarkdownCell, ICellModel } from "@jupyterlab/cells";

import { PromiseDelegate } from "@phosphor/coreutils";

import { Signal } from "@phosphor/signaling";

import { IObservableList } from "@jupyterlab/observables";

import { VerNotebook } from "../components/notebook";

export class NotebookListen {
  public activeCell: Cell;

  constructor(notebookPanel: NotebookPanel, verNotebook: VerNotebook) {
    this._notebookPanel = notebookPanel;
    this._verNotebook = verNotebook;
    this.init();
  }

  private _notebook: Notebook; //the currently active notebook Verdant is working on
  private _notebookPanel: NotebookPanel;
  private _verNotebook: VerNotebook;
  private _activeCellChanged = new Signal<this, Cell>(this);
  private _cellStructureChanged = new Signal<this, [number, Cell]>(this);

  private async init() {
    await this._notebookPanel.revealed;
    this._notebook = this._notebookPanel.content;
    this.listen();
    this._ready.resolve(undefined);
  }

  get elem(): HTMLElement {
    return this._notebook.node;
  }

  get panel(): NotebookPanel {
    return this._notebookPanel;
  }

  get notebook(): Notebook {
    return this._notebook;
  }

  get ready(): Promise<void> {
    return this._ready.promise;
  }

  get activeCellChanged(): Signal<this, Cell> {
    return this._activeCellChanged;
  }

  get cellStructureChanged(): Signal<this, [number, Cell]> {
    return this._cellStructureChanged;
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

  async focusCell(cell: Cell = this._notebook.activeCell): Promise<void> {
    if (cell instanceof CodeCell || cell instanceof MarkdownCell) {
      let verCell = this._verNotebook.getCell(cell.model);
      if (verCell) {
        await verCell.ready;
        this._activeCellChanged.emit(verCell.view);
      }
    }
    if (this.activeCell && this.activeCell.model) {
      //verify cell hasn't been deleted
      let verCell = this._verNotebook.getCell(cell.model);
      await verCell.ready;
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
      const cell = args.cell;
      console.log("Executed cell:", cell);
      this._verNotebook.run(cell.model);
    });
  }

  private async _addNewCells(newIndex: number, newValues: ICellModel[]) {
    newValues.forEach(async (_, index) => {
      var cell: Cell = this._notebook.widgets[newIndex + index];
      var verCell = this._verNotebook.createCell(cell, newIndex, false);
      await verCell.ready;
      console.log("adding a new cell!", cell, verCell, verCell.model);
      this._cellStructureChanged.emit([index, verCell.view]);
      verCell.added();
    });
  }

  private _removeCells(oldIndex: number, oldValues: ICellModel[]) {
    console.log("removing cells", oldIndex, oldValues);
    oldValues.forEach(removed => {
      var verCell = this._verNotebook.getCell(removed);
      this._cellStructureChanged.emit([oldIndex, verCell.view]);
      verCell.deleted();
    });
  }

  private _cellsMoved(
    oldIndex: number,
    newIndex: number,
    newValues: ICellModel[]
  ) {
    newValues.forEach(async item => {
      let verCell = this._verNotebook.getCell(item);
      console.log("moving cell", oldIndex, newIndex, newValues);
      //TODO  this.historyModel.moveCell(oldIndex, newIndex);
      this._cellStructureChanged.emit([newIndex, verCell.view]);
      this._verNotebook.moveCell(verCell, newIndex);
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
      let newCellListen = this._verNotebook.createCell(cell, newIndex, true);
      await newCellListen.ready;
      //TODO
      //this.cells.set(cell.model.id, newCellListen);
      console.log("changed cell type!", oldIndex, newIndex, oldValues, item);
      this._cellStructureChanged.emit([oldIndex, newCellListen.view]);
      newCellListen.cellTypeChanged();
    });
  }

  private _ready = new PromiseDelegate<void>();
}
