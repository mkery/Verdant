import { Widget } from "@phosphor/widgets";
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

import { ChangeType } from "./model/checkpoint";

import { CodeCell } from "@jupyterlab/cells";

import { History } from "./model/history";

import { ASTUtils } from "./analysis/ast-utils";

import { RenderBaby } from "./jupyter-hooks/render-baby";

import { Signal } from "@phosphor/signaling";
import { CodeMirrorEditor } from "@jupyterlab/codemirror";

const SEARCH_FILTER_RESULTS = "v-VerdantPanel-sample-searchResult";

export class Inspect {
  private history: History;
  private _targetChanged = new Signal<this, Nodey[]>(this);

  private _target: Nodey[];
  private renderBaby: RenderBaby;

  constructor(historyModel: History, renderBaby: RenderBaby) {
    this.history = historyModel;
    this.renderBaby = renderBaby;
  }

  get notebook() {
    return this.history.notebook;
  }

  public sampleNode(nodey: Nodey, textFocus: string = null): [string, number] {
    // goal get the first line of the node
    if (nodey instanceof NodeyMarkdown) {
      let lines = nodey.markdown.split("\n");
      if (textFocus) {
        let index = -1;
        let focusLine = lines.find(ln => {
          let i = ln
            .toLowerCase()
            .indexOf(textFocus.toLowerCase().split(" ")[0]);
          if (i > -1) index = i;
          return i > -1;
        });
        return [focusLine, index];
      } else return [lines[0], 0];
    } else {
      let nodeyCode = nodey as NodeyCode;
      if (textFocus) {
        let index = -1;
        let lines = this.renderNode(nodeyCode)
          .text.toLowerCase()
          .split("\n");
        let focusLine = lines.find(ln => {
          let i = ln.toLowerCase().indexOf(textFocus.split(" ")[0]);
          if (i > -1) index = i;
          return i > -1;
        });
        return [focusLine, index];
      } else {
        let lineNum = 0;
        if (nodeyCode.start) lineNum = nodeyCode.start.line;
        let line = "";
        return [this.getLineContent(lineNum, line, nodeyCode), 0];
      }
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
          var child = this.history.store.get(name) as NodeyCode;
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
    let prior = this.history.store.getPriorVersion(nodey);
    let newText = this.renderNode(nodey).text;
    if (!prior) return { added: newText.length, deleted: 0 };
    else {
      let priorText = this.renderNode(prior).text;
      let diff = JSDiff.diffWords(priorText, newText);
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
    sourceText: string,
    changeAcc: NodeChangeDesc[] = []
  ): NodeChangeDesc[] {
    // check for any nodes that where deleted or added between the prior version and this
    var children0 = prior.getChildren().sort();
    var children1 = nodey.getChildren().sort();
    var max = Math.max(children0.length, children1.length);
    if (max === 0) {
      //both are literals
      if (prior.literal != nodey.literal)
        changeAcc.push(this._literalChanged(prior, nodey, sourceText));
      return changeAcc;
    }

    var i = 0;
    var j = 0;
    while (i < max || j < max) {
      var c0 = children0[i] as string;
      var c1 = children1[j] as string;
      if (!c0 && !c1) {
        i++;
        j++;
      } else if (!c0) {
        changeAcc.push(this._nodeAdded(c1, sourceText));
        i++;
        j++;
      } else if (!c1) {
        changeAcc.push(this._nodeDeleted(c0, sourceText));
        i++;
        j++;
      } else {
        let [n0, v0] = c0.split(".").map((n: string) => parseInt(n));
        let [n1, v1] = c1.split(".").map((n: string) => parseInt(n));

        if (n0 === n1) {
          //same node
          if (v0 !== v1)
            changeAcc = this.diffNodey(
              this.history.store.get(c1) as NodeyCode,
              this.history.store.get(c0) as NodeyCode,
              sourceText,
              changeAcc
            );
          j++;
          i++;
        } else if (n0 > n1) {
          // n1 can't exist in children0, meaning it was added
          changeAcc.push(this._nodeAdded(c1, sourceText));
          j++;
        } else if (n0 < n1) {
          //n0 can't exist in children1, meaning it was deleted
          changeAcc.push(this._nodeDeleted(c0, sourceText));
          i++;
        }
      }
    }
    return changeAcc;
  }

  public getChangesInRun(
    nodey: NodeyCode,
    sourceText: string,
    changeAcc: NodeChangeDesc[] = []
  ): NodeChangeDesc[] {
    //check each node in the version prior to this, if there is one
    // and see if any nodes where deleted or added
    var prior = this.history.store.getPriorVersion(nodey) as NodeyCode;
    if (prior) changeAcc = this.diffNodey(nodey, prior, sourceText, changeAcc);
    else {
      // this cell is all new
      console.log("has not prior!", nodey);
      changeAcc.push(this._nodeAdded(nodey.name, sourceText));
    }
    return changeAcc;
  }

  private posFromText(textPos: number, text: string) {
    let snippet = text.slice(0, textPos + 1);
    let lines = snippet.split("\n");
    let ln = lines.length;
    let ch = lines[Math.max(lines.length - 1, 0)].length;
    return { line: ln, ch: ch };
  }

  private _nodeDeleted(name: string, sourceText: string): NodeChangeDesc {
    var node = this.history.store.get(name) as NodeyCode;
    var text = this.renderNode(node).text;
    if (node.start && node.end) {
      return {
        change: ChangeType.REMOVED,
        start: node.start,
        end: node.end,
        text: text
      };
    } else {
      let index = sourceText.indexOf(text);
      let start = this.posFromText(index, sourceText);
      let end = this.posFromText(index + text.length - 1, sourceText);
      return {
        change: ChangeType.REMOVED,
        start: start,
        end: end,
        text: text
      };
    }
  }

  private _nodeAdded(name: string, sourceText: string): NodeChangeDesc {
    var node = this.history.store.get(name) as NodeyCode;
    console.log("NODE ADDED IS", name, node);
    var text = this.renderNode(node).text;
    if (node.start && node.end) {
      return {
        change: ChangeType.ADDED,
        start: node.start,
        end: node.end,
        text: text
      };
    } else {
      let index = sourceText.indexOf(text); //TODO fix so don't need to recalculate?
      let start = this.posFromText(index, sourceText);
      let end = this.posFromText(index + text.length, sourceText);
      return {
        change: ChangeType.ADDED,
        start: start,
        end: end,
        text: text
      };
    }
  }

  private _literalChanged(
    prior: NodeyCode,
    node: NodeyCode,
    sourceText: string
  ): NodeChangeDesc {
    var text = this.renderNode(node).text;
    if (node.start && node.end) {
      return {
        change: ChangeType.CHANGED,
        start: node.start,
        end: node.end,
        text: prior.literal
      };
    } else {
      let index = sourceText.indexOf(text); //TODO fix so don't need to recalculate?
      let start = this.posFromText(index, sourceText);
      let end = this.posFromText(index + text.length, sourceText);
      return {
        change: ChangeType.CHANGED,
        start: start,
        end: end,
        text: prior.literal
      };
    }
    //TODO better comparison
  }

  private getTypeName(nodey: Nodey) {
    if (nodey instanceof NodeyCode) return "code";
    else if (nodey instanceof NodeyMarkdown) return "markdown";
  }

  public async produceNotebook(version: number): Promise<boolean> {
    let events = this.history.checkpoints.getByNotebook(version);
    let notebook = this.history.store.getNotebook(version);

    let cells = notebook.cells.map((name: string) => {
      let nodey = this.history.store.get(name);
      let typeName = this.getTypeName(nodey);
      let jsn: nbformat.ICell = {
        cell_type: typeName,
        metadata: { nodey: nodey.name },
        source: [] as string[]
      };
      let sourceText = this.renderNode(nodey).text || "";
      /*if (cellDat.changeType !== ChangeType.SAME) {
        // this nodey was run
        jsn.metadata["change"] = cellDat.changeType;
        if (cellDat.changeType === ChangeType.CHANGED) {
          var changes = this.getChangesInRun(nodey as NodeyCode, sourceText);
          jsn.metadata["edits"] = changes;
          for (var i = 0; i < changes.length; i++) {
            totalChanges.push(cellIndex);
          }
        }
      }*/
      let str = sourceText.split("\n");
      jsn.source = str.map((str: string, index: number) => {
        if (index !== jsn.source.length - 1) return str + "\n";
        else return str;
      });
      if (nodey instanceof NodeyCode) {
        jsn.execution_count = 0;
        let output = this.history.store.get(nodey.output) as NodeyOutput;
        jsn.outputs = output.raw;
      }
      return jsn;
    });

    var metadata = this.notebook.metadata;
    let metaJsn = Object.create(null) as nbformat.INotebookMetadata;
    for (let key of metadata.keys()) {
      metaJsn[key] = JSON.parse(JSON.stringify(metadata.get(key)));
    }
    metaJsn["timestamp"] = events[0].timestamp;
    metaJsn["origin"] = version;

    var file = {
      cells: cells,
      metadata: metaJsn,
      nbformat_minor: this.notebook.view.nbformatMinor,
      nbformat: this.notebook.view.nbformat
    };

    return this.history.store.fileManager.openGhost(file, this.notebook);
  }

  get target() {
    if (!this._target) {
      if (this.notebook.view.activeCell) {
        this._target = [
          this.notebook.getCell(this.notebook.view.activeCell.model)
            .lastSavedModel
        ];
      }
    }
    return this._target;
  }

  get targetChanged(): Signal<this, Nodey[]> {
    return this._targetChanged;
  }

  public clearTarget() {
    this._target = null;
  }

  versionsOfTarget(target: Nodey[]) {
    let t = target || this._target;
    var nodeVerList = t.map(item => {
      return this.history.store.getHistoryOf(item);
    });
    //console.log("Found versions", nodeVerList);
    var recovered: { version: string; runs: any; text: string }[] = [];

    nodeVerList.map(targetList => {
      targetList.versions.forEach((item: Nodey) =>
        recovered.push(this.renderNode(item))
      );
    });
    return recovered;
  }

  changeTarget(nodey: Nodey[]) {
    //this.history.dump();
    console.log("new target!", nodey);
    this._target = nodey;
    this._targetChanged.emit(this._target);
  }

  public figureOutTarget(
    parent: NodeyCodeCell,
    cell: CodeCell,
    elem: HTMLElement
  ) {
    //console.log("figuring out target");
    let codeBlock = this.findAncestor(elem, "CodeMirror-code");
    let lineCount = codeBlock.getElementsByClassName("CodeMirror-line").length;
    let lineDiv = this.findAncestor(elem, "CodeMirror-line");
    let lineNum = Math.round(
      (lineDiv.offsetTop / codeBlock.offsetHeight) * lineCount
    );
    let lineText = (cell.editor as CodeMirrorEditor).doc.getLine(lineNum);
    let res;
    let startCh = 0;
    let endCh = lineText.length - 2;

    if (!elem.hasAttribute("role")) {
      // not a full line in Code Mirror
      let spanRol = this.findAncestorByAttr(elem, "role");
      startCh = Math.round(
        (elem.offsetLeft / spanRol.offsetWidth) * lineText.length
      );
      endCh = Math.round(
        ((elem.offsetLeft + elem.offsetWidth) / spanRol.offsetWidth) *
          lineText.length
      );
    }
    //console.log("CH IS", elem, lineNum, startCh, endCh);

    res = ASTUtils.findNodeAtRange(
      parent,
      {
        start: { line: lineNum, ch: startCh },
        end: { line: lineNum, ch: endCh }
      },
      this.history
    );
    return res || parent; //just in case no more specific result is found
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
  ): { version: string; runs: any; text: string } {
    if (nodey instanceof NodeyCode)
      return {
        version: nodey.name,
        runs: nodey.created,
        text: this.renderCodeNode(nodey)
      };
    else if (nodey instanceof NodeyMarkdown)
      return {
        version: nodey.name,
        runs: nodey.created,
        text: this.renderMarkdownNode(nodey)
      };
    else if (nodey instanceof NodeyOutput)
      return {
        version: nodey.name,
        runs: nodey.created,
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
          var child = this.history.store.get(name);
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
    diffKind: number = Inspect.NO_DIFF,
    textFocus: string = null
  ) {
    console.log("rendering code versions!", this.history.dump());
    if (diffKind === Inspect.NO_DIFF) elem.textContent = newText;
    else if (diffKind === Inspect.CHANGE_DIFF) {
      let prior = this.history.store.getPriorVersion(nodey) as NodeyCode;
      if (!prior) {
        // easy, everything is added
        elem.textContent = newText;
        elem.classList.add(Inspect.CHANGE_ADDED_CLASS);
      } else {
        let priorText = this.renderCodeNode(prior);
        //console.log("vers are", nodey, prior, priorText);
        let diff = JSDiff.diffWords(priorText, newText);
        let innerHTML = "";
        diff.forEach(part => {
          let partDiv = document.createElement("span");
          //console.log("DIFF", part);
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

    if (textFocus) {
      elem = this.highlightText(textFocus, elem);
    }
  }

  public async renderMarkdownVersionDiv(
    nodey: NodeyMarkdown,
    newText: string,
    elem: HTMLElement,
    diffKind: number = Inspect.NO_DIFF,
    textFocus: string = null
  ) {
    if (diffKind === Inspect.NO_DIFF)
      await this.renderBaby.renderMarkdown(elem, newText);
    else if (diffKind === Inspect.CHANGE_DIFF) {
      let prior = this.history.store.getPriorVersion(nodey) as NodeyMarkdown;
      if (!prior) {
        // easy, everything is added
        await this.renderBaby.renderMarkdown(elem, newText);
        elem.classList.add(Inspect.CHANGE_ADDED_CLASS);
      } else {
        let priorText = prior.markdown;
        let diff = JSDiff.diffWords(priorText, newText);
        await diff.forEach(async part => {
          let partDiv = document.createElement("div");
          await this.renderBaby.renderMarkdown(partDiv, part.value);
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

    if (textFocus) {
      elem = this.highlightText(textFocus, elem);
    }
    return elem;
  }

  public async renderOutputVerisonDiv(
    nodey: NodeyOutput,
    elem: HTMLElement,
    textFocus: string = null
  ) {
    let widgetList = await this.renderBaby.renderOutput(nodey);
    widgetList.forEach((widget: Widget) => {
      elem.appendChild(widget.node);
    });

    if (textFocus) {
      elem = this.highlightText(textFocus, elem);
    }
    return elem;
  }

  private highlightText(textFocus: string, elem: HTMLElement) {
    let i = 0;
    let split = textFocus.split(" ");
    let keys = textFocus.toLowerCase().split(" ");
    let lower = elem.innerHTML.toLowerCase();
    let index = lower.indexOf(keys[0], i);
    let html = "";
    //console.log("Index is ", index, lower, keys[0]);
    while (index > -1) {
      html +=
        elem.innerHTML.slice(i, index) +
        '<span class="' +
        SEARCH_FILTER_RESULTS +
        '">' +
        split[0] +
        "</span>";
      i = index + split[0].length;
      index = lower.indexOf(keys[0], i);
    }

    html += elem.innerHTML.slice(i);
    elem.innerHTML = html;
    return elem;
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
