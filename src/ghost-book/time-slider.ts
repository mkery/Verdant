import { Widget } from "@phosphor/widgets";

import { RunModel } from "../model/run";

const TIME_SLIDER = "v-Verdant-GhostBook-timeslider";
const TIME_AXIS = "v-Verdant-GhostBook-timeslider-axis";
const TIME_BAR = "v-Verdant-GhostBook-timeslider-bar";

export class TimeSlider extends Widget {
  private _runModel: RunModel;

  constructor() {
    super();
    this.addClass(TIME_SLIDER);

    let axis = document.createElement("div");
    axis.classList.add(TIME_AXIS);
    this.node.appendChild(axis);
  }

  get axis() {
    return this.node.getElementsByClassName(TIME_AXIS)[0] as HTMLElement;
  }

  set runModel(runModel: RunModel) {
    this._runModel = runModel;
    console.log("run model for timeline!", this._runModel);
    this.buildTimeline();
  }

  private buildTimeline() {
    let clusterList = this._runModel.runClusterList;
    let maxHeight = 200;
    let width = (1 / clusterList.length) * 100 + "%";
    let maxRuns = 0;

    clusterList.forEach(cluster => {
      if (cluster.length > maxRuns) maxRuns = cluster.length;
    });

    clusterList.forEach((cluster, index) => {
      let bar = document.createElement("div");
      bar.classList.add(TIME_BAR);
      bar.style.width = width;
      bar.style.height =
        Math.floor((maxHeight * cluster.length) / maxRuns) + "px";
      bar.style.left = "calc(" + index + "*" + width + ")";
      this.node.appendChild(bar);
    });
  }
}
