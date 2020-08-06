import { PathExt } from "@jupyterlab/coreutils";
import { PromiseDelegate } from "@lumino/coreutils";
import { NotebookPanel } from "@jupyterlab/notebook";
import { NotebookListen } from "./jupyter-hooks/notebook-listen";
import { Cell, ICellModel, CodeCell } from "@jupyterlab/cells";
import { History } from "./history/";
import { Star } from "./history/";
import { AST } from "./analysis/ast";
import { VerCell } from "./cell";
import { NodeyNotebook, NodeyCell, NodeyCode } from "./nodey";
import { NotebookEvent, LoadNotebook } from "./notebook-events";

const DEBUG = true;

/*
 * Notebook holds a list of cells
 */
export class VerNotebook {
  readonly view: NotebookListen;
  readonly history: History;
  readonly ast: AST;
  private clipboard: { target: string; text: string };
  private eventQueue: Promise<any>[] = [];
  cells: VerCell[];

  constructor(history: History, ast: AST, notebookPanel: NotebookPanel) {
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

    //load in prior data if exists
    var prior = await this.history.init(this);

    // load in the notebook model from data
    let loadEvent = new LoadNotebook(this, prior);
    await this.handleNotebookEvent(loadEvent);

    // finish initialization
    log("Loaded Notebook", this.view.notebook, this.model);
    this.dump();
    this._ready.resolve(undefined);

    // update views to show notebook is loaded
    this.view.focusCell();
  }

  public async handleNotebookEvent(event: NotebookEvent) {
    await Promise.all(this.eventQueue).then(() => (this.eventQueue = []));
    let ev = event.runEvent();
    this.eventQueue.push(ev);
    return ev;
  }

  get model(): NodeyNotebook | Star<NodeyNotebook> {
    return this.history.store.currentNotebook;
  }

  get path(): string {
    return this.view.panel.sessionContext.path; // TODO updated, check still working
  }

  get name(): string {
    return PathExt.basename(this.path);
  }

  get metadata() {
    return this.view.metadata;
  }

  public saveToFile() {
    // save the data to file
    this.history.store.writeToFile();
  }

  public getCell(cell: ICellModel): VerCell {
    return this.cells.find((item) => {
      if (item.view && item.view.model) return item.view.model.id === cell.id;
    });
  }

  public getCellByNode(cell: NodeyCell | Star<NodeyCell>): VerCell {
    return this.cells.find((item) => cell.name === item.model.name);
  }

  public async focusCell(cell: Cell): Promise<VerCell> {
    await Promise.all(this.eventQueue).then(() => (this.eventQueue = []));
    let ev = new Promise<VerCell>((accept) => {
      let verCell = this.getCell(cell.model);
      if (verCell) {
        this.view.activeCell = cell;
      } else this.view.activeCell = null;
      accept(verCell);
    });
    this.eventQueue.push(ev);
    return ev;
  }

  public async copyNode(target: HTMLElement, cell: Cell, text: string) {
    // verify that target came from current active cell (otherwise not a nodey)
    if (this.isDescendant(cell.node, target)) {
      let verCell = this.getCell(cell.model);

      // figure out which nodey this is by the text(?)
      if (verCell) {
        let node = verCell.lastSavedModel;
        let copied;

        // check to see if it's output
        if (
          cell instanceof CodeCell &&
          this.isDescendant(cell.outputArea.node, target)
        ) {
          copied = this.history.store.getOutput(node as NodeyCode).lastSaved;
        } // otherwise main cell
        else copied = this.history.inspector.figureOutTarget(node, cell, text);

        if (copied) {
          // add nodey to clip board in notebook
          this.clipboard = { target: copied.name, text: text };
          log("COPIED NODE IS", this.clipboard);
        } else this.clipboard = null;
      }
    } // otherwise reset clipboard
    else this.clipboard = null;
  }

  private isDescendant(parent: HTMLElement, child: HTMLElement) {
    var node = child.parentNode;
    while (node != null) {
      if (node == parent) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  }

  public dump(): void {
    return this.history.dump();
  }

  private _ready = new PromiseDelegate<void>();
}

export type jsn = { [i: string]: any };

export function log(...msg: any[]) {
  if (DEBUG) console.log("VERDANT: ", ...msg);
}

export function error(...msg: any[]) {
  if (DEBUG) console.error("VERDANT: ", ...msg);
}
