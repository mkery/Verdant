import { Widget } from "@phosphor/widgets";

import { HistoryModel } from "../history-model";

import { Nodey, NodeyMarkdown } from "../nodey";

import { Wishbone } from "./wishbone";

const INSPECT = "v-VerdantPanel-inspect"
const INSPECT_ICON = "v-VerdantPanel-inspect-icon";
const INSPECT_HEADER = "v-VerdantPanel-inspect-header";
const INSPECT_TITLE = "v-VerdantPanel-inspect-title";
const INSPECT_CONTENT = "v-VerdantPanel-inspect-content";
const INSPECT_VERSION = "v-VerdantPanel-inspect-version";

/**
 * A widget which displays cell-level history information
 */
export class InspectWidget extends Widget {
  private _historyModel: HistoryModel;
  private _active: boolean = false;

  constructor(historyModel: HistoryModel) {
    super();
    this._historyModel = historyModel;
    this.addClass(INSPECT)

    let inspectHeader = document.createElement("div");
    inspectHeader.classList.add(INSPECT_HEADER);

    let icon = document.createElement("div");
    icon.classList.add(INSPECT_ICON);
    icon.addEventListener("click", this.toggleWishbone.bind(this));

    let title = document.createElement("div");
    title.classList.add(INSPECT_TITLE);
    title.textContent = "nothing selected to inspect";

    inspectHeader.appendChild(icon);
    inspectHeader.appendChild(title);

    let content = document.createElement("ul");
    content.classList.add(INSPECT_CONTENT);

    this.node.appendChild(inspectHeader);
    this.node.appendChild(content);

    this._historyModel.inspector.targetChanged.connect(
      this.changeTarget.bind(this)
    );

    // look for jp-OutputArea-output
  }

  hide() {
    super.hide();
    this._active = false;
  }

  show() {
    super.show();
    this._active = true;
    this.retrieveTarget();
  }

  private get inspector() {
    return this._historyModel.inspector;
  }

  get header() {
    return this.node.getElementsByClassName(INSPECT_TITLE)[0];
  }

  get icon() {
    return this.node.getElementsByClassName(INSPECT_ICON)[0];
  }

  get content() {
    return this.node.getElementsByClassName(INSPECT_CONTENT)[0];
  }

  public retrieveTarget() {
    this.changeTarget(this, this.inspector.target);
  }

  public changeTarget(sender: any, target: Nodey) {
    if (this._active) {
      this.header.textContent = "versions of "+target.typeName + " node " + target.name;
      this.content.innerHTML = "";
      this.fillContent(target, this.inspector.versionsOfTarget);
    }
  }

  private fillContent(target: Nodey, verList: any[]) {
    var contentDiv = this.content;
    verList.map(item => {
      var text = item as string;
      var li = document.createElement("div");
      li.classList.add(INSPECT_VERSION);
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
      Wishbone.startWishbone(this._historyModel);
    }
  }
}
