import { Widget } from "@phosphor/widgets";

import { RunActions } from "./run-panel";

import { RunModel, RunDate, RunCluster } from "../../model/run";

import { RunItem } from "./run-item";

const RUNLIST_CLASS = "v-VerdantPanel-runList";
const RUNLIST_UL = "v-VerdantPanel-runList-ul";
const DATEHEADER_CLASS = "v-VerdantPanel-runList-header";
const DATE_LABEL = "v-VerdantPanel-runList-dateLabel";
const DATEHEADER_CARET = "v-VerdantPanel-runList-caret";

export class RunSection extends Widget {
  readonly runModel: RunModel;
  private runItemList: HTMLElement;
  readonly runDate: RunDate;
  readonly headerTag: string;
  readonly headerTitle: string;
  readonly clusters: RunItem[];
  readonly actions: RunActions;

  constructor(
    runModel: RunModel,
    headerTag: string,
    runDate: RunDate,
    actions: RunActions
  ) {
    super();
    this.clusters = [];
    this.actions = actions;
    this.headerTag = headerTag;
    this.runDate = runDate;
    this.runModel = runModel;
    this.addClass(RUNLIST_CLASS);

    let header = document.createElement("div");
    header.classList.add(DATEHEADER_CLASS);

    let titleLabel = document.createElement("div");
    titleLabel.textContent = headerTag + " " + this.runDate.label();
    titleLabel.classList.add(DATE_LABEL);

    let caret = document.createElement("div");
    caret.classList.add(DATEHEADER_CARET);

    header.appendChild(titleLabel);
    header.appendChild(caret);

    this.runItemList = document.createElement("ul");
    this.runItemList.classList.add(RUNLIST_UL);
    this.runDate.getClusterList().forEach(item => {
      this.addNewCluster(item);
    });
    this.runDate.newClusterAdded.connect(
      (_: any, cluster: RunCluster) => {
        this.addNewCluster(cluster);
      },
      this
    );

    caret.addEventListener(
      "click",
      this.toggleSection.bind(this, this.runItemList, caret)
    );
    this.node.appendChild(header);
    this.node.appendChild(this.runItemList);
  }

  public addNewCluster(cluster: RunCluster) {
    let runItem = new RunItem(cluster, this.runModel, this.actions);
    this.runItemList.insertBefore(runItem.node, this.runItemList.firstChild);
    this.clusters.push(runItem);
  }

  /*public filter(fun: FilterFunction<Run>) {
    let matchCount = 0;
    this.clusters.forEach(runItem => {
      matchCount += runItem.filter(fun.filter);
    });
    if (matchCount === 0) this.node.style.display = "none";
    return matchCount;
  }

  public filterByText(text: string) {
    let matchCount = 0;
    this.clusters.forEach(runItem => {
      matchCount += runItem.filterByText(text);
    });
    if (matchCount === 0) this.node.style.display = "none";
    return matchCount;
  }

  public clearFilters() {
    this.clusters.forEach(runItem => runItem.clearFilters());
    this.node.style.display = "";
  }*/

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
