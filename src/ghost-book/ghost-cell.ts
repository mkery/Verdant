import { Widget } from "@phosphor/widgets";
import { History } from "../model/history";
import { Checkpoint, CheckpointType, ChangeType } from "../model/checkpoint";
import { Nodey } from "../model/nodey";
import { VersionSampler } from "../panel/details/version-sampler";

const GHOST_CELL = "v-Verdant-GhostBook-cell";
const GHOST_CELL_CONTAINER = "v-Verdant-GhostBook-cell-container";
const GHOST_CELL_CONTENT = "v-Verdant-GhostBook-cell-content";
const GHOST_CELL_HEADER = "v-Verdant-GhostBook-cell-header";
const GHOST_CELL_BAND = "v-Verdant-GhostBook-cell-band";

export class GhostCell extends Widget {
  readonly history: History;
  private name: string;
  private cell: HTMLElement;
  private header: HTMLElement;
  readonly events: Checkpoint[];

  constructor(
    history: History,
    ver: string,
    clickEv: (cell: GhostCell) => void,
    ev?: Checkpoint
  ) {
    super();
    this.history = history;
    this.name = ver;
    this.events = [];
    if (ev) this.events.push(ev);

    this.node.classList.add(GHOST_CELL_CONTAINER);
    this.node.addEventListener("click", () => clickEv(this));
    let band = document.createElement("div");
    band.classList.add(GHOST_CELL_BAND);
    this.node.appendChild(band);
    let wrapper = document.createElement("div");
    wrapper.classList.add(GHOST_CELL_CONTENT);
    this.header = document.createElement("div");
    this.header.classList.add(GHOST_CELL_HEADER);
    wrapper.appendChild(this.header);
    this.cell = document.createElement("div");
    this.cell.classList.add(GHOST_CELL);
    this.cell.classList.add(this.name.charAt(0));
    wrapper.appendChild(this.cell);
    this.node.appendChild(wrapper);
  }

  public addEvent(ev: Checkpoint) {
    this.events.push(ev);
  }

  public hasFocus(): boolean {
    return this.node.classList.contains("active");
  }

  public show() {
    super.show();
    if (this.cell.children.length < 1) this.build();
  }

  public focus() {
    this.node.classList.add("active");
    this.node
      .getElementsByClassName(GHOST_CELL_BAND)[0]
      .classList.add("active");
    this.cell.classList.add("active");
  }

  public blur() {
    this.node.classList.remove("active");
    this.node
      .getElementsByClassName(GHOST_CELL_BAND)[0]
      .classList.remove("active");
    this.cell.classList.remove("active");
  }

  public build() {
    this.header.textContent = this.describeEvents();
    this.cell.innerHTML = "";

    let nodey = this.history.store.get(this.name);
    let sample = VersionSampler.sample(this.history, nodey);
    this.cell.appendChild(sample);
  }

  private describeEvents(): string {
    let cell = this.history.store.get(this.name);
    let text = "v" + cell.version + " of " + this.describeCell(cell);
    if (this.events.length > 0) {
      let run = false;
      let changed = false;
      let added = false;
      let deleted = false;
      let moved = false;

      this.events.forEach(ev => {
        if (ev.checkpointType === CheckpointType.ADD) added = true;
        else if (ev.checkpointType === CheckpointType.DELETE) deleted = true;
        else if (ev.checkpointType === CheckpointType.MOVED) moved = true;
        else if (ev.checkpointType === CheckpointType.RUN) {
          run = true;
          let cell = ev.targetCells.find(cell => cell.node === this.name);
          if (cell.changeType === ChangeType.CHANGED) changed = true;
        }
      });

      text += " was ";
      if (run) {
        if (changed) text += "edited then run";
        else text += "run but not edited";
      }
      if (added) {
        text += "created";
        this.cell.classList.add("added");
      }
      if (deleted) {
        text += "deleted";
        this.cell.classList.add("removed");
      }
      if (moved) text += "moved";
    }
    return text;
  }

  private describeCell(nodey: Nodey): string {
    switch (nodey.typeChar) {
      case "c":
        return "Code cell " + nodey.id;
      case "m":
        return "Markdown " + nodey.id;
      case "o":
        return "Output " + nodey.id;
    }
  }
}
