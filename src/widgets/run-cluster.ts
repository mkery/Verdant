import { Widget } from "@phosphor/widgets";

import "../../style/index.css";

import { Run, ChangeType } from "../run";

import { RunItem } from "./run-item";

import { VerdantListItem } from "./run-list";

const RUN_ITEM_ACTIVE = "jp-mod-active";
const RUN_ITEM_CLASS = "v-VerdantPanel-runItem";
const RUN_ITEM_CARET = "v-VerdantPanel-runItem-caret";
const RUN_LABEL = "v-VerdantPanel-runList-runDateTotal";
const RUN_ITEM_NUMBER = "v-VerdantPanel-runItem-number";
const RUN_ITEM_TIME = "v-VerdantPanel-runItem-time";

const SUB_RUNLIST_CLASS = "v-VerdantPanel-runCluster-list";

const RUN_CELL_MAP = "v-VerdantPanel-runCellMap";
const RUN_CELL_MAP_CELL = "v-VerdantPanel-runCellMap-cell";
const RUN_CELL_MAP_CHANGED = "v-VerdantPanel-runCellMap-cell-changed";
const RUN_CELL_MAP_REMOVED = "v-VerdantPanel-runCellMap-cell-removed";
const RUN_CELL_MAP_ADDED = "v-VerdantPanel-runCellMap-cell-added";
const RUN_CELL_MAP_RUNSYMBOL = "v-VerdantPanel-runCellMap-runSymbol";

export class RunCluster extends Widget implements VerdantListItem {
  runs: RunItem[];

  constructor(runs: RunItem[]) {
    super();
    this.runs = runs || [];
    this.addClass(RUN_ITEM_CLASS);
    this.addClass("cluster");

    let caret = document.createElement("div");
    caret.classList.add(RUN_ITEM_CARET);

    let number = document.createElement("div");
    if (runs.length > 2)
      number.textContent =
        "#" + runs[runs.length - 1].run.id + " to  #" + runs[0].run.id;
    else if (runs.length > 1)
      number.textContent =
        "#" + runs[runs.length - 1].run.id + " #" + runs[0].run.id;
    else number.textContent = "#" + runs[0].run.id;
    number.classList.add(RUN_ITEM_NUMBER);

    let eventLabel = document.createElement("div");
    eventLabel.textContent = runs[0].run.checkpointType;
    eventLabel.classList.add(RUN_LABEL);

    let time = document.createElement("div");
    if (
      runs.length > 1 &&
      !Run.sameMinute(
        new Date(this.runs[0].run.timestamp),
        new Date(this.runs[this.runs.length - 1].run.timestamp)
      )
    ) {
      time.textContent =
        Run.formatTime(new Date(this.runs[0].run.timestamp)) +
        "-" +
        Run.formatTime(new Date(this.runs[this.runs.length - 1].run.timestamp));
    } else
      time.textContent = Run.formatTime(new Date(this.runs[0].run.timestamp));
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
    var runMap: { change: number; run: boolean }[] = [];
    this.runs.map(runItem => {
      runItem.run.cells.forEach((cell, index) => {
        var change = { change: ChangeType.CELL_SAME, run: false };
        if (runMap[index]) change = runMap[index];
        runMap[index] = {
          change: Math.min(
            ChangeType.CELL_CHANGED,
            change.change + cell.changeType
          ),
          run: change.run || cell.run
        };
      });
    });

    runMap.forEach(change => {
      let div = document.createElement("div");
      div.classList.add(RUN_CELL_MAP_CELL);
      switch (change.change) {
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

      if (change.run) {
        let runSymbol = document.createElement("div");
        runSymbol.classList.add(RUN_CELL_MAP_RUNSYMBOL);
        runSymbol.textContent = "r";
        div.appendChild(runSymbol);
      }
      dotMap.appendChild(div);
    });
    return dotMap;
  }

  nodeClicked(): RunItem {
    this.node.classList.add(RUN_ITEM_ACTIVE);
    return null; //TODO
  }

  caretClicked() {
    console.log("Caret of CLUSTER was clicked!");
    let caret = this.node.firstElementChild;
    console.log("Caret?", caret);
    if (caret.classList.contains("open")) {
      this.removeClass("open");
      caret.classList.remove("open");
      this.node.removeChild(
        this.node.getElementsByClassName(SUB_RUNLIST_CLASS)[0]
      );
    } else {
      caret.classList.add("open");
      this.addClass("open");
      let kidList = document.createElement("ul");
      kidList.classList.add(SUB_RUNLIST_CLASS);
      for (var i = this.runs.length - 1; i > -1; i--)
        kidList.appendChild(this.runs[i].node);
      this.node.appendChild(kidList);
    }
  }
}

export namespace RunCluster {
  export function shouldCluster(run: Run, prior: Widget): boolean {
    var priorRun;
    if (prior instanceof RunItem) {
      priorRun = prior.run;
    } else if (prior instanceof RunCluster) {
      priorRun = prior.runs[0].run;
    } else return false;

    return (
      Run.sameDay(new Date(run.timestamp), new Date(priorRun.timestamp)) &&
      !run.hasEdits() &&
      !priorRun.hasEdits()
    );
  }
}
