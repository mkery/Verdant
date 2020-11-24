import { Widget } from "@lumino/widgets";
import {
  Nodey,
  NodeyCode,
  NodeyCell,
  NodeyMarkdown,
  NodeyOutput,
  SyntaxToken,
} from "../nodey";

import { History } from "../history";
import { RenderBaby } from "../jupyter-hooks/render-baby";

import { Target } from "./target";
import { Search } from "./search";
import { DIFF_TYPE, Diff } from "./diff";

export class Sampler {
  readonly history: History;
  readonly search: Search;
  readonly renderBaby: RenderBaby;
  readonly target: Target;
  private readonly diff: Diff;

  constructor(historyModel: History, renderBaby: RenderBaby) {
    this.history = historyModel;
    this.renderBaby = renderBaby;
    this.target = new Target(historyModel);
    this.search = new Search(this);
    this.diff = new Diff(this);
  }

  public async renderDiff(
    nodey: NodeyCell,
    elem: HTMLElement,
    diffKind: number = DIFF_TYPE.NO_DIFF,
    relativeToNotebook?: number
  ) {
    return this.diff.renderDiffCell(nodey, elem, diffKind, relativeToNotebook);
  }

  public sampleNode(nodey: Nodey, textFocus?: string): [string, number] {
    // goal get the first line of the node
    if (nodey instanceof NodeyMarkdown) {
      if (!nodey.markdown) return ["", 0];
      let lines = nodey.markdown.split("\n");
      if (textFocus) {
        let index = -1;
        let focusLine =
          lines.find((ln) => {
            let i = ln
              .toLowerCase()
              .indexOf(textFocus.toLowerCase().split(" ")[0]);
            if (i > -1) index = i;
            return i > -1;
          }) || "";
        return [focusLine, index];
      } else return [lines[0], 0];
    } else {
      let nodeyCode = nodey as NodeyCode;
      if (textFocus) {
        let index = -1;
        let lines = this.renderNode(nodeyCode).toLowerCase().split("\n");
        let focusLine =
          lines.find((ln) => {
            let i = ln.toLowerCase().indexOf(textFocus.split(" ")[0]);
            if (i > -1) index = i;
            return i > -1;
          }) || "";
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
      nodeyCode.content.forEach((name) => {
        if (name instanceof SyntaxToken) {
          line += name.tokens;
        } else {
          var child = this.history.store.get(name) as NodeyCode;
          if (child.start && child.start.line === lineNum) {
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
    return "";
  }

  public renderCodeNode(nodey: NodeyCode): string {
    let literal = nodey.literal || "";
    if (nodey.content) {
      nodey.content.forEach((name) => {
        if (name instanceof SyntaxToken) {
          literal += name.tokens;
        } else {
          let child = this.history.store.get(name);
          literal += this.renderCodeNode(child as NodeyCode);
        }
      });
    }
    return literal;
  }

  private renderMarkdownNode(nodey: NodeyMarkdown): string {
    return nodey.markdown || "";
  }

  private renderOutputNode(nodey: NodeyOutput): string {
    return nodey.raw.map((out) => out.text || "").join();
  }

  public async renderArtifactCell(
    nodey: Nodey,
    elem: HTMLElement,
    newText: string = ""
  ) {
    switch (nodey.typeChar) {
      case "c":
        this.plainCode(elem, newText);
        break;
      case "o":
        await this.renderOutput(nodey as NodeyOutput, elem);
        break;
      case "m":
        await this.renderBaby.renderMarkdown(elem, newText);
        break;
    }
    return elem;
  }

  // Methods for rendering code cells

  public plainCode(elem: HTMLElement, newText: string) {
    /* Inserts code data to elem */

    // Split new text into lines
    newText.split("\n").forEach((line) => {
      // Append a div with line contents to elem
      let div = document.createElement("div");
      div.innerHTML = line;
      elem.appendChild(div);
    });

    return elem;
  }

  // Methods for rendering output cells

  private async renderOutput(nodey: NodeyOutput, elem: HTMLElement) {
    let widgetList = await this.renderBaby.renderOutput(nodey);
    widgetList.forEach((widget: Widget) => {
      elem.appendChild(widget.node);
    });
    return elem;
  }
}
