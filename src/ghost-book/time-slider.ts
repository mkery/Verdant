import { Widget } from "@phosphor/widgets";

import { RunModel } from "../model/run";

const TIME_SLIDER = "v-Verdant-GhostBook-timeslider";
const TIME_BAR = "v-Verdant-GhostBook-timeslider-bar";

export class TimeSlider extends Widget {
  private _runModel: RunModel;

  constructor() {
    super();
    this.addClass(TIME_SLIDER);

    let bar = document.createElement("div");
    bar.classList.add(TIME_BAR);
    this.node.appendChild(bar);
  }

  set runModel(runModel: RunModel) {
    this._runModel = runModel;
    console.log("run model for timeline!", this._runModel);
  }
}
