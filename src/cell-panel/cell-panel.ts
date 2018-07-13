import { Widget } from "@phosphor/widgets";

import { HistoryModel } from "../history-model";

import { InspectWidget } from "../inspector/inspect-widget";

const CELL_PANEL = "v-VerdantPanel-cellPanel";

/**
 * A widget which displays cell-level history information
 */
export class CellPanel extends Widget {
  inspectWidget: InspectWidget;

  constructor(historyModel: HistoryModel) {
    super();
    this.addClass(CELL_PANEL);
    this.inspectWidget = new InspectWidget(historyModel);
    this.node.appendChild(this.inspectWidget.node);
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
