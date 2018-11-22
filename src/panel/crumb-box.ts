import { Widget } from "@phosphor/widgets";

import { History } from "../model/history";

import { Mixin } from "./details/mixin";

import { Nodey, NodeyCode, NodeyMarkdown, NodeyOutput } from "../model/nodey";

const CRUMB_MENU = "v-VerdantPanel-crumbMenu";
const CRUMB_MENU_ITEM = "v-VerdantPanel-crumbMenu-item";

export class CrumbBox extends Widget {
  readonly historyModel: History;
  private onClose: () => void;
  private _target: Nodey;
  private _active: boolean = false;
  private menu: HTMLElement;
  private content: HTMLElement;

  constructor(historyModel: History, onClose: () => void) {
    super();
    this.historyModel = historyModel;
    this.onClose = onClose;

    this.menu = document.createElement("div");
    this.buildCrumbMenu();
    this.node.appendChild(this.menu);

    this.content = document.createElement("div");
    this.node.appendChild(this.content);

    this.historyModel.inspector.ready.then(async () => {
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
    console.log("CHANGE TARGET", node);
    if (this._active && this._target !== node[0]) {
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

    Mixin.addSeperator(menu);

    if (this._target) {
      if (this._target instanceof NodeyCode)
        Mixin.labelNodeyCode(menu, this._target, this.historyModel);
      else if (this._target instanceof NodeyMarkdown)
        Mixin.addItem(menu, "markdown " + this._target.id);
      else if (this._target instanceof NodeyOutput)
        Mixin.addItem(menu, "output " + this._target.id);
    }

    this.menu.appendChild(menu);
  }

  buildDetails() {
    this.content.innerHTML = "";
    let mixin = new Mixin(this.historyModel, [this._target], false);
    this.content.appendChild(mixin.node);

    if (this._target instanceof NodeyCode) {
      let output = (this._target as NodeyCode).output.map(item => {
        return this.historyModel.store.get(item);
      });
      let outMix = new Mixin(this.historyModel, output, true);
      this.content.appendChild(outMix.node);
    }
  }
}
