import * as JSDiff from "diff";
import { RenderBaby } from "../jupyter-hooks/render-baby";
import {
  Nodey,
  NodeyCode,
  NodeyMarkdown,
  NodeyNotebook,
  NodeyOutput,
  NodeyRawCell,
} from "../nodey";
import { Sampler, CellMap } from ".";
import { History } from "../history";
import { ChangeType } from "../checkpoint";

export enum DIFF_TYPE {
  NO_DIFF,
  CHANGE_DIFF,
  PRESENT_DIFF,
}

export type DiffCell = {
  name: string;
  sample: HTMLElement;
  status: ChangeType[];
};

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

  async renderNotebook(
    notebook_ver: number,
    diffKind: DIFF_TYPE
  ): Promise<DiffCell[]> {
    /*
     * First set up the basics that we'll need regardless of what kind of
     * diff we're doing
     */
    let focusedNotebook = this.history.store.getNotebook(notebook_ver);
    let relativeToNotebook = notebook_ver;
    if (relativeToNotebook < 0) relativeToNotebook = undefined;
    let cellMap: { name: string; changes: ChangeType[] }[] = [];

    /*
     * Based on the diff kind, build a list of cells with changes
     */
    if (diffKind === DIFF_TYPE.CHANGE_DIFF) {
      let checkpoints = this.history.checkpoints.getForNotebook(
        focusedNotebook
      );
      cellMap = CellMap.build(checkpoints, this.history);
    } else if (diffKind === DIFF_TYPE.PRESENT_DIFF) {
      let currentNotebook = this.history.store.currentNotebook;
      relativeToNotebook = currentNotebook?.version;
      cellMap = this.zipNotebooks(focusedNotebook, currentNotebook);
    } else if (diffKind === DIFF_TYPE.NO_DIFF) {
      cellMap = focusedNotebook.cells.map((name) => {
        return { name, changes: [] };
      });
    }

    /*
     * For each cell, render line-level diff notation
     */
    return Promise.all(
      cellMap.map(async (value: { name: string; changes: ChangeType[] }) => {
        const name = value.name;
        const status = value.changes;
        let cell = this.history.store.get(name);
        let diff = diffKind;
        if (status.includes(ChangeType.REMOVED)) diff = DIFF_TYPE.NO_DIFF;
        const sample = await this.renderCell(cell, diff, relativeToNotebook);
        return { sample, status, name };
      })
    );
  }

  public async renderCell(
    nodey: Nodey,
    diffKind: DIFF_TYPE = DIFF_TYPE.NO_DIFF,
    relativeToNotebook?: number
  ): Promise<HTMLElement> {
    const [sample, elem] = this.sampler.makeSampleDivs(nodey);

    if (nodey instanceof NodeyCode) {
      this.diffCode(nodey, elem, diffKind, relativeToNotebook);
    } else if (nodey instanceof NodeyMarkdown) {
      await this.diffMarkdown(nodey, elem, diffKind, relativeToNotebook);
    } else if (nodey instanceof NodeyRawCell) {
      // raw can be treated the same as code
      this.diffCode(nodey, elem, diffKind, relativeToNotebook);
    } else if (nodey instanceof NodeyOutput) {
      await this.diffOutput(nodey, elem, diffKind, relativeToNotebook);
    }

    return sample;
  }

  private getOldNewText(
    nodey: Nodey,
    diffKind: DIFF_TYPE,
    relativeToNotebook?: number
  ): [string, string, DIFF_TYPE] {
    // first get text of the current nodey
    let newText = this.sampler.nodeToText(nodey);

    // now get text of prior nodey
    let [priorNodey, fixedDiffKind] = this.getPrior(
      nodey,
      diffKind,
      relativeToNotebook
    );
    let oldText = ""; // default to no string if no prior nodey

    // otherwise make oldText the value of priorNodey
    if (priorNodey) oldText = this.sampler.nodeToText(priorNodey);

    return [newText, oldText, fixedDiffKind];
  }

  private getPrior(
    nodey: Nodey,
    diffKind: DIFF_TYPE,
    relativeToNotebook?: number
  ): [Nodey | undefined, DIFF_TYPE] {
    // now get text of prior nodey
    let nodeyHistory = this.history.store?.getHistoryOf(nodey);
    let priorNodey = undefined;
    let cellParent = undefined;
    if (nodey instanceof NodeyOutput) {
      cellParent = this.history.store?.get(nodey.parent);
    }

    if (diffKind === DIFF_TYPE.CHANGE_DIFF) {
      priorNodey = nodeyHistory?.getVersion(nodey.version - 1);

      /*
       * If relative to a checkpoint, check that changes to this nodey occurs
       * no earlier than the checkpoint immediately previous so that we
       * don't get irrelevant old changes showing up in diffs (ghost book only)
       */
      if (relativeToNotebook !== undefined) {
        let notebook = this.history?.store.getNotebookOf(nodey);
        if (!notebook || notebook?.version < relativeToNotebook) {
          priorNodey = undefined;
          diffKind = DIFF_TYPE.NO_DIFF;
        } else {
          if (!priorNodey && cellParent) {
            let rel = this.history?.store.getNotebook(relativeToNotebook);
            priorNodey = this.history?.store?.getOutputForNotebook(
              cellParent,
              rel
            );
          }
        }
      }
    } else if (diffKind === DIFF_TYPE.PRESENT_DIFF) {
      if (cellParent) {
        // output
        let curr = this.history?.store.currentNotebook;
        let latestParent = this.history.store.getHistoryOf(cellParent)
          ?.latest as NodeyCode;
        priorNodey = this.history?.store?.getOutputForNotebook(
          latestParent,
          curr
        );
      } else priorNodey = nodeyHistory?.latest;
    }

    return [priorNodey, diffKind];
  }

  private diffCode(
    nodey: Nodey,
    elem: HTMLElement,
    diffKind: number = DIFF_TYPE.NO_DIFF,
    relativeToNotebook?: number
  ) {
    let [newText, oldText, fixedDiffKind] = this.getOldNewText(
      nodey,
      diffKind,
      relativeToNotebook
    );
    diffKind = fixedDiffKind;

    // If no diff necessary, use plain code
    if (diffKind === DIFF_TYPE.NO_DIFF) {
      return this.sampler.plainCode(elem, newText);
    }

    if (diffKind === DIFF_TYPE.PRESENT_DIFF) {
      // swap old and new, since "old" is actually the present notebook
      return this.diffText(newText, oldText, elem);
    }

    return this.diffText(oldText, newText, elem);
  }

  diffText(oldText: string, newText: string, elem: HTMLElement) {
    // Split new text into lines
    let newLines = (newText || "").split("\n");

    // Split old text into lines
    let oldLines = (oldText || "").split("\n");

    // Loop over lines and append diffs to elem
    const maxLength = Math.max(newLines.length, oldLines.length);
    for (let i = 0; i < maxLength; i++) {
      let newLine = newLines[i] || "";
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
    nodey: NodeyMarkdown,
    elem: HTMLElement,
    diffKind: number = DIFF_TYPE.NO_DIFF,
    relativeToNotebook?: number
  ) {
    let [newText, oldText, fixedDiffKind] = this.getOldNewText(
      nodey,
      diffKind,
      relativeToNotebook
    );
    diffKind = fixedDiffKind;

    if (diffKind === DIFF_TYPE.PRESENT_DIFF) {
      // swap old and new, since "old" is actually the present notebook
      let temp = oldText;
      oldText = newText;
      newText = temp;
    }

    // If no diff necessary, use plain markdown
    if (diffKind === DIFF_TYPE.NO_DIFF)
      await this.renderBaby.renderMarkdown(elem, newText);
    else {
      let diff = JSDiff.diffWords(oldText, newText);
      if (diff.length > MAX_WORD_DIFFS) {
        diff = JSDiff.diffLines(oldText, newText, { newlineIsToken: true });
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

    return elem;
  }

  async diffOutput(
    nodey: NodeyOutput,
    elem: HTMLElement,
    diffKind: number,
    relativeToNotebook?: number
  ) {
    let [priorNodey, fixedDiffType] = this.getPrior(
      nodey,
      diffKind,
      relativeToNotebook
    );

    if (diffKind === DIFF_TYPE.PRESENT_DIFF) {
      // swap old and new, since "old" is actually the present notebook
      let temp = priorNodey as NodeyOutput;
      priorNodey = nodey;
      nodey = temp;
    }

    if (fixedDiffType === DIFF_TYPE.NO_DIFF || priorNodey?.name === nodey?.name)
      await this.sampler.renderOutput(nodey, elem);
    else {
      // just show side by side
      let old = document.createElement("div");
      old.classList.add("v-Verdant-output-sideBySide");
      old.classList.add(CHANGE_REMOVED_CLASS);
      if (priorNodey)
        await this.sampler.renderOutput(priorNodey as NodeyOutput, old);
      elem.appendChild(old);

      let newOut = document.createElement("div");
      newOut.classList.add("v-Verdant-output-sideBySide");
      newOut.classList.add(CHANGE_ADDED_CLASS);
      await this.sampler.renderOutput(nodey, newOut);
      elem.appendChild(newOut);
    }

    return elem;
  }

  private zipNotebooks(
    A: NodeyNotebook,
    B: NodeyNotebook
  ): { name: string; changes: ChangeType[] }[] {
    let cellMap: { name: string; changes: ChangeType[] }[] = [];

    let cellsInA = A.cells.map((name) => {
      return this.history.store.get(name)?.artifactName;
    });

    let cellsInB = B.cells.map((name) => {
      return this.history.store.get(name)?.artifactName;
    });

    let diff = JSDiff.diffArrays(cellsInA, cellsInB);

    let indexA = 0;
    let indexB = 0;
    diff.map((part) => {
      if (part.added) {
        // these cells are only in B
        part.value.forEach(() => {
          let cellB = B.cells[indexB];
          cellMap.push({ name: cellB, changes: [ChangeType.ADDED] });
          indexB++;
        });
      } else if (part.removed) {
        // these cells are only in A
        part.value.forEach(() => {
          let cellA = A.cells[indexA];
          cellMap.push({ name: cellA, changes: [ChangeType.REMOVED] });
          indexA++;
        });
      } else {
        // these cells are in both notebooks
        part.value.forEach(() => {
          let cellA = A.cells[indexA];
          let cellB = B.cells[indexB];
          let status = cellA === cellB ? ChangeType.NONE : ChangeType.CHANGED;

          // Check has output changed?
          if (status === ChangeType.NONE) {
            // assuming they're the same version, is this cell code
            let nodey = this.history.store.get(cellA);
            if (nodey instanceof NodeyCode) {
              let outA = this.history.store.getOutputForNotebook(nodey, A);
              let outB = this.history.store.getOutputForNotebook(nodey, B);
              if (outA && outB && outA !== outB) {
                status = ChangeType.OUTPUT_CHANGED;
              }
            }
          }

          cellMap.push({ name: cellA, changes: [status] });
          indexA++;
          indexB++;
        });
      }
    });

    //console.log("CURRENT DIFF CELL MAP", cellMap);

    return cellMap;
  }
}
