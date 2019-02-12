import { NotebookPanel, Notebook, NotebookActions } from "@jupyterlab/notebook";

import { IObservableJSON } from "@jupyterlab/observables";

import { Cell, CodeCell, MarkdownCell, ICellModel } from "@jupyterlab/cells";

import { PromiseDelegate } from "@phosphor/coreutils";

import { IObservableList } from "@jupyterlab/observables";

import { VerNotebook } from "../components/notebook";

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
    console.log("Notebook panel", this._notebookPanel);
    console.log("Notebook", this._notebook);
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
      this.verNotebook.save();
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
      //waaat can get execution signals from other notebooks
      if (args.notebook.id === this._notebook.id) {
        const cell = args.cell;
        this.verNotebook.run(cell.model);
      }
    });

    document.addEventListener("copy", (ev: ClipboardEvent) => {
      var text = "";
      if (window.getSelection) {
        text = window.getSelection().toString();
      }
      console.log("COPY EVENT DETECTED", ev, "string: " + text);
    });

    document.addEventListener("cut", (ev: ClipboardEvent) => {
      console.log(
        "CUT EVENT DETECTED",
        ev,
        ev.clipboardData.getData("text/plain")
      );
    });

    document.addEventListener("paste", ev => {
      console.log("PASTE EVENT DETECTED", ev);
    });
  }

  private async _addNewCells(newIndex: number, newValues: ICellModel[]) {
    newValues.forEach(async (_, index) => {
      var cell: Cell = this._notebook.widgets[newIndex + index];
      var [verCell, checkpoint] = await this.verNotebook.createCell(
        cell,
        newIndex,
        false
      );
      console.log(
        "adding a new cell!",
        cell,
        verCell,
        verCell.model,
        checkpoint
      );
    });
  }

  private _removeCells(oldIndex: number, oldValues: ICellModel[]) {
    console.log("removing cells", oldIndex, oldValues);
    oldValues.forEach(() => {
      this.verNotebook.deleteCell(oldIndex);
    });
  }

  private _cellsMoved(
    oldIndex: number,
    newIndex: number,
    newValues: ICellModel[]
  ) {
    newValues.forEach(async item => {
      let verCell = this.verNotebook.getCell(item);
      console.log("moving cell", oldIndex, newIndex, newValues);
      this.verNotebook.moveCell(verCell, oldIndex, newIndex);
    });
  }

  private async _cellTypeChanged(
    _: number,
    newIndex: number,
    oldValues: ICellModel[]
  ) {
    oldValues.forEach(async (_, index) => {
      var cell: Cell = this._notebook.widgets[newIndex + index];
      this.verNotebook.switchCellType(newIndex + index, cell);
    });
  }

  private _ready = new PromiseDelegate<void>();
}
