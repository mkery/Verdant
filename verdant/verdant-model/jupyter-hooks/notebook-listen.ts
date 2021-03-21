import { NotebookPanel, Notebook, NotebookActions } from "@jupyterlab/notebook";

import { IObservableJSON } from "@jupyterlab/observables";

import { Cell, CodeCell, MarkdownCell, ICellModel } from "@jupyterlab/cells";

import { PromiseDelegate } from "@lumino/coreutils";
import { Signal } from "@lumino/signaling";

import { log } from "../notebook";

import { IObservableList } from "@jupyterlab/observables";

import { VerNotebook } from "../notebook";
import { VerCell } from "../cell";
import {
  SaveNotebook,
  CreateCell,
  DeleteCell,
  MoveCell,
  SwitchCellType,
  RunCell,
} from "../notebook-events";

export class NotebookListen {
  public activeCell: Cell | null = null;

  constructor(notebookPanel: NotebookPanel, verNotebook: VerNotebook) {
    this._notebookPanel = notebookPanel;
    this.verNotebook = verNotebook;
    this.init();
  }

  dispose() {
    Signal.clearData(this);
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

  setPanel(panel: NotebookPanel): void {
    // update to a new panel
    this._notebookPanel = panel;
    this.init();
  }

  get notebook(): Notebook {
    return this._notebook;
  }

  get ready(): Promise<void> {
    return this._ready.promise;
  }

  get metadata(): IObservableJSON | undefined {
    return this._notebook.model?.metadata;
  }

  get nbformatMinor(): number | undefined {
    return this._notebook?.model?.nbformatMinor;
  }

  get nbformat(): number | undefined {
    return this._notebook?.model?.nbformat;
  }

  focusCell(cell: Cell | null = this._notebook.activeCell) {
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
    this._notebookPanel?.context?.fileChanged.connect(() => {
      let saveEvent = new SaveNotebook(this.verNotebook);
      this.verNotebook.handleNotebookEvent(saveEvent);
    });
    this._notebook.model?.cells?.changed.connect(
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

    NotebookActions.executed.connect(async (_, args) => {
      //waaat can get execution signals from other notebooks
      if (args.notebook.id === this._notebook.id) {
        const cell = args.cell;
        let verCell = this.verNotebook.getCell(cell.model);
        if (verCell && verCell.model) {
          let runEvent = new RunCell(this.verNotebook, verCell.model);
          this.verNotebook.handleNotebookEvent(runEvent);
        } else {
          // error case, this cell is missing a history model!
          try {
            // to fix create a new cell nodey and checkpoint to record this event
            let index = this.notebook.widgets.findIndex(
              (w) => w.model.id === cell.model.id
            );
            let checkpoint = this.verNotebook.history.checkpoints.generateCheckpoint();
            let nodey = await this.verNotebook.ast.create.fromCell(
              cell,
              checkpoint
            );
            if (!verCell) {
              // create ver cell if that's missing too
              this.verNotebook.cells.splice(
                index,
                0,
                new VerCell(this.verNotebook, cell, nodey.name)
              );
            } else verCell.setModel(nodey.name);
            this.verNotebook.history.stage.commitCellAdded(
              nodey,
              index,
              checkpoint
            );
          } catch (error) {
            console.error(
              "Verdant: Error with mysterious cell run: ",
              cell,
              error
            );
          }
        }
      }
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
      if (verCell) {
        log("moving cell", oldIndex, newIndex, newValues);
        let moveCellEvent = new MoveCell(
          this.verNotebook,
          verCell,
          oldIndex,
          newIndex
        );
        this.verNotebook.handleNotebookEvent(moveCellEvent);
      } else console.error("Cell not found in notebook history: ", item);
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
