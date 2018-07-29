import { Widget } from "@phosphor/widgets";

import { HistoryModel } from "../model/history";

import { Run } from "../model/run";

import { Inspect } from "../inspect";

import { Nodey, NodeyMarkdown, NodeyCode } from "../model/nodey";

import { Wishbone } from "./wishbone";

const INSPECT = "v-VerdantPanel-inspect";
const INSPECT_ICON = "v-VerdantPanel-inspect-icon";
const INSPECT_HEADER = "v-VerdantPanel-inspect-header";
const INSPECT_TITLE = "v-VerdantPanel-inspect-title";
const INSPECT_DIFF_OPTIONS = "v-Verdant-inspect-diff-options";
const INSPECT_DIFF_OPT = "v-Verdant-inspect-diff-opt";
const INSPECT_CONTENT = "v-VerdantPanel-inspect-content";
const INSPECT_VERSION = "v-VerdantPanel-inspect-version";
const INSPECT_VERSION_LABEL = "v-VerdantPanel-inspect-version-label";
const INSPECT_VERSION_ACTION = "v-VerdantPanel-search-filter";
const RUN_LINK = "v-VerdantPanel-inspect-run-link";
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
    title.textContent = "Select a notebook element to inspect its history";

    let diffOptions = document.createElement("div");
    diffOptions.classList.add(INSPECT_DIFF_OPTIONS);
    let op1 = document.createElement("div");
    op1.textContent = "Compare to current version";
    op1.classList.add(INSPECT_DIFF_OPT);
    op1.classList.add("left");
    op1.addEventListener("click", this.switchDiffType.bind(this, 1));
    diffOptions.appendChild(op1);
    let op2 = document.createElement("div");
    op2.textContent = "Show original edits";
    op2.classList.add(INSPECT_DIFF_OPT);
    op2.classList.add("active");
    op2.addEventListener("click", this.switchDiffType.bind(this, 2));
    diffOptions.appendChild(op2);

    this._header.appendChild(icon);
    this._header.appendChild(title);
    this._header.appendChild(diffOptions);

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

  get diffOps() {
    return this.header.getElementsByClassName(INSPECT_DIFF_OPT);
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
        "Inspecting " + target.typeName + " node " + target.name;
      this.content.innerHTML = "";
      this.fillContent(target, this.inspector.versionsOfTarget);
    }
  }

  private switchDiffType(diffType: number) {
    console.log("switch diff to ", diffType);
    let ops = this.diffOps;
    for (let i = 0; i < ops.length; i++) ops[i].classList.remove("active");
    ops[diffType - 1].classList.add("active");
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

      let created = target.run[0];
      let timestamp = null;
      if (created) {
        timestamp = new Date(
          this._historyModel.runModel.getRun(created).timestamp
        );
      }
      console.log("This node was used in runs", target);

      //v2: created 5/4 8:15pm, used in 555 runs
      let label = document.createElement("div");
      label.classList.add(INSPECT_VERSION_LABEL);
      let l = document.createElement("span");
      if (target.run.length > 0) {
        l.textContent =
          "v" +
          (item.version + 1) +
          ": created " +
          Run.formatTime(timestamp) +
          ", used in ";
        let r = document.createElement("span");
        r.classList.add(RUN_LINK);
        if (target.run.length > 1) r.textContent = target.run.length + " runs";
        else r.textContent = target.run.length + " run";
        label.appendChild(l);
        label.appendChild(r);
      } else {
        l.textContent = "v" + (item.version + 1) + ": has never been run";
        label.appendChild(l);
      }
      let star = document.createElement("div");
      star.classList.add(INSPECT_VERSION_ACTION);
      star.classList.add("star");
      let note = document.createElement("div");
      note.classList.add(INSPECT_VERSION_ACTION);
      note.classList.add("comment");
      let clippy = document.createElement("div");
      clippy.classList.add(INSPECT_VERSION_ACTION);
      clippy.classList.add("clippy");
      label.appendChild(star);
      label.appendChild(note);
      label.appendChild(clippy);

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
