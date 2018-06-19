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

  public renderNode(nodey: Nodey): any {
    if (nodey instanceof NodeyCode) return this.renderCodeNode(nodey);
    else if (nodey instanceof NodeyMarkdown)
      return this.renderMarkdownNode(nodey);
    else if (nodey instanceof NodeyOutput) return this.renderOutputNode(nodey);
  }

  private renderCodeNode(nodey: NodeyCode): string {
    var literal = "";
    if (nodey.literal) literal = nodey.literal + " "; // add in spaceing
    if (nodey.content) {
      var priorLiteral = false;
      nodey.content.forEach(name => {
        if (name instanceof SyntaxToken) {
          if (!priorLiteral && literal != "") {
            literal = literal.substring(0, literal.length - 1) + name.tokens;
          } else {
            literal += name.tokens;
          }
          priorLiteral = true;
        } else {
          var child = this._historyModel.getNodey(name);
          literal += this.renderCodeNode(child as NodeyCode);
          priorLiteral = false;
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
