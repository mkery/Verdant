import { Widget } from "@phosphor/widgets";

import {NodeyCell} from "../nodey"

import { HistoryModel } from "../history-model";

import { InspectWidget } from "../inspector/inspect-widget";

const CELL_PANEL = "v-VerdantPanel-cellPanel";
const CELLHEADER_CLASS = "v-VerdantPanel-runList-header";
const RUN_LABEL = "v-VerdantPanel-runList-runDateTotal";
const CELLHEADER_CARET = "v-VerdantPanel-runList-caret";

/**
 * A widget which displays cell-level history information
 */
export class CellPanel extends Widget {
  inspectWidget: InspectWidget;
  historyModel: HistoryModel;

  constructor(historyModel: HistoryModel) {
    super();
    this.addClass(CELL_PANEL);
    this.historyModel = historyModel
    this.inspectWidget = new InspectWidget(historyModel);
    this.node.appendChild(this.inspectWidget.node);

    let currentCells = this.buildCellList()
    this.node.appendChild(currentCells)
    let deletedCells = this.buidDeletedList()
    this.node.appendChild(deletedCells)

    this.historyModel.inspector.ready.then(async () => {
      await this.historyModel.notebook.ready
      this.updateCellDisplay(null, null)
      this.historyModel.inspector.cellStructureChanged.connect(this.updateCellDisplay.bind(this))
    })
  }

  hide() {
    super.hide();
    this.inspectWidget.hide();
  }

  show() {
    super.show();
    this.inspectWidget.show();
  }

  updateCellDisplay(sender: any, cell: [number, NodeyCell]) {
    console.log("UPDATE CELL DISPLAY")
    let cellCount = this.historyModel.cellIndices.length
    let deletedCount = this.historyModel.deletedCellIndices.length

    let labels = this.node.getElementsByClassName(RUN_LABEL)
    labels[0].textContent = "Current Cells ("+cellCount+")"
    labels[1].textContent = "Deleted Cells ("+deletedCount+")"
  }

  buildCellList() : HTMLElement {
    let header = document.createElement("div");
    header.classList.add(CELLHEADER_CLASS);

    let tag = document.createElement("div");
    tag.textContent = "Current cells (?)";
    tag.classList.add(RUN_LABEL);

    let caret = document.createElement("div");
    caret.classList.add(CELLHEADER_CARET);

    header.appendChild(tag);
    header.appendChild(caret);

    return header
  }

  buidDeletedList() : HTMLElement {
    let header = document.createElement("div");
    header.classList.add(CELLHEADER_CLASS);

    let tag = document.createElement("div");
    tag.textContent = "Deleted cells (?)";
    tag.classList.add(RUN_LABEL);

    let caret = document.createElement("div");
    caret.classList.add(CELLHEADER_CARET);

    header.appendChild(tag);
    header.appendChild(caret);

    return header
  }
}
