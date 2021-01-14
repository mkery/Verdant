import { History } from "../history";

import { log } from "../notebook";
import {
  Nodey,
  NodeyCell,
  NodeyCode,
  NodeyCodeCell,
  SyntaxToken,
} from "../nodey";

import { CodeCell, Cell } from "@jupyterlab/cells";

import { ASTUtils } from "../analysis/ast-utils";

import { Signal } from "@lumino/signaling";

export class Target {
  readonly history: History;
  private _targetChanged = new Signal<this, Nodey>(this);
  private _target: Nodey | null = null;

  constructor(history: History) {
    this.history = history;
  }

  dispose() {
    Signal.clearData(this);
  }

  get notebook() {
    return this.history.notebook;
  }

  public get() {
    if (!this._target) {
      if (this.notebook.view.activeCell) {
        this._target =
          this.notebook.getCell(this.notebook.view.activeCell.model)?.model ||
          null;
      }
    }
    return this._target;
  }

  public set(nodey: Nodey) {
    log("new target!", nodey);
    this._target = nodey;
    this._targetChanged.emit(this._target);
  }

  public changed(): Signal<this, Nodey> {
    return this._targetChanged;
  }

  public clear() {
    this._target = null;
  }

  public figureOutTarget(
    parent: NodeyCell,
    cell: Cell,
    elem: HTMLElement | string
  ) {
    if (parent instanceof NodeyCodeCell) {
      if (elem instanceof HTMLElement)
        return this.figureOut_byElem(parent, cell as CodeCell, elem);
      else {
        let res = this.figureOut_byText(parent, elem);
        if (res instanceof NodeyCode) return res;
        else return undefined;
      }
    } else return parent;
  }

  private figureOut_byText(
    parent: NodeyCode,
    text: string
  ): string | NodeyCode {
    let rend = "";
    if (parent.literal) {
      rend = parent.literal;
    } else if (parent.content.length > 0) {
      for (var i = 0; i < parent.content.length; i++) {
        let name = parent.content[i];
        if (name instanceof SyntaxToken) rend += name.tokens;
        else {
          let nodey = this.history.store.get(name) as NodeyCode;
          let res: string | NodeyCode = this.figureOut_byText(nodey, text);
          if (res instanceof Nodey) return res;
          else rend += res + "";
        }
      }
    }
    if (rend === text || rend.indexOf(text) > -1) return parent;
    else return rend;
  }

  private figureOut_byElem(
    parent: NodeyCodeCell,
    cell: CodeCell,
    elem: HTMLElement
  ) {
    log("figuring out target");
    let codeBlock = this.findAncestor(elem, "CodeMirror-code");
    let lineCount = codeBlock.getElementsByClassName("CodeMirror-line").length;
    let lineDiv = this.findAncestor(elem, "CodeMirror-line");
    let lineNum = Math.round(
      (lineDiv.offsetTop / codeBlock.offsetHeight) * lineCount
    );
    let lineText = cell?.editor?.getLine(lineNum) || "";
    let res;
    let startCh = 0;
    let endCh = lineText.length - 1;

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
      endCh = Math.min(endCh, lineText.length - 1);
    }

    res = ASTUtils.findNodeAtRange(
      parent,
      {
        start: { line: lineNum, ch: startCh },
        end: { line: lineNum, ch: endCh },
      },
      this.history
    );
    return res || parent; //just in case no more specific result is found
  }

  private findAncestorByAttr(el: HTMLElement, attr: string) {
    if (el.hasAttribute(attr)) return el;
    while (
      el.parentElement &&
      (el = el.parentElement) &&
      !el.hasAttribute(attr)
    );
    return el;
  }

  private findAncestor(el: HTMLElement, cls: string) {
    if (el.classList.contains(cls)) return el;
    while (
      el.parentElement &&
      (el = el.parentElement) &&
      !el.classList.contains(cls)
    );
    return el;
  }
}
