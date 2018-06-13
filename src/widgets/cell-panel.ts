import { Widget } from "@phosphor/widgets";

import { Model } from "../model";

import { Nodey } from "../nodey";

import "../../style/index.css";

const CELL_PANEL = "v-VerdantPanel-cellPanel";
const CELL_PANEL_INSPECT_ICON = "v-VerdantPanel-inspect-icon";
const CELL_PANEL_INSPECT_HEADER = "v-VerdantPanel-inspect-header";
const CELL_PANEL_INSPECT_TITLE = "v-VerdantPanel-inspect-title";

/**
 * A widget which displays cell-level history information
 */
export class CellPanel extends Widget {
  private _historyModel: Model;

  constructor(historyModel: Model) {
    super();
    this._historyModel = historyModel;
    this.addClass(CELL_PANEL);

    let inspectHeader = document.createElement("div");
    inspectHeader.classList.add(CELL_PANEL_INSPECT_HEADER);

    let icon = document.createElement("div");
    icon.classList.add(CELL_PANEL_INSPECT_ICON);

    let title = document.createElement("div");
    title.classList.add(CELL_PANEL_INSPECT_TITLE);
    title.textContent = "nothing selected to inspect";

    inspectHeader.appendChild(icon);
    inspectHeader.appendChild(title);

    this.node.appendChild(inspectHeader);

    this._historyModel.inspector.targetChanged.connect(
      this.changeTarget.bind(this)
    );
  }

  get header() {
    return this.node.getElementsByClassName(CELL_PANEL_INSPECT_TITLE)[0];
  }

  public changeTarget(sender: any, target: Nodey) {
    this.header.textContent = target.typeName() + " node " + target.name;
  }
}
