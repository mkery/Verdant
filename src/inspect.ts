import { NotebookListen } from "./jupyter-hooks/notebook-listen";

import {
  Nodey,
  NodeyCode,
  NodeyMarkdown,
  NodeyOutput,
  SyntaxToken
} from "./nodey";

import { HistoryModel } from "./history-model";

import { CellListen } from "./jupyter-hooks/cell-listen";

import { RenderBaby } from "./jupyter-hooks/render-baby";

import { Signal } from "@phosphor/signaling";

export class Inspect {
  private _notebook: NotebookListen;
  private _historyModel: HistoryModel;
  private _targetChanged = new Signal<this, Nodey>(this);
  private _target: Nodey;
  renderBaby: RenderBaby;

  constructor(historyModel: HistoryModel, renderBaby: RenderBaby) {
    this._historyModel = historyModel;
    this.renderBaby = renderBaby;
  }

  set notebook(notebook: NotebookListen) {
    this._notebook = notebook;
    this._notebook.activeCellChanged.connect(
      (sender: any, cell: CellListen) => {
        this.changeTarget([cell.nodey]);
      }
    );
  }

  get targetChanged(): Signal<this, Nodey> {
    return this._targetChanged;
  }

  get versionsOfTarget() {
    var nodeVerList = this._historyModel.getVersionsFor(this._target);
    var recovered = nodeVerList.versions.map((item: Nodey) =>
      this.renderNode(item)
    );
    return recovered;
  }

  changeTarget(nodey: Nodey[]) {
    //this._historyModel.dump();
    console.log("new target!", nodey);
    this._target = nodey[0]; //TODO
    this._targetChanged.emit(this._target);
  }

  getNodesByLine(nodey: NodeyCode, lines: NodeyCode[][] = []): NodeyCode[][] {
    var start = nodey.start;
    var end = nodey.end;

    for (var i = start.line; i < end.line + 1; i++) {
      if (!lines[i]) lines[i] = [];
      lines[i].push(nodey);
    }

    nodey.content.forEach((name: string) => {
      var child = this._historyModel.getNodey(name) as NodeyCode;
      lines = this.getNodesByLine(child, lines);
    });

    return lines;
  }

  public renderNode(nodey: Nodey): any {
    if (nodey instanceof NodeyCode) return this.renderCodeNode(nodey);
    else if (nodey instanceof NodeyMarkdown)
      return this.renderMarkdownNode(nodey);
    else if (nodey instanceof NodeyOutput) return this.renderOutputNode(nodey);
  }

  private renderCodeNode(nodey: NodeyCode): string {
    var literal = nodey.literal || "";
    if (nodey.content) {
      nodey.content.forEach(name => {
        if (name instanceof SyntaxToken) {
          literal += name.tokens;
        } else {
          var child = this._historyModel.getNodey(name);
          literal += this.renderCodeNode(child as NodeyCode);
        }
      });
    }
    return literal;
  }

  private renderMarkdownNode(nodey: NodeyMarkdown): string {
    return nodey.markdown;
  }

  private renderOutputNode(nodey: NodeyOutput): string {
    return JSON.stringify(nodey.raw);
  }
}
