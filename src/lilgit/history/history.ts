import { VerNotebook, log } from "../notebook";

import { RenderBaby } from "../jupyter-hooks/render-baby";
import { PromiseDelegate } from "@lumino/coreutils";
import { Sampler } from "../sampler/";

import { FileManager } from "../jupyter-hooks/file-manager";

import { SERIALIZE } from "./serialize-schema";

import { HistoryStore, HistoryStage } from ".";

import { HistoryCheckpoints } from "../checkpoint/checkpoint-history";

export class History {
  public notebook: VerNotebook;

  constructor(renderBaby: RenderBaby, fileManager: FileManager) {
    this._inspector = new Sampler(this, renderBaby);
    this.store = new HistoryStore(this, fileManager);
    this.stage = new HistoryStage(this);
    this.checkpoints = new HistoryCheckpoints(this);
  }

  private readonly _inspector: Sampler;
  readonly store: HistoryStore;
  readonly stage: HistoryStage;
  readonly checkpoints: HistoryCheckpoints;

  public async init(notebook: VerNotebook): Promise<boolean> {
    // check if there is an existing history file for this notebook
    this.notebook = notebook;
    var data = await this.store.fileManager.loadFromFile(notebook);
    if (data) {
      var history = JSON.parse(data) as SERIALIZE.NodeHistory;
      log("FOUND HISTORY", history);
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

  get inspector(): Sampler {
    return this._inspector;
  }

  private fromJSON(data: SERIALIZE.NodeHistory) {
    this.checkpoints.fromJSON(data.runs);
    this.store.fromJSON(data);
  }

  public toJSON() {
    var jsn = this.store.toJSON();
    jsn.runs = this.checkpoints.toJSON();
    return jsn;
  }

  public dump(): void {
    log(this.store.toJSON());
  }

  private _ready = new PromiseDelegate<void>();
}
