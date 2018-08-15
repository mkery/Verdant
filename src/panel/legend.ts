import { SearchBar } from "./search-bar";

const LEGEND_BUTTON = "v-VerdantPanel-footer-button";
const LEGEND_CONTAINER = "v-VerdantPanel-legend-container";
const LEGEND_LABEL = "v-VerdantPanel-legend-label";
const LEGEND_ITEM = "v-VerdantPanel-legend-item";

const RUN_CELL_MAP_CHANGED = "v-VerdantPanel-runCellMap-cell-changed";
const RUN_CELL_MAP_REMOVED = "v-VerdantPanel-runCellMap-cell-removed";
const RUN_CELL_MAP_ADDED = "v-VerdantPanel-runCellMap-cell-added";
const RUN_CELL_MAP_CELL = "v-VerdantPanel-runCellMap-cell";

export class Legend {
  private legendContainer: HTMLElement;
  private _button: HTMLElement;
  private search: SearchBar;

  constructor(search: SearchBar) {
    this.search = search;
    let button = document.createElement("div");
    button.classList.add(LEGEND_BUTTON);
    button.textContent = "Legend";
    this._button = button;

    this._button.addEventListener("click", this.toggleLegend.bind(this));

    this.legendContainer = this.buildLegend();
  }

  get button(): HTMLElement {
    return this._button;
  }

  get node(): HTMLElement {
    return this.legendContainer;
  }

  toggleLegend() {
    if (this.legendContainer.style.display === "none") {
      this.legendContainer.style.display = "";
      this._button.classList.add("open");
      return true;
    } else {
      this.legendContainer.style.display = "none";
      this._button.classList.remove("open");
      return false;
    }
  }

  buildLegend(): HTMLElement {
    let container = document.createElement("div");
    container.classList.add(LEGEND_CONTAINER);

    let item2 = document.createElement("div");
    item2.classList.add(LEGEND_ITEM);
    let cellAdd = document.createElement("div");
    cellAdd.classList.add(RUN_CELL_MAP_CELL);
    cellAdd.classList.add(RUN_CELL_MAP_ADDED);
    cellAdd.classList.add("run");
    item2.appendChild(cellAdd);
    let addLabel = document.createElement("div");
    addLabel.classList.add(LEGEND_LABEL);
    addLabel.textContent = "cell created";
    item2.appendChild(addLabel);
    item2.classList.add("added");
    item2.addEventListener("click", () => this.search.filter(item2));
    container.appendChild(item2);

    let item3 = document.createElement("div");
    item3.classList.add(LEGEND_ITEM);
    let cellRemove = document.createElement("div");
    cellRemove.classList.add(RUN_CELL_MAP_CELL);
    cellRemove.classList.add(RUN_CELL_MAP_REMOVED);
    cellRemove.classList.add("run");
    item3.appendChild(cellRemove);
    let removeLabel = document.createElement("div");
    removeLabel.classList.add(LEGEND_LABEL);
    removeLabel.textContent = "cell deleted";
    item3.appendChild(removeLabel);
    item3.classList.add("deleted");
    item3.addEventListener("click", () => this.search.filter(item3));
    container.appendChild(item3);

    let item5 = document.createElement("div");
    item5.classList.add(LEGEND_ITEM);
    let cellChange = document.createElement("div");
    cellChange.classList.add(RUN_CELL_MAP_CELL);
    cellChange.classList.add(RUN_CELL_MAP_CHANGED);
    cellChange.classList.add("run");
    item5.appendChild(cellChange);
    let changeLabel = document.createElement("div");
    changeLabel.classList.add(LEGEND_LABEL);
    changeLabel.textContent = "cell edited";
    item5.appendChild(changeLabel);
    item5.classList.add("changed");
    item5.addEventListener("click", () => this.search.filter(item5));
    container.appendChild(item5);

    let item6 = document.createElement("div");
    item6.classList.add(LEGEND_ITEM);
    let outputLabel = document.createElement("div");
    outputLabel.classList.add(LEGEND_LABEL);
    outputLabel.textContent = "output";
    item6.appendChild(outputLabel);
    item6.classList.add("output");
    item6.addEventListener("click", () => this.search.filter(item6));
    container.appendChild(item6);

    let item7 = document.createElement("div");
    item7.classList.add(LEGEND_ITEM);
    let textLabel = document.createElement("div");
    textLabel.classList.add(LEGEND_LABEL);
    textLabel.textContent = "text output";
    item7.appendChild(textLabel);
    item7.classList.add("textOut");
    item7.addEventListener("click", () => this.search.filter(item7));
    container.appendChild(item7);

    let item8 = document.createElement("div");
    item8.classList.add(LEGEND_ITEM);
    let tableLabel = document.createElement("div");
    tableLabel.classList.add(LEGEND_LABEL);
    tableLabel.textContent = "table output";
    item8.appendChild(tableLabel);
    item8.classList.add("tableOut");
    item8.addEventListener("click", () => this.search.filter(item8));
    container.appendChild(item8);

    let item9 = document.createElement("div");
    item9.classList.add(LEGEND_ITEM);
    let imageLabel = document.createElement("div");
    imageLabel.classList.add(LEGEND_LABEL);
    imageLabel.textContent = "image output";
    item9.appendChild(imageLabel);
    item9.classList.add("imageOut");
    item9.addEventListener("click", () => this.search.filter(item9));
    container.appendChild(item9);

    let item10 = document.createElement("div");
    item10.classList.add(LEGEND_ITEM);
    let markdownLAbel = document.createElement("div");
    markdownLAbel.classList.add(LEGEND_LABEL);
    markdownLAbel.textContent = "markdown";
    item10.appendChild(markdownLAbel);
    item10.classList.add("markdown");
    item10.addEventListener("click", () => this.search.filter(item10));
    container.appendChild(item10);

    return container;
  }
}
