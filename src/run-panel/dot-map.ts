import { CellRunData, ChangeType } from "../model/run";

import { HistoryModel } from "../model/history";

const RUN_CELL_MAP_CHANGED = "v-VerdantPanel-runCellMap-cell-changed";
const RUN_CELL_MAP_REMOVED = "v-VerdantPanel-runCellMap-cell-removed";
const RUN_CELL_MAP_ADDED = "v-VerdantPanel-runCellMap-cell-added";
///const RUN_CELL_MAP_RUNSYMBOL = "v-VerdantPanel-runCellMap-runSymbol";
const RUN_CELL_MAP = "v-VerdantPanel-runCellMap";
const RUN_CELL_MAP_CELL = "v-VerdantPanel-runCellMap-cell";

export class DotMap {
  public node: HTMLElement;
  ///private historyModel: HistoryModel;

  constructor(_: HistoryModel, runData: CellRunData[]) {
    //this.historyModel = historyModel;
    this.node = this.buildDotMap(runData);
  }

  update(runData: CellRunData[]) {
    this.node.innerHTML = "";
    this.node = this.buildDotMap(runData);
    return this.node;
  }

  buildDotMap(runData: CellRunData[]): HTMLElement {
    let dotMap = document.createElement("div");
    dotMap.classList.add(RUN_CELL_MAP);
    runData.forEach(cell => {
      let div = document.createElement("div");
      div.classList.add(RUN_CELL_MAP_CELL);
      switch (cell.changeType) {
        case ChangeType.CHANGED:
          div.classList.add(RUN_CELL_MAP_CHANGED);
          break;
        case ChangeType.REMOVED:
          div.classList.add(RUN_CELL_MAP_REMOVED);
          break;
        case ChangeType.ADDED:
          div.classList.add(RUN_CELL_MAP_ADDED);
          break;
        default:
          break;
      }

      if (cell.run) {
        /*let typeLabel = "r";
        let nodey = this.historyModel.getNodey(cell.node);
        if (nodey.typeName === "markdown") typeLabel = "m";
        else if (nodey.typeName === "code") typeLabel = "c";

        if (cell.newOutput && cell.newOutput.length > 0) {
          typeLabel = "0";
        }

        let runSymbol = document.createElement("div");
        runSymbol.classList.add(RUN_CELL_MAP_RUNSYMBOL);
        runSymbol.textContent = typeLabel;*/
        div.classList.add("run");
        //div.appendChild(runSymbol);
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
