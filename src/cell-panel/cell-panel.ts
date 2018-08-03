import { Widget } from "@phosphor/widgets";

import { Nodey } from "../model/nodey";

import { GhostBook } from "../ghost-book/ghost-book";

import { FilterFunction } from "../panel/search-bar";

import { HistoryModel } from "../model/history";

import { InspectWidget } from "../inspector-panel/inspect-widget";

import { VerdantPanel } from "../panel/verdant-panel";

const CELL_PANEL = "v-VerdantPanel-cellPanel";

/**
 * A widget which displays cell-level history information
 */
export class CellPanel extends Widget {
  inspectWidget: InspectWidget;
  historyModel: HistoryModel;
  dragStart: number;
  dragHeight: number;

  constructor(historyModel: HistoryModel, parentPanel: VerdantPanel) {
    super();
    this.addClass(CELL_PANEL);
    this.historyModel = historyModel;
    this.inspectWidget = new InspectWidget(historyModel, parentPanel);
    this.node.appendChild(this.inspectWidget.node);
    this.node.appendChild(this.inspectWidget.header);

    this.historyModel.inspector.ready.then(async () => {
      await this.historyModel.notebook.ready;
      this.historyModel.inspector.targetChanged.connect(
        (_: any, nodey: Nodey) => {
          this.inspectWidget.changeTarget(nodey);
        }
      );
    });
  }

  onGhostBookOpened(book: GhostBook) {
    this.inspectWidget.onGhostBookOpened(book);
  }

  onGhostBookClosed() {
    this.inspectWidget.onGhostBookClosed();
  }

  filterNodeyList(filter: FilterFunction<Nodey>) {
    this.inspectWidget.filterNodeyList(filter);
  }

  clearFilters() {
    this.inspectWidget.clearFilters();
  }

  hide() {
    super.hide();
    this.inspectWidget.hide();
  }

  show() {
    super.show();
    this.inspectWidget.show();
  }
}
