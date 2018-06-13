import { NotebookListen } from "./notebook-listen";

import { Nodey } from "./nodey";

import { Model } from "./model";

import { CellListen } from "./cell-listen";

import { Signal } from "@phosphor/signaling";

export class Inspect {
  private _notebook: NotebookListen;
  private _historyModel: Model;
  private _targetChanged = new Signal<this, Nodey>(this);
  private _target: Nodey;

  constructor(historyModel: Model) {
    this._historyModel = historyModel;
  }

  set notebook(notebook: NotebookListen) {
    this._notebook = notebook;
    this._notebook.activeCellChanged.connect(
      (sender: any, cell: CellListen) => {
        this.changeTarget(cell.nodey);
      }
    );
  }

  get targetChanged(): Signal<this, Nodey> {
    return this._targetChanged;
  }

  changeTarget(nodey: Nodey) {
    this._historyModel.dump();
    this._target = nodey;
    this._targetChanged.emit(this._target);
  }
}
