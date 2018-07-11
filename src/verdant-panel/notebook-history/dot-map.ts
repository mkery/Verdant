import { CellRunData, ChangeType } from "../../run";

const RUN_CELL_MAP_CHANGED = "v-VerdantPanel-runCellMap-cell-changed";
const RUN_CELL_MAP_REMOVED = "v-VerdantPanel-runCellMap-cell-removed";
const RUN_CELL_MAP_ADDED = "v-VerdantPanel-runCellMap-cell-added";
const RUN_CELL_MAP_RUNSYMBOL = "v-VerdantPanel-runCellMap-runSymbol";
const RUN_CELL_MAP = "v-VerdantPanel-runCellMap";
const RUN_CELL_MAP_CELL = "v-VerdantPanel-runCellMap-cell";

export class DotMap {
  public node: HTMLElement;

  constructor(runData: CellRunData[]) {
    this.node = this.buildDotMap(runData);
  }

  buildDotMap(runData: CellRunData[]): HTMLElement {
    let dotMap = document.createElement("div");
    dotMap.classList.add(RUN_CELL_MAP);
    runData.forEach(cell => {
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
        div.classList.add("run");
        div.appendChild(runSymbol);
      }
      dotMap.appendChild(div);
    });
    return dotMap;
  }

  public highlight() {
    var mapLines = this.node.getElementsByClassName(RUN_CELL_MAP_CELL);
    for (var i = 0; i < mapLines.length; i++)
      mapLines[i].classList.add("highlight");
  }

  public blur() {
    var mapLines = this.node.getElementsByClassName(RUN_CELL_MAP_CELL);
    for (var i = 0; i < mapLines.length; i++)
      mapLines[i].classList.remove("highlight");
  }
}
