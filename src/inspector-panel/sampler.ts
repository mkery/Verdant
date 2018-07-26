import { HistoryModel } from "../model/history";

import { NodeyCell, NodeyMarkdown } from "../model/nodey";

const CELL_SAMPLE = "v-VerdantPanel-cellList-sample";

export namespace Sampler {
  export function sampleCell(
    historyModel: HistoryModel,
    cell: NodeyCell
  ): HTMLElement {
    let sample = document.createElement("div");
    sample.classList.add(CELL_SAMPLE);
    sample.classList.add(cell.typeName);
    sample.textContent = historyModel.inspector.sampleNode(cell);
    if (cell.typeName === "markdown")
      historyModel.inspector.renderMarkdownVersionDiv(
        cell as NodeyMarkdown,
        sample.textContent,
        sample
      );

    sample.addEventListener("click", () => {
      //Try to get notebook to scroll to the cell clicked on
    });
    return sample;
  }
}
