import { NotebookListen } from "./jupyter-hooks/notebook-listen";

import { nbformat } from "@jupyterlab/coreutils";

import { JSONObject } from "@phosphor/coreutils";

import {
  Nodey,
  NodeyCode,
  NodeyMarkdown,
  NodeyOutput,
  SyntaxToken,
  NodeyCodeCell
} from "./nodey";

import { Run, CellRunData, ChangeType } from "./run";

import { CodeCell } from "@jupyterlab/cells";

import { HistoryModel } from "./history-model";

import { CellListen } from "./jupyter-hooks/cell-listen";

import { ASTUtils } from "./analysis/ast-utils";

import { RenderBaby } from "./jupyter-hooks/render-baby";

import { Signal } from "@phosphor/signaling";
import { CodeMirrorEditor } from "@jupyterlab/codemirror";

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

  public diffNodey(
    nodey: NodeyCode,
    prior: NodeyCode,
    changeAcc: NodeChangeDesc[] = []
  ): NodeChangeDesc[] {
    // check for any nodes that where deleted or added between the prior version and this
    var children0 = prior.getChildren().sort();
    var children1 = nodey.getChildren().sort();
    var max = Math.max(children0.length, children1.length);
    if (max === 0) {
      //both are literals
      if (prior.literal != nodey.literal)
        changeAcc.push(this._literalChanged(prior, nodey));
      return changeAcc;
    }

    var i = 0;
    var j = 0;
    while (i < max || j < max) {
      var c0 = children0[i] as string;
      var c1 = children1[j] as string;

      if (!c0) {
        changeAcc.push(this._nodeAdded(c1));
        i++;
        j++;
      } else if (!c1) {
        changeAcc.push(this._nodeDeleted(c0));
        i++;
        j++;
      } else {
        let [n0, v0] = c0.split(".").map((n: string) => parseInt(n));
        let [n1, v1] = c1.split(".").map((n: string) => parseInt(n));

        if (n0 === n1) {
          //same node
          if (v0 !== v1)
            changeAcc = this.diffNodey(
              this._historyModel.getNodey(c1) as NodeyCode,
              this._historyModel.getNodey(c0) as NodeyCode,
              changeAcc
            );
          j++;
          i++;
        } else if (n0 > n1) {
          // n1 can't exist in children0, meaning it was added
          changeAcc.push(this._nodeAdded(c1));
          j++;
        } else if (n0 < n1) {
          //n0 can't exist in children1, meaning it was deleted
          changeAcc.push(this._nodeDeleted(c0));
          i++;
        }
      }
    }
    return changeAcc;
  }

  public getChangesInRun(
    nodey: NodeyCode,
    run: number,
    changeAcc: NodeChangeDesc[] = []
  ): NodeChangeDesc[] {
    //check each node in the version prior to this, if there is one
    // and see if any nodes where deleted or added
    var prior = this._historyModel.getPriorVersion(nodey) as NodeyCode;
    if (prior) changeAcc = this.diffNodey(nodey, prior, changeAcc);
    else {
      // this cell is all new
      console.log("has not prior!", nodey);
      changeAcc.push(this._nodeAdded(nodey.name));
    }
    return changeAcc;
  }

  private _nodeDeleted(name: string): NodeChangeDesc {
    var node = this._historyModel.getNodey(name) as NodeyCode;
    var text = this.renderNode(node);
    return {
      change: ChangeType.CELL_REMOVED,
      start: node.start,
      end: node.end,
      text: text
    };
  }

  private _nodeAdded(name: string): NodeChangeDesc {
    var node = this._historyModel.getNodey(name) as NodeyCode;
    return {
      change: ChangeType.CELL_ADDED,
      start: node.start,
      end: node.end
    };
  }

  private _literalChanged(prior: NodeyCode, nodey: NodeyCode): NodeChangeDesc {
    //TODO better comparison
    return {
      change: ChangeType.CELL_CHANGED,
      start: nodey.start,
      end: nodey.end,
      text: prior.literal
    };
  }

  public async produceNotebook(run: Run) {
    var totalChanges: number[] = [];
    var cells = run.cells.map((cellDat: CellRunData, cellIndex: number) => {
      var nodey = this._historyModel.getNodey(cellDat.node);
      console.log("found node?", cellDat.node, nodey);
      var jsn: nbformat.ICell = {
        cell_type: nodey.typeName,
        metadata: {},
        source: [] as string[]
      };
      if (cellDat.changeType !== ChangeType.CELL_SAME) {
        // this nodey was run
        jsn.metadata["change"] = cellDat.changeType;
        if (cellDat.changeType === ChangeType.CELL_CHANGED) {
          var changes = this.getChangesInRun(nodey as NodeyCode, run.id);
          jsn.metadata["edits"] = changes;
          for (var i = 0; i < changes.length; i++) {
            totalChanges.push(cellIndex);
          }
        }
      }
      var str = (this.renderNode(nodey) || "").split("\n");
      jsn.source = str.map((str: string, index: number) => {
        if (index !== jsn.source.length - 1) return str + "\n";
        else return str;
      });
      if (nodey instanceof NodeyCode) {
        jsn.execution_count = 0;
        var outputList: {}[] = [];
        nodey.output.map(dict => {
          console.log("output is ", dict);
          dict.out.forEach((outName: string) => {
            var outputNode = this._historyModel.getOutput(outName);
            outputList.push(outputNode.raw);
          });
        });
        jsn.outputs = []; //TODO outputList;
      }
      return jsn;
    });

    var metadata = this._notebook.metadata;
    let metaJsn = Object.create(null) as nbformat.INotebookMetadata;
    for (let key of metadata.keys()) {
      metaJsn[key] = JSON.parse(JSON.stringify(metadata.get(key)));
    }
    metaJsn["run"] = run.id;
    metaJsn["timestamp"] = run.timestamp;
    metaJsn["origin"] = this._notebook.name;
    metaJsn["totalChanges"] = totalChanges;

    var file = {
      cells: cells,
      metadata: metaJsn,
      nbformat_minor: this._notebook.nbformatMinor,
      nbformat: this._notebook.nbformat
    };

    /*var path = await this._historyModel.fileManager.writeGhostFile(
      this._notebook,
      this._historyModel,
      run.id,
      file
    );*/

    this._historyModel.fileManager.openGhost(file, this._notebook);
  }

  get target()
  {
    return this._target
  }

  get targetChanged(): Signal<this, Nodey> {
    return this._targetChanged;
  }

  get versionsOfTarget() {
    var nodeVerList = this._historyModel.getVersionsFor(this._target);
    console.log("Found versions", nodeVerList);
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

  public figureOutTarget(
    parent: NodeyCodeCell,
    cell: CodeCell,
    elem: HTMLElement
  ) {
    var codeBlock = this.findAncestor(elem, "CodeMirror-code");
    var lineCount = codeBlock.getElementsByClassName("CodeMirror-line").length;
    var lineDiv = this.findAncestor(elem, "CodeMirror-line");
    var lineNum = Math.round(
      (lineDiv.offsetTop / codeBlock.offsetHeight) * lineCount
    );
    var lineText = (cell.editor as CodeMirrorEditor).doc.getLine(lineNum);

    if (elem.hasAttribute("role")) {
      // a full line in Code Mirror
      var res = ASTUtils.findNodeAtRange(
        parent,
        {
          start: { line: lineNum, ch: 0 },
          end: { line: lineNum, ch: lineText.length - 2 }
        },
        this._historyModel
      );
      return res || parent; //just in case no more specific result is found
    } else {
      var spanRol = this.findAncestorByAttr(elem, "role");
      var startCh = Math.round(
        (elem.offsetLeft / spanRol.offsetWidth) * lineText.length
      );
      var endCh = Math.round(
        ((elem.offsetLeft + elem.offsetWidth) / spanRol.offsetWidth) *
          lineText.length
      );
      return ASTUtils.findNodeAtRange(
        parent,
        {
          start: { line: lineNum, ch: startCh },
          end: { line: lineNum, ch: endCh }
        },
        this._historyModel
      );
    }
  }

  private findAncestorByAttr(el: HTMLElement, attr: string) {
    if (el.hasAttribute(attr)) return el;
    while ((el = el.parentElement) && !el.hasAttribute(attr));
    return el;
  }

  private findAncestor(el: HTMLElement, cls: string) {
    if (el.classList.contains(cls)) return el;
    while ((el = el.parentElement) && !el.classList.contains(cls));
    return el;
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

export interface NodeChangeDesc extends JSONObject {
  change: number;
  start: { line: number; ch: number };
  end: { line: number; ch: number };
  text?: string;
}
