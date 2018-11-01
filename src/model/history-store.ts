import {
  Nodey,
  NodeyCode,
  NodeyOutput,
  NodeyCodeCell,
  NodeyMarkdown,
  NodeyNotebook,
  NodeyCell
} from "./nodey";

export class HistoryStore {
  private _notebookHistory: NodeHistory<NodeyNotebook>;
  private _codeCellStore: NodeHistory<NodeyCodeCell>[] = [];
  private _markdownStore: NodeHistory<NodeyMarkdown>[] = [];
  private _outputStore: NodeHistory<NodeyOutput>[] = [];
  private _snippetStore: NodeHistory<NodeyCode>[] = [];

  constructor() {
    this._notebookHistory = new NodeHistory<NodeyNotebook>();
  }

  get notebookNodey(): NodeyNotebook {
    return this._notebookHistory.latest;
  }

  get cells(): NodeyCell[] {
    return this.notebookNodey.cells.map(name => this.get(name) as NodeyCell);
  }

  public getHistoryOf(name: string | Nodey): NodeHistory<Nodey> {
    let typeChar: string;
    let id: number;
    if (typeof name === "string") {
      var idVal;
      [typeChar, idVal] = name.split(".");
      id = parseInt(idVal);
    } else if (name instanceof Nodey) {
      typeChar = name.typeChar;
      id = name.id;
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
      default:
        throw new Error("nodey type not found" + name);
    }
  }

  getLatestOf(name: string): Nodey {
    let nodeHist = this.getHistoryOf(name);
    return nodeHist.latest;
  }

  get(name: string): Nodey {
    if (!name) return null;
    //console.log("attempting to find", name);
    let [, , verVal] = name.split(".");
    let ver = parseInt(verVal);
    let nodeHist = this.getHistoryOf(name);
    return nodeHist.versions[ver];
  }

  public store(nodey: Nodey): void {
    let store = this._getStoreFor(nodey);
    let history = this._makeHistoryFor(nodey);
    let id = store.push(history) - 1;
    nodey.id = id;
    let version = store[nodey.id].versions.push(nodey) - 1;
    nodey.version = version;
    return;
  }

  private _getStoreFor(nodey: Nodey): NodeHistory<Nodey>[] {
    if (nodey instanceof NodeyCodeCell) return this._codeCellStore;
    else if (nodey instanceof NodeyMarkdown) return this._markdownStore;
    else if (nodey instanceof NodeyOutput) return this._outputStore;
    else if (nodey instanceof NodeyCode) return this._snippetStore;
  }

  private _makeHistoryFor(nodey: Nodey) {
    if (nodey instanceof NodeyCodeCell || nodey instanceof NodeyMarkdown)
      return new NodeHistory<NodeyCell>();
    else if (nodey instanceof NodeyOutput)
      return new NodeHistory<NodeyOutput>();
    else if (nodey instanceof NodeyCode) return new NodeHistory<NodeyCode>();
  }

  public registerTiedNodey(nodey: NodeyCell, forceTie: string): void {
    let oldNodey = this.get(forceTie);
    let history = this.getHistoryOf(oldNodey);
    let version = history.versions.push(nodey) - 1;
    nodey.id = oldNodey.id;
    nodey.version = version;
    return;
  }

  public getCellParent(relativeTo: NodeyCode): NodeyCodeCell {
    if (relativeTo instanceof NodeyCodeCell) return relativeTo;
    else if (relativeTo.parent)
      return this.getCellParent(this.get(relativeTo.parent) as NodeyCode);
  }

  public toJSON() {
    return {
      notebook: this._notebookHistory.toJSON(),
      codeCells: this._codeCellStore.map(hist => hist.toJSON()),
      markdownCells: this._markdownStore.map(hist => hist.toJSON()),
      snippets: this._snippetStore.map(hist => hist.toJSON()),
      output: this._outputStore.map(hist => hist.toJSON())
    };
  }
}

/*
* Just a container for a list of nodey versions
*/
export class NodeHistory<T extends Nodey> {
  versions: T[] = [];
  starNodey: T = null;

  get latest() {
    if (this.starNodey !== null) return this.starNodey;
    return this.versions[this.versions.length - 1];
  }

  deStar(runId: number, output: string[] = null) {
    console.log("HAS OUTPUT", output);
    let newNodey = Object.getPrototypeOf(this.starNodey)({}, this.starNodey);
    newNodey.run.push(runId);
    if (newNodey instanceof NodeyCode && output) {
      output.forEach(out => (newNodey as NodeyCode).addOutput(out));
    }
    this.starNodey = null;
    this.versions.push(newNodey as T);
    newNodey.version = this.versions.length - 1;
    console.log("de-staring", newNodey, this);
    return newNodey;
  }

  toJSON() {
    return this.versions.map(node => node.toJSON());
  }
}
