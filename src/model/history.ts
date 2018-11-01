import { Nodey, NodeyCell } from "./nodey";

import { Star } from "./star";

import * as levenshtein from "fast-levenshtein";

import { Notes } from "./notes";

import { ChangeType, RunModel } from "./run";

import { NotebookListen } from "../jupyter-hooks/notebook-listen";

import { RenderBaby } from "../jupyter-hooks/render-baby";

import { Inspect } from "../inspect";

import { FileManager } from "../file-manager";

import {
  serialized_NodeyHistory,
  serialized_Nodey,
  serialized_NodeyOutput
} from "../file-manager";

import { CodeCell } from "@jupyterlab/cells";

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
      console.log("Historical Notebook is", this.dump());
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

  public moveCell(old_pos: number, new_pos: number) {
    this._cellList.splice(new_pos, 0, this._cellList.splice(old_pos, 1)[0]);
  }

  private fromJSON(data: serialized_NodeyHistory) {
    this._runModel.fromJSON(data.runs);
    this._cellList = data.cells;
    data.nodey.map(item => {
      let id = item.nodey;
      var hist = new NodeHistory();
      item.versions.forEach(nodeDat => {
        var node: Nodey = Nodey.fromJSON(nodeDat);
        node.id = id;
        var ver = hist.versions.push(node) - 1;
        node.version = ver;
      });
      this._nodeyStore[id] = hist;
    });
    data.output.map(out => {
      let id = out.output;
      var hist = new NodeHistory();
      out.versions.forEach(nodeDat => {
        var node: Nodey = Nodey.outputFromJSON(nodeDat);
        node.id = id;
        var ver = hist.versions.push(node) - 1;
        node.version = ver;
      });
      this._outputStore[id] = hist;
    });
    this._deletedCellList = data.deletedCells;

    this._starStore = [];
    data.stars.forEach(item => {
      let star = Star.fromJSON(item);
      let index = this._starStore.push(star) - 1;
      star.id = index;
      let target: any = null;
      console.log("Trying to load star!", item, star);
      if (star.target_type === "Run")
        target = this.runModel.getRun(Number.parseInt(star.target));
      else if (star.target_type === "NodeyOutput")
        target = this.getOutput(star.target);
      else target = this.getNodey(star.target);
      target.star = index;
    });
    this._notesStore = [];
    data.notes.forEach(item => {
      let note = Notes.fromJSON(item);
      let index = this._notesStore.push(note) - 1;
      note.id = index;
      let target: any = null;
      if (note.target_type === "Run")
        target = this.runModel.getRun(Number.parseInt(note.target));
      else if (note.target_type === "NodeyOutput")
        target = this.getOutput(note.target);
      else target = this.getNodey(note.target);
      target.note = index;
    });
  }

  public toJSON(): serialized_NodeyHistory {
    var jsn = {
      runs: this._runModel.toJSON(),
      cells: this._cellList
    } as serialized_NodeyHistory;
    jsn["nodey"] = this._nodeyStore.map(
      (history: NodeHistory, index: number) => {
        if (history) {
          let versions = history.versions.map((item: Nodey) => item.toJSON());
          let nodey = index;
          return { nodey: nodey, versions: versions };
        }
      }
    ) as { nodey: number; versions: serialized_Nodey[] }[];
    jsn["output"] = this._outputStore.map(
      (history: NodeHistory, index: number) => {
        if (history) {
          let versions = history.versions.map((item: Nodey) => item.toJSON());
          let nodey = index;
          return { versions: versions, output: nodey };
        }
      }
    ) as { output: number; versions: serialized_NodeyOutput[] }[];
    jsn["deletedCells"] = this._deletedCellList;
    jsn["stars"] = this._starStore
      .filter(item => item !== null)
      .map(item => item.toJSON());
    jsn["notes"] = this._notesStore
      .filter(item => item !== null)
      .map(item => item.toJSON());
    return jsn;
  }

  dump(): void {
    //for debugging only
    console.log(
      "CELLS",
      this._cellList,
      "NODES",
      this._nodeyStore,
      "OUTPUT",
      this._outputStore,
      "DELETED CELLS",
      this._deletedCellList
    );
  }
}
