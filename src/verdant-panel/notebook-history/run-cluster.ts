import { Widget } from "@phosphor/widgets";

import "../../../style/index.css";

import { Run, ChangeType, CellRunData } from "../../run";

import { RunItem } from "./run-item";

import { DotMap} from "./dot-map"

import { VerdantListItem } from "./run-list";

const RUN_ITEM_ACTIVE = "jp-mod-active";
const RUN_ITEM_CLASS = "v-VerdantPanel-runItem";
const RUN_ITEM_CARET = "v-VerdantPanel-runItem-caret";
const RUN_LABEL = "v-VerdantPanel-runList-runDateTotal";
const RUN_ITEM_NUMBER = "v-VerdantPanel-runItem-number";
const RUN_ITEM_TIME = "v-VerdantPanel-runItem-time";

const SUB_RUNLIST_CLASS = "v-VerdantPanel-runCluster-list";

export class RunCluster extends Widget implements VerdantListItem {
  runs: RunItem[];
  header: HTMLElement;
  dotMap: DotMap;

  constructor(runs: RunItem[]) {
    super();
    this.runs = runs || [];
    this.addClass(RUN_ITEM_CLASS);
    this.addClass("cluster");

    let caret = document.createElement("div");
    caret.classList.add(RUN_ITEM_CARET);

    this.header = this.buildHeader(runs)

    this.node.appendChild(caret);
    this.node.appendChild(this.header)
  }

  buildHeader(runs:RunItem[]): HTMLElement {
    let number = document.createElement("div");
    if (runs.length > 2)
      number.textContent =
        runs[runs.length - 1].run.id + " ... " + runs[0].run.id;
    else if (runs.length > 1)
      number.textContent =
        runs[runs.length - 1].run.id + " " + runs[0].run.id;
    else number.textContent = "" + runs[0].run.id;
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

    this.dotMap = this.buildDotMap();

    let header = document.createElement("div")
    header.appendChild(number);
    header.appendChild(eventLabel);
    header.appendChild(time);
    header.appendChild(this.dotMap.node);
    return header
  }

  buildDotMap(): DotMap {
    var runMap: CellRunData[] = [];
    this.runs.map(runItem => {
      runItem.run.cells.forEach((cell, index) => {
        var change: CellRunData = { node:"", changeType: ChangeType.CELL_SAME, run: false };
        if (runMap[index]) change = runMap[index];
        runMap[index] = {
          node: "",
          changeType: Math.min(
            ChangeType.CELL_CHANGED,
            change.changeType + cell.changeType
          ),
          run: change.run as boolean || cell.run
        };
      });
    });

    let dotMap = new DotMap(runMap)
    return dotMap;
  }

  get caret()
  {
    return this.node.firstElementChild;
  }

  blur()
  {
    this.node.classList.remove(RUN_ITEM_ACTIVE);
    this.caret.classList.remove("highlight")
  }

  nodeClicked(): RunItem {
    return null;
  }

  caretClicked() {
    console.log("Caret of CLUSTER was clicked!");
    var caret = this.caret
    if (caret.classList.contains("open")) {
      this.removeClass("open");
      this.header.style.display = ""
      caret.classList.remove("open");
      this.node.removeChild(
        this.node.getElementsByClassName(SUB_RUNLIST_CLASS)[0]
      );
    } else {
      caret.classList.add("open");
      this.addClass("open");
      this.header.style.display = "none"
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
