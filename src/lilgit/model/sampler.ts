import { Widget } from "@phosphor/widgets";

import * as JSDiff from "diff";

import {
  Nodey,
  NodeyCode,
  NodeyMarkdown,
  NodeyOutput,
  SyntaxToken,
  NodeyCodeCell
} from "./nodey";

import { CodeCell } from "@jupyterlab/cells";

import { History } from "./history";

import { ASTUtils } from "../analysis/ast-utils";

import { RenderBaby } from "../jupyter-hooks/render-baby";

import { Signal } from "@phosphor/signaling";
import { CodeMirrorEditor } from "@jupyterlab/codemirror";

const SEARCH_FILTER_RESULTS = "v-VerdantPanel-sample-searchResult";
const CHANGE_NONE_CLASS = "v-Verdant-sampler-code-same";
const CHANGE_ADDED_CLASS = "v-Verdant-sampler-code-added";
const CHANGE_REMOVED_CLASS = "v-Verdant-sampler-code-removed";

export class Sampler {
  readonly history: History;
  private readonly renderBaby: RenderBaby;
  private _targetChanged = new Signal<this, Nodey>(this);
  private _target: Nodey;

  constructor(historyModel: History, renderBaby: RenderBaby) {
    this.history = historyModel;
    this.renderBaby = renderBaby;
  }

  get notebook() {
    return this.history.notebook;
  }

  public get target() {
    if (!this._target) {
      if (this.notebook.view.activeCell) {
        this._target = this.notebook.getCell(
          this.notebook.view.activeCell.model
        ).lastSavedModel;
      }
    }
    return this._target;
  }

  public set target(nodey: Nodey) {
    //console.log("new target!", nodey);
    this._target = nodey;
    this._targetChanged.emit(this._target);
  }

  get targetChanged(): Signal<this, Nodey> {
    return this._targetChanged;
  }

  public clearTarget() {
    this._target = null;
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

  public sampleNode(nodey: Nodey, textFocus: string = null): [string, number] {
    // goal get the first line of the node
    if (nodey instanceof NodeyMarkdown) {
      if (!nodey.markdown) return ["", 0];
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
          .toLowerCase()
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

  public renderNode(nodey: Nodey): string {
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

  private renderOutputNode(nodey: NodeyOutput): string {
    return JSON.stringify(nodey.raw);
  }

  public async renderDiff(
    nodey: Nodey,
    elem: HTMLElement,
    options: {
      newText?: string;
      diffKind?: number;
      textFocus?: string;
    } = {}
  ) {
    if (nodey instanceof NodeyCode) this.diffCode(nodey, elem, options);
    else if (nodey instanceof NodeyMarkdown)
      this.diffMarkdown(nodey, elem, options);
    else if (nodey instanceof NodeyOutput) this.diffOutput(nodey, elem);

    if (options.textFocus) {
      elem = this.highlightText(options.textFocus, elem);
    }
    return elem;
  }

  private diffCode(
    nodey: NodeyCode,
    elem: HTMLElement,
    opts: {
      newText?: string;
      diffKind?: number;
      textFocus?: string;
    }
  ) {
    let diffKind = opts.diffKind;
    if (opts.diffKind === undefined) diffKind = Sampler.NO_DIFF;

    if (diffKind === Sampler.NO_DIFF) elem.textContent = opts.newText;
    else if (diffKind === Sampler.CHANGE_DIFF) {
      let prior = this.history.store.getPriorVersion(nodey) as NodeyCode;
      if (!prior) {
        // easy, everything is added
        elem.textContent = opts.newText;
        //elem.classList.add(Sampler.CHANGE_ADDED_CLASS);
      } else {
        let priorText = this.renderCodeNode(prior);
        //console.log("vers are", nodey, prior, priorText);
        let diff = JSDiff.diffWords(priorText, opts.newText);
        let innerHTML = "";
        diff.forEach(part => {
          let partDiv = document.createElement("span");
          //console.log("DIFF", part);
          partDiv.textContent = part.value;
          if (part.added) {
            partDiv.classList.add(CHANGE_ADDED_CLASS);
            innerHTML += partDiv.outerHTML;
          } else if (part.removed) {
            partDiv.classList.add(CHANGE_REMOVED_CLASS);
            innerHTML += partDiv.outerHTML;
          } else {
            innerHTML += part.value;
          }
        });
        //console.log(innerHTML);
        elem.innerHTML = innerHTML;
      }
    }

    return elem;
  }

  private async diffMarkdown(
    nodey: NodeyMarkdown,
    elem: HTMLElement,
    opts: {
      newText?: string;
      diffKind?: number;
      textFocus?: string;
    }
  ) {
    let diffKind = opts.diffKind;
    if (opts.diffKind === undefined) diffKind = Sampler.NO_DIFF;

    if (diffKind === Sampler.NO_DIFF)
      await this.renderBaby.renderMarkdown(elem, opts.newText);
    else if (diffKind === Sampler.CHANGE_DIFF) {
      let prior = this.history.store.getPriorVersion(nodey) as NodeyMarkdown;
      if (!prior) {
        // easy, everything is added
        await this.renderBaby.renderMarkdown(elem, opts.newText);
        elem.classList.add(CHANGE_ADDED_CLASS);
      } else {
        let priorText = prior.markdown;
        let diff = JSDiff.diffWords(priorText, opts.newText);
        await diff.forEach(async part => {
          let partDiv = document.createElement("div");
          await this.renderBaby.renderMarkdown(partDiv, part.value);
          partDiv.classList.add(CHANGE_NONE_CLASS);

          if (part.added) {
            partDiv.classList.add(CHANGE_ADDED_CLASS);
          } else if (part.removed) {
            partDiv.classList.add(CHANGE_REMOVED_CLASS);
          }

          elem.appendChild(partDiv);
        });
      }
    }

    return elem;
  }

  private async diffOutput(nodey: NodeyOutput, elem: HTMLElement) {
    let widgetList = await this.renderBaby.renderOutput(nodey);
    widgetList.forEach((widget: Widget) => {
      elem.appendChild(widget.node);
    });

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

export namespace Sampler {
  export const NO_DIFF = -1;
  export const CHANGE_DIFF = 0;
}
