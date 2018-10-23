import { Widget } from "@phosphor/widgets";

//import { GhostBookPanel } from "../ghost-book/ghost-model";

import { Wishbone } from "./wishbone";

import { HistoryModel } from "../model/history";

import { RunPanel } from "./run-visualization/run-panel";

import { CrumbBox } from "./crumb-box";

const HEADER_CONTAINER = "v-VerdantPanel-headerContainer";
const SEARCH_CONTAINER = "v-VerdantPanel-searchContainer";
const SEARCH_ICON = "v-VerdantPanel-searchIcon";
const FILTER_OPTS_ICON = "v-VerdantPanel-filterOptsIcon";
const SEARCH_TEXT = "v-VerdantPanel-searchText";
const INSPECTOR_BUTTON = "v-VerdantPanel-inspectorButton";

/**
 * A widget which displays notebook-level history information
 */
export class VerdantPanel extends Widget {
  readonly historyModel: HistoryModel;
  readonly contentBox: HTMLElement;
  readonly runList: RunPanel;
  readonly crumbBox: CrumbBox;

  constructor(historyModel: HistoryModel) {
    super();
    this.addClass("v-VerdantPanel");
    this.historyModel = historyModel;

    let header = this.buildHeaderNode();
    this.runList = new RunPanel(this.historyModel, this);
    this.node.appendChild(header);

    this.contentBox = document.createElement("div");
    this.contentBox.appendChild(this.runList.node);
    this.node.appendChild(this.contentBox);

    this.crumbBox = new CrumbBox(this.historyModel, () => this.closeCrumbBox());
  }

  public ghostBookOpened(widg: Widget) {
    widg.disposed.connect(this.ghostBookClosed.bind(this));
    this.runList.onGhostBookOpened();
    //let book = (widg as GhostBookPanel).content;
  }

  public ghostBookClosed() {
    this.runList.onGhostBookClosed();
  }

  private buildHeaderNode() {
    let header = document.createElement("div");
    header.classList.add(HEADER_CONTAINER);

    let searchContainer = document.createElement("div");
    searchContainer.classList.add(SEARCH_CONTAINER);

    let searchIcon = document.createElement("div");
    searchIcon.classList.add(SEARCH_ICON);
    let filterOptsIcon = document.createElement("div");
    filterOptsIcon.classList.add(FILTER_OPTS_ICON);
    let searchText = document.createElement("div");
    searchText.classList.add(SEARCH_TEXT);
    searchText.setAttribute("contentEditable", "true");
    searchContainer.appendChild(searchIcon);
    searchContainer.appendChild(filterOptsIcon);
    searchContainer.appendChild(searchText);

    let inspectorButton = document.createElement("div");
    inspectorButton.classList.add(INSPECTOR_BUTTON);
    inspectorButton.addEventListener("click", this.toggleInspector.bind(this));

    header.appendChild(searchContainer);
    header.appendChild(inspectorButton);
    return header;
  }

  toggleInspector() {
    let inspectorButton = this.node.getElementsByClassName(INSPECTOR_BUTTON)[0];
    if (inspectorButton.classList.contains("active")) {
      inspectorButton.classList.remove("active");
      Wishbone.endWishbone(this.historyModel.notebook, this.historyModel);
    } else {
      inspectorButton.classList.add("active");
      Wishbone.startWishbone(this.historyModel);
      this.contentBox.innerHTML = "";
      this.contentBox.appendChild(this.crumbBox.node);
      this.crumbBox.show();
    }
  }

  closeCrumbBox() {
    this.contentBox.innerHTML = "";
    this.crumbBox.hide();
    let inspectorButton = this.node.getElementsByClassName(INSPECTOR_BUTTON)[0];
    if (inspectorButton.classList.contains("active")) {
      inspectorButton.classList.remove("active");
      Wishbone.endWishbone(this.historyModel.notebook, this.historyModel);
    }
    this.contentBox.appendChild(this.runList.node);
  }
}
