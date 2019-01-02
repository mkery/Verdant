import { VerNotebook } from "../components/notebook";

import { RenderBaby } from "../jupyter-hooks/render-baby";
import { PromiseDelegate } from "@phosphor/coreutils";
import { Inspect } from "../inspect";

import { FileManager } from "../file-manager";

import { serialized_NodeyHistory } from "../file-manager";

import { HistoryStore } from "./history-store";

import { HistoryStage } from "./history-stage";

import { HistoryCheckpoints } from "./checkpoint";

export class History {
  public notebook: VerNotebook;

  constructor(renderBaby: RenderBaby, fileManager: FileManager) {
    this._inspector = new Inspect(this, renderBaby);
    this.store = new HistoryStore(this, fileManager);
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
    var data = await this.store.fileManager.loadFromFile(notebook);
    if (data) {
      var history = JSON.parse(data) as serialized_NodeyHistory;
      console.log("FOUND HISTORY", history);
      this.fromJSON(history);
      this._ready.resolve(undefined);
      return true;
    }
    this._ready.resolve(undefined);
    return false;
  }

  public get ready(): Promise<void> {
    return this._ready.promise;
  }

  get inspector(): Inspect {
    return this._inspector;
  }

  private fromJSON(data: serialized_NodeyHistory) {
    this.checkpoints.fromJSON(data.runs);
    this.store.fromJSON(data);
  }

  public toJSON() {
    var jsn = this.store.toJSON();
    jsn.runs = this.checkpoints.toJSON();
    return jsn;
  }

  public dump(): void {
    console.log(this.store.toJSON());
  }

  private _ready = new PromiseDelegate<void>();
}
