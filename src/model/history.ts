import { Nodey, NodeyCell } from "./nodey";

import { RunModel } from "./run";

import { NotebookListen } from "../jupyter-hooks/notebook-listen";

import { RenderBaby } from "../jupyter-hooks/render-baby";

import { Inspect } from "../inspect";

import { FileManager } from "../file-manager";

import { serialized_NodeyHistory } from "../file-manager";

import { HistoryStore } from "./history-store";

export class HistoryModel {
  constructor(renderBaby: RenderBaby, fileManager: FileManager) {
    this._inspector = new Inspect(this, renderBaby);
    this.fileManager = fileManager;
    this._historyStore = new HistoryStore();
    this._runModel = new RunModel(this);
  }

  private _inspector: Inspect;
  readonly fileManager: FileManager;
  private _runModel: RunModel;
  private _notebook: NotebookListen;
  private _historyStore: HistoryStore;

  public async init(): Promise<boolean> {
    // check if there is an existing history file for this notebook
    var data = await this.fileManager.loadFromFile(this._notebook);
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

  set notebook(notebook: NotebookListen) {
    this._notebook = notebook;
    this._inspector.notebook = this._notebook;
  }

  get notebook() {
    return this._notebook;
  }

  get inspector(): Inspect {
    return this._inspector;
  }

  get runModel(): RunModel {
    return this._runModel;
  }

  public writeToFile() {
    this.fileManager.writeToFile(this.notebook, this);
  }

  handleCellRun(nodey: NodeyCell) {
    this._runModel.cellRun(nodey);
  }

  /*public moveCell(old_pos: number, new_pos: number) {
    this._cellList.splice(new_pos, 0, this._cellList.splice(old_pos, 1)[0]);
  }*/

  private fromJSON(data: serialized_NodeyHistory) {
    this._runModel.fromJSON(data.runs);
    this._historyStore.fromJSON(data);
  }

  public toJSON() {
    var jsn = this._historyStore.toJSON();
    jsn.runs = this._runModel.toJSON();
    return jsn;
  }
}
