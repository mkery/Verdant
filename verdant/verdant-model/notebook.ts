import { PathExt } from "@jupyterlab/coreutils";
import { PromiseDelegate } from "@lumino/coreutils";
import { NotebookPanel } from "@jupyterlab/notebook";
import { NotebookListen } from "./jupyter-hooks/notebook-listen";
import { Cell, ICellModel } from "@jupyterlab/cells";
import { History } from "./history";
import { AST } from "./analysis/ast";
import { VerCell } from "./cell";
import { NodeyNotebook, NodeyCell } from "./nodey";
import { NotebookEvent, LoadNotebook } from "./notebook-events";

const DEBUG = false;

/*
 * Notebook holds a list of cells
 */
export class VerNotebook {
  readonly view: NotebookListen;
  readonly history: History;
  readonly ast: AST;
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

  public setPanel(panel: NotebookPanel) {
    // update if the active panel changes
    this.view.setPanel(panel);
    // update cells
    this.init();
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
    try {
      await Promise.all(this.eventQueue).then(() => (this.eventQueue = []));
      let ev = event.runEvent();
      this.eventQueue.push(ev);
      return ev;
    } catch (error) {
      console.error("Verdant: Error on event ", event, error);
    }
  }

  get model(): NodeyNotebook | undefined {
    return this.history.store.currentNotebook;
  }

  get path(): string | undefined {
    return this.view.panel?.sessionContext?.path;
  }

  get name(): string | undefined {
    if (this.path) return PathExt.basename(this.path);
  }

  get metadata() {
    return this.view.metadata;
  }

  public saveToFile() {
    // save the data to file
    this.history.store.writeToFile();
  }

  public getCell(cell: ICellModel): VerCell | undefined {
    return this.cells.find((item) => {
      if (item.view && item.view.model) return item.view.model.id === cell.id;
    });
  }

  public getCellByNode(cell: NodeyCell): VerCell | undefined {
    return this.cells.find(
      (item) =>
        cell?.name === item?.model?.name && item?.model?.name !== undefined
    );
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
