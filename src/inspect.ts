import { NotebookListen } from "./jupyter-hooks/notebook-listen";

import { PromiseDelegate } from "@phosphor/coreutils";

import { nbformat } from "@jupyterlab/coreutils";

import { JSONObject } from "@phosphor/coreutils";

import * as JSDiff from "diff";

import {
  Nodey,
  NodeyCode,
  NodeyCell,
  NodeyMarkdown,
  NodeyOutput,
  SyntaxToken,
  NodeyCodeCell
} from "./model/nodey";

import { Run, CellRunData, ChangeType } from "./model/run";

import { CodeCell } from "@jupyterlab/cells";

import { HistoryModel } from "./model/history";

import { CellListen } from "./jupyter-hooks/cell-listen";

import { ASTUtils } from "./analysis/ast-utils";

import { RenderBaby } from "./jupyter-hooks/render-baby";

import { Signal } from "@phosphor/signaling";
import { CodeMirrorEditor } from "@jupyterlab/codemirror";

export class Inspect {
  private _ready = new PromiseDelegate<void>();
  private _notebook: NotebookListen;
  private _historyModel: HistoryModel;
  private _targetChanged = new Signal<this, Nodey>(this);
  private _cellStructureChanged = new Signal<this, [number, NodeyCell]>(this);
  private _target: Nodey;
  private renderBaby: RenderBaby;

  constructor(historyModel: HistoryModel, renderBaby: RenderBaby) {
    this._historyModel = historyModel;
    this.renderBaby = renderBaby;
  }

  set notebook(notebook: NotebookListen) {
    this._notebook = notebook;
    this._notebook.activeCellChanged.connect((_: any, cell: CellListen) => {
      this.changeTarget([cell.nodey]);
    });
    this._notebook.cellStructureChanged.connect(
      (_: any, cell: [number, CellListen]) => {
        this._cellStructureChanged.emit([cell[0], cell[1].nodey]);
      }
    );
    this._ready.resolve(undefined);
  }

  get ready(): Promise<void> {
    return this._ready.promise;
  }

  public sampleNode(nodey: Nodey): string {
    // goal get the first line of the node
    if (nodey instanceof NodeyMarkdown) {
      let lines = nodey.markdown.split("\n");
      return lines[0];
    } else {
      let nodeyCode = nodey as NodeyCode;
      let lineNum = 0;
      if (nodeyCode.start) lineNum = nodeyCode.start.line;
      let line = "";
      return this.getLineContent(lineNum, line, nodeyCode);
    }
  }

  private getLineContent(
    lineNum: number,
    line: string,
    nodeyCode: NodeyCode
  ): string {
    if (nodeyCode.literal) {
      line += nodeyCode.literal.split("\n")[0];
    } else if (nodeyCode.content) {
      nodeyCode.content.forEach(name => {
        if (name instanceof SyntaxToken) {
          line += name.tokens;
        } else {
          var child = this._historyModel.getNodey(name) as NodeyCode;
          if (child.start) {
            if (child.start.line === lineNum)
              line = this.getLineContent(lineNum, line, child);
          } else {
            line = this.getLineContent(lineNum, line, child);
            let ls = line.split("\n");
            if (ls.length > 1) return ls[0];
          }
        }
      });
    }
    return line;
  }

  public getRunChangeCount(
    nodey: NodeyCell
  ): { added: number; deleted: number } {
    let prior = this._historyModel.getPriorVersion(nodey);
    let newText = this.renderNode(nodey).text;
    if (!prior) return { added: newText.length, deleted: 0 };
    else {
      let priorText = this.renderNode(prior).text;
      let diff = JSDiff.diffChars(priorText, newText);
      let added = 0;
      let deleted = 0;
      diff.forEach(part => {
        if (part.added) added += part.value.length;
        if (part.removed) deleted += part.value.length;
      });
      return { added, deleted };
    }
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
    _: number,
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
    var text = this.renderNode(node).text;
    return {
      change: ChangeType.REMOVED,
      start: node.start,
      end: node.end,
      text: text
    };
  }

  private _nodeAdded(name: string): NodeChangeDesc {
    var node = this._historyModel.getNodey(name) as NodeyCode;
    var text = this.renderNode(node).text;
    return {
      change: ChangeType.ADDED,
      start: node.start,
      end: node.end,
      text: text
    };
  }

  private _literalChanged(prior: NodeyCode, nodey: NodeyCode): NodeChangeDesc {
    //TODO better comparison
    return {
      change: ChangeType.CHANGED,
      start: nodey.start,
      end: nodey.end,
      text: prior.literal
    };
  }

  public async produceNotebook(run: Run): Promise<boolean> {
    var totalChanges: number[] = [];
    var cells = run.cells.map((cellDat: CellRunData, cellIndex: number) => {
      var nodey = this._historyModel.getNodey(cellDat.node);
      console.log("found node?", cellDat.node, nodey);
      var jsn: nbformat.ICell = {
        cell_type: nodey.typeName,
        metadata: { nodey: nodey.name },
        source: [] as string[]
      };
      if (cellDat.changeType !== ChangeType.SAME) {
        // this nodey was run
        jsn.metadata["change"] = cellDat.changeType;
        if (cellDat.changeType === ChangeType.CHANGED) {
          var changes = this.getChangesInRun(nodey as NodeyCode, run.id);
          jsn.metadata["edits"] = changes;
          for (var i = 0; i < changes.length; i++) {
            totalChanges.push(cellIndex);
          }
        }
      }
      var str = (this.renderNode(nodey).text || "").split("\n");
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

    return this._historyModel.fileManager.openGhost(file, this._notebook);
  }

  get target() {
    return this._target;
  }

  get cellStructureChanged(): Signal<this, [number, NodeyCell]> {
    return this._cellStructureChanged;
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

  public renderNode(
    nodey: Nodey
  ): { version: number; runs: any; text: string } {
    if (nodey instanceof NodeyCode)
      return {
        version: parseInt(nodey.version),
        runs: nodey.run,
        text: this.renderCodeNode(nodey)
      };
    else if (nodey instanceof NodeyMarkdown)
      return {
        version: parseInt(nodey.version),
        runs: nodey.run,
        text: this.renderMarkdownNode(nodey)
      };
    else if (nodey instanceof NodeyOutput)
      return {
        version: parseInt(nodey.version),
        runs: nodey.run,
        text: this.renderOutputNode(nodey)
      };
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

  public renderOutputNode(nodey: NodeyOutput): string {
    return JSON.stringify(nodey.raw);
  }

  public renderCodeVerisonDiv(
    nodey: NodeyCode,
    newText: string,
    elem: HTMLElement,
    diffKind: number = Inspect.NO_DIFF
  ) {
    console.log("rendering code versions!", this._historyModel.dump());
    if (diffKind === Inspect.NO_DIFF) elem.textContent = newText;
    else if (diffKind === Inspect.CHANGE_DIFF) {
      let prior = this._historyModel.getPriorVersion(nodey) as NodeyCode;
      if (!prior) {
        // easy, everything is added
        elem.textContent = newText;
        elem.classList.add(Inspect.CHANGE_ADDED_CLASS);
      } else {
        let priorText = this.renderCodeNode(prior);
        console.log("vers are", nodey, prior, priorText);
        let diff = JSDiff.diffChars(priorText, newText);
        let innerHTML = "";
        diff.forEach(part => {
          let partDiv = document.createElement("span");
          console.log("DIFF", part);
          partDiv.textContent = part.value;
          if (part.added) {
            partDiv.classList.add(Inspect.CHANGE_ADDED_CLASS);
            innerHTML += partDiv.outerHTML;
          } else if (part.removed) {
            partDiv.classList.add(Inspect.CHANGE_REMOVED_CLASS);
            innerHTML += partDiv.outerHTML;
          } else {
            innerHTML += part.value;
          }
        });
        //console.log(innerHTML);
        elem.innerHTML = innerHTML;
      }
    }
  }

  public renderMarkdownVersionDiv(
    nodey: NodeyMarkdown,
    newText: string,
    elem: HTMLElement,
    diffKind: number = Inspect.NO_DIFF
  ) {
    if (diffKind === Inspect.NO_DIFF)
      this.renderBaby.renderMarkdown(elem, newText);
    else if (diffKind === Inspect.CHANGE_DIFF) {
      let prior = this._historyModel.getPriorVersion(nodey) as NodeyMarkdown;
      if (!prior) {
        // easy, everything is added
        this.renderBaby.renderMarkdown(elem, newText);
        elem.classList.add(Inspect.CHANGE_ADDED_CLASS);
      } else {
        let priorText = prior.markdown;
        let diff = JSDiff.diffChars(priorText, newText);
        diff.forEach(part => {
          let partDiv = document.createElement("div");
          this.renderBaby.renderMarkdown(partDiv, part.value);
          partDiv.classList.add(Inspect.CHANGE_NONE_CLASS);

          if (part.added) {
            partDiv.classList.add(Inspect.CHANGE_ADDED_CLASS);
          } else if (part.removed) {
            partDiv.classList.add(Inspect.CHANGE_REMOVED_CLASS);
          }

          elem.appendChild(partDiv);
        });
      }
    }
  }
}

export interface NodeChangeDesc extends JSONObject {
  change: number;
  start: { line: number; ch: number };
  end: { line: number; ch: number };
  text?: string;
}

export namespace Inspect {
  export const CHANGE_NONE_CLASS = "v-Verdant-inspect-code-same";
  export const CHANGE_ADDED_CLASS = "v-Verdant-inspect-code-added";
  export const CHANGE_REMOVED_CLASS = "v-Verdant-inspect-code-removed";

  export const NO_DIFF = -1;
  export const CHANGE_DIFF = 0;
  export const CURRENT_DIFF = 1;
}
