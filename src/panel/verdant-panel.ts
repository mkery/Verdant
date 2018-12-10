import { Widget } from "@phosphor/widgets";
//import { GhostBookPanel } from "../ghost-book/ghost-model";
import { Checkpoint } from "../model/checkpoint";
import { Nodey } from "../model/nodey";
import { History } from "../model/history";
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

  constructor(history: History) {
    super();
    this.addClass("v-VerdantPanel");
    this.history = history;

    let header = this.buildHeaderNode();
    this.eventMap = new EventMap(this.history);
    this.node.appendChild(header);

    this.contentBox = document.createElement("div");
    this.contentBox.classList.add(PANEL_CONTAINER);
    this.contentBox.appendChild(this.eventMap.node);
    this.node.appendChild(this.contentBox);

    this.crumbBox = new CrumbBox(this.history);
    this.search = new Search(this.history);
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

    let eventsTab = document.createElement("div");
    eventsTab.classList.add(TAB);
    eventsTab.textContent = "Activity";
    eventsTab.classList.add("active");
    tabContainer.appendChild(eventsTab);

    let artifactsTab = document.createElement("div");
    artifactsTab.classList.add(TAB);
    artifactsTab.textContent = "Artifacts";
    tabContainer.appendChild(artifactsTab);

    let searchTab = document.createElement("div");
    searchTab.classList.add(TAB);
    let searchIcon = document.createElement("div");
    searchIcon.classList.add(SEARCH_ICON);
    searchIcon.classList.add("header");
    searchTab.appendChild(searchIcon);
    searchTab.style.borderRightWidth = "0px"; // ending
    tabContainer.appendChild(searchTab);

    eventsTab.addEventListener("click", () => {
      if (!eventsTab.classList.contains("active")) {
        artifactsTab.classList.remove("active");
        searchTab.classList.remove("active");
        eventsTab.classList.add("active");
        this.openEvents();
      }
    });

    artifactsTab.addEventListener("click", () => {
      if (!artifactsTab.classList.contains("active")) {
        artifactsTab.classList.add("active");
        searchTab.classList.remove("active");
        eventsTab.classList.remove("active");
        this.openCrumbBox();
      }
    });

    searchTab.addEventListener("click", () => {
      if (!searchTab.classList.contains("active")) {
        artifactsTab.classList.remove("active");
        searchTab.classList.add("active");
        eventsTab.classList.remove("active");
        this.openSearch();
      }
    });

    return tabContainer;
  }

  openSearch() {
    this.contentBox.innerHTML = "";
    this.contentBox.appendChild(this.search.node);
  }

  openEvents() {
    this.closeCrumbBox();
    this.contentBox.appendChild(this.eventMap.node);
  }

  openCrumbBox() {
    this.contentBox.innerHTML = "";
    this.contentBox.appendChild(this.crumbBox.node);
    this.crumbBox.show();
  }

  closeCrumbBox() {
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
