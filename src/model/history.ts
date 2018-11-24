import { NodeyCell, NodeyNotebook } from "./nodey";

import { VerNotebook } from "../components/notebook";

import { RenderBaby } from "../jupyter-hooks/render-baby";

import { Inspect } from "../inspect";

import { FileManager } from "../file-manager";

import { serialized_NodeyHistory } from "../file-manager";

import { HistoryStore } from "./history-store";

import { HistoryStage, Star } from "./history-stage";

import { HistoryCheckpoints } from "./checkpoint";

export class History {
  public notebook: VerNotebook;

  constructor(renderBaby: RenderBaby, fileManager: FileManager) {
    this._inspector = new Inspect(this, renderBaby);
    this.store = new HistoryStore(fileManager);
    this.stage = new HistoryStage(this);
    this.checkpoints = new HistoryCheckpoints(this);
  }

  private readonly _inspector: Inspect;
  readonly store: HistoryStore;
  readonly stage: HistoryStage;
  readonly checkpoints: HistoryCheckpoints;

  public async init(notebook: VerNotebook): Promise<boolean> {
    // check if there is an existing history file for this notebook
    this.notebook = notebook;
    this._inspector.notebook = notebook;
    var data = await this.store.fileManager.loadFromFile(notebook);
    if (data) {
      var history = JSON.parse(data) as serialized_NodeyHistory;
      this.fromJSON(history);
      return true;
    }
    return false;
  }

  /*
  * NOTE star form should not leave history store or commit
  * TODO check this design choice l8r
  */
  getNotebook(): NodeyNotebook {
    let note = this.store.notebookNodey;
    if (note instanceof Star) return note.value;
  }

  get inspector(): Inspect {
    return this._inspector;
  }

  handleCellRun(nodey: NodeyCell | Star<NodeyCell>) {
    let [checkpoint, resolve] = this.checkpoints.cellRun();
    this.stage.commit(checkpoint, nodey);
    let newNodey = this.store.getLatestOf(nodey.name) as NodeyCell;
    let same = newNodey.name === nodey.name;
    resolve(newNodey, same);
    console.log("commited cell", newNodey);
    //this.store.writeToFile(this.notebook, this);
  }

  /*public moveCell(old_pos: number, new_pos: number) {
    this._cellList.splice(new_pos, 0, this._cellList.splice(old_pos, 1)[0]);
  }*/

  private fromJSON(data: serialized_NodeyHistory) {
    this.checkpoints.fromJSON(data.runs);
    this.store.fromJSON(data, this.notebook);
  }

  public toJSON() {
    var jsn = this.store.toJSON();
    jsn.runs = this.checkpoints.toJSON();
    return jsn;
  }

  public dump(): void {
    console.log(this.store.toJSON());
  }
}
