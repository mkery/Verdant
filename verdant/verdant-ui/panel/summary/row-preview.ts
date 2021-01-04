import { History } from "../../../verdant-model/history";

import { NodeyCell, NodeyOutput } from "../../../verdant-model/nodey";

const CELL_SAMPLE = "v-VerdantPanel-cellList-sample";

export namespace RowPreview {
  export async function previewCell(historyModel: History, cell: NodeyCell) {
    let sample = document.createElement("div");
    sample.classList.add(CELL_SAMPLE);
    sample.classList.add(cell.typeChar);
    let res = historyModel.inspector.sampleNode(cell);
    sample.textContent = res[0];
    if (cell.typeChar === "m") {
      sample.classList.add("markdown");
      sample.classList.add("jp-RenderedHTMLCommon");
      sample.classList.add("markdown-sample");
      await historyModel.inspector.renderArtifactCell(cell, sample);
    }

    /*sample.addEventListener("click", () => {
      //TODO Try to get notebook to scroll to the cell clicked on
    });*/
    return sample;
  }

  export async function previewOutput(
    historyModel: History,
    output: NodeyOutput
  ) {
    let sample = document.createElement("div");
    sample.classList.add(CELL_SAMPLE);
    await historyModel.inspector.renderArtifactCell(output, sample);
    return sample;
  }
}
