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

import { History, NodeHistory, OutputHistory, CodeHistory } from "..";
import { Search } from "./search";

export type searchResult = {
  label: string;
  count: number;
  results: Nodey[][];
};

export class HistoryStore {
  readonly fileManager: FileManager;
  readonly history: History;

  private _notebookHistory: NodeHistory<NodeyNotebook>;
  private _codeCellStore: CodeHistory[] = [];
  private _markdownStore: NodeHistory<NodeyMarkdown>[] = [];
  private _rawCellStore: NodeHistory<NodeyRawCell>[] = [];
  private _outputStore: OutputHistory[] = [];
  private _snippetStore: NodeHistory<NodeyCode>[] = [];

  constructor(history: History, fileManager: FileManager) {
    this.history = history;
    this.fileManager = fileManager;
  }

  get currentNotebook(): NodeyNotebook | undefined {
    return this._notebookHistory?.latest;
  }

  public getNotebook(ver?: number): NodeyNotebook | undefined {
    return this._notebookHistory.getVersion(ver);
  }

  get cells(): NodeyCell[] {
    let notebook = this.currentNotebook;
    if (!notebook) return []; // error case only
    return notebook.cells.map((name) => this.get(name) as NodeyCell);
  }

  public getHistoryOf(name?: string | Nodey): NodeHistory<Nodey> | undefined {
    if (!name) return; // error case only

    let typeChar = "???"; // error case only
    let id: number;
    if (typeof name === "string") {
      var idVal;
      [typeChar, idVal] = name.split(".");
      id = parseInt(idVal);
    } else if (name instanceof Nodey) {
      typeChar = name.typeChar;
      id = name.id === undefined ? -1 : name.id;
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
      default:
        console.error("nodey type not found" + name + " " + typeof name);
    }
  }

  getLatestOf(name: string | Nodey): Nodey | undefined {
    let nodeHist = this.getHistoryOf(name);
    if (nodeHist === undefined)
      // error case only
      console.error("No history found for " + name + " " + typeof name);
    else return nodeHist.latest;
  }

  getPriorVersion(name?: string | Nodey): Nodey | undefined {
    if (!name) return; // error case only
    let ver = -1; // error case only
    if (name instanceof Nodey) {
      if (name.version !== undefined) ver = name.version - 1;
    } else {
      let [, , verVal] = (name as string).split(".");
      ver = parseInt(verVal) - 1;
    }
    let nodeHist = this.getHistoryOf(name);
    if (ver > -1 && nodeHist) return nodeHist.getVersion(ver);
    else return;
  }

  get(name?: string): Nodey | undefined {
    if (!name) return; // error case only
    //log("attempting to find", name);
    let [, , verVal] = name.split(".");
    let ver = verVal ? parseInt(verVal) : undefined;
    let nodeHist = this.getHistoryOf(name);
    if (ver !== undefined) return nodeHist?.getVersion(ver);
    return nodeHist?.latest;
  }

  getOutput(nodey?: NodeyCode): OutputHistory | undefined {
    if (!nodey) return;
    let cell: NodeyCodeCell;
    if (nodey instanceof NodeyCodeCell) cell = nodey;
    else cell = this.getCellParent(nodey);
    let cellHistory = this.getHistoryOf(cell) as CodeHistory;
    let outName = cellHistory?.getOutput(cell?.version);
    if (outName) return this.getHistoryOf(outName) as OutputHistory;
    return;
  }

  // returns output that was specifically created or present in a given notebook
  getOutputForNotebook(
    nodey?: NodeyCode,
    relativeTo?: NodeyNotebook
  ): NodeyOutput | undefined {
    if (!nodey || !relativeTo) return;
    let outputHist = this.getOutput(nodey);
    if (!outputHist) return;
    let out = outputHist.find(
      (output) => output.created === relativeTo.created
    );
    if (!out) {
      // no output was created in this notebook, so find any output that would
      // have been present
      let outBefore = outputHist.filter(
        (output) => output.created < relativeTo.created
      );
      out = outBefore[outBefore.length - 1];
    }
    return out;
  }

  getAllOutput(nodey?: NodeyCode): OutputHistory[] | undefined {
    if (!nodey) return;
    let cell: NodeyCodeCell;
    if (nodey instanceof NodeyCodeCell) cell = nodey;
    else {
      let parent = this.getCellParent(nodey);
      if (parent) cell = parent;
    }
    let cellHistory = this.getHistoryOf(cell) as CodeHistory;
    let outNames = cellHistory?.allOutput;
    return outNames?.map((name) => this.getHistoryOf(name) as OutputHistory);
  }

  public store(nodey: Nodey): void {
    if (nodey instanceof NodeyNotebook) {
      let id = 0;
      nodey.id = id;
      // if this is the first version
      if (!this._notebookHistory)
        this._notebookHistory = new NodeHistory<NodeyNotebook>();
      this._notebookHistory.addVersion(nodey);
    } else {
      let store = this._getStoreFor(nodey);
      if (store) {
        let history = this._makeHistoryFor(nodey);
        if (history) {
          let id = store.push(history) - 1;
          nodey.id = id;
          store[nodey.id].addVersion(nodey);
        } else console.error("Failed to create new history for nodey: ", nodey);
      } else
        console.error(
          "Failed to find existing history store for nodey ",
          nodey
        );
    }
  }

  /*
   * Search
   */
  public search(query: string): searchResult[] {
    return Search.search(
      query,
      this.history.inspector,
      this._markdownStore,
      this._codeCellStore,
      this._outputStore
    );
  }

  /**
   * newNodey and oldNodey are nodeys with two seperate histories.
   * This function creates a back pointer between the first version
   * of newNodey back to the history, version v of oldNodey.
   **/
  public linkBackHistories(newNodey: Nodey, oldNodey: Nodey): void {
    let history = this.getHistoryOf(newNodey);
    if (history) history.addOriginPointer(oldNodey);
    else
      console.error(
        "Failed to link back histories between ",
        newNodey,
        " and ",
        oldNodey
      );
  }

  private _getStoreFor(nodey: Nodey): NodeHistory<Nodey>[] | undefined {
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
    if (history) {
      history.addVersion(nodey);
      nodey.id = oldNodey.id;
    } else {
      console.error(
        "Failed to register tied history between ",
        nodey.artifactName,
        " and ",
        forceTie
      );
    }
  }

  public getCellParent(relativeTo: Nodey): NodeyCodeCell | undefined {
    //log("get cell parent of ", relativeTo);
    if (relativeTo instanceof NodeyCodeCell) return relativeTo;
    else if (relativeTo.parent) {
      const latest = this.getLatestOf(relativeTo.parent);
      if (latest) return this.getCellParent(latest);
    }
  }

  public getNotebookOf(relativeTo: Nodey): NodeyNotebook | undefined {
    let created = relativeTo?.created;
    if (created !== undefined) {
      // error case if undefined
      let event = this.history.checkpoints.get(created);
      if (event) {
        // error case if undefined
        let notebook_id = event.notebook;
        if (notebook_id !== undefined) return this.getNotebook(notebook_id);
      }
    }
    return;
  }

  public getForNotebook(
    nodeyHist: NodeHistory<Nodey>,
    relativeTo: number
  ): Nodey | undefined {
    const notebook = this.getNotebook(relativeTo);
    const nextNotebook = this.getNotebook(relativeTo + 1);
    const endCheck = nextNotebook?.created || notebook?.created + 1 || -1;

    if (nodeyHist && endCheck !== -1) {
      let max = -1;
      nodeyHist.foreach((ver) => {
        if (ver.created < endCheck) max = ver.version;
      });
      return nodeyHist.getVersion(max);
    }
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
    this._notebookHistory = new NodeHistory<NodeyNotebook>();
    this._notebookHistory.fromJSON(
      data.notebook,
      NodeyNotebook.fromJSON,
      0 // all notebooks have an id of 0, it's a singleton
    );
  }

  /*
   * Returns the equivalent of toJSON() for a slice of history
   * starting at fromVer and ending (non-inclusive) at toVer
   * versions of the whole notebook.
   *
   * returns null if given an invalid fromVer/toVer pair
   */
  public slice(fromVer: number, toVer: number): HistoryStore.SERIALIZE | null {
    if (fromVer > toVer) return null; // error case
    const fromTime = this.getNotebook(fromVer)?.created;
    const toTime = this.getNotebook(toVer)?.created;
    if (!fromTime || !toTime) return null; // error case

    // slice all available histories
    let notebookList: NodeHistory.SERIALIZE = this._notebookHistory.sliceByVer(
      fromVer,
      toVer
    );
    let codeCells = this.sliceStore(this._codeCellStore, fromTime, toTime);
    let markdownCells = this.sliceStore(this._markdownStore, fromTime, toTime);
    let rawCells = this.sliceStore(this._rawCellStore, fromTime, toTime);
    let output = this.sliceStore(this._outputStore, fromTime, toTime);

    return {
      notebook: notebookList,
      codeCells,
      markdownCells,
      rawCells,
      snippets: [],
      output,
    };
  }

  // helper method
  private sliceStore(
    store: NodeHistory<Nodey>[],
    fromTime: number,
    toTime: number
  ): NodeHistory.SERIALIZE[] {
    let slice = [];
    store.forEach((history: NodeHistory<Nodey>) => {
      let data = history.sliceByTime(fromTime, toTime);
      if (data && data.versions.length > 0) slice.push(data);
    });
    return slice;
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
