import { Widget } from "@phosphor/widgets";

import { HistoryModel } from "../model/history";

import {
  Nodey,
  NodeyCodeCell,
  NodeyCode,
  NodeyMarkdown,
  NodeyOutput
} from "../model/nodey";

import {
  CodeVersionSample,
  OutputVersionSample,
  MarkdownVersionSample
} from "./details/version-sample";

const CRUMB_MENU = "v-VerdantPanel-crumbMenu";
const CRUMB_MENU_ITEM = "v-VerdantPanel-crumbMenu-item";
const CRUMB_MENU_SEPERATOR = "v-VerdantPanel-crumbMenu-seperator";
const CRUMB_MENU_CONTENT = "v-VerdantPanel-inspect-content";

export class CrumbBox extends Widget {
  readonly historyModel: HistoryModel;
  private onClose: () => void;
  private _target: Nodey;
  private _active: boolean = false;
  private menu: HTMLElement;
  private content: HTMLElement;

  constructor(historyModel: HistoryModel, onClose: () => void) {
    super();
    this.historyModel = historyModel;
    this.onClose = onClose;

    this.menu = document.createElement("div");
    this.buildCrumbMenu();
    this.node.appendChild(this.menu);

    this.content = document.createElement("ul");
    this.content.classList.add(CRUMB_MENU_CONTENT);
    this.node.appendChild(this.content);

    this.historyModel.inspector.ready.then(async () => {
      await this.historyModel.notebook.ready;
      this.historyModel.inspector.targetChanged.connect(
        (_: any, nodey: Nodey[]) => {
          this.changeTarget(nodey);
        }
      );
    });
  }

  show() {
    this._active = true;
  }

  hide() {
    this._active = false;
  }

  changeTarget(node: Nodey[]) {
    if (this._active) {
      this._target = node[0];
      this.buildCrumbMenu();
      this.buildDetails();
    }
  }

  buildCrumbMenu(): void {
    this.menu.innerHTML = "";
    let menu = document.createElement("div");
    menu.classList.add(CRUMB_MENU);

    let notebookItem = document.createElement("div");
    notebookItem.classList.add(CRUMB_MENU_ITEM);
    notebookItem.textContent = "Notebook";
    notebookItem.addEventListener("click", () => this.onClose());
    menu.appendChild(notebookItem);

    this.addSeperator(menu);

    if (this._target) {
      if (this._target instanceof NodeyCode) this.labelNodeyCode(menu);
      else if (this._target instanceof NodeyMarkdown)
        this.addItem(menu, "markdown " + this._target.id);
      else if (this._target instanceof NodeyOutput)
        this.addItem(menu, "output " + this._target.id);
    }

    this.menu.appendChild(menu);
  }

  labelNodeyCode(menu: HTMLElement): void {
    let target = this._target as NodeyCode;

    if (target instanceof NodeyCodeCell) {
      this.addItem(menu, "cell " + target.id);
    } else {
      let cell = this.historyModel.getCellParent(target);
      let cellItem = this.addItem(menu, "cell " + cell.id);
      cellItem.addEventListener("click", () =>
        this.historyModel.inspector.changeTarget([cell])
      );

      this.addSeperator(menu);

      this.addItem(menu, target.type + " " + target.id);
    }
  }

  addSeperator(menu: HTMLElement) {
    let seperator = document.createElement("div");
    seperator.classList.add(CRUMB_MENU_SEPERATOR);
    seperator.textContent = ">";
    menu.appendChild(seperator);
  }

  addItem(menu: HTMLElement, label: string) {
    let item = document.createElement("div");
    item.classList.add(CRUMB_MENU_ITEM);
    item.textContent = label;
    menu.appendChild(item);
    return item;
  }

  buildDetails() {
    let target = this._target;
    let inspector = this.historyModel.inspector;
    let verList = inspector.versionsOfTarget;

    let contentDiv = this.content;
    contentDiv.innerHTML = "";

    verList.map(async item => {
      let text = item.text;
      let nodeyVer;
      let sample;

      switch (target.typeName) {
        case "output":
          nodeyVer = this.historyModel.getOutput(item.version);
          sample = new OutputVersionSample(inspector, nodeyVer, text);
          break;
        case "codeCell":
        case "code":
          nodeyVer = this.historyModel.getNodey(item.version);
          sample = new CodeVersionSample(inspector, nodeyVer, text);
          break;
        case "markdown":
          nodeyVer = this.historyModel.getNodey(item.version);
          sample = new MarkdownVersionSample(inspector, nodeyVer, text);
          break;
      }

      contentDiv.insertBefore(sample.node, contentDiv.firstElementChild);
    });
  }
}
