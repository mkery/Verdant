import { HistoryModel } from "../model/history";

import { NodeyCell, NodeyMarkdown } from "../model/nodey";

const CELL_SAMPLE = "v-VerdantPanel-cellList-sample";

export class CellSample {
  historyModel: HistoryModel;
  sample: HTMLElement;

  constructor(historyModel: HistoryModel, cell: NodeyCell) {
    this.historyModel = historyModel;

    this.sample = document.createElement("div");
    this.sample.classList.add(CELL_SAMPLE);
    this.sample.classList.add(cell.typeName);
    this.sample.textContent = this.historyModel.inspector.sampleNode(cell);
    if (cell.typeName === "markdown")
      this.historyModel.inspector.renderMarkdownVersionDiv(
        cell as NodeyMarkdown,
        this.sample.textContent,
        this.sample
      );

    this.sample.addEventListener("click", () => {
      //Try to get notebook to scroll to the cell clicked on
    });
  }
}
