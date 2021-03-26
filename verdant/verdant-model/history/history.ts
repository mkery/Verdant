import { VerNotebook, log } from "../notebook";

import { RenderBaby } from "../jupyter-hooks/render-baby";
import { PromiseDelegate } from "@lumino/coreutils";
import { Sampler } from "../sampler";

import { FileManager } from "../jupyter-hooks/file-manager";

import { HistoryStore, HistoryStage } from ".";

import { HistoryCheckpoints } from "../checkpoint/checkpoint-history";
import { Checkpoint } from "../checkpoint";

export class History {
  public notebook: VerNotebook;

  constructor(renderBaby: RenderBaby, fileManager: FileManager) {
    this._inspector = new Sampler(this, renderBaby);
    this.store = new HistoryStore(this, fileManager);
    this.stage = new HistoryStage(this, fileManager);
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
      var history = JSON.parse(data) as History.SERIALIZE;
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

  // de-serializes history loaded from a file
  private fromJSON(data: History.SERIALIZE) {
    this.checkpoints.fromJSON(data.checkpoints);
    this.store.fromJSON(data);
  }

  // serializes history for storage in a file
  public toJSON(): History.SERIALIZE {
    let store = this.store.toJSON();
    return { checkpoints: this.checkpoints.toJSON(), ...store };
  }

  /*
   * Returns the equivalent of toJSON() for a slice of history
   * starting at fromVer and ending (non-inclusive) at toVer
   * versions of the whole notebook.
   *
   * returns null if given an invalid fromVer/toVer pair
   */
  public slice(fromVer: number, toVer: number): History.SERIALIZE | null {
    // check for valid toVer fromVer
    if (fromVer < toVer) {
      const fromTime = this.store.getNotebook(fromVer)?.created;
      const toTime = this.store.getNotebook(toVer)?.created;

      // verify valid notebook versions
      if (fromTime && toTime) {
        const checkpointSlice = this.checkpoints.slice(fromTime, toTime);
        const storeSlice = this.store.slice(fromVer, toVer);
        return { checkpoints: checkpointSlice, ...storeSlice };
      }
    }
    return null; // error case
  }

  // used for debug only
  public dump(): void {
    log(this.store.toJSON());
  }

  private _ready = new PromiseDelegate<void>();
}

export namespace History {
  export type SERIALIZE = {
    checkpoints: Checkpoint.SERIALIZE[];
  } & HistoryStore.SERIALIZE;
}
