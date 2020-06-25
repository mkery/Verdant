import { NotebookPanel, Notebook, NotebookActions } from "@jupyterlab/notebook";

import { IObservableJSON } from "@jupyterlab/observables";

import { Cell, CodeCell, MarkdownCell, ICellModel } from "@jupyterlab/cells";

import { PromiseDelegate } from "@lumino/coreutils";

import { log } from "../components/notebook";

import { IObservableList } from "@jupyterlab/observables";

import { VerNotebook } from "../components/notebook";
import {
  SaveNotebook,
  CreateCell,
  DeleteCell,
  MoveCell,
  SwitchCellType,
  RunCell,
} from "../notebook-events";

export class NotebookListen {
  public activeCell: Cell;

  constructor(notebookPanel: NotebookPanel, verNotebook: VerNotebook) {
    this._notebookPanel = notebookPanel;
    this.verNotebook = verNotebook;
    this.init();
  }

  private _notebook: Notebook; //the currently active notebook Verdant is working on
  private _notebookPanel: NotebookPanel;
  readonly verNotebook: VerNotebook;

  private async init() {
    await this._notebookPanel.revealed;
    this._notebook = this._notebookPanel.content;
    log("Notebook panel", this._notebookPanel);
    log("Notebook", this._notebook);
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

  get metadata(): IObservableJSON {
    return this._notebook.model.metadata;
  }

  get nbformatMinor(): number {
    return this._notebook.model.nbformatMinor;
  }

  get nbformat(): number {
    return this._notebook.model.nbformat;
  }

  focusCell(cell: Cell = this._notebook.activeCell) {
    if (!cell) return; //cell was just deleted
    if (!cell.model) return; //cell was just deleted
    if (cell instanceof CodeCell || cell instanceof MarkdownCell) {
      this.verNotebook.focusCell(cell);
    }
  }

  private listen() {
    /**
     * fileChanged is "A signal emitted when the model is saved or reverted.""
     */
    this._notebookPanel.context.fileChanged.connect(() => {
      let saveEvent = new SaveNotebook(this.verNotebook);
      this.verNotebook.handleNotebookEvent(saveEvent);
    });
    this._notebook.model.cells.changed.connect(
      (sender: any, data: IObservableList.IChangedArgs<ICellModel>) => {
        // to avoid duplicates during load wait til load is complete
        if (!this.verNotebook.ready) return;

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
            this._cellTypeChanged(oldIndex, newIndex, oldValues);
            break;
          default:
            log("cell list changed!!!!", sender, data);
            break;
        }
      }
    );

    this._notebook.activeCellChanged.connect((_: any, cell: Cell) => {
      this.focusCell(cell);
    });

    NotebookActions.executed.connect((_, args) => {
      //waaat can get execution signals from other notebooks
      if (args.notebook.id === this._notebook.id) {
        const cell = args.cell;
        let runEvent = new RunCell(this.verNotebook, cell.model);
        this.verNotebook.handleNotebookEvent(runEvent);
      }
    });

    document.addEventListener("copy", (ev: ClipboardEvent) => {
      var text = "";
      if (window.getSelection) {
        text = window.getSelection().toString();
      }
      log("COPY EVENT DETECTED", ev, "string: " + text);
      this.verNotebook.copyNode(
        ev.target as HTMLElement,
        this.activeCell,
        text
      );
    });

    document.addEventListener("cut", (ev: ClipboardEvent) => {
      log("CUT EVENT DETECTED", ev);
      //TODO
    });

    document.addEventListener("paste", (ev) => {
      log("PASTE EVENT DETECTED", ev);
    });
  }

  private _addNewCells(newIndex: number, newValues: ICellModel[]) {
    newValues.forEach(async (_, index) => {
      var cell: Cell = this._notebook.widgets[newIndex + index];
      let createCellEvent = new CreateCell(
        this.verNotebook,
        cell,
        newIndex,
        false
      );
      this.verNotebook.handleNotebookEvent(createCellEvent);
    });
  }

  private _removeCells(oldIndex: number, oldValues: ICellModel[]) {
    log("removing cells", oldIndex, oldValues);
    oldValues.forEach(() => {
      let deleteCellEvent = new DeleteCell(this.verNotebook, oldIndex);
      this.verNotebook.handleNotebookEvent(deleteCellEvent);
    });
  }

  private _cellsMoved(
    oldIndex: number,
    newIndex: number,
    newValues: ICellModel[]
  ) {
    newValues.forEach(async (item) => {
      let verCell = this.verNotebook.getCell(item);
      log("moving cell", oldIndex, newIndex, newValues);
      let moveCellEvent = new MoveCell(
        this.verNotebook,
        verCell,
        oldIndex,
        newIndex
      );
      this.verNotebook.handleNotebookEvent(moveCellEvent);
    });
  }

  private _cellTypeChanged(
    _: number,
    newIndex: number,
    oldValues: ICellModel[]
  ) {
    oldValues.forEach((_, index) => {
      var cell: Cell = this._notebook.widgets[newIndex + index];
      let switchCellEvent = new SwitchCellType(
        this.verNotebook,
        cell,
        newIndex + index
      );
      this.verNotebook.handleNotebookEvent(switchCellEvent);
    });
  }

  private _ready = new PromiseDelegate<void>();
}
