import { Widget } from "@lumino/widgets";
import * as JSDiff from "diff";
import {
  Nodey,
  NodeyCode,
  NodeyMarkdown,
  NodeyOutput,
  SyntaxToken,
} from "../nodey";

import { History } from "../history";

import { RenderBaby } from "../jupyter-hooks/render-baby";

import { Target } from "./target";
import { Search } from "./search";

const CHANGE_NONE_CLASS = "v-Verdant-sampler-code-same";
const CHANGE_ADDED_CLASS = "v-Verdant-sampler-code-added";
const CHANGE_REMOVED_CLASS = "v-Verdant-sampler-code-removed";
const MARKDOWN_LINEBREAK = "v-Verdant-sampler-markdown-linebreak";

const MAX_WORD_DIFFS = 4;

export class Sampler {
  readonly history: History;
  readonly search: Search;
  readonly renderBaby: RenderBaby;
  readonly target: Target;

  constructor(historyModel: History, renderBaby: RenderBaby) {
    this.history = historyModel;
    this.renderBaby = renderBaby;
    this.target = new Target(historyModel);
    this.search = new Search(this);
  }

  public sampleNode(nodey: Nodey, textFocus: string = null): [string, number] {
    // goal get the first line of the node
    if (nodey instanceof NodeyMarkdown) {
      if (!nodey.markdown) return ["", 0];
      let lines = nodey.markdown.split("\n");
      if (textFocus) {
        let index = -1;
        let focusLine = lines.find((ln) => {
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
        let lines = this.renderNode(nodeyCode).toLowerCase().split("\n");
        let focusLine = lines.find((ln) => {
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
  }

  private renderCodeNode(nodey: NodeyCode): string {
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
    return nodey.markdown;
  }

  private renderOutputNode(nodey: NodeyOutput): string {
    return nodey.raw.map((out) => out.text || "").join();
  }

  public async renderArtifactCell(
    nodey: Nodey,
    elem: HTMLElement,
    newText?: string
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

  public async renderDiffCell(
    nodey: Nodey,
    elem: HTMLElement,
    diffKind: number = Sampler.NO_DIFF,
    newText?: string,
    prior?: string
  ) {
    switch (nodey.typeChar) {
      case "c":
        this.diffCode(elem, newText, diffKind, prior);
        break;
      case "o":
        await this.renderOutput(nodey as NodeyOutput, elem);
        break;
      case "m":
        await this.diffMarkdown(elem, diffKind, newText, prior);
        break;
    }
  }

  // Methods for rendering code cells

  private plainCode(elem: HTMLElement, newText: string) {
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

  private diffCode(
    elem: HTMLElement,
    newText: string,
    diffKind: number = Sampler.NO_DIFF,
    priorVersion?: string
  ) {
    /* Inserts code data to elem with diffs if necessary */

    // If no diff necessary, use plaincode
    if (diffKind === Sampler.NO_DIFF) return this.plainCode(elem, newText);

    // Split new text into lines
    let lines = newText.split("\n");

    // Split old text into lines
    let prior = this.history.store.get(priorVersion) as NodeyCode;
    let oldLines = this.renderCodeNode(prior).split("\n");

    // Loop over lines and append diffs to elem
    const maxLength = Math.max(lines.length, oldLines.length);
    for (let i = 0; i < maxLength; i++) {
      let newLine = lines[i] || "";
      let oldLine = oldLines[i] || "";
      elem.appendChild(this.diffLine(oldLine, newLine));
    }

    return elem;
  }

  private diffLine(oldText: string, newText: string) {
    /* Diffs a single line. */
    let line = document.createElement("div");
    let innerHTML = "";
    let diff = JSDiff.diffWords(oldText, newText);
    if (diff.length > MAX_WORD_DIFFS) diff = JSDiff.diffLines(oldText, newText);
    diff.forEach((part) => {
      let partDiv = document.createElement("span");
      //log("DIFF", part);
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
    line.innerHTML = innerHTML;
    return line;
  }

  // Methods for rendering markdown cells

  private async diffMarkdown(
    elem: HTMLElement,
    diffKind: number = Sampler.NO_DIFF,
    newText?: string,
    priorVersion?: string
  ) {
    if (diffKind === Sampler.NO_DIFF)
      await this.renderBaby.renderMarkdown(elem, newText);
    else {
      let prior = this.history.store.get(priorVersion) as NodeyMarkdown;
      if (!prior || !prior.markdown) {
        // easy, everything is added
        await this.renderBaby.renderMarkdown(elem, newText);
        elem.classList.add(CHANGE_ADDED_CLASS);
      } else {
        let priorText = prior.markdown;
        let diff = JSDiff.diffWords(priorText, newText);
        if (diff.length > MAX_WORD_DIFFS) {
          diff = JSDiff.diffLines(priorText, newText, { newlineIsToken: true });
        }
        const divs = diff.map(async (part) => {
          let partDiv: HTMLElement;
          if (part.value === "\n") {
            partDiv = document.createElement("br");
            partDiv.classList.add(MARKDOWN_LINEBREAK);
          } else {
            partDiv = document.createElement("span");
            await this.renderBaby.renderMarkdown(partDiv, part.value);

            partDiv.classList.add(CHANGE_NONE_CLASS);

            if (part.added) {
              partDiv.classList.add(CHANGE_ADDED_CLASS);
            } else if (part.removed) {
              partDiv.classList.add(CHANGE_REMOVED_CLASS);
            }
          }
          return partDiv;
        });

        await Promise.all(divs).then((elems) =>
          elems.forEach((e) => elem.appendChild(e))
        );
      }
    }

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

export namespace Sampler {
  export const NO_DIFF = -1;
  export const CHANGE_DIFF = 0;
  export const PRESENT_DIFF = 1;
}

export enum SAMPLE_TYPE {
  /* types of render callers */
  DIFF,
  ARTIFACT,
  SEARCH,
}
