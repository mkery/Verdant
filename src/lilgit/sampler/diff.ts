import * as JSDiff from "diff";
import { RenderBaby } from "../jupyter-hooks/render-baby";
import { NodeyCell, NodeyCode, NodeyMarkdown } from "../nodey";
import { Sampler } from "./sampler";
import { History } from "../history";

export enum DIFF_TYPE {
  NO_DIFF,
  CHANGE_DIFF,
  PRESENT_DIFF,
}

const CHANGE_SAME_CLASS = "v-Verdant-sampler-code-same";
const CHANGE_ADDED_CLASS = "v-Verdant-sampler-code-added";
const CHANGE_REMOVED_CLASS = "v-Verdant-sampler-code-removed";
const MARKDOWN_LINEBREAK = "v-Verdant-sampler-markdown-linebreak";

const MAX_WORD_DIFFS = 4;

export class Diff {
  private readonly sampler: Sampler;
  private readonly history: History;
  private readonly renderBaby: RenderBaby;

  constructor(sampler: Sampler) {
    this.sampler = sampler;
    this.history = sampler.history;
    this.renderBaby = sampler.renderBaby;
  }

  async renderDiffCell(
    nodey: NodeyCell,
    elem: HTMLElement,
    diffKind: number = DIFF_TYPE.NO_DIFF,
    newText: string = ""
  ) {
    switch (nodey.typeChar) {
      case "c":
        this.diffCode(elem, newText, diffKind);
        break;
      case "m":
        await this.diffMarkdown(elem, diffKind, newText);
        break;
      case "r":
        // TODO raw cell
        break;
    }
  }

  diffCode(
    elem: HTMLElement,
    newText: string,
    diffKind: number = DIFF_TYPE.NO_DIFF,
    priorVersion?: string
  ) {
    /* Inserts code data to elem with diffs if necessary */

    // If no diff necessary, use plaincode
    if (diffKind === DIFF_TYPE.NO_DIFF)
      return this.sampler.plainCode(elem, newText);

    // Split new text into lines
    let lines = newText.split("\n");

    // Split old text into lines
    let prior = priorVersion
      ? (this.history.store.get(priorVersion) as NodeyCode)
      : undefined;
    let oldLines = prior ? this.sampler.renderCodeNode(prior).split("\n") : [];

    // Loop over lines and append diffs to elem
    const maxLength = Math.max(lines.length, oldLines.length);
    for (let i = 0; i < maxLength; i++) {
      let newLine = lines[i] || "";
      let oldLine = oldLines[i] || "";
      elem.appendChild(this.diffLine(oldLine, newLine));
    }

    return elem;
  }

  diffLine(oldText: string, newText: string) {
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

  async diffMarkdown(
    elem: HTMLElement,
    diffKind: number = DIFF_TYPE.NO_DIFF,
    newText: string = "",
    priorVersion?: string
  ) {
    if (diffKind === DIFF_TYPE.NO_DIFF)
      await this.renderBaby.renderMarkdown(elem, newText);
    else {
      let prior = priorVersion
        ? (this.history.store.get(priorVersion) as NodeyMarkdown)
        : undefined;
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

            partDiv.classList.add(CHANGE_SAME_CLASS);

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
}
