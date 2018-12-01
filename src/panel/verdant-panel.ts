import { Widget } from "@phosphor/widgets";

//import { GhostBookPanel } from "../ghost-book/ghost-model";

import { Wishbone } from "./wishbone";

import { History } from "../model/history";

import { CrumbBox } from "./crumb-box";

import { Summary } from "./summary";
import { EventMap } from "./event-map";

const HEADER_CONTAINER = "v-VerdantPanel-headerContainer";
const SEARCH_CONTAINER = "v-VerdantPanel-searchContainer";
const SEARCH_ICON = "v-VerdantPanel-searchIcon";
const FILTER_OPTS_ICON = "v-VerdantPanel-filterOptsIcon";
const SEARCH_TEXT = "v-VerdantPanel-searchText";
const INSPECTOR_BUTTON = "v-VerdantPanel-inspectorButton";
/*const CONTENT_HEADER = "v-VerdantPanel-Summary-header";
const CONTENT_HEADER_ALABEL = "v-VerdantPanel-Summary-header-aLabel";
const CONTENT_HEADER_VLABEL = "v-VerdantPanel-Summary-header-vLabel";*/

/**
 * A widget which displays notebook-level history information
 */
export class VerdantPanel extends Widget {
  readonly history: History;
  readonly contentBox: HTMLElement;
  readonly summary: Summary;
  readonly crumbBox: CrumbBox;
  readonly eventMap: EventMap;

  constructor(history: History) {
    super();
    this.addClass("v-VerdantPanel");
    this.history = history;

    let header = this.buildHeaderNode();
    //this.summary = new Summary(this.history);
    this.eventMap = new EventMap(this.history);
    this.node.appendChild(header);
    //this.node.appendChild(this.buildContentHeader());

    this.contentBox = document.createElement("div");
    this.contentBox.appendChild(this.eventMap.node);
    this.contentBox.classList.add("v-VerdantPanel-content");
    this.node.appendChild(this.contentBox);

    this.crumbBox = new CrumbBox(this.history, () => this.closeCrumbBox());
  }

  public ghostBookOpened(widg: Widget) {
    widg.disposed.connect(this.ghostBookClosed.bind(this));
    //this.runList.onGhostBookOpened();
    //let book = (widg as GhostBookPanel).content;
  }

  public ghostBookClosed() {
    //this.runList.onGhostBookClosed();
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

  /*private buildContentHeader() {
    let header = document.createElement("div");
    header.classList.add(CONTENT_HEADER);

    let aLabel = document.createElement("div");
    aLabel.classList.add(CONTENT_HEADER_ALABEL);
    aLabel.textContent = "artifact";
    header.appendChild(aLabel);

    let vLabel = document.createElement("div");
    vLabel.classList.add(CONTENT_HEADER_VLABEL);
    vLabel.textContent = "versions";
    header.appendChild(vLabel);

    return header;
  }*/

  toggleInspector() {
    let inspectorButton = this.node.getElementsByClassName(INSPECTOR_BUTTON)[0];
    if (inspectorButton.classList.contains("active")) {
      inspectorButton.classList.remove("active");
      Wishbone.endWishbone(this.history.notebook, this.history);
    } else {
      inspectorButton.classList.add("active");
      Wishbone.startWishbone(this.history);
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
      Wishbone.endWishbone(this.history.notebook, this.history);
    }
    this.contentBox.appendChild(this.eventMap.node);
  }
}
