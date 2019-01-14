import { History } from "../model/history";

import { NodeyCell, NodeyMarkdown, NodeyOutput } from "../model/nodey";

const CELL_SAMPLE = "v-VerdantPanel-cellList-sample";

export namespace CellSampler {
  export function sampleCell(historyModel: History, cell: NodeyCell) {
    let sample = document.createElement("div");
    sample.classList.add(CELL_SAMPLE);
    sample.classList.add(cell.typeChar);
    let index: number = 0;
    [sample.textContent, index] = historyModel.inspector.sampleNode(cell);
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
