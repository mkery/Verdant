import { Widget } from "@phosphor/widgets";
//import { GhostBookPanel } from "../ghost-book/ghost-model";
import { Checkpoint } from "../../lilgit/model/checkpoint";
import { Nodey } from "../../lilgit/model/nodey";
import { History } from "../../lilgit/model/history";
import { CrumbBox } from "./crumb-box";
import { Summary } from "./summary";
import { EventMap } from "./event-map";
import { Search } from "./search";

const PANEL_CONTAINER = "v-VerdantPanel-content-container";
const TAB_CONTAINER = "v-VerdantPanel-tabContainer";
const TAB = "v-VerdantPanel-tab";
const SEARCH_ICON = "v-VerdantPanel-searchIcon";

/**
 * A widget which displays notebook-level history information
 */
export class VerdantPanel extends Widget {
  readonly history: History;
  readonly contentBox: HTMLElement;
  readonly summary: Summary;
  readonly crumbBox: CrumbBox;
  readonly eventMap: EventMap;
  readonly search: Search;
  private artifactsTab: HTMLElement;
  private searchTab: HTMLElement;
  private eventsTab: HTMLElement;

  constructor(history: History) {
    super();
    this.addClass("v-VerdantPanel");
    this.history = history;

    let header = this.buildHeaderNode();
    this.eventMap = new EventMap(this.history, this);
    this.node.appendChild(header);

    this.contentBox = document.createElement("div");
    this.contentBox.classList.add(PANEL_CONTAINER);
    this.contentBox.appendChild(this.eventMap.node);
    this.node.appendChild(this.contentBox);

    this.crumbBox = new CrumbBox(this.history, this);
    this.search = new Search(this.history, this);
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
    let tabContainer = document.createElement("div");
    tabContainer.classList.add(TAB_CONTAINER);

    this.eventsTab = document.createElement("div");
    this.eventsTab.classList.add(TAB);
    this.eventsTab.textContent = "Activity";
    this.eventsTab.classList.add("active");
    tabContainer.appendChild(this.eventsTab);

    this.artifactsTab = document.createElement("div");
    this.artifactsTab.classList.add(TAB);
    this.artifactsTab.textContent = "Artifacts";
    tabContainer.appendChild(this.artifactsTab);

    this.searchTab = document.createElement("div");
    this.searchTab.classList.add(TAB);
    let searchIcon = document.createElement("div");
    searchIcon.classList.add(SEARCH_ICON);
    searchIcon.classList.add("header");
    this.searchTab.appendChild(searchIcon);
    this.searchTab.style.borderRightWidth = "0px"; // ending
    tabContainer.appendChild(this.searchTab);

    this.eventsTab.addEventListener("click", () => {
      if (!this.eventsTab.classList.contains("active")) {
        this.openEvents();
      }
    });

    this.artifactsTab.addEventListener("click", () => {
      if (!this.artifactsTab.classList.contains("active")) {
        this.openCrumbBox();
      }
    });

    this.searchTab.addEventListener("click", () => {
      if (!this.searchTab.classList.contains("active")) {
        this.openSearch();
      }
    });

    return tabContainer;
  }

  openGhostBook(notebook: number) {
    this.history.notebook.showGhostBook(notebook);
  }

  openSearch() {
    this.artifactsTab.classList.remove("active");
    this.searchTab.classList.add("active");
    this.eventsTab.classList.remove("active");
    this.contentBox.innerHTML = "";
    this.contentBox.appendChild(this.search.node);
  }

  openEvents() {
    this.artifactsTab.classList.remove("active");
    this.searchTab.classList.remove("active");
    this.eventsTab.classList.add("active");

    this.closeCrumbBox();
    this.contentBox.appendChild(this.eventMap.node);
  }

  openCrumbBox(inspectTarget?: Nodey) {
    this.artifactsTab.classList.add("active");
    this.searchTab.classList.remove("active");
    this.eventsTab.classList.remove("active");

    this.contentBox.innerHTML = "";
    this.contentBox.appendChild(this.crumbBox.node);
    this.crumbBox.show();

    if (inspectTarget) this.crumbBox.changeTarget(inspectTarget);
  }

  private closeCrumbBox() {
    this.contentBox.innerHTML = "";
    this.crumbBox.hide();
  }

  updateCells(
    runNodey: Nodey | Nodey[],
    checkpoint: Checkpoint,
    index?: number,
    indexB?: number
  ) {
    this.eventMap.addEvent(checkpoint);
    this.crumbBox.updateNode(runNodey, checkpoint, index, indexB);
  }

  highlightCell(index: number) {
    this.crumbBox.summary.highlightCell(index);
  }
}
