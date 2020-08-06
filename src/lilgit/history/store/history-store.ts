import {
  Nodey,
  NodeyCode,
  NodeyOutput,
  NodeyCodeCell,
  NodeyMarkdown,
  NodeyCell,
  NodeyNotebook,
  NodeyRawCell,
} from "../../nodey";

import { log } from "../../notebook";

import { FileManager } from "../../jupyter-hooks/file-manager";

import {
  History,
  Star,
  UnsavedStar,
  NodeHistory,
  OutputHistory,
  CodeHistory,
} from "..";

export class HistoryStore {
  readonly fileManager: FileManager;
  readonly history: History;

  private _notebookHistory: NodeHistory<NodeyNotebook>;
  private _codeCellStore: CodeHistory[] = [];
  private _markdownStore: NodeHistory<NodeyMarkdown>[] = [];
  private _rawCellStore: NodeHistory<NodeyRawCell>[] = [];
  private _outputStore: OutputHistory[] = [];
  private _snippetStore: NodeHistory<NodeyCode>[] = [];

  // this is a store for temporary nodes, stored by cell and cleaned out
  // every time a save or run event occurs
  private _starStore: { [id: string]: UnsavedStar[] } = {};

  constructor(history: History, fileManager: FileManager) {
    this.history = history;
    this.fileManager = fileManager;
  }

  get currentNotebook(): NodeyNotebook | Star<NodeyNotebook> {
    return this._notebookHistory.latest;
  }

  get lastSavedNotebook(): NodeyNotebook {
    return this._notebookHistory.lastSaved as NodeyNotebook;
  }

  public getNotebook(ver: number): NodeyNotebook {
    return this._notebookHistory.getVersion(ver);
  }

  get cells(): NodeyCell[] {
    let notebook = this.currentNotebook;
    if (notebook instanceof Star) notebook = notebook.value;
    return notebook.cells.map((name) => this.get(name) as NodeyCell);
  }

  public getHistoryOf(name: string | Nodey): NodeHistory<Nodey> {
    let typeChar: string;
    let id: number;
    let ver: string;
    if (typeof name === "string") {
      var idVal;
      [typeChar, idVal, ver] = name.split(".");
      id = parseInt(idVal);
    } else if (name instanceof Nodey) {
      typeChar = name.typeChar;
      id = name.id;
      ver = name.version;
    }

    switch (typeChar) {
      case "n":
        return this._notebookHistory;
      case "c":
        return this._codeCellStore[id];
      case "o":
        return this._outputStore[id];
      case "s":
        return this._snippetStore[id];
      case "m":
        return this._markdownStore[id];
      case "r":
        return this._rawCellStore[id];
      case "*": // a star node
        return this.getHistoryOf(idVal + "." + ver);
      case "TEMP": // an unsaved star node
        return undefined;
      default:
        throw new Error("nodey type not found" + name + " " + typeof name);
    }
  }

  getLatestOf(name: string | Nodey): Nodey | Star<Nodey> | UnsavedStar {
    let nodeHist = this.getHistoryOf(name);
    if (nodeHist === undefined && typeof name == "string") {
      log("possible error ", name);
      // check if unsaved star
      let [typeChar, cellId, id] = name.split(".");
      if (typeChar === "TEMP") return this._starStore[cellId][parseInt(id)];
    }
    return nodeHist.latest;
  }

  getPriorVersion(name: string | Nodey): Nodey {
    if (!name) return null;
    let ver;
    if (name instanceof Nodey) ver = parseInt(name.version) - 1;
    else {
      let [, , verVal] = name.split(".");
      ver = parseInt(verVal) - 1;
    }
    let nodeHist = this.getHistoryOf(name);
    if (ver > -1) return nodeHist.getVersion(ver);
    else return null;
  }

  get(name: string): Nodey {
    if (!name) return null;
    //log("attempting to find", name);
    let [ch, , verVal] = name.split(".");
    if (ch === "*") {
      // THIS OCCURS IN A BUG
      let nodeHist = this.getHistoryOf(name);
      return nodeHist.lastSaved;
    } else {
      let ver = parseInt(verVal);
      let nodeHist = this.getHistoryOf(name);
      return nodeHist.getVersion(ver);
    }
  }

  getOutput(nodey: NodeyCode): OutputHistory {
    let cell: NodeyCodeCell;
    if (nodey instanceof NodeyCodeCell) cell = nodey;
    else cell = this.getCellParent(nodey);
    let cellHistory = this.getHistoryOf(cell) as CodeHistory;
    let outName = cellHistory.getOutput(cell.version);
    if (outName) return this.getHistoryOf(outName) as OutputHistory;
    return null;
  }

  getAllOutput(nodey: NodeyCode): OutputHistory[] {
    let cell: NodeyCodeCell;
    if (nodey instanceof NodeyCodeCell) cell = nodey;
    else cell = this.getCellParent(nodey);
    let cellHistory = this.getHistoryOf(cell) as CodeHistory;
    let outNames = cellHistory.allOutput;
    return outNames.map((name) => this.getHistoryOf(name) as OutputHistory);
  }

  public store(nodey: Nodey): void {
    if (nodey instanceof NodeyNotebook) {
      let id = 0;
      nodey.id = id;
      // if this is the first version
      if (!this._notebookHistory)
        this._notebookHistory = new NodeHistory<NodeyNotebook>();
      let ver = this._notebookHistory.addVersion(nodey) - 1;
      nodey.version = ver;
    } else {
      let store = this._getStoreFor(nodey);
      let history = this._makeHistoryFor(nodey);
      let id = store.push(history) - 1;
      nodey.id = id;
      let version = store[nodey.id].addVersion(nodey) - 1;
      nodey.version = version;
    }
  }

  /**
   * newNodey and oldNodey are nodeys with two seperate histories.
   * This function creates a back pointer between the first version
   * of newNodey back to the history, version v of oldNodey.
   **/
  public linkBackHistories(newNodey: Nodey, oldNodey: Nodey): void {
    let history = this.getHistoryOf(newNodey);
    history.addOriginPointer(oldNodey);
  }

  public storeUnsavedStar(
    star: UnsavedStar,
    parent: NodeyCode | Star<NodeyCode>
  ) {
    // store in temp star store not in permanent storage
    let cell = this.getCellParent(parent);
    if (!this._starStore[cell.id]) this._starStore[cell.id] = [];
    let id = this._starStore[cell.id].push(star) - 1;
    star.cellId = cell.id + "";
    star.value.id = id;
  }

  public cleanOutStars(nodey: NodeyCell): void {
    this._starStore[nodey.id] = [];
  }

  /*
   * Returns a list of Markdown artifacts, each with a list
   * of all the versions of that artifact that match the query
   */
  public findMarkdown(
    query: string,
    filter?: (n: Nodey) => boolean
  ): [NodeyMarkdown[][], number] {
    let results: NodeyMarkdown[][] = [];
    let resultCount = 0;
    let text = query.toLowerCase();
    this._markdownStore.forEach((history) => {
      let match = history.filter((item) => {
        if (!item.markdown) return false;
        let matchesText = item.markdown.toLowerCase().indexOf(text) > -1;
        if (filter) return matchesText && filter(item);
        else return matchesText;
      });
      if (match.length > 0) {
        results.push(match);
        resultCount += match.length;
      }
    });
    return [results, resultCount];
  }

  /*
   * Returns a list of code artifacts, each with a list
   * of all the versions of that artifact that match the query
   */
  public findCode(
    query: string,
    filter?: (n: Nodey) => boolean
  ): [NodeyCode[][], number] {
    let results: NodeyCode[][] = [];
    let resultCount = 0;
    let text = query.toLowerCase();
    this._codeCellStore.forEach((history) => {
      let matches = history.filter((cell) => {
        let sourceText = this.history.inspector.renderNode(cell) || "";
        if (sourceText.toLowerCase().indexOf(text) > -1) {
          if (filter) return filter(cell);
          return true;
        }
        return false;
      });
      if (matches.length > 0) {
        results.push(matches);
        resultCount += matches.length;
      }
    });
    return [results, resultCount];
  }

  /*
   * Returns a list of output artifacts, each with a list
   * of all the versions of that artifact that match the query
   */
  public findOutput(
    query: string,
    filter?: (n: Nodey) => boolean
  ): [NodeyOutput[][], number] {
    let results: NodeyOutput[][] = [];
    let resultCount = 0;

    let text = query.toLowerCase();
    this._outputStore.forEach((history) => {
      let matches = history.filter((output) => {
        let sourceText = this.history.inspector.renderNode(output) || "";
        if (sourceText.toLowerCase().indexOf(text) > -1) {
          if (filter) return filter(output);
          return true;
        }
        return false;
      });
      if (matches.length > 0) {
        results.push(matches);
        resultCount += matches.length;
      }
    });
    return [results, resultCount];
  }

  private _getStoreFor(nodey: Nodey): NodeHistory<Nodey>[] {
    if (nodey instanceof NodeyCodeCell) return this._codeCellStore;
    else if (nodey instanceof NodeyMarkdown) return this._markdownStore;
    else if (nodey instanceof NodeyOutput) return this._outputStore;
    else if (nodey instanceof NodeyCode) return this._snippetStore;
    else if (nodey instanceof NodeyRawCell) return this._rawCellStore;
  }

  private _makeHistoryFor(nodey: Nodey) {
    if (nodey instanceof NodeyMarkdown || nodey instanceof NodeyRawCell)
      return new NodeHistory<NodeyCell>();
    else if (nodey instanceof NodeyCodeCell) return new CodeHistory();
    else if (nodey instanceof NodeyOutput)
      return new OutputHistory(this.fileManager);
    else if (nodey instanceof NodeyCode) return new NodeHistory<NodeyCode>();
  }

  public registerTiedNodey(nodey: NodeyCell, forceTie: string): void {
    let oldNodey = this.get(forceTie) as NodeyCell;
    let history = this.getHistoryOf(oldNodey);
    let version = history.addVersion(nodey) - 1;
    nodey.id = oldNodey.id;
    nodey.version = version;
    return;
  }

  public getCellParent(relativeTo: Nodey | Star<Nodey>): NodeyCodeCell {
    log("get cell parent of ", relativeTo);
    if (relativeTo instanceof Star) {
      let val = relativeTo.value;
      if (val instanceof NodeyCodeCell) return val;
      else return this.getCellParent(this.getLatestOf(val.parent));
    }
    if (relativeTo instanceof NodeyCodeCell) return relativeTo;
    else if (relativeTo.parent)
      return this.getCellParent(this.getLatestOf(relativeTo.parent));
  }

  public getNotebookOf(relativeTo: Nodey | Star<Nodey>): NodeyNotebook {
    let val: Nodey;
    if (relativeTo instanceof Star) val = relativeTo.value;
    else val = relativeTo;

    let created = val.created;
    if (created !== undefined) {
      let event = this.history.checkpoints.get(created);
      let notebook_id = event.notebook;
      if (notebook_id !== undefined) return this.getNotebook(notebook_id);
    }
    return undefined;
  }

  public writeToFile(): void {
    this.fileManager.writeToFile();
  }

  public dump() {
    //TODO only for debug
    log(this._codeCellStore);
  }

  public toJSON(): HistoryStore.SERIALIZE {
    return {
      notebook: this._notebookHistory.toJSON(),
      codeCells: this._codeCellStore.map((hist) => hist.toJSON()),
      markdownCells: this._markdownStore.map((hist) => hist.toJSON()),
      rawCells: this._rawCellStore.map((hist) => hist.toJSON()),
      snippets: this._snippetStore.map((hist) => hist.toJSON()),
      output: this._outputStore.map((hist) => hist.toJSON()),
    };
  }

  public fromJSON(data: HistoryStore.SERIALIZE) {
    this._codeCellStore = data.codeCells.map(
      (item: CodeHistory.SERIALIZE, id: number) => {
        let hist = new CodeHistory();
        hist.fromJSON(item, NodeyCodeCell.fromJSON, id);
        return hist;
      }
    );
    this._markdownStore = data.markdownCells.map(
      (item: NodeHistory.SERIALIZE, id: number) => {
        let hist = new NodeHistory<NodeyMarkdown>();
        hist.fromJSON(item, NodeyMarkdown.fromJSON, id);
        return hist;
      }
    );
    if (data.rawCells)
      this._rawCellStore = data.rawCells.map(
        (item: NodeHistory.SERIALIZE, id: number) => {
          let hist = new NodeHistory<NodeyRawCell>();
          hist.fromJSON(item, NodeyRawCell.fromJSON, id);
          return hist;
        }
      );
    this._snippetStore = data.snippets.map(
      (item: NodeHistory.SERIALIZE, id: number) => {
        let hist = new NodeHistory<NodeyCode>();
        hist.fromJSON(item, NodeyCode.fromJSON, id);
        return hist;
      }
    );
    this._outputStore = data.output.map(
      (item: NodeHistory.SERIALIZE, id: number) => {
        let hist = new OutputHistory(this.fileManager);
        hist.fromJSON(item, NodeyOutput.fromJSON, id);
        return hist;
      }
    );
    this._notebookHistory.fromJSON(
      data.notebook,
      NodeyNotebook.fromJSON,
      0 // all notebooks have an id of 0, it's a singleton
    );
  }
}

export namespace HistoryStore {
  export interface SERIALIZE {
    notebook: NodeHistory.SERIALIZE;
    codeCells: NodeHistory.SERIALIZE[];
    markdownCells: NodeHistory.SERIALIZE[];
    rawCells: NodeHistory.SERIALIZE[];
    snippets: NodeHistory.SERIALIZE[];
    output: NodeHistory.SERIALIZE[];
  }
}
