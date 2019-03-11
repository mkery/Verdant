import { History } from "../../lilgit/model/history";

import {
  NodeyCell,
  NodeyMarkdown,
  NodeyOutput
} from "../../lilgit/model/nodey";

const CELL_SAMPLE = "v-VerdantPanel-cellList-sample";

export namespace CellSampler {
  export function sampleCell(historyModel: History, cell: NodeyCell) {
    let sample = document.createElement("div");
    sample.classList.add(CELL_SAMPLE);
    sample.classList.add(cell.typeChar);
    let res = historyModel.inspector.sampleNode(cell);
    sample.textContent = res[0];
    if (cell.typeChar === "m") {
      historyModel.inspector.renderDiff(cell, sample, {
        newText: (cell as NodeyMarkdown).markdown
      });
    }

    sample.addEventListener("click", () => {
      //TODO Try to get notebook to scroll to the cell clicked on
    });
    return sample;
  }

  export function sampleOutput(
    historyModel: History,
    output: NodeyOutput
  ): HTMLElement {
    let sample = document.createElement("div");
    sample.classList.add(CELL_SAMPLE);
    historyModel.inspector.renderDiff(output, sample);
    return sample;
  }
}
