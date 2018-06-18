import { Widget } from "@phosphor/widgets";

import { HistoryModel } from "../history-model";

import { Nodey, NodeyMarkdown } from "../nodey";

import { Wishbone } from "./wishbone";

import "../../style/index.css";

const CELL_PANEL = "v-VerdantPanel-cellPanel";
const CELL_PANEL_INSPECT_ICON = "v-VerdantPanel-inspect-icon";
const CELL_PANEL_INSPECT_HEADER = "v-VerdantPanel-inspect-header";
const CELL_PANEL_INSPECT_TITLE = "v-VerdantPanel-inspect-title";
const CELL_PANEL_INSPECT_CONTENT = "v-VerdantPanel-inspect-content";
const CELL_PANEL_INSPECT_VERSION = "v-VerdantPanel-inspect-version";

/**
 * A widget which displays cell-level history information
 */
export class CellPanel extends Widget {
  private _historyModel: HistoryModel;

  constructor(historyModel: HistoryModel) {
    super();
    this._historyModel = historyModel;
    this.addClass(CELL_PANEL);

    let inspectHeader = document.createElement("div");
    inspectHeader.classList.add(CELL_PANEL_INSPECT_HEADER);

    let icon = document.createElement("div");
    icon.classList.add(CELL_PANEL_INSPECT_ICON);
    icon.addEventListener("click", this.toggleWishbone.bind(this));

    let title = document.createElement("div");
    title.classList.add(CELL_PANEL_INSPECT_TITLE);
    title.textContent = "nothing selected to inspect";

    inspectHeader.appendChild(icon);
    inspectHeader.appendChild(title);

    let content = document.createElement("ul");
    content.classList.add(CELL_PANEL_INSPECT_CONTENT);

    this.node.appendChild(inspectHeader);
    this.node.appendChild(content);

    this._historyModel.inspector.targetChanged.connect(
      this.changeTarget.bind(this)
    );

    // look for jp-OutputArea-output
  }

  private get inspector() {
    return this._historyModel.inspector;
  }

  get header() {
    return this.node.getElementsByClassName(CELL_PANEL_INSPECT_TITLE)[0];
  }

  get icon() {
    return this.node.getElementsByClassName(CELL_PANEL_INSPECT_ICON)[0];
  }

  get content() {
    return this.node.getElementsByClassName(CELL_PANEL_INSPECT_CONTENT)[0];
  }

  public changeTarget(sender: any, target: Nodey) {
    this.header.textContent = target.typeName() + " node " + target.name;
    this.content.innerHTML = "";
    this.fillContent(target, this.inspector.versionsOfTarget);
  }

  private fillContent(target: Nodey, verList: any[]) {
    var contentDiv = this.content;
    verList.map(item => {
      var text = item as string;
      var li = document.createElement("div");
      li.classList.add(CELL_PANEL_INSPECT_VERSION);
      li.textContent = text;

      if (target instanceof NodeyMarkdown) {
        li.classList.add("markdown");
        this.inspector.renderBaby.renderMarkdown(li, text);
      }

      contentDiv.appendChild(li);
    });
  }

  public toggleWishbone() {
    if (this.icon.classList.contains("active")) {
      this.icon.classList.remove("active");
      Wishbone.endWishbone(this._historyModel.notebook, this._historyModel);
    } else {
      this.icon.classList.add("active");
      Wishbone.startWishbone(this._historyModel.notebook, this._historyModel);
    }
  }
}
