import { Nodey, NodeyCell, NodeyNotebook } from "./nodey";

import { NotebookListen } from "../jupyter-hooks/notebook-listen";

import { RenderBaby } from "../jupyter-hooks/render-baby";

import { Inspect } from "../inspect";

import { FileManager } from "../file-manager";

import { serialized_NodeyHistory } from "../file-manager";

import { HistoryStore } from "./history-store";

import { HistoryStage, Star } from "./history-stage";

import { HistoryCheckpoints } from "./checkpoint";

export class History {
  public notebookListen: NotebookListen;

  constructor(renderBaby: RenderBaby, fileManager: FileManager) {
    this._inspector = new Inspect(this, renderBaby);
    this._historyStore = new HistoryStore(fileManager);
    this._historyStage = new HistoryStage(this._historyStore);
    this._historyCheckpoints = new HistoryCheckpoints(
      this._historyStage,
      this._historyStore
    );
  }

  private readonly _inspector: Inspect;
  private readonly _notebook: NotebookListen;
  private readonly _historyStore: HistoryStore;
  private readonly _historyStage: HistoryStage;
  private readonly _historyCheckpoints: HistoryCheckpoints;

  public async init(): Promise<boolean> {
    // check if there is an existing history file for this notebook
    var data = await this._historyStore.fileManager.loadFromFile(
      this._notebook
    );
    if (data) {
      var history = JSON.parse(data) as serialized_NodeyHistory;
      this.fromJSON(history);
      return true;
    }
    return false;
  }

  getHistoryOf(n: string | Nodey) {
    return this._historyStore.getHistoryOf(n);
  }

  get(n: string) {
    return this._historyStore.get(n);
  }

  store(n: Nodey) {
    return this._historyStore.store(n);
  }

  get notebook() {
    return this._historyStore.notebookNodey;
  }

  get inspector(): Inspect {
    return this._inspector;
  }

  handleCellRun(nodey: NodeyCell | Star<NodeyCell>) {
    let [checkpoint, resolve] = this._historyCheckpoints.cellRun();
    this._historyStage.commit(checkpoint, nodey);
    let newNodey = this._historyStore.getLatestOf(nodey.name) as NodeyCell;
    let same = newNodey.name === nodey.name;
    resolve(newNodey, same);
    let notebook = this._historyStore.get(checkpoint.notebook) as NodeyNotebook;
    this._historyStore.writeToFile(notebook, this);
  }

  /*public moveCell(old_pos: number, new_pos: number) {
    this._cellList.splice(new_pos, 0, this._cellList.splice(old_pos, 1)[0]);
  }*/

  private fromJSON(data: serialized_NodeyHistory) {
    this._historyCheckpoints.fromJSON(data.runs);
    this._historyStore.fromJSON(data);
  }

  public toJSON() {
    var jsn = this._historyStore.toJSON();
    jsn.runs = this._historyCheckpoints.toJSON();
    return jsn;
  }

  public dump() {}
}
