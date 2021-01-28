import { Widget } from "@lumino/widgets";
import {
  Nodey,
  NodeyCode,
  NodeyMarkdown,
  NodeyOutput,
  NodeyRawCell,
  SyntaxToken,
} from "../nodey";

import { History } from "../history";
import { RenderBaby } from "../jupyter-hooks/render-baby";

import { Target } from "./target";
import { Search } from "./search";
import { Diff } from "./diff";

const INSPECT_VERSION = "v-VerdantPanel-sampler-version";
const INSPECT_VERSION_CONTENT = "v-VerdantPanel-sampler-version-content";

export class Sampler {
  readonly history: History;
  readonly search: Search;
  readonly renderBaby: RenderBaby;
  readonly target: Target;
  readonly diff: Diff;

  constructor(historyModel: History, renderBaby: RenderBaby) {
    this.history = historyModel;
    this.renderBaby = renderBaby;
    this.target = new Target(historyModel);
    this.search = new Search(this);
    this.diff = new Diff(this);
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
        let lines = this.nodeToText(nodeyCode).toLowerCase().split("\n");
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

  public nodeToText(nodey: Nodey): string {
    if (nodey instanceof NodeyCode) return this.codeToText(nodey);
    else if (nodey instanceof NodeyMarkdown) return nodey.markdown || "";
    else if (nodey instanceof NodeyRawCell) return nodey.literal;
    else if (nodey instanceof NodeyOutput) return this.outputToText(nodey);
    return "";
  }

  public codeToText(nodey: NodeyCode): string {
    let literal = nodey.literal || "";
    if (nodey.content) {
      nodey.content.forEach((name) => {
        if (name instanceof SyntaxToken) {
          literal += name.tokens;
        } else {
          let child = this.history.store.get(name);
          literal += this.codeToText(child as NodeyCode);
        }
      });
    }
    return literal;
  }

  private outputToText(nodey: NodeyOutput): string {
    return nodey.raw
      .map((out) => this.renderBaby.plaintextOutput(out) || "")
      .join();
  }

  public async renderArtifactCell(nodey: Nodey, elem: HTMLElement) {
    if (nodey instanceof NodeyCode) {
      this.plainCode(elem, nodey.literal);
    } else if (nodey instanceof NodeyOutput) {
      await this.renderOutput(nodey, elem);
    } else if (nodey instanceof NodeyMarkdown) {
      await this.renderBaby.renderMarkdown(elem, nodey.markdown);
    } else if (nodey instanceof NodeyRawCell) {
      this.plainCode(elem, nodey.literal);
    }
    return elem;
  }

  // Methods for rendering code cells

  public plainCode(elem: HTMLElement, newText: string) {
    /* Inserts code data to elem */

    // Split new text into lines
    newText?.split("\n").forEach((line) => {
      // Append a div with line contents to elem
      let div = document.createElement("div");
      div.innerHTML = line;
      elem.appendChild(div);
    });

    return elem;
  }

  // Methods for rendering output cells

  public async renderOutput(nodey: NodeyOutput, elem: HTMLElement) {
    let widgetList = await this.renderBaby.renderOutput(nodey);
    widgetList.forEach((widget: Widget) => {
      elem.appendChild(widget.node);
    });
    return elem;
  }

  public makeSampleDivs(nodey: Nodey) {
    let sample = document.createElement("div");
    sample.classList.add(INSPECT_VERSION);

    let content = document.createElement("div");
    content.classList.add(INSPECT_VERSION_CONTENT);
    sample.appendChild(content);

    // check we have valid input
    if (nodey && history) {
      if (nodey.typeChar === "c") {
        content.classList.add("code");
        sample.classList.add("code");
      } else if (nodey.typeChar === "m") {
        content.classList.add("markdown");
        content.classList.add("jp-RenderedHTMLCommon");
      } else {
        content.classList.add("output");
      }
    }
    return [sample, content];
  }
}
