const LEGEND_BUTTON = "v-VerdantPanel-footer-button";
const LEGEND_CONTAINER = "v-VerdantPanel-legend-container";
const LEGEND_LABEL = "v-VerdantPanel-legend-label";
const LEGEND_INTRO_ITEM = "v-VerdantPanel-legend-item-intro";
const LEGEND_ITEM = "v-VerdantPanel-legend-item";

const RUN_CELL_MAP_CHANGED = "v-VerdantPanel-runCellMap-cell-changed";
const RUN_CELL_MAP_REMOVED = "v-VerdantPanel-runCellMap-cell-removed";
const RUN_CELL_MAP_ADDED = "v-VerdantPanel-runCellMap-cell-added";
const RUN_CELL_MAP_RUNSYMBOL = "v-VerdantPanel-runCellMap-runSymbol";
const RUN_CELL_MAP_CELL = "v-VerdantPanel-runCellMap-cell";

export class Legend {
  private legendContainer: HTMLElement;
  private _button: HTMLElement;

  constructor() {
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
    } else {
      this.legendContainer.style.display = "none";
      this._button.classList.remove("open");
    }
  }

  buildLegend(): HTMLElement {
    let container = document.createElement("div");
    container.classList.add(LEGEND_CONTAINER);

    let item1 = document.createElement("div");
    item1.classList.add(LEGEND_INTRO_ITEM);
    for (var i = 0; i < 4; i++) {
      let cell = document.createElement("div");
      cell.classList.add(RUN_CELL_MAP_CELL);
      item1.appendChild(cell);
    }
    let cellLabel = document.createElement("div");
    cellLabel.classList.add(LEGEND_LABEL);
    cellLabel.textContent = "1 dash is 1 cell in your notebook";
    item1.appendChild(cellLabel);
    container.appendChild(item1);

    let item2 = document.createElement("div");
    item2.classList.add(LEGEND_ITEM);
    let cellAdd = document.createElement("div");
    cellAdd.classList.add(RUN_CELL_MAP_CELL);
    cellAdd.classList.add(RUN_CELL_MAP_ADDED);
    item2.appendChild(cellAdd);
    let addLabel = document.createElement("div");
    addLabel.classList.add(LEGEND_LABEL);
    addLabel.textContent = "cell created";
    item2.appendChild(addLabel);
    container.appendChild(item2);

    let item3 = document.createElement("div");
    item3.classList.add(LEGEND_ITEM);
    let cellRemove = document.createElement("div");
    cellRemove.classList.add(RUN_CELL_MAP_CELL);
    cellRemove.classList.add(RUN_CELL_MAP_REMOVED);
    item3.appendChild(cellRemove);
    let removeLabel = document.createElement("div");
    removeLabel.classList.add(LEGEND_LABEL);
    removeLabel.textContent = "cell deleted";
    item3.appendChild(removeLabel);
    container.appendChild(item3);

    let item4 = document.createElement("div");
    item4.classList.add(LEGEND_ITEM);
    let run = document.createElement("div");
    run.classList.add(RUN_CELL_MAP_CELL);
    let runSymbol = document.createElement("div");
    runSymbol.classList.add(RUN_CELL_MAP_RUNSYMBOL);
    runSymbol.textContent = "r";
    run.classList.add("run");
    run.appendChild(runSymbol);
    item4.appendChild(run);
    let runLabel = document.createElement("div");
    runLabel.classList.add(LEGEND_LABEL);
    runLabel.textContent = "cell run";
    item4.appendChild(runLabel);
    container.appendChild(item4);

    let item5 = document.createElement("div");
    item5.classList.add(LEGEND_ITEM);
    let cellChange = document.createElement("div");
    cellChange.classList.add(RUN_CELL_MAP_CELL);
    cellChange.classList.add(RUN_CELL_MAP_CHANGED);
    item5.appendChild(cellChange);
    let changeLabel = document.createElement("div");
    changeLabel.classList.add(LEGEND_LABEL);
    changeLabel.textContent = "cell edited";
    item5.appendChild(changeLabel);
    container.appendChild(item5);

    return container;
  }
}
