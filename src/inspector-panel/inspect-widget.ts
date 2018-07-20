import { Widget } from "@phosphor/widgets";

import { HistoryModel } from "../model/history";

import { Inspect } from "../inspect";

import { Nodey, NodeyMarkdown, NodeyCode } from "../model/nodey";

import { Wishbone } from "./wishbone";

const INSPECT = "v-VerdantPanel-inspect";
const INSPECT_ICON = "v-VerdantPanel-inspect-icon";
const INSPECT_HEADER = "v-VerdantPanel-inspect-header";
const INSPECT_TITLE = "v-VerdantPanel-inspect-title";
const INSPECT_CONTENT = "v-VerdantPanel-inspect-content";
const INSPECT_VERSION = "v-VerdantPanel-inspect-version";
const INSPECT_VERSION_LABEL = "v-VerdantPanel-inspect-version-label";
const INSPECT_VERSION_CONTENT = "v-VerdantPanel-inspect-version-content";

/**
 * A widget which displays cell-level history information
 */
export class InspectWidget extends Widget {
  private _historyModel: HistoryModel;
  private _active: boolean = false;
  private _header: HTMLElement;

  constructor(historyModel: HistoryModel) {
    super();
    this._historyModel = historyModel;
    this.addClass(INSPECT);

    this._header = document.createElement("div");
    this._header.classList.add(INSPECT_HEADER);

    let icon = document.createElement("div");
    icon.classList.add(INSPECT_ICON);
    icon.addEventListener("click", this.toggleWishbone.bind(this));

    let title = document.createElement("div");
    title.classList.add(INSPECT_TITLE);
    title.textContent = "nothing selected to inspect";

    this._header.appendChild(icon);
    this._header.appendChild(title);

    let content = document.createElement("ul");
    content.classList.add(INSPECT_CONTENT);

    this.node.appendChild(content);

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
    return this._header;
  }

  get headerTitle() {
    return this.header.getElementsByClassName(INSPECT_TITLE)[0];
  }

  get icon() {
    return this.node.getElementsByClassName(INSPECT_ICON)[0];
  }

  get content() {
    return this.node.getElementsByClassName(INSPECT_CONTENT)[0];
  }

  public retrieveTarget() {
    this.changeTarget(this.inspector.target);
  }

  public changeTarget(target: Nodey) {
    if (this._active) {
      this.headerTitle.textContent =
        "versions of " + target.typeName + " node " + target.name;
      this.content.innerHTML = "";
      this.fillContent(target, this.inspector.versionsOfTarget);
    }
  }

  private fillContent(
    target: Nodey,
    verList: { version: number; runs: any; text: string }[]
  ) {
    var contentDiv = this.content;
    verList.map(item => {
      let text = item.text;
      let li = document.createElement("div");
      li.classList.add(INSPECT_VERSION);

      let label = document.createElement("div");
      label.classList.add(INSPECT_VERSION_LABEL);
      label.textContent = "version " + (item.version + 1) + ":";
      li.appendChild(label);

      let content = document.createElement("div");
      content.classList.add(INSPECT_VERSION_CONTENT);
      li.appendChild(content);

      let nodey = this._historyModel.getPriorVersion(target, item.version);
      if (nodey instanceof NodeyMarkdown) {
        content.classList.add("markdown");
        this.inspector.renderMarkdownVersionDiv(nodey, text, content);
      } else if (nodey instanceof NodeyCode) {
        this.inspector.renderCodeVerisonDiv(
          nodey,
          text,
          content,
          Inspect.CHANGE_DIFF
        );
      }

      contentDiv.insertBefore(li, contentDiv.firstElementChild);
    });
    contentDiv.lastElementChild.classList.add("last");
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