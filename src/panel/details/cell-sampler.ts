import { History } from "../../model/history";

import { NodeyCell, NodeyMarkdown, NodeyOutput } from "../../model/nodey";

const CELL_SAMPLE = "v-VerdantPanel-cellList-sample";
const SEARCH_RESULT = "v-VerdantPanel-sample-searchResult";

export namespace CellSampler {
  export async function sampleCell(
    historyModel: History,
    cell: NodeyCell,
    textFilter: string = null
  ) {
    let sample = document.createElement("div");
    sample.classList.add(CELL_SAMPLE);
    sample.classList.add(cell.typeChar);
    let index: number = 0;
    [sample.textContent, index] = historyModel.inspector.sampleNode(
      cell,
      textFilter
    );
    if (cell.typeChar === "m") {
      await historyModel.inspector.renderMarkdownVersionDiv(
        cell as NodeyMarkdown,
        sample.textContent,
        sample
      );
      if (textFilter) index = sample.innerHTML.indexOf(textFilter);
    }
    if (textFilter) {
      let key = textFilter.split(" ")[0];
      sample.innerHTML =
        sample.innerHTML.slice(0, index) +
        '<span class="' +
        SEARCH_RESULT +
        '">' +
        key +
        "</span>" +
        sample.innerHTML.slice(index + key.length);
    }

    sample.addEventListener("click", () => {
      //Try to get notebook to scroll to the cell clicked on
    });
    return sample;
  }

  export function sampleOutput(
    historyModel: History,
    output: NodeyOutput
  ): HTMLElement {
    let sample = document.createElement("div");
    sample.classList.add(CELL_SAMPLE);
    historyModel.inspector.renderOutputVerisonDiv(output, sample);
    return sample;
  }
}
