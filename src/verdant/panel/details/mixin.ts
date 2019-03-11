import { Widget } from "@phosphor/widgets";

import {
  Nodey,
  NodeyCodeCell,
  NodeyCode,
  NodeyMarkdown,
  NodeyOutput
} from "../../../lilgit/model/nodey";

import { History } from "../../../lilgit/model/history";

import { VersionSampler } from "../../sampler/version-sampler";

const HEADER = "v-VerdantPanel-crumbMenu";
const CRUMB_MENU_CONTENT = "v-VerdantPanel-sampler-content";
const HEADER_TARGET = "v-VerdantPanel-crumbMenu-item";
//const HEADER_WISK = "v-VerdantPanel-mixin-mixButton";
const CRUMB_MENU_SEPERATOR = "v-VerdantPanel-crumbMenu-seperator";

export class Mixin extends Widget {
  readonly history: History;
  readonly targetList: Nodey[];
  private notebookLink: (ver: number) => void;
  private headerShowing: boolean;
  private header: HTMLElement;
  private content: HTMLElement;

  constructor(
    history: History,
    target: Nodey[],
    header: boolean = true,
    notebookLink: (ver: number) => void
  ) {
    super();
    this.history = history;
    this.targetList = target || [];
    this.notebookLink = notebookLink;
    this.headerShowing = header;

    this.header = document.createElement("div");
    this.header.classList.add(HEADER);
    this.buildHeader();

    this.content = document.createElement("ul");
    this.content.classList.add(CRUMB_MENU_CONTENT);
    this.node.appendChild(this.content);
    this.buildDetails();
  }

  buildHeader() {
    if (this.headerShowing) {
      let menu = this.header;
      if (this.targetList.length < 2) {
        let target = this.targetList[0];
        if (target instanceof NodeyCode)
          Mixin.labelNodeyCode(menu, target, this.history);
        else Mixin.addItem(menu, Mixin.nameNodey(target));

        /*let wiskButton = document.createElement("div");
        wiskButton.classList.add(HEADER_WISK);
        menu.appendChild(wiskButton);*/
      } else {
        //TODO
      }

      this.node.appendChild(this.header);
    }
  }

  buildDetails() {
    let contentDiv = this.content;
    contentDiv.innerHTML = "";

    let target = this.targetList[0];
    console.log("TARGETS", this.targetList);
    let history = this.history.store.getHistoryOf(target);

    history.versions.forEach(async nodeyVer => {
      let header = VersionSampler.verHeader(
        this.history,
        nodeyVer,
        this.notebookLink
      );
      let sample = VersionSampler.sample(this.history, nodeyVer);

      let itemDiv = document.createElement("div");
      itemDiv.appendChild(header);
      itemDiv.appendChild(sample);
      contentDiv.insertBefore(itemDiv, contentDiv.firstElementChild);
    });
  }
}

export namespace Mixin {
  export function labelNodeyCode(
    menu: HTMLElement,
    target: NodeyCode,
    history: History
  ): void {
    let name = Mixin.nameNodey(target);
    if (target instanceof NodeyCodeCell) {
      Mixin.addItem(menu, name);
    } else {
      let cell = history.store.getCellParent(target);
      let cellItem = Mixin.addItem(menu, "cell " + cell.id);
      cellItem.addEventListener(
        "click",
        () => (history.inspector.target = cell)
      );

      Mixin.addSeperator(menu);
      Mixin.addItem(menu, name);
    }
  }

  export function addSeperator(menu: HTMLElement) {
    let seperator = document.createElement("div");
    seperator.classList.add(CRUMB_MENU_SEPERATOR);
    seperator.textContent = ">";
    menu.appendChild(seperator);
  }

  export function addItem(menu: HTMLElement, label: string) {
    let item = document.createElement("div");
    item.classList.add(HEADER_TARGET);
    item.textContent = label;
    menu.appendChild(item);
    return item;
  }

  export function nameNodey(target: Nodey) {
    let name = "";
    if (target instanceof NodeyCode) {
      if (target instanceof NodeyCodeCell) name = "cell " + target.id;
      else name = target.type + " " + target.id;
    } else if (target instanceof NodeyMarkdown) name = "markdown " + target.id;
    else if (target instanceof NodeyOutput) name = "output " + target.id;
    return name;
  }

  export function labelOrigin(target: Nodey, content: HTMLElement) {
    let header = document.createElement("div");
    header.classList.add(HEADER);
    let item = document.createElement("div");
    item.classList.add(HEADER_TARGET);
    item.textContent = Mixin.nameNodey(target) + " was created from:";
    header.appendChild(item);
    content.appendChild(header);
  }
}
