import { Widget } from "@phosphor/widgets";

import { HistoryModel } from "../history-model";

import { Run } from "../run";

import { RunItem } from "./run-item";

import { RunCluster } from "./run-cluster";

const RUNLIST_CLASS = "v-VerdantPanel-runList";
const RUNLIST_UL = "v-VerdantPanel-runList-ul";
const DATEHEADER_CLASS = "v-VerdantPanel-runList-header";
const RUN_LABEL = "v-VerdantPanel-runList-runDateTotal";
const DATE_LABEL = "v-VerdantPanel-runList-dateLabel";
const DATEHEADER_CARET = "v-VerdantPanel-runList-caret";

export class RunSection extends Widget {
  readonly historyModel: HistoryModel;
  private runItemList: HTMLElement;
  readonly headerTag: string;
  readonly headerTitle: string;
  readonly runList: Widget[];
  private _workingItem: Widget;

  constructor(
    historyModel: HistoryModel,
    headerTag: string,
    headerTitle: string,
    selectionHandler: () => any,
    runData: Run[]
  ) {
    super();
    this.runList = [];
    this.headerTag = headerTag;
    this.headerTitle = headerTitle;
    this.historyModel = historyModel;
    this.addClass(RUNLIST_CLASS);

    let header = document.createElement("div");
    header.classList.add(DATEHEADER_CLASS);

    let tag = document.createElement("div");
    tag.textContent = headerTag;
    tag.classList.add(RUN_LABEL);

    let titleLabel = document.createElement("div");
    titleLabel.textContent = headerTitle;
    titleLabel.classList.add(DATE_LABEL);

    let caret = document.createElement("div");
    caret.classList.add(DATEHEADER_CARET);

    header.appendChild(tag);
    header.appendChild(titleLabel);
    header.appendChild(caret);

    this.runItemList = document.createElement("ul");
    this.runItemList.classList.add(RUNLIST_UL);
    for (var i = runData.length - 1; i > -1; i--) {
      this.addNewRun(runData[i], selectionHandler);
    }

    caret.addEventListener(
      "click",
      this.toggleSection.bind(this, this.runItemList, caret)
    );
    this.node.appendChild(header);
    this.node.appendChild(this.runItemList);
  }

  public set workingItem(item: Widget) {
    if (item !== null)
      this.runItemList.insertBefore(item.node, this.runItemList.firstChild);
    else if (this._workingItem)
      this.runItemList.removeChild(this.runItemList.firstChild);
    this._workingItem = item;
  }

  public addNewRun(run: Run, selectionHandler: () => any) {
    console.log("adding new run Widget!", run);
    let runItemData = run;
    let runItem = new RunItem(runItemData, this.historyModel);
    runItem.header.addEventListener(
      "click",
      selectionHandler.bind(this, runItem)
    );

    let cluster: RunCluster = null;
    let priorRun = this.runList[this.runList.length - 1];
    if (priorRun) {
      var toCluster = RunCluster.shouldCluster(run, priorRun);
      if (toCluster) {
        var runs = [];
        if (priorRun instanceof RunCluster) {
          priorRun.runs.push(runItem);
          runs = priorRun.runs;
        } else runs = [priorRun as RunItem, runItem];
        cluster = new RunCluster(runs);
        cluster.caret.addEventListener(
          "click",
          selectionHandler.bind(this, cluster)
        );
        this.runList[this.runList.length - 1] = cluster;
      }
    }

    var toAdd = cluster || runItem;
    if (this._workingItem) {
      if (cluster)
        this.runItemList.removeChild(this._workingItem.node.nextSibling);
      this.runItemList.insertBefore(
        toAdd.node,
        this._workingItem.node.nextSibling
      );
    } else {
      if (cluster) this.runItemList.removeChild(this.runItemList.firstChild);
      this.runItemList.insertBefore(toAdd.node, this.runItemList.firstChild);
    }

    if (!cluster) this.runList.push(runItem);
  }

  private toggleSection(sectionDiv: HTMLElement, caret: HTMLElement) {
    if (sectionDiv.style.display === "none") {
      sectionDiv.style.display = "block";
      caret.classList.remove("closed");
    } else {
      sectionDiv.style.display = "none";
      caret.classList.add("closed");
    }
  }
}
