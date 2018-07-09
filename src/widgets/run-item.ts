import { Run, ChangeType } from "../run";

import { Widget } from "@phosphor/widgets";

import { VerdantListItem } from "./run-list";

import "../../style/index.css";

const RUN_ITEM_CLASS = "v-VerdantPanel-runItem";
const RUN_ITEM_CARET = "v-VerdantPanel-runItem-caret";
const RUN_LABEL = "v-VerdantPanel-runList-runDateTotal";
const RUN_ITEM_NUMBER = "v-VerdantPanel-runItem-number";
const RUN_ITEM_TIME = "v-VerdantPanel-runItem-time";

const SUB_RUNLIST_CLASS = "v-VerdantPanel-runCluster-list";
const MAP_CELLBOX = "v-VerdantPanel-runCellMap-cellBox";
const MAP_CELLBOX_LABEL = "v-VerdantPanel-runCellMap-label";

const RUN_CELL_MAP = "v-VerdantPanel-runCellMap";
const RUN_CELL_MAP_CELL = "v-VerdantPanel-runCellMap-cell";
const RUN_CELL_MAP_CHANGED = "v-VerdantPanel-runCellMap-cell-changed";
const RUN_CELL_MAP_REMOVED = "v-VerdantPanel-runCellMap-cell-removed";
const RUN_CELL_MAP_ADDED = "v-VerdantPanel-runCellMap-cell-added";
const RUN_CELL_MAP_RUNSYMBOL = "v-VerdantPanel-runCellMap-runSymbol";

export class RunItem extends Widget implements VerdantListItem {
  readonly run: Run;

  constructor(run: Run) {
    super();
    this.run = run;
    this.addClass(RUN_ITEM_CLASS);

    let caret = document.createElement("div");
    caret.classList.add(RUN_ITEM_CARET);

    let number = document.createElement("div");
    number.textContent = "#" + run.id;
    number.classList.add(RUN_ITEM_NUMBER);

    let eventLabel = document.createElement("div");
    eventLabel.textContent = run.checkpointType;
    eventLabel.classList.add(RUN_LABEL);

    let time = document.createElement("div");
    time.textContent = Run.formatTime(new Date(this.run.timestamp));
    time.classList.add(RUN_ITEM_TIME);

    let dotMap = this.buildDotMap();

    this.node.appendChild(caret);
    this.node.appendChild(number);
    this.node.appendChild(eventLabel);
    this.node.appendChild(time);
    this.node.appendChild(dotMap);
  }

  buildDotMap(): HTMLElement {
    let dotMap = document.createElement("div");
    dotMap.classList.add(RUN_CELL_MAP);
    this.run.cells.forEach(cell => {
      let div = document.createElement("div");
      div.classList.add(RUN_CELL_MAP_CELL);
      switch (cell.changeType) {
        case ChangeType.CELL_CHANGED:
          div.classList.add(RUN_CELL_MAP_CHANGED);
          break;
        case ChangeType.CELL_REMOVED:
          div.classList.add(RUN_CELL_MAP_REMOVED);
          break;
        case ChangeType.CELL_ADDED:
          div.classList.add(RUN_CELL_MAP_ADDED);
          break;
        default:
          break;
      }

      if (cell.run) {
        let runSymbol = document.createElement("div");
        runSymbol.classList.add(RUN_CELL_MAP_RUNSYMBOL);
        runSymbol.textContent = "r";
        div.appendChild(runSymbol);
      }
      dotMap.appendChild(div);
    });
    return dotMap;
  }

  caretClicked() {
    console.log("Caret was clicked!");
    var caret = this.node.firstElementChild;
    if (this.hasClass("open")) {
      caret.classList.remove("open");
      this.removeClass("open");
      this.node.removeChild(
        this.node.getElementsByClassName(SUB_RUNLIST_CLASS)[0]
      );
    } else {
      caret.classList.add("open");
      this.addClass("open");
      let dropdown = document.createElement("ul");
      dropdown.classList.add(SUB_RUNLIST_CLASS);
      this.run.cells.forEach(cell => {
        if (cell.changeType === ChangeType.CELL_SAME) return;
        let cellContainer = document.createElement("div");
        let cellBox = document.createElement("div");
        let cellLabel = document.createElement("div");
        cellLabel.textContent = "see version";
        cellLabel.classList.add(MAP_CELLBOX_LABEL);
        let actionLabel = document.createElement("div");
        actionLabel.classList.add(MAP_CELLBOX_LABEL);
        switch (cell.changeType) {
          case ChangeType.CELL_ADDED:
            cellBox.classList.add(MAP_CELLBOX);
            cellBox.classList.add("added");
            cellContainer.appendChild(cellBox);
            cellContainer.appendChild(cellLabel);
            dropdown.appendChild(cellContainer);
            break;
          case ChangeType.CELL_REMOVED:
            cellBox.classList.add(MAP_CELLBOX);
            cellBox.classList.add("removed");
            cellContainer.appendChild(cellBox);
            cellContainer.appendChild(cellLabel);
            actionLabel.textContent = "restore";
            cellContainer.appendChild(actionLabel);
            dropdown.appendChild(cellContainer);
            break;
          case ChangeType.CELL_CHANGED:
            cellBox.classList.add(MAP_CELLBOX);
            cellContainer.appendChild(cellBox);
            cellContainer.appendChild(cellLabel);
            actionLabel.textContent = "compare";
            cellContainer.appendChild(actionLabel);
            dropdown.appendChild(cellContainer);
            break;
        }
      });
      this.node.appendChild(dropdown);
    }
  }
}
