import { Widget } from "@phosphor/widgets";

import { GhostBook } from "./ghost-book";

import { RunModel } from "../model/run";

const TIME_SLIDER = "v-Verdant-GhostBook-timeslider";
const TIME_AXIS = "v-Verdant-GhostBook-timeslider-axis";
const TIME_POINT = "v-Verdant-GhostBook-timeslider-pointer";
const TIME_BAR = "v-Verdant-GhostBook-timeslider-bar";
const TIME_POINTER_POINT = "v-Verdant-GhostBook-timeslider-pointer-point";

export class TimeSlider extends Widget {
  private _runModel: RunModel;
  readonly ghost: GhostBook;
  private dragOn: boolean = false;
  private dragFun: (ev: MouseEvent) => void;

  constructor(ghost: GhostBook) {
    super();
    this.ghost = ghost;
    this.addClass(TIME_SLIDER);

    let axis = document.createElement("div");
    axis.classList.add(TIME_AXIS);
    this.node.appendChild(axis);

    let pointer = document.createElement("div");
    pointer.classList.add(TIME_POINT);
    axis.appendChild(pointer);

    let pointerPoint = document.createElement("div");
    pointerPoint.classList.add(TIME_POINTER_POINT);
    pointer.appendChild(pointerPoint);
    pointerPoint.style.visibility = "hidden";

    this.node.addEventListener("mouseenter", this.focus.bind(this));
    this.node.addEventListener("mouseleave", this.blur.bind(this));

    axis.addEventListener("click", this.dragTimeline.bind(this));
    pointerPoint.addEventListener("mousedown", this.startDrag.bind(this));
  }

  get axis() {
    return this.node.getElementsByClassName(TIME_AXIS)[0] as HTMLElement;
  }

  get pointer() {
    return this.node.getElementsByClassName(TIME_POINT)[0] as HTMLElement;
  }

  get pointerPoint() {
    return this.node.getElementsByClassName(
      TIME_POINTER_POINT
    )[0] as HTMLElement;
  }

  set runModel(runModel: RunModel) {
    this._runModel = runModel;
    console.log("run model for timeline!", this._runModel);
    this.buildTimeline();
  }

  public focus() {
    let axis = this.axis;
    axis.classList.add("focus");
    this.pointerPoint.style.visibility = "";
  }

  public blur() {
    let axis = this.axis;
    axis.classList.remove("focus");
    this.pointerPoint.style.visibility = "hidden";
  }

  public startDrag() {
    this.dragOn = true;
    this.dragFun = (ev: MouseEvent) => {
      this.dragTimeline(ev);
    };
    document.addEventListener("mouseup", this.endDrag.bind(this));
    document.addEventListener("mousemove", this.dragFun);
  }

  public endDrag() {
    this.dragOn = false;
    document.removeEventListener("mouseup", this.endDrag.bind(this));
    document.removeEventListener("mousemove", this.dragFun);
  }

  public dragTimeline(ev: MouseEvent) {
    if (!this.dragOn) console.log("??? drag still on");
    let x = ev.clientX;
    let box = this.axis.getBoundingClientRect();
    let start = box.left;
    x = Math.min(Math.max(x - start, 0) / box.width, 1) * 100;
    this.pointer.style.width = x + "%";
  }

  private buildTimeline() {
    let old = this.node.getElementsByClassName(TIME_BAR);
    console.log("old nodes are", old);
    for (let i = 0; i < old.length; i++) this.node.removeChild(old[i]);

    let clusterPos = this.ghost.model.cluster;
    let runPos = this.ghost.model.run;
    console.log("CLuster is ", clusterPos, runPos);

    let clusterList = this._runModel.runClusterList;
    let maxHeight = 20;
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

      if (clusterPos === cluster.id) {
        let pointer = this.pointer;
        let runX = runPos / cluster.length;
        pointer.style.width =
          "calc(" + index + " * " + width + " + " + runX + " * " + width + ")";
      }
    });
  }
}
